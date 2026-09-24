"""Per-section isomorphic item generators. Fresh prompts only — never Kuta OCR text."""
from __future__ import annotations

import math
import random
from fractions import Fraction
from typing import Callable, Dict, List

from helpers import (
    WORD_NAMES,
    accept_forms,
    fmt_num,
    item,
    latex_num,
    linear_expr,
    rand_nonzero,
    signed_term,
    simplify_frac,
)


Gen = Callable[[random.Random, str, str], dict]  # rng, stage, clone_title -> item dict


def _pack(gens: List[Gen], rng: random.Random, n: int, stages: List[str], title: str) -> List[dict]:
    out = []
    for i in range(n):
        g = gens[i % len(gens)]
        out.append(g(rng, stages[i], title))
    return out


# ---------- Evaluating Variable Expressions ----------
def gen_eval_expr(rng: random.Random, stage: str, title: str) -> dict:
    if stage == "easy":
        a, b = rng.randint(2, 9), rng.randint(1, 9)
        x = rng.randint(-5, 8)
        if x == 0:
            x = 2
        val = a * x + b
        prompt = f"Evaluate ${linear_expr(a, b)}$ when $x={x}$."
        sol = f"Substitute $x={x}$: ${a}({x})+{b}={val}$."
    elif stage == "medium":
        a, b, c = rng.randint(1, 5), rng.randint(1, 5), rng.randint(-4, 4)
        x, y = rng.randint(-3, 4) or 2, rng.randint(-3, 4) or 1
        val = a * x * x + b * y + c
        prompt = f"Evaluate ${a}x^{{2}}+{b}y{signed_term(c,'',False)}$ when $x={x}$ and $y={y}$."
        sol = f"${a}({x})^{{2}}+{b}({y}){signed_term(c,'',False)}={val}$."
    else:
        a, b = rng.randint(2, 4), rng.randint(2, 5)
        x = rng.randint(-3, 3) or 2
        val = a * (x + b) ** 2 - x
        prompt = f"Evaluate ${a}(x+{b})^{{2}}-x$ when $x={x}$."
        sol = f"First $x+{b}={x+b}$, square is ${(x+b)**2}$, times ${a}$ is ${a*(x+b)**2}$, minus $x$ gives ${val}$."
    return item(prompt=prompt, answer=str(val), solution=sol, stage=stage, accept=accept_forms(val), clone_of=title)


# ---------- Combining Like Terms ----------
def gen_like_terms(rng: random.Random, stage: str, title: str) -> dict:
    if stage == "easy":
        a, b, c = rng.randint(1, 8), rng.randint(1, 8), rng.randint(-6, 6)
        expr = f"{a}x + {b}x" + (f" + {c}" if c else "")
        coef = a + b
        ans = linear_expr(coef, c)
        sol = f"Combine $x$ terms: ${a}+{b}={coef}$, so ${ans}$."
    elif stage == "medium":
        a, b, c, d = rng.randint(1, 6), rng.randint(-5, 5) or 2, rng.randint(1, 5), rng.randint(-4, 4) or 1
        expr = f"{a}x{signed_term(c, 'y', False)}{signed_term(b, 'x', False)}{signed_term(d, 'y', False)}"
        ax, ay = a + b, c + d
        ans = f"{linear_expr(ax, 0)}{signed_term(ay, 'y', False)}" if ay else linear_expr(ax, 0)
        if ax == 0 and ay:
            ans = signed_term(ay, "y", True)
        sol = f"$x$ coefficients ${a}+{b}={ax}$; $y$ coefficients ${c}+{d}={ay}$."
    else:
        a, b, c, d, e = [rng.randint(-5, 6) or 2 for _ in range(5)]
        expr = (
            f"{signed_term(a, 'x^{2}', True)}{signed_term(b, 'x', False)}"
            f"{signed_term(c, '', False)}{signed_term(d, 'x^{2}', False)}{signed_term(e, 'x', False)}"
        )
        a2, a1, a0 = a + d, b + e, c
        parts = []
        if a2:
            parts.append(signed_term(a2, "x^{2}", True))
        if a1:
            parts.append(signed_term(a1, "x", not parts))
        if a0 or not parts:
            parts.append(signed_term(a0, "", not parts) if parts else str(a0))
        ans = "".join(parts).replace("x^{2}", "x^{2}")
        # clean answer string for latex
        ans_l = []
        first = True
        for coef, var in [(a2, "x^{2}"), (a1, "x"), (a0, "")]:
            if coef == 0 and var:
                continue
            if not var and coef == 0 and ans_l:
                continue
            ans_l.append(signed_term(coef, var.replace("^{2}", "") if False else var, first))
            # signed_term doesn't handle ^{2} well — manual:
        # rebuild carefully
        chunks = []
        if a2:
            body = "x^{2}" if abs(a2) == 1 else f"{abs(a2)}x^{{2}}"
            chunks.append(("-" if a2 < 0 else "") + body)
        if a1:
            body = "x" if abs(a1) == 1 else f"{abs(a1)}x"
            if not chunks:
                chunks.append(("-" if a1 < 0 else "") + body)
            else:
                chunks.append((" - " if a1 < 0 else " + ") + body)
        if a0 or not chunks:
            if not chunks:
                chunks.append(str(a0))
            else:
                chunks.append((" - " if a0 < 0 else " + ") + str(abs(a0)))
        ans = "".join(chunks)
        sol = f"Group: $x^{{2}}$ → ${a2}$, $x$ → ${a1}$, constant → ${a0}$."
    prompt = f"Simplify by combining like terms: ${expr}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, ans.replace("{", "").replace("}", "")), clone_of=title)


