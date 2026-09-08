#!/usr/bin/env node
// Copyright (c) 2026 mtgh
// SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
// See repository LICENSE-TOOLS. Commercial use requires separate written authorization.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export class DirectorAssetPlanError extends Error {}

function reject(message) {
  throw new DirectorAssetPlanError(message);
}

function requireText(value, label) {
  if (typeof value !== "string" || value.trim() === "") reject(`${label} must be a non-empty string`);
  return value.trim();
}

function textArray(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    reject(`${label} must be ${allowEmpty ? "an" : "a non-empty"} array`);
  }
  const result = value.map((item, index) => requireText(item, `${label}[${index}]`));
  if (new Set(result).size !== result.length) reject(`${label} contains duplicate values`);
  return result;
}

function enumValue(value, allowed, label) {
  if (!allowed.includes(value)) reject(`${label} must be one of: ${allowed.join(", ")}`);
  return value;
}

function nonnegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    reject(`${label} must be a finite number zero or greater`);
  }
  return value;
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function validateFileRecord(record, label, { verifyFiles }) {
  if (!record || typeof record !== "object" || Array.isArray(record)) reject(`${label} must be an object`);
  const filePath = requireText(record.path, `${label}.path`);
  if (!path.isAbsolute(filePath)) reject(`${label}.path must be absolute`);
  const status = requireText(record.status, `${label}.status`);
  const sizeBytes = nonnegativeNumber(record.size_bytes, `${label}.size_bytes`);
  const mtime = requireText(record.mtime, `${label}.mtime`);
  if (Number.isNaN(Date.parse(mtime))) reject(`${label}.mtime must be a parseable date-time`);
  const sha256 = requireText(record.sha256, `${label}.sha256`);
  if (!/^[a-f0-9]{64}$/.test(sha256)) reject(`${label}.sha256 must be 64 lowercase hexadecimal characters`);

  if (verifyFiles) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      reject(`${label}.path does not exist: ${filePath}`);
    }
    if (!stat.isFile()) reject(`${label}.path is not a file: ${filePath}`);
    if (stat.size !== sizeBytes) reject(`${label}.size_bytes does not match current file size`);
    if (hashFile(filePath) !== sha256) reject(`${label}.sha256 does not match current file content`);
  }

  return { ...record, path: filePath, status, size_bytes: sizeBytes, mtime, sha256 };
}

function validateResolvedAsset(asset, label, { verifyFiles, requireUserPaths }) {
  if (!asset || typeof asset !== "object" || Array.isArray(asset)) reject(`${label} must be an object`);
  const id = requireText(asset.id, `${label}.id`);
  const status = requireText(asset.status, `${label}.status`);
  const assetPath = requireText(asset.path, `${label}.path`);
  if (!path.isAbsolute(assetPath)) reject(`${label}.path must be absolute`);
  if (!/\.(avif|gif|jpe?g|png|webp)$/i.test(assetPath)) reject(`${label}.path must end with a supported image extension`);
  if (verifyFiles) {
    let stat;
    try {
      stat = fs.statSync(assetPath);
    } catch {
      reject(`${label}.path does not exist: ${assetPath}`);
    }
    if (!stat.isFile()) reject(`${label}.path is not a file: ${assetPath}`);
  }
  return { id, status, path: assetPath };
}

function validateFormalSearch(search, label, expectedResult) {
  if (!search || typeof search !== "object" || Array.isArray(search)) reject(`${label} must be an object`);
  const query = requireText(search.query, `${label}.query`);
  const result = enumValue(search.result, ["EXACT_MATCH", "NO_MATCH"], `${label}.result`);
  if (result !== expectedResult) reject(`${label}.result must be ${expectedResult}`);
  const checkedAt = requireText(search.checked_at, `${label}.checked_at`);
  if (Number.isNaN(Date.parse(checkedAt))) reject(`${label}.checked_at must be a parseable date-time`);
  return { query, result, checked_at: checkedAt };
}

