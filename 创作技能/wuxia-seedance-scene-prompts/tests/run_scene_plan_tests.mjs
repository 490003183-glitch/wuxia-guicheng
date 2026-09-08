#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const skillDir = fileURLToPath(new URL("../", import.meta.url));
const compiler = path.join(skillDir, "scripts", "compile_scene_plan.mjs");
const stateValidator = path.join(skillDir, "scripts", "validate_scene_state.mjs");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seedance-plan-tests-"));
const failures = [];
let total = 0;

const globalMaster = "21:9横屏构图，2470年测试场景，导演风格明确对标老邵氏电影；镜头偏好手持镜头特写和近景。无任何中景 远景。对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。非切镜情况下环境不跳变。无字幕，无音乐，Schneider Hollywood Black Magic 1/8，高端动作概念片，电影级广告级画质，广告级商业调色，画面通透明亮、层次分明，色彩饱和自然不发灰，高光与材质光泽锐利。";

const luoAudioOnlyRule = "罗小雨本条仅以画外声音参与；不呈现罗小雨本人、罗小雨所在空间、声音来源端画面或任何屏幕中的罗小雨影像。";
const stickyBombMechanismId = "example_whip.sticky_bomb";
const stickyBombRule = "白色复合关节鞭是白色细型机甲脊柱式Y形双头关节鞭。长主鞭尾的最末一节可脱离为黏弹；黏弹依靠甩击初始动量飞出，不会自主追踪，接触普通目标后吸附并爆炸。同一时刻只有一枚末节黏弹外露可用；脱离后，预置在倒数第二节内部的下一枚黏弹约一秒向外生长补位，并重新锁定为新的长主鞭尾末节。";
const gunAssetRule = {
  asset_id: "WXGC-PRP-TEST-ENERGY-GUN",
  path: "/tmp/example/能量枪模块.png",
  trigger_terms: ["能量枪模块"]
};

function clone(value) {
  return structuredClone(value);
}

function character(overrides = {}) {
  return {
    present: true,
    visible: true,
    emotion: "警觉",
    position: "茶桌旁",
    posture: "站立",
    facing: "乔昔",
    hands: "双手空闲",
    contact: "无",
    injury: "无",
    knowledge: [],
    ...overrides
  };
}

function basePlan(profile = "production") {
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
    blocks: [
      {
        id: "TEST-S01-01",
        events: [
          {
            id: "E01",
            visible_action: "步小蛮把水杯推到乔昔面前",
            preconditions: [{ path: "scene.phase", equals: 0 }],
            effects: [
              { path: "scene.phase", set: 1 },
              { path: "characters.步小蛮.hands", set: "右手扶着水杯" },
              { path: "characters.步小蛮.contact", set: "右手接触水杯" }
            ]
          }
        ]
      },
      {
        id: "TEST-S01-02",
        target_duration_s: 8,
        events: [
          {
            id: "E02",
            visible_action: "乔昔接住水杯，杯底落稳在桌面",
            preconditions: [{ path: "scene.phase", equals: 1 }],
            effects: [
              { path: "scene.phase", set: 2 },
              { path: "characters.乔昔.hands", set: "双手扶着水杯" },
              { path: "characters.乔昔.contact", set: "双手接触水杯" }
            ]
          }
        ]
      }
    ]
  };
}

function offscreenSpeakerPlan(profile = "continuity") {
  const plan = basePlan(profile);
  plan.initial_state.characters.罗小雨 = character({
    visible: false,
    emotion: "克制关切",
    position: "白塔另一处画外",
    posture: "不可见",
    facing: "通讯方向",
    hands: "处理白塔任务"
  });
  plan.blocks = [{
    id: "TEST-S01-01",
    events: [{
      id: "E01",
      visible_action: "罗小雨（对步小蛮通讯）说：“你先说你在哪儿。”",
      effects: []
    }]
  }];
  return plan;
}

function audioOnlySpeakerPlan(profile = "continuity") {
  const plan = offscreenSpeakerPlan(profile);
  plan.blocks[0].audio_only_speakers = ["罗小雨"];
  return plan;
}

function stickyBombMechanismPlan({ persistent = false } = {}) {
  const plan = basePlan("production");
  plan.initial_state.equipment = {
    星落白色复合关节鞭: {
      长主鞭尾末节: "黏弹待命",
      膨大短分支: "完整"
    }
  };
  plan.blocks[0].mechanism_requirements = [{
    id: stickyBombMechanismId,
    source_refs: ["20_设定/星落白色复合关节双头重鞭.md#黏弹补位"],
    rule: stickyBombRule,
    persistent_state_paths: persistent ? ["equipment.星落白色复合关节鞭.长主鞭尾末节"] : []
  }];
  plan.blocks[0].events[0] = {
    id: "E01",
    mechanism_id: stickyBombMechanismId,
    visible_action: "星落甩动白色复合关节鞭，长主鞭尾最末一节依靠甩击初始动量脱离并飞出，末节接触重型巡检机器人腰侧后吸附，黏弹在重型巡检机器人退回队列后爆炸，预置在倒数第二节内部的下一枚黏弹约一秒向外生长补位，补位完成使得下一枚黏弹重新锁定为新的长主鞭尾末节",
    preconditions: [{ path: "scene.phase", equals: 0 }],
    effects: [
      { path: "scene.phase", set: 1 },
      ...(persistent ? [{ path: "equipment.星落白色复合关节鞭.长主鞭尾末节", set: "已消耗，补位尚未完成" }] : [])
    ]
  };
  return plan;
}

