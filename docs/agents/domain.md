# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This is a **single-context** repo: one `CONTEXT.md` and one `docs/adr/` directory at the repo root cover the whole monorepo. All packages — the `domain/*` libraries (`core`, `consultation-file`, `text-layout`, `consultation-view`) and the `cli/*` packages (`viewer-core`, `readout`, `casting-ui`, `history-ui`, `playground-ui`, `shell`, `test-utils`, `cli`) — share the same divination domain vocabulary.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

> Note: `docs/adr/` was given a one-time backfill (2026-05-29) that promoted the
> significant decisions previously scattered across config, commit history, and
> now-pruned implementation plans into topical ADRs (0002–0015). The lazy,
> resolve-then-record model above is unchanged going forward — the backfill was a
> catch-up, not a new process.

## File structure

Single-context repo:

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-some-decision.md
│   └── 0002-another-decision.md
├── domain/
└── cli/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 — but worth reopening because…_
