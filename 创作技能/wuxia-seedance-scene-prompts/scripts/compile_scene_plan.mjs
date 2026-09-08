#!/usr/bin/env node

import fs from "node:fs";
import { eventRealizationDiagnostics, taskCompletionDiagnostics, physicalStateDiagnostics } from "./prompt_realization.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { criticalActionCausalityDiagnostics } from "./action_causality.mjs";
import { doorwayAutocutDiagnostic, hasContinuouslyClosedDoorState, positionTouchesDoorway } from "./doorway_policy.mjs";
import { visualIdentityDiagnostics } from "./visual_identity.mjs";

const PROFILES = new Set(["continuity", "production"]);
const PROJECTION_MODE = "dialogue_autocut";

const GAZE_FRAMING_VERB_PATTERN = /(?:看着|看向|望着|望向|盯着|盯向|注视|凝视|对视|(?:目光|视线|眼神)[^，。；！？\r\n]{0,12}(?:落在|落向|投向|转向|朝向|看向|望向|盯着|注视|凝视))/u;
const PERFORMANCE_VIEWPOINT_TERM_PATTERN = /(?:正面|背面|侧面)/u;

const PROMPT_PROFILES = new Set(["quick", "continuity", "production"]);
const CALIBRATION_STATUSES = new Set(["uncalibrated", "provisional", "calibrated"]);
const CALIBRATION_SCENE_CLASSES = new Set(["dialogue", "dialogue_action", "physical_action", "multi_event"]);
const BARE_BOUNDARY_POSITION_PATTERN = /(?:门口|门边|门旁|门槛|入口处|入口旁|入口附近|舱口|闸门口)(?!内侧|外侧)/u;
const BOUNDARY_ANCHOR_PATTERN = /(?:门|门洞|门框|门槛|入口|通道口|舱口|闸门|闸口)/u;
const BOUNDARY_RELATION_STATES = new Set(["stationary", "straddling", "crossing"]);
const EXPLICIT_BOUNDARY_SIDE_TOKEN_PATTERN = /(?:[\p{Script=Han}A-Za-z0-9_-]{1,16}?侧|舱内|舱外|屋内|屋外|室内|室外|房内|房外)/gu;
const NON_OWNERSHIP_SIDE_PATTERN = /(?:左|右|前|后|上|下)侧$/u;
const BOUNDARY_CROSSING_ACTION_PATTERN = /(?:穿过|跨过|越过|走进|走出|进入|离开|通过)/u;
const BOUNDARY_POSITION_ACTION_PATTERN = /(?:位于|站在|停在|蹲在|跪在|坐在|贴在|靠在|守在|来到|留在|处于|跨在|卡在|走到|移到)/u;
const BOUNDARY_PROXIMITY_PATTERN = /(?:附近|中央|正中|旁边|边上|门旁|门边|前方|后方)/u;
const BOUNDARY_STRADDLING_PATTERN = /(?:跨在|横跨|卡在|骑跨|门洞中央|门洞正中)/u;

