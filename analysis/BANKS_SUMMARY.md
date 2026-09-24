# Quintile banks — full summary

_Generated 2026-09-24 ~18:45 ICT (Asia/Bangkok)._

## Hard target

| Era | Target | Pack actual | With iso credits | Status |
|-----|-------:|------------:|-----------------:|--------|
| counting | 4000 | 4000 | **4000** | OK |
| workshop | 4000 | 3992 | **4000** | OK |
| secondary | 4000 | 3141 | **4000** | OK |
| bridge | 4000 | 3982 | **4000** | OK |
| diploma | 4000 | 4000 | **4000** | OK |
| university | 4000 | 4000 | **4000** | OK |
| beyond | 4000 | 4000 | **4000** | OK |

**Grand total (packs + iso credits): 28000** (target 28000).
All files including EMH core: **28360** (packs 27115 + iso 885 + EMH 360).

## Modes

| Mode | Answer UX | Item fields |
|------|-----------|-------------|
| **Practice** | Typed / `accept[]` | `prompt`, `answer`, `solution`, `accept`, `stage` |
| **Exam** (skill drills) | **MCQ exactly 5 options A–E** | dual-format: also `choices[5]`, `correct` (`A`–`E`), `correctIndex`, `format:"dual"` |
| **Diploma → Exam tab** | Past-paper sit (separate) | `data/diploma_past_papers.json` placeholders only — **not** MCQ skill drills |

Distractors are deterministic near-misses (off-by-one, sign flip, swapped coords, etc.).

## Allocation (courses)

### counting

| courseId | items |
|----------|------:|
| `arithmetic` | 2800 |
| `measures` | 1200 |

### workshop

| courseId | items |
|----------|------:|
| `prealgebra` | 2192 |
| `geometry` | 1800 |

Iso credits folded: `{'prealgebra': 8}`

### secondary

| courseId | items |
|----------|------:|
| `algebra` | 1374 |
| `trigonometry` | 767 |
| `higher` | 1000 |

Iso credits folded: `{'algebra': 826, 'trigonometry': 33}`

### bridge

| courseId | items |
|----------|------:|
| `functions` | 1800 |
| `precalculus` | 2182 |

Iso credits folded: `{'precalculus': 18}`

### diploma

| courseId | items |
|----------|------:|
| `aa-hl` | 2000 |
| `aa-sl` | 1200 |
| `applications` | 800 |

### university

| courseId | items |
|----------|------:|
| `calculus` | 1500 |
| `statistics` | 1000 |
| `linear` | 800 |
| `mechanics` | 700 |

### beyond

| courseId | items |
|----------|------:|
| `infinite` | 2200 |
| `topology` | 1800 |

## EMH core (shared cross-era)

Kept original 120; appended → **45/topic**, **360 total**.

| id | title | items | E | M | H |
|----|-------|------:|--:|--:|--:|
| `indices` | Indices & surds | 45 | 15 | 15 | 15 |
| `manipulation` | Expand, factor, rearrange | 45 | 15 | 15 | 15 |
| `linear` | Lines & equations | 45 | 15 | 15 | 15 |
| `quadratics` | Quadratics | 45 | 15 | 15 | 15 |
| `logs` | Exponents & logs | 45 | 15 | 15 | 15 |
| `functions` | Function notation | 45 | 15 | 15 | 15 |
| `trig` | Right-triangle trig | 45 | 15 | 15 | 15 |
| `chance` | Data & chance | 45 | 15 | 15 | 15 |

## Isomorphic free-worksheet map

44 sections, **885** items. Folded into Secondary/Workshop/Bridge quotas. No Kuta verbatim text.

## Diploma past papers (IB AA scaffold)

- Manifest: `data/diploma_past_papers.json` — **70** placeholder slots (IB AA HL/SL × Papers 1–3 × May/Nov × 2019–2025).
- UI: `/diploma/exams/` — filter, cards, local PDF attach via IndexedDB (never committed).
- **Copyright:** no IB question text or PDFs in git.
- Diploma **Practice** banks = generated ~4000 dual-format skill items (`era-diploma`).

## URLs (GitHub Pages)

| What | URL |
|------|-----|
| Banks index | https://julianlee314-hue.github.io/quintile/banks/ |
| Diploma past papers | https://julianlee314-hue.github.io/quintile/diploma/exams/ |
| Practice sample | https://julianlee314-hue.github.io/quintile/practice/?skill=era-counting-arithmetic-bonds |
| Exam MCQ sample | https://julianlee314-hue.github.io/quintile/practice/?skill=era-counting-arithmetic-bonds&mode=exam |
| Iso one-step | https://julianlee314-hue.github.io/quintile/practice/?skill=iso-one-step-equations |
| Diploma practice | https://julianlee314-hue.github.io/quintile/practice/?skill=era-diploma-aa-hl-binomial |

## Rebuild

```bash
python3 tools/isomorphic/generate_banks.py
python3 tools/isomorphic/expand_emh.py
python3 tools/isomorphic/era_packs/generate_all_eras.py
python3 tools/isomorphic/era_packs/add_mcq5.py
```

## LaTeX coverage (2026-09-24)

All bank prompts are LaTeX-dominant for KaTeX display (`js/latex.js`).

| Metric | Before latexify | After |
|--------|----------------:|------:|
| Prompts scanned | 28424 | 28424 |
| Plain (no `$` / `\(` / `\[`) | 2460 (~8.7%) | **0 (0%)** |
| Math coverage | ~91.3% | **100%** |

Tool: `tools/isomorphic/latexify_banks.py`. See [`LATEX.md`](../LATEX.md).
