const DOOR_TOKEN = "(?:房门|舱门|闸门|车门|门扇|门板|门锁|门内|门外|门洞|门框|门槛|门口|门边|门旁|入口|出口|舱口|闸口|扫描门)";
const CLAUSE_GAP = "[^，。；！？\\r\\n]{0,18}";

const crossingPatterns = [
  new RegExp(`${DOOR_TOKEN}${CLAUSE_GAP}(?:走出|跑出|冲出|出来|驶出|离开|走进|跑进|冲进|进去|进入|穿过|通过|越过|跨过)`, "u"),
  new RegExp(`(?:穿过|通过|越过|跨过|走进|跑进|冲进|进入|走出|跑出|冲出|驶出)${CLAUSE_GAP}${DOOR_TOKEN}`, "u"),
  /从(?:门内|房间侧|舱内|屋内|室内)[^，。；！？\r\n]{0,18}(?:走出|跑出|冲出|出来|驶出)/u,
  /从(?:门外|走廊侧|舱外|屋外|室外)[^，。；！？\r\n]{0,18}(?:走进|跑进|冲进|进入|进去)/u
];

const doorOperationPatterns = [
  new RegExp(`(?:推开|拉开|掀开|撬开|打开|开启|关上|关闭|合上|合拢|闭合|踹开|撞开|砸开|炸开|踢飞|撞飞|破坏|击碎)${CLAUSE_GAP}${DOOR_TOKEN}`, "u"),
  new RegExp(`${DOOR_TOKEN}${CLAUSE_GAP}(?:因此|随后|立即|逐渐|开始|被)?${CLAUSE_GAP}(?:打开|开启|关上|关闭|合上|合拢|闭合|破裂|碎裂|飞出|脱离)`, "u")
];

const thresholdActionPattern = /(?:门口|门边|门旁|门槛|门框|门洞|入口处|入口旁|入口附近|舱口|闸门口)/u;
const doorwayCharacterPositionPattern = /(?:房门|舱门|闸门|车门|门扇|门板|门洞|门框|门槛|门口|门边|门旁|门内侧|门外侧|入口门|出口门|扫描门)/u;

function stripVerbatimDialogue(text) {
  return String(text ?? "").replace(/“[^”]*”/gu, "");
}

function stripStableBackgroundDoorStates(text) {
  return text
    .replace(/(?:房门|舱门|闸门|车门|门扇|门板|入口门|出口门|扫描门)[^，。；！？\r\n]{0,8}(?:已经|已|始终|一直|持续|仍然|仍|依然|保持)[^，。；！？\r\n]{0,8}(?:敞开|开着|打开状态|关闭|关着|闭合状态)/gu, "")
    .replace(/(?:已经|已|始终|一直|持续|仍然|仍|依然|保持)[^，。；！？\r\n]{0,8}(?:敞开|开着|打开状态|关闭|关着|闭合状态)[^，。；！？\r\n]{0,8}(?:房门|舱门|闸门|车门|门扇|门板|入口门|出口门|扫描门)/gu, "");
}

export function doorwayAutocutDiagnostic(text) {
  const sourceBody = stripVerbatimDialogue(text);
  const hasOpenBackground = /门已经敞开并保持敞开/u.test(sourceBody);
  const hasClosedBackground = /门始终保持关闭/u.test(sourceBody);
  if (hasOpenBackground && hasClosedBackground) {
    return "DOORWAY_BACKGROUND_MODE_CONFLICT; one generic block cannot mix the indoor-open and outdoor-closed doorway exceptions";
  }
  if (hasOpenBackground && !/(?:室内|房间内|舱内|屋内)[^。；！？\r\n]{0,32}远离门区/u.test(sourceBody)) {
    return "DOORWAY_INTERIOR_BACKGROUND_SCOPE_REQUIRED; keep all action indoors and explicitly away from the doorway";
  }
  if (hasClosedBackground && !/所有动作和对白只发生在门的同一侧/u.test(sourceBody)) {
    return "DOORWAY_CLOSED_BACKGROUND_SAME_SIDE_REQUIRED; keep all action and dialogue on one side while the door remains continuously closed";
  }
  const body = stripStableBackgroundDoorStates(sourceBody);
  if (crossingPatterns.some((pattern) => pattern.test(body))) {
    return "DOORWAY_CROSSING_REQUIRES_DIRECTOR_REROUTE; remove the doorway beat or route the sole already-open-door exit into the bound scene asset as a distant directed capture";
  }
  if (doorOperationPatterns.some((pattern) => pattern.test(body))) {
    return "DOORWAY_OPERATION_REQUIRES_DEDOOR_REDIRECT; preserve any unavoidable story function through state, offscreen evidence, sound, reaction, or edit ellipsis";
  }
  if (thresholdActionPattern.test(body) && !hasClosedBackground) {
    return "DOORWAY_THRESHOLD_ACTION_FORBIDDEN; relocate the actionable beat fully indoors or fully outdoors and away from the threshold";
  }
  return null;
}

export function positionTouchesDoorway(text) {
  return doorwayCharacterPositionPattern.test(String(text ?? ""));
}

export function hasContinuouslyClosedDoorState(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return /门始终保持关闭/u.test(text) && /所有动作和对白只发生在门的同一侧/u.test(text);
}

export function doorwaySpatialStateDiagnostic(text, context = text) {
  const body = stripVerbatimDialogue(text);
  const actorPositionAtDoor = new RegExp(`(?:位于|站在|停在|蹲在|跪在|坐在|贴在|靠在|守在|来到|留在|处于|跨在|卡在|走到|移到)[^，。；！？\\r\\n]{0,24}${DOOR_TOKEN}`, "u");
  const straddlesClosedDoor = new RegExp(`(?:跨在|横跨|卡在|骑跨)[^，。；！？\\r\\n]{0,24}${DOOR_TOKEN}`, "u");
  if (hasContinuouslyClosedDoorState(context) && straddlesClosedDoor.test(body)) {
    return "DOORWAY_CLOSED_STATE_MUST_BE_STATIONARY; a continuously closed door cannot have a crossing or straddling character state";
  }
  if (actorPositionAtDoor.test(body) && !hasContinuouslyClosedDoorState(context)) {
    return "DOORWAY_CHARACTER_STATE_REQUIRES_DEDOOR_REDIRECT; move the character start and end state fully into the interior or exterior action area and away from the doorway";
  }
  return null;
}
