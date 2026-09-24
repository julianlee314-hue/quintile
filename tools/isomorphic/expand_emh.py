#!/usr/bin/env python3
"""Append fresh isomorphic EMH items to skills_emh.json (keep existing). Target ~45/topic."""
from __future__ import annotations

import json
import math
import random
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EMH = ROOT / "site" / "data" / "skills_emh.json"
TARGET = 45  # per topic (was 15)

sys_path_note = True


def latex_frac(n, d):
    f = Fraction(n, d)
    if f.denominator == 1:
        return str(f.numerator)
    sign = "-" if f < 0 else ""
    a = abs(f)
    return f"{sign}\\dfrac{{{a.numerator}}}{{{a.denominator}}}"


def acc(*vals):
    out, seen = [], set()
    for v in vals:
        s = str(v).strip()
        if not s:
            continue
        bare = s.replace("$", "").replace(" ", "").lower()
        for cand in (s, bare, s.replace("$", "")):
            k = cand.replace(" ", "").lower()
            if k and k not in seen:
                seen.add(k)
                out.append(cand)
    return out


def mk(tid, n, stage, prompt, answer, solution, accept=None):
    ans = answer if str(answer).startswith("$") else f"${answer}$"
    return {
        "id": f"{tid}-iso-{n}",
        "stage": stage,
        "difficulty": {"easy": 1, "medium": 2, "hard": 3}[stage],
        "prompt": prompt,
        "answer": ans,
        "solution": solution,
        "accept": accept or acc(ans),
    }


def stages_needed(have: dict, need: int):
    """Return list of stages to append to approach equal EMH mix."""
    order = []
    # prefer filling the lowest counts toward ~equal thirds of TARGET
    target_each = need  # we'll just cycle e/m/h
    for i in range(need):
        order.append(["easy", "medium", "hard"][i % 3])
    return order


# ---------- generators per topic ----------
def gen_indices(rng, stage, tid, n):
    if stage == "easy":
        a, b, c = rng.randint(2, 5), rng.randint(1, 4), rng.randint(1, 3)
        # a^b * a^c / a^d
        d = rng.randint(1, 3)
        exp = b + c - d
        val = a ** exp
        return mk(tid, n, stage,
                  f"Simplify $\\dfrac{{{a}^{{{b}}}\\times {a}^{{{c}}}}}{{{a}^{{{d}}}}}$.",
                  str(val),
                  f"Add then subtract indices: ${a}^{{{b}+{c}-{d}}}={a}^{{{exp}}}={val}$.")
    if stage == "medium":
        p, q = rng.randint(3, 7), rng.randint(1, 3)
        # (x^p)^q / x^r
        r = rng.randint(1, 4)
        e = p * q - r
        return mk(tid, n, stage,
                  f"Simplify $\\dfrac{{(x^{{{p}}})^{{{q}}}}}{{x^{{{r}}}}}$.",
                  f"x^{{{e}}}",
                  f"$(x^{{{p}}})^{{{q}}}=x^{{{p*q}}}$; divide → $x^{{{e}}}$.",
                  acc(f"x^{e}", f"x^{{{e}}}"))
    # hard surd
    k = rng.choice([8, 12, 18, 20, 27, 32, 50])
    # simplify sqrt(k)
    # find largest square factor
    sq = 1
    for i in range(int(math.sqrt(k)), 1, -1):
        if k % (i * i) == 0:
            sq = i
            break
    rem = k // (sq * sq)
    if rem == 1:
        ans = str(sq)
        sol = f"$\\sqrt{{{k}}}={sq}$."
    else:
        ans = f"{sq}\\sqrt{{{rem}}}" if sq > 1 else f"\\sqrt{{{rem}}}"
        sol = f"$\\sqrt{{{k}}}=\\sqrt{{{sq*sq}\\times{rem}}}={sq}\\sqrt{{{rem}}}$."
    return mk(tid, n, stage, f"Simplify $\\sqrt{{{k}}}$.", ans, sol, acc(ans, ans.replace("{", "").replace("}", "")))


