# Legacy architecture (pre-overhaul)

**Ephemeral.** This is the map of the code as it stood before the DDD/hexagonal
overhaul. It was moved verbatim (only one relative link adjusted) out of `AGENTS.md` on 2026-11-16 (ADR-0036), so
that `AGENTS.md` holds only rules and pointers. It describes the current code
that the bug loop still maintains. It is not authoritative, and it is retired
when the overhaul replaces that code. Where it disagrees with an ADR or with
the code, it is wrong.

## Repository layout

This is a **Turborepo + pnpm-workspaces monorepo**. The root is private. Packages live under three top-level buckets: `domain/*` holds the medium-neutral, reusable layer (algorithm, data, types, line semantics, manual invariants, presentation IR); `cli/*` holds the medium-bound terminal-layer libraries (chrome, serializers, Ink UIs); `apps/*` holds the runnable apps (the CLI bins package). A `domain/* → cli/*` import is a build-failing lint error (an ESLint `no-restricted-imports` rule scoped to `domain/**`, run by `pnpm lint:check`). `apps/*` sits at the top of the DAG and may depend on both `cli/*` and `domain/*`. See `docs/adr/0019-domain-cli-boundary.md`.

```
ts-hexagram-generator/             # workspace root (private)
├── domain/                        # medium-neutral, reusable — below the UI line
│   ├── core/                      # @hexagram/core — type vocabulary (./types), algorithm, random, getters, line-semantics, manual-validation, hexagram/trigram records
│   ├── consultation-file/         # @hexagram/consultation-file — canonical YAML envelope (frontmatter + injected Markdown body), file save/load, legacy converter
│   ├── text-layout/               # @hexagram/text-layout — CJK-aware column width + padding/centring helpers (no divination meaning)
│   └── consultation-view/         # @hexagram/consultation-view — medium-neutral Consultation-view IR (presentation vocabulary, section order, glyph vocabulary) + buildConsultationView + buildLedgerRows
├── cli/                           # medium-bound terminal-layer libraries — thin serializers of the domain
│   ├── viewer-core/               # @hexagram/viewer-core — generic terminal-UI primitives (ScreenShell, palette, chrome, keymap, layout)
│   ├── readout/                   # @hexagram/readout — ANSI serializer of the Consultation-view IR (ConsultationReadout + IR→ANSI serializers)
│   ├── text-grid/                 # @hexagram/text-grid — medium-bound monospace renderer: column geometry, the ledger/diagram rendering skeletons, the auto-scroll row math, and the Markdown body serializer of the consultation-view IR
│   ├── casting-ui/                # @hexagram/casting-ui — Ink casting viewer + interactive/manual flows, plain-mode renderers
│   ├── history-ui/                # @hexagram/history-ui — Ink history browser
│   ├── playground-ui/             # @hexagram/playground-ui — Ink interactive playground (4-state line explorer)
│   ├── shell/                     # @hexagram/shell — Home hub aggregating the casting/history/playground UIs
│   └── test-utils/                # @hexagram/test-utils (private, dev-only) — polling + readiness-witness test helpers
└── apps/                          # runnable apps — top of the DAG (may depend on cli/* and domain/*)
    └── cli/                       # @hexagram/cli (private) — hexagram + hexagram-random + hexagram-interactive + hexagram-manual + hexagram-history + hexagram-playground bins; workspace-root anchors consultations/ to the repo root
```

The decision behind this decomposition (and the dependency DAG) is recorded in `docs/adr/0002-monorepo-structure-and-package-decomposition.md`; the domain-vs-CLI boundary that names the two buckets is `docs/adr/0019-domain-cli-boundary.md`. See `docs/adr/` for the full set of architecture decisions. The consultation presentation IR — `@hexagram/core` → `@hexagram/consultation-view` (medium-neutral IR) → `@hexagram/text-grid` (medium-bound monospace serializer: column geometry, ledger/diagram skeletons, auto-scroll row math, IR→Markdown body; measures CJK width via `@hexagram/text-layout`) → `@hexagram/readout` + `@hexagram/playground-ui`; `@hexagram/consultation-file` owns only the canonical YAML envelope and receives the rendered Markdown body as an argument (no dependency on `consultation-view`) — is recorded in `docs/adr/0018-consultation-view-ir.md` and `docs/adr/0022-monospace-text-grid-is-medium-bound.md`.

