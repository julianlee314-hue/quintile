# Quintile era curriculum audit

**Generated:** 2026-09-24 ~18:15 ICT  
**Live source (untouched):** https://king-wind-charm-lilac.grok.me/  
**Maintainable fork:** `/workspace/quintile_map/site/` → https://julianlee314-hue.github.io/quintile/  
**Inventory:** `analysis/inventory.json`, `analysis/inventory.md`

---

## Executive summary

Quintile’s 7-era map is a **British/IB-leaning spine** (KS3 → GCSE Higher → Functions → IB AA/AI → Calc/Stats/LA footholds → enrichment) that also cites Ontario Functions books and OpenStax/US materials. Against the **union of mainstream required content** in US (CCSS → Alg I/II → Precalc → Calc I / AP Stats), Canada (Ontario MTH1W→MCV4U/MDM4U), IB (MYP→DP AA/AI), and British (primary→KS3→GCSE→A-level ± Further → first-year uni):

| Era | Verdict (1 line) | Top gaps addressed this pass |
|-----|------------------|------------------------------|
| I Counting | **Thin but usable** for early number facts; measurement strand was missing as a map course | **Added `Measures`** (time, money, metric measure) |
| II Workshop | **Mostly covered** via Pre-algebra + Geometry + Higher tree; school transforms thin | **Geometry +transformations/constructions** topics |
| III Secondary | **Strong** for GCSE Higher / Alg1–2+trig | None critical (Higher certificate is the integrated path) |
| IV Bridge | **Functions good**; US Precalc conics/polar/parametric missing | **Added `Precalculus`** |
| V Diploma | **Strong AA** (condensed 43 leaves); AI is SL-leaning only | Documented AI HL thinness (not fully stubbed as separate HL card) |
| VI University | **Calc/Stats/LA too thin** for full first-year syllabi | **Limits + integration techniques; inference; eigenvalues/row-reduction; added `Mechanics`** |
| VII Beyond | **Enrichment by design** — not a syllabus gap | No adds (Topology / Euler Infinite stay out-of-curriculum) |

**Courses on map now (fork):** 18 (was 15). New cards: **Measures**, **Precalculus**, **Mechanics**.  
**Out-of-curriculum highlights:** Topology foothold; Euler *Analysis of the Infinite* as a school track; power-sets / open-closed intervals framed as “topology”; some HL-only / early-advanced leaves placed before typical age bands.

**Deploy:** Fork GitHub Pages intended at `julianlee314-hue.github.io/quintile`. Live grok.me **not** modified (per handoff). Desktop sync to `Math Resources/Quintile Live/`. GitHub MCP was `needsAuth` at audit start — push attempted via local `git` if credentials exist.

---

## Sources cited (curriculum frameworks)

