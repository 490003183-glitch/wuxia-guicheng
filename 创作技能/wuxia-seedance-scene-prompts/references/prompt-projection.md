# Prompt projection and delivery

Project platform text only after the complete scene has one state and event plan. Every block uses `dialogue_autocut`.

Asset coverage is outside the platform prompt but is bound to the same compiled block. For `continuity` and `production`, copy only the compiler-owned `required_assets` into the delivery manifest and require the renderer to match each exact ID/path pair against that block's upload list. The requirement is derived from narrow terms registered from the confirmed asset handoff and visible in start/end state, non-dialogue action, or block-local special rules. Dialogue-only mentions, a tagged audio-only speaker's attribution, and that speaker's derived negative no-visual rule do not activate it. This check never adds prompt prose, never loads a mechanism source, and never spreads an asset into a block where the term is absent.

## Source Speech Check

Before projection, use the accepted screenplay's exact utterance occurrences, not summaries of what speakers should convey. When combining events into one generation, include all their exact lines in source order, including offscreen speakers. Check the final copyable text for omissions, additions, repetition, reassignment and receiver changes. No dialogue means explicit silence; nonverbal breaths and cries remain available when source-backed. Required source narration must be explicitly worded and generated within the same video call, with its actual voice-only identity. Do not add a separate narration or dubbing task, change it into actor speech, or ask Seedance to improvise it.

## Required structure

```text
生成编号：[scene-block ID]

｜有本块具体台词的角色名（表演参考：已确认演员姓名） 情绪：[start emotion] → [zero or more ordered plot-triggered changes; use sole 保持不变 when none] → [end emotion]。
有本块具体台词的角色名的音色是：[confirmed fixed voice description]。
有本块具体台词的角色名的音色音频文件参考引用：[confirmed absolute local audio path, or 未配置]。｜

｜本块无具体台词的角色名（表演参考：已确认演员姓名） 情绪：[start emotion] → [zero or more ordered plot-triggered changes; use sole 保持不变 when none] → [end emotion]。｜

｜本块画外正式说话者（匿名表演指纹：稳定机制短句） 说话态度：[start emotion] → [zero or more ordered audible plot-triggered changes; use sole 保持不变 when none] → [end emotion]。
本块画外正式说话者的音色是：[confirmed fixed voice description]。
本块画外正式说话者的音色音频文件参考引用：[confirmed absolute local audio path, or 未配置]。｜

global：[frozen scene-global master + Seedance automatic camera control]

特殊规则：[optional rule authored for this block only]

故事背景状态：[本条当前局势、参与方持续任务与行动意图；受本条事件和能力变化约束]

开始空间运动状态：[compiled start_state projected as complete action-relevant spatial and motion facts]

[Chronological actions, attributed dialogue, reactions, contacts, and results continue in actual time order.]

结束空间运动状态：[compiled end_state projected as complete action-relevant spatial and motion facts]
```

Keep the actor/performance reference spatially neutral. For a character with one confirmed project actor, use exactly `表演参考：演员姓名`. Never include the work title or original role name. If the unique actor is genuinely unconfirmed, use `匿名表演指纹：稳定机制短句` and do not invent a name. The actor name is performance-only and may not control face, voice, body, costume, identity, or casting.

## Mandatory performance state handoff

Every visible formal character tracked under `characters` has exactly one delimited `情绪` unit before `global：`. Whether that visible unit has one line or three is decided only by concrete attributed dialogue in the current generation block. Every formal character tracked under `characters` who is not visible but has concrete attributed dialogue has exactly one three-line `说话态度` unit. This opening-state fact alone does not forbid a later cutaway. Only a compiled `audio_only_speakers` entry locks that character to voice-only participation for the whole block. `crowd_entities` and one-block-only functional extra speakers have no such unit unless promoted to `characters`.

A speaking character uses three lines:

```text
｜角色名（表演参考：演员姓名） 情绪：初始情绪 → 情节触发与变化1 → 情节触发与变化2 → … → 结束情绪。
角色名的音色是：已确认的固定音色描述。
角色名的音色音频文件参考引用：已确认的绝对路径或未配置。｜
```