# ---------- Percent of Change ----------
def gen_percent_change(rng: random.Random, stage: str, title: str) -> dict:
    if stage == "easy":
        old = rng.choice([20, 25, 40, 50, 80, 100])
        new = old + rng.choice([5, 10, 20, -5, -10])
    elif stage == "medium":
        old = rng.randint(40, 200)
        new = old + rng.choice([12, 15, 18, 24, 30, -12, -16, -25])
    else:
        old = rng.randint(80, 400)
        new = old + rng.choice([36, 48, 60, 75, -36, -50, -64])
    change = new - old
    pct = Fraction(change * 100, old)
    # keep clean percentages when possible
    if pct.denominator != 1:
        # nudge new so percent is integer
        pct_i = int(round(float(pct)))
        new = old + (pct_i * old) // 100
        change = new - old
        pct = Fraction(change * 100, old)
    kind = "increase" if change >= 0 else "decrease"
    prompt = f"A value changes from ${old}$ to ${new}$. What is the percent {kind}? Enter the percent as a number (no % sign)."
    ans = abs(pct.numerator // pct.denominator) if pct.denominator == 1 else abs(float(pct))
    if isinstance(ans, float) and abs(ans - round(ans)) < 1e-9:
        ans = int(round(ans))
    sol = f"Percent change $=\\dfrac{{{new}-{old}}}{{{old}}}\\times 100=\\dfrac{{{change}}}{{{old}}}\\times 100={ans}$."
    return item(prompt=prompt, answer=str(ans), solution=sol, stage=stage, accept=accept_forms(ans, f"{ans}%"), clone_of=title)


# ---------- One / Two / Multi step equations ----------
def gen_one_step(rng: random.Random, stage: str, title: str) -> dict:
    if stage == "easy":
        op = rng.choice(["+", "-", "*", "/"])
        if op == "+":
            x, a = rng.randint(-9, 12), rng.randint(1, 12)
            prompt, ans, sol = f"Solve ${x}+{a}=n$".replace("n", str(x + a)), str(x), f"Subtract ${a}$: $x={x}$."
            prompt = f"Solve $x+{a}={x+a}$."
        elif op == "-":
            x, a = rng.randint(1, 15), rng.randint(1, 9)
            prompt = f"Solve $x-{a}={x-a}$."
            ans, sol = str(x), f"Add ${a}$: $x={x}$."
        elif op == "*":
            a = rng.randint(2, 9)
            x = rng.randint(-6, 8) or 3
            prompt = f"Solve ${a}x={a*x}$."
            ans, sol = str(x), f"Divide by ${a}$: $x={x}$."
        else:
            a = rng.randint(2, 9)
            x = rng.randint(2, 12)
            prompt = f"Solve $\\dfrac{{x}}{{{a}}}={x//a if x%a==0 else Fraction(x,a)}$."
            # ensure divisible
            x = a * rng.randint(2, 9)
            prompt = f"Solve $\\dfrac{{x}}{{{a}}}={x//a}$."
            ans, sol = str(x), f"Multiply by ${a}$: $x={x}$."
    elif stage == "medium":
        a = rng.randint(3, 12)
        x = Fraction(rng.randint(1, 9), rng.choice([2, 3, 4]))
        rhs = a * x
        prompt = f"Solve ${a}x={latex_num(rhs)}$."
        ans = latex_num(x)
        sol = f"Divide by ${a}$: $x={ans}$."
    else:
        a = rng.randint(2, 7)
        x = -rng.randint(2, 15)
        prompt = f"Solve $-{a}+x={-a+x}$."
        # cleaner: x + (-a) = rhs
        prompt = f"Solve $x+({-a})={x-a}$."
        ans, sol = str(x), f"Add ${a}$: $x={x}$."
        # better hard: division with negative
        a = -rng.randint(2, 8)
        x = rng.randint(-9, 9) or -3
        prompt = f"Solve ${a}x={a*x}$."
        ans, sol = str(x), f"Divide by ${a}$: $x={x}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, Fraction(ans) if "/" in str(ans) else ans), clone_of=title)


def gen_two_step(rng: random.Random, stage: str, title: str) -> dict:
    a = rng.randint(2, 9)
    b = rng.randint(1, 12)
    if stage == "easy":
        x = rng.randint(1, 10)
    elif stage == "medium":
        x = rng.randint(-8, 12) or 4
    else:
        x = -rng.randint(2, 15)
    rhs = a * x + b
    prompt = f"Solve ${a}x+{b}={rhs}$."
    sol = f"Subtract ${b}$: ${a}x={a*x}$. Divide by ${a}$: $x={x}$."
    return item(prompt=prompt, answer=str(x), solution=sol, stage=stage, accept=accept_forms(x), clone_of=title)


def gen_multi_step(rng: random.Random, stage: str, title: str) -> dict:
    # (ax+b)/c = d  or  a(x+b)=c  or distribute
    if stage == "easy":
        a, b, x = rng.randint(2, 5), rng.randint(1, 6), rng.randint(1, 8)
        prompt = f"Solve ${a}(x+{b})={a*(x+b)}$."
        sol = f"Divide by ${a}$: $x+{b}={x+b}$. Then $x={x}$."
    elif stage == "medium":
        a, b, c, x = rng.randint(2, 6), rng.randint(1, 5), rng.randint(2, 5), rng.randint(-5, 8) or 3
        # a(x+b) + c = rhs
        rhs = a * (x + b) + c
        prompt = f"Solve ${a}(x+{b})+{c}={rhs}$."
        sol = f"Subtract ${c}$, divide by ${a}$, subtract ${b}$: $x={x}$."
    else:
        # variables both sides: ax+b = cx+d
        a, c = rng.randint(3, 8), rng.randint(1, 5)
        while a == c:
            c = rng.randint(1, 6)
        x = rng.randint(-6, 9) or 2
        b = rng.randint(-10, 10)
        d = a * x + b - c * x
        prompt = f"Solve ${a}x{signed_term(b,'',False)}={c}x{signed_term(d,'',False)}$."
        sol = f"Collect like terms: $({a}-{c})x={d}-({b})$ → $x={x}$."
    return item(prompt=prompt, answer=str(x), solution=sol, stage=stage, accept=accept_forms(x), clone_of=title)


# ---------- Absolute value equations ----------
def gen_abs_eq(rng: random.Random, stage: str, title: str) -> dict:
    if stage == "easy":
        k = rng.randint(2, 9)
        # |x| = k → x = ±k
        prompt = f"Solve $|x|={k}$. Enter the solutions separated by a comma (smaller first)."
        ans = f"{-k}, {k}"
        sol = f"$x=-{k}$ or $x={k}$."
        return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, f"{-k},{k}", f"{-k}, {k}"), clone_of=title)
    a = rng.randint(2, 5)
    h = rng.randint(-4, 4)
    k = rng.randint(2, 8)
    # |ax+h| = k
    # ax+h = k or ax+h = -k
    x1 = Fraction(k - h, a)
    x2 = Fraction(-k - h, a)
    lo, hi = sorted([x1, x2])
    prompt = f"Solve $|{a}x{signed_term(h,'',False)}|={k}$. Enter solutions smaller first, comma-separated."
    ans = f"{latex_num(lo)}, {latex_num(hi)}"
    sol = f"{a}x{signed_term(h,'',False)}={k} or $={-k}$ → $x={latex_num(x1)}$ or $x={latex_num(x2)}$."
    acc = accept_forms(ans, f"{fmt_num(lo)},{fmt_num(hi)}", f"{fmt_num(lo)}, {fmt_num(hi)}")
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=acc, clone_of=title)


