# Director-To-Seedance Package Schema

Use one JSON manifest as the machine-readable source for validation and HTML rendering.

## Root

```json
{
  "schema_version": "director-seedance-package/v2",
  "package_id": "EP30-DSP-v001",
  "project": "雾峡轨城",
  "title": "EP30《半扇门》导演稿转 Seedance 制作包",
  "status": "executable",
  "production_profile": "Seedance 2.0 / 720p",
  "runtime_status": "provisional",
  "target_runtime_s": 495,
  "sources": {},
  "director_critical_refs": [],
  "generation_units": [],
  "edit_units": [],
  "coverage": [],
  "unresolved_assumptions": []
}
```

`status` is `executable` only after the exact source and asset gates pass. Do not create copy-ready prompts inside a planning-only package. `runtime_status` is `provisional` or `calibrated`; never infer calibration from planned timing.

## Sources

```json
{
  "screenplay": {
    "path": "/absolute/example/EP30_剧本稿.md",
    "status": "final",
    "size_bytes": 12345,
    "mtime": "2026-09-04T10:00:00+08:00",
    "sha256": "64 lowercase hexadecimal characters"
  },
  "director": {
    "path": "/absolute/example/EP30_导演稿.md",
    "status": "accepted",
    "size_bytes": 23456,
    "mtime": "2026-09-04T11:00:00+08:00",
    "sha256": "64 lowercase hexadecimal characters",
    "source_screenplay_sha256": "same as screenplay.sha256"
  },
  "asset_handoff": {
    "path": "/absolute/example/EP30_资产规划交接.md",
    "status": "confirmed_complete",
    "size_bytes": 34567,
    "mtime": "2026-09-04T12:00:00+08:00",
    "sha256": "64 lowercase hexadecimal characters",
    "source_screenplay_sha256": "same as screenplay.sha256",
    "source_director_sha256": "same as director.sha256",
    "confirmed_by_user": true
  }
}
```

The validator hashes the three files and compares them with the manifest. The two dependent sources must point to the current screenplay hash. The validator also checks the actual director header and actual asset-handoff bindings, plus the screenplay's current novel binding when present.

## Director Critical References

List every P0 and P1 reference extracted from the accepted director master before generation grouping:

```json
{
  "director_ref": "SH04-07",
  "priority": "P0",
  "protected_intent": "看见潜入者把未开启工具箱放到维修台后立即松手"
}
```

This list is the validator's coverage baseline. Omitting a director P0/P1 item here is a manual source-audit failure even if the JSON validates.

## Generation Units

Shared fields:

```json
{
  "id": "EP30-GEN-017",
  "class": "AUTO_EVENT",
  "take_role": "primary",
  "scene_id": "S04",
  "director_refs": ["SH04-05"],
  "edit_refs": ["ED21", "ED22"],
  "source_refs": ["S04-罗小雨截击潜入者一号"],
  "priority": "P0",
  "projection_profile": "dialogue_autocut",
  "doorway_mode": "eliminated_or_none",
  "live_face_visibility": "visible_recognizable",
  "scale_intent": "autonomous_close_biased",
  "advances_story_state": true,
  "protected_facts": ["罗小雨实际把潜入者一号撞离控制台"],
  "assets": [
    {
      "id": "WXGC-SCN-...",
      "path": "/absolute/example/asset.jpg",
      "order": 1
    }
  ],
  "platform_prompt": "complete copy-ready prompt",
  "selection_criteria": ["撞离控制台的位移和结果清楚成立"],
  "handles": {
    "picture_head_s": 1.0,
    "picture_tail_s": 1.0,
    "audio_head_s": 1.0,
    "audio_tail_s": 1.0
  },
  "fallback": {
    "strategy": "source-faithful fallback description",
    "unit_ids": []
  }
}
```

Allowed values:

