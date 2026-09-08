#!/usr/bin/env node

import fs from "node:fs";
import { speechRulesFor } from "../scripts/prompt_realization.mjs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const skillDir = fileURLToPath(new URL("../", import.meta.url));
const scripts = {
  prompt: path.join(skillDir, "scripts", "validate_seedance_prompt.mjs"),
  delivery: path.join(skillDir, "scripts", "validate_scene_delivery.mjs"),
  renderer: path.join(skillDir, "scripts", "render_prompt_delivery_html.mjs")
};
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seedance-validation-tests-"));
const projectOutputsDir = tempDir;
fs.mkdirSync(projectOutputsDir, { recursive: true });
const renderAssetDir = fs.mkdtempSync(path.join(projectOutputsDir, ".tmp-render-assets-"));
fs.writeFileSync(path.join(tempDir, "voice.wav"), Buffer.from("UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=", "base64"));
fs.writeFileSync(path.join(tempDir, "voice.mp3"), Buffer.from("ID3-example-test-fixture"));
const failures = [];
let total = 0;

const style = "高端动作概念片，电影级广告级画质，广告级商业调色，画面通透明亮、层次分明，色彩饱和自然不发灰，高光与材质光泽锐利。";
const autocut = "对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。";
const cameraPreference = "镜头偏好手持镜头特写和近景。无任何中景 远景。";
const environmentContinuity = "非切镜情况下环境不跳变。";
const globalMaster = `21:9横屏构图，2470年测试茶室，真实真人摄影，导演风格明确对标老邵氏电影；${autocut}；${cameraPreference}；${environmentContinuity}；无字幕，无音乐，Schneider Hollywood Black Magic 1/8，${style}`;

const luoAudioOnlyRule = "罗小雨本条仅以画外声音参与；不呈现罗小雨本人、罗小雨所在空间、声音来源端画面或任何屏幕中的罗小雨影像。";
const stickyBombMechanismId = "example_whip.sticky_bomb";
const stickyBombRule = "白色复合关节鞭是白色细型机甲脊柱式Y形双头关节鞭。长主鞭尾的最末一节可脱离为黏弹；黏弹依靠甩击初始动量飞出，不会自主追踪，接触普通目标后吸附并爆炸。同一时刻只有一枚末节黏弹外露可用；脱离后，预置在倒数第二节内部的下一枚黏弹约一秒向外生长补位，并重新锁定为新的长主鞭尾末节。";
const actors = [
  "｜步小蛮（表演参考：测试演员甲） 情绪：警觉 → 保持不变 → 警觉。",
  "｜乔昔（表演参考：测试演员乙） 情绪：戒备 → 保持不变 → 戒备。"
];
const voices = [
  "步小蛮的音色是：18岁中音女声，清亮偏软，松弛直接。",
  "乔昔的音色是：19岁中音女声，干净偏冷，安静直接，字句准确。"
];
const voiceAudios = [
  `步小蛮的音色音频文件参考引用：${path.join(tempDir, "voice.wav")}。｜`,
  "乔昔的音色音频文件参考引用：未配置。｜"
];

function character(overrides = {}) {
  return {
    present: true,
    visible: true,
    emotion: "警觉",
    position: "茶桌旁",
    posture: "站立",
    facing: "乔昔",
    hands: "双手空闲",
    contact: null,
    injury: "无",
    knowledge: [],
    ...overrides
  };
}

const baseSpatial = "步小蛮位于茶桌旁，步小蛮站立，步小蛮的头部朝向乔昔，步小蛮双手空闲；乔昔位于维修台旁，乔昔站立，乔昔的头部朝向步小蛮，乔昔双手空闲。";

function prompt(body, options = {}) {
  const id = options.id ?? "TEST-S01-01";
  const actorLines = options.actors ?? actors;
  const dialogueSpeakers = new Set([...body.matchAll(/([\p{Script=Han}A-Za-z0-9·_-]{1,24})（(?:对|朝)[^）]+）说：“/gu)].map((match) => match[1]));
  const hasExplicitVoices = Object.prototype.hasOwnProperty.call(options, "voices");
  const hasExplicitVoiceAudios = Object.prototype.hasOwnProperty.call(options, "voiceAudios");
  const voiceLines = hasExplicitVoices
    ? options.voices
    : actorLines.map((actorLine, index) => {
        const character = actorLine.match(/^｜(.+?)（/u)?.[1];
        return dialogueSpeakers.has(character) ? voices[index] : null;
      });
  const voiceAudioLines = hasExplicitVoiceAudios
    ? options.voiceAudios
    : voiceLines.map((voiceLine, index) => voiceLine ? voiceAudios[index] : null);
  const global = options.global ?? globalMaster;
  const participantNames = actorLines.map(l=>l.match(/^｜(.+?)（/u)?.[1]).filter(Boolean);
  const specialRules = [...(options.speechBoundary === false ? [] : speechRulesFor(body, participantNames)), ...(options.specialRules ?? [])];
  const startSpatialMotion = options.startSpatialMotion ?? baseSpatial;
  const endSpatialMotion = options.endSpatialMotion ?? baseSpatial;
  const characterUnits = actorLines
    .map((actorLine, index) => {
      const hasVoiceSettings = Boolean(voiceLines[index] || voiceAudioLines[index]);
      const normalizedActorLine = hasVoiceSettings
        ? actorLine.replace(/｜$/u, "")
        : (actorLine.endsWith("｜") ? actorLine : `${actorLine}｜`);
      return [normalizedActorLine, voiceLines[index], voiceAudioLines[index]].filter(Boolean).join("\n");
    })
    .join("\n\n");
  const specialRuleSection = specialRules.map((rule) => `特殊规则：${rule}`).join("\n\n");
  return `生成编号：${id}\n\n${characterUnits}\n\nglobal：${global}${specialRuleSection ? `\n\n${specialRuleSection}` : ""}\n\n故事背景状态：${options.storyBackground ?? "茶室内正在进行本条交谈或操作。"}\n\n开始空间运动状态：${startSpatialMotion}\n\n${body.trim()}\n\n结束空间运动状态：${endSpatialMotion}\n`;
}

