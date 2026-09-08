const FLEXIBLE_TOOL_PATTERN = /(?:白色复合关节鞭|复合关节鞭|关节鞭|鞭子|鞭索|绳索|缆索|锁链|链条)/u;
const FLEXIBLE_TOOL_COMPONENT_PATTERN = /(?:鞭尾|鞭梢|鞭身|绳端|索端|链端|锁链|链条)/u;
const GRAPPLE_PATTERN = /(?:勾住|钩住|缠住|套住|绞住)/u;
const PULL_PATTERN = /(?:反方向拉动|向反方向拉动|拉动|拉扯|猛拉|回拽|拽动|收紧|抽紧)/u;
const LOSS_OF_BALANCE_PATTERN = /(?:摔倒|倒地|失去平衡|带倒|拉倒|拽倒)/u;
const CAUSAL_RESULT_PATTERN = /(?:因此|因而|从而|受力后|在[^，。；！？\r\n]{1,24}(?:拉动|拉扯|牵引|作用)下|把[^，。；！？\r\n]{1,24}(?:带倒|拉倒|拽倒)|被[^，。；！？\r\n]{1,24}(?:带倒|拉倒|拽倒))/u;
const UNOWNED_BODY_ROUTE_PATTERN = /(?:绕过|经过|掠过|贴过|穿过)(?:腰侧|腰间|身侧|肩侧|腿侧|背后)/u;
const CRITICAL_CAUSE_PATTERN = /(?:击中|撞中|踢中|砸中|抽中|刺入|插入|穿透|贯穿|砍中|抓住|咬住|勾住|钩住|缠住|套住|绞住|推撞|推倒|拉动|拉扯|猛拉|回拽|拽动|收紧|抽紧|踹|撞|击打|冲击|爆炸|引爆|断裂|破裂|掀|压住|抛出|扔出|发射|开枪|射击|扣动|按下|触发|启动|停止|打开|关闭|锁定|解锁|切断|接通|释放|解除|挣脱)/u;
const CRITICAL_RESULT_PATTERN = /(?:摔倒|跌倒|倒地|跪倒|扑倒|失去平衡|横飞|飞出|击飞|踢飞|撞飞|掀飞|震退|震倒|弹开|后退|滑出|滑落|滚落|跌落|坠落|翻倒|带倒|拉倒|拽倒|撞翻|撞开|撞断|断裂|折断|破裂|碎裂|崩裂|倒塌|崩塌|凹陷|脱落|松脱|掉落|解体|失灵|熄灭|停机|瘫痪|停止响应|停止移动|断电|通电|弹出|展开|收回|复位|卡死|开启|打开|关闭|启动|停止|锁定|解锁|释放|解除|受伤|流血|被困|无法移动|不能移动)/u;
const EXPLICIT_CRITICAL_CAUSAL_LINK_PATTERN = /(?:因此|因而|所以|从而|随之|导致|致使|使得|造成|触发|带动|迫使|受[^，。；！？\r\n]{0,24}(?:力|冲击|撞击|拉扯|牵引|爆炸)[^，。；！？\r\n]{0,10}(?:后|作用)|在[^，。；！？\r\n]{0,24}(?:力|冲击|撞击|拉扯|牵引|作用)下|被[^，。；！？\r\n]{0,24}(?:击|撞|踢|踹|砸|抽|刺|穿|砍|抓|咬|推|拉|拽|掀|压|抛|扔))/u;

function stripDialogue(text) {
  return String(text ?? "")
    .replace(/“[^”]*”/gu, "")
    .replace(/"[^"\r\n]*"/gu, "");
}

function uniqueNormalizedSubjects(subjectNames) {
  return [...new Set((subjectNames ?? [])
    .filter((name) => typeof name === "string" && name.trim())
    .map((name) => name.trim()))]
    .sort((a, b) => b.length - a.length);
}

function stagesOf(unit) {
  return unit
    .split(/(?:[，,；;]|并(?:且)?|随后|然后|随即)/u)
    .map((stage) => stage.trim())
    .filter(Boolean);
}

function resultSubjectIsExplicit(stage) {
  const match = stage.match(CRITICAL_RESULT_PATTERN);
  if (!match) return true;
  const prefix = stage.slice(0, match.index)
    .replace(/^(?:随后|然后|随即|接着|继而|又|再|立即|立刻)+/u, "")
    .replace(/(?:因此|因而|所以|从而)$/u, "")
    .trim();
  if (!prefix) return false;
  return !/^(?:在|受|被|向|朝|往|从|由|用|沿|顺着)[^，。；！？\r\n]{0,24}$/u.test(prefix);
}

