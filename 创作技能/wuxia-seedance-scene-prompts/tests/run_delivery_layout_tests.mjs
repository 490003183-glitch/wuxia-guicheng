// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { DELIVERY_CSS, DELIVERY_SCRIPT, DELIVERY_LAYOUT_VERSION } from '../scripts/prompt_delivery_layout.mjs';
import { renderPage as renderScenes } from '../scripts/render_prompt_delivery_html.mjs';
import { renderPage as renderPackage } from '../../compile-director-draft-to-seedance-package/scripts/render_director_seedance_package_html.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seedance-layout-'));
try {
  const style = { id:'STYLE-ONLY', path:path.join(temp,'style.png'), usage:'独立风格资料' };
  fs.writeFileSync(style.path, 'fixture');
  const asset = { id:'ASSET-01', path:path.join(temp,'asset & one.png'), usage:'只用于角色与已有道具' };
  const prompt = '完整原话："A & B < C"。\n第二段原文。';
  const blocks = Array.from({length:3},(_,i)=>({ id:`TEST-GEN-${i+1}`, title:`生成块 ${i+1}`, durationStatus:'未校准', prompt, assets:i===1?[]:[asset], asset_mode:i===1?'TEXT_ONLY':'REFERENCE_IMAGES', asset_basis:{baseline_ref:'T01'} }));
  const units = blocks.map(b=>({...b, class:'AUTO_EVENT', projection_profile:'dialogue_autocut', platform_prompt:b.prompt, scene_id:'S01', director_refs:[], edit_refs:[], protected_facts:[], selection_criteria:[], shooting:{take_id:b.id,participants:[],speech_ids:[],estimated_duration_s:10,capacity_s:15,split_reason:{detail:'fixture'}}, handles:{picture_head_s:0,picture_tail_s:0,audio_head_s:0,audio_tail_s:0}, fallback:{unit_ids:[]} }));
  const sceneManifest={title:'测试页',blocks,style_references:[style]};
  const packageManifest={title:'测试页',generation_units:units,style_references:[style],sources:{},edit_units:[],post_units:[],coverage:[]};
  const pages=[renderScenes(sceneManifest),renderPackage(packageManifest)];
  const unescape=s=>s.replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&');
  for (const [kind,html] of pages.entries()) {
    assert.ok(html.includes(`data-delivery-layout="${DELIVERY_LAYOUT_VERSION}"`));
    assert.equal(html.match(/<style>([\s\S]*?)<\/style>/)[1],DELIVERY_CSS);
    const cards=[...html.matchAll(/<article class="unit-card[^>]*data-unit="(\d+)"[^>]*>([\s\S]*?)<\/article>/g)];
    assert.equal(cards.length,3);
    assert.deepEqual([...html.matchAll(/class="take-link" href="([^"]+)"/g)].map(x=>x[1]),['#take-1','#take-2','#take-3']);
    for (const [i,card] of cards.entries()) {
      assert.ok(!card[0].split('>')[0].includes('hidden'));
      assert.equal(unescape(card[2].match(/<pre[^>]*>([\s\S]*?)<\/pre>/)[1]),prompt);
      assert.ok(!card[2].includes(style.id));
      const controls=[...card[2].matchAll(/data-copy="([^"]+)"/g)].map(x=>x[1]);
      assert.equal(controls.length,i===1?1:2);
      if(i!==1) {
        assert.equal(unescape(card[2].match(/<span id="[^"]+" hidden>([\s\S]*?)<\/span>/)[1]),asset.path);
        assert.ok(card[2].indexOf('asset-grid')<card[2].indexOf('prompt-section'));
      }
      for (const id of controls) assert.ok(card[2].includes(`id="${id}"`));
    }
  }
  const changed=renderScenes({...sceneManifest,title:'另一集',blocks:[...blocks,{...blocks[0],id:'NEW-GEN-04'}]});
  assert.equal(changed.match(/<style>([\s\S]*?)<\/style>/)[1],DELIVERY_CSS);
  assert.equal((changed.match(/class="take-link"/g)||[]).length,4);
  console.log('PASS: both renderers share the frozen layout; data edits preserve layout, all blocks and anchors are present, exact copy payloads survive, style-only images stay separate.');

  let offset=0;
  const list={scrollTop:0,getBoundingClientRect:()=>({top:100,bottom:500})};
  const links=Array.from({length:49},(_,i)=>({attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},getBoundingClientRect(){return {top:100+i*50-list.scrollTop,bottom:145+i*50-list.scrollTop}}}));
  const cards=Array.from({length:49},(_,i)=>({getBoundingClientRect:()=>({top:i*1000-offset})}));
  const handlers={},frames=[];
  vm.runInNewContext(DELIVERY_SCRIPT,{document:{querySelectorAll:s=>s==='[data-unit]'?cards:s==='.take-link'?links:[],querySelector:()=>list},window:{addEventListener:(e,fn)=>handlers[e]=fn},requestAnimationFrame:fn=>frames.push(fn)});
  const current=()=>links.flatMap((a,i)=>a.attrs['aria-current']==='location'?[i]:[]);
  assert.deepEqual(current(),[0]);
  for(const [scroll,expected] of [[10000,10],[3000,3],[100000,48]]) {
    offset=scroll;handlers.scroll();handlers.scroll();assert.equal(frames.length,1);frames.shift()();assert.deepEqual(current(),[expected]);
    const rect=links[expected].getBoundingClientRect();assert.ok(rect.top>=100&&rect.bottom<=500);
  }
  console.log('PASS: current-block navigation moves forward, backward and to the final block; sidebar reveals the active button without moving the document.');
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
