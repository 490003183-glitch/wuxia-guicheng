#!/usr/bin/env node

import {spatialProjectionDiagnostics} from './spatial_realization.mjs';
import fs from "node:fs";
import path from "node:path";
import { promptRealizationDiagnostics, speechSequenceDiagnostics } from "./prompt_realization.mjs";
import { criticalActionCausalityDiagnostics } from "./action_causality.mjs";
import { doorwayAutocutDiagnostic, doorwaySpatialStateDiagnostic } from "./doorway_policy.mjs";

const args = process.argv.slice(2);
let allowTimestamps = false;
let stateFile;
let profile = "production";
let projectionMode = "dialogue_autocut";
const files = [];
const profiles = new Set(["quick", "continuity", "production"]);
const projectionModes = new Set(["dialogue_autocut"]);

function usage() {
  console.error("Usage: node validate_seedance_prompt.mjs [--profile quick|continuity|production] [--projection-mode dialogue_autocut] [--state <state.json>] <prompt.txt-or-md>");
  process.exit(2);
}

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--allow-timestamps") {
    allowTimestamps = true;
  } else if (arg === "--profile") {
    profile = args[index + 1];
    if (!profiles.has(profile)) usage();
    index += 1;
  } else if (arg === "--projection-mode") {
    projectionMode = args[index + 1];
    if (!projectionModes.has(projectionMode)) {
      console.error("ERROR: projection_mode must be dialogue_autocut; explicit_shots and mixed platform projections are retired");
      process.exit(2);
    }
    index += 1;
  } else if (arg === "--state") {
    stateFile = args[index + 1];
    if (!stateFile) usage();
    index += 1;
  } else if (arg.startsWith("--")) {
    console.error(`ERROR: unknown option ${arg}`);
    process.exit(2);
  } else {
    files.push(arg);
  }
}

if (files.length !== 1) {
  usage();
}

let input;
try {
  input = fs.readFileSync(files[0], "utf8");
} catch (error) {
  console.error(`ERROR: cannot read prompt file: ${error.message}`);
  process.exit(1);
}

