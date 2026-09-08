# Director Asset Plan Schema

Use one JSON document as the machine-readable source for the readable plan, validation, prompt dispatch, and final handoff preparation.

## Root

```json
{
  "schema_version": "director-asset-plan/v2",
  "plan_id": "EP01-DAP-v001",
  "title": "EP01 示例资产规划",
  "status": "planning",
  "confirmed_by_user": false,
  "confirmation_scope": "",
  "sources": {},
  "screenplay_asset_baseline": [],
  "director_critical_refs": [],
  "visual_state_machines": [],
  "requirements": [],
  "creation_order": [],
  "asset_prompt_dispatch_ids": [],
  "handoff_bindings": [],
  "unresolved_blockers": []
}
```

New plans use `director-asset-plan/v2`. The validator keeps `director-asset-plan/v1` readable for historical plans; v1 has no enforceable visual-state-machine contract.

Allowed status values:

- `planning`
- `ready_for_user_confirmation`
- `confirmed_complete`

`confirmed_complete` requires `confirmed_by_user: true` and a non-empty `confirmation_scope`. Other statuses require `confirmed_by_user: false`.

## Sources

```json
{
  "screenplay": {
    "path": "/absolute/project/EP01_剧本稿.md",
    "status": "final",
    "size_bytes": 12345,
    "mtime": "2026-09-04T10:00:00+08:00",
    "sha256": "64 lowercase hexadecimal characters"
  },
  "director": {
    "path": "/absolute/project/EP01_导演稿.md",
    "status": "accepted",
    "size_bytes": 23456,
    "mtime": "2026-09-04T11:00:00+08:00",
    "sha256": "64 lowercase hexadecimal characters",
    "source_screenplay_sha256": "same as screenplay.sha256"
  },
  "asset_library_root": "/absolute/project/assets"
}
```

The validator checks source-file size and SHA-256 and requires the director's recorded screenplay hash to match the current screenplay.

## Screenplay Asset Baseline

List the complete visual dependency baseline before director additions:

```json
{
  "baseline_ref": "S04-BASE-PORTAL-01",
  "scene_id": "S04",
  "category": "spatial_connection",
  "required_visible_fact": "机械维修闸门连接房间侧和走廊侧"
}
```

Every baseline reference must appear in at least one requirement's `baseline_refs`. This baseline covers screenplay-required locations, visible character states/costumes, props, equipment, creatures, vehicles, interfaces, spatial connections, and persistent results whether or not a P0/P1 director reference mentions them.

## Critical Director Baseline

List every P0 and P1 reference before asset decisions:

```json
{
  "director_ref": "SH04-07",
  "priority": "P0",
  "protected_intent": "按导演去门方案确认未开启工具箱已到内侧的结果",
  "edit_refs": ["ED24"]
}
```

Every critical reference must appear in at least one requirement row, even when the correct decision is `NO_ASSET`.

## Requirement

## Mutable Visual State Machines

Audit persistent room- or scene-wide visual changes before requirements. Use an empty array only when the accepted sources contain no persistent mutable visual state.

```json
{
  "id": "S03-LIGHTING",
  "scene_id": "S03",
  "subject": "房间照明",
  "initial_state": "warm_on",
  "states": [
    {
      "id": "warm_on",
      "description": "室内暖色主灯开启",
      "source_refs": ["S03-初始照明"],
      "requires_distinct_asset": true
    },
    {
      "id": "cold_after_off",
      "description": "暖色主灯关闭，青冷环境光接管",
      "source_refs": ["S03-关灯结果"],
      "requires_distinct_asset": true
    }
  ],
  "transitions": [
    {
      "event_ref": "S03-E12",
      "from": "warm_on",
      "to": "cold_after_off"
    }
  ]
}
```

Every state marked `requires_distinct_asset: true` must be covered by at least one `REUSE` or `CREATE` requirement whose `state_binding` names that machine and state. All states must be reachable from `initial_state`; transitions cannot self-loop.

Shared fields:

```json
{
  "id": "EP01-DAR-007",
  "decision": "CREATE",
  "priority": "P0",
  "baseline_refs": ["S04-BASE-PORTAL-01"],
  "director_refs": ["SH04-07"],
  "edit_refs": ["ED24"],
  "source_refs": ["S04-未开启工具箱越过门线"],
  "visual_dependency": "同一扇半闭闸门的两侧、门线和未开启工具箱状态",
  "asset_type": "PORTAL_CONTINUITY_MASTER",
  "rationale": "自主生成可能隐藏越线顺序或改变两侧拓扑",
  "downstream_uses": ["DIRECTED_CAPTURE", "FALLBACK_CAPTURE"],
  "dependencies": [],
  "acceptance_criteria": ["门内外属于同一扇闸门", "工具箱保持未开启"],
  "fallback_strategy": "使用门内起点、门槛子图和门外结果态保留越线事实",
  "handoff_required": true,
  "state_binding": {
    "machine_id": "S03-LIGHTING",
    "state": "cold_after_off"
  },
  "formal_search": {
    "query": "dedicated search parameters",
    "result": "NO_MATCH",
    "checked_at": "2026-09-04T12:00:00+08:00"
  },
  "proposed_asset": {
    "planned_id": "WXGC-SCN-PLANNED-...",
    "name": "机械维修闸门门区连续空间母版"
  }
}
```

