# Empirical calibration protocol

## Purpose

Calibration measures how a stable prompt design behaves on a named platform/model configuration. It does not create or improve acting, action, dialogue, pauses, dramatic rhythm, or camera work.

Keep three activities separate:

```text
creative design -> structural validation -> empirical calibration
```

If camera, shot count, staging, event density, prompt structure, requested duration, and pauses all change together, label the result `redesign_experiment`. Do not use it to infer a timing rate.

## Creative freeze

Before a calibration run, freeze:

- source slice and dialogue;
- ordered visible events;
- acting and required pauses;
- prompt profile and wording version;
- model/platform/version and generation settings.

Change one tested variable per comparison. Typical variables are requested duration or event density, not both.

Never add `停住一拍`, a reaction, a transition, or a camera hold merely to satisfy an estimated duration. A hold counts only when the creative design already requires it.

## Sample record

Record each generated output as structured evidence:

```json
{
  "sample_id": "CAL-DIALOGUE-001",
  "scene_class": "dialogue",
  "platform": "Seedance",
  "model_version": "exact version or unknown",
  "prompt_profile": "quick",
  "prompt_fingerprint": "stable hash or version ID",
  "tested_variable": "requested_duration_s",
  "requested_duration_s": 10,
  "file_duration_s": 10.0,
  "usable_narrative_duration_s": 6.7,
  "human_content_estimate_s": 9.0,
  "planned_event_count": 4,
  "completed_event_count": 3,
  "compressed_or_missing_events": ["ending reaction shortened"],
  "observed_output": "concise factual observation",
  "confirmed_cause": null,
  "unresolved_hypotheses": []
}
```

`usable_narrative_duration_s` measures the portion that can actually remain in the edit, not merely the media-file length.

`human_content_estimate_s` is the frozen pre-generation content estimate for the unchanged creative design. It supplies the denominator for the measured usable/estimated ratio.

Keep samples comparable. Do not combine different platform/model versions, prompt profiles, prompt fingerprints/wording versions, tested variables, or these scene classes into one coefficient:

- `dialogue`;
- `dialogue_action`;
- `physical_action`;
- `multi_event`.

## Status

- `uncalibrated`: no comparable measured outputs; any duration is a content-budget heuristic only.
- `provisional`: at least five comparable measured outputs in one class/configuration.
- `calibrated`: at least ten comparable measured outputs in one class/configuration, with no unresolved systematic failure that invalidates the set.

These are minimum evidence gates, not guarantees. A model/version change starts a new calibration group.

For `provisional` and `calibrated`, report:

- sample count;
- median `usable_narrative_duration_s / human_content_estimate_s`;
- median event completion rate;
- observed spread or range;
- platform/model/profile/prompt-fingerprint/tested-variable grouping key;
- known failure patterns.

Do not replace medians with a single best-looking result. Do not call a manually written `basis` string calibration evidence.

## Allowed effects of calibration

Calibration may inform later:

- how many events fit one block;
- requested duration selection;
- whether to split before a causal transition;
- the uncertainty range shown outside the platform prompt.

Every platform block is `dialogue_autocut`; keep seconds, ranges, timestamps, and duration labels out of the prompt even when internal calibration is strong.

Calibration may not silently:

- add, remove, or rewrite dialogue;
- add holds or reactions;
- add camera, framing, focus, movement, or edit instructions;
- change actor performance;
- alter state effects or event order.

If evidence suggests the creative design is not generatable, stop the calibration result at that finding. Propose a separately named redesign with its creative consequences stated explicitly.

## Delivery wording

Use precise labels:

- `未校准内容估时` for heuristic ranges;
- `暂定实测系数` for provisional data;
- `同配置实测校准` for calibrated data;
- `重设计实验稿` when creative variables changed.

Never present requested platform duration, media-file duration, and usable narrative duration as the same quantity.