- `class`: `AUTO_EVENT`, `AUTO_EDITED` or `DIRECTED_CAPTURE`;
- `take_role`: `primary`, `fallback`, or `insert` (no separate audio takes);
- `priority`: `P0`, `P1`, or `P2`;
- `projection_profile`: `dialogue_autocut` for `AUTO_EVENT`, `autonomous_edit_v1` for `AUTO_EDITED`, `directed_capture_v1` for `DIRECTED_CAPTURE`.
- `doorway_mode`: `eliminated_or_none`, `same_side_interior_open_background`, `same_side_static_closed_door`, or `asset_scene_exit_only`.
- `live_face_visibility`: `none_or_concealed` or `visible_recognizable`;
- `scale_intent`: `autonomous_editing` for AUTO_EDITED; otherwise `autonomous_close_biased`, `close`, `close_up`, or `medium_wide_or_wider`.

Under the current `Seedance 2.0 / 720p` profile, every `medium_wide_or_wider` unit must be `DIRECTED_CAPTURE`; the generic `AUTO_EVENT` frozen global cannot guarantee it. A `visible_recognizable + medium_wide_or_wider` unit must also include a non-empty `wide_visible_face_exception_reason` and a source-faithful fallback strategy using close facial and no-visible-face coverage. Backs, silhouettes, fully occluded faces, masks, and helmets are `none_or_concealed`, not visible-face exceptions.

Every `primary` unit must appear in at least one edit unit. A fallback or insert may remain unused in the intended assembly while still closing coverage risk.

`same_side_interior_open_background` requires the exact sentence `门已经敞开并保持敞开。` and a sentence stating `所有动作和对白只发生在室内……并远离门区。` `same_side_static_closed_door` requires the exact sentences `门始终保持关闭。` and `所有动作和对白只发生在门的同一侧。` The active side may be indoors or outdoors, and start/end states may be near the frame, doorway, or explicit inner/outer side. Neither mode may contain a crossing or a door-state transition; the closed-door mode additionally requires no door movement or damage.

`asset_scene_exit_only` requires `DIRECTED_CAPTURE`, `medium_wide_or_wider`, a dominant camera constraint containing `远景` and no `中景`, `近景`, or `特写`, and:

```json
{
  "doorway_mode": "asset_scene_exit_only",
  "doorway_destination_asset_id": "WXGC-SCN-..."
}
```

The destination ID must name one asset already bound to the unit. The prompt must contain `门已经敞开并保持敞开。`, state `角色名从门内出来／走出／跑出／冲出／驶出`, and end that movement with `进入参考场景资产所示的具体环境`. It may not contain reverse entry, opening, closing, dialogue, combat, contact, prop exchange, a threshold pause, or a second story action.

### Directed-Capture Additions

`DIRECTED_CAPTURE` also requires:

```json
{
  "doorway_mode": "asset_scene_exit_only",
  "doorway_destination_asset_id": "WXGC-SCN-街道-...",
  "acquisition_intent": "完整看见人物从门内出来并进入资产所示街道",
  "dominant_camera_constraint": "远景完整看见人物从门内出来进入街道",
  "live_face_visibility": "none_or_concealed",
  "scale_intent": "medium_wide_or_wider"
}
```

For the rare wider visible-face exception, also include:

```json
{
  "wide_visible_face_exception_reason": "the protected body relation cannot be preserved by close facial plus no-visible-face spatial coverage"
}
```

The camera constraint is package metadata and may be projected as the prompt's one dominant camera instruction. It is not a shot list and cannot contain edit operations.

### Handles

Numeric handles are planned usable source material, not an instruction to perform an edit. Keep exact values outside `platform_prompt`.

- `picture_head_s`: picture available before the intended selected action or cut;
- `picture_tail_s`: picture available after the completed result;
- `audio_head_s`: synchronized audio available before the intended picture cut;
- `audio_tail_s`: usable audio after the intended outgoing picture cut.

## Edit Units

```json
{
  "id": "ED13",
  "order": 13,
  "planned_duration_s": 14,
  "picture_unit_ids": ["EP30-GEN-012"],
  "audio_unit_ids": ["EP30-GEN-012", "EP30-GEN-011"],
  "transition_from_previous": {
    "type": "L_CUT",
    "audio_source_unit_id": "EP30-GEN-011",
    "audio_carry_s": 0.8,
    "reason": "街面鞭响延续到藏身处，藏身处仍未脱离战场"
  },
  "cut_motive": "灯暗后进入通话",
  "fallback": "If needed, use the same sound source over a stable interior insert"
}
```