A visible formal character with no concrete attributed dialogue in the current block uses one line and no voice settings:

```text
｜角色名（表演参考：演员姓名） 情绪：初始情绪 → 情节触发与变化1 → 情节触发与变化2 → … → 结束情绪。｜
```

An offscreen formal speaker uses three lines and never enters either spatial-motion paragraph as a body:

```text
｜角色名（匿名表演指纹：稳定机制短句） 说话态度：起始态度 → 可听见的情节触发与变化1 → … → 结束态度。
角色名的音色是：已确认的固定音色描述。
角色名的音色音频文件参考引用：已确认的绝对路径或未配置。｜
```

- Treat both full-width `｜` characters as mandatory prompt text. For a speaking character, the opening delimiter begins the emotion line and the closing delimiter ends the audio-reference line. For a character without dialogue, both delimiters belong to the emotion line.
- Keep every character unit adjacent and close it before starting the next; never group emotion, voice, or audio-reference lines by field across characters.
- A character counts as speaking only when the chronological body contains a concrete line attributed to that character as `角色名（对具体人物）说：“……”` or `角色名（朝具体方向）说：“……”`. Being visible, acting, reacting, making a nonverbal sound, receiving dialogue, or speaking in another generation block does not activate voice settings in this block.
- For both `情绪` and `说话态度`, copy the first value exactly from compiled `start_state.characters.<角色>.emotion` and the last value exactly from compiled `end_state.characters.<角色>.emotion`.
- Derive every middle node only from approved events in the current block. The middle sequence may contain any number of ordered emotional turns; do not compress real turns into one node or invent extra turns for drama.
- If no emotional change occurs, write exactly one middle node `保持不变` and keep the initial and ending values identical. Do not combine `保持不变` with any other node.
- For each event-caused change, state the shortest concrete trigger and change. A temporary change may return to the same ending emotion as the initial value.
- For a continuously tracked character across adjacent blocks, the preceding ending emotion and next initial emotion must be exactly identical text. Do not substitute a synonym or reset the emotion.
- Emotion state and spatial-motion state are independent. Never put emotion into either spatial-motion paragraph, and never use an emotion line to carry position, posture, facing, movement, or contact.

## Block-local special rules

`global` owns only shared environment and production controls. Put every character-, creature-, robot-, mecha-, worker-, prop-, costume-, body-feature-, identity-, appearance-, behavior-, or anti-misgeneration constraint in the current block's `special_rules` instead.

Project each item in authored order as one independent paragraph:

```text
特殊规则：本条出现的损坏巡检机器人是纯机械单位，不生成人类面孔、皮肤或工作人员制服。

特殊规则：损坏巡检机器人与M-01线缆隔离队员、M-02设备封存队员严格区分。
```

These lines apply only to the current block. During projection, never derive them from `scene_global_master`, a preceding block, a character page, or a scene default; copy only the compiled array. Ordinary authored rules must be authored independently in every block that needs them. Compiler-owned exceptions are derived before projection: event-gated mechanism rules, block-wide `audio_only_speakers` rules. When `special_rules` is empty, emit no `特殊规则：` paragraph.

For each compiled `audio_only_speakers` entry, project this exact current-block rule once:

```text
特殊规则：角色名本条仅以画外声音参与；不呈现角色名本人、角色名所在空间、声音来源端画面或任何屏幕中的角色名影像。
```

The speaker may still have the mandatory `说话态度`, voice, audio-reference, and attributed dialogue lines. The speaker's name must not appear in either spatial-motion paragraph or any non-dialogue chronological prose. Do not infer this rule from ordinary opening invisibility, and do not carry it into another block.

Persistent facts and rendered constraints remain separate. A state fact such as `圈圈没有颈环` may persist through compiled state; a generation instruction such as `圈圈颈部不得生成颈环` must be explicitly authored again for every block that needs it.

### Event-gated special-function dependencies

Do not turn an object, weapon, equipment item, vehicle, mecha, creature, or interface into an automatic prompt encyclopedia. Decide per event:

