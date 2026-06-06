# Round-3 Seam Remediation — Design

**Status:** approved (brainstorm complete, decisions locked)
**Branch:** `claude/charming-allen-7L8rs`
**Baseline:** HEAD `8900f98` (round-2 seam-remediation complete)
**Source of findings:** the round-3 conceptual-integrity measurement (5-run cold
reconstruction + conformance diff). This spec closes the seams that measurement
left open or surfaced fresh.

## Goal

Close four seam clusters **without changing any observable output**. Every
behaviour-touching change is gated by the existing byte-identity fixture suites:
green *without* a `pnpm generate-fixtures` run is the proof the bytes are
unchanged. Risk-ordered parts, smallest/safest first.

This is a legibility/coherence change, not a feature. No new capability, no new
flag, no new output. The litmus from the standing theory still holds afterward:
a Next.js app rebuilds every CLI feature from `domain/*` alone, and the
`domain → cli` arrow stays machine-blocked by `boundaries:check`.

## Background — the four seams (with file:line at time of writing)

- **A — ANSI-strip regex triplicated, one copy subtly wrong.** The canonical
  `ANSI_PATTERN` / `stripAnsi` is exported from
  `cli/viewer-core/src/viewer-layout.ts:48`
  (`/\[[0-9;]*m/g`). It is re-rolled locally at
  `cli/casting-ui/src/viewer-flow.ts:100` (identical) and
  `cli/playground-ui/src/playground-display-text.ts:8` — the latter
  `/\[[0-9;]*m/g` is **missing the `` ESC anchor**, so it would also strip
  a literal `[0m` appearing in plain text. One rule, three homes, one wrong.

- **B — non-interactive refusal fork (deferred S3 from round 2).** The policy
  predicate `classifyEnv` is single-homed (`cli/viewer-core/src/env-policy.ts:40`),
  but the refusal *message* `"<bin> requires an interactive terminal"` is
  authored three times (`env-policy.ts:65`; `cli/shell/src/run-hexagram.tsx:32`;
  `cli/playground-ui/src/run-playground-app.ts:16`) and enforcement forks two
  ways: `refuseIfNonInteractive` → `process.exit(1)` (used by the `history` /
  `manual` app bins) vs a local `NON_INTERACTIVE_MESSAGE` + `return false`
  (the `runHexagram` / `runPlaygroundApp` run-entries). The boolean-return
  variant exists for **testability** — the run-entries take an injectable `env`
  snapshot and return a boolean so a unit test can exercise the refusal branch
  without `process.exit` killing the test runner.

- **C — `build-view` emerging-gate inline (deferred from round 2).**
  `domain/consultation-view/src/build-view.ts:181` re-derives
  `hexagram.some(isMovingLine)` inline instead of calling core's single-homed
  `hasMovingLines` (`domain/core/src/line-semantics.ts:38`), even though it
  already imports `isMovingLine` from the same module.
  (The readout's `locked || sections.emerging != null` predicate at
  `cli/readout/src/consultation-readout.tsx:198` is **deliberately different
  knowledge** — the in-progress UI cannot see the hexagram — and is left alone.)

- **D — casting-ledger assembly duplicated across serializers.** The IR already
  owns the ledger *data model* (`LedgerRow`) and *column schema*
  (`LEDGER_COLUMNS`, `buildLedgerRows`). What is duplicated is the *assembly*:
  banner-span math (`leftSpan` / `rightSpan`), the `indent + cells.join(gutter)`
  row construction, the `═╪═` / `─┼─` rule rows, and the null→placeholder branch
  — hand-written in parallel at `cli/readout/src/serialize-ansi.ts:52-159` and
  `domain/consultation-file/src/serialize-markdown.ts:40-125`, sharing only the
  column widths. This is the round-1/2 row-grammar fault one altitude down: the
  diagram-row template reached the line rows but not the ledger table.

- **E — fixture-generator re-literalizes line semantics.**
  `cli/casting-ui/scripts/generate-fixtures.ts:35` hardcodes
  `line === 6 || line === 9` — the exact predicate `isMovingLine` owns.

## Decisions (locked during brainstorm)

1. **Scope:** close A, B, C, D, E.
2. **B control-flow contract: "boolean guard, exit at bin."** One
   `warnIfNonInteractive(binName, env?)` in viewer-core owns the single message
   and returns interactivity; `process.exit` stays at the app/bin boundary.
3. **D shape: shared ledger assembler via a `LedgerStyle` strategy object** in
   `consultation-view`, consumed by both serializers.
4. **D boundary: ledger only.** The transformation header/footer/divider is
   **not** unified — its two-column knowledge is already single-homed via
   `RIGHT_COLUMN` + `padToColumn`; the repeated `padToColumn(left, COL) + right`
   one-liner is character-level, not knowledge-level, and the labels/colours
   legitimately differ per medium. Adding a `twoColumn()` helper would be
   over-reach vs the repo's "DRY means knowledge, not characters" principle.
