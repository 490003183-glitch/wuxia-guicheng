# Event realization and task completion

Apply this contract to both AUTO_EVENT and DIRECTED_CAPTURE. It does not change camera routing, source dialogue, or asset authority.

## Write the event before filling state

For each generation unit, first identify the source-backed thing the audience can see or hear. Distinguish exact spoken dialogue, observable nonverbal behavior, information already acquired, and information assigned to post-edit. Keep acquired information in `knowledge`. Required narration must have exact text and be generated in the same video call; separate narration/dubbing production is forbidden. Knowledge updates never become another report merely because another endpoint needs its state updated.

A report, interruption, check, authorization or business process is not automatically observable. Resolve its source-backed speech or physical carrier before projection. If source and approved assets do not resolve it, return that specific gap upstream; do not invent a device, gesture, speech, or delete the protected fact. Silence rules alone do not repair an unresolved report. A paper report is an object; pressing an established send button can be silent.

## State is evidence, not a pose template

Never initialize every character with standing / hands down / no contact / no injury just to fill fields. Preserve source-established posture and inherited action-relevant state. In schema 2.1, `hands`, `contact`, and `injury` may explicitly be `null` only when not established and not material to current or inherited action. Null means unprojected, not empty hands or no injury. A known wound, grip, contact or release cannot become null. Position, posture and facing still need meaningful staging; resolve missing material facts rather than filling a stock pose.

Use `projectCharacterSpatialState` in `scripts/prompt_realization.mjs` for the common character clauses, or an equivalent projector that emits only supplied non-null facts and introduces no defaults. Append source-backed props, movement and equipment state where material. Stillness, continuous holding and ordinary listening are valid; never add a gesture or emotional turn just to vary blocks.

## Spatial staging must enable the action

Before projecting a block, cold-read its first physical action against the start state and bound scene reference. Resolve only the relations that determine execution: the actor's side of a named obstacle, the other participant's relative location, the prop's initial holder or resting place, and the support/contact needed for the action. “维修夹层后部” alone does not locate an actor relative to the pipe being crossed; “将取枪” does not locate the gun. Do not let later action prose repair missing initial conditions. Apply the same check to the ending state and the next action. For AUTO_EDITED, also resolve these conditions at each source segment's new place/time without pretending the whole unit is continuous.

Use identified physical entities and relations, for example “低传送台朝撤离坡道的一侧”, with a verified facility number when available. “当前可行通路” delegates route selection to the generator and is not an orientation target. A head orientation must identify one target or one physically coherent direction; a list of potentially divergent targets needs resolution. Keep already-moving facts separate from future intentions. Do not make metres mandatory for ordinary staging: reuse source/director travel budgets where needed, and never infer exact distances or complete occlusion from an image. A repeated facility number requires the entity plus distinguishing neighbour/side. Number-free scenes can still have concrete staging.

Project each visible character's supplied `position`, `posture`, `facing`, and non-null `hands`/`contact` into its own attributed clauses in both boundary paragraphs. Keep these source-resolved field phrases intact so loss checking can compare them; other prose may be natural. Use `projectCharacterSpatialState` or an equivalent full projector, never a summary-plus-facing template. Separately include action-relevant movement, supports, creatures, prop location, equipment configuration and visible injury consequences; do not dump internal knowledge, costume catalogues or mechanism labels. A null field is not permission to erase a known grip or critical prop location.

`spatial_realization.mjs` catches demonstrated unresolved-route/future-action formulations and omissions of the five supplied character fields from final text. The prompt validator compares compiled snapshots; both HTML delivery paths use the same checks when snapshots are supplied. This is bounded text validation, not proof of correct blocking, first-action feasibility, source truth, or geometry. Final source/image review must still answer: can the first action begin from this state, and can the next action begin from the ending state? Resolve a specific missing relation in the responsible layer rather than filling a vague default, fabricating precision, requesting new images without evidence, or adding a generic “review passed” flag.

## Relational review after field projection

