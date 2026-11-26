# Architecture Decision Records

This directory holds the project's Architecture Decision Records (ADRs) — short,
durable notes on **why** the codebase is the way it is. Each ADR records one
decision (or one tightly-related cluster), the alternatives that were genuinely
on the table, and the consequences we accepted.

ADRs are the canonical home for rationale. Point-in-time implementation plans are
not kept: once a plan ships, its lasting decisions are folded into an ADR and the
plan is pruned (git history preserves the blow-by-blow).

## Index

| #    | Title                                                         | Status                   |
| ---- | ------------------------------------------------------------- | ------------------------ |
| 0001 | Shared screen shell for the Readout and history               | Accepted                 |
| 0002 | Monorepo structure & package decomposition                    | Accepted                 |
| 0003 | Package publishing & module strategy                          | Accepted                 |
| 0004 | TypeScript compiler posture                                   | Accepted                 |
| 0005 | Lint & format toolchain                                       | Accepted                 |
| 0006 | Casting algorithm, rewindable core & randomness               | Amended by 0023          |
| 0007 | Hexagram & trigram data: TS source → generated JSON           | Accepted                 |
| 0008 | Consultation file format                                      | Superseded by 0030       |
| 0009 | Terminal UI architecture & flow state machine                 | Accepted                 |
| 0010 | Interactive-environment policy & input modes                  | Accepted                 |
| 0011 | Manual casting flow design                                    | Amended by 0027, 0043    |
| 0012 | Terminal-test reliability                                     | Accepted                 |
| 0013 | Test execution & CI posture                                   | Accepted                 |
| 0014 | Product identity                                              | Accepted                 |
| 0015 | Data hygiene                                                  | Accepted                 |
| 0016 | Readout renderer extracted from viewer-core                   | Superseded by 0019       |
| 0017 | Type vocabulary folded into core                              | Accepted                 |
| 0018 | Consultation view IR + renderer collapse                      | Amended by 0022          |
| 0019 | The boundary is domain vs CLI, not computation vs rendering   | Amended by 0022          |
| 0020 | Consultations directory anchoring                             | Accepted                 |
| 0021 | Rendered-width operations have a single home                  | Accepted                 |
| 0022 | The monospace text-grid is medium-bound, not domain           | Accepted                 |
| 0023 | Random Divisions: Remainder Group ¼, then Pick within it      | Accepted                 |
| 0024 | Applicable Passages: every Moving Line, no ranking            | Accepted                 |
| 0025 | Hexagram identity is its Figure; invariant facts as data      | Accepted                 |
| 0026 | A Consultation is Cast or Recorded; Playground does not save  | Accepted                 |
| 0027 | A Cast Consultation records its Division Method               | Accepted                 |
| 0028 | A Licence Gate per Edition decides which channels show text   | Amended by 0032          |
| 0029 | The application layer: nine use cases and four driven ports   | Superseded by 0037       |
| 0030 | Consultation record v2, Consultation Id, Markdown Store rules | Accepted                 |
| 0031 | The REST engine: resources, Casting URLs, HAL + HAL-FORMS     | Superseded by 0038       |
| 0032 | Every channel is owner-only, behind Google Sign-in            | Accepted                 |
| 0033 | Journals merge by union with Deletion Records                 | Superseded by 0037       |
| 0034 | The PWA is a pure client of the REST engine                   | Superseded by 0037       |
| 0035 | The PWA has full feature parity with the CLI                  | Superseded by 0037, 0038 |
| 0036 | How the overhaul is built: owner as architect, decision tiers | Superseded by 0040       |
| 0037 | The application layer: ten use cases, four ports, channels    | Accepted                 |
| 0038 | The REST engine: resources, Casting URLs, HAL + HAL-FORMS     | Accepted                 |
| 0039 | Brooks refinements to how the overhaul is built               | Superseded by 0040       |
| 0040 | How the overhaul is built (consolidates 0036 and 0039)        | Superseded by 0042       |
| 0041 | Ratification by exception and a wider Free to choose          | Superseded by 0042       |
| 0042 | How the overhaul is built (consolidates 0040 and 0041)        | Accepted                 |
| 0043 | The Transcription checks run complete, Remainders, Set-aside  | Accepted                 |

## Template

```markdown
# <Title>

Status: Accepted
Date: YYYY-MM-DD

<1–3 paragraphs: the decision, stated plainly, and why.>

## Considered options

- **<Option>** — <what it was, why rejected/chosen>.

## Consequences

- <What this commits us to; what to watch for.>

## Where it's enforced

- `path/to/file` — <what the file does with this decision>.
```

## Conventions

- **Numbering** is sequential and never reused. New ADR = next free number.
- **Status** is one of `Accepted`, `Superseded by NNNN`, or `Deprecated`. Don't
  edit a decision's history in place — supersede it with a new ADR.
- The **`Where it's enforced`** section is the link between an ADR and the code.
  It is also how config files that can't carry inline comments (pure JSON) stay
  discoverable — see the reverse map below.

## Config → ADR reverse map

Several decisions are encoded as bare config values. Files that support comments
carry a `see docs/adr/NNNN` pointer inline; pure-JSON files (no comment syntax)
are listed here instead:

| Config file                    | Comment? | Decisions recorded in                                                 |
| ------------------------------ | -------- | --------------------------------------------------------------------- |
| `package.json`                 | no       | 0003, 0004 (engines), 0005 (lint/format scripts), 0013 (test scripts) |
| `.oxlintrc.json`               | no       | 0005                                                                  |
| `.oxfmtrc.json`                | no       | 0005                                                                  |
| `tsconfig.base.json`           | yes      | 0004                                                                  |
| `turbo.json`                   | yes      | 0002, 0013                                                            |
| `pnpm-workspace.yaml`          | yes      | 0002, 0003, 0019                                                      |
| `eslint.config.js`             | yes      | 0005, 0012                                                            |
| `vitest.config.base.ts`        | yes      | 0013                                                                  |
| `.gitignore`                   | yes      | 0015                                                                  |
| per-package `tsdown.config.ts` | yes      | 0003                                                                  |
