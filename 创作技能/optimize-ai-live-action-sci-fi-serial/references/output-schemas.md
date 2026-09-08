# Output schemas

Use the smallest schema that fully answers the request. Do not include a full rewrite in audit mode.

## Audit mode

```markdown
# 剧本核查

## 一句话结论
[最大优势]；[最大风险]。

## 材料边界
- 模式：audit
- 已读：[files/material]
- 状态：[canon/final/draft/raw/pending]
- 未提供：[missing material]
- 结论置信度：[high/medium/low]

## 硬门禁
- [未发现 / blocker with evidence and impact]

## 保护清单
- [character/canon/relationship/physical/formal element]

## 一次性里程碑与后续升级债务
- 本次消耗：[only include when major firsts or irreversible payoffs are present]
- 本次保留：
- 后续应换用的升级轴：

## 十维审计
| 维度 | 0–3/N/A | 材料证据 | 风险 | 置信度 |
|---|---:|---|---|---|
| E 入口 | | | | |
| T 任务 | | | | |
| M 机制行动化 | | | | |
| P 兑现 | | | | |
| R 再入场 | | | | |
| C 人物关系 | | | | |
| S 科幻有效性 | | | | |
| G AI真人可制作性 | | | | |
| H 结尾钩子 | | | | |
| O 原创/疲劳 | | | | |

## 逐场问题
| 位置 | 问题 | 为什么 | 影响 | 级别 | 最小修改 |
|---|---|---|---|---|---|

## 优先顺序
1. [maximum five]

## 可验证假设
- 假设：
- 主要后台指标：
- 混杂因素：
```

## Rewrite mode

Run the audit first, then add:

```markdown
## 改写授权范围
- 允许改：
- 不得改：
- 目标时长/平台：
- 制作约束：

## 改写策略
- [issue -> chosen payoff family -> modification level]

## 改写稿
```text
[script]
```

## 改写后复核
- 正典：pass/fail + evidence
- 信息权限：pass/fail
- 人物声线：pass/fail
- 本集状态变化：
- 科幻规则验证：
- AI生产风险：
- 新增设定：none / list and status
```

## Compare mode

```markdown
| 项目 | 版本A | 版本B | 证据与判断 |
|---|---|---|---|
| 正典/权限 | | | |
| 入口承诺 | | | |
| 本集任务 | | | |
| 状态变化 | | | |
| 人物关系 | | | |
| 科幻机制 | | | |
| AI制作 | | | |
| 再入场 | | | |

结论：[which version is stronger for which objective; do not force a single winner when tradeoffs differ]
```

## Production mode

```markdown
| 单元 | 时长 | 初始状态 | 人物/说话者 | 主动作 | 结束态 | 连续接口 | 风险 | 替代执行 |
|---|---:|---|---|---|---|---|---|---|
```

## Issue phrasing standard

Every issue should contain:

1. location;
2. observed evidence;
3. inference, clearly labeled;
4. likely impact;
5. confidence;
6. minimum-change level;
7. protected elements.

Bad: `这里不够爽，加强冲突。`

Good: `第2场连续解释设备校准、权限和旧事件，但两人当前的权力状态直到场尾才变化。推断：陌生观众可能先承担专名负担。置信度中。L2：让角色甲先尝试读取记录并被权限拒绝，再由角色乙解释拒绝条件；保留角色丙不知情。`

## Confidence language

- `High`: directly supported by finalized material, hard rule, or relevant backend behavior.
- `Medium`: supported by multiple scoped sources or strong same-project observation with confounds.
- `Low`: public interaction, one comment, cross-account analogy, or incomplete material.

Use “may,” “suggests,” and “hypothesis” for low/medium causal claims. Do not soften canon facts that are directly confirmed.

---
公开派生版：mtgh。文档按 CC BY-NC-SA 4.0 提供；scripts 代码适用仓库 LICENSE-TOOLS。商用须另获授权。