Specific words and identical handoff strings do not prove executable staging. Review the final copyable text against the current scene image and source events, using these checks where the action depends on them:

- **Connected route:** identify origin, traversable surfaces, junction/turn, obstacle side and destination. A dry strip meeting a transverse bridge is not directly adjacent to the bank beyond the water. Describe the connecting bridge segment; assign its movement to an existing interval or explicit elapsed passage. Carry the source travel budget without inventing image measurements. A scene may extend beyond the image; distinguish source-established continuation from a visible numbered facility.
- **Stable anchor:** use fixed equipment, a wall or a pillar for a stationary participant. When another character moves, recompute relations such as “one step behind her”; never preserve that phrase only because it matches the preceding text. If both move together, the event must carry both. State which physical side of a pillar or table is used, with an adjacent object, rather than camera-relative near/far.
- **Body resources:** reconcile held objects, supporting hands and contacts before each critical event. A gun hand cannot also grip a rail without a transfer or release. “Unarmed / no object held” does not mean both hands are free while a palm supports the wall. Mark a release when it enables the next action; do not invent unnecessary gestures.
- **Ordering and visibility:** an overtaking action requires an initial order and a change that puts the overtaker behind first. A person revealed after a question starts out of sight and becomes visible through that event; do not mark the whole block audio-only or expose the person in the opening.
- **Evidence boundary:** record the concrete corrected relation, source segment and any offscreen travel in the existing production manifest. Do not replace this review with a boolean approval field, matching facility IDs, string equality, or a successful structural validator. If a required route truly conflicts with the approved sources, identify that conflict at its responsible layer; do not silently relocate story events or request extra imagery as a substitute for reasoning.

Review all units once, then recheck changed units and their adjacent boundaries. These are action feasibility criteria, not instructions to add coordinates, metres, diagrams or every body field to every sentence.

## Finish tasks at the actual event

When the source ends a report or finishes a decision for a waiting participant, put `task_completions: [{"entity": "联络人员", "task": "等待决定"}]` on that exact event and update the entity's state through effects. Supported task labels are `汇报` and `等待决定`; these conditional markers stay internal. A middle sentence, intermediate reporting block, or unfinished instruction does not complete the task. Merely starting to speak never authorizes execution.

The compiler and independent state validator check completion against pre/post state and reject stale tasks even if `crowd_state_unchanged` was supplied. Explicit prose such as `联络人员停止汇报` is also checked without a marker. Completion markers do not authorize any new action, infer a decision from an arbitrary imperative, or replace the final source-to-event review.

## Enforce actual platform speech

Author block-local speech rules from the approved generated speech. `speechRulesFor` provides the canonical rule list from resolved text and participant IDs; it never supplies missing dialogue. With no speech, require `全程无台词` and `不生成旁白或画外人声。`. With dialogue, require the exact source-speech-only rule in prompt-projection.md and named silence for present non-speakers. Include speaking extras and offscreen speech when determining the boundary. A state that still says a silent participant is reporting contradicts that boundary.

## Delivery gate and its limits

`prompt_realization.mjs` is shared by the prompt validator, ordinary HTML renderer and director package validator/renderer. Check the exact final copyable text after projection and all transformations; validating an AUTO_EVENT surrogate does not validate DIRECTED_CAPTURE. Never edit HTML prompts after successful rendering, strip rejected facts into a validation-only copy, or treat a check on an earlier prompt as proof about the final one.

Known unresolved-report and abstract-work formulations trigger actionable diagnostics. These bounded text checks do not understand every paraphrase and cannot prove that a proposed carrier is source-backed. Do a short final cold read of the actual delivery: who acts/speaks, what can be seen/heard, how information reaches the receiver, which task just ended, and whether end state permits the next event. For each requested block, resolve substantive gaps rather than adding an approval checkbox or a generic passed flag. Do not label structural success as full semantic/source fidelity or measured generation success.

Regression entry: `node tests/run_realization_tests.mjs`; also run the existing validation, scene-plan and director-package regressions when changing the shared contract.
