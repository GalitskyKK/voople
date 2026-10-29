import assert from 'node:assert/strict';
import path from 'node:path';

export async function verifyOrbitMedia(page,surface,{artifacts,host,width,theme}) {
  await surface.getByRole('button',{name:'Включить камеру',exact:true}).click();
  const stage=surface.locator('.voople-orbit-media-stage');
  await stage.waitFor();
  assert.equal(await stage.getAttribute('data-media-layout'),'grid');
  assert.equal(await stage.locator('.voople-orbit-media-participant').count(),8);
  const avatars=stage.locator('.voople-orbit-media-participant .voople-orbit-call-tile__identity');
  assert.ok(await avatars.count()>0);
  for(const size of await avatars.evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {width:b.width,height:b.height}}))) assert.ok(Math.abs(size.width-size.height)<2,'media keeps square Orbit identities');
  await stage.getByRole('button',{name:/Показать камеру.*крупно/}).first().click();
  assert.equal(await stage.getAttribute('data-media-layout'),'focus');
  await stage.getByRole('button',{name:'Выйти из фокуса',exact:true}).click();
  assert.equal(await stage.getAttribute('data-media-layout'),'grid');
  await surface.getByRole('button',{name:'Показать экран',exact:true}).click();
  const screen=stage.locator('.voople-orbit-screen-media');await screen.waitFor();
  assert.equal(await stage.getAttribute('data-media-layout'),'focus','local screen starts focused');
  const bounds=await screen.boundingBox();const frame=await stage.boundingBox();
  assert.ok(bounds.height>96 && bounds.y>=frame.y && bounds.y+bounds.height<=frame.y+frame.height+1,'focused share fits the visible stage');
  const video=stage.locator('video[data-fixture-video="screenfixture"]');
  await video.evaluate(node=>{node.dataset.continuity='same-screen'});
  assert.equal(await video.evaluate(node=>getComputedStyle(node).objectFit),'contain');
  await page.screenshot({path:path.join(artifacts,`orbit-media-focus-${host}-${width}-${theme}.png`)});
  await stage.getByRole('button',{name:'Выйти из фокуса',exact:true}).click();
  assert.equal(await stage.getAttribute('data-media-layout'),'grid');
  assert.equal(await video.getAttribute('data-continuity'),'same-screen','switching layout preserves the media node');
  const shareBox=await screen.boundingBox();
  for(const tileBox of await stage.locator('.voople-orbit-media-participant').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {y:b.y,height:b.height}}))) assert.ok(tileBox.y>=shareBox.y+shareBox.height-1,'media grid rows never overlap the share');
  await screen.getByRole('button',{name:/Показать демонстрацию.*крупно/}).click();
  await surface.focus();await page.keyboard.press('Escape');
  assert.equal(await stage.getAttribute('data-media-layout'),'grid','Escape leaves focus before closing the Room');
  assert.equal(await surface.count(),1);
  await page.screenshot({path:path.join(artifacts,`orbit-media-grid-${host}-${width}-${theme}.png`)});
  await surface.getByRole('button',{name:'Остановить демонстрацию',exact:true}).click();
  await surface.getByRole('button',{name:'Выключить камеру',exact:true}).click();
  await surface.locator('.voople-orbit-call-grid').waitFor();
}
