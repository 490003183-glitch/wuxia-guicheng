#!/usr/bin/env node
// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
import assert from 'node:assert/strict';
import {validateProductionHandoff} from './production_handoff.mjs';
import {speechSequenceDiagnostics,eventRealizationDiagnostics} from '../../wuxia-seedance-scene-prompts/scripts/prompt_realization.mjs';
const hash='a'.repeat(64), director='b'.repeat(64);
const clone=structuredClone;
function base() {
  const ledger=[{id:'D1',source_ref:'S1-D1',speaker:'甲',receiver:'对乙',text:'位置确认了吗？',delivery:'generated_dialogue'}, {id:'D2',source_ref:'S1-D2',speaker:'乙',receiver:'对甲',text:'已经确认。',delivery:'generated_dialogue'}, {id:'D3',source_ref:'S1-D3',speaker:'甲',receiver:'对乙',text:'开始执行。',delivery:'generated_dialogue'}];
  return {sources:{screenplay:{sha256:hash},director:{sha256:director}},screenplay_readiness:{source_screenplay_sha256:hash,status:'ready',fidelity_audit:'passed',screenplay_only_cold_read:'passed',language_and_carriers:'resolved',scope_refs:['S1'],evidence_refs:['S1 scenes and carrier review'],unresolved:[]},speech_ledger:ledger,post_units:[],generation_units:[{id:'G1',take_role:'primary',platform_prompt:ledger.map(s=>`${s.speaker}（${s.receiver}）说：“${s.text}”`).join('\n')+'\n特殊规则：丙全程无台词。',shooting:{take_id:'TAKE1',source_director_sha256:director,space_id:'room',time_group:'T1',participants:['甲','乙','丙'],silent_participants:['丙'],speech_ids:['D1','D2','D3'],start_state:'等待答复',end_state:'决定已交付',continuous_action:'询问、答复、决定连续表演',estimated_duration_s:12,capacity_s:15,capacity_basis:'test capacity',split_reason:{kind:'start',detail:'首次拍摄'}}}],edit_units:[{id:'ED1',picture_unit_ids:['G1'],audio_unit_ids:['G1'],speech_ids:['D1','D2']},{id:'ED2',picture_unit_ids:['G1'],audio_unit_ids:['G1'],speech_ids:['D3']}]};
}
let count=0;
function pass(name,mutate=()=>{}) {const m=base();mutate(m);assert.doesNotThrow(()=>validateProductionHandoff(m));count++;}
function bad(name,mutate,fragment) {const m=base();mutate(m);assert.throws(()=>validateProductionHandoff(m),e=>e.message.includes(fragment),name);count++;}
pass('one continuous take supplies multiple edits');
bad('intake omitted',m=>delete m.screenplay_readiness,'screenplay_readiness');
bad('accepted is not playable',m=>m.screenplay_readiness.status='accepted','not ready');
bad('cold read missing',m=>m.screenplay_readiness.screenplay_only_cold_read='not_done','not ready');
bad('carrier unresolved',m=>m.screenplay_readiness.unresolved=['汇报无准确语言'],'unresolved');
bad('stale screenplay',m=>m.screenplay_readiness.source_screenplay_sha256=director,'current screenplay');
bad('stale director',m=>m.generation_units[0].shooting.source_director_sha256=hash,'stale director');
bad('missing take',m=>delete m.generation_units[0].shooting,'shooting plan');
bad('missing line',m=>m.generation_units[0].platform_prompt=m.generation_units[0].platform_prompt.replace('甲（对乙）说：“开始执行。”',''),'differs');
bad('new line',m=>m.generation_units[0].platform_prompt+='\n甲（对乙）说：“马上出发。”','differs');
bad('wrong receiver',m=>m.generation_units[0].platform_prompt=m.generation_units[0].platform_prompt.replace('对乙','对丙'),'differs');
bad('wrong speaker',m=>m.generation_units[0].platform_prompt=m.generation_units[0].platform_prompt.replace('乙（对甲）','甲（对甲）'),'differs');
bad('repeat dialogue',m=>m.generation_units[0].platform_prompt+='\n甲（对乙）说：“开始执行。”','differs');
bad('missing participant silence',m=>m.generation_units[0].platform_prompt=m.generation_units[0].platform_prompt.replace('特殊规则：丙全程无台词。',''),'explicit silence');
bad('speaker marked silent',m=>m.generation_units[0].shooting.silent_participants.push('甲'),'silent participants');
bad('edit double speech',m=>m.edit_units[1].speech_ids.unshift('D2'),'duplicate or reorder');
bad('edit speech missing',m=>m.edit_units[1].speech_ids=[],'omit');
bad('edit speech reorder',m=>m.edit_units[0].speech_ids.reverse(),'reorder');
bad('speech has no selected audio',m=>m.edit_units[1].audio_unit_ids=[],'audio carrier');
bad('overlong generation',m=>m.generation_units[0].shooting.estimated_duration_s=16,'capacity');
bad('capacity basis absent',m=>m.generation_units[0].shooting.capacity_basis='','capacity_basis');
function split(m,kind='capacity') {
 const u=clone(m.generation_units[0]);u.id='G2';u.shooting.take_id='TAKE2';u.shooting.speech_ids=['D3'];u.shooting.participants=['甲'];u.shooting.silent_participants=[];u.platform_prompt='甲（对乙）说：“开始执行。”';u.shooting.estimated_duration_s=4;u.shooting.split_reason={kind,detail:'具体拍摄约束说明'};
 const first=m.generation_units[0];first.shooting.speech_ids=['D1','D2'];first.platform_prompt=first.platform_prompt.replace('甲（对乙）说：“开始执行。”','');first.shooting.estimated_duration_s=8;m.generation_units.push(u);m.edit_units[1].picture_unit_ids=['G2'];m.edit_units[1].audio_unit_ids=['G2'];
}
bad('unnecessary fragmentation',m=>split(m),'fits one take');
pass('real capacity split',m=>{split(m);m.generation_units.forEach(u=>u.shooting.capacity_s=10);});
pass('specific action-control split',m=>split(m,'action_control'));
bad('shot change rationale',m=>{split(m,'action_control');m.generation_units[1].shooting.split_reason.detail='镜头变化';},'cannot justify');
bad('fake new space',m=>split(m,'space_change'),'same space');
bad('fake new time',m=>split(m,'time_change'),'continuous time');
bad('duplicate take id',m=>{split(m,'action_control');m.generation_units[1].shooting.take_id='TAKE1';},'multiple generations');
pass('replacement take can repeat source speech',m=>{const u=clone(m.generation_units[0]);u.id='F1';u.take_role='fallback';u.shooting.take_id='TAKE-F';u.shooting.parent_take_id='TAKE1';u.shooting.split_reason={kind:'indispensable_acquisition',detail:'若口型不可用则替换同一段'};m.generation_units.push(u);});
function alternate(m,role='fallback') {const u=clone(m.generation_units[0]);u.id='F1';u.take_role=role;u.shooting.take_id='TAKE-F';u.shooting.parent_take_id='TAKE1';u.shooting.split_reason={kind:'indispensable_acquisition',detail:'必要时整条视频声画一起重试'};m.generation_units.push(u);return u;}
bad('audio-only fallback replacement is forbidden',m=>{alternate(m);for(const e of m.edit_units)e.audio_unit_ids=['F1'];},'SEPARATE_DUBBING_FORBIDDEN');
pass('whole audiovisual retry stays together',m=>{alternate(m);for(const e of m.edit_units){e.audio_unit_ids=['F1'];e.picture_unit_ids=['F1'];}});
bad('clean audio is forbidden',m=>alternate(m,'clean_audio'),'SEPARATE_DUBBING_FORBIDDEN');
bad('two alternate speech sources forbidden',m=>{alternate(m);m.edit_units[0].audio_unit_ids.push('F1');},'SEPARATE_DUBBING_FORBIDDEN');
bad('speech_sources cannot restore dubbing',m=>{m.edit_units[0].speech_sources={D1:'G1'};},'SEPARATE_DUBBING_FORBIDDEN');
bad('audio-only primary disguised as video',m=>{for(const e of m.edit_units)e.picture_unit_ids=['picture-other'];},'SEPARATE_DUBBING_FORBIDDEN');
pass('native video audio may lead its existing picture',m=>{m.edit_units[0].picture_unit_ids=['picture-other'];});
bad('unknown parent',m=>{const u=clone(m.generation_units[0]);u.take_role='fallback';u.id='F1';u.shooting.take_id='TAKE-F';u.shooting.parent_take_id='NO';u.shooting.split_reason={kind:'indispensable_acquisition',detail:'重取对应表演'};m.generation_units.push(u);},'parent TAKE');
bad('post narration forbidden',m=>{m.speech_ledger[0].delivery='post_voiceover';},'SEPARATE_DUBBING_FORBIDDEN');
bad('post dialogue forbidden',m=>{m.speech_ledger[0].delivery='post_dialogue';},'SEPARATE_DUBBING_FORBIDDEN');
bad('voiceover post unit forbidden',m=>{m.post_units.push({id:'P1',kind:'voiceover',speech_ids:[]});},'SEPARATE_DUBBING_FORBIDDEN');
bad('dialogue post unit forbidden',m=>{m.post_units.push({id:'P1',kind:'dialogue_audio',speech_ids:[]});},'SEPARATE_DUBBING_FORBIDDEN');
pass('approved text post carrier remains available',m=>{m.post_units.push({id:'P1',kind:'text',speech_ids:[],content:'原有文字'});m.edit_units[1].picture_unit_ids.push('P1');});
bad('effects tasks are not assigned to user',m=>{m.post_units.push({id:'P1',kind:'sound',speech_ids:[]});},'SOUND_DESIGN_OWNED_BY_USER');
pass('authorized line fragments reconstruct exact utterance',m=>{const s=m.speech_ledger[2];s.source_utterance_id='ORIG3';s.source_utterance_text=s.text;s.segment_index=1;});
bad('fragment changes original',m=>{const s=m.speech_ledger[2];s.source_utterance_id='ORIG3';s.source_utterance_text='现在开始执行。';s.segment_index=1;},'fragments change');
assert.throws(()=>validateProductionHandoff(base(),{screenplayText:'没有这些话'}),/absent from bound screenplay/);count++;
assert.equal(speechSequenceDiagnostics('甲（对乙）说：“是。”','甲（对乙）说：“是。”').length,0);count++;
assert.ok(speechSequenceDiagnostics('甲（对乙）说：“是。”甲（对乙）说：“继续。”','甲（对乙）说：“是。”').length);count++;
assert.ok(eventRealizationDiagnostics('允许 Seedance 自行编写台词。').some(x=>x.includes('OPEN_SPEECH')));count++;
assert.ok(!eventRealizationDiagnostics('禁止自行编写台词。').some(x=>x.includes('OPEN_SPEECH')));count++;
function montage(m) {const u=m.generation_units[0];u.class='AUTO_EDITED';u.source_refs=['S1-A','S1-B'];Object.assign(u.shooting,{organization:'edited_sequence',content_plan:'角色一天活动的完整快剪成片',segments:[{id:'A',space_id:'公园',time_group:'上午',source_refs:['S1-A'],content:'上午已有活动',start_state:'上午起点',end_state:'上午结果'},{id:'B',space_id:'码头',time_group:'下午',source_refs:['S1-B'],content:'下午已有活动',start_state:'下午起点',end_state:'下午结果'}]});for(const k of ['space_id','time_group','continuous_action','start_state','end_state'])delete u.shooting[k];}
pass('single generated edit crosses places and times',montage);
bad('montage still requires source coverage',m=>{montage(m);m.generation_units[0].shooting.segments[1].source_refs=['invented'];},'not covered');
bad('montage cannot masquerade as continuous route',m=>{montage(m);m.generation_units[0].class='AUTO_EVENT';},'requires AUTO_EDITED');
bad('edited route requires real segments',m=>{montage(m);m.generation_units[0].shooting.segments=[];},'constituent segments');
bad('montage cannot alter dialogue',m=>{montage(m);m.generation_units[0].platform_prompt+='\n甲（对乙）说：“再去一站。”';},'differs');
console.log(`OK: ${count} screenplay, TAKE, exact speech, post-carrier and split-boundary checks`);