Allowed transition types:

- `START`
- `CUT`
- `HARD_CUT`
- `MATCH_CUT`
- `J_CUT`
- `L_CUT`
- `SOUND_BRIDGE`
- `DISSOLVE`
- `FADE_TO_BLACK`
- `HOLD`

The first edit unit uses `START`. Later units must not use `START`.

For `J_CUT`, `audio_source_unit_id` must be included in the incoming edit unit's `audio_unit_ids`; `audio_lead_s` must be positive and no larger than that generation unit's `handles.audio_head_s`.

For `L_CUT`, the carried source must be included in the incoming edit unit's `audio_unit_ids`; `audio_carry_s` must be positive and no larger than that source's `handles.audio_tail_s`.

If an outgoing sound source continues into the next edit unit, list it in that next unit's `audio_unit_ids` even when the picture comes from another source.

## Coverage

```json
{
  "director_ref": "SH04-07",
  "priority": "P0",
  "primary_unit_ids": ["EP30-GEN-019"],
  "fallback_unit_ids": ["EP30-GEN-019F"],
  "acceptance_criteria": [
    "门在动作开始前已经敞开并全程保持敞开",
    "人物只从门内出来并进入绑定场景资产所示的环境"
  ],
  "edit_refs": ["ED24"],
  "fallback_strategy": "省略出门过程，直接从人物已经位于绑定场景资产所示环境的结果态开始"
}
```

Every `director_critical_refs` item requires exactly one coverage row with matching priority. Every P0 row requires a non-empty `fallback_strategy`. Conditional fallback planning does not require a ready generation unit: state its failure trigger, protected result and needed asset/compilation work in the strategy, with `fallback_unit_ids: []` until that work is ready. Never create a dangling ID or unexecutable prompt. A supplied fallback block must pass all normal reference gates but is not a first-round generation instruction. Count necessary primary/insert calls separately from these conditional alternatives.

## Prompt-Prohibited Edit Language

The validator rejects explicit or disguised cross-clip edit instructions inside `platform_prompt`, including:

- `J-cut`, `L-cut`, `J切`, `L切`;
- `声音提前`, `音轨提前`, `画面晚切`;
- `剪辑点`, `时间线`, `切黑`, `交叉剪辑`, `声音桥`;
- local absolute image paths and arbitrary local paths; the exact speaking-character audio-reference line is permitted and its file is verified.

This deterministic check catches high-cost routing errors. It does not replace a manual prompt audit for subtler edit language.

## Runtime

The sum of `edit_units[].planned_duration_s` must equal `target_runtime_s`. These values may be provisional. Do not label them calibrated without measured evidence.

## v2 Production Handoff (required for formal delivery)

Historical v1 files remain unchanged. A v1 package cannot be formally re-rendered as executable with this validator until its screenplay readiness, TAKE grouping and carriers have been audited and saved as a new v2 version. Never fill defaults or merely bump the version. Ordinary read-only inspection of a historical file does not require migration.

Add these root fields (all arrays are present, including when empty):

```json
{
  "screenplay_readiness": {
    "source_screenplay_sha256": "same as sources.screenplay.sha256",
    "status": "ready",
    "fidelity_audit": "passed",
    "screenplay_only_cold_read": "passed",
    "language_and_carriers": "resolved",
    "scope_refs": ["S05"],
    "evidence_refs": ["剧本第5场及可拍性审计段落"],
    "unresolved": []
  },
  "speech_ledger": [
    {"id":"D01", "source_ref":"S05-D01", "speaker":"凌砚", "receiver":"对联络人员", "text":"接叶澄。", "delivery":"generated_dialogue"}
  ],
  "post_units": []
}
```

Extract `speech_ledger` independently from the bound screenplay in original occurrence order for the declared scope. `receiver` uses the exact attributed prompt form such as `对联络人员` or `朝通讯器`; `delivery` is only `generated_dialogue`: all exact speech is generated with the video. A screenplay-approved narrator may be voice-only inside that same generation; separate narration or dubbing is forbidden. Equal strings spoken twice need different IDs. Exact-text checks against the screenplay do not infer speakers, source completeness or readiness; audit those manually.