| Current event | Mechanism handling |
| --- | --- |
| The object is only visible, carried, held, aimed, swung, used for an ordinary strike, wrapped, or dragged | Do not read a mechanism source, add `mechanism_id`, or emit a mechanism rule |
| The event actually triggers, releases, deploys, retracts, transforms, switches, consumes, replenishes, locks, unlocks, activates, deactivates, or completes a setting-dependent non-ordinary capability | Always activate one `mechanism_id` and one matching block-local `mechanism_requirements` entry, even when the event prose is already unambiguous and the function resets inside the block |
| The block only inherits the completed aftermath of an earlier function and no part of that function continues or executes now | Carry the exact compiled world state only; do not inherit the earlier mechanism rule |

The activation question is only `does this event actually execute a setting-dependent special function?` Wrong-component risk, hidden structure, skipped transitions, false effects, and cross-block state decide which facts the rule must include; they are not extra activation thresholds. A character's ordinary combat technique and a standard physical use of an object are not mechanism functions merely because they matter to the plot.

When activated, read only the smallest formal source section needed for the tagged event. The compiled `特殊规则` sentence contains only:

1. the exact executing component;
2. the capability or constraint used now;
3. the required visible transition;
4. one anti-confusion distinction only when another same-block component could plausibly be mistaken for it.

The rule must not include unused abilities, origin or history, a full structure inventory, future modes, unrelated ammunition or cooldowns, or facts already unambiguously locked by the uploaded asset. The chronological body still performs the mechanism in event order and states its visible result.

For an EP30 block that executes only the long-main-tail sticky-bomb function, the correctly bounded rule is:

```text
特殊规则：白色复合关节鞭是白色细型机甲脊柱式Y形双头关节鞭。长主鞭尾的最末一节可脱离为黏弹；黏弹依靠甩击初始动量飞出，不会自主追踪，接触普通目标后吸附并爆炸。同一时刻只有一枚末节黏弹外露可用；脱离后，预置在倒数第二节内部的下一枚黏弹约一秒向外生长补位，并重新锁定为新的长主鞭尾末节。
```

If that same block also mentions the enlarged short branch and uses it only to strike a robot, append the anti-confusion sentence `膨大短分支是另一套单发破甲榴弹结构，本条只用它重击机器人，不脱离，也不作为黏弹。` Do not append that sentence to a block where the short branch is absent or serves a different source-approved function.

This rule is justified only in a block that executes the sticky-bomb function. A block in which 星落 merely carries, swings, wraps with, or ordinarily strikes with the whip receives no sticky-bomb rule. A later short-branch grenade event activates a separate requirement limited to that event; it does not inherit this rule.

If a mechanism changes a state that survives the block, put the path in `persistent_state_paths`, change it through a tagged event effect, serialize the result in the ending spatial-motion state, and let compiler replay create the next opening. If the mechanism completes and resets inside the same block, do not invent a persistent path.

## Mandatory story-background state

每条独立可复制提示词必须包含且仅包含一个非空的 `故事背景状态：...` 段落，适用于 `AUTO_EVENT`、`AUTO_EDITED`、`DIRECTED_CAPTURE` 及无图块。固定放在 global 和本块特殊规则之后、开始空间运动状态之前；无特殊规则时紧接 global。

- 用简短具体文字交代本条正在发生的局势、参与方的持续任务与行动意图。追击场面应说明谁追击谁、谁撤离或掩护，以及敌方当前如何施压；不能只写“敌对”“紧张”或罗列在场单位。平静、静态或无人场面如实写当前任务或环境局势，不强加冲突。
- 只依据已批准剧情、当前事件与状态作摘要；必要的制作推断沿用现有授权和记录边界。使用明确姓名或单位标识，不增加敌人、招式、台词、隐秘情报或新结果，不把背景意图当成已完成动作，也不因此引入新参考图。
- 持续任务受本条事件更新约束：受损、失能、撤离或任务完成后，不再沿用已失效的攻击能力或任务。此段不代替具体距离、攻击与受阻过程、动作因果及起止空间状态，也不要求已经失能的单位继续攻击。
- 这是现有来源与状态的文字投影，不新增状态机字段、台账或独立审核流程。每块按当前局势写，不机械继承上一块；AUTO_EDITED 在同一段内区分有变化的时空段落，不把各段行动同时化。既有直接 MD 修改仍按 Direct MD Edits 边界处理，不自动追补整集。