def gen_manipulation(rng, stage, tid, n):
    if stage == "easy":
        a, b = rng.randint(1, 6), rng.randint(1, 6)
        # (x+a)(x+b)
        prompt = f"Expand $(x+{a})(x+{b})$."
        ans = f"x^{{2}}+{a+b}x+{a*b}"
        return mk(tid, n, stage, prompt, ans, f"$x^{{2}}+({a}+{b})x+{a*b}$.", acc(ans, f"x^2+{a+b}x+{a*b}"))
    if stage == "medium":
        r1, r2 = rng.randint(1, 6), rng.randint(1, 6)
        while r1 == r2:
            r2 = rng.randint(1, 7)
        b = -(r1 + r2)
        c = r1 * r2
        # x^2 - (r1+r2)x + r1 r2 = (x-r1)(x-r2)
        sign_b = f"+{-b}x" if b < 0 else (f"{b}x" if b else "")
        # rebuild: x^2 + Bx + C with B=-(r1+r2)
        B, C = -(r1 + r2), r1 * r2
        term = f"x^{{2}}"
        term += f"+{B}x" if B > 0 else (f"{B}x" if B < 0 else "")
        # fix: B is negative typically
        if B > 0:
            mid = f"+{B}x"
        elif B < 0:
            mid = f"{B}x"
        else:
            mid = ""
        const = f"+{C}" if C >= 0 else f"{C}"
        lo, hi = sorted([r1, r2])
        ans = f"(x-{lo})(x-{hi})"
        return mk(tid, n, stage, f"Factorise $x^{{2}}{mid}{const}$.", ans,
                  f"Numbers multiplying to ${C}$ and summing to ${B}$: $-{lo},-{hi}$.",
                  acc(ans, f"(x-{hi})(x-{lo})"))
    # hard rearrange
    a, b = rng.randint(2, 6), rng.randint(2, 5)
    return mk(tid, n, stage,
              f"Make $x$ the subject of ${a}x+{b}y=c$.",
              f"x=\\dfrac{{c-{b}y}}{{{a}}}",
              f"${a}x=c-{b}y$ → $x=\\dfrac{{c-{b}y}}{{{a}}}$.",
              acc(f"(c-{b}y)/{a}", f"\\dfrac{{c-{b}y}}{{{a}}}"))


def gen_linear(rng, stage, tid, n):
    if stage == "easy":
        a, x = rng.randint(2, 9), rng.randint(-5, 10)
        b = rng.randint(1, 12)
        rhs = a * x + b
        return mk(tid, n, stage, f"Solve ${a}x+{b}={rhs}$.", f"x={x}",
                  f"Subtract ${b}$, divide by ${a}$: $x={x}$.", acc(f"x={x}", str(x)))
    if stage == "medium":
        x = rng.randint(-4, 9) or 3
        a, c = rng.randint(2, 6), rng.randint(1, 4)
        while a == c:
            c = rng.randint(1, 5)
        b = rng.randint(-8, 8)
        d = a * x + b - c * x
        return mk(tid, n, stage,
                  f"Solve ${a}x{b:+d}={c}x{d:+d}$.", f"x={x}",
                  f"Collect terms → $x={x}$.", acc(f"x={x}", str(x)))
    x, y = rng.randint(-3, 5) or 2, rng.randint(-3, 6) or 4
    m1, m2 = 2, -1
    b1 = y - m1 * x
    b2 = y - m2 * x
    return mk(tid, n, stage,
              f"Find where $y={m1}x{b1:+d}$ meets $y={m2}x{b2:+d}$. Give the point.",
              f"({x},{y})",
              f"Set equal → $x={x}$, $y={y}$.",
              acc(f"({x},{y})", f"({x}, {y})"))


def gen_quadratics(rng, stage, tid, n):
    if stage == "easy":
        r1, r2 = sorted([rng.randint(-5, 5) or -2, rng.randint(-4, 6) or 3])
        B, C = -(r1 + r2), r1 * r2
        mid = f"{B}x" if B < 0 else (f"+{B}x" if B else "")
        const = f"+{C}" if C >= 0 else str(C)
        return mk(tid, n, stage,
                  f"Solve $x^{{2}}{mid}{const}=0$.",
                  f"x={r1} or x={r2}",
                  f"Factor → $x={r1}$ or $x={r2}$.",
                  acc(f"x={r1} or x={r2}", f"{r1}, {r2}", f"{r1},{r2}"))
    if stage == "medium":
        a, b, c = rng.randint(1, 4), rng.randint(-5, 6), rng.randint(-4, 5)
        disc = b * b - 4 * a * c
        return mk(tid, n, stage,
                  f"Find the discriminant of ${a}x^{{2}}{b:+d}x{c:+d}$.",
                  str(disc),
                  f"$\\Delta=b^{{2}}-4ac={b}^{{2}}-4({a})({c})={disc}$.",
                  acc(str(disc)))
    h, k = rng.randint(-4, 4), rng.randint(-5, 8)
    return mk(tid, n, stage,
              f"Write down the vertex of $y=(x{(-h):+d})^{{2}}{k:+d}$.",
              f"({h},{k})",
              f"Vertex form → $({h},{k})$.",
              acc(f"({h},{k})", f"({h}, {k})"))