const DEFENSIVE_FOOTWEAR_CONTINUITY_PATTERNS = [
  /(?:双脚|左脚|右脚)[^，。；！？\r\n"]{0,12}(?:仍|依然|始终)(?:穿|穿着)[^，。；！？\r\n"]{0,8}(?:鞋|靴)/u,
  /(?:仍|依然|始终)(?:穿|穿着)[^，。；！？\r\n"]{0,8}(?:鞋|靴)/u,
  /(?:鞋子?|靴子?|短靴|长靴|运动鞋|高跟鞋|皮鞋)[^，。；！？\r\n"]{0,12}(?:仍在脚上|依然在脚上|没有脱落|未脱落|保持附着|保持穿着)/u
];
const COMPILER_OWNED_BLOCK_FIELDS = ["start_state", "end_state", "opening_actor_states", "opening_speaker_states", "opening_crowd_states", "required_assets"];
const COMPILER_OWNED_ROOT_FIELDS = ["version", "coverage", "clips"];
const COMPILER_OWNED_COMPATIBILITY_FIELDS = ["clip_id", "duration_s"];
const ROOT_SPECIAL_RULE_FIELDS = ["special_rules", "scene_special_rules", "global_special_rules"];
const ROOT_MECHANISM_REQUIREMENT_FIELDS = ["mechanism_requirements", "scene_mechanism_requirements", "global_mechanism_requirements"];
const ENTITY_STATE_COLLECTIONS = ["characters", "crowd_entities", "creatures", "entities", "equipment", "mecha", "props", "robots", "vehicles"];
const CROWD_ENTITY_KINDS = new Set(["tracked_extra", "crowd_group"]);
const MECHANISM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const MECHANISM_REQUIREMENT_FIELDS = new Set(["id", "source_refs", "rule", "persistent_state_paths"]);
const SOURCE_ACTION_LOCK_FIELDS = new Set(["id", "source_ref", "required_terms"]);
const ASSET_COVERAGE_RULE_FIELDS = new Set(["asset_id", "path", "trigger_terms", "state_conditions", "global_forbidden_terms"]);
const GLOBAL_CAMERA_DELEGATION_CONTROL = "对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。";
const GLOBAL_CAMERA_PREFERENCE_CONTROL = "镜头偏好手持镜头特写和近景。无任何中景 远景。";
const GLOBAL_ENTITY_NOUN_PATTERN = /(?:角色|人物|演员|异兽|阿尔法|机器人|机甲|工作人员|队员|巡检(?:机器人|单位|员)?|飞镖|关节鞭|鞭子|颈环|服装|裙摆|鞋靴|面孔|皮肤|制服)/u;
const GLOBAL_ENTITY_CONSTRAINT_PATTERN = /(?:必须|不得|禁止|严禁|不应|不能|不可|只允许|仅允许|始终|永不|唯一|严格区分|不生成|不要生成|不呈现)/u;
const SPEECH_QUOTE_PATTERN = /“([^”]*)”/gu;
const SPEECH_ATTRIBUTION_PATTERN = /([\p{Script=Han}A-Za-z0-9·_-]{1,24})（([^（）\r\n]+)）说：$/u;
const ATTRIBUTED_DIALOGUE_SPAN_PATTERN = /[\p{Script=Han}A-Za-z0-9·_-]{1,24}（[^（）\r\n]+）说：“[^”]*”/gu;
const RESERVED_STATE_FIELDS = new Set(["target_duration_s"]);
const UNSAFE_PATH_PARTS = new Set(["__proto__", "prototype", "constructor"]);

class CompileError extends Error {
  constructor(message) {
    super(message);
    this.name = "CompileError";
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNormalizedString(value) {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function validateBlockSpecialRules(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new CompileError(`${label}.special_rules must be an array`);
  const seen = new Set();
  return value.map((rule, index) => {
    if (!isNormalizedString(rule) || /[\r\n]/u.test(rule)) {
      throw new CompileError(`${label}.special_rules[${index}] must be a nonempty normalized single-line string`);
    }
    if (rule.startsWith("特殊规则：")) {
      throw new CompileError(`${label}.special_rules[${index}] must omit the projected 特殊规则： label`);
    }
    if (seen.has(rule)) throw new CompileError(`${label}.special_rules contains duplicate rule ${rule}`);
    seen.add(rule);
    return rule;
  });
}

function validateSourceActionLocks(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new CompileError("source_action_locks must be an array");
  const ids = new Set();
  return value.map((lock, index) => {
    const label = `source_action_locks[${index}]`;
    if (!isObject(lock)) throw new CompileError(`${label} must be an object`);
    for (const field of Object.keys(lock)) {
      if (!SOURCE_ACTION_LOCK_FIELDS.has(field)) throw new CompileError(`${label}: unsupported field ${field}`);
    }
    if (!isNormalizedString(lock.id) || !MECHANISM_ID_PATTERN.test(lock.id)) {
      throw new CompileError(`${label}.id must be a stable ASCII source-action id`);
    }
    if (ids.has(lock.id)) throw new CompileError(`source_action_locks contains duplicate id ${lock.id}`);
    ids.add(lock.id);
    if (!isNormalizedString(lock.source_ref) || /[\r\n]/u.test(lock.source_ref)) {
      throw new CompileError(`${label}.source_ref must be a normalized single-line director or source reference`);
    }
    if (!Array.isArray(lock.required_terms) || lock.required_terms.length === 0) {
      throw new CompileError(`${label}.required_terms must be a non-empty array`);
    }
    const requiredTerms = [];
    const seenTerms = new Set();
    for (const [termIndex, term] of lock.required_terms.entries()) {
      if (!isNormalizedString(term) || /[\r\n]/u.test(term)) {
        throw new CompileError(`${label}.required_terms[${termIndex}] must be a normalized single-line exact term`);
      }
      if (seenTerms.has(term)) throw new CompileError(`${label}.required_terms contains duplicate term ${term}`);
      seenTerms.add(term);
      requiredTerms.push(term);
    }
    return { id: lock.id, source_ref: lock.source_ref, required_terms: requiredTerms };
  });
}

function validateSourceActionLockCoverage(sourceActionLocks, blocks) {
  const locksById = new Map(sourceActionLocks.map((lock) => [lock.id, lock]));
  const actionTextByLockId = new Map(sourceActionLocks.map((lock) => [lock.id, []]));
  for (const [blockIndex, block] of blocks.entries()) {
    for (const [eventIndex, event] of block.events.entries()) {
      const label = `blocks[${blockIndex}].events[${eventIndex}]`;
      const lockIds = event.source_action_lock_ids ?? [];
      if (!Array.isArray(lockIds)) throw new CompileError(`${label}.source_action_lock_ids must be an array`);
      const seenIds = new Set();
      for (const [lockIndex, lockId] of lockIds.entries()) {
        const itemLabel = `${label}.source_action_lock_ids[${lockIndex}]`;
        if (!isNormalizedString(lockId) || !MECHANISM_ID_PATTERN.test(lockId)) {
          throw new CompileError(`${itemLabel} must be a stable ASCII source-action id`);
        }
        if (seenIds.has(lockId)) throw new CompileError(`${label}.source_action_lock_ids contains duplicate id ${lockId}`);
        seenIds.add(lockId);
        if (!locksById.has(lockId)) throw new CompileError(`${itemLabel}: SOURCE_ACTION_LOCK_UNKNOWN ${lockId}`);
        actionTextByLockId.get(lockId).push(event.visible_action);
      }
    }
  }
  for (const lock of sourceActionLocks) {
    const actionTexts = actionTextByLockId.get(lock.id);
    if (actionTexts.length === 0) {
      throw new CompileError(`source_action_lock ${lock.id}: SOURCE_ACTION_LOCK_UNMAPPED`);
    }
    const combinedAction = actionTexts.join("\n");
    for (const term of lock.required_terms) {
      if (!combinedAction.includes(term)) {
        throw new CompileError(`source_action_lock ${lock.id}: SOURCE_ACTION_LOCK_TERM_MISSING ${term}`);
      }
    }
  }
}

function validateBlockMechanismRequirements(value, block, label, authoredSpecialRules, knownCharacterIds, knownCrowdIds) {
  if (value !== undefined && !Array.isArray(value)) throw new CompileError(`${label}.mechanism_requirements must be an array`);
  const authoredRequirements = value ?? [];

  const requirements = [];
  const requirementIds = new Set();
  const requirementRules = new Set();
  const triggerEventIdsByMechanism = new Map();

  for (const [eventIndex, event] of block.events.entries()) {
    if (!own(event, "mechanism_id")) continue;
    if (!isNormalizedString(event.mechanism_id) || !MECHANISM_ID_PATTERN.test(event.mechanism_id)) {
      throw new CompileError(`${label}.events[${eventIndex}].mechanism_id must be a stable ASCII mechanism id`);
    }
    const triggerIds = triggerEventIdsByMechanism.get(event.mechanism_id) ?? [];
    triggerIds.push(event.id);
    triggerEventIdsByMechanism.set(event.mechanism_id, triggerIds);
  }

  for (const [index, requirement] of authoredRequirements.entries()) {
    const requirementLabel = `${label}.mechanism_requirements[${index}]`;
    if (!isObject(requirement)) throw new CompileError(`${requirementLabel} must be an object`);
    for (const field of Object.keys(requirement)) {
      if (!MECHANISM_REQUIREMENT_FIELDS.has(field)) {
        throw new CompileError(`${requirementLabel}: unsupported field ${field}`);
      }
    }
    if (!isNormalizedString(requirement.id) || !MECHANISM_ID_PATTERN.test(requirement.id)) {
      throw new CompileError(`${requirementLabel}.id must be a stable ASCII mechanism id`);
    }
    if (requirementIds.has(requirement.id)) {
      throw new CompileError(`${label}.mechanism_requirements contains duplicate id ${requirement.id}`);
    }
    requirementIds.add(requirement.id);

    if (!Array.isArray(requirement.source_refs) || requirement.source_refs.length === 0) {
      throw new CompileError(`${requirementLabel}.source_refs must be a non-empty array`);
    }
    const sourceRefs = [];
    const seenSourceRefs = new Set();
    for (const [sourceIndex, sourceRef] of requirement.source_refs.entries()) {
      if (!isNormalizedString(sourceRef) || /[\r\n]/u.test(sourceRef)) {
        throw new CompileError(`${requirementLabel}.source_refs[${sourceIndex}] must be a normalized single-line source reference`);
      }
      if (seenSourceRefs.has(sourceRef)) {
        throw new CompileError(`${requirementLabel}.source_refs contains duplicate source reference ${sourceRef}`);
      }
      seenSourceRefs.add(sourceRef);
      sourceRefs.push(sourceRef);
    }

    if (!isNormalizedString(requirement.rule) || /[\r\n]/u.test(requirement.rule)) {
      throw new CompileError(`${requirementLabel}.rule must be a nonempty normalized single-line string`);
    }
    if (requirement.rule.startsWith("特殊规则：")) {
      throw new CompileError(`${requirementLabel}.rule must omit the projected 特殊规则： label`);
    }
    if (authoredSpecialRules.includes(requirement.rule)) {
      throw new CompileError(`${requirementLabel}: MECHANISM_RULE_DUPLICATED_IN_SPECIAL_RULES`);
    }
    if (requirementRules.has(requirement.rule)) {
      throw new CompileError(`${label}.mechanism_requirements contains duplicate rule ${requirement.rule}`);
    }
    requirementRules.add(requirement.rule);

    const persistentStatePaths = requirement.persistent_state_paths ?? [];
    if (!Array.isArray(persistentStatePaths)) {
      throw new CompileError(`${requirementLabel}.persistent_state_paths must be an array`);
    }
    const normalizedPersistentStatePaths = [];
    const seenPersistentStatePaths = new Set();
    for (const [pathIndex, rawPath] of persistentStatePaths.entries()) {
      const pathLabel = `${requirementLabel}.persistent_state_paths[${pathIndex}]`;
      const parts = parseStatePath(rawPath, pathLabel);
      assertKnownStatePath(parts, knownCharacterIds, knownCrowdIds, pathLabel);
      if (seenPersistentStatePaths.has(rawPath)) {
        throw new CompileError(`${requirementLabel}.persistent_state_paths contains duplicate path ${rawPath}`);
      }
      seenPersistentStatePaths.add(rawPath);
      normalizedPersistentStatePaths.push(rawPath);
    }

    requirements.push({
      id: requirement.id,
      source_refs: sourceRefs,
      rule: requirement.rule,
      persistent_state_paths: normalizedPersistentStatePaths
    });
  }

  for (const mechanismId of triggerEventIdsByMechanism.keys()) {
    if (!requirementIds.has(mechanismId)) {
      throw new CompileError(`${label}: MECHANISM_REQUIREMENT_MISSING for event mechanism_id ${mechanismId}`);
    }
  }

  return requirements.map((requirement, index) => {
    const requirementLabel = `${label}.mechanism_requirements[${index}]`;
    const triggerEventIds = triggerEventIdsByMechanism.get(requirement.id) ?? [];
    if (triggerEventIds.length === 0) {
      throw new CompileError(`${requirementLabel}: STALE_MECHANISM_REQUIREMENT has no tagged event in this block`);
    }
    const triggerEvents = block.events.filter((event) => event.mechanism_id === requirement.id);
    for (const statePath of requirement.persistent_state_paths) {
      const hasTriggerEffect = triggerEvents.some((event) => (event.effects ?? []).some((effect) => effect?.path === statePath));
      if (!hasTriggerEffect) {
        throw new CompileError(`${requirementLabel}: MECHANISM_PERSISTENT_STATE_PATH_REQUIRES_TRIGGER_EFFECT ${statePath}`);
      }
    }
    return { ...requirement, trigger_event_ids: triggerEventIds };
  });
}

function validateGlobalScope(globalText, initialState, assetCoverageRules) {
  const scopedText = globalText
    .split(GLOBAL_CAMERA_DELEGATION_CONTROL).join("")
    .split(GLOBAL_CAMERA_PREFERENCE_CONTROL).join("");
  const entityNames = new Set();
  for (const collection of ENTITY_STATE_COLLECTIONS) {
    const entries = initialState?.[collection];
    if (!isObject(entries)) continue;
    for (const id of Object.keys(entries)) {
      if (isNormalizedString(id)) entityNames.add(id);
    }
  }
  for (const name of entityNames) {
    if (scopedText.includes(name)) {
      throw new CompileError(`ENTITY_RULE_IN_GLOBAL: ${name} belongs in blocks[].special_rules or world state, not scene_global_master`);
    }
  }
  for (const clause of scopedText.split(/[。；！？\r\n]+/u)) {
    if (GLOBAL_ENTITY_NOUN_PATTERN.test(clause) && GLOBAL_ENTITY_CONSTRAINT_PATTERN.test(clause)) {
      throw new CompileError(`ENTITY_RULE_IN_GLOBAL: move object-specific constraint to blocks[].special_rules: ${clause.trim()}`);
    }
  }
  for (const rule of assetCoverageRules) {
    for (const term of rule.global_forbidden_terms ?? []) {
      if (scopedText.includes(term)) {
        throw new CompileError(`MUTABLE_VISUAL_STATE_IN_GLOBAL: ${term} belongs in world state and state-conditioned asset coverage, not scene_global_master`);
      }
    }
  }
}

function clone(value) {
  return structuredClone(value);
}

function validateAssetCoverageRules(value, initialState) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new CompileError("asset_coverage_rules must be an array");
  const assetIds = new Set();
  const triggerOwners = [];
  return value.map((rule, index) => {
    const label = `asset_coverage_rules[${index}]`;
    if (!isObject(rule)) throw new CompileError(`${label} must be an object`);
    for (const field of Object.keys(rule)) {
      if (!ASSET_COVERAGE_RULE_FIELDS.has(field)) throw new CompileError(`${label}: unsupported field ${field}`);
    }
    if (!isNormalizedString(rule.asset_id) || /[\r\n]/u.test(rule.asset_id)) {
      throw new CompileError(`${label}.asset_id must be a normalized single-line string`);
    }
    if (assetIds.has(rule.asset_id)) throw new CompileError(`asset_coverage_rules contains duplicate asset_id ${rule.asset_id}`);
    assetIds.add(rule.asset_id);
    if (!isNormalizedString(rule.path) || !path.isAbsolute(rule.path) || !/\.(avif|gif|jpe?g|png|webp)$/iu.test(rule.path)) {
      throw new CompileError(`${label}.path must be an absolute image path`);
    }
    const rawTriggerTerms = rule.trigger_terms ?? [];
    if (!Array.isArray(rawTriggerTerms)) throw new CompileError(`${label}.trigger_terms must be an array`);
    const seenTerms = new Set();
    const triggerTerms = rawTriggerTerms.map((term, termIndex) => {
      if (!isNormalizedString(term) || /[\r\n]/u.test(term)) {
        throw new CompileError(`${label}.trigger_terms[${termIndex}] must be a normalized single-line string`);
      }
      if (seenTerms.has(term)) throw new CompileError(`${label}.trigger_terms contains duplicate term ${term}`);
      seenTerms.add(term);
      return term;
    });
    const rawStateConditions = rule.state_conditions ?? [];
    if (!Array.isArray(rawStateConditions)) throw new CompileError(`${label}.state_conditions must be an array`);
    const stateConditions = rawStateConditions.map((condition, conditionIndex) => {
      const conditionLabel = `${label}.state_conditions[${conditionIndex}]`;
      if (!isObject(condition)) throw new CompileError(`${conditionLabel} must be an object`);
      for (const field of Object.keys(condition)) {
        if (!["path", "equals"].includes(field)) throw new CompileError(`${conditionLabel}: unsupported field ${field}`);
      }
      const parts = parseStatePath(condition.path, `${conditionLabel}.path`);
      if (!isNormalizedString(condition.equals)) throw new CompileError(`${conditionLabel}.equals must be a nonempty normalized string`);
      if (getAt(initialState, parts) === undefined) {
        throw new CompileError(`${conditionLabel}.path must exist in initial_state: ${condition.path}`);
      }
      return { path: condition.path, equals: condition.equals };
    });
    if (triggerTerms.length === 0 && stateConditions.length === 0) {
      throw new CompileError(`${label} requires trigger_terms, state_conditions, or both`);
    }
    const globalForbiddenTerms = rule.global_forbidden_terms ?? [];
    if (!Array.isArray(globalForbiddenTerms)) throw new CompileError(`${label}.global_forbidden_terms must be an array`);
    const normalizedForbiddenTerms = globalForbiddenTerms.map((term, termIndex) => {
      if (!isNormalizedString(term) || /[\r\n]/u.test(term)) {
        throw new CompileError(`${label}.global_forbidden_terms[${termIndex}] must be a normalized single-line string`);
      }
      return term;
    });
    if (new Set(normalizedForbiddenTerms).size !== normalizedForbiddenTerms.length) {
      throw new CompileError(`${label}.global_forbidden_terms contains duplicates`);
    }
    if (stateConditions.length > 0 && normalizedForbiddenTerms.length === 0) {
      throw new CompileError(`${label}.global_forbidden_terms is required for state-conditioned visual assets`);
    }
    const conditionSignature = JSON.stringify(stateConditions);
    for (const term of triggerTerms) {
      const collision = triggerOwners.find((owner) => (
        (term.includes(owner.term) || owner.term.includes(term))
        && (conditionSignature === "[]" || owner.conditionSignature === "[]" || conditionSignature === owner.conditionSignature)
      ));
      if (collision) {
        throw new CompileError(`${label}.trigger_terms: ASSET_TRIGGER_TERM_COLLISION ${term} overlaps ${collision.term} from ${collision.assetId}`);
      }
    }
    triggerOwners.push(...triggerTerms.map((term) => ({ term, assetId: rule.asset_id, conditionSignature })));
    return {
      asset_id: rule.asset_id,
      path: rule.path,
      trigger_terms: triggerTerms,
      state_conditions: stateConditions,
      global_forbidden_terms: normalizedForbiddenTerms,
    };
  });
}

function collectStringValues(value, destination) {
  if (typeof value === "string") {
    destination.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const child of value) collectStringValues(child, destination);
    return;
  }
  if (!isObject(value)) return;
  for (const child of Object.values(value)) collectStringValues(child, destination);
}

function visibleStateText(state) {
  const strings = [];
  collectStringValues(state?.scene?.handoff, strings);
  for (const [collection, entries] of Object.entries(state ?? {})) {
    if (!isObject(entries) || collection === "scene" || collection === "permissions") continue;
    for (const entity of Object.values(entries)) {
      if (!isObject(entity) || entity.present === false || entity.visible === false) continue;
      if (collection !== "characters" && collection !== "crowd_entities" && entity.visible !== true) continue;
      const { knowledge: _knowledge, emotion: _emotion, ...visibleState } = entity;
      collectStringValues(visibleState, strings);
    }
  }
  return strings.join("\n");
}

function stripQuotedDialogue(text) {
  return String(text ?? "")
    .replace(/“[^”]*”/gu, "")
    .replace(/"[^"\r\n]*"/gu, "");
}

function deriveRequiredAssets(assetCoverageRules, startState, block, endState, stateSnapshots) {
  const evidenceTexts = [
    ["start_state", visibleStateText(startState)],
    ...block.events.map((event) => [`event:${event.id}`, stripQuotedDialogue(event.visible_action)]),
    ["special_rules", (block.special_rules ?? []).join("\n")],
    ["end_state", visibleStateText(endState)]
  ];
  return assetCoverageRules.flatMap((rule) => {
    const matchedTerms = rule.trigger_terms.filter((term) => evidenceTexts.some(([, text]) => text.includes(term)));
    if (rule.trigger_terms.length > 0 && matchedTerms.length === 0) return [];
    const matchedStateSnapshots = rule.state_conditions.length > 0
      ? (stateSnapshots ?? [["start_state", startState], ["end_state", endState]])
          .filter(([, state]) => rule.state_conditions.every((condition) => equal(getAt(state, condition.path.split(".")), condition.equals)))
          .map(([label]) => label)
      : [];
    if (rule.state_conditions.length > 0 && matchedStateSnapshots.length === 0) return [];
    const evidence = evidenceTexts
      .filter(([, text]) => matchedTerms.some((term) => text.includes(term)))
      .map(([label]) => label);
    return [{
      id: rule.asset_id,
      path: rule.path,
      matched_terms: matchedTerms,
      ...(rule.state_conditions.length > 0 ? { matched_state_conditions: clone(rule.state_conditions) } : {}),
      evidence: [...new Set([...evidence, ...matchedStateSnapshots])]
    }];
  });
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (isObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function equal(a, b) {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function parseStatePath(rawPath, label) {
  if (!isNormalizedString(rawPath)) throw new CompileError(`${label}: path must be a nonempty normalized string`);
  const parts = rawPath.split(".");
  if (parts.some((part) => !part || UNSAFE_PATH_PARTS.has(part))) {
    throw new CompileError(`${label}: unsafe or malformed path ${rawPath}`);
  }
  if (parts.some((part) => RESERVED_STATE_FIELDS.has(part))) {
    throw new CompileError(`${label}: target duration cannot be read from or written into world state`);
  }
  return parts;
}

function getAt(root, parts) {
  let current = root;
  for (const part of parts) {
    if ((current === null || typeof current !== "object") || !own(current, part)) return undefined;
    current = current[part];
  }
  return current;
}

function explicitBoundarySides(text) {
  return [...new Set((text.match(EXPLICIT_BOUNDARY_SIDE_TOKEN_PATTERN) ?? [])
    .filter((token) => !NON_OWNERSHIP_SIDE_PATTERN.test(token)))];
}

function boundaryTextDiagnostic(text) {
  const withoutDialogue = String(text ?? "")
    .replace(/“[^”]*”/gu, "")
    .replace(/"[^"\r\n]*"/gu, "");
  for (const clause of withoutDialogue.split(/[。；！？\r\n]+/u)) {
    if (!BOUNDARY_ANCHOR_PATTERN.test(clause)) continue;
    const crossing = BOUNDARY_CROSSING_ACTION_PATTERN.test(clause);
    const straddling = BOUNDARY_STRADDLING_PATTERN.test(clause);
    const positioned = crossing || straddling || BOUNDARY_POSITION_ACTION_PATTERN.test(clause) || BOUNDARY_PROXIMITY_PATTERN.test(clause);
    if (!positioned) continue;
    const sides = explicitBoundarySides(clause);
    if (straddling && !/重心[^。；！？\r\n]{0,24}(?:侧|舱内|舱外|屋内|屋外|室内|室外|房内|房外)/u.test(clause)) {
      return "BOUNDARY_CENTER_OF_MASS_SIDE_REQUIRED";
    }
    if (crossing && sides.length < 2) return "BOUNDARY_CROSSING_SIDES_REQUIRED";
    if (!crossing && sides.length < 1) return "BOUNDARY_SIDE_REQUIRED";
  }
  return null;
}

function isExplicitBoundarySide(value) {
  return isNormalizedString(value)
    && /(?:侧|舱内|舱外|屋内|屋外|室内|室外|房内|房外)$/u.test(value)
    && !NON_OWNERSHIP_SIDE_PATTERN.test(value);
}

function validateBoundaryRelation(character, label) {
  const relation = character.boundary_relation;
  const positionNamesBoundary = BOUNDARY_ANCHOR_PATTERN.test(character.position);
  if (!positionNamesBoundary && relation === undefined) return;
  if (!isObject(relation)) {
    throw new CompileError(`${label}: BOUNDARY_RELATION_REQUIRED`);
  }
  if (!isNormalizedString(relation.boundary) || !character.position.includes(relation.boundary)) {
    throw new CompileError(`${label}: BOUNDARY_NAME_MUST_MATCH_POSITION`);
  }
  if (!BOUNDARY_RELATION_STATES.has(relation.state)) {
    throw new CompileError(`${label}: boundary_relation.state must be stationary, straddling, or crossing`);
  }
  if (relation.state === "stationary") {
    if (!isExplicitBoundarySide(relation.side) || !character.position.includes(relation.side)) {
      throw new CompileError(`${label}: BOUNDARY_STATIONARY_SIDE_REQUIRED_IN_POSITION`);
    }
  } else if (relation.state === "straddling") {
    if (!isExplicitBoundarySide(relation.center_of_mass_side)
      || !character.position.includes(relation.center_of_mass_side)
      || !character.position.includes("重心")) {
      throw new CompileError(`${label}: BOUNDARY_CENTER_OF_MASS_SIDE_REQUIRED`);
    }
  } else if (!isExplicitBoundarySide(relation.from_side)
    || !isExplicitBoundarySide(relation.to_side)
    || relation.from_side === relation.to_side
    || !character.position.includes(relation.from_side)
    || !character.position.includes(relation.to_side)) {
    throw new CompileError(`${label}: BOUNDARY_CROSSING_SIDES_REQUIRED`);
  }
}

function countOccurrences(text, token) {
  return text.split(token).length - 1;
}

function visibleFormalCharacterIds(state) {
  return Object.entries(state?.characters ?? {})
    .filter(([, character]) => character?.present !== false && character?.visible === true)
    .map(([characterId]) => characterId);
}

function parentAt(root, parts, create) {
  const last = parts.at(-1);
  let current = root;
  for (const part of parts.slice(0, -1)) {
    if (!own(current, part)) {
      if (!create) return [undefined, last];
      current[part] = {};
    }
    current = current[part];
    if (current === null || typeof current !== "object") return [undefined, last];
  }
  return [current, last];
}

function setAt(root, parts, value, label) {
  const [parent, key] = parentAt(root, parts, true);
  if (!parent) throw new CompileError(`${label}: cannot set ${parts.join(".")}`);
  parent[key] = clone(value);
}

function appendAt(root, parts, value, label) {
  const current = getAt(root, parts);
  if (!Array.isArray(current)) throw new CompileError(`${label}: ${parts.join(".")} is not an array`);
  current.push(clone(value));
}

function removeAt(root, parts, label) {
  const [parent, key] = parentAt(root, parts, false);
  if (!parent || !own(parent, key)) throw new CompileError(`${label}: cannot remove missing path ${parts.join(".")}`);
  if (Array.isArray(parent)) {
    if (!/^(?:0|[1-9]\d*)$/u.test(key)) throw new CompileError(`${label}: array removal requires a numeric index`);
    parent.splice(Number(key), 1);
  } else delete parent[key];
}

function findReservedStateField(value, trail = []) {
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) {
      const found = findReservedStateField(child, [...trail, String(index)]);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(value)) return null;
  for (const [key, child] of Object.entries(value)) {
    if (RESERVED_STATE_FIELDS.has(key)) return [...trail, key].join(".");
    const found = findReservedStateField(child, [...trail, key]);
    if (found) return found;
  }
  return null;
}

function validateState(state, label) {
  if (!isObject(state)) throw new CompileError(`${label}: state must be an object`);
  const reservedPath = findReservedStateField(state);
  if (reservedPath) throw new CompileError(`${label}: target duration cannot be part of world state (${reservedPath})`);
  if (!isObject(state.scene)) throw new CompileError(`${label}: scene must be an object`);
  if (!isObject(state.characters)) throw new CompileError(`${label}: characters must be an object`);
  if (isNormalizedString(state.scene.handoff) && GAZE_FRAMING_VERB_PATTERN.test(stripQuotedDialogue(state.scene.handoff))) {
    throw new CompileError(`${label}: GAZE_FRAMING_VERB_FORBIDDEN; express world-space orientation as 角色名的头部朝向目标`);
  }

  for (const [characterId, character] of Object.entries(state.characters)) {
    if (!isNormalizedString(characterId)) throw new CompileError(`${label}: character id must be a nonempty normalized string`);
    if (!isObject(character)) throw new CompileError(`${label}: character ${characterId} must be an object`);
    if (typeof character.present !== "boolean") throw new CompileError(`${label}: character ${characterId}.present must be boolean`);
    if (typeof character.visible !== "boolean") throw new CompileError(`${label}: character ${characterId}.visible must be boolean`);
    if (character.present === false && character.visible === true) {
      throw new CompileError(`${label}: character ${characterId} cannot be visible while absent`);
    }
    if (!Array.isArray(character.knowledge)) throw new CompileError(`${label}: character ${characterId}.knowledge must be an array`);
    for (const field of ["position", "posture", "facing", "hands", "contact", "injury", "emotion"]) {
      if (["hands", "contact", "injury"].includes(field) && character[field] === null) continue;
      if (!isNormalizedString(character[field])) {
        throw new CompileError(`${label}: character ${characterId}.${field} must be a nonempty normalized string`);
      }
    }
    if (GAZE_FRAMING_VERB_PATTERN.test(character.facing)) {
      throw new CompileError(`${label}: character ${characterId}.facing GAZE_FRAMING_VERB_FORBIDDEN; store only the target or world-space direction`);
    }
    if (PERFORMANCE_VIEWPOINT_TERM_PATTERN.test(character.emotion)) {
      throw new CompileError(`${label}: character ${characterId}.emotion PERFORMANCE_VIEWPOINT_TERM_FORBIDDEN; describe the attitude without 正面, 背面, or 侧面`);
    }
    if (BARE_BOUNDARY_POSITION_PATTERN.test(character.position)) {
      throw new CompileError(`${label}: BOUNDARY_SIDE_REQUIRED for character ${characterId}; replace a bare doorway or entrance position with an explicit side`);
    }
    if (positionTouchesDoorway(character.position) && !hasContinuouslyClosedDoorState(state)) {
      throw new CompileError(`${label}: DOORWAY_CHARACTER_STATE_REQUIRES_DEDOOR_REDIRECT for character ${characterId}; move the character fully into the interior or exterior action area and away from the doorway`);
    }
    if (positionTouchesDoorway(character.position) && hasContinuouslyClosedDoorState(state)
      && character.boundary_relation?.state && character.boundary_relation.state !== "stationary") {
      throw new CompileError(`${label}: DOORWAY_CLOSED_STATE_MUST_BE_STATIONARY for character ${characterId}`);
    }
    validateBoundaryRelation(character, `${label}: character ${characterId}`);
  }

  validateCrowdEntities(state, label);
}

function characterIdsOf(initialState) {
  return new Set(Object.keys(initialState.characters));
}

function crowdIdsOf(initialState) {
  return new Set(Object.keys(initialState.crowd_entities ?? {}));
}

function actionSubjectIdsOf(initialState) {
  const ids = new Set();
  for (const collection of ENTITY_STATE_COLLECTIONS) {
    for (const id of Object.keys(initialState?.[collection] ?? {})) ids.add(id);
  }
  return [...ids];
}

function validateCrowdEntities(state, label) {
  if (!own(state, "crowd_entities")) return;
  if (!isObject(state.crowd_entities)) {
    throw new CompileError(`${label}: crowd_entities must be an object`);
  }
  for (const [entityId, entity] of Object.entries(state.crowd_entities)) {
    const entityLabel = `${label}: crowd entity ${entityId}`;
    if (!isNormalizedString(entityId)) throw new CompileError(`${label}: crowd entity id must be a nonempty normalized string`);
    if (!isObject(entity)) throw new CompileError(`${entityLabel} must be an object`);
    if (!CROWD_ENTITY_KINDS.has(entity.kind)) {
      throw new CompileError(`${entityLabel}.kind must be tracked_extra or crowd_group`);
    }
    if (typeof entity.present !== "boolean") throw new CompileError(`${entityLabel}.present must be boolean`);
    if (typeof entity.visible !== "boolean") throw new CompileError(`${entityLabel}.visible must be boolean`);
    if (entity.present === false && entity.visible === true) {
      throw new CompileError(`${entityLabel} cannot be visible while absent`);
    }
    if (!isNormalizedString(entity.continuity_state) || !entity.continuity_state.includes(entityId)) {
      throw new CompileError(`${entityLabel}.continuity_state must be a normalized platform-ready sentence containing the stable id`);
    }
    if (entity.present === true && entity.visible === false && !/(?:画外|不可见)/u.test(entity.continuity_state)) {
      throw new CompileError(`${entityLabel}.continuity_state must state 画外 or 不可见 while the entity remains present but invisible`);
    }
  }
}

function finitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function validateCalibration(calibration, scenePlanProfile) {
  if (!isObject(calibration)) throw new CompileError("calibration must be an object");
  if (!CALIBRATION_STATUSES.has(calibration.status)) {
    throw new CompileError("calibration.status must be uncalibrated, provisional, or calibrated");
  }
  if (!isNormalizedString(calibration.basis)) throw new CompileError("calibration.basis must be a nonempty normalized string");
  if (own(calibration, "summary")) throw new CompileError("calibration.summary is compiler-owned and must not appear in input");

  const samples = calibration.samples ?? [];
  if (!Array.isArray(samples)) throw new CompileError("calibration.samples must be an array");
  const sampleIds = new Set();
  const groupingKeys = new Set();
  const usableRatios = [];
  const completionRates = [];

  for (const [index, sample] of samples.entries()) {
    const label = `calibration.samples[${index}]`;
    if (!isObject(sample)) throw new CompileError(`${label}: sample must be an object`);
    for (const field of ["sample_id", "scene_class", "platform", "model_version", "prompt_profile", "prompt_fingerprint", "tested_variable", "observed_output"]) {
      if (!isNormalizedString(sample[field])) throw new CompileError(`${label}.${field} must be a nonempty normalized string`);
    }
    if (sampleIds.has(sample.sample_id)) throw new CompileError(`${label}: duplicate sample_id ${sample.sample_id}`);
    sampleIds.add(sample.sample_id);
    if (!CALIBRATION_SCENE_CLASSES.has(sample.scene_class)) {
      throw new CompileError(`${label}.scene_class must be dialogue, dialogue_action, physical_action, or multi_event`);
    }
    if (!PROMPT_PROFILES.has(sample.prompt_profile)) {
      throw new CompileError(`${label}.prompt_profile must be quick, continuity, or production`);
    }
    const expectedPromptProfile = scenePlanProfile;
    if (sample.prompt_profile !== expectedPromptProfile) {
      throw new CompileError(`${label}.prompt_profile ${sample.prompt_profile} does not match scene-plan delivery profile ${expectedPromptProfile}`);
    }
    if (!finitePositive(sample.requested_duration_s) || sample.requested_duration_s > 15) {
      throw new CompileError(`${label}.requested_duration_s must be > 0 and <= 15`);
    }
    if (!finitePositive(sample.file_duration_s)) throw new CompileError(`${label}.file_duration_s must be > 0`);
    if (!(typeof sample.usable_narrative_duration_s === "number" && Number.isFinite(sample.usable_narrative_duration_s)
      && sample.usable_narrative_duration_s >= 0 && sample.usable_narrative_duration_s <= sample.file_duration_s)) {
      throw new CompileError(`${label}.usable_narrative_duration_s must be between 0 and file_duration_s`);
    }
    if (!finitePositive(sample.human_content_estimate_s)) {
      throw new CompileError(`${label}.human_content_estimate_s must be > 0`);
    }
    if (!(Number.isInteger(sample.planned_event_count) && sample.planned_event_count > 0)) {
      throw new CompileError(`${label}.planned_event_count must be a positive integer`);
    }
    if (!(Number.isInteger(sample.completed_event_count) && sample.completed_event_count >= 0
      && sample.completed_event_count <= sample.planned_event_count)) {
      throw new CompileError(`${label}.completed_event_count must be between 0 and planned_event_count`);
    }
    for (const field of ["compressed_or_missing_events", "unresolved_hypotheses"]) {
      if (!Array.isArray(sample[field]) || sample[field].some((value) => !isNormalizedString(value))) {
        throw new CompileError(`${label}.${field} must be an array of normalized strings`);
      }
    }
    if (!(sample.confirmed_cause === null || isNormalizedString(sample.confirmed_cause))) {
      throw new CompileError(`${label}.confirmed_cause must be null or a normalized string`);
    }
    groupingKeys.add(JSON.stringify([
      sample.scene_class,
      sample.platform,
      sample.model_version,
      sample.prompt_profile,
      sample.prompt_fingerprint,
      sample.tested_variable
    ]));
    usableRatios.push(sample.usable_narrative_duration_s / sample.human_content_estimate_s);
    completionRates.push(sample.completed_event_count / sample.planned_event_count);
  }

  if (samples.length > 1 && groupingKeys.size !== 1) {
    throw new CompileError("calibration.samples must use one comparable scene/platform/model/profile/prompt-fingerprint/tested-variable group");
  }
  const minimum = calibration.status === "calibrated" ? 10 : calibration.status === "provisional" ? 5 : 0;
  if (samples.length < minimum) {
    throw new CompileError(`calibration.status ${calibration.status} requires at least ${minimum} comparable measured samples`);
  }

  return {
    sample_count: samples.length,
    grouping_key: samples.length ? JSON.parse([...groupingKeys][0]) : null,
    median_usable_to_human_ratio: samples.length ? median(usableRatios) : null,
    median_event_completion_rate: samples.length ? median(completionRates) : null
  };
}

function assertKnownStatePath(parts, knownCharacterIds, knownCrowdIds, label) {
  
  const isInteractionPermission = parts[0] === "permissions";
  
  if (parts[0] === "characters" && (parts.length < 2 || !knownCharacterIds.has(parts[1]))) {
    throw new CompileError(`${label}: state path refers to unknown character ${parts[1] ?? "<missing>"}`);
  }
  if (parts[0] === "crowd_entities" && (parts.length < 2 || !knownCrowdIds.has(parts[1]))) {
    throw new CompileError(`${label}: state path refers to unknown crowd entity ${parts[1] ?? "<missing>"}`);
  }
  if (parts[0] === "crowd_entities" && parts.length === 2) {
    throw new CompileError(`${label}: CROWD_ENTITY_OBJECT_IMMUTABLE; update fields and use present:false for a confirmed exit`);
  }
}

function validateCrowdEventContract(event, label, knownCrowdIds) {
  const action = isNormalizedString(event.visible_action) ? event.visible_action : "";
  const unchanged = event.crowd_state_unchanged ?? [];
  if (!Array.isArray(unchanged)) {
    throw new CompileError(`${label}.crowd_state_unchanged must be an array`);
  }
  const unchangedIds = new Set();
  for (const [index, entityId] of unchanged.entries()) {
    if (!isNormalizedString(entityId) || !knownCrowdIds.has(entityId)) {
      throw new CompileError(`${label}.crowd_state_unchanged[${index}] refers to an unknown crowd entity`);
    }
    if (unchangedIds.has(entityId)) {
      throw new CompileError(`${label}.crowd_state_unchanged contains duplicate crowd entity ${entityId}`);
    }
    if (!action.includes(entityId)) {
      throw new CompileError(`${label}: CROWD_UNCHANGED_ENTITY_MUST_BE_NAMED_IN_EVENT: ${entityId}`);
    }
    unchangedIds.add(entityId);
  }

  const changedIds = new Set();
  const continuityUpdates = new Set();
  for (const effect of event.effects ?? []) {
    if (!isObject(effect) || !isNormalizedString(effect.path)) continue;
    const parts = effect.path.split(".");
    if (parts[0] !== "crowd_entities") continue;
    const entityId = parts[1];
    if (!knownCrowdIds.has(entityId)) continue;
    changedIds.add(entityId);
    if (parts.length === 3 && parts[2] === "continuity_state" && own(effect, "set")
      && isNormalizedString(effect.set) && effect.set.includes(entityId)) {
      continuityUpdates.add(entityId);
    }
  }

  for (const entityId of changedIds) {
    if (!action.includes(entityId)) {
      throw new CompileError(`${label}: CROWD_STATE_CHANGE_MUST_BE_NAMED_IN_EVENT: ${entityId}`);
    }
    if (unchangedIds.has(entityId)) {
      throw new CompileError(`${label}: CROWD_STATE_CANNOT_CHANGE_AND_BE_UNCHANGED: ${entityId}`);
    }
    if (!continuityUpdates.has(entityId)) {
      throw new CompileError(`${label}: CROWD_CONTINUITY_STATE_EFFECT_REQUIRED: ${entityId}`);
    }
  }

  for (const entityId of knownCrowdIds) {
    if (!action.includes(entityId)) continue;
    if (!changedIds.has(entityId) && !unchangedIds.has(entityId)) {
      throw new CompileError(`${label}: CROWD_STATE_EFFECT_OR_UNCHANGED_REQUIRED: ${entityId}`);
    }
  }
}

function snapshotKnowledge(state) {
  return Object.fromEntries(Object.entries(state.characters).map(([id, character]) => [id, clone(character.knowledge ?? [])]));
}

function assertKnowledgePreserved(before, after, label) {
  for (const [characterId, facts] of Object.entries(before)) {
    const character = after.characters?.[characterId];
    if (!isObject(character)) throw new CompileError(`${label}: character ${characterId} cannot be removed`);
    const currentFacts = character.knowledge ?? [];
    if (!Array.isArray(currentFacts)) throw new CompileError(`${label}: character ${characterId}.knowledge must remain an array`);
    for (const fact of facts) {
      if (!currentFacts.some((candidate) => equal(candidate, fact))) {
        throw new CompileError(`${label}: character ${characterId} loses knowledge ${JSON.stringify(fact)}`);
      }
    }
  }
}

function openingActorStates(state, label) {
  const result = {};
  for (const [characterId, character] of Object.entries(state.characters)) {
    if (!character.visible) continue;
    for (const field of ["emotion", "position", "posture", "facing", "hands", "contact"]) {
      if (["hands", "contact"].includes(field) && character[field] === null) continue;
      if (!isNormalizedString(character[field])) {
        throw new CompileError(`${label}: visible character ${characterId}.${field} must be a nonempty normalized string`);
      }
    }
    result[characterId] = {
      emotion: character.emotion,
      position: character.position,
      posture: character.posture,
      facing: character.facing,
      hands: character.hands,
      contact: character.contact
    };
  }
  return result;
}

function dialogueSpeakersOfBlock(block) {
  const speakers = new Set();
  for (const event of block.events ?? []) {
    const text = String(event?.visible_action ?? "");
    for (const quote of text.matchAll(SPEECH_QUOTE_PATTERN)) {
      const prefix = text.slice(0, quote.index).trimEnd();
      const attribution = prefix.match(SPEECH_ATTRIBUTION_PATTERN);
      if (attribution) speakers.add(attribution[1]);
    }
  }
  return speakers;
}

function audioOnlySpeakerRule(characterId) {
  return `${characterId}本条仅以画外声音参与；不呈现${characterId}本人、${characterId}所在空间、声音来源端画面或任何屏幕中的${characterId}影像。`;
}

function stripAttributedDialogue(text) {
  return String(text ?? "").replace(ATTRIBUTED_DIALOGUE_SPAN_PATTERN, "");
}

function stripAudioOnlyAttributions(text, characterIds) {
  let result = String(text ?? "");
  for (const characterId of characterIds) {
    const escapedCharacterId = characterId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    result = result.replace(new RegExp(`${escapedCharacterId}（[^（）\\r\\n]+）说：“[^”]*”`, "gu"), "");
  }
  return result;
}

function validateBlockAudioOnlySpeakers(value, block, label, authoredSpecialRules, knownCharacterIds) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new CompileError(`${label}.audio_only_speakers must be an array`);
  const dialogueSpeakers = dialogueSpeakersOfBlock(block);
  const seen = new Set();
  return value.map((characterId, index) => {
    const itemLabel = `${label}.audio_only_speakers[${index}]`;
    if (!isNormalizedString(characterId)) throw new CompileError(`${itemLabel} must be a normalized character id`);
    if (!knownCharacterIds.has(characterId)) throw new CompileError(`${itemLabel}: AUDIO_ONLY_SPEAKER_UNKNOWN_CHARACTER ${characterId}`);
    if (seen.has(characterId)) throw new CompileError(`${label}.audio_only_speakers contains duplicate character ${characterId}`);
    seen.add(characterId);
    if (!dialogueSpeakers.has(characterId)) {
      throw new CompileError(`${itemLabel}: AUDIO_ONLY_SPEAKER_REQUIRES_ATTRIBUTED_DIALOGUE ${characterId}`);
    }
    const derivedRule = audioOnlySpeakerRule(characterId);
    if (authoredSpecialRules.includes(derivedRule)) {
      throw new CompileError(`${itemLabel}: AUDIO_ONLY_SPEAKER_RULE_IS_COMPILER_OWNED ${characterId}`);
    }
    for (const [eventIndex, event] of block.events.entries()) {
      if (stripAttributedDialogue(event.visible_action).includes(characterId)) {
        throw new CompileError(`${label}.events[${eventIndex}] ${event.id}: AUDIO_ONLY_SPEAKER_VISUAL_PROSE_FORBIDDEN ${characterId}`);
      }
    }
    return characterId;
  });
}

function openingSpeakerStates(state, block, label) {
  const result = {};
  for (const characterId of dialogueSpeakersOfBlock(block)) {
    const character = state.characters[characterId];
    if (!isObject(character) || character.visible === true) continue;
    if (!isNormalizedString(character.emotion)) {
      throw new CompileError(`${label}: offscreen formal speaker ${characterId}.emotion must be a nonempty normalized string`);
    }
    result[characterId] = { speaking_attitude: character.emotion };
  }
  return result;
}

function openingCrowdStates(state) {
  return Object.fromEntries(Object.entries(state.crowd_entities ?? {})
    .filter(([, entity]) => entity.present === true)
    .map(([entityId, entity]) => [entityId, clone(entity)]));
}

function applyEvent(state, event, label, knownCharacterIds, knownCrowdIds) {
  if (!isObject(event)) throw new CompileError(`${label}: event must be an object`);
  if (!isNormalizedString(event.id)) throw new CompileError(`${label}: id must be a nonempty normalized string`);
  if (!isNormalizedString(event.visible_action)) throw new CompileError(`${label}: visible_action must be a nonempty normalized string`);
  if (GAZE_FRAMING_VERB_PATTERN.test(stripQuotedDialogue(event.visible_action))) {
    throw new CompileError(`${label}: GAZE_FRAMING_VERB_FORBIDDEN; replace gaze wording with 角色名的头部朝向目标`);
  }
  const doorwayDiagnostic = doorwayAutocutDiagnostic(event.visible_action);
  if (doorwayDiagnostic) throw new CompileError(`${label}: ${doorwayDiagnostic}`);
  
  const serializedEvent = JSON.stringify(event);
  if (DEFENSIVE_FOOTWEAR_CONTINUITY_PATTERNS.some((pattern) => pattern.test(serializedEvent))) {
    throw new CompileError(`${label}: DEFENSIVE_FOOTWEAR_CONTINUITY_FORBIDDEN`);
  }

  const preconditions = event.preconditions ?? [];
  if (!Array.isArray(preconditions)) throw new CompileError(`${label}: preconditions must be an array`);
  for (const [index, precondition] of preconditions.entries()) {
    const preconditionLabel = `${label}.preconditions[${index}]`;
    if (!isObject(precondition) || !own(precondition, "equals")) {
      throw new CompileError(`${preconditionLabel}: precondition must contain path and equals`);
    }
    const parts = parseStatePath(precondition.path, preconditionLabel);
    assertKnownStatePath(parts, knownCharacterIds, knownCrowdIds, preconditionLabel);
    const actual = getAt(state, parts);
    if (!equal(actual, precondition.equals)) {
      throw new CompileError(`${preconditionLabel}: precondition failed at ${precondition.path}; expected ${JSON.stringify(precondition.equals)}, got ${JSON.stringify(actual)}`);
    }
  }

  const effects = event.effects ?? [];
  if (!Array.isArray(effects)) throw new CompileError(`${label}: effects must be an array`);
  for (const [index, effect] of effects.entries()) {
    const effectLabel = `${label}.effects[${index}]`;
    if (!isObject(effect)) throw new CompileError(`${effectLabel}: effect must be an object`);
    const parts = parseStatePath(effect.path, effectLabel);
    assertKnownStatePath(parts, knownCharacterIds, knownCrowdIds, effectLabel);
    if (parts[0] === "characters" && parts[2] !== "present" && state.characters[parts[1]]?.present !== true) {
      throw new CompileError(`${effectLabel}: absent character ${parts[1]} cannot change ${parts.slice(2).join(".")}`);
    }
    const operationCount = Number(own(effect, "set")) + Number(own(effect, "append")) + Number(effect.remove === true);
    if (operationCount !== 1) {
      throw new CompileError(`${effectLabel}: effect must use exactly one of set, append, or remove:true`);
    }
    if (own(effect, "set") && parts[0] === "characters" && parts[2] === "facing"
      && typeof effect.set === "string" && GAZE_FRAMING_VERB_PATTERN.test(effect.set)) {
      throw new CompileError(`${effectLabel}: GAZE_FRAMING_VERB_FORBIDDEN; facing stores only the target or world-space direction`);
    }
    if (own(effect, "set") && parts[0] === "characters" && parts[2] === "emotion"
      && typeof effect.set === "string" && PERFORMANCE_VIEWPOINT_TERM_PATTERN.test(effect.set)) {
      throw new CompileError(`${effectLabel}: PERFORMANCE_VIEWPOINT_TERM_FORBIDDEN; describe the attitude without 正面, 背面, or 侧面`);
    }
    if (own(effect, "set") && parts[0] === "scene" && parts[1] === "handoff"
      && typeof effect.set === "string" && GAZE_FRAMING_VERB_PATTERN.test(stripQuotedDialogue(effect.set))) {
      throw new CompileError(`${effectLabel}: GAZE_FRAMING_VERB_FORBIDDEN; express world-space orientation as 角色名的头部朝向目标`);
    }
    const beforeKnowledge = snapshotKnowledge(state);
    if (own(effect, "set")) setAt(state, parts, effect.set, effectLabel);
    else if (own(effect, "append")) appendAt(state, parts, effect.append, effectLabel);
    else removeAt(state, parts, effectLabel);
    assertKnowledgePreserved(beforeKnowledge, state, effectLabel);
  }
}

function normalizedSchemaVersion(value) {
  if (value === 2.1 || value === "2.1") return "2.1";
  throw new CompileError("schema_version must be 2.1");
}

export function compileScenePlan(input) {
  if (!isObject(input)) throw new CompileError("scene plan root must be an object");
  const schemaVersion = normalizedSchemaVersion(input.schema_version);
  for (const field of COMPILER_OWNED_ROOT_FIELDS) {
    if (own(input, field)) throw new CompileError(`${field} is compiler-owned and must not appear in input`);
  }
  if (!isNormalizedString(input.scene_id)) throw new CompileError("scene_id must be a nonempty normalized string");
  if (!PROFILES.has(input.profile)) throw new CompileError("profile must be continuity or production");
  const projectionMode = input.projection_mode ?? PROJECTION_MODE;
  if (projectionMode !== PROJECTION_MODE) {
    throw new CompileError("projection_mode must be dialogue_autocut; explicit_shots and mixed platform projections are retired");
  }
  if (!isNormalizedString(input.scene_global_master)) {
    throw new CompileError("scene_global_master must be a nonempty normalized string");
  }
  for (const field of ROOT_SPECIAL_RULE_FIELDS) {
    if (own(input, field)) throw new CompileError(`${field}: SPECIAL_RULES_MUST_BE_BLOCK_LOCAL`);
  }
  for (const field of ROOT_MECHANISM_REQUIREMENT_FIELDS) {
    if (own(input, field)) throw new CompileError(`${field}: MECHANISM_REQUIREMENTS_MUST_BE_BLOCK_LOCAL`);
  }
  const calibration = input.calibration ?? {
    status: "uncalibrated",
    basis: "No empirical calibration data supplied in scene plan",
    samples: []
  };
  const calibrationSummary = validateCalibration(calibration, input.profile);
  validateState(input.initial_state, "initial_state");
  const sourceActionLocks = validateSourceActionLocks(input.source_action_locks);
  const assetCoverageRules = validateAssetCoverageRules(input.asset_coverage_rules, input.initial_state);
  validateGlobalScope(input.scene_global_master, input.initial_state, assetCoverageRules);
  if (!Array.isArray(input.blocks) || input.blocks.length === 0) throw new CompileError("blocks must be a non-empty ordered array");

  const knownCharacterIds = characterIdsOf(input.initial_state);
  const knownCrowdIds = crowdIdsOf(input.initial_state);
  const knownActionSubjectIds = actionSubjectIdsOf(input.initial_state);
  const blockIds = new Set();
  const eventIds = new Set();
  const blockProjectionModes = new Map();
  const blockSpecialRules = new Map();
  const blockMechanismRequirements = new Map();
  const blockAudioOnlySpeakers = new Map();
  for (const [blockIndex, block] of input.blocks.entries()) {
    const label = `blocks[${blockIndex}]`;
    if (!isObject(block)) throw new CompileError(`${label}: block must be an object`);
    if (!isNormalizedString(block.id)) throw new CompileError(`${label}: id must be a nonempty normalized string`);
    if (blockIds.has(block.id)) throw new CompileError(`${label}: duplicate block id ${block.id}`);
    blockIds.add(block.id);
    if (own(block, "projection_mode") && block.projection_mode !== projectionMode) {
      throw new CompileError(`${label}: block projection_mode must equal scene projection_mode ${projectionMode}`);
    }
    blockProjectionModes.set(block.id, projectionMode);
    const authoredSpecialRules = validateBlockSpecialRules(block.special_rules, label);
    
    for (const field of COMPILER_OWNED_BLOCK_FIELDS) {
      if (own(block, field)) throw new CompileError(`${label}: ${field} is compiler-owned and must not appear in input`);
    }
    for (const field of COMPILER_OWNED_COMPATIBILITY_FIELDS) {
      if (own(block, field)) throw new CompileError(`${label}: ${field} is compiler-owned and must not appear in input`);
    }
    if (own(block, "target_duration_s") && !(finitePositive(block.target_duration_s) && block.target_duration_s <= 15)) {
      throw new CompileError(`${label}: optional target_duration_s must be a finite number > 0 and <= 15`);
    }
    if (!Array.isArray(block.events) || block.events.length === 0) {
      throw new CompileError(`${label}: events must be a non-empty ordered array`);
    }
    for (const [eventIndex, event] of block.events.entries()) {
      if (!isObject(event) || !isNormalizedString(event.id)) {
        throw new CompileError(`${label}.events[${eventIndex}]: id must be a nonempty normalized string`);
      }
      if (eventIds.has(event.id)) throw new CompileError(`${label}.events[${eventIndex}]: duplicate event id ${event.id}`);
      eventIds.add(event.id);
    }
    const audioOnlySpeakers = validateBlockAudioOnlySpeakers(
      block.audio_only_speakers,
      block,
      label,
      authoredSpecialRules,
      knownCharacterIds
    );
    blockAudioOnlySpeakers.set(block.id, audioOnlySpeakers);
    const mechanismRequirements = validateBlockMechanismRequirements(
      block.mechanism_requirements,
      block,
      label,
      authoredSpecialRules,
      knownCharacterIds,
      knownCrowdIds
    );
    blockMechanismRequirements.set(block.id, mechanismRequirements);
    blockSpecialRules.set(block.id, [
      ...authoredSpecialRules,
      ...mechanismRequirements.map((requirement) => requirement.rule),
      ...audioOnlySpeakers.map(audioOnlySpeakerRule)
    ]);
  }

  validateSourceActionLockCoverage(sourceActionLocks, input.blocks);

  const compiledBlocks = [];
  let currentState = clone(input.initial_state);
  for (const [blockIndex, block] of input.blocks.entries()) {
    const startState = clone(currentState);
    const stateSnapshots = [["start_state", clone(startState)]];
    const visibleCharacterIds = new Set(visibleFormalCharacterIds(startState));
    const actorStates = openingActorStates(startState, `block ${block.id}.start_state`);
    const speakerStates = openingSpeakerStates(startState, block, `block ${block.id}.start_state`);
    const crowdStates = openingCrowdStates(startState);
    const audioOnlySpeakers = blockAudioOnlySpeakers.get(block.id);
    for (const characterId of audioOnlySpeakers) {
      if (startState.characters[characterId]?.visible === true) {
        throw new CompileError(`block ${block.id}.start_state: AUDIO_ONLY_SPEAKER_MUST_START_OFFSCREEN ${characterId}`);
      }
      if (!own(speakerStates, characterId)) {
        throw new CompileError(`block ${block.id}.start_state: AUDIO_ONLY_SPEAKER_STATE_REQUIRED ${characterId}`);
      }
      if (visibleStateText(startState).includes(characterId)) {
        throw new CompileError(`block ${block.id}.start_state: AUDIO_ONLY_SPEAKER_VISIBLE_STATE_MENTION_FORBIDDEN ${characterId}`);
      }
    }
    for (const [eventIndex, event] of block.events.entries()) {
      const realizationErrors = eventRealizationDiagnostics(event.visible_action);
      if (realizationErrors.length) throw new CompileError(`block ${block.id} event ${event.id}: ${realizationErrors.join("; ")}`);
      const beforeEventState = clone(currentState);
      const doorwayDiagnostic = doorwayAutocutDiagnostic(event.visible_action);
      if (doorwayDiagnostic) {
        throw new CompileError(`block ${block.id}.events[${eventIndex}] ${event.id}: ${doorwayDiagnostic}`);
      }
      const boundaryDiagnostic = boundaryTextDiagnostic(event.visible_action);
      if (boundaryDiagnostic) {
        throw new CompileError(`block ${block.id}.events[${eventIndex}] ${event.id}: ${boundaryDiagnostic}`);
      }
      const causalityDiagnostics = criticalActionCausalityDiagnostics(event.visible_action, knownActionSubjectIds);
      if (causalityDiagnostics.length) {
        throw new CompileError(`block ${block.id}.events[${eventIndex}] ${event.id}: ${causalityDiagnostics.map((item) => item.code).join(", ")}`);
      }

      validateCrowdEventContract(event, `block ${block.id}.events[${eventIndex}] ${event.id}`, knownCrowdIds);
      applyEvent(currentState, event, `block ${block.id}.events[${eventIndex}] ${event.id}`, knownCharacterIds, knownCrowdIds);
      const physicalErrors = physicalStateDiagnostics(event, currentState);
      if (physicalErrors.length) throw new CompileError(`block ${block.id} event ${event.id}: ${physicalErrors.join("; ")}`);
      const completionErrors = taskCompletionDiagnostics(event, beforeEventState, currentState);
      if (completionErrors.length) throw new CompileError(`block ${block.id} event ${event.id}: ${completionErrors.join("; ")}`);
      stateSnapshots.push([`event_state:${event.id}`, clone(currentState)]);
      for (const characterId of visibleFormalCharacterIds(currentState)) visibleCharacterIds.add(characterId);
      for (const characterId of audioOnlySpeakers) {
        if (currentState.characters[characterId]?.visible === true) {
          throw new CompileError(`block ${block.id}.events[${eventIndex}] ${event.id}: AUDIO_ONLY_SPEAKER_BECOMES_VISIBLE ${characterId}`);
        }
      }
      for (const [characterId, character] of Object.entries(currentState.characters)) {
        validateBoundaryRelation(character, `block ${block.id}.events[${eventIndex}] ${event.id}: character ${characterId}`);
      }

    }
    validateState(currentState, `block ${block.id}.end_state`);
    const endState = clone(currentState);
    for (const characterId of visibleFormalCharacterIds(endState)) visibleCharacterIds.add(characterId);
    for (const characterId of audioOnlySpeakers) {
      if (visibleStateText(endState).includes(characterId)) {
        throw new CompileError(`block ${block.id}.end_state: AUDIO_ONLY_SPEAKER_VISIBLE_STATE_MENTION_FORBIDDEN ${characterId}`);
      }
    }
    for (const [requirementIndex, requirement] of blockMechanismRequirements.get(block.id).entries()) {
      for (const statePath of requirement.persistent_state_paths) {
        if (getAt(endState, statePath.split(".")) === undefined) {
          throw new CompileError(`block ${block.id}.mechanism_requirements[${requirementIndex}]: MECHANISM_PERSISTENT_STATE_PATH_MISSING_AT_BLOCK_END ${statePath}`);
        }
      }
    }
    const {
      shots: _legacyShots,
      camera_beat_ids: _legacyCameraBeatIds,
      estimated_effective_duration_s: _legacyShotDuration,
      ...cameraFreeBlock
    } = block;
    const resolvedSpecialRules = clone(blockSpecialRules.get(block.id));
    const audioOnlyRules = audioOnlySpeakers.map(audioOnlySpeakerRule);

    const identityErrors = visualIdentityDiagnostics({
      rules: resolvedSpecialRules,
      states: stateSnapshots.map(([, state]) => state),
      actionText: block.events.map(event => event.visible_action).join("\n")
    });
    if (identityErrors.length) throw new CompileError(`block ${block.id}: ${identityErrors.join("; ")}`);
    const compiledBlock = {
      ...clone(cameraFreeBlock),
      mechanism_requirements: clone(blockMechanismRequirements.get(block.id)),
      special_rules: resolvedSpecialRules,
      required_assets: deriveRequiredAssets(assetCoverageRules, startState, {
        ...block,
        events: block.events.map((event) => ({
          ...event,
          visible_action: stripAudioOnlyAttributions(event.visible_action, audioOnlySpeakers)
        })),
        special_rules: resolvedSpecialRules.filter((rule) => !audioOnlyRules.includes(rule))
      }, endState, [...stateSnapshots, ["end_state", clone(endState)]]),
      projection_mode: blockProjectionModes.get(block.id),
      start_state: startState,
      opening_actor_states: actorStates,
      opening_speaker_states: speakerStates,
      opening_crowd_states: crowdStates,
      end_state: endState
    };
    compiledBlocks.push(compiledBlock);
  }

  const compatibilityClips = compiledBlocks.map((block) => {
    const clip = {
      ...clone(block),
      id: block.id,
      clip_id: block.id
    };
    if (own(block, "target_duration_s")) clip.duration_s = block.target_duration_s;
    return clip;
  });
  const {
    schema_version: _schemaVersion,
    projection_mode: _ProjectionMode,
    initial_state: _initialState,
    blocks: _blocks,
    version: _version,
    coverage: _coverage,
    clips: _clips,
    calibration: _calibration,
    scene_camera_plan: _legacyCameraPlan,
    asset_coverage_rules: _assetCoverageRules,
    ...rootMetadata
  } = input;
  return {
    ...clone(rootMetadata),
    version: "1.0",
    schema_version: schemaVersion,
    scene_id: input.scene_id,
    profile: input.profile,
    projection_mode: projectionMode,
    coverage: "complete_scene",
    calibration: {
      ...clone(calibration),
      summary: calibrationSummary
    },
    source_action_locks: clone(sourceActionLocks),
    asset_coverage_rules: clone(assetCoverageRules),
    initial_state: clone(input.initial_state),
    blocks: compiledBlocks,
    clips: compatibilityClips
  };
}

function usage() {
  console.error("Usage: node compile_scene_plan.mjs <scene-plan.json|-> [--output <path>]");
}

function parseArguments(argv) {
  let inputPath;
  let outputPath;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--output") {
      if (outputPath !== undefined || index + 1 >= argv.length) throw new CompileError("--output requires exactly one path");
      outputPath = argv[index + 1];
      index += 1;
    } else if (argument.startsWith("-" ) && argument !== "-") {
      throw new CompileError(`unknown option ${argument}`);
    } else if (inputPath !== undefined) {
      throw new CompileError("exactly one input JSON path is required");
    } else {
      inputPath = argument;
    }
  }
  if (inputPath === undefined) throw new CompileError("input JSON path is required");
  return { inputPath, outputPath };
}

function main() {
  try {
    const { inputPath, outputPath } = parseArguments(process.argv.slice(2));
    const source = inputPath === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(inputPath, "utf8");
    let input;
    try {
      input = JSON.parse(source);
    } catch (error) {
      throw new CompileError(`cannot parse input JSON: ${error.message}`);
    }
    const serialized = `${JSON.stringify(compileScenePlan(input), null, 2)}\n`;
    if (outputPath !== undefined) {
      const resolvedOutput = path.resolve(outputPath);
      fs.writeFileSync(resolvedOutput, serialized, "utf8");
    }
    process.stdout.write(serialized);
  } catch (error) {
    if (error instanceof CompileError || error?.code) {
      console.error(`ERROR: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
