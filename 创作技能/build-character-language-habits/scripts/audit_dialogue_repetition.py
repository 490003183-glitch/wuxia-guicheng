#!/usr/bin/env python3
# Copyright (c) 2026 mtgh
# SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
# See repository LICENSE-TOOLS. Commercial use requires separate written authorization.
"""Audit repetition in user-owned attributed dialogue tables.

The script detects surface repetition. It does not infer whether two lines have
the same scene-level purpose unless a semantic-function column is provided.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence


PUNCT_RE = re.compile(r"[\s，。！？!?；;：:、…,.~～—\-\"'“”‘’（）()\[\]【】]+")
DIGIT_RE = re.compile(r"\d+(?:\.\d+)?")
CJK_ALNUM_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fffA-Za-z0-9]+")

FILLERS = ("那个", "就是", "其实", "然后", "反正", "嗯", "呃", "额")
FINAL_PARTICLES = ("来着", "而已", "罢了", "啊", "呀", "吧", "呢", "嘛", "啦", "哦", "噢", "呗", "咯", "哇", "诶", "欸", "喽", "嘞")
START_MARKERS = ("我操", "卧槽", "我靠", "不是", "等一下", "等等", "哎呀", "啊", "哎", "唉", "哦", "嗯", "呃", "喂", "嘿", "哈", "哼", "啧")


@dataclass(frozen=True)
class Row:
    order: int
    speaker: str
    text: str
    source: str
    family: str
    semantic: str


def normalize(text: str) -> str:
    text = DIGIT_RE.sub("<num>", text.lower())
    return PUNCT_RE.sub("", text)


def exact_key(text: str) -> str:
    return re.sub(r"\s+", "", text.strip())


def loose_normalize(text: str) -> str:
    value = normalize(text)
    for filler in FILLERS:
        value = value.replace(filler, "")
    changed = True
    while changed:
        changed = False
        for particle in sorted(FINAL_PARTICLES, key=len, reverse=True):
            if value.endswith(particle) and len(value) > len(particle) + 1:
                value = value[: -len(particle)]
                changed = True
                break
    return value


def visible_chars(text: str) -> str:
    return "".join(CJK_ALNUM_RE.findall(text))


def fragment(text: str, width: int, tail: bool = False) -> str:
    value = visible_chars(text)
    if not value:
        return "∅"
    return value[-width:] if tail else value[:width]


def first_marker(text: str) -> str:
    value = normalize(text)
    for marker in sorted(START_MARKERS, key=len, reverse=True):
        if value.startswith(marker):
            return marker
    return fragment(text, 2)


def repeated_initial_units(rows: Sequence[Row], min_count: int, top: int) -> list[dict[str, object]]:
    grouped: dict[tuple[str, str], list[Row]] = defaultdict(list)
    for row in rows:
        grouped[(row.speaker, first_marker(row.text))].append(row)
    results = []
    for (speaker, value), members in grouped.items():
        if value == "∅" or len(members) < min_count:
            continue
        results.append(
            {
                "speaker": speaker,
                "initial": value,
                "count": len(members),
                "sources": [member.source for member in members],
            }
        )
    return sorted(results, key=lambda item: (-int(item["count"]), str(item["speaker"]), str(item["initial"])))[:top]


def char_ngrams(text: str, n: int) -> set[str]:
    value = visible_chars(text)
    if len(value) < n:
        return set()
    return {value[index : index + n] for index in range(len(value) - n + 1)}


def similarity(left: str, right: str) -> float:
    a = char_ngrams(left, 2)
    b = char_ngrams(right, 2)
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def read_rows(args: argparse.Namespace) -> list[Row]:
    path = Path(args.input)
    delimiter = args.delimiter
    if delimiter == "auto":
        delimiter = "\t" if path.suffix.lower() in {".tsv", ".tab"} else ","
    rows: list[Row] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter=delimiter)
        fields = set(reader.fieldnames or [])
        required = {args.speaker_column, args.text_column}
        missing = sorted(required - fields)
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(missing)}")
        for order, raw in enumerate(reader, 1):
            speaker = (raw.get(args.speaker_column) or "").strip()
            text = (raw.get(args.text_column) or "").strip()
            if not speaker or not text:
                continue
            source = (raw.get(args.source_column) or str(order)).strip() if args.source_column else str(order)
            family = (raw.get(args.family_column) or "").strip() if args.family_column else ""
            semantic = (raw.get(args.semantic_column) or "").strip() if args.semantic_column else ""
            rows.append(Row(order, speaker, text, source, family, semantic))
    return rows


def duplicate_groups(rows: Sequence[Row], key_fn) -> list[dict[str, object]]:
    groups: dict[str, list[Row]] = defaultdict(list)
    for row in rows:
        key = key_fn(row.text)
        if key:
            groups[key].append(row)
    output = []
    for key, members in groups.items():
        if len(members) < 2:
            continue
        output.append(
            {
                "key": key,
                "count": len(members),
                "speakers": sorted({item.speaker for item in members}),
                "items": [item_dict(item) for item in members],
            }
        )
    return sorted(output, key=lambda item: (-int(item["count"]), str(item["key"])))


def item_dict(row: Row) -> dict[str, object]:
    return {"speaker": row.speaker, "text": row.text, "source": row.source, "order": row.order}


def repeated_fragments(rows: Sequence[Row], width: int, tail: bool, min_count: int, top: int) -> list[dict[str, object]]:
    grouped: dict[tuple[str, str], list[Row]] = defaultdict(list)
    for row in rows:
        grouped[(row.speaker, fragment(row.text, width, tail))].append(row)
    results = []
    for (speaker, value), members in grouped.items():
        if value == "∅" or len(members) < min_count:
            continue
        results.append(
            {
                "speaker": speaker,
                "fragment": value,
                "count": len(members),
                "sources": [member.source for member in members],
            }
        )
    return sorted(results, key=lambda item: (-int(item["count"]), str(item["speaker"]), str(item["fragment"])))[:top]


def repeated_ngrams(rows: Sequence[Row], n: int, min_count: int, top: int) -> list[dict[str, object]]:
    counters: dict[str, Counter[str]] = defaultdict(Counter)
    sources: dict[tuple[str, str], list[str]] = defaultdict(list)
    for row in rows:
        for gram in char_ngrams(row.text, n):
            counters[row.speaker][gram] += 1
            sources[(row.speaker, gram)].append(row.source)
    results = []
    for speaker, counter in counters.items():
        for gram, count in counter.items():
            if count < min_count:
                continue
            results.append({"speaker": speaker, "ngram": gram, "count": count, "sources": sources[(speaker, gram)]})
    return sorted(results, key=lambda item: (-int(item["count"]), str(item["speaker"]), str(item["ngram"])))[:top]


def near_duplicates(rows: Sequence[Row], args: argparse.Namespace) -> tuple[list[dict[str, object]], bool]:
    results = []
    compared = 0
    truncated = False
    for left_index, left in enumerate(rows):
        left_len = len(visible_chars(left.text))
        if left_len < args.near_min_length:
            continue
        for right in rows[left_index + 1 :]:
            if args.scope == "within" and left.speaker != right.speaker:
                continue
            if args.scope == "cross" and left.speaker == right.speaker:
                continue
            right_len = len(visible_chars(right.text))
            if right_len < args.near_min_length:
                continue
            if min(left_len, right_len) / max(left_len, right_len) < 0.55:
                continue
            compared += 1
            if compared > args.pair_limit:
                truncated = True
                return sorted(results, key=lambda item: -float(item["similarity"]))[: args.top], truncated
            score = similarity(left.text, right.text)
            if score >= args.near_threshold and normalize(left.text) != normalize(right.text):
                results.append(
                    {
                        "similarity": round(score, 3),
                        "left": item_dict(left),
                        "right": item_dict(right),
                    }
                )
    return sorted(results, key=lambda item: -float(item["similarity"]))[: args.top], truncated


def labeled_counts(rows: Sequence[Row], field: str) -> list[dict[str, object]]:
    values: dict[tuple[str, str], list[str]] = defaultdict(list)
    for row in rows:
        value = getattr(row, field)
        if value:
            values[(row.speaker, value)].append(row.source)
    return [
        {"speaker": speaker, "label": label, "count": len(sources), "sources": sources}
        for (speaker, label), sources in sorted(values.items(), key=lambda item: (-len(item[1]), item[0]))
        if len(sources) >= 2
    ]


def build_report(rows: Sequence[Row], args: argparse.Namespace) -> dict[str, object]:
    near, truncated = near_duplicates(rows, args)
    return {
        "input": args.input,
        "rows": len(rows),
        "speakers": len({row.speaker for row in rows}),
        "exact_duplicates": duplicate_groups(rows, exact_key),
        "normalized_duplicates": duplicate_groups(rows, normalize),
        "loose_normalized_duplicates": duplicate_groups(rows, loose_normalize),
        "repeated_initial_units": repeated_initial_units(rows, args.min_count, args.top),
        "repeated_openings": repeated_fragments(rows, args.fragment_width, False, args.min_count, args.top),
        "repeated_endings": repeated_fragments(rows, args.fragment_width, True, args.min_count, args.top),
        "repeated_ngrams": repeated_ngrams(rows, args.ngram_size, args.min_count, args.top),
        "near_duplicates": near,
        "near_comparison_truncated": truncated,
        "construction_family_density": labeled_counts(rows, "family") if args.family_column else [],
        "semantic_function_density": labeled_counts(rows, "semantic") if args.semantic_column else [],
        "limitations": [
            "Surface similarity does not prove that repetition is harmful.",
            "Semantic-function repetition requires a populated semantic column or scene reading.",
            "Intentional motifs, standardized commands, and callbacks require human review.",
        ],
    }


def write_ledger(rows: Sequence[Row], path: str) -> None:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "source_order",
        "character",
        "source_id",
        "construction_family_id",
        "semantic_function",
        "exact_text",
        "normalized_text",
        "loose_normalized_text",
        "opening_fragment",
        "closing_fragment",
        "first_marker",
        "intentional_repeat",
        "repeat_reason",
    ]
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, delimiter="\t")
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "source_order": row.order,
                    "character": row.speaker,
                    "source_id": row.source,
                    "construction_family_id": row.family,
                    "semantic_function": row.semantic,
                    "exact_text": row.text,
                    "normalized_text": normalize(row.text),
                    "loose_normalized_text": loose_normalize(row.text),
                    "opening_fragment": fragment(row.text, 4),
                    "closing_fragment": fragment(row.text, 4, True),
                    "first_marker": first_marker(row.text),
                    "intentional_repeat": "",
                    "repeat_reason": "",
                }
            )


def markdown(report: dict[str, object], top: int) -> str:
    lines = [
        "# Dialogue repetition audit",
        "",
        f"- Input rows: {report['rows']}",
        f"- Speakers: {report['speakers']}",
        f"- Exact duplicate groups: {len(report['exact_duplicates'])}",
        f"- Normalized duplicate groups: {len(report['normalized_duplicates'])}",
        f"- Loose-normalized duplicate groups: {len(report['loose_normalized_duplicates'])}",
        f"- Near-comparison truncated: {report['near_comparison_truncated']}",
        "",
    ]

    def table(title: str, entries: Iterable[dict[str, object]], columns: Sequence[str]) -> None:
        data = list(entries)[:top]
        lines.extend([f"## {title}", ""])
        if not data:
            lines.extend(["None.", ""])
            return
        lines.append("| " + " | ".join(columns) + " |")
        lines.append("|" + "|".join("---" for _ in columns) + "|")
        for item in data:
            values = []
            for column in columns:
                value = item.get(column, "")
                if isinstance(value, list):
                    value = ", ".join(str(part) for part in value)
                values.append(str(value).replace("|", "\\|").replace("\n", " "))
            lines.append("| " + " | ".join(values) + " |")
        lines.append("")

    exact_rows = [
        {
            "count": item["count"],
            "speakers": ", ".join(item["speakers"]),
            "text": str(item["items"][0]["text"]),
            "sources": ", ".join(str(part["source"]) for part in item["items"]),
        }
        for item in report["exact_duplicates"]
    ]
    loose_rows = [
        {
            "count": item["count"],
            "speakers": ", ".join(item["speakers"]),
            "normalized": item["key"],
            "sources": ", ".join(str(part["source"]) for part in item["items"]),
        }
        for item in report["loose_normalized_duplicates"]
    ]
    normalized_rows = [
        {
            "count": item["count"],
            "speakers": ", ".join(item["speakers"]),
            "normalized": item["key"],
            "sources": ", ".join(str(part["source"]) for part in item["items"]),
        }
        for item in report["normalized_duplicates"]
    ]
    near_rows = [
        {
            "similarity": item["similarity"],
            "left": f"{item['left']['speaker']}: {item['left']['text']}",
            "right": f"{item['right']['speaker']}: {item['right']['text']}",
        }
        for item in report["near_duplicates"]
    ]
    table("Exact duplicates", exact_rows, ("count", "speakers", "text", "sources"))
    table("Normalized duplicates", normalized_rows, ("count", "speakers", "normalized", "sources"))
    table("Loose-normalized duplicates", loose_rows, ("count", "speakers", "normalized", "sources"))
    table("Repeated initial units", report["repeated_initial_units"], ("speaker", "initial", "count", "sources"))
    table("Repeated openings", report["repeated_openings"], ("speaker", "fragment", "count", "sources"))
    table("Repeated endings", report["repeated_endings"], ("speaker", "fragment", "count", "sources"))
    table("Repeated n-grams", report["repeated_ngrams"], ("speaker", "ngram", "count", "sources"))
    table("Near duplicates", near_rows, ("similarity", "left", "right"))
    table("Construction-family density", report["construction_family_density"], ("speaker", "label", "count", "sources"))
    table("Semantic-function density", report["semantic_function_density"], ("speaker", "label", "count", "sources"))
    lines.extend(["## Limitations", ""] + [f"- {item}" for item in report["limitations"]] + [""])
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="CSV or TSV with attributed dialogue")
    parser.add_argument("--delimiter", choices=("auto", ",", "\t"), default="auto")
    parser.add_argument("--speaker-column", default="speaker")
    parser.add_argument("--text-column", default="text")
    parser.add_argument("--source-column", default="source")
    parser.add_argument("--family-column")
    parser.add_argument("--semantic-column")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument("--ledger-out", help="Optional TSV usage-ledger output path")
    parser.add_argument("--min-count", type=int, default=3)
    parser.add_argument("--top", type=int, default=30)
    parser.add_argument("--fragment-width", type=int, default=4)
    parser.add_argument("--ngram-size", type=int, default=4)
    parser.add_argument("--near-threshold", type=float, default=0.72)
    parser.add_argument("--near-min-length", type=int, default=6)
    parser.add_argument("--scope", choices=("within", "cross", "both"), default="both")
    parser.add_argument("--pair-limit", type=int, default=100000)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.min_count < 2:
        raise ValueError("--min-count must be at least 2")
    if not 0.0 <= args.near_threshold <= 1.0:
        raise ValueError("--near-threshold must be between 0 and 1")
    rows = read_rows(args)
    report = build_report(rows, args)
    if args.ledger_out:
        write_ledger(rows, args.ledger_out)
    if args.format == "json":
        json.dump(report, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    else:
        sys.stdout.write(markdown(report, args.top))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