## Mandatory spatial-motion state handoff

Every platform block must contain exactly one `开始空间运动状态：...` paragraph immediately after the mandatory `故事背景状态：...` paragraph, plus exactly one final `结束空间运动状态：...` paragraph after the chronological event body.

- Derive the start paragraph only from compiled `start_state` and the end paragraph only from compiled `end_state`; never infer either from prompt prose.
- Describe location, posture, facing, relative position and distance, current movement and speed trend, support or attachment, contact and force relation, and action-critical body, limb, wing, claw, equipment, shield, drive, or mecha configuration.
- `facing` is a world-state target, not an eye-performance verb. For every visible formal character, project the compiled target in both paragraphs as `角色名的头部朝向目标`. When a target or threat direction changes, change `characters.角色名.facing` through the responsible event effect and let the new value reach the ending handoff and next opening.
- Outside verbatim quoted dialogue, never use `看着`, `看向`, `望着`, `望向`, `盯着`, `注视`, `凝视`, `对视`, `目光`, `视线`, or `眼神` as a substitute for physical orientation. Seedance commonly treats those words as an instruction to include the actor's and target's eyes or faces. If only orientation is intended, write `角色名的头部朝向目标`; add torso orientation only when body mechanics require it.
- Include every participating person, vehicle, or mecha whose state constrains the first event or the next block. The start paragraph must stage the first event independently; the end paragraph must initialize the next block independently.
- Do not project a character start or end position at a door, doorframe, doorway, or threshold unless the same generic block explicitly states `门始终保持关闭` and `所有动作和对白只发生在门的同一侧`. Under that static closed-door exception, either the indoor or outdoor side is legal and the state may be doorway-adjacent; the door must never move, open, break, or be crossed. Otherwise return that state for de-door redesign or upstream `asset_scene_exit_only` routing.
- Generic `dialogue_autocut` must not project a door crossing or straddling action. Non-door boundary relations may retain explicit side ownership when needed for continuity.
- Run natural-language boundary checks only on both spatial-motion paragraphs and non-dialogue chronological action prose. Do not inspect or rewrite verbatim quoted dialogue merely because a character says `门口`, `门洞中央`, or another boundary expression.
- Do not include emotion, acting interpretation, knowledge, future action, camera position, framing, focus, shot size, camera movement, cutting, opening composition, or ending composition.
- A spatial-motion state may describe facing and physical direction in world space. That is not camera direction.
- Do not write viewpoint words such as `正面`, `背面`, or `侧面` inside emotion or performance flow to mean directness, avoidance, or confrontation. Replace `正面对抗` with the actual behavior, for example `继续迎战且不后退`.

## Critical causal action

Do not apply this contract to every small movement. Activate it only for a critical action: weapon, tool, mecha, or hidden-mechanism execution; completed contact or force transfer; displacement or loss of balance; injury, restraint, release, damage, breakage, or destruction; or any action whose result changes a later event or block state. Routine walking, looking, pickup/placement, posture change, and dialogue without a consequential result stay concise.

Do not compress an activated multi-stage action into one modifier-heavy phrase. Project each applicable control transfer in chronological order:

```text
controlling actor acts
→ exact tool component moves
→ component contacts named target and point
→ controlling actor applies force
→ named target changes state because of that force
→ named target performs any recovery
```

Repeat the exact subject whenever agency or control passes among people, body parts, tool components, objects, machines, and structures. Name the exact receiver of every consequential result. A dependent result must use `因此`, `导致`, `造成`, an explicit passive construction, or equally direct causal grammar; chronological adjacency alone does not prove causation. Do not add a route, wrap, anchor, fulcrum, or body-relative geometry merely to make the sentence sound continuous. If an approved route exists, name the owner of every body-relative anchor.