Omit `state_binding` for requirements that are not state-specific. A requirement with `state_binding` must be `REUSE` or `CREATE`; text-only and non-asset decisions cannot satisfy a state that requires a distinct image.

`baseline_refs` and `director_refs` may each be empty, but not both. A consolidated requirement may carry both. Use priority `BASE` when the requirement carries no P0/P1 director reference and exists only to satisfy the screenplay baseline.

Allowed asset types:

- `DETAIL`
- `GROUPED_DETAIL`
- `EQUIPMENT_MASTER`
- `SCENE_MASTER`
- `PORTAL_CONTINUITY_MASTER`
- `DERIVED_VIEW`
- `ENVIRONMENT_STATE_DERIVED`
- `DETAIL_CLOSEUP`
- `DAMAGE_STATE`
- `CAPSULE_BLOCKING`
- `REFERENCE_ONLY`
- `NONE`

Allowed downstream uses:

- `AUTO_EVENT`
- `DIRECTED_CAPTURE`
- `FALLBACK_CAPTURE`
- `SCENE_CONTINUITY`
- `NONE`

Allowed priorities are `P0`, `P1`, `P2`, and `BASE`. Every requirement uses exactly one decision: `REUSE`, `CREATE`, `TEXT_ONLY`, `NO_ASSET`, or `BLOCKED`.

### REUSE

Requires `formal_search.result: EXACT_MATCH` and:

```json
{
  "resolved_asset": {
    "id": "WXGC-SCN-...",
    "status": "定稿可用",
    "path": "/absolute/project/asset.jpg"
  }
}
```

### CREATE

Requires `formal_search.result: NO_MATCH`, `proposed_asset`, a non-`NONE` asset type, and acceptance criteria. Until a newly generated image is confirmed and formally ingested, omit `resolved_asset` and list the requirement ID in both `creation_order` and `asset_prompt_dispatch_ids`.

After formal ingestion, add `resolved_asset` and remove the ID from `asset_prompt_dispatch_ids`. Preserve it in `creation_order` as production history.

### TEXT_ONLY

Requires `asset_type: NONE`, `handoff_required: false`, and:

```json
{
  "text_blocking": "罗小雨位于门内侧，潜入者二号和未开启工具箱越过后位于门外走廊侧。"
}
```

### NO_ASSET

Requires `asset_type: NONE`, `handoff_required: false`, and one category:

- `EDIT_ONLY`
- `SOUND_ONLY`
- `TIMING_ONLY`
- `PERFORMANCE_ONLY`
- `CAMERA_MOTION_ONLY`
- `PROMPT_SUFFICIENT`

Also provide `no_asset_reason`.

### BLOCKED

Requires `asset_type: NONE`, `handoff_required: false`, and `blocker`. A plan containing `BLOCKED` remains `planning` and must also contain at least one root `unresolved_blockers` entry.

## Creation Order And Dependencies

`creation_order` contains every `CREATE` requirement exactly once, resolved or unresolved. It must be topological: each `CREATE` dependency appears earlier. A dependency may be a resolved `REUSE` item and therefore need not appear in `creation_order`.

`asset_prompt_dispatch_ids` contains exactly the unresolved `CREATE` requirements. These are the only rows passed to `wuxia-image-asset-prompts`.

## Handoff Bindings

Bindings exist only for resolved asset-producing requirements with `handoff_required: true`:

```json
{
  "requirement_id": "EP01-DAR-007",
  "asset_id": "WXGC-SCN-...",
  "path": "/absolute/project/asset.jpg",
  "scope_id": "S04/SH04-07",
  "order": 2,
  "locks": "同一扇闸门的门槛连接与未开启工具箱状态",
  "do_not_inherit": "不继承图中的临时人物、文字或错误动作姿态",
  "state_binding": {
    "machine_id": "S03-LIGHTING",
    "state": "cold_after_off"
  }
}
```

For a state-bound requirement in v2, the handoff binding must repeat the exact same `state_binding`. This prevents a downstream block from receiving the correct room with the wrong lighting or environment state.

Order begins at 1 and remains consecutive inside each `scope_id`. A detail asset that only fed a final master uses `handoff_required: false` and receives no binding.

`ready_for_user_confirmation` and `confirmed_complete` require:

- no `BLOCKED` rows or unresolved blockers;
- every `REUSE` and `CREATE` row has an existing verified `resolved_asset`;
- no unresolved dispatch IDs;
- every `handoff_required` row has at least one matching binding.

The validator can prove structural readiness. It cannot infer user confirmation.

---
公开派生版：mtgh。文档按 CC BY-NC-SA 4.0 提供；scripts 代码适用仓库 LICENSE-TOOLS。商用须另获授权。
