#!/usr/bin/env node
// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0

import {validateAssetUploadMode} from '../../wuxia-seedance-scene-prompts/scripts/asset_upload_contract.mjs';
import crypto from "node:crypto";
import { validateProductionHandoff } from "./production_handoff.mjs";
import { promptRealizationDiagnostics, speechParticipants } from "../../wuxia-seedance-scene-prompts/scripts/prompt_realization.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export class PackageValidationError extends Error {}

function reject(message) {
  throw new PackageValidationError(message);
}

function textValue(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    reject(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function textArray(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    reject(`${label} must be ${allowEmpty ? "an" : "a non-empty"} array`);
  }
  return value.map((item, index) => textValue(item, `${label}[${index}]`));
}

function numberValue(value, label, { positive = false } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    reject(`${label} must be a finite number`);
  }
  if (positive ? value <= 0 : value < 0) {
    reject(`${label} must be ${positive ? "greater than zero" : "zero or greater"}`);
  }
  return value;
}

function enumValue(value, allowed, label) {
  if (!allowed.includes(value)) {
    reject(`${label} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

// Only current header metadata may establish source identity; examples/history cannot.
function headerValue(raw, key, label, required = true) {
  const normalized = raw.replace(/\r\n/g, "\n");
  const front = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  const area = front ? front[1] : normalized.split(/^```/m)[0];
  const values = [...area.matchAll(new RegExp(`^${key}: *([^\\n]+)$`, "gm"))].map(m => m[1].trim().replace(/^["']|["']$/g, ""));
  if (!values.length && !required) return null;
  if (values.length !== 1) reject(`${label} requires one current header ${key} binding`);
  return values[0];
}

function validateFileRecord(record, label, { verifyFiles }) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    reject(`${label} must be an object`);
  }
  const filePath = textValue(record.path, `${label}.path`);
  if (!path.isAbsolute(filePath)) reject(`${label}.path must be absolute`);
  textValue(record.status, `${label}.status`);
  const sizeBytes = numberValue(record.size_bytes, `${label}.size_bytes`);
  const mtime = textValue(record.mtime, `${label}.mtime`);
  if (Number.isNaN(Date.parse(mtime))) reject(`${label}.mtime must be a parseable date-time`);
  const sha256 = textValue(record.sha256, `${label}.sha256`);
  if (!/^[a-f0-9]{64}$/.test(sha256)) reject(`${label}.sha256 must be 64 lowercase hexadecimal characters`);

  if (verifyFiles) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      reject(`${label}.path does not exist: ${filePath}`);
    }
    if (!stat.isFile()) reject(`${label}.path is not a file: ${filePath}`);
    if (stat.size !== sizeBytes) reject(`${label}.size_bytes does not match file size`);
    if (sha256File(filePath) !== sha256) reject(`${label}.sha256 does not match current file content`);
  }

  return { ...record, path: filePath, sha256, size_bytes: sizeBytes, mtime };
}

const EDIT_LANGUAGE_PATTERNS = [
  /J[\s-]?cut/i,
  /L[\s-]?cut/i,
  /J切/i,
  /L切/i,
  /声音提前/,
  /音轨提前/,
  /画面晚切/,
  /剪辑点/,
  /时间线/,
  /切黑/,
  /交叉剪辑/,
  /声音桥/,
];

const DOORWAY_MODES = [
  "eliminated_or_none",
  "same_side_interior_open_background",
  "same_side_static_closed_door",
  "asset_scene_exit_only",
];
const DOORWAY_CROSSING_PATTERN = /(?:(?:房门|舱门|闸门|车门|门内|门外|门洞|门口|入口|出口)[^，。；！？\r\n]{0,18}(?:走出|跑出|冲出|出来|驶出|离开|走进|跑进|冲进|进去|进入|穿过|通过|越过|跨过)|(?:穿过|通过|越过|跨过|走进|跑进|冲进|进入|走出|跑出|冲出|驶出)[^，。；！？\r\n]{0,18}(?:房门|舱门|闸门|车门|门洞|入口|出口))/u;
const DOORWAY_THRESHOLD_PATTERN = /(?:门口|门边|门旁|门槛|门框|门洞|入口处|入口旁|入口附近|舱口|闸门口)/u;
const DOORWAY_OPERATION_PATTERN = /(?:(?:推开|拉开|掀开|撬开|打开|开启|关上|关闭|合上|合拢|闭合|踹开|撞开|砸开|炸开|踢飞|撞飞|破坏|击碎)[^，。；！？\r\n]{0,18}(?:房门|舱门|闸门|车门|门扇|门板|门锁|门框)|(?:房门|舱门|闸门|车门|门扇|门板|门锁|门框)[^，。；！？\r\n]{0,18}(?:因此|随后|立即|逐渐|开始|被)?[^，。；！？\r\n]{0,8}(?:打开|开启|关上|关闭|合上|合拢|闭合|破裂|碎裂|飞出|脱离))/u;
const DOORWAY_FORBIDDEN_CONCURRENT_ACTION_PATTERN = /(?:攻击|战斗|搏斗|开枪|射击|挥砍|抽打|击中|撞中|踢中|抓住|按住|接触|碰撞|递给|交给|接过|交换|交接|停在门|门前停|门口停|回头|转身|说：|“)/u;

