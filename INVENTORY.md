# Quintile inventory (live map mirror + audit additions)

**Live URL (authoritative source, left untouched):** https://king-wind-charm-lilac.grok.me/

**Grok project id:** `01a0d1d8-9526-7a30-b928-0815fdfaeca5`

**This build:** Mirror of grok.me 7-era map **plus curriculum-audit additions** (Measures, Precalculus, Mechanics; expanded Geometry/Calculus/Statistics/Linear).

**Audit:** `analysis/ERA_CURRICULUM_AUDIT.md`

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

## Courses (18)

| id | title | era | dest |
|----|-------|-----|------|
| `measures` | Measures | counting | `/track/measures` |
| `arithmetic` | First numbers | counting | `/track/arithmetic` |
| `prealgebra` | Pre-algebra | workshop | `/track/prealgebra` |
| `geometry` | Geometry | workshop | `/track/geometry` |
| `algebra` | Algebra | secondary | `/track/algebra` |
| `trigonometry` | Trigonometry | secondary | `/track/trigonometry` |
| `higher` | Higher certificate | secondary | `/foundations` |
| `precalculus` | Precalculus | bridge | `/track/precalculus` |
| `functions` | Functions | bridge | `/track/functions` |
| `aa-sl` | Analysis SL | diploma | `/track/aa-sl` |
| `aa-hl` | Analysis HL | diploma | `/syllabus` |
| `applications` | Applications | diploma | `/track/applications` |
| `calculus` | Calculus | university | `/track/calculus` |
| `statistics` | Statistics | university | `/track/statistics` |
| `linear` | Linear algebra | university | `/track/linear` |
| `mechanics` | Mechanics | university | `/track/mechanics` |
| `infinite` | The infinite | beyond | `/track/infinite` |
| `topology` | Topology | beyond | `/track/topology` |

## Audit additions (2026-09-24)

- New courses: `measures`, `precalculus`, `mechanics`
- Expanded tracks: geometry (transforms/constructions), calculus (limits/techniques), statistics (inference), linear (eigen/row-reduction)
- Stub generators: 1 worked + practice stub per new leaf in `tracks-*.js`
- Backups: `assets/*.pre_audit.bak`

## Related

- EMH fork: `julianlee314-hue/quintile-aa-hl` (keep separate)
- Handoff: `HANDOFF.md`
