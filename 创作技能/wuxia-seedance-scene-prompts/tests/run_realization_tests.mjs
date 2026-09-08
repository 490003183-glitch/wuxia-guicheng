#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {compileScenePlan} from '../scripts/compile_scene_plan.mjs';
import {promptRealizationDiagnostics as diagnostics, eventRealizationDiagnostics, taskCompletionDiagnostics, physicalStateDiagnostics, projectCharacterSpatialState, speechRulesFor, SPEECH_RULE} from '../scripts/prompt_realization.mjs';
const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'seedance-realization-'));
let count=0;
function test(name,fn){fn(); count++; console.log('PASS: '+name);}
function sample(body,{people=['凌砚','联络人员'],start='凌砚站立；联络人员等待决定。',end=start,rules=speechRulesFor(body,people)}={}) {
 return `生成编号：TEST\n\n${rules.map(r=>'特殊规则：'+r).join('\n\n')}\n\n开始空间运动状态：${start}\n\n${body}\n\n结束空间运动状态：${end}`;
}
function rejects(text,code){assert.ok(diagnostics(text).some(x=>x.startsWith(code)),diagnostics(text).join('\n'));}
function accepts(text){assert.deepEqual(diagnostics(text),[]);}
function run(script,data){const file=path.join(tmp,'input.json');fs.writeFileSync(file,JSON.stringify(data));return spawnSync(process.execPath,[path.join(skill,'scripts',script),file],{encoding:'utf8'});}
const global='2470年测试室，写实真人摄影。导演风格明确对标危机决策剧。镜头偏好手持镜头特写和近景。无任何中景 远景。对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。非切镜情况下环境不跳变。无字幕，无音乐，16:9横屏，Schneider Hollywood Black Magic 1/8。高端动作概念片，电影级广告级画质，广告级商业调色，画面通透明亮、层次分明，色彩饱和自然不发灰，高光与材质光泽锐利。';
function plan(){return {schema_version:'2.1',scene_id:'TEST',profile:'continuity',scene_global_master:global,source:{path:'/tmp/final.md',status:'已确认'},creative_locks:{dialogue_and_event_order:'preserve',forbidden_inventions:[]},initial_state:{scene:{location:'测试室'},characters:{凌砚:{present:true,visible:true,position:'工作位',posture:'站立',facing:'联络人员',hands:null,contact:null,injury:null,emotion:'平静',knowledge:[]}},crowd_entities:{联络人员:{kind:'tracked_extra',present:true,visible:true,continuity_state:'联络人员站在工作位外侧，正在汇报。'}}},blocks:[{id:'TEST-1',events:[{id:'E1',visible_action:'联络人员（对凌砚）说：“节点尚未恢复。”',effects:[],crowd_state_unchanged:['联络人员']}]},{id:'TEST-2',events:[{id:'E2',visible_action:'联络人员停止汇报。',task_completions:[{entity:'联络人员',task:'汇报'}],effects:[{path:'crowd_entities.联络人员.continuity_state',set:'联络人员站在工作位外侧，等待决定。'}]}]},{id:'TEST-3',events:[{id:'E3',visible_action:'凌砚（对联络人员）说：“接叶澄。”',effects:[],crowd_state_unchanged:['联络人员']}]},{id:'TEST-4',events:[{id:'E4',visible_action:'凌砚（对联络人员）说：“临时权限，先顶沈砺的位置。”',task_completions:[{entity:'联络人员',task:'等待决定'}],effects:[{path:'crowd_entities.联络人员.continuity_state',set:'联络人员站在工作位外侧，已经收到决定。'}]}]}]};}
try {
 test('silent holds and approved nonverbal sounds remain valid',()=>accepts(sample('凌砚保持站立，呼吸平稳。')));
 test('missing silent boundary fails',()=>rejects(sample('凌砚站立。',{rules:[]}), 'SILENCE_BOUNDARY_REQUIRED'));
 test('dialogue cannot be silenced globally',()=>rejects(sample('凌砚（对联络人员）说：“接叶澄。”',{rules:['全程无台词','不生成旁白或画外人声。',SPEECH_RULE]}),'SPEECH_SILENCE_CONFLICT'));
 test('dialogue requires named listener silence',()=>rejects(sample('凌砚（对联络人员）说：“接叶澄。”',{rules:[SPEECH_RULE]}),'SILENT_PARTICIPANT_RULE_REQUIRED'));
 test('S05-011 stale reporting fails despite valid dialogue rules',()=>rejects(sample('凌砚（对联络人员）说：“接叶澄。”',{start:'凌砚站立；联络人员正在汇报并等待决定。'}),'SILENT_PARTICIPANT_REPORTING'));
 test('report mid-segment remains active and valid',()=>accepts(sample('联络人员（对凌砚）说：“节点尚未恢复。”',{start:'凌砚站立；联络人员正在汇报。'})));
 test('S05 unlisted report cannot be fixed by silence',()=>rejects(sample('顾宁留在通道，完成追击位置的通讯上报。'),'UNLISTED_SPEECH_ACTION'));
 test('S05 knowledge replay cannot become a new report',()=>rejects(sample('凌砚收到叶澄位于高层联防节点、可以最快接入的答复。'),'INFORMATION_CARRIER_UNRESOLVED'));
 test('physical paper report is not speech',()=>assert.deepEqual(eventRealizationDiagnostics('凌砚收到纸质报告。'),[]));
 test('silent send has concrete existing carrier',()=>accepts(sample('联络人员按下既有终端的发送键，完成追击位置的通讯上报。')));
 test('abstract work needs observable realization',()=>rejects(sample('凌砚继续核对候补位置。'),'ABSTRACT_WORK_REQUIRES_REALIZATION'));
 test('concrete work cue is accepted for source review',()=>accepts(sample('联络人员在既有终端上点选叶澄条目，办理叶澄的临时接入。')));
 test('post-edit narration does not enter silent platform text',()=>{const unit={post_audio:'凌砚已经得知节点故障。',prompt:sample('凌砚保持站立。')};accepts(unit.prompt);});
 test('explicit completed report cannot survive in final prompt',()=>rejects(sample('联络人员停止汇报。',{start:'联络人员正在汇报。',end:'联络人员正在汇报。'}),'STALE_COMPLETED_TASK'));
 test('compiler preserves intermediate report and incomplete command, finishes at correct event',()=>{const c=compileScenePlan(plan());assert.match(c.blocks[0].end_state.crowd_entities.联络人员.continuity_state,/正在汇报/);assert.match(c.blocks[2].end_state.crowd_entities.联络人员.continuity_state,/等待决定/);assert.doesNotMatch(c.blocks[3].end_state.crowd_entities.联络人员.continuity_state,/等待决定/);assert.equal(run('validate_scene_state.mjs',c).status,0);});
 test('compiler rejects unchanged waiver on completed decision',()=>{const p=plan();p.blocks[3].events[0].effects=[];p.blocks[3].events[0].crowd_state_unchanged=['联络人员'];assert.throws(()=>compileScenePlan(p),/STALE_COMPLETED_TASK/);});
 test('independent state replay rejects tampered completion',()=>{const c=compileScenePlan(plan());for(const b of [c.blocks[3],c.clips[3]]){b.events[0].effects=[];b.events[0].crowd_state_unchanged=['联络人员'];b.end_state=structuredClone(b.start_state);}const r=run('validate_scene_state.mjs',c);assert.notEqual(r.status,0);assert.match(r.stderr,/STALE_COMPLETED_TASK/);});
 test('unestablished irrelevant state does not invent a pose or absence',()=>{const state=plan().initial_state.characters.凌砚;assert.equal(projectCharacterSpatialState('凌砚',state),'凌砚位于工作位；凌砚站立；凌砚的头部朝向联络人员。');});
 test('completed hold cannot end in null or hands-down state',()=>{assert.ok(physicalStateDiagnostics({visible_action:'凌砚拿起水杯。'},{characters:{凌砚:{hands:null,contact:null}}}).length);assert.deepEqual(physicalStateDiagnostics({visible_action:'凌砚拿起水杯，凌砚随后放下水杯。'},{characters:{凌砚:{hands:'双手空着',contact:'未与人物或物件接触'}}}),[]);});
 test('listener attending a report is not its speaker',()=>accepts(sample('联络人员（对凌砚）说：“节点尚未恢复。”',{start:'凌砚正在听取联络人员汇报。',end:'凌砚仍在听取联络人员汇报。'})));
 test('completed and prospective report states are not active speech',()=>{for(const status of ['汇报完毕，等待决定','汇报已经结束，等待决定','准备汇报','尚未等待决定']) accepts(sample('联络人员保持站立。',{start:'联络人员'+status+'。'}));});
 test('same-event attributed answer supplies its actual receiver',()=>assert.deepEqual(eventRealizationDiagnostics('联络人员（对凌砚）说：“叶澄已经上线。”凌砚收到联络人员的答复。'),[]));
 test('unrelated button cannot license another information event',()=>assert.ok(eventRealizationDiagnostics('凌砚按下台灯开关。联络人员收到总部的答复。').some(x=>x.startsWith('INFORMATION_CARRIER_UNRESOLVED'))));
 test('bare oral reporting requires exact words',()=>{for(const body of ['联络人员汇报情况。','联络人员口头报告现场情况。']) assert.ok(eventRealizationDiagnostics(body).some(x=>x.startsWith('UNLISTED_SPEECH_ACTION')));});
 test('established nonverbal signal and handed paper are valid carriers',()=>{for(const body of ['通讯器响起已确认的三声短鸣，凌砚收到就绪消息。','凌砚收到联络人员递来的报告。']) assert.deepEqual(eventRealizationDiagnostics(body),[]);});
 test('multiline source dialogue stays protected from action scanning',()=>accepts(sample('联络人员（对凌砚）说：“刚收到沈砺受重伤的报告。\n\n现在最高决策层缺一个人了。”',{start:'凌砚站立；联络人员站在凌砚工作位外侧，正在汇报。'})));
 test('mentioned remote receiver is not a visible participant',()=>accepts(sample('闻绍衡（对凌砚）说：“叶澄就在高层节点。”',{people:['闻绍衡'],start:'闻绍衡站在会议发言位置；闻绍衡的头部朝向凌砚所在的通讯方向。'})));
 test('completed task may be described as a transition from waiting',()=>assert.deepEqual(taskCompletionDiagnostics({visible_action:'联络人员收到凌砚的决定。'},{crowd_entities:{联络人员:{continuity_state:'联络人员等待决定。'}}},{crowd_entities:{联络人员:{continuity_state:'联络人员已由等待决定转为办理接入。'}}}),[]));
 test('source report abstraction fails compiler upstream',()=>{const p=plan();p.blocks[0].events[0].visible_action='联络人员完成通讯上报。';assert.throws(()=>compileScenePlan(p),/UNLISTED_SPEECH_ACTION/);});
 test('ordinary renderer rejects final text with removed speech boundary before writing HTML',()=>{const output=path.join(tmp,'bad.html');const file=path.join(tmp,'delivery.json');fs.writeFileSync(file,JSON.stringify({title:'test',blocks:[{id:'TEST',duration_status:'未实测',prompt:sample('凌砚保持站立。',{rules:[]}),assets:[]}]}));const r=spawnSync(process.execPath,[path.join(skill,'scripts/render_prompt_delivery_html.mjs'),file,'--output',output],{encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/SILENCE_BOUNDARY_REQUIRED/);assert.ok(!fs.existsSync(output));});
 console.log(`OK: ${count} realization regression tests passed`);
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
