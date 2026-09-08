# Unified scene plan v2.1

## Purpose

Use one camera-free authored plan for causal events and state. Compile repeated snapshots and prompt openings instead of writing them by hand.

```text
formal source + creative locks + confirmed asset coverage + initial state + ordered events
-> final causal blocks
-> compiler
-> start_state + opening_actor_states + opening_speaker_states + end_state + required_assets
-> chronological dialogue_autocut prompts
```

Profiles:

- `continuity`: cross-block state continuity.
- `production`: the same state model plus stricter event-to-prompt source coverage.

Profiles do not control camera. Platform presentation is always `dialogue_autocut`.

## Authored plan

Required top-level fields:

```json
{
  "schema_version": "2.1",
  "scene_id": "S20-01",
  "profile": "continuity",
  "projection_mode": "dialogue_autocut",
  "scene_global_master": "整场统一的时间、地点、光线、导演机制、场级限制、无字幕、无音乐、滤镜与固定画质句",
  "source": {
    "path": "/absolute/path/to/final-screenplay.md",
    "status": "已确认",
    "slice": "optional stable reference"
  },
  "creative_locks": {
    "dialogue_and_event_order": "preserve",
    "performance": [],
    "forbidden_inventions": []
  },
  "source_action_locks": [
    {
      "id": "SH06.explicit-action",
      "source_ref": "accepted-director.md#SH06",
      "required_terms": ["角色名", "明确动作方式", "明确目标"]
    }
  ],
  "asset_coverage_rules": [
    {
      "asset_id": "WXGC-PRP-...",
      "path": "/absolute/path/to/prop.jpg",
      "trigger_terms": ["能量枪模块"]
    }
  ],
  "initial_state": {
    "scene": {},
    "characters": {}
  },
  "blocks": []
}
```

Author only one initial state, ordered blocks and events, one `scene_global_master`, and optional delivery/calibration metadata. Freeze `scene_global_master` before block projection and copy it verbatim into every platform `global：`.

Do not author block `projection_mode`. Do not author `scene_camera_plan`, `shots`, camera beats, camera positions, focus, start/end frames, opening composition, ending composition, or shot timing. Legacy plans should drop those fields instead of mapping them to a replacement schema.

Never author compiler-owned root fields `version`, `coverage`, or `clips`, or block fields `start_state`, `end_state`, `opening_actor_states`, `opening_speaker_states`, `opening_crowd_states`, `required_assets`, `clip_id`, or `duration_s`.

### Source-action identity locks

Use optional root `source_action_locks` only when the accepted director/source explicitly fixes a critical action's actor or execution method. This prevents a specified kick, weapon, body part, component, target, contact point, or result from being replaced by a different action that happens to serve the same plot function.

Each lock requires:

- `id`: one stable ASCII identifier;
- `source_ref`: the exact accepted director/source location;
- `required_terms`: the smallest exact terms that distinguish the protected action identity. Include the actor and the source-fixed method/body part/tool/component; add target/contact/result terms only when the source fixes them.

Tag the matching event with `source_action_lock_ids`. One lock may cover several consecutive events when a critical action is split for explicit causality. The compiler joins only those tagged event actions and requires every exact term. It rejects an unmapped lock, an unknown event reference, and a missing term. Production prompt validation already requires each compiled `visible_action` exactly and in order, so the lock closes `accepted director/source -> scene event -> platform prompt` without adding prompt text.

Do not create a lock from a character page's general specialty, preference, capability, typical behavior, or an inferred optimal move. Such material may reject an incompatible invented action, but it does not select every attack, create a minimum count, or force repetition. If the director/source leaves the method open, leave it unlocked. A source-action lock is not a mechanism dependency and never emits a `特殊规则` line.

```json
{
  "source_action_locks": [
    {
      "id": "SH06.wenya-kick",
      "source_ref": "accepted-director.md#SH06-01",
      "required_terms": ["温雅", "回旋踢", "高速飞行的月牙形风刃", "巡检机器人"]
    }
  ],
  "blocks": [
    {
      "id": "EP-S06-001",
      "events": [
        {
          "id": "E01",
          "source_action_lock_ids": ["SH06.wenya-kick"],
          "visible_action": "巡检机器人位于温雅腿脚无法直接触及的远处；温雅高速使出回旋踢，成刃与甩离脚背在同一次连续腿部划弧中完成；高速飞行的月牙形风刃独立跨越间隔后实际切中巡检机器人颈部关节",
          "effects": []
        }
      ]
    }
  ]
}
```

