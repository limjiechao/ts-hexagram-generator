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
# (or `-- --no-ui`) for the classic scrolling console output

# Regenerate JSON data files after changing hexagram/trigram TypeScript sources
pnpm generate-json-files
```

The statistical distribution test (`generateLines() should return valid report`) runs 1,000,000 iterations and has a 40-second timeout — it is slow by design.

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

- `src/random.ts` — drives `makeLineGenerator` with `node:crypto.randomInt` splits; exports `generateRandomHexagram()` and `generateRandomHexagrams()` for use as a library
- `src/interactive.ts` — same generator wired to `@inquirer/prompts` so the user manually enters each split index

Both CLIs collect a query string, then present the consultation in one of two modes, decided by `resolveOutputMode()` in `src/cli-utils-mode.ts`:

- **Ink viewer (default)** — a full-screen tabbed viewer (`src/cli-viewer.tsx`) with up to three tabs (Transformation / Originating / Resultant), the query pinned above and the saved-file path pinned below. Built on [Ink](https://github.com/vadimdemedes/ink); `runConsultationViewer()` renders it on the alternate screen.
- **Plain (`--plain` / `--no-ui`, or any non-TTY stdout)** — `logAndSaveConsultationOutput()` prints the classic formatted reading to the console.

Either way the reading is saved as a timestamped `.txt` file under `consultations/`. Content generation is split from rendering in `src/cli-utils-output.ts`: `buildConsultationSections()` produces the per-tab strings, and `consultationConsoleOutput()` composes the plain output from the same section builders — so `--plain` output (and the saved file) stays byte-identical to the pre-Ink behaviour (locked by fixtures in `tests/fixtures/`).

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
