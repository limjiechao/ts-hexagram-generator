# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a **Turborepo + pnpm-workspaces monorepo**. The root is private; published packages live under `packages/*` and CLI bins under `apps/*`.

```
ts-hexagram-generator/         # workspace root (private)
├── packages/
│   ├── types/                 # @hexagram/types — public type defs + assertions
│   ├── core/                  # @hexagram/core — algorithm, random, getters, hexagram/trigram records
│   ├── consultation-file/     # @hexagram/consultation-file — file format (Markdown + YAML frontmatter), renderers, legacy converter
│   ├── casting-ui/            # @hexagram/casting-ui — Ink casting viewer, Inquirer flow, ANSI section renderers
│   └── history-ui/            # @hexagram/history-ui — Ink history browser
└── apps/
    └── cli/                   # @hexagram/bin (private) — hexagram + hexagram-random + hexagram-interactive + hexagram-history bins
```

Library packages publish via `package.json#exports` only (no `main`/`module`/`types`). Each entry carries `source` / `types` / `import` conditions: `source` (`./src/index.ts`) for `tsx`/`vitest` no-build dev, `types` (`./dist/*.d.mts`) and `import` (`./dist/*.mjs`) for consumers.

## Commands

All commands run from the worktree root unless noted. Most fan out across packages via Turborepo.

```bash
pnpm install            # install + link the workspace packages
pnpm build              # turbo run build (tsdown per package, topological order)
pnpm test               # turbo run test (vitest per package)
pnpm type:check         # turbo run type:check (tsc --noEmit per package)
pnpm lint:check         # oxlint + eslint at root (walks the whole tree)
pnpm lint:fix           # same with auto-fix
pnpm format:check       # oxfmt --check at root
pnpm format:fix         # oxfmt --write at root

# Run the CLIs directly (no build needed — tsx + the `source` exports condition)
pnpm hexagram-random        # tsx apps/cli/src/random.ts
pnpm hexagram-interactive   # tsx apps/cli/src/interactive.ts
pnpm hexagram-history                   # tsx apps/cli/src/history.ts (Ink-only browser for past consultations)
pnpm hexagram-history --convert-legacy  # one-shot migration of legacy .txt → .md

# hexagram-random and hexagram-interactive default to a full-screen tabbed viewer;
# append `-- --plain` (or `-- --no-ui`) for the classic scrolling console output.
# `-- --wrap-width <n>` caps the viewer's content wrap width (default 120).
# `-- --numeric-input` switches the interactive casting prompt from the
# default bouncing slider back to the legacy typed-number input.
# `-- --slider-sweep-ms <n>` sets the constant end-to-end sweep duration
# (in ms) for the bouncing slider; per-cast tickMs is derived as
# `sweepMs / max(1, max - min)` and clamped to [30, 250] ms (default 1800).
# The slider is also force-overridden to typed input when `NO_COLOR=1` or
# `CI=true` is set, so screen-reader and automation environments don't get
# stuck watching a moving cursor (non-TTY stdout already routes to plain).
# hexagram-history does NOT have a --plain mode — it is Ink-only and exits
# with an error message and code 1 in non-TTY contexts.

# Per-package operations (use --filter for a single package)
pnpm --filter @hexagram/core test
pnpm --filter @hexagram/casting-ui build
pnpm --filter @hexagram/types type:check

# Regenerate JSON data files after changing hexagram/trigram TypeScript sources
pnpm generate-json-files    # turbo run generate-json-files --filter=@hexagram/core

# Regenerate the plain-output test fixtures after changing a section builder
pnpm generate-fixtures      # turbo run generate-fixtures --filter=@hexagram/casting-ui
```

