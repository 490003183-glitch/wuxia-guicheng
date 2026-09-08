#!/usr/bin/env node
// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadManifest} from './render_prompt_delivery_html.mjs';
import {loadAndValidatePackage} from '../../compile-director-draft-to-seedance-package/scripts/validate_director_seedance_package.mjs';
import {parsePromptMarkdown} from './read_prompt_markdown.mjs';

export function markdownFromDelivery(m,{episode,revision}) {
  const units=m.generation_units||m.blocks;
  const lines=['<!-- seedance-reader '+JSON.stringify({schema:1,episode,revision,status:'ready',blocks:units.length})+' -->',`# ${m.title}`,'',...([m.acceptance_note,m.revision_note,...(m.scope_notes||[])].filter(Boolean).flatMap(note=>[note,'']))];
  if(m.style_references?.length) {
    lines.push('## 独立风格污染参考','');
    for(const a of m.style_references)lines.push(`![${a.id}](${a.path.split('/').map(encodeURIComponent).join('/')})`,'',`路径：\`${a.path}\``,'',a.usage||'','');
    lines.push('以下图片不属于任何条目的剧情资产上传清单。','');
  }
  for(const u of units) {
    lines.push(`## ${u.id} · ${u.title||u.id}`,'',u.shooting?`工作预算：${u.shooting.estimated_duration_s}秒 · ${u.assets.length}张剧情参考图。`:`时长：${u.duration_status||u.durationStatus} · ${u.assets.length}张剧情参考图。`,'');
    if(u.class)lines.push(`生成形态：${u.class}`,'');
    if(u.assets.length) {
      lines.push('| 顺序 | 资产图片 | 本条用途 |','| --- | --- | --- |',...u.assets.map((a,i)=>`| ${i+1} | [${a.id}](<${a.path}>) | ${String(a.usage||'').replaceAll('|','／')} |`),'','按此顺序上传：','','```text',u.assets.map(a=>a.path).join('\n'),'```','');
    }else lines.push('无需上传图片。依据正式资产规划'+u.asset_basis.baseline_ref+'的TEXT_ONLY决策。','');
    if(u.shooting?.elapsed_from_previous)lines.push('跨条衔接：'+u.shooting.elapsed_from_previous,'');
    lines.push('可复制提示词：','','```text',u.platform_prompt??u.prompt,'```','');
  }
  return lines.join('\n');
}
function main(){
  const args=process.argv.slice(2),get=name=>args[args.indexOf(name)+1];
  if(!args[0]||!args.includes('--episode')||!args.includes('--revision')||!args.includes('--output'))throw Error('usage: write_prompt_delivery_markdown.mjs <manifest.json> --episode EP31 --revision 4 --output <delivery.md>');
  const raw=JSON.parse(fs.readFileSync(args[0],'utf8'));
  const m=raw.generation_units?loadAndValidatePackage(args[0]):{...raw,...loadManifest(args[0])};
  const text=markdownFromDelivery(m,{episode:get('--episode'),revision:Number(get('--revision'))});
  const parsed=parsePromptMarkdown(text),output=path.resolve(get('--output'));
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const temp=output+'.'+process.pid+'.tmp';
  try{fs.writeFileSync(temp,text);fs.renameSync(temp,output);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  console.log(`OK: ${parsed.blocks.length} blocks written to ${output}; reader updates automatically; no HTML generated`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