function plan(profile = "continuity", visibleAction = "步小蛮把水杯推到乔昔面前") {
  return {
    schema_version: "2.1",
    scene_id: "TEST-S01",
    profile,
    projection_mode: "dialogue_autocut",
    scene_global_master: globalMaster,
    source: { path: "/tmp/final-screenplay.md", status: "已确认" },
    creative_locks: {
      dialogue_and_event_order: "preserve",
      performance: [],
      forbidden_inventions: []
    },
    initial_state: {
      scene: { location: "茶室", phase: 0 },
      characters: {
        步小蛮: character(),
        乔昔: character({ emotion: "戒备", position: "维修台旁", facing: "步小蛮" })
      }
    },
    blocks: [{
      id: "TEST-S01-01",
      events: [{
        id: "E01",
        visible_action: visibleAction,
        preconditions: [{ path: "scene.phase", equals: 0 }],
        effects: [{ path: "scene.phase", set: 1 }]
      }]
    }]
  };
}

function offscreenSpeakerPlan() {
  const scenePlan = plan("continuity", "罗小雨（对步小蛮通讯）说：“你先说你在哪儿。”");
  scenePlan.initial_state.characters.罗小雨 = character({
    visible: false,
    emotion: "克制关切",
    position: "白塔另一处画外",
    posture: "不可见",
    facing: "通讯方向",
    hands: "处理白塔任务"
  });
  return scenePlan;
}

function audioOnlySpeakerPlan() {
  const scenePlan = offscreenSpeakerPlan();
  scenePlan.blocks[0].audio_only_speakers = ["罗小雨"];
  return scenePlan;
}

function writeText(name, value) {
  const file = path.join(tempDir, name);
  fs.writeFileSync(file, value);
  return file;
}

function writeJson(name, value) {
  if (value?.schema_version === "2.1" && value.initial_state && value.blocks) {
    value=structuredClone(value);
    for (const block of value.blocks) {
      const people=Object.entries(value.initial_state.characters??{}).filter(([,c])=>c.visible).map(([n])=>n);
      block.special_rules=[...speechRulesFor(block.events.map(e=>e.visible_action).join('\n\n'),people),...(block.special_rules??[])];
    }
  }
  return writeText(name, JSON.stringify(value, null, 2));
}

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

const baseAssetPath = path.join(renderAssetDir, "base.png");
const gunAssetPath = path.join(renderAssetDir, "energy-gun.png");
fs.writeFileSync(baseAssetPath, "test");
fs.writeFileSync(gunAssetPath, "test");

function renderManifest(requiredAssets, assets = [{ id: "BASE", path: baseAssetPath }]) {
  return {
    title: "asset coverage test",
    asset_coverage_contract: "required-assets-v1",
    blocks: [{
      id: "TEST-S01-01",
      duration_status: "时长未校准",
      assets,
      required_assets: requiredAssets,
      prompt: "特殊规则：全程无台词\n\n特殊规则：不生成旁白或画外人声。\n\n测试人物静止站立。"
    }]
  };
}

