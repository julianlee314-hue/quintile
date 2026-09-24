#!/usr/bin/env python3
"""Generate ~4000 items × 7 eras into site/data/banks/era-*.json."""
from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BANKS = ROOT / "site" / "data" / "banks"
ISO = ROOT / "site" / "data" / "isomorphic_banks.json"
EMH = ROOT / "site" / "data" / "skills_emh.json"

sys.path.insert(0, str(HERE))
from common import (  # noqa
    accept_of,
    latex_frac,
    make_item,
    rng_for,
    stage_for,
    write_era,
)

# ---------- topic builder ----------

def topic(tid, title, course, era, blurb, items, mode="practice"):
    return {
        "id": tid,
        "title": title,
        "courseId": course,
        "era": era,
        "blurb": blurb,
        "itemCount": len(items),
        "defaultMode": mode,
        "difficultyBand": "mixed",
        "hlLink": "Era pack v1 — parametric practice.",
        "items": items,
    }


def split_counts(total: int, names: list) -> dict:
    """Distribute total across named subskills as evenly as possible.
    Chunking to <=800 items per topic id happens in build_course_topics."""
    names = list(names)
    base, rem = divmod(total, len(names))
    out = {}
    for i, n in enumerate(names):
        out[n] = base + (1 if i < rem else 0)
    return out


# ===================== FAMILY GENERATORS =====================

def gen_bonds(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        if st == "easy":
            a = rng.randint(0, 10)
            target = 10
            b = target - a
            prompt = f"What number bonds with ${a}$ to make ${target}$?"
            ans, sol = b, f"${a}+{b}={target}$."
        elif st == "medium":
            target = rng.choice([20, 50, 100])
            a = rng.randint(1, target - 1)
            b = target - a
            prompt = f"What number bonds with ${a}$ to make ${target}$?"
            ans, sol = b, f"${a}+{b}={target}$."
        else:
            target = rng.choice([100, 200, 1000])
            a = rng.randint(10, target - 10)
            b = target - a
            prompt = f"Find the partner of ${a}$ that sums to ${target}$."
            ans, sol = b, f"${a}+{b}={target}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_four_ops(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        op = rng.choice(["+", "-", "*", "/"])
        if st == "easy":
            a, b = rng.randint(1, 12), rng.randint(1, 12)
        elif st == "medium":
            a, b = rng.randint(10, 80), rng.randint(2, 40)
        else:
            a, b = rng.randint(50, 400), rng.randint(3, 60)
        if op == "+":
            ans = a + b
            prompt = f"Compute ${a}+{b}$."
            sol = f"${a}+{b}={ans}$."
        elif op == "-":
            if a < b:
                a, b = b, a
            ans = a - b
            prompt = f"Compute ${a}-{b}$."
            sol = f"${a}-{b}={ans}$."
        elif op == "*":
            if st == "easy":
                a, b = rng.randint(2, 10), rng.randint(2, 10)
            ans = a * b
            prompt = f"Compute ${a}\\times{b}$."
            sol = f"${a}\\times{b}={ans}$."
        else:
            b = rng.randint(2, 12 if st == "easy" else 20)
            q = rng.randint(2, 12 if st == "easy" else 30)
            a = b * q
            ans = q
            prompt = f"Compute ${a}\\div{b}$."
            sol = f"${a}\\div{b}={ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_place_value(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        if st == "easy":
            num = rng.randint(10, 99)
            prompt = f"What is the tens digit of ${num}$?"
            ans = num // 10
            sol = f"${num}$ has tens digit ${ans}$."
        elif st == "medium":
            num = rng.randint(100, 999)
            prompt = f"What is the value of the hundreds digit in ${num}$?"
            d = num // 100
            ans = d * 100
            sol = f"Hundreds digit ${d}$ → value ${ans}$."
        else:
            num = rng.randint(1000, 9999)
            prompt = f"Round ${num}$ to the nearest hundred."
            ans = int(round(num / 100.0) * 100)
            # Python banker's rounding — use classic half-up
            ans = ((num + 50) // 100) * 100
            sol = f"Nearest hundred to ${num}$ is ${ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_frac_intro(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        if st == "easy":
            d = rng.choice([2, 3, 4, 5, 8, 10])
            k = rng.randint(1, d)
            prompt = f"What is $\\dfrac{{{k}}}{{{d}}}$ of ${d*rng.choice([2,3,4,5])}$?"
            # rebuild clean: of N where N divisible
            N = d * rng.randint(2, 6)
            prompt = f"What is $\\dfrac{{{k}}}{{{d}}}$ of ${N}$?"
            ans = k * N // d
            sol = f"$\\dfrac{{{k}}}{{{d}}}\\times{N}={ans}$."
        elif st == "medium":
            a, b = rng.randint(1, 5), rng.randint(2, 8)
            c, d = rng.randint(1, 5), rng.randint(2, 8)
            # simplify a/b + c/d ask numerator of sum over common denom — ask value as fraction
            f = Fraction(a, b) + Fraction(c, d)
            prompt = f"Compute $\\dfrac{{{a}}}{{{b}}}+\\dfrac{{{c}}}{{{d}}}$. Enter a simplified fraction or integer."
            ans = latex_frac(f.numerator, f.denominator)
            sol = f"Sum $=\\dfrac{{{f.numerator}}}{{{f.denominator}}}$."
        else:
            a, b = rng.randint(1, 7), rng.randint(2, 9)
            f = Fraction(a, b)
            prompt = f"Simplify $\\dfrac{{{a*3}}}{{{b*3}}}$."
            ans = latex_frac(f.numerator, f.denominator)
            sol = f"Divide top and bottom by $3$ → ${ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill,
                               extra_accept=[ans]))
    return items


