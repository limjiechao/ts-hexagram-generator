# Slice 1: Hoist Line Semantics into @hexagram/core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@hexagram/core` the single authoritative home for `Line → Line` / boolean line algebra (moving-line predicate, moving-index extraction, polarity, polarity-flip, forward/backward cycle) so a Next.js app can reuse it without touching any CLI package, and delete every scattered duplicate.

**Architecture:** A new pure module `domain/core/src/line-semantics.ts` exports six functions over the `Line`/`Hexagram` vocabulary already defined in `@hexagram/core/types`. It is wired as the `@hexagram/core/line-semantics` subpath, mirroring exactly how `/getters` and `/casting-derivation` are exported (package.json `exports` block + `tsdown.config.ts` entry). Every current copy — `isMovingLine` (in `cli/viewer-core` and a private copy in `domain/consultation-file`), the inline `=== 6 || === 9` checks (`domain/consultation-file/src/markdown.ts`, `cli/history-ui/src/history-list-transforms.ts`), and `flipPolarity` / `cycleLineForward` / `cycleLineBackward` / `polarityOf` / `movingLineIndices` (in `cli/playground-ui` and `cli/viewer-core/src/banner-lines.ts`) — is deleted. **Every consumer is repointed DIRECTLY at `@hexagram/core/line-semantics`** — no barrel re-export passthrough. The `cli/viewer-core` barrel (`utils-validators.ts` / `banner-lines.ts`) and the `cli/playground-ui` barrel (`playground-lines.ts`) stop re-exporting these symbols entirely. Glyphs and labels stay where they are (those are Slice 3); only pure `Line`-algebra moves.

**Tech Stack:** TypeScript, vitest, tsdown, pnpm workspaces

> **Path note (post-Slice-0):** This plan assumes Slice 0 has merged the package move. `core` and `consultation-file` live under `domain/`; `viewer-core`, `readout`, `casting-ui`, `history-ui`, `playground-ui`, `shell` live under `cli/`. All file paths below use the post-Slice-0 layout (`domain/core/...`, `cli/viewer-core/...`). The `@hexagram/*` package names are unchanged, so all `import` specifiers and `pnpm --filter @hexagram/...` commands are identical to today.

> **Reviewer decision — FULL REPOINT, no barrel passthrough.** An earlier draft re-exported the moved functions through the existing barrels (`viewer-core`'s `utils-validators` / `banner-lines`, `playground-ui`'s `playground-lines`) so downstream files kept importing e.g. `isMovingLine` from `@hexagram/viewer-core`. **That passthrough is rejected.** Instead, *every* file that imports any of `{ isMovingLine, movingLineIndices, hasMovingLines, polarityOf, flipPolarity, cycleLineForward, cycleLineBackward }` imports it DIRECTLY from `@hexagram/core/line-semantics`, and the barrels REMOVE those re-exports. The list of import sites is enumerated concretely in the tasks below — there is no "and any other importers." Rationale: one authoritative import path per symbol (DRY-of-knowledge), no hidden indirection a reviewer must chase through a barrel, and the web adapter never has to learn that a CLI barrel happens to forward core's algebra.