function check(name, fn) {
  total += 1;
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL: ${name}: ${error.message}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function expectPromptSuccess(text, profile = "quick") {
  const file = writeText(`success-${total}.md`, text);
  const result = run(scripts.prompt, ["--profile", profile, file]);
  expect(result.status === 0, `${result.stdout}${result.stderr}`);
}

function expectPromptFailure(text, diagnostic, profile = "quick") {
  const file = writeText(`failure-${total}.md`, text);
  const result = run(scripts.prompt, ["--profile", profile, file]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected prompt validation failure");
  expect(output.includes(diagnostic), `missing diagnostic ${diagnostic}\n${output}`);
}

const validBody = [
  "步小蛮站在茶桌旁，把水杯推到乔昔面前。",
  "步小蛮（对乔昔）说：“先喝水。”",
  "乔昔接住水杯，杯底落稳在桌面。"
].join("\n\n");

check("exact multi-sentence speech and clothing words remain untouched", () => {
  const body='步小蛮（对乔昔）说：“先停。脱下来试。”';
  const result=run(scripts.delivery,['--profile','production','--scene-plan',writeJson('exact-quote-plan.json',plan('production',body)),writeText('exact-quote.md',prompt(body))]);
  expect(result.status===0,`${result.stdout}${result.stderr}`);
});
check("a verified map-only block needs no invented actor unit",()=>{
 const body='地图中的目标坐标持续移动。';const p=plan('production',body);p.initial_state.characters={};
 const text=prompt(body,{actors:[],voices:[],voiceAudios:[],startSpatialMotion:'地图摊在桌面。',endSpatialMotion:'地图摊在桌面。'});
 const result=run(scripts.delivery,['--profile','production','--scene-plan',writeJson('map-only.json',p),writeText('map-only.md',text)]);
 expect(result.status===0,`${result.stdout}${result.stderr}`);
});
check("empty actor units still fail with visible formal characters",()=>{
 const body='步小蛮停在茶桌旁。';const text=prompt(body,{actors:[],voices:[],voiceAudios:[]});
 const result=run(scripts.delivery,['--profile','production','--scene-plan',writeJson('missing-actors.json',plan('production',body)),writeText('missing-actors.md',text)]);
 expect(result.status!==0,'visible formal character was incorrectly exempted');
});
check("clothing exemption does not remove checks on unquoted action", () => {
  expectPromptFailure(prompt('步小蛮身穿一件上衣。'), "contains clothing description");
});
check("speaking character has voice lines while silent listener omits them", () => {
  expectPromptSuccess(prompt(validBody));
});

check("emotion state line accepts multiple plot-driven middle nodes", () => {
  const expandedActors = [
    "｜步小蛮（表演参考：测试演员甲） 情绪：警觉 → 发现异常而短暂疑惑 → 确认危险后恢复戒备 → 警觉。",
    actors[1]
  ];
  expectPromptSuccess(prompt(validBody, { actors: expandedActors }));
});

check("speaking visible character requires a voice line", () => {
  expectPromptFailure(
    prompt(validBody, { voices: [], voiceAudios: [] }),
    "speaking character 步小蛮 is missing 步小蛮的音色是：……。"
  );
});

check("silent visible character rejects voice settings", () => {
  expectPromptFailure(
    prompt("步小蛮把水杯推到乔昔面前。", { voices, voiceAudios }),
    "character 步小蛮 has no concrete dialogue in this block and must not include a voice line"
  );
});

check("receiver-only visible character stays silent in the opening unit", () => {
  expectPromptSuccess(prompt("步小蛮（对乔昔）说：“先喝水。”"));
});

check("character voice line must use the exact requested sentence form", () => {
  const malformedVoices = [
    "步小蛮的声线是：18岁中音女声，清亮偏软，松弛直接。",
    voices[1]
  ];
  expectPromptFailure(
    prompt(validBody, { voices: malformedVoices }),
    "malformed opening line; expected an actor emotion-state or offscreen speaking-attitude line, character voice line, or character voice-audio reference line"
  );
});

check("character voice lines follow actor opening-line order", () => {
  expectPromptFailure(
    prompt(validBody, { voices: [...voices].reverse() }),
    "character voice lines must match actor opening-line order"
  );
});

check("story background is mandatory and nonempty", () => {
  const text = prompt("步小蛮把水杯推到乔昔面前。");
  expectPromptFailure(text.replace(/^故事背景状态：.*\n\n/mu, ""), "STORY_BACKGROUND_REQUIRED");
  expectPromptFailure(prompt("步小蛮把水杯推到乔昔面前。", { storyBackground: " " }), "STORY_BACKGROUND_REQUIRED");
});

check("story background is unique and precedes start state", () => {
  const text = prompt("步小蛮把水杯推到乔昔面前。");
  const background = text.match(/^故事背景状态：.*$/mu)[0];
  expectPromptFailure(text.replace(background, `${background}\n\n${background}`), "STORY_BACKGROUND_REQUIRED");
  expectPromptFailure(text.replace(`${background}\n\n`, "").replace("结束空间运动状态：", `${background}\n\n结束空间运动状态：`), "STORY_BACKGROUND_ORDER");
  expectPromptFailure(text.replace(background, `${background}\n\n特殊规则：茶室桌面保持干燥。`), "STORY_BACKGROUND_ORDER");
});

check("single-event body needs no artificial timeline connector", () => {
  expectPromptSuccess(prompt("步小蛮把水杯推到乔昔面前。"));
});

check("authored camera movement is rejected", () => {
  expectPromptFailure(prompt("镜头推近步小蛮，她把水杯推到乔昔面前。"), "DIALOGUE_AUTOCUT_FORBIDS_AUTHORED_CAMERA");
});

check("authored close opening is rejected instead of required", () => {
  expectPromptFailure(prompt("画面从步小蛮的近景开始，她把水杯推到乔昔面前。"), "DIALOGUE_AUTOCUT_FORBIDS_AUTHORED_CAMERA");
});

check("camera position field is rejected", () => {
  expectPromptFailure(prompt("机位：茶桌侧前方。\n\n步小蛮把水杯推到乔昔面前。"), "DIALOGUE_AUTOCUT_FORBIDS_CAMERA_POSITION");
});

check("global must delegate necessary camera work with cut restraint", () => {
  const brokenGlobal = globalMaster.replace(autocut, "对白或动作推进时，镜头自然变化");
  expectPromptFailure(prompt(validBody, { global: brokenGlobal }), "dialogue_autocut global must contain the exact Seedance camera-delegation control");
});

check("global requires fixed camera preference once", () => {
  const brokenGlobal = globalMaster.replace(cameraPreference, "");
  expectPromptFailure(
    prompt(validBody, { global: brokenGlobal }),
    "global must contain the exact fixed camera-preference sentence once",
  );
});

check("global requires environment continuity once", () => {
  const brokenGlobal = globalMaster.replace(environmentContinuity, "");
  expectPromptFailure(
    prompt(validBody, { global: brokenGlobal }),
    "global must contain the exact environment-continuity sentence once",
  );
});

check("positive landscape-wide fallback remains forbidden", () => {
  expectPromptFailure(prompt("步小蛮把水杯推到乔昔面前。\n\n随后切到完整茶室全景。"), "DIALOGUE_AUTOCUT_FORBIDS_POSITIVE_WIDE_FALLBACK");
});

check("dialogue requires explicit speaker and receiver", () => {
  const bad = validBody.replace("步小蛮（对乔昔）说：", "步小蛮说：");
  expectPromptFailure(prompt(bad), "DIALOGUE_ATTRIBUTION_REQUIRED");
});

check("one-block extra may speak under a local functional label without a persistent name", () => {
  expectPromptSuccess(prompt("队首的一名白塔疏散员（朝街口居民）说：“沿右侧通道撤离。”"));
});

check("offscreen audio path must resolve to a real file", () => {
  const text = prompt("罗小雨（对步小蛮通讯）说：“你先说你在哪儿。”", {
    actors: [actors[0], actors[1], "｜罗小雨（匿名表演指纹：先确认事实） 说话态度：关切 → 保持不变 → 关切。"],
    voices: [null, null, "罗小雨的音色是：20岁中高音女声，清亮稳实，克制带关切。"],
    voiceAudios: [null, null, `罗小雨的音色音频文件参考引用：${path.join(tempDir, "missing-voice.mp3")}。｜`]
  });
  expectPromptFailure(text, "VOICE_AUDIO_FILE_MISSING");
});

check("offscreen formal speaker requires a speaking-attitude unit", () => {
  const scenePrompt = prompt("罗小雨（对步小蛮通讯）说：“你先说你在哪儿。”");
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("offscreen-speaker-missing-plan.json", offscreenSpeakerPlan()),
    writeText("offscreen-speaker-missing-prompt.md", scenePrompt)
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected missing offscreen speaker unit to fail");
  expect(output.includes("FORMAL_SPEAKER_PERFORMANCE_UNIT_REQUIRED"), output);
});

check("offscreen formal speaker accepts speaking attitude plus voice settings", () => {
  const offscreenActorLines = [
    actors[0],
    actors[1],
    "｜罗小雨（匿名表演指纹：姐姐身份先压住担心再确认事实） 说话态度：克制关切 → 保持不变 → 克制关切。"
  ];
  const scenePrompt = prompt("罗小雨（对步小蛮通讯）说：“你先说你在哪儿。”", {
    actors: offscreenActorLines,
    voices: [null, null, "罗小雨的音色是：20岁中高音女声，清亮稳实，克制带关切。"],
    voiceAudios: [null, null, `罗小雨的音色音频文件参考引用：${path.join(tempDir, "voice.mp3")}。｜`]
  });
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("offscreen-speaker-valid-plan.json", offscreenSpeakerPlan()),
    writeText("offscreen-speaker-valid-prompt.md", scenePrompt)
  ]);
  expect(result.status === 0, `${result.stdout}${result.stderr}`);
});

