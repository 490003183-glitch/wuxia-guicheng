# Classification And Projection

Use this reference for every director-to-Seedance conversion. The central problem is not translating all director language into prompt language. It is assigning each decision to the system that can actually execute it.

## Decision Test

For each protected director beat, ask in order:

0. **Whole generated result:** Can the required quick-cut, montage or VFX-edited sequence be delivered inside one generation? If yes, use AUTO_EDITED; internal editing is not external assembly.
1. **Story execution:** Is the required result primarily an action, line, reaction, state transition, or causal chain?
2. **View dependency:** Would the director's intended information or emotion materially fail if Seedance chose a different valid angle, scale, cut count, or reaction coverage?
3. **Cross-clip dependency:** Does the instruction require two source clips, independent audio/picture timing, exact placement on a timeline, or a cut selected after generation?

Classify from the first decisive answer:

| Result | Class | Owner |
| --- | --- | --- |
| One generation supplies a complete montage / quick-cut / VFX edit | `AUTO_EDITED` | Autonomous internal editing, exact source content |
| Story remains readable under autonomous coverage | `AUTO_EVENT` | Existing Seedance skill with `dialogue_autocut` |
| One particular view or uninterrupted cause-result chain is protected | `DIRECTED_CAPTURE` | Isolated camera-aware acquisition profile |
| Requires relations between clips or tracks | `POST_CONTROL` | Edit manifest only |

If a beat needs an indispensable specific view and assembly with other independently generated files, separate the acquisition from that external edit. If one generation can deliver the required edited result, use AUTO_EDITED instead of creating extra captures.