function crowdContinuityPlan() {
  const plan = basePlan("continuity");
  const crowdId = "M-01线缆隔离队员";
  const initialCrowdState = "M-01线缆隔离队员位于扫描架前方检查区，推着损坏的巡检机器人向扫描架移动。";
  const continuedCrowdState = "M-01线缆隔离队员已经通过扫描架，推着损坏的巡检机器人沿内部通行主路转向街面。";
  plan.initial_state.crowd_entities = {
    [crowdId]: {
      kind: "tracked_extra",
      present: true,
      visible: true,
      continuity_state: initialCrowdState
    }
  };
  plan.blocks = [
    {
      id: "TEST-S01-01",
      events: [{
        id: "E01",
        visible_action: "M-01线缆隔离队员推着损坏的巡检机器人通过扫描架，到达内部通行主路并转向街面",
        effects: [{
          path: `crowd_entities.${crowdId}.continuity_state`,
          set: continuedCrowdState
        }]
      }]
    },
    {
      id: "TEST-S01-02",
      events: [{
        id: "E02",
        visible_action: "M-01线缆隔离队员继续沿内部通行主路移动",
        crowd_state_unchanged: [crowdId],
        effects: []
      }]
    }
  ];
  return { plan, crowdId, initialCrowdState, continuedCrowdState };
}

function writeJson(name, value) {
  const file = path.join(tempDir, name);
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
  return file;
}

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

function compile(plan, name = "plan") {
  const file = writeJson(`${name}.json`, plan);
  const result = run(compiler, [file]);
  return {
    result,
    json: result.status === 0 ? JSON.parse(result.stdout) : undefined
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

function expectCompileFailure(plan, diagnostic) {
  const { result } = compile(plan, `failure-${total}`);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  expect(result.status !== 0, "expected compiler failure");
  expect(output.includes(diagnostic), `missing diagnostic ${diagnostic}\n${output}`);
}

check("camera-free production plan compiles and inherits state", () => {
  const { result, json } = compile(basePlan());
  expect(result.status === 0, result.stderr);
  expect(JSON.stringify(json.blocks[1].start_state) === JSON.stringify(json.blocks[0].end_state), "later start_state did not inherit prior end_state");
  expect(json.blocks[1].opening_actor_states.步小蛮.emotion === "警觉", "opening actor emotion was not derived");
});

check("explicit director action identity lock compiles without creating a platform rule", () => {
  const plan = basePlan();
  plan.source_action_locks = [{
    id: "SH06.wenya-kick",
    source_ref: "accepted-director.md#SH06-01",
    required_terms: ["步小蛮", "水杯", "乔昔"]
  }];
  plan.blocks[0].events[0].source_action_lock_ids = ["SH06.wenya-kick"];
  const { result, json } = compile(plan, "source-action-lock-positive");
  expect(result.status === 0, result.stderr);
  expect(json.source_action_locks[0].id === "SH06.wenya-kick", "source action lock was not retained");
  expect(!json.blocks[0].special_rules.some((rule) => rule.includes("SH06.wenya-kick")), "source action lock leaked into platform special rules");
  const compiledFile = writeJson("source-action-lock-compiled.json", json);
  const validated = run(stateValidator, [compiledFile]);
  expect(validated.status === 0, `${validated.stdout}${validated.stderr}`);
});

check("explicit director action identity lock cannot be left unmapped", () => {
  const plan = basePlan();
  plan.source_action_locks = [{
    id: "SH06.wenya-kick",
    source_ref: "accepted-director.md#SH06-01",
    required_terms: ["步小蛮", "水杯", "乔昔"]
  }];
  expectCompileFailure(plan, "SOURCE_ACTION_LOCK_UNMAPPED");
});

check("explicit director action method cannot be replaced by an equivalent action", () => {
  const plan = basePlan();
  plan.source_action_locks = [{
    id: "SH06.wenya-kick",
    source_ref: "accepted-director.md#SH06-01",
    required_terms: ["步小蛮", "回旋踢", "乔昔"]
  }];
  plan.blocks[0].events[0].source_action_lock_ids = ["SH06.wenya-kick"];
  expectCompileFailure(plan, "SOURCE_ACTION_LOCK_TERM_MISSING 回旋踢");
});

check("event cannot reference an unknown source action lock", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].source_action_lock_ids = ["SH06.unknown"];
  expectCompileFailure(plan, "SOURCE_ACTION_LOCK_UNKNOWN SH06.unknown");
});

