# Diploma Exams scaffold

This is a metadata-first exam room for **IB Mathematics: Analysis & Approaches (AA)** HL and SL. The catalog in `data/diploma_past_papers.json` contains placeholder cards for May and Nov sessions from 2021–2025, with room for TZ1/TZ2 variants.

## What is included

- `diploma/exams/` provides filters for level, paper, session, and year.
- Placeholder cards show status, typical duration, calculator expectation, and a local-only PDF attachment slot. The browser stores only the selected file's name and byte size in `localStorage`; no file is uploaded or committed.
- `mcqDemoPapers` is separate from the placeholder archive. Its 24 short, original/isomorphic items each have exactly five A–E choices, a `correct` letter, a solution, and an optional stage. The demo sit marks every item and reports a percentage.
- No real past-paper question text, answer keys, or PDFs are present in this repository.

## Timing defaults

The scaffold uses the usual 2021 AA structure: SL Paper 1 and Paper 2 are 90 minutes; HL Paper 1 and Paper 2 are 120 minutes; HL Paper 3 is 60 minutes. Paper 1 is marked `calculator: "none"`; Papers 2 and 3 are marked `calculator: "required"`. Confirm the cover sheet of any future upload before relying on these defaults.

## Adding PDFs later

Julius can select a locally held PDF from a placeholder card's **Attach PDF** control. That attachment remains browser-local and is not part of git. If a future release is allowed to host a paper, add only a rights-cleared file under the chosen upload path, update that card's `uploadPathHint`/metadata, and keep copyrighted material out of the repository unless permission is explicit.