### Visible asset coverage

Optional top-level `asset_coverage_rules` is a deterministic registry copied only from the completed user-confirmed asset handoff. Add one entry only when the referenced image is an independently uploadable asset whose exact presence can be recognized in scene state or action. Each item requires:

- `asset_id`: the canonical asset ID from the handoff;
- `path`: that asset's exact absolute local image path;
- `trigger_terms`: zero or more narrow, unambiguous visible names or aliases used by the state/event plan;
- `state_conditions`: zero or more exact `{ "path": "systems.房间照明.state", "equals": "cold_after_off" }` conditions; every path must already exist in `initial_state`;
- `global_forbidden_terms`: required when `state_conditions` is non-empty; list mutually exclusive state wording that must never be frozen into `scene_global_master`, such as `暖色主灯开启` and `青冷环境光接管`.

Every rule needs `trigger_terms`, `state_conditions`, or both. Trigger terms and state conditions combine with AND semantics. State conditions are tested against block start, every post-event state, and block end. Therefore a block that visibly switches from warm light to cyan-cold light may require both state assets, while every later block receives only the cold-state asset. Overlapping trigger terms are allowed only when their state conditions differ; otherwise the collision remains invalid.

Prefer `能量枪模块` over `枪`, the exact mecha model over `机甲`, and the exact prop name over a character name. Trigger terms belonging to different assets may not duplicate or contain one another; the compiler rejects an overlap as `ASSET_TRIGGER_TERM_COLLISION` rather than requiring several uncertain assets. Do not register a term merely because a file exists, do not invent a mapping outside the handoff, and do not use this registry for voice files, mechanism-source reading, or prompt rules.

For each block, the compiler scans the visible start state, non-dialogue `visible_action`, block-local `special_rules`, and visible end state. It ignores quoted dialogue, a tagged audio-only speaker's dialogue attribution, that speaker's compiler-derived negative no-visual rule, and character knowledge/emotion. A matching rule produces one compiler-owned `required_assets` item with the exact ID/path plus audit evidence. A rule with no current-block match produces nothing, so an asset does not leak into blocks where it is absent. No registry produces an empty `required_assets` array.

The state validator recomputes this derivation and rejects hand-edited or dropped requirements. The delivery manifest must copy each compiled block's `required_assets` unchanged; the HTML renderer then checks that every required ID/path pair actually appears in that block's ordered `assets` list. Neither stage inserts or substitutes an asset.

### Persistent visual environment state

Model a source-backed persistent lighting or environment transition as ordinary world state. For example:

```json
{
  "initial_state": {
    "scene": { "handoff": "房间处于暖光开启状态。" },
    "characters": {},
    "systems": {
      "房间照明": { "state": "warm_on" }
    }
  },
  "asset_coverage_rules": [
    {
      "asset_id": "WXGC-SCN-ROOM-WARM",
      "path": "/absolute/path/to/room-warm.jpg",
      "trigger_terms": [],
      "state_conditions": [
        { "path": "systems.房间照明.state", "equals": "warm_on" }
      ],
      "global_forbidden_terms": ["暖色主灯开启", "青冷环境光接管"]
    },
    {
      "asset_id": "WXGC-SCN-ROOM-COLD",
      "path": "/absolute/path/to/room-cold.jpg",
      "trigger_terms": [],
      "state_conditions": [
        { "path": "systems.房间照明.state", "equals": "cold_after_off" }
      ],
      "global_forbidden_terms": ["暖色主灯开启", "青冷环境光接管"]
    }
  ]
}
```

The switching event must set `systems.房间照明.state` to `cold_after_off`. If the change is meant to survive the block as a mechanism result, list that path under the matching block mechanism requirement's `persistent_state_paths`. Keep invariant photographic style in `scene_global_master`; current light power, color temperature, emergency-light mode, smoke density, flooding level, weather state, and similar mutable values belong in world state and state-conditioned assets.

## State and events

Track only domains that can change or constrain action:

