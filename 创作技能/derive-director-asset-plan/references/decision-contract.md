# Director Asset Decision Contract

The planner's job is to prevent both missing production references and asset inflation. A director decision does not automatically become an image.

## Asset-Worthy Test

Before searching or proposing an asset, identify the exact failure the image would prevent. An image is justified only when all applicable conditions hold:

1. the dependency is visible and static enough for a still image to communicate;
2. it locks identity, structure, state, topology, scale, occlusion, or a result that prompt prose may not preserve reliably;
3. losing that information would damage a screenplay fact, a P0/P1 director result, continuity, or fallback viability;
4. an existing formal asset or a short text-only rule cannot solve the same problem with less complexity.

If the proposed image merely illustrates a shot already understandable from current assets, do not create it.

## Decision Matrix

| Decision | Use when | Required evidence | Prompt dispatch |
| --- | --- | --- | --- |
| `REUSE` | Exact formal asset already exists and matches this state/use | Dedicated library-search query and exact returned ID/status/path | Never |
| `CREATE` | A still image passes the asset-worthy test and no exact asset exists | Dedicated library search returns no exact match; proposed asset and acceptance criteria are concrete | While unresolved only |
| `TEXT_ONLY` | A short spatial, boundary-side, or blocking statement is clearer than another image | Complete text rule and downstream scope | Never |
| `NO_ASSET` | Requirement belongs to action, performance, sound, timing, editing, or camera motion | Named non-asset category and concise reason | Never |
| `BLOCKED` | Canon, source identity, design authority, or dependency is unresolved | Exact blocker and conflicting/missing authority | Never |

`REUSE` means exact functional fit, not visual similarity. A similar corridor, damaged object, costume, or prop state is not a reusable match when the director needs different topology or state.

The same rule applies to environment state. A scene master with the correct room geometry but the wrong active lighting, color temperature, emergency-light mode, smoke, flooding, weather, or other persistent visible condition is not an exact match. Do not reuse a warm-light master after a source-backed switch to a cyan-cold state.

## Persistent Environment-State Test

Treat a visible environment change as a state machine when a source-backed event changes the look and that result survives into a later generation block or fallback. Record the initial state, transition event, resulting state, and exact asset binding. Typical triggers include switching lights, blackout or emergency-light takeover, alarm lighting, smoke accumulation, flooding, weather or time-of-day change, and room-wide damage or contamination.

- If the transition happens and restores within one block, the action may remain video-only unless a static fallback is needed.
- If a later block inherits the changed look, the downstream state needs an explicit asset decision.
- If the existing master has the wrong state, `REUSE` is forbidden even when its geometry is correct.
- If the resulting state is defined and materially controls continuity, use `CREATE` for a geometry-locked state derivative when no exact formal asset exists.
- If the resulting light source, color, visibility, or physical condition is undefined, use `BLOCKED` rather than inventing it.

## Director Instructions That Are Not Assets

Default these to `NO_ASSET` unless they expose a separate static dependency:

- J-cut, L-cut, sound bridge, music entry, silence, dialogue overlap;
- exact seconds, frame counts, reaction holds, cut timing, or montage order;
- pan, tilt, track, orbit, crane, whip movement, rack focus, handheld behavior;
- performance rhythm, delayed response, breathing pattern, gaze change, or emotional turn;
- a complete hit, throw, crossing, or reveal whose objects, states, and space are already locked by existing assets.

The edit or camera instruction remains in the director/production package. Do not create a storyboard-like still merely to encode time.

## When A Director View Justifies A Derived Asset

A derived view is justified when the static view itself protects a P0/P1 result, for example:

- a threshold view must simultaneously prove the connected sides of a crossing;
- an occlusion relation must hide one fact while exposing another;
- a fixed depth composition or result state is the only viable coverage for an ending;
- the master view cannot show an action-critical control, opening, attachment, damage, or absence;
- a fallback edit needs a clean before-state, result-state, or spatial insert.

Do not request a derived view only because the director draft specifies a different angle. First test whether the scene master, portal group, text blocking, or existing object asset already carries the needed information.

## Consolidation Rules