def gen_percent_seed(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        pct = rng.choice([10, 20, 25, 50, 5, 75]) if st != "hard" else rng.choice([15, 30, 35, 40, 60, 12])
        base = rng.choice([20, 40, 50, 80, 100, 200, 250])
        ans = pct * base // 100
        # ensure integer
        while pct * base % 100:
            base = rng.choice([20, 40, 50, 80, 100, 200])
            ans = pct * base // 100
        prompt = f"What is ${pct}\\%$ of ${base}$?"
        sol = f"$\\dfrac{{{pct}}}{{100}}\\times{base}={ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_money(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        a = rng.randint(1, 50 if st == "easy" else 200)
        b = rng.randint(1, 50 if st == "easy" else 200)
        if st == "hard":
            prompt = f"You buy items costing ${a}$ and ${b}$ baht. You pay with a ${((a+b+99)//100)*100}$ baht note. What is the change?"
            pay = ((a + b + 99) // 100) * 100
            if pay < a + b:
                pay = a + b
            # nicer: pay with next round 100
            pay = int(math.ceil((a + b) / 100.0) * 100)
            if pay == a + b:
                pay += 100
            ans = pay - (a + b)
            sol = f"Total ${a+b}$; change ${pay}-({a}+{b})={ans}$."
        else:
            prompt = f"Add ${a}+{b}$ (money units)."
            ans = a + b
            sol = f"${a}+{b}={ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_time(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        h, m = rng.randint(1, 10), rng.choice([0, 15, 30, 45, 10, 20])
        add = rng.choice([15, 30, 45, 60, 90, 120])
        total = h * 60 + m + add
        nh, nm = (total // 60) % 24, total % 60
        prompt = f"A clock shows ${h}:{m:02d}$. What time is it after ${add}$ minutes? Enter as H:MM (24h ok)."
        ans = f"{nh}:{nm:02d}"
        sol = f"${h}:{m:02d}$ plus ${add}$ min → ${ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill,
                               extra_accept=[f"{nh}:{nm}", f"{nh}:{nm:02d}"]))
    return items


def gen_length_mass(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        kind = rng.choice(["cm_m", "g_kg", "ml_l"])
        if kind == "cm_m":
            m = rng.randint(1, 9)
            cm = m * 100 + (0 if st == "easy" else rng.randint(0, 99))
            prompt = f"Convert ${cm}$ cm to metres. Enter a decimal or fraction."
            ans = Fraction(cm, 100)
            anss = latex_frac(ans.numerator, ans.denominator) if ans.denominator != 1 else str(ans.numerator)
            if ans.denominator in (2, 4, 5, 10, 20, 25, 50):
                extra = [str(float(ans))]
            else:
                extra = [f"{cm}/100", str(float(ans))]
            sol = f"${cm}\\div100={float(ans)}$ m."
            answer = anss if ans.denominator != 1 else str(int(ans))
            # prefer decimal for .xx
            if cm % 100 == 0:
                answer = str(cm // 100)
            else:
                answer = str(float(ans)).rstrip("0").rstrip(".") if "." in str(float(ans)) else str(float(ans))
            items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                                   prompt=prompt, answer=answer, solution=sol, stage=st, skill=skill,
                                   extra_accept=extra + [answer]))
        elif kind == "g_kg":
            kg = rng.randint(1, 5)
            g = kg * 1000
            prompt = f"Convert ${g}$ g to kilograms."
            ans = kg
            sol = f"${g}\\div1000={kg}$."
            items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                                   prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
        else:
            L = rng.randint(1, 8)
            ml = L * 1000
            prompt = f"Convert ${ml}$ ml to litres."
            items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                                   prompt=prompt, answer=L, solution=f"${ml}\\div1000={L}$.", stage=st, skill=skill))
    return items


def gen_integers(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        a = rng.randint(-20, 20)
        b = rng.randint(-15, 15)
        if st == "easy":
            a, b = rng.randint(-10, 10), rng.randint(1, 10)
            prompt = f"Compute ${a}+({b})$."
            ans = a + b
        elif st == "medium":
            prompt = f"Compute ${a}-({b})$."
            ans = a - b
        else:
            prompt = f"Compute $({a})\\times({b})$."
            ans = a * b
        sol = f"Result ${ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_ratio(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        a, b = rng.randint(1, 6), rng.randint(1, 6)
        k = rng.randint(2, 8)
        prompt = f"A ratio is ${a}:{b}$. If the first part becomes ${a*k}$, what is the second part?"
        ans = b * k
        sol = f"Scale by ${k}$: second part ${b*k}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_expressions(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        a, b, x = rng.randint(1, 9), rng.randint(0, 9), rng.randint(-5, 8) or 2
        prompt = f"Evaluate ${a}x+{b}$ when $x={x}$."
        ans = a * x + b
        sol = f"${a}({x})+{b}={ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_eq_seed(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        a = rng.randint(2, 9)
        x = rng.randint(-6, 12) or 3
        b = rng.randint(0, 15)
        rhs = a * x + b
        prompt = f"Solve ${a}x+{b}={rhs}$."
        sol = f"$x={x}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=x, solution=sol, stage=st, skill=skill,
                               extra_accept=[f"x={x}"]))
    return items


