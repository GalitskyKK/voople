import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const require = createRequire(`${repo}/package.json`);
const { build } = require("esbuild");
const { chromium } = require("playwright");

const fixture = `
  import {useState} from 'react';
  import {createRoot} from 'react-dom/client';
  import {useChatAutoScroll} from '@/hooks/useChatAutoScroll';
  function Demo() {
    const [visible,setVisible]=useState(false);
    const [key,setKey]=useState('group');
    const [count,setCount]=useState(80);
    const scroll=useChatAutoScroll(key,count);
    return <>
      <button onClick={()=>setVisible(value=>!value)}>Toggle chat</button>
      <button onClick={()=>setCount(value=>value+1)}>Append message</button>
      <button onClick={()=>{setKey('direct');setVisible(true)}}>Open DM</button>
      <button onClick={scroll.scrollToBottom}>Latest</button>
      {visible ? <div ref={scroll.containerRef} data-testid="messages" style={{height:240,overflowY:'auto'}}>
        <div ref={scroll.contentRef}>{Array.from({length:count},(_,index)=><p key={index} style={{height:28,margin:0}}>Message {index}</p>)}</div>
      </div> : null}
    </>;
  }
  createRoot(document.getElementById('root')).render(<Demo/>);
`;
const bundle = await build({
  stdin: { contents: fixture, resolveDir: repo, loader: "tsx" },
  bundle: true, write: false, format: "iife", jsx: "automatic",
  alias: { "@": `${repo}/src` },
  define: { "process.env.NODE_ENV": '"development"' },
});
const server = createServer((request, response) => {
  if (request.url === "/app.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(bundle.outputFiles[0].text);
  } else {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end('<!doctype html><div id="root"></div><script src="/app.js"></script>');
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const distance = () => page.locator('[data-testid="messages"]').evaluate(
    (element) => element.scrollHeight - element.scrollTop - element.clientHeight,
  );

  await page.getByRole("button", { name: "Toggle chat" }).click();
  assert.ok(await distance() < 2, "late-mounted Group chat starts at newest message");
  await page.locator('[data-testid="messages"]').evaluate((element) => { element.scrollTop = 0; });
  await page.getByRole("button", { name: "Append message" }).click();
  assert.ok(await page.locator('[data-testid="messages"]').evaluate((element) => element.scrollTop) < 2,
    "new content does not pull a reader away from older messages");

  await page.getByRole("button", { name: "Toggle chat" }).click();
  await page.getByRole("button", { name: "Toggle chat" }).click();
  assert.ok(await page.locator('[data-testid="messages"]').evaluate((element) => element.scrollTop) < 2,
    "Group tab changes preserve an upward scroll position");

  await page.getByRole("button", { name: "Latest" }).click();
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-testid="messages"]');
    return element && element.scrollHeight - element.scrollTop - element.clientHeight < 2;
  });
  await page.getByRole("button", { name: "Append message" }).click();
  assert.ok(await distance() < 2, "new content sticks while already at bottom");

  await page.getByRole("button", { name: "Open DM" }).click();
  assert.ok(await distance() < 2, "ordinary direct chat starts at newest message");
  assert.deepEqual(errors, []);
  console.log("PASS Group tab mount, upward scroll, tab restore, bottom stickiness, and direct chat");
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