check("block-wide audio-only speaker requires and accepts the exact no-visual rule", () => {
  const offscreenActorLines = [
    actors[0],
    actors[1],
    "｜罗小雨（匿名表演指纹：姐姐身份先压住担心再确认事实） 说话态度：克制关切 → 保持不变 → 克制关切。"
  ];
  const scenePrompt = prompt("罗小雨（对步小蛮通讯）说：“你先说你在哪儿。”", {
    actors: offscreenActorLines,
    voices: [null, null, "罗小雨的音色是：20岁中高音女声，清亮稳实，克制带关切。"],
    voiceAudios: [null, null, `罗小雨的音色音频文件参考引用：${path.join(tempDir, "voice.mp3")}。｜`],
    specialRules: [luoAudioOnlyRule]
  });
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("audio-only-speaker-valid-plan.json", audioOnlySpeakerPlan()),
    writeText("audio-only-speaker-valid-prompt.md", scenePrompt)
  ]);
  expect(result.status === 0, `${result.stdout}${result.stderr}`);
});

check("block-wide audio-only speaker fails when the derived rule is omitted", () => {
  const offscreenActorLines = [
    actors[0],
    actors[1],
    "｜罗小雨（匿名表演指纹：姐姐身份先压住担心再确认事实） 说话态度：克制关切 → 保持不变 → 克制关切。"
  ];
  const scenePrompt = prompt("罗小雨（对步小蛮通讯）说：“你先说你在哪儿。”", {
    actors: offscreenActorLines,
    voices: [null, null, "罗小雨的音色是：20岁中高音女声，清亮稳实，克制带关切。"],
    voiceAudios: [null, null, `罗小雨的音色音频文件参考引用：${path.join(tempDir, "voice.mp3")}。｜`]
  });
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("audio-only-speaker-missing-rule-plan.json", audioOnlySpeakerPlan()),
    writeText("audio-only-speaker-missing-rule-prompt.md", scenePrompt)
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected missing audio-only rule to fail");
  expect(output.includes("AUDIO_ONLY_SPEAKER_RULE_REQUIRED_EXACTLY_ONCE"), output);
});

