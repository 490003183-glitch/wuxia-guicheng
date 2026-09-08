#!/usr/bin/env node
// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { escapeHtml, renderDeliveryCard, renderDeliveryShell, renderStyleReferences } from "../../wuxia-seedance-scene-prompts/scripts/prompt_delivery_layout.mjs";
import { loadAndValidatePackage } from "./validate_director_seedance_package.mjs";

function parseArgs(argv) {
  const input = argv[2];
  const outputIndex = argv.indexOf("--output");
  const output = outputIndex >= 0 ? argv[outputIndex + 1] : null;
  if (!input || !output) {
    throw new Error("usage: render_director_seedance_package_html.mjs <manifest.json> --output <execution.html>");
  }
  return { input: path.resolve(input), output: path.resolve(output) };
}

function pills(values) {
  return values.map((value) => `<span class="pill">${escapeHtml(value)}</span>`).join("");
}

function renderSources(sources) {
  return Object.entries(sources).map(([key, source]) => `
    <article class="source-card">
      <div class="kicker">${escapeHtml(key)}</div>
      <strong>${escapeHtml(source.status)}</strong>
      <code>${escapeHtml(source.path)}</code>
      <code>SHA-256 ${escapeHtml(source.sha256)}</code>
    </article>`).join("");
}

function renderGenerationUnit(unit, index) {
  const promptId = `prompt-${index}`;
  const pathsId = `paths-${index}`;
  const classLabel = unit.class === "AUTO_EVENT" ? "连续场景生成" : unit.class === "AUTO_EDITED" ? "完整剪辑成品生成" : "导演定向采集";
  const directed = unit.class === "DIRECTED_CAPTURE" ? `
    <div class="directed-box">
      <p><b>采集目的：</b>${escapeHtml(unit.acquisition_intent)}</p>
      <p><b>唯一主导镜头约束：</b>${escapeHtml(unit.dominant_camera_constraint)}</p>
    </div>` : "";
  const detailsHtml = `
    <div class="trace-row">${pills([unit.scene_id, ...unit.director_refs, ...unit.edit_refs, unit.take_role, unit.live_face_visibility, unit.scale_intent, unit.doorway_mode])}</div>
    ${unit.doorway_destination_asset_id ? `<div class="warning"><b>出门目标场景资产：</b>${escapeHtml(unit.doorway_destination_asset_id)}</div>` : ""}
    ${unit.wide_visible_face_exception_reason ? `<div class="warning"><b>远景真人面部例外：</b>${escapeHtml(unit.wide_visible_face_exception_reason)}</div>` : ""}
    ${directed}
    <section><h4>${escapeHtml(classLabel)} · 本次生成 ${escapeHtml(unit.shooting.take_id)}</h4>
    <p>${escapeHtml(unit.shooting.space_id)} · ${escapeHtml(unit.shooting.time_group)} · ${escapeHtml(unit.shooting.participants.join("、"))}</p>
    <p>${escapeHtml(unit.shooting.content_plan ?? unit.shooting.continuous_action)}</p>
    ${unit.shooting.segments ? `<ul>${unit.shooting.segments.map(s=>`<li>${escapeHtml(s.time_group)} · ${escapeHtml(s.space_id)}：${escapeHtml(s.content)}（${escapeHtml(s.start_state)} → ${escapeHtml(s.end_state)}）</li>`).join("")}</ul>` : ""}
    <p>开始：${escapeHtml(unit.shooting.start_state)}<br>结束：${escapeHtml(unit.shooting.end_state)}</p>
    <p>预计生成 ${escapeHtml(unit.shooting.estimated_duration_s)}s / 容量 ${escapeHtml(unit.shooting.capacity_s)}s；${escapeHtml(unit.shooting.capacity_basis)}</p>
    <p>拆分依据：${escapeHtml(unit.shooting.split_reason.detail)}；台词：${escapeHtml(unit.shooting.speech_ids.join("、") || "全程无台词")}</p></section>
    <div class="two-col">
      <section><h4>受保护事实</h4><ul>${unit.protected_facts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
      <section><h4>素材验收</h4><ul>${unit.selection_criteria.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
    </div>
    <div class="handle-row">
      <span>画面头 ${unit.handles.picture_head_s}s</span><span>画面尾 ${unit.handles.picture_tail_s}s</span>
      <span>声音头 ${unit.handles.audio_head_s}s</span><span>声音尾 ${unit.handles.audio_tail_s}s</span>
    </div>
    ${unit.shooting.elapsed_from_previous ? `<p>跨条经过：${escapeHtml(unit.shooting.elapsed_from_previous)}</p>` : ''}
    <section class="fallback"><b>保底：</b>${escapeHtml(unit.fallback.strategy || "无额外保底策略")}${unit.fallback.unit_ids.length ? ` · ${escapeHtml(unit.fallback.unit_ids.join(", "))}` : ""}</section>
  `;
  return renderDeliveryCard({
    id: unit.id, title: unit.title, className: unit.class.toLowerCase(),
    eyebrow: `${unit.shooting.take_id} · ${unit.projection_profile}`,
    summary: `工作预算 ${unit.shooting.estimated_duration_s} 秒 · ${unit.duration_status || '时长未实测校准'} · ${unit.assets.length} 张图片`,
    assets: unit.assets, asset_mode: unit.asset_mode, asset_basis: unit.asset_basis,
    prompt: unit.platform_prompt, promptId, pathsId, detailsHtml,
  }, index);
}

