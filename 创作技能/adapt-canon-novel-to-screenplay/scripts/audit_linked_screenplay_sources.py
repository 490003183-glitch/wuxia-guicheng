#!/usr/bin/env python3
# Copyright (c) 2026 mtgh. Licensed under mtgh Noncommercial Software License 1.0; see LICENSE-TOOLS.
"""Report screenplay files whose recorded novel source hash is stale."""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
import sys


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_frontmatter(path: Path) -> dict[str, str]:
    fields: dict[str, str] = {}
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        if handle.readline().strip() != "---":
            return fields
        for line in handle:
            stripped = line.rstrip("\n")
            if stripped.strip() == "---":
                break
            if not stripped or stripped[0].isspace() or ":" not in stripped:
                continue
            key, value = stripped.split(":", 1)
            fields[key.strip()] = value.strip().strip("\"'")
    return fields


def resolve_source(value: str, vault_root: Path) -> Path:
    source = Path(value).expanduser()
    if not source.is_absolute():
        source = vault_root / source
    return source.resolve(strict=False)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Find linked screenplay Markdown files with stale source_novel_sha256 values."
    )
    parser.add_argument("--novel", required=True, type=Path)
    parser.add_argument("--search-root", required=True, type=Path)
    parser.add_argument("--vault-root", required=True, type=Path)
    args = parser.parse_args()

    novel = args.novel.expanduser().resolve(strict=True)
    search_root = args.search_root.expanduser().resolve(strict=True)
    vault_root = args.vault_root.expanduser().resolve(strict=True)
    current_hash = sha256(novel)

    linked = 0
    stale = 0
    missing_hash = 0

    print(f"SOURCE\t{current_hash}\t{novel}")
    for candidate in sorted(search_root.rglob("*.md")):
        if candidate.resolve(strict=False) == novel:
            continue
        fields = read_frontmatter(candidate)
        source_value = fields.get("source_novel")
        if not source_value:
            continue
        if resolve_source(source_value, vault_root) != novel:
            continue

        linked += 1
        recorded_hash = fields.get("source_novel_sha256", "")
        if not recorded_hash:
            missing_hash += 1
            print(f"MISSING_HASH\t-\t{candidate}")
        elif recorded_hash != current_hash:
            stale += 1
            print(f"STALE\t{recorded_hash}\t{candidate}")
        else:
            print(f"OK\t{recorded_hash}\t{candidate}")

    print(
        f"SUMMARY\tlinked={linked}\tstale={stale}\tmissing_hash={missing_hash}"
    )
    return 1 if stale or missing_hash else 0


if __name__ == "__main__":
    sys.exit(main())
