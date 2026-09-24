# Quintile skills trees vs Khan Academy concept / knowledge maps

**Date:** 2026-09-24 (Asia/Bangkok)  
**Purpose:** Decide whether Khan-level map complexity is worth pursuing for Julius’s Quintile.  
**Quintile sources:** `/workspace/quintile_map/site/data/skills_tree.json` stats + atlas; `analysis/ERA_HOURS.md`.  
**Khan sources:** cited links below (ranges preferred; no fabricated precise live counts — public `topictree` API removed 2020; GraphQL topic sampling returned safelist/403 from this environment).

Live Quintile tree: https://julianlee314-hue.github.io/quintile/tree/

---

## 1. Side-by-side

| Dimension | Quintile (measured 2026-09-24) | Khan Academy (public / historical) |
|-----------|--------------------------------|-------------------------------------|
| **Structure** | 7 **eras** → 18 **courses** → leaves (foundation / track / syllabus) + skill-topics / skill-items / dojos | **Course → units → lessons → exercises/skills**, plus quizzes, unit tests, course challenges, mastery challenges ([Mastery Challenges help](https://support.khanacademy.org/hc/en-us/articles/360037127892-What-are-Mastery-Challenges-in-course-mastery); course lists on [KA worksheets blog](https://blog.khanacademy.org/free-math-worksheets/)) |
| **Node scale** | **279** nodes | Order of magnitude: **O(10²) skills per major course**; historically **~800 unique** World-of-Math skills after de-duplicating multi-course listings (community tally ~2014: ~2045 listed / ~820 unique — [r/Khan](https://www.reddit.com/r/Khan/comments/27amzh/2045_skills/)); **~30+** named math courses/tracks listed on the worksheets blog; older write-up counted **~57** math courses including Eureka/IM variants ([Red-Green-Code](https://www.redgreencode.com/the-khan-academy-math-course-system/)) |
| **Edges / prereqs** | **591** edges; avg **~2.1** `requires` per node; edge kinds include contains, sequence, bridge, requires, prepares, era | Mostly **coarser unit/course sequence** + within-course mastery leveling; no longer a public whole-math fine-grained visual skill DAG. Spaced review picks ~3 skills / 6 questions per Mastery Challenge ([help](https://support.khanacademy.org/hc/en-us/articles/360037127892-What-are-Mastery-Challenges-in-course-mastery)) |
| **Exercise / item volume** | Classic skills **~40** + EMH **8×15**; isomorphic free-worksheet clones in progress (**~885** target) | **100,000+** practice questions claimed across math (and other subjects) — [KA blog](https://blog.khanacademy.org/free-math-worksheets/) (page still published; originally framed around deep practice banks) |
| **Visualization** | Per-era **organic grove** (heart-root / willow / oak / vine / heart-body / constellation / spiral), pan-zoom, mastery coloring | Interactive **Knowledge Map** (starfield skill graph) **retired ~Aug 2013**, replaced by Learning Dashboard ([KA blog, 2013](https://blog.khanacademy.org/introducingthe-learning-dashboard/); [KA Wiki — Knowledge Map](https://khanacademy.fandom.com/wiki/Knowledge_Map)). **Missions** removed **2020-06-30** in favor of **Course Mastery** (aging codebase / maintenance — mirrored teacher notes e.g. [Class Skills Report transition](https://z3nhugorichard.zendesk.com/hc/en-us/articles/17901250685849-Transitioning-from-the-old-Progress-Report-to-the-New-Class-Skills-Report)). Today: course lists + unit pages + mastery bars, not a poetic whole-math map |
| **Mastery model** | Triple-play + **SRS** coloring on the tree; local accounts | Course Mastery levels (Attempted → Familiar → Proficient → Mastered style progression), Mastery Challenges (12h cooldown, spiral review), unit/course challenges; heavy adaptive / recommendation history; Khanmigo tutoring layer on top of banks |
| **Authoring** | Small team / solo-scale; map authored as era narrative + leaves; banks growing via isomorphic clones | Large content org: e.g. **~15** writers peer-reviewed for the early 100k-problem push ([2013 blog](https://blog.khanacademy.org/100000-practice-problems/)); continuous standards remaps, multi-curriculum forks (Eureka, IM, Get Ready, AP), video + exercise coupling |
| **Primary study hours** | Quintile primary path **~386 h** (`ERA_HOURS.md`) | Not directly comparable; KA is open-ended mastery across many overlapping courses |

### Quintile node mix (from `skills_tree.json` stats)

| Kind | Count |
|------|------:|
| foundation-leaf | 105 |
| track-leaf | 51 |
| syllabus-leaf | 43 |
| skill-item | 40 |
| course | 18 |
| skill-topic | 8 |
| era | 7 |
| foundation | 5 |
| dojo | 2 |
| **Total** | **279** |

### Era concentration

| Era | Nodes |
|-----|------:|
| secondary | 115 |
| bridge | 57 |
| diploma | 47 |
| university | 24 |
| counting | 18 |
| beyond | 11 |
| workshop | 7 |

---

## 2. Where Quintile is already comparable / ahead

1. **Era narrative as curriculum story** — Seven named eras (Counting → Beyond) give a readable life-path that Khan’s flat “pick a course” catalog does not. Secondary concentration (115/279) matches where Julius’s students actually live.
2. **Organic UX on purpose** — Per-era grove motifs + pan-zoom are a deliberate aesthetic product. Khan *had* a spectacular Knowledge Map and **chose to kill it** (2013) because dashboards and course lists scaled better for coaches and classrooms. Quintile can own the “beautiful map” niche Khan vacated.
3. **SRS + triple-play on the tree** — Mastery coloring tied to spaced repetition is closer to learning-science UX than a static checklist. Khan’s Mastery Challenges are strong spiral review, but Quintile can surface SRS state *on the geography of knowledge*, not only on a course progress bar.
4. **Local accounts / privacy-shaped progress** — Progress that can live with the student (or on a small deploy) without depending on Khan’s cloud identity, classroom tooling, or API (which was largely removed — [khan-api archive](https://github.com/Khan/khan-api)).
5. **Edge richness at human scale** — 591 edges on 279 nodes (~2.1 requires avg) is already a real DAG, not a linear syllabus. That is enough to encode bridges (Secondary ↔ Diploma, skills dojos) without becoming unmaintainable.
6. **Hours honesty** — Publishing ~386 h primary-path estimates is rarer than infinite open catalogs; it sets expectations Khan’s mega-library does not.

---

## 3. Where Khan is denser

1. **Skill grain** — A single Algebra 1 / Grade 8 course routinely exposes **tens to low hundreds** of assessable skills; Quintile’s explicit `skill-item` layer is still **40** (plus EMH expansion), with many map leaves still “topic cards” rather than drillable micro-skills.
2. **Exercise volume** — **100k+** questions vs Quintile’s tens–hundreds today and **~885** isomorphic target. Density of *practice*, not density of *nodes*, is Khan’s real moat.
3. **Adaptive engine maturity** — Decades of recommendation, mastery leveling, unit/course challenges, teacher reports, and now Khanmigo. Quintile’s SRS is the right seed; it is not yet a full diagnostic → remediation engine.
4. **Standards / multi-curriculum coverage** — Common Core mappings, Eureka/IM forks, AP packs, Get Ready courses. Quintile is intentionally IB/GCSE/era-shaped, not US-standards-complete.
5. **Video + hint pedagogy at every skill** — Coupled instructional media at Khan’s depth is a separate product investment from map topology.

**Important asymmetry:** Khan’s *current* product is **not** a Khan-level *map*. They moved from Knowledge Map → Missions → Course Mastery. Chasing “Khan map complexity” risks optimizing for a UX Khan themselves abandoned.

---

## 4. Recommendation — **Hybrid: do not pursue Khan-level map complexity**

**Pursue skill grain and bank depth selectively; keep era trees poetic; do not grow the DAG toward a whole-math Knowledge Map.**

### Concrete stance

| Pursue | Don’t pursue | Hybrid sweet spot |
|--------|--------------|-------------------|
| Grow **isomorphic / EMH banks** toward the ~885 target (and beyond in Secondary + algebra) | Matching Khan’s **100k** item library or **O(10³)** unique skills sitewide | Match **skill grain only** where students grind: Secondary Higher, Bridge algebra/functions, Diploma AA topics that already have dojos |
| Keep **7-era organic groves** as the hero UX | Rebuilding a pan-zoom **whole-math starfield** of every micro-skill | Optional **in-course skill lists** under a leaf (expand-in-place), not new top-level nodes for every exercise |
| Light **requires** edges for true blockers (avg ~2 is fine) | Authoring a fine-grained prerequisite DAG for every exercise variant | Prereqs at **leaf / skill-topic** level; item variants inherit parent skill |
| SRS triple-play + local progress | Full classroom adaptive + teacher analytics parity | One “next best practice” cue per era, not a recommendation service |

### Cost / benefit

- **Authoring hours:** Expanding the map from ~279 → Khan-like thousands of nodes is mostly **topology tax** (layout, edge hygiene, student overwhelm). Expanding banks via isomorphic clones reuses existing skill IDs and pays off every practice minute. Prefer bank hours over DAG-width hours.
- **Student cognitive load:** A beautiful 279-node era forest is explorable. A 2,000-node skill galaxy recreates the Knowledge Map problem Khan retired: pretty, then paralyzing. Era narrative + “open this leaf’s drills” beats “find yourself among stars.”
- **Overlap with isomorphic bank work:** The in-flight ~885 clone program *is* the highest-ROI path to Khan-like *practice* density without Khan-like *map* density. Do not interrupt it to redraw the tree.
- **Strategic irony:** Full Khan-map complexity would make Quintile look like 2012 Khan just as Quintile’s differentiation is 2026: eras, groves, SRS-on-map, local accounts.

**Bottom line:** Khan-level **map** complexity is **not** worth it. Khan-level **practice density in a few eras** **is**. Stay hybrid.

---

## 5. Optional next steps (ranked)

### P0 — do now (aligns with bank work)

1. **Finish / protect isomorphic bank generator** toward ~885; map each clone to an existing leaf or skill-item ID (no new DAG nodes required).
2. **Publish a “practice behind the leaf” pattern** — Secondary + Bridge leaves deep-link to skill banks without adding nodes.
3. **Freeze era/motif UX** as product identity; treat layout bugs as P0, topology expansion as optional.

### P1 — selective grain (only where grind lives)

4. **Split Secondary Higher + core algebra** into skill-items where students already fail micro-skills (factoring forms, linear systems cases, function transforms) — target **+30–80** skill-items, not +500.
5. **Requires audit** — keep avg requires ~2; add edges only for true blockers (misplaced Bridge/Diploma edges hurt more than missing ones).
6. **SRS surfacing** — show due/overdue counts per era grove, not per micro-node.

### P2 — later / maybe never

7. Crosswalk to Common Core / GCSE / IB statement lists (metadata, not graph explosion).
8. Lightweight “unit challenge” analogous to Khan unit tests for Diploma / Secondary only.
9. Teacher/classroom analytics — only if Quintile becomes multi-student coaching software.

---

## Appendix A — Research notes & limits

- **Live API sampling (2026-09-24):** `https://www.khanacademy.org/api/v1/topic/math` → **410** “API removed” ([khan-api removal notice](https://github.com/Khan/khan-api)). Internal GraphQL `topicPage` → **403** safelist. HTML course pages returned bot-challenge shells (~3 KB) from this egress. Therefore skill totals are **ranges + citations**, not a fresh scrape.
- **Knowledge Map:** Retired with Learning Dashboard rollout (**~Aug 2013**). Not the current KA UX.
- **Missions → Course Mastery (2020):** Removal framed around **maintenance / aging codebase**, not “maps are pedagogically wrong” — still a warning that graph UIs and mission engines are expensive to keep correct.
- **Quintile numbers** in this doc are measured from `skills_tree.json` (`nodeCount` 279, `edgeCount` 591, `byKind` as tabled) and `ERA_HOURS.md` (~386 h primary path).

## Appendix B — One-line decision

> **Don’t build Khan’s abandoned Knowledge Map; build Khan-dense drills under Quintile’s eras.**
