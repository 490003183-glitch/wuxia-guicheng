---
name: compile-director-draft-to-seedance-package
description: 将已接受的导演稿、剧本和配图交接整理为 Seedance 制作包，校验来源、对白顺序、素材覆盖和剪辑引用，并导出提示词交付。
---

# 导演稿到 Seedance 制作包

这是 mtgh 创作流程的公开派生版。文档采用 CC BY-NC-SA 4.0，scripts 中代码采用仓库 LICENSE-TOOLS；商用须另获 mtgh 书面授权。

## 输入和边界

使用者指定当前已接受的剧本、导演稿、资产规划交接及输出目录。记录来源文件哈希与状态，校验三者版本绑定；缺少或过期时说明具体缺口，不把草稿标为可执行。原稿默认只读，输出写到明确指定目录。

本技能与同级 [wuxia-seedance-scene-prompts](../wuxia-seedance-scene-prompts/SKILL.md) 配套安装，代码互相引用；Node.js 22 或更新版本，无外部 npm 依赖。它只整理和验证本地制作资料，不调用视频服务或执行剪辑。演员指纹、资产搜索、平台提交等外部能力不随包提供，缺少资料时由使用者补齐，不猜造。

## 制作方法

1. 依据[制作包结构](references/package-schema.md)建立来源记录、原文对白台账和导演 P0/P1 需求。每个事实和每次对白出现都保留明确承载位置。
2. 根据[生成分类](references/classification-and-projection.md)区分 AUTO_EVENT 连续行动、AUTO_EDITED 单次完整剪辑结果、DIRECTED_CAPTURE 必要定向采集，以及只存在于剪辑清单中的 POST_CONTROL。普通场景使用 dialogue_autocut；只有保护导演不可替代的具体信息才采用定向采集。
3. 同一场景使用相同无镜头状态与事件计划；从因果事件回放得出每条开始和结束状态。补充镜头或备选采集不重复推进剧情状态。保持确切对白、说话者和接收者；结束的汇报和等待任务应有明确状态变化。
4. 图片按正式交接的资产 ID、使用范围和上传顺序绑定；状态图必须匹配当前状态。TEXT_ONLY 必须有可校验的规划依据，不用风格参考填充剧情图名额。不要把图片路径写进可复制平台提示词。
5. 每个生成单元有场次、导演和剪辑引用、物理状态、保护意图、预算、验收标准；关键项有可行后备方式。对白不得另编或自动生成额外旁白。时间预算与实测校准分开，不保证生成时长或效果。
6. 剪辑清单闭合所有主用单元及对白顺序；跨素材的剪辑操作保留在清单中，不混进单次平台提示词。预留画面与声音余量。检查关系、受力、信息权限等语义，不能只靠结构校验。

现有分类与校验保留这套流程的制作约束，包括去门动作优先、可见人脸远景风险及《雾峡轨城》的无 J-cut 规则。这些是该流程规则，不代表平台通用技术限制；换项目应先明确合适的制作约定。

## 校验和交付

在本技能目录运行：

```bash
node scripts/validate_director_seedance_package.mjs <manifest.json>
node scripts/render_director_seedance_package_html.mjs <manifest.json> --output <execution.html>
node scripts/run_package_tests.mjs
node scripts/run_handoff_tests.mjs
```

正式交付默认导出 Markdown，按[阅读器说明](../wuxia-seedance-scene-prompts/references/live-md-reader.md)展示。静态 HTML 按需导出。详细来源、剪辑表和覆盖审计留在 manifest；不为了网页展示额外调用模型。

交付前确认源哈希、对白次序、P0/P1 覆盖、图片存在、状态衔接、预算总计和最终可复制文本。校验通过仅说明已实现的数据约束成立；手工剧情、语义空间与实际生成验收仍独立进行。
