# Kuta Question Harvest — Quintile Mapping

_Generated 2026-09-24 (Asia/Bangkok). OCR via RapidOCR on 72 DPI tiles (1.6× upscale); Pre-Algebra pack via `pdftotext`._

## Copyright caution (read first)

**Kuta Software worksheets are copyrighted.** This harvest **counts and maps only**. Do **not** paste full problem text, answer keys, or scanned page images into the public Quintile site. Recommended path: generate **isomorphic clones** (same skill, different numbers/context) or obtain a license from Kuta Software LLC before any verbatim bank import.

## Method & confidence

- Tall iOS image-PDFs rendered with `pdftoppm -r 72`, split into ~1100 px vertical tiles, OCR’d with `rapidocr-onnxruntime`.
- Section titles fuzzy-matched to known Infinite Algebra / Pre-Algebra / Trig worksheet names (strict threshold to avoid “Period” false hits).
- Problem counts from `N)` patterns; prefer **dense max** when ≥50–62% of `1..N` visible, else **unique undercount**. Prefer undercount when OCR is fuzzy.
- Answer keys flagged via duplicate section titles, printed solution lists (`(x,y)`, `[135, 315]`), or high answer-density heuristics.
- Overall confidence: **medium** — math glyphs often OCR as garbage; counts are measured, not invented, but OCR miss-rate means some sections undercount (esp. Rational Equations on the shorter Equations PDF).

## Grand totals

| Metric | Count |
|--------|------:|
| Student questions (**sum across 6 PDFs**, overlaps included) | **1197** |
| Answer-key / printed-solution items (sum across PDFs) | **113** |
| Student questions (**deduped estimate**) | **918** |

Deduping: `alg1_equations and alg1_systems largely overlap alg1_first_half; deduped = max(count) per section title across those three + alg2_core + trig_graphs + prealg`

| Bucket | Deduped student Qs |
|--------|-------------------:|
| Algebra 1 packs (first_half ∪ equations ∪ systems) | 551 |
| Algebra 2 core | 326 |
| Trig graphs | 33 |
| Pre-Algebra systems-by-graphing | 8 |

### By target Quintile course (deduped)

| courseId | era | student Qs |
|----------|-----|----------:|
| `algebra` | secondary | 859 |
| `trigonometry` | secondary | 33 |
| `precalculus` | bridge | 18 |
| `prealgebra` | workshop | 8 |

## Site inventory (context)

- `skills.json` items ≈ **40**; topics ≈ 8
- `papers_index.json` ≈ **49** papers
- `foundations_topics.json` ≈ **110** topics (not all have item banks)
- `skills_tree.json` ≈ **279** nodes
- EMH fork separate (skills_emh.json)

Adding ~900 deduped isomorphic clones would dwarf the current Practice skill bank (~40 items) and should land primarily under **Era III Algebra** foundations + **Trigonometry**, with a small Precalculus graphing-polynomials slice and Pre-algebra systems intro.

## Per-PDF breakdown

### `alg1_first_half` — Algebra 1 Kuta - First Half

- File hash prefix: `232f350c…`
- Product hint: Infinite Algebra 1
- Approx letter-page equivalents: **48.7** (image [816, 38604])
- OCR: rapidocr-onnxruntime
- **Student questions: 550** across 26 sections
- Answer-key items: 51 across 5 sections

