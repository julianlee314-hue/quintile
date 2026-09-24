# LaTeX / KaTeX on Quintile

**Goal:** math is LaTeX-dominant end-to-end — banks store `$...$` / `\(...\)` / `\[...\]`, and every practice surface renders with KaTeX.

## Renderer

Shared module: [`js/latex.js`](js/latex.js)

- Loads KaTeX **0.16.11** (CSS + JS + auto-render) from jsDelivr.
- `QuintileLatex.renderHtml(text)` — splits on math delimiters, **HTML-escapes** prose, runs `katex.renderToString(..., { throwOnError: false })` on math spans.
- `QuintileLatex.render(el)` / `QuintileLatex.set(el, text)` — paint a DOM node safely (stores source in `data-latex`).
- Supported delimiters: `$...$`, `$$...$$`, `\(...\)`, `\[...\]`.

Wired into:

- `practice/index.html` (prompt, MCQ choices, answer / solution status)
- `diploma/exams/` via `js/diploma-exams.js` (MCQ demo sit + review)
- `dojo/algebra/` and `dojo/integrals/`

**Bug fixed:** practice used to `prompt.textContent = item.prompt.replace(/\$/g,'')` (and the same for choices / answers), which stripped math and never loaded KaTeX.

Grading still strips `$` inside `norm()` so accept keys stay comparable.

## Bank latexify

Tool: [`tools/isomorphic/latexify_banks.py`](tools/isomorphic/latexify_banks.py)

```bash
python3 tools/isomorphic/latexify_banks.py          # in-place
python3 tools/isomorphic/latexify_banks.py --dry-run
```

Walks `data/banks/era-*.json`, `data/isomorphic_banks.json`, `data/skills_emh.json`, `data/skills.json`, and diploma MCQ demo items in `data/diploma_past_papers.json`.

Rules (only outside existing delimiters):

- Quantities / units: `$45$ km/h`, `$10\%$`
- Intervals & sets: `$(0,1)$`, `$\mathbb{R}$`, `$\mathbb{Z}$`, …
- Equations / algebra fragments wrapped as math
- Pure numeric answers / choices → `$4$` (display); **`accept[]` left unchanged** for grading
- Side-count word problems get `Enter the integer $n$.` so every prompt has a math span

Target: **≥99%** of prompts contain at least one `$` or `\(` span (post-run: **100%** on the current packs).