- **US:** [Common Core State Standards for Mathematics](https://thecorestandards.org/Math/) and [Appendix A model pathways](https://www.oregon.gov/ode/educator-resources/standards/mathematics/Documents/math-appendix-a-model-course-pathways.pdf) (Alg I → Geometry → Alg II → Precalculus → Calculus); College Board AP Calculus / AP Statistics / AP Precalculus.
- **Canada (Ontario):** [Grade 9 MTH1W](https://www.dcp.edu.gov.on.ca/en/curriculum/secondary-mathematics); [Grades 11–12 Mathematics, 2007](https://www.edu.gov.on.ca/eng/curriculum/secondary/math1112currb.pdf) (MCR3U, MHF4U, MCV4U, MDM4U).
- **IB:** [MYP Mathematics brief](https://www.ibo.org/globalassets/new-structure/brochures-and-infographics/pdfs/myp-brief-mathematics-en.pdf); [DP AA subject brief](https://ibo.org/contentassets/5895a05412144fe890312bad52b17044/subject-brief-dp-math-analysis-and-approaches-en.pdf); [DP AI subject brief](https://ibo.org/contentassets/5895a05412144fe890312bad52b17044/subject-brief-dp-math-applications-and-interpretations-en.pdf).
- **British (England):** [National curriculum mathematics PoS](https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study/national-curriculum-in-england-mathematics-programmes-of-study); [KS3 PoS PDF](https://assets.publishing.service.gov.uk/media/5a7c1408e5274a1f5cc75a68/SECONDARY_national_curriculum_-_Mathematics.pdf); [GCSE mathematics subject content](https://assets.publishing.service.gov.uk/media/5a7cb5b040f0b6629523b52c/GCSE_mathematics_subject_content_and_assessment_objectives.pdf); Pearson Edexcel A-level Mathematics (9MA0) Mechanics content.

“Entire syllabus” here means **mainstream required** content for that band, not every elective/Further Maths option.

---

## I. Counting

### Typical sequence to complete this era’s material
- **US:** K–2 / early elementary CCSS Number & Operations in Base Ten + Operations & Algebraic Thinking + Measurement & Data.
- **Canada:** Ontario Grades 1–3 Number / Spatial Sense / Measurement strands (elementary curriculum).
- **IB:** PYP mathematics continuous; early MYP numerical reasoning prerequisites.
- **British:** KS1–lower KS2 number (counting, place value, four operations, early fractions) + measurement (time, money, length, mass, capacity).

### Coverage
- **Covered well:** Number bonds; addition/subtraction/multiplication/division facts; doubles/halves; place-value and early fraction leaves pulled from foundations into First numbers.
- **Missing / thin:** Dedicated **measurement** (time, money, units) as a first-class map course; counting/cardinality narratives; richer money problem types.
- **Added:** Course **`Measures`** (`measures`) with topics Time and money + Metric measure (stub drills + shared foundation measure leaves).

### Out-of-curriculum skills in this era
- None notable (bonds-to-100 fluency drills are standard early primary practice).

---

## II. Workshop

### Typical sequence
- **US:** Grades 3–7/8 CCSS (fractions→ratios, ratio, early expressions, geometry).
- **Canada:** Grades 4–8; lead-in to MTH1W.
- **IB:** MYP standard mathematics (numerical, algebra, spatial, data).
- **British:** Upper KS2 → KS3 (Years 7–9).

### Coverage
- **Covered well:** Pre-algebra (number + ratio + letters); Geometry angles/area/volume/Pythagoras/similarity; full Higher certificate pathway (110 foundation topics) available as the integrated road.
- **Missing / thin:** Explicit **reflection / rotation / translation** and **constructions** on the Geometry track (enlargement existed; other isometries/constructions were thin vs GCSE).
- **Added:** Geometry unit **Transformations and constructions** (`geo-tf-*`, `geo-con-1`).

### Out-of-curriculum skills
- None major at Workshop level; content stays within KS3/GCSE/MYP union.

---

## III. Secondary

### Typical sequence
- **US:** Algebra I → Geometry → Algebra II (or Integrated I–III).
- **Canada:** MTH1W → MPM2D (+ early Functions).
- **IB:** MYP extended / DP prior learning.
- **British:** GCSE / IGCSE Higher.

### Coverage
- **Covered well:** Algebra (indices→quadratics, simultaneous, sequences, logs foothold); Trigonometry (right triangle→unit circle); **Higher certificate** as full GCSE Higher tree (Number, Ratio, Algebra, Geometry, Probability & statistics — 105 practice leaves).
- **Missing / thin:** Nothing critical for “entire” GCSE Higher / Alg1–2 mainstream. US-specific naming differs but content overlaps. Descriptive+chance already in Higher strand 5.
- **Added:** None (no new Secondary cards).

### Out-of-curriculum skills
- Matrices appear early in foundations algebra (`pre-3.28`) — **unusual for standard GCSE** (more AI HL / A-level Further / uni). Flagged as early-advanced relative to Secondary alone (also used later by Linear).

---

## IV. Bridge

### Typical sequence
- **US:** Precalculus / Algebra II honors / AP Precalculus.
- **Canada:** MCR3U Functions → MHF4U Advanced Functions.
- **IB:** DP prior learning / start of AA or AI.
- **British:** GCSE→A-level transition / AS Pure start.

### Coverage
- **Covered well:** **Functions** (notation, lines, families: quadratic/rational/exp/log, polynomials, modulus) aligned with Ontario Nelson books cited on the card.
- **Missing / thin:** US Precalculus staples **conic sections, parametric equations, polar coordinates** (and trig form of complex as a bridge topic).
- **Added:** Course **`Precalculus`** with Conic sections + Other coordinates (stub drills).

### Out-of-curriculum skills
- None required-list items; Precalculus adds were **gaps**, not extras.

---

## V. Diploma

### Typical sequence
- **US:** parallel is AP Calc AB/BC + AP Stats (not identical to IB).
- **Canada:** MHF4U + MCV4U and/or MDM4U (partial overlap with DP).
- **IB:** DP **Analysis & Approaches** SL/HL or **Applications & Interpretation** SL/HL after MYP.
- **British:** A-level Maths ± Further Maths (different packaging).

### Coverage
- **Covered well:** **Analysis HL** 5-unit tree with **43 leaves** (12 HL-flagged) — condensed but spans number/algebra, functions, geom/trig, stats/prob, calculus. **Analysis SL** = same tree minus HL leaves. **Applications** covers models, measure, data, lighter calculus (AI SL–leaning).
- **Missing / thin:** Full official IB subtopic granularity (many guide codes omitted by condensation — intentional pedagogy, not full IB checklist). **AI HL** extensions (e.g. deeper graph theory, matrices emphasis, AHL stats/calc) not a separate HL card. Exploration/IA not in map (assessment process, not topic syllabus).
- **Added:** No new Diploma card this pass; priority was Bridge/University measurement gaps. Recommend later: `applications-hl` or thicken Applications with AI AHL leaves.

### Out-of-curriculum skills
- Condensed HL topics (complex, proof, DE, Bayes, vectors lines) are **standard in IB AA HL** — not out-of-curriculum.
- Using Haese/Hodder framing is curriculum-aligned.

---

## VI. University

### Typical sequence
- **US:** Calc I (limits→FTC) and/or AP Calc; often intro Stats; often separate Matrix Algebra / LA.
- **Canada:** MCV4U calculus+vectors; MDM4U data; university Calc I / LA.
- **IB:** After DP, first-year uni analysis/calc/LA/stats.
- **British:** A-level Pure (calculus) + Mechanics/Statistics applied; Further Maths matrices; first-year uni methods.

### Coverage
- **Covered well (foothold):** Derivative/integral usage; school→diploma distributions; vectors + 2×2 determinant and matrix×vector.
- **Missing / thin for “entire” first-year:** Formal **limits/continuity**; **integration techniques** (sub, parts); **inferential stats** (sampling, CI, hypothesis tests, regression line as inference tool); **row reduction, eigenvalues/eigenvectors, independence**; A-level **mechanics** applied maths.
- **Added:**
  - Calculus topics: Limits and continuity; Techniques (sub, parts) — stubs.
  - Statistics unit: **Inference**.
  - Linear topic: **Structure** (row reduction, eigenvalues, eigenvector, independence).
  - New course **`Mechanics`** (SUVAT, Newton II, projectile range stub, momentum).

Still **not** claiming full Calc II/III, full LA vector-space course, or full AP Stats exam prep — stubs establish map coverage; banks need deepening.

### Out-of-curriculum skills
- None among the new University adds (all appear in at least one of the four systems’ first-year / A-level applied pathways).

---

## VII. Beyond

### Typical sequence
- Not required in K–first-year mainstream paths. Appears in enrichment, olympiad-adjacent, or early undergrad analysis/topology electives.

### Coverage
- **Covered well (as enrichment):** Geometric series → exponential series (Euler order); finite sets / power sets / intervals.
- **Missing / thin:** N/A for required syllabus (this era is optional by design).
- **Added:** None.

### Out-of-curriculum skills (era purpose)
- **Topology** course framed for school map (Morris / Munkres) — **not** in US/Canada/IB/British required K–Y1 pathways.
- **The infinite** as Euler *Introductio in analysin infinitorum* track — historical enrichment; series appear in Calc II / AA HL but **not** as an Euler primary text school course.
- Power sets / open vs closed intervals as “topology foothold” — set language appears lightly in some curricula; **topology naming** does not.

---

## Gaps added (fork changelog)

| ID | Era | Kind | Notes |
|----|-----|------|-------|
| `measures` | Counting | New course + track | Time, money, metric measure |
| `precalculus` | Bridge | New course + track | Conics, parametric, polar, \|z\| |
| `mechanics` | University | New course + track | SUVAT, Newton, projectile, momentum |
| Geometry `geo-tf` | Workshop | Track unit | Reflection, rotation, translation, construction |
| Calculus limits/tech | University | Track topics | `cal-lim-*`, `cal-sub-1`, `cal-parts-1` |
| Statistics inference | University | Track unit | sampling, CI, hypothesis test, LS line |
| Linear structure | University | Track topic | row reduction, eigen*, independence |

Patch metadata: `patches/gap_courses.json`, `data/track_outlines_additions.json`.  
Runtime: `assets/atlas-nMXeO18C.js`, `assets/tracks-jeWbUgSo.js` (backups `*.pre_audit.bak`).

---

## Inventory pointers

- Eras + courses (authoritative JSON): `data/atlas.json` / `site/data/atlas.json`
- Track trees: `analysis/inventory.json` → `tracks`; live trees in `tracks-*.js`
- Foundations leaves: 105 practice topics across 5 sections
- AA HL: 43 leaves (12 HL)
- Skills: 8×5; Papers: 49 across 5 strands

---

## Deploy / Pages status

| Target | Status |
|--------|--------|
| grok.me live | **Not modified** (authoritative; update only via Grok Build project) |
| GitHub repo `julianlee314-hue/quintile` | Local site git present; push depends on auth |
| GitHub Pages | Prior mirror reported live 2026-09-24 ~18:04 ICT; re-publish after commit |
| Desktop `Math Resources/Quintile Live/` | Synced this pass |