- Consolidate identical environment needs across all `TAKE-*`, `SH-*` and `ED-*` references into one scene master. Read the TAKE participants, real space, continuity and mutable states before assigning references; a different editorial shot does not require another asset.
- Follow the accepted staging. Consolidate only required static spatial dependencies; do not recreate removed actions for asset completeness.
- Reuse one equipment or prop master across operation, damage, and result variants.
- Keep before/after states separate only when the visible change is story-critical or needed for fallback assembly.
- Prefer a text-only blocking rule when positions and boundary sides fit in one or two unambiguous sentences.
- Do not create character pose assets per line, emotion, or bodily reaction. Static body-relation reference is warranted only when contact, support, restraint, scale, or multi-person geometry is otherwise unstable.

## Source And Canon Boundary

The screenplay defines what exists and happens. The director defines why a view or state matters. Formal setting and asset records define what that thing looks like.

If the director requests a view of an undefined reverse side, internal mechanism, damage pattern, costume state, or prop function, do not invent it. Use `BLOCKED` until the missing design authority is confirmed.

Mark sources separately as `正式剧本`, `正式导演稿`, `正式设定`, `正式资产`, `原始资料`, or `推断`. A director technique is not evidence for a world fact.

## Complete Baseline Before Director Deltas

Director-driven planning supplements rather than replaces screenplay coverage. First enumerate the full screenplay visual baseline, then add or strengthen requirements from P0/P1 director coverage. One consolidated requirement may carry both `baseline_refs` and `director_refs`.

Baseline examples include every used location, visible character state/costume, action-critical prop, equipment, creature, vehicle, interface, spatial connection, and persistent result state. A baseline dependency still receives an explicit decision when no director shot singles it out.

## Priority And Fallback

Give a requirement the highest priority among the director references it protects:

- `P0`: the asset protects story truth, an irreversible result, information permission, spatial proof, or edit viability;
- `P1`: the asset protects the chosen directing identity or emotional payoff;
- `P2`: the asset enriches coverage but is removable.
- `BASE`: the requirement belongs to the complete screenplay asset baseline but carries no P0/P1 director reference.

Every non-blocked P0 requirement needs a fallback written before prompt dispatch. A valid fallback preserves the same fact using existing coverage, a confirmed state image, a portal child, or a text continuity rule. It may not downgrade completed contact to reaction-only coverage, erase the completed arrival or boundary-side result, or hide a required object state. Under the accepted director's current doorway-defect policy, offscreen evidence, static results and edit ellipsis may replace visible traversal while preserving its causal fact. Do not restore a doorway crossing that the director has already removed. A `BLOCKED` P0 row records why no responsible decision or fallback can yet be made.

## Illustrative EP01 Decisions

These examples explain classification; they are not global requirements for other episodes.

| Director need | Likely decision | Reason |
| --- | --- | --- |
| Unopened toolbox is confirmed beyond the half-closed gate | Follow accepted de-door staging: reuse or create only the required static state and closed-box identity | Do not automatically request a threshold/crossing asset that restores removed generation behavior |
| First whip hit causes field flash, body throw, and truck dent | `REUSE` or `CREATE` intact/damage state assets as needed | The action remains video, but stable object/result states may need locking |
| A character runs two steps, hears breath, then turns | Usually `NO_ASSET` | Timing, audible cue, and performance belong to video direction |
| Street sound continues into the interior as an L-cut | `NO_ASSET` | Cross-clip sound placement belongs to editing |
| Final deep corridor remains after the subject exits | `REUSE` or `CREATE` derived depth view if the scene master cannot carry it | The fixed spatial result may be a P1/P0 acquisition anchor |

## Handoff Boundary

An asset requirement plan may prepare a downstream handoff but cannot self-confirm it. `ready_for_user_confirmation` means all referenced media are formally verified and bound. Only an explicit user confirmation changes the same map to `confirmed_complete`.

Do not include upstream gray-background detail assets in the Seedance upload handoff merely because they were generated. Bind only the final references a downstream block actually uploads.

---
公开派生版：mtgh。文档按 CC BY-NC-SA 4.0 提供；scripts 代码适用仓库 LICENSE-TOOLS。商用须另获授权。