A long utterance may be divided at an authorized natural boundary without changing its words. Give each fragment its own ID and also `source_utterance_id`, `source_utterance_text`, `segment_index` (1-based). Fragments must be adjacent in the ledger, keep the same speaker/receiver/delivery, and concatenate verbatim to the complete source utterance. This does not justify a separate generation when capacity permits one continuous take.

Each generation unit carries `shooting` copied from the current director TAKE plan:

```json
{
  "take_id": "TAKE-S05-01",
  "source_director_sha256": "same as sources.director.sha256",
  "space_id": "凌砚指挥区",
  "time_group": "S05-连续时间1",
  "participants": ["凌砚", "联络人员"],
  "silent_participants": ["联络人员"],
  "speech_ids": ["D01"],
  "start_state": "凌砚已获得叶澄位置，联络人员等待决定",
  "continuous_action": "凌砚下达已经写明的接入命令，联络人员按剧本既定动作执行",
  "end_state": "决定已交付；完成状态取自剧本与编译状态",
  "estimated_duration_s": 8,
  "capacity_s": 15,
  "capacity_basis": "当前任务已确认的单次生成容量；此处仅示例，不能作为平台通用值",
  "split_reason": {"kind":"start", "detail":"本场首次拍摄"}
}
```

`participants` includes visible and audio-only participants; it does not make every participant visible. `silent_participants` is exactly the participants without generated lines in this TAKE. A spoken unit explicitly silences each of them in the prompt. For a completely silent take the existing whole-unit silence rules apply. Preserve the state compiler's actual snapshots; the readable `shooting` states must agree, never regenerate stock poses from this metadata.

The same TAKE ID cannot be split into several GENs. Each actual generation is one TAKE; changes require explicit regrouping in the director working version and a new binding. One generation's `director_refs`/`edit_refs` may contain multiple SH/EDs. Separate locations with the same scene name still need separate space IDs; an audio-only remote speaker does not require another visible-location take.

Allowed split reasons: `start` (first unit only), `space_change`, `time_change`, `capacity`, `action_control`, `reference_incompatibility`, `state_discontinuity`, `indispensable_acquisition`. Provide a specific reason, not just a category label. A capacity reason must actually exceed the available capacity if combined. Do not use edit changes, silent reactions, SH numbers or line breaks as reasons. Supplemental takes additionally require `parent_take_id`, a named acquisition gap, and `advances_story_state: false`.

## Post Material Units And Edit Speech Selection

`post_units` are planned post-production tasks, not completed media or Seedance calls. Use `kind: text | still` (no effects-production tasks) and:

```json
{
  "id":"POST-01", "kind":"text",
  "source_refs":["S05-N01"], "director_refs":["SH05-01"], "edit_refs":["ED41"],
  "speech_ids":[], "content":"已获准的准确画面文字",
  "selection_criteria":["文字内容与原有导演方案一致"],
  "handles":{"picture_head_s":0,"picture_tail_s":0,"audio_head_s":0.5,"audio_tail_s":0.5}
}
```

Separate voice units are forbidden. Text units have exact approved visible text; still units have a concrete source-supported production specification. Non-speech post units use `speech_ids: []`. None may contain `platform_prompt`.

`edit_units[].picture_unit_ids` and `audio_unit_ids`, and coverage's `primary_unit_ids` / `fallback_unit_ids`, can refer to generation or post IDs. Only text/still post units are allowed; they cannot supply audio. Every post unit names its edit destination and is actually referenced there. A fact carried entirely by post material does not require a fake generation unit.

Every edit has `speech_ids: []` or the exact occurrences first heard there. Joining them in edit order must reproduce `speech_ledger` exactly. Speech must use its video's native audio: no `clean_audio`, `post_dialogue`, `post_voiceover`, `dialogue_audio` or `speech_sources` replacement routing. Ordinary J/L cuts may use existing video sound without creating another audio task. A whole-video retry can replace the whole corresponding audiovisual segment; selecting only its speech to dub a different performance is forbidden. Do not generate additional video only to harvest speech. A TAKE reused across EDs does not repeat its dialogue. Post units cannot contain speech IDs.


