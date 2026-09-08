// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
import os from "node:os";

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PackageValidationError, validatePackage } from "./validate_director_seedance_package.mjs";

const outputRoot = os.tmpdir();
const tempDir = fs.mkdtempSync(path.join(outputRoot, "director-seedance-skill-test-"));

function writeFixture(name, content) {
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

function expectFailure(manifest, fragment) {
  assert.throws(
    () => validatePackage(manifest),
    (error) => error instanceof PackageValidationError && error.message.includes(fragment),
  );
}

try {
  const screenplayFile = writeFixture("screenplay.md", "screenplay final\n测试甲（对测试乙）说：“准备好了吗？”\n人物已经来到街道。\n");
  const directorFile = writeFixture("director.md", `---\nsource_screenplay_sha256: ${screenplayFile.sha256}\n---\ndirector accepted\n`);
  const handoffFile = writeFixture("asset-handoff.md", `confirmed asset handoff\nsource_screenplay_sha256: ${screenplayFile.sha256}\nsource_director_sha256: ${directorFile.sha256}\n`);
  const imagePath = path.join(tempDir, "reference.png");
  fs.writeFileSync(imagePath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1pAAAAAASUVORK5CYII=", "base64"));

  const manifest = {
    schema_version: "director-seedance-package/v2",
    package_id: "TEST-DSP-v001",
    project: "测试项目",
    title: "测试导演稿转 Seedance 制作包",
    status: "executable",
    production_profile: "Seedance 2.0 / 720p",
    runtime_status: "provisional",
    target_runtime_s: 10,
    sources: {
      screenplay: { ...screenplayFile, status: "final" },
      director: { ...directorFile, status: "accepted", source_screenplay_sha256: screenplayFile.sha256 },
      asset_handoff: { ...handoffFile, status: "confirmed_complete", source_screenplay_sha256: screenplayFile.sha256, source_director_sha256: directorFile.sha256, confirmed_by_user: true },
    },
    director_critical_refs: [
      { director_ref: "SH01-01", priority: "P1", protected_intent: "自动对白仍保留关系反应" },
      { director_ref: "SH01-02", priority: "P0", protected_intent: "远景看见人物从已敞开的门内出来并进入资产场景" },
    ],
    generation_units: [
      {
        id: "TEST-GEN-001",
        class: "AUTO_EVENT",
        take_role: "primary",
        scene_id: "S01",
        director_refs: ["SH01-01"],
        edit_refs: ["ED01"],
        source_refs: ["S01-对白"],
        priority: "P1",
        projection_profile: "dialogue_autocut",
        doorway_mode: "eliminated_or_none",
        live_face_visibility: "visible_recognizable",
        scale_intent: "autonomous_close_biased",
        advances_story_state: true,
        protected_facts: ["对白顺序不变"],
        assets: [{ id: "TEST-ASSET-001", path: imagePath, order: 1 }],
        platform_prompt: "特殊规则：只说本条明确列出的原文台词，不新增、改写或重复对白，不添加未列出的旁白或画外人声。\n\n测试甲（对测试乙）说：“准备好了吗？”",
        selection_criteria: ["对白完整且反应成立"],
        handles: { picture_head_s: 1, picture_tail_s: 1, audio_head_s: 1, audio_tail_s: 1 },
        fallback: { strategy: "", unit_ids: [] },
      },
      {
        id: "TEST-GEN-002",
        class: "DIRECTED_CAPTURE",
        take_role: "primary",
        scene_id: "S01",
        director_refs: ["SH01-02"],
        edit_refs: ["ED02"],
        source_refs: ["S01-人物离开"],
        priority: "P0",
        projection_profile: "directed_capture_v1",
        doorway_mode: "asset_scene_exit_only",
        doorway_destination_asset_id: "TEST-ASSET-001",
        live_face_visibility: "none_or_concealed",
        scale_intent: "medium_wide_or_wider",
        advances_story_state: true,
        protected_facts: ["人物从已敞开的门内出来并进入街道"],
        assets: [{ id: "TEST-ASSET-001", path: imagePath, order: 1 }],
        acquisition_intent: "完整看见人物出门进入资产所示街道",
        dominant_camera_constraint: "远景完整看见人物从门内出来进入街道。",
        platform_prompt: "特殊规则：全程无台词\n\n特殊规则：不生成旁白或画外人声。\n\n远景完整看见人物从门内出来进入街道。门已经敞开并保持敞开。人物从门内走出，进入参考场景资产所示的街道。",
        selection_criteria: ["只发生出门并进入资产所示街道"],
        handles: { picture_head_s: 1, picture_tail_s: 1, audio_head_s: 1, audio_tail_s: 1 },
        fallback: { strategy: "从人物已经进入街道的结果态开始下一条", unit_ids: [] },
      },
    ],
    edit_units: [
      {
        id: "ED01",
        order: 1,
        planned_duration_s: 5,
        picture_unit_ids: ["TEST-GEN-001"],
        audio_unit_ids: ["TEST-GEN-001"],
        transition_from_previous: { type: "START" },
        cut_motive: "对白关系建立",
        fallback: "",
      },
      {
        id: "ED02",
        order: 2,
        planned_duration_s: 5,
        picture_unit_ids: ["TEST-GEN-002"],
        audio_unit_ids: ["TEST-GEN-002"],
        transition_from_previous: { type: "J_CUT", audio_source_unit_id: "TEST-GEN-002", audio_lead_s: 0.8, reason: "先听见街道环境声再进入外景" },
        cut_motive: "人物进入资产所示外景",
        fallback: "从人物已在街道的结果态开始",
      },
    ],
    coverage: [
      {
        director_ref: "SH01-01",
        priority: "P1",
        primary_unit_ids: ["TEST-GEN-001"],
        fallback_unit_ids: [],
        acceptance_criteria: ["对白与听者反应完整"],
        edit_refs: ["ED01"],
        fallback_strategy: "",
      },
      {
        director_ref: "SH01-02",
        priority: "P0",
        primary_unit_ids: ["TEST-GEN-002"],
        fallback_unit_ids: [],
        acceptance_criteria: ["远景中人物只从已敞开的门内出来并进入街道"],
        edit_refs: ["ED02"],
        fallback_strategy: "从人物已在街道的结果态开始",
      },
    ],
    unresolved_assumptions: [],
  };

  manifest.screenplay_readiness = {source_screenplay_sha256:screenplayFile.sha256,status:'ready',fidelity_audit:'passed',screenplay_only_cold_read:'passed',language_and_carriers:'resolved',scope_refs:['S01'],evidence_refs:['S01 exact dialogue and exit action'],unresolved:[]};
  manifest.speech_ledger = [{id:'D01',source_ref:'S01',speaker:'测试甲',receiver:'对测试乙',text:'准备好了吗？',delivery:'generated_dialogue'}];
  manifest.post_units = [];
  for(const [i,u] of manifest.generation_units.entries()) u.shooting={take_id:`TAKE-${i+1}`,source_director_sha256:directorFile.sha256,space_id:i?'street':'room',time_group:'T1',participants:i?['人物']:['测试甲'],silent_participants:i?['人物']:[],speech_ids:i?[]:['D01'],start_state:'人物在已成立的起点',end_state:'人物完成本段动作',continuous_action:i?'人物离开到街道':'测试甲询问',estimated_duration_s:5,capacity_s:15,capacity_basis:'test fixture capacity',split_reason:{kind:i?'space_change':'start',detail:i?'去门例外要求独立街道远景采集':'本场首次拍摄'}};
  manifest.edit_units[0].speech_ids=['D01']; manifest.edit_units[1].speech_ids=[];
  const oldVersion=clone(manifest); oldVersion.schema_version='director-seedance-package/v1'; expectFailure(oldVersion,'legacy v1');
  const staleAssetDirector=clone(manifest); staleAssetDirector.sources.asset_handoff.source_director_sha256='c'.repeat(64); expectFailure(staleAssetDirector,'source_director_sha256');
  const forgedBinding=clone(manifest);
  forgedBinding.sources.asset_handoff={...writeFixture('stale-handoff.md',`source_screenplay_sha256: ${screenplayFile.sha256}\nsource_director_sha256: ${'c'.repeat(64)}\n`),status:'confirmed_complete',source_screenplay_sha256:screenplayFile.sha256,source_director_sha256:directorFile.sha256,confirmed_by_user:true};
  expectFailure(forgedBinding,'binding evidence');
  const staleDirector=clone(manifest);
  const staleDirectorFile=writeFixture('stale-director.md',`---\nsource_screenplay_sha256: ${'c'.repeat(64)}\n---\nsource_screenplay_sha256: ${screenplayFile.sha256}\n`);
  staleDirector.sources.director={...staleDirectorFile,status:'accepted',source_screenplay_sha256:screenplayFile.sha256};
  staleDirector.sources.asset_handoff.source_director_sha256=staleDirectorFile.sha256;
  expectFailure(staleDirector,'director file contains a stale screenplay');
  const historicalHash=clone(manifest);
  historicalHash.sources.asset_handoff={...writeFixture('historical-handoff.md',`---\nsource_screenplay_sha256: ${screenplayFile.sha256}\nsource_director_sha256: ${'c'.repeat(64)}\n---\nsource_director_sha256: ${directorFile.sha256}\n`),status:'confirmed_complete',source_screenplay_sha256:screenplayFile.sha256,source_director_sha256:directorFile.sha256,confirmed_by_user:true};
  expectFailure(historicalHash,'binding evidence');
  const duplicateHash=clone(manifest);
  duplicateHash.sources.asset_handoff={...writeFixture('duplicate-handoff.md',`source_screenplay_sha256: ${screenplayFile.sha256}\nsource_director_sha256: ${directorFile.sha256}\nsource_director_sha256: ${'c'.repeat(64)}\n`),status:'confirmed_complete',source_screenplay_sha256:screenplayFile.sha256,source_director_sha256:directorFile.sha256,confirmed_by_user:true};
  expectFailure(duplicateHash,'requires one current header');
  const postManifest=clone(manifest);
  postManifest.post_units.push({id:'POST1',kind:'text',source_refs:['S01-result'],director_refs:['SH01-02'],edit_refs:['ED02'],speech_ids:[],content:'人物已经来到街道。',selection_criteria:['原有文字承载到达结果'],handles:{picture_head_s:0,picture_tail_s:0,audio_head_s:0,audio_tail_s:0}});
  postManifest.edit_units[1].picture_unit_ids.push('POST1');
  assert.equal(validatePackage(postManifest).post_units.length,1);
  const postCoverage=clone(postManifest); postCoverage.coverage[1].primary_unit_ids=['POST1'];
  assert.equal(validatePackage(postCoverage).coverage[1].primary_unit_ids[0],'POST1');
  const postGone=clone(postManifest); postGone.post_units=[]; expectFailure(postGone,'unknown generation unit');
  const postVoice=clone(postManifest); postVoice.post_units[0].kind='voiceover'; expectFailure(postVoice,'kind must be one of');
  const postDialogue=clone(postManifest); postDialogue.post_units[0].kind='dialogue_audio'; expectFailure(postDialogue,'kind must be one of');
  const cleanAudio=clone(manifest); cleanAudio.generation_units[0].take_role='clean_audio'; expectFailure(cleanAudio,'take_role must be one of');
  const oldSpeechRoute=clone(manifest); oldSpeechRoute.speech_ledger[0].delivery='post_dialogue'; expectFailure(oldSpeechRoute,'SEPARATE_DUBBING_FORBIDDEN');
  const postPrompt=clone(postManifest); postPrompt.post_units[0].platform_prompt='让模型说明到达结果'; expectFailure(postPrompt,'platform_prompt');
  const postPath=path.join(tempDir,'with-post.json'), postHtml=path.join(tempDir,'with-post.html');
  fs.writeFileSync(postPath,JSON.stringify(postManifest));
  const postRender=spawnSync(process.execPath,[path.join(path.dirname(fileURLToPath(import.meta.url)),'render_director_seedance_package_html.mjs'),postPath,'--output',postHtml],{encoding:'utf8'});
  assert.equal(postRender.status,0,postRender.stderr); assert.ok(fs.readFileSync(postHtml,'utf8').includes('人物已经来到街道。'));
  process.stdout.write('OK: v2 migration, actual director binding, post text/coverage/drop detection and no-dubbing and renderer integration checks\n');
  const wxgc=clone(manifest); wxgc.project='雾峡轨城'; expectFailure(wxgc,'WXGC_J_CUT_FORBIDDEN');
  wxgc.edit_units[1].transition_from_previous={type:'CUT',reason:'转入街道'}; assert.equal(validatePackage(wxgc).project,'雾峡轨城');
  const disguised=clone(wxgc); disguised.edit_units[1].cut_motive='下一场声音提前进入上一场画面'; expectFailure(disguised,'WXGC_J_CUT_FORBIDDEN');
  const lead=clone(wxgc);lead.edit_units[1].transition_from_previous.audio_lead_s=0.2;expectFailure(lead,'WXGC_J_CUT_FORBIDDEN');
  const montage=clone(wxgc); const edited=montage.generation_units[0];
  edited.class='AUTO_EDITED';edited.projection_profile='autonomous_edit_v1';edited.scale_intent='autonomous_editing';
  edited.platform_prompt+='\n生成完整快剪与特效剪辑成片，内部采用交叉剪辑，人物按准确台词说话。';
  Object.assign(edited.shooting,{organization:'edited_sequence',content_plan:'同一角色上午与下午的完整剪辑段',segments:[{id:'A',space_id:'地点甲',time_group:'上午',source_refs:['S01-对白'],content:'来源活动甲',start_state:'甲起点',end_state:'甲结果'},{id:'B',space_id:'地点乙',time_group:'下午',source_refs:['S01-对白'],content:'来源活动乙',start_state:'乙起点',end_state:'乙结果'}]});
  for(const k of ['space_id','time_group','start_state','end_state','continuous_action'])delete edited.shooting[k];
  assert.equal(validatePackage(montage).generation_units[0].class,'AUTO_EDITED');
  const editJ=clone(montage);editJ.generation_units[0].platform_prompt+='使用J-cut。';expectFailure(editJ,'WXGC_J_CUT_FORBIDDEN');
  const externalEdit=clone(montage);externalEdit.generation_units[0].platform_prompt+='将上一条视频拼接到这里。';expectFailure(externalEdit,'external clips');
  const soundTask=clone(manifest);soundTask.post_units=clone(postManifest.post_units);soundTask.post_units[0].kind='sound';expectFailure(soundTask,'kind must be one of');
  const montagePath=path.join(tempDir,'montage.json'),montageHtml=path.join(tempDir,'montage.html');fs.writeFileSync(montagePath,JSON.stringify(montage));
  const mr=spawnSync(process.execPath,[path.join(path.dirname(fileURLToPath(import.meta.url)),'render_director_seedance_package_html.mjs'),montagePath,'--output',montageHtml],{encoding:'utf8'});
  assert.equal(mr.status,0,mr.stderr);assert.ok(fs.readFileSync(montageHtml,'utf8').includes('完整剪辑成品生成'));
  process.stdout.write('OK: native edited sequence, multi-place/time, scoped J-cut ban, user-owned sound and rendering checks\n');
  // Both continuous and internally edited output must use the same final-text gate.
  for (const template of [manifest, montage]) {
    for (const [text, diagnostic] of [
      ['开始空间运动状态：温雅颈前潮红。','FLUSHING_DESCRIPTION_FORBIDDEN'],
      ['特殊规则：温雅的颈侧更红。','FLUSHING_DESCRIPTION_FORBIDDEN'],
      ['global：温雅泛红。','FLUSHING_DESCRIPTION_FORBIDDEN'],
    ]) {
      const leaked=clone(template); leaked.generation_units[0].platform_prompt+='\n'+text;
      expectFailure(leaked,diagnostic);
    }
    const neutral=clone(template);neutral.generation_units[0].platform_prompt+='\n温雅双唇分开补气，落脚踩稳。红色外套留在红光照亮的墙边。温雅颈前的红色链饰保持原样，脸朝向红色机器人。';
    validatePackage(neutral);
  }
  const validated = validatePackage(manifest);
  assert.equal(validated.generation_units.length, 2);

  const editLeak = clone(manifest);
  editLeak.generation_units[1].platform_prompt += " 使用J-cut让声音提前进入。";
  expectFailure(editLeak, "contains post-edit language");

  const shortHandle = clone(manifest);
  shortHandle.generation_units[1].handles.audio_head_s = 0.4;
  expectFailure(shortHandle, "audio lead exceeds source audio_head_s");

  const missingCoverage = clone(manifest);
  missingCoverage.coverage.pop();
  expectFailure(missingCoverage, "missing coverage row");

  const autoWide = clone(manifest);
  autoWide.generation_units[0].scale_intent = "medium_wide_or_wider";
  expectFailure(autoWide, "medium_wide_or_wider must be DIRECTED_CAPTURE");

  const unjustifiedWideFace = clone(manifest);
  unjustifiedWideFace.generation_units[1].live_face_visibility = "visible_recognizable";
  expectFailure(unjustifiedWideFace, "wide_visible_face_exception_reason");

  const justifiedWideFace = clone(manifest);
  justifiedWideFace.generation_units[1].live_face_visibility = "visible_recognizable";
  justifiedWideFace.generation_units[1].wide_visible_face_exception_reason = "门线两侧的身体关系必须同时成立";
  assert.equal(validatePackage(justifiedWideFace).generation_units[1].scale_intent, "medium_wide_or_wider");

  const autoDoorOperation = clone(manifest);
  autoDoorOperation.generation_units[0].platform_prompt += " 人物推开房门。";
  expectFailure(autoDoorOperation, "actionable doorway content requires de-door redesign");

  const closeDoorExit = clone(manifest);
  closeDoorExit.generation_units[1].platform_prompt += " 房门随后关闭。";
  expectFailure(closeDoorExit, "cannot open, close, or damage the door");

  const closeScaleExit = clone(manifest);
  closeScaleExit.generation_units[1].dominant_camera_constraint = "近景看见人物从门内出来。";
  closeScaleExit.generation_units[1].platform_prompt = `近景看见人物从门内出来。\n\n${closeScaleExit.generation_units[1].platform_prompt}`;
  expectFailure(closeScaleExit, "must require 远景 and forbid medium or close scales");

  const wrongDestinationAsset = clone(manifest);
  wrongDestinationAsset.generation_units[1].doorway_destination_asset_id = "MISSING-ASSET";
  expectFailure(wrongDestinationAsset, "must refer to an asset bound to this unit");

  const safeInterior = clone(manifest);
  safeInterior.generation_units[0].doorway_mode = "same_side_interior_open_background";
  safeInterior.generation_units[0].platform_prompt = "门已经敞开并保持敞开。所有动作和对白只发生在室内工作区并远离门区。测试甲（对测试乙）说：“准备好了吗？”\n\n特殊规则：只说本条明确列出的原文台词，不新增、改写或重复对白，不添加未列出的旁白或画外人声。";
  assert.equal(validatePackage(safeInterior).generation_units[0].doorway_mode, "same_side_interior_open_background");

  const safeExterior = clone(manifest);
  safeExterior.generation_units[0].doorway_mode = "same_side_static_closed_door";
  safeExterior.generation_units[0].platform_prompt = "门始终保持关闭。所有动作和对白只发生在门的同一侧。测试甲（对测试乙）说：“准备好了吗？”\n\n特殊规则：只说本条明确列出的原文台词，不新增、改写或重复对白，不添加未列出的旁白或画外人声。";
  assert.equal(validatePackage(safeExterior).generation_units[0].doorway_mode, "same_side_static_closed_door");

  const safeInteriorClosed = clone(manifest);
  safeInteriorClosed.generation_units[0].doorway_mode = "same_side_static_closed_door";
  safeInteriorClosed.generation_units[0].platform_prompt = "门始终保持关闭。所有动作和对白只发生在门的同一侧。测试甲（对测试乙）说：“准备好了吗？”\n\n特殊规则：只说本条明确列出的原文台词，不新增、改写或重复对白，不添加未列出的旁白或画外人声。";
  assert.equal(validatePackage(safeInteriorClosed).generation_units[0].doorway_mode, "same_side_static_closed_door");

  const audioPath=path.join(tempDir, 'voice.wav');
  fs.writeFileSync(audioPath, 'test audio reference');
  const exactVoice=clone(manifest);
  const voiceLine=`测试甲的音色音频文件参考引用：${audioPath}。｜`;
  exactVoice.generation_units[0].platform_prompt+='\n\n'+voiceLine;
  assert.ok(validatePackage(exactVoice).generation_units[0].platform_prompt.includes(voiceLine));
  const imagePathLeak=clone(exactVoice);
  imagePathLeak.generation_units[0].platform_prompt=imagePathLeak.generation_units[0].platform_prompt.replace(audioPath,imagePath);
  expectFailure(imagePathLeak,'contains a local asset path');
  const missingVoice=clone(exactVoice);
  missingVoice.generation_units[0].platform_prompt=missingVoice.generation_units[0].platform_prompt.replace(audioPath,path.join(tempDir,'missing.wav'));
  expectFailure(missingVoice,'voice audio file does not exist');

  const missingSpeechBoundary = clone(manifest);
  missingSpeechBoundary.generation_units[0].platform_prompt = '测试甲（对测试乙）说：“准备好了吗？”';
  expectFailure(missingSpeechBoundary, 'SPEECH_BOUNDARY_REQUIRED');
  const missingCaptureSilence = clone(manifest);
  missingCaptureSilence.generation_units[1].platform_prompt = missingCaptureSilence.generation_units[1].platform_prompt.replace('特殊规则：全程无台词', '');
  expectFailure(missingCaptureSilence, 'SILENCE_BOUNDARY_REQUIRED');

  const manifestPath = path.join(tempDir, "manifest.json");
  const htmlPath = path.join(tempDir, "execution.html");
  manifest.generation_units[0].assets[0].usage = "仅用于当前场景的结构与位置，不引入额外人物。";
  assert.equal(validatePackage(manifest).generation_units[0].assets[0].usage, manifest.generation_units[0].assets[0].usage);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const renderResult = spawnSync(process.execPath, [path.join(scriptDir, "render_director_seedance_package_html.mjs"), manifestPath, "--output", htmlPath], { encoding: "utf8" });
  assert.equal(renderResult.status, 0, renderResult.stderr);
  const html = fs.readFileSync(htmlPath, "utf8");
  assert.ok(html.includes(manifest.generation_units[0].assets[0].usage));
  assert.match(html, /J-cut、L-cut、声音桥/);
  assert.match(html, /TEST-GEN-002/);
  assert.match(html, /medium_wide_or_wider/);
  assert.match(html, /asset_scene_exit_only/);
  assert.match(html, /出门目标场景资产/);

  const textBasisFile = writeFixture("text-only-handoff.json", JSON.stringify({rows:[{baseline_ref:"T01",decision:"TEXT_ONLY"}]}));
  const textOnly = clone(manifest);
  Object.assign(textOnly.generation_units[0], {assets:[],required_assets:[],asset_mode:"TEXT_ONLY",asset_basis:{path:textBasisFile.path,sha256:textBasisFile.sha256,baseline_ref:"T01",decision:"TEXT_ONLY"}});
  assert.equal(validatePackage(textOnly).generation_units[0].asset_mode,"TEXT_ONLY");
  const noEvidence=clone(textOnly);delete noEvidence.generation_units[0].asset_basis;expectFailure(noEvidence,"TEXT_ONLY_EVIDENCE_REQUIRED");
  const needsImage=clone(textOnly);needsImage.generation_units[0].required_assets=[{id:"X",path:imagePath}];expectFailure(needsImage,"TEXT_ONLY_ASSET_CONFLICT");
  const styleFiller=clone(manifest);styleFiller.generation_units[0].assets[0].role="style_only";expectFailure(styleFiller,"STYLE_ONLY_UPLOAD_FORBIDDEN");
  const spatialLoss=clone(manifest);spatialLoss.generation_units[0].start_state={characters:{测试甲:{visible:true,position:"设备柜靠斜坡一侧",posture:"屈膝低身",facing:"斜坡"}}};spatialLoss.generation_units[0].platform_prompt+="\n\n开始空间运动状态：测试甲的头部朝向斜坡。";expectFailure(spatialLoss,"SPATIAL_STATE_NOT_PROJECTED");
  fs.writeFileSync(manifestPath,JSON.stringify(textOnly));
  const textResult=spawnSync(process.execPath,[path.join(scriptDir,"render_director_seedance_package_html.mjs"),manifestPath,"--output",htmlPath],{encoding:"utf8"});
  assert.equal(textResult.status,0,textResult.stderr);
  const textHTML=fs.readFileSync(htmlPath,"utf8");
  assert.match(textHTML,/TEXT_ONLY · 无需上传图片/);assert.doesNotMatch(textHTML,/data-copy="paths-0"/);assert.match(textHTML,/data-copy="paths-1"/);
  process.stdout.write("OK: source-authorized TEXT_ONLY, style-only exclusion, projection-loss and no-upload HTML tests passed\n");

  process.stdout.write("OK: package validation, de-door routing, asset-scene exit-only capture, J/L-cut boundary, 720p live-face scale routing, handle check, coverage closure, and HTML rendering tests passed\n");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