check("block-wide audio-only speaker cannot be visualized by extra prompt prose", () => {
  const offscreenActorLines = [
    actors[0],
    actors[1],
    "｜罗小雨（匿名表演指纹：姐姐身份先压住担心再确认事实） 说话态度：克制关切 → 保持不变 → 克制关切。"
  ];
  const scenePrompt = prompt("罗小雨（对步小蛮通讯）说：“你先说你在哪儿。”\n\n随后呈现罗小雨本人站在通讯终端旁。", {
    actors: offscreenActorLines,
    voices: [null, null, "罗小雨的音色是：20岁中高音女声，清亮稳实，克制带关切。"],
    voiceAudios: [null, null, `罗小雨的音色音频文件参考引用：${path.join(tempDir, "voice.mp3")}。｜`],
    specialRules: [luoAudioOnlyRule]
  });
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("audio-only-speaker-visible-prose-plan.json", audioOnlySpeakerPlan()),
    writeText("audio-only-speaker-visible-prose-prompt.md", scenePrompt)
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected audio-only visible prose to fail");
  expect(output.includes("AUDIO_ONLY_SPEAKER_VISUAL_PROSE_FORBIDDEN"), output);
});

check("block-wide audio-only speaker cannot appear in start or end spatial state", () => {
  const offscreenActorLines = [
    actors[0],
    actors[1],
    "｜罗小雨（匿名表演指纹：姐姐身份先压住担心再确认事实） 说话态度：克制关切 → 保持不变 → 克制关切。"
  ];
  const scenePrompt = prompt("罗小雨（对步小蛮通讯）说：“你先说你在哪儿。”", {
    actors: offscreenActorLines,
    voices: [null, null, "罗小雨的音色是：20岁中高音女声，清亮稳实，克制带关切。"],
    voiceAudios: [null, null, `罗小雨的音色音频文件参考引用：${path.join(tempDir, "voice.mp3")}。｜`],
    specialRules: [luoAudioOnlyRule],
    startSpatialMotion: "步小蛮站在茶桌左侧面向乔昔，乔昔站在维修台旁面向步小蛮，罗小雨位于通讯另一端。"
  });
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("audio-only-speaker-spatial-state-plan.json", audioOnlySpeakerPlan()),
    writeText("audio-only-speaker-spatial-state-prompt.md", scenePrompt)
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected audio-only spatial-state mention to fail");
  expect(output.includes("AUDIO_ONLY_SPEAKER_VISIBLE_STATE_MENTION_FORBIDDEN"), output);
});

check("offscreen formal speaker cannot masquerade as a visible emotion unit", () => {
  const offscreenActorLines = [
    actors[0],
    actors[1],
    "｜罗小雨（匿名表演指纹：姐姐身份先压住担心再确认事实） 情绪：克制关切 → 保持不变 → 克制关切。"
  ];
  const scenePrompt = prompt("罗小雨（对步小蛮通讯）说：“你先说你在哪儿。”", {
    actors: offscreenActorLines,
    voices: [null, null, "罗小雨的音色是：20岁中高音女声，清亮稳实，克制带关切。"],
    voiceAudios: [null, null, `罗小雨的音色音频文件参考引用：${path.join(tempDir, "voice.mp3")}。｜`]
  });
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("offscreen-speaker-wrong-kind-plan.json", offscreenSpeakerPlan()),
    writeText("offscreen-speaker-wrong-kind-prompt.md", scenePrompt)
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected offscreen emotion unit to fail");
  expect(output.includes("OFFSCREEN_SPEAKER_REQUIRES_SPEAKING_ATTITUDE"), output);
});

check("entry-door opening and crossing are rejected", () => {
  expectPromptFailure(prompt("步小蛮推开房门，步小蛮从房门外侧进入房门内侧。", {
    actors: ["｜步小蛮（表演参考：测试演员甲） 情绪：警觉 → 保持不变 → 警觉。"],
    startSpatialMotion: "步小蛮站在房门外侧，步小蛮面向房门。",
    endSpatialMotion: "步小蛮站在房门内侧，步小蛮已经停止移动。"
  }), "DOORWAY_CROSSING_REQUIRES_DIRECTOR_REROUTE");
});

check("doorway-edge performance is rejected", () => {
  expectPromptFailure(prompt("步小蛮在房门边停下整理衣袖。"), "DOORWAY_THRESHOLD_ACTION_FORBIDDEN");
});

check("open door remains legal only as an indoor background away from action", () => {
  expectPromptSuccess(prompt("房门已经敞开并保持敞开，步小蛮在室内工作区远离门区的位置拿起水杯。"));
});

check("closed door same-side scene allows an outdoor doorway state", () => {
  expectPromptSuccess(prompt("房门始终保持关闭，所有动作和对白只发生在门的同一侧，步小蛮在室外侧拿起水杯。"));
});

check("closed door same-side scene also allows an indoor doorway state", () => {
  expectPromptSuccess(prompt("房门始终保持关闭，所有动作和对白只发生在门的同一侧，步小蛮在房门内侧整理衣袖。", {
    startSpatialMotion: "房门始终保持关闭，步小蛮站在房门内侧，步小蛮面向房门。",
    endSpatialMotion: "房门始终保持关闭，步小蛮仍停在房门内侧，步小蛮保持站立。"
  }));
});

check("open door background without indoor-away scope is rejected", () => {
  expectPromptFailure(prompt("房门已经敞开并保持敞开，步小蛮拿起水杯。"), "DOORWAY_INTERIOR_BACKGROUND_SCOPE_REQUIRED");
});

check("bare spatial-boundary position is rejected", () => {
  expectPromptFailure(prompt("步小蛮弯腰查看墙角。", {
    actors: ["｜步小蛮（表演参考：测试演员甲） 情绪：警觉 → 保持不变 → 警觉。"],
    startSpatialMotion: "步小蛮站在门口，步小蛮面向通道深处。",
    endSpatialMotion: "步小蛮仍停在门口，步小蛮保持弯腰。"
  }), "BOUNDARY_SIDE_REQUIRED");
});