check("compiler separates an offscreen formal speaker from visible actor state", () => {
  const { result, json } = compile(offscreenSpeakerPlan(), "offscreen-formal-speaker");
  expect(result.status === 0, result.stderr);
  expect(!Object.prototype.hasOwnProperty.call(json.blocks[0].opening_actor_states, "罗小雨"), "offscreen speaker leaked into visible actor state");
  expect(json.blocks[0].opening_speaker_states.罗小雨.speaking_attitude === "克制关切", "offscreen speaking attitude was not derived");
  expect(!json.blocks[0].special_rules.includes(luoAudioOnlyRule), "ordinary offscreen speaker was incorrectly locked to audio-only");
});

check("block-wide audio-only speaker derives one exact no-visual rule", () => {
  const { result, json } = compile(audioOnlySpeakerPlan(), "audio-only-speaker");
  expect(result.status === 0, result.stderr);
  expect(json.blocks[0].special_rules.filter((rule) => rule === luoAudioOnlyRule).length === 1, "audio-only rule was not derived exactly once");
  expect(JSON.stringify(json.blocks[0].audio_only_speakers) === JSON.stringify(["罗小雨"]), "audio-only speaker tag was not preserved");
  const compiledFile = writeJson("audio-only-speaker-compiled.json", json);
  const validated = run(stateValidator, [compiledFile]);
  expect(validated.status === 0, `${validated.stdout}${validated.stderr}`);
});

check("audio-only rule and dialogue do not activate a visual character asset", () => {
  const plan = audioOnlySpeakerPlan();
  plan.asset_coverage_rules = [{
    asset_id: "WXGC-CHR-TEST-LUO-XIAOYU",
    path: "/tmp/example/罗小雨.png",
    trigger_terms: ["罗小雨"]
  }];
  const { result, json } = compile(plan, "audio-only-asset-negative-control");
  expect(result.status === 0, result.stderr);
  expect(JSON.stringify(json.blocks[0].required_assets) === JSON.stringify([]), "audio-only participation incorrectly required a visual character asset");
  const compiledFile = writeJson("audio-only-asset-compiled.json", json);
  const validated = run(stateValidator, [compiledFile]);
  expect(validated.status === 0, `${validated.stdout}${validated.stderr}`);
});

check("audio-only tag requires concrete attributed dialogue", () => {
  const plan = audioOnlySpeakerPlan();
  plan.blocks[0].events[0].visible_action = "步小蛮低头查看通讯器";
  expectCompileFailure(plan, "AUDIO_ONLY_SPEAKER_REQUIRES_ATTRIBUTED_DIALOGUE");
});

check("audio-only speaker must start offscreen", () => {
  const plan = audioOnlySpeakerPlan();
  plan.initial_state.characters.罗小雨.visible = true;
  expectCompileFailure(plan, "AUDIO_ONLY_SPEAKER_MUST_START_OFFSCREEN");
});

check("audio-only speaker cannot become visible inside the block", () => {
  const plan = audioOnlySpeakerPlan();
  plan.blocks[0].events[0].effects.push({ path: "characters.罗小雨.visible", set: true });
  expectCompileFailure(plan, "AUDIO_ONLY_SPEAKER_BECOMES_VISIBLE");
});

check("audio-only speaker name is forbidden in non-dialogue event prose", () => {
  const plan = audioOnlySpeakerPlan();
  plan.blocks[0].events[0].visible_action = "罗小雨在通讯另一端转身。罗小雨（对步小蛮通讯）说：“你先说你在哪儿。”";
  expectCompileFailure(plan, "AUDIO_ONLY_SPEAKER_VISUAL_PROSE_FORBIDDEN");
});

check("audio-only special rule is compiler-owned", () => {
  const plan = audioOnlySpeakerPlan();
  plan.blocks[0].special_rules = [luoAudioOnlyRule];
  expectCompileFailure(plan, "AUDIO_ONLY_SPEAKER_RULE_IS_COMPILER_OWNED");
});

check("state validator rejects tampered offscreen formal speaker state", () => {
  const { result, json } = compile(offscreenSpeakerPlan(), "offscreen-speaker-state-valid");
  expect(result.status === 0, result.stderr);
  json.clips[0].opening_speaker_states = {};
  const compiledFile = writeJson("offscreen-speaker-state-tampered.json", json);
  const validated = run(stateValidator, [compiledFile]);
  const output = `${validated.stdout ?? ""}${validated.stderr ?? ""}`;
  expect(validated.status !== 0, "expected missing offscreen speaker state to fail");
  expect(output.includes("opening_speaker_states does not match"), output);
});

