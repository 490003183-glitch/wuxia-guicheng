---
name: adapt-canon-novel-to-screenplay
description: Adapt one designated novel snapshot into a source-faithful playable screenplay. Preserve dialogue order and counts, physical outcomes, knowledge and source hashes. Use for 小说改编剧本、小说剧本对照; not independent screenplay creation.
---

# 小说改编为剧本

指定小说是叙事来源。本技能转换呈现载体，不在忠实改编中悄悄续写或润色台词。草稿写到使用者指定的 `OUTPUT_ROOT`，不修改小说。

## 锁定来源

1. 读取用户指定小说的完整当前文件；记录路径、状态、大小、修改时间与 SHA-256。指定文件优先于同名正式库文件。
2. 如果已有剧本，核对其 `source_novel` 与 `source_novel_sha256`。不匹配即待同步；台词没变也不代表整份来源仍然当前。
3. 重交付、定稿及写回前重新读取并计算来源 hash。不能从剧本自身 hash 或旧摘录证明小说来源。
4. 角色资料只检查冲突和约束执行，不能导入新台词、动机、反应、信息或事件。缺少可选档案时直接依据小说；来源确有冲突则具体报告。

## 完整改编

先读 [事件保留](../write-canon-novel-prose/references/canon-event-preservation.md) 和 [交接契约](../write-canon-screenplay-dialogue/references/production-handoff.md)。

- 按小说顺序提取每次话语、说话人和次数；同一行中有两组引号就是两次。非引号话语、笑声、痛哼和有意义的沉默也需要人工核对。
- 同时记录动作、尝试与拒绝、完整结果、位置与时间、物件状态、伤势、关系和知识变化、内心信息、暗示及确定性。
- 操作设备时区分谁操作、如何操作、作用方向、实际执行与仅有权限。观察到变化不能自动证明谁启动了它或控制是双向的。
- 给每个信息项安排可演行动、声音、后果、场景说明或必要旁白。心理由源支持的可见结果或旁白承接，不额外给旁人知情权。
- 原文对白逐字保留说话人、顺序、次数及有意口语。拆成表演段可以，但不能增删字词、重组意义或换人说。优化提案单列。
- 时间地点只能用来源支持的信息；不把“汇报情况”留给视频模型编台词。无准确话语时采用源忠实的非对白载体，必要缺口单列。
- 伤势、接触或非接触、物件损坏与完成程度全部保留。观众看到结果所需的执行说明可以明确，不能制造新结果。

## 可读剧本格式

场次写时间、地点和出场人物；行动按实际顺序写。角色说话采用独立粗体角色名和下一段准确台词，便于工具核对：

```markdown
## 剧本正文

### SC-01 内景／工作间／日

她把故障件放到桌面。

**甲**

零件在这里。

## 改编核验
```

这个片段只展示格式，不是应插入任何原作的情节。当前脚本每个粗体角色块仅读取下一条非空行；多行对白需按实际台词整理，复杂说话人归属须人工检查。

## 核验与交付

```bash
python3 scripts/audit_dialogue_spans.py /path/to/novel.md /path/to/screenplay.md
python3 scripts/audit_linked_screenplay_sources.py --novel /path/to/novel.md --search-root /path/to/screenplays --vault-root /path/to/canon
```

在本技能目录执行。第一个工具只对照中文引号与剧本角色块中的文字、顺序和次数，不推断小说说话人；引号中的非台词也会被提取，需人工分类。第二个只读报告来源过期，支持简单 frontmatter 标量；它不修改状态。

技术核验后关闭小说与对照资料，单独通读剧本：第一次阅读能否理解人物、空间、行动对象、因果、完成结果、兑现和结尾。冷读和逐字比对分别报告，不用 PASS 代替完整改编质量。

输出完整 `剧本稿／待确认`、来源身份、忠实结果、冷读结果、具体改编差异和未解决载体。来源不明、过期、事件缺失或未授权差异不能标为可执行。剧本载体问题在本层修；剧情变动回到小说；观看强调与剪辑问题交导演。

只有用户明确授权才能定稿或写回 `CANON_ROOT`。重新核对源 hash、暂存正文、核对一致，写入剧本及必要状态链接；小说保持原样。下游来源链改变时按路径、版本、hash 与取代对象交接，不只发标题。
