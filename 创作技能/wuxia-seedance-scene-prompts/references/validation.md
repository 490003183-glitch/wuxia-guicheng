# Manual validation

Run `scripts/validate_scene_delivery.mjs`, then audit the final source, compiled state, and prompts. Structural success does not prove source fidelity, physical geometry, acting quality, generation feasibility, or actual Seedance timing.

## Source and result

- Every approved event and dialogue line appears once and in order.
- Every source-action lock cites one exact accepted director/source location, maps to at least one event, and retains all exact distinguishing terms across its tagged event sequence. No explicit actor, kick/weapon/tool/body-part method, target/contact point, or result is replaced merely because another action reaches a similar outcome.
- No source-action lock is inferred from a character's general specialty, preference, capability, or typical behavior. There is no per-character technique quota or minimum use count; an unlocked director/source action remains unlocked.
- Nothing lacks a source event or approved inference.
- Every source door beat has a documented de-door result. Door staging is removed or relocated whenever its protected function survives. An unavoidable causal function remains through state, offscreen evidence, sound, reaction, or edit ellipsis; generic prompts contain no opening, closing, damage, threshold performance, or crossing.
- Every source-confirmed footwear loss, damage, removal, or wearing action remains unchanged; no footwear transition is suppressed or invented.
- When footwear is not an approved event or action-critical state, the prompt contains no defensive continuity wording such as `仍穿鞋`, `鞋靴没有脱落`, `鞋仍在脚上`, or `保持穿着`.
- Every source-completed contact, penetration, restraint, injury, and material consequence remains completed. Compare `刺入/插入/穿透/贯穿/砍中/撞中/击中/压住/擦着/咬住/抓住` against weaker attempt or near-miss wording.
- A source-confirmed miss, block, dodge, or pre-contact stop remains incomplete.
- Information permissions, future reveals, performance locks, and explicit creative decisions remain intact.

## State and continuity