The statistical distribution test (`generateLines() should return valid report` in `packages/core/tests/random.test.ts`) runs 1,000,000 iterations and has a 40-second timeout — it is slow by design and runs on every `pnpm test` invocation. Factor this in when wiring CI: a default Vitest run will spend ~30 s in this one test. To skip it locally, use `pnpm --filter @hexagram/core test -- --exclude tests/random.test.ts` (or `pnpm --filter @hexagram/core test -- -t '^(?!rng distribution \(slow\))'` to drop only the slow describe block).

### CI simulation

The May 2026 9-round stabilisation (`4eae942` → `800d3fc`) showed that the "load-induced" tier of flakes (rounds 4–6) is invisible on a quiet macOS dev box. Three scripts reproduce the 2-CPU contention an Ubuntu GHA runner sees:

```bash
pnpm test:flake          # 5× chained `turbo run test --force` (whole suite re-runs end-to-end)
pnpm test:stress         # 4× concurrent test:flake (saturates CPU; the strongest signal)
pnpm test:stress:once    # 4× concurrent single-pass test (cheaper)
```

Reach for them before pushing a race-condition fix, before merging an Ink component change, or when triaging an intermittent CI failure. On a quiet box `test:stress` can take 5–10 minutes; `test:stress:once` is closer to 2–3 minutes. All three use the `concurrently` runner — pure JS, no Docker or platform-specific binaries.

## Architecture

### Core algorithm — `@hexagram/core`

`packages/core/src/index.ts` models the traditional yarrow stalk divination procedure. The four operations (四營) are implemented as a pure function pipeline:

```
partTheStalks → suspendOneFromTheRight → sortLeftAndRightIntoFours → setAsideRemainderFromSortedLeftAndRight
```

`makeLineGenerator` is a synchronous generator that runs this pipeline three times (三變成爻) and yields a `FourOperationsResult` after each round, receiving the next `partStalksAtIndex` via `generator.next(index)`. After all three rounds, it returns a `Line` (6 | 7 | 8 | 9). `packages/core/src/index.ts` exposes the runtime algorithm (`makeLineGenerator`, `stalksBeforeParting`, etc.); types like `Line`, `Hexagram`, and `CastingRecord` are imported directly from `@hexagram/types`.

**Line semantics:**

- `7` = young yang (solid, static)
- `8` = young yin (broken, static)
- `6` = old yin / moving yin (broken, changes to yang)
- `9` = old yang / moving yang (solid, changes to yin)

Lines 6 and 9 are "moving lines". The emerging hexagram is obtained by flipping them: 6→7, 9→8.

### Random vs. interactive

- **`packages/core/src/random-casting.ts`** — drives `makeLineGenerator` with `node:crypto.randomInt` splits; exports `generateRandomHexagram()` and `generateRandomHexagrams()` for use as a library, plus `generateRandomConsultation()` which also returns the casting record. Pure library code — no CLI entry.
- **`packages/casting-ui/src/interactive-flow.ts`** — same generator wired to `@inquirer/prompts` for the plain-mode terminal flow (`getHexagramViaInteraction`, `getOneLineViaInteraction`).
- **`apps/cli/src/{random,interactive}.ts`** — the two bin entries. Each is a shebang + `main()` + top-level await, importing `generateRandomConsultation` from `@hexagram/core/random-casting` and the viewer + output helpers from `@hexagram/casting-ui`.

`@hexagram/core` also exposes `cryptoRandom()` at `@hexagram/core/crypto-random` — a `[0, 1)` float helper backed by `node:crypto.randomInt`. It's the production RNG behind the home banner's `<AnimatedBanner>` animation, replacing `Math.random` so no flow in the app depends on V8's pseudorandom generator.

Both CLIs capture the eighteen stalk divisions (3 per line × 6 lines) as a `CastingRecord` (`@hexagram/types`) — each `SplitRecord` pairs the index parted at (`pick`) with that round's selectable range (`max`). The per-line `splits` ride along on the generator's `LineGeneratorResult`. Output mode is decided by `resolveOutputMode()` in `packages/casting-ui/src/utils-mode.ts`:

