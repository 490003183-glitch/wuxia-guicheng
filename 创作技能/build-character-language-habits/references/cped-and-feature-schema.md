# CPED and Surface-Feature Schema

Read this reference when creating, revising, or quantitatively auditing a language fingerprint.

## Optional user-supplied corpus

No CPED data, television dialogue, or external source text is included. Supply only data you are entitled to analyze; redistribution and commercial permissions must be checked against that dataset's own license. The repository license does not grant rights to external data. Without a comparison corpus, analyze project dialogue directly and mark corpus comparisons unavailable.

The analyzer expects UTF-8 CSV files named `*_split.csv` in an explicitly supplied directory. Required columns: `TV_ID`, `Dialogue_ID`, `Speaker`, `Utterance`. Optional filtering columns: `Gender`, `Age`, `Scene`, `Sentiment`, `Emotion`, `DA`. Other columns are ignored. These column names form an interoperability interface, not a bundled dataset.

## Useful CPED Labels

- Age: `children`, `teenager`, `young`, `middle-aged`, `elderly`, `unknown`
- Emotion: `happy`, `grateful`, `relaxed`, `positive-other`, `neutral`, `anger`, `sadness`, `fear`, `depress`, `disgust`, `astonished`, `worried`, `negative-other`
- Dialogue act: `greeting`, `question`, `answer`, `statement-opinion`, `statement-non-opinion`, `apology`, `command`, `agreement`, `disagreement`, `acknowledge`, `appreciation`, `interjection`, `conventional-closing`, `thanking`, `quotation`, `reject`, `irony`, `comfort`, `other`
- Scene: `home`, `office`, `school`, `mall`, `hospital`, `restaurant`, `sports-venue`, `entertainment-venue`, `car`, `outdoor`, `other-venue`

Treat CPED as a comparison pool, not a ready-made archetype catalog. It does not label `傲娇`, `毒舌`, `御姐`, `妈妈桑`, or exact triggering events.

## Controlled-Stimulus Record

Before comparing characters, record:

```yaml
stimulus_domain: taste | pain | surprise | embarrassment | praise | insult | danger | intimacy | other
stimulus_event: concrete event shared by all characters
emotion: category
intensity: 0.0-1.0
relationship: stranger | superior | peer | intimate | subordinate | group
dialogue_act: interjection | statement | question | reject | command | other
semantic_target: exact information every character must convey
time_pressure: none | low | high
publicness: private | semi-public | public
```

Never vary these fields merely to make voices different.

## Surface-Language Record

Record only audible or transcript-visible features:

```yaml
latency_or_overlap:
first_vocalization:
first_lexical_fragment:
complete_utterance:
character_length:
sentence_completeness:
interjections:
fillers:
sentence_final_particles:
profanity_level: 0-3
profanity_forms:
degree_construction:
reduplication:
elongation:
repetition:
self_repair:
address_form:
question_or_command_shape:
closing_pattern:
second_beat:
```

Body action may be recorded separately for performance, but it cannot substitute for a language field. Silence can count only when its timing and vocal residue are specified, such as `吸气后停0.4秒，只发出“唔”`.

## CPED Analysis Script

The script uses only Python's standard library and outputs aggregate statistics; it does not print copyrighted dialogue lines.

List corpus values:

```bash
/usr/bin/python3 scripts/analyze_cped_language.py --cped-dir ./authorized-corpus --list-values
```

Compare young female disgust/interjection samples by character:

```bash
/usr/bin/python3 scripts/analyze_cped_language.py --cped-dir ./authorized-corpus \
  --gender female \
  --age young \
  --emotion disgust \
  --da interjection \
  --group-by tv-speaker \
  --min-utterances 2 \
  --top 20
```

Inspect a broader surprise pool when the narrow cell is too sparse:

```bash
/usr/bin/python3 scripts/analyze_cped_language.py --cped-dir ./authorized-corpus \
  --age young \
  --emotion astonished \
  --group-by tv-speaker \
  --min-utterances 5
```

Filtering must be widened explicitly and reported. Do not silently mix unrelated emotions or dialogue acts to increase sample size.

## Distinctiveness Rule

For any claimed habit, compare:

1. target-character rate;
2. matched CPED baseline rate;
3. other project characters' rates;
4. contexts in which the habit disappears or reverses.

Common expressions such as `啊`, `真的`, `好吧`, and `我觉得` require a meaningful rate or placement difference. Mere presence is not evidence of distinctiveness.

## Full-System CPED Coverage

For a long-form response repertoire, a whole-cohort aggregate is insufficient. Run separate matched baselines for the character's high-use dialogue acts and relevant contexts. At minimum, compare the acts that the project expects the character to perform often, such as `question`, `answer`, `command`, `reject`, `disagreement`, `apology`, `comfort`, and `conventional-closing`.

Example:

```bash
/usr/bin/python3 scripts/analyze_cped_language.py --cped-dir ./authorized-corpus \
  --gender female \
  --age young \
  --scene home \
  --da reject \
  --group-by tv-speaker \
  --min-utterances 3
```

Report narrow cells honestly. If the filtered cell is too small, widen one dimension at a time and state which one changed. Do not merge unrelated dialogue acts merely to obtain a larger number.

---
公开派生版：mtgh。文档按 CC BY-NC-SA 4.0 提供；scripts 代码适用仓库 LICENSE-TOOLS。商用须另获授权。
