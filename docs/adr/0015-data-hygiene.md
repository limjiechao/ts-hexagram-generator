# Data hygiene

Status: Accepted
Date: 2026-05-19

Saved consultations are private. A real reading pairs a personal, often sensitive
**query** with a timestamp — it can identify a person and their circumstances.
The project therefore treats consultation data as something that must never enter
version control, and codifies that as a standing rule rather than case-by-case
judgement.

The rules:

- **`consultations/` is gitignored.** Real readings are written there at runtime and
  never committed.
- **No real consultation may seed a fixture, doc, example, comment, commit message,
  PR, issue, or ADR.** Test data uses invented names and generic or
  fictional-but-scenario-rich scenarios (e.g. the `legacy-real-*` corpus's Greyfen
  Hold / Steward Aelric cast).
- **A leak is treated as a leak.** Personal data found in a fixture or doc means
  scrubbing the working tree _and_ flagging it to the user for a history rewrite —
  not assuming the exposure is contained to the current commit.

## Considered options

- **Track `consultations/`** (or sample real readings into fixtures). Rejected:
  any real reading in git is a privacy exposure that history makes permanent.
- **Rely on author discretion per commit.** Rejected: a written, enforced rule (in
  AGENTS.md, with the gitignore as the mechanical backstop) is what prevents a tired
  slip; "treat a leak as a leak" sets the response in advance.

## Consequences

- Fixtures and docs must invent their scenarios; there is a house style for it.
- The gitignore entry is load-bearing — do not remove it, and do not add a path that
  would capture `consultations/`.
- Discovering personal data anywhere committed escalates to a history-rewrite
  conversation, not a quiet fix.

## Where it's enforced

- `.gitignore` — the `consultations` entry (carries a pointer to this ADR).
- `AGENTS.md` — the "Data hygiene — DO NOT commit personal data" section (the full
  policy text).
- `packages/consultation-file/tests/fixtures/` — invented-scenario fixtures.
