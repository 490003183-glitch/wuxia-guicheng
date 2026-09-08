// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const fail = message => { throw new Error(message); };
export const digest = value => crypto.createHash('sha256').update(value).digest('hex');
export const READER_MARKER = /^<!-- seedance-reader (\{[^\n]+\}) -->\n/;
export function readDeliveryMetadata(text) {
  const match = text.match(READER_MARKER);
  if (!match) return null;
  const meta = JSON.parse(match[1]);
  if (meta.schema !== 1 || !/^EP\d+$/.test(meta.episode) || !Number.isInteger(meta.revision) || meta.revision < 1 || !Number.isInteger(meta.blocks) || meta.blocks < 1 || !['ready','draft'].includes(meta.status)) fail('MD 交付标记不完整');
  return meta;
}
function mediaPath(value, roots) {
  if (!path.isAbsolute(value) || !/\.(avif|gif|jpe?g|png|webp)$/i.test(value)) fail('图片路径不是完整绝对路径：'+value);
  const real = fs.realpathSync(value);
  if (roots?.length && !roots.some(root => real.startsWith(fs.realpathSync(root)+path.sep))) fail('图片不在已配置的资产目录：'+value);
  if (!fs.statSync(real).isFile()) fail('图片文件不存在：'+value);
  return value;
}
function fenced(lines, start) {
  while(start < lines.length && !lines[start].startsWith('```')) start++;
  if(start===lines.length || lines[start]!=='```text') fail('缺少完整的 text 代码块');
  const end=lines.indexOf('```',start+1);
  if(end<0) fail('text 代码块尚未写完');
  return {text:lines.slice(start+1,end).join('\n'),end};
}
export function parsePromptMarkdown(text, {assetRoots} = {}) {
  text=text.replaceAll('\r\n','\n');
  const meta=readDeliveryMetadata(text);
  if(!meta || meta.status!=='ready') fail('MD 尚未标记为完成交付');
  const lines=text.split('\n'), headings=[];
  let inside=false;
  lines.forEach((line,i)=>{
    if(line.startsWith('```')) { inside=!inside; return; }
    if(!inside && /^## EP\d+-/.test(line)) headings.push(i);
  });
  if(inside) fail('MD 含未关闭的代码块');
  if(headings.length!==meta.blocks) fail(`生成块不完整：应有 ${meta.blocks} 条，实际 ${headings.length} 条`);
  const title=lines.find(line=>line.startsWith('# '))?.slice(2);
  if(!title) fail('缺少 MD 标题');
  const intro=lines.slice(0,headings[0]);
  const styleStart=intro.findIndex(line=>/^## .*风格/.test(line));
  const notes=intro.slice(0,styleStart<0?intro.length:styleStart).filter(line=>line && !line.startsWith('#') && !line.startsWith('<!--'));
  const styles=[];
  for(let i=0;i<intro.length;i++) {
    const match=intro[i].match(/^!\[([^\]]+)\]\((.+)\)$/);
    if(!match) continue;
    const imgPath=decodeURIComponent(match[2].replace(/^<|>$/g,''));
    let end=i+1; while(end<intro.length&&!intro[end].startsWith('![')) end++;
    const usage=intro.slice(i+1,end).filter(line=>line && !line.startsWith('路径：') && !line.startsWith('以下图片')).join('\n');
    styles.push({id:match[1],path:mediaPath(imgPath,assetRoots),usage});
  }
  const ids=new Set();
  const blocks=headings.map((start,index)=>{
    const chunk=lines.slice(start,headings[index+1]??lines.length);
    let inFence=false;
    const outside=chunk.map(line=>{if(line.startsWith('```')){inFence=!inFence;return '';}return inFence?'':line;});
    const heading=chunk[0].match(/^## (EP\d+-\S+) · (.+)$/);
    if(!heading || !heading[1].startsWith(meta.episode+'-') || ids.has(heading[1])) fail('生成块编号重复或格式错误：'+chunk[0]);
    const id=heading[1];ids.add(id);
    const summary=outside.find(line=>/^(工作预算|时长)[：:]/.test(line));
    const count=summary?.match(/(\d+)张剧情参考图/);
    if(!count) fail(id+' 缺少时长／图片数量');
    const assets=outside.flatMap(line=>{
      const m=line.match(/^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\(<([^>]+)>\)\s*\|\s*(.*?)\s*\|$/);
      if(!m) return [];
      if(m[3].includes('风格污染') || styles.some(a=>a.path===m[3])) fail(id+' 将风格参考放入了剧情上传列表');
      return [{order:Number(m[1]),id:m[2],path:mediaPath(m[3],assetRoots),usage:m[4]}];
    });
    if(assets.length!==Number(count[1]) || assets.some((a,i)=>a.order!==i+1) || new Set(assets.map(a=>a.path)).size!==assets.length || new Set(assets.map(a=>a.id)).size!==assets.length) fail(id+' 资产数量／顺序／去重不一致');
    const upload=outside.indexOf('按此顺序上传：');
    if(assets.length) {
      if(upload<0 || fenced(chunk,upload+1).text!==assets.map(a=>a.path).join('\n')) fail(id+' 上传路径与图片表不一致');
    } else if(upload>=0 || !outside.some(line=>line.startsWith('无需上传图片。'))) fail(id+' 缺少明确的无需上传图片说明');
    const label=outside.indexOf('可复制提示词：');
    if(label<0) fail(id+' 缺少提示词');
    const prompt=fenced(chunk,label+1).text;
    if(!prompt.trim()) fail(id+' 提示词为空');
    const promptId=prompt.match(/^生成编号：(.+)$/m)?.[1];
    if(promptId && promptId!==id) fail(id+' 与提示词内生成编号不一致');
    const transition=outside.find(line=>line.startsWith('跨条衔接：'))?.slice('跨条衔接：'.length)||'';
    const generationClass=outside.find(line=>line.startsWith('生成形态：'))?.slice(5)||'AUTO_EVENT';
    if(!['AUTO_EVENT','AUTO_EDITED','DIRECTED_CAPTURE'].includes(generationClass))fail(id+' 生成形态不正确');
    return {id,title:heading[2],summary,prompt,assets,transition,generationClass,asset_mode:assets.length?'REFERENCE_IMAGES':'TEXT_ONLY',asset_basis:{baseline_ref:outside.find(line=>line.startsWith('无需上传图片。'))?.match(/规划\s*([A-Za-z0-9_-]+)/)?.[1]||'MD 无图决策'}};
  });
  return {meta,title,notes,styles,blocks,hash:digest(text)};
}

export function createDeliveryStore(config) {
  const cache=new Map();
  return {
    latest(episodeId) {
      const episode=config.episodes.find(e=>e.id===episodeId);
      if(!episode) fail('没有登记这一集：'+episodeId);
      const candidates=[],ignored=[];
      for(const entry of fs.readdirSync(episode.root,{withFileTypes:true})) {
        if(!entry.isDirectory() || !entry.name.startsWith(episode.directory_prefix)) continue;
        const file=path.join(episode.root,entry.name,episode.markdown_name);
        if(!fs.existsSync(file)) continue;
        const stat=fs.statSync(file),key=stat.mtimeMs+':'+stat.size;
        let record=cache.get(file);
        if(!record || record.key!==key || record.error) {
          let text,meta,data,error;
          try { text=fs.readFileSync(file,'utf8');meta=readDeliveryMetadata(text); if(meta?.status==='ready')data=parsePromptMarkdown(text,{assetRoots:config.asset_roots}); }
          catch(e){error=e.message;}
          record={key,meta,data,error};cache.set(file,record);
        }
        if(record.meta?.episode!==episodeId || record.meta.status!=='ready') continue;
        if(record.error) ignored.push({revision:record.meta.revision,file,error:record.error});
        else candidates.push({...record.data,file});
      }
      candidates.sort((a,b)=>b.meta.revision-a.meta.revision);
      if(!candidates.length) fail('没有完整可读的已交付 MD'+(ignored.length?'；'+ignored[0].error:''));
      if(candidates[1]?.meta.revision===candidates[0].meta.revision) fail('同一修订号存在两份交付，请先确定当前文件');
      const current=candidates[0];
      // Recheck availability even when MD bytes did not change.
      for(const asset of [...current.styles,...current.blocks.flatMap(b=>b.assets)]) mediaPath(asset.path,config.asset_roots);
      return {...current,warnings:ignored.filter(x=>x.revision>=current.meta.revision).map(x=>`R${x.revision} 尚未完整：${x.error}。当前仍显示 R${current.meta.revision}。`)};
    }
  };
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const file=process.argv[2],p=parsePromptMarkdown(fs.readFileSync(file,'utf8'));console.log(`OK: ${p.meta.episode} R${p.meta.revision}, ${p.blocks.length} blocks, exact MD payloads parsed`); }
  catch(error){console.error(error.message);process.exitCode=1;}
}