def gen_angles(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        if st == "easy":
            a = rng.randint(20, 160)
            prompt = f"Two angles on a straight line: one is ${a}^{{\\circ}}$. Find the other."
            ans = 180 - a
            sol = f"$180-{a}={ans}$."
        elif st == "medium":
            a = rng.randint(40, 140)
            prompt = f"Vertically opposite to ${a}^{{\\circ}}$ is what measure?"
            ans = a
            sol = f"Vertically opposite angles are equal: ${a}$."
        else:
            a, b = rng.randint(30, 80), rng.randint(30, 80)
            prompt = f"In a triangle, two angles are ${a}^{{\\circ}}$ and ${b}^{{\\circ}}$. Find the third."
            ans = 180 - a - b
            sol = f"$180-{a}-{b}={ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_area_peri(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        if rng.random() < 0.5:
            l, w = rng.randint(2, 20), rng.randint(2, 15)
            if st == "easy" or rng.random() < 0.5:
                prompt = f"Perimeter of a ${l}\\times{w}$ rectangle?"
                ans = 2 * (l + w)
                sol = f"$2({l}+{w})={ans}$."
            else:
                prompt = f"Area of a ${l}\\times{w}$ rectangle?"
                ans = l * w
                sol = f"${l}\\times{w}={ans}$."
        else:
            side = rng.randint(2, 16)
            prompt = f"Area of a square with side ${side}$?"
            ans = side * side
            sol = f"${side}^{{2}}={ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_shapes(era, course, skill, n, start_idx=1):
    items = []
    names = {3: "triangle", 4: "quadrilateral", 5: "pentagon", 6: "hexagon", 8: "octagon"}
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        sides = rng.choice(list(names))
        prompt = f"How many sides does a {names[sides]} have?"
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=sides, solution=f"A {names[sides]} has ${sides}$ sides.",
                               stage=st, skill=skill))
    return items


def gen_linear_eq(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        a = rng.randint(2, 12)
        x = rng.randint(-10, 15) or 4
        b = rng.randint(-10, 20)
        rhs = a * x + b
        prompt = f"Solve ${a}x{b:+d}={rhs}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=x, solution=f"$x={x}$.", stage=st, skill=skill,
                               extra_accept=[f"x={x}"]))
    return items


def gen_systems(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        x, y = rng.randint(-5, 8) or 2, rng.randint(-5, 8) or 3
        a1, b1 = rng.randint(1, 5), rng.randint(1, 5)
        a2, b2 = rng.randint(1, 5), rng.randint(1, 5)
        while a1 * b2 == a2 * b1:
            b2 = rng.randint(1, 6)
        c1, c2 = a1 * x + b1 * y, a2 * x + b2 * y
        prompt = f"Solve ${a1}x+{b1}y={c1}$, ${a2}x+{b2}y={c2}$. Enter (x,y)."
        ans = f"({x}, {y})"
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=f"$x={x}$, $y={y}$.", stage=st, skill=skill,
                               extra_accept=[f"({x},{y})"]))
    return items


def gen_quad_solve(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        r1 = rng.randint(-6, 5) or -2
        r2 = rng.randint(-4, 7) or 3
        B, C = -(r1 + r2), r1 * r2
        mid = f"{B}x" if B < 0 else (f"+{B}x" if B else "")
        const = f"+{C}" if C >= 0 else str(C)
        lo, hi = sorted([r1, r2])
        prompt = f"Solve $x^{{2}}{mid}{const}=0$. Enter roots smaller first, comma-separated."
        ans = f"{lo}, {hi}"
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=f"Roots ${lo}, {hi}$.", stage=st, skill=skill,
                               extra_accept=[f"{lo},{hi}"]))
    return items


def gen_factoring(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        r1, r2 = sorted([rng.randint(1, 8), rng.randint(1, 8)])
        B, C = -(r1 + r2), r1 * r2
        mid = f"{B}x" if B < 0 else (f"+{B}x" if B else "")
        const = f"+{C}" if C >= 0 else str(C)
        prompt = f"Factor $x^{{2}}{mid}{const}$. Enter (x-A)(x-B) with A≤B."
        ans = f"(x-{r1})(x-{r2})"
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=f"${ans}$.", stage=st, skill=skill,
                               extra_accept=[f"(x-{r2})(x-{r1})"]))
    return items


def gen_trig_right(era, course, skill, n, start_idx=1):
    trips = [(3, 4, 5), (5, 12, 13), (6, 8, 10), (7, 24, 25), (8, 15, 17), (9, 12, 15)]
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        opp, adj, hyp = rng.choice(trips)
        which = rng.choice(["sin", "cos", "tan"])
        if which == "sin":
            ans = latex_frac(opp, hyp)
            prompt = f"Right triangle legs ${opp}$ (opposite) and ${adj}$ (adjacent). Find $\\sin\\theta$."
            sol = f"Hyp ${hyp}$; $\\sin=\\dfrac{{{opp}}}{{{hyp}}}$."
        elif which == "cos":
            ans = latex_frac(adj, hyp)
            prompt = f"Right triangle legs ${opp}$ (opposite) and ${adj}$ (adjacent). Find $\\cos\\theta$."
            sol = f"$\\cos=\\dfrac{{{adj}}}{{{hyp}}}$."
        else:
            ans = latex_frac(opp, adj)
            prompt = f"Right triangle opposite ${opp}$, adjacent ${adj}$. Find $\\tan\\theta$."
            sol = f"$\\tan=\\dfrac{{{opp}}}{{{adj}}}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill,
                               extra_accept=[ans.replace("\\dfrac{", "").replace("}{", "/").replace("}", "")]))
    return items


