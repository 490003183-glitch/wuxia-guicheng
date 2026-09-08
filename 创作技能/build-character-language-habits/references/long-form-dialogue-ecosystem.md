# Long-Form Dialogue Ecosystem and Repetition Control

Read this reference for a complete character library, all-character work, long-form novel or screenplay dialogue, response-repertoire design, or repetition audits.

## Contents

1. Three-layer model
2. Coverage grid
3. Construction families
4. Relationship and pressure variants
5. Usage ledger
6. Five repetition levels
7. Long-form completion gate

## 1. Three-Layer Model

### Surface fingerprint

Stable transcript-visible tendencies: initial sound, lexical start, clause length, completeness, particles, profanity, degree forms, repetition, self-repair, address, question or command shape, and closing.

### Response repertoire

A repertoire stores **construction families**, not lines to copy. A construction family describes how a dialogue act can be realized while preserving the character's fingerprint.

Bad repertoire:

```text
“我不知道。”
“我不清楚。”
“这我不明白。”
```

These are near-synonymous lines with one structure.

Usable repertoire:

```text
F1 — bare limit: [known result] + [unknown process]
F2 — echo and narrow: echo one noun from the question + ask which part
F3 — self-repair: initial answer + correction marker + narrower answer
```

Controlled example lines may demonstrate a family, but are not reusable canonical dialogue.

### Usage ledger

The ledger stores what has already appeared in production text. It does not prescribe new lines. It makes repetition visible before the next scene is written.

## 2. Coverage Grid

Do not expand every axis into a combinatorial encyclopedia. Select the cells the character will genuinely encounter, then make critical gaps explicit.

### Dialogue-act coverage

Treat these as the default core set for recurring characters:

- question;
- answer;
- statement of fact;
- opinion or judgment;
- command or request;
- reject or refuse;
- agree or acknowledge;
- disagree or correct;
- apology or repair;
- comfort or reassurance;
- greeting or conversational opening;
- conversational closing;
- interjection or first reaction.

Add thanking, appreciation, irony, threat, concealment, bargaining, confession, or quotation only when the role actually needs them. A minor functional character may have a smaller justified set.

### Stimulus coverage

For recurring characters, check whether the story needs observable responses to:

- taste or smell;
- pain or physical strain;
- surprise;
- embarrassment;
- praise;
- insult or accusation;
- danger;
- intimacy or unwanted closeness;
- failure;
- uncertainty or missing memory;
- boredom or routine;
- grief or irreversible loss.

### Context coverage

Record only context changes that alter the transcript:

- intimate or trusted person;
- peer;
- stranger;
- superior or institution;
- subordinate or dependent person;
- private, semi-public, and public speech;
- low, medium, and high time pressure.

### Coverage record

Use a table or equivalent structured data:

```yaml
character:
dialogue_act:
stimulus_domain:
relationship:
publicness:
pressure:
construction_family_id:
opening_shape:
clause_shape:
closing_shape:
second_beat:
marker_caps:
evidence: formal | user_locked | cped_baseline | web | inferred
evidence_source:
confidence:
```

## 3. Construction Families

Every high-use dialogue act should have at least three genuinely different families unless the character's narrow role makes that unnecessary.

Variation must change structure, not only synonyms. Useful dimensions include:

- reaction first vs fact first;
- echo-question vs direct answer;
- fragment then completion vs one complete sentence;
- object first vs first-person first;
- correction in the same sentence vs a second beat;
- direct imperative vs option question vs consequence statement;
- bare closure vs closure plus next action;
- explicit address vs omitted address;
- concrete example then label vs label then example.

Keep all families connected to the character's stable fingerprint. Variety does not mean the character becomes a different person in each scene.

## 4. Relationship and Pressure Variants

For each high-use family, define only the deltas:

| Axis | Record the audible change |
|---|---|
| trusted vs stranger | address form, filler tolerance, sentence completion, explicit politeness |
| peer vs superior | request shape, hedging placement, who names the decision |
| private vs public | self-reference, explanation length, institutional vocabulary |
| low vs high pressure | latency, clause deletion, repetition, profanity, second beat |
| embarrassment or pain | first vocalization, self-repair, whether the subject disappears |

Do not describe invisible motives. `对上级更谨慎` is unusable. `对上级把“你”删掉，以“这项／目前／需要”起句；请求用问句收尾` is usable when supported.

## 5. Usage Ledger

Maintain one row per produced utterance or construction use:

```text
character
source_order
source_id
scene_id
dialogue_act
semantic_function
construction_family_id
exact_text
normalized_text
opening_fragment
closing_fragment
conspicuous_markers
evidence_status
intentional_repeat
repeat_reason
```

### Recent-window default

When the project has no rule, inspect at least the previous five chapters, previous three screenplay episodes, or previous fifty utterances by that character—whichever is easier to establish reliably. This is a review window, not an automatic ban.

### Frequency caps

Give conspicuous markers a condition and a cap. Record a cooldown in scenes or utterances only when repeated visibility is a real risk. Do not assign cooldowns to ordinary necessities such as a person's name, `好`, or emergency `停` unless their density is the problem.

### Intentional repetition

Repetition is allowed when it functions as:

- a deliberate motif;
- an echoed promise;
- a command that must remain standardized;
- a callback whose recognition matters;
- evidence of habit, deterioration, or relationship change.

Mark the reason in the ledger so later audits do not “repair” it accidentally.

## 6. Five Repetition Levels

### Exact repetition

The same complete line appears again. Check distance, speaker, context, and intentionality.

### Normalized repetition

Punctuation, fillers, particles, or a number changed, but the line is otherwise the same.

### Lexical-fragment repetition

The same conspicuous opening, ending, degree form, self-repair marker, or multi-character phrase recurs too densely.

### Construction-family repetition

Different vocabulary fills the same shape repeatedly, such as every disagreement becoming `不是 X，是 Y`, or every comfort becoming `先 X，其他的再说`.

### Semantic-function repetition

The scene repeatedly asks the character to deliver the same information, refusal, warning, reassurance, or worldbuilding explanation. This is not a wording problem. Flag it for dialogue-function or scene revision; do not hide it with synonyms.

## 7. Repetition Audit Script

Run on user-owned or project dialogue tables, not on CPED rows:

```bash
/usr/bin/python3 scripts/audit_dialogue_repetition.py dialogue.tsv \
  --speaker-column speaker \
  --text-column text \
  --source-column source \
  --format markdown
```

The script detects exact and normalized duplicates, dense openings and endings, recurring character n-grams, and high-similarity pairs. It cannot decide whether two differently worded lines perform the same semantic function; that requires reading scene intent or a populated `semantic_function` column.

## 8. Full-System Completion Gate

A full recurring-character system is incomplete if any of these remain true:

- only a personality summary and several example lines exist;
- high-use dialogue acts have a single reusable construction;
- relationship and pressure changes are described only with adjectives;
- zero-sample rules are not labeled as inferred;
- no usage ledger exists;
- recent canon has not been checked for exact and normalized repetition;
- a repeated scene function has been hidden by paraphrase;
- another writer must copy the examples because the construction rules are too vague.

Completeness is coverage-relative. A recurring lead needs broader coverage than a one-scene official, but every omitted area needs a role-based reason rather than silence.


---
公开派生版：mtgh。文档按 CC BY-NC-SA 4.0 提供；scripts 代码适用仓库 LICENSE-TOOLS。商用须另获授权。
