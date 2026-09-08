---
name: wuxia-seedance-scene-prompts
description: 将已确认场景整理成 Seedance 提示词、状态连续性计划及图片交付网页。用于提示词编译、对白顺序核对、群演连续性、动作因果检查、参考图交付和时长实测记录。公开版采用 dialogue_autocut，不包含私人知识库或自动视频生成接口。
---

# Seedance 场景提示词与校验

作者：mtgh。文档与示例采用仓库根目录 LICENSE；代码采用 LICENSE-TOOLS，商业使用须获得 mtgh 单独书面授权。

## 准备

运行脚本需要 Node.js 22 或更新版本，无需 npm 安装依赖。以下命令在本技能目录执行。指定已确认剧本、必要角色与空间资料、可使用的参考图片，以及交付目录；可用 PROJECT_ROOT、CANON_ROOT、OUTPUT_ROOT 表示这些路径，不要求沿用作者目录结构。完整示例见 [examples/scene-plan.json](examples/scene-plan.json)。

本工具编译和检查人工或模型已经写好的事件，不会自行调用 Seedance、生成视频、上传素材或消耗生成额度。格式约束来自本项目工作流，不应当作平台官方标准。

## 执行顺序

1. 按 [来源边界](references/knowledge-base-authority.md) 核对当前剧本。逐句列出具体对白、说话者、接收者及顺序；把已知信息、实际新报告、无声动作和旁白区分开。保留已批准结果，不为适应估时补动作或删台词。
2. 按 [场景计划](references/scene-plan-v2.md) 写 schema 2.1 JSON。使用一个 initial_state 和有序 blocks；每个事件具备唯一 id、visible_action、必要 preconditions 与 effects。只把确有来源的事实写入状态。
3. 编译并重放核对：

```bash
node scripts/compile_scene_plan.mjs examples/scene-plan.json --output ./compiled-scene.json
node scripts/validate_scene_state.mjs ./compiled-scene.json
```

4. 按 [提示词格式](references/prompt-projection.md) 将编译结果写成每块可单独复制的文字：生成编号、角色情绪/说话态度、必要音色、冻结 global、块内特殊规则、故事背景、开始空间状态、顺序事件、结束空间状态。编译器只产出 JSON；平台自然语言需要依照本流程编写。实际有对白的正式角色才需要音色行；没有获准音频时标明未配置，不捏造文件。
5. 检查实际最终交付文字：

```bash
node scripts/validate_scene_delivery.mjs --profile continuity --scene-plan examples/scene-plan.json --compiled-output ./compiled-scene.json /path/to/prompts.md
```

quick 档只查提示词格式，可运行 node scripts/validate_scene_delivery.mjs --profile quick /path/to/prompts.md。continuity、production 档需提供完整场景计划。production 还要求中文标点后的分段规范。连续性修改应改最早的因果事件并重新编译，不能只补后一条开头。

6. 依据 [人工检查单](references/validation.md) 冷读动作是否可执行、持物/支撑是否冲突、起始状态能否执行第一步、结束状态能否执行下一步。将确切校验过的文字放进交付文件或 [本地阅读器](references/live-md-reader.md)，校验后不再手改网页里的另一份提示词。

## 按需加载

- 跨块群演与重复单位：[群演连续性](references/crowd-continuity.md)。稳定 ID 不随移动换名，事件要更新完整 continuity_state 或明确未变。
- 动作、报告和任务完成：[事件实现](references/event-realization.md)。信息需要可见/可听载体，完成汇报或等待决定后不得继续保留旧任务。
- 非人类与大型单位：[可见身份](references/visual-identity.md)。本包保留圈圈这一公开项目回归检查；其他人物需要使用者提供身份规则，工具不会自动生成设定。
- 时长记录：[校准协议](references/calibration-protocol.md)。请求秒数、文件秒数、可用叙事秒数分开；没有视频实测只标注未校准。

## 固定约束

使用 dialogue_autocut。global 仅承载统一环境与本工作流要求的生产控制，逐块完全相同；场景内人物、装备和变化状态进入当前块或状态账。不要在事件、空间段、隐藏辅助稿中另写镜头路线、焦点、固定机位、切点或镜头数量。

源对白逐字保留且按原顺序出现；每句明确谁对谁说。没有台词时明确静默，不把知识记录改成新报告。当前块没触发的装备能力不展开；触发特殊功能时仅登记与该事件对应的 mechanism_id、mechanism_requirements 和必要持续状态。所有道具能力仍须有使用者确认的来源。

编译器推导 required_assets 后，网页上传清单需匹配精确 ID 与路径。无图交付必须使用 TEXT_ONLY：assets 与 required_assets 都为空，asset_basis 指向明确含对应 baseline_ref、decision=TEXT_ONLY 的 JSON，并携带当前 SHA256。把来源授权的无图决定与单纯缺图区分开。图片、音频须使用使用者自己的本地绝对路径；这些文件不随本包提供。

只处理使用者已获权利且适于当前公开工作流的材料。本包不包含私人设定、未获授权的参考图、第三方原文和语音素材。原始主稿保持独立。

## 回归与限制

```bash
node tests/run_scene_plan_tests.mjs
node tests/run_validation_tests.mjs
node tests/run_realization_tests.mjs
node tests/run_spatial_asset_tests.mjs
node tests/run_visual_identity_tests.mjs
```

状态重放、必需字段、对白和已知失败模式可以自动检查；完整语义、空间可行性、素材权利与最终视频效果仍需人工核对。2400 Unicode 字符是本地提示词检查阈值，不是已经验证的平台官方上限。阅读器其他回归见其操作文档。
