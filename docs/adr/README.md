# Architecture Decision Records

This directory holds the project's Architecture Decision Records (ADRs) — short,
durable notes on **why** the codebase is the way it is. Each ADR records one
decision (or one tightly-related cluster), the alternatives that were genuinely
on the table, and the consequences we accepted.

ADRs are the canonical home for rationale. Point-in-time implementation plans are
not kept: once a plan ships, its lasting decisions are folded into an ADR and the
plan is pruned (git history preserves the blow-by-blow).

## Index

| #    | Title                                                       | Status             |
| ---- | ----------------------------------------------------------- | ------------------ |
| 0001 | Shared screen shell for the Readout and history             | Accepted           |
| 0002 | Monorepo structure & package decomposition                  | Accepted           |
| 0003 | Package publishing & module strategy                        | Accepted           |
| 0004 | TypeScript compiler posture                                 | Accepted           |
| 0005 | Lint & format toolchain                                     | Accepted           |
| 0006 | Casting algorithm, rewindable core & randomness             | Accepted           |
| 0007 | Hexagram & trigram data: TS source → generated JSON         | Accepted           |
| 0008 | Consultation file format                                    | Accepted           |
| 0009 | Terminal UI architecture & flow state machine               | Accepted           |
| 0010 | Interactive-environment policy & input modes                | Accepted           |
| 0011 | Manual casting flow design                                  | Accepted           |
| 0012 | Terminal-test reliability                                   | Accepted           |
| 0013 | Test execution & CI posture                                 | Accepted           |
| 0014 | Product identity                                            | Accepted           |
| 0015 | Data hygiene                                                | Accepted           |
| 0016 | Readout renderer extracted from viewer-core                 | Superseded by 0019 |
| 0017 | Type vocabulary folded into core                            | Accepted           |
| 0018 | Consultation view IR + renderer collapse                    | Accepted           |
| 0019 | The boundary is domain vs CLI, not computation vs rendering | Accepted           |

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
