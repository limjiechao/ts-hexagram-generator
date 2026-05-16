# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm build              # Build with tsdown → dist/
pnpm dev                # Build in watch mode
pnpm test               # Run all Vitest tests
pnpm test -- random     # Run a single test file by name fragment
pnpm type:check         # TypeScript type-check without emitting
pnpm lint:check         # oxlint + eslint (read-only)
pnpm lint:fix           # oxlint + eslint with auto-fix
pnpm format:check       # oxfmt check
pnpm format:fix         # oxfmt write

# Run the CLIs directly without building
pnpm hexagram-random        # Random hexagram (via tsx)
pnpm hexagram-interactive   # Interactive hexagram (via tsx)

# Both CLIs default to a full-screen tabbed viewer; append `-- --plain`
# (or `-- --no-ui`) for the classic scrolling console output.
# `-- --wrap-width <n>` caps the viewer's content wrap width (default 120)
# `-- --numeric-input` switches the interactive casting prompt from the
# default bouncing slider back to the legacy typed-number input.
# The slider also auto-falls-back to typed input when `NO_COLOR=1` or
# `CI=true` is set, so screen-reader and automation environments don't get
# stuck watching a moving cursor (non-TTY stdout already routes to plain).

# Regenerate JSON data files after changing hexagram/trigram TypeScript sources
pnpm generate-json-files

