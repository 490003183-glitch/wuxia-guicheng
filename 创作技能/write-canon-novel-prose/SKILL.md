---
name: write-canon-novel-prose
description: Plan, write, revise, audit, or export canon-backed Chinese novel chapters. Use for 小说、续写、章节规划、正文改写 and explicitly requested novel compilations; route designated novel-to-screenplay adaptation to its own skill.
---

# 小说写作与连续性

先用来源约束事实与物理因果，再从视角人物的注意力写成连续段落。事件清单是私下核对工具，不是逐行转换成正文的模板。

## 来源与权限

- 使用者指定的 `CANON_ROOT` 是正式事实来源，`OUTPUT_ROOT` 是草稿位置。只查本次相关文件，未指定来源时先取得必要路径，不遍历整台电脑找替代品。
- 区分已确认正文、已整理设定、待确认规划和创作推断。旧稿、讨论及记忆不能冒充当前正文。
- 诊断只诊断；写作先交草稿；正式写回、删除旧稿、重建合订本及发布各按明确授权。公开项目稿不自动写回任何个人正式库。
- 改写已有事件前读 [事件保留](references/canon-event-preservation.md)。载体修复不自动授权改变因果、结果、关系、信息权限或确定性；已明确授权的公开版删改遵循授权，不重复询问。
- 需要新增地点、追逐、跨层移动或并行动作时使用同级 [空间技能](../manage-canon-spatial-continuity/SKILL.md)，只复核受影响关系。

## 从章节到正文

1. 确定范围：规划、诊断、局部修订、新章、全章改写、保存已确认文本或合订本导出。看当前章、最小相邻正文与相关设定。
2. 在私下确定人物此刻想得到什么、在隐藏什么压力、实际发生什么、哪一个事件承担本章兑现。程序展示或设备介绍不能代替人物欲望。
3. 记录入场与离场状态：位置、伤势、装备、正在进行的事件、每个人知道什么。未知能力不因科幻题材自动成立；保护能力、可见效果、动量传递和无敌是不同事实。
4. 规划只处理事件因果与人物选择。新规则、状态变化及未来计划明确标识；已成立事实与工作推演分开。
5. 初稿期间关闭模式扫描器。按人物的主导注意力组织段落，不逐项报位置、装备和反应，不将因果台账逐句变成小说。
6. 写对白前先判断人物为什么现在开口、对谁做什么社会行动。维护地位、想被相信、怕冷场、试探关系也可以成为动机；每句不必都推动身体动作。不要给所有出场角色均分台词。
7. 让信息、语速、愿意回答的程度、地位或身体状态形成差别。保留合理的碎句、重复与不完美口语；不要把所有人压缩成同样的极短回答。
8. 细节要改变当下注意、行动、风险或关系。衣物与设备不按资产卡逐项清点；主谓搭配用自然汉语。不要用漂亮总结替读者解释已看懂的动作。
9. 兑现有足够主观分量，结束于真实状态，不以金句替代结尾。长度服从项目明确要求；没有要求不虚构最低字数或填充内容。

## 完稿检查

先通读一次人物、因果、节奏与阅读感，再按 [对白与叙述检查](references/prose-review.md) 处理具体问题。保留战斗接触、伤势与完成结果，不能把已经命中写成“险些命中”。

对白初筛（以下命令均在本技能目录执行）：

```bash
python3 scripts/audit_dialogue_patterns.py /path/to/chapter.md --json
```

它只识别部分模式；命中需要看上下文，不自动删除或换同义词。没有命中不证明自然。逐项核对源事件和信息权限，报告真实改动与未解决项。

正式写回时重新读取来源、计算 SHA-256、在输出区暂存、核对正文一致后只写授权文件。保留可恢复版本；先完成并验证新文件才处理旧文件。来源改变使关联剧本待同步，可用同级改编技能的 `audit_linked_screenplay_sources.py` 检查，禁止仅更新 hash 消除警报。

## 仅在明确要求时生成合订本

```bash
python3 scripts/regenerate_novel_compilation.py --chapters-dir /path/to/chapters --output /path/to/exports/novel.txt --title '小说标题'
python3 scripts/regenerate_novel_compilation.py --chapters-dir /path/to/chapters --output /path/to/exports/novel.txt --title '小说标题' --check
```

章节文件须以 `000_`、`001_` 等三位连续序号开头，正文使用 Markdown；合订本去掉顶层 frontmatter 和标题标记。生成命令会写入指定输出，已存在文件须加 `--overwrite`；`--check` 只比较不写入。输出不能与任何输入章节是同一文件。
