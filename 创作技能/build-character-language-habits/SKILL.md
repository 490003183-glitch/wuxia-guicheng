---
name: build-character-language-habits
description: Build, revise, compare, or audit a fictional character's observable language habits, dialogue-response repertoire, and long-form repetition controls from canon dialogue and optional authorized dialogue corpora. Use for 语言习惯、说话习惯、台词指纹、口癖、高频词、角色台词库、同一刺激差异、去名辨认、角色撞声、小说或剧本台词重复、跨章去重、台词使用台账. Do not use for inner motivation, actor-performance fingerprints, vocal timbre, or scene plotting alone.
---

# Build Character Language Habits

Model what can be heard or transcribed, then keep it varied across a long work.

The skill maintains three different artifacts:

1. **Surface fingerprint** — how this mouth starts, builds, repairs, intensifies, and ends an utterance.
2. **Response repertoire** — several structurally different ways to perform recurring dialogue acts without becoming a canned-line bank.
3. **Usage ledger** — which conspicuous words, openings, constructions, and complete lines were recently used, so later chapters do not repeat them accidentally.

Do not confuse them. A fingerprint without a repertoire becomes repetitive. A repertoire without a ledger gradually reuses the same solutions. Neither layer decides what the character wants or knows.

## Route the Request

### Focused fingerprint

Use for one reaction, one character comparison, a catchphrase audit, or a small rewrite.

- Read [references/cped-and-feature-schema.md](references/cped-and-feature-schema.md).
- Read [references/delivery-and-tests.md](references/delivery-and-tests.md).
- Build or audit the surface fingerprint and controlled comparison only.

### Full character language system

Use whenever the user asks for a complete library, all characters, long-form novel or screenplay use, enough information to avoid repetition, a response bank, or a production-ready system.

- Read both references above.
- Also read [references/long-form-dialogue-ecosystem.md](references/long-form-dialogue-ecosystem.md).
- Build all three artifacts: fingerprint, repertoire, and ledger.
- If attributed dialogue exists in tabular form, run `scripts/audit_dialogue_repetition.py` before declaring the system complete.

### Repetition audit

Use when the main question is whether existing dialogue repeats across scenes, chapters, episodes, or characters.

- Read [references/long-form-dialogue-ecosystem.md](references/long-form-dialogue-ecosystem.md).
- Run the repetition script when input can be represented as speaker/text/source rows.
- Report exact, normalized, structural, functional, and semantic repetition separately. Do not “fix” repeated scene content by swapping synonyms.

## Evidence Order

1. Current formal dialogue for the fictional character.
2. User-confirmed dialogue samples and corrections.
3. An optional user-supplied, authorized CPED-compatible corpus as a comparison baseline. No external corpus is included.
4. Web research into a specific dialect, age cohort, occupation, period, or subculture only when canon and CPED do not cover it, or when the user explicitly requests research.

Use the formal text sources the user identifies as CANON_ROOT. Distinguish formal, original, pending and inferred material. External patterns never override canon; do not copy external dialogue into the project.

## Runtime

Python 3.10 or newer; standard library only. Run commands from this skill folder. Input paths are explicit. No corpus is bundled, and corpus comparison is optional. The analysis produces aggregates; the repetition audit may quote the user-supplied dialogue in its report.

## Evidence Maturity Is Not Production Status

The following are working review bands, not statistical confidence guarantees. Context diversity still matters.

- Fewer than 15 attributed utterances: provisional evidence.
- 15–49: limited evidence.
- 50 or more: usable evidence for a first fingerprint.

The user may still authorize a production-usable design for a low-sample character. In that case mark each unsupported rule `推断待验证`; do not relabel it as formal evidence. `可用版` means the rules can be applied, not that the corpus is mature.

## Shared Workflow

1. **Define the output mode.** State whether the request needs only a fingerprint, a full language system, or a repetition audit.
2. **Collect attributed dialogue.** Separate speaker lines from narration, performance direction, and other speakers. Prefer omission over false attribution.
3. **Measure sufficiency and skew.** Report per-character counts, zero-sample roles, and whether a few characters dominate the corpus.
4. **Use a corpus baseline when supplied.** Otherwise report that comparisons are unavailable. Run `scripts/analyze_cped_language.py` with relevant age, gender, scene, emotion, and dialogue-act filters. Common Chinese forms are not personal merely because they occur in the target sample.
5. **Extract observable features.** Cover first vocalization, lexical start, length, completeness, particles, profanity, degree construction, reduplication, elongation, repetition, self-repair, address, question or command shape, and closing pattern when supported.
6. **Separate context variants.** Record how the same surface system changes across relationship, hierarchy, publicness, pressure, embarrassment, pain, surprise, and anger.
7. **For full systems, build coverage and repertoire.** Follow the coverage grid in `long-form-dialogue-ecosystem.md`. High-use dialogue acts need multiple construction families, not several synonym-swapped lines.
8. **For full systems, initialize or update the ledger.** Record recent exact lines, normalized lines, conspicuous starts and endings, construction-family IDs, source scene, count, and cooldown status.
9. **Audit repetition at five levels.** Exact line, normalized line, lexical fragment, construction family, and semantic function. Flag repeated semantic content for scene-level revision instead of surface paraphrase.
10. **Run controlled contrast tests.** Lock stimulus, information, emotion, intensity, relationship, dialogue act, time pressure, and publicness before comparing characters.
11. **Label every conclusion.** Use `正式台词支持`, `用户锁定`, `CPED对照支持`, `网络资料支持`, or `推断待验证`.
12. **Respect write boundaries.** Write only within the current authorized output scope; source dialogue and established character cards remain read-only unless revision is requested.

## Hard Boundaries

- Do not substitute semantic decision chains for language habits.
- Do not use personality adjectives as a fingerprint unless converted into transcript-visible operations.
- Do not derive wording from wardrobe, appearance, sexuality, ability, vocal timbre, or an actor reference.
- Do not make every character concise, functional, and information-efficient.
- Do not invent high-frequency words without counting formal samples or a relevant baseline.
- Do not treat an AI-generated list of dozens of lines as corpus evidence.
- Do not create a fixed quote bank that later writing is expected to copy. Store construction families, controlled examples, and usage records.
- Do not demand that ordinary micro-lines such as `好`, `停`, or a person's name be unique. Audit their density, placement, and surrounding structure.
- Do not solve repeated information, repeated conflict, or a repeated scene function with synonyms. Mark it as semantic or scene-level repetition.
- Do not force conspicuous catchphrases into every scene. Give them an explicit condition, frequency cap, and ledger entry.

## Completion Standards

### Focused fingerprint complete

- At least three controlled stimuli differ audibly from the closest project characters while preserving the same meaning.
- Identity rests on at least three interacting observable tendencies.
- Evidence maturity and gaps are explicit.

### Full language system complete

- The surface fingerprint passes the focused standard.
- The coverage grid has no unexplained critical gaps for the character's actual story use.
- Every high-use dialogue act has at least three genuinely different construction families or an explicit reason it does not.
- Relationship, publicness, and pressure variants remain recognizably connected to the baseline voice.
- A usage ledger exists and recent material has been checked for exact, normalized, opening, ending, and construction-family repetition.
- Semantic repetition is reported separately from wording repetition.
- Another writer can generate new lines from the rules without copying the controlled examples.


---
公开派生版：mtgh。文档按 CC BY-NC-SA 4.0 提供；scripts 代码适用仓库 LICENSE-TOOLS。商用须另获授权。