5. **E `braceSuffix` left as-is.** Deriving its row→trigram mapping from core's
   structural upper/lower split is unrequested generality for a latent (not
   active) coupling.

## Architecture — the four parts

### Part 1 — Trivial single-home cleanups (C + E), zero behaviour change

- `domain/consultation-view/src/build-view.ts:181`:
  `hexagram.some(isMovingLine)` → `hasMovingLines(hexagram)` (add the import
  from `@hexagram/core/line-semantics`; `isMovingLine` may become unused there).
- `cli/casting-ui/scripts/generate-fixtures.ts:35`:
  `line === 6 || line === 9` → `isMovingLine(line)` (import from
  `@hexagram/core/line-semantics`).

No output changes possible (same predicate). Verified by type:check + the parity
gate.

### Part 2 — ANSI-strip regex single home (A)

- `cli/casting-ui/src/viewer-flow.ts`: delete the local `ANSI_PATTERN`; import
  `stripAnsi` (or `ANSI_PATTERN`) from `@hexagram/viewer-core` and use it at the
  current call site (`:110`). casting-ui already depends on viewer-core — no new
  edge.
- `cli/playground-ui/src/playground-display-text.ts`: delete the local weaker
  `ANSI_PATTERN`; import `stripAnsi` from `@hexagram/viewer-core`. Keep the
  existing two-step `visualWidth(stripAnsi(text))` (text-layout's `visualWidth`,
  NOT viewer-core's `terminalWidth` — switching width engines would re-measure
  CJK and risk the width invariant). playground-ui already depends on
  viewer-core — no new edge.

This *fixes* the playground's missing-ESC bug. Behaviour risk: if any fixture or
identity string contained a literal `[Nm` sequence, the stricter regex would
stop stripping it and shift a measured width. Gated by
`top-half-width-invariant.test.ts` and the parity gate. If anything shifts, the
plan **surfaces it** rather than regenerating fixtures.

### Part 3 — Non-interactive refusal contract (B)

In `cli/viewer-core/src/env-policy.ts`:

```ts
/**
 * Warn (to stderr) and report whether the environment is interactive enough to
 * mount an Ink UI. The SINGLE home for the refusal message. Pure w.r.t. control
 * flow — it never exits; callers decide. `env` defaults to a live snapshot;
 * tests inject one to exercise the refusal branch.
 *
 * Returns true when interactive (caller proceeds), false after writing the
 * `<binName> requires an interactive terminal` message (caller refuses).
 */
export function warnIfNonInteractive(
  binName: string,
  env: EnvSnapshot = liveSnapshot(),
): boolean {
  if (classifyEnv(env).interactive) return true
  process.stderr.write(`${binName} requires an interactive terminal\n`)
  return false
}

/** Refuse a non-interactive environment by warning + exiting 1. Thin wrapper
 *  over `warnIfNonInteractive`; the exit lives at this app-boundary helper so
 *  the bins stay one-liners and library run-entries can use the boolean form. */
export function refuseIfNonInteractive(binName: string): void {
  if (!warnIfNonInteractive(binName)) process.exit(1)
}
```

