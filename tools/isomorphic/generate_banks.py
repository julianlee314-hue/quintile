#!/usr/bin/env python3
"""Generate isomorphic practice banks from free-worksheet SECTION MAP (not Kuta text)."""
from __future__ import annotations

import json
import random
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARVEST = ROOT / "analysis" / "kuta_harvest.json"
OUT_JSON = ROOT / "site" / "data" / "isomorphic_banks.json"
OUT_META = ROOT / "site" / "data" / "isomorphic_banks_meta.json"
OUT_MD = ROOT / "analysis" / "ISOMORPHIC_BANKS.md"
SITE_MD = ROOT / "site" / "analysis" / "ISOMORPHIC_BANKS.md"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from helpers import (  # noqa: E402
    accept_forms,
    normalize_accept_token,
    seed_for,
    slugify,
    stage_mix,
)
from families import SECTION_BUILDERS  # noqa: E402


WORD_MODES = {
    "Mixture Word Problems",
    "Work Word Problems",
    "Distance Rate Time Word Problems",
    "Systems of Equations Word Problems",
}


def dedupe_sections(harvest: dict) -> dict:
    """Unique titles; max count; skip answer keys. Keep richest metadata."""
    by_title = {}
    for f in harvest.get("files") or []:
        for s in f.get("sections") or []:
            if s.get("is_answer_key"):
                continue
            title = s["title"]
            cur = by_title.get(title)
            if cur is None or s["count"] > cur["count"]:
                by_title[title] = dict(s)
    return by_title


def finalize_item(raw: dict, topic_id: str, idx: int) -> dict:
    prompt = (raw.get("prompt") or "").strip()
    answer = raw.get("answer")
    if answer is None:
        raise ValueError("missing answer")
    answer_s = str(answer).strip()
    sol = (raw.get("solution") or "").strip()
    acc = list(raw.get("accept") or [])
    # ensure accept includes normalized answer
    forms = accept_forms(answer_s, *acc)
    seen = set()
    clean = []
    for a in forms:
        k = normalize_accept_token(str(a))
        if not k or k in seen:
            continue
        seen.add(k)
        clean.append(str(a))
    if not clean:
        clean = [normalize_accept_token(answer_s) or answer_s]
    # ensure answer markup
    ans_out = answer_s
    if not (ans_out.startswith("$") or ans_out.lower() in ("yes", "no") or " or " in ans_out or ans_out.startswith("x")):
        if any(ch in ans_out for ch in r"\^_{}") or ans_out[:1].isdigit() or ans_out[:1] in "-(":
            ans_out = f"${ans_out}$"
    return {
        "id": f"{topic_id}-{idx:03d}",
        "stage": raw["stage"],
        "difficulty": raw.get("difficulty") or {"easy": 1, "medium": 2, "hard": 3}[raw["stage"]],
        "prompt": prompt,
        "answer": ans_out,
        "solution": sol,
        "accept": clean,
        "cloneOfSection": raw["cloneOfSection"],
        "source": "isomorphic-free-worksheet-map",
    }


def validate_item(it: dict) -> None:
    assert it.get("prompt"), it["id"]
    assert it.get("answer"), it["id"]
    assert it.get("accept"), it["id"]
    assert it.get("source") == "isomorphic-free-worksheet-map", it["id"]
    assert it.get("cloneOfSection"), it["id"]
    assert it.get("stage") in ("easy", "medium", "hard"), it["id"]
    na = normalize_accept_token(str(it["answer"]))
    norms = [normalize_accept_token(str(a)) for a in it["accept"]]
    assert na in norms or any(na and na in n for n in norms), (it["id"], na, norms[:5])


def blurb_for(title: str) -> str:
    return f"Isomorphic practice for «{title}» — same skill as the free worksheet map, fresh numbers and wording."


