import {spatialTextDiagnostics, spatialProjectionDiagnostics} from './spatial_realization.mjs';
import {visualIdentityDiagnostics} from './visual_identity.mjs';
// Shared, camera-independent checks on actual platform text. These checks catch
// concrete contradictions and known unresolved carriers; they do not prove canon fidelity.
export const SILENT_RULES = ['全程无台词', '不生成旁白或画外人声。'];
export const SPEECH_RULE = '只说本条明确列出的原文台词，不新增、改写或重复对白，不添加未列出的旁白或画外人声。';
const dialogue = /([\p{Script=Han}A-Za-z0-9·_-]{1,24})（([^（）\r\n]+)）说：“([^”]*)”/gu;
const stripDialogue = text => String(text ?? '').replace(dialogue, '').replace(/“[^”]*”/gu, '');
const nonverbalCarrier = /(?:按下|按住|点选|点击|触碰|敲击|键入|输入|发送键|发送按钮|指示灯|屏幕[^。；\n]{0,24}(?:亮起|显示|出现|变化)|抬手[^。；\n]{0,16}(?:制止|示意)|(?:手掌|手势)[^。；\n]{0,16}(?:制止|叫停|停止))/u;
const abstractWork = /(?:核对候补位置|处理部署|办理[^。；\n]{0,20}(?:临时)?接入|执行[^。；\n]{0,20}临时接入|(?:签发|审批)流程[^。；\n]{0,20}(?:推进|恢复))/u;
const knowledgeReplay = /(?:收到|获知|得知)[^。；\n]{0,70}(?:报告|答复|消息)/u;
const unfinishedSpeech = /(?:完成[^。；\n]{0,16}(?:通讯上报|口头汇报)|(?:报告|汇报)[^。；\n]{0,12}(?:刚说到|说到)|叫停报告|人物完成对白)/u;
export function speechParticipants(text) {
  return [...String(text).matchAll(dialogue)].map(m => ({speaker:m[1], receiver:m[2], text:m[3]}));
}
export function speechRulesFor(text, participants=[]) {
  const spoken=speechParticipants(text);
  if (!/“[^”]+”/u.test(text)) return [...SILENT_RULES];
  const speakers=new Set(spoken.map(s=>s.speaker));
  return [SPEECH_RULE, ...[...new Set(participants)].filter(n=>!speakers.has(n)).map(n=>`${n}全程无台词。`)];
}
export function eventRealizationDiagnostics(text) {
  const errors=[];
  for (const sentence of stripDialogue(text).split(/[。；\n]/u)) {
    if (/(?:允许|自行|自由|即兴)[^。；\n]{0,16}(?:台词|对白)|(?:台词|对白)[^。；\n]{0,16}(?:自由发挥|自行补充|即兴编写)/u.test(sentence) && !/(?:禁止|不得|不能|不允许|不新增|无需|不要)/u.test(sentence)) errors.push('OPEN_SPEECH_INVENTION_FORBIDDEN: provide exact screenplay speech or explicit silence');
  }
  const normalized=String(text ?? '').replace(/“[^”]*”/gu, quote=>quote.replace(/\r?\n/gu,' '));
  for (const paragraph of normalized.split(/\n\s*\n/u)) {
    const spoken=speechParticipants(paragraph);
    const action=stripDialogue(paragraph);
    // No unrelated button/gesture in a different sentence can resolve this event.
    for (const sentence of action.split(/[。；\n]/u).filter(Boolean)) {
      const physicalPaper=/(?:接过|拿起|收到)[^，。；\n]{0,16}(?:(?:纸质|纸本|书面)|递来(?:的)?)报告/u.test(sentence);
      const audibleCue=/(?:通讯器|终端|扬声器)[^，。；\n]{0,14}(?:响起|传来)[^。；\n]{0,16}(?:短鸣|提示音|蜂鸣)/u.test(sentence);
      const exactSpokenCarrier=spoken.some(s=>sentence.includes(s.receiver.replace(/^对/u,'').replace(/通讯$/u,'')) && /(?:答复|报告|消息)/u.test(sentence));
      if (knowledgeReplay.test(sentence) && !physicalPaper && !audibleCue && !exactSpokenCarrier && !nonverbalCarrier.test(sentence)) errors.push('INFORMATION_CARRIER_UNRESOLVED: move already acquired information to knowledge; preserve a new transfer through its exact source-backed audible/visible carrier');
      const unlisted=unfinishedSpeech.test(sentence) || /(?:口头报告|汇报(?:情况|现场|进展))/u.test(sentence);
      const matchedSpeaker=spoken.some(s=>sentence.includes(s.speaker));
      if (unlisted && !matchedSpeaker && !nonverbalCarrier.test(sentence) && !/(?:听取|听完|阅读)[^，。；\n]{0,20}(?:报告|汇报)/u.test(sentence)) errors.push('UNLISTED_SPEECH_ACTION: reporting or interruption needs exact source speech or an explicit source-backed nonverbal act');
      if (abstractWork.test(sentence) && !nonverbalCarrier.test(sentence)) errors.push('ABSTRACT_WORK_REQUIRES_REALIZATION: replace the business summary with source-backed observable execution; keep post-edit information outside platform text');
    }
  }
  return [...new Set(errors)];
}
function activeTask(text, task) {
  let clean=String(text ?? '');
  // Report receivers, preparation, negation and completed predicates are not
  // active speaking tasks. Do not treat a mentioned reporter as the listener.
  clean=clean.replace(/(?:听取|听完|听着|阅读|核阅|等待)[^，。；\n]{0,24}(?:汇报|报告)/gu,'');
  clean=clean.replace(/(?:已经|已|刚刚|刚)?(?:停止|结束|完成|不再|并未|没有|尚未开始|尚未|准备|等待开始)(?:了)?(?:汇报|报告|讲话|等待决定)/gu,'');
  clean=clean.replace(/(?:汇报|报告|等待决定)(?:已经|已)?(?:完毕|结束|完成|停止)/gu,'');
  clean=clean.replace(/由(?:汇报|等待决定)转为/gu,'');
  return task==='汇报' ? /(?:正在|继续|开始|程序|按要求)?汇报/u.test(clean) : /等待决定/u.test(clean);
}
function entityText(state,id) {
  const entity=state?.characters?.[id] ?? state?.crowd_entities?.[id];
  if (!entity || entity.present===false) return '';
  return typeof entity.continuity_state==='string' ? entity.continuity_state : Object.entries(entity).filter(([k])=>!['knowledge','emotion'].includes(k)).map(([,v])=>typeof v==='string'?v:'').join('；');
}
// Explicit completion is conditional metadata, only at the source event that
// finishes that task. Intermediate reports/instructions need no completion tag.
export function taskCompletionDiagnostics(event, before, after) {
  const errors=[];
  let completions=event.task_completions ?? [];
  if (!Array.isArray(completions)) return ['TASK_COMPLETIONS_INVALID: expected an array'];
  completions=[...completions];
  for (const id of [...Object.keys(before?.characters??{}),...Object.keys(before?.crowd_entities??{})]) {
    const action=stripDialogue(event.visible_action);
    const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const endedReport=new RegExp(escaped+'(?:已经|已|刚刚|刚)?(?:停止|结束|完成)(?:了)?(?:汇报|报告|讲话)','u').test(action);
    const receivedDecision=new RegExp(escaped+'(?:已经|已)?收到[^。；\\n]{0,12}决定','u').test(action);
    for (const task of [...(endedReport?['汇报']:[]),...(receivedDecision?['等待决定']:[])]) {
      if (activeTask(entityText(before,id),task) && !completions.some(c=>c?.entity===id&&c?.task===task)) completions.push({entity:id,task});
    }
  }
  for (const item of completions) {
    if (!item || typeof item.entity!=='string' || !['汇报','等待决定'].includes(item.task) || !entityText(before,item.entity)) {
      errors.push('TASK_COMPLETIONS_INVALID: name an existing present entity and task 汇报 or 等待决定'); continue;
    }
    if (!activeTask(entityText(before,item.entity),item.task)) errors.push(`TASK_COMPLETION_NOT_ACTIVE: ${item.entity} ${item.task}`);
    if (activeTask(entityText(after,item.entity),item.task)) errors.push(`STALE_COMPLETED_TASK: ${item.entity} ${item.task} survives its completion event`);
  }
  return errors;
}
export function physicalStateDiagnostics(event, after) {
  const errors=[];
  const action=stripDialogue(event.visible_action);
  for (const [name,state] of Object.entries(after?.characters??{})) {
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const hold=new RegExp(escaped+'(?:的)?(?:左手|右手|双手)?(?:已经|已)?(?:握住|拿起|接住)[^。；\\n]+','u').exec(action);
    if (!hold) continue;
    const remaining=action.slice(hold.index);
    // A same-event release can legitimately restore empty hands.
    if (new RegExp(escaped+'[^。；\\n]{0,12}(?:放下|松开|递出|交给)','u').test(remaining)) continue;
    if (state.hands===null || /(?:双手空|双手自然垂|未持物)/u.test(state.hands??'') || state.contact==='未与人物或物件接触') errors.push(`MATERIAL_HAND_STATE_CONTRADICTION: ${name} completes a hold but end state erases it`);
  }
  return errors;
}
export function projectCharacterSpatialState(name, state) {
  if (!state?.visible) return '';
  const parts=[state.position && `${name}位于${state.position}`, state.posture && `${name}${state.posture}`, state.facing && `${name}的头部朝向${state.facing}`, state.hands && `${name}${state.hands}`, state.contact && `${name}${state.contact}`];
  return parts.filter(Boolean).join('；')+'。';
}
// These checks inspect final platform text only; source metadata remains author-level.
export function platformContentDiagnostics(text) {
  const value=String(text ?? '');
  const errors=[];
  
  const directFlushing=/(?:潮红|泛红|脸红|红晕|涨红)/u;
  const skinReddening=/(?:脸|面部|面颊|脸颊|双颊|颈(?:前|侧|部)?|脖颈|耳(?:根|尖|朵)?|锁骨|皮肤|肤色)(?:的皮肤|已经|开始|逐渐|渐渐|慢慢|持续|明显|更加|变得|显得|呈现|出现|透出|转为|变为|一片|一阵|都|又|更|还|仍|再次|有些|微微|稍微){0,3}(?:发红|更红|变红|通红|绯红|透红|红润|血色加深|充血|(?:变为|呈现|转为)红色)/u;
  const spreadingRed=/红色[^，。；！？\n]{0,12}(?:漫到|漫上|蔓延到|扩散到)(?:锁骨|颈部|脸颊)/u;
  if (directFlushing.test(value) || skinReddening.test(value) || spreadingRed.test(value)) {
    errors.push('FLUSHING_DESCRIPTION_FORBIDDEN: omit reaction-driven skin color changes; preserve other approved performance');
  }
  return errors;
}