def gen_trig_exact(era, course, skill, n, start_idx=1):
    table = [
        ("sin", 30, "1/2", "\\dfrac{1}{2}"),
        ("cos", 60, "1/2", "\\dfrac{1}{2}"),
        ("tan", 45, "1", "1"),
        ("sin", 60, "sqrt3/2", "\\dfrac{\\sqrt{3}}{2}"),
        ("cos", 30, "sqrt3/2", "\\dfrac{\\sqrt{3}}{2}"),
        ("sin", 45, "sqrt2/2", "\\dfrac{\\sqrt{2}}{2}"),
        ("cos", 45, "sqrt2/2", "\\dfrac{\\sqrt{2}}{2}"),
    ]
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        fn, ang, bare, tex = rng.choice(table)
        prompt = f"Exact value of $\\{fn} {ang}^{{\\circ}}$?"
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=tex, solution=f"Standard angle → ${tex}$.",
                               stage=st, skill=skill, extra_accept=[bare, tex]))
    return items


def gen_higher_num(era, course, skill, n, start_idx=1):
    """GCSE-higher style: indices, surds, standard form light."""
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        mode = rng.choice(["power", "surd", "std"])
        if mode == "power":
            a, b, c = rng.randint(2, 5), rng.randint(2, 4), rng.randint(1, 3)
            ans = a ** (b - c) if b >= c else Fraction(1, a ** (c - b))
            prompt = f"Simplify ${a}^{{{b}}}\\div{a}^{{{c}}}$."
            if isinstance(ans, Fraction):
                anss = latex_frac(ans.numerator, ans.denominator)
            else:
                anss = str(ans)
            sol = f"${a}^{{{b-c}}}={anss}$."
            answer = anss
        elif mode == "surd":
            k = rng.choice([8, 12, 18, 20, 27, 32, 50, 75])
            sq = max(i for i in range(1, int(math.sqrt(k)) + 1) if k % (i * i) == 0)
            rem = k // (sq * sq)
            answer = str(sq) if rem == 1 else (f"{sq}\\sqrt{{{rem}}}" if sq > 1 else f"\\sqrt{{{k}}}")
            prompt = f"Simplify $\\sqrt{{{k}}}$."
            sol = f"$\\sqrt{{{k}}}={answer}$."
        else:
            m = rng.randint(11, 99)
            e = rng.randint(2, 5)
            # m * 10^e written; ask coefficient for scientific form m.d × 10^?
            val = m * (10 ** e)
            # scientific: first digit
            s = str(val)
            coef = float(s[0] + "." + s[1:]) if False else None
            # ask: 3400 = 3.4 × 10^n → n
            # pick clean: a.b × 10^n
            a = rng.randint(1, 9)
            b = rng.randint(0, 9)
            e = rng.randint(2, 6)
            prompt = f"In standard form ${a}.{b}\\times10^{{n}}={int((a+b/10)*(10**e))}$ when written normally, what is $n$?"
            # verify
            num = int(round((a + b / 10) * (10 ** e)))
            prompt = f"${a}.{b}\\times10^{{n}}={num}$. Find $n$."
            answer = e
            sol = f"Standard form exponent is ${e}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=answer, solution=sol, stage=st, skill=skill))
    return items


def gen_fn_eval(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        a, b, x = rng.randint(1, 6), rng.randint(-5, 8), rng.randint(-4, 6)
        prompt = f"If $f(x)={a}x{b:+d}$, find $f({x})$."
        ans = a * x + b
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=f"$f({x})={ans}$.", stage=st, skill=skill))
    return items


def gen_fn_compose(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        a, b, c, x = rng.randint(1, 5), rng.randint(1, 5), rng.randint(-3, 4), rng.randint(-3, 5)
        # (f∘g)(x) f=ax+b g=x+c
        gin = x + c
        ans = a * gin + b
        prompt = f"$f(x)={a}x{b:+d}$, $g(x)=x{c:+d}$. Find $(f\\circ g)({x})$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=f"$g({x})={gin}$, $f={ans}$.", stage=st, skill=skill))
    return items


def gen_poly_eval(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        a, b, c, x = rng.randint(1, 4), rng.randint(-4, 5), rng.randint(-5, 5), rng.randint(-3, 4)
        ans = a * x * x + b * x + c
        prompt = f"Evaluate $p(x)={a}x^{{2}}{b:+d}x{c:+d}$ at $x={x}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=f"$p({x})={ans}$.", stage=st, skill=skill))
    return items


def gen_poly_roots(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        r1, r2 = sorted(rng.sample(range(-5, 6), 2))
        prompt = f"One root of $(x{(-r1):+d})(x{(-r2):+d})=0$ is? Enter the smaller root."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=r1, solution=f"Smaller root ${r1}$.", stage=st, skill=skill))
    return items


def gen_logs(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        base = rng.choice([2, 3, 5, 10])
        e = rng.randint(1, 5)
        prompt = f"Evaluate $\\log_{{{base}}}{base**e}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=e, solution=f"$\\log_{{{base}}}({base}^{{{e}}})={e}$.",
                               stage=st, skill=skill))
    return items