const fenced = [...input.matchAll(/```(?:text)?\s*\n([\s\S]*?)```/g)].map((match) => match[1].trim());
const prompts = fenced.length ? fenced : [input.trim()];
const errors = [];
const warnings = [];
if (profile === "quick" && prompts.length > 1) {
  errors.push("quick profile accepts exactly one prompt block; use continuity for automatic cross-block state inheritance");
}
if (profile === "continuity" && !stateFile) {
  errors.push("continuity profile requires --state for actor opening-emotion validation");
}
if (profile === "production" && !stateFile) {
  errors.push("production profile requires --state for actor opening-emotion validation");
}
if (allowTimestamps) {
  errors.push("dialogue_autocut does not allow --allow-timestamps; keep chronology but remove projected seconds");
}
let sceneState;
if (stateFile) {
  try {
    sceneState = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch (error) {
    console.error(`ERROR: cannot read state manifest: ${error.message}`);
    process.exit(1);
  }
}
if (stateFile && sceneState?.schema_version !== "2.1") errors.push("state manifest schema_version must be 2.1");
if (stateFile && !(typeof sceneState?.scene_global_master === "string"
  && sceneState.scene_global_master.length > 0
  && sceneState.scene_global_master === sceneState.scene_global_master.trim())) {
  errors.push("state manifest requires scene_global_master");
}
if (stateFile) {
  const stateProjectionMode = sceneState?.projection_mode ?? "dialogue_autocut";
  if (stateProjectionMode !== projectionMode) {
    errors.push(`state manifest projection_mode ${stateProjectionMode} does not match requested projection mode ${projectionMode}`);
  }
}
const forbidden = [
  "同期录音非配音",
  "纪录片式人的尺度",
  "低饱和",
  "低饱和紫灰",
  "蜜桃成熟时",
  "承接上一条",
  "承接上一段",
  "下一条将",
  "下一段将"
];
const assetTerms = [/参考图(?:片)?\s*\d*/u, /图片\s*\d+\s*(?:为|作为)/u, /asset\s*id/iu, /WXGC-[A-Z]+-/u];
const localAbsolutePathPattern = /(?:^|[\s："'=(])(?:\/(?:[^/\s]+\/)+[^/\s]+|[A-Za-z]:[\\/][^\s]+)/u;

const globalEntityNounPattern = /(?:角色|人物|演员|异兽|阿尔法|机器人|机甲|工作人员|队员|巡检(?:机器人|单位|员)?|飞镖|关节鞭|鞭子|颈环|服装|裙摆|鞋靴|面孔|皮肤|制服)/u;
const globalEntityConstraintPattern = /(?:必须|不得|禁止|严禁|不应|不能|不可|只允许|仅允许|始终|永不|唯一|严格区分|不生成|不要生成|不呈现)/u;
const boundaryAnchorPattern = /(?:门|门洞|门框|门槛|入口|通道口|舱口|闸门|闸口)/u;
const explicitBoundarySideTokenPattern = /(?:[\p{Script=Han}A-Za-z0-9_-]{1,16}?侧|舱内|舱外|屋内|屋外|室内|室外|房内|房外)/gu;
const nonOwnershipSidePattern = /(?:左|右|前|后|上|下)侧$/u;
const boundaryCrossingActionPattern = /(?:穿过|跨过|越过|走进|走出|进入|离开|通过)/u;
const boundaryPositionActionPattern = /(?:位于|站在|停在|蹲在|跪在|坐在|贴在|靠在|守在|来到|留在|处于|跨在|卡在|走到|移到)/u;
const boundaryProximityPattern = /(?:附近|中央|正中|旁边|边上|门旁|门边|前方|后方)/u;
const boundaryStraddlingPattern = /(?:跨在|横跨|卡在|骑跨|门洞中央|门洞正中)/u;

function boundaryTextDiagnostics(text) {
  const diagnostics = new Set();
  const withoutDialogue = String(text ?? "")
    .replace(/“[^”]*”/gu, "")
    .replace(/"[^"\r\n]*"/gu, "");
  for (const clause of withoutDialogue.split(/[。；！？\r\n]+/u)) {
    if (!boundaryAnchorPattern.test(clause)) continue;
    const crossing = boundaryCrossingActionPattern.test(clause);
    const straddling = boundaryStraddlingPattern.test(clause);
    const positioned = crossing || straddling || boundaryPositionActionPattern.test(clause) || boundaryProximityPattern.test(clause);
    if (!positioned) continue;
    const sides = [...new Set((clause.match(explicitBoundarySideTokenPattern) ?? [])
      .filter((token) => !nonOwnershipSidePattern.test(token)))];
    if (straddling && !/重心[^。；！？\r\n]{0,24}(?:侧|舱内|舱外|屋内|屋外|室内|室外|房内|房外)/u.test(clause)) {
      diagnostics.add("BOUNDARY_CENTER_OF_MASS_SIDE_REQUIRED");
    } else if (crossing && sides.length < 2) {
      diagnostics.add("BOUNDARY_CROSSING_SIDES_REQUIRED");
    } else if (!crossing && sides.length < 1) {
      diagnostics.add("BOUNDARY_SIDE_REQUIRED");
    }
  }
  return diagnostics;
}
const clothingTerms = [/(?:穿着|身穿|换上|穿上|脱下)/u, /(?:上衣|裤子|裙子|鞋子|夹克|外套|衬衫|领带|丝袜|靴子)(?:的|为|是|呈|保持|颜色|材质|款式|造型)?/u];
const timestampPattern = /(?:^|\n)\s*\d+(?:\.\d+)?\s*[-—至]\s*\d+(?:\.\d+)?\s*秒/u;
const autocutTimestampPattern = /(?:\d{1,2}:\d{2}\s*[-—至]\s*\d{1,2}:\d{2}|\d+(?:\.\d+)?\s*秒\s*[:：]|第\s*\d+\s*秒|\d+(?:\.\d+)?\s*[-—至]\s*\d+(?:\.\d+)?\s*秒|(?:本段|本条|全片|整条|全程)?总?时长\s*\d+(?:\.\d+)?\s*(?:秒|s\b)|(?:镜头|近景|特写|画面)?[^。；\r\n]{0,8}(?:停留|持续|保持|等待|停顿)\s*(?:\d+(?:\.\d+)?|[一二两三四五六七八九十]+)\s*(?:秒|s\b))/iu;
const actorStatePattern = /^｜(.+?)（(.+)）\s+(情绪|说话态度)：([^\r\n]+)。([｜]?)$/u;
const actorVoicePattern = /^(.+?)的音色是：([^。\r\n]+)。$/u;
const actorVoiceAudioPattern = /^(.+?)的音色音频文件参考引用：(.+)。｜$/u;
const actorReferenceFormPattern = /^(?:表演参考：\S+|匿名表演指纹：.+)$/u;
const actorSourceLeakPattern = /[《》]|(?:作品|片名|剧名|原作角色|饰演|扮演|中的角色)/u;
const spatialMotionStartLabel = "开始空间运动状态：";
const spatialMotionEndLabel = "结束空间运动状态：";
const spatialMotionEmotionLeakPattern = /(?:情绪-|情绪：|情绪状态|表演参考|匿名表演指纹)/u;
const performanceReferenceDirectionPattern = /(?:注意力|目光|视线|眼神|身体|脸|面部|头部)[^，。；｜\r\n]{0,12}(?:朝向|朝着|面向|面朝|看向|望向|转向|投向|落向|落在|放在|放回|集中于|指向|对着|对准|背对|注视|盯着)|(?:朝向|朝着|面向|面朝|看向|望向|转向|投向|落向|放在|放回|集中于|指向|对着|对准|背对|注视|盯着)/u;
const gazeFramingVerbPattern = /(?:看着|看向|望着|望向|盯着|盯向|注视|凝视|对视|(?:目光|视线|眼神)[^，。；！？\r\n]{0,12}(?:落在|落向|投向|转向|朝向|看向|望向|盯着|注视|凝视))/u;
const performanceViewpointTermPattern = /(?:正面|背面|侧面)/u;
const abstractPerformanceDirectionPatterns = [
  /(?:注意力|目光|视线|眼神)[^，。；\r\n]{0,12}(?:朝向|朝着|面向|面朝|看向|望向|转向|投向|落向|落在|放在|放回|集中于|指向|对着|对准|注视|盯着)[^，。；\r\n]{0,12}(?:眼前真实事物|真实事物|外界|世界|现实|周围|外部)/u,
  /镜头在看[^，。；\r\n]{1,16}[，,][^，。；\r\n]{1,16}在看世界/u
];
const characterDirectionPattern = /(?:注意力|目光|视线|眼神|身体|脸|面部|头部)?[^，。；\r\n]{0,16}(?:朝向|朝着|面向|面朝|看向|望向|转向|投向|落向|落在|放在|放回|集中于|指向|对着|对准|背对|注视|盯着)/u;
const invisibleFormatPattern = /[\u200B-\u200D\u2060\uFEFF]/u;
const requiredGlobalVisualStyle = "高端动作概念片，电影级广告级画质，广告级商业调色，画面通透明亮、层次分明，色彩饱和自然不发灰，高光与材质光泽锐利。";
const requiredGlobalFilter = "Schneider Hollywood Black Magic 1/8";
const requiredGlobalCameraPreference = "镜头偏好手持镜头特写和近景。无任何中景 远景。";
const requiredGlobalEnvironmentContinuity = "非切镜情况下环境不跳变。";
const explicitSceneMusicPattern = /(?:背景音乐|配乐|音乐风格|音乐：|音乐-)/u;
const landscapeAspectPattern = /(?:21\s*[:：]\s*9|16\s*[:：]\s*9|2\.(?:35|39)\s*[:：]\s*1|1\.85\s*[:：]\s*1|横屏|横版|宽屏|超宽银幕)/u;
const portraitAspectPattern = /(?:9\s*[:：]\s*16|4\s*[:：]\s*5|3\s*[:：]\s*4|竖屏|竖版)/u;
const bareBoundaryPositionPattern = /(?:门口|门边|门旁|门槛|入口处|入口旁|入口附近|舱口|闸门口)(?!内侧|外侧)/u;

const autocutControlPattern = /对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。/u;
const autocutActionControlPattern = /自主决定全部运镜、景别变化、切镜数量与切换时点/u;
const deprecatedCutRestraintPattern = /(?:默认优先保持连续镜头|同一轮对白[^。；\r\n]{0,48}尽量在同一镜头内完成|只有当前镜头无法[^。；\r\n]{0,48}才切镜|禁止逐句切镜[^。；\r\n]{0,80}连续正反打)/u;
const autocutNoWideFallbackPattern = /(?:不|禁止)[^。；\r\n]{0,8}(?:退回|使用|出现|展示)[^。；\r\n]{0,48}(?:完整[^。；\r\n]{0,18})?全景/u;
const autocutPositiveWidePatterns = [
  /(?:固定机位|镜头固定|主镜头)[^。；\r\n]{0,24}(?:大远景|远景|全景|中全景)/u,
  /(?:切到|切换到|转到|转为|变为|退到|回到|采用|使用|拉到)(?:完整[^。；\r\n]{0,18})?(?:大远景|远景|全景|中全景)/u,
  /(?:完整房间|完整茶室|完整空间|四人站位|多人站位)(?:的)?(?:主镜头|全景|中全景)/u,
  /(?:全程|全片|整条)[^。；\r\n]{0,16}(?:大远景|远景|全景|中全景)(?:镜头)?/u
];
const authoredCameraBodyPattern = /(?:第[一二三四五六七八九十\d]+镜|景别\s*[-：:]|机位\s*[-：:]|镜头\s*[-：:]|主对焦\s*[-：:]|位置与构图\s*[:：]|结束构图\s*[:：]|(?:画面|开场|最后)[^。；\r\n]{0,36}(?:近景|特写|大特写|中景|中近景|全景|远景)|(?:摄影机|镜头)[^。；\r\n]{0,28}(?:推近|推进|前移|拉远|拉开|后移|横移|侧移|平移|跟拍|跟随|环绕|绕行|摇摄|摇镜|甩镜|升起|上升|下降|下沉|俯冲|穿越|变焦|推轨|滑轨|手持)|(?:焦距|焦段|长焦|广角|主焦点|焦点锁定)[^。；\r\n]{0,24})/u;

const defensiveFootwearContinuityPatterns = [
  /(?:双脚|左脚|右脚)[^，。；！？\r\n]{0,12}(?:仍|依然|始终)(?:穿|穿着)[^，。；！？\r\n]{0,8}(?:鞋|靴)/u,
  /(?:仍|依然|始终)(?:穿|穿着)[^，。；！？\r\n]{0,8}(?:鞋|靴)/u,
  /(?:鞋子?|靴子?|短靴|长靴|运动鞋|高跟鞋|皮鞋)[^，。；！？\r\n]{0,12}(?:仍在脚上|依然在脚上|没有脱落|未脱落|保持附着|保持穿着)/u
];
const ambiguousEntityReferencePattern = /(?:他们|她们|它们|其中一个|其中一只|另一人|另一只|对方|两人|三人|双方|他|她|它|其)(?=(?:的|把|将|被|向|朝|从|在|与|和|正|仍|已|随|继|开|停|没|不|身|面|后|前|侧|颈|手|脚|头|眼|嘴|尾|爪|翅|，|。|；|！|？|\s))/u;
const ambiguousMechanicalUnitPattern = /(?:基础巡检员|机器人巡检员|巡检单位)/u;

const liveActionSafetyExecutionPatterns = [
  /(?:均|全部|所有)?[^。；\r\n]{0,12}(?:以|用|通过)(?:借位|错位)(?:和|与|配合)?(?:演员)?(?:反应|表演)?(?:来)?完成/u,
  /(?:借位|错位)(?:拍摄|表演|完成|呈现|处理)/u,
  /不(?:要|再)?让(?:真人)?演员[^。；\r\n]{0,24}(?:实际|真实|真正)?(?:承受|受力|接触|负重|撞击|受伤)/u,
  /(?:真人|演员)[^。；\r\n]{0,20}(?:不|不要|无需|避免)[^。；\r\n]{0,12}(?:实际|真实|真正)(?:承受|受力|接触|负重|撞击|受伤)/u,
  /替身(?:台面|桌面|工作台|平台|道具)/u,
  /(?:使用|改用|换用|换成|由)替身(?:演员|道具|台面|桌面|工作台|平台)?/u,
  /(?:避开|绕开|错开|不要对准|不接触)(?:演员的|人物的)?真实(?:膝关节|关节|身体|皮肤|面部|头部|颈部|脊椎|要害)/u,
  /(?:拍摄|表演|动作执行|安全执行)[^。；\r\n]{0,20}(?:避免真实接触|不实际接触|不真正受力|只做反应)/u
];
const sourceContactFamilyPatterns = [
  ["through", /(?:穿透|贯穿|洞穿|刺穿)/gu],
  ["insertion", /(?:插(?:入|进(?:去)?)|刺(?:入|进(?:去)?)|扎(?:入|进(?:去)?)|捅(?:入|进(?:去)?)|没入)/gu],
  ["impact", /(?:命中|击中|撞中|砸中|打中|踢中|劈中|砍中|刺中|射中|撞上|撞到|撞进|砸到|砸在|打在|踢在|劈在|砍在|刺在)/gu],
  ["hold", /(?:压住|按住|扣住|锁住|掐住|抓住|踩住|抵住|卡住|箍住)/gu],
  ["graze", /(?:擦着|擦到)/gu],
  ["touch", /(?:碰到|碰着|触到|触及|触碰|接触|摸到|摸着|贴住)/gu],
  ["compression", /(?:压进|按进)/gu]
];
const contactImmediateNegationPattern = /(?:没有|并未|并没有|未能|没能|不曾|从未|无法|不能|没|未|不)(?:真正|实际|成功|直接|完全)?$/u;
const contactImmediateUncertaintyPattern = /(?:差点|险些|几乎|试图|企图|尝试|准备|正要|将要|即将|想要|要|会)(?:(?:一刀|一脚|一拳)|(?:用|把)[^，,。；！？\r\n]{0,6})?$/u;
const contactHypotheticalPrefixPattern = /(?:如果|若|假如|要是|一旦|本可|原本可以)[^，,。；！？\r\n]{0,16}$/u;
const contactNegatingSuffixPattern = /^(?:不了|不到|不着|未果|失败)/u;
const nonPhysicalContactContextPattern = /(?:情绪|怒火|笑意|恐惧|冲动|念头|呼吸|疲惫|疼痛|欲望|火气|话头|哭声|笑声|脾气|心跳|表情|视线|目光|注意力|焦点|机会|时机|节奏|问题|信息|真相|秘密|话题|要点|重点)/u;
const contactWeakeningPatterns = [
  /(?:擦|刺|捅|扎|砍|劈|撞|砸|打|踢|压|按|扣|锁|掐|抓|射)(?:向|朝)/u,
  /(?:向|朝)[^，。；！？\r\n]{0,16}(?:擦|刺|捅|扎|砍|劈|撞|砸|打|踢|压|按|扣|锁|掐|抓|射)(?:去|来|过去|过来)?/u,
  /(?:试图|企图|尝试|准备|正要|将要|即将|想要)[^，。；！？\r\n]{0,18}(?:擦|刺|捅|扎|砍|劈|撞|砸|打|踢|压|按|扣|锁|掐|抓|射|碰|接触|穿透|插入)/u,
  /(?:差点|险些|几乎)[^，。；！？\r\n]{0,18}(?:擦|刺|捅|扎|砍|劈|撞|砸|打|踢|压|按|扣|锁|掐|抓|射|碰|接触|命中|穿透|插入)/u,
  /(?:逼近|悬停|没有碰到|没碰到|未碰到|没有命中|未命中|没有接触|未接触|落空|扑空|挥空|擦身而过)/u,
  /(?:停在|停到)[^，。；！？\r\n]{0,12}(?:前|旁|上方|外侧)/u
];
const contactAnchorStopPattern = /(?:随后|然后|最后|随即|立刻|已经|仍然|直接|一脚|一刀|一拳|一下|转过|转身|伸手|仍|再|又|用|把|被|将|让|使|朝|向|从|在|于|和|与|并|而|她们|他们|它们|她|他|它|其|这个|那个|的|了|着|过)/gu;
const genericContactAnchors = new Set(["身体", "动作", "开始", "完成", "进去", "出来", "一侧", "旁边", "上方", "下方", "位置", "地方"]);
const speechQuotePattern = /“([^”]*)”/gu;
const speechAttributionPattern = /([\p{Script=Han}A-Za-z0-9·_-]{1,24})（([^（）\r\n]+)）说：$/u;
const attributedDialogueSpanPattern = /[\p{Script=Han}A-Za-z0-9·_-]{1,24}（[^（）\r\n]+）说：“[^”]*”/gu;
const speechOrientationPattern = /^(?:对(?!话|白)[^，。；（）：“”]{1,24}|朝[^，。；（）：“”]{1,24})$/u;
const ambiguousSpeechOrientationPattern = /(?:对(?:我|我们|你|你们|她|她们|他|他们|它|它们|其|对方|某人|有人)|朝(?:那边|那一边|某处|那儿))(?:[，）]|$)/u;
const ambiguousSpeakerLabels = new Set(["我", "我们", "你", "你们", "她", "她们", "他", "他们", "它", "它们", "其", "有人", "对方", "两人", "众人"]);
const invalidSpeakerPhrasePattern = /(?:看着|望着|盯着|朝着|朝向|面向|转向|回头|低头|抬头|走向|站在|坐在|停在|靠近|远离|身旁|身后|门口的(?:她|他|它)|(?:她|他|它|其)$)/u;
const autocutForbiddenStructurePatterns = [
  [/^\s*第[一二三四五六七八九十\d]+镜/mu, "DIALOGUE_AUTOCUT_FORBIDS_EXPLICIT_SHOT_HEADERS"],
  [/(?:^|[｜\s])景别\s*[-：:]/mu, "DIALOGUE_AUTOCUT_FORBIDS_SHOT_SIZE_FIELDS"],
  [/(?:^|[｜\s])机位\s*[-：:]/mu, "DIALOGUE_AUTOCUT_FORBIDS_CAMERA_POSITION"],
  [/(?:^|[｜\s])镜头\s*[-：:]/mu, "DIALOGUE_AUTOCUT_FORBIDS_CAMERA_FIELDS"],
  [/(?:^|[｜\s])主对焦\s*[-：:]/mu, "DIALOGUE_AUTOCUT_FORBIDS_FOCUS_FIELDS"],
  [/(?:explicit_shots|projection_mode\s*[:：]\s*mixed)/iu, "DIALOGUE_AUTOCUT_IS_THE_ONLY_PLATFORM_PROJECTION"],
  [/^\s*位置与构图\s*[:：]/mu, "DIALOGUE_AUTOCUT_FORBIDS_PER_SHOT_COMPOSITION"],
  [/预计有效时长/u, "DIALOGUE_AUTOCUT_FORBIDS_PROJECTED_TIMING"],
  [/^\s*结束构图\s*[:：]/mu, "DIALOGUE_AUTOCUT_FORBIDS_EXPLICIT_END_COMPOSITION_FIELD"],
  [/(?:机位设在|机位位于|摄影机位于|摄影机设在|镜头固定于|镜头固定在)[^。；\r\n]{1,40}/u, "DIALOGUE_AUTOCUT_FORBIDS_CAMERA_POSITION"],
  [/每(?:一)?镜[^。；\r\n]{0,16}(?:只|仅)[^。；\r\n]{0,12}(?:一名|一个|单人)/u, "DIALOGUE_AUTOCUT_FORBIDS_SINGLE_PERSON_PER_SHOT_LOCK"],
  [/[^。；\r\n]{1,20}占画面(?:高度)?(?:百分之\s*\d+|\d+\s*%)/u, "DIALOGUE_AUTOCUT_FORBIDS_FRAME_PERCENTAGE_LOCK"],
  [/(?:全片|全条|整条|全程)[^。；\r\n]{0,12}(?:一共|共|由)?\s*[一二三四五六七八九十\d]+\s*(?:次|个)?[^。；\r\n]{0,8}(?:镜头|切镜|独立镜头)/u, "DIALOGUE_AUTOCUT_FORBIDS_FIXED_CUT_COUNT"],
  [/(?:全程|整条|从头到尾)[^。；\r\n]{0,12}(?:固定机位|镜头固定)/u, "DIALOGUE_AUTOCUT_FORBIDS_FULL_CLIP_FIXED_CAMERA"],
  [/(?:每(?:一)?名说话者|每(?:一)?句(?:对白)?|逐句)[^。；\r\n]{0,36}(?:固定机位|镜头固定)/u, "DIALOGUE_AUTOCUT_FORBIDS_PER_LINE_FIXED_CAMERA"],
  [/[^。；\r\n]{1,16}说话时[^。；\r\n]{0,16}(?:固定机位|镜头固定)/u, "DIALOGUE_AUTOCUT_FORBIDS_PER_LINE_FIXED_CAMERA"]
];

function isNormalizedText(value) {
  return typeof value === "string"
    && value.length > 0
    && value === value.trim()
    && !invisibleFormatPattern.test(value);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function previewGenerationId(prompt) {
  return prompt.match(/(?:^|\n)生成编号：[ \t]*([^\r\n]+)/u)?.[1]?.trim();
}

function resolvePromptProjectionMode(prompt, label) {
  void prompt;
  void label;
  return projectionMode;
}

function detectOutputAspect(text, label) {
  const landscape = landscapeAspectPattern.test(text);
  const portrait = portraitAspectPattern.test(text);
  if (landscape === portrait) {
    errors.push(`${label}: global must declare exactly one output aspect as landscape or portrait`);
    return undefined;
  }
  return landscape ? "landscape" : "portrait";
}

function validateDialogueAttribution(text, label) {
  const leftCount = [...text].filter((character) => character === "“").length;
  const rightCount = [...text].filter((character) => character === "”").length;
  const quotes = [...text.matchAll(speechQuotePattern)];
  if (leftCount !== rightCount || leftCount !== quotes.length) {
    errors.push(`${label}: DIALOGUE_ATTRIBUTION_REQUIRED; Chinese speech quotes must be balanced and complete`);
    return;
  }
  if (/["‘’「」『』]/u.test(text)) {
    errors.push(`${label}: DIALOGUE_ATTRIBUTION_REQUIRED; use Chinese double speech quotes only after an explicit speaker and target`);
  }
  for (const quote of quotes) {
    const dialogue = quote[1].trim();
    const prefix = text.slice(0, quote.index).trimEnd();
    const attribution = prefix.match(speechAttributionPattern);
    if (!dialogue || !attribution) {
      errors.push(`${label}: DIALOGUE_ATTRIBUTION_REQUIRED; write 角色名（对具体人物或朝具体方向）说：“台词。”`);
      continue;
    }
    const [, speaker, orientation] = attribution;
    if (ambiguousSpeakerLabels.has(speaker)
      || invalidSpeakerPhrasePattern.test(speaker)
      || !speechOrientationPattern.test(orientation)
      || ambiguousSpeechOrientationPattern.test(orientation)) {
      errors.push(`${label}: DIALOGUE_ATTRIBUTION_REQUIRED; ${speaker} must be a clear name or role and the parentheses must name who or which direction receives the speech`);
    }
  }
}

function extractDialogueSpeakers(text) {
  const speakers = new Set();
  for (const quote of text.matchAll(speechQuotePattern)) {
    const prefix = text.slice(0, quote.index).trimEnd();
    const attribution = prefix.match(speechAttributionPattern);
    if (attribution) speakers.add(attribution[1]);
  }
  return speakers;
}

function audioOnlySpeakerRule(characterId) {
  return `${characterId}本条仅以画外声音参与；不呈现${characterId}本人、${characterId}所在空间、声音来源端画面或任何屏幕中的${characterId}影像。`;
}

function stripAttributedDialogue(text) {
  return String(text ?? "").replace(attributedDialogueSpanPattern, "");
}

function visibleCharacterIdsAcrossClip(clip) {
  const visibleIds = new Set(Object.entries(clip?.start_state?.characters ?? {})
    .filter(([, character]) => character?.present !== false && character?.visible === true)
    .map(([characterId]) => characterId));
  for (const event of clip?.events ?? []) {
    for (const effect of event?.effects ?? []) {
      const match = String(effect?.path ?? "").match(/^characters\.([^.]+)\.visible$/u);
      if (match && effect?.set === true) visibleIds.add(match[1]);
    }
  }
  for (const [characterId, character] of Object.entries(clip?.end_state?.characters ?? {})) {
    if (character?.present !== false && character?.visible === true) visibleIds.add(characterId);
  }
  return visibleIds;
}

function stripVerbatimDialogue(text) {
  return text.replace(/“[^”]*”/gu, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function projectsHeadOrientation(text, characterId, facing) {
  if (typeof text !== "string" || typeof characterId !== "string" || typeof facing !== "string") return false;
  const character = escapeRegExp(characterId);
  const target = escapeRegExp(facing);
  return new RegExp(`${character}[^，。；！？\\r\\n]{0,28}(?:的)?(?:头部|头)[^，。；！？\\r\\n]{0,6}朝向${target}`, "u").test(text);
}

function validateHeadOrientationProjection(parsed, stateClip) {
  for (const [stateLabel, state, text] of [
    ["开始空间运动状态", stateClip?.start_state, parsed.startSpatialMotion],
    ["结束空间运动状态", stateClip?.end_state, parsed.endSpatialMotion]
  ]) {
    for (const [characterId, character] of Object.entries(state?.characters ?? {})) {
      if (character?.visible !== true || typeof character.facing !== "string") continue;
      if (!projectsHeadOrientation(text, characterId, character.facing)) {
        errors.push(`${parsed.label}: HEAD_ORIENTATION_NOT_PROJECTED ${stateLabel} ${characterId} -> ${character.facing}; write ${characterId}的头部朝向${character.facing}`);
      }
    }
  }
}

function validateDefensiveFootwearContinuity(text, label) {
  const match = defensiveFootwearContinuityPatterns.map((pattern) => text.match(pattern)?.[0]).find(Boolean);
  if (match) {
    errors.push(`${label}: DEFENSIVE_FOOTWEAR_CONTINUITY_FORBIDDEN; omit unchanged footwear reassurance unless footwear actually changes: ${match}`);
  }
}

function validateExplicitEntityNaming(text, label) {
  const match = stripVerbatimDialogue(text).match(ambiguousEntityReferencePattern)?.[0];
  if (match) errors.push(`${label}: EXPLICIT_ENTITY_NAME_REQUIRED; replace ambiguous non-dialogue reference: ${match}`);
}

function validateMechanicalUnitNaming(text, label) {
  const match = stripVerbatimDialogue(text).match(ambiguousMechanicalUnitPattern)?.[0];
  if (match) errors.push(`${label}: MECHANICAL_UNIT_NAMING_AMBIGUOUS; name the machine as a robot or confirmed mechanical model: ${match}`);
}

function validateLiveActionSafetyExecutionLanguage(text, label) {
  for (const pattern of liveActionSafetyExecutionPatterns) {
    const match = text.match(pattern);
    if (!match) continue;
    errors.push(`${label}: LIVE_ACTION_SAFETY_EXECUTION_LANGUAGE_FORBIDDEN; remove behind-the-scenes safety wording from platform text: ${match[0]}`);
    return;
  }
}

function contactOccurrenceIsAffirmative(sentence, match) {
  const prefix = sentence.slice(0, match.index).replace(/\s+/gu, "");
  const suffix = sentence.slice(match.index + match[0].length).replace(/\s+/gu, "");
  const immediatePrefix = prefix.slice(-20);
  if (contactImmediateNegationPattern.test(immediatePrefix)
    || contactImmediateUncertaintyPattern.test(immediatePrefix)
    || contactHypotheticalPrefixPattern.test(immediatePrefix)
    || contactNegatingSuffixPattern.test(suffix)) {
    return false;
  }

  const abstractAfter = suffix.slice(0, 8).match(nonPhysicalContactContextPattern);
  const abstractBefore = prefix.slice(-12).match(nonPhysicalContactContextPattern);
  if (abstractAfter?.index === 0) return false;
  if (abstractBefore
    && new RegExp(`${nonPhysicalContactContextPattern.source}(?:被|让|给|由|把|将)?[^，,。；！？\\r\\n]{0,3}$`, "u").test(prefix.slice(-12))) {
    return false;
  }
  return true;
}

function buildContactAnchors(context, marker, characterNames) {
  let normalized = context;
  for (const character of [...characterNames].sort((a, b) => b.length - a.length)) {
    normalized = normalized.split(character).join("|");
  }
  normalized = normalized.split(marker).join("|");
  normalized = normalized.replace(contactAnchorStopPattern, "|");
  const segments = normalized
    .replace(/[^\p{Script=Han}A-Za-z0-9]+/gu, "|")
    .split("|")
    .filter(Boolean);
  const anchors = new Set();
  for (const segment of segments) {
    const characters = [...segment];
    for (let size = Math.min(4, characters.length); size >= 2; size -= 1) {
      for (let index = 0; index + size <= characters.length; index += 1) {
        const anchor = characters.slice(index, index + size).join("");
        if (!genericContactAnchors.has(anchor)) anchors.add(anchor);
      }
    }
  }
  return [...anchors].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

function extractAffirmativeContactFacts(text, characterNames = []) {
  if (typeof text !== "string") return [];
  const actionText = text.replace(speechQuotePattern, "");
  const facts = [];
  for (const sentence of actionText.split(/[。；！？\r\n]/u).filter(Boolean)) {
    for (const [family, pattern] of sourceContactFamilyPatterns) {
      for (const match of sentence.matchAll(pattern)) {
        if (!contactOccurrenceIsAffirmative(sentence, match)) continue;
        const contextStart = Math.max(0, match.index - 24);
        const contextEnd = Math.min(sentence.length, match.index + match[0].length + 24);
        const context = sentence.slice(contextStart, contextEnd);
        facts.push({
          family,
          marker: match[0],
          context,
          anchors: buildContactAnchors(context, match[0], characterNames),
          characters: characterNames.filter((character) => context.includes(character))
        });
      }
    }
  }
  return facts;
}

function contactFactRelevance(sourceFact, candidateText) {
  const anchorScore = sourceFact.anchors.reduce(
    (best, anchor) => candidateText.includes(anchor) ? Math.max(best, anchor.length) : best,
    0
  );
  if (sourceFact.anchors.length > 0) return anchorScore;
  if (sourceFact.characters.length > 0) {
    return sourceFact.characters.every((character) => candidateText.includes(character)) ? 1 : 0;
  }
  return 1;
}

function findRelatedContactWeakening(body, sourceFact) {
  return body
    .replace(speechQuotePattern, "")
    .split(/[。；！？\r\n]/u)
    .filter((sentence) => contactFactRelevance(sourceFact, sentence) > 0)
    .find((sentence) => contactWeakeningPatterns.some((pattern) => pattern.test(sentence)));
}

function validateSourceContactResults(parsed, stateClip, characterNames) {
  if (!Array.isArray(stateClip.events)) return;
  const deliveredFacts = extractAffirmativeContactFacts(parsed.autocutBody ?? "", characterNames);
  const usedDeliveredFacts = new Set();

  for (const event of stateClip.events) {
    if (typeof event?.visible_action !== "string") continue;
    const sourceFacts = extractAffirmativeContactFacts(event.visible_action, characterNames);
    for (const sourceFact of sourceFacts) {
      let bestIndex = -1;
      let bestScore = 0;
      for (const [index, deliveredFact] of deliveredFacts.entries()) {
        if (usedDeliveredFacts.has(index) || deliveredFact.family !== sourceFact.family) continue;
        const score = contactFactRelevance(sourceFact, deliveredFact.context);
        if (score > bestScore) {
          bestIndex = index;
          bestScore = score;
        }
      }
      if (bestIndex >= 0) {
        usedDeliveredFacts.add(bestIndex);
        continue;
      }

      const weakened = findRelatedContactWeakening(parsed.autocutBody ?? "", sourceFact);
      if (weakened) {
        errors.push(`${parsed.label}: SOURCE_CONTACT_RESULT_WEAKENED event ${event.id ?? "<unknown>"} requires affirmative ${sourceFact.marker}; direction, attempt, near miss, hovering, or no-contact wording cannot replace the source result`);
      } else {
        errors.push(`${parsed.label}: SOURCE_CONTACT_RESULT_MISSING event ${event.id ?? "<unknown>"} requires affirmative ${sourceFact.marker} in the chronological body`);
      }
    }
  }
}

function validateCrowdStateProjection(parsed, stateClip) {
  const startCrowd = isObject(stateClip.start_state?.crowd_entities) ? stateClip.start_state.crowd_entities : {};
  const endCrowd = isObject(stateClip.end_state?.crowd_entities) ? stateClip.end_state.crowd_entities : {};

  for (const [entityId, entity] of Object.entries(startCrowd)) {
    if (!isObject(entity) || entity.present !== true) continue;
    if (!parsed.startSpatialMotion.includes(entity.continuity_state)) {
      errors.push(`${parsed.label}: CROWD_START_STATE_NOT_PROJECTED: ${entityId}`);
    }
  }

  for (const [entityId, entity] of Object.entries(endCrowd)) {
    if (!isObject(entity)) continue;
    const exitedDuringBlock = startCrowd[entityId]?.present === true && entity.present === false;
    if (entity.present !== true && !exitedDuringBlock) continue;
    if (!parsed.endSpatialMotion.includes(entity.continuity_state)) {
      errors.push(`${parsed.label}: CROWD_END_STATE_NOT_PROJECTED: ${entityId}`);
    }
  }
}

function containsCharacterDirection(text, character) {
  let cursor = 0;
  while (cursor < text.length) {
    const index = text.indexOf(character, cursor);
    if (index < 0) return false;
    const clause = text.slice(index + character.length).split(/[。；\r\n]/u, 1)[0].slice(0, 48);
    if (characterDirectionPattern.test(clause)) return true;
    cursor = index + character.length;
  }
  return false;
}

function validateBoundarySide(text, label) {
  if (bareBoundaryPositionPattern.test(text)) {
    errors.push(`${label}: BOUNDARY_SIDE_REQUIRED; replace a bare doorway or entrance position with an explicit side such as 门内侧, 门外侧, 房间侧, 走廊侧, 舱内, or 舱外`);
  }
}

function globalScopeDiagnostics(globalText, knownEntityNames) {
  const diagnostics = [];
  const scopedText = globalText
    .split(requiredGlobalCameraPreference).join("")
    .replace(autocutControlPattern, "");
  for (const name of knownEntityNames) {
    if (name && scopedText.includes(name)) {
      diagnostics.push(`ENTITY_RULE_IN_GLOBAL; ${name} belongs in the current block's 特殊规则 or world state`);
    }
  }
  for (const clause of scopedText.split(/[。；！？\r\n]+/u)) {
    if (globalEntityNounPattern.test(clause) && globalEntityConstraintPattern.test(clause)) {
      diagnostics.push(`ENTITY_RULE_IN_GLOBAL; move object-specific constraint to the current block's 特殊规则`);
      break;
    }
  }
  return [...new Set(diagnostics)];
}

function parseDialogueAutocutBody(prompt, label, globalLineEnd) {
  const projectedBody = globalLineEnd >= 0 ? prompt.slice(globalLineEnd).trim() : "";
  if (!projectedBody) {
    errors.push(`${label}: dialogue_autocut requires a nonempty chronological body after global`);
    return { body: "", specialRules: [], startSpatialMotion: "", endSpatialMotion: "" };
  }
  const startMatches = [...projectedBody.matchAll(/^开始空间运动状态：([^\r\n]+)$/gmu)];
  const endMatches = [...projectedBody.matchAll(/^结束空间运动状态：([^\r\n]+)$/gmu)];
  if (startMatches.length !== 1) errors.push(`${label}: requires exactly one nonempty 开始空间运动状态 paragraph immediately after 故事背景状态`);
  if (endMatches.length !== 1) errors.push(`${label}: requires exactly one nonempty 结束空间运动状态 paragraph as the final paragraph`);
  const backgroundMatches = [...prompt.matchAll(/^故事背景状态：([^\r\n]*)$/gmu)];
  if (backgroundMatches.length !== 1 || !backgroundMatches[0]?.[1]?.trim()) {
    errors.push(`${label}: STORY_BACKGROUND_REQUIRED: requires exactly one nonempty 故事背景状态 paragraph`);
  }
  const backgroundMatch = backgroundMatches[0];
  const startMatch = startMatches[0];
  const endMatch = endMatches[0];
  const startSpatialMotion = startMatch?.[1]?.trim() ?? "";
  const endSpatialMotion = endMatch?.[1]?.trim() ?? "";
  const specialRules = [];
  const storyBackground = backgroundMatch?.[1]?.trim() ?? "";
  if (backgroundMatch && startMatch) {
    const beforeStart = projectedBody.slice(0, startMatch.index).trimEnd();
    if (backgroundMatch.index <= globalLineEnd || !beforeStart.endsWith(backgroundMatch[0])) {
      errors.push(`${label}: STORY_BACKGROUND_ORDER: place 故事背景状态 after all special rules and immediately before 开始空间运动状态`);
    }
  }
  let body = "";
  if (startMatch) {
    const prefix = projectedBody.slice(0, startMatch.index).trim();
    if (prefix) {
      for (const paragraph of prefix.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)) {
        if (paragraph.startsWith("故事背景状态：")) continue;
        const match = paragraph.match(/^特殊规则：([^\r\n]+)$/u);
        if (!match || !match[1].trim()) {
          errors.push(`${label}: only block-local 特殊规则 paragraphs followed by 故事背景状态 may appear between global and 开始空间运动状态`);
          continue;
        }
        const rule = match[1].trim();
        if (specialRules.includes(rule)) errors.push(`${label}: duplicate block-local special rule ${rule}`);
        else specialRules.push(rule);
      }
    }
  }
  if (startMatch && endMatch && endMatch.index > startMatch.index) {
    const startEnd = startMatch.index + startMatch[0].length;
    body = projectedBody.slice(startEnd, endMatch.index).trim();
    const endEnd = endMatch.index + endMatch[0].length;
    if (projectedBody.slice(endEnd).trim()) errors.push(`${label}: 结束空间运动状态 must be the final paragraph`);
  } else if (startMatch && endMatch) {
    errors.push(`${label}: 结束空间运动状态 must follow the chronological event body`);
  }
  if (!startSpatialMotion) errors.push(`${label}: 开始空间运动状态 cannot be empty`);
  if (!endSpatialMotion) errors.push(`${label}: 结束空间运动状态 cannot be empty`);
  validateBoundarySide(startSpatialMotion, `${label}.开始空间运动状态`);
  validateBoundarySide(endSpatialMotion, `${label}.结束空间运动状态`);
  const startDoorwayStateDiagnostic = doorwaySpatialStateDiagnostic(startSpatialMotion, prompt);
  if (startDoorwayStateDiagnostic) errors.push(`${label}.开始空间运动状态: ${startDoorwayStateDiagnostic}`);
  const endDoorwayStateDiagnostic = doorwaySpatialStateDiagnostic(endSpatialMotion, prompt);
  if (endDoorwayStateDiagnostic) errors.push(`${label}.结束空间运动状态: ${endDoorwayStateDiagnostic}`);
  if (spatialMotionEmotionLeakPattern.test(startSpatialMotion)) errors.push(`${label}: 开始空间运动状态 must not contain emotion or performance-reference content`);
  if (spatialMotionEmotionLeakPattern.test(endSpatialMotion)) errors.push(`${label}: 结束空间运动状态 must not contain emotion or performance-reference content`);
  if (!body) errors.push(`${label}: dialogue_autocut requires chronological events between the start and end spatial-motion states`);
  for (const [pattern, diagnostic] of autocutForbiddenStructurePatterns) {
    if (pattern.test(projectedBody) || pattern.test(prompt)) errors.push(`${label}: ${diagnostic}`);
  }
  if (autocutTimestampPattern.test(projectedBody)) {
    errors.push(`${label}: DIALOGUE_AUTOCUT_FORBIDS_TIMECODES; keep event order but remove seconds and duration labels`);
  }
  if (authoredCameraBodyPattern.test(projectedBody)) {
    errors.push(`${label}: DIALOGUE_AUTOCUT_FORBIDS_AUTHORED_CAMERA; leave movement, framing, focus, and cutting to Seedance`);
  }
  if (autocutPositiveWidePatterns.some((pattern) => pattern.test(projectedBody))) {
    errors.push(`${label}: DIALOGUE_AUTOCUT_FORBIDS_POSITIVE_WIDE_FALLBACK; keep only the negative no-wide lock`);
  }
  for (const [index, rule] of specialRules.entries()) {
    validateExplicitEntityNaming(rule, `${label}.特殊规则[${index}]`);
    validateMechanicalUnitNaming(rule, `${label}.特殊规则[${index}]`);
  }
  validateExplicitEntityNaming(storyBackground, `${label}.故事背景状态`);
  validateMechanicalUnitNaming(storyBackground, `${label}.故事背景状态`);
  validateDefensiveFootwearContinuity(body, `${label}.dialogue_autocut`);
  validateExplicitEntityNaming(body, `${label}.dialogue_autocut`);
  validateMechanicalUnitNaming(body, `${label}.dialogue_autocut`);
  return { body, specialRules, startSpatialMotion, endSpatialMotion };
}

function punctuationViolations(prompt) {
  // Source speech stays byte-exact; paragraph formatting applies outside quoted utterances.
  prompt = prompt.replace(/“[^”]*”/gu, quote => "X".repeat(quote.length));
  const found = [];
  for (let index = 0; index < prompt.length; index += 1) {
    if (prompt[index] !== "。") continue;
    let cursor = index + 1;
    while (["”", "’", "）", ")", "】"].includes(prompt[cursor])) cursor += 1;
    const rest = prompt.slice(cursor);
    if (rest.length && !rest.startsWith("\n\n")) found.push(index);
  }
  return found;
}

const parsedPrompts = [];
const promptIds = new Set();

for (const [index, prompt] of prompts.entries()) {
  const label = `prompt[${index + 1}]`;
  if (!prompt) {
    errors.push(`${label}: empty prompt`);
    continue;
  }
  // Local delivery budget, not an automatic truncation/compression operation.
  if ([...prompt].length > 2400) errors.push(`${label}: exceeds 2400 characters (${[...prompt].length}); preserve source speech, action/state and essential visual identity when reducing length`);
  if (prompt.includes("@@")) errors.push(`${label}: contains retired @@ character marker; write character names and roles directly`);
  const promptProjectionMode = resolvePromptProjectionMode(prompt, label);
  const dialogueSpeakers = extractDialogueSpeakers(prompt);

  const fields = ["生成编号：", "global：", spatialMotionStartLabel, spatialMotionEndLabel];
  let previous = -1;
  for (const field of fields) {
    const position = prompt.indexOf(field);
    if (position < 0) errors.push(`${label}: missing ${field}`);
    else if (position <= previous) errors.push(`${label}: ${field} is out of order`);
    previous = Math.max(previous, position);
  }

  const globalStart = prompt.indexOf("global：");
  const globalLineEnd = globalStart >= 0 ? prompt.indexOf("\n", globalStart) : -1;
  const globalEnd = globalLineEnd >= 0 ? globalLineEnd : prompt.length;
  const generationStart = prompt.indexOf("生成编号：");
  const openingActorStates = [];
  const openingActorVoices = [];
  const openingActorVoiceAudios = [];
  let parsedGlobal;
  let parsedAspect;
  if (prompt.includes("出演角色描述：")) {
    errors.push(`${label}: contains removed field 出演角色描述：`);
  }
  if (/^约束：/mu.test(prompt)) {
    errors.push(`${label}: separate 约束 field is retired; use block-local 特殊规则 for object-specific constraints`);
  }

  if (generationStart >= 0 && globalStart > generationStart) {
    const generationLineEnd = prompt.indexOf("\n", generationStart);
    if (generationLineEnd < 0 || generationLineEnd >= globalStart) {
      errors.push(`${label}: actor emotion-state lines must begin after the 生成编号 line`);
    } else {
      const openingLines = prompt
        .slice(generationLineEnd + 1, globalStart)
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean);
      const seenCharacters = new Set();
      const seenVoiceCharacters = new Set();
      const seenVoiceAudioCharacters = new Set();
      let pendingActorState = null;
      let pendingActorVoice = null;

      const verifiedClip = (sceneState?.clips ?? sceneState?.blocks ?? []).find(clip => clip.id === prompt.match(/^生成编号：([^\r\n]+)/mu)?.[1]?.trim());
      const verifiedNoFormalCharacters = verifiedClip && Object.keys(verifiedClip.start_state?.characters ?? {}).length === 0 && Object.keys(verifiedClip.end_state?.characters ?? {}).length === 0;
      if (!openingLines.length && !verifiedNoFormalCharacters) {
        errors.push(`${label}: missing opening actor emotion-state line`);
      }

      for (const line of openingLines) {
        const stateMatch = line.match(actorStatePattern);
        if (stateMatch) {
          if (pendingActorState || pendingActorVoice) {
            errors.push(`${label}: ${pendingActorState.character} speaking-character emotion line must be followed immediately by the matching voice and audio-reference lines before another character begins`);
          }

          const [, rawCharacter, rawActor, performanceKind, rawEmotionFlow, rawUnitClose] = stateMatch;
          const [character, actor] = [rawCharacter, rawActor].map((value) => value.trim());
          const emotionSegments = rawEmotionFlow.split(/\s*→\s*/u).map((value) => value.trim());
          const emotionStart = emotionSegments[0];
          const emotionEnd = emotionSegments.at(-1);
          const emotionTransitions = emotionSegments.slice(1, -1);
          const hasDialogue = dialogueSpeakers.has(character);
          const closesOnEmotionLine = rawUnitClose === "｜";
          if ([character, actor, ...emotionSegments].some((value) => !value) || emotionSegments.length < 3) {
            errors.push(`${label}: opening actor emotion-state line contains an empty value: ${line}`);
          }
          if (!actorReferenceFormPattern.test(actor)) {
            errors.push(`${label}: performance reference for ${character} must use 表演参考：演员姓名 or 匿名表演指纹：稳定机制短句`);
          }
          if (actorSourceLeakPattern.test(actor)) {
            errors.push(`${label}: performance reference for ${character} must not include a work title or original role name`);
          }
          if (performanceViewpointTermPattern.test(rawEmotionFlow)) {
            errors.push(`${label}: PERFORMANCE_VIEWPOINT_TERM_FORBIDDEN for ${character}; describe the attitude without 正面, 背面, or 侧面`);
          }
          if (performanceReferenceDirectionPattern.test(actor)) {
            errors.push(`${label}: performance reference for ${character} must be spatially neutral; use the chronological picture for concrete orientation`);
          }
          if (seenCharacters.has(character)) {
            errors.push(`${label}: duplicate opening performance state for ${character}`);
          }
          if (performanceKind === "说话态度" && !hasDialogue) {
            errors.push(`${label}: OFFSCREEN_SPEAKING_ATTITUDE_REQUIRES_DIALOGUE; ${character} has no concrete attributed dialogue in this block`);
          }
          if (emotionTransitions.includes("保持不变") && (emotionTransitions.length !== 1 || emotionStart !== emotionEnd)) {
            errors.push(`${label}: ${character} uses 保持不变 but initial and ending emotions differ`);
          }
          if (hasDialogue && closesOnEmotionLine) {
            errors.push(`${label}: speaking character ${character} must keep the emotion line open and include matching voice and audio-reference lines`);
          }
          if (!hasDialogue && !closesOnEmotionLine) {
            errors.push(`${label}: character ${character} has no concrete dialogue in this block; close the emotion line with ｜ and omit voice settings`);
          }
          seenCharacters.add(character);
          const actorState = { character, actor, performanceKind, emotionStart, emotionTransitions, emotionEnd, hasDialogue };
          openingActorStates.push(actorState);
          pendingActorState = hasDialogue && !closesOnEmotionLine ? actorState : null;
          pendingActorVoice = null;
          continue;
        }

        const voiceMatch = line.match(actorVoicePattern);
        if (voiceMatch) {
          const [, rawCharacter, rawVoice] = voiceMatch;
          const [character, voice] = [rawCharacter, rawVoice]
            .map((value) => value.trim());
          if ([character, voice].some((value) => !value) || rawVoice !== voice) {
            errors.push(`${label}: character voice line contains an empty or unnormalized value: ${line}`);
          }
          if (seenVoiceCharacters.has(character)) {
            errors.push(`${label}: duplicate character voice line for ${character}`);
          }
          if (!dialogueSpeakers.has(character)) {
            errors.push(`${label}: character ${character} has no concrete dialogue in this block and must not include a voice line`);
          }
          if (!pendingActorState || pendingActorVoice) {
            errors.push(`${label}: character voice line for ${character} must immediately follow that character's delimited emotion line`);
          } else if (pendingActorState.character !== character) {
            errors.push(`${label}: character voice lines must match actor opening-line order; expected ${pendingActorState.character}, found ${character}`);
          }
          seenVoiceCharacters.add(character);
          pendingActorVoice = { character, voice };
          openingActorVoices.push(pendingActorVoice);
          continue;
        }

        const voiceAudioMatch = line.match(actorVoiceAudioPattern);
        if (voiceAudioMatch) {
          const [, rawCharacter, rawAudioReference] = voiceAudioMatch;
          const [character, audioReference] = [rawCharacter, rawAudioReference].map((value) => value.trim());
          if ([character, audioReference].some((value) => !value) || rawAudioReference !== audioReference) {
            errors.push(`${label}: character voice-audio reference line contains an empty or unnormalized value: ${line}`);
          }
          if (audioReference !== "未配置" && !path.isAbsolute(audioReference)) {
            errors.push(`${label}: ${character} voice-audio reference must be an absolute local path or 未配置`);
          }
          if (path.isAbsolute(audioReference)) {
            let audioStat;
            try { audioStat = fs.statSync(audioReference); } catch { /* Report the exact missing reference below. */ }
            if (!audioStat?.isFile() || audioStat.size === 0) {
              errors.push(`${label}: VOICE_AUDIO_FILE_MISSING: ${character} needs an existing nonempty audio file: ${audioReference}`);
            }
            if (!/\.(?:wav|mp3|m4a|aac|flac|ogg)$/iu.test(audioReference)) {
              errors.push(`${label}: VOICE_AUDIO_FORMAT_INVALID: ${character} reference must be an audio file`);
            }
          }
          if (seenVoiceAudioCharacters.has(character)) {
            errors.push(`${label}: duplicate character voice-audio reference line for ${character}`);
          }
          if (!dialogueSpeakers.has(character)) {
            errors.push(`${label}: character ${character} has no concrete dialogue in this block and must not include a voice-audio reference line`);
          }
          if (!pendingActorState || !pendingActorVoice) {
            errors.push(`${label}: character voice-audio reference for ${character} must immediately follow that character's voice line`);
          } else if (pendingActorState.character !== character || pendingActorVoice.character !== character) {
            errors.push(`${label}: character voice-audio reference must match the current character unit; expected ${pendingActorState.character}, found ${character}`);
          }
          seenVoiceAudioCharacters.add(character);
          openingActorVoiceAudios.push({ character, audioReference });
          pendingActorState = null;
          pendingActorVoice = null;
          continue;
        }

        errors.push(`${label}: malformed opening line; expected an actor emotion-state or offscreen speaking-attitude line, character voice line, or character voice-audio reference line: ${line}`);
      }

      if (pendingActorState && !pendingActorVoice) {
        errors.push(`${label}: speaking character ${pendingActorState.character} is missing ${pendingActorState.character}的音色是：……。`);
      } else if (pendingActorState && pendingActorVoice) {
        errors.push(`${label}: speaking character ${pendingActorState.character} is missing ${pendingActorState.character}的音色音频文件参考引用：未配置。｜`);
      }

      const voiceByCharacter = new Map(openingActorVoices.map((item) => [item.character, item]));
      const voiceAudioByCharacter = new Map(openingActorVoiceAudios.map((item) => [item.character, item]));
      for (const actorState of openingActorStates) {
        const actorVoice = voiceByCharacter.get(actorState.character);
        const actorVoiceAudio = voiceAudioByCharacter.get(actorState.character);
        if (actorState.hasDialogue && !actorVoice) {
          errors.push(`${label}: speaking character ${actorState.character} is missing ${actorState.character}的音色是：……。`);
        }
        if (actorState.hasDialogue && !actorVoiceAudio) {
          errors.push(`${label}: speaking character ${actorState.character} is missing ${actorState.character}的音色音频文件参考引用：未配置。｜`);
        }
        if (!actorState.hasDialogue && actorVoice) {
          errors.push(`${label}: character ${actorState.character} has no concrete dialogue in this block and must omit its voice line`);
        }
        if (!actorState.hasDialogue && actorVoiceAudio) {
          errors.push(`${label}: character ${actorState.character} has no concrete dialogue in this block and must omit its voice-audio reference line`);
        }
      }
      for (const actorVoice of openingActorVoices) {
        if (!seenCharacters.has(actorVoice.character)) {
          errors.push(`${label}: character voice line for ${actorVoice.character} has no matching opening actor emotion state`);
        }
      }
      for (const actorVoiceAudio of openingActorVoiceAudios) {
        if (!seenCharacters.has(actorVoiceAudio.character)) {
          errors.push(`${label}: character voice-audio reference for ${actorVoiceAudio.character} has no matching opening actor emotion state`);
        }
      }
    }
  }

  const actorStateOccurrences = prompt.matchAll(/^｜.*（.*）\s+(?:情绪|说话态度)：.*→.*→.*。｜?$/gmu);
  for (const occurrence of actorStateOccurrences) {
    const lineStart = occurrence.index;
    if (!(lineStart > generationStart && lineStart < globalStart)) {
      errors.push(`${label}: actor emotion-state or offscreen speaking-attitude line appears outside the opening block`);
    }
  }
  const actorVoiceOccurrences = prompt.matchAll(/^.*的音色是：.*$/gmu);
  for (const occurrence of actorVoiceOccurrences) {
    const lineStart = occurrence.index;
    if (!(lineStart > generationStart && lineStart < globalStart)) {
      errors.push(`${label}: character voice line appears outside the opening block`);
    }
  }
  const actorVoiceAudioOccurrences = prompt.matchAll(/^.*的音色音频文件参考引用：.*$/gmu);
  for (const occurrence of actorVoiceAudioOccurrences) {
    const lineStart = occurrence.index;
    if (!(lineStart > generationStart && lineStart < globalStart)) {
      errors.push(`${label}: character voice-audio reference line appears outside the opening block`);
    }
  }

  if (globalStart >= 0 && globalEnd > globalStart) {
    const globalText = prompt.slice(globalStart, globalEnd);
    parsedGlobal = globalText.slice("global：".length).trim();
    if (!parsedGlobal) errors.push(`${label}: global cannot be empty`);
    if (parsedGlobal) parsedAspect = detectOutputAspect(parsedGlobal, label);
    const knownEntityNames = new Set([
      ...openingActorStates.map((state) => state.character),
      ...Object.keys(sceneState?.initial_state?.characters ?? {}),
      ...Object.keys(sceneState?.initial_state?.crowd_entities ?? {})
    ]);
    for (const diagnostic of globalScopeDiagnostics(parsedGlobal ?? "", knownEntityNames)) {
      errors.push(`${label}: ${diagnostic}`);
    }
    const requiredStyleCount = globalText.split(requiredGlobalVisualStyle).length - 1;
    if (requiredStyleCount !== 1) {
      errors.push(`${label}: global must contain the exact required visual-style sentence once`);
    }
    const requiredFilterCount = globalText.split(requiredGlobalFilter).length - 1;
    if (requiredFilterCount !== 1) {
      errors.push(`${label}: global must contain Schneider Hollywood Black Magic 1/8 exactly once`);
    }
    const requiredCameraPreferenceCount = globalText.split(requiredGlobalCameraPreference).length - 1;
    if (requiredCameraPreferenceCount !== 1) {
      errors.push(`${label}: global must contain the exact fixed camera-preference sentence once`);
    }
    const requiredEnvironmentContinuityCount = globalText.split(requiredGlobalEnvironmentContinuity).length - 1;
    if (requiredEnvironmentContinuityCount !== 1) {
      errors.push(`${label}: global must contain the exact environment-continuity sentence once`);
    }
    if (!globalText.includes("无字幕")) {
      errors.push(`${label}: global must contain the default lock 无字幕`);
    }
    if (!globalText.includes("无音乐") && !explicitSceneMusicPattern.test(globalText)) {
      errors.push(`${label}: global must contain the default lock 无音乐 or an explicit scene-level music direction`);
    }
    if (!globalText.includes("导演风格明确对标")) {
      const diagnostic = `${label}: global missing explicit director/work mechanism`;
      if (profile === "production") errors.push(diagnostic);
      else warnings.push(diagnostic);
    }
    for (const actorState of openingActorStates) {
      if (containsCharacterDirection(globalText, actorState.character)) {
        errors.push(`${label}: character-specific direction for ${actorState.character} is not allowed in global; use the chronological picture`);
      }
    }
    if (promptProjectionMode === "dialogue_autocut") {
      if (!autocutControlPattern.test(globalText)) {
        errors.push(`${label}: dialogue_autocut global must contain the exact Seedance camera-delegation control`);
      }
      if (!autocutActionControlPattern.test(globalText)) {
        errors.push(`${label}: dialogue_autocut global must delegate all camera movement, framing changes, cut count, and cut timing to Seedance`);
      }
      if (deprecatedCutRestraintPattern.test(globalText)) {
        errors.push(`${label}: dialogue_autocut global must not reintroduce continuous-shot or cut-threshold restraints`);
      }
      if (!autocutNoWideFallbackPattern.test(globalText)) {
        errors.push(`${label}: dialogue_autocut global must forbid falling back to a complete-space wide shot`);
      }
      const globalWithoutRequiredCameraPreference = globalText.split(requiredGlobalCameraPreference).join("");
      if (autocutPositiveWidePatterns.some((pattern) => pattern.test(globalWithoutRequiredCameraPreference))) {
        errors.push(`${label}: DIALOGUE_AUTOCUT_FORBIDS_POSITIVE_WIDE_FALLBACK; global may forbid a wide fallback but must not request one`);
      }
    }
  }

  const idMatch = prompt.match(/(?:^|\n)生成编号：[ \t]*([^\r\n]+)/u);
  if (!idMatch || !idMatch[1].trim()) errors.push(`${label}: missing generation id value`);
  if (idMatch && !isNormalizedText(idMatch[1])) errors.push(`${label}: generation id must be normalized and nonempty`);
  const promptId = idMatch?.[1]?.trim();
  if (promptId) {
    if (promptIds.has(promptId)) errors.push(`${label}: duplicate generation id ${promptId}`);
    promptIds.add(promptId);
  }
  const autocutProjection = parseDialogueAutocutBody(prompt, label, globalLineEnd);
  const realizationParticipants = [...Object.keys(sceneState?.initial_state?.characters ?? {}), ...Object.keys(sceneState?.initial_state?.crowd_entities ?? {})];
  for (const diagnostic of promptRealizationDiagnostics(prompt, { participants: realizationParticipants })) errors.push(`${label}: ${diagnostic}`);
  if (gazeFramingVerbPattern.test(stripVerbatimDialogue(prompt))) {
    errors.push(`${label}: GAZE_FRAMING_VERB_FORBIDDEN; replace 看着/看向/望向/注视/凝视/对视 wording with 角色名的头部朝向目标`);
  }
  
  if (!stateFile) {
    const visibleCharacterIds = new Set(openingActorStates
      .filter((actorState) => actorState.performanceKind === "情绪")
      .map((actorState) => actorState.character));

  }
  const actionSubjectIds = new Set(openingActorStates.map((state) => state.character));
  for (const collection of ["characters", "crowd_entities", "creatures", "entities", "equipment", "mecha", "props", "robots", "vehicles"]) {
    for (const id of Object.keys(sceneState?.initial_state?.[collection] ?? {})) actionSubjectIds.add(id);
  }
  for (const diagnostic of criticalActionCausalityDiagnostics(autocutProjection.body, [...actionSubjectIds])) {
    errors.push(`${label}: ${diagnostic.code}; ${diagnostic.detail}`);
  }
  const doorwayDiagnostic = doorwayAutocutDiagnostic(autocutProjection.body);
  if (doorwayDiagnostic) errors.push(`${label}: ${doorwayDiagnostic}`);
  parsedPrompts.push({
    label,
    id: promptId,
    raw: prompt,
    actorStates: openingActorStates,
    actorVoices: openingActorVoices,
    actorVoiceAudios: openingActorVoiceAudios,
    dialogueSpeakers: [...dialogueSpeakers],
    global: parsedGlobal,
    specialRules: autocutProjection.specialRules,
    aspect: parsedAspect,
    projectionMode: promptProjectionMode,
    autocutBody: autocutProjection.body,
    startSpatialMotion: autocutProjection.startSpatialMotion,
    endSpatialMotion: autocutProjection.endSpatialMotion
  });

  for (const term of forbidden) {
    if (prompt.includes(term)) errors.push(`${label}: contains forbidden phrase ${term}`);
  }
  if (abstractPerformanceDirectionPatterns.some((pattern) => pattern.test(prompt))) {
    errors.push(`${label}: contains abstract performance-direction wording; use a spatially neutral performance label and a concrete scene target`);
  }
  const promptWithoutVoiceAudioReferenceLines = prompt
    .split(/\r?\n/u)
    .filter((line) => !actorVoiceAudioPattern.test(line.trim()))
    .join("\n");
  if (
    assetTerms.some((pattern) => pattern.test(promptWithoutVoiceAudioReferenceLines)) ||
    localAbsolutePathPattern.test(promptWithoutVoiceAudioReferenceLines)
  ) {
    errors.push(`${label}: contains asset-reference explanation inside prompt`);
  }

  const matchingStateClip = Array.isArray(sceneState?.clips)
    ? sceneState.clips.find((clip) => clip?.id === promptId)
    : undefined;

  for (const diagnostic of boundaryTextDiagnostics(prompt)) {
    errors.push(`${label}: ${diagnostic}`);
  }
  if (clothingTerms.some((pattern) => pattern.test(prompt.replace(/“[^”]*”/gu, "")))) {
    errors.push(`${label}: contains clothing description`);
  }
  validateDialogueAttribution(prompt, label);
  
  validateLiveActionSafetyExecutionLanguage(prompt, label);
  if (!allowTimestamps && timestampPattern.test(prompt)) errors.push(`${label}: contains timestamp without --allow-timestamps`);

  const punctuation = punctuationViolations(autocutProjection.body);
  if (punctuation.length) {
    const diagnostic = `${label}: ${punctuation.length} Chinese punctuation mark(s) not followed by a blank line`;
    if (profile === "production") errors.push(diagnostic);
    else warnings.push(diagnostic);
  }
}

const sceneGlobal = parsedPrompts.find((parsed) => parsed.global)?.global;
for (const parsed of parsedPrompts) {
  if (sceneGlobal && parsed.global && parsed.global !== sceneGlobal) {
    errors.push(`${parsed.id ?? parsed.label}: every prompt block in one scene delivery must reuse the same frozen global`);
  }
}

for (let index = 1; index < parsedPrompts.length; index += 1) {
  const previous = parsedPrompts[index - 1];
  const current = parsedPrompts[index];
  const previousByCharacter = new Map(previous.actorStates.map((state) => [state.character, state]));
  for (const currentState of current.actorStates) {
    const previousState = previousByCharacter.get(currentState.character);
    if (previousState && previousState.emotionEnd !== currentState.emotionStart) {
      errors.push(`${current.id ?? current.label}: ${currentState.character} initial emotion must exactly equal the preceding block ending emotion`);
    }
  }
}

if (stateFile) {
  const stateClips = Array.isArray(sceneState?.clips) ? sceneState.clips : [];
  const validStateClips = stateClips.filter(isObject);
  const stateById = new Map(validStateClips.map((clip) => [clip.id, clip]));
  const deliveredIds = new Set();

  if (isNormalizedText(sceneState?.scene_global_master)) {
    for (const parsed of parsedPrompts) {
      if (parsed.global !== sceneState.scene_global_master) {
        errors.push(`${parsed.id ?? parsed.label}: global does not match state manifest scene_global_master`);
      }
    }
  }

  if (stateClips.length !== parsedPrompts.length) {
    errors.push(`state manifest contains ${stateClips.length} clip(s), but delivery contains ${parsedPrompts.length} prompt block(s)`);
  }

  for (const [promptIndex, parsed] of parsedPrompts.entries()) {
    if (!parsed.id) continue;
    deliveredIds.add(parsed.id);
    const expectedClip = stateClips[promptIndex];
    if (isObject(expectedClip) && parsed.id !== expectedClip.id) {
      errors.push(`${parsed.label}: generation id ${parsed.id} is out of state-manifest order; expected ${expectedClip.id}`);
    }
    const stateClip = stateById.get(parsed.id);
    if (!isObject(stateClip)) {
      errors.push(`${parsed.label}: generation id ${parsed.id} is missing from state manifest`);
      continue;
    }
    const stateClipProjectionMode = stateClip.projection_mode ?? sceneState?.projection_mode ?? "dialogue_autocut";
    if (stateClipProjectionMode !== parsed.projectionMode) {
      errors.push(`${parsed.label}: prompt projection ${parsed.projectionMode} does not match state clip projection_mode ${stateClipProjectionMode}`);
    }
    if (Array.isArray(stateClip.events)) {
      const sourceSpeech = stateClip.events.map(event => event.visible_action ?? "").join("\n");
      errors.push(...speechSequenceDiagnostics(parsed.autocutBody ?? "", sourceSpeech).map(message => `${parsed.label}: ${message}`));
    }
    const expectedSpecialRules = Array.isArray(stateClip.special_rules) ? stateClip.special_rules : [];
    if (JSON.stringify(parsed.specialRules) !== JSON.stringify(expectedSpecialRules)) {
      errors.push(`${parsed.label}: SPECIAL_RULES_DO_NOT_MATCH_COMPILED_BLOCK`);
    }
    const visibleCharacterIds = visibleCharacterIdsAcrossClip(stateClip);

    const audioOnlySpeakers = Array.isArray(stateClip.audio_only_speakers) ? stateClip.audio_only_speakers : [];
    for (const characterId of audioOnlySpeakers) {
      const exactRule = audioOnlySpeakerRule(characterId);
      const ruleCount = parsed.specialRules.filter((rule) => rule === exactRule).length;
      if (ruleCount !== 1) {
        errors.push(`${parsed.label}: AUDIO_ONLY_SPEAKER_RULE_REQUIRED_EXACTLY_ONCE ${characterId}`);
      }
      if (parsed.startSpatialMotion.includes(characterId) || parsed.endSpatialMotion.includes(characterId)) {
        errors.push(`${parsed.label}: AUDIO_ONLY_SPEAKER_VISIBLE_STATE_MENTION_FORBIDDEN ${characterId}`);
      }
      if (stripAttributedDialogue(parsed.autocutBody).includes(characterId)) {
        errors.push(`${parsed.label}: AUDIO_ONLY_SPEAKER_VISUAL_PROSE_FORBIDDEN ${characterId}`);
      }
    }
    validateCrowdStateProjection(parsed, stateClip);
    validateHeadOrientationProjection(parsed, stateClip);
    for (const diagnostic of spatialProjectionDiagnostics(prompts[promptIndex], {startState:stateClip.start_state,endState:stateClip.end_state})) errors.push(`${parsed.label}: ${diagnostic}`);

    const sourceCharacterNames = Object.keys(sceneState?.initial_state?.characters ?? stateClip.start_state?.characters ?? {});
    validateSourceContactResults(parsed, stateClip, sourceCharacterNames);
    if (profile === "production" && Array.isArray(stateClip.events)) {
      let eventCursor = 0;
      for (const event of stateClip.events) {
        if (typeof event?.visible_action !== "string") continue;
        const eventIndex = parsed.autocutBody.indexOf(event.visible_action, eventCursor);
        if (eventIndex < 0) {
          errors.push(`${parsed.label}: production chronological body is missing exact visible_action ${event.visible_action}`);
          continue;
        }
        eventCursor = eventIndex + event.visible_action.length;
      }
    }

    const stateCharacters = isObject(stateClip.start_state?.characters) ? stateClip.start_state.characters : {};
    const actorByCharacter = new Map(parsed.actorStates.map((actorState) => [actorState.character, actorState]));
    const voiceByCharacter = new Map(parsed.actorVoices.map((actorVoice) => [actorVoice.character, actorVoice]));
    const voiceAudioByCharacter = new Map(parsed.actorVoiceAudios.map((actorVoiceAudio) => [actorVoiceAudio.character, actorVoiceAudio]));
    const speakingCharacters = new Set(parsed.dialogueSpeakers);
    const visibleCharacters = Object.entries(stateCharacters)
      .filter(([, characterState]) => isObject(characterState) && characterState.visible === true)
      .map(([character]) => character);
    const compiledOffscreenSpeakers = new Set(Object.keys(stateClip.opening_speaker_states ?? {}));
    const promptFormalOffscreenSpeakers = new Set(parsed.dialogueSpeakers
      .filter((character) => isObject(stateCharacters[character]) && stateCharacters[character].visible !== true));

    for (const actorState of parsed.actorStates) {
      const stateCharacter = stateCharacters[actorState.character];
      if (!isObject(stateCharacter)) {
        errors.push(`${parsed.label}: performance state for ${actorState.character} has no matching formal state character`);
        continue;
      }
      if (stateCharacter.visible === true && actorState.performanceKind !== "情绪") {
        errors.push(`${parsed.label}: VISIBLE_CHARACTER_REQUIRES_EMOTION_STATE; ${actorState.character} must use 情绪 instead of 说话态度`);
      }
      if (stateCharacter.visible !== true && actorState.performanceKind !== "说话态度") {
        errors.push(`${parsed.label}: OFFSCREEN_SPEAKER_REQUIRES_SPEAKING_ATTITUDE; ${actorState.character} must use 说话态度 instead of 情绪`);
      }
      if (stateCharacter.visible !== true && !compiledOffscreenSpeakers.has(actorState.character)) {
        errors.push(`${parsed.label}: OFFSCREEN_SPEAKER_STATE_NOT_COMPILED; ${actorState.character} is not an offscreen formal dialogue speaker in this compiled block`);
      }
      const stateEndCharacter = stateClip.end_state?.characters?.[actorState.character];
      const comparisons = [
        [`initial ${actorState.performanceKind}`, actorState.emotionStart, stateCharacter.emotion],
        [`ending ${actorState.performanceKind}`, actorState.emotionEnd, stateEndCharacter?.emotion]
      ];
      for (const [field, actual, expected] of comparisons) {
        if (actual !== expected) errors.push(`${parsed.label}: ${actorState.character} ${field} does not match compiled state`);
      }
    }
    for (const character of visibleCharacters) {
      if (!actorByCharacter.has(character)) errors.push(`${parsed.label}: visible state character ${character} is missing an opening actor emotion-state line`);
      if (speakingCharacters.has(character) && !voiceByCharacter.has(character)) errors.push(`${parsed.label}: speaking visible state character ${character} is missing a character voice line`);
      if (speakingCharacters.has(character) && !voiceAudioByCharacter.has(character)) errors.push(`${parsed.label}: speaking visible state character ${character} is missing a character voice-audio reference line`);
      if (!speakingCharacters.has(character) && voiceByCharacter.has(character)) errors.push(`${parsed.label}: visible state character ${character} has no concrete dialogue and must omit its voice line`);
      if (!speakingCharacters.has(character) && voiceAudioByCharacter.has(character)) errors.push(`${parsed.label}: visible state character ${character} has no concrete dialogue and must omit its voice-audio reference line`);
    }
    for (const character of compiledOffscreenSpeakers) {
      const performanceState = actorByCharacter.get(character);
      if (!performanceState) {
        errors.push(`${parsed.label}: FORMAL_SPEAKER_PERFORMANCE_UNIT_REQUIRED; offscreen formal speaker ${character} is missing a speaking-attitude unit`);
      } else if (performanceState.performanceKind !== "说话态度") {
        errors.push(`${parsed.label}: OFFSCREEN_SPEAKER_REQUIRES_SPEAKING_ATTITUDE; ${character} must use 说话态度 instead of 情绪`);
      }
      if (!speakingCharacters.has(character)) errors.push(`${parsed.label}: compiled offscreen formal speaker ${character} has no attributed dialogue in the prompt`);
      if (!voiceByCharacter.has(character)) errors.push(`${parsed.label}: offscreen formal speaker ${character} is missing a character voice line`);
      if (!voiceAudioByCharacter.has(character)) errors.push(`${parsed.label}: offscreen formal speaker ${character} is missing a character voice-audio reference line`);
    }
    for (const character of promptFormalOffscreenSpeakers) {
      if (!compiledOffscreenSpeakers.has(character)) {
        errors.push(`${parsed.label}: OFFSCREEN_SPEAKER_STATE_NOT_COMPILED; ${character} dialogue is not declared by this compiled block`);
        if (!actorByCharacter.has(character)) {
          errors.push(`${parsed.label}: FORMAL_SPEAKER_PERFORMANCE_UNIT_REQUIRED; offscreen formal speaker ${character} is missing a speaking-attitude unit`);
        }
      }
    }
  }

  for (const clip of validStateClips) {
    if (!deliveredIds.has(clip.id)) errors.push(`state manifest clip ${clip.id} has no delivered prompt block`);
  }

}

for (const warning of warnings) console.error(`WARNING: ${warning}`);

if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  console.error(`FAILED: ${errors.length} error(s)`);
  process.exit(1);
}

console.log(`OK: ${prompts.length} Seedance prompt block(s) validated with ${profile} profile and ${projectionMode} projection${warnings.length ? `; ${warnings.length} warning(s)` : ""}`);