| Sec | Title | # | Key? | course | era | mode | diff | skill-tree node | conf |
|----:|-------|--:|:----:|--------|-----|------|------|-----------------|------|
| 1 | Evaluating Variable Expressions | 36 | Q | `algebra` | secondary | Practice adaptive | Easy | `foundation-leaf:pre-3.1` | high |
| 2 | Combining Like Terms | 30 | Q | `algebra` | secondary | Practice adaptive | Easy | `foundation-leaf:pre-3.1` | high |
| 3 | Percent of Change | 24 | Q | `algebra` | secondary | Practice adaptive | Easy | `foundation-leaf:pre-3.32` | high |
| 4 | One-Step Equations | 28 | Q | `algebra` | secondary | Practice adaptive | Easy | `foundation-leaf:pre-3.5` | high |
| 5 | Two-Step Equations | 24 | Q | `algebra` | secondary | Practice adaptive | Easy | `foundation-leaf:pre-3.5` | high |
| 6 | Multi-Step Equations | 20 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.5` | high |
| 7 | Absolute Value Equations | 17 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.5` | high |
| 8 | Radical Equations - Part 1 | 26 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.5` | high |
| 9 | Radical Equations - Part 2 | 28 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.5` | high |
| 10 | Solving Rational Equations 1 | 20 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.5` | medium |
| 11 | Solving Rational Equations 2 | 15 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.5` | medium |
| 12 | Solving Proportions | 24 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.5` | high |
| 13 | Mixture Word Problems | 10 | Q | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.32` | high |
| 14 | Work Word Problems | 12 | Q | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.32` | high |
| 15 | Literal Equations | 30 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.5` | high |
| 16 | Distance Rate Time Word Problems | 10 | Q | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.32` | high |
| 17 | Graphing Linear Inequalities | 24 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.6` | high |
| 18 | One-Step Inequalities | 23 | Q | `algebra` | secondary | Practice adaptive | Easy | `foundation-leaf:pre-3.6` | high |
| 19 | Two-Step Inequalities | 23 | Q | `algebra` | secondary | Practice adaptive | Easy | `foundation-leaf:pre-3.6` | high |
| 20 | Multi-Step Inequalities | 24 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.6` | high |
| 21 | Compound Inequalities | 18 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.6` | high |
| 22 | Absolute Value Inequalities | 22 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.6` | high |
| 23 | Solving Systems of Equations by Graphing | 8 | ANS | `algebra` | secondary | Practice adaptive | Easy | `foundation-leaf:pre-3.7` | high |
| 24 | Solving Systems of Equations by Elimination | 24 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.7` | high |
| 25 | Solving Systems of Equations by Substitution | 20 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.7` | high |
| 26 | Systems of Equations Word Problems | 11 | Q | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.7` | high |
| 27 | Systems of Inequalities | 7 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.6` | medium |
| 28 | Distance Rate Time Word Problems | 10 | ANS | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.32` | high |
| 29 | Mixture Word Problems | 10 | ANS | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.32` | high |
| 30 | Work Word Problems | 12 | ANS | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.32` | high |
| 31 | Systems of Equations Word Problems | 11 | ANS | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.7` | high |

### `alg1_equations` — Kuta Algebra 1 - Equations

- File hash prefix: `56529858…`
- Product hint: Infinite Algebra 1
- Approx letter-page equivalents: **13.8** (image [816, 10916])
- OCR: rapidocr-onnxruntime
- **Student questions: 217** across 13 sections
- Answer-key items: 0 across 0 sections

| Sec | Title | # | Key? | course | era | mode | diff | skill-tree node | conf |
|----:|-------|--:|:----:|--------|-----|------|------|-----------------|------|
| 1 | One-Step Equations | 26 | Q | `algebra` | secondary | Practice adaptive | Easy | `foundation-leaf:pre-3.5` | high |
| 2 | Two-Step Equations | 13 | Q | `algebra` | secondary | Practice adaptive | Easy | `foundation-leaf:pre-3.5` | medium |
| 3 | Multi-Step Equations | 15 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.5` | medium |
| 4 | Absolute Value Equations | 15 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.5` | medium |
| 5 | Radical Equations - Part 1 | 26 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.5` | medium |
| 6 | Radical Equations - Part 2 | 28 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.5` | high |
| 7 | Solving Rational Equations 1 | 6 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.5` | medium |
| 8 | Solving Rational Equations 2 | 3 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.5` | medium |
| 9 | Solving Proportions | 24 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.5` | high |
| 10 | Mixture Word Problems | 10 | Q | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.32` | high |
| 11 | Work Word Problems | 12 | Q | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.32` | high |
| 12 | Literal Equations | 29 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.5` | high |
| 13 | Distance Rate Time Word Problems | 10 | Q | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.32` | medium |

