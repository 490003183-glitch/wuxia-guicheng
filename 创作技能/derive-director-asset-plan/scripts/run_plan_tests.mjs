#!/usr/bin/env node
// Copyright (c) 2026 mtgh
// SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
// See repository LICENSE-TOOLS. Commercial use requires separate written authorization.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DirectorAssetPlanError, validateDirectorAssetPlan } from "./validate_director_asset_plan.mjs";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "director-asset-plan-test-"));

function writeSource(name, content) {
  const filePath = path.join(tempDir, name);
  fs.writeFileSync(filePath, content);
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    size_bytes: stat.size,
    mtime: stat.mtime.toISOString(),
    sha256: crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"),
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectFailure(plan, fragment) {
  assert.throws(
    () => validateDirectorAssetPlan(plan),
    (error) => error instanceof DirectorAssetPlanError && error.message.includes(fragment),
  );
}

try {
  const screenplay = writeSource("screenplay.md", "screenplay final\n");
  const director = writeSource("director.md", "director accepted\n");
  const assetPath = path.join(tempDir, "scene-master.jpg");
  const newAssetPath = path.join(tempDir, "derived-view.jpg");
  const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1pAAAAAASUVORK5CYII=", "base64");
  fs.writeFileSync(assetPath, imageBytes);
  fs.writeFileSync(newAssetPath, imageBytes);

  const plan = {
    schema_version: "director-asset-plan/v1",
    plan_id: "TEST-DAP-v001",
    title: "测试导演稿驱动资产规划",
    status: "planning",
    confirmed_by_user: false,
    confirmation_scope: "",
    sources: {
      screenplay: { ...screenplay, status: "final" },
      director: { ...director, status: "accepted", source_screenplay_sha256: screenplay.sha256 },
      asset_library_root: tempDir,
    },
    screenplay_asset_baseline: [
      { baseline_ref: "S01-BASE-SCENE", scene_id: "S01", category: "location", required_visible_fact: "测试场景空间必须可用" },
      { baseline_ref: "S01-BASE-BLOCKING", scene_id: "S01", category: "spatial_relation", required_visible_fact: "两人分处门内侧和走廊侧" },
    ],
    director_critical_refs: [
      { director_ref: "SH01-01", priority: "P1", protected_intent: "建立场景空间", edit_refs: ["ED01"] },
      { director_ref: "SH01-02", priority: "P0", protected_intent: "看见门槛越线结果", edit_refs: ["ED02"] },
      { director_ref: "SH01-03", priority: "P1", protected_intent: "声音先进入下一场", edit_refs: ["ED03"] },
    ],
    requirements: [
      {
        id: "TEST-DAR-001",
        decision: "REUSE",
        priority: "P1",
        baseline_refs: ["S01-BASE-SCENE"],
        director_refs: ["SH01-01"],
        edit_refs: ["ED01"],
        source_refs: ["S01-空间建立"],
        visual_dependency: "同一场景的空间结构",
        asset_type: "SCENE_MASTER",
        rationale: "正式场景母版已经覆盖空间关系",
        downstream_uses: ["AUTO_EVENT", "SCENE_CONTINUITY"],
        dependencies: [],
        acceptance_criteria: ["空间结构与导演稿一致"],
        fallback_strategy: "",
        handoff_required: true,
        formal_search: { query: "--scene 测试场景 --type SCN", result: "EXACT_MATCH", checked_at: "2026-09-04T12:00:00+08:00" },
        resolved_asset: { id: "TEST-ASSET-001", status: "定稿可用", path: assetPath },
      },
      {
        id: "TEST-DAR-002",
        decision: "CREATE",
        priority: "P0",
        baseline_refs: [],
        director_refs: ["SH01-02"],
        edit_refs: ["ED02"],
        source_refs: ["S01-越过门线"],
        visual_dependency: "门槛、两侧空间和未开启物体状态",
        asset_type: "DERIVED_VIEW",
        rationale: "现有母版不能同时证明越线关系",
        downstream_uses: ["DIRECTED_CAPTURE", "FALLBACK_CAPTURE"],
        dependencies: ["TEST-DAR-001"],
        acceptance_criteria: ["门槛和两侧连通", "物体保持未开启"],
        fallback_strategy: "使用门内起点和门外结果态保留越线事实",
        handoff_required: true,
        formal_search: { query: "--scene 测试场景 --keyword 门槛越线", result: "NO_MATCH", checked_at: "2026-09-04T12:01:00+08:00" },
        proposed_asset: { planned_id: "TEST-ASSET-PLANNED-002", name: "测试门槛派生视角" },
      },
      {
        id: "TEST-DAR-003",
        decision: "NO_ASSET",
        priority: "P1",
        baseline_refs: [],
        director_refs: ["SH01-03"],
        edit_refs: ["ED03"],
        source_refs: ["S01-声音转场"],
        visual_dependency: "下一场声音提前进入",
        asset_type: "NONE",
        rationale: "跨片段声画关系属于剪辑",
        downstream_uses: ["NONE"],
        dependencies: [],
        acceptance_criteria: [],
        fallback_strategy: "",
        handoff_required: false,
        no_asset_category: "EDIT_ONLY",
        no_asset_reason: "J-cut只进入剪辑执行表",
      },
      {
        id: "TEST-DAR-004",
        decision: "TEXT_ONLY",
        priority: "P2",
        baseline_refs: ["S01-BASE-BLOCKING"],
        director_refs: ["SH01-04"],
        edit_refs: ["ED04"],
        source_refs: ["S01-简单站位"],
        visual_dependency: "两人分别位于门内侧和走廊侧",
        asset_type: "NONE",
        rationale: "一句空间口径比新增站位图更明确",
        downstream_uses: ["SCENE_CONTINUITY"],
        dependencies: [],
        acceptance_criteria: [],
        fallback_strategy: "",
        handoff_required: false,
        text_blocking: "角色甲位于门内侧，角色乙位于走廊侧。",
      },
    ],
    creation_order: ["TEST-DAR-002"],
    asset_prompt_dispatch_ids: ["TEST-DAR-002"],
    handoff_bindings: [
      {
        requirement_id: "TEST-DAR-001",
        asset_id: "TEST-ASSET-001",
        path: assetPath,
        scope_id: "S01/SH01-01",
        order: 1,
        locks: "场景空间结构",
        do_not_inherit: "不继承临时人物和错误动作",
      },
    ],
    unresolved_blockers: [],
  };

  const planning = validateDirectorAssetPlan(plan);
  assert.equal(planning.status, "planning");
  assert.deepEqual(planning.asset_prompt_dispatch_ids, ["TEST-DAR-002"]);

  const statefulV2 = clone(plan);
  statefulV2.schema_version = "director-asset-plan/v2";
  statefulV2.visual_state_machines = [{
    id: "S01-LIGHTING",
    scene_id: "S01",
    subject: "测试房间照明",
    initial_state: "warm_on",
    states: [
      { id: "warm_on", description: "暖色主灯开启", source_refs: ["S01-初始照明"], requires_distinct_asset: true },
      { id: "cold_after_off", description: "主灯关闭后青冷环境光接管", source_refs: ["S01-关灯结果"], requires_distinct_asset: true },
    ],
    transitions: [{ event_ref: "S01-E-LIGHT-OFF", from: "warm_on", to: "cold_after_off" }],
  }];
  statefulV2.requirements[0].state_binding = { machine_id: "S01-LIGHTING", state: "warm_on" };
  statefulV2.requirements[1].state_binding = { machine_id: "S01-LIGHTING", state: "cold_after_off" };
  statefulV2.handoff_bindings[0].state_binding = { machine_id: "S01-LIGHTING", state: "warm_on" };
  const validatedStatefulV2 = validateDirectorAssetPlan(statefulV2);
  assert.equal(validatedStatefulV2.visual_state_machines[0].states.length, 2);

  const missingColdStateAsset = clone(statefulV2);
  delete missingColdStateAsset.requirements[1].state_binding;
  expectFailure(missingColdStateAsset, "S01-LIGHTING/cold_after_off requires a distinct asset");

  const unreachableState = clone(statefulV2);
  unreachableState.visual_state_machines[0].states.push({
    id: "alarm_red",
    description: "警报红灯",
    source_refs: ["S01-警报"],
    requires_distinct_asset: false,
  });
  expectFailure(unreachableState, "unreachable state from initial_state: alarm_red");

  const missingCritical = clone(plan);
  missingCritical.requirements = missingCritical.requirements.filter((item) => item.id !== "TEST-DAR-003");
  expectFailure(missingCritical, "missing asset decision for director critical ref: SH01-03");

  const missingBaseline = clone(plan);
  missingBaseline.requirements = missingBaseline.requirements.filter((item) => item.id !== "TEST-DAR-004");
  expectFailure(missingBaseline, "missing asset decision for screenplay baseline ref: S01-BASE-BLOCKING");

  const badDispatch = clone(plan);
  badDispatch.asset_prompt_dispatch_ids.push("TEST-DAR-003");
  expectFailure(badDispatch, "must contain exactly the unresolved CREATE requirements");

  const cyclic = clone(plan);
  cyclic.requirements[0].dependencies = ["TEST-DAR-002"];
  expectFailure(cyclic, "dependency cycle detected");

  const ready = clone(plan);
  ready.status = "ready_for_user_confirmation";
  ready.requirements[1].resolved_asset = { id: "TEST-ASSET-002", status: "定稿可用", path: newAssetPath };
  ready.asset_prompt_dispatch_ids = [];
  ready.handoff_bindings.push({
    requirement_id: "TEST-DAR-002",
    asset_id: "TEST-ASSET-002",
    path: newAssetPath,
    scope_id: "S01/SH01-02",
    order: 1,
    locks: "门槛越线空间和未开启状态",
    do_not_inherit: "不继承临时人物、文字和错误动作姿态",
  });
  assert.equal(validateDirectorAssetPlan(ready).status, "ready_for_user_confirmation");

  const readyStatefulV2 = clone(statefulV2);
  readyStatefulV2.status = "ready_for_user_confirmation";
  readyStatefulV2.requirements[1].resolved_asset = { id: "TEST-ASSET-002", status: "定稿可用", path: newAssetPath };
  readyStatefulV2.asset_prompt_dispatch_ids = [];
  readyStatefulV2.handoff_bindings.push({
    requirement_id: "TEST-DAR-002",
    asset_id: "TEST-ASSET-002",
    path: newAssetPath,
    scope_id: "S01/SH01-02",
    order: 1,
    locks: "青冷关灯状态",
    do_not_inherit: "不继承暖光状态",
    state_binding: { machine_id: "S01-LIGHTING", state: "cold_after_off" },
  });
  assert.equal(validateDirectorAssetPlan(readyStatefulV2).status, "ready_for_user_confirmation");

  const missingStateHandoff = clone(readyStatefulV2);
  delete missingStateHandoff.handoff_bindings[1].state_binding;
  expectFailure(missingStateHandoff, "state_binding is required for state-bound requirement TEST-DAR-002");

  const missingBinding = clone(ready);
  missingBinding.handoff_bindings.pop();
  expectFailure(missingBinding, "requires a handoff binding for TEST-DAR-002");

  const confirmed = clone(ready);
  confirmed.status = "confirmed_complete";
  confirmed.confirmed_by_user = true;
  confirmed.confirmation_scope = "用户确认 TEST-DAP-v001 全集资产映射";
  assert.equal(validateDirectorAssetPlan(confirmed).status, "confirmed_complete");

  const falseConfirmation = clone(confirmed);
  falseConfirmation.confirmed_by_user = false;
  expectFailure(falseConfirmation, "requires confirmed_by_user: true");

  process.stdout.write("OK: critical coverage, decision routing, dependency order, dispatch isolation, readiness, and explicit-confirmation tests passed\n");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
