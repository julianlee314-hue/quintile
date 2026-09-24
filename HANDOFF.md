# Quintile handoff — live map takeover

**Date:** 2026-09-24 (Asia/Bangkok)

## URLs

| What | URL |
|------|-----|
| Live (grok.me, authoritative) | https://king-wind-charm-lilac.grok.me/ |
| Grok project id | `01a0d1d8-9526-7a30-b928-0815fdfaeca5` |
| GitHub Pages (this mirror) | https://julianlee314-hue.github.io/quintile/  ✅ live (built 2026-09-24 ~18:04 ICT) |
| GitHub repo | https://github.com/julianlee314-hue/quintile |
| EMH drill fork (separate) | https://julianlee314-hue.github.io/quintile-aa-hl/ |

## Local paths

| What | Path |
|------|------|
| Working tree (box) | `/workspace/quintile_map/` |
| Runnable site | `/workspace/quintile_map/site/` |
| Data extracts | `/workspace/quintile_map/site/data/` |
| Raw mirror | `/workspace/quintile_map/raw/` |
| Desktop copy | `/Users/julianlee/Desktop/Math Resources/Quintile Live/` |
| Older EMH fork (do not wipe) | `/workspace/quintile/site/` and Desktop `Math Resources/Quintile/` |

## What this build is

- Full mirror of the **current** live site: 7-era map, 15 courses, syllabus (43 leaves), foundations pathway, tracks, 8×5 skills, 49 paper questions (Core/Standard/Stretch).
- Runnable with `python3 serve.py` and publishable via GitHub Pages.
- **Does not** include the Easy/Medium/Hard expansion (that stays in `quintile-aa-hl`).

## Relation to `quintile-aa-hl`

`quintile-aa-hl` is an earlier generation: AA-HL drill room only, later expanded to Easy/Medium/Hard skills (120) and papers (93). The live grok.me site evolved into the map instead. Keep both; do not merge casually.

## Updating grok.me later (not done this pass)

Do **not** push this GitHub repo into grok.me. To refresh the live app:

1. Open the Grok Build Mode / Grok project conversation for project `01a0d1d8-9526-7a30-b928-0815fdfaeca5`.
2. Either paste/export changes from this mirror, or re-import assets after EMH (or other) work is ready.
3. Publish from Build Mode so `king-wind-charm-lilac.grok.me` updates.

Pages URL is the day-to-day shareable fork until that Build chat publish happens.

## Counts on this build

- Eras: **7** · Courses: **15**
- Syllabus leaves: **43** (5 units)
- Skills: **8 topics × 5 = 40**
- Paper questions: **49** (Core 15 / Standard 29 / Stretch 5)

## Curriculum audit (2026-09-24 ICT)

- Report: `analysis/ERA_CURRICULUM_AUDIT.md`
- Added courses: Measures, Precalculus, Mechanics (18 courses total)
- Expanded: Geometry transforms, Calculus limits/techniques, Statistics inference, Linear eigen/RREF
- Live grok.me still untouched; publish Pages from this repo after push


## Feature pack (2026-09-24 ICT) — accounts · attempts · tree · mastery · modes · games

Shipped on this Pages fork only:

- Local accounts + attempt log + side-scrolling `/tree/`
- Mastery SRS (triple-play earn; 7d / 30d / 180d; lapsed → re-triple; restart at 7d)
- Practice (adaptive) + Exam (fixed) question modes — see `TREE.md`
- Points scaffold (`POINTS.md`)
- `/games/`, `/dojo/algebra/`, `/dojo/integrals/`, `/practice/`

**Do not** push into grok.me from this pass.