### `alg1_systems` — Kuta Algebra 1 - Systems

- File hash prefix: `611d644f…`
- Product hint: Infinite Algebra 1
- Approx letter-page equivalents: **6.7** (image [816, 5314])
- OCR: rapidocr-onnxruntime
- **Student questions: 63** across 4 sections
- Answer-key items: 7 across 1 sections

| Sec | Title | # | Key? | course | era | mode | diff | skill-tree node | conf |
|----:|-------|--:|:----:|--------|-----|------|------|-----------------|------|
| 1 | Solving Systems of Equations by Graphing | 7 | ANS | `algebra` | secondary | Practice adaptive | Easy | `foundation-leaf:pre-3.7` | high |
| 2 | Solving Systems of Equations by Elimination | 24 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.7` | high |
| 3 | Solving Systems of Equations by Substitution | 20 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.7` | high |
| 4 | Systems of Equations Word Problems | 11 | Q | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.7` | high |
| 5 | Systems of Inequalities | 8 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.6` | high |

### `alg2_core` — Kuta Algebra 2 - Core

- File hash prefix: `a10310d6…`
- Product hint: Infinite Algebra 2
- Approx letter-page equivalents: **41.3** (image [816, 32745])
- OCR: rapidocr-onnxruntime
- **Student questions: 326** across 17 sections
- Answer-key items: 35 across 5 sections

| Sec | Title | # | Key? | course | era | mode | diff | skill-tree node | conf |
|----:|-------|--:|:----:|--------|-----|------|------|-----------------|------|
| 1 | Review of Linear Equations | 8 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.15` | high |
| 2 | Review of Linear Equations (standard form prompts) | 16 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.15` | medium |
| 3 | Review of Linear Equations (standard form prompts) | 9 | ANS | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.15` | medium |
| 4 | Graphing Linear Inequalities | 14 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.6` | high |
| 5 | Graphing Linear Inequalities | 6 | ANS | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.6` | high |
| 6 | Systems of Two Equations | 25 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.7` | high |
| 7 | Systems of Two Equations | 4 | ANS | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.7` | high |
| 8 | Systems of Inequalities | 8 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.6` | medium |
| 9 | Systems of Equations Word Problems | 18 | Q | `algebra` | secondary | Exam fixed | Medium | `foundation-leaf:pre-3.7` | high |
| 10 | Vertex Form of Parabolas | 20 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.8` | high |
| 11 | Factoring Quadratic Expressions | 20 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.8` | high |
| 12 | Solving Quadratic Equations by Taking Square Roots | 16 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.8` | high |
| 13 | Solving Quadratic Equations By Factoring | 20 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.8` | high |
| 14 | Completing the Square | 18 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.8` | high |
| 15 | Solving Quadratic Equations by Completing the Square | 24 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.8` | high |
| 16 | Using the Quadratic Formula | 24 | Q | `algebra` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.8` | high |
| 17 | Evaluating Functions | 18 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.22` | high |
| 18 | Function Operations | 25 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.22` | high |
| 19 | Factoring By Grouping | 34 | Q | `algebra` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-3.8` | high |
| 20 | Graphing Polynomial Functions | 18 | Q | `precalculus` | bridge | Practice adaptive | Medium | `foundation-leaf:pre-3.29` | high |
| 21 | Graphing Polynomial Functions | 8 | ANS | `precalculus` | bridge | Practice adaptive | Medium | `foundation-leaf:pre-3.29` | high |
| 22 | Graphing Polynomial Functions | 8 | ANS | `precalculus` | bridge | Practice adaptive | Medium | `foundation-leaf:pre-3.29` | high |

### `trig_graphs` — Kuta Trig Graphs

- File hash prefix: `5d2198f1…`
- Product hint: Infinite Algebra 2 / Precalculus (trig)
- Approx letter-page equivalents: **4.0** (image [816, 3171])
- OCR: rapidocr-onnxruntime
- **Student questions: 33** across 3 sections
- Answer-key items: 12 across 1 sections