check("compiler output contains no camera or shot plan", () => {
  const plan = basePlan();
  plan.scene_camera_plan = { ending_image: "legacy" };
  plan.blocks[0].shots = [{ id: "legacy-shot" }];
  plan.blocks[0].camera_beat_ids = ["legacy-beat"];
  plan.blocks[0].estimated_effective_duration_s = { min: 1, max: 2 };
  const { result, json } = compile(plan, "legacy-camera");
  expect(result.status === 0, result.stderr);
  const serialized = JSON.stringify(json);
  for (const token of ["scene_camera_plan", "\"shots\"", "camera_beat_ids", "estimated_effective_duration_s"]) {
    expect(!serialized.includes(token), `compiled output retained ${token}`);
  }
});

check("crowd state machine compiles and inherits a tracked extra across blocks", () => {
  const { plan, crowdId, initialCrowdState, continuedCrowdState } = crowdContinuityPlan();
  const { result, json } = compile(plan, "crowd-continuity");
  expect(result.status === 0, result.stderr);
  expect(json.blocks[0].opening_crowd_states[crowdId].continuity_state === initialCrowdState, "first opening crowd state was not derived");
  expect(json.blocks[0].end_state.crowd_entities[crowdId].continuity_state === continuedCrowdState, "crowd event did not update end state");
  expect(json.blocks[1].start_state.crowd_entities[crowdId].continuity_state === continuedCrowdState, "crowd end state was not inherited by the next block");
  const compiledFile = writeJson("crowd-continuity-compiled.json", json);
  const validated = run(stateValidator, [compiledFile]);
  expect(validated.status === 0, `${validated.stdout}${validated.stderr}`);
});

check("tracked crowd mention requires a state effect or explicit unchanged declaration", () => {
  const { plan } = crowdContinuityPlan();
  plan.blocks[1].events[0].crowd_state_unchanged = [];
  expectCompileFailure(plan, "CROWD_STATE_EFFECT_OR_UNCHANGED_REQUIRED");
});

check("crowd state changes require a complete continuity_state effect", () => {
  const { plan, crowdId } = crowdContinuityPlan();
  plan.blocks[0].events[0].effects = [{ path: `crowd_entities.${crowdId}.visible`, set: false }];
  expectCompileFailure(plan, "CROWD_CONTINUITY_STATE_EFFECT_REQUIRED");
});

check("one-block functional extra label does not activate crowd state", () => {
  const plan = basePlan("continuity");
  plan.blocks[0].events[0].visible_action = "队首的一名白塔疏散员朝街口居民喊出撤离方向";
  const { result, json } = compile(plan, "block-local-extra");
  expect(result.status === 0, result.stderr);
  expect(!Object.prototype.hasOwnProperty.call(json.initial_state, "crowd_entities"), "block-local extra created crowd state");
});

check("production target duration is optional", () => {
  const plan = basePlan();
  delete plan.blocks[1].target_duration_s;
  const { result } = compile(plan, "optional-duration");
  expect(result.status === 0, result.stderr);
});

check("compiled state manifest validates without shot validator", () => {
  const { result, json } = compile(basePlan("continuity"), "state-valid");
  expect(result.status === 0, result.stderr);
  const compiledFile = writeJson("compiled.json", json);
  const validated = run(stateValidator, [compiledFile]);
  expect(validated.status === 0, `${validated.stdout}${validated.stderr}`);
});

check("failed event precondition is rejected", () => {
  const plan = basePlan();
  plan.blocks[1].events[0].preconditions[0].equals = 99;
  expectCompileFailure(plan, "precondition failed");
});

check("duplicate event ids are rejected", () => {
  const plan = basePlan();
  plan.blocks[1].events[0].id = "E01";
  expectCompileFailure(plan, "duplicate event id E01");
});

check("door opening and crossing are rejected for de-door redesign", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮从走廊侧推开房门，穿过门洞进入茶室侧";
  expectCompileFailure(plan, "DOORWAY_CROSSING_REQUIRES_DIRECTOR_REROUTE");
});

check("door damage is rejected for de-door redesign", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮一脚踹开房门，整扇房门被踹飞出门框";
  expectCompileFailure(plan, "DOORWAY_OPERATION_REQUIRES_DEDOOR_REDIRECT");
});

check("door closing is rejected for de-door redesign", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮关上房门";
  expectCompileFailure(plan, "DOORWAY_OPERATION_REQUIRES_DEDOOR_REDIRECT");
});

check("stable open door behind wholly interior action remains accepted", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "房门已经敞开并保持敞开，步小蛮在室内工作区远离门区的位置拿起水杯";
  const { result } = compile(plan, "indoor-open-door-background");
  expect(result.status === 0, result.stderr);
});

check("stable closed door behind wholly exterior action remains accepted", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "房门始终保持关闭，所有动作和对白只发生在门的同一侧，步小蛮在室外侧拿起水杯";
  const { result } = compile(plan, "outdoor-closed-door-background");
  expect(result.status === 0, result.stderr);
});

check("action at a doorway edge is rejected", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮在房门边停下整理衣袖";
  expectCompileFailure(plan, "DOORWAY_THRESHOLD_ACTION_FORBIDDEN");
});

