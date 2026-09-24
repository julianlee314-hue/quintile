# Quintile Tree, accounts, mastery, modes

Pages fork only (`julianlee314-hue/quintile`). Does **not** touch grok.me.

## URLs (GitHub Pages)

| Page | Path |
|------|------|
| Atlas | `/` |
| **Tree** | `/tree/` |
| **Practice / Exam runner** | `/practice/?skill=<id>&mode=practice\|exam` |
| **Games** | `/games/` |
| **Dojos** | `/dojo/`, `/dojo/algebra/`, `/dojo/integrals/` |
| Account UI | chip on every shell (Create / Switch / PIN / Export / Import) |

## Accounts (no email)

- Registry: `localStorage['quintile-accounts']` = `{ activeId, accounts:[{id,username,pinSalt,pinHash,createdAt}] }`
- Profile: `localStorage['quintile-profile-'+id]` = `{ progress, attempts, meta }`
- Active progress mirrored to `quire-progress` (Zustand shape) so the React app keeps working.
- Guest **Traveler** auto-created. Optional 4–6 digit PIN = SHA-256(salt:pin) via Web Crypto.
- **PIN is local-only soft lock, not a security boundary.**

## Attempt log

- `js/attempts.js` → `window.__quintileAttempt(payload)`
- Append-only on active profile (`attempts[]`, cap 5000)
- Drill patched: every skill-item check + paper part check logs
- History[0] changes also log run-level events (deduped)

## Mastery / SRS (`js/mastery.js`)

**Earn:** three correct **in a row** (triple play). Not 4/5, not one-shot.

**After earn (SRS stages):**

| Stage | Interval to next review |
|------:|-------------------------|
| 0→1 | 7 days |
| 1→2 | 30 days |
| 2→3 | 180 days (6 months) → **long-secure** |

Any mistake **on a due review** → status `lapsed` (red). Must triple-play again to recover; **SRS restarts at the 7-day stage** after recovery.

Statuses for tree colouring: `locked` · `available` · `learning` · `earned` · `due` · `lapsed` · `secure`

Celebration confetti + optional soft chime on first earn / recover.

## Question modes (`js/practice-adaptive.js`)

| Mode | Behaviour |
|------|-----------|
| **Practice** | Adaptive Easy↔Medium↔Hard. Correct raises one level; mistake drops one. Persists `progress.practiceLevel[skillId]`. **Drives triple-play / SRS earn.** |
| **Exam** | Fixed level for the whole run. Scored `earned/total`. Attempts `kind:'exam'`. Does **not** step `practiceLevel`. Does **not** drive earn streak. Optional: all-correct while skill `due` counts as SRS review pass. |

Bank: `data/skills_emh.json` (120 EMH items, copied read-only from aa-hl fork). Fallback: 40 flat items + `skills_stage_bands.json` (index bands).

Toggle: Practice \| Exam chip in header; full runner at `/practice/`.

## Points (scaffold)

See `POINTS.md`. Provisional constants in `js/points.js`. Balance on account chip.

## Tree data

- Generator: `tools/build_skills_tree.py` → `data/skills_tree.json`
- Motifs: `assets/motifs/*.svg` (25 hand-authored cartoons)
