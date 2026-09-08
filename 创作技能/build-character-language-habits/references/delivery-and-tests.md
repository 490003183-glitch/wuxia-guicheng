# Delivery and Contrastive Tests

Read this reference before delivering a new fingerprint or auditing an existing one.

## Delivery Contract

```text
【语料依据】
- 正式台词数量与时期：
- 用户锁定样本：
- CPED筛选条件与样本量：
- 网络补充资料：
- 置信度与缺口：

【稳定语言指纹】
| 维度 | 稳定习惯 | 证据 | 频率或条件 | 明确不做 |

【情境变体】
- 熟人日常：
- 陌生人／公开场合：
- 面对上位者：
- 亲密或暧昧：
- 受惊／疼痛／嫌弃：
- 愤怒或真正失控：

【同刺激横向测试】
| 固定刺激 | 本角色第一声音 | 第一句 | 第二拍 | 与其他角色的差异 |

【生成规则】
- 起句：
- 句中：
- 收句：
- 改口与重复：
- 脏话及程度词：
- 使用上限：

【长篇反应库存】
- 高频言语行为及 construction family ID：
- 关系／公开度／压力变体：
- 尚未覆盖但剧情会需要的行为：

【使用台账与重复审计】
- 审计范围：
- 精确／归一化重复：
- 高频起句、收句与显眼片段：
- 结构家族过密：
- 语义功能重复：
- 有意保留的重复及原因：

【碰撞与失败检查】
- 最容易与谁撞声：
- 已修正的可互换台词：
- 尚待正式台词验证：
```

For a short request, compress the headings but preserve evidence, surface operations, controlled examples, and collision findings.

## Mandatory Tests

### 1. Semantic-Control Test

Give every character the same concrete stimulus and semantic target. If the content, knowledge, stakes, or emotion changes, the comparison is invalid.

### 2. Name-Removal Attribution Test

Remove speaker names and performance directions. Ask whether a reader can distinguish the speaker from wording alone. Record uncertainty honestly; do not claim success from intuition.

If the reader has never learned a character's voice, the test measures present distinctiveness or memorability, not fidelity to an established voice. Do not treat an unknown answer as proof of failure. Do not force one-to-one elimination in an early test; it creates error propagation. Record `unknown`, duplicate guesses, and collision clusters separately.

### 3. Line-Swap Test

Move the line to the two most similar characters. If it still works unchanged, rewrite the surface realization or mark the fingerprint underdetermined.

### 4. Multi-Feature Test

Identity must rest on at least three interacting observable tendencies, not one profanity, particle, accent, or catchphrase.

### 5. Frequency-Cap Test

Specify when a conspicuous marker may occur. Repeating a signature marker in every scene converts a habit into parody.

### 6. Pressure-Continuity Test

Under pressure, the character may shorten, intensify, or lose one layer of control, but should retain a recognizable relationship to the baseline habit.

### 7. Anti-Psychology Test

Underline every rule that cannot be heard or read in a transcript. Rewrite or remove phrases such as `先判断`, `重视`, `想保护`, `确认责任`, and `不愿示弱` unless followed by an exact lexical or syntactic operation.

### 8. Dialogue-Act Coverage Test

For a full language system, check the recurring acts the role actually needs: asking, answering, stating, judging, requesting, refusing, agreeing, correcting, apologizing, comforting, opening, closing, and reacting. A missing act needs an explicit role-based reason or a provisional construction family.

### 9. Construction-Diversity Test

For every high-use act, verify that at least three families differ in syntax or turn organization rather than synonyms. If all variants share one skeleton, the repertoire will still repeat in long-form writing.

### 10. Recent-Window Repetition Test

Inspect the configured recent window or the default in `long-form-dialogue-ecosystem.md`. Check complete lines, normalized lines, conspicuous openings and endings, and construction-family density. Ordinary emergency calls and intentional motifs require context-aware review, not automatic deletion.

### 11. Semantic-Repetition Test

Ask whether different wording is delivering the same warning, exposition, refusal, reassurance, or conflict again. Mark this separately. Surface paraphrase does not pass the test; the dialogue function or scene must change.

## Failure Examples

Fails:

`她重视具体的人，所以会先问谁受伤。`

Usable:

`别人刚说完事故，她常在0至1句内用“谁”起问；第一问只要人名或位置，第二问才追时间。`

Fails:

`她冷静、危险，说话很短。`

Usable:

`受威胁时省掉称呼和主语，只保留动词加对象；句末不用“吧、呢”，也不追加解释。`

The examples illustrate conversion from invisible motivation to observable language. Do not reuse them unless supported by the target character's evidence.

---
公开派生版：mtgh。文档按 CC BY-NC-SA 4.0 提供；scripts 代码适用仓库 LICENSE-TOOLS。商用须另获授权。