function validateDependencies(requirements) {
  const byId = new Map(requirements.map((item) => [item.id, item]));
  for (const item of requirements) {
    for (const dependencyId of item.dependencies) {
      if (!byId.has(dependencyId)) reject(`requirement ${item.id} depends on unknown requirement: ${dependencyId}`);
      if (dependencyId === item.id) reject(`requirement ${item.id} cannot depend on itself`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) reject(`requirement dependency cycle detected at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependencyId of byId.get(id).dependencies) visit(dependencyId);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
}

function validateVisualStateMachines(value, { required }) {
  if (value === undefined && !required) return { machines: [], byId: new Map() };
  if (!Array.isArray(value)) reject("visual_state_machines must be an array");
  const byId = new Map();
  const machines = value.map((machine, index) => {
    const label = `visual_state_machines[${index}]`;
    if (!machine || typeof machine !== "object" || Array.isArray(machine)) reject(`${label} must be an object`);
    const id = requireText(machine.id, `${label}.id`);
    if (byId.has(id)) reject(`duplicate visual state machine id: ${id}`);
    const statesInput = machine.states;
    if (!Array.isArray(statesInput) || statesInput.length < 2) reject(`${label}.states must contain at least two states`);
    const stateMap = new Map();
    const states = statesInput.map((state, stateIndex) => {
      const stateLabel = `${label}.states[${stateIndex}]`;
      if (!state || typeof state !== "object" || Array.isArray(state)) reject(`${stateLabel} must be an object`);
      const stateId = requireText(state.id, `${stateLabel}.id`);
      if (stateMap.has(stateId)) reject(`${label}.states contains duplicate state id: ${stateId}`);
      if (typeof state.requires_distinct_asset !== "boolean") reject(`${stateLabel}.requires_distinct_asset must be boolean`);
      const normalized = {
        id: stateId,
        description: requireText(state.description, `${stateLabel}.description`),
        source_refs: textArray(state.source_refs, `${stateLabel}.source_refs`),
        requires_distinct_asset: state.requires_distinct_asset,
      };
      stateMap.set(stateId, normalized);
      return normalized;
    });
    const initialState = requireText(machine.initial_state, `${label}.initial_state`);
    if (!stateMap.has(initialState)) reject(`${label}.initial_state references unknown state: ${initialState}`);
    if (!Array.isArray(machine.transitions) || machine.transitions.length === 0) reject(`${label}.transitions must be a non-empty array`);
    const transitionRefs = new Set();
    const transitions = machine.transitions.map((transition, transitionIndex) => {
      const transitionLabel = `${label}.transitions[${transitionIndex}]`;
      if (!transition || typeof transition !== "object" || Array.isArray(transition)) reject(`${transitionLabel} must be an object`);
      const eventRef = requireText(transition.event_ref, `${transitionLabel}.event_ref`);
      if (transitionRefs.has(eventRef)) reject(`${label}.transitions contains duplicate event_ref: ${eventRef}`);
      transitionRefs.add(eventRef);
      const from = requireText(transition.from, `${transitionLabel}.from`);
      const to = requireText(transition.to, `${transitionLabel}.to`);
      if (!stateMap.has(from)) reject(`${transitionLabel}.from references unknown state: ${from}`);
      if (!stateMap.has(to)) reject(`${transitionLabel}.to references unknown state: ${to}`);
      if (from === to) reject(`${transitionLabel} cannot self-loop`);
      return { event_ref: eventRef, from, to };
    });
    const reachable = new Set([initialState]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const transition of transitions) {
        if (reachable.has(transition.from) && !reachable.has(transition.to)) {
          reachable.add(transition.to);
          changed = true;
        }
      }
    }
    for (const stateId of stateMap.keys()) {
      if (!reachable.has(stateId)) reject(`${label}.states contains unreachable state from initial_state: ${stateId}`);
    }
    const normalized = {
      id,
      scene_id: requireText(machine.scene_id, `${label}.scene_id`),
      subject: requireText(machine.subject, `${label}.subject`),
      initial_state: initialState,
      states,
      transitions,
      stateMap,
    };
    byId.set(id, normalized);
    return normalized;
  });
  return { machines, byId };
}

export function validateDirectorAssetPlan(plan, options = {}) {
  const verifyFiles = options.verifyFiles ?? true;
  const requireUserPaths = false; // Public build accepts platform-native absolute paths.
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) reject("plan must be an object");
  const schemaVersion = enumValue(plan.schema_version, ["director-asset-plan/v1", "director-asset-plan/v2"], "schema_version");

  const planId = requireText(plan.plan_id, "plan_id");
  const title = requireText(plan.title, "title");
  const status = enumValue(plan.status, ["planning", "ready_for_user_confirmation", "confirmed_complete"], "status");
  if (typeof plan.confirmed_by_user !== "boolean") reject("confirmed_by_user must be boolean");
  const confirmationScope = typeof plan.confirmation_scope === "string" ? plan.confirmation_scope.trim() : "";
  if (status === "confirmed_complete") {
    if (!plan.confirmed_by_user) reject("confirmed_complete requires confirmed_by_user: true");
    if (confirmationScope === "") reject("confirmed_complete requires a non-empty confirmation_scope");
  } else {
    if (plan.confirmed_by_user) reject(`${status} cannot set confirmed_by_user: true`);
    if (confirmationScope !== "") reject(`${status} must keep confirmation_scope empty`);
  }

  const screenplay = validateFileRecord(plan.sources?.screenplay, "sources.screenplay", { verifyFiles });
  const director = validateFileRecord(plan.sources?.director, "sources.director", { verifyFiles });
  enumValue(screenplay.status, ["final", "accepted"], "sources.screenplay.status");
  enumValue(director.status, ["accepted", "final"], "sources.director.status");
  if (director.source_screenplay_sha256 !== screenplay.sha256) {
    reject("sources.director.source_screenplay_sha256 does not match current screenplay sha256");
  }
  const libraryRoot = requireText(plan.sources?.asset_library_root, "sources.asset_library_root");
  if (!path.isAbsolute(libraryRoot)) reject("sources.asset_library_root must be absolute");
  if (verifyFiles) {
    let stat;
    try {
      stat = fs.statSync(libraryRoot);
    } catch {
      reject(`sources.asset_library_root does not exist: ${libraryRoot}`);
    }
    if (!stat.isDirectory()) reject("sources.asset_library_root must be a directory");
  }

  if (!Array.isArray(plan.screenplay_asset_baseline) || plan.screenplay_asset_baseline.length === 0) {
    reject("screenplay_asset_baseline must be a non-empty array");
  }
  const baselineRefs = new Map();
  const normalizedBaseline = plan.screenplay_asset_baseline.map((item, index) => {
    const label = `screenplay_asset_baseline[${index}]`;
    const baselineRef = requireText(item?.baseline_ref, `${label}.baseline_ref`);
    if (baselineRefs.has(baselineRef)) reject(`duplicate screenplay baseline ref: ${baselineRef}`);
    const normalized = {
      baseline_ref: baselineRef,
      scene_id: requireText(item?.scene_id, `${label}.scene_id`),
      category: requireText(item?.category, `${label}.category`),
      required_visible_fact: requireText(item?.required_visible_fact, `${label}.required_visible_fact`),
    };
    baselineRefs.set(baselineRef, normalized);
    return normalized;
  });

  if (!Array.isArray(plan.director_critical_refs) || plan.director_critical_refs.length === 0) {
    reject("director_critical_refs must be a non-empty array");
  }
  const criticalRefs = new Map();
  const normalizedCritical = plan.director_critical_refs.map((item, index) => {
    const label = `director_critical_refs[${index}]`;
    const directorRef = requireText(item?.director_ref, `${label}.director_ref`);
    const priority = enumValue(item?.priority, ["P0", "P1"], `${label}.priority`);
    if (criticalRefs.has(directorRef)) reject(`duplicate director critical ref: ${directorRef}`);
    const normalized = {
      director_ref: directorRef,
      priority,
      protected_intent: requireText(item?.protected_intent, `${label}.protected_intent`),
      edit_refs: textArray(item?.edit_refs, `${label}.edit_refs`),
    };
    criticalRefs.set(directorRef, normalized);
    return normalized;
  });

  const { machines: normalizedVisualStateMachines, byId: visualStateMachineMap } = validateVisualStateMachines(
    plan.visual_state_machines,
    { required: schemaVersion === "director-asset-plan/v2" },
  );

  if (!Array.isArray(plan.requirements) || plan.requirements.length === 0) reject("requirements must be a non-empty array");
  const decisions = ["REUSE", "CREATE", "TEXT_ONLY", "NO_ASSET", "BLOCKED"];
  const priorities = ["P0", "P1", "P2", "BASE"];
  const assetTypes = ["DETAIL", "GROUPED_DETAIL", "EQUIPMENT_MASTER", "SCENE_MASTER", "PORTAL_CONTINUITY_MASTER", "DERIVED_VIEW", "ENVIRONMENT_STATE_DERIVED", "DETAIL_CLOSEUP", "DAMAGE_STATE", "CAPSULE_BLOCKING", "REFERENCE_ONLY", "NONE"];
  const downstreamUses = ["AUTO_EVENT", "DIRECTED_CAPTURE", "FALLBACK_CAPTURE", "SCENE_CONTINUITY", "NONE"];
  const noAssetCategories = ["EDIT_ONLY", "SOUND_ONLY", "TIMING_ONLY", "PERFORMANCE_ONLY", "CAMERA_MOTION_ONLY", "PROMPT_SUFFICIENT"];
  const requirementMap = new Map();

  const normalizedRequirements = plan.requirements.map((item, index) => {
    const label = `requirements[${index}]`;
    const id = requireText(item?.id, `${label}.id`);
    if (requirementMap.has(id)) reject(`duplicate requirement id: ${id}`);
    const decision = enumValue(item?.decision, decisions, `${label}.decision`);
    const priority = enumValue(item?.priority, priorities, `${label}.priority`);
    const baselineItemRefs = textArray(item?.baseline_refs, `${label}.baseline_refs`, { allowEmpty: true });
    const directorRefs = textArray(item?.director_refs, `${label}.director_refs`, { allowEmpty: true });
    if (baselineItemRefs.length === 0 && directorRefs.length === 0) {
      reject(`${label} must contain at least one baseline_ref or director_ref`);
    }
    for (const baselineRef of baselineItemRefs) {
      if (!baselineRefs.has(baselineRef)) reject(`${label} references unknown screenplay baseline ref: ${baselineRef}`);
    }
    const editRefs = textArray(item?.edit_refs, `${label}.edit_refs`);
    const sourceRefs = textArray(item?.source_refs, `${label}.source_refs`);
    const visualDependency = requireText(item?.visual_dependency, `${label}.visual_dependency`);
    const assetType = enumValue(item?.asset_type, assetTypes, `${label}.asset_type`);
    const rationale = requireText(item?.rationale, `${label}.rationale`);
    const uses = textArray(item?.downstream_uses, `${label}.downstream_uses`).map((value, useIndex) => enumValue(value, downstreamUses, `${label}.downstream_uses[${useIndex}]`));
    const dependencies = textArray(item?.dependencies, `${label}.dependencies`, { allowEmpty: true });
    const acceptance = textArray(item?.acceptance_criteria, `${label}.acceptance_criteria`, { allowEmpty: true });
    const fallbackStrategy = typeof item?.fallback_strategy === "string" ? item.fallback_strategy.trim() : "";
    if (priority === "P0" && decision !== "BLOCKED" && fallbackStrategy === "") reject(`${label}.fallback_strategy is required for non-blocked P0`);
    if (typeof item?.handoff_required !== "boolean") reject(`${label}.handoff_required must be boolean`);

    let stateBinding = null;
    if (item?.state_binding != null) {
      if (schemaVersion !== "director-asset-plan/v2") reject(`${label}.state_binding requires schema_version director-asset-plan/v2`);
      if (!item.state_binding || typeof item.state_binding !== "object" || Array.isArray(item.state_binding)) reject(`${label}.state_binding must be an object`);
      const machineId = requireText(item.state_binding.machine_id, `${label}.state_binding.machine_id`);
      const state = requireText(item.state_binding.state, `${label}.state_binding.state`);
      const machine = visualStateMachineMap.get(machineId);
      if (!machine) reject(`${label}.state_binding references unknown visual state machine: ${machineId}`);
      if (!machine.stateMap.has(state)) reject(`${label}.state_binding references unknown state ${state} in ${machineId}`);
      if (!["REUSE", "CREATE"].includes(decision)) reject(`${label}.state_binding requires REUSE or CREATE`);
      stateBinding = { machine_id: machineId, state };
    }

    const criticalPriorities = directorRefs.filter((ref) => criticalRefs.has(ref)).map((ref) => criticalRefs.get(ref).priority);
    if (criticalPriorities.includes("P0") && priority !== "P0") reject(`${label}.priority must be P0 because it protects a P0 director ref`);
    if (!criticalPriorities.includes("P0") && criticalPriorities.includes("P1") && priority !== "P1") reject(`${label}.priority must be P1 because it protects a P1 director ref`);
    if (["P0", "P1"].includes(priority) && criticalPriorities.length === 0) {
      reject(`${label} has ${priority} but carries no director_critical_refs entry`);
    }
    if (criticalPriorities.length > 0 && priority === "BASE") reject(`${label}.priority cannot be BASE when it protects a critical director ref`);
    if (criticalPriorities.length === 0 && baselineItemRefs.length > 0 && directorRefs.length === 0 && priority !== "BASE") {
      reject(`${label}.priority must be BASE for a baseline-only requirement`);
    }
    if (criticalPriorities.length === 0 && baselineItemRefs.length === 0 && priority !== "P2") {
      reject(`${label}.priority must be P2 for a non-critical director-only requirement`);
    }

    let formalSearch = null;
    let resolvedAsset = null;
    let proposedAsset = null;
    let textBlocking = "";
    let noAssetCategory = "";
    let noAssetReason = "";
    let blocker = "";

    if (decision === "REUSE") {
      if (assetType === "NONE") reject(`${label}.asset_type cannot be NONE for REUSE`);
      if (acceptance.length === 0) reject(`${label}.acceptance_criteria is required for REUSE`);
      formalSearch = validateFormalSearch(item.formal_search, `${label}.formal_search`, "EXACT_MATCH");
      resolvedAsset = validateResolvedAsset(item.resolved_asset, `${label}.resolved_asset`, { verifyFiles, requireUserPaths });
    } else if (decision === "CREATE") {
      if (assetType === "NONE") reject(`${label}.asset_type cannot be NONE for CREATE`);
      if (acceptance.length === 0) reject(`${label}.acceptance_criteria is required for CREATE`);
      formalSearch = validateFormalSearch(item.formal_search, `${label}.formal_search`, "NO_MATCH");
      if (!item.proposed_asset || typeof item.proposed_asset !== "object" || Array.isArray(item.proposed_asset)) {
        reject(`${label}.proposed_asset must be an object`);
      }
      proposedAsset = {
        planned_id: requireText(item.proposed_asset.planned_id, `${label}.proposed_asset.planned_id`),
        name: requireText(item.proposed_asset.name, `${label}.proposed_asset.name`),
      };
      if (item.resolved_asset != null) {
        resolvedAsset = validateResolvedAsset(item.resolved_asset, `${label}.resolved_asset`, { verifyFiles, requireUserPaths });
      }
    } else if (decision === "TEXT_ONLY") {
      if (assetType !== "NONE") reject(`${label}.asset_type must be NONE for TEXT_ONLY`);
      if (item.handoff_required) reject(`${label}.handoff_required must be false for TEXT_ONLY`);
      textBlocking = requireText(item.text_blocking, `${label}.text_blocking`);
    } else if (decision === "NO_ASSET") {
      if (assetType !== "NONE") reject(`${label}.asset_type must be NONE for NO_ASSET`);
      if (item.handoff_required) reject(`${label}.handoff_required must be false for NO_ASSET`);
      noAssetCategory = enumValue(item.no_asset_category, noAssetCategories, `${label}.no_asset_category`);
      noAssetReason = requireText(item.no_asset_reason, `${label}.no_asset_reason`);
    } else {
      if (assetType !== "NONE") reject(`${label}.asset_type must be NONE for BLOCKED`);
      if (item.handoff_required) reject(`${label}.handoff_required must be false for BLOCKED`);
      blocker = requireText(item.blocker, `${label}.blocker`);
    }

    const normalized = {
      ...item,
      id,
      decision,
      priority,
      baseline_refs: baselineItemRefs,
      director_refs: directorRefs,
      edit_refs: editRefs,
      source_refs: sourceRefs,
      visual_dependency: visualDependency,
      asset_type: assetType,
      rationale,
      downstream_uses: uses,
      dependencies,
      acceptance_criteria: acceptance,
      fallback_strategy: fallbackStrategy,
      handoff_required: item.handoff_required,
      ...(stateBinding ? { state_binding: stateBinding } : {}),
      ...(formalSearch ? { formal_search: formalSearch } : {}),
      ...(resolvedAsset ? { resolved_asset: resolvedAsset } : {}),
      ...(proposedAsset ? { proposed_asset: proposedAsset } : {}),
      ...(textBlocking ? { text_blocking: textBlocking } : {}),
      ...(noAssetCategory ? { no_asset_category: noAssetCategory, no_asset_reason: noAssetReason } : {}),
      ...(blocker ? { blocker } : {}),
    };
    requirementMap.set(id, normalized);
    return normalized;
  });

  validateDependencies(normalizedRequirements);

  for (const machine of normalizedVisualStateMachines) {
    for (const state of machine.states) {
      if (!state.requires_distinct_asset) continue;
      const covered = normalizedRequirements.some((requirement) => (
        ["REUSE", "CREATE"].includes(requirement.decision)
        && requirement.state_binding?.machine_id === machine.id
        && requirement.state_binding?.state === state.id
      ));
      if (!covered) reject(`visual state ${machine.id}/${state.id} requires a distinct asset but has no bound REUSE or CREATE requirement`);
    }
  }

  for (const baselineRef of baselineRefs.keys()) {
    if (!normalizedRequirements.some((item) => item.baseline_refs.includes(baselineRef))) {
      reject(`missing asset decision for screenplay baseline ref: ${baselineRef}`);
    }
  }

  for (const criticalRef of criticalRefs.keys()) {
    if (!normalizedRequirements.some((item) => item.director_refs.includes(criticalRef))) {
      reject(`missing asset decision for director critical ref: ${criticalRef}`);
    }
  }

  const createIds = normalizedRequirements.filter((item) => item.decision === "CREATE").map((item) => item.id);
  const creationOrder = textArray(plan.creation_order, "creation_order", { allowEmpty: createIds.length === 0 });
  if (creationOrder.length !== createIds.length || createIds.some((id) => !creationOrder.includes(id))) {
    reject("creation_order must contain every CREATE requirement exactly once");
  }
  const creationIndex = new Map(creationOrder.map((id, index) => [id, index]));
  for (const id of creationOrder) {
    const item = requirementMap.get(id);
    if (!item || item.decision !== "CREATE") reject(`creation_order contains non-CREATE or unknown requirement: ${id}`);
    for (const dependencyId of item.dependencies) {
      if (requirementMap.get(dependencyId)?.decision === "CREATE" && creationIndex.get(dependencyId) >= creationIndex.get(id)) {
        reject(`creation_order places ${id} before its CREATE dependency ${dependencyId}`);
      }
    }
  }

  const unresolvedCreateIds = normalizedRequirements.filter((item) => item.decision === "CREATE" && !item.resolved_asset).map((item) => item.id);
  const dispatchIds = textArray(plan.asset_prompt_dispatch_ids, "asset_prompt_dispatch_ids", { allowEmpty: unresolvedCreateIds.length === 0 });
  if (dispatchIds.length !== unresolvedCreateIds.length || unresolvedCreateIds.some((id) => !dispatchIds.includes(id))) {
    reject("asset_prompt_dispatch_ids must contain exactly the unresolved CREATE requirements");
  }

  const blockers = textArray(plan.unresolved_blockers, "unresolved_blockers", { allowEmpty: true });
  const hasBlockedDecision = normalizedRequirements.some((item) => item.decision === "BLOCKED");
  if (hasBlockedDecision && blockers.length === 0) reject("a BLOCKED requirement requires unresolved_blockers");
  if ((hasBlockedDecision || blockers.length > 0) && status !== "planning") reject("blocked or unresolved work requires status planning");

  if (!Array.isArray(plan.handoff_bindings)) reject("handoff_bindings must be an array");
  const bindingKeys = new Set();
  const bindingOrdersByScope = new Map();
  const normalizedBindings = plan.handoff_bindings.map((binding, index) => {
    const label = `handoff_bindings[${index}]`;
    const requirementId = requireText(binding?.requirement_id, `${label}.requirement_id`);
    const requirement = requirementMap.get(requirementId);
    if (!requirement) reject(`${label} references unknown requirement: ${requirementId}`);
    if (!requirement.handoff_required) reject(`${label} references a requirement with handoff_required: false`);
    if (!requirement.resolved_asset) reject(`${label} requirement has no resolved_asset`);
    const assetId = requireText(binding?.asset_id, `${label}.asset_id`);
    const assetPath = requireText(binding?.path, `${label}.path`);
    if (assetId !== requirement.resolved_asset.id || assetPath !== requirement.resolved_asset.path) {
      reject(`${label} asset identity does not match requirement resolved_asset`);
    }
    const scopeId = requireText(binding?.scope_id, `${label}.scope_id`);
    const order = nonnegativeNumber(binding?.order, `${label}.order`);
    if (!Number.isInteger(order) || order < 1) reject(`${label}.order must be a positive integer`);
    const uniqueKey = `${scopeId}\u0000${order}`;
    if (bindingKeys.has(uniqueKey)) reject(`${label} duplicates order ${order} inside scope ${scopeId}`);
    bindingKeys.add(uniqueKey);
    if (!bindingOrdersByScope.has(scopeId)) bindingOrdersByScope.set(scopeId, []);
    bindingOrdersByScope.get(scopeId).push(order);
    let stateBinding = null;
    if (requirement.state_binding) {
      if (!binding?.state_binding || typeof binding.state_binding !== "object" || Array.isArray(binding.state_binding)) {
        reject(`${label}.state_binding is required for state-bound requirement ${requirementId}`);
      }
      const machineId = requireText(binding.state_binding.machine_id, `${label}.state_binding.machine_id`);
      const state = requireText(binding.state_binding.state, `${label}.state_binding.state`);
      if (machineId !== requirement.state_binding.machine_id || state !== requirement.state_binding.state) {
        reject(`${label}.state_binding does not match requirement ${requirementId}`);
      }
      stateBinding = { machine_id: machineId, state };
    } else if (binding?.state_binding != null) {
      reject(`${label}.state_binding is not allowed because requirement ${requirementId} is not state-bound`);
    }
    return {
      requirement_id: requirementId,
      asset_id: assetId,
      path: assetPath,
      scope_id: scopeId,
      order,
      locks: requireText(binding?.locks, `${label}.locks`),
      do_not_inherit: requireText(binding?.do_not_inherit, `${label}.do_not_inherit`),
      ...(stateBinding ? { state_binding: stateBinding } : {}),
    };
  });

  for (const [scopeId, orders] of bindingOrdersByScope.entries()) {
    const sorted = [...orders].sort((a, b) => a - b);
    for (let index = 0; index < sorted.length; index += 1) {
      if (sorted[index] !== index + 1) reject(`handoff scope ${scopeId} must use consecutive order beginning at 1`);
    }
  }

  if (["ready_for_user_confirmation", "confirmed_complete"].includes(status)) {
    if (blockers.length > 0 || hasBlockedDecision) reject(`${status} cannot contain blockers`);
    if (dispatchIds.length > 0 || unresolvedCreateIds.length > 0) reject(`${status} cannot contain unresolved CREATE requirements`);
    for (const requirement of normalizedRequirements) {
      if (["REUSE", "CREATE"].includes(requirement.decision) && !requirement.resolved_asset) {
        reject(`${status} requires resolved_asset for ${requirement.id}`);
      }
      if (requirement.handoff_required && !normalizedBindings.some((binding) => binding.requirement_id === requirement.id)) {
        reject(`${status} requires a handoff binding for ${requirement.id}`);
      }
    }
  }

  return {
    ...plan,
    schema_version: schemaVersion,
    plan_id: planId,
    title,
    status,
    confirmed_by_user: plan.confirmed_by_user,
    confirmation_scope: confirmationScope,
    sources: { screenplay, director, asset_library_root: libraryRoot },
    screenplay_asset_baseline: normalizedBaseline,
    director_critical_refs: normalizedCritical,
    visual_state_machines: normalizedVisualStateMachines.map(({ stateMap: _stateMap, ...machine }) => machine),
    requirements: normalizedRequirements,
    creation_order: creationOrder,
    asset_prompt_dispatch_ids: dispatchIds,
    handoff_bindings: normalizedBindings,
    unresolved_blockers: blockers,
  };
}

export function loadAndValidateDirectorAssetPlan(inputPath, options = {}) {
  const absolutePath = path.resolve(inputPath);
  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    reject(`cannot read plan: ${error.message}`);
  }
  return validateDirectorAssetPlan(plan, options);
}

function main() {
  const input = process.argv[2];
  if (!input) {
    process.stderr.write("usage: validate_director_asset_plan.mjs <plan.json>\n");
    process.exit(2);
  }
  try {
    const plan = loadAndValidateDirectorAssetPlan(input);
    const counts = Object.fromEntries(["REUSE", "CREATE", "TEXT_ONLY", "NO_ASSET", "BLOCKED"].map((decision) => [decision, plan.requirements.filter((item) => item.decision === decision).length]));
    process.stdout.write(`OK: ${plan.screenplay_asset_baseline.length} screenplay baseline ref(s), ${plan.director_critical_refs.length} critical director ref(s), ${plan.requirements.length} requirement(s), REUSE=${counts.REUSE}, CREATE=${counts.CREATE}, TEXT_ONLY=${counts.TEXT_ONLY}, NO_ASSET=${counts.NO_ASSET}, BLOCKED=${counts.BLOCKED}, status=${plan.status}\n`);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