function stripStableDoorState(text) {
  return String(text ?? "")
    .replace(/门已经敞开并保持敞开/gu, "")
    .replace(/门始终保持关闭/gu, "")
    .replace(/(?:房门|舱门|闸门|车门|门扇|门板)[^，。；！？\r\n]{0,8}(?:已经|已|始终|一直|持续|仍然|仍|依然|保持)[^，。；！？\r\n]{0,8}(?:敞开|开着|打开状态|关闭|关着|闭合状态)/gu, "");
}

function actionableDoorwayText(text) {
  const residual = stripStableDoorState(text);
  return DOORWAY_CROSSING_PATTERN.test(residual)
    || DOORWAY_OPERATION_PATTERN.test(residual)
    || DOORWAY_THRESHOLD_PATTERN.test(residual);
}

const CAMERA_FREE_SENTENCES = [
  "镜头偏好手持镜头特写和近景。无任何中景 远景。",
  "对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。",
];

function rejectEditLanguage(value, label, { allowVoiceAudio = false, verifyFiles = false, allowNativeEdit = false } = {}) {
  if (allowNativeEdit && /(?:上一条视频|下一条视频|另一条视频|已生成的视频|外部音轨|外部剪辑软件)/u.test(value)) reject(`${label} native edited sequence cannot operate on external clips or tracks`);
  for (const pattern of (allowNativeEdit ? [] : EDIT_LANGUAGE_PATTERNS)) {
    if (pattern.test(value)) reject(`${label} contains post-edit language matched by ${pattern}`);
  }
  const speakers=new Set(speechParticipants(value).map(s=>s.speaker));
  const pathChecked=allowVoiceAudio ? value.replace(/^([^\n｜]+)的音色音频文件参考引用：((?:\/|[A-Za-z]:[\\/])[^\n]+\.(?:wav|mp3|m4a|aac|flac|ogg))。｜$/gmu, (line,name,audioPath)=>{
    if (!speakers.has(name)) reject(`${label}: voice audio belongs to a character without attributed dialogue`);
    if (verifyFiles && (!fs.existsSync(audioPath) || !fs.statSync(audioPath).isFile())) reject(`${label}: voice audio file does not exist: ${audioPath}`);
    return '';
  }) : value;
  if (/(?:^|[\s：（(])(?:\/(?:[^\s/]+\/)+|[A-Za-z]:[\\/])/u.test(pathChecked)) reject(`${label} contains a local asset path`);
}

function validateAssets(assets, unitLabel, { verifyFiles, requireUserAssetPaths, allowEmpty = false }) {
  if (!Array.isArray(assets) || (!allowEmpty && assets.length === 0)) {
    reject(`${unitLabel}.assets must be a non-empty array`);
  }
  const ids = new Set();
  return assets.map((asset, index) => {
    const label = `${unitLabel}.assets[${index}]`;
    if (!asset || typeof asset !== "object" || Array.isArray(asset)) reject(`${label} must be an object`);
    const id = textValue(asset.id, `${label}.id`);
    const assetPath = textValue(asset.path, `${label}.path`);
    const order = numberValue(asset.order, `${label}.order`, { positive: true });
    if (!Number.isInteger(order) || order !== index + 1) reject(`${label}.order must equal ${index + 1}`);
    if (ids.has(id)) reject(`${unitLabel} has duplicate asset id: ${id}`);
    ids.add(id);
    if (!path.isAbsolute(assetPath)) reject(`${label}.path must be absolute`);
    if (requireUserAssetPaths && !path.isAbsolute(assetPath)) {
      reject(`${label}.path must be absolute`);
    }
    if (!/\.(avif|gif|jpe?g|png|webp)$/i.test(assetPath)) {
      reject(`${label}.path must end with a supported image extension`);
    }
    if (verifyFiles) {
      let stat;
      try {
        stat = fs.statSync(assetPath);
      } catch {
        reject(`${label}.path does not exist: ${assetPath}`);
      }
      if (!stat.isFile()) reject(`${label}.path is not a file: ${assetPath}`);
    }
    // Keep supplied usage/role metadata for the shared delivery card.
    return { ...asset, id, path: assetPath, order };
  });
}

function validateHandles(handles, unitLabel) {
  if (!handles || typeof handles !== "object" || Array.isArray(handles)) {
    reject(`${unitLabel}.handles must be an object`);
  }
  return {
    picture_head_s: numberValue(handles.picture_head_s, `${unitLabel}.handles.picture_head_s`),
    picture_tail_s: numberValue(handles.picture_tail_s, `${unitLabel}.handles.picture_tail_s`),
    audio_head_s: numberValue(handles.audio_head_s, `${unitLabel}.handles.audio_head_s`),
    audio_tail_s: numberValue(handles.audio_tail_s, `${unitLabel}.handles.audio_tail_s`),
  };
}

export function validatePackage(manifest, options = {}) {
  const verifyFiles = options.verifyFiles ?? true;
  const requireUserAssetPaths = options.requireUserAssetPaths ?? true;
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) reject("manifest must be an object");

  if (manifest.schema_version !== "director-seedance-package/v2") {
    reject("schema_version must be director-seedance-package/v2; legacy v1 requires an explicit screenplay/TAKE/carrier audit before formal redelivery");
  }
  const packageId = textValue(manifest.package_id, "package_id");
  const title = textValue(manifest.title, "title");
  const project = textValue(manifest.project, "project");
  if (manifest.status !== "executable") reject("status must be executable for a formal package");
  const productionProfile = textValue(manifest.production_profile, "production_profile");
  const runtimeStatus = enumValue(manifest.runtime_status, ["provisional", "calibrated"], "runtime_status");
  const targetRuntime = numberValue(manifest.target_runtime_s, "target_runtime_s", { positive: true });

  const screenplay = validateFileRecord(manifest.sources?.screenplay, "sources.screenplay", { verifyFiles });
  const director = validateFileRecord(manifest.sources?.director, "sources.director", { verifyFiles });
  const assetHandoff = validateFileRecord(manifest.sources?.asset_handoff, "sources.asset_handoff", { verifyFiles });
  enumValue(screenplay.status, ["final", "accepted"], "sources.screenplay.status");
  enumValue(director.status, ["accepted", "final"], "sources.director.status");
  if (assetHandoff.status !== "confirmed_complete") reject("sources.asset_handoff.status must be confirmed_complete");
  if (assetHandoff.confirmed_by_user !== true) reject("sources.asset_handoff.confirmed_by_user must be true");
  if (director.source_screenplay_sha256 !== screenplay.sha256) {
    reject("sources.director.source_screenplay_sha256 does not match current screenplay sha256");
  }
  if (assetHandoff.source_screenplay_sha256 !== screenplay.sha256) {
    reject("sources.asset_handoff.source_screenplay_sha256 does not match current screenplay sha256");
  }

  if (assetHandoff.source_director_sha256 !== director.sha256) reject("sources.asset_handoff.source_director_sha256 does not match current director sha256");
  // Bind declarations to actual source headers, not manifest-only claims.
  if (verifyFiles) {
    const directorText = fs.readFileSync(director.path, "utf8");
    if (headerValue(directorText, "source_screenplay_sha256", "director file") !== screenplay.sha256) reject("director file contains a stale screenplay binding");
    const screenplayText = fs.readFileSync(screenplay.path, "utf8");
    const sourceProject = headerValue(screenplayText, "project", "screenplay file", false);
    if (sourceProject && sourceProject !== project) reject("project does not match screenplay project");
    const novelPath = headerValue(screenplayText, "source_novel", "screenplay file", false);
    const novelHash = headerValue(screenplayText, "source_novel_sha256", "screenplay file", false);
    if (novelPath || novelHash) {
      if (!novelPath || !novelHash || !path.isAbsolute(novelPath) || !fs.existsSync(novelPath) || !fs.statSync(novelPath).isFile() || sha256File(novelPath) !== novelHash) reject("screenplay file contains a stale or incomplete novel binding");
    }
    const raw = fs.readFileSync(assetHandoff.path, "utf8");
    let embedded;
    try { embedded = JSON.parse(raw); } catch { /* Markdown handoffs use current header fields. */ }
    if (embedded) {
      if (embedded.sources?.director?.sha256 !== director.sha256 || embedded.sources?.screenplay?.sha256 !== screenplay.sha256) reject("asset handoff file contains stale production bindings");
    } else if (headerValue(raw, "source_director_sha256", "asset handoff file") !== director.sha256 || headerValue(raw, "source_screenplay_sha256", "asset handoff file") !== screenplay.sha256) {
      reject("asset handoff file lacks current director and screenplay binding evidence");
    }
  }

  const unresolved = textArray(manifest.unresolved_assumptions, "unresolved_assumptions", { allowEmpty: true });
  if (unresolved.length > 0) reject("executable package cannot contain unresolved_assumptions");

  if (!Array.isArray(manifest.director_critical_refs) || manifest.director_critical_refs.length === 0) {
    reject("director_critical_refs must be a non-empty array");
  }
  const criticalRefs = new Map();
  const normalizedCriticalRefs = manifest.director_critical_refs.map((item, index) => {
    const label = `director_critical_refs[${index}]`;
    const directorRef = textValue(item?.director_ref, `${label}.director_ref`);
    const priority = enumValue(item?.priority, ["P0", "P1"], `${label}.priority`);
    const protectedIntent = textValue(item?.protected_intent, `${label}.protected_intent`);
    if (criticalRefs.has(directorRef)) reject(`duplicate director critical ref: ${directorRef}`);
    criticalRefs.set(directorRef, priority);
    return { director_ref: directorRef, priority, protected_intent: protectedIntent };
  });

  if (!Array.isArray(manifest.generation_units) || manifest.generation_units.length === 0) {
    reject("generation_units must be a non-empty array");
  }
  const unitMap = new Map();
  const normalizedUnits = manifest.generation_units.map((unit, index) => {
    const label = `generation_units[${index}]`;
    const id = textValue(unit?.id, `${label}.id`);
    if (unitMap.has(id)) reject(`duplicate generation unit id: ${id}`);
    const unitClass = enumValue(unit?.class, ["AUTO_EVENT", "AUTO_EDITED", "DIRECTED_CAPTURE"], `${label}.class`);
    const takeRole = enumValue(unit?.take_role, ["primary", "fallback", "insert"], `${label}.take_role`);
    const sceneId = textValue(unit?.scene_id, `${label}.scene_id`);
    const directorRefs = textArray(unit?.director_refs, `${label}.director_refs`);
    const editRefs = textArray(unit?.edit_refs, `${label}.edit_refs`, { allowEmpty: takeRole !== "primary" });
    const sourceRefs = textArray(unit?.source_refs, `${label}.source_refs`);
    const priority = enumValue(unit?.priority, ["P0", "P1", "P2"], `${label}.priority`);
    const profile = textValue(unit?.projection_profile, `${label}.projection_profile`);
    const doorwayMode = enumValue(unit?.doorway_mode, DOORWAY_MODES, `${label}.doorway_mode`);
    const liveFaceVisibility = enumValue(
      unit?.live_face_visibility,
      ["none_or_concealed", "visible_recognizable"],
      `${label}.live_face_visibility`,
    );
    const scaleIntent = enumValue(
      unit?.scale_intent,
      ["autonomous_close_biased", "autonomous_editing", "close", "close_up", "medium_wide_or_wider"],
      `${label}.scale_intent`,
    );
    const advancesStoryState = unit?.advances_story_state;
    if (typeof advancesStoryState !== "boolean") reject(`${label}.advances_story_state must be boolean`);
    if (takeRole !== "primary" && advancesStoryState) reject(`${label} non-primary unit cannot advance story state`);
    const protectedFacts = textArray(unit?.protected_facts, `${label}.protected_facts`);
    const selectionCriteria = textArray(unit?.selection_criteria, `${label}.selection_criteria`);
    const platformPrompt = textValue(unit?.platform_prompt, `${label}.platform_prompt`);
    rejectEditLanguage(platformPrompt, `${label}.platform_prompt`, { allowVoiceAudio: true, verifyFiles, allowNativeEdit: unitClass === "AUTO_EDITED" });
    const realizationErrors = promptRealizationDiagnostics(platformPrompt, { participants: [...Object.keys(unit.start_state?.characters ?? {}), ...Object.keys(unit.start_state?.crowd_entities ?? {})], startState: unit.start_state, endState: unit.end_state, assets: unit.assets });
    if (realizationErrors.length) reject(`${label}.platform_prompt: ${realizationErrors.join("; ")}`);
    let uploadMode;
    try { uploadMode = validateAssetUploadMode(unit, {verifyFiles}); } catch (error) { reject(`${label}: ${error.message}`); }
    const assets = validateAssets(unit?.assets, label, { verifyFiles, requireUserAssetPaths, allowEmpty: uploadMode.asset_mode === "TEXT_ONLY" });
    const handles = validateHandles(unit?.handles, label);

    const fallback = unit?.fallback;
    if (!fallback || typeof fallback !== "object" || Array.isArray(fallback)) reject(`${label}.fallback must be an object`);
    const fallbackStrategy = typeof fallback.strategy === "string" ? fallback.strategy.trim() : "";
    const fallbackUnitIds = textArray(fallback.unit_ids, `${label}.fallback.unit_ids`, { allowEmpty: true });

    if (scaleIntent === "medium_wide_or_wider" && unitClass !== "DIRECTED_CAPTURE") {
      reject(`${label} medium_wide_or_wider must be DIRECTED_CAPTURE`);
    }
    if (unitClass === "AUTO_EVENT" && scaleIntent !== "autonomous_close_biased") {
      reject(`${label} AUTO_EVENT scale_intent must be autonomous_close_biased`);
    }

    let wideVisibleFaceExceptionReason = null;
    if (liveFaceVisibility === "visible_recognizable" && scaleIntent === "medium_wide_or_wider") {
      wideVisibleFaceExceptionReason = textValue(
        unit.wide_visible_face_exception_reason,
        `${label}.wide_visible_face_exception_reason`,
      );
      if (!fallbackStrategy) {
        reject(`${label} wider visible-face exception requires a fallback strategy`);
      }
    } else if (unit.wide_visible_face_exception_reason != null) {
      reject(`${label}.wide_visible_face_exception_reason is allowed only for a wider visible-face exception`);
    }

    let acquisitionIntent = null;
    let cameraConstraint = null;
    if (unitClass === "AUTO_EVENT") {
      if (profile !== "dialogue_autocut") reject(`${label}.projection_profile must be dialogue_autocut`);
      if (unit.acquisition_intent != null || unit.dominant_camera_constraint != null) {
        reject(`${label} AUTO_EVENT cannot contain directed-capture fields`);
      }
    } else if (unitClass === "AUTO_EDITED") {
      if (profile !== "autonomous_edit_v1" || scaleIntent !== "autonomous_editing") reject(`${label} AUTO_EDITED requires autonomous_edit_v1 and autonomous_editing`);
      if (unit.acquisition_intent != null || unit.dominant_camera_constraint != null) reject(`${label} AUTO_EDITED delegates internal camera and edit choices`);
    } else {
      if (profile !== "directed_capture_v1") reject(`${label}.projection_profile must be directed_capture_v1`);
      acquisitionIntent = textValue(unit.acquisition_intent, `${label}.acquisition_intent`);
      cameraConstraint = textValue(unit.dominant_camera_constraint, `${label}.dominant_camera_constraint`);
      rejectEditLanguage(cameraConstraint, `${label}.dominant_camera_constraint`);
      if (!platformPrompt.includes(cameraConstraint)) {
        reject(`${label}.platform_prompt must contain dominant_camera_constraint verbatim`);
      }
      for (const sentence of CAMERA_FREE_SENTENCES) {
        if (platformPrompt.includes(sentence)) reject(`${label}.platform_prompt contains the incompatible camera-free global`);
      }
    }

    let doorwayDestinationAssetId = null;
    if (doorwayMode === "eliminated_or_none") {
      if (unit.doorway_destination_asset_id != null) {
        reject(`${label}.doorway_destination_asset_id is allowed only for asset_scene_exit_only`);
      }
      if (actionableDoorwayText(platformPrompt)) {
        reject(`${label} actionable doorway content requires de-door redesign or an allowed doorway_mode`);
      }
    } else if (doorwayMode === "same_side_interior_open_background") {
      if (unit.doorway_destination_asset_id != null) {
        reject(`${label}.doorway_destination_asset_id is allowed only for asset_scene_exit_only`);
      }
      if (!platformPrompt.includes("门已经敞开并保持敞开")) {
        reject(`${label} same-side interior mode must state 门已经敞开并保持敞开`);
      }
      if (!/所有动作和对白只发生在(?:室内|房间内|舱内|屋内)[^。；！？\r\n]{0,24}远离门区/u.test(platformPrompt)) {
        reject(`${label} same-side interior mode must keep all action and dialogue indoors and away from the doorway`);
      }
      const residual = stripStableDoorState(platformPrompt);
      if (DOORWAY_CROSSING_PATTERN.test(residual) || DOORWAY_OPERATION_PATTERN.test(residual) || DOORWAY_THRESHOLD_PATTERN.test(residual)) {
        reject(`${label} same-side interior mode cannot contain doorway crossing, operation, or threshold action`);
      }
    } else if (doorwayMode === "same_side_static_closed_door") {
      if (unit.doorway_destination_asset_id != null) {
        reject(`${label}.doorway_destination_asset_id is allowed only for asset_scene_exit_only`);
      }
      if (!platformPrompt.includes("门始终保持关闭")) {
        reject(`${label} same-side exterior mode must state 门始终保持关闭`);
      }
      if (!platformPrompt.includes("所有动作和对白只发生在门的同一侧")) {
        reject(`${label} static closed-door mode must keep all action and dialogue on one side while the door remains continuously closed`);
      }
      const residual = stripStableDoorState(platformPrompt);
      if (DOORWAY_CROSSING_PATTERN.test(residual) || DOORWAY_OPERATION_PATTERN.test(residual)) {
        reject(`${label} static closed-door mode cannot contain doorway crossing or operation`);
      }
    } else {
      if (unitClass !== "DIRECTED_CAPTURE" || profile !== "directed_capture_v1") {
        reject(`${label} asset_scene_exit_only must be DIRECTED_CAPTURE with directed_capture_v1`);
      }
      if (scaleIntent !== "medium_wide_or_wider") {
        reject(`${label} asset_scene_exit_only must use medium_wide_or_wider`);
      }
      if (!cameraConstraint?.includes("远景") || /(?:中景|近景|特写)/u.test(cameraConstraint)) {
        reject(`${label} asset_scene_exit_only dominant camera constraint must require 远景 and forbid medium or close scales`);
      }
      if (!platformPrompt.includes("门已经敞开并保持敞开")) {
        reject(`${label} asset_scene_exit_only must state 门已经敞开并保持敞开`);
      }
      if (!/从门内[^。；！？\r\n]{0,18}(?:出来|走出|跑出|冲出|驶出)/u.test(platformPrompt)) {
        reject(`${label} asset_scene_exit_only must show the subject exiting from inside the door`);
      }
      if (!/进入参考场景资产(?:图)?所示的/u.test(platformPrompt)) {
        reject(`${label} asset_scene_exit_only must end in the environment shown by the reference scene asset`);
      }
      if (/(?:进入门内|走进[^，。；！？\r\n]{0,8}(?:房门|舱门|闸门|车门)|从(?:室外|屋外|舱外|门外)[^，。；！？\r\n]{0,18}(?:进入|走进|跑进|冲进))/u.test(platformPrompt)) {
        reject(`${label} asset_scene_exit_only cannot reverse into a door`);
      }
      if (DOORWAY_OPERATION_PATTERN.test(stripStableDoorState(platformPrompt))) {
        reject(`${label} asset_scene_exit_only cannot open, close, or damage the door`);
      }
      if (DOORWAY_FORBIDDEN_CONCURRENT_ACTION_PATTERN.test(platformPrompt)) {
        reject(`${label} asset_scene_exit_only must contain only the exit, with no dialogue, combat, contact, prop exchange, doorway pause, or second action`);
      }
      doorwayDestinationAssetId = textValue(unit.doorway_destination_asset_id, `${label}.doorway_destination_asset_id`);
      if (!assets.some((asset) => asset.id === doorwayDestinationAssetId)) {
        reject(`${label}.doorway_destination_asset_id must refer to an asset bound to this unit`);
      }
    }

    const normalized = {
      ...unit,
      id,
      class: unitClass,
      take_role: takeRole,
      scene_id: sceneId,
      director_refs: directorRefs,
      edit_refs: editRefs,
      source_refs: sourceRefs,
      priority,
      projection_profile: profile,
      doorway_mode: doorwayMode,
      live_face_visibility: liveFaceVisibility,
      scale_intent: scaleIntent,
      advances_story_state: advancesStoryState,
      protected_facts: protectedFacts,
      ...uploadMode,
      assets,
      platform_prompt: platformPrompt,
      selection_criteria: selectionCriteria,
      handles,
      fallback: { strategy: fallbackStrategy, unit_ids: fallbackUnitIds },
      ...(acquisitionIntent ? { acquisition_intent: acquisitionIntent } : {}),
      ...(cameraConstraint ? { dominant_camera_constraint: cameraConstraint } : {}),
      ...(wideVisibleFaceExceptionReason ? { wide_visible_face_exception_reason: wideVisibleFaceExceptionReason } : {}),
      ...(doorwayDestinationAssetId ? { doorway_destination_asset_id: doorwayDestinationAssetId } : {}),
    };
    unitMap.set(id, normalized);
    return normalized;
  });

  if (!Array.isArray(manifest.post_units)) reject("post_units must be an array (empty when no post material is required)");
  const normalizedPostUnits = manifest.post_units.map((unit, index) => {
    const label = `post_units[${index}]`;
    const id = textValue(unit?.id, `${label}.id`);
    if (unitMap.has(id)) reject(`duplicate production unit id: ${id}`);
    const kind = enumValue(unit.kind, ["text", "still"], `${label}.kind`);
    if (unit.platform_prompt != null) reject(`${label} cannot contain a platform_prompt`);
    const item = {...unit, id, kind,
      content: textValue(unit.content, `${label}.content`),
      source_refs: textArray(unit.source_refs, `${label}.source_refs`),
      director_refs: textArray(unit.director_refs, `${label}.director_refs`),
      edit_refs: textArray(unit.edit_refs, `${label}.edit_refs`),
      speech_ids: textArray(unit.speech_ids, `${label}.speech_ids`, {allowEmpty:true}),
      selection_criteria: textArray(unit.selection_criteria, `${label}.selection_criteria`),
      handles: validateHandles(unit.handles, label)};
    unitMap.set(id, item);
    return item;
  });

  if (!Array.isArray(manifest.edit_units) || manifest.edit_units.length === 0) {
    reject("edit_units must be a non-empty array");
  }
  const editMap = new Map();
  const transitionTypes = ["START", "CUT", "HARD_CUT", "MATCH_CUT", "J_CUT", "L_CUT", "SOUND_BRIDGE", "DISSOLVE", "FADE_TO_BLACK", "HOLD"];
  const normalizedEditUnits = manifest.edit_units.map((edit, index) => {
    const label = `edit_units[${index}]`;
    const id = textValue(edit?.id, `${label}.id`);
    if (editMap.has(id)) reject(`duplicate edit unit id: ${id}`);
    const order = numberValue(edit?.order, `${label}.order`, { positive: true });
    if (!Number.isInteger(order) || order !== index + 1) reject(`${label}.order must equal ${index + 1}`);
    const plannedDuration = numberValue(edit?.planned_duration_s, `${label}.planned_duration_s`, { positive: true });
    const pictureIds = textArray(edit?.picture_unit_ids, `${label}.picture_unit_ids`);
    const audioIds = textArray(edit?.audio_unit_ids, `${label}.audio_unit_ids`, { allowEmpty: true });
    for (const unitId of [...pictureIds, ...audioIds]) {
      if (!unitMap.has(unitId)) reject(`${label} references unknown generation unit: ${unitId}`);
    }
    const transition = edit?.transition_from_previous;
    if (!transition || typeof transition !== "object" || Array.isArray(transition)) {
      reject(`${label}.transition_from_previous must be an object`);
    }
    const type = enumValue(transition.type, transitionTypes, `${label}.transition_from_previous.type`);
    if (index === 0 && type !== "START") reject("first edit unit transition must be START");
    if (index > 0 && type === "START") reject(`${label} cannot use START after the first edit unit`);
    const reason = type === "START" ? (typeof transition.reason === "string" ? transition.reason.trim() : "") : textValue(transition.reason, `${label}.transition_from_previous.reason`);

    if (type === "J_CUT") {
      const sourceId = textValue(transition.audio_source_unit_id, `${label}.transition_from_previous.audio_source_unit_id`);
      const lead = numberValue(transition.audio_lead_s, `${label}.transition_from_previous.audio_lead_s`, { positive: true });
      if (!audioIds.includes(sourceId)) reject(`${label} J_CUT source must be listed in audio_unit_ids`);
      if (unitMap.get(sourceId).handles.audio_head_s < lead) reject(`${label} J_CUT audio lead exceeds source audio_head_s`);
    }
    if (type === "L_CUT") {
      const sourceId = textValue(transition.audio_source_unit_id, `${label}.transition_from_previous.audio_source_unit_id`);
      const carry = numberValue(transition.audio_carry_s, `${label}.transition_from_previous.audio_carry_s`, { positive: true });
      if (!audioIds.includes(sourceId)) reject(`${label} L_CUT source must be listed in audio_unit_ids`);
      if (unitMap.get(sourceId).handles.audio_tail_s < carry) reject(`${label} L_CUT audio carry exceeds source audio_tail_s`);
    }

    const normalized = {
      ...edit,
      id,
      order,
      planned_duration_s: plannedDuration,
      picture_unit_ids: pictureIds,
      audio_unit_ids: audioIds,
      transition_from_previous: { ...transition, type, reason },
      cut_motive: textValue(edit?.cut_motive, `${label}.cut_motive`),
      fallback: typeof edit?.fallback === "string" ? edit.fallback.trim() : "",
    };
    editMap.set(id, normalized);
    return normalized;
  });

  const actualRuntime = normalizedEditUnits.reduce((sum, edit) => sum + edit.planned_duration_s, 0);
  if (Math.abs(actualRuntime - targetRuntime) > 0.001) {
    reject(`edit runtime ${actualRuntime} does not equal target_runtime_s ${targetRuntime}`);
  }

  for (const unit of [...normalizedUnits, ...normalizedPostUnits]) {
    for (const editRef of unit.edit_refs) {
      const edit = editMap.get(editRef);
      if (!edit) reject(`generation unit ${unit.id} references unknown edit unit: ${editRef}`);
      if (![...edit.picture_unit_ids, ...edit.audio_unit_ids].includes(unit.id)) {
        reject(`generation unit ${unit.id} names ${editRef}, but that edit unit does not use it`);
      }
    }
    if (unit.take_role === "primary") {
      const used = normalizedEditUnits.some((edit) => [...edit.picture_unit_ids, ...edit.audio_unit_ids].includes(unit.id));
      if (!used) reject(`primary generation unit ${unit.id} is unused by the edit plan`);
    }
  }

  if (!Array.isArray(manifest.coverage) || manifest.coverage.length === 0) {
    reject("coverage must be a non-empty array");
  }
  const coverageRefs = new Set();
  const normalizedCoverage = manifest.coverage.map((coverage, index) => {
    const label = `coverage[${index}]`;
    const directorRef = textValue(coverage?.director_ref, `${label}.director_ref`);
    if (!criticalRefs.has(directorRef)) reject(`${label} references non-critical or unknown director ref: ${directorRef}`);
    if (coverageRefs.has(directorRef)) reject(`duplicate coverage row for director ref: ${directorRef}`);
    coverageRefs.add(directorRef);
    const priority = enumValue(coverage?.priority, ["P0", "P1"], `${label}.priority`);
    if (priority !== criticalRefs.get(directorRef)) reject(`${label}.priority does not match director_critical_refs`);
    const primaryIds = textArray(coverage?.primary_unit_ids, `${label}.primary_unit_ids`);
    const fallbackIds = textArray(coverage?.fallback_unit_ids, `${label}.fallback_unit_ids`, { allowEmpty: true });
    const acceptance = textArray(coverage?.acceptance_criteria, `${label}.acceptance_criteria`);
    const editRefs = textArray(coverage?.edit_refs, `${label}.edit_refs`);
    const fallbackStrategy = typeof coverage?.fallback_strategy === "string" ? coverage.fallback_strategy.trim() : "";
    if (priority === "P0" && fallbackStrategy === "") reject(`${label}.fallback_strategy is required for P0`);
    for (const id of [...primaryIds, ...fallbackIds]) {
      if (!unitMap.has(id)) reject(`${label} references unknown generation unit: ${id}`);
    }
    for (const id of primaryIds) {
      const unit = unitMap.get(id);
      if (!unit.director_refs.includes(directorRef)) reject(`${label} primary unit ${id} does not carry ${directorRef}`);
    }
    for (const editRef of editRefs) {
      if (!editMap.has(editRef)) reject(`${label} references unknown edit unit: ${editRef}`);
    }
    return {
      director_ref: directorRef,
      priority,
      primary_unit_ids: primaryIds,
      fallback_unit_ids: fallbackIds,
      acceptance_criteria: acceptance,
      edit_refs: editRefs,
      fallback_strategy: fallbackStrategy,
    };
  });

  for (const directorRef of criticalRefs.keys()) {
    if (!coverageRefs.has(directorRef)) reject(`missing coverage row for director critical ref: ${directorRef}`);
  }
  for (const unit of normalizedUnits) {
    for (const fallbackId of unit.fallback.unit_ids) {
      if (!unitMap.has(fallbackId)) reject(`generation unit ${unit.id} fallback references unknown unit: ${fallbackId}`);
    }
  }

  if (project === "雾峡轨城") {
    const jcut = /(?:J[ _-]?cut|J切|声音提前|音轨提前|下一场[^，。；\n]{0,12}(?:声|音)[^，。；\n]{0,12}(?:先入|先响|提前)|(?:先入|提前)[^，。；\n]{0,12}下一场[^，。；\n]{0,12}(?:声|音))/iu;
    for (const edit of manifest.edit_units) {
      if (edit.transition_from_previous?.type === "J_CUT" || edit.transition_from_previous?.audio_lead_s > 0) reject("WXGC_J_CUT_FORBIDDEN: no incoming sound lead");
    }
    const planText = [manifest.title, ...manifest.generation_units.map(u=>u.platform_prompt.replace(/“[^”]*”/gu, "")), ...manifest.edit_units.map(e=>JSON.stringify([e.cut_motive,e.transition_from_previous]))].join("\n");
    for (const clause of planText.split(/[，。；\n]/u)) if(jcut.test(clause) && !/(?:禁用|禁止|不得|不使用|不采用|不用|不要)/u.test(clause)) reject("WXGC_J_CUT_FORBIDDEN: explicit or disguised J-cut");
  }
  try {
    validateProductionHandoff(manifest, { screenplayText: verifyFiles ? fs.readFileSync(screenplay.path, "utf8") : undefined });
  } catch (error) { reject(error.message); }

  return {
    ...manifest,
    package_id: packageId,
    title,
    project,
    status: "executable",
    production_profile: productionProfile,
    runtime_status: runtimeStatus,
    target_runtime_s: targetRuntime,
    sources: { screenplay, director, asset_handoff: assetHandoff },
    director_critical_refs: normalizedCriticalRefs,
    generation_units: normalizedUnits,
    edit_units: normalizedEditUnits,
    post_units: normalizedPostUnits,
    coverage: normalizedCoverage,
    unresolved_assumptions: unresolved,
  };
}

export function loadAndValidatePackage(inputPath, options = {}) {
  const absolutePath = path.resolve(inputPath);
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    reject(`cannot read manifest: ${error.message}`);
  }
  return validatePackage(manifest, options);
}

function main() {
  const input = process.argv[2];
  if (!input) {
    process.stderr.write("usage: validate_director_seedance_package.mjs <manifest.json>\n");
    process.exit(2);
  }
  try {
    const manifest = loadAndValidatePackage(input);
    process.stdout.write(`OK: ${manifest.generation_units.length} generation unit(s), ${manifest.edit_units.length} edit unit(s), ${manifest.coverage.length} coverage row(s), runtime ${manifest.target_runtime_s}s\n`);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