For a flexible weapon chain containing hook/wrap + pull + loss of balance, this is the minimum unambiguous form:

```text
星落甩动白色复合关节鞭，鞭尾勾住步小蛮脚踝，星落反方向拉动白色复合关节鞭，步小蛮因此摔倒，随后步小蛮立刻翻身站起。
```

The deterministic check is conditional. The generic critical-action layer rejects:

- `CRITICAL_ACTION_RESULT_SUBJECT_REQUIRED`: a consequential result omits the exact person, body part, component, object, machine, or structure receiving it;
- `CRITICAL_ACTION_CAUSAL_LINK_REQUIRED`: a consequential result is merely placed after a critical cause without direct causal grammar.

The flexible-tool subcheck does not activate for ordinary presence, holding, swinging, or one-stage striking. When its hook/wrap + pull + loss-of-balance pattern activates, it additionally rejects:

- `FLEXIBLE_TOOL_CONTACT_COMPONENT_REQUIRED`: the person is written as if the person, rather than the tool component, hooks or wraps the target;
- `FLEXIBLE_TOOL_FORCE_ACTOR_REQUIRED`: the pull stage inherits an omitted subject instead of repeating the controlling actor;
- `FORCE_RESULT_CAUSAL_LINK_REQUIRED`: the target result is merely adjacent to the force rather than explicitly caused by it;
- `BODY_ROUTE_OWNER_REQUIRED`: a body-relative path such as `绕过腰侧` has no named owner.

### Conditional crowd continuity

When compiled `crowd_entities` exists, read `crowd-continuity.md`. Copy every present entity's `continuity_state` verbatim into `开始空间运动状态`. Copy every entity still present at block end, plus every entity that exits during the current block, into `结束空间运动状态`. Do not add a separate crowd field, actor unit, emotion line, voice line, or audio-reference line. When `crowd_entities` is absent, perform no crowd-state work and do not load that reference.

## Explicit entity naming

Outside verbatim quoted dialogue, write every acting subject, receiver, target, owner, contact participant, and moving unit by an exact name or stable unique production identifier. Do not replace a name with `他`, `她`, `它`, `他们`, `她们`, `它们`, `其`, `对方`, `两人`, `三人`, `双方`, `其中一个`, `其中一只`, `另一人`, `另一只`, or a similar ambiguous collective phrase. This rule applies to actor opening lines, `global`, `故事背景状态`, `开始空间运动状态`, chronological event prose, reactions, contact and force results, and `结束空间运动状态`. Approved quoted dialogue remains verbatim and may retain source pronouns.

When several units share one type, establish one persistent identifier for each unit at first appearance. Prefer a confirmed proper name; otherwise combine the unit type with an unambiguous initial anchor or function, such as `A-02立柱阿尔法`, `断裂检修台阿尔法`, `星落脚边阿尔法`, or `P-04桥下阿尔法`. Keep the first identifier after movement or role change. For example, `A-02立柱阿尔法` remains `A-02立柱阿尔法` after reaching the exit; do not rename the same unit `出口阿尔法`. Never alternate between a stable identifier and `第一只／第二只／另一只` across blocks.

Mechanical and human role names must remain lexically distinct. Every non-dialogue reference to a mechanical unit must contain `机器人` or the confirmed mechanical model. Do not use `基础巡检员`, `机器人巡检员`, `巡检单位`, or a bare human occupational noun for a robot. Human `指挥队员`, `封锁队员`, `信号追踪队员`, and `白塔工作人员` remain people and must not inherit a robot label.

## Facial performance

Emotion state is not visible facial execution. When an approved dialogue, reaction, pain, concealment, realization, or other beat depends on the face, write the shortest observable sequence needed to show it inside the chronological event: eyebrow or glabellar tension, eyelid aperture or tension, gaze focus, lip contact or separation, jaw release, and recovery order. Do not add a facial action when the beat does not need one.

FACS/AU terminology may be paired with the corresponding visible natural-language expression when supplied by an approved performance source. Do not rely on an AU code alone or invent an expression unrelated to the event.

## Character voice lines