- scene location, time, access, doors, and stable anchors;
- each present character's `present`, `visible`, `emotion`, `position`, `posture`, `facing`, `hands`, `contact`, `injury`, and `knowledge`; `hands`, `contact`, and `injury` may be `null` only when unestablished and not action-relevant. Omit null values from platform text; do not replace them with default poses or erase known state. See [event-realization.md](event-realization.md);
- store `facing` as only the current target or world-space direction. Never store gaze prose such as `看着乔昔` or `视线落在门上`; platform projection owns the fixed physical form `角色名的头部朝向目标`;
- each participating person's, vehicle's, or mecha's spatial-motion fields needed by the scene: relative relation or distance, `motion`, speed trend, support or attachment, force relation, and action-critical limb, wing, claw, shield, drive, or equipment configuration;
- props, systems, permissions, alarms, calls, interfaces, vehicles, or mecha when relevant.

`initial_state.crowd_entities` is optional and conditionally activated. Read `crowd-continuity.md` only when a background performer or crowd has state that crosses a generation-block boundary. Do not add the collection for a one-block-only extra, including an extra who speaks but has no individual state or consequence after that block.

Every serialized fact is also a positive generation cue. Do not track or project an ordinary unchanged fact merely to prevent a hypothetical model error. Footwear, accessories, and other unchanged clothing stay implicit in the approved visual asset unless the source changes them or they constrain the current action. In particular, `仍穿鞋`, `鞋靴没有脱落`, and equivalent reassurance are invalid authored state. A source-confirmed footwear transition remains a normal event and must not be deleted.

Do not put a character at a door, hatch, gate, doorframe, doorway, or threshold in a generic scene plan unless the scene state explicitly contains `门始终保持关闭` and `所有动作和对白只发生在门的同一侧`. Under that static closed-door exception, either the indoor or outdoor side is legal and the character may remain doorway-adjacent, but no event may move, open, damage, or cross the door. Otherwise first remove the doorway beat or move the character away from the door. The structured `boundary_relation` contract below remains available for non-door boundaries and this static closed-door exception.

```json
{
  "position": "平台黄黑警戒线内的作业区侧",
  "boundary_relation": {
    "boundary": "平台黄黑警戒线",
    "state": "stationary",
    "side": "作业区侧"
  }
}
```

Allowed states are:

- `stationary`: require one explicit `side` and repeat it in `position`;
- `straddling`: require `center_of_mass_side` and state that same center-of-mass side in `position`;
- `crossing`: require distinct `from_side` and `to_side`, and state both sides plus the crossing movement in `position`.

For a legal boundary, every side must identify the actual space owning that side. Pure directions such as `左侧`, `右侧`, `前侧`, or `后侧` are not boundary ownership. Generic compilation accepts a door-linked stationary relation only under the exact static closed-door same-side context. Door-linked crossing or straddling remains invalid and returns for removal or upstream directed-capture routing.

Every tracked entity key must be explicit and stable. Named individuals use their exact names. Repeated same-type units use one unique production identifier established from a confirmed identity or initial spatial or functional anchor, such as `A-02立柱阿尔法`, `断裂检修台阿尔法`, `星落脚边阿尔法`, or `P-04桥下阿尔法`. Preserve that key after movement and role changes. Do not model repeated units as interchangeable `第一只`, `第二只`, `其中一只`, `另一只`, `它`, or `它们`, and do not rename a unit from its origin label to its destination label. Production identifiers are continuity labels only; they do not create canon names.

Emotion, audible performance, and spatial-motion state are separate projections of one compiled character ledger. `opening_actor_states` exposes each visible character's compiled starting emotion. `opening_speaker_states` contains only formal dialogue speakers tracked under `characters` who are not visible in that block, and exposes their starting `emotion` as `speaking_attitude`. Compiled `end_state` supplies the ending value for both. Platform `开始空间运动状态` and `结束空间运动状态` expose only action-relevant visible spatial motion; an offscreen speaker's body, position, posture, hands, contact, and face do not enter those paragraphs.

An emotion changes only through a source-backed event effect on `characters.<角色名>.emotion`. If no event changes that path, the ending emotion remains exactly equal to the starting emotion. Project each visible character with `情绪`; project each current-block offscreen formal speaker in `opening_speaker_states` with `说话态度`. Both copy the same compiled start/end `emotion` values and derive middle nodes only from current-block approved events. A visible speaker and an offscreen formal speaker both receive immediately adjacent fixed-voice and audio-reference lines; a visible character without dialogue receives neither. The number of middle nodes is not fixed. With no change, use exactly the sole middle node `保持不变`; never combine it with other nodes. Follow the current project voice description and local audio lookup in `prompt-projection.md#character-voice-lines` before marking a missing audio file as `未配置`; that marker cannot complete a user request for fixed-voice audio. For continuous character state, `next start = previous end` applies independently of spatial-motion continuity, so adjacent values are copied verbatim rather than rewritten as synonyms.

