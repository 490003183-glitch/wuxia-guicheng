#!/usr/bin/env node
// Copyright (c) 2026 mtgh
// SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
// See repository LICENSE-TOOLS. Commercial use requires separate written authorization.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requireText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function requireTextList(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty array`);
  }
  return value.map((item, index) => requireText(item, `${label}[${index}]`));
}

function parseArgs(argv) {
  const input = argv[2];
  const outputIndex = argv.indexOf("--output");
  const output = outputIndex >= 0 ? argv[outputIndex + 1] : null;
  if (!input || !output) {
    fail("usage: render_asset_prompt_delivery_html.mjs <delivery-manifest.json> --output <delivery.html>");
  }
  return { input: path.resolve(input), output: path.resolve(output) };
}

function validateImagePath(imagePath, label) {
  if (!path.isAbsolute(imagePath)) {
    fail(`${label} must be an absolute path`);
  }
  if (!/\.(avif|gif|jpe?g|png|webp)$/i.test(imagePath)) {
    fail(`${label} must end with a supported image extension`);
  }
  let stat;
  try {
    stat = fs.statSync(imagePath);
  } catch {
    fail(`${label} does not exist: ${imagePath}`);
  }
  if (!stat.isFile()) fail(`${label} is not a file: ${imagePath}`);
}

function loadManifest(inputPath) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  } catch (error) {
    fail(`cannot read manifest: ${error.message}`);
  }

  const title = requireText(manifest?.title, "title");
  const subtitle = typeof manifest?.subtitle === "string" ? manifest.subtitle.trim() : "";
  if (!Array.isArray(manifest?.assets) || manifest.assets.length === 0) {
    fail("assets must be a non-empty array");
  }

  const assetIds = new Set();
  const assets = manifest.assets.map((asset, assetIndex) => {
    const label = `assets[${assetIndex}]`;
    const id = requireText(asset?.id, `${label}.id`);
    const name = requireText(asset?.name, `${label}.name`);
    if (assetIds.has(id)) fail(`duplicate asset id: ${id}`);
    assetIds.add(id);

    const uploadSettings = asset?.upload_settings;
    if (!uploadSettings || typeof uploadSettings !== "object" || Array.isArray(uploadSettings)) {
      fail(`${label}.upload_settings must be an object`);
    }

    const references = asset?.references;
    if (!Array.isArray(references)) fail(`${label}.references must be an array`);

    const normalizedReferences = references.map((reference, referenceIndex) => {
      const referenceLabel = `${label}.references[${referenceIndex}]`;
      const hasPath = typeof reference?.path === "string" && reference.path.trim() !== "";
      const hasInstruction = typeof reference?.instruction === "string" && reference.instruction.trim() !== "";
      if (hasPath === hasInstruction) {
        fail(`${referenceLabel} must contain exactly one of path or instruction`);
      }

      const locks = requireText(reference?.locks, `${referenceLabel}.locks`);
      const doNotInherit = requireText(reference?.do_not_inherit, `${referenceLabel}.do_not_inherit`);

      if (hasInstruction) {
        return {
          type: "dependency",
          instruction: reference.instruction.trim(),
          locks,
          doNotInherit,
        };
      }

      const referencePath = reference.path.trim();
      validateImagePath(referencePath, `${referenceLabel}.path`);
      return {
        type: "image",
        id: requireText(reference?.id, `${referenceLabel}.id`),
        name: requireText(reference?.name, `${referenceLabel}.name`),
        path: referencePath,
        url: pathToFileURL(referencePath).href,
        locks,
        doNotInherit,
      };
    });

    return {
      id,
      name,
      source: requireText(asset?.source, `${label}.source`),
      dependency: requireText(asset?.dependency, `${label}.dependency`),
      background: requireText(asset?.background, `${label}.background`),
      aspectRatio: requireText(asset?.aspect_ratio, `${label}.aspect_ratio`),
      checkpoint: requireText(asset?.checkpoint, `${label}.checkpoint`),
      acceptanceCriteria: requireTextList(asset?.acceptance_criteria, `${label}.acceptance_criteria`),
      references: normalizedReferences,
      uploadSettings: {
        priority: requireText(uploadSettings.priority, `${label}.upload_settings.priority`),
        strength: requireText(uploadSettings.strength, `${label}.upload_settings.strength`),
        fallback: requireText(uploadSettings.fallback, `${label}.upload_settings.fallback`),
      },
      prompt: requireText(asset?.prompt, `${label}.prompt`),
    };
  });

  return { title, subtitle, assets };
}