# ---------- Radical equations ----------
def gen_radical_1(rng: random.Random, stage: str, title: str) -> dict:
    # √(x+b) = c  or √(ax) = c
    if stage == "easy":
        c = rng.randint(2, 8)
        b = rng.randint(0, 10)
        x = c * c - b
        prompt = f"Solve $\\sqrt{{x{signed_term(b,'',False)}}}={c}$."
        sol = f"Square both sides: $x{signed_term(b,'',False)}={c*c}$ → $x={x}$. Check: works."
    elif stage == "medium":
        c = rng.randint(2, 7)
        a = rng.randint(2, 5)
        x = (c * c) // a
        # ensure a*x = c^2
        x = c * c // a if (c * c) % a == 0 else c * c
        a = 1 if (c * c) % a else a
        # rebuild clean: √(ax+b)=c
        b = rng.randint(0, 6)
        x = c * c - b
        a = 1
        prompt = f"Solve $\\sqrt{{{x+b if False else ''}{a}x{signed_term(b,'',False)}}}={c}$".replace("1x", "x")
        # clean
        inner = linear_expr(a, b)
        # ensure a*x+b = c^2
        x = (c * c - b) // a
        if a * x + b != c * c:
            b = 0
            x = (c * c) // a
            if a * x != c * c:
                a = 1
                x = c * c
        prompt = f"Solve $\\sqrt{{{linear_expr(a, b)}}}={c}$."
        sol = f"Square: ${linear_expr(a,b)}={c*c}$ → $x={x}$."
    else:
        c = rng.randint(3, 8)
        b = rng.randint(1, 9)
        x = c * c - b
        prompt = f"Solve $\\sqrt{{x+{b}}}+1={c+1}$."
        sol = f"Isolate radical: $\\sqrt{{x+{b}}}={c}$. Square: $x+{b}={c*c}$ → $x={x}$."
    return item(prompt=prompt, answer=str(x), solution=sol, stage=stage, accept=accept_forms(x), clone_of=title)


def gen_radical_2(rng: random.Random, stage: str, title: str) -> dict:
    # √(x+a) = √(x) + something is hard; use √(ax+b)=cx+d with clean check
    # simpler hard: ∛(x+b)=c or √(x-a)+√x style → use two-step radical √(2x+3)=x with check
    if stage == "easy":
        c = rng.randint(2, 5)
        x = c ** 3
        prompt = f"Solve $\\sqrt[3]{{x}}={c}$."
        sol = f"Cube both sides: $x={x}$."
        return item(prompt=prompt, answer=str(x), solution=sol, stage=stage, accept=accept_forms(x), clone_of=title)
    # √(x+k) = x with solutions that check
    # x^2 = x+k → x^2 - x - k = 0; pick x=2,k=2
    x = rng.choice([2, 3, 4])
    k = x * x - x
    prompt = f"Solve $\\sqrt{{x+{k}}}=x$ (extraneous solutions discarded)."
    sol = f"Square: $x+{k}=x^{{2}}$ → $x^{{2}}-x-{k}=0$ → $x={x}$ (check non-negative)."
    return item(prompt=prompt, answer=str(x), solution=sol, stage=stage, accept=accept_forms(x), clone_of=title)


# ---------- Rational equations ----------
def gen_rational_1(rng: random.Random, stage: str, title: str) -> dict:
    # 1/x = a/b or (x+a)/b = c
    if stage == "easy":
        a, b = rng.randint(1, 5), rng.randint(2, 9)
        # a/x = b → x = a/b
        x = Fraction(a, b)
        prompt = f"Solve $\\dfrac{{{a}}}{{x}}={b}$."
        ans = latex_num(x)
        sol = f"$a=bx$ → $x=\\dfrac{{{a}}}{{{b}}}={ans}$." if False else f"Cross-multiply: ${a}={b}x$ → $x={ans}$."
    elif stage == "medium":
        # (x+a)/b = c → x = bc - a
        a, b, c = rng.randint(1, 8), rng.randint(2, 6), rng.randint(2, 7)
        x = b * c - a
        prompt = f"Solve $\\dfrac{{x+{a}}}{{{b}}}={c}$."
        ans = str(x)
        sol = f"$x+{a}={b*c}$ → $x={x}$."
    else:
        # a/(x+b) = c → x = a/c - b
        a, b, c = rng.randint(4, 15), rng.randint(1, 5), rng.randint(2, 5)
        if a % c:
            a = c * rng.randint(2, 6)
        x = a // c - b
        prompt = f"Solve $\\dfrac{{{a}}}{{x+{b}}}={c}$."
        ans = str(x)
        sol = f"{a}={c}(x+{b}) → $x+{b}={a//c}$ → $x={x}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans), clone_of=title)


def gen_rational_2(rng: random.Random, stage: str, title: str) -> dict:
    # 1/(x+a) + 1/(x+b) = c with clean x, or a/x + b/(x+d) = e
    # Construct: 2/x + 3/x = 1 → wait
    # Use: a/x + b = c → a/x = c-b → x = a/(c-b)
    a = rng.randint(2, 12)
    b = rng.randint(1, 5)
    c = b + rng.randint(1, 4)
    x = Fraction(a, c - b)
    prompt = f"Solve $\\dfrac{{{a}}}{{x}}+{b}={c}$."
    ans = latex_num(x)
    sol = f"$\\dfrac{{{a}}}{{x}}={c-b}$ → $x={ans}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, fmt_num(x)), clone_of=title)


# ---------- Proportions ----------
def gen_proportions(rng: random.Random, stage: str, title: str) -> dict:
    a, b = rng.randint(2, 12), rng.randint(2, 12)
    k = rng.randint(2, 6) if stage != "easy" else rng.randint(2, 4)
    c = a * k
    d = b * k
    # a/b = c/x → x = b*c/a = d
    # or a/x = c/d
    if rng.random() < 0.5:
        prompt = f"Solve the proportion $\\dfrac{{{a}}}{{{b}}}=\\dfrac{{{c}}}{{x}}$."
        x = d
        sol = f"Cross-multiply: ${a}x={b*c}$ → $x={x}$."
    else:
        prompt = f"Solve the proportion $\\dfrac{{{a}}}{{x}}=\\dfrac{{{c}}}{{{d}}}$."
        x = Fraction(a * d, c)
        sol = f"Cross-multiply: ${c}x={a*d}$ → $x={latex_num(x)}$."
    ans = latex_num(x) if isinstance(x, Fraction) else str(x)
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, x), clone_of=title)