function transitionText(transition) {
  const details = [];
  if (transition.audio_lead_s != null) details.push(`声音提前 ${transition.audio_lead_s}s`);
  if (transition.audio_carry_s != null) details.push(`声音延续 ${transition.audio_carry_s}s`);
  if (transition.audio_source_unit_id) details.push(`声音源 ${transition.audio_source_unit_id}`);
  if (transition.reason) details.push(transition.reason);
  return [transition.type, ...details].join(" · ");
}

function renderEditRows(editUnits) {
  return editUnits.map((edit) => `
    <tr>
      <td>${escapeHtml(edit.order)}</td>
      <td><b>${escapeHtml(edit.id)}</b><br>${escapeHtml(edit.planned_duration_s)}s</td>
      <td>${escapeHtml(edit.picture_unit_ids.join(", "))}</td>
      <td>${escapeHtml(edit.audio_unit_ids.join(", ") || "—")}</td>
      <td>${escapeHtml(transitionText(edit.transition_from_previous))}</td>
      <td>${escapeHtml(edit.cut_motive)}</td>
    </tr>`).join("");
}

function renderCoverageRows(coverage) {
  return coverage.map((item) => `
    <tr>
      <td><span class="priority ${item.priority.toLowerCase()}">${escapeHtml(item.priority)}</span></td>
      <td><b>${escapeHtml(item.director_ref)}</b></td>
      <td>${escapeHtml(item.primary_unit_ids.join(", "))}</td>
      <td><ul>${item.acceptance_criteria.map((criterion) => `<li>${escapeHtml(criterion)}</li>`).join("")}</ul></td>
      <td>${escapeHtml(item.fallback_strategy || "—")}${item.fallback_unit_ids.length ? `<br><code>${escapeHtml(item.fallback_unit_ids.join(", "))}</code>` : ""}</td>
      <td>${escapeHtml(item.edit_refs.join(", "))}</td>
    </tr>`).join("");
}

export function renderPage(manifest) {
  const autoCount = manifest.generation_units.filter((unit) => unit.class === "AUTO_EVENT").length;
  const editedCount = manifest.generation_units.filter(unit => unit.class === "AUTO_EDITED").length;
  const directedCount = manifest.generation_units.filter(unit => unit.class === "DIRECTED_CAPTURE").length;
  const generatedAt = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date());

  const introHtml = `<section class="delivery-note">${[manifest.acceptance_note, manifest.revision_note, ...(manifest.scope_notes || [])].filter(Boolean).map(note=>`<p>${escapeHtml(note)}</p>`).join('')}${renderStyleReferences(manifest.style_references)}${manifest.validation_note ? `<details><summary>校验记录</summary><p>${escapeHtml(manifest.validation_note)}</p></details>` : ''}</section>
  <header class="hero">
    <div class="kicker">Director → Seedance production package</div>
    <h1>${escapeHtml(manifest.title)}</h1>
    <p>${escapeHtml(manifest.package_id)} · ${escapeHtml(manifest.status)} · ${escapeHtml(manifest.production_profile)} · 时长${escapeHtml(manifest.runtime_status)} · 生成于 ${escapeHtml(generatedAt)}</p>
    <div class="stats">
      <div class="stat"><b>${manifest.target_runtime_s}s</b>整集工作预算</div>
      <div class="stat"><b>${autoCount}</b>AUTO_EVENT</div>
      <div class="stat"><b>${editedCount}</b>AUTO_EDITED</div>
      ${directedCount ? `<div class="stat"><b>${directedCount}</b>DIRECTED_CAPTURE</div>` : ""}
      <div class="stat"><b>${manifest.edit_units.length}</b>预剪辑单元</div>
    </div>
  </header>

  <h2>来源锁定</h2>
  <div class="source-grid">${renderSources(manifest.sources)}</div>

  <h2>生成与采集单元</h2>`;
  const tailHtml = `
  <section><h2>后期素材任务</h2>${manifest.post_units.map(p=>`<article class="unit-card"><h3>${escapeHtml(p.id)} · ${escapeHtml(p.kind)}</h3><p>${escapeHtml(p.edit_refs.join("、"))}</p><pre>${escapeHtml(p.content)}</pre><p>${escapeHtml(p.selection_criteria.join("；"))}</p></article>`).join("")}</section>

  <h2>剪辑执行表</h2>
  <div class="warning">${manifest.project === '雾峡轨城' ? '按下表装配已有生成素材；不把下一场声音提前压进来。表内执行信息不属于上方任何 Seedance 提示词。' : 'J-cut、L-cut、声音桥、精确切点和静默只在本表执行，不属于上方任何 Seedance 提示词。'}</div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>编辑单元</th><th>画面源</th><th>声音源</th><th>转场／声画关系</th><th>切点理由</th></tr></thead><tbody>${renderEditRows(manifest.edit_units)}</tbody></table></div>

  <h2>P0 / P1 覆盖闭环</h2>
  <div class="table-wrap"><table><thead><tr><th>优先级</th><th>导演引用</th><th>主采集</th><th>验收标准</th><th>保底</th><th>成片位置</th></tr></thead><tbody>${renderCoverageRows(manifest.coverage)}</tbody></table></div>
`;
  return renderDeliveryShell({ title: manifest.title, units: manifest.generation_units, introHtml,
    bodyHtml: manifest.generation_units.map(renderGenerationUnit).join("\n"), tailHtml });
}

function main() {
  try {
    const { input, output } = parseArgs(process.argv);
    const manifest = loadAndValidatePackage(input);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, renderPage(manifest), "utf8");
    process.stdout.write(`OK: rendered ${output}\n`);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