每种生成形态的每条提示词均须包含 `故事背景状态：...`，位置与内容执行[共享规则](../../wuxia-seedance-scene-prompts/references/prompt-projection.md#mandatory-story-background-state)。跨时空成品在同一背景段中说明局势变化，不把不同段落的任务混成同时发生。

## AUTO_EVENT

Use `AUTO_EVENT` when Seedance may decide all framing, camera motion, reaction coverage, cut count, and cut timing without losing a protected director result.

Typical uses:

- ordinary dialogue whose speaker, receiver, performance turn, and reaction are explicit;
- causal actions where the completed physical result matters but the exact viewing angle does not;
- scene business and group coordination that can tolerate autonomous reaction cutting;
- an event block whose continuity can be fully represented by compiled start/end state.

Project through `wuxia-seedance-scene-prompts` without modifying its frozen global or validator. A director reference remains in package metadata, not as camera prose inside the prompt.

For the current Seedance 2.0 / 720p production profile, do not assign `AUTO_EVENT` when the director's protected result specifically depends on a medium-wide, wide, or long view. The frozen global is close-biased and cannot be treated as a reliable way to acquire that view.

## AUTO_EDITED

Use this form when the intended result is a self-contained edited sequence, including quick-cut travel-vlog style, time-compressed activity, cross-location montage or visual-effects editing. The user may request the overall duration and style directly. Define the whole result, source-supported segment contents, exact spoken words or silence, identity/prop continuity where applicable, and allowed visual-effect direction. Seedance chooses the internal cuts, transitions and montage rhythm. Do not prescribe a per-shot list or build multiple source clips just to reconstruct something the model can generate as one result.

Use `projection_profile: autonomous_edit_v1`, `scale_intent: autonomous_editing`, and `shooting.organization: edited_sequence`. Time/place changes are deliberate segment boundaries, not continuity failures. Record source-backed beginning/end facts per segment and their references. The continuous-scene frozen global and its single-setting assumptions do not govern this isolated form; retain compatible visual style, identities, aspect and the current no-dubbing rule. General montage/VFX style requests are allowed; adding a character power, event, destination, unlisted dialogue or information reveal is not.

A 15-second day-in-the-life example describes output compression, not 15 seconds of continuous lived time. The specific episode still owns permitted events and duration capacity must be established for the task. This skill remains scoped to its canon projects; an unrelated user-authored vlog does not acquire a requirement for a canon novel or episode director.

Whole-unit silence or exact speech boundary rules remain mandatory. With dialogue, include all exact lines in source order; without dialogue, explicitly silence speech. No separate narration, ADR, sound-effects task or audio-harvesting generation is added. 《雾峡轨城》 forbids J-cut even inside a generated edited sequence; do not disguise it as incoming sound anticipation.

## Doorway Defect Routing

Run this before the normal class decision. First remove the door from the staging: start after the exit, end before the entry, relocate all performance to one side, substitute a non-door anchor, or preserve a causal door fact through offscreen sound, reaction, stable state, or edit ellipsis. A source mention of a closed door is not by itself a reason to keep it closed or visible.

Only four package states are legal:

- `eliminated_or_none`: no actionable door content remains.
- `same_side_interior_open_background`: the door is already open and stays open; all action and dialogue remain clearly inside and away from it.
- `same_side_static_closed_door`: the door is already closed and stays completely motionless; all action and dialogue remain on one side. That side may be indoors or outdoors, and start/end states may be doorway-adjacent.
- `asset_scene_exit_only`: an unavoidable exit is isolated as a distant `DIRECTED_CAPTURE`; the door is already open and stays open; the subject only comes out from inside and arrives in the environment represented by the bound `doorway_destination_asset_id`. No reverse entry, door operation, dialogue, combat, contact, prop exchange, threshold pause, or second action is permitted.

There is no generic doorway-crossing class. If a beat cannot fit one of these states, return it to director redesign instead of weakening the rule.

## 720p Live-Face And Scale Routing

Apply the director production profile by face visibility, not by whether any human body is present:

- A close or close-up visible-face performance may remain `AUTO_EVENT` when autonomous framing cannot lose the protected result.
- A director-required medium-wide, wide, or long environment, machine, prop, aftermath, back, silhouette, occluded-face, helmet, mask, or other no-visible-live-face view is `DIRECTED_CAPTURE`. Its scale or spatial relation is the acquisition purpose.
- A wider view containing a visible live-human face is a high-risk `DIRECTED_CAPTURE` only when the director master names the protected need and explains why close facial coverage plus a no-visible-face spatial view cannot fully replace it.
- Every wider visible-face acquisition requires a source-faithful fallback assembled from close facial coverage and a no-visible-face space, contact, prop, or result view.

Do not translate “wide shots may contain humans when their faces are not visible” into “wide shots must be empty.” Do not translate the generic Seedance close-shot global into permission to discard a protected director geography or scale decision.

## DIRECTED_CAPTURE

Use `DIRECTED_CAPTURE` only when losing a particular view causes one of these concrete failures:

- the narrow `asset_scene_exit_only` exception must visibly establish the subject coming out into its bound destination scene asset;
- an object must remain visibly unopened, absent, attached, held, or left behind;
- a specific cause-result chain must remain continuous enough to prove causality;
- a character choice depends on a readable delay, withheld view, turn, or look direction;
- stillness, refusal to follow, occlusion, or revealed depth is the episode's directing idea;
- a P0/P1 insert, master, aftermath, or clean state is required as editorial insurance.
- under the current 720p profile, a protected no-visible-live-face wide view is needed to preserve geography, scale, threshold, machine action, aftermath, or a face-concealed human relation that the close-biased autonomous profile cannot guarantee.

Do not use it merely because the director draft contains a shot ID, lens suggestion, or attractive camera idea.

### Prompt Contract

A directed-capture prompt contains:

1. the same character performance, emotion, fixed voice, and audio-reference units required by the current Seedance project rules;
2. a directed-capture global containing the current time, location, lighting, physical image style, aspect, subtitle/music policy, filter, and non-cut environment continuity;
3. the mandatory story-background paragraph, then the compiled start spatial-motion state;
4. one short acquisition-intent sentence;
5. at most one dominant camera instruction;
6. one chronological visible/audible action or performance chain with its completed result;
7. the compiled end spatial-motion state.

The directed-capture global must not contain either camera-free frozen sentence from `wuxia-seedance-scene-prompts`:

```text
镜头偏好手持镜头特写和近景。无任何中景 远景。
```

```text
对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。
```

This is an isolated acquisition profile, not a revision of the existing Seedance default.

### One Dominant Camera Instruction

Choose the smallest observable instruction that protects the result, for example:

- `远景完整看见人物从已经敞开的门内出来，进入参考场景资产所示的街道，门始终保持敞开。`
- `从罗小雨当前行动侧连续看见跑出两步、听见吸气、停步回头。`

Do not stack lens, focal length, camera height, pan, track, crane, orbit, focus pulls, multiple shot sizes, shot counts, and cut timing into one request. When the viewing result can be protected by blocking or occlusion, prefer that over a complicated camera path.

Exact lens metadata may remain in the acquisition manifest for human selection. Put it in platform text only when it is the single essential control and a simpler scale/position description cannot express the view.

### Causal Complexity Budget

The prompt may contain one dominant camera behavior plus one dominant action chain. If the action has many force transfers, collisions, moving bodies, or state changes, simplify camera behavior. If camera movement is essential, simplify foreground action and acquire inserts or aftermath separately.

Do not make a single prompt simultaneously perform a difficult stunt, preserve several identities, execute multiple dialogue exchanges, change locations, and hit an exact camera path.

### Holds And Timing

Do not put timecodes, frame counts, or exact seconds into platform text. Express only the observable source material needed for later trimming:

- begin from a stable state before the protected action;
- complete the full action or line without truncation;
- preserve the resulting state after completion;
- acquire clean head and tail material.

Record desired head/tail handles and edit hold lengths numerically in manifest metadata. A requested handle is an acquisition requirement, not proof that generated footage contains it.

## POST_CONTROL

`POST_CONTROL` exists only in `edit_units`. It includes:

- explicit J/L cuts only where actually authorized for another project; J-cut is forbidden for 雾峡轨城;
- sound lead, sound carry, dialogue overlap, sound bridge, or silence;
- exact cut point, reaction hold duration, match cut, hard cut, dissolve, or cut to black;
- montage / crosscutting assembly across independently generated files; internal montage inside AUTO_EDITED is a native generation goal, not POST_CONTROL;
- selecting one generated take over another.

Do not send external-file operations to a generation prompt. AUTO_EDITED may request its own internal montage, quick cuts, visual effects and temporal compression. Sound-effects work is owned by the user; do not add it as a default post task.

### J-Cut（雾峡轨城禁用，其他项目也不默认）

A J-cut means the incoming edit unit's sound begins under the preceding picture. For another project with an explicit need, use already available native video audio; do not create a sound task. Metadata may describe:

1. the incoming video already supplies its own synchronized audio;
2. record `audio_source_unit_id` and `audio_lead_s` in the incoming edit unit;
3. ensure that source unit's `handles.audio_head_s` is at least the planned lead;
4. in post, detach or extend the incoming audio earlier while delaying its picture cut.

Seedance does not perform the cross-clip operation. The Seedance prompt describes only the continuous performance and clean audible source.

### L-Cut

An L-cut carries the outgoing source's sound under the next picture. Record the outgoing `audio_source_unit_id`, `audio_carry_s`, and sufficient `handles.audio_tail_s`. Keep the operation outside both source prompts.

### Sound Bridge Versus Generated Sound

A current block may generate a concrete diegetic sound such as breathing, footsteps, machinery, impact, or a spoken line. The decision to let that sound precede or survive a cut is still post control. Do not confuse sound content with timeline placement.

## Coverage And Fallbacks

For each P0/P1 director reference, record what must be observable in accepted footage. Do not use aesthetic adjectives as acceptance criteria.

Good criteria:

- `门在动作开始前已经敞开并全程保持敞开，人物只从门内出来并进入绑定场景资产所示的环境。`
- `第一鞭实际命中，力场闪动、人体抛飞和货车凹陷都成立。`
- `人物把未开启工具箱放到维修台后完全松手，工具箱保持未开启。`

For every P0 failure mode, define a source-faithful fallback before generation. A fallback may use cause coverage plus a confirmed result state and sound, but it may not fabricate a missing intermediate result or replace completed contact with a near miss.

Fallback acquisition units are marked `take_role: fallback` and do not advance story state. They must bind to the same event snapshots and assets as the primary coverage unless a separately confirmed asset mapping says otherwise.

## Production Honesty

Treat every camera-aware acquisition as a request and every acceptance criterion as a later selection rule. Do not label a view acquired, a duration calibrated, or an edit completed until the corresponding evidence exists.

The package is executable when its sources, assets, prompts, planned coverage, and edit dependencies are complete. It is not the finished video and does not imply successful generation.