check("explicit doorway side still requires de-door redesign", () => {
  expectPromptFailure(prompt("步小蛮弯腰查看墙角。", {
    actors: ["｜步小蛮（表演参考：测试演员甲） 情绪：警觉 → 保持不变 → 警觉。"],
    startSpatialMotion: "步小蛮站在房门内侧，步小蛮面向通道深处。",
    endSpatialMotion: "步小蛮仍停在房门内侧，步小蛮保持弯腰。"
  }), "DOORWAY_CHARACTER_STATE_REQUIRES_DEDOOR_REDIRECT");
});

check("source-backed footwear detachment is accepted", () => {
  expectPromptSuccess(prompt("乔昔旋身扫踢，步小蛮的鞋被踢飞。"));
});

check("defensive unchanged footwear wording is rejected", () => {
  expectPromptFailure(prompt("步小蛮落地站稳，步小蛮双脚仍穿鞋。"), "DEFENSIVE_FOOTWEAR_CONTINUITY_FORBIDDEN");
});

check("ambiguous non-dialogue entity pronoun is rejected", () => {
  expectPromptFailure(prompt("步小蛮把水杯推到乔昔面前。她随后后退一步。"), "EXPLICIT_ENTITY_NAME_REQUIRED");
});

check("pronoun inside approved dialogue remains accepted", () => {
  expectPromptSuccess(prompt("步小蛮（对乔昔）说：“她还没有回来。”"));
});

check("ambiguous mechanical unit name is rejected", () => {
  expectPromptFailure(prompt("基础巡检员倒在街口。"), "MECHANICAL_UNIT_NAMING_AMBIGUOUS");
});

check("explicit robot unit name is accepted", () => {
  expectPromptSuccess(prompt("基础巡检机器人倒在街口。"));
});

check("critical non-flexible action rejects an adjacent but unlinked result", () => {
  expectPromptFailure(prompt("步小蛮撞中乔昔，乔昔摔倒。"), "CRITICAL_ACTION_CAUSAL_LINK_REQUIRED");
});

check("critical non-flexible action accepts an explicit caused result", () => {
  expectPromptSuccess(prompt("步小蛮撞中乔昔，乔昔因此摔倒。"));
});

check("head orientation stays concise for an ordinary direction change", () => {
  expectPromptSuccess(prompt("步小蛮拿起水杯，步小蛮的头部朝向乔昔。"));
});

check("gaze wording is rejected as an orientation shortcut", () => {
  expectPromptFailure(prompt("步小蛮拿起水杯，步小蛮看着乔昔的眼睛。"), "GAZE_FRAMING_VERB_FORBIDDEN");
});

check("view-relative wording is rejected inside performance flow", () => {
  const badActors = [
    "｜步小蛮（表演参考：测试演员甲） 情绪：警觉 → 选择正面对抗 → 警觉。",
    actors[1]
  ];
  expectPromptFailure(prompt(validBody, { actors: badActors }), "PERFORMANCE_VIEWPOINT_TERM_FORBIDDEN");
});

check("真人 safety engineering is rejected", () => {
  expectPromptFailure(prompt("乔昔的肘尖采用错位完成撞中步小蛮肋下。"), "LIVE_ACTION_SAFETY_EXECUTION_LANGUAGE_FORBIDDEN");
});

check("continuity delivery no longer forces every visible character into body", () => {
  const scenePlan = plan("continuity");
  const scenePrompt = prompt("步小蛮把水杯推到乔昔面前。");
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("continuity-plan.json", scenePlan),
    writeText("continuity-prompt.md", scenePrompt)
  ]);
  expect(result.status === 0, `${result.stdout}${result.stderr}`);
});

check("state-backed delivery requires compiled head orientation in both handoffs", () => {
  const scenePlan = plan("continuity");
  const scenePrompt = prompt("步小蛮把水杯推到乔昔面前。", {
    startSpatialMotion: "步小蛮站在茶桌左侧，乔昔站在维修台旁。",
    endSpatialMotion: "步小蛮仍站在茶桌左侧，乔昔仍站在维修台旁。"
  });
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("missing-head-orientation-plan.json", scenePlan),
    writeText("missing-head-orientation-prompt.md", scenePrompt)
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected missing head orientation to fail");
  expect(output.includes("HEAD_ORIENTATION_NOT_PROJECTED"), output);
});

check("conditional crowd state projects without actor or voice units", () => {
  const crowdId = "M-01线缆隔离队员";
  const crowdState = "M-01线缆隔离队员已经通过扫描架，推着损坏的巡检机器人沿内部通行主路转向街面。";
  const scenePlan = plan("continuity", "M-01线缆隔离队员继续沿内部通行主路移动");
  scenePlan.initial_state.crowd_entities = {
    [crowdId]: {
      kind: "tracked_extra",
      present: true,
      visible: true,
      continuity_state: crowdState
    }
  };
  scenePlan.blocks[0].events[0].crowd_state_unchanged = [crowdId];
  const scenePrompt = prompt("M-01线缆隔离队员继续沿内部通行主路移动。", {
    startSpatialMotion: `${baseSpatial}${crowdState}`,
    endSpatialMotion: `${baseSpatial}${crowdState}`
  });
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("crowd-projection-plan.json", scenePlan),
    writeText("crowd-projection-prompt.md", scenePrompt)
  ]);
  expect(result.status === 0, `${result.stdout}${result.stderr}`);
});