def gen_logs(rng, stage, tid, n):
    if stage == "easy":
        base = rng.choice([2, 3, 5, 10])
        e = rng.randint(2, 5)
        return mk(tid, n, stage, f"Evaluate $\\log_{{{base}}} {base**e}$.", str(e),
                  f"$\\log_{{{base}}}({base}^{{{e}}})={e}$.", acc(str(e)))
    if stage == "medium":
        base = rng.choice([2, 3, 4, 5])
        e = rng.randint(2, 4)
        return mk(tid, n, stage, f"Solve ${base}^{{x}}={base**e}$.", f"x={e}",
                  f"Same bases → $x={e}$.", acc(f"x={e}", str(e)))
    base = rng.choice([2, 3, 5])
    e = rng.randint(2, 4)
    shift = rng.randint(1, 5)
    x = base ** e + shift
    return mk(tid, n, stage,
              f"Solve $\\log_{{{base}}}(x-{shift})={e}$.", f"x={x}",
              f"$x-{shift}={base**e}$ → $x={x}$.", acc(f"x={x}", str(x)))


def gen_functions(rng, stage, tid, n):
    if stage == "easy":
        a, b, x = rng.randint(1, 6), rng.randint(-4, 5), rng.randint(-3, 6)
        return mk(tid, n, stage, f"Let $f(x)={a}x{b:+d}$. Find $f({x})$.", str(a * x + b),
                  f"$f({x})={a}({x}){b:+d}={a*x+b}$.", acc(str(a * x + b)))
    if stage == "medium":
        a, b, c, x = rng.randint(1, 4), rng.randint(1, 4), rng.randint(-2, 3), rng.randint(-2, 4)
        # (g∘f)(x) with f=x+a, g=x^2+c or linear
        gin = x + a
        val = b * gin + c
        return mk(tid, n, stage,
                  f"Let $f(x)=x+{a}$ and $g(x)={b}x{c:+d}$. Find $(g\\circ f)({x})$.",
                  str(val),
                  f"$f({x})={gin}$, $g({gin})={val}$.", acc(str(val)))
    # hard composition expression
    return mk(tid, n, stage,
              f"Find $(f\\circ g)(x)$ if $f(x)=x^{{2}}$ and $g(x)=x-{rng.randint(1,4)}$.",
              f"(x-{_g if False else ''})",  # placeholder fixed below
              "",
              )


# fix hard functions properly
def gen_functions_fixed(rng, stage, tid, n):
    if stage != "hard":
        return gen_functions(rng, stage, tid, n)
    k = rng.randint(1, 5)
    return mk(tid, n, stage,
              f"Find $(f\\circ g)(x)$ if $f(x)=x^{{2}}$ and $g(x)=x-{k}$.",
              f"(x-{k})^{{2}}",
              f"$f(g(x))=(x-{k})^{{2}}$.",
              acc(f"(x-{k})^2", f"(x-{k})^{{2}}"))


