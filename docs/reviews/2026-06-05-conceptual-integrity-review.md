# Conceptual-Integrity Review — post-refactor (condensed)

**Subject:** `ts-hexagram-generator` after the 7-slice domain/cli refactor.
**HEAD reviewed:** `e3db2b0` (== `main`). **Pre-refactor baseline:** `ec55c44`.
**Method:** `jiechao-toolkit:theory-reconstruction` — 5 independent cold-read agents
(Part A) + conformance diff against the intended theory (Part B) + drift check vs
baseline (Part C). This is a measurement of how legibly the code speaks, not a
certification that the design is good.

This is the condensed record that produced
`docs/superpowers/plans/2026-06-05-seam-remediation.md`. Read it for the *why*
behind each remediation task.

---

## Gate status at review time (run live, not trusted)

- `pnpm build` → 12/12 packages green.
- `pnpm boundaries:check` → `✔ no dependency violations found` (150 modules, 292 deps).
- Parity suites → consultation-view 13, consultation-file 60 (+2 skipped), readout 41,
  casting-ui 385 (+2 skipped) — all green. Byte-identity fixtures hold.
- NOT run: full `lint:check`/`format:check`/`type:check`, the 1M-iteration rng test,
  the history/playground/shell suites. Env was node v22 (repo wants ≥24.6); only
  effect was that vitest `source`-condition resolution needs a prior `pnpm build`.

## Variance across the 5 cold reads (the legibility signal)

**The domain core reads with near-zero variance; the CLI periphery reads with high
variance.** Where the code speaks legibly, five readers agreed; where it forks, they
disagreed on how many homes a piece of knowledge has.

Low variance — all 5 agreed (legible):
- Zero `domain/* → cli/*` edges; bucket boundary is real and enforced.
- The IR (`domain/consultation-view/src/ir.ts`) is genuinely medium-neutral (no ANSI,
  no Markdown).
- `isMovingLine` & line algebra → one home (`domain/core/src/line-semantics.ts`).
- Manual invariants → one home (`domain/core/src/manual-validation.ts`);
  `cli/casting-ui/src/manual-validation.ts` is routing-only and explicitly refuses to
  re-export (exemplary split).
- Section order + emerging gate assembled once (`build-view.ts`).
- `POSITION_LABELS`/`LINE_LABELS`/`LEDGER_COLUMNS`/`RIGHT_COLUMN`/`MOVING_ARROW`/
  `STATIC_GAP` → one home (`vocabulary.ts`).
- The consultations-dir dual-resolver + `process.chdir` bridge — surfaced as the
  sharpest seam by 4 of 5.

High variance — runs disagreed (the code underdetermines its theory here):

| Knowledge | Spread | Verified truth |
|---|---|---|
| `LINE_GLYPH` homes | 1 (runs 1,3) vs 2 (runs 2,4,5) | **2** — `vocabulary.ts` + byte-identical copy as `YANG_MOVING`/`YIN_MOVING`/… in `cli/viewer-core/src/banner-lines.ts:38-41` |
| `visualWidth` authority | "clean,1" / "3, string-width bypass" / "1+throwaway" / "2 notions" | **2 distinct algorithms** — hand-rolled `visualWidth` (raw) vs `string-width` lib imported raw in **8 prod cli files** |
| `parseIntFlag` | clone flagged (1,3,5) vs "delegates" (2,4) | **2** — `cli/shell/src/banner-flag.ts:23` re-implements it verbatim, no delegation |
| emerging-gate re-derivation | "single,clean" (1,4) vs flagged (2,3,5) | re-derived in `consultation-readout.tsx` (proxy predicate) + inlined `line===6\|\|9` in `generate-fixtures.ts` |
| dead readout shim | flagged (1,5) only | confirmed dead for the 3 vocab constants |
| stale cruiser comment | flagged (5) only | confirmed: comment says "consultation-file depends on core only" — now also deps consultation-view + text-layout |

Reading: a maintainer changing an I-Ching rule reliably finds one file (legible);
asking "how wide is this string?" or "where does the glyph vocabulary live?" gets a
different answer per reader (illegible).

## Seams (fault lines), with file:line

- **S1 — The IR stops one altitude short: row-assembly grammar is hand-built in 3
  surfaces, held by fixtures.** Vocabulary is single-homed, but the spatial grammar of
  a diagram row is independently re-assembled in `cli/readout/src/serialize-ansi.ts`
  (~191-282), `domain/consultation-file/src/serialize-markdown.ts` (~134-183), and
  `cli/playground-ui/src/playground-display-rows.ts` (own `playground-display-geometry.ts`).
  Kept in agreement by byte-identity fixtures, not a shared builder. **This is the
  original fault line, relocated downward, not removed.**
- **S2 — Two notions of "string width."** `domain/text-layout/src/index.ts` hand-rolls
  `visualWidth` (ANSI-naive, CJK table); `cli/viewer-core/src/viewer-layout.ts` + 7
  casting-ui files use `string-width` (ANSI-aware, strips SGR via `slice-ansi`). On
  inspection these are **different knowledge** (raw diagram text vs rendered terminal
  rows), correctly split by the domain/cli boundary — the real seam is casting-ui
  bypassing viewer-core, not a missing merge.
