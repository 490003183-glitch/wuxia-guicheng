# Interactive Director Review Web Contract

Read this reference only when delivering a director draft as a webpage, HTML review surface, or interactive local site.

## Review Boundary

The accepted director Markdown remains the content master. Review annotations are a separate local layer:

- never rewrite the director master merely because the user typed a note;
- never claim a note was saved to Obsidian, the screenplay, or the director draft;
- bind locally stored notes to episode, director version, and source-screenplay hash so stale notes do not silently attach to a different production source;
- retain unsent notes across refreshes with device-local browser storage unless the user requests another persistence model.

## Required Annotation Flow

Every visible review section must provide an annotation action.

The review surface remains reading-first. Annotation controls are secondary and must not crowd every section heading, change the document's primary rhythm, or visually compete with the director content. Prefer one quiet action after the expanded section body, then show saved notes below it. Keep the end-of-page copy action prominent; the capture controls do not need equal prominence.

1. If the user selects text within the section, preserve a concise verbatim excerpt as the annotation anchor.
2. If no text is selected, attach the note to the whole section.
3. Accept a free-form modification requirement and let the user save, edit, or delete it.
4. Keep multiple notes per section and show the current count.
5. Display saved notes separately from director content so authorship is never ambiguous.

Support keyboard submission where practical, but keep an explicit save button. Use accessible labels and touch-sized controls; do not rely only on hover.

## End-Of-Page Review Summary

Place a dedicated review summary after the director document and before the final footer. Order notes by director-document position and then creation order. Each entry shows:

- section or scene title;
- selected source excerpt when present;
- the user's modification requirement.

End with one prominent `复制全部修改要求` button. Disable it when there are no notes and show clear copied or failed feedback.

The copied text must contain:

```text
<episode and title> 导演稿 <director version> 修改要求
源剧本：<version> · SHA-256 <identifying prefix or full hash>
共 <count> 条

1. 【<section title>】
原文摘录：<selected excerpt>        # omit when the note targets the whole section
修改要求：<user note>
```

Use the Clipboard API with a safe local-preview fallback. Do not include hidden director text, search state, interface copy, or deleted annotations.

## Validation

Before delivery:

- compile or build the webpage successfully;
- confirm the annotation action, editor, local persistence key, ordered summary, empty state, copy button, and success/failure feedback are present;
- confirm notes remain separate from the director source and the storage identity includes the locked source version or hash;
- preserve responsive readability and existing review/search/navigation behavior.
- confirm annotation controls do not replace, split, or visually overload the section-header reading hierarchy.

Do not describe a decorative textarea or an inert button as a completed annotation workflow.