(`liveSnapshot()` is the existing inline `{ isTTY: Boolean(process.stdout.isTTY),
NO_COLOR: process.env.NO_COLOR, CI: process.env.CI }` — extract it once so both
helpers and the run-entries share it, or keep the literal in
`refuseIfNonInteractive` if extraction adds noise; implementer's call.)

Repoint the two run-entries to drop their local `NON_INTERACTIVE_MESSAGE` and
call the shared boolean guard, preserving their boolean return and injected-env
testability:

- `cli/shell/src/run-hexagram.tsx`: replace the `NON_INTERACTIVE_MESSAGE` const
  and the inline `classifyEnv(snapshot).interactive` + `stderr.write` + `return
  false` (`:32`, `:61-63`) with `if (!warnIfNonInteractive('hexagram', snapshot))
  return false`.
- `cli/playground-ui/src/run-playground-app.ts`: same, with
  `'hexagram-playground'` (`:16-17`, `:39-41`).

`apps/cli/src/{history,manual}.ts` keep calling `refuseIfNonInteractive(...)`
unchanged (now delegating). The message string lives once; `process.exit` is
confined to the `refuseIfNonInteractive` wrapper (and thus the bins that call
it); every path is unit-testable via the injected snapshot.

### Part 4 — Shared casting-ledger assembler (D), gated, byte-risky

New `domain/consultation-view/src/ledger-template.ts`. It owns the full ledger
*assembly* and consumes a `LedgerStyle` strategy object so each serializer
injects only its medium. The IR (`LedgerRow`, `LEDGER_COLUMNS`,
`buildLedgerRows`) is unchanged.

```ts
export interface LedgerStyle {
  /** The inter-cell gutter (ANSI: ` <grey>│</reset> `; Markdown: ` │ `). */
  gutter: string
  /** Banner (左Left/右Right) + column-header cells (ANSI: HEADING_GREY). */
  heading: (text: string) => string
  /** A complete rule row, post-join (ANSI: NORMAL_GREY wrap; Markdown: id). */
  rule: (text: string) => string
  /** One padded data cell, by column key + row (ANSI: per-column colour). */
  dataCell: (columnKey: string, text: string, row: LedgerRow) => string
  /** A `·` placeholder cell for a null split (ANSI: PLACEHOLDER_GREY).
   *  Markdown is only rendered from full records, so it passes a function that
   *  throws — preserving the current `serialize-markdown` invariant guard. */
  placeholder: (dot: string) => string
}

/** Assemble the CASTING ledger block (banner row, header row, header rule, and
 *  the 18 data rows with block rules) from the IR rows + a medium style. The
 *  single home for ledger geometry: span math, gutter join, rule joiners
 *  (`═╪═` / `─┼─`), and the null→placeholder branch live here once. Returns the
 *  block WITHOUT the `CASTING:` / `## CASTING` heading or the ```text fence —
 *  each serializer keeps its own heading/fence wrapper. */
export function ledgerBlock(
  rows: readonly LedgerRow[],
  style: LedgerStyle,
): string
```

- `cli/readout/src/serialize-ansi.ts`: `serializeCastingAnsi` becomes the
  heading + `ledgerBlock(section.rows, ansiLedgerStyle)`, where `ansiLedgerStyle`
  carries the existing palette decisions (BOLD_WHITE line, NORMAL_GREY
  cast/stalks/held/setAside, YELLOW remainders, BOLD_CYAN `⇒` sigma on cast 3,
  bare heap/piles, HEADING_GREY headings, NORMAL_GREY rule wrap + gutter,
  PLACEHOLDER_GREY `·`).
- `domain/consultation-file/src/serialize-markdown.ts`: `serializeCastingMarkdown`
  becomes the `## CASTING` + ```text fence + `ledgerBlock(section.rows,
  markdownLedgerStyle)`, where every callback is identity, the gutter is ` │ `,
  and `placeholder` throws (the record is always full here).

The five callbacks each map to a *currently-existing* distinct decoration —
minimal for the two media, not a speculative "colour anything" knob.

## Components & boundaries

- `consultation-view` gains `ledgerBlock` + `LedgerStyle` (medium-neutral; sits
  beside the existing `diagram-template`). No new dependencies.
- `viewer-core` gains `warnIfNonInteractive` (and exports it).
- `cli/readout` (ANSI) and `consultation-file` (Markdown) become thinner: they
  own only the heading/fence + their style object. `cli/readout → consultation-
  view` is an existing legal cli→domain edge; `consultation-file → consultation-
  view` is existing domain→domain. No boundary change, no cycle.

## Testing & gating

- **Part 1:** `pnpm --filter @hexagram/consultation-view type:check`; parity gate.
- **Part 2:** `pnpm --filter @hexagram/playground-ui test` (incl.
  `top-half-width-invariant`); `pnpm --filter @hexagram/casting-ui test`; parity
  gate.
- **Part 3:** new `cli/viewer-core/tests/env-policy.test.ts` cases for
  `warnIfNonInteractive` (interactive → true, no write; non-interactive → false,
  one write; message matches `<bin> requires an interactive terminal`); existing
  `refuseIfNonInteractive` / run-entry refusal tests still green; type:check.
- **Part 4 (TDD):** first write a characterization test in
  `domain/consultation-view/tests/ledger-template.test.ts` that locks the plain
  (Markdown-style, identity callbacks) ledger output *and* a decorated form
  (wrapping callbacks) — capturing the exact bytes before the serializers are
  repointed. Then introduce `ledgerBlock`, repoint both serializers, and confirm
  the **parity gate is green WITHOUT `generate-fixtures`** — that green is the
  byte-identity proof.
- **Final gate:** `pnpm boundaries:check && pnpm build && pnpm test &&
  pnpm type:check && pnpm lint:check && pnpm format:check`.

> **Environment note.** The gate requires **node ≥24.6** and a prior
> `pnpm install` + `pnpm build` (vitest resolves cross-package `source`). The
> review container that produced this spec ran node 22 with no install and could
> not execute the gate — the implementer MUST run on node ≥24.6.

## Out of scope (recorded so the next reviewer sees the choice)

- The transformation header/footer/divider `twoColumn` pattern (knowledge
  already single-homed via `RIGHT_COLUMN`; declining on DRY-is-knowledge grounds).
- `braceSuffix`'s display-index row→trigram mapping (latent, not active).
- The two rendered-width homes (`terminalWidth` ANSI-aware vs `visualWidth`
  ANSI-naive) — deliberately distinct knowledge, confirmed across all 5 review
  runs; not a seam.
- The readout `locked || sections.emerging != null` predicate (different
  knowledge from `hasMovingLines`).

## Reversibility

Each part is an independent commit; Parts 1–3 are mechanically reversible. Part 4
is the only one with byte-output risk and is fully fixture-gated — a red parity
gate means the template diverged from a legacy byte; fix the template, never the
fixture.
