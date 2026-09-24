"""Shared utilities for era-pack generation."""
from __future__ import annotations

import hashlib
import json
import math
import random
from fractions import Fraction
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

SOURCE = "era-pack-v1"


def seed_key(*parts: Any) -> int:
    s = "|".join(str(p) for p in parts)
    return int(hashlib.sha256(s.encode()).hexdigest()[:16], 16)


def rng_for(*parts: Any) -> random.Random:
    return random.Random(seed_key(*parts))


def stage_for(i: int) -> str:
    r = (i * 7 + 3) % 100
    if r < 40:
        return "easy"
    if r < 75:
        return "medium"
    return "hard"


def norm_tok(s: str) -> str:
    t = str(s).strip().replace("$", "").replace("\\,", "")
    t = t.replace("\\dfrac", "/").replace("\\frac", "/")
    t = t.replace("{", "").replace("}", "").replace("\\times", "*")
    t = "".join(t.split()).replace("−", "-").lower()
    t = t.replace("\\pi", "pi").replace("π", "pi")
    return t


def accept_of(*vals: Any) -> List[str]:
    seen, out = set(), []
    for v in vals:
        if v is None:
            continue
        s = str(v).strip()
        if not s:
            continue
        for cand in (s, s.replace("$", ""), norm_tok(s)):
            k = norm_tok(cand)
            if k and k not in seen:
                seen.add(k)
                out.append(cand if cand else k)
    return out or ["0"]


def latex_frac(n: int, d: int) -> str:
    f = Fraction(n, d)
    if f.denominator == 1:
        return str(f.numerator)
    sign = "-" if f < 0 else ""
    a = abs(f)
    return f"{sign}\\dfrac{{{a.numerator}}}{{{a.denominator}}}"


def fmt_ans(answer: Any) -> str:
    s = str(answer).strip()
    if s.lower() in ("yes", "no") or s.startswith("x") or " or " in s:
        return s
    if s.startswith("$"):
        return s
    return f"${s}$"


def make_item(
    *,
    topic_id: str,
    idx: int,
    prompt: str,
    answer: Any,
    solution: str,
    stage: Optional[str] = None,
    extra_accept: Sequence[Any] = (),
    skill: str = "",
) -> dict:
    st = stage or stage_for(idx)
    ans = fmt_ans(answer)
    acc = accept_of(ans, answer, *extra_accept)
    assert prompt and ans and acc
    return {
        "id": f"{topic_id}-{idx:04d}",
        "stage": st,
        "difficulty": {"easy": 1, "medium": 2, "hard": 3}[st],
        "prompt": prompt,
        "answer": ans,
        "solution": solution,
        "accept": acc,
        "source": SOURCE,
        "skill": skill,
    }


def write_era(path: Path, era: str, target: int, topics: List[dict], courses: Dict[str, int]) -> dict:
    actual = sum(len(t["items"]) for t in topics)
    meta = {
        "era": era,
        "target": target,
        "actual": actual,
        "courses": courses,
        "topics": len(topics),
        "note": "era-pack-v1 parametric clones; not copyrighted worksheet text",
    }
    payload = {"meta": meta, "topics": topics}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    return meta
