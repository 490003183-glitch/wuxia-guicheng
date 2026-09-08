// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {parsePromptMarkdown,createDeliveryStore} from '../scripts/read_prompt_markdown.mjs';
import {markdownFromDelivery} from '../scripts/write_prompt_delivery_markdown.mjs';
import {createReaderServer} from '../scripts/serve_prompt_reader.mjs';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'seedance-reader-'));
let server;
try {
  const img={id:'DEMO-IMG',path:path.join(temp,'reference.png'),usage:'Test image'};
  fs.writeFileSync(img.path,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1pAAAAAASUVORK5CYII=','base64'));
  const fixture={title:'Reader test',blocks:[{id:'EP31-GEN-01',title:'测试',duration_status:'未校准',prompt:'生成编号：EP31-GEN-01\n\n原文 A & B < C。\n## EP31-GEN-99 · 这只是提示词正文',assets:[img]}]};
  const assetRoot=temp;
  const config={asset_roots:[assetRoot],episodes:[{id:'EP31',root:temp,directory_prefix:'ep31_seedance_',markdown_name:'EP31_全部提示词.md'}]};
  function publish(dir,revision,edit=text=>text){const folder=path.join(temp,'ep31_seedance_'+dir);fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,'EP31_全部提示词.md');fs.writeFileSync(file,edit(markdownFromDelivery(fixture,{episode:'EP31',revision})));return file;}
  const old=publish('R04',4),store=createDeliveryStore(config);
  assert.equal(store.latest('EP31').meta.revision,4);
  const next=publish('R05',5,text=>text.replace('"status":"ready"','"status":"draft"'));
  assert.equal(store.latest('EP31').meta.revision,4);
  publish('R05',5,text=>text.replace('"blocks":1','"blocks":2'));
  assert.equal(store.latest('EP31').meta.revision,4);assert.equal(store.latest('EP31').warnings.length,1);
  publish('R05',5);assert.equal(store.latest('EP31').meta.revision,5);
  fs.utimesSync(old,new Date('2099-01-01'),new Date('2099-01-01'));assert.equal(store.latest('EP31').meta.revision,5);
  const duplicate=publish('duplicate',5);assert.throws(()=>store.latest('EP31'),/同一修订号/);fs.unlinkSync(duplicate);
  const altered=fs.readFileSync(next,'utf8').replace('原文 A & B < C。','修改后的原文。');fs.writeFileSync(next,altered);
  assert.ok(store.latest('EP31').blocks[0].prompt.includes('修改后的原文。'));
  assert.throws(()=>parsePromptMarkdown(altered.slice(0,-5)),/未关闭|未写完/);
  assert.throws(()=>parsePromptMarkdown(altered.replace('上传：','上传缺失：')),/上传路径/);
  console.log('PASS: highest ready revision wins; drafts, partial saves, duplicate revisions and broken upload mappings are handled; touching history never promotes it.');

  server=createReaderServer(config);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  let res=await fetch(base+'/api/latest?episode=EP31');assert.equal(res.status,200);let tag=res.headers.get('etag');let data=await res.json();assert.equal(data.meta.revision,5);
  res=await fetch(base+'/api/latest?episode=EP31',{headers:{'If-None-Match':tag}});assert.equal(res.status,304);
  res=await fetch(base+data.blocks[0].assets[0].url);assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'image/png');
  res=await fetch(base+'/api/markdown?episode=EP31');assert.equal(await res.text(),altered);
  const shell=await (await fetch(base+'/')).text();assert.ok(shell.includes('/reader.mjs'));assert.ok(!shell.includes('修改后的原文。'));
  publish('R06',6);res=await fetch(base+'/api/latest?episode=EP31',{headers:{'If-None-Match':tag}});assert.equal(res.status,200);data=await res.json();assert.equal(data.meta.revision,6);
  assert.equal(await (await fetch(base+'/')).text(),shell,'The website shell must not change when MD changes');
  res=await fetch(base+'/media/'+('a'.repeat(64)));assert.equal(res.status,404);
  res=await fetch(base+'/api/latest?episode=EP31',{headers:{origin:'https://unrelated.invalid'}});assert.equal(res.status,403);
  res=await fetch(base+'/api/latest?episode=EP31',{method:'POST'});assert.equal(res.status,405);
  console.log('PASS: real loopback HTTP updates from MD without rebuilding HTML, returns 304 when unchanged, serves only bound media, downloads exact MD, rejects cross-origin and write requests. No browser opened.');
} finally {
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  fs.rmSync(temp,{recursive:true,force:true});
}