check("bare boundary position is rejected", () => {
  const plan = basePlan();
  plan.initial_state.characters.步小蛮.position = "房门口";
  expectCompileFailure(plan, "BOUNDARY_SIDE_REQUIRED");
});

check("explicit doorway side still requires de-door redesign", () => {
  const plan = basePlan();
  plan.initial_state.characters.步小蛮.position = "房门外侧";
  plan.initial_state.characters.步小蛮.boundary_relation = {
    boundary: "房门",
    state: "stationary",
    side: "房门外侧"
  };
  expectCompileFailure(plan, "DOORWAY_CHARACTER_STATE_REQUIRES_DEDOOR_REDIRECT");
});

check("explicit doorway side is allowed in a continuously closed same-side scene", () => {
  const plan = basePlan();
  plan.initial_state.scene.doorway_policy = "门始终保持关闭，所有动作和对白只发生在门的同一侧";
  plan.initial_state.characters.步小蛮.position = "房门内侧";
  plan.initial_state.characters.步小蛮.boundary_relation = {
    boundary: "房门",
    state: "stationary",
    side: "房门内侧"
  };
  plan.blocks[0].events[0].visible_action = "房门始终保持关闭，所有动作和对白只发生在门的同一侧，步小蛮在房门内侧整理衣袖";
  const { result } = compile(plan, "closed-door-indoor-side");
  expect(result.status === 0, result.stderr);
});

check("boundary synonym 房门附近 requires de-door redesign", () => {
  const plan = basePlan();
  plan.initial_state.characters.步小蛮.position = "房门附近";
  expectCompileFailure(plan, "DOORWAY_CHARACTER_STATE_REQUIRES_DEDOOR_REDIRECT");
});

check("boundary synonym 门洞中央 requires de-door redesign", () => {
  const plan = basePlan();
  plan.initial_state.characters.步小蛮.position = "门洞中央";
  expectCompileFailure(plan, "DOORWAY_CHARACTER_STATE_REQUIRES_DEDOOR_REDIRECT");
});

check("straddling a doorway is rejected even with a center-of-mass side", () => {
  const plan = basePlan();
  plan.initial_state.characters.步小蛮.position = "跨在房门门洞内，身体重心位于房间侧";
  plan.initial_state.characters.步小蛮.boundary_relation = {
    boundary: "房门",
    state: "straddling",
    center_of_mass_side: "房间侧"
  };
  expectCompileFailure(plan, "DOORWAY_CHARACTER_STATE_REQUIRES_DEDOOR_REDIRECT");
});

check("source-backed footwear detachment is accepted", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "乔昔旋身扫踢，步小蛮的鞋被踢飞";
  const { result } = compile(plan, "footwear-detachment");
  expect(result.status === 0, result.stderr);
});

check("a critical non-flexible result requires an explicit causal link", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮撞中乔昔，乔昔摔倒";
  expectCompileFailure(plan, "CRITICAL_ACTION_CAUSAL_LINK_REQUIRED");
});

check("a critical non-flexible result with explicit cause compiles", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮撞中乔昔，乔昔因此摔倒";
  const { result } = compile(plan, "explicit-critical-causality");
  expect(result.status === 0, result.stderr);
});

check("door mechanism changes are rerouted before generic causality checking", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮按下开关，房门打开";
  expectCompileFailure(plan, "DOORWAY_OPERATION_REQUIRES_DEDOOR_REDIRECT");
});

check("door mechanism changes remain rejected even with explicit causality", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮按下开关，房门因此打开";
  expectCompileFailure(plan, "DOORWAY_OPERATION_REQUIRES_DEDOOR_REDIRECT");
});

check("a critical result cannot omit its receiving subject", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮撞中乔昔，因此摔倒";
  expectCompileFailure(plan, "CRITICAL_ACTION_RESULT_SUBJECT_REQUIRED");
});

check("ordinary head-orientation actions do not activate critical causality checks", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮拿起水杯，步小蛮的头部朝向乔昔";
  const { result } = compile(plan, "ordinary-action-causality-negative-control");
  expect(result.status === 0, result.stderr);
});

check("scene plan rejects gaze wording used as physical orientation", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮拿起水杯，步小蛮转头看向乔昔";
  expectCompileFailure(plan, "GAZE_FRAMING_VERB_FORBIDDEN");
});

check("scene plan rejects view-relative language inside emotion state", () => {
  const plan = basePlan();
  plan.initial_state.characters.步小蛮.emotion = "选择正面对抗";
  expectCompileFailure(plan, "PERFORMANCE_VIEWPOINT_TERM_FORBIDDEN");
});

check("ambiguous flexible-tool force chains are rejected before prompt projection", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮勾住乔昔脚踝并用绕过腰侧的白色复合关节鞭向反方向拉动，乔昔实际摔倒后立刻翻身站起。";
  expectCompileFailure(plan, "FLEXIBLE_TOOL_CONTACT_COMPONENT_REQUIRED");
});