check("conditional crowd state cannot disappear from a required opening projection", () => {
  const crowdId = "M-01线缆隔离队员";
  const crowdState = "M-01线缆隔离队员已经通过扫描架，推着损坏的巡检机器人沿内部通行主路转向街面。";
  const scenePlan = plan("continuity", "M-01线缆隔离队员继续沿内部通行主路移动");
  scenePlan.initial_state.crowd_entities = {
    [crowdId]: {
      kind: "tracked_extra",
      present: true,
      visible: true,
      continuity_state: crowdState
    }
  };
  scenePlan.blocks[0].events[0].crowd_state_unchanged = [crowdId];
  const scenePrompt = prompt("M-01线缆隔离队员继续沿内部通行主路移动。", {
    endSpatialMotion: `步小蛮仍站在茶桌左侧，乔昔仍站在维修台旁。${crowdState}`
  });
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("crowd-projection-missing-plan.json", scenePlan),
    writeText("crowd-projection-missing-prompt.md", scenePrompt)
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected missing crowd projection to fail");
  expect(output.includes("CROWD_START_STATE_NOT_PROJECTED"), output);
});

check("camera-free production delivery validates exact event chronology", () => {
  const visibleAction = "步小蛮把水杯推到乔昔面前";
  const scenePlan = plan("production", visibleAction);
  const scenePrompt = prompt(`${visibleAction}。\n\n乔昔接住水杯。`);
  const result = run(scripts.delivery, [
    "--profile", "production",
    "--scene-plan", writeJson("production-plan.json", scenePlan),
    writeText("production-prompt.md", scenePrompt)
  ]);
  expect(result.status === 0, `${result.stdout}${result.stderr}`);
});

for (const profileName of ["continuity", "production"]) {
  const originalSpeech='步小蛮（对乔昔）说：“确认位置。”';
  for (const [caseName, body, shouldPass] of [
    ['exact dialogue',originalSpeech,true],
    ['paraphrased dialogue','步小蛮（对乔昔）说：“重新确认位置。”',false],
    ['extra dialogue',originalSpeech+'步小蛮（对乔昔）说：“立即行动。”',false],
    ['omitted dialogue','步小蛮保持原处。',false]
  ]) check(`${profileName} source speech ${caseName}`,()=>{
    const result=run(scripts.delivery,['--profile',profileName,'--scene-plan',writeJson(`speech-${profileName}-${caseName}.json`,plan(profileName,originalSpeech)),writeText(`speech-${profileName}-${caseName}.md`,prompt(body))]);
    const output=`${result.stdout}${result.stderr}`;
    expect(shouldPass ? result.status===0 : result.status!==0,output);
    if(!shouldPass) expect(output.includes('SOURCE_SPEECH_MISMATCH'),output);
  });
}

