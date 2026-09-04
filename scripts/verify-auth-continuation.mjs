import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");
const artifacts = await mkdtemp(path.join(os.tmpdir(), "voople-auth-continuation-"));
const mocks = {
  "next/navigation": `import {useSyncExternalStore} from 'react';
    const subscribe=(fn)=>{addEventListener('popstate',fn);return()=>removeEventListener('popstate',fn)};
    export function useSearchParams(){return new URLSearchParams(useSyncExternalStore(subscribe,()=>location.search,()=>''))}
    export const useRouter=()=>({push:window.navigate,replace:window.navigate,refresh:()=>{}});`,
  "next/link": `export default function Link({href,children,...props}){return <a href={href} {...props} onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&e.button===0){e.preventDefault();window.navigate(href)}}}>{children}</a>}`,
  "@/components/auth/TurnstileChallenge": `export const TURNSTILE_SITE_KEY='';export const TurnstileChallenge=()=>null;`,
  "@/lib/auth/sync-public-user": `export const syncPublicUser=async()=>({username:'test_user',created:window.scenario.created});`,
  "@/lib/auth/trusted-device-client": `export const trustCurrentDevice=async()=>{};export const startTrustedPasswordLogin=async()=>{
    if(window.scenario.fail)throw new Error('Тест: сеть недоступна');
    if(window.scenario.pending)await new Promise(resolve=>window.finishLogin=resolve);
    return {accessToken:'fixture-only',refreshToken:'fixture-only'};};`,
  "@/lib/supabase/client": `export const createClient=()=>({auth:{
    setSession:async()=>({data:{session:{}}}),signInWithOtp:async()=>({}),verifyOtp:async()=>({data:{session:{access_token:'fixture-only'}}}),
    signUp:async()=>window.scenario.fail?{error:{message:'Тест: сеть недоступна'}}:{data:{session:window.scenario.confirm?null:{access_token:'fixture-only'}}}
  }});`,
  "@/lib/telemetry/client": `export const reportProductEvent=()=>{};`,
  "@/lib/trpc/client": `const mutation=()=>({isPending:false,mutate:()=>{},mutateAsync:async()=>{if(window.scenario.fail)throw new Error('Тест: сеть недоступна')}});
    export const trpc={profile:{update:{useMutation:mutation}},status:{save:{useMutation:mutation}},customization:{setAvatarPhoto:{useMutation:mutation}}};`,
  "@/components/media/MediaUploadControl": `export const MediaUploadControl=()=>null;`,
};
const entry = `import {StrictMode,useSyncExternalStore} from 'react';import {createRoot} from 'react-dom/client';
  import Login from '@/app/(auth)/login/page';import Register from '@/app/(auth)/register/page';
  import {OnboardingFlow} from '@/components/onboarding/OnboardingFlow';
  import {safeAuthContinuation} from '@/lib/auth/continuation';
  import {AppThemeProvider,useAppTheme} from '@/components/theme/AppThemeProvider';
  window.scenario={};window.navigate=href=>{history.pushState({},'',href);dispatchEvent(new PopStateEvent('popstate'))};
  const subscribe=fn=>{addEventListener('popstate',fn);return()=>removeEventListener('popstate',fn)};
  function App(){const current=useSyncExternalStore(subscribe,()=>location.pathname+location.search,()=>'');const theme=useAppTheme();window.changeTheme=theme.setThemeId;
    const params=new URLSearchParams(location.search);return <div key={current} style={{minHeight:'100vh',background:'var(--background)',color:'var(--foreground)',display:'grid',placeItems:'center',padding:16}}>
      {location.pathname==='/login'?<Login/>:location.pathname==='/register'?<Register/>:location.pathname==='/onboarding'?<OnboardingFlow username={params.get('username')||'test_user'} redirectAfter={safeAuthContinuation(params.get('redirect'))||undefined}/>:<p>Destination reached</p>}</div>}
  createRoot(document.getElementById('root')).render(<StrictMode><AppThemeProvider><App/></AppThemeProvider></StrictMode>);`;