# ---------- Literal equations ----------
def gen_literal(rng: random.Random, stage: str, title: str) -> dict:
    # Solve for y: ay+b=c → y=(c-b)/a  OR ax+by=c for y
    if stage == "easy":
        a, b = rng.randint(2, 9), rng.choice(["b", "c", "k", "m"])
        prompt = f"Solve for $x$: ${a}x={b}$. Enter the expression for $x$."
        ans = f"\\dfrac{{{b}}}{{{a}}}"
        sol = f"Divide both sides by ${a}$: $x={ans}$."
    elif stage == "medium":
        a = rng.randint(2, 7)
        prompt = f"Solve for $y$: ${a}y+b=c$. Enter the expression for $y$."
        ans = f"\\dfrac{{c-b}}{{{a}}}"
        sol = f"Subtract $b$, divide by ${a}$: $y={ans}$."
    else:
        a, b = rng.randint(2, 6), rng.randint(2, 6)
        prompt = f"Solve for $x$: ${a}x+{b}y=c$. Enter the expression for $x$."
        ans = f"\\dfrac{{c-{b}y}}{{{a}}}"
        sol = f"Isolate ${a}x$: ${a}x=c-{b}y$ → $x={ans}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, ans.replace("\\dfrac", "").replace("{", "").replace("}", "/")), clone_of=title)


SECTION_BUILDERS: Dict[str, Callable] = {}


def register(title: str):
    def deco(fn):
        SECTION_BUILDERS[title] = fn
        return fn
    return deco


@register("Evaluating Variable Expressions")
def build_eval(rng, n, stages, title):
    return [gen_eval_expr(rng, stages[i], title) for i in range(n)]


@register("Combining Like Terms")
def build_like(rng, n, stages, title):
    return [gen_like_terms(rng, stages[i], title) for i in range(n)]


@register("Percent of Change")
def build_pct(rng, n, stages, title):
    return [gen_percent_change(rng, stages[i], title) for i in range(n)]


@register("One-Step Equations")
def build_one(rng, n, stages, title):
    return [gen_one_step(rng, stages[i], title) for i in range(n)]


@register("Two-Step Equations")
def build_two(rng, n, stages, title):
    return [gen_two_step(rng, stages[i], title) for i in range(n)]


@register("Multi-Step Equations")
def build_multi(rng, n, stages, title):
    return [gen_multi_step(rng, stages[i], title) for i in range(n)]


@register("Absolute Value Equations")
def build_abs(rng, n, stages, title):
    return [gen_abs_eq(rng, stages[i], title) for i in range(n)]


@register("Radical Equations - Part 1")
def build_rad1(rng, n, stages, title):
    return [gen_radical_1(rng, stages[i], title) for i in range(n)]


@register("Radical Equations - Part 2")
def build_rad2(rng, n, stages, title):
    return [gen_radical_2(rng, stages[i], title) for i in range(n)]


@register("Solving Rational Equations 1")
def build_rat1(rng, n, stages, title):
    return [gen_rational_1(rng, stages[i], title) for i in range(n)]


@register("Solving Rational Equations 2")
def build_rat2(rng, n, stages, title):
    return [gen_rational_2(rng, stages[i], title) for i in range(n)]


@register("Solving Proportions")
def build_prop(rng, n, stages, title):
    return [gen_proportions(rng, stages[i], title) for i in range(n)]


@register("Literal Equations")
def build_lit(rng, n, stages, title):
    return [gen_literal(rng, stages[i], title) for i in range(n)]


# ---------- Inequalities ----------
def gen_one_ineq(rng: random.Random, stage: str, title: str) -> dict:
    op = rng.choice(["<", ">", "\\le", "\\ge"])
    a = rng.randint(2, 12)
    xbound = rng.randint(-5, 10)
    # x + a < k → x < k-a
    k = xbound + a
    prompt = f"Solve $x+{a}{op}{k}$. Enter the inequality for $x$ (use < > <= >=)."
    plain_op = {"<": "<", ">": ">", "\\le": "<=", "\\ge": ">="}[op]
    ans = f"x{plain_op}{xbound}"
    sol = f"Subtract ${a}$: $x{op}{xbound}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, f"x{plain_op}{xbound}"), clone_of=title)


def gen_two_ineq(rng: random.Random, stage: str, title: str) -> dict:
    op = rng.choice(["<", ">", "\\le", "\\ge"])
    a = rng.randint(2, 8)
    b = rng.randint(1, 10)
    xbound = rng.randint(-4, 9)
    # ax+b < k
    k = a * xbound + b
    plain_op = {"<": "<", ">": ">", "\\le": "<=", "\\ge": ">="}[op]
    prompt = f"Solve ${a}x+{b}{op}{k}$. Enter like x{plain_op}N."
    ans = f"x{plain_op}{xbound}"
    sol = f"Subtract ${b}$, divide by ${a}$ (positive): $x{op}{xbound}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans), clone_of=title)


def gen_multi_ineq(rng: random.Random, stage: str, title: str) -> dict:
    # negative coefficient flips
    a = -rng.randint(2, 6)
    b = rng.randint(-5, 8)
    xbound = rng.randint(-5, 6)
    k = a * xbound + b
    op_tex, plain = rng.choice([("<", "<"), (">", ">"), ("\\le", "<="), ("\\ge", ">=")])
    # when dividing by negative, flip
    flip_plain = {"<": ">", ">": "<", "<=": ">=", ">=": "<="}
    flipped = flip_plain[plain]
    prompt = f"Solve ${a}x{signed_term(b,'',False)}{op_tex}{k}$. Remember to flip if you divide by a negative. Enter like x{flipped}N."
    ans = f"x{flipped}{xbound}"
    sol = f"Subtract ${b}$: ${a}x{op_tex}{k-b}$. Divide by ${a}$ and flip: $x{flipped}{xbound}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans), clone_of=title)


def gen_compound_ineq(rng: random.Random, stage: str, title: str) -> dict:
    # a < x + b < c
    b = rng.randint(1, 6)
    lo = rng.randint(-4, 2)
    hi = lo + rng.randint(3, 8)
    # lo < x+b < hi → lo-b < x < hi-b
    prompt = f"Solve ${lo}<x+{b}<{hi}$. Enter as A<x<B using integers."
    ans = f"{lo-b}<x<{hi-b}"
    sol = f"Subtract ${b}$ from all parts: ${ans}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans), clone_of=title)


