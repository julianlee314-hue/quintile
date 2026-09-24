# Quintiles — living skill levels

Pages fork only (`julianlee314-hue/quintile`).

## The five levels

Every skill carries a **quintile score 0–5**. In the UI:

| Q | Name | Meaning |
|--:|------|---------|
| 0 | Bare | Not yet rooted |
| 1 | Seed | First triple-play |
| 2 | Sprout | Early hold |
| 3 | Stem | Solid |
| 4 | Crown | Strong |
| 5 | Bloom | Full mastery — **not permanent** |

Reaching Bloom is a peak, not a lock. Without practice the plant can wilt.

## State machine

```
Bare (q=0)
  └─ 3 correct in a row (triple play) → Seed (q=1), schedule review in 1 day
Seed…Crown (q=1…4)
  └─ triple play at current level → +1 quintile, new review window
Bloom (q=5)
  └─ review every 180 days; fail a due review → drop to Crown
Any q≥1
  └─ miss the window → soft wilt (overdue pulse)
  └─ fail a due review → −1 quintile (floor 0), mark wilt
Any mistake during a push → streak resets (no drop unless the review was due)
```

### Review schedule (after reaching that Q)

| Q | Next review |
|--:|-------------|
| 1 | 1 day |
| 2 | 7 days |
| 3 | 30 days |
| 4 | 90 days |
| 5 | 180 days (6 months) |

## Storage

On the active profile:

```
meta.quintiles[skillId] = {
  q, streak, nextReviewAt, lastPracticeAt,
  lifetimeMax, correct, wrong, wiltedAt?, softWilt?
}
```

Mirrored into `progress.quintiles` and legacy `progress.mastery` for older UI.

API (`js/mastery.js` → `QuintileMastery`):

- `get(skillId)` · `recordAttempt(skillId, correct)` · `nextReview(q)`
- `pickNextSkill(catalog)` · `eraGrowth(skillIds)` · `levelName(q)`

## Smart Practice (no topic required)

| Entry | URL |
|-------|-----|
| Landing | `/practice/` |
| Auto start | `/practice/?mode=practice&auto=1` |
| Big CTA | **Just practice** on `/`, `/tree/`, `/banks/` |

Scheduler priority (highest first):

1. Overdue reviews (oldest first)
2. Due today
3. Unlocked skills at q=0 (frontier)
4. Low quintile (q=1–2) for growth
5. Light mix from q=3–4 to maintain

Pulls 5–8 items via `QuintileModes.extractRun`. Shows why chosen, e.g. `Due review · Q3` / `New frontier · bonds`. Level-up celebration; wilt animation on drop.

## Tree plant growth (`/tree/`)

Per era:

```
growth = sum(q) / (5 × skillCount)   → 0–100%
```

Header vitals:

- **Mastery** — skills at Bloom (Q5) / total
- **Growth** — sum(q) / max
- **Plant health** — fraction not overdue / wilted

SVG plant scales with growth (trunk thickness, opacity, blossom count). Nodes colour by Q0–Q5; overdue pulse; recent drop = wilt red.

## Goal

Prove **TOTAL MASTERY** (Blooms) and **TOTAL GROWTH** (sum of quintiles) of the plant on the tech-tree.
