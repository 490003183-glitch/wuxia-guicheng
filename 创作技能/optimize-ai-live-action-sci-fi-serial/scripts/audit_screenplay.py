#!/usr/bin/env python3
# Copyright (c) 2026 mtgh
# SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
# See repository LICENSE-TOOLS. Commercial use requires separate written authorization.
"""Deterministic pre-scan for Chinese AI-live-action serial screenplays.

This utility reports heuristic signals only. It never edits the source and must
not be used as an automatic pass/fail system. Canon novel chapters are detected
and skipped because screenplay scene/dialogue statistics are invalid for prose.
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


SPEAKER_RE = re.compile(
    r"^\s*(?P<speaker>[\u4e00-\u9fffA-Za-z·]{1,12})"
    r"(?:（[^）\n]{0,30}）|\([^\)\n]{0,30}\))?\s*[：:]\s*(?P<text>.+?)\s*$"
)
SCENE_RE = re.compile(
    r"^\s*(?:#{1,6}\s*)?(?:第?\s*[一二三四五六七八九十百0-9A-Z]+\s*[场幕](?:\s*[：:].*)?|"
    r"[一二三四五六七八九十百]+[、.．]\s*\S+|(?:INT\.?|EXT\.?)\s+)",
    re.IGNORECASE,
)
H001_RE = re.compile(r"不是[^。！？!?\n]{1,24}?[，,、\s]?而是")
EXPOSITION_RE = re.compile(
    r"所谓|也就是说|简单来说|换句话说|资料显示|根据记录|历史上|早在|"
    r"这意味着|你要知道|事实上|我们的研究|系统显示|报告显示|"
    r"它的原理|原因是|解释一下"
)
CLIFF_RE = re.compile(r"明天你就知道|以后你会知道|到时候你就明白|下次再说|欲知后事")
ACTION_VERB_RE = re.compile(
    r"冲|跑|抓|推|拉|砸|打|击|开枪|拔枪|射击|躲|闪|跪|倒|"
    r"打开|关闭|启动|停止|爆炸|坍塌|移动|消失|出现|拿出|递给|"
    r"检查|扫描|锁定|解除|销毁|拆除|进入|离开|回头|抬手|按下"
)
CODE_TERM_RE = re.compile(r"\b[A-Z]{2,}(?:-[A-Z0-9]+)*\d*\b")
QUOTED_TERM_RE = re.compile(r"[「『《]([^」』》\n]{2,18})[」』》]")
SENTENCE_SPLIT_RE = re.compile(r"[。！？!?；;]+")
METADATA_SPEAKERS = {
    "状态",
    "时间",
    "地点",
    "出场",
    "出场人物",
    "场景",
    "标题",
    "备注",
    "旁白原文",
    "定稿口径",
    "预计成片时长",
}
METADATA_LABEL_RE = re.compile(
    r"(?:口径|时长|目标|说明|状态|时间|地点|出场人物|标题|场景|依据|来源|"
    r"边界|版本|信息等级|预计时长)$"
)
SPEAKER_ACTION_RE = re.compile(
    r"^(?P<speaker>[\u4e00-\u9fffA-Za-z·]{1,8}?)(?:走|看|说|问|笑|微笑|"
    r"小声|低声|高声|很|转头|回头|抬|停|立刻|明显|偷笑|对)"
)
FRONTMATTER_TYPE_RE = re.compile(r"^type:\s*(?P<type>.+?)\s*$")


@dataclass
class Finding:
    category: str
    line: int
    severity: str
    evidence: str
    note: str


def visible_length(text: str) -> int:
    return len(re.sub(r"[\s，。！？!?、；;：:\"'“”‘’（）()]", "", text))


def normalize_sentence(text: str) -> str:
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"[，。！？!?、；;：:\"'“”‘’（）()\-—…]", "", text)
    return text


def parse_dialogue(line: str) -> tuple[str, str] | None:
    if SCENE_RE.search(line.strip()):
        return None
    match = SPEAKER_RE.match(line)
    if not match:
        return None
    candidate = match.group("speaker").strip()
    dialogue = match.group("text").strip()
    if candidate in METADATA_SPEAKERS or METADATA_LABEL_RE.search(candidate):
        return None
    action_match = SPEAKER_ACTION_RE.match(candidate)
    if action_match:
        candidate = action_match.group("speaker")
    if candidate in METADATA_SPEAKERS or METADATA_LABEL_RE.search(candidate) or not candidate:
        return None
    return candidate, dialogue


def load_terms(args: argparse.Namespace) -> set[str]:
    terms = {term.strip() for term in args.known_term if term.strip()}
    if args.term_file:
        for line in Path(args.term_file).read_text(encoding="utf-8").splitlines():
            term = line.strip()
            if term and not term.startswith("#"):
                terms.add(term)
    return terms


def iter_source_files(path: Path) -> Iterable[Path]:
    if path.is_file():
        yield path
        return
    for candidate in sorted(path.rglob("*")):
        if candidate.is_file() and candidate.suffix.lower() in {".md", ".txt", ".screenplay"}:
            yield candidate


def detect_document_type(raw: str, path: Path) -> str:
    lines = raw.splitlines()
    if lines and lines[0].strip() == "---":
        for line in lines[1:]:
            if line.strip() == "---":
                break
            match = FRONTMATTER_TYPE_RE.match(line.strip())
            if not match:
                continue
            declared = match.group("type").strip().strip('"\'')
            if "小说" in declared:
                return "novel"
            if "剧本" in declared:
                return "screenplay"
    if path.suffix.lower() == ".screenplay":
        return "screenplay"
    return "unknown"


def scan_file(path: Path, args: argparse.Namespace, known_terms: set[str]) -> dict:
    raw = path.read_text(encoding="utf-8")
    document_type = (
        args.input_kind
        if args.input_kind != "auto"
        else detect_document_type(raw, path)
    )
    if document_type == "novel":
        return {
            "file": str(path.resolve()),
            "document_type": "novel",
            "skipped": True,
            "skip_reason": (
                "检测到小说章节；剧本场景、说话者和对白格式统计不适用。请按爽剧 skill 的小说输入分支人工核查入口、任务、机制、兑现、人物、结尾钩子与里程碑债务。"
            ),
        }

    lines = raw.splitlines()
    findings: list[Finding] = []
    speakers: Counter[str] = Counter()
    dialogue_lengths: list[int] = []
    scenes: list[tuple[int, str]] = []
    sentence_locations: dict[str, list[tuple[int, str]]] = defaultdict(list)
    term_counts: Counter[str] = Counter()
    in_code_fence = False
    frontmatter = bool(lines and lines[0].strip() == "---")
    frontmatter_closed = not frontmatter

    for line_no, line in enumerate(lines, start=1):
        stripped = line.strip()

        if frontmatter and not frontmatter_closed:
            if line_no > 1 and stripped == "---":
                frontmatter_closed = True
            continue

        if stripped.startswith("```"):
            in_code_fence = not in_code_fence
            continue
        if in_code_fence or not stripped:
            continue

        if SCENE_RE.search(stripped):
            scenes.append((line_no, stripped[:100]))

        parsed_dialogue = parse_dialogue(line)
        if parsed_dialogue:
            speaker, dialogue = parsed_dialogue
            speakers[speaker] += 1
            length = visible_length(dialogue)
            dialogue_lengths.append(length)

            if length > args.max_dialogue_chars:
                findings.append(
                    Finding(
                        "long_dialogue",
                        line_no,
                        "medium",
                        dialogue[:120],
                        f"对白约{length}个可见字符，超过阈值{args.max_dialogue_chars}；检查表演、嘴型和信息负荷。",
                    )
                )
            if H001_RE.search(dialogue):
                findings.append(
                    Finding(
                        "spoken_not_but_pattern",
                        line_no,
                        "high",
                        dialogue[:120],
                        "疑似命中 spoken ‘不是A，而是B’ 修辞模板；结合角色语境人工复核。",
                    )
                )
            if EXPOSITION_RE.search(dialogue):
                findings.append(
                    Finding(
                        "exposition_cue",
                        line_no,
                        "review",
                        dialogue[:120],
                        "疑似说明句；检查信息是否立即改变行动或被下一节拍验证。",
                    )
                )
            if CLIFF_RE.search(dialogue):
                findings.append(
                    Finding(
                        "deferred_payoff_cue",
                        line_no,
                        "review",
                        dialogue[:120],
                        "疑似延迟兑现语句；确认本集是否已有独立状态变化。",
                    )
                )

        for term in CODE_TERM_RE.findall(stripped):
            term_counts[term] += 1
        for term in QUOTED_TERM_RE.findall(stripped):
            if visible_length(term) >= 2:
                term_counts[term] += 1
        for term in known_terms:
            if term in stripped:
                term_counts[term] += stripped.count(term)

        for sentence in SENTENCE_SPLIT_RE.split(stripped):
            normalized = normalize_sentence(sentence)
            if len(normalized) >= args.min_repeat_chars:
                sentence_locations[normalized].append((line_no, sentence.strip()))

    for normalized, locations in sentence_locations.items():
        if len(locations) >= args.repeat_threshold:
            for line_no, evidence in locations:
                findings.append(
                    Finding(
                        "repeated_sentence",
                        line_no,
                        "review",
                        evidence[:120],
                        f"规范化后相同/近同句出现{len(locations)}次；检查是否为有意回环或机械重复。",
                    )
                )

    scene_action_counts: list[dict] = []
    if scenes:
        boundaries = scenes + [(len(lines) + 1, "<END>")]
        for idx, (start, heading) in enumerate(scenes):
            end = boundaries[idx + 1][0]
            segment = "\n".join(lines[start - 1 : end - 1])
            action_hits = len(ACTION_VERB_RE.findall(segment))
            scene_speakers = set()
            for segment_line in lines[start - 1 : end - 1]:
                segment_dialogue = parse_dialogue(segment_line)
                if segment_dialogue:
                    scene_speakers.add(segment_dialogue[0])
            scene_action_counts.append(
                {
                    "line": start,
                    "heading": heading,
                    "action_verb_hits": action_hits,
                    "speaker_count": len(scene_speakers),
                }
            )
            if len(scene_speakers) >= args.high_scene_speakers:
                findings.append(
                    Finding(
                        "multi_speaker_scene",
                        start,
                        "medium",
                        heading[:120],
                        f"本场检测到{len(scene_speakers)}名说话者；检查多人嘴型、视线和站位连续性。",
                    )
                )

    proper_terms = [
        {"term": term, "count": count}
        for term, count in term_counts.most_common()
        if count >= 1
    ]
    findings.sort(key=lambda item: (item.line, item.category))

    dialogue_stats = {
        "count": len(dialogue_lengths),
        "max_visible_chars": max(dialogue_lengths, default=0),
        "median_visible_chars": round(statistics.median(dialogue_lengths), 1)
        if dialogue_lengths
        else 0,
        "over_threshold": sum(length > args.max_dialogue_chars for length in dialogue_lengths),
    }

    return {
        "file": str(path.resolve()),
        "document_type": document_type,
        "skipped": False,
        "heuristic_warning": "Signals are review prompts, not factual errors or automatic rewrite instructions.",
        "stats": {
            "lines": len(lines),
            "scenes_detected": len(scenes),
            "speakers": dict(speakers.most_common()),
            "dialogue": dialogue_stats,
            "candidate_terms": proper_terms,
        },
        "scene_load": scene_action_counts,
        "findings": [asdict(item) for item in findings],
    }


def render_markdown(results: list[dict]) -> str:
    chunks = [
        "# 爽剧确定性预扫描",
        "",
        "> 所有命中均为启发式复核信号，不是事实错误、质量总分或自动改写指令。",
        "",
    ]
    for result in results:
        if result.get("skipped"):
            chunks.extend(
                [
                    f"## {result['file']}",
                    "",
                    f"- 输入类型：{result['document_type']}",
                    "- 预扫描状态：已跳过",
                    f"- 原因：{result['skip_reason']}",
                    "",
                ]
            )
            continue
        stats = result["stats"]
        dialogue = stats["dialogue"]
        chunks.extend(
            [
                f"## {result['file']}",
                "",
                f"- 输入类型：{result['document_type']}",
                f"- 行数：{stats['lines']}",
                f"- 检测场景：{stats['scenes_detected']}",
                f"- 说话角色：{len(stats['speakers'])}",
                f"- 对白：{dialogue['count']}句；中位长度{dialogue['median_visible_chars']}；最长{dialogue['max_visible_chars']}；超阈值{dialogue['over_threshold']}句",
                f"- 候选专名：{len(stats['candidate_terms'])}",
                "",
                "### 命中",
                "",
            ]
        )
        if not result["findings"]:
            chunks.append("未命中预设规则。仍需人工完成正典、结构、科幻因果和AI制作审计。")
        else:
            chunks.extend(
                [
                    "| 行 | 类别 | 级别 | 证据 | 复核提示 |",
                    "|---:|---|---|---|---|",
                ]
            )
            for finding in result["findings"]:
                evidence = finding["evidence"].replace("|", "\\|").replace("\n", " ")
                note = finding["note"].replace("|", "\\|").replace("\n", " ")
                chunks.append(
                    f"| {finding['line']} | {finding['category']} | {finding['severity']} | {evidence} | {note} |"
                )
        chunks.extend(["", "### 场景负荷", ""])
        if result["scene_load"]:
            chunks.extend(
                [
                    "| 行 | 场景 | 动作词命中 | 说话者数 |",
                    "|---:|---|---:|---:|",
                ]
            )
            for scene in result["scene_load"]:
                heading = scene["heading"].replace("|", "\\|")
                chunks.append(
                    f"| {scene['line']} | {heading} | {scene['action_verb_hits']} | {scene['speaker_count']} |"
                )
        else:
            chunks.append("未识别到明确场景标题；可能需要适配输入格式。")
        chunks.append("")
    return "\n".join(chunks).rstrip() + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", help="Screenplay file or directory (.md/.txt/.screenplay).")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument(
        "--input-kind",
        choices=("auto", "screenplay", "novel"),
        default="auto",
        help="Override automatic document-type detection.",
    )
    parser.add_argument("--output", help="Optional output path; stdout by default.")
    parser.add_argument("--max-dialogue-chars", type=int, default=42)
    parser.add_argument("--min-repeat-chars", type=int, default=8)
    parser.add_argument("--repeat-threshold", type=int, default=2)
    parser.add_argument("--high-scene-speakers", type=int, default=4)
    parser.add_argument("--known-term", action="append", default=[])
    parser.add_argument("--term-file")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = Path(args.path).expanduser()
    if not source.exists():
        print(f"error: path not found: {source}", file=sys.stderr)
        return 2
    if args.max_dialogue_chars < 1 or args.repeat_threshold < 2:
        print("error: invalid thresholds", file=sys.stderr)
        return 2

    known_terms = load_terms(args)
    files = list(iter_source_files(source))
    if not files:
        print("error: no supported screenplay files found", file=sys.stderr)
        return 2

    results = [scan_file(path, args, known_terms) for path in files]
    if args.format == "json":
        rendered = json.dumps(results, ensure_ascii=False, indent=2) + "\n"
    else:
        rendered = render_markdown(results)

    if args.output:
        Path(args.output).expanduser().write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