check("explicit flexible-tool force chains compile", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮甩动白色复合关节鞭，鞭尾勾住乔昔脚踝，步小蛮反方向拉动白色复合关节鞭，乔昔因此摔倒，随后乔昔立刻翻身站起。";
  const { result } = compile(plan, "explicit-flexible-tool-chain");
  expect(result.status === 0, result.stderr);
});

check("defensive unchanged footwear wording is rejected", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "步小蛮落地站稳，步小蛮双脚仍穿鞋";
  expectCompileFailure(plan, "DEFENSIVE_FOOTWEAR_CONTINUITY_FORBIDDEN");
});

check("non-dialogue_autocut projection is rejected", () => {
  const plan = basePlan();
  plan.projection_mode = "explicit_shots";
  expectCompileFailure(plan, "projection_mode must be dialogue_autocut");
});

check("calibration accepts camera-free multi_event class", () => {
  const plan = basePlan();
  plan.calibration = {
    status: "uncalibrated",
    basis: "test",
    samples: [{
      sample_id: "CAL-01",
      scene_class: "multi_event",
      platform: "Seedance",
      model_version: "test",
      prompt_profile: "production",
      prompt_fingerprint: "v1",
      tested_variable: "event_density",
      requested_duration_s: 10,
      file_duration_s: 10,
      usable_narrative_duration_s: 8,
      human_content_estimate_s: 9,
      planned_event_count: 2,
      completed_event_count: 2,
      compressed_or_missing_events: [],
      observed_output: "complete",
      confirmed_cause: null,
      unresolved_hypotheses: []
    }]
  };
  const { result } = compile(plan, "calibration");
  expect(result.status === 0, result.stderr);
});

check("block special rules compile independently and never inherit", () => {
  const plan = basePlan();
  const rule = "损坏巡检机器人是纯机械单位，不生成人类面孔。";
  plan.blocks[0].special_rules = [rule];
  const { result, json } = compile(plan, "block-special-rules");
  expect(result.status === 0, result.stderr);
  expect(JSON.stringify(json.blocks[0].special_rules) === JSON.stringify([rule]), "first block lost its authored special rule");
  expect(JSON.stringify(json.blocks[1].special_rules) === JSON.stringify([]), "special rule leaked into the next block");
});

check("ordinary whip use does not activate or inject a mechanism rule", () => {
  const plan = basePlan();
  plan.blocks[0].events[0].visible_action = "星落用白色复合关节鞭抽中重型巡检机器人胸口";
  const { result, json } = compile(plan, "ordinary-whip-use");
  expect(result.status === 0, result.stderr);
  expect(JSON.stringify(json.blocks[0].mechanism_requirements) === JSON.stringify([]), "ordinary use created a mechanism requirement");
  expect(JSON.stringify(json.blocks[0].special_rules) === JSON.stringify([]), "ordinary use injected a mechanism rule");
});

check("tagged sticky-bomb events derive one current-block mechanism rule and do not leak", () => {
  const { result, json } = compile(stickyBombMechanismPlan(), "sticky-bomb-mechanism");
  expect(result.status === 0, result.stderr);
  expect(JSON.stringify(json.blocks[0].special_rules) === JSON.stringify([stickyBombRule]), "mechanism rule was not derived exactly once");
  expect(JSON.stringify(json.blocks[0].mechanism_requirements[0].trigger_event_ids) === JSON.stringify(["E01"]), "trigger event ids were not derived");
  expect(JSON.stringify(json.blocks[1].special_rules) === JSON.stringify([]), "mechanism rule leaked into the next block");
});

check("a tagged mechanism event without a requirement is rejected", () => {
  const plan = stickyBombMechanismPlan();
  delete plan.blocks[0].mechanism_requirements;
  expectCompileFailure(plan, "MECHANISM_REQUIREMENT_MISSING");
});

check("a mechanism requirement without a tagged event is rejected as stale", () => {
  const plan = stickyBombMechanismPlan();
  delete plan.blocks[0].events[0].mechanism_id;
  expectCompileFailure(plan, "STALE_MECHANISM_REQUIREMENT");
});

check("a mechanism-derived rule cannot be duplicated in authored special rules", () => {
  const plan = stickyBombMechanismPlan();
  plan.blocks[0].special_rules = [stickyBombRule];
  expectCompileFailure(plan, "MECHANISM_RULE_DUPLICATED_IN_SPECIAL_RULES");
});

check("a declared persistent mechanism state is changed by its tagged event and inherited", () => {
  const { result, json } = compile(stickyBombMechanismPlan({ persistent: true }), "persistent-mechanism-state");
  expect(result.status === 0, result.stderr);
  const expected = "已消耗，补位尚未完成";
  expect(json.blocks[0].end_state.equipment.星落白色复合关节鞭.长主鞭尾末节 === expected, "mechanism state did not reach block end");
  expect(json.blocks[1].start_state.equipment.星落白色复合关节鞭.长主鞭尾末节 === expected, "mechanism state was not inherited by the next block");
});