Before `global：`, add voice information only to a formal character tracked under `characters` who has concrete attributed dialogue in the current block, whether visible or offscreen. Place exactly one voice line immediately after that character's `情绪` or `说话态度` line, followed by exactly one audio-reference line. A visible character without dialogue closes the unit on the emotion line and receives neither line. Re-evaluate this per character in every independent prompt block.

音频检索按本条实际台词中的说话者触发，不按可见人物或图片上传列表触发。先查正式音色调用表；角色未登记默认音频时，必须再调用 `wuxia-image-asset-library` 的只读 VOICE 搜索，核对同角色正式卡的用途、状态与实际文件。可用且用途明确的用户提供声音资产不能因调用表漏登记而写成 `未配置`；多个候选无法确定当前选择时才说明具体歧义。每条独立生成都重复给出完整路径，不能只在前一条给出或用“沿用音色”替代。通讯／全程画外角色保留 `说话态度`、音色和文件三行单元，继续遵守不出镜规则；音频不占图片上传位，也不要求增加人物图或单独配音任务。

只有调用表与正式资产库均无可用已确认文件时，`未配置` 才是有效的缺失标记，需在交付说明中指出角色和受影响块，不能声称已经通过音频固定声音。用户要求实际音频引用时，受影响块待补该文件；不伪造路径或借用其他角色音频。已填路径须指向实际存在、非空的本地音频文件。

Use exactly:

```text
｜步小蛮（表演参考：已确认演员姓名） 情绪：警觉 → 保持不变 → 警觉。
步小蛮的音色是：18岁中音女声，清亮偏软，松弛直接。
步小蛮的音色音频文件参考引用：未配置。｜
```

The voice sentence form remains `角色名的音色是：已确认的固定音色描述。`. The next line must use `角色名的音色音频文件参考引用：已确认的绝对路径。｜` or exactly `角色名的音色音频文件参考引用：未配置。｜`. Do not substitute `声线为`, `声音特点`, a table, a cast-description field, or prose buried in `global：` or the chronological body. All three role names in one unit must match exactly. Never infer an audio path from an actor name or textual timbre description.

Use the current confirmed project voice source only for current-block formal speakers. Use the voice description explicitly supplied by the current project. The confirmed actor name belongs only in the opening performance-reference field; never place it in the voice line or use it as an imitation or voice-cloning target. If a formal character who speaks in this block lacks a confirmed voice description, the block is not directly executable; ask the user to confirm the missing voice instead of inventing one. A visible formal character without dialogue neither triggers this gate nor receives voice text. This voice gate does not apply to `crowd_entities` or one-block-only functional extra speakers.

Freeze one `scene_global_master` and copy it verbatim into every prompt. It owns only location, time, lighting, physical image style, director mechanism, output aspect, `无字幕`, default `无音乐`, exactly one `Schneider Hollywood Black Magic 1/8`, camera delegation, and environment continuity. It never owns a named character or any character-, creature-, robot-, mecha-, worker-, prop-, costume-, body-feature-, identity-, appearance-, behavior-, or anti-misgeneration constraint. It also contains this exact sentence once:

```text
高端动作概念片，电影级广告级画质，广告级商业调色，画面通透明亮、层次分明，色彩饱和自然不发灰，高光与材质光泽锐利。
```

Every frozen `global` must also contain this exact sentence once and only once:

```text
镜头偏好手持镜头特写和近景。无任何中景 远景。
```

This is the sole allowed scene-global camera or coverage preference. It does not authorize per-event shot design, camera movement, focus instruction, cut points, opening or ending composition, or shot count.

Every frozen `global` must also contain this exact environment-continuity sentence once and only once:

```text
非切镜情况下环境不跳变。
```

This preserves the established environment during a continuous, uncut visual passage. It does not forbid Seedance from cutting under `dialogue_autocut`, and it does not authorize the prompt author to prescribe cut points.

Only an explicit scene-level music decision may replace `无音乐`. Never emit `约束：`; use block-local `特殊规则：` only for object-specific generation constraints. Declare one output aspect.