Library packages publish via `package.json#exports` only (no `main`/`module`/`types`). Each entry carries `source` / `types` / `import` conditions: `source` (`./src/index.ts`) for `tsx`/`vitest` no-build dev, `types` (`./dist/*.d.mts`) and `import` (`./dist/*.mjs`) for consumers.

## Architecture

### Core algorithm — `@hexagram/core`

`domain/core/src/index.ts` models the traditional yarrow stalk divination procedure. The four operations (四營) are implemented as a pure function pipeline:

```
partTheStalks → suspendOneFromTheRight → sortLeftAndRightIntoFours → setAsideRemainderFromSortedLeftAndRight
```

`makeLineGenerator` is a synchronous generator that runs this pipeline three times (三變成爻) and yields a `FourOperationsResult` after each round, receiving the next `partStalksAtIndex` via `generator.next(index)`. After all three rounds, it returns a `Line` (6 | 7 | 8 | 9). `domain/core/src/index.ts` exposes the runtime algorithm (`makeLineGenerator`, `stalksBeforeParting`, etc.); types like `Line`, `Hexagram`, and `CastingRecord` are imported from `@hexagram/core/types` (the vocabulary ships as a subpath of `core`).

**Line semantics:**

- `7` = young yang (solid, static)
- `8` = young yin (broken, static)
- `6` = old yin / moving yin (broken, changes to yang)
- `9` = old yang / moving yang (solid, changes to yin)

Lines 6 and 9 are "moving lines". The emerging hexagram is obtained by flipping them: 6→7, 9→8.

### Random vs. interactive vs. manual

- **`domain/core/src/random-casting.ts`** — drives `makeLineGenerator` with `node:crypto.randomInt` splits; exports `generateRandomHexagram()` and `generateRandomHexagrams()` for use as a library, plus `generateRandomConsultation()` which also returns the casting record. Pure library code — no CLI entry.
- **`cli/casting-ui/src/interactive-flow.ts`** — same generator wired to `@inquirer/prompts` for the plain-mode terminal flow (`getHexagramViaInteraction`, `getOneLineViaInteraction`).
- **`apps/cli/src/{random,interactive,manual}.ts`** — the three bin entries. Each is a shebang + `main()` + top-level await, importing `generateRandomConsultation` from `@hexagram/core/random-casting` and the viewer + output helpers from `@hexagram/casting-ui`. The manual bin uses the thin `runManualConsultationViewer({ maxWrapWidth })` wrapper exposed by `@hexagram/casting-ui` and refuses non-TTY contexts outright (no `--plain` branch). Each consultation-saving bin computes `workspaceConsultationsDir()` (`apps/cli/src/workspace-root.ts`) once at the shell edge and threads it as the explicit `dir`/`consultationsDir` into the consultation-file, history, and casting APIs, so saves land in `<repo-root>/consultations` regardless of the invocation directory — no bin mutates `process.cwd()` (ADR-0020). `apps/cli/src/history.ts` likewise threads the explicit repo-root `dir` into `runHistoryViewer` and the `--convert-legacy` migration.

`@hexagram/core` also exposes `cryptoRandom()` at `@hexagram/core/crypto-random` — a `[0, 1)` float helper backed by `node:crypto.randomInt`. It's the production RNG behind the home banner's `<AnimatedBanner>` animation, replacing `Math.random` so no flow in the app depends on V8's pseudorandom generator.

Both CLIs capture the eighteen stalk divisions (3 per line × 6 lines) as a `CastingRecord` (`@hexagram/core/types`) — each `SplitRecord` pairs the index parted at (`pick`) with that round's recorded ceiling (`recordedMax`). The per-line `splits` ride along on the generator's `LineGeneratorResult`. Output mode is decided by `resolveOutputMode()` in `cli/casting-ui/src/utils-mode.ts`:

