// Bounded textual checks, not a geometry solver or proof of source fidelity.
const boundaries = text => ['开始空间运动状态','结束空间运动状态'].map(label => ({
  label, text: String(text ?? '').match(new RegExp('^'+label+'：([^\\r\\n]*)$', 'mu'))?.[1]
}));
const compact = value => String(value).replace(/[\s，,。；;：:]/gu, '');
export function spatialTextDiagnostics(text) {
  const errors=[];
  for (const boundary of boundaries(text)) {
    if (boundary.text === undefined) continue;
    const value=boundary.text.replace(/“[^”]*”/gu,'');
    if (/当前可行(?:通路|路线)|当前通路方向/u.test(value)) errors.push(`SPATIAL_TARGET_UNRESOLVED: ${boundary.label} names a route by suitability rather than an identified physical target`);
    if (/(?:将要|即将|准备)(?:取|抓|拿|走|撤|钻|穿|转|拉|跑|跳)|将(?:取枪|抓起|拿起|撤离|钻过|穿过)/u.test(value)) errors.push(`SPATIAL_FUTURE_ACTION: ${boundary.label} must describe current placement and possession; put the upcoming action in the event body`);
  }
  return errors;
}
export function spatialProjectionDiagnostics(text, {startState, endState}={}) {
  const errors=[];
  for (const [index,state] of [startState,endState].entries()) {
    if (!state) continue;
    const boundary=boundaries(text)[index];
    const names=Object.keys(state.characters ?? {}).sort((a,b)=>b.length-a.length);
    const owned=Object.fromEntries(names.map(name=>[name,[]]));
    for (const sentence of (boundary.text ?? '').split('。')) {
      let owner;
      for (const clause of sentence.split(/[；，]/u)) {
        const subject=names.find(name=>clause.trim().startsWith(name));
        if(subject)owner=subject;
        if(owner)owned[owner].push(clause);
      }
    }
    for (const [name,entity] of Object.entries(state.characters ?? {})) {
      if (entity?.visible !== true) continue;
      const hands=String(entity.hands ?? '');
      const contact=String(entity.contact ?? '');
      if (/双手空出|双手空闲/u.test(hands) && /(?:手|掌|指).{0,8}(?:撑|扶|握|抓|压|牵|贴|接触)/u.test(contact)) {
        errors.push(`SPATIAL_HAND_RESOURCE_CONFLICT: ${boundary.label} ${name} declares both hands available while hand contact is active; distinguish unarmed from an unused hand`);
      }
      if (/^朝向/u.test(String(entity.facing ?? ''))) {
        errors.push(`SPATIAL_FACING_TARGET_REQUIRED: ${boundary.label} ${name}.facing must contain the target, not another 朝向 prefix`);
      }
      const projected=compact(owned[name].join('；'));
      for (const field of ['position','posture','facing','hands','contact']) {
        const fact=entity[field];
        if (typeof fact !== 'string' || !fact.trim()) continue;
        if (!projected.includes(compact(fact))) errors.push(`SPATIAL_STATE_NOT_PROJECTED: ${boundary.label} ${name}.${field} -> ${fact}; preserve this compiled fact in its owner's clause`);
      }
    }
  }
  return errors;
}
