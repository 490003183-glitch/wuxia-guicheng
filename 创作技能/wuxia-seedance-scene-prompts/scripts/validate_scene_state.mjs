#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { eventRealizationDiagnostics, taskCompletionDiagnostics, physicalStateDiagnostics } from "./prompt_realization.mjs";
import { criticalActionCausalityDiagnostics } from "./action_causality.mjs";
import { doorwayAutocutDiagnostic, hasContinuouslyClosedDoorState, positionTouchesDoorway } from "./doorway_policy.mjs";

function usage() {
  console.error("Usage: node validate_scene_state.mjs <state.json>");
  process.exit(2);
}

const file = process.argv[2];
if (!file) usage();

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (error) {
  console.error(`ERROR: cannot read JSON: ${error.message}`);
  process.exit(1);
}

const errors = [];
const projectionMode = "dialogue_autocut";

const gazeFramingVerbPattern = /(?:看着|看向|望着|望向|盯着|盯向|注视|凝视|对视|(?:目光|视线|眼神)[^，。；！？\r\n]{0,12}(?:落在|落向|投向|转向|朝向|看向|望向|盯着|注视|凝视))/u;
const performanceViewpointTermPattern = /(?:正面|背面|侧面)/u;

const bareBoundaryPositionPattern = /(?:门口|门边|门旁|门槛|入口处|入口旁|入口附近|舱口|闸门口)(?!内侧|外侧)/u;
const boundaryAnchorPattern = /(?:门|门洞|门框|门槛|入口|通道口|舱口|闸门|闸口)/u;
const boundaryRelationStates = new Set(["stationary", "straddling", "crossing"]);
const explicitBoundarySideTokenPattern = /(?:[\p{Script=Han}A-Za-z0-9_-]{1,16}?侧|舱内|舱外|屋内|屋外|室内|室外|房内|房外)/gu;
const nonOwnershipSidePattern = /(?:左|右|前|后|上|下)侧$/u;
const boundaryCrossingActionPattern = /(?:穿过|跨过|越过|走进|走出|进入|离开|通过)/u;
const boundaryPositionActionPattern = /(?:位于|站在|停在|蹲在|跪在|坐在|贴在|靠在|守在|来到|留在|处于|跨在|卡在|走到|移到)/u;
const boundaryProximityPattern = /(?:附近|中央|正中|旁边|边上|门旁|门边|前方|后方)/u;
const boundaryStraddlingPattern = /(?:跨在|横跨|卡在|骑跨|门洞中央|门洞正中)/u;

