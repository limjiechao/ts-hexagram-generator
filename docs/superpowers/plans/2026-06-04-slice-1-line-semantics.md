# Slice 1: Hoist Line Semantics into @hexagram/core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@hexagram/core` the single authoritative home for `Line → Line` / boolean line algebra (moving-line predicate, moving-index extraction, polarity, polarity-flip, forward cycle) so a Next.js app can reuse it without touching any CLI package, and delete every scattered duplicate.

**Architecture:** A new pure module `domain/core/src/line-semantics.ts` exports six functions over the `Line`/`Hexagram` vocabulary already defined in `@hexagram/core/types`. It is wired as the `@hexagram/core/line-semantics` subpath, mirroring exactly how `/getters` and `/casting-derivation` are exported (package.json `exports` block + `tsdown.config.ts` entry). Every current copy — `isMovingLine` (in `cli/viewer-core` and a private copy in `domain/consultation-file`), the inline `=== 6 || === 9` checks (`domain/consultation-file/src/markdown.ts`, `cli/history-ui/src/history-list-transforms.ts`), and `flipPolarity` / `cycleLineForward` / `polarityOf` / `movingLineIndices` (in `cli/playground-ui` and `cli/viewer-core/src/banner-lines.ts`) — is deleted and its imports repointed at the new subpath. Glyphs and labels stay where they are (those are Slice 3); only pure `Line`-algebra moves.

**Tech Stack:** TypeScript, vitest, tsdown, pnpm workspaces

> **Path note (post-Slice-0):** This plan assumes Slice 0 has merged the package move. `core` and `consultation-file` live under `domain/`; `viewer-core`, `readout`, `casting-ui`, `history-ui`, `playground-ui`, `shell` live under `cli/`. All file paths below use the post-Slice-0 layout (`domain/core/...`, `cli/viewer-core/...`). The `@hexagram/*` package names are unchanged, so all `import` specifiers and `pnpm --filter @hexagram/...` commands are identical to today.

