#!/usr/bin/env python3
"""Add Exam MCQ5 fields (choices A–E + correct) to bank items. Deterministic."""
from __future__ import annotations

import hashlib
import json
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BANKS = ROOT / "site" / "data" / "banks"
FILES = [
    ROOT / "site" / "data" / "skills_emh.json",
    ROOT / "site" / "data" / "isomorphic_banks.json",
] + sorted(BANKS.glob("era-*.json"))


def seed(*parts):
    return int(hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()[:16], 16)


def bare_answer(it) -> str:
    a = str(it.get("answer") or "").strip()
    a = a.replace("$", "").strip()
    # unwrap simple latex dfrac for display
    a = re.sub(r"\\dfrac\{([^{}]+)\}\{([^{}]+)\}", r"\1/\2", a)
    a = a.replace("\\", "")
    a = re.sub(r"\s+", " ", a).strip()
    return a or "?"


def is_int(s: str):
    try:
        return int(s)
    except Exception:
        return None


def is_float(s: str):
    try:
        if "/" in s:
            n, d = s.split("/", 1)
            return float(n) / float(d)
        return float(s)
    except Exception:
        return None


def distractors_for(ans: str, rng: random.Random) -> list:
    """Return 4 wrong options; caller shuffles with correct."""
    ans = ans.strip()
    iv = is_int(ans)
    fv = is_float(ans.replace(",", ""))
    out = []

    if iv is not None:
        cands = [iv + 1, iv - 1, iv + 2, iv - 2, -iv if iv else 1, iv * 2, iv // 2 if abs(iv) > 2 else iv + 3, iv + 10, iv - 10]
        for c in cands:
            s = str(c)
            if s != ans and s not in out:
                out.append(s)
            if len(out) >= 4:
                break
        while len(out) < 4:
            j = iv + rng.randint(-20, 20)
            s = str(j)
            if s != ans and s not in out:
                out.append(s)
        return out[:4]

    if fv is not None and "/" in ans:
        # fraction-like
        try:
            n, d = ans.split("/", 1)
            n, d = int(n), int(d)
            cands = [f"{n+1}/{d}", f"{n}/{d+1}" if d > 1 else f"{n}/2", f"{n}/{max(1,d-1)}", f"{d}/{n}" if n else f"1/{d}", str(n), str(d)]
            for c in cands:
                if c != ans and c not in out:
                    out.append(c)
                if len(out) >= 4:
                    break
        except Exception:
            pass

    low = ans.lower()
    if low in ("yes", "no"):
        pool = ["yes", "no", "sometimes", "cannot tell", "not enough info"]
        for p in pool:
            if p.lower() != low and p not in out:
                out.append(p)
            if len(out) >= 4:
                break
        return out[:4]

    # generic string distractors
    base = [
        ans + "0" if ans and ans[-1].isdigit() else ans + "′",
        ("-" + ans) if not ans.startswith("-") else ans[1:] or "0",
        "0",
        "1",
        "undefined",
        "none of these",
    ]
    # if looks like (x,y)
    m = re.match(r"\(?\s*(-?\d+)\s*,\s*(-?\d+)\s*\)?", ans)
    if m:
        x, y = int(m.group(1)), int(m.group(2))
        base = [f"({x+1}, {y})", f"({x}, {y+1})", f"({y}, {x})", f"({-x}, {y})", f"({x}, {-y})"]
    for b in base:
        if b != ans and b not in out:
            out.append(b)
        if len(out) >= 4:
            break
    while len(out) < 4:
        out.append(f"opt-{len(out)+1}")
    return out[:4]


def add_mcq(it: dict) -> dict:
    ans = bare_answer(it)
    rng = random.Random(seed(it.get("id", ""), ans))
    wrong = distractors_for(ans, rng)
    opts = wrong + [ans]
    rng.shuffle(opts)
    # ensure unique
    seen = set()
    clean = []
    for o in opts:
        k = o.strip().lower()
        if k in seen:
            continue
        seen.add(k)
        clean.append(o)
    while len(clean) < 5:
        clean.append(f"choice-{len(clean)}")
    clean = clean[:5]
    # correct letter
    correct_idx = None
    for i, o in enumerate(clean):
        if o.strip() == ans or o.strip().lower() == ans.lower():
            correct_idx = i
            break
    if correct_idx is None:
        # force correct into slot 0 if lost
        clean[0] = ans
        correct_idx = 0
    letters = "ABCDE"
    it = dict(it)
    it["choices"] = clean
    it["correct"] = letters[correct_idx]
    it["correctIndex"] = correct_idx
    it["format"] = it.get("format") or "dual"  # typed + mcq5
    return it


def process_file(path: Path) -> int:
    data = json.loads(path.read_text())
    n = 0
    if isinstance(data, list):
        # EMH array of topics
        for t in data:
            t["items"] = [add_mcq(it) for it in t.get("items") or []]
            n += len(t["items"])
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
    elif isinstance(data, dict) and "topics" in data:
        for t in data["topics"]:
            t["items"] = [add_mcq(it) for it in t.get("items") or []]
            n += len(t["items"])
            t["itemCount"] = len(t["items"])
        # compact for era packs
        if path.parent.name == "banks":
            path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
        else:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    else:
        raise SystemExit(f"unknown shape {path}")
    return n


def main():
    total = 0
    for f in FILES:
        if not f.exists():
            print("skip missing", f)
            continue
        n = process_file(f)
        total += n
        print(f"{f.name}: {n} items MCQ5")
    print("total", total)


if __name__ == "__main__":
    main()
