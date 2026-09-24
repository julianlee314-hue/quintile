# Quintile inventory (live map mirror)

**Live URL (authoritative source, left untouched this pass):** https://king-wind-charm-lilac.grok.me/

**Grok project id:** `01a0d1d8-9526-7a30-b928-0815fdfaeca5`

**This build:** Mirror of the CURRENT grok.me site (7-era map + 15 courses). Not the Easy/Medium/Hard expansion.

**Related EMH fork:** `julianlee314-hue/quintile-aa-hl` — older AA-HL-only drill room with Easy/Medium/Hard skills & papers. Keep that tree separate.

## Eras (7)

| # | id | title |
|---|----|-------|
| I | `counting` | Counting |
| II | `workshop` | Workshop |
| III | `secondary` | Secondary |
| IV | `bridge` | Bridge |
| V | `diploma` | Diploma |
| VI | `university` | University |
| VII | `beyond` | Beyond |

## Courses (15)

| id | title | era | dest |
|----|-------|-----|------|
| `arithmetic` | First numbers | Counting | `/track/arithmetic` |
| `prealgebra` | Pre-algebra | Workshop | `/track/prealgebra` |
| `geometry` | Geometry | Workshop | `/track/geometry` |
| `algebra` | Algebra | Secondary | `/track/algebra` |
| `trigonometry` | Trigonometry | Secondary | `/track/trigonometry` |
| `higher` | Higher certificate | Secondary | `/foundations` |
| `functions` | Functions | Bridge | `/track/functions` |
| `aa-sl` | Analysis SL | Diploma | `/track/aa-sl` |
| `aa-hl` | Analysis HL | Diploma | `/syllabus` |
| `applications` | Applications | Diploma | `/track/applications` |
| `calculus` | Calculus | University | `/track/calculus` |
| `statistics` | Statistics | University | `/track/statistics` |
| `linear` | Linear algebra | University | `/track/linear` |
| `infinite` | The infinite | Beyond | `/track/infinite` |
| `topology` | Topology | Beyond | `/track/topology` |

## Routes

| Route | Description |
|-------|-------------|
| `/` | 7-era map home |
| `/foundations` | Higher certificate pathway + 8 fluency checks |
| `/progress` | On-device progress |
| `/syllabus` | AA HL diploma tree (5 units, **43 leaves**) |
| `/track/$id` | Course track (see dest column) |
| `/strand/$id` | Paper strand overview (`algebra` … `statistics`) |
| `/drill` | Drill room (skill / strand / today / mixed / syllabus node) |

Nav includes Map, Skills/foundations, Progress, and course openers.

## Skills builder (8 × 5 = 40)

Difficulty model on this build: **single set of 5 per topic** (not Easy/Medium/Hard).

| # | id | title | items |
|---|----|-------|-------|
| 1 | `indices` | Indices & surds | 5 |
| 2 | `manipulation` | Expand, factor, rearrange | 5 |
| 3 | `linear` | Lines & equations | 5 |
| 4 | `quadratics` | Quadratics | 5 |
| 5 | `logs` | Exponents & logs | 5 |
| 6 | `functions` | Function notation | 5 |
| 7 | `trig` | Right-triangle trig | 5 |
| 8 | `chance` | Data & chance | 5 |

**Total skill items:** 40

## Paper strands (49 questions) — Core / Standard / Stretch

| # | id | name | Core | Standard | Stretch | total |
|---|----|------|------|----------|---------|-------|
| 01 | `algebra` | Number & algebra | 2 | 8 | 1 | 11 |
| 02 | `functions` | Functions | 5 | 3 | 2 | 10 |
| 03 | `trigonometry` | Trigonometry | 3 | 5 | 1 | 9 |
| 04 | `calculus` | Calculus | 2 | 7 | 1 | 10 |
| 05 | `statistics` | Statistics & probability | 3 | 6 | 0 | 9 |

**Totals by difficulty:** Core 15 · Standard 29 · Stretch 5 · **49 overall**

(See `data/papers_index.json` for per-id breakdown.)

## AA HL syllabus tree

- **5 units:** Number and algebra, Functions, Geometry and trigonometry, Statistics and probability, Calculus
- **43 leaves** (subtopics with Learn / Practice)
- HL-flagged leaves: 12 (`hl:!0` in `course-*.js`)

## Other extracted counts

| Source | Count | File |
|--------|-------|------|
| Foundations pathway topics | 110 | `data/foundations_topics.json` |
| Track topic entries (sample generators) | 19 | `data/tracks_topics.json` |
| Atlas eras + courses | 7 + 15 | `data/atlas.json` |

## Assets mirrored

All `/assets/*` referenced by the live shell (atlas, tracks, course, course-tree, foundations×2, syllabus, skills, types, drill, routes, shell, catalog, progress, strand, track, styles, lucide, preload-helper, index).

## Not in this build

- Easy / Medium / Hard expansion (lives in `quintile-aa-hl`)
- Edits to grok.me itself (see HANDOFF.md)