const bundle = await build({stdin:{contents:entry,resolveDir:repo,loader:"tsx"},bundle:true,write:false,format:"iife",jsx:"automatic",alias:{"@":`${repo}/src`},define:{"process.env.NODE_ENV":'"development"'},plugins:[{name:"auth-fixture",setup(builder){
  builder.onResolve({filter:/.*/},args=>Object.hasOwn(mocks,args.path)?{path:args.path,namespace:"mock"}:undefined);
  builder.onLoad({filter:/.*/,namespace:"mock"},args=>({contents:mocks[args.path],loader:"tsx",resolveDir:repo}));
}}]});
const cssRoot=path.join(repo,"desktop/dist/assets");
const css=(await Promise.all((await readdir(cssRoot)).filter(file=>file.endsWith(".css")).map(file=>readFile(path.join(cssRoot,file),"utf8")))).join("\n");
const server=createServer((request,response)=>{
  if(request.url==="/app.js"){response.setHeader("Content-Type","text/javascript");response.end(bundle.outputFiles[0].text)}
  else if(request.url==="/style.css"){response.setHeader("Content-Type","text/css");response.end(css)}
  else {response.setHeader("Content-Type","text/html; charset=utf-8");response.end('<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>')}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const invite="/room-invites/11111111-1111-4111-8111-111111111111";
const login=`/login?redirect=${encodeURIComponent(invite)}`;
let browser;
try {
  browser=await chromium.launch({headless:true});
  for(const width of [360,1280]) for(const theme of ["void","light"]){
    const page=await browser.newPage({viewport:{width,height:900}});const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(origin+login);
    await page.getByRole("link",{name:"Регистрация",exact:true}).waitFor();
    await page.evaluate(theme=>window.changeTheme(theme),theme);
    await page.waitForFunction(theme=>document.documentElement.dataset.appTheme===theme,theme);
    const screenshot=async(name)=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name);await page.screenshot({path:path.join(artifacts,`${width}-${theme}-${name}.png`),fullPage:true})};
    await screenshot("login");
    const register=page.getByRole("link",{name:"Регистрация",exact:true});await register.focus();assert.equal(await register.evaluate(el=>el===document.activeElement),true);await page.keyboard.press("Enter");
    assert.equal(new URL(page.url()).searchParams.get("redirect"),invite);
    await screenshot("register");
    await page.reload();await page.getByRole("link",{name:"Войти",exact:true}).click();
    assert.equal(new URL(page.url()).searchParams.get("redirect"),invite);
    await page.getByLabel("Email",{exact:true}).fill("fixture@example.com");await page.getByLabel("Пароль",{exact:true}).fill("fixture-password");
    await page.evaluate(()=>window.scenario={fail:true});await page.getByRole("button",{name:"Войти",exact:true}).click();await page.getByText("Тест: сеть недоступна",{exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,"/login");
    await page.evaluate(()=>window.scenario={pending:true});await page.getByRole("button",{name:"Войти",exact:true}).click();await page.waitForFunction(()=>Boolean(window.finishLogin));assert.equal(await page.getByRole("button",{name:"Войти",exact:true}).isDisabled(),true);
    await page.evaluate(()=>window.finishLogin());await page.waitForURL(origin+invite);
    await page.evaluate(login=>{window.scenario={};window.navigate(login)},login);
    await page.getByRole("link",{name:"Регистрация",exact:true}).click();
    await page.getByLabel("Email",{exact:true}).fill("fixture@example.com");await page.locator('input[name="username"]').fill("test_user");await page.getByLabel("Пароль",{exact:true}).fill("fixture-password");await page.getByRole("checkbox").check();
    await page.evaluate(()=>window.scenario={confirm:true});await page.getByRole("button",{name:"Регистрация",exact:true}).click();await page.getByText("Подтвердите почту",{exact:true}).waitFor();await screenshot("confirmation");
    await page.getByRole("button",{name:"Перейти ко входу"}).click();assert.equal(new URL(page.url()).searchParams.get("redirect"),invite);
    await page.getByLabel("Email",{exact:true}).fill("fixture@example.com");await page.getByRole("button",{name:"Войти по коду из письма"}).click();await page.getByRole("button",{name:"Отправить код",exact:true}).click();
    await page.getByLabel("Цифра 1 кода").fill("123456");await page.evaluate(()=>window.scenario={created:true});await page.getByRole("button",{name:"Войти по коду",exact:true}).click();await page.waitForURL(/\/onboarding\?/);
    assert.equal(new URL(page.url()).searchParams.get("redirect"),invite);await screenshot("onboarding");
    await page.getByRole("button",{name:"Дальше",exact:true}).click();await page.getByRole("button",{name:"Дальше",exact:true}).click();
    await page.evaluate(()=>window.scenario={fail:true});await page.getByRole("button",{name:"Продолжить",exact:true}).click();await page.getByText("Тест: сеть недоступна",{exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,"/onboarding");
    await page.evaluate(()=>window.scenario={});await page.getByRole("button",{name:"Продолжить",exact:true}).click();await page.waitForURL(origin+invite);
    await page.evaluate(login=>{window.scenario={};window.navigate(login)},login);await page.getByRole("link",{name:"Регистрация",exact:true}).click();
    await page.getByLabel("Email",{exact:true}).fill("fixture@example.com");await page.locator('input[name="username"]').fill("test_user");await page.getByLabel("Пароль",{exact:true}).fill("fixture-password");await page.getByRole("checkbox").check();
    await page.getByRole("button",{name:"Регистрация",exact:true}).click();await page.waitForURL(/\/onboarding\?/);assert.equal(new URL(page.url()).searchParams.get("redirect"),invite);
    await page.evaluate(()=>window.navigate('/login?redirect='+encodeURIComponent('/\\evil.example')));await page.getByRole("link",{name:"Регистрация",exact:true}).click();assert.equal(new URL(page.url()).search,"");
    await page.getByRole("link",{name:"Войти",exact:true}).click();await page.getByLabel("Email",{exact:true}).fill("fixture@example.com");await page.getByLabel("Пароль",{exact:true}).fill("fixture-password");await page.getByRole("button",{name:"Войти",exact:true}).click();await page.waitForURL(origin+'/test_user');
    assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width} ${theme}: links/reload, password pending/error/retry, confirmation, OTP, onboarding, unsafe redirect`);
  }
  console.log(`Screenshots: ${artifacts}`);
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve))}
