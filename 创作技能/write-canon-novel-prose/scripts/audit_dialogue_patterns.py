#!/usr/bin/env python3
# Copyright (c) 2026 mtgh. Licensed under mtgh Noncommercial Software License 1.0; see LICENSE-TOOLS.
"""Audit Chinese novel dialogue for user-rejected Codex-voice patterns."""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from dataclasses import asdict, dataclass
from pathlib import Path


QUOTE_RE = re.compile(r"“([^”\n]{1,240})”")
PUNCT_RE = re.compile(r"[。！？!?]+$")
HAN_RE = re.compile(r"[\u4e00-\u9fff]")


@dataclass
class Finding:
    severity: str
    code: str
    path: str
    line: int
    message: str
    excerpt: str


def line_number(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def clean_quote(value: str) -> str:
    return PUNCT_RE.sub("", value.strip())


def han_length(value: str) -> int:
    return len(HAN_RE.findall(value))


def extract_quotes(text: str) -> list[tuple[str, int]]:
    return [(match.group(1).strip(), line_number(text, match.start())) for match in QUOTE_RE.finditer(text)]


def audit_text(text: str, path: str) -> list[Finding]:
    findings: list[Finding] = []
    quotes = extract_quotes(text)

    for index, (quote, line) in enumerate(quotes):
        normalized = clean_quote(quote)

        if re.search(r"不是[^，。！？!?\n]{1,40}[，,；;]?\s*(?:而)?是", normalized):
            findings.append(Finding(
                "ERROR", "C003", path, line,
                "纠正式“不是 A／而是 B”对白", quote,
            ))

        personified_coaching = (
            re.search(r"别跟.{1,14}(?:抢|较劲|对着干|硬碰|硬来)", normalized)
            or re.search(r"(?:让|看).{0,10}(?:能不能|会不会).{0,10}(?:跟上|追上)你", normalized)
        )
        if personified_coaching:
            findings.append(Finding(
                "ERROR", "C002", path, line,
                "拟人化教练金句；应改为具体观察、后果、短指令或删除", quote,
            ))

        if re.fullmatch(r"今天放哪些", normalized):
            findings.append(Finding(
                "ERROR", "C007", path, line,
                "已确认的作者搭台式提问；检查人物是否已知答案并删除整组问答", quote,
            ))

        if re.match(r"算我(?:们)?[^，。！？!?]{1,24}$", normalized):
            findings.append(Finding(
                "REVIEW", "R001", path, line,
                "“算我……”让步模板，需要具体人物动机证明", quote,
            ))

        if re.match(r"(?:所以|说白了|换句话说|这就叫|你可以这么理解)", normalized):
            findings.append(Finding(
                "REVIEW", "R002", path, line,
                "解释或总结式开头，检查是否在替作者收束", quote,
            ))

        if re.match(r"^所以(?:先|就|别|不要|得|该|你|我们)", normalized):
            findings.append(Finding(
                "REVIEW", "R006", path, line,
                "“所以”后接命令或判断，检查是否在替交换制造漂亮封口", quote,
            ))

        operational_second_beat = re.match(
            r"^[^。！？!?]{1,6}。(?:它|你|他|她)[^。！？!?]{1,16}(?:就|再|才)(?:停|走|收手|松开|回来|继续)$",
            normalized,
        )
        if operational_second_beat:
            findings.append(Finding(
                "REVIEW", "R007", path, line,
                "短回答后追加完整操作条件，检查是否把自然交流写成说明书第二拍", quote,
            ))

        if index + 1 < len(quotes):
            next_quote, next_line = quotes[index + 1]
            first = clean_quote(quote)
            second = clean_quote(next_quote)
            accusation = re.match(r"^你(?:刚才|又|已经|明明|其实)?[^，。！？!?]{1,18}(?:了|过)?$", first)
            denial = re.match(r"^(?:我(?:没有|没|哪有)|哪有|没有)(?:[^，。！？!?]{0,10})$", second)
            if accusation and denial:
                findings.append(Finding(
                    "ERROR", "C001", path, line,
                    f"镜像否认对拍，下一句位于第 {next_line} 行", f"“{quote}” / “{next_quote}”",
                ))

    paragraphs = []
    offset = 0
    for item in text.split("\n\n"):
        paragraphs.append((item.strip(), line_number(text, offset)))
        offset += len(item) + 2
    run: list[tuple[str, int]] = []
    for paragraph, paragraph_line in paragraphs + [("", -1)]:
        if re.fullmatch(r"“[^”\n]+”", paragraph):
            run.append((paragraph, paragraph_line))
            continue
        if len(run) >= 4:
            excerpt = " / ".join(item[0] for item in run[:4])
            findings.append(Finding(
                "REVIEW", "R003", path, run[0][1],
                f"连续 {len(run)} 个裸对白段落，检查相声式对拍和无动作缓冲", excerpt,
            ))
        run = []

    for match in re.finditer(r"(?:停了一会儿|顿了顿|沉默了?片刻|过了片刻)", text):
        findings.append(Finding(
            "REVIEW", "R005", path, line_number(text, match.start()),
            "通用停顿词，检查是否只在替作者宣布潜台词而无具体后果", match.group(0),
        ))

    lengths = [han_length(quote) for quote, _ in quotes]
    if len(lengths) >= 12:
        median = statistics.median(lengths)
        micro_count = sum(length <= 8 for length in lengths)
        micro_share = micro_count / len(lengths)
        if median <= 6 and micro_share >= 0.70:
            findings.append(Finding(
                "REVIEW", "R004", path, quotes[0][1],
                f"全篇对白可能过度压缩：{len(lengths)} 个话轮，中位数 {median:g} 汉字，1–8 字占 {micro_share:.1%}；按场景模式人工复核",
                "scene-level dialogue ecology",
            ))

    return findings


def run_self_test() -> int:
    micro_run = "\n\n".join(["“嗯。”", "“走。”", "“哪？”", "“这里。”", "“现在？”", "“等。”"] * 2)
    bad = (
        "“你动了。”\n\n“我没有。”\n\n“别跟它抢。今天看它能不能跟上你。”\n\n"
        "“不是抬脚，是先移重心。”\n\n“今天放哪些？”\n\n“腿。”\n\n"
        "他停了一会儿。\n\n“所以别走第二趟。”\n\n“走吧。你看见灯就停。”\n\n" + micro_run
    )
    good = "压力读数从左侧掉了四格。\n\n“腰回正。”\n\n她照做，警示色退回绿色。"
    bad_codes = {finding.code for finding in audit_text(bad, "bad")}
    good_errors = [finding for finding in audit_text(good, "good") if finding.severity == "ERROR"]
    expected = {"C001", "C002", "C003", "C007", "R004", "R005", "R006", "R007"}
    if not expected.issubset(bad_codes) or good_errors:
        print(json.dumps({"bad_codes": sorted(bad_codes), "good_errors": [asdict(x) for x in good_errors]}, ensure_ascii=False, indent=2))
        return 1
    print("self-test: PASS")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", help="Markdown or text files to audit")
    parser.add_argument("--json", action="store_true", dest="as_json")
    parser.add_argument("--fail-on", choices=("error", "review", "none"), default="error")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()
    if not args.paths:
        parser.error("provide at least one file or use --self-test")

    findings: list[Finding] = []
    for raw_path in args.paths:
        path = Path(raw_path).expanduser().resolve()
        findings.extend(audit_text(path.read_text(encoding="utf-8"), str(path)))

    if args.as_json:
        print(json.dumps([asdict(item) for item in findings], ensure_ascii=False, indent=2))
    else:
        for item in findings:
            print(f"{item.severity} {item.code} {item.path}:{item.line} {item.message}")
            print(f"  {item.excerpt}")
        errors = sum(item.severity == "ERROR" for item in findings)
        reviews = sum(item.severity == "REVIEW" for item in findings)
        print(f"summary: errors={errors} reviews={reviews}")

    if args.fail_on == "error" and any(item.severity == "ERROR" for item in findings):
        return 2
    if args.fail_on == "review" and findings:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