| Sec | Title | # | Key? | course | era | mode | diff | skill-tree node | conf |
|----:|-------|--:|:----:|--------|-----|------|------|-----------------|------|
| 1 | Graphing Trig Functions | 12 | Q | `trigonometry` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-4.7` | high |
| 2 | Graphs of Trig Functions | 7 | Q | `trigonometry` | secondary | Practice adaptive | Medium | `foundation-leaf:pre-4.7` | medium |
| 3 | Simple Trig Equations | 12 | ANS | `trigonometry` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-4.7` | medium |
| 4 | Trig Equations w/ Factoring + Fundamental Identities | 14 | Q | `trigonometry` | secondary | Practice adaptive | Hard | `foundation-leaf:pre-3.8` | high |

### `prealg_systems_graphing` — Systems of Equations by Graphing (Infinite Pre-Algebra)

- File hash prefix: `8362be84…`
- Product hint: Infinite Pre-Algebra
- Approx letter-page equivalents: **4.0** (image None)
- Pages: 4
- OCR: pdftotext
- **Student questions: 8** across 1 sections
- Answer-key items: 8 across 1 sections

| Sec | Title | # | Key? | course | era | mode | diff | skill-tree node | conf |
|----:|-------|--:|:----:|--------|-----|------|------|-----------------|------|
| 1 | Solving Systems of Equations by Graphing | 8 | Q | `prealgebra` | workshop | Practice adaptive | Easy | `foundation-leaf:pre-3.7` | high |
| 2 | Solving Systems of Equations by Graphing | 8 | ANS | `prealgebra` | workshop | Practice adaptive | Easy | `foundation-leaf:pre-3.7` | high |

## Overlap note (Algebra 1 packs)

`alg1_equations` and `alg1_systems` are essentially subsets of topics also present in `alg1_first_half` (One-/Two-/Multi-step through systems). Prefer **`alg1_first_half` counts** when de-duplicating; the shorter PDFs are useful as corroborating OCR passes (sometimes lower coverage, e.g. Rational Equations 6+3 vs 20+15).

## Where to add on Quintile

| Batch | Primary landing | Suggested bank | Notes |
|-------|-----------------|----------------|-------|
| Alg1 expressions / like terms / percent | Era III `algebra` → foundations pre-3.1 / pre-3.32 | Practice adaptive | Easy warm-ups |
| Alg1 equations (1-step → literal, radicals, rationals) | `algebra` → `foundation-leaf:pre-3.5` + skill-topic `linear` | Practice adaptive | Core gap vs ~40 skill items |
| Alg1 inequalities | `algebra` → `pre-3.6` | Practice adaptive | |
| Alg1 / Alg2 systems | `algebra` → `pre-3.7`; Pre-Alg pack → `prealgebra` | Practice adaptive; word problems → Exam fixed | Graphing systems need graph UX |
| Alg2 quadratics / factoring / formula | `algebra` → `pre-3.8` / skill-topic `quadratics` | Practice adaptive | |
| Alg2 functions ops / evaluating | `algebra` → `pre-3.22` / skill-topic `functions` | Practice adaptive | |
| Graphing polynomial functions | `precalculus` → `pre-3.29` | Practice adaptive | Graphing UX |
| Trig graphs / trig equations | `trigonometry` → `pre-4.7` / skill-topic `trig` | Practice adaptive | Exclude answer-key Simple Trig Equations pack |

## Answer-key vs student (summary)

- Student (sum): **1197**
- Answer-key (sum): **113**
- Student (deduped estimate for addable clones): **918**
- Notable answer-key flags: systems-by-graphing blocks with printed `(x,y)`; duplicate word-problem / systems titles at end of first_half; Simple Trig Equations with printed degree solution lists; Pre-Algebra PDF pages 3–4; several Alg2 duplicate title tails.

## Artifacts

- Machine summary: `analysis/kuta_harvest.json`
- Per-PDF OCR: `/workspace/kuta_parse/<label>/ocr/full_ocr.txt`
- Per-PDF section JSON: `/workspace/kuta_parse/<label>/section_summary.json`