For landscape, use the mandatory exact sentence `镜头偏好手持镜头特写和近景。无任何中景 远景。` as the complete general shot-size preference. do not add positive `大远景`, `远景`, `全景`, `中全景`, `中景`, or competing shot-size language elsewhere.

Use this control in the frozen global:

```text
对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。
```

This sentence delegates camera work; it is not a hidden shot plan. Do not reintroduce continuous-shot preference, a cut-only-when-unreadable threshold, or blanket bans on listener-reaction cuts or shot/reverse-shot.

## Chronological body

The body must:

- begin chronological action only after the complete `开始空间运动状态` paragraph;
- follow actual time: cause, spoken line, response, later action, result;
- repeat exact names or stable production identifiers for every non-dialogue subject and target instead of using pronouns or collective shorthand;
- introduce character actions when chronology reaches them instead of using event prose to repair a missing start spatial-motion state;
- keep persistent bulky props in their inherited working positions; do not invent pushing, delivery, arrival, or relocation merely to establish them unless the approved source makes that movement an event;
- ground every anticipation or reaction in a visible or audible cue or tracked prior knowledge; never let a character know another character's unspoken intention;
- preserve the protected causal function of a source door beat while applying the doorway-defect override: first remove the door staging; otherwise carry the function through stable state, offscreen evidence, sound, reaction, or edit ellipsis. Never project opening, closing, door damage, threshold performance, or crossing into generic `dialogue_autocut`;
- end when the final approved action or visible result is complete.

For every event carrying `source_action_lock_ids`, copy the compiled `visible_action` exactly. Do not preserve only the outcome while changing the actor, attack method, body part, weapon, tool component, target, or contact point. The lock is internal audit metadata and must not appear as a `特殊规则` or explanatory sentence in the platform prompt. General character specialties never create platform actions or minimum technique counts.

End the chronological body on the last approved action or visible result, then write the mandatory `结束空间运动状态` paragraph. This paragraph is a world-state handoff, not an ending composition. Do not tell Seedance where the camera stands, where it moves, what it focuses on, or when it cuts.

## Physical result fidelity

Preserve the source action's completion state exactly.

- Completed verbs such as `刺入`, `插入`, `穿透`, `贯穿`, `砍中`, `撞中`, `击中`, `压住`, `擦着`, `咬住`, and `抓住` remain completed contact or penetration.
- Do not replace them with `刺向`, `撞向`, `试图`, `险些`, `逼近`, `悬停`, a failed contact, a reaction-only sentence, or an event that stops before impact.
- Keep actor, target, body part or object, contact point, force direction, and visible result.
- Direction-only wording is legal only when the approved source explicitly says the action misses, is blocked, is dodged, or stops before contact.
- Reject真人拍摄 safety engineering from platform text instead of letting it suppress the visible result.

Audit each block as `source completion → prompt completion → visible consequence`.

## Footwear relevance and source fidelity

Footwear appears only when the approved source contains a footwear action or state change that affects the current event or its handoff. Preserve a source-confirmed loss, damage, removal, or wearing action exactly and carry its result through state replay. When footwear is unrelated, omit it completely. Never add defensive continuity wording such as `仍穿鞋`, `鞋靴没有脱落`, `鞋仍在脚上`, or `保持穿着`; mentioning an unchanged object can activate unwanted footwear action or framing.

## Dialogue and quotation marks

### Speech boundary for every generation unit

Decide from the approved current-block content, including any generated narration or offscreen speech, not from whether a character has a voice setting. Author the applicable constraints in that block's own `special_rules` before compilation; never append them only to rendered text or the frozen global. Apply the same boundary to directed acquisition when this reference is used by the director-package skill.