Place every persistent bulky prop in its first required working position in `initial_state` and carry it forward. Do not invent pushing, delivery, arrival, or relocation merely to get a prop into place unless the approved source makes that movement an event.

Do not put target duration, framing, focus, movement, composition, cuts, or calibration evidence in world state.

Each event contains a unique ID, one visible or audible occurrence, optional dialogue, preconditions, and only the effects caused by that event:

When an event changes a visible character's active opponent, interaction target, escape direction, or threat direction, that event must set `characters.角色名.facing` to the new exact target or direction. Leaving the earlier target in state is a continuity failure even if `visible_action` makes the new action understandable. Outside verbatim dialogue, `visible_action` and handoff text must not use gaze verbs as an orientation shortcut.

```json
{
  "id": "E01",
  "visible_action": "步小蛮按下设备急停开关，升降平台因此停止下降",
  "preconditions": [
    {"path": "systems.升降平台.state", "equals": "下降中"}
  ],
  "effects": [
    {"path": "systems.升降平台.state", "set": "已停止"}
  ]
}
```

For a critical multi-stage occurrence, `visible_action` must keep each causal transfer explicit and chronological: initiating subject/action, acting body part or component, contact target/point, force or mechanism, explicitly caused result, then recovery or next action as applicable. Critical means weapon/tool/mecha/mechanism execution, completed contact or force transfer, displacement or loss of balance, injury/restraint/release, damage/breakage/destruction, or a result that changes a later event or block state. Repeat the subject whenever agency changes, name the exact result receiver, and use direct causal grammar rather than adjacency. Do not expand routine walking, looking, pickup/placement, posture change, or dialogue without a consequential result. Flexible-tool chains containing hook/wrap + pull + loss of balance receive additional component, controller, causal-link, and body-route-owner checks.

Every event that actually executes a setting-dependent special function adds one stable ASCII `mechanism_id`, even when the visible action already states the function clearly and its entire transition completes inside the block. This includes triggering, releasing, deploying, retracting, transforming, switching, consuming, replenishing, locking, unlocking, activating, deactivating, or completing a non-ordinary designed capability. Do not add this field for mere object presence, ordinary visible use, or a character's ordinary combat technique. Split distinct mechanisms into separate atomic events instead of attaching several mechanism IDs to one event.

```json
{
  "id": "S01E014",
  "mechanism_id": "example_whip.sticky_bomb",
  "visible_action": "星落甩动白色复合关节鞭，长主鞭尾最末一节依靠甩击初始动量脱离并飞出，末节接触重型巡检机器人腰侧后吸附",
  "effects": []
}
```

Supported effects are `set`, `append`, and `remove`. Preconditions must already be true. Characters cannot act while absent. Position, possession, contact, injury, permission, doors, vehicles, interfaces, and knowledge changes require explicit effects. Knowledge cannot disappear without an explicitly approved memory-loss rule. An anticipation or reaction must follow a visible or audible event or knowledge already present in state; another character's unspoken intention is not a legal precondition.

When `crowd_entities` is active, every event that names a tracked crowd entity must either update that entity with a complete new `continuity_state` effect or list its stable ID in event-level `crowd_state_unchanged`. Never do both. Do not remove the entity object; a confirmed exit sets `present: false`, `visible: false`, and a completed exit `continuity_state`. The detailed schema and projection rules live only in `crowd-continuity.md`.

If a source-backed event depends on visible facial acting, include the observable facial sequence in that event's `visible_action`. Emotion effects remain separate. FACS/AU codes are allowed only together with visible eyebrow, eyelid, gaze, lip, jaw, or facial-tension changes; AU codes alone are not executable evidence.

Apply the doorway-defect override before compilation. First remove or relocate every door opening, closing, impact, breakage, threshold performance, and crossing while preserving the protected story function. If that function is unavoidable, represent it through stable before/after state, offscreen evidence, sound, reaction, or edit ellipsis. Generic compilation may retain only an already-open background door for wholly interior action or an already-closed background door for wholly exterior action; both must remain unchanged and away from the action.

The compiler enforces:

```text
first start = initial_state
event effects replay in source order
block end = replay result
next start = previous end
character emotion end = replayed emotion result
next character emotion start = previous character emotion end
previous block end crowd state = next block start crowd state
visible asset term in block state/action = exact compiler-derived required asset for that block
state condition true at block start/post-event/end = exact compiler-derived state asset for that block
```