def gen_abs_ineq(rng: random.Random, stage: str, title: str) -> dict:
    k = rng.randint(2, 8)
    # |x| < k → -k < x < k
    if stage == "easy" or rng.random() < 0.5:
        prompt = f"Solve $|x|<{k}$. Enter as A<x<B."
        ans = f"{-k}<x<{k}"
        sol = f"$-{k}<x<{k}$."
    else:
        # |x| >= k → x <= -k or x >= k — ask for the positive bound solution piece
        prompt = f"Solve $|x|\\ge {k}$. Enter the two rays as x<=A or x>=B (use that exact pattern)."
        ans = f"x<=-{k} or x>={k}"
        sol = f"$x\\le -{k}$ or $x\\ge {k}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, ans.replace(" ", "")), clone_of=title)


def gen_graph_lin_ineq(rng: random.Random, stage: str, title: str) -> dict:
    # key-point: does point satisfy? or y-intercept of boundary
    a, b, c = rng.randint(1, 5), rng.randint(1, 5), rng.randint(2, 20)
    # ax + by < c
    px, py = rng.randint(-3, 5), rng.randint(-3, 5)
    ok = a * px + b * py < c
    prompt = f"Does the point $({px},{py})$ satisfy ${a}x+{b}y<{c}$? Answer yes or no."
    ans = "yes" if ok else "no"
    sol = f"${a}({px})+{b}({py})={a*px+b*py}$, compared to ${c}$: {ans}."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, ans.capitalize()), clone_of=title)


def gen_sys_ineq(rng: random.Random, stage: str, title: str) -> dict:
    # test point in both half-planes y > x and y < 5
    px, py = rng.randint(-2, 6), rng.randint(-2, 8)
    ok = (py > px) and (py < 5)
    prompt = f"Is $({px},{py})$ in the solution region of $y>x$ and $y<5$? Answer yes or no."
    ans = "yes" if ok else "no"
    sol = f"Need $y>x$ ({py}>{px} is {py>px}) and $y<5$ ({py}<5 is {py<5}) → {ans}."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, ans.capitalize()), clone_of=title)


@register("One-Step Inequalities")
def build_oi(rng, n, stages, title):
    return [gen_one_ineq(rng, stages[i], title) for i in range(n)]


@register("Two-Step Inequalities")
def build_ti(rng, n, stages, title):
    return [gen_two_ineq(rng, stages[i], title) for i in range(n)]


@register("Multi-Step Inequalities")
def build_mi(rng, n, stages, title):
    return [gen_multi_ineq(rng, stages[i], title) for i in range(n)]


@register("Compound Inequalities")
def build_ci(rng, n, stages, title):
    return [gen_compound_ineq(rng, stages[i], title) for i in range(n)]


@register("Absolute Value Inequalities")
def build_ai(rng, n, stages, title):
    return [gen_abs_ineq(rng, stages[i], title) for i in range(n)]


@register("Graphing Linear Inequalities")
def build_gli(rng, n, stages, title):
    return [gen_graph_lin_ineq(rng, stages[i], title) for i in range(n)]


@register("Systems of Inequalities")
def build_si(rng, n, stages, title):
    return [gen_sys_ineq(rng, stages[i], title) for i in range(n)]


# ---------- Systems ----------
def gen_sys_elim(rng: random.Random, stage: str, title: str) -> dict:
    x, y = rng.randint(-5, 8) or 2, rng.randint(-5, 8) or 3
    a1, b1 = rng.randint(1, 5), rng.randint(1, 5)
    a2, b2 = rng.randint(1, 5), rng.randint(1, 5)
    while a1 * b2 == a2 * b1:
        b2 = rng.randint(1, 6)
    c1 = a1 * x + b1 * y
    c2 = a2 * x + b2 * y
    prompt = f"Solve the system by elimination. $ {a1}x+{b1}y={c1} $, $ {a2}x+{b2}y={c2} $. Enter as (x,y)."
    ans = f"({x}, {y})"
    sol = f"Elimination / algebra yields $x={x}$, $y={y}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, f"({x},{y})", f"{x},{y}"), clone_of=title)


def gen_sys_sub(rng: random.Random, stage: str, title: str) -> dict:
    x, y = rng.randint(-4, 7) or 1, rng.randint(-4, 7) or 2
    # y = mx + b
    m = rng.randint(-3, 4) or 2
    b = y - m * x
    a, c = rng.randint(1, 4), rng.randint(1, 5)
    # ax + cy = k
    k = a * x + c * y
    prompt = f"Solve by substitution: $y={m}x{signed_term(b,'',False)}$ and ${a}x+{c}y={k}$. Enter as (x,y)."
    ans = f"({x}, {y})"
    sol = f"Substitute $y$ into the second equation → $x={x}$, $y={y}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, f"({x},{y})"), clone_of=title)


def gen_sys_graph(rng: random.Random, stage: str, title: str) -> dict:
    # intersection point key skill
    x, y = rng.randint(-4, 5) or 1, rng.randint(-4, 5) or 2
    m1, m2 = 1, -1
    b1 = y - m1 * x
    b2 = y - m2 * x
    prompt = f"The lines $y=x{signed_term(b1,'',False)}$ and $y=-x{signed_term(b2,'',False)}$ intersect at what point? Enter (x,y)."
    ans = f"({x}, {y})"
    sol = f"Set equal: $x{signed_term(b1,'',False)}=-x{signed_term(b2,'',False)}$ → $x={x}$, $y={y}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, f"({x},{y})"), clone_of=title)


def gen_sys_two(rng: random.Random, stage: str, title: str) -> dict:
    return gen_sys_elim(rng, stage, title)


def gen_sys_word(rng: random.Random, stage: str, title: str) -> dict:
    name = rng.choice(WORD_NAMES)
    a_price, b_price = rng.choice([2, 3, 4, 5]), rng.choice([5, 6, 7, 8])
    na, nb = rng.randint(2, 8), rng.randint(2, 8)
    total_items = na + nb
    total_cost = a_price * na + b_price * nb
    prompt = (
        f"{name} buys tickets: child tickets cost ${a_price}$ each and adult tickets cost ${b_price}$ each. "
        f"Together they buy {total_items} tickets for ${total_cost}$. How many child tickets did they buy?"
    )
    ans = str(na)
    sol = f"Let $c$=child, $a$=adult. $c+a={total_items}$, ${a_price}c+{b_price}a={total_cost}$ → $c={na}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(na), clone_of=title)


@register("Solving Systems of Equations by Elimination")
def build_elim(rng, n, stages, title):
    return [gen_sys_elim(rng, stages[i], title) for i in range(n)]


@register("Solving Systems of Equations by Substitution")
def build_sub(rng, n, stages, title):
    return [gen_sys_sub(rng, stages[i], title) for i in range(n)]


