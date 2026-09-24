# Points (provisional)

Scaffold only. **Julius will design the real economy later.**

## Storage

On the active local profile (`localStorage['quintile-profile-'+id].meta.points`):

```json
{ "balance": 0, "history": [{ "at": "...", "delta": 1, "reason": "attempt_correct", "ref": "indices" }] }
```

## Current TODO constants (`js/points.js` → `AWARDS`)

| Reason | Delta | Notes |
|--------|------:|-------|
| `attempt_correct` | +1 | Every graded correct item |
| `attempt_wrong` | 0 | Placeholder |
| `earn` | +25 | First triple-play earn |
| `recover` | +20 | Triple-play out of red/lapsed |
| `srs_pass` | +40 | Passing a 7d / 30d / 180d review triple |
| `game_stub` | +5 | Mini-game stub clear |
| `dojo_item` | +2 | Dojo drill item correct |

These numbers are **not final**. Do not balance content around them yet.