check("production contact result cannot be weakened to an attempt", () => {
  const visibleAction = "乔昔的肘尖擦着步小蛮肋下转过，步小蛮侧身失去平衡";
  const scenePlan = plan("production", visibleAction);
  const weakened = prompt("乔昔的肘尖逼近步小蛮肋下，步小蛮侧身避开。");
  const result = run(scripts.delivery, [
    "--profile", "production",
    "--scene-plan", writeJson("contact-plan.json", scenePlan),
    writeText("contact-weakened.md", weakened)
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected weakened contact to fail");
  expect(/SOURCE_CONTACT_RESULT_(?:WEAKENED|MISSING)/u.test(output), output);
});

check("object-specific constraints in global are rejected", () => {
  const pollutedGlobal = `${globalMaster}所有巡检机器人均为纯机械单位，机器人不得生成人类面孔。`;
  expectPromptFailure(prompt(validBody, { global: pollutedGlobal }), "ENTITY_RULE_IN_GLOBAL");
});

check("a block-local special rule is accepted", () => {
  expectPromptSuccess(prompt(validBody, {
    specialRules: ["损坏巡检机器人是纯机械单位，不生成人类面孔、皮肤或工作人员制服。"]
  }));
});

check("prompt special rules must match the current compiled block", () => {
  const rule = "损坏巡检机器人是纯机械单位，不生成人类面孔、皮肤或工作人员制服。";
  const scenePlan = plan("continuity");
  const scenePrompt = prompt("步小蛮把水杯推到乔昔面前。", { specialRules: [rule] });
  const result = run(scripts.delivery, [
    "--profile", "continuity",
    "--scene-plan", writeJson("special-rule-mismatch-plan.json", scenePlan),
    writeText("special-rule-mismatch-prompt.md", scenePrompt)
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected undeclared prompt special rule to fail");
  expect(output.includes("SPECIAL_RULES_DO_NOT_MATCH_COMPILED_BLOCK"), output);
});

check("a compiled mechanism rule is mandatory only for its tagged block", () => {
  const visibleAction = "星落甩动白色复合关节鞭，长主鞭尾最末一节依靠甩击初始动量脱离并飞出，末节接触重型巡检机器人腰侧后吸附，黏弹在重型巡检机器人退回队列后爆炸，预置在倒数第二节内部的下一枚黏弹约一秒向外生长补位，补位完成使得下一枚黏弹重新锁定为新的长主鞭尾末节";
  const scenePlan = plan("production", visibleAction);
  scenePlan.blocks[0].events[0].mechanism_id = stickyBombMechanismId;
  scenePlan.blocks[0].mechanism_requirements = [{
    id: stickyBombMechanismId,
    source_refs: ["20_设定/星落白色复合关节双头重鞭.md#黏弹补位"],
    rule: stickyBombRule,
    persistent_state_paths: []
  }];
  const scenePrompt = prompt(`${visibleAction}。`);
  const result = run(scripts.delivery, [
    "--profile", "production",
    "--scene-plan", writeJson("mechanism-rule-missing-plan.json", scenePlan),
    writeText("mechanism-rule-missing-prompt.md", scenePrompt)
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected missing mechanism rule to fail");
  expect(output.includes("SPECIAL_RULES_DO_NOT_MATCH_COMPILED_BLOCK"), output);
});

check("a tagged mechanism rule passes when projected exactly once", () => {
  const visibleAction = "星落甩动白色复合关节鞭，长主鞭尾最末一节依靠甩击初始动量脱离并飞出，末节接触重型巡检机器人腰侧后吸附，黏弹在重型巡检机器人退回队列后爆炸，预置在倒数第二节内部的下一枚黏弹约一秒向外生长补位，补位完成使得下一枚黏弹重新锁定为新的长主鞭尾末节";
  const scenePlan = plan("production", visibleAction);
  scenePlan.blocks[0].events[0].mechanism_id = stickyBombMechanismId;
  scenePlan.blocks[0].mechanism_requirements = [{
    id: stickyBombMechanismId,
    source_refs: ["20_设定/星落白色复合关节双头重鞭.md#黏弹补位"],
    rule: stickyBombRule,
    persistent_state_paths: []
  }];
  const scenePrompt = prompt(`${visibleAction}。`, { specialRules: [stickyBombRule] });
  const result = run(scripts.delivery, [
    "--profile", "production",
    "--scene-plan", writeJson("mechanism-rule-exact-plan.json", scenePlan),
    writeText("mechanism-rule-exact-prompt.md", scenePrompt)
  ]);
  expect(result.status === 0, `${result.stdout}${result.stderr}`);
});

check("boundary synonym 房门附近 requires de-door redesign", () => {
  expectPromptFailure(
    prompt(validBody, { startSpatialMotion: "步小蛮站在房门附近，乔昔站在维修台旁。" }),
    "DOORWAY_CHARACTER_STATE_REQUIRES_DEDOOR_REDIRECT"
  );
});

check("门洞中央 requires an explicit center-of-mass side", () => {
  expectPromptFailure(
    prompt(validBody, { startSpatialMotion: "步小蛮跨在房门门洞中央，乔昔站在维修台旁。" }),
    "BOUNDARY_CENTER_OF_MASS_SIDE_REQUIRED"
  );
});

check("boundary stationary position with a space-owning side still fails doorway policy", () => {
  expectPromptFailure(prompt(validBody, {
    startSpatialMotion: "步小蛮位于房门附近的走廊侧，乔昔站在维修台旁。"
  }), "DOORWAY_CHARACTER_STATE_REQUIRES_DEDOOR_REDIRECT");
});

check("boundary crossing requires starting and ending sides", () => {
  const body = `${validBody}\n\n步小蛮推开房门走进茶室。`;
  expectPromptFailure(prompt(body), "DOORWAY_CROSSING_REQUIRES_DIRECTOR_REROUTE");
});

check("verbatim dialogue is exempt from boundary-side validation", () => {
  expectPromptSuccess(prompt(validBody.replace("先喝水。", "门洞中央等我。")));
});

check("delivery renderer fails when a compiled visible asset is missing", () => {
  const requiredAssets = [{ id: "ENERGY-GUN", path: gunAssetPath }];
  const result = run(scripts.renderer, [
    writeJson("render-missing-asset.json", renderManifest(requiredAssets)),
    "--output", path.join(tempDir, "render-missing-asset.html")
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected renderer failure");
  expect(output.includes("VISIBLE_ASSET_COVERAGE_MISSING"), output);
});

check("delivery renderer accepts the exact compiled visible asset", () => {
  const requiredAssets = [{ id: "ENERGY-GUN", path: gunAssetPath }];
  const result = run(scripts.renderer, [
    writeJson("render-covered-asset.json", renderManifest(requiredAssets, [
      { id: "BASE", path: baseAssetPath },
      { id: "ENERGY-GUN", path: gunAssetPath }
    ])),
    "--output", path.join(tempDir, "render-covered-asset.html")
  ]);
  expect(result.status === 0, `${result.stdout}${result.stderr}`);
});

check("delivery renderer does not add an unrelated asset when none is required", () => {
  const result = run(scripts.renderer, [
    writeJson("render-no-required-asset.json", renderManifest([])),
    "--output", path.join(tempDir, "render-no-required-asset.html")
  ]);
  expect(result.status === 0, `${result.stdout}${result.stderr}`);
});

check("compiled asset coverage contract requires required_assets on every block", () => {
  const manifest = renderManifest([]);
  delete manifest.blocks[0].required_assets;
  const result = run(scripts.renderer, [
    writeJson("render-missing-required-assets-field.json", manifest),
    "--output", path.join(tempDir, "render-missing-required-assets-field.html")
  ]);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected renderer failure");
  expect(output.includes("required_assets must be supplied"), output);
});

fs.rmSync(tempDir, { recursive: true, force: true });
fs.rmSync(renderAssetDir, { recursive: true, force: true });

if (failures.length) {
  console.error(`\nFAILED: ${failures.length}/${total} test(s)`);
  process.exit(1);
}

console.log(`\nOK: ${total} camera-free delivery test(s) passed`);