- **S3 — Env policy single; refusal forked.** `classifyEnv`/`refuseIfNonInteractive`
  in `cli/viewer-core/src/env-policy.ts` are single-homed, but the `{isTTY,NO_COLOR,CI}`
  snapshot is re-taken 5-6× and the refusal string authored 3×; `apps/cli` bins exit(1)
  while `shell`/`playground-ui` hardcode a local message and `return false`.
- **S4 — Consultations dir: two resolvers bridged by a global side effect.**
  `defaultConsultationsDir()` (`domain/consultation-file/src/file.ts:35`, `<cwd>/…`) vs
  `workspaceConsultationsDir()` (`apps/cli/src/workspace-root.ts:55`, `<repo-root>/…`),
  reconciled for the save flow by `anchorCwdToWorkspaceRoot()` mutating `process.cwd()`.
- **S5 — Knowledge dups the slices meant to close but left open:** `parseBannerIntervalMs`
  (verbatim `parseIntFlag` clone), the `banner-lines.ts` glyph copy, the dead readout
  re-export shim, the stale `dependency-cruiser.config.cjs` comment.

## Conformance verdict (de-facto vs intended)

- Three buckets + build-failing `domain→cli` lint — **CONFORMS**; but the guard is
  **not wired into CI** (`.github/workflows/unit-test.yml` runs lint/type/format/build/
  test, not `boundaries:check`), and the config comment is stale.
- Litmus (Next.js rebuild touches only `domain/*`) — **CONFORMS** for the rule/IR
  layer; zero `domain→cli` edges.
- Line semantics in `core/line-semantics` — **CONFORMS** (full repoint, no shim).
- Generic text math in `text-layout` — **PARTIALLY CONFORMS**: `visualWidth`+pads there
  and used by the IR serializers, but chrome bypasses them with raw `string-width`.
- `consultation-view` owns vocabulary + IR; serializers thin — **MOSTLY CONFORMS**;
  diverges on row geometry (S1); playground is a partial consumer.
- Glyph vocabulary single-homed — **DIVERGES** (code side): `banner-lines.ts` holds a
  parallel byte-identical glyph set (ADR-0018 says "exactly once"; true for consultation
  rendering, false globally).
- Manual invariants in core; casting-ui routing-only; `computeManualRoundResult` gone —
  **CONFORMS** (cleanest item; `computeManualRoundResult` returns zero matches). Doc
  drift: reference names `validateManualInput`; actual export is `validateManualSplit`.
- Unified env / one `parseIntFlag` / `defaultConsultationsDir` exported — **PARTIALLY
  CONFORMS** (S3, S5, S4).
- Full repoint, no shim — **MOSTLY CONFORMS**; one vestigial readout shim survives.
- Playground = real consultation-view consumer, no third copy — **PARTIALLY CONFORMS**
  (vocabulary consumed, geometry re-derived).
- IR medium-neutral — **CONFORMS**.
- `--plain` LINES-last + fixtures byte-identical — **CONFORMS** (`linesSection` pushed
  last in `build-view.ts:237`; parity suite green).
- ADR-0018/0019 exist; 0016 "Superseded by 0019" retaining the 0018 deepening pointer —
  **CONFORMS exactly**.

## Drift verdict

- **Closed by structure:** `isMovingLine` 8 files→1; `POSITION_LABELS` 4→1; glyph/label/
  ledger/section-order/emerging-gate hoisted into the IR; domain/cli boundary created +
  enforced; `computeManualRoundResult ≡ performCast` duplicate removed; manual invariants
  moved into the domain.
- **Surviving:** `banner-lines.ts` glyph copy; raw `string-width` chrome usage;
  consultations-dir `chdir` bridge (all predate the refactor).
- **New (introduced by the refactor):** stale cruiser comment; dead readout shim;
  `parseIntFlag`-vs-`parseBannerIntervalMs` partial duplicate.
- **Is the computation-vs-rendering fault line gone?** **Relocated, not gone.** The
  vocabulary half is now structural (one IR); the assembly half persists — row grammar
  is still hand-built in 3 serializers and still fixture-held at that lower altitude (S1).

## De-facto theory (synthesis — one reading, not ground truth)

A medium-neutral domain beneath a build-failing `domain→cli` line, fanned out through a
single presentation IR to thin ANSI/Markdown serializers. Honoured with real discipline
at the rule/vocabulary altitude; frays wherever the IR's reach ends and the terminal
begins. The recurring tell is a comment asserting "single source of truth" one import
away from a second copy: a second glyph set for the banner, a second width path for the
chrome, a second flag parser for shell, a second dir resolver bridged by `chdir`, a
refusal message authored thrice, a dead forwarding shim, a boundary-config comment
describing a graph the code outgrew. None touch divination meaning; all cluster in
terminal plumbing.

**Calibrated closing:** the code now speaks with one mind about the domain (rules,
invariants, IR — single-homed, medium-neutral, read identically by five cold readers)
but still speaks with a forked tongue about the terminal periphery (width, banner
glyphs, flag parsing, env-refusal, consultations path, and above all the diagram-row
assembly grammar — duplicated across surfaces and held by fixtures rather than
structure). The refactor closed the fault line at the vocabulary altitude and relocated
it, intact, one altitude down.