For every compiled block, project the resulting states into platform text without exposing the full ledger:

```text
｜角色名（表演参考：已确认演员姓名） 情绪：初始情绪 → 情节触发与变化1 → 情节触发与变化2 → … → 结束情绪。
角色名的音色是：已确认的固定音色描述。
角色名的音色音频文件参考引用：已确认的绝对路径或未配置。｜

｜画外正式说话者（匿名表演指纹：稳定机制短句） 说话态度：起始态度 → 可听见的情节触发与变化1 → … → 结束态度。
画外正式说话者的音色是：已确认的固定音色描述。
画外正式说话者的音色音频文件参考引用：已确认的绝对路径或未配置。｜

global：...

特殊规则：[optional rule local to this block]

开始空间运动状态：[complete action-relevant projection of start_state]

[chronological event body]

结束空间运动状态：[complete action-relevant projection of end_state]
```

The two state paragraphs describe world-space continuity only. They must not contain camera position, framing, focus, shot size, camera movement, cutting, or composition.

The two state paragraphs must also name every entity explicitly. Outside verbatim quoted dialogue, projected state and event prose may not substitute pronouns or collective shorthand for tracked names or stable identifiers.

When crowd continuity is active, the compiler additionally derives `opening_crowd_states`. Copy each required compiled `continuity_state` verbatim into the corresponding start or end spatial-motion paragraph; do not add actor, emotion, voice, or audio-reference units for `crowd_entities`.

## Blocks and timing

Blocks follow causal action units. Do not create a boundary merely to change camera treatment.

Each block requires `id` and nonempty ordered `events`. Optional `target_duration_s` must be greater than zero and no more than 15, but it remains metadata outside world state and platform text. Optional `audio_only_speakers` is an ordered array of formal character IDs whose approved participation remains voice-only for this entire block. Both `continuity` and `production` use the same block shape. Never author `required_assets`; it is derived from the top-level coverage rules after state replay.

`opening_speaker_states` means only that a formal dialogue speaker is invisible at the compiled block start. It does not forbid a later cutaway. Use `audio_only_speakers` only when the source requires the character to remain unseen for the whole block. Each listed character must exist under `initial_state.characters`, have concrete attributed dialogue, start invisible, remain invisible through every event, and be absent from visible start/end state and non-dialogue event prose. The compiler appends exactly `角色名本条仅以画外声音参与；不呈现角色名本人、角色名所在空间、声音来源端画面或任何屏幕中的角色名影像。`; authors must not duplicate it in `special_rules`. Untagged offscreen speakers remain eligible for a later source-approved appearance or remote cutaway.

Optional `mechanism_requirements` is an ordered block-local array used only when one or more current-block events execute a setting-dependent special function. For every such event the array is mandatory, regardless of whether the event prose is already unambiguous or the function resets inside the block. Each item requires:

- `id`: the same stable ASCII ID used by one or more current-block events' `mechanism_id`;
- `source_refs`: one or more normalized single-line references to the minimum formal evidence actually read;
- `rule`: one normalized single-line platform rule without the `特殊规则：` prefix;
- `persistent_state_paths`: optional exact state paths whose changed values must survive the block boundary.

```json
{
  "id": "WXGC-EP30-S01-003",
  "mechanism_requirements": [
    {
      "id": "example_whip.sticky_bomb",
      "source_refs": [
        "30_角色/星落.md#白色复合关节鞭",
        "20_设定/星落白色复合关节双头重鞭.md#黏弹补位"
      ],
      "rule": "白色复合关节鞭是白色细型机甲脊柱式Y形双头关节鞭。长主鞭尾的最末一节可脱离为黏弹；黏弹依靠甩击初始动量飞出，不会自主追踪，接触普通目标后吸附并爆炸。同一时刻只有一枚末节黏弹外露可用；脱离后，预置在倒数第二节内部的下一枚黏弹约一秒向外生长补位，并重新锁定为新的长主鞭尾末节。",
      "persistent_state_paths": []
    }
  ],
  "events": [
    {
      "id": "S01E014",
      "mechanism_id": "example_whip.sticky_bomb",
      "visible_action": "星落甩动白色复合关节鞭，长主鞭尾最末一节依靠甩击初始动量脱离并飞出，末节接触重型巡检机器人腰侧后吸附",
      "effects": []
    },
    {
      "id": "S01E015",
      "mechanism_id": "example_whip.sticky_bomb",
      "visible_action": "黏弹在重型巡检机器人退回队列后爆炸，预置在倒数第二节内部的下一枚黏弹约一秒向外生长补位，补位完成使得下一枚黏弹重新锁定为新的长主鞭尾末节",
      "effects": []
    }
  ]
}
```