> **Scope decision — `cycleLineBackward` travels with `cycleLineForward`.** The brief lists `cycleLineForward` but not `cycleLineBackward`. They share one piece of knowledge: the `CYCLE_FORWARD = [7, 9, 8, 6]` total order. Splitting them would either duplicate that array across two packages or make `cli/playground-ui` re-derive the cycle — both violate "DRY means knowledge." So this plan moves **both** `cycleLineForward` and `cycleLineBackward` into `line-semantics.ts` (the backward step is `cycleLineForward`'s inverse over the same order). The other shared decisions (subpath name `@hexagram/core/line-semantics`; the named functions; glyphs/labels out of scope) are honoured exactly.

> **Type note — `LinePolarity` travels with `polarityOf`.** `polarityOf`'s return type `LinePolarity = 'yang' | 'yin'` currently lives in `cli/viewer-core/src/banner-lines.ts`. Because `polarityOf` moves to core, its type moves with it — `line-semantics.ts` defines and exports `LinePolarity`. `banner-lines.ts` keeps `deriveBannerLine` (a glyph/render function — Slice 3 scope) and imports `type LinePolarity` from core for that signature; the viewer-core barrel re-exports `LinePolarity` from `banner-lines.js` as before (it is the polarity *type* the render layer uses, not one of the seven moved functions). No consumer imports `LinePolarity` as a value, so this is a pure type wiring with no behavioural surface.

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

## Task 3: Repoint `cli/viewer-core` — delete its `isMovingLine` / `polarityOf` and STOP re-exporting them

`cli/viewer-core/src/utils-validators.ts` owns `isMovingLine`; `cli/viewer-core/src/banner-lines.ts` owns `polarityOf` (and the `LinePolarity` type). Both functions move to core. The barrel (`index.ts`) currently re-exports `isMovingLine` (from `utils-validators.js`) and `polarityOf` (from `banner-lines.js`). **Both re-exports of these two functions are removed** — downstream consumers will import them directly from `@hexagram/core/line-semantics` in later tasks. `LinePolarity` (the *type*) travels to core but stays re-exported through `banner-lines.js` because `deriveBannerLine` (a glyph/render function, Slice 3 scope) keeps its signature.

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

- [ ] In `cli/viewer-core/src/banner-lines.ts`, delete the local `polarityOf` definition (orig. lines 48–50) and the local `LinePolarity` type definition (orig. lines 16–17), and import `type LinePolarity` from core (`deriveBannerLine`'s `polarity: LinePolarity` parameter still needs the type). `polarityOf` itself is NOT re-imported here — viewer-core no longer uses it internally; its consumers (shell, playground-display-rows) repoint directly to core. Before (import block + the type alias):

```ts
import type { Line } from '@hexagram/core/types'

import { BOLD_GREY, BOLD_RED, DIM_RED, NORMAL_GREY } from './output-palette.js'

/** A line's polarity: `yang` is solid, `yin` is broken. */
export type LinePolarity = 'yang' | 'yin'
```

After:

```ts
import { type LinePolarity } from '@hexagram/core/line-semantics'
import type { Line } from '@hexagram/core/types'

import { BOLD_GREY, BOLD_RED, DIM_RED, NORMAL_GREY } from './output-palette.js'
```

  > Note: re-exporting `LinePolarity` from this file (so the barrel keeps `export { ..., type LinePolarity } from './banner-lines.js'`) requires the imported type be re-exported. A bare `import { type LinePolarity }` makes it locally visible but not re-exported. Add an explicit re-export line near the top of the file (see next sub-step) so `index.ts` is untouched.

- [ ] Still in `banner-lines.ts`, delete the now-duplicate `polarityOf` function body (the `export function polarityOf(...) { ... }` block, orig. lines 43–50). Then re-export the `LinePolarity` type so the barrel keeps it. Add after the import block:

```ts
export type { LinePolarity }
```

  > Rationale: `banner-lines.ts` previously *defined* `polarityOf` and `LinePolarity`; the barrel re-exported both from `./banner-lines.js`. After this slice `banner-lines.ts` no longer defines or re-exports `polarityOf` (that is a clean delete — the barrel drops it), but it still surfaces `LinePolarity` for `deriveBannerLine`'s render-layer consumers.

- [ ] In `cli/viewer-core/src/index.ts`, **delete** the `isMovingLine` re-export from the validators block, and **delete** `polarityOf` from the banner-lines re-export block. The barrel no longer forwards either function. Before (banner-lines re-export, lines 11–18):

```ts
export {
  deriveBannerLine,
  lineColors,
  polarityOf,
  type LineCells,
  type LinePolarity,
  type LineRole,
} from './banner-lines.js'
```

After (drop `polarityOf`; keep `LinePolarity` and the glyph/render exports):

```ts
export {
  deriveBannerLine,
  lineColors,
  type LineCells,
  type LinePolarity,
  type LineRole,
} from './banner-lines.js'
```

  And before (validators re-export, lines 64–70):

```ts
// Pure validators / type guards shared by the renderers.
export {
  assertLine1ToLine6,
  isLine1ToLine6,
  isLineIndex,
  isMovingLine,
} from './utils-validators.js'
```

After (drop `isMovingLine` — it is no longer defined here):

```ts
// Pure validators / type guards shared by the renderers.
export {
  assertLine1ToLine6,
  isLine1ToLine6,
  isLineIndex,
} from './utils-validators.js'
```

- [ ] Run viewer-core's tests and type-check. NOTE: `cli/viewer-core/tests/banner-lines.test.ts` imports `polarityOf` (it tests the polarity classifier). Because `polarityOf` no longer lives in this package, repoint that test's import to core. In `cli/viewer-core/tests/banner-lines.test.ts`, change the `polarityOf` import source from the local module to `@hexagram/core/line-semantics` (verify the exact current import line — it imports from `../src/banner-lines` or `@hexagram/viewer-core`; repoint just the `polarityOf` symbol to `@hexagram/core/line-semantics`, leaving `deriveBannerLine` / `lineColors` / types on the local import). Then run:

```bash
pnpm --filter @hexagram/viewer-core test
pnpm --filter @hexagram/viewer-core type:check
```

Expected output: all tests pass; type-check exits 0.

- [ ] Commit:

```bash
git add cli/viewer-core/src/utils-validators.ts cli/viewer-core/src/banner-lines.ts cli/viewer-core/src/index.ts cli/viewer-core/tests/banner-lines.test.ts
git commit -m "$(cat <<'EOF'
viewer-core: delete isMovingLine/polarityOf, stop re-exporting them

Remove viewer-core's local copies of the moving-line predicate and the
polarity classifier, and remove their barrel re-exports — consumers now
import both directly from @hexagram/core/line-semantics (no passthrough).
The LinePolarity type travels to core but stays re-exported via banner-lines
for deriveBannerLine's render-layer signature.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 4: Repoint `cli/readout` — import `isMovingLine` directly from core

`cli/readout` imports `isMovingLine` from `@hexagram/viewer-core` in two files. Now that the barrel no longer re-exports it, both must import directly from `@hexagram/core/line-semantics`.

**Files:**
- Modify: `cli/readout/src/output-composers.ts`
- Modify: `cli/readout/src/output-sections.ts`

Steps:

- [ ] In `cli/readout/src/output-composers.ts`, repoint the `isMovingLine` import (orig. line 7). Before:

```ts
import { isMovingLine } from '@hexagram/viewer-core'
```

After (insert the core import in alphabetical order with the other `@hexagram/core/*` imports near the top — it sorts before `@hexagram/core/types`):

```ts
import { isMovingLine } from '@hexagram/core/line-semantics'
```

  > Note: the file's other named imports from `@hexagram/viewer-core` (if any in the same statement) stay; only `isMovingLine` moves. Here `isMovingLine` is its own single-symbol import, so the whole line is replaced.

- [ ] In `cli/readout/src/output-sections.ts`, `isMovingLine` is one symbol inside the multi-line `@hexagram/viewer-core` import block (orig. lines 7–16, with `isMovingLine` on line 13). Remove it from that block and add a dedicated core import. Before:

```ts
import {
  getEmergingHexagram,
  getHexagramRecord,
  getTrigramRecord,
} from '@hexagram/core/getters'
import type { Hexagram, Line } from '@hexagram/core/types'
import {
  assertLine1ToLine6,
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  isLineIndex,
  isMovingLine,
  NORMAL,
  NORMAL_GREY,
} from '@hexagram/viewer-core'
```

After (drop `isMovingLine` from the viewer-core block; add the core import alphabetically — `@hexagram/core/line-semantics` sorts after `/getters` and before `/types`):

```ts
import {
  getEmergingHexagram,
  getHexagramRecord,
  getTrigramRecord,
} from '@hexagram/core/getters'
import { isMovingLine } from '@hexagram/core/line-semantics'
import type { Hexagram, Line } from '@hexagram/core/types'
import {
  assertLine1ToLine6,
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  isLineIndex,
  NORMAL,
  NORMAL_GREY,
} from '@hexagram/viewer-core'
```

- [ ] Run readout's tests and type-check:

```bash
pnpm --filter @hexagram/readout test
pnpm --filter @hexagram/readout type:check
```

Expected output: all tests pass; type-check exits 0.

- [ ] Commit:

```bash
git add cli/readout/src/output-composers.ts cli/readout/src/output-sections.ts
git commit -m "$(cat <<'EOF'
readout: import isMovingLine directly from @hexagram/core

Repoint both readout output composers off the viewer-core barrel
(which no longer re-exports it) onto @hexagram/core/line-semantics.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 5: Repoint `cli/casting-ui` — import `isMovingLine` directly from core

`cli/casting-ui/src/output-composers.ts` imports `isMovingLine` from `@hexagram/viewer-core`.

**Files:**
- Modify: `cli/casting-ui/src/output-composers.ts`

Steps:

- [ ] In `cli/casting-ui/src/output-composers.ts`, repoint the `isMovingLine` import (orig. line 12). Before (the relevant import lines):

```ts
import { getEmergingHexagram } from '@hexagram/core/getters'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import {
  castingSection,
  emergingHexagramSection,
  hexagramTextSection,
  linesBlock,
  querySection,
  standingHexagramSection,
  transformationSection,
} from '@hexagram/readout'
import { isMovingLine } from '@hexagram/viewer-core'
```

After (move the `isMovingLine` import to core, alphabetically after `/getters` and before `/types`; drop the now-unneeded `@hexagram/viewer-core` import line):

```ts
import { getEmergingHexagram } from '@hexagram/core/getters'
import { isMovingLine } from '@hexagram/core/line-semantics'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import {
  castingSection,
  emergingHexagramSection,
  hexagramTextSection,
  linesBlock,
  querySection,
  standingHexagramSection,
  transformationSection,
} from '@hexagram/readout'
```

  > Note: confirm `@hexagram/viewer-core` is not imported for any other symbol in this file before deleting the whole line. From the current source it imports only `isMovingLine`, so the line is removed entirely.

- [ ] Run casting-ui's tests and type-check (the `--plain` output fixtures exercise `isMovingLine` through `consultationConsoleOutput`; behaviour is unchanged so fixtures pass):

```bash
pnpm --filter @hexagram/casting-ui test
pnpm --filter @hexagram/casting-ui type:check
```

Expected output: all tests pass (including the plain-output fixtures); type-check exits 0. If a fixture fails, STOP — behaviour drifted; do not regenerate fixtures to paper over it.

- [ ] Commit:

```bash
git add cli/casting-ui/src/output-composers.ts
git commit -m "$(cat <<'EOF'
casting-ui: import isMovingLine directly from @hexagram/core

Repoint the plain-output composer off the viewer-core barrel onto
@hexagram/core/line-semantics. Plain output is byte-identical (fixtures
unchanged).

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 6: Repoint `cli/shell` — import `polarityOf` directly from core

`cli/shell/src/banner-state.ts` imports `polarityOf` from `@hexagram/viewer-core` (alongside `deriveBannerLine` and the `LineCells` type, which stay on viewer-core — they are glyph/render exports).

**Files:**
- Modify: `cli/shell/src/banner-state.ts`

Steps:

- [ ] In `cli/shell/src/banner-state.ts`, remove `polarityOf` from the `@hexagram/viewer-core` import block (orig. lines 13–17) and add a dedicated core import. Before:

```ts
import type { Hexagram, Line } from '@hexagram/core/types'
import {
  deriveBannerLine,
  polarityOf,
  type LineCells,
} from '@hexagram/viewer-core'
```

After (drop `polarityOf` from the viewer-core block; add the core import alphabetically before `@hexagram/core/types`):

```ts
import { polarityOf } from '@hexagram/core/line-semantics'
import type { Hexagram, Line } from '@hexagram/core/types'
import { deriveBannerLine, type LineCells } from '@hexagram/viewer-core'
```

- [ ] Run shell's tests and type-check:

```bash
pnpm --filter @hexagram/shell test
pnpm --filter @hexagram/shell type:check
```

Expected output: all tests pass; type-check exits 0.

- [ ] Commit:

```bash
git add cli/shell/src/banner-state.ts
git commit -m "$(cat <<'EOF'
shell: import polarityOf directly from @hexagram/core

Repoint the banner state machine's polarity classifier off the viewer-core
barrel onto @hexagram/core/line-semantics. deriveBannerLine and LineCells
stay on viewer-core (glyph/render layer).

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 7: Repoint `cli/playground-ui` — delete its line-algebra copies and STOP re-exporting them

`cli/playground-ui/src/playground-lines.ts` defines `cycleLineForward`, `cycleLineBackward`, `flipPolarity`, `movingLineIndices` (and the `CYCLE_FORWARD` const) and imports `isMovingLine` from `@hexagram/viewer-core`. All four functions (and `isMovingLine`'s usage) move to / source from core. `setLineAt`, `INITIAL_HEXAGRAM`, `buildPlaygroundDerivation`, and the `PlaygroundDerivation` type stay (playground-specific, not pure Line algebra). The barrel currently forwards the four moved functions; that passthrough is **removed**. Every in-package consumer (`playground-state.ts`, `playground-display-rows.ts`, `index.ts`) and the test files import the moved functions DIRECTLY from `@hexagram/core/line-semantics`.

**Files:**
- Modify: `cli/playground-ui/src/playground-lines.ts`
- Modify: `cli/playground-ui/src/playground-state.ts`
- Modify: `cli/playground-ui/src/playground-display-rows.ts`
- Modify: `cli/playground-ui/src/index.ts`
- Modify: `cli/playground-ui/tests/playground-lines.test.ts`

Steps:

- [ ] In `cli/playground-ui/src/playground-lines.ts`, delete the `viewer-core` `isMovingLine` import (orig. line 15) and the four function definitions now living in core — `cycleLineForward` (orig. ~lines 26–34), `cycleLineBackward` (orig. ~36–47), `flipPolarity` (orig. ~52–66), `movingLineIndices` (orig. ~69–78) — along with the `CYCLE_FORWARD` const (orig. ~line 20) which now lives in core. Replace the imports so the file imports `isMovingLine` and `movingLineIndices` from core (the surviving `buildPlaygroundDerivation` calls `movingLineIndices`). The barrel/state/tests no longer import the moved functions from this module, so it re-exports NOTHING new. Before (imports, orig. lines 13–15):

```ts
import { getEmergingHexagram } from '@hexagram/core/getters'
import type { Hexagram, Line } from '@hexagram/core/types'
import { isMovingLine } from '@hexagram/viewer-core'
```

After:

```ts
import { getEmergingHexagram } from '@hexagram/core/getters'
import { movingLineIndices } from '@hexagram/core/line-semantics'
import type { Hexagram, Line } from '@hexagram/core/types'
```

  > Note: `isMovingLine` is dropped from this file's imports entirely — the only caller of `isMovingLine` here was the local `movingLineIndices`, which is now deleted (core's version uses core's `isMovingLine` internally). `buildPlaygroundDerivation` keeps calling `movingLineIndices` — now the core import. `Line` is still imported because `setLineAt`'s `next: Line` parameter uses it; keep the `@hexagram/core/types` import. Do NOT add any `export { ... }` re-export of the moved functions — the passthrough is removed.

- [ ] In `cli/playground-ui/src/playground-state.ts`, repoint the three moved functions it imports. The reducer imports `cycleLineBackward`, `cycleLineForward`, `flipPolarity` from `./playground-lines.js` alongside `INITIAL_HEXAGRAM`, `setLineAt` (orig. import block lines 34–40). Split that: the three moved functions come from core; `INITIAL_HEXAGRAM` and `setLineAt` stay on the local module. Before:

```ts
import type { Hexagram, Line } from '@hexagram/core/types'

import {
  cycleLineBackward,
  cycleLineForward,
  flipPolarity,
  INITIAL_HEXAGRAM,
  setLineAt,
} from './playground-lines.js'
```

After:

```ts
import {
  cycleLineBackward,
  cycleLineForward,
  flipPolarity,
} from '@hexagram/core/line-semantics'
import type { Hexagram, Line } from '@hexagram/core/types'

import { INITIAL_HEXAGRAM, setLineAt } from './playground-lines.js'
```

- [ ] In `cli/playground-ui/src/playground-display-rows.ts`, repoint `isMovingLine` and `polarityOf` — both are currently inside the `@hexagram/viewer-core` import block (orig. lines 3–12, `isMovingLine` on line 8, `polarityOf` on line 11). Remove them from that block and import both from core. Before:

```ts
import type { Hexagram, Line } from '@hexagram/core/types'
import { MOVING_ARROW, STATIC_GAP } from '@hexagram/readout'
import {
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  deriveBannerLine,
  isMovingLine,
  NORMAL,
  NORMAL_GREY,
  polarityOf,
} from '@hexagram/viewer-core'
```

After (drop `isMovingLine` and `polarityOf` from the viewer-core block; add the core import alphabetically before `@hexagram/core/types`):

```ts
import { isMovingLine, polarityOf } from '@hexagram/core/line-semantics'
import type { Hexagram, Line } from '@hexagram/core/types'
import { MOVING_ARROW, STATIC_GAP } from '@hexagram/readout'
import {
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  deriveBannerLine,
  NORMAL,
  NORMAL_GREY,
} from '@hexagram/viewer-core'
```

- [ ] In `cli/playground-ui/src/index.ts`, the barrel re-exports `cycleLineBackward`, `cycleLineForward`, `flipPolarity`, `movingLineIndices` from `./playground-lines.js` (orig. lines 22–31). Those four no longer live in `playground-lines.js`, so **remove them from this re-export block**. Keep `buildPlaygroundDerivation`, `INITIAL_HEXAGRAM`, `setLineAt`, `PlaygroundDerivation` (still defined locally). Before:

```ts
// Pure line helpers — exported so other tools (an alternative CLI, a web
// adapter) can drive the same cycle/flip/derivation logic.
export {
  buildPlaygroundDerivation,
  cycleLineBackward,
  cycleLineForward,
  flipPolarity,
  INITIAL_HEXAGRAM,
  movingLineIndices,
  setLineAt,
  type PlaygroundDerivation,
} from './playground-lines.js'
```

After:

```ts
// Pure line helpers — exported so other tools (an alternative CLI, a web
// adapter) can drive the same derivation logic. The pure Line algebra
// (cycle/flip/moving-index) now lives in @hexagram/core/line-semantics;
// import it from there directly.
export {
  buildPlaygroundDerivation,
  INITIAL_HEXAGRAM,
  setLineAt,
  type PlaygroundDerivation,
} from './playground-lines.js'
```

  > Note: this is a public-API surface change for `@hexagram/playground-ui` — it no longer forwards core's Line algebra. That is intentional: the web adapter and any other consumer import those from `@hexagram/core/line-semantics`, the authoritative home. No in-repo consumer imports these four from `@hexagram/playground-ui` (verify with the whole-repo grep in Task 9).

- [ ] In `cli/playground-ui/tests/playground-lines.test.ts`, repoint the four moved functions to core. The test imports `buildPlaygroundDerivation`, `cycleLineBackward`, `cycleLineForward`, `flipPolarity`, `INITIAL_HEXAGRAM`, `movingLineIndices`, `setLineAt` from `../src/playground-lines` (orig. lines 7–15). Split: the four moved functions from core; `buildPlaygroundDerivation`, `INITIAL_HEXAGRAM`, `setLineAt` stay local. Before:

```ts
import type { Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import {
  buildPlaygroundDerivation,
  cycleLineBackward,
  cycleLineForward,
  flipPolarity,
  INITIAL_HEXAGRAM,
  movingLineIndices,
  setLineAt,
} from '../src/playground-lines'
```

After:

```ts
import {
  cycleLineBackward,
  cycleLineForward,
  flipPolarity,
  movingLineIndices,
} from '@hexagram/core/line-semantics'
import type { Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import {
  buildPlaygroundDerivation,
  INITIAL_HEXAGRAM,
  setLineAt,
} from '../src/playground-lines'
```

  > Note: the cycle/flip/movingLineIndices behaviour these blocks assert is now also covered by `domain/core/tests/line-semantics.test.ts` (Task 1). Keeping the playground tests pointed at core verifies the repoint resolves; they may be trimmed in a later cleanup, but leave them here so this slice stays a pure move with no test-coverage loss. `playground-state.test.ts` and `playground-keymap.test.ts` exercise the reducer's `'flipPolarity'` *action* (not the function import) and need no change.

- [ ] Run playground-ui's tests and type-check:

```bash
pnpm --filter @hexagram/playground-ui test
pnpm --filter @hexagram/playground-ui type:check
```

Expected output: all tests pass; type-check exits 0.

- [ ] Commit:

```bash
git add cli/playground-ui/src/playground-lines.ts cli/playground-ui/src/playground-state.ts cli/playground-ui/src/playground-display-rows.ts cli/playground-ui/src/index.ts cli/playground-ui/tests/playground-lines.test.ts
git commit -m "$(cat <<'EOF'
playground-ui: source line algebra directly from @hexagram/core

Delete playground-ui's copies of cycleLineForward/Backward, flipPolarity,
and movingLineIndices (and the CYCLE_FORWARD order they shared); repoint
the reducer, display rows, barrel, and unit tests directly at
@hexagram/core/line-semantics — no passthrough through playground-lines.
The barrel no longer forwards the Line algebra. Playground-specific helpers
(setLineAt, buildPlaygroundDerivation, INITIAL_HEXAGRAM) stay.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 8: Repoint `domain/consultation-file` — delete the private `isMovingLine` and inline `hasMovingLines`

`domain/consultation-file/src/markdown-sections.ts` has a private `isMovingLine` (returns `boolean`). `domain/consultation-file/src/markdown.ts` has a private `hasMovingLines` with an inline `=== 6 || === 9`. Both are replaced by direct core imports.

**Files:**
- Modify: `domain/consultation-file/src/markdown-sections.ts`
- Modify: `domain/consultation-file/src/markdown.ts`

Steps:

- [ ] In `domain/consultation-file/src/markdown-sections.ts`, delete the private `isMovingLine` (orig. lines ~29–31) and import it from core. Add to the imports near the top (the file already imports types from `@hexagram/core/types` and from `@hexagram/core/getters`); insert the new import alphabetically — `@hexagram/core/line-semantics` sorts after `/getters` and before `/types`:

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

- [ ] In `domain/consultation-file/src/markdown.ts`, delete the private `hasMovingLines` (orig. lines ~12–14) and import it from core. Before:

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
hasMovingLines check; import both directly from @hexagram/core/line-semantics.
Rendered markdown body is byte-identical (fixtures unchanged).

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf
EOF
)"
```

---

## Task 9: Repoint `cli/history-ui` — delete the inline `=== 6 || === 9`

`cli/history-ui/src/history-list-transforms.ts` has an inline `hexagram.some((line) => line === 6 || line === 9)` inside `summarizeHexParts`.

**Files:**
- Modify: `cli/history-ui/src/history-list-transforms.ts`

Steps:

- [ ] In `cli/history-ui/src/history-list-transforms.ts`, import `hasMovingLines` directly from core and use it. Before (imports, orig. lines 4–6, and the inline check on line ~33):

```ts
import { getEmergingHexagram, getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/core/types'
import { truncateEnd } from '@hexagram/viewer-core'
```

After (add the core import alphabetically after `/getters` and before `/types`):

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

## Task 10: Whole-repo verification

Confirm nothing else still hand-rolls the moving-line rule or the moved functions, no consumer still imports them from a CLI barrel, and the whole build/test/type pipeline is green.

**Files:** none (verification only)

Steps:

- [ ] Confirm NO file still imports any of the seven moved symbols from a CLI barrel (`@hexagram/viewer-core` or `@hexagram/playground-ui`). Every import of these must now come from `@hexagram/core/line-semantics`. Run:

```bash
pnpm exec rg -n "import .*\b(isMovingLine|movingLineIndices|hasMovingLines|polarityOf|flipPolarity|cycleLineForward|cycleLineBackward)\b.*from '@hexagram/(viewer-core|playground-ui)'" .
```

  Expected: NO matches. If any line matches, repoint it to `@hexagram/core/line-semantics` before proceeding.

- [ ] Search for any remaining hand-rolled moving-line checks or stray local definitions. Run:

```bash
pnpm exec rg -n "=== 6 \|\| .*=== 9|=== 9 \|\| .*=== 6" domain cli 2>/dev/null || rg -n "=== 6 \|\| .*=== 9|=== 9 \|\| .*=== 6"
```

  Expected: the only remaining matches are the test-only checks in `cli/playground-ui/tests/playground-display.test.ts` and `cli/casting-ui/scripts/generate-fixtures.ts` (a build script that mirrors the readout's own gate; out of scope — it is not a production import path and is not in the brief's list), plus `domain/core/src/types.ts`'s `isLine` (a different rule — value-is-a-Line, not is-moving). Confirm no NEW production source (non-test, non-script) match remains. If `generate-fixtures.ts` still matches, that is acceptable for this slice; note it for a follow-up but do not expand scope here.

- [ ] Confirm there is exactly one definition of each moved function (in core):

```bash
pnpm exec rg -n "export function (isMovingLine|movingLineIndices|hasMovingLines|polarityOf|flipPolarity|cycleLineForward|cycleLineBackward)" .
```

  Expected: each name appears once, all in `domain/core/src/line-semantics.ts`.

- [ ] Run the full pipeline (type-check, then lint, then the whole test suite). Note the `@hexagram/core` slow distribution test (~40 s) runs here by design:

```bash
pnpm type:check
pnpm lint:check
pnpm test
```

Expected output: all three exit 0; every package's tests green; no unused-import or unresolved-import lint errors.

- [ ] If lint flags an unused `Line`/`Hexagram` import (or an unused `@hexagram/viewer-core` import line) left behind in any touched file, remove it and re-run `pnpm lint:check`. Then commit any cleanup:

```bash
git add -A
git commit -m "$(cat <<'EOF'
core: tidy imports after hoisting line semantics

Remove imports left unused once the duplicated Line algebra was deleted
from the UI packages and consumers were repointed at core.

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
- These duplicate/inline copies are deleted: `isMovingLine` in `cli/viewer-core/src/utils-validators.ts`; the private `isMovingLine` in `domain/consultation-file/src/markdown-sections.ts`; the inline `=== 6 || === 9` in `domain/consultation-file/src/markdown.ts` (`hasMovingLines`) and `cli/history-ui/src/history-list-transforms.ts`; and `polarityOf` / `flipPolarity` / `cycleLineForward` / `cycleLineBackward` / `movingLineIndices` across `cli/playground-ui/src/playground-lines.ts` and `cli/viewer-core/src/banner-lines.ts`.
- **Every consumer imports the moved symbols DIRECTLY from `@hexagram/core/line-semantics`** — no barrel passthrough. The repointed import sites are: `cli/readout/src/output-composers.ts` (`isMovingLine`), `cli/readout/src/output-sections.ts` (`isMovingLine`), `cli/casting-ui/src/output-composers.ts` (`isMovingLine`), `cli/shell/src/banner-state.ts` (`polarityOf`), `cli/playground-ui/src/playground-lines.ts` (`movingLineIndices`), `cli/playground-ui/src/playground-state.ts` (`cycleLineBackward` / `cycleLineForward` / `flipPolarity`), `cli/playground-ui/src/playground-display-rows.ts` (`isMovingLine` / `polarityOf`), `cli/playground-ui/tests/playground-lines.test.ts` (`cycleLineBackward` / `cycleLineForward` / `flipPolarity` / `movingLineIndices`), `cli/viewer-core/tests/banner-lines.test.ts` (`polarityOf`), `domain/consultation-file/src/markdown-sections.ts` (`isMovingLine`), `domain/consultation-file/src/markdown.ts` (`hasMovingLines`), `cli/history-ui/src/history-list-transforms.ts` (`hasMovingLines`).
- The barrels NO LONGER re-export these symbols: `cli/viewer-core/src/index.ts` drops `isMovingLine` (from the validators block) and `polarityOf` (from the banner-lines block); `cli/playground-ui/src/index.ts` drops `cycleLineBackward` / `cycleLineForward` / `flipPolarity` / `movingLineIndices`; `cli/viewer-core/src/banner-lines.ts` no longer re-exports `polarityOf` (it keeps re-exporting the `LinePolarity` *type* for `deriveBannerLine`).
- `cli/viewer-core` still imports `@hexagram/core` for the `Line` type and `type LinePolarity` (for `deriveBannerLine`'s signature) only.
- Glyphs and labels are untouched (Slice 3).
- No file imports any of the seven moved symbols from `@hexagram/viewer-core` or `@hexagram/playground-ui` (verified by the Task 10 grep).
- `pnpm type:check`, `pnpm lint:check`, `pnpm test` all pass.
