#!/usr/bin/env python3
"""Latexify Quintile bank prompts/answers/solutions/choices for KaTeX display.

Walks era packs, isomorphic banks, skills JSON, and diploma MCQ demos.
Does not double-wrap already-delimited math. Leaves accept[] plain for grading.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Callable

SITE = Path(__file__).resolve().parents[2]
DATA = SITE / "data"

MATH_HAS = re.compile(r"\$|\\\(|\\\[")
_MATH_SPAN = re.compile(
    r"(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))"
)
_PURE_NUM = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*$")
_PURE_FRAC = re.compile(r"^\s*(-?\d+)\s*/\s*(-?\d+)\s*$")
_SLOT = re.compile(r"§§(\d+)§§")

_WORD_NUM = {
    "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
}


def _norm_math(expr: str) -> str:
    expr = (
        expr.replace("−", "-")
        .replace("×", r"\times ")
        .replace("÷", r"\div ")
        .replace("²", "^2")
        .replace("³", "^3")
        .replace("¹", "^1")
        .replace("∫", r"\int ")
    )
    expr = re.sub(r"\s*=\s*", " = ", expr)
    expr = re.sub(r"\s*\+\s*", " + ", expr)
    # keep binary minus spaced; leave unary
    expr = re.sub(r"(?<=\w)\s*-\s*(?=\w|\d)", " - ", expr)
    return expr.strip()


def latexify_text(text: str | None, *, kind: str = "prompt") -> str | None:
    if text is None:
        return None
    if not isinstance(text, str):
        text = str(text)
    original = text

    if kind == "accept":
        return original

    if kind in ("answer", "choice") and _PURE_NUM.match(original):
        return f"${original.strip()}$"
    if kind in ("answer", "choice") and (m := _PURE_FRAC.match(original)):
        return f"$\\dfrac{{{m.group(1)}}}{{{m.group(2)}}}$"

    slots: list[str] = []

    def stash_raw(token: str) -> str:
        slots.append(token)
        return f"§§{len(slots) - 1}§§"

    def stash_math(expr: str, display: bool = False) -> str:
        body = _norm_math(expr)
        token = f"$${body}$$" if display else f"${body}$"
        return stash_raw(token)

    # Protect existing math first
    work = _MATH_SPAN.sub(lambda m: stash_raw(m.group(0)), original)

    def apply(pattern: re.Pattern[str], repl: Callable[[re.Match[str]], str]) -> None:
        nonlocal work
        work = pattern.sub(repl, work)

    # Percents
    apply(re.compile(r"(?<![\w§])(\d+(?:\.\d+)?)%"), lambda m: stash_math(m.group(1) + r"\%"))

    # Number + unit (keep unit outside math)
    apply(
        re.compile(
            r"(?<![\w§])(\d+(?:\.\d+)?)\s*"
            r"(km/h|m/s|mph|km|m|cm|mm|kg|g|mg|L|ml|hrs?|hours?|mins?|minutes?|sec|seconds?|liters?|litres?)\b"
        ),
        lambda m: stash_math(m.group(1)) + " " + m.group(2),
    )

    # Intervals / singleton sets
    apply(
        re.compile(r"(?<![§$\w])\((\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\)"),
        lambda m: stash_math(f"({m.group(1)},{m.group(2)})"),
    )
    apply(
        re.compile(r"(?<![§$\w])\[(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\]"),
        lambda m: stash_math(f"[{m.group(1)},{m.group(2)}]"),
    )
    apply(
        re.compile(r"(?<![§$\w])\{([a-zA-Z])\}"),
        lambda m: stash_math(r"\{" + m.group(1) + r"\}"),
    )

    # Manifolds / number systems
    apply(re.compile(r"(?<![\w\\§])S\^1\b"), lambda m: stash_math(r"S^{1}"))
    apply(re.compile(r"(?<![\w\\§])R\^n\b"), lambda m: stash_math(r"\mathbb{R}^{n}"))
    apply(re.compile(r"(?<![\w\\§])R\^2\b"), lambda m: stash_math(r"\mathbb{R}^{2}"))
    apply(re.compile(r"(?<![\w\\§])R\^3\b"), lambda m: stash_math(r"\mathbb{R}^{3}"))
    apply(re.compile(r"(?<![\w\\§])\bR\b"), lambda m: stash_math(r"\mathbb{R}"))
    apply(re.compile(r"(?<![\w\\§])\bZ\b"), lambda m: stash_math(r"\mathbb{Z}"))
    apply(re.compile(r"(?<![\w\\§])\bQ\b"), lambda m: stash_math(r"\mathbb{Q}"))
    apply(re.compile(r"(?<![\w\\§])\bin N\b"), lambda m: "in " + stash_math(r"\mathbb{N}"))

    # N-sided
    apply(
        re.compile(r"\b(two|three|four|five|six|seven|eight|nine|ten)-sided\b", re.I),
        lambda m: stash_math(_WORD_NUM[m.group(1).lower()]) + "-sided",
    )

    # Products (x+3)(x+1)
    apply(
        re.compile(r"(?<![\w§])(\([a-zA-Z0-9+\-−]+\)\([a-zA-Z0-9+\-−]+\))"),
        lambda m: stash_math(m.group(1)),
    )

    # Equations (longer first)
    apply(
        re.compile(
            r"(?<![§\w])("
            r"[a-zA-Z]\s*=\s*-?\d+(?:\.\d+)?\s*[a-zA-Z]?(?:\s*[+\-−]\s*-?\d+(?:\.\d+)?)?"
            r"|-?\d+(?:\.\d+)?\s*[a-zA-Z](?:\s*[+\-−]\s*-?\d+(?:\.\d+)?)?\s*=\s*-?\d+(?:\.\d+)?"
            r"|[a-zA-Z]\s*[+\-−]\s*-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?"
            r"|[a-zA-Z](?:\^2|²)\s*[+\-−]\s*\d+"
            r")"
        ),
        lambda m: stash_math(m.group(1)),
    )

    # Bare numbers last (slots already protected)
    apply(
        re.compile(r"(?<![\w§])(-?\d+(?:\.\d+)?)(?![\w%])"),
        lambda m: stash_math(m.group(1)),
    )

    # Restore slots (nested-safe: multiple passes)
    def restore(s: str) -> str:
        prev = None
        while prev != s:
            prev = s
            s = _SLOT.sub(lambda m: slots[int(m.group(1))], s)
        return s

    result = restore(work)

    if kind == "prompt" and not MATH_HAS.search(result):
        if re.search(r"how many sides", result, re.I):
            result = re.sub(r"\?(\s*)$", r"? Enter the integer $n$.\1", result, count=1)
        elif re.search(r"empty set", result, re.I):
            result = re.sub(r"\bempty set\b", r"empty set $\emptyset$", result, count=1, flags=re.I)
        if not MATH_HAS.search(result):
            if result.rstrip().endswith("?"):
                result = result.rstrip()[:-1] + r" ($n$ or yes/no)?"
            else:
                result = result.rstrip() + r" ($n$)"

    return result


def latexify_item(item: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(item, dict):
        return item
    out = dict(item)
    if isinstance(out.get("prompt"), str):
        out["prompt"] = latexify_text(out["prompt"], kind="prompt")
    if isinstance(out.get("q"), str):
        out["q"] = latexify_text(out["q"], kind="prompt")
    if isinstance(out.get("answer"), str):
        out["answer"] = latexify_text(out["answer"], kind="answer")
    if isinstance(out.get("solution"), str):
        out["solution"] = latexify_text(out["solution"], kind="solution")
    if isinstance(out.get("note"), str):
        out["note"] = latexify_text(out["note"], kind="solution")
    if isinstance(out.get("choices"), list):
        out["choices"] = [
            latexify_text(c, kind="choice") if isinstance(c, str) else c for c in out["choices"]
        ]
    return out


def walk_and_latexify(obj: Any) -> tuple[Any, int]:
    touched = 0
    if isinstance(obj, dict):
        if "prompt" in obj and isinstance(obj.get("prompt"), str):
            return latexify_item(obj), 1
        new = {}
        for k, v in obj.items():
            nv, t = walk_and_latexify(v)
            new[k] = nv
            touched += t
        return new, touched
    if isinstance(obj, list):
        new_list = []
        for x in obj:
            nx, t = walk_and_latexify(x)
            new_list.append(nx)
            touched += t
        return new_list, touched
    return obj, 0


def count_plain_prompts(obj: Any) -> tuple[int, int]:
    total = plain = 0
    if isinstance(obj, dict):
        if "prompt" in obj and isinstance(obj.get("prompt"), str):
            return 1, 0 if MATH_HAS.search(obj["prompt"]) else 1
        for v in obj.values():
            t, p = count_plain_prompts(v)
            total += t
            plain += p
    elif isinstance(obj, list):
        for x in obj:
            t, p = count_plain_prompts(x)
            total += t
            plain += p
    return total, plain


TARGET_FILES = [
    "banks/era-beyond.json",
    "banks/era-bridge.json",
    "banks/era-counting.json",
    "banks/era-diploma.json",
    "banks/era-secondary.json",
    "banks/era-university.json",
    "banks/era-workshop.json",
    "isomorphic_banks.json",
    "skills_emh.json",
    "skills.json",
    "diploma_past_papers.json",
]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--root", type=Path, default=DATA)
    args = ap.parse_args()
    root: Path = args.root

    before_total = before_plain = 0
    after_total = after_plain = 0
    report = []

    for rel in TARGET_FILES:
        path = root / rel
        if not path.exists():
            print(f"skip missing {path}", file=sys.stderr)
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        t0, p0 = count_plain_prompts(data)
        before_total += t0
        before_plain += p0
        new_data, touched = walk_and_latexify(data)
        t1, p1 = count_plain_prompts(new_data)
        after_total += t1
        after_plain += p1
        report.append((path.name, t0, p0, t1, p1, touched))
        if not args.dry_run:
            path.write_text(
                json.dumps(new_data, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

    print("file\tbefore_items\tbefore_plain\tafter_items\tafter_plain\ttouched")
    for row in report:
        print("\t".join(map(str, row)))
    print(
        f"TOTAL\t{before_total}\t{before_plain}\t{after_total}\t{after_plain}\t"
        f"plain% {100 * after_plain / max(after_total, 1):.3f}%"
    )
    print(f"math_coverage_after={100 * (after_total - after_plain) / max(after_total, 1):.3f}%")
    return 0


if __name__ == "__main__":
    sys.exit(main())
