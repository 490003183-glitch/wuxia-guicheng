#!/usr/bin/env python3
# Copyright (c) 2026 mtgh. Licensed under mtgh Noncommercial Software License 1.0; see LICENSE-TOOLS.
"""Compare novel Chinese-quoted utterances with screenplay speaker blocks."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


QUOTE_RE = re.compile(r"“([^”]*)”", re.DOTALL)
SPEAKER_RE = re.compile(r"^\*\*([^*]+)\*\*$")


def extract_novel_utterances(text: str) -> list[str]:
    return QUOTE_RE.findall(text)


def extract_screenplay_utterances(text: str) -> list[tuple[str, str]]:
    lines = text.splitlines()
    body_marker = next(
        (index for index, line in enumerate(lines) if line.strip() == "## 剧本正文"),
        None,
    )
    start = body_marker + 1 if body_marker is not None else 0
    results: list[tuple[str, str]] = []

    index = start
    while index < len(lines):
        stripped = lines[index].strip()
        if body_marker is not None and stripped.startswith("## "):
            break

        match = SPEAKER_RE.fullmatch(stripped)
        if not match:
            index += 1
            continue

        speaker = match.group(1).strip()
        if "：" in speaker or ":" in speaker:
            index += 1
            continue

        dialogue_index = index + 1
        while dialogue_index < len(lines) and not lines[dialogue_index].strip():
            dialogue_index += 1
        if dialogue_index >= len(lines):
            break

        dialogue = lines[dialogue_index].strip()
        if dialogue.startswith("“") and dialogue.endswith("”"):
            dialogue = dialogue[1:-1]
        results.append((speaker, dialogue))
        index = dialogue_index + 1

    return results


def compare(source_text: str, screenplay_text: str) -> tuple[bool, str]:
    source = extract_novel_utterances(source_text)
    screenplay_blocks = extract_screenplay_utterances(screenplay_text)
    screenplay = [dialogue for _, dialogue in screenplay_blocks]

    if source == screenplay:
        return True, f"PASS source={len(source)} screenplay={len(screenplay)}"

    mismatch = next(
        (
            index
            for index, (left, right) in enumerate(zip(source, screenplay), start=1)
            if left != right
        ),
        min(len(source), len(screenplay)) + 1,
    )
    source_value = source[mismatch - 1] if mismatch <= len(source) else "<missing>"
    if mismatch <= len(screenplay_blocks):
        speaker, screenplay_value = screenplay_blocks[mismatch - 1]
        rendered_screenplay = f"{speaker}: {screenplay_value}"
    else:
        rendered_screenplay = "<missing>"

    return False, (
        f"FAIL source={len(source)} screenplay={len(screenplay)} "
        f"first_mismatch={mismatch}\n"
        f"source: {source_value}\n"
        f"screenplay: {rendered_screenplay}"
    )


def run_self_test() -> int:
    source = "甲说：“第一句。”乙回答：“第二句。”"
    screenplay = """## 剧本正文

**甲**

第一句。

**乙**

第二句。

## 改编核验
"""
    passed, message = compare(source, screenplay)
    if not passed or "source=2 screenplay=2" not in message:
        print(f"SELF_TEST_FAIL\n{message}")
        return 1

    failed, _ = compare(source, screenplay.replace("第二句。", "改写。"))
    if failed:
        print("SELF_TEST_FAIL expected mismatch was not detected")
        return 1

    print("SELF_TEST_PASS")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compare Chinese-quoted novel utterances with screenplay bold speaker blocks."
    )
    parser.add_argument("novel", nargs="?", type=Path)
    parser.add_argument("screenplay", nargs="?", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()
    if args.novel is None or args.screenplay is None:
        parser.error("novel and screenplay paths are required unless --self-test is used")

    passed, message = compare(
        args.novel.read_text(encoding="utf-8"),
        args.screenplay.read_text(encoding="utf-8"),
    )
    print(message)
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