def gen_trig(rng, stage, tid, n):
    table = {
        ("sin", 30): "1/2", ("cos", 60): "1/2", ("tan", 45): "1",
        ("sin", 45): r"\dfrac{\sqrt{2}}{2}", ("cos", 45): r"\dfrac{\sqrt{2}}{2}",
        ("sin", 60): r"\dfrac{\sqrt{3}}{2}", ("cos", 30): r"\dfrac{\sqrt{3}}{2}",
        ("tan", 30): r"\dfrac{1}{\sqrt{3}}", ("tan", 60): r"\sqrt{3}",
    }
    if stage == "easy":
        (fn, ang), ans = rng.choice(list(table.items()))
        return mk(tid, n, stage, f"Write down the exact value of $\\{fn} {ang}^{{\\circ}}$.",
                  ans if ans.startswith("\\") or "/" not in ans else latex_frac(*map(int, ans.split("/"))) if ans.count("/") == 1 and "sqrt" not in ans else ans,
                  f"Standard angle: $\\{fn}{ang}^\\circ={ans}$.",
                  acc(ans, ans.replace("\\dfrac{", "").replace("}{", "/").replace("}", "")))
    if stage == "medium":
        opp, adj = rng.randint(3, 9), rng.randint(3, 9)
        hyp = None
        # use 3-4-5 family
        trip = rng.choice([(3, 4, 5), (5, 12, 13), (6, 8, 10), (7, 24, 25), (9, 12, 15)])
        opp, adj, hyp = trip
        return mk(tid, n, stage,
                  f"A right triangle has opposite side ${opp}$ and adjacent side ${adj}$. Find $\\sin\\theta$.",
                  latex_frac(opp, hyp),
                  f"Hypotenuse ${hyp}$; $\\sin\\theta=\\dfrac{{{opp}}}{{{hyp}}}$.",
                  acc(latex_frac(opp, hyp), f"{opp}/{hyp}"))
    deg = rng.choice([90, 180, 270, 360, 45, 30, 60])
    # to radians: deg * pi / 180
    f = Fraction(deg, 180)
    if f.denominator == 1:
        ans = "\\pi" if f.numerator == 1 else f"{f.numerator}\\pi"
    else:
        ans = f"\\dfrac{{{f.numerator}\\pi}}{{{f.denominator}}}" if f.numerator != 1 else f"\\dfrac{{\\pi}}{{{f.denominator}}}"
        if f.numerator != 1 and f.denominator != 1:
            ans = f"\\dfrac{{{f.numerator}\\pi}}{{{f.denominator}}}"
    return mk(tid, n, stage, f"Convert ${deg}^{{\\circ}}$ to radians.", ans,
              f"${deg}\\times\\dfrac{{\\pi}}{{180}}={ans}$.",
              acc(ans, ans.replace("\\dfrac{", "").replace("}{", "/").replace("}", "").replace("\\pi", "pi")))


def gen_chance(rng, stage, tid, n):
    if stage == "easy":
        xs = [rng.randint(1, 12) for _ in range(rng.choice([4, 5]))]
        mean = Fraction(sum(xs), len(xs))
        data = ", ".join(map(str, xs))
        return mk(tid, n, stage, f"Find the mean of ${data}$.", latex_frac(mean.numerator, mean.denominator),
                  f"Sum ${sum(xs)}$ over ${len(xs)}$ → ${latex_frac(mean.numerator, mean.denominator)}$.",
                  acc(latex_frac(mean.numerator, mean.denominator), str(float(mean)) if mean.denominator != 1 else str(mean.numerator), str(mean)))
    if stage == "medium":
        xs = sorted(rng.randint(1, 20) for _ in range(5))
        med = xs[2]
        data = ", ".join(map(str, xs))
        return mk(tid, n, stage, f"Find the median of ${data}$.", str(med),
                  f"Middle value is ${med}$.", acc(str(med)))
    # hard probability
    sides = rng.choice([4, 6, 8, 10])
    fav = rng.randint(1, sides - 1)
    return mk(tid, n, stage,
              f"A fair {sides}-sided spinner is spun. Find the probability of a number $\\le {fav}$.",
              latex_frac(fav, sides),
              f"$\\dfrac{{{fav}}}{{{sides}}}$.",
              acc(latex_frac(fav, sides), f"{fav}/{sides}"))


GENS = {
    "indices": gen_indices,
    "manipulation": gen_manipulation,
    "linear": gen_linear,
    "quadratics": gen_quadratics,
    "logs": gen_logs,
    "functions": gen_functions_fixed,
    "trig": gen_trig,
    "chance": gen_chance,
}


def main():
    emh = json.loads(EMH.read_text())
    before = sum(len(t["items"]) for t in emh)
    for t in emh:
        tid = t["id"]
        gen = GENS[tid]
        have = len(t["items"])
        need = max(0, TARGET - have)
        rng = random.Random(hash(tid) & 0xFFFFFFFF)
        # avoid id collisions
        existing = {it["id"] for it in t["items"]}
        n = 1
        added = 0
        stages = stages_needed({}, need)
        for stage in stages:
            while f"{tid}-iso-{n}" in existing:
                n += 1
            it = gen(rng, stage, tid, n)
            # validate
            assert it["prompt"] and it["answer"] and it["accept"]
            t["items"].append(it)
            existing.add(it["id"])
            n += 1
            added += 1
        print(f"{tid}: {have} → {len(t['items'])} (+{added})")
    after = sum(len(t["items"]) for t in emh)
    EMH.write_text(json.dumps(emh, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"before": before, "after": after, "target_each": TARGET}))


if __name__ == "__main__":
    main()
