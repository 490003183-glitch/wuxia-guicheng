// Known visual-identity regressions, not a substitute for reading current canon.
// Sources and authoring boundaries: ../references/visual-identity.md.
const QUANQUAN_ASSET = 'WXGC-CHR-24700930-EP28-001';
const stripSpeech = text => String(text ?? '').replace(/[\p{Script=Han}A-Za-z0-9·_-]+（[^（）\n]+）说：“[^”]*”/gu, '').replace(/“[^”]*”/gu, '');

function positive(text, pattern) {
  for (const clause of text.split(/[。；，\n]/u)) {
    const match = pattern.exec(clause);
    if (!match) continue;
    const before = clause.slice(0, match.index);
    if (!/(?:不是|并非|不属于|没有|无|不生成|不得生成|禁止生成|不呈现)\s*$/u.test(before)) return true;
  }
  return false;
}

export function visualIdentityDiagnostics({rules=[], states=[], actionText='', assets=[]}={}) {
  const visibleInState = states.some(state => ['creatures','characters','entities'].some(group => {
    const entity = state?.[group]?.圈圈;
    return entity?.present !== false && entity?.visible === true;
  }));
  const visibleInAction = /(?:^|[。；，\n])\s*圈圈(?:的)?(?:位于|在|伏|停|站|走|跑|先|跟|钻|贴|低|抬|转|跃|扑|咬|尾|身|肩|头|四肢|前爪|后腿|是|属于)/u.test(stripSpeech(actionText));
  const uploaded = Array.isArray(assets) && assets.some(a => (a?.id ?? a?.asset_id) === QUANQUAN_ASSET);
  if (!visibleInState && !visibleInAction && !uploaded) return [];

  // Only current-block rules explicitly owned by Quanquan count. Dialogue,
  // global, another animal's description and the image filename cannot pay this debt.
  const description = rules.filter(rule => /^圈圈/u.test(rule)).join('；');
  const missing = [];
  if (!positive(description, /(?:阿尔法|Alpha)/u) || !positive(description, /(?:猫科|豹类)/u)) missing.push('物种身份');
  if (!positive(description, /(?:大型|大体型|猛兽体量|体量明显大于家猫|体型明显大于家猫)/u)) missing.push('大型猛兽体量');
  if (!positive(description, /(?:灰蓝|蓝灰)/u) || !positive(description, /(?:斑驳|斑纹|斑点)/u) || !positive(description, /短毛/u)) missing.push('灰蓝斑驳短毛');
  if (!/(?:无颈环|没有(?:控制)?颈环|不戴(?:控制)?颈环|未佩戴(?:控制)?颈环)/u.test(description)) missing.push('无颈环');
  if (!positive(description, /(?:长尾|很长的尾巴|尾巴很长)/u) || !/蓬松尾端/u.test(description)) missing.push('长尾与蓬松尾端');
  if (!/浅色[^。；]{0,12}(?:小环|尾环)/u.test(description)) missing.push('浅色尾环');
  const errors = missing.length ? [`VISUAL_IDENTITY_REQUIRED: 圈圈缺少${missing.join('、')}；读取当前正式角色页与母版，在本块 special_rules 中保留基本外观，不以图片引用或字数压缩代替`] : [];
  if (positive(description, /(?:硬质皮层|甲片|叠层皮壳)/u)) errors.push('VISUAL_IDENTITY_CONFLICT: 圈圈旧硬质皮层已废弃，当前为连续毛发');
  return errors;
}
