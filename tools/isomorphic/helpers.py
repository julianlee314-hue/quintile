"""Shared helpers for isomorphic bank generation."""
from __future__ import annotations

import hashlib
import math
import random
import re
from fractions import Fraction
from typing import Any, Callable, Iterable, List, Optional, Sequence, Tuple


def slugify(title: str) -> str:
    s = title.lower()
    s = s.replace("—", "-").replace("–", "-")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    # shorten noisy parentheticals for id stability
    s = s.replace("standard-form-prompts", "standard-form")
    s = s.replace("w-factoring-fundamental-identities", "factoring-identities")
    return "iso-" + s[:72]


def seed_for(title: str) -> int:
    return int(hashlib.sha256(title.encode("utf-8")).hexdigest()[:16], 16)


def stage_mix(n: int) -> List[str]:
    """~40% easy / 35% medium / 25% hard, deterministic order by index."""
    out = []
    for i in range(n):
        r = (i * 7 + 3) % 100
        if r < 40:
            out.append("easy")
        elif r < 75:
            out.append("medium")
        else:
            out.append("hard")
    # ensure all three appear when n>=3
    if n >= 3:
        out[0], out[min(1, n - 1)], out[min(2, n - 1)] = "easy", "medium", "hard"
    return out


def difficulty_num(stage: str) -> int:
    return {"easy": 1, "medium": 2, "hard": 3}.get(stage, 2)


def fmt_num(x: Any) -> str:
    if isinstance(x, Fraction):
        if x.denominator == 1:
            return str(x.numerator)
        return f"{x.numerator}/{x.denominator}"
    if isinstance(x, float):
        if abs(x - round(x)) < 1e-9:
            return str(int(round(x)))
        return format(x, ".10g")
    if isinstance(x, int):
        return str(x)
    return str(x)


def latex_num(x: Any) -> str:
    if isinstance(x, Fraction):
        if x.denominator == 1:
            return str(x.numerator)
        sign = "-" if x < 0 else ""
        a = abs(x)
        return f"{sign}\\dfrac{{{a.numerator}}}{{{a.denominator}}}"
    return fmt_num(x)


def normalize_accept_token(s: str) -> str:
    t = s.strip()
    t = t.replace("$", "").replace("\\,", "").replace("\\ ", "")
    t = t.replace("\\left", "").replace("\\right", "")
    t = t.replace("\\dfrac", "/").replace("\\frac", "/")
    t = t.replace("{", "").replace("}", "")
    t = t.replace("\\times", "*").replace("\\cdot", "*")
    t = re.sub(r"\s+", "", t)
    t = t.replace("−", "-")
    # unicode pi
    t = t.replace("π", "pi").replace("\\pi", "pi")
    return t.lower()


def accept_forms(*raw: Any) -> List[str]:
    """Build accept list including normalized forms of computed answers."""
    seen = set()
    out: List[str] = []
    for r in raw:
        if r is None:
            continue
        s = str(r).strip()
        if not s:
            continue
        candidates = [s, normalize_accept_token(s)]
        # fraction ↔ decimal light
        if isinstance(r, Fraction) and r.denominator != 1:
            candidates.append(fmt_num(r))
            candidates.append(str(float(r)))
            candidates.append(f"{r.numerator}/{r.denominator}")
        if isinstance(r, (int, float)) and not isinstance(r, bool):
            candidates.append(fmt_num(r))
            if isinstance(r, float) and abs(r - round(r)) < 1e-9:
                candidates.append(str(int(round(r))))
        for c in candidates:
            n = normalize_accept_token(c) if c else ""
            key = n or c
            if key and key not in seen:
                seen.add(key)
                out.append(c if c == n or "$" in c or "\\" in c else c)
                if n and n not in seen:
                    seen.add(n)
                    out.append(n)
    # ensure at least one
    return out or ["0"]


def signed_term(coef: int, var: str = "x", first: bool = False) -> str:
    if coef == 0:
        return ""
    abs_c = abs(coef)
    if var:
        body = var if abs_c == 1 else f"{abs_c}{var}"
    else:
        body = str(abs_c)
    if first:
        return f"-{body}" if coef < 0 else body
    return f" - {body}" if coef < 0 else f" + {body}"


def linear_expr(a: int, b: int, var: str = "x") -> str:
    """ax+b as latex-ish plain string."""
    if a == 0:
        return str(b)
    s = signed_term(a, var, first=True)
    if b:
        s += signed_term(b, "", first=False)
    return s


def item(
    *,
    prompt: str,
    answer: str,
    solution: str,
    stage: str,
    accept: Optional[Sequence[Any]] = None,
    clone_of: str,
) -> dict:
    acc = list(accept) if accept else accept_forms(answer)
    # guarantee normalized answer in accept
    na = normalize_accept_token(answer)
    if na and na not in [normalize_accept_token(x) for x in acc]:
        acc.append(na)
    if not prompt or not answer:
        raise ValueError("empty prompt/answer")
    return {
        "stage": stage,
        "difficulty": difficulty_num(stage),
        "prompt": prompt,
        "answer": answer if answer.startswith("$") else f"${answer}$" if any(c in answer for c in r"\^_{}") or answer[:1].isdigit() or answer[:1] in "-(" else answer,
        "solution": solution,
        "accept": acc,
        "cloneOfSection": clone_of,
        "source": "isomorphic-free-worksheet-map",
    }


def pretty_answer(ans: Any) -> str:
    if isinstance(ans, Fraction):
        return latex_num(ans)
    if isinstance(ans, (list, tuple)):
        return ", ".join(pretty_answer(a) for a in ans)
    return fmt_num(ans)


def rand_nonzero(rng: random.Random, lo: int, hi: int) -> int:
    v = 0
    while v == 0:
        v = rng.randint(lo, hi)
    return v


def gcd(a: int, b: int) -> int:
    return math.gcd(a, b)


def simplify_frac(n: int, d: int) -> Fraction:
    return Fraction(n, d)


WORD_NAMES = [
    "Alex", "Bailey", "Casey", "Dana", "Elliot", "Finley", "Gray", "Harper",
    "Indigo", "Jordan", "Kai", "Logan", "Morgan", "Noel", "Oakley", "Parker",
    "Quinn", "Riley", "Skyler", "Taylor",
]