function criticalActionDiagnostics(text) {
  const diagnostics = [];
  const stages = stripDialogue(text)
    .split(/(?:[，,；;。！？\r\n]+|随后|然后|随即|接着|继而)/u)
    .map((stage) => stage.trim())
    .filter(Boolean);

  for (let index = 1; index < stages.length; index += 1) {
    const resultStage = stages[index];
    if (!CRITICAL_RESULT_PATTERN.test(resultStage)) continue;
    const precedingStage = stages[index - 1];
    if (!CRITICAL_CAUSE_PATTERN.test(precedingStage)) continue;

    if (!resultSubjectIsExplicit(resultStage)) {
      diagnostics.push({
        code: "CRITICAL_ACTION_RESULT_SUBJECT_REQUIRED",
        detail: "name the exact person, body part, tool component, object, machine, or structure that receives the critical result"
      });
    }
    if (!EXPLICIT_CRITICAL_CAUSAL_LINK_PATTERN.test(resultStage)) {
      diagnostics.push({
        code: "CRITICAL_ACTION_CAUSAL_LINK_REQUIRED",
        detail: "link the critical result explicitly to the preceding contact, force, mechanism, or state-changing action"
      });
    }
  }

  if (UNOWNED_BODY_ROUTE_PATTERN.test(stripDialogue(text))
    && (CRITICAL_CAUSE_PATTERN.test(stripDialogue(text)) || CRITICAL_RESULT_PATTERN.test(stripDialogue(text)))) {
    diagnostics.push({
      code: "BODY_ROUTE_OWNER_REQUIRED",
      detail: "a body-relative route in a critical action must name whose body part it passes and must come from the approved source or state"
    });
  }

  return diagnostics;
}

export function flexibleToolCausalityDiagnostics(text, subjectNames = []) {
  const subjects = uniqueNormalizedSubjects(subjectNames);
  const diagnostics = [];
  const units = stripDialogue(text)
    .split(/[。！？\r\n]+/u)
    .map((unit) => unit.trim())
    .filter(Boolean);

  for (const unit of units) {
    if (!FLEXIBLE_TOOL_PATTERN.test(unit)
      || !GRAPPLE_PATTERN.test(unit)
      || !PULL_PATTERN.test(unit)
      || !LOSS_OF_BALANCE_PATTERN.test(unit)) {
      continue;
    }

    const stages = stagesOf(unit);
    const contactStage = stages.find((stage) => GRAPPLE_PATTERN.test(stage)) ?? "";
    const pullStage = stages.find((stage) => PULL_PATTERN.test(stage)) ?? "";
    const resultStage = stages.find((stage) => LOSS_OF_BALANCE_PATTERN.test(stage)) ?? "";

    const contactPrefix = contactStage.slice(0, contactStage.search(GRAPPLE_PATTERN));
    if (!FLEXIBLE_TOOL_COMPONENT_PATTERN.test(contactPrefix)) {
      diagnostics.push({
        code: "FLEXIBLE_TOOL_CONTACT_COMPONENT_REQUIRED",
        detail: "name the exact tool component as the subject of the hook or wrap contact"
      });
    }

    if (!subjects.some((subject) => pullStage.includes(subject))) {
      diagnostics.push({
        code: "FLEXIBLE_TOOL_FORCE_ACTOR_REQUIRED",
        detail: "repeat the controlling actor inside the pull stage"
      });
    }

    if (!CAUSAL_RESULT_PATTERN.test(resultStage)) {
      diagnostics.push({
        code: "FORCE_RESULT_CAUSAL_LINK_REQUIRED",
        detail: "state explicitly that the target falls because of the preceding force"
      });
    }

    if (UNOWNED_BODY_ROUTE_PATTERN.test(unit)) {
      diagnostics.push({
        code: "BODY_ROUTE_OWNER_REQUIRED",
        detail: "a body-relative tool path must name whose body part it passes and must come from the approved source or state"
      });
    }
  }

  return diagnostics.filter((diagnostic, index, all) => all.findIndex((candidate) => candidate.code === diagnostic.code) === index);
}

export function criticalActionCausalityDiagnostics(text, subjectNames = []) {
  const diagnostics = [
    ...criticalActionDiagnostics(text),
    ...flexibleToolCausalityDiagnostics(text, subjectNames)
  ];
  return diagnostics.filter((diagnostic, index, all) => all.findIndex((candidate) => candidate.code === diagnostic.code) === index);
}
