#!/usr/bin/env python3
# Copyright (c) 2026 mtgh
# SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
# See repository LICENSE-TOOLS. Commercial use requires separate written authorization.
"""Aggregate observable surface-language features from the local CPED corpus.

The script prints statistics only. It intentionally does not emit source dialogue
lines, so it can be used as a comparison tool without reproducing the corpus.
"""

from __future__ import annotations

import argparse
import csv
import glob
import json
import os
import re
import statistics
from collections import Counter, defaultdict
from typing import Dict, Iterable, List, Sequence, Tuple


LABEL_FIELDS = ("Gender", "Age", "Scene", "Sentiment", "Emotion", "DA")
GROUP_FIELDS = {
    "tv-speaker": ("TV_ID", "Speaker"),
    "speaker": ("Speaker",),
    "tv": ("TV_ID",),
}

START_MARKERS = tuple(
    sorted(
        {
            "我操",
            "卧槽",
            "我靠",
            "妈呀",
            "天哪",
            "不是",
            "等等",
            "哎呀",
            "哎哟",
            "哎呦",
            "啊",
            "哎",
            "唉",
            "欸",
            "诶",
            "哦",
            "噢",
            "嗯",
            "唔",
            "呃",
            "额",
            "喂",
            "嘿",
            "哈",
            "哼",
            "啧",
            "靠",
        },
        key=len,
        reverse=True,
    )
)

FINAL_PARTICLES = (
    "来着",
    "而已",
    "罢了",
    "啊",
    "呀",
    "吧",
    "呢",
    "嘛",
    "啦",
    "哦",
    "噢",
    "呗",
    "咯",
    "哇",
    "诶",
    "欸",
    "喽",
    "嘞",
)

PROFANITY_TERMS = (
    "他妈的",
    "王八蛋",
    "神经病",
    "去你的",
    "我操",
    "卧槽",
    "我靠",
    "妈的",
    "他妈",
    "狗屁",
    "放屁",
    "混蛋",
    "有病",
    "滚",
    "靠",
    "操",
)

DEGREE_TERMS = (
    "太",
    "这么",
    "那么",
    "真够",
    "真是",
    "真",
    "特别",
    "非常",
    "极了",
    "死了",
    "透了",
    "爆了",
    "要命",
    "得慌",
)

REPAIR_TERMS = (
    "不是",
    "不对",
    "等等",
    "等一下",
    "我是说",
    "应该说",
    "怎么说",
    "算了",
)

FILLER_TERMS = (
    "那个",
    "就是",
    "然后",
    "其实",
    "反正",
    "怎么说",
    "你知道",
    "嗯",
    "呃",
    "额",
)

PUNCT_STRIP = "，。！？!?；;：:、…,.~～—-\"'“”‘’（）()[]【】"
CJK_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff]")
FIRST_FRAGMENT_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fffA-Za-z0-9]+")
REDUP_RE = re.compile(
    r"([\u3400-\u4dbf\u4e00-\u9fff])\1|"
    r"([\u3400-\u4dbf\u4e00-\u9fff])\2"
    r"([\u3400-\u4dbf\u4e00-\u9fff])\3"
)


def parse_values(raw: str | None) -> set[str]:
    if not raw:
        return set()
    return {value.strip().lower() for value in raw.split(",") if value.strip()}