check("a persistent mechanism path without a tagged event effect is rejected", () => {
  const plan = stickyBombMechanismPlan();
  plan.blocks[0].mechanism_requirements[0].persistent_state_paths = ["equipment.星落白色复合关节鞭.长主鞭尾末节"];
  expectCompileFailure(plan, "MECHANISM_PERSISTENT_STATE_PATH_REQUIRES_TRIGGER_EFFECT");
});

check("visible state derives only the matching required asset", () => {
  const plan = basePlan();
  plan.asset_coverage_rules = [gunAssetRule];
  plan.initial_state.characters.步小蛮.hands = "双手握住能量枪模块";
  const { result, json } = compile(plan, "visible-asset-coverage");
  expect(result.status === 0, result.stderr);
  expect(JSON.stringify(json.blocks[0].required_assets) === JSON.stringify([{
    id: gunAssetRule.asset_id,
    path: gunAssetRule.path,
    matched_terms: ["能量枪模块"],
    evidence: ["start_state"]
  }]), "visible gun state did not derive the exact required asset");
  expect(JSON.stringify(json.blocks[1].required_assets) === JSON.stringify([]), "gun asset leaked into a block whose visible state and events do not mention it");
});

check("asset name mentioned only inside dialogue does not require a visual asset", () => {
  const plan = basePlan();
  plan.asset_coverage_rules = [gunAssetRule];
  plan.blocks[0].events[0].visible_action = "步小蛮（对乔昔）说：“能量枪模块不见了。”";
  const { result, json } = compile(plan, "dialogue-only-asset-mention");
  expect(result.status === 0, result.stderr);
  expect(JSON.stringify(json.blocks[0].required_assets) === JSON.stringify([]), "dialogue-only mention incorrectly required a visual asset");
});

check("an offscreen equipment ledger does not require a visual asset", () => {
  const plan = basePlan();
  plan.asset_coverage_rules = [gunAssetRule];
  plan.initial_state.equipment = { 库存枪模块: { state: "能量枪模块待命" } };
  const { result, json } = compile(plan, "offscreen-equipment-asset");
  expect(result.status === 0, result.stderr);
  expect(JSON.stringify(json.blocks[0].required_assets) === JSON.stringify([]), "offscreen equipment incorrectly required a visual asset");
});

check("a persistent lighting transition derives warm and cold assets by exact state", () => {
  const plan = basePlan();
  plan.initial_state.systems = { 房间照明: { state: "warm_on" } };
  plan.asset_coverage_rules = [
    {
      asset_id: "WXGC-SCN-TEST-WARM",
      path: "/tmp/example/room-warm.jpg",
      trigger_terms: [],
      state_conditions: [{ path: "systems.房间照明.state", equals: "warm_on" }],
      global_forbidden_terms: ["暖色主灯开启", "青冷环境光接管"]
    },
    {
      asset_id: "WXGC-SCN-TEST-COLD",
      path: "/tmp/example/room-cold.jpg",
      trigger_terms: [],
      state_conditions: [{ path: "systems.房间照明.state", equals: "cold_after_off" }],
      global_forbidden_terms: ["暖色主灯开启", "青冷环境光接管"]
    }
  ];
  plan.blocks[0].events[0].visible_action = "步小蛮关闭房间暖色主灯，青冷环境光接管房间照明";
  plan.blocks[0].events[0].effects.push({ path: "systems.房间照明.state", set: "cold_after_off" });
  const { result, json } = compile(plan, "state-conditioned-lighting-assets");
  expect(result.status === 0, result.stderr);
  expect(JSON.stringify(json.blocks[0].required_assets.map((asset) => asset.id)) === JSON.stringify([
    "WXGC-SCN-TEST-WARM",
    "WXGC-SCN-TEST-COLD"
  ]), "transition block did not receive both lighting-state assets");
  expect(JSON.stringify(json.blocks[1].required_assets.map((asset) => asset.id)) === JSON.stringify([
    "WXGC-SCN-TEST-COLD"
  ]), "post-transition block did not receive only the cold-state asset");
  expect(json.blocks[1].start_state.systems.房间照明.state === "cold_after_off", "lighting state did not persist across the block boundary");
  const compiledFile = writeJson("state-conditioned-lighting-assets-compiled.json", json);
  const validated = run(stateValidator, [compiledFile]);
  expect(validated.status === 0, `${validated.stdout ?? ""}${validated.stderr ?? ""}`);
});

check("state-conditioned assets require an initial-state path", () => {
  const plan = basePlan();
  plan.asset_coverage_rules = [{
    asset_id: "WXGC-SCN-TEST-COLD",
    path: "/tmp/example/room-cold.jpg",
    trigger_terms: [],
    state_conditions: [{ path: "systems.房间照明.state", equals: "cold_after_off" }],
    global_forbidden_terms: ["青冷环境光接管"]
  }];
  expectCompileFailure(plan, "path must exist in initial_state");
});

