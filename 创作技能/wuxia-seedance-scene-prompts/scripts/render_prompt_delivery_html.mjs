#!/usr/bin/env node
// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0

import {validateAssetUploadMode} from './asset_upload_contract.mjs';
import fs from "node:fs";
import { promptRealizationDiagnostics } from "./prompt_realization.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { escapeHtml, renderDeliveryCard, renderDeliveryShell, renderStyleReferences } from "./prompt_delivery_layout.mjs";

function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

function requireText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function parseArgs(argv) {
  const input = argv[2];
  const outputIndex = argv.indexOf("--output");
  const output = outputIndex >= 0 ? argv[outputIndex + 1] : null;
  if (!input || !output) {
    fail("usage: render_prompt_delivery_html.mjs <delivery-manifest.json> --output <delivery.html>");
  }
  return { input: path.resolve(input), output: path.resolve(output) };
}

export function loadManifest(inputPath) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  } catch (error) {
    fail(`cannot read manifest: ${error.message}`);
  }

  const title = requireText(manifest?.title, "title");
  const assetCoverageContract = manifest?.asset_coverage_contract;
  if (assetCoverageContract !== undefined && assetCoverageContract !== "required-assets-v1") {
    fail("asset_coverage_contract must be required-assets-v1 when present");
  }
  if (!Array.isArray(manifest.blocks) || manifest.blocks.length === 0) {
    fail("blocks must be a non-empty array");
  }

  const blockIds = new Set();
  const blocks = manifest.blocks.map((block, blockIndex) => {
    const label = `blocks[${blockIndex}]`;
    const id = requireText(block?.id, `${label}.id`);
    const durationStatus = requireText(block?.duration_status, `${label}.duration_status`);
    const prompt = requireText(block?.prompt, `${label}.prompt`);
    const realizationErrors = promptRealizationDiagnostics(prompt, {startState:block.start_state,endState:block.end_state,assets:block.assets});
    if (realizationErrors.length) fail(`${label}: ${realizationErrors.join("; ")}`);

    if (blockIds.has(id)) fail(`duplicate block id: ${id}`);
    blockIds.add(id);

    let uploadMode;
    try { uploadMode = validateAssetUploadMode(block); } catch (error) { fail(`${label}: ${error.message}`); }

    const assetIds = new Set();
    const assets = block.assets.map((asset, assetIndex) => {
      const assetLabel = `${label}.assets[${assetIndex}]`;
      const assetId = requireText(asset?.id, `${assetLabel}.id`);
      const assetPath = requireText(asset?.path, `${assetLabel}.path`);

      if (assetIds.has(assetId)) fail(`${label} has duplicate asset id: ${assetId}`);
      assetIds.add(assetId);
      if (!path.isAbsolute(assetPath)) {
        fail(`${assetLabel}.path must be an absolute path`);
      }
      if (!/\.(avif|gif|jpe?g|png|webp)$/i.test(assetPath)) {
        fail(`${assetLabel}.path must end with a supported image extension`);
      }

      let stat;
      try {
        stat = fs.statSync(assetPath);
      } catch {
        fail(`${assetLabel}.path does not exist: ${assetPath}`);
      }
      if (!stat.isFile()) fail(`${assetLabel}.path is not a file: ${assetPath}`);

      return {
        id: assetId,
        path: assetPath,
        usage: asset.usage,
      };
    });

    if (assetCoverageContract === "required-assets-v1" && !Array.isArray(block.required_assets)) {
      fail(`${label}.required_assets must be supplied when asset_coverage_contract is required-assets-v1`);
    }
    const requiredAssets = (block.required_assets ?? []).map((asset, assetIndex) => {
      const assetLabel = `${label}.required_assets[${assetIndex}]`;
      return {
        id: requireText(asset?.id, `${assetLabel}.id`),
        path: requireText(asset?.path, `${assetLabel}.path`)
      };
    });
    const requiredAssetIds = new Set();
    for (const requiredAsset of requiredAssets) {
      if (requiredAssetIds.has(requiredAsset.id)) {
        fail(`${label}.required_assets has duplicate asset id: ${requiredAsset.id}`);
      }
      requiredAssetIds.add(requiredAsset.id);
      const exactAsset = assets.find((asset) => asset.id === requiredAsset.id && asset.path === requiredAsset.path);
      if (!exactAsset) {
        fail(`VISIBLE_ASSET_COVERAGE_MISSING: ${id} requires ${requiredAsset.id} at ${requiredAsset.path}`);
      }
    }

    return { id, title: block.title, durationStatus, prompt, assets, requiredAssets, ...uploadMode };
  });

  return { title, blocks, assetCoverageContract, style_references: manifest.style_references };
}

export function renderPage(manifest) {
  const generatedAt = new Intl.DateTimeFormat("zh-CN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Shanghai" }).format(new Date());
  return renderDeliveryShell({
    title: manifest.title, units: manifest.blocks,
    introHtml: `<header class="hero"><div class="kicker">Local Seedance delivery</div><h1>${escapeHtml(manifest.title)}</h1><p>${manifest.blocks.length} 个执行区块 · 生成于 ${escapeHtml(generatedAt)}</p></header>${renderStyleReferences(manifest.style_references)}`,
    bodyHtml: manifest.blocks.map((block,index)=>renderDeliveryCard({
      id: block.id, title: block.title, eyebrow: "Seedance execution block",
      summary: `${block.durationStatus} · ${block.assets.length} 张图片`,
      assets: block.assets, asset_mode: block.asset_mode, asset_basis: block.asset_basis,
      prompt: block.prompt, promptId: `prompt-${index+1}`, pathsId: `asset-paths-${index+1}`,
    },index)).join("\n"),
  });
}

function main() {
  const { input, output } = parseArgs(process.argv);
  const manifest = loadManifest(input);
  const html = renderPage(manifest);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html, "utf8");
  process.stdout.write(`${output}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