export function promptRealizationDiagnostics(text, {participants=[], startState, endState, assets=[]}={}) {
  text=String(text ?? '');
  const errors=[...platformContentDiagnostics(text), ...spatialTextDiagnostics(text), ...spatialProjectionDiagnostics(text,{startState,endState})];
  const rules=[...text.matchAll(/^特殊规则：([^\r\n]+)$/gmu)].map(m=>m[1].trim());
  const start=text.match(/^开始空间运动状态：([^\r\n]*)$/mu);
  const end=text.match(/^结束空间运动状态：([^\r\n]*)$/mu);
  const body=start&&end ? text.slice(start.index+start[0].length,end.index).trim() : text.split(/\r?\n/u).filter(l=>!l.startsWith('特殊规则：')&&!l.startsWith('global：')&&!l.startsWith('生成编号：')).join('\n');
  const spoken=speechParticipants(body);
  const quoted=/“[^”]+”/u.test(body);
  const speakers=new Set(spoken.map(s=>s.speaker));
  const wholeSilent=rules.includes('全程无台词')||rules.includes('全程无台词。');
  if (quoted) {
    if (wholeSilent) errors.push('SPEECH_SILENCE_CONFLICT: this unit contains dialogue');
    if (!rules.includes(SPEECH_RULE)) errors.push('SPEECH_BOUNDARY_REQUIRED: only explicitly listed source speech may be generated');
  } else if (!wholeSilent || !rules.includes(SILENT_RULES[1])) errors.push('SILENCE_BOUNDARY_REQUIRED: require 全程无台词 and 不生成旁白或画外人声。');
  const visibleText=(start?.[1]??'')+'；'+(end?.[1]??'');
  errors.push(...visualIdentityDiagnostics({rules,states:[startState,endState],actionText:visibleText+'\n'+body,assets}));
  const stateNames=[...visibleText.matchAll(/(?:^|[。；])([^，。；]{1,24}?)(?:正在|已经|已|仍然|仍|继续|位于|站在|站立|坐在|等待|停止|保持)/gu)].map(m=>m[1]);
  const named=new Set([...stateNames,...participants,...[...text.matchAll(/^｜([^（\n]+)（/gmu)].map(m=>m[1]),...spoken.map(s=>s.receiver.replace(/^对/u,'').replace(/通讯$/u,''))]);
  for (const name of named) {
    const segments=visibleText.split(/[。；]/u).map(c=>c.trim()).filter(c=>c.startsWith(name));
    if (!name || !segments.length) continue;
    if (quoted && !speakers.has(name) && !rules.includes(`${name}全程无台词。`)) errors.push(`SILENT_PARTICIPANT_RULE_REQUIRED: ${name}`);
    if (speakers.has(name) && rules.includes(`${name}全程无台词。`)) errors.push(`SPEECH_SILENCE_CONFLICT: ${name} has dialogue`);
    if (!speakers.has(name) && segments.some(c=>activeTask(c,'汇报'))) errors.push(`SILENT_PARTICIPANT_REPORTING: ${name} has an active speaking task but no listed speech`);
  }
  // Covers unnamed extras in text-only deliveries as well as formal characters.
  if (!quoted && activeTask(visibleText,'汇报')) errors.push('SILENT_REPORTING_STATE: a silent unit retains an active report');
  const pseudoState=value=>({crowd_entities:Object.fromEntries([...named].map(n=>[n,{continuity_state:value.split(/[。；]/u).map(c=>c.trim()).filter(c=>c.startsWith(n)).join('；')}]))});
  errors.push(...taskCompletionDiagnostics({visible_action:body},pseudoState(start?.[1]??''),pseudoState(end?.[1]??'')));
  errors.push(...eventRealizationDiagnostics(body));
  return [...new Set(errors)];
}

export function speechSequenceDiagnostics(actualText, expectedText) {
  return JSON.stringify(speechParticipants(actualText)) === JSON.stringify(speechParticipants(expectedText))
    ? [] : ['SOURCE_SPEECH_MISMATCH: exact text, speaker, receiver, order and occurrence count must match the compiled source events'];
}
