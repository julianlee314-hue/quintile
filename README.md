# Quintile

Mirror of the live Quintile map site (7 eras · 15 courses · AA HL diploma tree).

## Open locally

```bash
cd site   # or this directory if you are already in site/
python3 serve.py
# open http://127.0.0.1:8000/
```

## Routes

| Path | Purpose |
|------|---------|
| `/` | 7-era map |
| `/foundations` | Higher pathway + 8 fluency checks |
| `/progress` | On-device progress |
| `/syllabus` | AA HL diploma tree (43 leaves) |
| `/track/:id` | Course track |
| `/strand/:id` | Paper strand |
| `/drill?...` | Drill room |

## Data extracts

JSON under `data/` (atlas, skills, papers index, syllabus leaves, foundations/track topics). The live UI still loads bundled JS; JSON is for inventory and later rewiring.

## Relation to other repos

| Repo / folder | What it is |
|---------------|------------|
| **This (`quintile`)** | Current live map mirror |
| `quintile-aa-hl` | Older AA-HL-only drill with Easy/Medium/Hard expansion |
| grok.me live | Authoritative publish target — update via Grok Build Mode (not from this repo push) |

## Live reference

https://king-wind-charm-lilac.grok.me/

## GitHub Pages

https://julianlee314-hue.github.io/quintile/

The site auto-detects the `/quintile` prefix when hosted on GitHub Pages. Local `serve.py` uses `/`.