The actual asset handoff must contain both current hashes, either as JSON `sources.screenplay.sha256` / `sources.director.sha256` or unique current-header Markdown `source_screenplay_sha256:` / `source_director_sha256:` fields (frontmatter when present; historical notes and examples do not establish bindings). The package manifest repeats `source_director_sha256` in its asset record; changing only that claim cannot update old asset decisions. User acceptance and ready status are separate: preserve original source status and evidence of any conversational acceptance, never relabel an unaccepted draft to pass the checker.

## Generation Form And Project Sound Policy

`project` is required and must match the screenplay header when it names the project. For `雾峡轨城`, `J_CUT`, positive `audio_lead_s`, and equivalent next-scene sound anticipation are rejected in edits and prompts. Other projects retain the type for an actual explicit need; no project should receive it as a template default. Post `sound` tasks are removed because the user owns effects work. Nonzero audio handles are not a default requirement; keep unused values zero and do not generate extra sound material.

The historical `shooting` / `take_id` names mean generation organization, not necessarily filming a continuous take. Existing rows without `organization` remain `continuous_scene` for compatibility. New complete-edit results use `class: AUTO_EDITED`, `projection_profile: autonomous_edit_v1`, `scale_intent: autonomous_editing`, and:

```json
{
  "take_id":"GEN-MONTAGE-01",
  "source_director_sha256":"same as sources.director.sha256",
  "organization":"edited_sequence",
  "content_plan":"一条完整的快剪成品，覆盖下列已确定事件；内部剪辑由 Seedance 完成",
  "segments":[
    {"id":"SEG1","space_id":"地点A","time_group":"上午","source_refs":["S01-A"],"content":"来源已确定的上午活动","start_state":"该片段已确定起点","end_state":"该片段已确定结果"},
    {"id":"SEG2","space_id":"地点B","time_group":"下午","source_refs":["S01-B"],"content":"来源已确定的下午活动","start_state":"该片段已确定起点","end_state":"该片段已确定结果"}
  ],
  "participants":["角色甲"],"silent_participants":["角色甲"],"speech_ids":[],
  "estimated_duration_s":15,"capacity_s":15,"capacity_basis":"本任务已确认的示例容量",
  "split_reason":{"kind":"start","detail":"一条生成直接完成本段剪辑成品"}
}
```

An edited sequence requires at least two constituent source segments; each segment reference is included in the unit's `source_refs`. It does not require one `space_id`, `time_group`, or continuous body state for the whole montage. Continuous-scene rows still provide their actual opening/end states and `content_plan` (legacy `continuous_action` remains readable). `complete_deliverable` is an additional split reason for a genuinely separate result. Do not use one location change as an automatic reason to fragment a montage.

Internal quick cuts, montage order and visual effects are allowed in AUTO_EDITED platform prompts. Operations on separately generated files remain outside prompts. All three generation forms share exact speech, source/asset, information-boundary and no-dubbing checks. The general autonomous-editing scale is not a promise to deliver a particular director-critical angle; classify a genuinely indispensable view separately only when needed.

## Upload mode and TEXT_ONLY evidence

Image-backed units default to `asset_mode: "REFERENCE_IMAGES"` with nonempty assets. For a confirmed no-image decision, both ordinary delivery blocks and director generation units use:

```json
{
  "asset_mode": "TEXT_ONLY",
  "assets": [],
  "required_assets": [],
  "asset_basis": {
    "path": "/absolute/path/to/formal-asset-plan.json",
    "sha256": "actual current SHA-256 of the file",
    "baseline_ref": "actual unique handoff row identifier",
    "decision": "TEXT_ONLY"
  }
}
```

The placeholders above must be replaced with live evidence. The referenced JSON must contain exactly one object with that `baseline_ref` and `decision: "TEXT_ONLY"`; its scope must cover this unit. The validator checks file hash and row decision; scope/content suitability requires source review. An empty image list alone never authorizes TEXT_ONLY. Nonempty `required_assets` prevents TEXT_ONLY. Do not migrate an image-backed unit merely to bypass missing-asset errors.

Render TEXT_ONLY as “无需上传图片” with the source-row basis and the unchanged copyable prompt; omit image grids and path-copy controls. Keep style-only references separate from all unit upload lists. Source metadata is not platform prompt text.
