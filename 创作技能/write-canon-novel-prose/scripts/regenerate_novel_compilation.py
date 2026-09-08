#!/usr/bin/env python3
# Copyright (c) 2026 mtgh. Licensed under mtgh Noncommercial Software License 1.0; see LICENSE-TOOLS.
"""Deterministically rebuild the current Wuxia Guicheng novel compilation."""

from __future__ import annotations

import argparse
import os
import re
import sys
import tempfile
from pathlib import Path


ORDER_RE = re.compile(r"^(?P<order>\d{3})_.+\.md$")
FRONTMATTER_RE = re.compile(r"\A---\n.*?\n---\n\n?", re.DOTALL)
HEADING_RE = re.compile(r"^#{1,6}\s+", re.MULTILINE)


def chapter_order(path: Path) -> int:
    match = ORDER_RE.match(path.name)
    if not match:
        raise ValueError(f"chapter filename lacks a three-digit order prefix: {path}")
    return int(match.group("order"))


def collect_chapters(chapters_dir: Path, overlays: list[Path]) -> list[Path]:
    if not chapters_dir.is_dir():
        raise ValueError(f"chapters directory not found: {chapters_dir}")

    chapters: dict[int, Path] = {}
    for path in sorted(chapters_dir.glob("*.md")):
        try:
            order = chapter_order(path)
        except ValueError:
            continue
        if order in chapters:
            raise ValueError(
                f"duplicate chapter order {order:03d}: {chapters[order]} and {path}"
            )
        chapters[order] = path

    for overlay in overlays:
        if not overlay.is_file():
            raise ValueError(f"overlay chapter not found: {overlay}")
        chapters[chapter_order(overlay)] = overlay

    if not chapters:
        raise ValueError(f"no ordered Markdown chapters found in: {chapters_dir}")

    orders = sorted(chapters)
    expected = list(range(orders[0], orders[-1] + 1))
    if orders != expected or orders[0] != 0:
        found = ", ".join(f"{order:03d}" for order in orders)
        raise ValueError(f"chapter order must be contiguous from 000; found: {found}")

    return [chapters[order] for order in orders]


def render_chapter(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    body = FRONTMATTER_RE.sub("", raw, count=1)
    body = HEADING_RE.sub("", body)
    if not body.strip():
        raise ValueError(f"chapter body is empty after metadata removal: {path}")
    if not body.endswith("\n"):
        body += "\n"
    return body


def render_compilation(chapters: list[Path], title: str) -> str:
    bodies = [render_chapter(path) for path in chapters]
    return f"{title}\n\n\n" + "\n\n".join(bodies)


def write_atomically(output: Path, content: str) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(
        prefix=f".{output.name}.", suffix=".tmp", dir=output.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(content)
        os.replace(temporary, output)
    finally:
        if temporary.exists():
            temporary.unlink()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chapters-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--overlay-chapter",
        action="append",
        default=[],
        type=Path,
        help="Staged chapter that overrides the same numeric order before rendering.",
    )
    parser.add_argument("--title", default="《雾峡轨城》")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Compare generated text with --output instead of writing it.",
    )
    parser.add_argument("--overwrite", action="store_true", help="Explicitly allow replacing an existing compilation.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        chapters = collect_chapters(
            args.chapters_dir.expanduser(),
            [path.expanduser() for path in args.overlay_chapter],
        )
        content = render_compilation(chapters, args.title)
    except (OSError, UnicodeError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    output = args.output.expanduser()
    if args.check:
        if not output.is_file():
            print(f"mismatch: output not found: {output}", file=sys.stderr)
            return 1
        try:
            current = output.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 2
        if current != content:
            print(
                f"mismatch: formal chapters do not reproduce {output}",
                file=sys.stderr,
            )
            return 1
        print(f"ok: {len(chapters)} chapters reproduce {output}")
        return 0

    if output.resolve() in {p.resolve() for p in chapters}:
        print("error: output cannot overwrite an input chapter", file=sys.stderr)
        return 2
    if output.exists() and not args.overwrite:
        print("error: output exists; use --overwrite to replace it", file=sys.stderr)
        return 2

    try:
        write_atomically(output, content)
    except OSError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(
        f"generated: {output} ({len(chapters)} chapters, "
        f"{chapters[0].name}..{chapters[-1].name})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
