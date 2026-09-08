#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = fileURLToPath(new URL("../", import.meta.url));
const scripts = {
  compiler: path.join(skillDir, "scripts", "compile_scene_plan.mjs"),
  state: path.join(skillDir, "scripts", "validate_scene_state.mjs"),
  prompt: path.join(skillDir, "scripts", "validate_seedance_prompt.mjs")
};
const profiles = new Set(["quick", "continuity", "production"]);
const PLATFORM_PROJECTION_MODE = "dialogue_autocut";

class DeliveryError extends Error {}

function usage() {
  console.error("Usage: node validate_scene_delivery.mjs --profile quick [--projection-mode dialogue_autocut] <prompt.txt-or-md>");
  console.error("   or: node validate_scene_delivery.mjs --profile continuity|production --scene-plan <scene-plan.json> [--compiled-output <compiled-scene.json>] [--projection-mode dialogue_autocut] <prompt.txt-or-md>");
}

function parseArguments(argv) {
  let profile;
  let scenePlan;
  let compiledOutput;
  let prompt;
  let projectionMode;
  let allowTimestamps = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--profile") {
      if (profile !== undefined || index + 1 >= argv.length) throw new DeliveryError("--profile requires exactly one value");
      profile = argv[index + 1];
      index += 1;
    } else if (argument === "--scene-plan") {
      if (scenePlan !== undefined || index + 1 >= argv.length) throw new DeliveryError("--scene-plan requires exactly one path");
      scenePlan = argv[index + 1];
      index += 1;
    } else if (argument === "--compiled-output") {
      if (compiledOutput !== undefined || index + 1 >= argv.length) throw new DeliveryError("--compiled-output requires exactly one path");
      compiledOutput = argv[index + 1];
      index += 1;
    } else if (argument === "--projection-mode") {
      if (projectionMode !== undefined || index + 1 >= argv.length) throw new DeliveryError("--projection-mode requires exactly one value");
      projectionMode = argv[index + 1];
      index += 1;
    } else if (argument === "--allow-timestamps") {
      allowTimestamps = true;
    } else if (argument.startsWith("--")) {
      throw new DeliveryError(`unknown option ${argument}`);
    } else if (prompt !== undefined) {
      throw new DeliveryError("exactly one prompt path is required");
    } else {
      prompt = argument;
    }
  }

  if (!profiles.has(profile)) throw new DeliveryError("profile must be quick, continuity, or production");
  if (projectionMode !== undefined && projectionMode !== "dialogue_autocut") {
    throw new DeliveryError("projection_mode must be dialogue_autocut; explicit_shots and mixed platform projections are retired");
  }
  if (!prompt) throw new DeliveryError("prompt path is required");
  if (profile === "quick" && (scenePlan || compiledOutput)) {
    throw new DeliveryError("quick profile does not accept --scene-plan or --compiled-output");
  }
  if (profile !== "quick" && !scenePlan) throw new DeliveryError(`${profile} profile requires --scene-plan`);
  if (compiledOutput && !scenePlan) throw new DeliveryError("--compiled-output requires --scene-plan");

  return { profile, scenePlan, compiledOutput, prompt, projectionMode, allowTimestamps };
}

function run(label, script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
  if (result.error) throw new DeliveryError(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    throw new DeliveryError(`${label} failed${output ? `\n${output}` : ""}`);
  }
}

function readPlanMetadata(scenePlanPath) {
  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(scenePlanPath, "utf8"));
  } catch (error) {
    throw new DeliveryError(`cannot read scene plan: ${error.message}`);
  }
  return {
    profile: plan?.profile,
    projectionMode: plan?.projection_mode ?? "dialogue_autocut"
  };
}

function main() {
  let tempDir;
  try {
    const options = parseArguments(process.argv.slice(2));
    const promptArgs = ["--profile", options.profile];

    if (options.profile === "quick") {
      const resolvedProjectionMode = options.projectionMode ?? PLATFORM_PROJECTION_MODE;
      promptArgs.push("--projection-mode", resolvedProjectionMode);
      if (options.allowTimestamps) promptArgs.push("--allow-timestamps");
      run("prompt validation", scripts.prompt, [...promptArgs, options.prompt]);
      console.log(`OK: Seedance structural and realization checks passed with quick profile and ${resolvedProjectionMode} projection; source fidelity and observable execution still require manual review`);
      return;
    }

    const planMetadata = readPlanMetadata(options.scenePlan);
    if (planMetadata.projectionMode !== PLATFORM_PROJECTION_MODE) {
      throw new DeliveryError("projection_mode must be dialogue_autocut; explicit_shots and mixed platform projections are retired");
    }
    if (planMetadata.profile !== options.profile) {
      throw new DeliveryError(`scene plan profile ${JSON.stringify(planMetadata.profile)} does not match requested profile ${options.profile}`);
    }
    if (options.projectionMode !== undefined && options.projectionMode !== planMetadata.projectionMode) {
      throw new DeliveryError(`requested projection mode ${options.projectionMode} does not match scene plan projection_mode ${planMetadata.projectionMode}`);
    }
    const projectionMode = options.projectionMode ?? planMetadata.projectionMode;
    promptArgs.push("--projection-mode", projectionMode);
    if (options.allowTimestamps) promptArgs.push("--allow-timestamps");

    let compiledFile = options.compiledOutput;
    if (!compiledFile) {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seedance-delivery-"));
      compiledFile = path.join(tempDir, "compiled-scene.json");
    }

    run("scene compilation", scripts.compiler, [options.scenePlan, "--output", compiledFile]);
    run("state validation", scripts.state, [compiledFile]);

    promptArgs.push("--state", compiledFile);
    run("prompt validation", scripts.prompt, [...promptArgs, options.prompt]);
    console.log(`OK: Seedance structural and realization checks passed with ${options.profile} profile and ${projectionMode} projection; source fidelity and observable execution still require manual review`);
  } catch (error) {
    usage();
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main();
