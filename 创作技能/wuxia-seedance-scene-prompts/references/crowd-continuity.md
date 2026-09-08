# Crowd and background-extra continuity state machine

## Load gate

Read this file only when a finalized scene contains a background performer or crowd whose state must survive a generation-block boundary. Do not load it for scenes containing only named participating characters, or for an unnamed extra whose dialogue and individual consequences begin and end inside one block.

The trigger is continuity, not dialogue. A silent extra may need tracking because the same body, role, position, task, or prop continues into the next block. An extra with dialogue needs no individual state when that speaker has no cross-block identity, action result, position, possession, contact, or relationship consequence.

## Choose the lightest identity level

- `tracked_extra`: one distinguishable background performer whose individual state crosses blocks. Use one stable functional identifier such as `M-01线缆隔离队员`; this is a production identifier, not a canon name.
- `crowd_group`: an anonymous group whose collective state crosses blocks. Use one stable group identifier such as `街口疏散居民群`.
- block-local speaker: an unnamed extra whose individual state does not cross the current block. Do not add that person to `crowd_entities` and do not invent `群演甲／群演乙`. Use one locally unambiguous functional phrase such as `队首的一名白塔疏散员` and give every quoted line one concrete receiver or direction.

If a block-local speaker later acquires a persistent position, prop, contact, task, reaction result, relationship consequence, or another appearance, promote that person to `tracked_extra` before compiling the scene. If an extra requires a continuing personal emotion/performance arc rather than only spatial-task continuity, promote that person to `characters` and apply the normal actor, emotion, voice, and audio-reference contract.

## Authored state

Add optional `initial_state.crowd_entities` only when this gate triggers:

```json
{
  "crowd_entities": {
    "M-01线缆隔离队员": {
      "kind": "tracked_extra",
      "present": true,
      "visible": true,
      "continuity_state": "M-01线缆隔离队员位于扫描架前方检查区，推着损坏的巡检机器人向扫描架移动。"
    },
    "街口疏散居民群": {
      "kind": "crowd_group",
      "present": true,
      "visible": false,
      "continuity_state": "街口疏散居民群位于街面转角画外，继续朝白塔疏散方向移动。"
    }
  }
}
```

Each key is the stable identifier used in events and prompts. `kind` is exactly `tracked_extra` or `crowd_group`. `present` and `visible` are booleans; an absent entity cannot be visible. `continuity_state` is one normalized, platform-ready sentence that contains the key verbatim.

Write into `continuity_state` only the facts that constrain the next action or later continuity:

- confirmed count or composition when materially fixed;
- position and boundary side;
- posture, formation, ordering, or relative relation;
- movement and direction;
- current task;
- action-critical carried object, contact, or equipment;
- `画外` or equivalent wording when `visible` is false but `present` remains true.

Do not invent an exact headcount, appearance variation, or formation when the source does not lock it. Do not store emotion, acting interpretation, voice, camera, framing, focus, or future action in a crowd state.

## Events and replay

Every event that names a tracked crowd entity must do exactly one of the following for that entity:

1. change its state through one or more `crowd_entities.<stable-id>.*` effects, including a `set` effect for the complete new `continuity_state`; or
2. list the stable ID once in event-level `crowd_state_unchanged` when the event contains the entity but leaves all of its tracked state unchanged.

```json
{
  "id": "E02",
  "visible_action": "M-01线缆隔离队员推着损坏的巡检机器人转向街面。",
  "effects": [
    {
      "path": "crowd_entities.M-01线缆隔离队员.continuity_state",
      "set": "M-01线缆隔离队员已经通过扫描架，推着损坏的巡检机器人沿内部通行主路转向街面。"
    }
  ]
}
```

`crowd_state_unchanged` is internal metadata and never enters the platform prompt. Do not both change and declare unchanged for the same entity. Do not remove a crowd-entity object. For a confirmed exit, set `present` and `visible` to `false` and set `continuity_state` to the completed exit result. The transition block's ending spatial state includes that result; later blocks omit the absent entity unless a source-approved re-entry changes `present` back to `true`.

The compiler replay contract is:

```text
previous block end crowd state = next block start crowd state
```

Never repair only the later prompt. Correct the earliest event effect that produced the wrong crowd state, then recompile.

## Platform projection

- Copy every present crowd entity's compiled `continuity_state` verbatim into the block's `开始空间运动状态`.
- Copy every crowd entity still present at block end into `结束空间运动状态`.
- When a crowd entity exits during the block, also copy its final exit `continuity_state` into that block's ending state. Do not repeat it in later openings while `present` remains false.
- Do not add actor/emotion/voice/audio-reference units for `crowd_entities`. Those units remain exclusive to `characters`.
- Keep the stable identifier inside chronological actions that concern the entity. A block-local speaker may keep its temporary functional phrase only inside that block.
- Preserve the confirmed crowd or extra visual asset in every block where that visual identity must remain available, following the episode asset-planning handoff. Textual state replay improves semantic continuity but does not guarantee pixel-identical faces, bodies, or arrangement across independently generated videos.

## Audit

- No cross-block extra or crowd exists only inside `scene.spatial_summary` prose.
- Every tracked entity named by an event has either a complete state effect or an explicit unchanged declaration.
- Every changed state has one complete new `continuity_state`.
- Every prior ending state equals the next opening state before projection.
- The prompt contains each required compiled crowd sentence verbatim in the correct start or end paragraph.
- A one-block-only speaker has a clear local functional label and receiver/direction but no invented persistent name or state entry.