> **Scope decision — `cycleLineBackward` travels with `cycleLineForward`.** The brief lists `cycleLineForward` but not `cycleLineBackward`. They share one piece of knowledge: the `CYCLE_FORWARD = [7, 9, 8, 6]` total order. Splitting them would either duplicate that array across two packages or make `cli/playground-ui` re-derive the cycle — both violate "DRY means knowledge." So this plan moves **both** `cycleLineForward` and `cycleLineBackward` into `line-semantics.ts` (the backward step is `cycleLineForward`'s inverse over the same order) and re-exports `cycleLineBackward` alongside. The other shared decisions (subpath name `@hexagram/core/line-semantics`; the six named functions; glyphs/labels out of scope) are honoured exactly.

---

## Task 1: Create `line-semantics.ts` in `@hexagram/core` with failing tests (TDD)

Write the unit tests first against a not-yet-existing module, watch them fail to import, then add the minimal pure implementation.

**Files:**
- Create: `domain/core/src/line-semantics.ts`
- Test: `domain/core/tests/line-semantics.test.ts`

Steps:

- [ ] Write the failing test file `domain/core/tests/line-semantics.test.ts` with this exact content:

```ts
import { describe, expect, it } from 'vitest'

import {
  cycleLineBackward,
  cycleLineForward,
  flipPolarity,
  hasMovingLines,
  isMovingLine,
  movingLineIndices,
  polarityOf,
} from '../src/line-semantics.js'
import type { Hexagram, Line } from '../src/types.js'

const ALL_LINES: Line[] = [6, 7, 8, 9]

describe('isMovingLine', () => {
  it('is true only for the moving values 6 and 9', () => {
    expect(isMovingLine(6)).toBe(true)
    expect(isMovingLine(9)).toBe(true)
  })

  it('is false for the static values 7 and 8', () => {
    expect(isMovingLine(7)).toBe(false)
    expect(isMovingLine(8)).toBe(false)
  })
})

describe('polarityOf', () => {
  it('classifies solid lines (7, 9) as yang', () => {
    expect(polarityOf(7)).toBe('yang')
    expect(polarityOf(9)).toBe('yang')
  })

  it('classifies broken lines (8, 6) as yin', () => {
    expect(polarityOf(8)).toBe('yin')
    expect(polarityOf(6)).toBe('yin')
  })
})

describe('flipPolarity', () => {
  it('flips polarity preserving motion: 7↔8, 9↔6', () => {
    expect(flipPolarity(7)).toBe(8)
    expect(flipPolarity(8)).toBe(7)
    expect(flipPolarity(9)).toBe(6)
    expect(flipPolarity(6)).toBe(9)
  })

  it('is its own inverse', () => {
    for (const line of ALL_LINES) {
      expect(flipPolarity(flipPolarity(line))).toBe(line)
    }
  })
})

describe('cycleLineForward', () => {
  it('walks 7 → 9 → 8 → 6 → 7', () => {
    expect(cycleLineForward(7)).toBe(9)
    expect(cycleLineForward(9)).toBe(8)
    expect(cycleLineForward(8)).toBe(6)
    expect(cycleLineForward(6)).toBe(7)
  })
})

describe('cycleLineBackward', () => {
  it('walks 7 → 6 → 8 → 9 → 7 — the reverse of cycleLineForward', () => {
    expect(cycleLineBackward(7)).toBe(6)
    expect(cycleLineBackward(6)).toBe(8)
    expect(cycleLineBackward(8)).toBe(9)
    expect(cycleLineBackward(9)).toBe(7)
  })

  it('round-trips with cycleLineForward (one backward undoes one forward)', () => {
    for (const line of ALL_LINES) {
      expect(cycleLineBackward(cycleLineForward(line))).toBe(line)
    }
  })
})

describe('movingLineIndices', () => {
  it('is empty when no line moves', () => {
    const hex: Hexagram = [7, 7, 7, 7, 7, 7]
    expect(movingLineIndices(hex)).toEqual([])
  })

  it('returns 0-based bottom-first indices of moving lines', () => {
    const hex: Hexagram = [6, 7, 9, 7, 6, 7]
    expect(movingLineIndices(hex)).toEqual([0, 2, 4])
  })

  it('returns all six indices when every line moves', () => {
    const hex: Hexagram = [6, 9, 6, 9, 6, 9]
    expect(movingLineIndices(hex)).toEqual([0, 1, 2, 3, 4, 5])
  })
})

describe('hasMovingLines', () => {
  it('is false when no line moves', () => {
    expect(hasMovingLines([7, 8, 7, 8, 7, 8])).toBe(false)
  })

  it('is true when at least one line moves', () => {
    expect(hasMovingLines([7, 8, 9, 8, 7, 8])).toBe(true)
    expect(hasMovingLines([6, 8, 7, 8, 7, 8])).toBe(true)
  })
})
```

- [ ] Run the test and confirm it FAILS (module does not exist yet):

```bash
pnpm --filter @hexagram/core test -- tests/line-semantics.test.ts
```

Expected output: a transform/resolve error such as `Failed to resolve import "../src/line-semantics.js"` (the file is not there yet). This is the red state.

- [ ] Create `domain/core/src/line-semantics.ts` with this exact content:

```ts
// The pure Line → Line / boolean algebra of the I Ching casting vocabulary —
// the single authoritative home for "what is a moving line", polarity, the
// polarity flip, and the playground's forward/backward cycle. No glyphs, no
// labels, no colours (those live in the render layers); every function here is
// a deterministic function of `Line`/`Hexagram` values and is reusable by any
// consumer of @hexagram/core, including a future web adapter, without pulling
// in a CLI package.
//
// Line semantics:
//   - 7 = young yang  (solid, static)
//   - 8 = young yin   (broken, static)
//   - 9 = old yang    (solid, moving → becomes 8)
//   - 6 = old yin     (broken, moving → becomes 7)

import type { Hexagram, Line } from './types.js'

/** A line's polarity: `yang` is solid, `yin` is broken. */
export type LinePolarity = 'yang' | 'yin'

/** A moving line is an old line (6 old yin, 9 old yang); it transforms. */
export function isMovingLine(line: Line): line is Extract<Line, 6 | 9> {
  return line === 6 || line === 9
}

/**
 * 0-based indices (bottom-first; `0` = Line 1, `5` = Line 6) of the moving
 * lines in the given hexagram. Empty when no lines are moving.
 */
export function movingLineIndices(hexagram: Hexagram): number[] {
  const indices: number[] = []
  for (const [index, line] of hexagram.entries()) {
    if (isMovingLine(line)) indices.push(index)
  }
  return indices
}

/** Whether the hexagram has at least one moving line (6 or 9). */
export function hasMovingLines(hexagram: Hexagram): boolean {
  return hexagram.some(isMovingLine)
}

/**
 * Classify a casting `Line` by polarity. Solid lines (7 young yang, 9 moving
 * yang) are `yang`; broken lines (8 young yin, 6 moving yin) are `yin`.
 */
export function polarityOf(line: Line): LinePolarity {
  return line === 7 || line === 9 ? 'yang' : 'yin'
}

/**
 * Flip polarity preserving motion: 7↔8, 9↔6. Orthogonal to the cycle's motion
 * axis, so composing flip + cycle reaches any state in ≤2 steps from any other.
 */
export function flipPolarity(line: Line): Line {
  switch (line) {
    case 7:
      return 8
    case 8:
      return 7
    case 9:
      return 6
    case 6:
      return 9
  }
}

/** The four `Line` values in the cycle's total order (spec's digit-tour). */
const CYCLE_FORWARD: readonly Line[] = [7, 9, 8, 6] as const

/**
 * Forward cycle: 7 → 9 → 8 → 6 → 7. Not a Gray code — the spec chose this
 * digit-tour order, grouping yang values (7, 9) then yin values (8, 6).
 */
export function cycleLineForward(line: Line): Line {
  const index = CYCLE_FORWARD.indexOf(line)
  // `Line` is an exhaustive union, but TS can't narrow `indexOf`'s number
  // return — fall through to 7 if a future Line value sneaks past the type.
  return CYCLE_FORWARD[(index + 1) % CYCLE_FORWARD.length] ?? 7
}

/**
 * Backward cycle: 7 → 6 → 8 → 9 → 7 — the inverse of `cycleLineForward` over
 * the same order, so one backward step undoes one forward step.
 */
export function cycleLineBackward(line: Line): Line {
  const index = CYCLE_FORWARD.indexOf(line)
  return (
    CYCLE_FORWARD[(index - 1 + CYCLE_FORWARD.length) % CYCLE_FORWARD.length] ??
    7
  )
}
```

- [ ] Run the test again and confirm it PASSES:

```bash
pnpm --filter @hexagram/core test -- tests/line-semantics.test.ts
```

Expected output: all `describe` blocks green (`isMovingLine`, `polarityOf`, `flipPolarity`, `cycleLineForward`, `cycleLineBackward`, `movingLineIndices`, `hasMovingLines`), `Test Files 1 passed`.

- [ ] Commit:

```bash
git add domain/core/src/line-semantics.ts domain/core/tests/line-semantics.test.ts
git commit -m "$(cat <<'EOF'
core: add line-semantics module as single home for Line algebra

Hoist the moving-line predicate, polarity, polarity-flip, and the
playground cycle into @hexagram/core so a web adapter can reuse the I
Ching line algebra without depending on any CLI package. Pure
Line/Hexagram functions only; glyphs and labels stay in the render layers.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 2: Export the `@hexagram/core/line-semantics` subpath

Wire the new module as a published subpath, mirroring `/getters` and `/casting-derivation` exactly.

**Files:**
- Modify: `domain/core/package.json`
- Modify: `domain/core/tsdown.config.ts`

Steps:

- [ ] In `domain/core/package.json`, add the `./line-semantics` export. Insert it alphabetically between `./getters` and `./hexagrams` (the `exports` keys are sorted). Before/after of the relevant region:

Before:
```json
    "./getters": {
      "source": "./src/getters.ts",
      "types": "./dist/getters.d.mts",
      "import": "./dist/getters.mjs"
    },
    "./hexagrams": {
```

After:
```json
    "./getters": {
      "source": "./src/getters.ts",
      "types": "./dist/getters.d.mts",
      "import": "./dist/getters.mjs"
    },
    "./line-semantics": {
      "source": "./src/line-semantics.ts",
      "types": "./dist/line-semantics.d.mts",
      "import": "./dist/line-semantics.mjs"
    },
    "./hexagrams": {
```

- [ ] In `domain/core/tsdown.config.ts`, add the entry. Insert it after `./src/getters.ts` (entries are alphabetised). Before/after:

Before:
```ts
    './src/getters.ts',
    './src/models/hexagrams.ts',
```

After:
```ts
    './src/getters.ts',
    './src/line-semantics.ts',
    './src/models/hexagrams.ts',
```

- [ ] Type-check core to confirm the new subpath wiring is consistent:

```bash
pnpm --filter @hexagram/core type:check
```

Expected output: no errors (exit 0).

- [ ] Commit:

```bash
git add domain/core/package.json domain/core/tsdown.config.ts
git commit -m "$(cat <<'EOF'
core: export @hexagram/core/line-semantics subpath

Mirror the existing /getters and /casting-derivation export wiring
(package.json exports + tsdown entry) so consumers can import the new
module via a stable subpath under the source/types/import conditions.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 3: Repoint `cli/viewer-core` — delete its `isMovingLine`, keep the Line type only

`viewer-core/src/utils-validators.ts` owns `isMovingLine`; `banner-lines.ts` owns `polarityOf`. Both move to core. The package's `index.ts` re-exports `isMovingLine` and `polarityOf`, and `output-composers.ts` / `output-sections.ts` (in `cli/readout`) import `isMovingLine` from `@hexagram/viewer-core`. To keep this slice small and avoid touching `cli/readout`, the `viewer-core` barrel re-exports `isMovingLine` and `polarityOf` from `@hexagram/core/line-semantics` (the barrel stays the same export surface; only the source changes).

**Files:**
- Modify: `cli/viewer-core/src/utils-validators.ts`
- Modify: `cli/viewer-core/src/banner-lines.ts`
- Modify: `cli/viewer-core/src/index.ts`

Steps:

- [ ] In `cli/viewer-core/src/utils-validators.ts`, delete the local `isMovingLine` (lines 1–5). The file keeps `isLineIndex`, `isLine1ToLine6`, `assertLine1ToLine6`. Before:

```ts
import type { Line } from '@hexagram/core/types'

export function isMovingLine(line: Line): line is Extract<Line, 6 | 9> {
  return line === 6 || line === 9
}

type LineIndex = 0 | 1 | 2 | 3 | 4 | 5
```

After (the `Line` import is now unused in this file — remove it):

```ts
type LineIndex = 0 | 1 | 2 | 3 | 4 | 5
```

- [ ] In `cli/viewer-core/src/banner-lines.ts`, delete the local `polarityOf` and import it from core instead. The `LinePolarity` type also now lives in core, so import it too (it is used by `deriveBannerLine`'s parameter and the `LineCells` neighbours). Before (the import block + the function):

```ts
import type { Line } from '@hexagram/core/types'

import { BOLD_GREY, BOLD_RED, DIM_RED, NORMAL_GREY } from './output-palette.js'

/** A line's polarity: `yang` is solid, `yin` is broken. */
export type LinePolarity = 'yang' | 'yin'
```

After:

```ts
import { polarityOf, type LinePolarity } from '@hexagram/core/line-semantics'
import type { Line } from '@hexagram/core/types'

import { BOLD_GREY, BOLD_RED, DIM_RED, NORMAL_GREY } from './output-palette.js'
```

  > Note: `LinePolarity` is now re-exported from `banner-lines.ts` via `export type { LinePolarity }` further wiring — see the next sub-step. Keep the `re-export` so downstream `import { LinePolarity } from '@hexagram/viewer-core'` still resolves.

- [ ] Still in `banner-lines.ts`, delete the now-duplicate `polarityOf` function body (the `export function polarityOf(...) { ... }` block, originally lines 43–50) since it is imported from core. Then re-export it and the type so the `viewer-core` barrel and `cli/playground-ui` keep their existing import surface. Add near the imports or at the bottom of the file:

```ts
export { polarityOf, type LinePolarity }
```

  > Rationale: `banner-lines.ts` previously *defined* `polarityOf` and `LinePolarity`; `index.ts` re-exports them from `./banner-lines.js`. Re-exporting the core versions through `banner-lines.ts` keeps `index.ts` and every `@hexagram/viewer-core` consumer untouched in this slice.

- [ ] In `cli/viewer-core/src/index.ts`, change the `isMovingLine` re-export source. Currently `isMovingLine` is re-exported from `./utils-validators.js` (lines 64–70). Move it to the `banner-lines.js` re-export block or add a dedicated core re-export. Simplest: re-export `isMovingLine` directly from core. Before:

```ts
// Pure validators / type guards shared by the renderers.
export {
  assertLine1ToLine6,
  isLine1ToLine6,
  isLineIndex,
  isMovingLine,
} from './utils-validators.js'
```

After:

```ts
// Pure validators / type guards shared by the renderers.
export {
  assertLine1ToLine6,
  isLine1ToLine6,
  isLineIndex,
} from './utils-validators.js'

// Line semantics now live in @hexagram/core; re-exported here so existing
// @hexagram/viewer-core consumers (readout, playground-ui) keep one import.
export { isMovingLine } from '@hexagram/core/line-semantics'
```

- [ ] Run viewer-core's tests and type-check (`banner-lines.test.ts` exercises `polarityOf` through the barrel/module):

```bash
pnpm --filter @hexagram/viewer-core test
pnpm --filter @hexagram/viewer-core type:check
```

Expected output: all tests pass; type-check exits 0. (No source changes were needed in `cli/readout` because it imports `isMovingLine` from `@hexagram/viewer-core`, which still resolves.)

- [ ] Commit:

```bash
git add cli/viewer-core/src/utils-validators.ts cli/viewer-core/src/banner-lines.ts cli/viewer-core/src/index.ts
git commit -m "$(cat <<'EOF'
viewer-core: source isMovingLine/polarityOf from @hexagram/core

Delete viewer-core's local copies of the moving-line predicate and the
polarity classifier; re-export the core versions through the same barrel
so readout/playground-ui consumers are unchanged. viewer-core now imports
@hexagram/core for the Line type and these semantics only.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 4: Repoint `cli/playground-ui` — delete its line-algebra copies

`playground-lines.ts` owns `cycleLineForward`, `cycleLineBackward`, `flipPolarity`, `movingLineIndices` and imports `isMovingLine` from `@hexagram/viewer-core`. All four move to core. `setLineAt`, `INITIAL_HEXAGRAM`, `buildPlaygroundDerivation`, and the `PlaygroundDerivation` type stay (they are playground-specific, not pure Line algebra). The package re-exports the four moved functions through `playground-lines.ts` so `index.ts`, `playground-state.ts`, and the test files keep importing from `./playground-lines.js`.

**Files:**
- Modify: `cli/playground-ui/src/playground-lines.ts`

Steps:

- [ ] In `cli/playground-ui/src/playground-lines.ts`, replace the four moved function definitions and the `viewer-core` `isMovingLine` import with imports + re-exports from core. Before (imports, lines 13–15):

```ts
import { getEmergingHexagram } from '@hexagram/core/getters'
import type { Hexagram, Line } from '@hexagram/core/types'
import { isMovingLine } from '@hexagram/viewer-core'
```

After:

```ts
import { getEmergingHexagram } from '@hexagram/core/getters'
import {
  cycleLineBackward,
  cycleLineForward,
  flipPolarity,
  isMovingLine,
  movingLineIndices,
} from '@hexagram/core/line-semantics'
import type { Hexagram, Line } from '@hexagram/core/types'
```

- [ ] Delete the four function definitions now living in core: `cycleLineForward` (orig. lines 28–33), `cycleLineBackward` (orig. 39–46), `flipPolarity` (orig. 54–65), and `movingLineIndices` (orig. 71–77), along with the `CYCLE_FORWARD` const (orig. 21) which now lives in core. Keep `INITIAL_HEXAGRAM`, `setLineAt`, `buildPlaygroundDerivation`, and `PlaygroundDerivation`. `buildPlaygroundDerivation` still calls `movingLineIndices` — now the imported one.

- [ ] Re-export the four moved functions so `index.ts`, `playground-state.ts`, and the tests keep importing from `./playground-lines.js`. Add after the imports:

```ts
// Pure Line algebra now lives in @hexagram/core/line-semantics; re-exported
// so playground-state, the barrel, and the unit tests keep one import path.
export { cycleLineBackward, cycleLineForward, flipPolarity, movingLineIndices }
```

  > Note: `Line` is still imported because `setLineAt`'s `next: Line` parameter uses it; keep the `@hexagram/core/types` import.

- [ ] Run playground-ui's tests and type-check. `playground-lines.test.ts` imports all four from `../src/playground-lines` (re-export keeps it green); `playground-state.test.ts` and `playground-keymap.test.ts` exercise the reducer path:

```bash
pnpm --filter @hexagram/playground-ui test
pnpm --filter @hexagram/playground-ui type:check
```

Expected output: all tests pass; type-check exits 0.

- [ ] Commit:

```bash
git add cli/playground-ui/src/playground-lines.ts
git commit -m "$(cat <<'EOF'
playground-ui: source line algebra from @hexagram/core

Delete playground-ui's copies of cycleLineForward/Backward, flipPolarity,
and movingLineIndices (and the CYCLE_FORWARD order they shared); import and
re-export the core versions through playground-lines so the reducer, barrel,
and tests keep their import path. Playground-specific helpers (setLineAt,
buildPlaygroundDerivation, INITIAL_HEXAGRAM) stay.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 5: Repoint `domain/consultation-file` — delete the private `isMovingLine` and inline `hasMovingLines`

`markdown-sections.ts` has a private `isMovingLine` (lines 29–31, returns `boolean`). `markdown.ts` has a private `hasMovingLines` with an inline `=== 6 || === 9` (lines 12–14). Both are replaced by core imports.

**Files:**
- Modify: `domain/consultation-file/src/markdown-sections.ts`
- Modify: `domain/consultation-file/src/markdown.ts`

Steps:

- [ ] In `domain/consultation-file/src/markdown-sections.ts`, delete the private `isMovingLine` (lines 29–31) and import it from core. Add to the imports near the top (after the existing `@hexagram/core/getters` import block); the file already imports types from `@hexagram/core/types`. Add:

```ts
import { isMovingLine } from '@hexagram/core/line-semantics'
```

  Then delete:

```ts
function isMovingLine(line: Line): boolean {
  return line === 6 || line === 9
}
```

  > Note: the core `isMovingLine` narrows to `Extract<Line, 6 | 9>`; existing call sites use it as a boolean (`.filter`, `.findIndex`, ternary) and as `isMovingLine(s as Line)`. All remain valid — a type guard is callable wherever a `boolean` predicate is expected. The `Line` type import in this file is still used elsewhere (`LINE_DIAGRAM` cast, `key` typing), so keep it.

- [ ] In `domain/consultation-file/src/markdown.ts`, delete the private `hasMovingLines` (lines 12–14) and import it from core. Before:

```ts
import type { CastingRecord, Hexagram, Line } from '@hexagram/core/types'

import {
  castingMarkdownSection,
  emergingHexagramMarkdownSection,
  linesMarkdownBlock,
  queryMarkdownSection,
  standingHexagramMarkdownSection,
  transformationMarkdownSection,
} from './markdown-sections.js'

function hasMovingLines(hexagram: Hexagram): boolean {
  return hexagram.some((line: Line) => line === 6 || line === 9)
}
```

After (the `Line` type is no longer used in this file once the inline check is gone — drop it from the type import):

```ts
import { hasMovingLines } from '@hexagram/core/line-semantics'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'

import {
  castingMarkdownSection,
  emergingHexagramMarkdownSection,
  linesMarkdownBlock,
  queryMarkdownSection,
  standingHexagramMarkdownSection,
  transformationMarkdownSection,
} from './markdown-sections.js'
```

  The existing call `if (hasMovingLines(hexagram)) { ... }` is unchanged.

- [ ] Run consultation-file's tests and type-check. The `.md` body output is locked by fixtures — `hasMovingLines` / `isMovingLine` are behaviourally identical, so the rendered body must be byte-identical and the fixtures pass unchanged:

```bash
pnpm --filter @hexagram/consultation-file test
pnpm --filter @hexagram/consultation-file type:check
```

Expected output: all tests pass (including the markdown body fixtures); type-check exits 0. If a fixture fails, STOP — it means behaviour drifted, not just structure; do not regenerate fixtures to paper over it.

- [ ] Commit:

```bash
git add domain/consultation-file/src/markdown-sections.ts domain/consultation-file/src/markdown.ts
git commit -m "$(cat <<'EOF'
consultation-file: source moving-line predicates from @hexagram/core

Delete the private isMovingLine copy and the inline `=== 6 || === 9`
hasMovingLines check; import both from @hexagram/core/line-semantics.
Rendered markdown body is byte-identical (fixtures unchanged).

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 6: Repoint `cli/history-ui` — delete the inline `=== 6 || === 9`

`history-list-transforms.ts` has an inline `hexagram.some((line) => line === 6 || line === 9)` (line 33) inside `summarizeHexParts`.

**Files:**
- Modify: `cli/history-ui/src/history-list-transforms.ts`

Steps:

- [ ] In `cli/history-ui/src/history-list-transforms.ts`, import `hasMovingLines` from core and use it. Before (imports, lines 4–6, and the inline check on line 33):

```ts
import { getEmergingHexagram, getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/core/types'
import { truncateEnd } from '@hexagram/viewer-core'
```

After:

```ts
import { getEmergingHexagram, getHexagramRecord } from '@hexagram/core/getters'
import { hasMovingLines } from '@hexagram/core/line-semantics'
import type { Hexagram } from '@hexagram/core/types'
import { truncateEnd } from '@hexagram/viewer-core'
```

  Then the inline check. Before:

```ts
  const hasMoving = hexagram.some((line) => line === 6 || line === 9)
```

After:

```ts
  const hasMoving = hasMovingLines(hexagram)
```

- [ ] Run history-ui's tests and type-check:

```bash
pnpm --filter @hexagram/history-ui test
pnpm --filter @hexagram/history-ui type:check
```

Expected output: all tests pass; type-check exits 0.

- [ ] Commit:

```bash
git add cli/history-ui/src/history-list-transforms.ts
git commit -m "$(cat <<'EOF'
history-ui: use core hasMovingLines instead of inline check

Replace the inline `line === 6 || line === 9` moving-line test in the row
summary with @hexagram/core/line-semantics' hasMovingLines, removing the
last hand-rolled copy of that rule outside core.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 7: Whole-repo verification

Confirm nothing else still hand-rolls the moving-line rule or the moved functions, and the whole build/test/type pipeline is green.

**Files:** none (verification only)

Steps:

- [ ] Search for any remaining hand-rolled moving-line checks or stray local definitions. Expected: the only `=== 6 || === 9` left is the test-only checks in `cli/playground-ui/tests/playground-display.test.ts` and `cli/casting-ui/scripts/generate-fixtures.ts` (a build script that mirrors the readout's own gate; out of scope — it is not a production import path and is not in the brief's list), plus `domain/core/src/types.ts`'s `isLine` (a different rule — value-is-a-Line, not is-moving). Run:

```bash
pnpm exec rg -n "=== 6 \|\| .*=== 9|=== 9 \|\| .*=== 6" packages domain cli 2>/dev/null || rg -n "=== 6 \|\| .*=== 9|=== 9 \|\| .*=== 6"
```

  Confirm no NEW production source (non-test, non-script) match remains. If `generate-fixtures.ts` still matches, that is acceptable for this slice; note it for a follow-up but do not expand scope here.

- [ ] Confirm there is exactly one definition of each moved function (in core):

```bash
pnpm exec rg -n "export function (isMovingLine|movingLineIndices|hasMovingLines|polarityOf|flipPolarity|cycleLineForward|cycleLineBackward)" .
```

  Expected: each name appears once, all in `domain/core/src/line-semantics.ts`. (Re-exports via `export { ... }` are not `export function` and won't match.)

- [ ] Run the full pipeline (type-check, then lint, then the whole test suite). Note the `@hexagram/core` slow distribution test (~40 s) runs here by design:

```bash
pnpm type:check
pnpm lint:check
pnpm test
```

Expected output: all three exit 0; every package's tests green; no unused-import or unresolved-import lint errors.

- [ ] If lint flags an unused `Line`/`Hexagram` import left behind in any touched file, remove it and re-run `pnpm lint:check`. Then commit any cleanup:

```bash
git add -A
git commit -m "$(cat <<'EOF'
core: tidy imports after hoisting line semantics

Remove imports left unused once the duplicated Line algebra was deleted
from the UI packages.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

- [ ] (Optional, recommended before opening a PR) Build to confirm the new subpath emits its `.mjs` / `.d.mts` artifacts:

```bash
pnpm build
ls domain/core/dist/line-semantics.mjs domain/core/dist/line-semantics.d.mts
```

Expected output: both files exist.

---

## Done criteria

- `@hexagram/core/line-semantics` exists, is exported (package.json + tsdown), and is unit-tested for all seven functions.
- These duplicate/inline copies are deleted and repointed at core: `isMovingLine` in `cli/viewer-core/src/utils-validators.ts`; the private `isMovingLine` in `domain/consultation-file/src/markdown-sections.ts`; the inline `=== 6 || === 9` in `domain/consultation-file/src/markdown.ts` (`hasMovingLines`) and `cli/history-ui/src/history-list-transforms.ts`; and `polarityOf` / `flipPolarity` / `cycleLineForward` / `cycleLineBackward` / `movingLineIndices` across `cli/playground-ui/src/playground-lines.ts` and `cli/viewer-core/src/banner-lines.ts`.
- `cli/viewer-core` still imports `@hexagram/core` for the `Line` type (and now re-exports core's `isMovingLine`/`polarityOf` through its barrel for downstream consumers).
- Glyphs and labels are untouched (Slice 3).
- `pnpm type:check`, `pnpm lint:check`, `pnpm test` all pass.