def gen_exp_eq(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        base = rng.choice([2, 3, 4, 5, 10])
        e = rng.randint(2, 5)
        prompt = f"Solve ${base}^{{x}}={base**e}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=e, solution=f"$x={e}$.", stage=st, skill=skill,
                               extra_accept=[f"x={e}"]))
    return items


def gen_aa_binomial(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        # C(n,k)
        nn = rng.randint(4, 10 if st != "hard" else 12)
        k = rng.randint(1, nn - 1)
        ans = math.comb(nn, k)
        prompt = f"Compute $\\binom{{{nn}}}{{{k}}}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=f"$\\binom{{{nn}}}{{{k}}}={ans}$.",
                               stage=st, skill=skill))
    return items


def gen_aa_seq(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        a1, d = rng.randint(1, 10), rng.randint(1, 8)
        k = rng.randint(3, 12)
        ans = a1 + (k - 1) * d
        prompt = f"Arithmetic sequence $a_1={a1}$, common difference ${d}$. Find $a_{{{k}}}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=f"$a_n=a_1+(n-1)d$ → ${ans}$.",
                               stage=st, skill=skill))
    return items


def gen_aa_diff(era, course, skill, n, start_idx=1):
    """Power rule derivatives — integer answers for coeff or evaluate."""
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        p = rng.randint(2, 6)
        a = rng.randint(1, 7)
        # d/dx [a x^p] = a p x^{p-1}; ask coefficient of x^{p-1}
        coef = a * p
        prompt = f"Differentiate ${a}x^{{{p}}}$. What is the coefficient of $x^{{{p-1}}}$ in the derivative?"
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=coef, solution=f"Power rule → ${coef}x^{{{p-1}}}$.",
                               stage=st, skill=skill))
    return items


def gen_aa_integral(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        p = rng.randint(1, 5)
        a = rng.randint(1, 6)
        # ∫ a x^p dx = a/(p+1) x^{p+1}; ask a/(p+1) as fraction
        f = Fraction(a, p + 1)
        prompt = f"For $\\int {a}x^{{{p}}}\\,dx=\\dfrac{{{a}}}{{{p+1}}}x^{{{p+1}}}+C$, what is the coefficient of $x^{{{p+1}}}$?"
        ans = latex_frac(f.numerator, f.denominator)
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=f"Coefficient ${ans}$.",
                               stage=st, skill=skill, extra_accept=[str(f), f"{f.numerator}/{f.denominator}"]))
    return items