# Regenerate the plain-output test fixtures after changing a section builder
pnpm generate-fixtures
```

The statistical distribution test (`generateLines() should return valid report`) runs 1,000,000 iterations and has a 40-second timeout — it is slow by design and runs on every `pnpm test` invocation. Factor this in when wiring CI: a default Vitest run will spend ~30 s in this one test. To skip it locally, use `pnpm test -- --exclude tests/random.test.ts` (or a `-t` filter that excludes its describe block).

## Architecture

### Core algorithm (`src/index.ts`, `src/types.ts`)

The library models the traditional yarrow stalk divination procedure. The four operations (四營) are implemented as a pure function pipeline in `src/index.ts`:

```
partTheStalks → suspendOneFromTheRight → sortLeftAndRightIntoFours → setAsideRemainderFromSortedLeftAndRight
```

`makeLineGenerator` is a synchronous generator that runs this pipeline three times (三變成爻) and yields a `FourOperationsResult` after each round, receiving the next `partStalksAtIndex` via `generator.next(index)`. After all three rounds, it returns a `Line` (6 | 7 | 8 | 9).

**Line semantics:**

- `7` = young yang (solid, static)
- `8` = young yin (broken, static)
- `6` = old yin / moving yin (broken, changes to yang)
- `9` = old yang / moving yang (solid, changes to yin)

Lines 6 and 9 are "moving lines". The resultant hexagram is obtained by flipping them: 6→7, 9→8.

### Random vs. interactive

- `src/random.ts` — drives `makeLineGenerator` with `node:crypto.randomInt` splits; exports `generateRandomHexagram()` and `generateRandomHexagrams()` for use as a library, plus `generateRandomConsultation()` which also returns the casting record
- `src/interactive.ts` — same generator wired to `@inquirer/prompts` for the plain-mode terminal flow

Both CLIs capture the eighteen stalk divisions (3 per line × 6 lines) as a `CastingRecord` (`src/types.ts`) — each `SplitRecord` pairs the index parted at (`pick`) with that round's selectable range (`max`). The per-line `splits` ride along on the generator's `LineGeneratorResult`. Output mode is decided by `resolveOutputMode()` in `src/cli-utils-mode.ts`:

- **Ink viewer (default)** — a full-screen tabbed viewer (`src/cli-viewer.tsx`) with up to four tabs (Casting / Transformation / Originating / Resultant), opening on Casting, query pinned above and the saved-file path pinned below. Built on [Ink](https://github.com/vadimdemedes/ink); `runConsultationViewer({ flowKind, inputMode, maxWrapWidth })` renders it on the alternate screen.

  The viewer owns a state machine: `awaitingQuery → casting → computing → done`. On entry the query box is editable (an in-tab `<QueryEditor>`) and the Casting table is empty (`·` placeholder cells). Once the query is submitted:
  - **`flowKind: 'interactive'`** — a bordered `<CastingPromptBox>` (in `src/cli-editors.tsx`) appears above the footer for each of the 18 splits in turn. The prompt's input widget is selected by `inputMode` (resolved from `--numeric-input` via `resolveInputMode()` in `src/cli-utils-mode.ts`):
    - **`inputMode: 'slider'`** (default) — a bouncing-slider cursor sweeps left↔right across a `max - min + 1` cell bar (1 cell = 1 value); the user presses **SPACE** to lock the current value as the `SplitRecord`. The title line reads verbatim `"Line N/6 · Cast C/3: — Press SPACE to part the stalks"`; bar and `pick: N / max` readout are both centred and stay anchored as the cursor moves. The casting prompt box is wrapped at the terminal's `innerCols` and never reflows — on narrow terminals (e.g. `--wrap-width 40`), ←/→ pans the prompt box horizontally; ↑/↓/PgUp/PgDn/g/G remain no-ops during the flow.
    - **`inputMode: 'number'`** — the legacy typed-`<NumberInput>` prompt; Enter commits, out-of-range values are rejected with an inline error.
      Each commit advances the per-line `makeLineGenerator` and fills the matching cell in the table. While casting is in flight, all non-Casting tabs are locked and rendered with `dimColor`; only Escape and Ctrl+C exit.
  - **`flowKind: 'random'`** — the viewer transitions straight to `computing`; `generateRandomConsultation()` runs inside the compute effect to produce the hexagram + casting, no in-tab prompts are ever shown (so `inputMode` is moot for random).

  The footer's progress hint during casting reads `"Casting in progress ·  ■■■□□□□□□□□□□□□□□□  N/18"` (`renderProgressBar()` in `src/cli-viewer.tsx`), where `N` is the number of committed splits.

  After both flows reach `done`, the file is saved via `consultationFileOutput()`, the tabs unlock, and the existing chrome (Tab cycling, scroll, pan, saved-path footer) re-enables. Content hard-wraps at `--wrap-width <n>` columns (default 120, via `resolveWrapWidth()` in `src/cli-utils-mode.ts`) — capped to the terminal width on narrower terminals, and floored so the fixed-width diagrams are never broken; the remainder is reachable by horizontal scrolling.

- **Plain (`--plain` / `--no-ui`, or any non-TTY stdout)** — keeps the classic Inquirer-driven terminal flow. `getHexagramViaInteraction()` / `generateRandomConsultation()` collect the data, then `logAndSaveConsultationOutput()` prints the formatted reading. `--wrap-width` and `--numeric-input` have no effect here (the slider is a viewer-only feature; plain mode is always typed).

Either way the reading is saved as a timestamped `.txt` file under `consultations/`. Content generation is split from rendering in `src/cli-utils-output.ts`: `buildConsultationSections()` produces the per-tab strings, `castingSection()` accepts a `PartialCastingRecord` so the same renderer is reused while the table is being filled in (`·` placeholders for null cells), and `consultationConsoleOutput()` composes the plain output from the same section builders. The `--plain` output (and the saved file) is locked byte-for-byte by fixtures in `tests/fixtures/` — after intentionally changing a section builder, regenerate them with `pnpm generate-fixtures` (driven by the shared cases in `tests/fixtures/cases.ts`).

### Data model (`src/models/`)

All 64 hexagram and 8 trigram records are defined in TypeScript and also serialised to `hexagrams.json` / `trigrams.json` (used at runtime via `resolveJsonModule`). Run `pnpm generate-json-files` to sync the JSON after changing the TypeScript sources.

**Key lookup types (`src/models/foundation.ts`):**

- `HexagramKey` — `H111111`–`H222222` where `1`=yang, `2`=yin (6 digits, bottom line first)
- `WenWangOrder` — canonical 1–64 numbering
- `FuxiOrder` — alternate binary ordering

**Record structure (`src/models/hexagram.ts`):**

```
GenericHexagramRecord {
  Key, Name, Metadata, Text
  Text.Chinese.{Traditional, Simplified}.{Scripture, Exegesis}
  Text.English.{WilhelmBaynes, Legge}.{Scripture, Exegesis}
}
```

Lookup entrypoint: `getHexagramRecord(hexagram: Hexagram)` in `src/getters.ts` — converts a `[Line, Line, Line, Line, Line, Line]` to a `HexagramKey` then returns the matching record.

### Build

`tsdown.config.ts` declares six entry points: `index`, `cli-interactive`, `cli-random`, `models/hexagrams`, `models/trigrams`, `getters`. The CLI outputs carry a `#!/usr/bin/env node` shebang; `postinstall` chmods them.

### Linting

Two-layer lint: oxlint (fast, most rules) runs first, then eslint (`@sxzz/eslint-config`) for rules oxlint doesn't cover. Use `oxlint-disable-next-line` for oxlint suppressions and `eslint-disable-next-line` for eslint-only rules. Config files: `.oxlintrc.json` and `eslint.config.js`.