- When a source-backed lighting or environment transition persists, `initial_state` contains one explicit stable state path and the exact transition event changes it.
- The changed visual state survives into every later block until another source-backed event changes it; later blocks never fall back to the earlier state's asset.
- Mutually exclusive state assets use `state_conditions`; a transition block includes both before and after assets only when both states actually occur in that block.
- Every state-conditioned rule supplies `global_forbidden_terms`, and none of those mutable lighting or environment terms appears in frozen `scene_global_master`.
- A post-transition prompt names the physical remaining light source and caused color, exposure, shadow, reflection, or visibility result; it does not request a flat color filter.
- A missing post-transition asset fails closed instead of reusing a geometrically correct scene master with the wrong visual state.
- Every event begins from possible preconditions.
- Positions, hands, contact, doors, props, ownership, injury, knowledge, systems, and vehicles change causally.
- First block start equals `initial_state`; every later start equals the preceding verified end.
- Every visible formal character tracked under `characters` has exactly one `情绪` unit before `global：`. Every formal character tracked under `characters` who is not visible but has concrete attributed dialogue has exactly one three-line `说话态度` unit, followed immediately by that same character's fixed voice and audio-reference lines. `crowd_entities` and one-block-only functional extra speakers have no such unit unless promoted to `characters`.
- Every character unit begins and ends with the literal full-width delimiter `｜`. The matching voice and audio-reference lines immediately follow the emotion line; one unit closes before the next character begins. Cross-character grouping by field is invalid.
- Each initial emotion exactly matches that character's compiled `start_state.emotion`; each ending emotion exactly matches compiled `end_state.emotion`.
- An emotion changes only when a current-block approved event supports it. The number of middle nodes is unrestricted and follows the actual event order. If no change occurs, the sole middle node is exactly `保持不变` and the initial and ending values are identical. `保持不变` cannot coexist with other nodes. A temporary change that returns to the same ending value must still name its source-backed trigger instead of claiming `保持不变`.
- For each continuously tracked character, the preceding block's ending emotion equals the next block's initial emotion byte-for-byte. Synonyms, smoothing, escalation, de-escalation, and default resets are continuity failures.
- Emotion continuity is validated independently from spatial-motion continuity; neither state machine can satisfy or replace the other.
- Every block contains exactly one nonempty `故事背景状态` paragraph after global and any special rules, immediately before the starting spatial state. Apply the [story-background contract](prompt-projection.md#mandatory-story-background-state): current situation and ongoing tasks match the approved events and change with actual capabilities; this summary does not replace action execution.
- Every block contains exactly one `开始空间运动状态` paragraph immediately after `故事背景状态`; it agrees with compiled `start_state` for every action-relevant position, posture, facing, relative distance, motion trend, support, attachment, contact, force, and mecha or equipment configuration.
- Every block ends with exactly one `结束空间运动状态` paragraph; it agrees with compiled `end_state` for the same spatial-motion domains and is sufficient to initialize the next block without consulting the event prose.
- Every visible formal character's compiled `facing` is projected in each applicable spatial-motion paragraph as `角色名的头部朝向目标`. A target or threat-direction change has a same-event `characters.角色名.facing` effect; no earlier person, object, or direction survives merely because the field was never updated.
- Outside verbatim quoted dialogue, no platform or state text uses `看着／看向／望着／望向／盯着／注视／凝视／对视` or a `目光／视线／眼神` construction to express orientation. `角色名的头部朝向目标` is the required non-eye-framing form.
- Emotion and performance flows contain no metaphorical `正面／背面／侧面`; these are view-relative generation cues, not attitude labels.
- When a background performer or crowd crosses a block boundary, the entity exists in structured `crowd_entities`, not only in `scene.spatial_summary`; its complete compiled `continuity_state` appears verbatim in the required start and end spatial-motion paragraphs.
- Every event naming a tracked crowd entity either changes it through a complete new `continuity_state` effect or lists it in `crowd_state_unchanged`; no event does both, and no crowd entity silently disappears between blocks.
- A one-block-only speaking extra uses a clear local functional phrase and receiver/direction without an invented persistent name, crowd-state entry, actor unit, emotion line, or voice line.
- A character start or end state at a door, doorframe, doorway, or explicit inner/outer side is legal only when the block states `门始终保持关闭` and `所有动作和对白只发生在门的同一侧`. That side may be indoors or outdoors; the door never moves, opens, breaks, or is crossed. Separately, a legal open-door background is already open and remains open while all action stays inside and away from it.
- Emotion and acting interpretation do not appear in either spatial-motion state paragraph. World-space facing and movement are allowed; camera position, framing, focus, shot size, camera movement, cutting, and composition are forbidden.
- Inside each delimited speaking unit and before `global：`, every visible or offscreen formal speaker tracked under `characters` has exactly one line using `角色名的音色是：已确认的固定音色描述。`, followed by exactly one `角色名的音色音频文件参考引用：……。｜` line. A visible formal character without dialogue has neither line.
- Every attributed formal speaker, including communication and offscreen voices, receives the confirmed audio file path in every speaking block. If the voice table has no entry, use the canonical VOICE lookup before declaring the file missing. Verify an actual nonempty audio file; audio does not require a visual character asset. `未配置` is only a disclosed gap after both lookups fail, and cannot complete a user request for fixed-voice audio. A relative or invented path, another character's sample, actor name, textual timbre description, or voice-cloning instruction is invalid.
- Every formal-character voice description matches the current confirmed project voice source; none is inferred or rewritten. No voice record is required for `crowd_entities` or a one-block-only functional extra speaker.
- Every compiler-owned `opening_speaker_states` entry exactly matches a current-block attributed dialogue speaker under `characters` whose compiled start state is not visible. Missing the unit is `FORMAL_SPEAKER_PERFORMANCE_UNIT_REQUIRED`; using `情绪` for that unit is `OFFSCREEN_SPEAKER_REQUIRES_SPEAKING_ATTITUDE`.
- An offscreen formal speaker's body, position, posture, hands, contact, and face do not appear in `开始空间运动状态` or `结束空间运动状态`; only the audible performance unit and chronological communication event are projected.
- `opening_speaker_states` alone does not imply whole-block audio-only behavior. Every `audio_only_speakers` entry names a known formal character with concrete attributed dialogue, starts and remains invisible, appears in no visible start/end state or non-dialogue event prose, and derives exactly one character-specific no-visual rule. The same rule without the tag is stale; the tag without the rule fails.
- Outside verbatim quoted dialogue, every subject, receiver, target, owner, contact participant, and moving unit is written with an exact name or stable unique production identifier; no `他／她／它／他们／她们／它们／其／对方／两人／三人／双方／其中一个／其中一只／另一人／另一只` remains as entity shorthand.
- Every repeated same-type unit has one stable identifier established at first appearance, and the same identifier persists through movement, contact, role changes, block endings, and later openings. No unit is relabelled from an origin anchor to a destination anchor, and no identifier alternates with `第一只／第二只／另一只`.
- Every mechanical unit is named with `机器人` or its confirmed mechanical model outside verbatim dialogue; no robot is called `基础巡检员`, `机器人巡检员`, `巡检单位`, or a bare human occupational noun.
- Each participating character's first body appearance states current posture and current action or handled object without expanding into a cast tableau.
- Persistent bulky props begin in their first required working positions and do not acquire invented transport business.
- Every anticipation or reaction has a visible or audible cue or tracked knowledge basis; no character reads another's unspoken intention.
- The final visible result agrees with compiled end state.

## Camera delegation

- No camera plan was designed before, during, or after block construction.
- The scene plan contains no `scene_camera_plan`, `shots`, camera beats, start/end frames, camera position, focus target, opening composition, or ending composition.
- Apart from the two exact frozen-global controls `镜头偏好手持镜头特写和近景。无任何中景 远景。` and `对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。`, the platform prompt contains no numbered shots, shot tables, fixed camera, lens, focal length, focus target, frame percentage, camera path, push/pull/pan/track/orbit/crane/handheld direction, exact cut point, exact cut count, or per-line camera assignment.
- The frozen global explicitly delegates all camera movement, framing changes, cut count, and cut timing to Seedance.
- Every frozen `global` contains the exact sentence `镜头偏好手持镜头特写和近景。无任何中景 远景。` exactly once.
- Every frozen `global` contains the exact camera-delegation text `对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。` exactly once.
- No frozen `global` contains continuous-shot preference, a cut-only-when-unreadable threshold, or blanket bans on listener-reaction cuts or shot/reverse-shot.
- Every frozen `global` contains the exact sentence `非切镜情况下环境不跳变。` exactly once.
- No frozen `global` contains a named character or a character-, creature-, robot-, mecha-, worker-, prop-, costume-, body-feature-, identity-, appearance-, behavior-, or anti-misgeneration rule. Such content is `ENTITY_RULE_IN_GLOBAL`.
- Landscape output uses that exact sentence as the complete shot-size preference and contains no positive `大远景`, `远景`, `全景`, `中全景`, `中景`, or competing shot-size instruction elsewhere.

## Block-local special rules

- The scene plan has no root-, scene-, or global-level special-rule default.
- Every compiled block contains its own `special_rules` array, including an empty array when no rule is needed.
- Every authored item appears once, in order, as `特殊规则：...` after `global` and before `开始空间运动状态`.
- Prompt special rules exactly equal the current compiled block's array. A missing, extra, reordered, or inherited item is `SPECIAL_RULES_DO_NOT_MATCH_COMPILED_BLOCK`.
- Every tagged block-wide audio-only speaker has exactly one compiler-derived rule `角色名本条仅以画外声音参与；不呈现角色名本人、角色名所在空间、声音来源端画面或任何屏幕中的角色名影像。`; ordinary untagged offscreen speakers have zero such rules.
- Repeated text in adjacent blocks is valid only when both blocks explicitly author it.
- A persistent world fact may remain in state, but its anti-misgeneration instruction does not enter state replay or inherit automatically.

## Event-gated special functions

- Object presence, carrying, holding, aiming, swinging, ordinary striking, wrapping, and dragging do not by themselves activate a mechanism dependency or mechanism-source read.
- Every event that actually triggers, releases, deploys, retracts, transforms, switches, consumes, replenishes, locks, unlocks, activates, deactivates, or completes a setting-dependent non-ordinary capability has one stable ASCII `mechanism_id`, even when its prose is already unambiguous and the function resets inside the block.
- Ordinary presence, carrying, holding, aiming, swinging, ordinary striking, wrapping, dragging, standard physical use, and ordinary character combat techniques remain untagged. Audit this classification from the approved source and minimum formal mechanism section, not from isolated keywords.
- Every tagged event has exactly one same-ID current-block `mechanism_requirements` entry; every requirement has at least one matching current-block event. No requirement or derived rule leaks into an adjacent block.
- Every requirement cites only the minimum formal `source_refs` actually read. Its rule includes only the executing component, the currently used capability or constraint, the required visible transition, and a same-block anti-confusion distinction only when needed. Ambiguity determines rule detail, not whether a functional event receives a rule.
- The rule contains no unused ability, origin or history, full structure inventory, future mode, unrelated ammunition or cooldown, or fact already unambiguously locked by the uploaded asset.
- The compiler-derived `trigger_event_ids` exactly match the tagged events. The derived rule appears exactly once in the compiled block's `special_rules` and therefore exactly once in the prompt.
- Every `persistent_state_paths` item is changed by an effect on a matching tagged event, exists in the compiled end state, and reaches the next block through normal state replay. A mechanism that resets within the same block declares no persistent path.
- Audit one negative control: an otherwise comparable ordinary-use block with no mechanism tag compiles with no mechanism-derived rule. Do not use object-name or action-keyword heuristics as a substitute for the explicit gate.

## Visible asset coverage

- Every `asset_coverage_rules` item comes from the completed user-confirmed asset handoff and contains one canonical ID, its exact absolute local image path, and only narrow unambiguous trigger terms.
- Trigger terms for different assets do not duplicate or contain one another; ambiguous overlap fails as `ASSET_TRIGGER_TERM_COLLISION` instead of selecting or requiring multiple assets.
- For every block, compiler-derived `required_assets` exactly matches terms present in visible start/end state, non-dialogue event action, or block-local special rules. Dialogue-only mentions, an audio-only speaker's attributed dialogue, and its compiler-derived negative no-visual rule do not count.
- An asset requirement appears only in matching blocks. Audit one negative control in which the term is absent and confirm that no requirement is derived.
- `blocks[].required_assets` and compatibility `clips[].required_assets` match exactly and are never hand-edited.
- A formal delivery manifest declares `asset_coverage_contract: "required-assets-v1"` and copies each compiled block's `required_assets` unchanged.
- Every required ID/path pair appears exactly in that block's ordered `assets` list. Missing coverage fails as `VISIBLE_ASSET_COVERAGE_MISSING`; no compiler, validator, or renderer automatically inserts, substitutes, or spreads the asset to unrelated blocks.
- Listed non-required assets remain traceable to the same confirmed handoff; passing this check proves coverage, not semantic correctness of an unconfirmed asset choice.

## Platform chronology

- Every block begins its event body after the explicit start spatial-motion state, never with an invented opening shot.
- Dialogue, reaction, action cause, contact, direction, and result remain in source order.
- Every completed physical result names the actor, target, contact point, and visible consequence.
- Every critical action keeps its applicable causal transfers explicit: initiating subject/action, acting body part or component, target/contact point, force or mechanism, named result receiver, direct causal link, and recovery or next action in order. Critical-action results have neither `CRITICAL_ACTION_RESULT_SUBJECT_REQUIRED` nor `CRITICAL_ACTION_CAUSAL_LINK_REQUIRED`.
- Routine walking, looking, pickup/placement, posture change, and dialogue without a consequential result remain concise and do not activate the critical-action diagnostics.
- A short physical-action block is split at a genuine density boundary when it contains more distinct contacts, target changes, falls, recoveries, or attacker handoffs than comparable calibration supports. `dialogue_autocut` and the frozen close-shot preference do not by themselves guarantee multiple cuts or prevent one stable medium action view.
- For flexible-tool hook/wrap + pull + fall chains, confirm that `FLEXIBLE_TOOL_CONTACT_COMPONENT_REQUIRED`, `FLEXIBLE_TOOL_FORCE_ACTOR_REQUIRED`, `FORCE_RESULT_CAUSAL_LINK_REQUIRED`, and `BODY_ROUTE_OWNER_REQUIRED` are all absent. Audit the demonstrated ambiguous sentence as a negative control and the explicit component/force/result sentence as a positive control.
- Every source-backed beat whose meaning depends on a visible face contains concise observable facial movement in the chronological event. An emotion label alone does not satisfy this check. Any FACS/AU code is paired with visible natural-language deformation; no facial action is invented merely to satisfy a quota.
- No真人拍摄 safety language appears in platform text.
- The chronological event body ends on the last approved action or visible result, followed only by the required end spatial-motion state handoff, never an ending composition.
- Every block reuses the same frozen `global：` and contains `无字幕`, default `无音乐`, the required filter, the fixed visual-style sentence, exactly one `镜头偏好手持镜头特写和近景。无任何中景 远景。`, exactly one `对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。`, and exactly one `非切镜情况下环境不跳变。`.

## Dialogue attribution

- Verify the current screenplay carrier, director allocation, and actual prompt separately before attributing a defect to a layer. A valid screenplay does not excuse a derivative's added or repeated communication.
- Every unit with no generated speech contains the exact cue `全程无台词` and forbids generated narration/offscreen voices. A unit with approved speech instead limits output to the listed source lines and explicitly silences potentially ambiguous non-speaking participants. The rules are present in current-block `special_rules`, not just added to HTML; source-approved nonverbal sounds remain intact.
- Reject vague communication cues without concrete approved wording or a resolved non-dialogue carrier. Check that a prior report is not requested again merely to update knowledge, and that a completed report/decision clears stale `汇报／等待决定` task states. A structural validator pass does not waive this manual speech audit.

- Every `“……”` is directly preceded by `明确角色（对具体人物）说：` or `明确角色（朝具体方向）说：`.
- Every line repeats the clear speaker. No pronoun, `问：`, `回答：`, `喊：`, `道：`, bare quote, or ambiguous receiver remains.
- Screen text, labels, system messages, remembered text, and emphasis use no quotation marks.
- Pronouns inside approved quoted dialogue remain unchanged; the no-pronoun rule applies to attribution, state, action, reaction, contact, and result prose outside the quotation marks.

## Timing and revalidation

- Unmeasured timing is labelled uncalibrated outside platform text.
- Requested, file, and usable narrative durations remain separate.
- Scene/event edit: recompile and rerun dependent checks.
- Prompt-only edit: rerun prompt validation.
- Calibration edit: recompute calibration summary.
- Opening-state correction: revise the preceding causal event and shared compiled state first, then regenerate the preceding ending handoff and corrected opening handoff together. Reject an opening that claims a result before the event that causes it.
- Block merge: concatenate all approved events in order, inherit the first block's start and the last block's end, union assets in first-use order, remove retired IDs from every asset map and manifest, derive counts from active blocks, and keep unaffected downstream IDs unless the user requests renumbering.
- Asset-map or visible equipment edit: update the confirmed coverage registry, recompile, copy the new `required_assets`, and rerender; never repair only the HTML list by hand.
- Active block IDs, compiled clip IDs, delivery-manifest IDs, and per-block asset-map keys have no duplicates, omissions, or orphan entries.

Regenerate compiler-owned state fields; never hand-synchronize them.

## Spatial text and image-purpose limits

Apply the first-action and next-action cold read in [event-realization.md](event-realization.md#spatial-staging-must-enable-the-action). Shared spatial checks reject known vague route placeholders, future-action boundary states, and loss of supplied position/posture/facing/hands/contact from an owner's final clauses. They do not certify every paraphrase, obstacle relationship, prop starting location or occlusion. Verify those against the current source and actual bound reference. Do not report all semantic checks passed merely because required strings are present.

For no-image deliveries, use the source-hashed TEXT_ONLY contract in SKILL.md. Test empty unapproved uploads, a nonempty required-assets list, stale/mismatched evidence, and style-only filler as failures; verify the authorized case renders no upload button. Regression entry: `node tests/run_spatial_asset_tests.mjs`.
