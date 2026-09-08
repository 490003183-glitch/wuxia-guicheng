// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
// Structural handoff checks; source extraction and artistic readiness still need a real cold read.
import { speechParticipants } from '../../wuxia-seedance-scene-prompts/scripts/prompt_realization.mjs';
const fail = message => { throw new Error(`PRODUCTION_HANDOFF: ${message}`); };
const nonempty = (x, name) => { if (typeof x !== 'string' || !x.trim()) fail(`${name} is required`); return x; };
const array = (x, name) => { if (!Array.isArray(x)) fail(`${name} must be an array`); return x; };
const strings = (x, name, allowEmpty=false) => { array(x,name); if (!allowEmpty && !x.length) fail(`${name} cannot be empty`); x.forEach(v=>nonempty(v,name)); if(new Set(x).size!==x.length) fail(`${name} contains duplicates`); return x; };
const equal = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const positive = (x,name) => { if(typeof x!=='number'||!Number.isFinite(x)||x<=0) fail(`${name} must be positive`); };
export function validateProductionHandoff(m, {screenplayText}={}) {
  const review=m.screenplay_readiness;
  if (!review || review.source_screenplay_sha256!==m.sources.screenplay.sha256) fail('screenplay_readiness must bind the current screenplay');
  if(review.status!=='ready' || review.fidelity_audit!=='passed' || review.screenplay_only_cold_read!=='passed' || review.language_and_carriers!=='resolved') fail('screenplay intake is not ready');
  strings(review.scope_refs,'screenplay_readiness.scope_refs');
  strings(review.evidence_refs,'screenplay_readiness.evidence_refs');
  if(array(review.unresolved,'screenplay_readiness.unresolved').length) fail('screenplay has unresolved carriers');
  const ledger=array(m.speech_ledger,'speech_ledger');
  const speech=new Map();
  ledger.forEach((s,i)=>{
    for(const k of ['id','source_ref','speaker','receiver','text']) nonempty(s?.[k],`speech_ledger[${i}].${k}`);
    if(speech.has(s.id)) fail(`duplicate speech occurrence ${s.id}`);
    if(s.delivery!=='generated_dialogue') fail(`SEPARATE_DUBBING_FORBIDDEN: ${s.id} speech must be generated with video`);
    if(screenplayText!==undefined && !screenplayText.includes(s.text)) fail(`speech ${s.id} text is absent from bound screenplay`);
    speech.set(s.id,{...s,index:i});
  });
  const fragments=new Map();
  for(const [i,s] of ledger.entries()) {
    if(s.source_utterance_id==null) continue;
    nonempty(s.source_utterance_id,`${s.id}.source_utterance_id`);
    nonempty(s.source_utterance_text,`${s.id}.source_utterance_text`);
    const group=fragments.get(s.source_utterance_id)??[];
    if(s.segment_index!==group.length+1) fail(`${s.id} invalid utterance fragment order`);
    if(group.length && (group.at(-1).index!==i-1 || ['speaker','receiver','delivery','source_utterance_text'].some(k=>group[0][k]!==s[k]))) fail(`${s.id} inconsistent utterance fragments`);
    group.push({...s,index:i}); fragments.set(s.source_utterance_id,group);
  }
  for(const [id,group] of fragments) {
    if(group.map(s=>s.text).join('')!==group[0].source_utterance_text) fail(`${id} fragments change the source utterance`);
    if(screenplayText!==undefined && !screenplayText.includes(group[0].source_utterance_text)) fail(`${id} source utterance absent from screenplay`);
  }
  const takes=new Set(), owners=new Map(), primaryOwners=new Set(), candidates=new Map(), previousByContinuity=new Map();
  for(const [i,u] of m.generation_units.entries()) {
    if(u.take_role==='clean_audio') fail(`SEPARATE_DUBBING_FORBIDDEN: ${u.id}`);
    const t=u.shooting;
    if(!t) fail(`${u.id} has no shooting plan`);
    const organization=t.organization??'continuous_scene';
    if(!['continuous_scene','edited_sequence'].includes(organization)) fail(`${u.id} unknown generation organization`);
    for(const k of ['take_id','capacity_basis']) nonempty(t[k],`${u.id}.shooting.${k}`);
    if(organization==='edited_sequence') {
      if(u.class!=='AUTO_EDITED') fail(`${u.id} edited_sequence requires AUTO_EDITED`);
      nonempty(t.content_plan,`${u.id}.content_plan`);
      const segments=array(t.segments,`${u.id}.segments`);
      if(segments.length<2) fail(`${u.id} edited sequence must declare its constituent segments`);
      const ids=new Set();
      for(const segment of segments) {
        for(const k of ['id','space_id','time_group','content','start_state','end_state']) nonempty(segment[k],`${u.id}.segments.${k}`);
        if(ids.has(segment.id)) fail(`${u.id} duplicate segment ${segment.id}`); ids.add(segment.id);
        for(const ref of strings(segment.source_refs,`${u.id}.segment.source_refs`)) if(!u.source_refs?.includes(ref)) fail(`${u.id} segment source is not covered by this unit: ${ref}`);
      }
    } else {
      if(u.class==='AUTO_EDITED') fail(`${u.id} AUTO_EDITED requires edited_sequence organization`);
      for(const k of ['space_id','time_group','start_state','end_state']) nonempty(t[k],`${u.id}.shooting.${k}`);
      nonempty(t.content_plan??t.continuous_action,`${u.id}.content_plan`);
    }
    if(takes.has(t.take_id)) fail(`TAKE ${t.take_id} assigned to multiple generations; revise director grouping explicitly`);
    takes.add(t.take_id);
    if(t.source_director_sha256!==m.sources.director.sha256) fail(`${u.id} shooting plan uses a stale director`);
    const participants=strings(t.participants,`${u.id}.participants`);
    const silent=strings(t.silent_participants,`${u.id}.silent_participants`,true);
    const ids=strings(t.speech_ids,`${u.id}.speech_ids`,true);
    const allowed=ids.map(id=>{const s=speech.get(id);if(!s || s.delivery!=='generated_dialogue') fail(`${u.id} unknown or post-produced speech ${id}`);return s;});
    if(allowed.some((s,n)=>n && s.index<allowed[n-1].index)) fail(`${u.id} dialogue order differs from screenplay`);
    for(const s of allowed) if(!participants.includes(s.speaker)) fail(`${u.id} speaking participant missing: ${s.speaker}`);
    const expectedSilent=participants.filter(n=>!allowed.some(s=>s.speaker===n)).sort();
    if(!equal([...silent].sort(),expectedSilent)) fail(`${u.id} silent participants disagree with exact speech`);
    if(allowed.length) for(const n of silent) if(!u.platform_prompt.split(/\r?\n/).includes(`特殊规则：${n}全程无台词。`)) fail(`${u.id} missing explicit silence for ${n}`);
    const actual=speechParticipants(u.platform_prompt).map(({speaker,receiver,text})=>({speaker,receiver,text}));
    const expected=allowed.map(({speaker,receiver,text})=>({speaker,receiver,text}));
    if(!equal(actual,expected)) fail(`${u.id} final prompt speech differs from source ledger (text, speaker, receiver, order or count)`);
    for(const s of allowed) {
      if(!candidates.has(s.id)) candidates.set(s.id,new Set());
      candidates.get(s.id).add(u.id);
      if(u.take_role==='primary') {
        if(primaryOwners.has(s.id)) fail(`speech ${s.id} repeated in primary takes`);
        primaryOwners.add(s.id); owners.set(s.id,u.id);
      }
    }
    positive(t.estimated_duration_s,`${u.id}.estimated_duration_s`); positive(t.capacity_s,`${u.id}.capacity_s`);
    if(t.estimated_duration_s>t.capacity_s) fail(`${u.id} exceeds generation capacity`);
    const reason=t.split_reason;
    if(!reason || !['start','space_change','time_change','capacity','action_control','reference_incompatibility','state_discontinuity','indispensable_acquisition','complete_deliverable'].includes(reason.kind)) fail(`${u.id} has no concrete production split reason`);
    nonempty(reason.detail,`${u.id}.split_reason.detail`);
    if(/^(?:镜头变化|切镜|无台词|反应镜头|逐句|SH[\d-]+)[。\s]*$/u.test(reason.detail)) fail(`${u.id} edit changes alone cannot justify splitting a take`);
    if(reason.kind==='start' && i!==0) fail(`${u.id} cannot reset shooting without a split reason`);
    const prev=m.generation_units[i-1]?.shooting;
    if(organization==='continuous_scene' && prev && (prev.organization??'continuous_scene')==='continuous_scene' && reason.kind==='space_change' && prev.space_id===t.space_id) fail(`${u.id} claims a space change inside the same space`);
    if(organization==='continuous_scene' && prev && (prev.organization??'continuous_scene')==='continuous_scene' && reason.kind==='time_change' && prev.time_group===t.time_group) fail(`${u.id} claims a time change in continuous time`);
    const key=JSON.stringify([t.space_id,t.time_group]);
    const prior=previousByContinuity.get(key);
    if(u.take_role==='primary') {
      if(organization==='continuous_scene' && prior && reason.kind==='capacity' && prior.estimated_duration_s+t.estimated_duration_s<=Math.min(prior.capacity_s,t.capacity_s)) fail(`${u.id} claimed capacity split fits one take; merge or state the actual production constraint`);
      if(organization==='continuous_scene') previousByContinuity.set(key,t);
    } else {
      nonempty(t.parent_take_id,`${u.id}.parent_take_id`);
      if(reason.kind!=='indispensable_acquisition') fail(`${u.id} supplemental take needs acquisition reason`);
    }
  }
  for(const u of m.generation_units) if(u.take_role!=='primary' && (u.shooting.parent_take_id===u.shooting.take_id || !takes.has(u.shooting.parent_take_id))) fail(`${u.id} missing parent TAKE`);
  const postMap=new Map((m.post_units??[]).map(p=>[p.id,p]));
  for(const p of postMap.values()) {
    const ids=strings(p.speech_ids,`${p.id}.speech_ids`,true);
    if(p.kind==='sound') fail(`${p.id} SOUND_DESIGN_OWNED_BY_USER: do not schedule effects tasks`);
    if(['voiceover','dialogue_audio'].includes(p.kind) || ids.length) fail(`${p.id} SEPARATE_DUBBING_FORBIDDEN: post units cannot carry speech`);

  }
  for(const id of speech.keys()) if(!owners.has(id)) fail(`speech ${id} has no production carrier`);
  const selected=[];
  for(const e of m.edit_units) {
    if(e.speech_sources!=null) fail(`${e.id} SEPARATE_DUBBING_FORBIDDEN: alternate speech routing removed`);
    for(const id of strings(e.speech_ids,`${e.id}.speech_ids`,true)) {
      if(!speech.has(id)) fail(`${e.id} unknown speech ${id}`);
      const available=e.audio_unit_ids.filter(unit=>candidates.get(id)?.has(unit));
      if(!available.length) fail(`${e.id} speech ${id} has no selected audio carrier`);
      if(available.length!==1) fail(`${e.id} SEPARATE_DUBBING_FORBIDDEN: ambiguous replacement speech`);
      const chosen=available[0];
      if(chosen!==owners.get(id) && !e.picture_unit_ids.includes(chosen)) fail(`${e.id} SEPARATE_DUBBING_FORBIDDEN: replacement sound must not dub another video`);
      if(!m.edit_units.some(edit=>edit.picture_unit_ids.includes(chosen))) fail(`${e.id} SEPARATE_DUBBING_FORBIDDEN: audio-only generation disguised as video`);
      selected.push(id);
    }
    for(const id of [...e.picture_unit_ids,...e.audio_unit_ids]) {
      const p=postMap.get(id);if(!p) continue;
      if(e.picture_unit_ids.includes(id) && ['voiceover','dialogue_audio','sound'].includes(p.kind)) fail(`${e.id} uses audio-only post unit as picture`);
      if(e.audio_unit_ids.includes(id) && ['text','still'].includes(p.kind)) fail(`${e.id} uses picture-only post unit as audio`);
    }
  }
  if(!equal(selected,ledger.map(s=>s.id))) fail('edit speech occurrences omit, duplicate or reorder the source ledger');
  return m;
}