- With no generated spoken content, include the exact standalone cue `全程无台词` as a special-rule item, plus `不生成旁白或画外人声。`. Absence of quoted dialogue is not a silence instruction. This does not remove source-approved breaths, nonverbal exertion sounds, footsteps, or environmental sound; a silent unit cannot carry narration; any required narration must be accurately assigned within a speaking video unit or returned upstream as an unresolved carrier.
- With generated speech, include `只说本条明确列出的原文台词，不新增、改写或重复对白，不添加未列出的旁白或画外人声。` and, for each present non-speaking participant who could be mistaken for a speaker, `明确角色名或稳定角色标识全程无台词。`. Do not use a whole-unit `全程无台词` rule when the unit contains approved speech, and do not silence an approved offscreen speaker.
- Permit only concrete approved speech and observable source-supported behavior. `收到报告／收到答复／汇报情况／处理部署` cannot stand in for unspecified speech. Represent already acquired information internally as knowledge; do not replay an earlier line as a new exchange. If a new information transfer has no resolved carrier, return that exact gap upstream instead of relying on a silence rule, invented dialogue, or deletion of the fact.
- When a report finishes or a decision is made, update the actor or crowd task state at that event. Do not keep projecting `汇报并等待决定` after it has ended. Recompile affected state and prompts rather than hand-editing only the visible paragraphs.

Every `“……”` is spoken dialogue. Use exactly one of:

```text
步小蛮（对乔昔）说：“先住一晚呢？”
乔昔（朝维修台方向）说：“我还没修完。”
```

Repeat a clear speaker for every line. Put exactly one concrete receiver or direction in parentheses immediately before `说：`. Do not use ambiguous pronouns, `问：`, `回答：`, `喊：`, `道：`, or bare quotes. Screens, labels, system messages, remembered text, and emphasis use no quotation marks. A story-confirmed in-world title may remain, but an actor fingerprint's work title or original role name is forbidden.

An unnamed extra whose dialogue and individual consequences end inside one block uses one locally unambiguous functional phrase, such as `队首的一名白塔疏散员`, and is not added to `crowd_entities` or assigned an invented persistent name. If that same individual has state that survives the block boundary, assign a stable `tracked_extra` identifier before compiling.

## Camera-free platform rule

Apart from the two mandatory frozen-global controls `镜头偏好手持镜头特写和近景。无任何中景 远景。` and `对白或动作推进时，允许Seedance根据当前行动者、说话者、听者反应、人物关系和动作因果，自主决定全部运镜、景别变化、切镜数量与切换时点；不规定固定机位、镜头路径、人物画面占比或逐句镜头，只禁止退回展示完整空间和多人站位的空间全景。`, do not write camera design in the body or in a hidden companion version. Reject:

- `explicit_shots`, `mixed`, numbered shots, shot tables, or internal shots;
- `景别-`, `机位-`, `镜头-`, `主对焦-`, `位置与构图：`, `结束构图：`;
- fixed camera, lens, focal length, focus target, frame percentage, camera path, push/pull/pan/track/orbit/crane/handheld instructions outside that exact frozen-global sentence;
- seconds, timestamps, duration ranges, exact shot count, exact cut points, or per-line camera assignments;
- forced one-person coverage, offscreen rosters, complete-room masters, or positive landscape-wide requests.

Seedance owns all camera movement, framing changes, cut count, and cut timing.

## References, timing, and compression

Keep actual upload references outside the prompt. Never use a previous generated end frame as the next block reference unless the user explicitly authorizes it.

Internal content timing may be estimated, but never projected into the prompt. Do not add pauses, reactions, camera holds, or transitions merely to fill duration.

Delete repeated adjectives, intent explanations, invisible lore, and redundant style language before deleting the concise emotion-state line, finalized dialogue, causal action, frozen global, or visible result. Necessary species, physical scale and individual appearance anchors are also protected: follow [visual-identity.md](visual-identity.md), keep them in each visible block's special rules, and never substitute an image filename or webpage caption for prompt text. A length error does not authorize dropping protected facts.

## Realization gate

Follow [event-realization.md](event-realization.md) for knowledge-only events, observable carriers, nullable non-material state, task completions, and exact-final-text validation. Both HTML delivery routes enforce the shared checker; a surrogate prompt or post-render patch is not a validated delivery.

## Public workflow scope

This public tool accepts source-approved general-audience production material. Review publication rights and content before preparing the plan; this package contains no private source mappings. The local realization checker also rejects reaction-driven skin reddening as a project style constraint. It is a bounded text check, not a platform acceptance guarantee.
