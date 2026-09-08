# Director And Mental-Edit Draft Format

Use the project-specific production profile only when selected; otherwise adapt its risk and sound fields to the user’s actual workflow. Use this format for one integrated `导演稿 / 预剪辑完成稿`. Record actual director decisions; do not prove diligence by filling every field.

## Frontmatter

```yaml
---
type: 导演稿
project: 雾峡轨城
episode: EP00
title: 示例标题
phase: 导演预剪
status: 待确认
version: v1
source_screenplay: /absolute/path/to/screenplay.md
source_screenplay_sha256: 64-character-sha256
source_screenplay_status: 剧本定稿
production_profile: Seedance 2.0 / 720p
distant_face_constraint: 需辨识的真人面部默认近景或特写；无可见真人面部的大景别自由
target_runtime: 待确认
planned_runtime: 待计算
directing_delta: 无
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

`planned_runtime` is a reconciled director estimate, not a measured runtime.

State near the top:

```text
本稿已在生成前完成整集导演与预剪辑设计，不依赖用户回传生成结果；本稿不改写剧本事实、对白、信息权限、动作结果或结局状态。
```

## 0. 来源锁定与适用边界

Record the screenplay path, hash, size, `mtime`, status, excluded older sources, novel-source verification when applicable, allowed scope, and current Seedance projection boundary. Separately record screenplay readiness: intake scope, fidelity audit, screenplay-only cold read, exact speech and story-carrier evidence, unresolved items. Do not treat source freshness or an accepted filename as readiness.

## 1. 冷读、观看问题与导演决策

Include:

- central dramatic question;
- viewer promise and payoff;
- audience alignment and reveal chain;
- tension curve, climax, aftershock, and hook;
- unique viewing problem;
- neutral baseline;
- selected directing system;
- rejected viable alternative and reason, when alternatives were needed;
- primary rule, contrast, formal change points, climax mutation, removal test, and uniqueness test.

## 2. 整集导演宪法

```text
导演命题：
观众关系与主观看法：
叙事视点及转移条件：
画面注意力层级：
演员调度与空间制度：
轴线、景别、距离、焦段与机位高度策略：
真人面部可见性、景别风险与无可见真人面部的空间覆盖策略：
运动与静止的动机：
时间质感与镜头持续策略：
构图、光色、材质、遮挡与画外空间：
准确对白与剧情必需声音事实：
剪辑语法与转场原则：
母题及意义变化：
高潮与结尾的形式兑现：
禁止漂移项：
```

## 3. 整集段落、时间预算与剪辑架构

| Sequence | Screenplay scenes | Dramatic state change | Viewer and information relation | Visual and sound method | Rhythm | Target duration | Entry and exit |
| --- | --- | --- | --- | --- | --- | --- | --- |

Reconcile the provisional sequence totals with the target runtime. Describe the opening capture, build, first turn, suspension or acceleration, parallel structure, climax, aftershock, and final hook.

## 4. 信息揭示与交叉剪辑图

| Reveal ID | Fact or misread | Who knows before | Audience access | Trigger | Who knows after | Editorial protection |
| --- | --- | --- | --- | --- | --- | --- |

Show only source-supported temporal relations. Mark uncertain simultaneity `待确认`.

## 5. 分场成品目标与必要调度

For each scene:

```text
SC-01 场景标题
场景功能：
开场与结尾状态：
本场观众关系：
继承的导演规则：
本场发生的形式变化及理由：
目标时长：
入场与出场转场：
对白、信息与事件保护项：
```

First choose the generated-result grouping in section 10. Use the following detail only for necessary views or performance units; one native edited result may cover multiple SH/ED IDs. Do not mechanically fill one shot card per beat or internal cut:

```text
SH-01-01 | P0 | 功能名
叙事与剪辑目的：
主体、空间、表演与调度：
起始状态：
动作、接触与完成结果：
景别、距离、焦段家族、机位：
真人面部可见性与720p质量风险：无可见真人面部／真人面部近景／真人面部特写／远景真人面部例外
运动或静止及其动机：
声音、对白与声画关系：
结束状态：
预计时长：
连续性锚点：
AI风险、获取方式与保底覆盖：如为远景真人面部例外，必须写明不可替代的叙事理由及“真人面部近景＋无可见真人面部空间／结果镜头”保底组合
门区处理：已去门／同侧室内且门持续敞开并远离门区／持续闭门同侧（室内或室外均可）／不可避免的资产场景出门例外；如非“已去门”，写明无法去门的剧情原因与规避方法
```

Omit irrelevant fields, but never omit a protected event's completed result, necessary start or end state, or footage required for the intended cut.

## 6. 整集预剪辑时间线

List every intended edit unit from first frame to final sound:

| Edit ID | Planned shot or long take | Screenplay beat | Planned duration | Why enter | Why exit | Next-picture relation | Necessary story sound (if any) | State handoff | Required coverage or fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

An edit unit may remain inside one continuous shot when audience attention, information, rhythm, or sound meaning changes without a physical cut.

After the table, reconcile:

```text
镜头或编辑单元时长合计：
片头、转场或结尾停留：
整集计划时长：
目标时长：
差值及处理：
```

## 7. 准确对白与剧情必需声音事实

List exact dialogue and only sounds that cause a character response or carry indispensable story information. Do not fill an effects, music, mixing or sound-bridge timeline. The user handles sound effects. 《雾峡轨城》 has no J-cut or disguised incoming sound lead.

## 8. 表演注意力与演员调度

Record who owns each turn, which listener or reaction must remain, task behavior, gaze, distance, contact, interruption, hesitation, breath, group hierarchy, and background pressure. Do not add new motives or reactions.

## 9. 拍摄优先级、风险与保底覆盖

| Shot or beat | Priority | Failure consequence | Production risk | Source-faithful fallback | Protected edit IDs |
| --- | --- | --- | --- | --- | --- |

Every P0 and high-risk P1 result must have a feasible path inside a main generated result or necessary separate acquisition. A priority label does not require another call. For a fallback, state its failure trigger and what it replaces; keep it out of first-round generation. Existing usable results take precedence over new backup footage. A hypothetical risk alone does not authorize generating both main and fallback.

For the current Seedance 2.0 / 720p profile, list every medium-wide, wide, or long-shot exception that shows a visible live-human face. A no-visible-live-face wide shot is not a face-quality exception and may include empty space, machines, backs, silhouettes, occluded faces, masked or helmeted figures, aftermath, or offscreen-human movement when source truth permits.

List every source beat that mentions a door, hatch, gate, doorway, entrance, or exit and record its result as `已去门`, `同侧室内且门持续敞开并远离门区`, `持续闭门同侧`, or `不可避免的资产场景出门例外`. A continuously closed same-side scene may be indoors or outdoors and may place start/end states by the door, but the door must never move, open, break, or be crossed. The audit fails if it preserves any other door dependency merely because the source happened to mention one. For the exceptional visible exit, bind one destination scene asset and require a separate distant acquisition in which the door is already open, remains open, and the subject only comes out into that asset-defined environment.

## 10. 成品形态、生成单元组织与下游边界

Choose this generation organization before expanding shot details, then reconcile it with the intended edit. Keep one compact plan in this draft, not a separate report:

| 生成 ID / 连续场景、剪辑成品或定向获取 | 对应 SH / Edit ID | 连续模式的空间与状态，或剪辑成品各片段的时间地点 | 整体成品内容计划、准确对白 ID 及全文、无台词者 | 预计生成时长、容量及依据（与成片选用时长分开） | 拆分理由；补拍注明原 TAKE 和缺失结果 |
| --- | --- | --- | --- | --- | --- |

A generation may supply a continuous scene or a complete quick-cut, montage or VFX-edited sequence. The historical TAKE ID imposes neither a single place/time nor a continuous-performance format. Keep exact source utterances in the same document. Choose the result form before dividing generation tasks; describe segment-level source facts for an edited sequence instead of inventing a unified physical space. AUTO_EDITED delegates internal cutting and permitted visual effects to Seedance. Only relations among independently generated files require external assembly. Already approved text/still tasks may retain POST IDs; do not add sound-effects or separate voice-production tasks.

Include a compact workload summary calculated from the rows, not from the number of SH/ED IDs:

```text
主方案视频生成：__ 次（含必要独立插入 __ 次）
主方案总生成时长：__ 秒；预计成片使用：__ 秒
条件备选：__ 项，首轮执行 0 次；逐项列明触发条件与替代对象
新增必需资产：__ 项／待资产核查；条件备选资产另列
用户外部装配：列出实际必要操作；不安排配音和音效制作
额外调用依据：列出不能合并或简化的必要结果及容量/风险依据
```

Generation duration includes actual planned surplus or repeated material; do not invent handles or repeat takes. Unknown duration, price or capacity remains labelled unknown with its basis. Do not claim an exact currency budget without a supplied rate. Compare total workload and failure risk, not call count alone. Asset planning and compilation must preserve this boundary and reconcile any necessary change before delivery.

Separate:

1. `可继承` — events, performance priority, continuity, block rationale, reference needs, selection and assembly intent;
2. `由 Seedance 自主` — camera movement, framing changes, cut count, and cut timing under the current contract;
3. `需独立生成或后期控制` — only indispensable results left after testing native generation and simpler expression; state the added call or manual work. A nonessential exact-angle or timing wish is simplified, not automatically purchased.

## 11. 完整脑内放映审计

Report:

- source and dialogue coverage;
- information permissions;
- physical-result completion;
- global creative specificity;
- viewpoint and formal arc;
- spatial axis and state continuity;
- first-frame-to-final-sound edit completeness;
- screen-runtime and main generation-call/duration reconciliation; conditional fallbacks are not queued;
- exact dialogue and indispensable story-sound facts; no effects-production plan;
- P0 and high-risk P1 acquisition coverage;
- downstream honesty.
- distant live-human face compliance, named face-visible wider-shot exceptions, and no-visible-face geography coverage.
- doorway defect compliance, including the reason for every retained door and the destination asset for every unavoidable visible exit.

The audit fails when any imagined cut needs an unplanned view, reaction, result, transition, sound, or continuity state.

## 12. 改动、提案与待确认

```text
剧本改动：无
叙事重排提案：无
制作性假设：无／逐项列出
计划素材缺口：无／逐项列出
待确认：无／逐项列出
```

An unauthorized proposal never enters the executable plan as accepted fact.