- **Ink viewer (default)** — a full-screen tabbed viewer (`packages/casting-ui/src/viewer.tsx`) with up to four tabs (Casting / Transformation / Standing Hexagram / Emerging Hexagram), opening on Casting, query pinned above and the saved-file path pinned below. Built on [Ink](https://github.com/vadimdemedes/ink); `runConsultationViewer({ flowKind, inputMode, maxWrapWidth, sliderSweepMs, sliderCommitRevealMs })` renders it on the alternate screen.

  The viewer owns a state machine (`packages/casting-ui/src/viewer-flow.ts`): `awaitingQuery → casting → computing → done`. On entry the query box is editable (an in-tab `<QueryEditor>`) and the Casting table is empty (`·` placeholder cells). Once the query is submitted:
  - **`flowKind: 'interactive'`** — a bordered `<CastingPromptBox>` (in `packages/casting-ui/src/casting-prompt-box.tsx`, with sibling input widgets `query-editor.tsx`, `number-input.tsx`, and shared primitives in `editor-primitives.tsx`) appears above the footer for each of the 18 splits in turn. The prompt's input widget is selected by `inputMode` (resolved from `--numeric-input` via `resolveInputMode()` in `packages/casting-ui/src/utils-mode.ts`):
    - **`inputMode: 'slider'`** (default) — a bouncing-slider cursor sweeps left↔right across a `max - min + 1` cell bar (1 cell = 1 value); the user presses **SPACE** to lock the current value as the `SplitRecord`. The per-cast tickMs is derived from `--slider-sweep-ms` so each end-to-end sweep takes roughly the same time regardless of the cast's stalk count. The title line reads verbatim `"Line N/6 · Cast C/3: — Press SPACE to part the stalks"`; bar and `Stalks: N | Left Heap: <glyph> | Right Heap: <glyph>` readout are both centred and stay anchored as the cursor moves, separated by blank spacer rows above and below the bar. The two Braille spinners counter-rotate (left clockwise, right anticlockwise) so the user sees lively motion without ever seeing the cursor's numeric value. On SPACE the cursor freezes on the chosen cell, the readout swaps the two spinner glyphs for the concrete `Left Heap: <pick> | Right Heap: <max − pick>`, and the viewer auto-advances to the next cast after `SLIDER_COMMIT_REVEAL_MS` (≈1 s, set in `casting-prompt-box.tsx`; tests opt out by passing `0` via the viewer's `sliderCommitRevealMs` prop). The 18th cast (line 6 / cast 3) reveals the same way before the viewer transitions to `computing`. The casting prompt box is wrapped at the terminal's `innerCols` and never reflows — on narrow terminals (e.g. `--wrap-width 40`), ←/→ pans the prompt box horizontally; ↑/↓/PgUp/PgDn/g/G remain no-ops during the flow.
    - **`inputMode: 'number'`** — the legacy typed-`<NumberInput>` prompt; Enter commits, out-of-range values are rejected with an inline error.

    Each commit advances the per-line `makeLineGenerator` and fills the matching cell in the table. While casting is in flight, all non-Casting tabs are locked and rendered with `dimColor`; only Escape and Ctrl+C exit.

  - **`flowKind: 'random'`** — the viewer transitions straight to `computing`; `generateRandomConsultation()` runs inside the compute effect to produce the hexagram + casting, no in-tab prompts are ever shown (so `inputMode` is moot for random).

  The footer's progress hint during casting reads `"Casting in progress ·  ■■■□□□□□□□□□□□□□□□  N/18"` (`renderProgressBar()` in `packages/casting-ui/src/viewer-layout.ts`), where `N` is the number of committed splits.

  After both flows reach `done`, the file is saved via `consultationFileOutput()`, the tabs unlock, and the existing chrome (Tab cycling, scroll, pan, saved-path footer) re-enables. Content hard-wraps at `--wrap-width <n>` columns (default 120, via `resolveWrapWidth()` in `packages/casting-ui/src/utils-mode.ts`) — capped to the terminal width on narrower terminals, and floored so the fixed-width diagrams are never broken; the remainder is reachable by horizontal scrolling.

- **Plain (`--plain` / `--no-ui`, or any non-TTY stdout)** — keeps the classic Inquirer-driven terminal flow. `getHexagramViaInteraction()` / `generateRandomConsultation()` collect the data, then `logAndSaveConsultationOutput()` prints the formatted reading. `--wrap-width` and `--numeric-input` have no effect here (the slider is a viewer-only feature; plain mode is always typed).

Either way the reading is saved as a timestamped `.md` file under `consultations/`. Content generation is split from rendering: `buildConsultationSections()` in `packages/casting-ui/src/output-composers.ts` produces the per-tab strings, `castingSection()` in `packages/casting-ui/src/output-sections.ts` accepts a `PartialCastingRecord` so the same renderer is reused while the table is being filled in (`·` placeholders for null cells), and `consultationConsoleOutput()` composes the plain output from the same section builders. The `--plain` stdout output is locked byte-for-byte by fixtures in `packages/casting-ui/tests/fixtures/`. The `.md` save output (frontmatter + body) is locked separately by fixtures in `packages/consultation-file/tests/fixtures/`. Regenerate both sets together with `pnpm generate-fixtures` after intentionally changing a section builder (driven by the shared cases in `packages/casting-ui/tests/fixtures/cases.ts`).

### Consultation file format — `@hexagram/consultation-file`

Every saved consultation is a Markdown file with a YAML frontmatter envelope. The frontmatter is the canonical model — five fields:

- `schemaVersion: 1` (strict-equal on load; mismatch surfaces row as `[unreadable]` in `hexagram-history`)
- `timestamp` (ISO 8601 with offset, e.g. `2026-05-19T14:23:11+0800`)
- `query` (YAML `|` block scalar for multi-line)
- `hexagram` (flat 6-element array, bottom-first — matches the in-memory `Hexagram` tuple)
- `casting` (mapping keyed `L6..L1` — visual top-first; a converter inverts to/from the bottom-first `CastingRecord` tuple at the package boundary)

The Markdown body below the frontmatter is **decorative**: re-rendered from the envelope by `markdownConsultationBody` on every load. On open, the history flow byte-compares the freshly-rendered body against disk and rewrites if they differ (so renderer upgrades self-heal old files). Derived data — hex name, emerging hex, scripture/exegesis text, translations — is never persisted; it's recomputed via `@hexagram/core/getters` every render.

Filename: `consultation-<timestamp>.md`, under `<cwd>/consultations/`. Saving is `saveConsultationFile({ query, hexagram, casting })`; loading is `loadConsultationFile(filePath)`. Both are exported from `@hexagram/consultation-file/file`.

Legacy `.txt` files (pre-Markdown era) are migrated by `pnpm hexagram-history --convert-legacy`, which parses each `.txt` via `convertLegacyTxt`, writes the corresponding `.md`, and moves the original into `consultations/legacy/`. The migration handles both **Shape A** (recent format with CASTING table — full casting recovered) and **Shape B** (older format without CASTING — synthesizes sentinel casting, marks `castingRecovered: false`). `consultations/legacy/` is never scanned by `hexagram-history`.

### History browser — `@hexagram/history-ui`

`hexagram-history` mounts an Ink list of `consultations/*.md` (newest-first by frontmatter timestamp).

Two-line rows: `[YYYY-MM-DD HH:mm] <truncated query>` + indented `#<wenwang> <chinese> <english>` (with `──▶ #<emerging>` suffix when moving lines exist).

A long list windows in place against a full-height 1-column `<ScrollbarTrack>` gutter (no "… N more" text indicator). Because each consultation is two display lines, the scrollbar geometry is passed in display-line units (`offset`/`totalRows` ×2, `viewportHeight` = `contentHeight`) so the track spans the entire list area; windowing and the footer position counter stay in consultation units.

Controls: `↑/↓` row nav (wraps around the list edges — ↑ at the top jumps to the last row; ↓ at the bottom jumps to the first), `PgUp/PgDn` page nav (clamped), `g/G` first/last, Enter to load, `/` to live-filter on case-insensitive query substring, `Ctrl+D` to delete the focused row (gated by a Y/N confirmation modal — confirming runs a permanent `fs.unlink`), ESC to clear filter or exit.

Pressing Enter loads the file, re-renders the body, byte-compares with disk, and rewrites if drifted (with a `_Body refreshed; data unchanged._` notice). Pressing ESC in the loaded readout returns to the list with focus restored to the consultation just viewed. Ink-only: in non-TTY contexts (`NO_COLOR=1`, `CI=true`, or piped stdout), the bin exits with `"hexagram-history requires an interactive terminal"` and code 1.

### Data model — `packages/core/src/models/`

All 64 hexagram and 8 trigram records are defined in TypeScript and also serialised to `hexagrams.json` / `trigrams.json` (used at runtime via `resolveJsonModule`). Run `pnpm generate-json-files` to sync the JSON after changing the TypeScript sources.

**Key lookup types** (`packages/core/src/models/foundation.ts`):

- `HexagramKey` — `H111111`–`H222222` where `1`=yang, `2`=yin (6 digits, bottom line first)
- `WenWangOrder` — canonical 1–64 numbering
- `FuxiOrder` — alternate binary ordering

**Record structure** (`packages/core/src/models/hexagram.ts`):

```
GenericHexagramRecord {
  Key, Name, Metadata, Text
  Text.Chinese.{Traditional, Simplified}.{Scripture, Exegesis}
  Text.English.{WilhelmBaynes, Legge}.{Scripture, Exegesis}
}
```

Lookup entrypoint: `getHexagramRecord(hexagram: Hexagram)` in `packages/core/src/getters.ts` — converts a `[Line, Line, Line, Line, Line, Line]` to a `HexagramKey` then returns the matching record. Reachable from outside the workspace at `@hexagram/core/getters`.

### Build

Each package has its own `tsdown.config.ts`. Turborepo's `^build` dependency ensures `@hexagram/types` → `@hexagram/core` → `@hexagram/consultation-file` → `@hexagram/casting-ui` + `@hexagram/history-ui` → `@hexagram/shell` → `@hexagram/bin` build in topological order. tsdown emits `.mjs` (ESM) and `.d.mts` (TypeScript declarations); the `package.json#exports` map points at those paths.

- `packages/types/tsdown.config.ts` — single `./src/index.ts` entry.
- `packages/core/tsdown.config.ts` — six entries: `index`, `random-casting`, `crypto-random`, `getters`, `hexagrams`, `trigrams` (one per exported subpath; the latter two ship from `src/models/` but are exported at the top-level subpath).
- `packages/consultation-file/tsdown.config.ts` — multiple entries: `index`, `file`, `markdown`, `legacy` (matching the exported subpaths).
- `packages/casting-ui/tsdown.config.ts` — single `./src/index.ts` entry (the public surface re-exports everything consumers need).
- `packages/history-ui/tsdown.config.ts` — single `./src/index.ts` entry.
- `apps/cli/tsdown.config.ts` — four entries (`hexagram`, `interactive`, `random`, `history`) matching the four `bin` map entries.

### Linting

Two-layer lint at the workspace root: oxlint (fast, most rules) runs first, then eslint (`@sxzz/eslint-config`) for rules oxlint doesn't cover. Use `oxlint-disable-next-line` for oxlint suppressions and `eslint-disable-next-line` for eslint-only rules. Config files at root: `.oxlintrc.json` and `eslint.config.js`. Format with `.oxfmtrc.json`.