def gen_sl_basic(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        # mix: percent change, linear, simple prob
        mode = rng.choice(["pct", "lin", "prob"])
        if mode == "pct":
            old, pct = rng.choice([40, 50, 80, 100, 200]), rng.choice([10, 20, 25, 50])
            ans = old * (100 + pct) // 100
            prompt = f"Increase ${old}$ by ${pct}\\%$. New value?"
            sol = f"${old}\\times(1+{pct}/100)={ans}$."
        elif mode == "lin":
            m, x, b = rng.randint(1, 6), rng.randint(-3, 5), rng.randint(-4, 8)
            ans = m * x + b
            prompt = f"For $y={m}x{b:+d}$, find $y$ when $x={x}$."
            sol = f"$y={ans}$."
        else:
            fav, tot = rng.randint(1, 5), rng.choice([6, 8, 10, 12])
            while fav > tot:
                fav = rng.randint(1, tot)
            ans = latex_frac(fav, tot)
            prompt = f"A bag has ${tot}$ equal tickets, ${fav}$ winning. Probability of winning?"
            sol = f"$\\dfrac{{{fav}}}{{{tot}}}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_apps(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        # finance / modeling light
        P = rng.choice([100, 200, 500, 1000])
        r = rng.choice([2, 5, 10])
        t = rng.randint(1, 4)
        # simple interest I = Prt/100
        ans = P * r * t // 100
        prompt = f"Simple interest on ${P}$ at ${r}\\%$ per year for ${t}$ years?"
        sol = f"$I=\\dfrac{{Prt}}{{100}}={ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_calculus(era, course, skill, n, start_idx=1):
    return gen_aa_diff(era, course, skill, n, start_idx)


def gen_stats(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        xs = [rng.randint(1, 20) for _ in range(rng.choice([4, 5, 6]))]
        mode = rng.choice(["mean", "median", "range"])
        if mode == "mean":
            f = Fraction(sum(xs), len(xs))
            ans = latex_frac(f.numerator, f.denominator)
            prompt = f"Mean of ${', '.join(map(str, xs))}$?"
            sol = f"Sum ${sum(xs)}$ / ${len(xs)}$ = ${ans}$."
        elif mode == "median":
            s = sorted(xs)
            if len(s) % 2:
                ans = str(s[len(s) // 2])
            else:
                f = Fraction(s[len(s) // 2 - 1] + s[len(s) // 2], 2)
                ans = latex_frac(f.numerator, f.denominator)
            prompt = f"Median of ${', '.join(map(str, xs))}$?"
            sol = f"Sorted ${s}$ → median ${ans}$."
        else:
            ans = str(max(xs) - min(xs))
            prompt = f"Range of ${', '.join(map(str, xs))}$?"
            sol = f"${max(xs)}-{min(xs)}={ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_linalg(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        a, b, c, d = [rng.randint(-5, 6) or 1 for _ in range(4)]
        # det 2x2
        det = a * d - b * c
        prompt = f"Determinant of $\\begin{{pmatrix}}{a}&{b}\\\\{c}&{d}\\end{{pmatrix}}$?"
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=det, solution=f"$ad-bc={det}$.", stage=st, skill=skill))
    return items


def gen_mechanics(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        u = rng.randint(2, 20)
        tt = rng.randint(1, 10)
        mode = rng.choice(["v", "s"])
        if mode == "v":
            a = rng.choice([0, 2, 4, 5, 10])
            ans = u + a * tt
            prompt = f"Initial speed ${u}$ m/s, acceleration ${a}$ m/s$^2$, time ${tt}$ s. Find final speed $v$."
            sol = f"$v=u+at={ans}$."
        else:
            a = rng.choice([2, 4, 6, 8, 10])  # even so (1/2)a t^2 integer when t any
            ans = u * tt + (a * tt * tt) // 2
            prompt = f"$u={u}$, $a={a}$, $t={tt}$. Find displacement $s=ut+\tfrac{{1}}{{2}}at^{{2}}$."
            sol = f"$s={u}\times{tt}+\tfrac{{1}}{{2}}({a})({tt})^{{2}}={ans}$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_series(era, course, skill, n, start_idx=1):
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        # geometric partial sum or limit intuition: sum of 1/2^k
        mode = rng.choice(["geo", "arith_sum", "limit"])
        if mode == "geo":
            a, r, k = rng.randint(1, 5), rng.choice([2, 3]), rng.randint(2, 5)
            # sum a + ar + ... + ar^{k-1} with integer r
            ans = a * (r ** k - 1) // (r - 1)
            prompt = f"Sum of geometric series $a={a}$, ratio ${r}$, first ${k}$ terms?"
            sol = f"$S=a\\dfrac{{r^{{k}}-1}}{{r-1}}={ans}$."
        elif mode == "arith_sum":
            a1, d, k = rng.randint(1, 8), rng.randint(1, 5), rng.randint(3, 12)
            ans = k * (2 * a1 + (k - 1) * d) // 2
            prompt = f"Sum of first ${k}$ terms of AP with $a_1={a1}$, $d={d}$?"
            sol = f"$S=\\dfrac{{k}}{{2}}(2a+(k-1)d)={ans}$."
        else:
            # lim n→∞ of n/(n+k) = 1
            k = rng.randint(1, 9)
            prompt = f"As $n\\to\\infty$, $\\dfrac{{n}}{{n+{k}}}$ approaches what integer?"
            ans = 1
            sol = f"Divide by $n$: $\\dfrac{{1}}{{1+{k}/n}}\\to1$."
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill))
    return items


def gen_topology_mc(era, course, skill, n, start_idx=1):
    """Short conceptual / countable topology-ish questions with clear keys."""
    bank = [
        ("Is the open interval (0,1) bounded in R? yes or no", "yes", "It sits inside [0,1]."),
        ("Is the set of integers Z closed in R with the usual topology? yes or no", "yes", "Complement is open union of gaps."),
        ("Does a continuous image of a connected set stay connected? yes or no", "yes", "Continuous maps preserve connectedness."),
        ("Is a singleton {a} connected in R? yes or no", "yes", "Cannot split into two nonempty disjoint opens."),
        ("Is Q (rationals) connected in R? yes or no", "no", "Rationals are totally disconnected."),
        ("Does compactness imply sequential compactness in R^n? yes or no", "yes", "True in metric spaces like R^n."),
        ("Is (0,1) compact in R? yes or no", "no", "Not closed and not covering-compact."),
        ("Is [0,1] compact in R? yes or no", "yes", "Closed bounded in R."),
        ("Homeomorphic spaces share the same number of connected components? yes or no", "yes", "Homeomorphisms preserve topology."),
        ("Is a discrete two-point space connected? yes or no", "no", "Each point is open."),
        ("Can removing one point disconnect R? yes or no", "yes", "R\\\\{0} has two rays."),
        ("Can removing one point disconnect the circle S^1? yes or no", "no", "Circle minus a point is an open arc, still connected."),
        ("Is the empty set open in R? yes or no", "yes", "By definition of a topology."),
        ("Is the empty set closed in R? yes or no", "yes", "Complement R is open."),
        ("Finite union of closed sets is closed? yes or no", "yes", "Standard topology axiom consequence."),
        ("Arbitrary union of closed sets is always closed? yes or no", "no", "Only finite unions must be."),
        ("Arbitrary intersection of open sets is always open? yes or no", "no", "Only finite intersections must be."),
        ("A metric induces a topology? yes or no", "yes", "Open balls generate a topology."),
        ("Are all norms on R^n equivalent? yes or no", "yes", "Finite-dimensional fact."),
        ("Is every subspace of a Hausdorff space Hausdorff? yes or no", "yes", "Inherited separations."),
    ]
    items = []
    for i in range(n):
        rng = rng_for(era, course, skill, i)
        st = stage_for(i)
        q, ans, sol = bank[i % len(bank)]
        # lightly vary by appending a tag so prompts aren't identical only — keep same Q for determinism of answer
        prompt = q[0].upper() + q[1:] if q else q
        prompt = f"{prompt}"
        items.append(make_item(topic_id=f"era-{era}-{course}-{skill}", idx=start_idx + i,
                               prompt=prompt, answer=ans, solution=sol, stage=st, skill=skill,
                               extra_accept=[ans.capitalize()]))
    return items


# Map skill name → generator
GEN_MAP = {
    "bonds": gen_bonds,
    "four-ops": gen_four_ops,
    "place-value": gen_place_value,
    "fractions-intro": gen_frac_intro,
    "percent-seeds": gen_percent_seed,
    "money": gen_money,
    "time": gen_time,
    "length-mass-capacity": gen_length_mass,
    "integers": gen_integers,
    "ratio": gen_ratio,
    "expressions": gen_expressions,
    "equations-seed": gen_eq_seed,
    "angles": gen_angles,
    "area-perimeter": gen_area_peri,
    "shapes": gen_shapes,
    "linear-equations": gen_linear_eq,
    "systems": gen_systems,
    "quadratics": gen_quad_solve,
    "factoring": gen_factoring,
    "trig-right": gen_trig_right,
    "trig-exact": gen_trig_exact,
    "higher-number": gen_higher_num,
    "fn-eval": gen_fn_eval,
    "fn-compose": gen_fn_compose,
    "poly-eval": gen_poly_eval,
    "poly-roots": gen_poly_roots,
    "logs": gen_logs,
    "exp-eq": gen_exp_eq,
    "binomial": gen_aa_binomial,
    "sequences": gen_aa_seq,
    "differentiation": gen_aa_diff,
    "integration": gen_aa_integral,
    "sl-core": gen_sl_basic,
    "applications-finance": gen_apps,
    "calculus": gen_calculus,
    "statistics": gen_stats,
    "linear-algebra": gen_linalg,
    "mechanics": gen_mechanics,
    "series-limits": gen_series,
    "topology-concepts": gen_topology_mc,
}


def build_course_topics(era, course, allocation: dict, title_prefix=""):
    """allocation: skill -> count. Split if count>800."""
    topics = []
    course_total = 0
    for skill, count in allocation.items():
        gen = GEN_MAP[skill]
        # split into chunks of max 800
        chunks = []
        remaining = count
        part = 1
        while remaining > 0:
            take = min(800, remaining)
            chunks.append((part, take))
            remaining -= take
            part += 1
        for part, take in chunks:
            sid = skill if len(chunks) == 1 else f"{skill}-{part}"
            tid = f"era-{era}-{course}-{sid}"
            items = gen(era, course, sid, take, start_idx=1)
            assert len(items) == take, (tid, len(items), take)
            title = f"{title_prefix}{skill.replace('-', ' ').title()}"
            if len(chunks) > 1:
                title += f" ({part})"
            topics.append(topic(tid, title, course, era,
                                f"Era pack · {era} · {course} · {skill}", items))
            course_total += len(items)
    return topics, course_total


def iso_counts_by_course():
    if not ISO.exists():
        return {}
    data = json.loads(ISO.read_text())
    c = defaultdict(int)
    for t in data.get("topics", []):
        c[t.get("courseId") or "other"] += len(t.get("items") or [])
    return dict(c)


def main():
    BANKS.mkdir(parents=True, exist_ok=True)
    iso_c = iso_counts_by_course()
    print("iso fold credits:", iso_c)

    index = {"generated": "2026-09-24", "eras": {}, "grandTotal": 0, "targetGrand": 28000,
             "note": "era-pack-v1; isomorphic_banks folded into Secondary/Bridge quotas as credits"}

    # ----- I Counting -----
    # arithmetic 2800, measures 1200
    arith = split_counts(2800, ["bonds", "four-ops", "place-value", "fractions-intro", "percent-seeds"])
    meas = split_counts(1200, ["money", "time", "length-mass-capacity"])
    topics = []
    courses = {}
    t, n = build_course_topics("counting", "arithmetic", arith)
    topics += t; courses["arithmetic"] = n
    t, n = build_course_topics("counting", "measures", meas)
    topics += t; courses["measures"] = n
    meta = write_era(BANKS / "era-counting.json", "counting", 4000, topics, courses)
    index["eras"]["counting"] = meta
    print("counting", meta)

    # ----- II Workshop -----
    pre = split_counts(2200, ["integers", "ratio", "expressions", "equations-seed"])
    geo = split_counts(1800, ["angles", "shapes", "area-perimeter"])
    # fold 8 prealg iso into prealgebra remaining
    pre_need = max(0, 2200 - iso_c.get("prealgebra", 0))
    # redistribute pre_need across same skills
    pre = split_counts(pre_need if pre_need else 2200, ["integers", "ratio", "expressions", "equations-seed"])
    topics = []
    courses = {}
    t, n = build_course_topics("workshop", "prealgebra", pre)
    topics += t; courses["prealgebra"] = n
    t, n = build_course_topics("workshop", "geometry", geo)
    topics += t; courses["geometry"] = n
    meta = write_era(BANKS / "era-workshop.json", "workshop", 4000, topics, courses)
    meta["isoCredit"] = {"prealgebra": iso_c.get("prealgebra", 0)}
    meta["withIso"] = meta["actual"] + meta["isoCredit"].get("prealgebra", 0)
    index["eras"]["workshop"] = meta
    print("workshop", meta)

    # ----- III Secondary -----
    alg_need = max(0, 2200 - iso_c.get("algebra", 0))
    trig_need = max(0, 800 - iso_c.get("trigonometry", 0))
    higher_need = 1000
    alg = split_counts(alg_need, ["linear-equations", "systems", "quadratics", "factoring"])
    trig = split_counts(trig_need, ["trig-right", "trig-exact"])
    higher = split_counts(higher_need, ["higher-number", "linear-equations", "quadratics"])
    topics = []
    courses = {}
    t, n = build_course_topics("secondary", "algebra", alg)
    topics += t; courses["algebra"] = n
    t, n = build_course_topics("secondary", "trigonometry", trig)
    topics += t; courses["trigonometry"] = n
    t, n = build_course_topics("secondary", "higher", higher)
    topics += t; courses["higher"] = n
    meta = write_era(BANKS / "era-secondary.json", "secondary", 4000, topics, courses)
    meta["isoCredit"] = {"algebra": iso_c.get("algebra", 0), "trigonometry": iso_c.get("trigonometry", 0)}
    meta["withIso"] = meta["actual"] + sum(meta["isoCredit"].values())
    index["eras"]["secondary"] = meta
    print("secondary", meta)

    # ----- IV Bridge -----
    fn_need = 1800
    # precalc 2200 - 18 iso precalc
    pc_need = max(0, 2200 - iso_c.get("precalculus", 0))
    fn = split_counts(fn_need, ["fn-eval", "fn-compose", "logs", "exp-eq"])
    pc = split_counts(pc_need, ["poly-eval", "poly-roots", "logs", "fn-compose"])
    topics = []
    courses = {}
    t, n = build_course_topics("bridge", "functions", fn)
    topics += t; courses["functions"] = n
    t, n = build_course_topics("bridge", "precalculus", pc)
    topics += t; courses["precalculus"] = n
    meta = write_era(BANKS / "era-bridge.json", "bridge", 4000, topics, courses)
    meta["isoCredit"] = {"precalculus": iso_c.get("precalculus", 0)}
    meta["withIso"] = meta["actual"] + meta["isoCredit"].get("precalculus", 0)
    index["eras"]["bridge"] = meta
    print("bridge", meta)

    # ----- V Diploma -----
    aa_hl = split_counts(2000, ["binomial", "sequences", "differentiation", "integration"])
    aa_sl = split_counts(1200, ["sl-core", "sequences", "fn-eval"])
    apps = split_counts(800, ["applications-finance", "statistics"])
    topics = []
    courses = {}
    t, n = build_course_topics("diploma", "aa-hl", aa_hl)
    topics += t; courses["aa-hl"] = n
    t, n = build_course_topics("diploma", "aa-sl", aa_sl)
    topics += t; courses["aa-sl"] = n
    t, n = build_course_topics("diploma", "applications", apps)
    topics += t; courses["applications"] = n
    meta = write_era(BANKS / "era-diploma.json", "diploma", 4000, topics, courses)
    index["eras"]["diploma"] = meta
    print("diploma", meta)

    # ----- VI University -----
    calc = split_counts(1500, ["calculus", "integration", "differentiation"])
    stats = split_counts(1000, ["statistics"])
    lin = split_counts(800, ["linear-algebra"])
    mech = split_counts(700, ["mechanics"])
    topics = []
    courses = {}
    t, n = build_course_topics("university", "calculus", calc)
    topics += t; courses["calculus"] = n
    t, n = build_course_topics("university", "statistics", stats)
    topics += t; courses["statistics"] = n
    t, n = build_course_topics("university", "linear", lin)
    topics += t; courses["linear"] = n
    t, n = build_course_topics("university", "mechanics", mech)
    topics += t; courses["mechanics"] = n
    meta = write_era(BANKS / "era-university.json", "university", 4000, topics, courses)
    index["eras"]["university"] = meta
    print("university", meta)

    # ----- VII Beyond -----
    inf = split_counts(2200, ["series-limits"])
    top = split_counts(1800, ["topology-concepts"])
    topics = []
    courses = {}
    t, n = build_course_topics("beyond", "infinite", inf)
    topics += t; courses["infinite"] = n
    t, n = build_course_topics("beyond", "topology", top)
    topics += t; courses["topology"] = n
    meta = write_era(BANKS / "era-beyond.json", "beyond", 4000, topics, courses)
    index["eras"]["beyond"] = meta
    print("beyond", meta)

    # grand totals (era packs only + with iso credits)
    pack_total = sum(e["actual"] for e in index["eras"].values())
    with_iso = 0
    for e, m in index["eras"].items():
        with_iso += m.get("withIso", m["actual"])
    # eras without withIso already counted
    index["grandTotalPacks"] = pack_total
    index["grandTotalWithIsoCredits"] = with_iso
    index["emhCore"] = 360 if EMH.exists() else 0
    index["isomorphicBanks"] = sum(iso_c.values())
    index["grandTotalAllFiles"] = pack_total + index["isomorphicBanks"] + index["emhCore"]

    (BANKS / "index.json").write_text(json.dumps(index, indent=2) + "\n")
    print(json.dumps({k: index[k] for k in index if k != "eras"}, indent=2))
    for e, m in index["eras"].items():
        print(f"  {e}: actual={m['actual']} target={m['target']} courses={m['courses']}")


if __name__ == "__main__":
    main()
