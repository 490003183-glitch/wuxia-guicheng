#!/usr/bin/env node
// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createDeliveryStore,digest} from './read_prompt_markdown.mjs';
import {DELIVERY_CSS} from './prompt_delivery_layout.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const webRoot=path.resolve(here,'../assets/live-reader');
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif'};
export function createReaderServer(config,{configPath=''}={}) {
  const store=createDeliveryStore(config),media=new Map();
  const assetUrl=asset=>{
    const stat=fs.statSync(asset.path),id=digest(asset.path+':'+stat.mtimeMs+':'+stat.size);
    media.set(id,asset.path);
    return {...asset,url:'/media/'+id};
  };
  return http.createServer((req,res)=>{
    const send=(code,value,type='application/json; charset=utf-8',headers={})=>{
      const body=Buffer.isBuffer(value)?value:Buffer.from(type.startsWith('application/json')?JSON.stringify(value):value);
      res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin',...headers});res.end(req.method==='HEAD'?undefined:body);
    };
    try {
      if(!['GET','HEAD'].includes(req.method))return send(405,{error:'只读服务'});
      const host=req.headers.host||'';
      if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))return send(403,{error:'仅限本机访问'});
      if(req.headers.origin && !['http://'+host].includes(req.headers.origin))return send(403,{error:'拒绝跨来源读取'});
      const url=new URL(req.url,'http://'+host);
      if(url.pathname==='/api/health')return send(200,{app:'seedance-md-reader',config:configPath,pid:process.pid});
      if(url.pathname==='/')return send(200,fs.readFileSync(path.join(webRoot,'index.html')),'text/html; charset=utf-8',{'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'"});
      if(url.pathname==='/layout.css')return send(200,DELIVERY_CSS,'text/css; charset=utf-8');
      if(url.pathname==='/layout.mjs')return send(200,fs.readFileSync(path.join(here,'prompt_delivery_ui.mjs')),'text/javascript; charset=utf-8');
      if(url.pathname==='/reader.mjs')return send(200,fs.readFileSync(path.join(webRoot,'reader.mjs')),'text/javascript; charset=utf-8');
      if(url.pathname==='/api/latest'||url.pathname==='/api/markdown') {
        const data=store.latest(url.searchParams.get('episode')||config.episodes[0].id);
        if(url.pathname==='/api/markdown')return send(200,fs.readFileSync(data.file),'text/markdown; charset=utf-8',{'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(path.basename(data.file))});
        const snapshot={...data,sourceHash:data.hash,styles:data.styles.map(assetUrl),blocks:data.blocks.map(block=>({...block,assets:block.assets.map(assetUrl)}))};
        snapshot.hash=digest(JSON.stringify([data.hash,snapshot.styles,snapshot.blocks]));
        const tag='"'+digest(JSON.stringify(snapshot))+'"';
        if(req.headers['if-none-match']===tag){res.writeHead(304,{'ETag':tag,'Cache-Control':'no-store'});return res.end();}
        return send(200,snapshot,'application/json; charset=utf-8',{'ETag':tag});
      }
      const id=url.pathname.match(/^\/media\/([a-f0-9]{64})$/)?.[1];
      if(id && media.has(id))return send(200,fs.readFileSync(media.get(id)),mime[path.extname(media.get(id)).toLowerCase()],{'Cache-Control':'private, max-age=3600'});
      if(url.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
      return send(404,{error:'未找到'});
    }catch(error){send(503,{error:error.message});}
  });
}
async function health(base) {
  try{const res=await fetch(base+'/api/health',{signal:AbortSignal.timeout(700)});return await res.json();}catch{return null;}
}
async function main(){
  const args=process.argv.slice(2),idx=args.indexOf('--config');
  if(idx<0)throw Error('usage: serve_prompt_reader.mjs --config <reader.json> [--background|--stop]');
  const configPath=path.resolve(args[idx+1]),config=JSON.parse(fs.readFileSync(configPath,'utf8'));
  const root=path.dirname(configPath);
  config.asset_roots=(config.asset_roots||[]).map(p=>path.resolve(root,p));
  config.episodes=config.episodes.map(e=>({...e,root:path.resolve(root,e.root)}));
  if(!Number.isInteger(config.port)||config.port<1024||config.port>65535)throw Error('port must be an integer from 1024 to 65535');
  const base='http://127.0.0.1:'+config.port;
  if(args.includes('--background')||args.includes('--stop')) {
    const existing=await health(base);
    if(existing && (existing.app!=='seedance-md-reader'||existing.config!==configPath))throw Error('端口已有其他服务，请修改 reader.json 的 port');
    if(args.includes('--stop')){if(existing)process.kill(existing.pid,'SIGTERM');console.log('阅读器已停止。');return;}
    if(existing){console.log('阅读器已运行：'+base+'/?episode='+config.episodes[0].id);return;}
    const fd=fs.openSync(path.join(path.dirname(configPath),'reader.log'),'a');
    const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--config',configPath],{detached:true,stdio:['ignore',fd,fd]});child.unref();fs.closeSync(fd);
    for(let n=0;n<12;n++) {await new Promise(resolve=>setTimeout(resolve,250));const live=await health(base);if(live?.app==='seedance-md-reader'&&live.config===configPath){console.log('阅读器已启动：'+base+'/?episode='+config.episodes[0].id+'（未打开浏览器）');return;}}
    throw Error('服务未启动，查看同目录 reader.log');
  }
  const server=createReaderServer(config,{configPath});
  server.on('error',e=>{console.error(e.message);process.exitCode=1;});
  server.listen(config.port,'127.0.0.1',()=>console.log('Seedance MD reader listening on '+base));
  process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