function renderMetadata(asset) {
  const rows = [
    ["来源", asset.source],
    ["依赖关系", asset.dependency],
    ["生成背景", asset.background],
    ["画幅比例", asset.aspectRatio],
    ["确认点", asset.checkpoint],
  ];
  return rows.map(([key, value]) => `
      <div class="meta-row"><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
}

function renderReference(reference, index) {
  if (reference.type === "dependency") {
    return `
      <div class="dependency-row">
        <div class="upload-order">上传 ${index + 1} · 待补依赖</div>
        <strong>${escapeHtml(reference.instruction)}</strong>
        <p><b>锁定：</b>${escapeHtml(reference.locks)}</p>
        <p><b>不得继承：</b>${escapeHtml(reference.doNotInherit)}</p>
      </div>`;
  }

  return `
      <figure class="reference-item">
        <div class="upload-order">上传 ${index + 1}</div>
        <img src="${escapeHtml(reference.url)}" alt="${escapeHtml(`${reference.id} ${reference.name}`)}" loading="lazy">
        <figcaption>
          <strong>${escapeHtml(reference.id)} · ${escapeHtml(reference.name)}</strong>
          <code>${escapeHtml(reference.path)}</code>
          <p><b>锁定：</b>${escapeHtml(reference.locks)}</p>
          <p><b>不得继承：</b>${escapeHtml(reference.doNotInherit)}</p>
        </figcaption>
      </figure>`;
}

function renderAsset(asset, index) {
  const promptId = `prompt-${index + 1}`;
  const pathsId = `paths-${index + 1}`;
  const actualPaths = asset.references
    .filter((reference) => reference.type === "image")
    .map((reference) => reference.path)
    .join("\n");
  const pathButton = actualPaths
    ? `<button type="button" data-copy="${pathsId}">复制本条所有图片路径</button>`
    : `<button type="button" disabled>无需复制路径</button>`;
  const references = asset.references.length > 0
    ? `<div class="reference-grid">${asset.references.map(renderReference).join("")}</div>`
    : `<p class="empty-reference">无需上传参考图</p>`;

  return `
  <article class="asset-section">
    <header class="asset-header">
      <div>
        <span class="sequence">资产 ${String(index + 1).padStart(2, "0")}</span>
        <h2>${escapeHtml(asset.id)}</h2>
        <p class="asset-name">${escapeHtml(asset.name)}</p>
      </div>
      <span class="ratio">${escapeHtml(asset.aspectRatio)}</span>
    </header>

    <dl class="metadata">${renderMetadata(asset)}
    </dl>

    <section class="criteria-section">
      <h3>验收标准</h3>
      <ul>${asset.acceptanceCriteria.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>

    <section class="reference-section">
      <div class="section-heading">
        <h3>引用资产与上传顺序：</h3>
        ${pathButton}
      </div>
      <span id="${pathsId}" hidden>${escapeHtml(actualPaths)}</span>
      ${references}
      <dl class="upload-settings">
        <div><dt>上传优先级</dt><dd>${escapeHtml(asset.uploadSettings.priority)}</dd></div>
        <div><dt>参考强度</dt><dd>${escapeHtml(asset.uploadSettings.strength)}</dd></div>
        <div><dt>容量不足时</dt><dd>${escapeHtml(asset.uploadSettings.fallback)}</dd></div>
      </dl>
    </section>

    <section class="prompt-section">
      <div class="section-heading">
        <h3>完整提示词</h3>
        <button type="button" data-copy="${promptId}">复制提示词</button>
      </div>
      <pre id="${promptId}">${escapeHtml(asset.prompt)}</pre>
    </section>
  </article>`;
}

function renderPage(manifest) {
  const generatedAt = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date());

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(manifest.title)}</title>
  <style>
    :root {
      --page: #eceeed;
      --surface: #ffffff;
      --ink: #18201d;
      --muted: #66706b;
      --line: #c9cecb;
      --accent: #a43b2b;
      --accent-dark: #74271d;
      --soft: #f4f6f5;
      --code: #17211d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--page);
      font-family: "PingFang SC", "Noto Sans CJK SC", sans-serif;
      letter-spacing: 0;
    }
    main { width: min(1240px, calc(100% - 32px)); margin: 0 auto 72px; }
    .page-header { padding: 48px 0 28px; border-bottom: 2px solid var(--ink); }
    .page-header p { margin: 0; color: var(--muted); line-height: 1.7; }
    h1 { margin: 8px 0 10px; font: 750 clamp(32px, 5vw, 60px)/1.08 "PingFang SC", sans-serif; }
    .kicker, .sequence { color: var(--accent); font-size: 12px; font-weight: 800; }
    .asset-section { margin-top: 32px; padding: clamp(20px, 4vw, 40px); background: var(--surface); border: 1px solid var(--line); border-radius: 6px; }
    .asset-header, .section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
    h2 { margin: 6px 0 4px; overflow-wrap: anywhere; font-size: clamp(24px, 4vw, 40px); line-height: 1.12; }
    .asset-name { margin: 0; color: var(--muted); font-size: 18px; }
    .ratio, .upload-order { flex: none; color: white; background: var(--accent); padding: 8px 10px; font-size: 12px; font-weight: 800; }
    .metadata { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 28px 0 0; border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
    .meta-row { display: grid; grid-template-columns: 92px minmax(0, 1fr); border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    dt { color: var(--muted); font-weight: 750; }
    dd { margin: 0; overflow-wrap: anywhere; }
    .meta-row dt, .meta-row dd { padding: 12px; }
    h3 { margin: 0; font-size: 18px; line-height: 1.4; }
    .criteria-section, .reference-section, .prompt-section { margin-top: 30px; padding-top: 24px; border-top: 1px solid var(--line); }
    ul { margin: 14px 0 0; padding-left: 22px; line-height: 1.75; }
    button { min-height: 40px; border: 0; border-radius: 4px; color: white; background: var(--ink); padding: 10px 14px; cursor: pointer; font: 750 13px/1 "PingFang SC", sans-serif; }
    button:hover { background: var(--accent-dark); }
    button:disabled { color: var(--muted); background: #dfe3e1; cursor: default; }
    .reference-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: 18px; margin-top: 16px; }
    .reference-item { position: relative; margin: 0; border: 1px solid var(--line); background: var(--soft); }
    .reference-item img { display: block; width: 100%; height: 340px; object-fit: contain; background: #dfe2e0; }
    .upload-order { position: absolute; top: 0; left: 0; z-index: 1; }
    figcaption { padding: 15px; }
    figcaption strong { display: block; margin-bottom: 8px; }
    figcaption p, .dependency-row p { margin: 8px 0 0; color: var(--muted); line-height: 1.55; }
    code { display: block; color: #4b5752; overflow-wrap: anywhere; white-space: normal; font: 12px/1.55 ui-monospace, monospace; }
    .dependency-row { position: relative; min-height: 210px; padding: 58px 18px 18px; border: 1px dashed var(--accent); background: #faf5f3; }
    .empty-reference { margin: 16px 0 0; padding: 18px; border-left: 4px solid var(--accent); background: var(--soft); }
    .upload-settings { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 18px 0 0; border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
    .upload-settings > div { padding: 12px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .upload-settings dt { margin-bottom: 6px; }
    pre { margin: 16px 0 0; padding: 20px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; background: var(--code); color: #f4f7f5; font: 14px/1.75 "PingFang SC", sans-serif; }
    @media (max-width: 760px) {
      main { width: min(100% - 18px, 1240px); }
      .page-header { padding-top: 32px; }
      .asset-header, .section-heading { flex-direction: column; }
      .metadata, .upload-settings { grid-template-columns: 1fr; }
      .reference-item img { height: 270px; }
    }
    @media print {
      body { background: white; }
      main { width: 100%; }
      .asset-section { break-inside: avoid; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <main>
    <header class="page-header">
      <span class="kicker">Local image prompt delivery</span>
      <h1>${escapeHtml(manifest.title)}</h1>
      ${manifest.subtitle ? `<p>${escapeHtml(manifest.subtitle)}</p>` : ""}
      <p>${manifest.assets.length} 个资产提示词 · 生成于 ${escapeHtml(generatedAt)} · 页面仅用于提示词交付，不会生成图片或写入资产库</p>
    </header>
    ${manifest.assets.map(renderAsset).join("\n")}
  </main>
  <script>
    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const text = document.getElementById(button.dataset.copy).textContent;
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const area = document.createElement("textarea");
          area.value = text;
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
        }
        const original = button.textContent;
        button.textContent = "已复制";
        setTimeout(() => { button.textContent = original; }, 1200);
      });
    });
  </script>
</body>
</html>`;
}

const { input, output } = parseArgs(process.argv);
const manifest = loadManifest(input);
const html = renderPage(manifest);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html, "utf8");
process.stdout.write(`${output}\n`);