@register("Solving Systems of Equations by Graphing")
def build_graph_sys(rng, n, stages, title):
    return [gen_sys_graph(rng, stages[i], title) for i in range(n)]


@register("Systems of Two Equations")
def build_sys2(rng, n, stages, title):
    return [gen_sys_two(rng, stages[i], title) for i in range(n)]


@register("Systems of Equations Word Problems")
def build_sysw(rng, n, stages, title):
    return [gen_sys_word(rng, stages[i], title) for i in range(n)]


# ---------- Word problems DRT / mixture / work ----------
def gen_drt(rng: random.Random, stage: str, title: str) -> dict:
    name = rng.choice(WORD_NAMES)
    r = rng.choice([30, 40, 45, 50, 60])
    t = rng.choice([2, 3, 4, 5])
    d = r * t
    prompt = f"{name} travels at {r} km/h for {t} hours. How far do they go (km)?"
    return item(prompt=prompt, answer=str(d), solution=f"$d=rt={r}\\times{t}={d}$.", stage=stage, accept=accept_forms(d), clone_of=title)


def gen_mixture(rng: random.Random, stage: str, title: str) -> dict:
    # mix a% and b% to get target
    a, b = 10, 40
    target = rng.choice([20, 25, 30])
    # a*x + b*(total-x) = target*total; pick total=10
    total = 10
    # 10x + 40(10-x) = target*10 → 10x + 400 - 40x = 10*target → -30x = 10*target - 400 → x = (400-10*target)/30
    x = (400 - 10 * target) // 30
    prompt = (
        f"How many liters of a {a}% juice mix should be combined with a {b}% mix to make {total} liters of {target}% juice? "
        f"Enter liters of the {a}% mix."
    )
    sol = f"Let $x$ be liters of {a}%: ${a}x+{b}({total}-x)={target}\\times{total}$ → $x={x}$."
    return item(prompt=prompt, answer=str(x), solution=sol, stage=stage, accept=accept_forms(x), clone_of=title)


def gen_work(rng: random.Random, stage: str, title: str) -> dict:
    name1, name2 = rng.sample(WORD_NAMES, 2)
    t1, t2 = rng.choice([4, 5, 6, 8]), rng.choice([6, 8, 10, 12])
    # together rate 1/t1+1/t2; time = 1/(sum)
    rate = Fraction(1, t1) + Fraction(1, t2)
    together = Fraction(1, 1) / rate
    prompt = (
        f"{name1} can finish a mural in {t1} hours and {name2} in {t2} hours. "
        f"Working together at those steady rates, how many hours do they need? Enter a fraction or decimal."
    )
    ans = latex_num(together)
    sol = f"Combined rate $\\dfrac{{1}}{{{t1}}}+\\dfrac{{1}}{{{t2}}}=\\dfrac{{{rate.numerator}}}{{{rate.denominator}}}$; time $={ans}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, fmt_num(together), float(together)), clone_of=title)


@register("Distance Rate Time Word Problems")
def build_drt(rng, n, stages, title):
    return [gen_drt(rng, stages[i], title) for i in range(n)]


@register("Mixture Word Problems")
def build_mix(rng, n, stages, title):
    return [gen_mixture(rng, stages[i], title) for i in range(n)]


@register("Work Word Problems")
def build_work(rng, n, stages, title):
    return [gen_work(rng, stages[i], title) for i in range(n)]


# ---------- Linear review ----------
def gen_linear_review(rng: random.Random, stage: str, title: str) -> dict:
    m = rng.randint(-4, 5) or 2
    b = rng.randint(-6, 8)
    prompt = f"What is the slope of the line $y={m}x{signed_term(b,'',False)}$?"
    return item(prompt=prompt, answer=str(m), solution=f"Slope-intercept form $y=mx+b$ → $m={m}$.", stage=stage, accept=accept_forms(m), clone_of=title)


def gen_linear_std(rng: random.Random, stage: str, title: str) -> dict:
    a, b, c = rng.randint(1, 6), rng.randint(1, 6), rng.randint(2, 24)
    # ax+by=c → y-intercept when x=0 → y=c/b
    yint = Fraction(c, b)
    prompt = f"For ${a}x+{b}y={c}$, what is the $y$-intercept? Enter as a number (fraction ok)."
    ans = latex_num(yint)
    sol = f"Set $x=0$: ${b}y={c}$ → $y={ans}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, fmt_num(yint)), clone_of=title)


@register("Review of Linear Equations")
def build_rev(rng, n, stages, title):
    return [gen_linear_review(rng, stages[i], title) for i in range(n)]


@register("Review of Linear Equations (standard form prompts)")
def build_rev_std(rng, n, stages, title):
    return [gen_linear_std(rng, stages[i], title) for i in range(n)]


# ---------- Quadratics / factoring ----------
def gen_factor_quad(rng: random.Random, stage: str, title: str) -> dict:
    r1, r2 = rng.randint(-6, 6) or 2, rng.randint(-6, 6) or 3
    # (x-r1)(x-r2)= x^2-(r1+r2)x+r1 r2
    b = -(r1 + r2)
    c = r1 * r2
    prompt = f"Factor $x^{{2}}{signed_term(b,'x',False)}{signed_term(c,'',False)}$. Enter as (x+A)(x+B) with A≤B integers (use signs in A,B)."
    a1, a2 = sorted([-r1, -r2])
    ans = f"(x{a1:+d})(x{a2:+d})"
    sol = f"Roots {r1}, {r2} → factors $(x{(-r1):+d})(x{(-r2):+d})$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, f"(x{a2:+d})(x{a1:+d})"), clone_of=title)


def gen_factor_grouping(rng: random.Random, stage: str, title: str) -> dict:
    a, b, c, d = rng.randint(2, 5), rng.randint(1, 4), rng.randint(2, 5), rng.randint(1, 4)
    # ax+ay+bx+by style: ax + a*k + b*x + b*k = (a+b)(x+k) wait
    # Use: px + p q + r x + r q = (p+r)(x+q)
    p, r, q = rng.randint(2, 6), rng.randint(2, 6), rng.randint(1, 5)
    # expression: p x + p*q + r x + r*q
    expr = f"{p}x+{p*q}+{r}x+{r*q}"
    prompt = f"Factor by grouping: ${expr}$. Enter as (x+A)(B+C) or equivalent like ({p}+{r})(x+{q})."
    ans = f"({p}+{r})(x+{q})"
    # also (p+r)(x+q) numeric: ((p+r)x + (p+r)q)
    alt = f"({p+r})(x+{q})"
    sol = f"Group $({p}x+{p*q})+({r}x+{r*q})={p}(x+{q})+{r}(x+{q})=({p}+{r})(x+{q})$."
    return item(prompt=prompt, answer=alt, solution=sol, stage=stage, accept=accept_forms(alt, ans, f"({q}+x)({p+r})"), clone_of=title)