const defensiveFootwearContinuityPatterns = [
  /(?:双脚|左脚|右脚)[^，。；！？\r\n"]{0,12}(?:仍|依然|始终)(?:穿|穿着)[^，。；！？\r\n"]{0,8}(?:鞋|靴)/u,
  /(?:仍|依然|始终)(?:穿|穿着)[^，。；！？\r\n"]{0,8}(?:鞋|靴)/u,
  /(?:鞋子?|靴子?|短靴|长靴|运动鞋|高跟鞋|皮鞋)[^，。；！？\r\n"]{0,12}(?:仍在脚上|依然在脚上|没有脱落|未脱落|保持附着|保持穿着)/u
];
const crowdEntityKinds = new Set(["tracked_extra", "crowd_group"]);
const mechanismIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const compiledMechanismRequirementFields = new Set(["id", "source_refs", "rule", "persistent_state_paths", "trigger_event_ids"]);
const sourceActionLockFields = new Set(["id", "source_ref", "required_terms"]);
const assetCoverageRuleFields = new Set(["asset_id", "path", "trigger_terms", "state_conditions", "global_forbidden_terms"]);
const entityStateCollections = ["characters", "crowd_entities", "creatures", "entities", "equipment", "mecha", "props", "robots", "vehicles"];
const speechQuotePattern = /“([^”]*)”/gu;
const speechAttributionPattern = /([\p{Script=Han}A-Za-z0-9·_-]{1,24})（([^（）\r\n]+)）说：$/u;
const attributedDialogueSpanPattern = /[\p{Script=Han}A-Za-z0-9·_-]{1,24}（[^（）\r\n]+）说：“[^”]*”/gu;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNormalizedString(value) {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function validateSourceActionLocks(value, clips) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push("source_action_locks must be an array");
    return;
  }
  const locksById = new Map();
  for (const [index, lock] of value.entries()) {
    const label = `source_action_locks[${index}]`;
    if (!isObject(lock)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    for (const field of Object.keys(lock)) {
      if (!sourceActionLockFields.has(field)) errors.push(`${label}: unsupported field ${field}`);
    }
    if (!isNormalizedString(lock.id) || !mechanismIdPattern.test(lock.id)) {
      errors.push(`${label}.id must be a stable ASCII source-action id`);
      continue;
    }
    if (locksById.has(lock.id)) errors.push(`source_action_locks contains duplicate id ${lock.id}`);
    if (!isNormalizedString(lock.source_ref) || /[\r\n]/u.test(lock.source_ref)) {
      errors.push(`${label}.source_ref must be a normalized single-line director or source reference`);
    }
    if (!Array.isArray(lock.required_terms) || lock.required_terms.length === 0
      || lock.required_terms.some((term) => !isNormalizedString(term) || /[\r\n]/u.test(term))) {
      errors.push(`${label}.required_terms must be a non-empty array of normalized single-line exact terms`);
    } else if (new Set(lock.required_terms).size !== lock.required_terms.length) {
      errors.push(`${label}.required_terms contains duplicates`);
    }
    locksById.set(lock.id, lock);
  }

  const actionTextByLockId = new Map([...locksById.keys()].map((id) => [id, []]));
  for (const [clipIndex, clip] of clips.entries()) {
    for (const [eventIndex, event] of (Array.isArray(clip?.events) ? clip.events : []).entries()) {
      const label = `clips[${clipIndex}].events[${eventIndex}]`;
      const lockIds = event?.source_action_lock_ids ?? [];
      if (!Array.isArray(lockIds)) {
        errors.push(`${label}.source_action_lock_ids must be an array`);
        continue;
      }
      const seenIds = new Set();
      for (const lockId of lockIds) {
        if (!isNormalizedString(lockId) || !mechanismIdPattern.test(lockId)) {
          errors.push(`${label}.source_action_lock_ids must contain stable ASCII source-action ids`);
          continue;
        }
        if (seenIds.has(lockId)) errors.push(`${label}.source_action_lock_ids contains duplicate id ${lockId}`);
        seenIds.add(lockId);
        if (!locksById.has(lockId)) {
          errors.push(`${label}: SOURCE_ACTION_LOCK_UNKNOWN ${lockId}`);
          continue;
        }
        actionTextByLockId.get(lockId).push(String(event?.visible_action ?? ""));
      }
    }
  }
  for (const [lockId, lock] of locksById.entries()) {
    const actionTexts = actionTextByLockId.get(lockId);
    if (actionTexts.length === 0) {
      errors.push(`source_action_lock ${lockId}: SOURCE_ACTION_LOCK_UNMAPPED`);
      continue;
    }
    const combinedAction = actionTexts.join("\n");
    for (const term of Array.isArray(lock.required_terms) ? lock.required_terms : []) {
      if (isNormalizedString(term) && !combinedAction.includes(term)) {
        errors.push(`source_action_lock ${lockId}: SOURCE_ACTION_LOCK_TERM_MISSING ${term}`);
      }
    }
  }
}

function validateAssetCoverageRules(value, initialState) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push("asset_coverage_rules must be an array");
    return [];
  }
  const assetIds = new Set();
  const triggerOwners = [];
  return value.flatMap((rule, index) => {
    const label = `asset_coverage_rules[${index}]`;
    if (!isObject(rule)) {
      errors.push(`${label} must be an object`);
      return [];
    }
    for (const field of Object.keys(rule)) {
      if (!assetCoverageRuleFields.has(field)) errors.push(`${label}: unsupported field ${field}`);
    }
    let valid = true;
    if (!isNormalizedString(rule.asset_id) || /[\r\n]/u.test(rule.asset_id)) {
      errors.push(`${label}.asset_id must be a normalized single-line string`);
      valid = false;
    } else if (assetIds.has(rule.asset_id)) {
      errors.push(`asset_coverage_rules contains duplicate asset_id ${rule.asset_id}`);
      valid = false;
    } else {
      assetIds.add(rule.asset_id);
    }
    if (!isNormalizedString(rule.path) || !path.isAbsolute(rule.path) || !/\.(avif|gif|jpe?g|png|webp)$/iu.test(rule.path)) {
      errors.push(`${label}.path must be an absolute image path`);
      valid = false;
    }
    const triggerTerms = rule.trigger_terms ?? [];
    if (!Array.isArray(triggerTerms)) {
      errors.push(`${label}.trigger_terms must be an array`);
      valid = false;
    } else if (triggerTerms.some((term) => !isNormalizedString(term) || /[\r\n]/u.test(term))) {
      errors.push(`${label}.trigger_terms must contain only normalized single-line strings`);
      valid = false;
    } else if (new Set(triggerTerms).size !== triggerTerms.length) {
      errors.push(`${label}.trigger_terms contains duplicates`);
      valid = false;
    }
    const stateConditions = rule.state_conditions ?? [];
    if (!Array.isArray(stateConditions)) {
      errors.push(`${label}.state_conditions must be an array`);
      valid = false;
    } else {
      for (const [conditionIndex, condition] of stateConditions.entries()) {
        const conditionLabel = `${label}.state_conditions[${conditionIndex}]`;
        if (!isObject(condition) || Object.keys(condition).some((field) => !["path", "equals"].includes(field))) {
          errors.push(`${conditionLabel} must contain only path and equals`);
          valid = false;
          continue;
        }
        if (!isNormalizedString(condition.path) || !isNormalizedString(condition.equals)) {
          errors.push(`${conditionLabel}.path and equals must be normalized strings`);
          valid = false;
        } else if (getAt(initialState, condition.path) === undefined) {
          errors.push(`${conditionLabel}.path must exist in initial_state: ${condition.path}`);
          valid = false;
        }
      }
    }
    if (Array.isArray(triggerTerms) && Array.isArray(stateConditions) && triggerTerms.length === 0 && stateConditions.length === 0) {
      errors.push(`${label} requires trigger_terms, state_conditions, or both`);
      valid = false;
    }
    const globalForbiddenTerms = rule.global_forbidden_terms ?? [];
    if (!Array.isArray(globalForbiddenTerms)
      || globalForbiddenTerms.some((term) => !isNormalizedString(term) || /[\r\n]/u.test(term))) {
      errors.push(`${label}.global_forbidden_terms must contain only normalized single-line strings`);
      valid = false;
    } else if (new Set(globalForbiddenTerms).size !== globalForbiddenTerms.length) {
      errors.push(`${label}.global_forbidden_terms contains duplicates`);
      valid = false;
    } else if (Array.isArray(stateConditions) && stateConditions.length > 0 && globalForbiddenTerms.length === 0) {
      errors.push(`${label}.global_forbidden_terms is required for state-conditioned visual assets`);
      valid = false;
    }
    const conditionSignature = JSON.stringify(stateConditions);
    if (valid) {
      for (const term of triggerTerms) {
        const collision = triggerOwners.find((owner) => (
          (term.includes(owner.term) || owner.term.includes(term))
          && (conditionSignature === "[]" || owner.conditionSignature === "[]" || conditionSignature === owner.conditionSignature)
        ));
        if (collision) {
          errors.push(`${label}.trigger_terms: ASSET_TRIGGER_TERM_COLLISION ${term} overlaps ${collision.term} from ${collision.assetId}`);
          valid = false;
        }
      }
    }
    if (valid) triggerOwners.push(...triggerTerms.map((term) => ({ term, assetId: rule.asset_id, conditionSignature })));
    return valid ? [{
      asset_id: rule.asset_id,
      path: rule.path,
      trigger_terms: [...triggerTerms],
      state_conditions: clone(stateConditions),
      global_forbidden_terms: [...globalForbiddenTerms],
    }] : [];
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

function expectedOpeningActorStates(state) {
  return Object.fromEntries(Object.entries(state?.characters ?? {})
    .filter(([, character]) => isObject(character) && character.visible === true)
    .map(([characterId, character]) => [characterId, {
      emotion: character.emotion,
      position: character.position,
      posture: character.posture,
      facing: character.facing,
      hands: character.hands,
      contact: character.contact
    }]));
}

function dialogueSpeakersOfEvents(events) {
  const speakers = new Set();
  for (const event of events ?? []) {
    const text = String(event?.visible_action ?? "");
    for (const quote of text.matchAll(speechQuotePattern)) {
      const prefix = text.slice(0, quote.index).trimEnd();
      const attribution = prefix.match(speechAttributionPattern);
      if (attribution) speakers.add(attribution[1]);
    }
  }
  return speakers;
}

function expectedOpeningSpeakerStates(state, events) {
  const speakers = dialogueSpeakersOfEvents(events);
  return Object.fromEntries([...speakers]
    .filter((characterId) => isObject(state?.characters?.[characterId]) && state.characters[characterId].visible !== true)
    .map((characterId) => [characterId, { speaking_attitude: state.characters[characterId].emotion }]));
}

function audioOnlySpeakerRule(characterId) {
  return `${characterId}本条仅以画外声音参与；不呈现${characterId}本人、${characterId}所在空间、声音来源端画面或任何屏幕中的${characterId}影像。`;
}

function stripAttributedDialogue(text) {
  return String(text ?? "").replace(attributedDialogueSpanPattern, "");
}

function stripAudioOnlyAttributions(text, characterIds) {
  let result = String(text ?? "");
  for (const characterId of characterIds) {
    const escapedCharacterId = characterId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    result = result.replace(new RegExp(`${escapedCharacterId}（[^（）\\r\\n]+）说：“[^”]*”`, "gu"), "");
  }
  return result;
}

function deriveRequiredAssets(assetCoverageRules, startState, clip, endState, stateSnapshots) {
  const evidenceTexts = [
    ["start_state", visibleStateText(startState)],
    ...(clip.events ?? []).map((event) => [`event:${event.id}`, stripQuotedDialogue(event.visible_action)]),
    ["special_rules", (clip.special_rules ?? []).join("\n")],
    ["end_state", visibleStateText(endState)]
  ];
  return assetCoverageRules.flatMap((rule) => {
    const matchedTerms = rule.trigger_terms.filter((term) => evidenceTexts.some(([, text]) => text.includes(term)));
    if (rule.trigger_terms.length > 0 && matchedTerms.length === 0) return [];
    const matchedStateSnapshots = rule.state_conditions.length > 0
      ? (stateSnapshots ?? [["start_state", startState], ["end_state", endState]])
          .filter(([, state]) => rule.state_conditions.every((condition) => equal(getAt(state, condition.path), condition.equals)))
          .map(([snapshotLabel]) => snapshotLabel)
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
      evidence: [...new Set([...evidence, ...matchedStateSnapshots])],
    }];
  });
}

const manifestRoot = isObject(manifest) ? manifest : {};

function clone(value) {
  return structuredClone(value);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function equal(a, b) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function getAt(root, path) {
  return path.split(".").reduce((value, key) => value?.[key], root);
}

function visibleFormalCharacterIds(state) {
  return Object.entries(state?.characters ?? {})
    .filter(([, character]) => character?.present !== false && character?.visible === true)
    .map(([characterId]) => characterId);
}

function explicitBoundarySides(text) {
  return [...new Set((String(text ?? "").match(explicitBoundarySideTokenPattern) ?? [])
    .filter((token) => !nonOwnershipSidePattern.test(token)))];
}

function boundaryTextDiagnostic(text) {
  const withoutDialogue = String(text ?? "")
    .replace(/“[^”]*”/gu, "")
    .replace(/"[^"\r\n]*"/gu, "");
  for (const clause of withoutDialogue.split(/[。；！？\r\n]+/u)) {
    if (!boundaryAnchorPattern.test(clause)) continue;
    const crossing = boundaryCrossingActionPattern.test(clause);
    const straddling = boundaryStraddlingPattern.test(clause);
    const positioned = crossing || straddling || boundaryPositionActionPattern.test(clause) || boundaryProximityPattern.test(clause);
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
    && !nonOwnershipSidePattern.test(value);
}

function validateBoundaryRelation(character, label) {
  const relation = character.boundary_relation;
  const positionNamesBoundary = boundaryAnchorPattern.test(character.position);
  if (!positionNamesBoundary && relation === undefined) return;
  if (!isObject(relation)) {
    errors.push(`${label}: BOUNDARY_RELATION_REQUIRED`);
    return;
  }
  if (!isNormalizedString(relation.boundary) || !character.position.includes(relation.boundary)) {
    errors.push(`${label}: BOUNDARY_NAME_MUST_MATCH_POSITION`);
  }
  if (!boundaryRelationStates.has(relation.state)) {
    errors.push(`${label}: boundary_relation.state must be stationary, straddling, or crossing`);
  } else if (relation.state === "stationary") {
    if (!isExplicitBoundarySide(relation.side) || !character.position.includes(relation.side)) {
      errors.push(`${label}: BOUNDARY_STATIONARY_SIDE_REQUIRED_IN_POSITION`);
    }
  } else if (relation.state === "straddling") {
    if (!isExplicitBoundarySide(relation.center_of_mass_side)
      || !character.position.includes(relation.center_of_mass_side)
      || !character.position.includes("重心")) {
      errors.push(`${label}: BOUNDARY_CENTER_OF_MASS_SIDE_REQUIRED`);
    }
  } else if (!isExplicitBoundarySide(relation.from_side)
    || !isExplicitBoundarySide(relation.to_side)
    || relation.from_side === relation.to_side
    || !character.position.includes(relation.from_side)
    || !character.position.includes(relation.to_side)) {
    errors.push(`${label}: BOUNDARY_CROSSING_SIDES_REQUIRED`);
  }
}

function parentAt(root, path, create = false) {
  const parts = path.split(".");
  const last = parts.pop();
  let current = root;
  for (const part of parts) {
    if (!(part in current)) {
      if (!create) return [undefined, last];
      current[part] = {};
    }
    current = current[part];
    if (!current || typeof current !== "object") return [undefined, last];
  }
  return [current, last];
}

function setAt(root, path, value) {
  const [parent, key] = parentAt(root, path, true);
  if (!parent) throw new Error(`cannot set ${path}`);
  parent[key] = clone(value);
}

function appendAt(root, path, value) {
  const current = getAt(root, path);
  if (!Array.isArray(current)) throw new Error(`${path} is not an array`);
  current.push(clone(value));
}

function removeAt(root, path) {
  const [parent, key] = parentAt(root, path, false);
  if (!parent || !(key in parent)) throw new Error(`cannot remove missing path ${path}`);
  delete parent[key];
}

function validateStateShape(state, label) {
  if (!isObject(state)) {
    errors.push(`${label}: state must be an object`);
    return;
  }
  if (!isObject(state.scene)) errors.push(`${label}: missing scene object`);
  if (isNormalizedString(state.scene?.handoff) && gazeFramingVerbPattern.test(stripQuotedDialogue(state.scene.handoff))) {
    errors.push(`${label}: GAZE_FRAMING_VERB_FORBIDDEN; express world-space orientation as 角色名的头部朝向目标`);
  }

  if (!isObject(state.characters)) errors.push(`${label}: missing characters object`);
  
  for (const [name, character] of Object.entries(state.characters ?? {})) {
    if (!isObject(character)) {
      errors.push(`${label}: character ${name} must be an object`);
      continue;
    }
    for (const field of ["present", "visible", "position", "posture", "facing", "hands", "contact", "injury", "emotion", "knowledge"]) {
      if (!(field in character)) errors.push(`${label}: character ${name} missing ${field}`);
    }
    for (const field of ["present", "visible"]) {
      if (field in character && typeof character[field] !== "boolean") errors.push(`${label}: character ${name}.${field} must be boolean`);
    }
    for (const field of ["position", "posture", "facing", "hands", "contact", "injury", "emotion"]) {
      if (["hands", "contact", "injury"].includes(field) && character[field] === null) continue;
      if (field in character && !isNormalizedString(character[field])) errors.push(`${label}: character ${name}.${field} must be a nonempty normalized string`);
    }
    if (isNormalizedString(character.facing) && gazeFramingVerbPattern.test(character.facing)) {
      errors.push(`${label}: character ${name}.facing GAZE_FRAMING_VERB_FORBIDDEN; store only the target or world-space direction`);
    }
    if (isNormalizedString(character.emotion) && performanceViewpointTermPattern.test(character.emotion)) {
      errors.push(`${label}: character ${name}.emotion PERFORMANCE_VIEWPOINT_TERM_FORBIDDEN; describe the attitude without 正面, 背面, or 侧面`);
    }
    if (isNormalizedString(character.position) && bareBoundaryPositionPattern.test(character.position)) {
      errors.push(`${label}: BOUNDARY_SIDE_REQUIRED for character ${name}; replace a bare doorway or entrance position with an explicit side`);
    }
    if (isNormalizedString(character.position) && positionTouchesDoorway(character.position) && !hasContinuouslyClosedDoorState(state)) {
      errors.push(`${label}: DOORWAY_CHARACTER_STATE_REQUIRES_DEDOOR_REDIRECT for character ${name}; move the character fully into the interior or exterior action area and away from the doorway`);
    }
    if (isNormalizedString(character.position) && positionTouchesDoorway(character.position) && hasContinuouslyClosedDoorState(state)
      && character.boundary_relation?.state && character.boundary_relation.state !== "stationary") {
      errors.push(`${label}: DOORWAY_CLOSED_STATE_MUST_BE_STATIONARY for character ${name}`);
    }
    if (isNormalizedString(character.position)) validateBoundaryRelation(character, `${label}: character ${name}`);
    if (character.knowledge && !Array.isArray(character.knowledge)) {
      errors.push(`${label}: character ${name}.knowledge must be an array`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(state, "crowd_entities") && !isObject(state.crowd_entities)) {
    errors.push(`${label}: crowd_entities must be an object`);
  }
  for (const [name, entity] of Object.entries(state.crowd_entities ?? {})) {
    const entityLabel = `${label}: crowd entity ${name}`;
    if (!isNormalizedString(name)) errors.push(`${label}: crowd entity id must be a nonempty normalized string`);
    if (!isObject(entity)) {
      errors.push(`${entityLabel} must be an object`);
      continue;
    }
    if (!crowdEntityKinds.has(entity.kind)) errors.push(`${entityLabel}.kind must be tracked_extra or crowd_group`);
    if (typeof entity.present !== "boolean") errors.push(`${entityLabel}.present must be boolean`);
    if (typeof entity.visible !== "boolean") errors.push(`${entityLabel}.visible must be boolean`);
    if (entity.present === false && entity.visible === true) errors.push(`${entityLabel} cannot be visible while absent`);
    if (!isNormalizedString(entity.continuity_state) || !entity.continuity_state.includes(name)) {
      errors.push(`${entityLabel}.continuity_state must be a normalized platform-ready sentence containing the stable id`);
    }
    if (entity.present === true && entity.visible === false
      && isNormalizedString(entity.continuity_state) && !/(?:画外|不可见)/u.test(entity.continuity_state)) {
      errors.push(`${entityLabel}.continuity_state must state 画外 or 不可见 while the entity remains present but invisible`);
    }
  }
}

function validateCrowdPath(rawPath, label, knownCrowdIds) {
  if (!isNormalizedString(rawPath)) return;
  const parts = rawPath.split(".");
  if (parts[0] !== "crowd_entities") return;
  if (parts.length < 2 || !knownCrowdIds.has(parts[1])) {
    errors.push(`${label}: state path refers to unknown crowd entity ${parts[1] ?? "<missing>"}`);
  } else if (parts.length === 2) {
    errors.push(`${label}: CROWD_ENTITY_OBJECT_IMMUTABLE; update fields and use present:false for a confirmed exit`);
  }
}

function validateCrowdEventContract(event, label, knownCrowdIds) {
  const action = isNormalizedString(event.visible_action) ? event.visible_action : "";
  const unchanged = event.crowd_state_unchanged ?? [];
  if (!Array.isArray(unchanged)) {
    errors.push(`${label}.crowd_state_unchanged must be an array`);
    return;
  }
  const unchangedIds = new Set();
  for (const [index, entityId] of unchanged.entries()) {
    if (!isNormalizedString(entityId) || !knownCrowdIds.has(entityId)) {
      errors.push(`${label}.crowd_state_unchanged[${index}] refers to an unknown crowd entity`);
      continue;
    }
    if (unchangedIds.has(entityId)) errors.push(`${label}.crowd_state_unchanged contains duplicate crowd entity ${entityId}`);
    if (!action.includes(entityId)) errors.push(`${label}: CROWD_UNCHANGED_ENTITY_MUST_BE_NAMED_IN_EVENT: ${entityId}`);
    unchangedIds.add(entityId);
  }

  const changedIds = new Set();
  const continuityUpdates = new Set();
  for (const effect of Array.isArray(event.effects) ? event.effects : []) {
    if (!isObject(effect) || !isNormalizedString(effect.path)) continue;
    const parts = effect.path.split(".");
    if (parts[0] !== "crowd_entities" || !knownCrowdIds.has(parts[1])) continue;
    const entityId = parts[1];
    changedIds.add(entityId);
    if (parts.length === 3 && parts[2] === "continuity_state" && "set" in effect
      && isNormalizedString(effect.set) && effect.set.includes(entityId)) {
      continuityUpdates.add(entityId);
    }
  }

  for (const entityId of changedIds) {
    if (!action.includes(entityId)) errors.push(`${label}: CROWD_STATE_CHANGE_MUST_BE_NAMED_IN_EVENT: ${entityId}`);
    if (unchangedIds.has(entityId)) errors.push(`${label}: CROWD_STATE_CANNOT_CHANGE_AND_BE_UNCHANGED: ${entityId}`);
    if (!continuityUpdates.has(entityId)) errors.push(`${label}: CROWD_CONTINUITY_STATE_EFFECT_REQUIRED: ${entityId}`);
  }
  for (const entityId of knownCrowdIds) {
    if (action.includes(entityId) && !changedIds.has(entityId) && !unchangedIds.has(entityId)) {
      errors.push(`${label}: CROWD_STATE_EFFECT_OR_UNCHANGED_REQUIRED: ${entityId}`);
    }
  }
}

function validateMechanismRequirements(clip, label, events) {
  const specialRules = clip.special_rules ?? [];
  if (!Array.isArray(specialRules)) {
    errors.push(`${label}.special_rules must be an array`);
    return;
  }
  const seenSpecialRules = new Set();
  for (const [index, rule] of specialRules.entries()) {
    if (!isNormalizedString(rule) || /[\r\n]/u.test(rule) || rule.startsWith("特殊规则：")) {
      errors.push(`${label}.special_rules[${index}] must be a normalized single-line rule without the 特殊规则： label`);
    } else if (seenSpecialRules.has(rule)) {
      errors.push(`${label}.special_rules contains duplicate rule ${rule}`);
    } else {
      seenSpecialRules.add(rule);
    }
  }

  const requirements = clip.mechanism_requirements ?? [];
  if (!Array.isArray(requirements)) {
    errors.push(`${label}.mechanism_requirements must be an array`);
    return;
  }

  const triggerEventIdsByMechanism = new Map();
  for (const [eventIndex, event] of events.entries()) {
    if (!isObject(event) || !("mechanism_id" in event)) continue;
    if (!isNormalizedString(event.mechanism_id) || !mechanismIdPattern.test(event.mechanism_id)) {
      errors.push(`${label}.events[${eventIndex}].mechanism_id must be a stable ASCII mechanism id`);
      continue;
    }
    const triggerIds = triggerEventIdsByMechanism.get(event.mechanism_id) ?? [];
    triggerIds.push(event.id);
    triggerEventIdsByMechanism.set(event.mechanism_id, triggerIds);
  }

  const requirementIds = new Set();
  const requirementRules = new Set();
  for (const [index, requirement] of requirements.entries()) {
    const requirementLabel = `${label}.mechanism_requirements[${index}]`;
    if (!isObject(requirement)) {
      errors.push(`${requirementLabel} must be an object`);
      continue;
    }
    for (const field of Object.keys(requirement)) {
      if (!compiledMechanismRequirementFields.has(field)) errors.push(`${requirementLabel}: unsupported field ${field}`);
    }
    if (!isNormalizedString(requirement.id) || !mechanismIdPattern.test(requirement.id)) {
      errors.push(`${requirementLabel}.id must be a stable ASCII mechanism id`);
      continue;
    }
    if (requirementIds.has(requirement.id)) errors.push(`${label}.mechanism_requirements contains duplicate id ${requirement.id}`);
    requirementIds.add(requirement.id);

    if (!Array.isArray(requirement.source_refs) || requirement.source_refs.length === 0
      || requirement.source_refs.some((sourceRef) => !isNormalizedString(sourceRef) || /[\r\n]/u.test(sourceRef))) {
      errors.push(`${requirementLabel}.source_refs must be a non-empty array of normalized single-line source references`);
    }
    if (!isNormalizedString(requirement.rule) || /[\r\n]/u.test(requirement.rule) || requirement.rule.startsWith("特殊规则：")) {
      errors.push(`${requirementLabel}.rule must be a normalized single-line rule without the 特殊规则： label`);
    } else {
      if (requirementRules.has(requirement.rule)) errors.push(`${label}.mechanism_requirements contains duplicate rule ${requirement.rule}`);
      requirementRules.add(requirement.rule);
      const ruleCount = specialRules.filter((rule) => rule === requirement.rule).length;
      if (ruleCount !== 1) errors.push(`${requirementLabel}: MECHANISM_RULE_MUST_APPEAR_EXACTLY_ONCE_IN_SPECIAL_RULES`);
    }

    const actualTriggerEventIds = triggerEventIdsByMechanism.get(requirement.id) ?? [];
    if (actualTriggerEventIds.length === 0) errors.push(`${requirementLabel}: STALE_MECHANISM_REQUIREMENT has no tagged event in this block`);
    if (!Array.isArray(requirement.trigger_event_ids)
      || JSON.stringify(requirement.trigger_event_ids) !== JSON.stringify(actualTriggerEventIds)) {
      errors.push(`${requirementLabel}: trigger_event_ids do not match current block event tags`);
    }

    const persistentStatePaths = requirement.persistent_state_paths ?? [];
    if (!Array.isArray(persistentStatePaths)) {
      errors.push(`${requirementLabel}.persistent_state_paths must be an array`);
      continue;
    }
    const triggerEvents = events.filter((event) => event?.mechanism_id === requirement.id);
    const seenPersistentStatePaths = new Set();
    for (const [pathIndex, statePath] of persistentStatePaths.entries()) {
      if (!isNormalizedString(statePath)) {
        errors.push(`${requirementLabel}.persistent_state_paths[${pathIndex}] must be a normalized state path`);
        continue;
      }
      if (seenPersistentStatePaths.has(statePath)) errors.push(`${requirementLabel}.persistent_state_paths contains duplicate path ${statePath}`);
      seenPersistentStatePaths.add(statePath);
      const hasTriggerEffect = triggerEvents.some((event) => (event.effects ?? []).some((effect) => effect?.path === statePath));
      if (!hasTriggerEffect) errors.push(`${requirementLabel}: MECHANISM_PERSISTENT_STATE_PATH_REQUIRES_TRIGGER_EFFECT ${statePath}`);
      if (getAt(clip.end_state, statePath) === undefined) {
        errors.push(`${requirementLabel}: MECHANISM_PERSISTENT_STATE_PATH_MISSING_AT_BLOCK_END ${statePath}`);
      }
    }
  }

  for (const mechanismId of triggerEventIdsByMechanism.keys()) {
    if (!requirementIds.has(mechanismId)) {
      errors.push(`${label}: MECHANISM_REQUIREMENT_MISSING for event mechanism_id ${mechanismId}`);
    }
  }
}

if (!isObject(manifest)) errors.push("state manifest root must be an object");
if (manifestRoot.version !== "1.0") errors.push("version must be 1.0");
if (manifestRoot.schema_version !== "2.1") errors.push("schema_version must be 2.1");
if (!isNormalizedString(manifestRoot.scene_id)) errors.push("scene_id must be a nonempty normalized string");
const rootProjectionMode = manifestRoot.projection_mode ?? projectionMode;
if (rootProjectionMode !== projectionMode) {
  errors.push("projection_mode must be dialogue_autocut; explicit_shots and mixed platform projections are retired");
}
const clips = Array.isArray(manifestRoot.clips) ? manifestRoot.clips : [];
if (!clips.length) errors.push("clips must be a non-empty array");
validateSourceActionLocks(manifestRoot.source_action_locks, clips);
const compiledBlocksById = new Map((Array.isArray(manifestRoot.blocks) ? manifestRoot.blocks : [])
  .filter((block) => isObject(block) && isNormalizedString(block.id))
  .map((block) => [block.id, block]));
validateStateShape(manifestRoot.initial_state, "initial_state");
const assetCoverageRules = validateAssetCoverageRules(manifestRoot.asset_coverage_rules, manifestRoot.initial_state);
for (const rule of assetCoverageRules) {
  for (const term of rule.global_forbidden_terms) {
    if (String(manifestRoot.scene_global_master ?? "").includes(term)) {
      errors.push(`MUTABLE_VISUAL_STATE_IN_GLOBAL: ${term} belongs in world state and state-conditioned asset coverage, not scene_global_master`);
    }
  }
}
const knownCharacterIds = new Set(Object.keys(manifestRoot.initial_state?.characters ?? {}));
const knownActionSubjectIds = new Set();
for (const collection of entityStateCollections) {
  for (const id of Object.keys(manifestRoot.initial_state?.[collection] ?? {})) knownActionSubjectIds.add(id);
}
const knownCrowdIds = new Set(Object.keys(manifestRoot.initial_state?.crowd_entities ?? {}));

let previousEnd = manifestRoot.initial_state;
const clipIds = new Set();

for (const [clipIndex, clip] of clips.entries()) {
  if (!isObject(clip)) {
    errors.push(`clips[${clipIndex}]: clip must be an object`);
    continue;
  }
  const label = `clips[${clipIndex}]${clip.id ? ` ${clip.id}` : ""}`;
  if (!isNormalizedString(clip.id)) errors.push(`${label}: id must be a nonempty normalized string`);
  else {
    if (clipIds.has(clip.id)) errors.push(`${label}: duplicate id`);
    clipIds.add(clip.id);
  }
  if ("duration_s" in clip && !(typeof clip.duration_s === "number" && Number.isFinite(clip.duration_s) && clip.duration_s > 0 && clip.duration_s <= 15)) {
    errors.push(`${label}: duration_s must be a finite number > 0 and <= 15`);
  }
  const clipProjectionMode = clip.projection_mode ?? rootProjectionMode;
  if (clipProjectionMode !== projectionMode) {
    errors.push(`${label}: projection_mode must resolve to dialogue_autocut`);
  } else if (clipProjectionMode !== rootProjectionMode) {
    errors.push(`${label}: projection_mode does not match scene projection_mode ${rootProjectionMode}`);
  }
  if (!Array.isArray(clip.events) || clip.events.length === 0) errors.push(`${label}: events must be non-empty`);
  validateStateShape(clip.start_state, `${label}.start_state`);
  validateStateShape(clip.end_state, `${label}.end_state`);

  const expectedOpeningActorStateMap = expectedOpeningActorStates(clip.start_state);
  if (!equal(clip.opening_actor_states ?? {}, expectedOpeningActorStateMap)) {
    errors.push(`${label}: opening_actor_states does not match the visible formal characters in start_state`);
  }

  const expectedOpeningSpeakerStateMap = expectedOpeningSpeakerStates(clip.start_state, clip.events);
  if (!equal(clip.opening_speaker_states ?? {}, expectedOpeningSpeakerStateMap)) {
    errors.push(`${label}: opening_speaker_states does not match the offscreen formal dialogue speakers in this block`);
  }

  const expectedOpeningCrowdStates = Object.fromEntries(Object.entries(clip.start_state?.crowd_entities ?? {})
    .filter(([, entity]) => entity?.present === true));
  if (!equal(clip.opening_crowd_states ?? {}, expectedOpeningCrowdStates)) {
    errors.push(`${label}: opening_crowd_states does not match the present crowd entities in start_state`);
  }

  if (!equal(clip.start_state, previousEnd)) {
    errors.push(`${label}: start_state does not equal previous verified end state`);
  }

  const computed = clone(clip.start_state ?? {});
  const stateSnapshots = [["start_state", clone(computed)]];
  const visibleCharacterIds = new Set(visibleFormalCharacterIds(computed));
  const eventIds = new Set();

  const events = Array.isArray(clip.events) ? clip.events : [];
  const dialogueSpeakers = dialogueSpeakersOfEvents(events);
  const audioOnlySpeakers = [];
  const seenAudioOnlySpeakers = new Set();
  if (clip.audio_only_speakers !== undefined && !Array.isArray(clip.audio_only_speakers)) {
    errors.push(`${label}.audio_only_speakers must be an array`);
  }
  for (const [audioOnlyIndex, characterId] of (Array.isArray(clip.audio_only_speakers) ? clip.audio_only_speakers : []).entries()) {
    const itemLabel = `${label}.audio_only_speakers[${audioOnlyIndex}]`;
    if (!isNormalizedString(characterId)) {
      errors.push(`${itemLabel} must be a normalized character id`);
      continue;
    }
    if (!knownCharacterIds.has(characterId)) errors.push(`${itemLabel}: AUDIO_ONLY_SPEAKER_UNKNOWN_CHARACTER ${characterId}`);
    if (seenAudioOnlySpeakers.has(characterId)) errors.push(`${label}.audio_only_speakers contains duplicate character ${characterId}`);
    seenAudioOnlySpeakers.add(characterId);
    if (!dialogueSpeakers.has(characterId)) errors.push(`${itemLabel}: AUDIO_ONLY_SPEAKER_REQUIRES_ATTRIBUTED_DIALOGUE ${characterId}`);
    if (clip.start_state?.characters?.[characterId]?.visible === true) {
      errors.push(`${label}.start_state: AUDIO_ONLY_SPEAKER_MUST_START_OFFSCREEN ${characterId}`);
    }
    if (visibleStateText(clip.start_state).includes(characterId)) {
      errors.push(`${label}.start_state: AUDIO_ONLY_SPEAKER_VISIBLE_STATE_MENTION_FORBIDDEN ${characterId}`);
    }
    for (const [eventIndex, event] of events.entries()) {
      if (stripAttributedDialogue(event?.visible_action).includes(characterId)) {
        errors.push(`${label}.events[${eventIndex}] ${event?.id ?? ""}: AUDIO_ONLY_SPEAKER_VISUAL_PROSE_FORBIDDEN ${characterId}`);
      }
    }
    audioOnlySpeakers.push(characterId);
  }
  for (const [eventIndex, event] of events.entries()) {
    if (!isObject(event)) {
      errors.push(`${label}.events[${eventIndex}]: event must be an object`);
      continue;
    }
    const eventLabel = `${label}.events[${eventIndex}]${event.id ? ` ${event.id}` : ""}`;
    const beforeEventState = clone(computed);
    for (const diagnostic of eventRealizationDiagnostics(event.visible_action)) errors.push(`${eventLabel}: ${diagnostic}`);
    validateCrowdEventContract(event, eventLabel, knownCrowdIds);

    if (!isNormalizedString(event.id)) errors.push(`${eventLabel}: id must be a nonempty normalized string`);
    else {
      if (eventIds.has(event.id)) errors.push(`${eventLabel}: duplicate id`);
      eventIds.add(event.id);
    }
    if (!event.visible_action || typeof event.visible_action !== "string") {
      errors.push(`${eventLabel}: missing visible_action`);
    } else {
      if (gazeFramingVerbPattern.test(stripQuotedDialogue(event.visible_action))) {
        errors.push(`${eventLabel}: GAZE_FRAMING_VERB_FORBIDDEN; replace gaze wording with 角色名的头部朝向目标`);
      }
      const doorwayDiagnostic = doorwayAutocutDiagnostic(event.visible_action);
      if (doorwayDiagnostic) errors.push(`${eventLabel}: ${doorwayDiagnostic}`);
      const boundaryDiagnostic = boundaryTextDiagnostic(event.visible_action);
      if (boundaryDiagnostic) errors.push(`${eventLabel}: ${boundaryDiagnostic}`);
      for (const diagnostic of criticalActionCausalityDiagnostics(event.visible_action, [...knownActionSubjectIds])) {
        errors.push(`${eventLabel}: ${diagnostic.code}; ${diagnostic.detail}`);
      }
      
      if (defensiveFootwearContinuityPatterns.some((pattern) => pattern.test(JSON.stringify(event)))) {
        errors.push(`${eventLabel}: DEFENSIVE_FOOTWEAR_CONTINUITY_FORBIDDEN`);
      }
    }

    if (event.preconditions !== undefined && !Array.isArray(event.preconditions)) {
      errors.push(`${eventLabel}: preconditions must be an array`);
    }
    for (const precondition of Array.isArray(event.preconditions) ? event.preconditions : []) {
      if (!isObject(precondition)) {
        errors.push(`${eventLabel}: invalid precondition`);
        continue;
      }
      if (!isNormalizedString(precondition.path) || !("equals" in precondition)) {
        errors.push(`${eventLabel}: invalid precondition`);
        continue;
      }
      validateCrowdPath(precondition.path, eventLabel, knownCrowdIds);
      
      const actual = getAt(computed, precondition.path);
      if (!equal(actual, precondition.equals)) {
        errors.push(`${eventLabel}: precondition failed at ${precondition.path}; expected ${JSON.stringify(precondition.equals)}, got ${JSON.stringify(actual)}`);
      }
    }

    if (event.effects !== undefined && !Array.isArray(event.effects)) {
      errors.push(`${eventLabel}: effects must be an array`);
    }
    for (const effect of Array.isArray(event.effects) ? event.effects : []) {
      try {
        if (!isObject(effect)) throw new Error("effect must be an object");
        if (!isNormalizedString(effect.path)) throw new Error("effect missing or invalid path");
        if ("set" in effect && effect.path.endsWith(".facing") && typeof effect.set === "string"
          && gazeFramingVerbPattern.test(effect.set)) {
          throw new Error("GAZE_FRAMING_VERB_FORBIDDEN; facing stores only the target or world-space direction");
        }
        if ("set" in effect && effect.path.endsWith(".emotion") && typeof effect.set === "string"
          && performanceViewpointTermPattern.test(effect.set)) {
          throw new Error("PERFORMANCE_VIEWPOINT_TERM_FORBIDDEN; describe the attitude without 正面, 背面, or 侧面");
        }
        if ("set" in effect && effect.path === "scene.handoff" && typeof effect.set === "string"
          && gazeFramingVerbPattern.test(stripQuotedDialogue(effect.set))) {
          throw new Error("GAZE_FRAMING_VERB_FORBIDDEN; express world-space orientation as 角色名的头部朝向目标");
        }
        validateCrowdPath(effect.path, eventLabel, knownCrowdIds);
        
        const operations = Number("set" in effect) + Number("append" in effect) + Number(effect.remove === true);
        if (operations !== 1) throw new Error("effect must use exactly one of set, append, or remove:true");
        if ("set" in effect) setAt(computed, effect.path, effect.set);
        else if ("append" in effect) appendAt(computed, effect.path, effect.append);
        else removeAt(computed, effect.path);
      } catch (error) {
        errors.push(`${eventLabel}: ${error.message}`);
      }
    }
    for (const diagnostic of physicalStateDiagnostics(event, computed)) errors.push(`${eventLabel}: ${diagnostic}`);
    for (const diagnostic of taskCompletionDiagnostics(event, beforeEventState, computed)) errors.push(`${eventLabel}: ${diagnostic}`);
    
    stateSnapshots.push([`event_state:${event.id}`, clone(computed)]);
    for (const [name, characterState] of Object.entries(computed.characters ?? {})) {
      if (isNormalizedString(characterState?.position)) {
        validateBoundaryRelation(characterState, `${eventLabel}: character ${name}`);
      }
    }
    for (const characterId of audioOnlySpeakers) {
      if (computed.characters?.[characterId]?.visible === true) {
        errors.push(`${eventLabel}: AUDIO_ONLY_SPEAKER_BECOMES_VISIBLE ${characterId}`);
      }
    }
    for (const characterId of visibleFormalCharacterIds(computed)) visibleCharacterIds.add(characterId);

  }

  validateMechanismRequirements(clip, label, events);

  const specialRules = Array.isArray(clip.special_rules) ? clip.special_rules : [];

  const audioOnlySpeakerSet = new Set(audioOnlySpeakers);
  for (const characterId of knownCharacterIds) {
    if (specialRules.includes(audioOnlySpeakerRule(characterId)) && !audioOnlySpeakerSet.has(characterId)) {
      errors.push(`${label}: AUDIO_ONLY_SPEAKER_RULE_STALE ${characterId}`);
    }
  }
  for (const characterId of audioOnlySpeakers) {
    const rule = audioOnlySpeakerRule(characterId);
    const ruleCount = specialRules.filter((candidate) => candidate === rule).length;
    if (ruleCount !== 1) errors.push(`${label}: AUDIO_ONLY_SPEAKER_RULE_REQUIRED_EXACTLY_ONCE ${characterId}`);
    if (visibleStateText(computed).includes(characterId)) {
      errors.push(`${label}.end_state: AUDIO_ONLY_SPEAKER_VISIBLE_STATE_MENTION_FORBIDDEN ${characterId}`);
    }
  }

  const audioOnlyRules = audioOnlySpeakers.map(audioOnlySpeakerRule);
  const expectedRequiredAssets = deriveRequiredAssets(assetCoverageRules, clip.start_state, {
    ...clip,
    events: events.map((event) => ({
      ...event,
      visible_action: stripAudioOnlyAttributions(event?.visible_action, audioOnlySpeakers)
    })),
    special_rules: specialRules.filter((rule) => !audioOnlyRules.includes(rule))
  }, clip.end_state, [...stateSnapshots, ["end_state", clone(clip.end_state)]]);
  if (!equal(clip.required_assets, expectedRequiredAssets)) {
    errors.push(`${label}: required_assets do not match asset_coverage_rules and visible state/events`);
  }
  const compiledBlock = compiledBlocksById.get(clip.id);
  if (compiledBlock && !equal(compiledBlock.audio_only_speakers ?? [], clip.audio_only_speakers ?? [])) {
    errors.push(`${label}: blocks[].audio_only_speakers and clips[].audio_only_speakers must match exactly`);
  }
  if (!compiledBlock || !equal(compiledBlock.required_assets, clip.required_assets)) {
    errors.push(`${label}: blocks[].required_assets and clips[].required_assets must match exactly`);
  }

  if (!equal(computed, clip.end_state)) {
    errors.push(`${label}: declared end_state does not equal computed event result`);
  }
  for (const [name, startCharacter] of Object.entries(clip.start_state?.characters ?? {})) {
    const endKnowledge = clip.end_state?.characters?.[name]?.knowledge;
    if (!Array.isArray(startCharacter.knowledge) || !Array.isArray(endKnowledge)) continue;
    for (const fact of startCharacter.knowledge) {
      if (!endKnowledge.some((candidate) => equal(candidate, fact))) {
        errors.push(`${label}: character ${name} loses knowledge ${JSON.stringify(fact)}`);
      }
    }
  }
  previousEnd = clip.end_state;
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  console.error(`FAILED: ${errors.length} error(s)`);
  process.exit(1);
}

console.log(`OK: ${manifestRoot.scene_id} has ${clips.length} valid clip transition(s)`);