check("mutable lighting wording is rejected from frozen global", () => {
  const plan = basePlan();
  plan.initial_state.systems = { 房间照明: { state: "warm_on" } };
  plan.asset_coverage_rules = [{
    asset_id: "WXGC-SCN-TEST-WARM",
    path: "/tmp/example/room-warm.jpg",
    trigger_terms: [],
    state_conditions: [{ path: "systems.房间照明.state", equals: "warm_on" }],
    global_forbidden_terms: ["暖色主灯开启", "青冷环境光接管"]
  }];
  plan.scene_global_master = `${globalMaster}暖色主灯开启。`;
  expectCompileFailure(plan, "MUTABLE_VISUAL_STATE_IN_GLOBAL");
});

check("overlapping scene terms are allowed for mutually exclusive visual states", () => {
  const plan = basePlan();
  plan.initial_state.systems = { 房间照明: { state: "warm_on" } };
  plan.initial_state.scene.handoff = "茶室保持连续";
  plan.asset_coverage_rules = [
    {
      asset_id: "WXGC-SCN-TEST-WARM",
      path: "/tmp/example/room-warm.jpg",
      trigger_terms: ["茶室"],
      state_conditions: [{ path: "systems.房间照明.state", equals: "warm_on" }],
      global_forbidden_terms: ["暖色主灯开启", "青冷环境光接管"]
    },
    {
      asset_id: "WXGC-SCN-TEST-COLD",
      path: "/tmp/example/room-cold.jpg",
      trigger_terms: ["茶室"],
      state_conditions: [{ path: "systems.房间照明.state", equals: "cold_after_off" }],
      global_forbidden_terms: ["暖色主灯开启", "青冷环境光接管"]
    }
  ];
  const { result } = compile(plan, "state-separated-overlapping-terms");
  expect(result.status === 0, result.stderr);
});

check("overlapping trigger terms for different assets are rejected", () => {
  const plan = basePlan();
  plan.asset_coverage_rules = [
    gunAssetRule,
    { asset_id: "WXGC-PRP-TEST-OTHER-GUN", path: "/tmp/example/other-gun.png", trigger_terms: ["枪模块"] }
  ];
  expectCompileFailure(plan, "ASSET_TRIGGER_TERM_COLLISION");
});

check("a non-dialogue event and ending state derive the introduced asset", () => {
  const plan = basePlan();
  plan.asset_coverage_rules = [gunAssetRule];
  plan.blocks[0].events[0].visible_action = "步小蛮从桌面拿起能量枪模块";
  plan.blocks[0].events[0].effects.push({ path: "characters.步小蛮.hands", set: "双手握住能量枪模块" });
  const { result, json } = compile(plan, "introduced-visible-asset");
  expect(result.status === 0, result.stderr);
  expect(JSON.stringify(json.blocks[0].required_assets[0].evidence) === JSON.stringify(["event:E01", "end_state"]), "event/end-state asset evidence was not derived");
});

check("required assets are compiler-owned", () => {
  const plan = basePlan();
  plan.blocks[0].required_assets = [];
  expectCompileFailure(plan, "required_assets is compiler-owned");
});

check("state validator rejects tampered required asset coverage", () => {
  const plan = basePlan();
  plan.asset_coverage_rules = [gunAssetRule];
  plan.initial_state.characters.步小蛮.hands = "双手握住能量枪模块";
  const { result, json } = compile(plan, "tampered-asset-coverage");
  expect(result.status === 0, result.stderr);
  json.clips[0].required_assets = [];
  const compiledFile = writeJson("tampered-asset-coverage-compiled.json", json);
  const validated = run(stateValidator, [compiledFile]);
  const output = `${validated.stdout ?? ""}${validated.stderr ?? ""}`;
  expect(validated.status !== 0, "expected state validator failure");
  expect(output.includes("required_assets do not match"), `missing asset coverage diagnostic\n${output}`);
});

check("root special-rule defaults are rejected", () => {
  const plan = basePlan();
  plan.special_rules = ["损坏巡检机器人是纯机械单位。"];
  expectCompileFailure(plan, "SPECIAL_RULES_MUST_BE_BLOCK_LOCAL");
});

check("named character rules are rejected from global", () => {
  const plan = basePlan();
  plan.scene_global_master = `${globalMaster}步小蛮始终戴着护目镜。`;
  expectCompileFailure(plan, "ENTITY_RULE_IN_GLOBAL");
});

check("generic robot constraints are rejected from global", () => {
  const plan = basePlan();
  plan.scene_global_master = `${globalMaster}所有巡检机器人均为纯机械单位，机器人不得生成人类面孔。`;
  expectCompileFailure(plan, "ENTITY_RULE_IN_GLOBAL");
});

fs.rmSync(tempDir, { recursive: true, force: true });

if (failures.length) {
  console.error(`\nFAILED: ${failures.length}/${total} test(s)`);
  process.exit(1);
}

console.log(`\nOK: ${total} camera-free scene-plan test(s) passed`);