def gen_solve_factor(rng: random.Random, stage: str, title: str) -> dict:
    r1, r2 = sorted([rng.randint(-5, 5) or -2, rng.randint(-5, 5) or 3])
    b = -(r1 + r2)
    c = r1 * r2
    prompt = f"Solve $x^{{2}}{signed_term(b,'x',False)}{signed_term(c,'',False)}=0$. Enter solutions smaller first, comma-separated."
    ans = f"{r1}, {r2}"
    sol = f"Factor → $(x{-r1:+d})(x{-r2:+d})=0$ → $x={r1}$ or $x={r2}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, f"{r1},{r2}"), clone_of=title)


def gen_square_roots_quad(rng: random.Random, stage: str, title: str) -> dict:
    k = rng.randint(2, 9)
    # x^2 = k^2 → x=±k ; or (x-h)^2 = m
    if stage == "easy":
        prompt = f"Solve $x^{{2}}={k*k}$. Enter solutions smaller first, comma-separated."
        ans = f"{-k}, {k}"
        sol = f"$x=\\pm {k}$."
    else:
        h = rng.randint(-4, 4)
        m = rng.randint(1, 9)
        # (x-h)^2 = m → x = h ± √m ; pick perfect square
        s = rng.randint(1, 5)
        m = s * s
        prompt = f"Solve $(x{signed_term(-h,'',False)})^{{2}}={m}$. Enter solutions smaller first, comma-separated."
        lo, hi = sorted([h - s, h + s])
        ans = f"{lo}, {hi}"
        sol = f"$x{signed_term(-h,'',False)}=\\pm{s}$ → $x={lo}$ or ${hi}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, ans.replace(" ", "")), clone_of=title)


def gen_complete_square_rewrite(rng: random.Random, stage: str, title: str) -> dict:
    # x^2 + bx → (x+b/2)^2 - (b/2)^2 ; ask for the constant added
    b = rng.choice([2, 4, 6, 8, 10, -2, -4, -6])
    half = Fraction(b, 2)
    add = half * half
    prompt = f"To complete the square for $x^{{2}}{signed_term(b,'x',False)}$, what constant should you add? Enter the number."
    ans = latex_num(add)
    sol = f"Half of ${b}$ is ${latex_num(half)}$; square is ${ans}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, fmt_num(add)), clone_of=title)


def gen_solve_complete_square(rng: random.Random, stage: str, title: str) -> dict:
    # x^2 + bx + c = 0 with nice solutions via completing square
    r1, r2 = rng.randint(-4, 3) or -1, rng.randint(1, 5)
    b = -(r1 + r2)
    c = r1 * r2
    prompt = f"Solve by completing the square: $x^{{2}}{signed_term(b,'x',False)}{signed_term(c,'',False)}=0$. Enter solutions smaller first."
    lo, hi = sorted([r1, r2])
    ans = f"{lo}, {hi}"
    sol = f"Completing the square (or factoring) yields $x={lo}$ and $x={hi}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, f"{lo},{hi}"), clone_of=title)


def gen_quad_formula(rng: random.Random, stage: str, title: str) -> dict:
    r1, r2 = rng.randint(-5, 4) or -2, rng.randint(-3, 6) or 4
    a = 1
    b = -(r1 + r2)
    c = r1 * r2
    prompt = f"Use the quadratic formula to solve ${a}x^{{2}}{signed_term(b,'x',False)}{signed_term(c,'',False)}=0$. Enter solutions smaller first, comma-separated."
    lo, hi = sorted([r1, r2])
    ans = f"{lo}, {hi}"
    disc = b * b - 4 * a * c
    sol = f"$x=\\dfrac{{{-b}\\pm\\sqrt{{{disc}}}}}{{2}}={lo},{hi}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, f"{lo},{hi}"), clone_of=title)


def gen_vertex_form(rng: random.Random, stage: str, title: str) -> dict:
    h, k = rng.randint(-5, 5), rng.randint(-6, 8)
    a = rng.choice([1, -1, 2, -2])
    # ask for vertex
    prompt = f"What is the vertex of $y={a}(x{signed_term(-h,'',False)})^{{2}}{signed_term(k,'',False)}$? Enter as (h,k)."
    ans = f"({h}, {k})"
    sol = f"Vertex form $y=a(x-h)^{{2}}+k$ → vertex $({h},{k})$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, f"({h},{k})"), clone_of=title)


@register("Factoring Quadratic Expressions")
def build_fq(rng, n, stages, title):
    return [gen_factor_quad(rng, stages[i], title) for i in range(n)]


@register("Factoring By Grouping")
def build_fg(rng, n, stages, title):
    return [gen_factor_grouping(rng, stages[i], title) for i in range(n)]


@register("Solving Quadratic Equations By Factoring")
def build_sqf(rng, n, stages, title):
    return [gen_solve_factor(rng, stages[i], title) for i in range(n)]


@register("Solving Quadratic Equations by Taking Square Roots")
def build_ssr(rng, n, stages, title):
    return [gen_square_roots_quad(rng, stages[i], title) for i in range(n)]


@register("Completing the Square")
def build_cts(rng, n, stages, title):
    return [gen_complete_square_rewrite(rng, stages[i], title) for i in range(n)]


@register("Solving Quadratic Equations by Completing the Square")
def build_sqcts(rng, n, stages, title):
    return [gen_solve_complete_square(rng, stages[i], title) for i in range(n)]


@register("Using the Quadratic Formula")
def build_qf(rng, n, stages, title):
    return [gen_quad_formula(rng, stages[i], title) for i in range(n)]


@register("Vertex Form of Parabolas")
def build_vf(rng, n, stages, title):
    return [gen_vertex_form(rng, stages[i], title) for i in range(n)]


# ---------- Functions ----------
def gen_eval_fn(rng: random.Random, stage: str, title: str) -> dict:
    a, b, c = rng.randint(1, 5), rng.randint(-4, 6), rng.randint(-5, 5)
    x = rng.randint(-3, 5)
    val = a * x * x + b * x + c
    prompt = f"If $f(x)={a}x^{{2}}{signed_term(b,'x',False)}{signed_term(c,'',False)}$, find $f({x})$."
    sol = f"$f({x})={a}({x})^{{2}}{signed_term(b,'',False)}({x}){signed_term(c,'',False)}={val}$."
    return item(prompt=prompt, answer=str(val), solution=sol, stage=stage, accept=accept_forms(val), clone_of=title)