The compiler derives `trigger_event_ids` from the matching current-block event tags; never author that field. A tagged event without a same-ID requirement fails. A requirement with no matching tagged event fails as stale. Each declared persistent path must be changed by an effect on a matching tagged event and must exist in the compiled block end state. This is how a consumed component, mode, ammunition count, deployed structure, or similar result becomes the next block's factual opening state. When the mechanism completes and restores itself inside one block, keep `persistent_state_paths` empty.

The mechanism gate is not a keyword detector. An object name, `鞭子`, `机甲`, `按钮`, or a generic action verb never creates a requirement automatically. The author must classify the approved event by function: ordinary use remains untagged, while every actual setting-dependent special-function execution receives `mechanism_id` plus its matching requirement. Clear prose never waives this requirement. No `mechanism_requirements` means the compiler derives no mechanism rule, so leaving a functional event untagged is an authoring and manual-validation failure.

Optional `special_rules` is an ordered array of normalized, nonempty, single-line strings. It stores only character-, creature-, robot-, mecha-, worker-, prop-, costume-, body-feature-, identity-, appearance-, behavior-, or anti-misgeneration constraints needed by that exact block. Do not include the `特殊规则：` label inside an array item.

Do not manually repeat a mechanism requirement's `rule` or an `audio_only_speakers` no-visual rule in `special_rules`. The compiler appends mechanism-derived rules and tagged audio-only rules after ordinary authored `special_rules`. The prompt validator requires the resulting compiled list exactly.

`special_rules` and `mechanism_requirements` are legal only on a block. Root-, scene-, and global-level defaults are forbidden. The compiler emits both arrays as empty when a block has neither. Special rules and mechanism requirements do not enter world state or inherit from the preceding block. Only a mechanism requirement's explicitly declared persistent state paths enter ordinary replay through their tagged events' effects. Repeated text across blocks is valid only when each block independently authors an ordinary rule or independently triggers a compiler-derived mechanism rule.

`scene_global_master` contains only genuine scene-wide environment and production controls. It must not contain named-character facts or constraints for a creature, robot, mecha, worker, prop, costume, body feature, identity, appearance, or behavior. Persistent facts remain in state; their current-block anti-misgeneration wording belongs in `blocks[].special_rules`.

Mutable lighting and environment values are also forbidden in `scene_global_master`. When state-conditioned assets are present, every rule declares `global_forbidden_terms`; compilation rejects those terms in the frozen global. This prevents a warm-light global from contaminating blocks whose world state and asset binding have already changed to cyan-cold light.

## Corrections and block merges

Treat a user correction to a later block's opening as a correction to the shared state produced by the preceding block. Change the earliest causal event or effect needed to produce that state, then recompile; never hand-edit only the later opening. The preceding compiled end and later compiled start must remain identical, and the event body must not perform again an action already completed in the corrected opening.

When merging adjacent blocks, preserve every approved event in original order. The merged block keeps the first block's start state, the last block's end state, and one user-selected surviving ID. Union the participating assets in first-use upload order and deduplicate exact repeats. Remove every retired block ID from block arrays, asset maps, manifests, expected-count logic, and handoff records. Do not renumber unaffected later blocks unless explicitly requested. Compute totals from active block arrays rather than a historical numeric literal.

## Compiler and calibration

Compile after the authored plan is stable:

```bash
node scripts/compile_scene_plan.mjs <scene-plan.json|-> [--output <compiled-scene.json>]
```

The compiler retains authored metadata and appends derived state, compatibility clips, and optional calibration summary. It neither reads nor emits a camera plan.

Optional top-level `calibration` uses `uncalibrated`, `provisional`, or `calibrated` with evidence from `calibration-protocol.md`. The sample prompt profile must equal the scene-plan profile. The compiler derives `calibration.summary`; never author it.

Conditional event field `task_completions` names a source-completed `汇报` or `等待决定` task and its existing `entity`. Effects must end that task at this event. Do not mark middle report segments or unfinished decisions complete. See [event-realization.md](event-realization.md).