def main() -> None:
    harvest = json.loads(HARVEST.read_text())
    sections = dedupe_sections(harvest)
    missing = [t for t in sections if t not in SECTION_BUILDERS]
    if missing:
        raise SystemExit(f"Missing generators for: {missing}")

    topics = []
    total = 0
    by_course = {}
    rows = []

    for title in sorted(sections.keys()):
        meta = sections[title]
        target = int(meta["count"])
        tid = slugify(title)
        # unique tid if collision
        existing_ids = {t["id"] for t in topics}
        base = tid
        nfix = 2
        while tid in existing_ids:
            tid = f"{base}-{nfix}"
            nfix += 1

        rng = random.Random(seed_for(title))
        stages = stage_mix(target)
        builder = SECTION_BUILDERS[title]
        raw_items = builder(rng, target, stages, title)
        # allow count .. count+2
        if len(raw_items) < target:
            raise SystemExit(f"{title}: got {len(raw_items)} < {target}")
        if len(raw_items) > target + 2:
            raw_items = raw_items[: target + 2]
        items = [finalize_item(raw_items[i], tid, i + 1) for i in range(len(raw_items))]
        for it in items:
            validate_item(it)

        course = meta.get("courseId") or "algebra"
        era = meta.get("era") or "secondary"
        mode = "exam" if title in WORD_MODES or "Exam" in str(meta.get("mode") or "") else "practice"
        band = (meta.get("difficulty") or "Medium").lower()
        topic = {
            "id": tid,
            "title": title,
            "courseId": course,
            "era": era,
            "blurb": blurb_for(title),
            "itemCount": len(items),
            "defaultMode": mode,
            "difficultyBand": band,
            "skillTreeNode": meta.get("skillTreeNode"),
            "hlLink": "Isomorphic clone of a free-worksheet skill map section (not copyrighted worksheet text).",
            "items": items,
        }
        topics.append(topic)
        total += len(items)
        by_course.setdefault(course, {"sections": 0, "items": 0})
        by_course[course]["sections"] += 1
        by_course[course]["items"] += len(items)
        rows.append((course, title, len(items), target, tid, mode, band))

    generated = datetime.now().strftime("%Y-%m-%d %H:%M %Z").strip() or datetime.now().isoformat(timespec="minutes")
    payload = {
        "meta": {
            "generated": generated,
            "totalItems": total,
            "sections": len(topics),
            "targetItems": 885,
            "note": "isomorphic clones from free worksheet skill map; not Kuta text",
        },
        "topics": topics,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    OUT_META.write_text(json.dumps(payload["meta"], indent=2) + "\n")

    # Markdown summary
    lines = [
        "# Isomorphic Banks — Quintile",
        "",
        f"_Generated {generated} (Asia/Bangkok)._",
        "",
        "## Policy",
        "",
        "Built from the **free-worksheet SECTION MAP** in `analysis/kuta_harvest.json` (deduped titles, max counts, answer keys skipped).",
        "Prompts, answers, and solutions are **fresh isomorphic clones** that train the same skill as each section title.",
        "**No OCR text and no Kuta Software problem wording** is copied into the bank.",
        "Every item is marked `source: isomorphic-free-worksheet-map` and `cloneOfSection: <exact section title>`.",
        "",
        "## Totals",
        "",
        f"| Metric | Count |",
        f"|--------|------:|",
        f"| Sections | **{len(topics)}** |",
        f"| Items generated | **{total}** |",
        f"| Map target (deduped) | 885 |",
        "",
        "### By course",
        "",
        "| courseId | sections | items |",
        "|----------|--------:|------:|",
    ]
    for c in sorted(by_course):
        lines.append(f"| `{c}` | {by_course[c]['sections']} | {by_course[c]['items']} |")
    lines += [
        "",
        "## Sections",
        "",
        "| course | section | items | target | topic id | mode | band |",
        "|--------|---------|------:|-------:|----------|------|------|",
    ]
    for course, title, n, tgt, tid, mode, band in sorted(rows, key=lambda r: (r[0], r[1])):
        lines.append(f"| `{course}` | {title} | {n} | {tgt} | `{tid}` | {mode} | {band} |")
    lines += [
        "",
        "## Practice URLs",
        "",
        "Use `/practice/?skill=<topic-id>` (add `&mode=exam` for word-problem defaults).",
        "Browse all iso topics at `/banks/`.",
        "",
        "## Rebuild",
        "",
        "```bash",
        "python3 tools/isomorphic/generate_banks.py",
        "```",
        "",
        "RNG is seeded with `sha256(section title)` so rebuilds are stable.",
        "",
    ]
    OUT_MD.write_text("\n".join(lines) + "\n")
    SITE_MD.parent.mkdir(parents=True, exist_ok=True)
    SITE_MD.write_text(OUT_MD.read_text())

    print(json.dumps({"sections": len(topics), "totalItems": total, "out": str(OUT_JSON), "missing": missing}, indent=2))


if __name__ == "__main__":
    main()