def gen_fn_ops(rng: random.Random, stage: str, title: str) -> dict:
    # (f+g)(x) or (f∘g)(n)
    a, b, c, d = rng.randint(1, 5), rng.randint(1, 5), rng.randint(1, 4), rng.randint(-3, 4)
    n = rng.randint(-2, 4)
    mode = rng.choice(["sum", "product", "compose"])
    if mode == "sum":
        prompt = f"If $f(x)={a}x+{b}$ and $g(x)={c}x{signed_term(d,'',False)}$, find $(f+g)({n})$."
        val = (a * n + b) + (c * n + d)
        sol = f"$f({n})+g({n})={a*n+b}+{c*n+d}={val}$."
    elif mode == "product":
        prompt = f"If $f(x)={a}x+{b}$ and $g(x)={c}x{signed_term(d,'',False)}$, find $(fg)({n})$."
        val = (a * n + b) * (c * n + d)
        sol = f"$f({n})\\cdot g({n})={a*n+b}\\times{c*n+d}={val}$."
    else:
        prompt = f"If $f(x)={a}x+{b}$ and $g(x)={c}x{signed_term(d,'',False)}$, find $(f\\circ g)({n})$."
        gin = c * n + d
        val = a * gin + b
        sol = f"$g({n})={gin}$, then $f({gin})={val}$."
    return item(prompt=prompt, answer=str(val), solution=sol, stage=stage, accept=accept_forms(val), clone_of=title)


@register("Evaluating Functions")
def build_ef(rng, n, stages, title):
    return [gen_eval_fn(rng, stages[i], title) for i in range(n)]


@register("Function Operations")
def build_fo(rng, n, stages, title):
    return [gen_fn_ops(rng, stages[i], title) for i in range(n)]


# ---------- Polynomials graphing (key points) ----------
def gen_graph_poly(rng: random.Random, stage: str, title: str) -> dict:
    # y-intercept or a root
    roots = sorted(rng.sample(range(-4, 5), 2))
    a = rng.choice([1, -1, 2])
    # y = a(x-r1)(x-r2); y-intercept = a(-r1)(-r2)=a r1 r2
    y0 = a * (-roots[0]) * (-roots[1]) if False else a * (0 - roots[0]) * (0 - roots[1])
    y0 = a * (-roots[0]) * (-roots[1])
    # wait: (0-r1)(0-r2)=(-r1)(-r2)=r1 r2
    y0 = a * roots[0] * roots[1]
    kind = rng.choice(["yint", "root"])
    if kind == "yint":
        prompt = f"For $y={a}(x{(-roots[0]):+d})(x{(-roots[1]):+d})$, what is the $y$-intercept? Enter the $y$-value."
        ans = str(y0)
        sol = f"Set $x=0$: $y={a}({-roots[0]})({-roots[1]})={y0}$."
    else:
        prompt = f"One $x$-intercept of $y={a}(x{(-roots[0]):+d})(x{(-roots[1]):+d})$ is which smaller root?"
        ans = str(roots[0])
        sol = f"Zeros at $x={roots[0]}$ and $x={roots[1]}$; smaller is ${roots[0]}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans), clone_of=title)


@register("Graphing Polynomial Functions")
def build_gp(rng, n, stages, title):
    return [gen_graph_poly(rng, stages[i], title) for i in range(n)]


# ---------- Trig ----------
def gen_trig_graph(rng: random.Random, stage: str, title: str) -> dict:
    amp = rng.randint(1, 5)
    # period of sin(bx): 2pi/|b|
    b = rng.choice([1, 2, 3, 4])
    kind = rng.choice(["amp", "period"])
    if kind == "amp":
        prompt = f"What is the amplitude of $y={amp}\\sin({b}x)$?"
        ans = str(amp)
        sol = f"Amplitude is $|{amp}|={amp}$."
    else:
        # ask period in terms of pi: 2pi/b → enter as fraction like 2pi/3 or number times pi
        if b == 1:
            prompt = f"What is the period of $y={amp}\\sin(x)$? Enter as a multiple of pi like 2pi."
            ans = "2pi"
            sol = f"Period of $\\sin x$ is $2\\pi$."
        else:
            prompt = f"What is the period of $y={amp}\\sin({b}x)$? Enter like 2pi/{b} (no spaces)."
            ans = f"2pi/{b}"
            sol = f"Period $=\\dfrac{{2\\pi}}{{{b}}}={ans}$."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, ans.replace("pi", "π"), f"2π/{b}" if b != 1 else "2π"), clone_of=title)


def gen_trig_graphs_alias(rng, n, stages, title):
    return [gen_trig_graph(rng, stages[i], title) for i in range(n)]


def gen_trig_eq(rng: random.Random, stage: str, title: str) -> dict:
    # sin x = 1/2 on [0,360) → 30,150 ; ask degrees
    # or factor: 2cos^2 x - cos x = 0
    mode = rng.choice(["basic", "factor"])
    if mode == "basic":
        prompt = r"Solve $\sin\theta=\dfrac{1}{2}$ for $\theta$ in $[0^\circ,360^\circ)$. Enter the two angles smaller first, comma-separated (degrees)."
        ans = "30, 150"
        sol = r"Reference $30^\circ$; Q1 and Q2 → $30^\circ,150^\circ$."
        return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(ans, "30,150"), clone_of=title)
    prompt = r"Solve $2\cos^2\theta-\cos\theta=0$ for $\theta$ in $[0^\circ,360^\circ)$. How many solutions are there?"
    # cos(cos-1/2)=0 → cos=0 or cos=1/2 → 90,270 and 60,300 → 4
    ans = "4"
    sol = r"$\cos\theta(2\cos\theta-1)=0$ → $\cos\theta=0$ or $\tfrac{1}{2}$ → four solutions in the interval."
    return item(prompt=prompt, answer=ans, solution=sol, stage=stage, accept=accept_forms(4), clone_of=title)


@register("Graphing Trig Functions")
def build_gt(rng, n, stages, title):
    return [gen_trig_graph(rng, stages[i], title) for i in range(n)]


@register("Graphs of Trig Functions")
def build_gt2(rng, n, stages, title):
    return [gen_trig_graph(rng, stages[i], title) for i in range(n)]


@register("Trig Equations w/ Factoring + Fundamental Identities")
def build_te(rng, n, stages, title):
    return [gen_trig_eq(rng, stages[i], title) for i in range(n)]