> **Invariant — the pick never empties the right heap.** `SplitRecord.recordedMax` is the _recorded_ max (`stalks − 1`, reserving the suspended stalk 掛一), **not** the selectable ceiling. Any flow that lets a user (or RNG) choose a `pick` MUST clamp it to `selectablePickMax(recordedMax)` = `recordedMax − 1` (`@hexagram/core/casting-derivation`) so the right heap keeps a countable stalk after suspension and its division-by-four remainder stays 1..4, never 0. `performCast` enforces this at runtime via `assertSelectablePick`; never hand-roll the `− 1`, and never offer `recordedMax` as a pick. See [ADR-0006](adr/0006-casting-algorithm-rewindable-core-and-randomness.md) and `docs/agents/casting-invariants.md`.

- **Ink viewer (default)** — a full-screen tabbed viewer (`cli/casting-ui/src/viewer.tsx`) with up to four tabs (Casting / Transformation / Standing Hexagram / Emerging Hexagram), opening on Casting, query pinned above and the saved-file path pinned below. Built on [Ink](https://github.com/vadimdemedes/ink); `runConsultationViewer({ flowKind, inputMode, maxWrapWidth, sliderSweepMs, sliderCommitRevealMs })` renders it on the alternate screen.

  The viewer owns a state machine (`cli/casting-ui/src/viewer-flow.ts`): `awaitingQuery → casting → computing → done`. On entry the query box is editable (an in-tab `<QueryEditor>`) and the Casting table is empty (`·` placeholder cells). Once the query is submitted:
  - **`flowKind: 'interactive'`** — a bordered `<CastingPromptBox>` (in `cli/casting-ui/src/casting-prompt-box.tsx`, with sibling input widgets `query-editor.tsx`, `number-input.tsx`, and shared primitives in `editor-primitives.tsx`) appears above the footer for each of the 18 splits in turn. The prompt's input widget is selected by `inputMode` (resolved from `--numeric-input` via `resolveInputMode()` in `cli/casting-ui/src/utils-mode.ts`):
    - **`inputMode: 'slider'`** (default) — a bouncing-slider cursor sweeps left↔right across the reachable-pick bar (1 cell = 1 value); the user presses **SPACE** to lock the current value as the `SplitRecord`. The reachable pick ceiling is one below the recorded `SplitRecord.recordedMax` (the viewer's `reachablePickMax = currentMax - 1`): `recordedMax` already reserves the right heap's suspended stalk (掛一), and reserving a second, countable stalk keeps its division-by-four remainder in 1..4 — never 0 (a heap divisible by four counts its last group as the remainder). The full `recordedMax` is unchanged; the true stalk count rides along as the prompt's `stalksTotal`. The random and plain/typed Inquirer flows cap the pick the same way, matching the manual flow's `[1, recordedMax-1]` derived-split range. The per-cast tickMs is derived from `--slider-sweep-ms` so each end-to-end sweep takes roughly the same time regardless of the cast's stalk count. The title line reads verbatim `"Line N/6 · Cast C/3: — Press SPACE to part the stalks"`; bar and `Stalks: N | Left Heap: <glyph> | Right Heap: <glyph>` readout are both centred and stay anchored as the cursor moves, separated by blank spacer rows above and below the bar. The two Braille spinners counter-rotate (left clockwise, right anticlockwise) so the user sees lively motion without ever seeing the cursor's numeric value. On SPACE the cursor freezes on the chosen cell, the readout swaps the two spinner glyphs for the concrete `Left Heap: <pick> | Right Heap: <stalksTotal − 1 − pick>` (the `− 1` is the suspended stalk shown as the trailing `+ 1 suspended`; with the pick capped this is always ≥ 1), and the viewer auto-advances to the next cast after `SLIDER_COMMIT_REVEAL_MS` (≈1 s, set in `casting-prompt-box.tsx`; tests opt out by passing `0` via the viewer's `sliderCommitRevealMs` prop). The 18th cast (line 6 / cast 3) reveals the same way before the viewer transitions to `computing`. The casting prompt box is wrapped at the terminal's `innerCols` and never reflows — on narrow terminals (e.g. `--wrap-width 40`), `<` / `>` pans the prompt box horizontally. During casting (all flows — random, interactive, manual), ↑/↓/PgUp/PgDn/g/G scroll the Casting tab table vertically: the `CAN_SCROLL` keymap predicate in `cli/viewer-core/src/viewer-keymap.ts` shares the vertical-scroll bindings between the in-flight `casting` table and the unlocked `done` readout, so the table stays reachable when the prompt box occupies the lower rows; additionally, during casting the table **auto-follows** the line being cast — the viewer passes `autoScrollTarget` (the cast-1 content row from `castingTableFollowRow(lineIndex)`, exported by `@hexagram/text-grid/scroll-geometry`) to the readout, which pins that row near the bottom of the table viewport via a render-phase guard. `castingTableFollowRow` anchors the **just-completed** line (`lineIndex − 1`, clamped to line 1 at the bottom) rather than the active line: the third cast fills its cell and advances the line pointer in the same update, so pinning the new active line would scroll the just-filled result off before it is seen — anchoring the previous line keeps it on screen through the transition (the underlying `castingTableActiveRow(lineIndex)` primitive still exists). It re-pins once per distinct row (so the pin only moves on alternate line transitions) and yields to manual scrolling within a line. The bottom-align math lives in `cli/readout/src/auto-scroll-offset.ts` (`computeAutoScrollOffset`).
    - **`inputMode: 'number'`** — the legacy typed-`<NumberInput>` prompt; Enter commits, out-of-range values are rejected with an inline error.

    Each commit advances the per-line `makeLineGenerator` and fills the matching cell in the table. While casting is in flight, all non-Casting tabs are locked and rendered with `dimColor`; only Escape and Ctrl+C exit.

  - **`flowKind: 'random'`** — the viewer transitions straight to `computing`; `generateRandomConsultation()` runs inside the compute effect to produce the hexagram + casting, no in-tab prompts are ever shown (so `inputMode` is moot for random).

  - **`flowKind: 'manual'`** — a sibling `<CastingPromptBox>` branch (`ManualCastingPrompt` in `manual-prompt.tsx`, dispatched from `casting-prompt-box.tsx`) for users who cast with physical yarrow stalks. Per cast the user transcribes FOUR numbers — both heaps' piles-of-4 and remainders (`pilesL`, `remL`, `pilesR`, `remR`) — and the split is derived from the LEFT heap (`pick = 4·pilesL + remL`) with the right side as a cross-check. The validator runs four invariants in priority order — the first failing check wins (`validateManualSplit` in `@hexagram/core/manual-validation`): **incomplete** (any field empty → neutral SPLIT placeholder); **zero-remainder** (any `remL`/`remR` is 0 → RED strip text with the never-zero hint, since a heap divisible by 4 yields remainder 4, not 0; checked before conservation because `pR=N+1, rR=0` is conservation-equivalent to `pR=N, rR=4` and would otherwise pass the sum check undetected); **conservation** (`4·pilesL + remL + 4·pilesR + remR + 1 ≠ unpartedStalks` → surfaced as the RED `MISSING STALKS` gauge in the flow diagram, never as strip text); **suspended sum** (`1 + remL + remR` must be in `{5, 9}` for cast 1 or `{4, 8}` for casts 2/3 → RED strip text with hint about removing the last group of 4). While editing, the bottom strip is blank (the live count lives in the `MISSING STALKS` gauge) and shows `Press Enter to commit` once fully valid; on commit it swaps to BOLD_GREEN `→ next cast: N unparted` (the per-card totals are already visible in the diagram itself). On terminals wider than the prompt's natural body width (diagram + gap + right pane, `MANUAL_NATURAL_BODY_WIDTH`), the body block and title centre horizontally within the box as one rigid unit; below that width they left-align and the existing `<` / `>` pan reaches the right edge — mirroring the interactive prompt, whose bar and readout are likewise centred. Tab cycles forward (`pilesL → remL → pilesR → remR → pilesL`); Shift+Tab cycles backward; Enter commits when valid, and a second Enter during the green dwell skips immediately to the next cast. The resolved-row dwell is `MANUAL_REVEAL_MS` (=2500 ms, set in `manual-prompt.tsx`; tunable via `--manual-reveal-ms <n>` or `manualRevealMs={0}` in tests). The component advances the per-line algorithm through the same flow reducer (`splitCommitted` → `performCast`) the interactive flow uses and saves identically (Spec § "No provenance field" — there is a Phase 7 byte-identity test in `cli/casting-ui/tests/viewer.test.tsx` that drives the same 18-pick sequence through both flows and asserts the captured `saveConsultationFile` args are equal). `Ctrl+R` rewinds the most-recent completed line (mid-line: wipes the current line; post-line-completion: drops back to the just-completed line). This is a two-line lookback window — the `lineRewound` reducer action is the single source of truth (it resets both the slot pointer and the per-line `LineState` in one pure dispatch; there is no separate hook). The manual flow is Ink-only: the standalone `hexagram-manual` bin refuses non-TTY (NO_COLOR=1 / CI=true / piped stdout) with the same stderr-and-exit-1 guard as `hexagram-history`. No `--plain`, no `--numeric-input`, no slider knobs.

  The footer's progress hint during casting reads `"Casting in progress ·  ■■■□□□□□□□□□□□□□□□  N/18"` (`renderProgressBar()` in `cli/viewer-core/src/viewer-layout.ts`), where `N` is the number of committed splits.

  After both flows reach `done`, the viewer's compute effect saves the file via `saveConsultationFile()`, the tabs unlock, and the existing chrome (Tab cycling, scroll, pan, saved-path footer) re-enables. Content hard-wraps at `--wrap-width <n>` columns (default 120, via `resolveWrapWidth()` in `cli/casting-ui/src/utils-mode.ts`) — capped to the terminal width on narrower terminals, and floored so the fixed-width diagrams are never broken; the remainder is reachable by horizontal scrolling with `<` / `>`.

- **Plain (`--plain` / `--no-ui`, or any non-TTY stdout)** — keeps the classic Inquirer-driven terminal flow. `getHexagramViaInteraction()` / `generateRandomConsultation()` collect the data, then `logAndSaveConsultationOutput()` prints the formatted reading. `--wrap-width` and `--numeric-input` have no effect here (the slider is a viewer-only feature; plain mode is always typed).

Either way the reading is saved as a timestamped `.md` file under `consultations/`. Content generation is split from rendering: `buildConsultationSections()` in `cli/readout/src/output-composers.ts` produces the per-tab strings, `castingSection()` in `domain/consultation-view/src/build-view.ts` accepts a `PartialCastingRecord` so the same renderer is reused while the table is being filled in (`·` placeholders for null cells), and `consultationConsoleOutput()` (in `cli/casting-ui/src/output-composers.ts`) composes the plain output from the same `@hexagram/readout` section builders. The `--plain` stdout output is locked byte-for-byte by fixtures in `cli/casting-ui/tests/fixtures/`. The `.md` save output (frontmatter + body) is locked separately by fixtures in `cli/text-grid/tests/fixtures/`. Regenerate both sets together with `pnpm generate-fixtures` after intentionally changing a section builder (driven by the shared cases in `cli/text-grid/tests/fixtures/cases.ts`).

### Consultation file format — `@hexagram/consultation-file`

`@hexagram/consultation-file` owns the canonical YAML envelope; the Markdown body is rendered by `@hexagram/text-grid` (`markdownConsultationBody`) and injected into `saveConsultationFile` as an opaque string — the package does not depend on `@hexagram/consultation-view`. Every saved consultation is a Markdown file with a YAML frontmatter envelope. The frontmatter is the canonical model — six fields, of which exactly one of `casting` / `castingAbsence` is present:

- `schemaVersion: 1` (strict-equal on load; mismatch surfaces row as `[unreadable]` in `hexagram-history`)
- `timestamp` (ISO 8601 with offset, e.g. `2026-05-19T14:23:11+0800`)
- `query` (YAML `|` block scalar for multi-line)
- `hexagram` (mapping keyed `L6..L1` — visual top-first, like `casting`; a converter inverts to/from the bottom-first `Hexagram` tuple at the package boundary)
- `casting` (mapping keyed `L6..L1` — visual top-first; a converter inverts to/from the bottom-first `CastingRecord` tuple at the package boundary; absent — no key — when there is no recorded casting)
- `castingAbsence` (present iff `casting` is absent — `legacy-no-table` / `legacy-unreplayable` / `playground`, recording why; see ADR-0008)

The Markdown body below the frontmatter is **decorative**: re-rendered from the envelope by `markdownConsultationBody` (from `@hexagram/text-grid`) on every load. On open, the history flow byte-compares the freshly-rendered body against disk and rewrites if they differ (so renderer upgrades self-heal old files). Derived data — hex name, emerging hex, scripture/exegesis text, translations — is never persisted; it's recomputed via `@hexagram/core/getters` every render.

Filename: `consultation-<timestamp>.md`, under `<repo-root>/consultations/` for the bins (`dir` is threaded explicitly; `<cwd>/consultations/` is only the library default when `dir` is omitted). Saving is `saveConsultationFile({ query, hexagram, casting, body })`; loading is `loadConsultationFile(filePath)`. Both are exported from `@hexagram/consultation-file/file`. The `body` string is produced by `markdownConsultationBody` from `@hexagram/text-grid` and passed in by the caller — `consultation-file` treats it as opaque.

Legacy `.txt` files (pre-Markdown era) are migrated by `pnpm hexagram-history --convert-legacy`, which parses each `.txt` via `convertLegacyTxt`, writes the corresponding `.md`, and moves the original into `consultations/legacy/`. The migration handles both **Shape A** (recent format with CASTING table — full casting recovered) and **Shape B** (older format without CASTING — sets `casting: null`, `castingAbsence: legacy-no-table`). `consultations/legacy/` is never scanned by `hexagram-history`. A `casting: null` envelope arises from THREE origins — a legacy Shape-B conversion, a Shape-A table that fails replay-validation, and a Playground save (the playground writes a hexagram with `casting: null`) — now distinguished by the compulsory `castingAbsence` reason field (`legacy-no-table` / `legacy-unreplayable` / `playground`, respectively; see ADR-0008). All three are history-browsable rows that render a reason-aware "Casting not recorded (<reason>)" notice.

### History browser — `@hexagram/history-ui`

`hexagram-history` mounts an Ink list of `consultations/*.md` (newest-first by frontmatter timestamp).

Two-line rows: `[YYYY-MM-DD HH:mm] <truncated query>` + indented `#<wenwang> <chinese> <english>` (with `──▶ #<emerging>` suffix when moving lines exist).

A long list windows in place against a full-height 1-column `<ScrollbarTrack>` gutter (no "… N more" text indicator). Because each consultation is two display lines, the scrollbar geometry is passed in display-line units (`offset`/`totalRows` ×2, `viewportHeight` = `contentHeight`) so the track spans the entire list area; windowing and the footer position counter stay in consultation units.

Controls: `↑/↓` row nav (wraps around the list edges — ↑ at the top jumps to the last row; ↓ at the bottom jumps to the first), `PgUp/PgDn` page nav (clamped), `g/G` first/last, Enter to load, `/` to live-filter on case-insensitive query substring, `Ctrl+D` to delete the focused row (gated by a Y/N confirmation modal — confirming runs a permanent `fs.unlink`), ESC to clear filter or exit.

Pressing Enter loads the file, re-renders the body, byte-compares with disk, and rewrites if drifted (with a `_Body refreshed; data unchanged._` notice). Pressing ESC in the loaded readout returns to the list with focus restored to the consultation just viewed. Ink-only: in non-TTY contexts (`NO_COLOR=1`, `CI=true`, or piped stdout), the bin exits with `"hexagram-history requires an interactive terminal"` and code 1.

### Data model — `domain/core/src/models/`

All 64 hexagram and 8 trigram records are defined in TypeScript and also serialised to `hexagrams.json` / `trigrams.json` (generated artifacts only; no source imports them — runtime code, e.g. `getters.ts`, imports the TypeScript records). Run `pnpm generate-json-files` to sync the JSON after changing the TypeScript sources.

**Key lookup types** (`domain/core/src/models/foundation.ts`):

- `HexagramKey` — `H111111`–`H222222` where `1`=yang, `2`=yin (6 digits, bottom line first)
- `WenWangOrder` — canonical 1–64 numbering
- `FuxiOrder` — alternate binary ordering

**Record structure** (`domain/core/src/models/hexagram.ts`):

```
GenericHexagramRecord {
  Key, Name, Metadata, Text
  Text.Chinese.{Traditional, Simplified}.{Scripture, Exegesis}
  Text.English.{WilhelmBaynes, Legge}.{Scripture, Exegesis}
}
```

Lookup entrypoint: `getHexagramRecord(hexagram: Hexagram)` in `domain/core/src/getters.ts` — converts a `[Line, Line, Line, Line, Line, Line]` to a `HexagramKey` then returns the matching record. Reachable from outside the workspace at `@hexagram/core/getters`.

### Build

Each package has its own `tsdown.config.ts`. Turborepo's `^build` dependency ensures `@hexagram/core` + `@hexagram/text-layout` → `@hexagram/consultation-file` + `@hexagram/consultation-view` → `@hexagram/viewer-core` + `@hexagram/text-grid` → `@hexagram/readout` → `@hexagram/casting-ui` + `@hexagram/history-ui` + `@hexagram/playground-ui` → `@hexagram/shell` → `@hexagram/cli` build in topological order. tsdown emits `.mjs` (ESM) and `.d.mts` (TypeScript declarations); the `package.json#exports` map points at those paths.

- `domain/core/tsdown.config.ts` — eleven entries: `index`, `casting-derivation`, `crypto-random`, `getters`, `line-semantics`, `manual-validation`, `hexagrams`, `random-casting`, `sample-casting`, `trigrams`, `types` (one per exported subpath; `types` is the domain vocabulary; the `hexagrams`/`trigrams` entries ship from `src/models/` but are exported at the top-level subpath).
- `domain/consultation-file/tsdown.config.ts` — three entries: `frontmatter`, `file`, `legacy-converter` (matching the exported subpaths).
- `cli/viewer-core/tsdown.config.ts` — single `./src/index.ts` entry.
- `cli/readout/tsdown.config.ts` — single `./src/index.ts` entry (the `ConsultationReadout` component + the per-section string builders).
- `cli/text-grid/tsdown.config.ts` — five entries: `diagram-template`, `geometry`, `ledger-template`, `markdown`, `scroll-geometry` (no barrel index; each subpath is a direct concrete module).
- `cli/casting-ui/tsdown.config.ts` — single `./src/index.ts` entry.
- `cli/history-ui/tsdown.config.ts` — single `./src/index.ts` entry.
- `apps/cli/tsdown.config.ts` — six entries (`hexagram`, `interactive`, `random`, `manual`, `history`, `playground`) matching the six `bin` map entries.

### Linting

Two-layer lint at the workspace root: oxlint (fast, most rules) runs first, then eslint (`@sxzz/eslint-config`) for rules oxlint doesn't cover. Use `oxlint-disable-next-line` for oxlint suppressions and `eslint-disable-next-line` for eslint-only rules. Config files at root: `.oxlintrc.json` and `eslint.config.js`. Format with `.oxfmtrc.json`.