def load_rows(cped_dir: str) -> List[Dict[str, str]]:
    paths = sorted(glob.glob(os.path.join(cped_dir, "*_split.csv")))
    if not paths:
        raise FileNotFoundError(f"No *_split.csv files found in {cped_dir}")
    rows: List[Dict[str, str]] = []
    for path in paths:
        with open(path, "r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            required = {"TV_ID", "Dialogue_ID", "Speaker", "Utterance"}
            missing = required - set(reader.fieldnames or [])
            if missing:
                raise ValueError(f"Missing required columns: {sorted(missing)}")
            rows.extend(reader)
    return rows


def filter_rows(rows: Iterable[Dict[str, str]], args: argparse.Namespace) -> List[Dict[str, str]]:
    filters = {
        "Gender": parse_values(args.gender),
        "Age": parse_values(args.age),
        "Scene": parse_values(args.scene),
        "Emotion": parse_values(args.emotion),
        "DA": parse_values(args.da),
        "Sentiment": parse_values(args.sentiment),
        "TV_ID": parse_values(args.tv_id),
    }
    speaker_query = args.speaker.lower().strip() if args.speaker else ""
    contains_query = args.contains.strip() if args.contains else ""
    selected: List[Dict[str, str]] = []
    for row in rows:
        if any(
            allowed and row.get(field, "").lower() not in allowed
            for field, allowed in filters.items()
        ):
            continue
        if speaker_query and speaker_query not in row.get("Speaker", "").lower():
            continue
        if contains_query and contains_query not in row.get("Utterance", ""):
            continue
        selected.append(row)
    return selected


def text_length(text: str) -> int:
    cjk = CJK_RE.findall(text)
    if cjk:
        return len(cjk)
    return len(re.sub(r"\s+", "", text))


def first_fragment(text: str) -> str:
    stripped = text.strip().lstrip(PUNCT_STRIP).strip()
    for marker in START_MARKERS:
        if stripped.startswith(marker):
            return marker
    match = FIRST_FRAGMENT_RE.search(stripped)
    if not match:
        return "∅"
    return match.group(0)[:2]


def final_particle(text: str) -> str:
    stripped = text.strip().rstrip(PUNCT_STRIP).strip()
    for particle in FINAL_PARTICLES:
        if stripped.endswith(particle):
            return particle
    return ""


def present_terms(text: str, terms: Sequence[str]) -> List[str]:
    return [term for term in terms if term in text]


def aggregate(rows: Sequence[Dict[str, str]]) -> Dict[str, object]:
    count = len(rows)
    lengths = [text_length(row.get("Utterance", "")) for row in rows]
    starts: Counter[str] = Counter()
    finals: Counter[str] = Counter()
    profanity: Counter[str] = Counter()
    degree: Counter[str] = Counter()
    fillers: Counter[str] = Counter()
    flags: Counter[str] = Counter()

    for row in rows:
        text = row.get("Utterance", "")
        starts[first_fragment(text)] += 1
        particle = final_particle(text)
        if particle:
            finals[particle] += 1

        profanity_hits = present_terms(text, PROFANITY_TERMS)
        degree_hits = present_terms(text, DEGREE_TERMS)
        filler_hits = present_terms(text, FILLER_TERMS)
        repair_hits = present_terms(text, REPAIR_TERMS)

        profanity.update(profanity_hits)
        degree.update(degree_hits)
        fillers.update(filler_hits)

        flags["question"] += int("?" in text or "？" in text)
        flags["exclamation"] += int("!" in text or "！" in text)
        flags["ellipsis"] += int("…" in text or "..." in text)
        flags["initial_marker"] += int(first_fragment(text) in START_MARKERS)
        flags["final_particle"] += int(bool(particle))
        flags["profanity"] += int(bool(profanity_hits))
        flags["degree"] += int(bool(degree_hits))
        flags["filler"] += int(bool(filler_hits))
        flags["repair"] += int(bool(repair_hits))
        flags["reduplication"] += int(bool(REDUP_RE.search(text)))

    def rate(key: str) -> float:
        return flags[key] / count if count else 0.0

    return {
        "utterances": count,
        "dialogues": len({(row.get("TV_ID"), row.get("Dialogue_ID")) for row in rows}),
        "mean_length": round(statistics.mean(lengths), 3) if lengths else 0.0,
        "median_length": round(statistics.median(lengths), 3) if lengths else 0.0,
        "rates": {key: round(rate(key), 6) for key in sorted(flags)},
        "top_starts": starts.most_common(8),
        "top_finals": finals.most_common(8),
        "top_profanity": profanity.most_common(8),
        "top_degree": degree.most_common(8),
        "top_fillers": fillers.most_common(8),
    }


def group_rows(
    rows: Sequence[Dict[str, str]], group_fields: Sequence[str]
) -> Dict[Tuple[str, ...], List[Dict[str, str]]]:
    grouped: Dict[Tuple[str, ...], List[Dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[tuple(row.get(field, "") for field in group_fields)].append(row)
    return grouped


def format_pairs(pairs: Sequence[Sequence[object]], limit: int = 4) -> str:
    return "、".join(f"{item}:{count}" for item, count in pairs[:limit]) or "—"


def delta_pp(group: Dict[str, object], baseline: Dict[str, object], key: str) -> str:
    group_rate = float(group["rates"].get(key, 0.0))  # type: ignore[index,union-attr]
    base_rate = float(baseline["rates"].get(key, 0.0))  # type: ignore[index,union-attr]
    return f"{(group_rate - base_rate) * 100:+.1f}"


def markdown_report(
    rows: Sequence[Dict[str, str]],
    baseline: Dict[str, object],
    groups: Sequence[Tuple[Tuple[str, ...], Dict[str, object]]],
    args: argparse.Namespace,
) -> str:
    filters = []
    for name in ("gender", "age", "scene", "sentiment", "emotion", "da", "tv_id", "speaker", "contains"):
        value = getattr(args, name)
        if value:
            filters.append(f"{name}={value}")
    lines = [
        "# CPED surface-language aggregate",
        "",
        f"- Filter: {', '.join(filters) if filters else 'none'}",
        f"- Utterances: {len(rows)}",
        f"- Dialogues: {baseline['dialogues']}",
        f"- Mean / median CJK length: {baseline['mean_length']} / {baseline['median_length']}",
        f"- Top starts: {format_pairs(baseline['top_starts'])}",  # type: ignore[arg-type]
        f"- Top finals: {format_pairs(baseline['top_finals'])}",  # type: ignore[arg-type]
        f"- Top profanity: {format_pairs(baseline['top_profanity'])}",  # type: ignore[arg-type]
        "",
    ]
    if not groups:
        return "\n".join(lines)

    lines.extend(
        [
            "| Group | N | Mean length | Initial marker Δpp | Final particle Δpp | Profanity Δpp | Question Δpp | Exclamation Δpp | Top starts |",
            "|---|---:|---:|---:|---:|---:|---:|---:|---|",
        ]
    )
    for key, stats in groups:
        group_name = " / ".join(key).replace("|", "\\|")
        lines.append(
            "| "
            + " | ".join(
                [
                    group_name,
                    str(stats["utterances"]),
                    str(stats["mean_length"]),
                    delta_pp(stats, baseline, "initial_marker"),
                    delta_pp(stats, baseline, "final_particle"),
                    delta_pp(stats, baseline, "profanity"),
                    delta_pp(stats, baseline, "question"),
                    delta_pp(stats, baseline, "exclamation"),
                    format_pairs(stats["top_starts"]),  # type: ignore[arg-type]
                ]
            )
            + " |"
        )
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cped-dir", required=True, help="Directory containing authorized *_split.csv files")
    parser.add_argument("--gender", help="Comma-separated exact labels")
    parser.add_argument("--age", help="Comma-separated exact labels")
    parser.add_argument("--scene", help="Comma-separated exact labels")
    parser.add_argument("--sentiment", help="Comma-separated exact labels")
    parser.add_argument("--emotion", help="Comma-separated exact labels")
    parser.add_argument("--da", help="Comma-separated exact labels")
    parser.add_argument("--tv-id", help="Comma-separated exact TV_ID values")
    parser.add_argument("--speaker", help="Case-insensitive speaker-name substring")
    parser.add_argument("--contains", help="Keep utterances containing this exact text")
    parser.add_argument("--group-by", choices=sorted(GROUP_FIELDS), default="tv-speaker")
    parser.add_argument("--min-utterances", type=int, default=20)
    parser.add_argument("--top", type=int, default=20)
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument("--list-values", action="store_true")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    rows = load_rows(args.cped_dir)

    if args.list_values:
        for field in LABEL_FIELDS:
            counts = Counter(row.get(field, "") for row in rows)
            print(field)
            for value, count in counts.most_common():
                print(f"  {value}: {count}")
        return 0

    selected = filter_rows(rows, args)
    if not selected:
        raise SystemExit("No CPED rows matched the requested filters.")

    baseline = aggregate(selected)
    grouped = group_rows(selected, GROUP_FIELDS[args.group_by])
    group_stats = [
        (key, aggregate(group))
        for key, group in grouped.items()
        if len(group) >= args.min_utterances
    ]
    group_stats.sort(key=lambda item: int(item[1]["utterances"]), reverse=True)
    group_stats = group_stats[: args.top]

    if args.format == "json":
        payload = {
            "filters": {
                key: value
                for key, value in vars(args).items()
                if value not in (None, False, "")
            },
            "baseline": baseline,
            "groups": [
                {"group": list(key), "statistics": stats} for key, stats in group_stats
            ],
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(markdown_report(selected, baseline, group_stats, args))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

