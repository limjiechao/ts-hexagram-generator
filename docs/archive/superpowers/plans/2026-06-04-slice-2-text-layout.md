# Slice 2: Consolidate Text-Layout Helpers into @hexagram/text-layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the duplicated CJK-aware column-width helpers (`visualWidth`, `padToColumn`, `padStartVisual`, `centerVisual`) into one new leaf domain package `@hexagram/text-layout`, and replace every verbatim copy with an import of it.

**Architecture:** `visualWidth` and its padding companions are generic Unicode text math, not divination domain — so they do not belong in `@hexagram/core` (core = domain knowledge). But `domain/consultation-file` consumes them, and a domain package may not depend on a cli package, so the helper cannot live under `cli/readout`. The minimal resolution is a small leaf package `domain/text-layout` (`@hexagram/text-layout`) that no one in the workspace depends on yet, sitting at the bottom of the DAG. (Alternative considered: fold these four functions into `@hexagram/core` directly — rejected per the shared slice decision to keep core strictly divination-domain; proceeding with the dedicated package.)

**Tech Stack:** TypeScript, vitest, tsdown, pnpm workspaces

---

## Preconditions & assumptions

This plan ASSUMES **Slices 0 and 1 are already merged**. Concretely:

- The workspace has been reorganised so library packages live under `domain/*` and `cli/*` (not `packages/*`). The relevant post-reorg paths this plan touches are:
  - `domain/text-layout` (NEW — created here)
  - `domain/consultation-file/src/markdown-sections.ts` (was `packages/consultation-file/src/markdown-sections.ts`)
  - `cli/readout/src/layout-utils.ts` (was `packages/readout/src/layout-utils.ts`)
  - `cli/readout/tests/layout-utils.test.ts`
  - `cli/playground-ui/src/playground-display-text.ts` (was `packages/playground-ui/src/playground-display-text.ts`)
- `pnpm-workspace.yaml` already globs `domain/*` and `cli/*` (Slice 0). If your worktree still globs only `packages/*`, STOP — Slice 0 has not landed and this plan's paths will not resolve.
- The boundary lint introduced in Slice 0 is green and enforces `cli → domain` legal, `domain → cli` illegal. `text-layout` is a domain package, so: cli consumers importing it (cli→domain) is legal, and `consultation-file` importing it (domain→domain) is legal. This plan must keep that lint green.

> **If you are running this against the pre-reorg tree** (paths still under `packages/`), do not improvise a translation. Pause and confirm with the human that Slices 0/1 are merged.

## Inventory of the duplication (confirmed by reading the real source)

Three verbatim copies of the **`visualWidth`** Unicode-range body exist (identical logic; only local variable names differ — `character`/`codePoint` vs `ch`/`cp`):

1. `cli/readout/src/layout-utils.ts` — exports `visualWidth`, `padToColumn`, `padStartVisual`, `centerVisual` (this file contains **only** these four functions).
2. `domain/consultation-file/src/markdown-sections.ts` — has all four as **module-private** functions (`visualWidth` uses `ch`/`cp` naming).
3. `cli/playground-ui/src/playground-display-text.ts` — exports `visualWidth` (verbatim, `character`/`codePoint` naming) **alongside** unrelated helpers `plainVisualWidth`, `padRightToWidth`, `padCellToWidth`, `capitalizeFirst`. It does **not** define `padToColumn` / `padStartVisual` / `centerVisual`.

The canonical implementation chosen for the new package is the **`cli/readout/src/layout-utils.ts`** version verbatim (`character`/`codePoint` naming + the doc comment).

Out of scope for this slice (do NOT move them): `plainVisualWidth`, `padRightToWidth`, `padCellToWidth`, `capitalizeFirst` in playground, and `plainVisualWidth`/`padRightToWidth`/`padCellToWidth`/`capitalizeFirst` siblings — they are different knowledge (ANSI-stripping, right-padding to a width, capitalisation). Only `visualWidth` is shared with `text-layout`; after this slice `playground-display-text.ts` re-exports `visualWidth` from `@hexagram/text-layout` and keeps its own siblings (which call the imported `visualWidth`).

Test copies that ALSO inline `visualWidth` and are intentionally left as-is (they are deliberately decoupled test doubles, called out in their own comments): `cli/playground-ui/tests/playground-display.test.ts`, `cli/playground-ui/tests/top-half-width-invariant.test.ts`, `cli/playground-ui/scripts/measure-identity-stack-width.ts`. Leave them untouched — they are test/measurement scaffolding, not production knowledge, and coupling them to the new package is a separate decision. (Flag: if the human wants zero copies anywhere, that is a follow-up.)

---

## Task 1: Scaffold the `@hexagram/text-layout` package (failing tests first)

**Files:**
- Create: `domain/text-layout/package.json`
- Create: `domain/text-layout/tsconfig.json`
- Create: `domain/text-layout/tsdown.config.ts`
- Create: `domain/text-layout/vitest.config.ts`
- Test: `domain/text-layout/tests/text-layout.test.ts`
- Create: `domain/text-layout/src/index.ts` (stub that makes tests RED first)

Steps:

- [ ] Create the package directory: `mkdir -p domain/text-layout/src domain/text-layout/tests`

- [ ] Create `domain/text-layout/package.json` (exports pattern with `source`/`types`/`import` conditions, mirroring `viewer-core` — single `.` entry; no runtime deps because this is pure string math):

```json
{
  "name": "@hexagram/text-layout",
  "type": "module",
  "version": "0.0.0",
  "description": "CJK-aware terminal column-width helpers for the Yijing hexagram oracle: visual width measurement and width-aware padding/centring of fixed-width text diagrams",
  "license": "MIT",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsdown",
    "test": "cross-env FORCE_COLOR=1 vitest run --passWithNoTests",
    "type:check": "tsc --noEmit"
  }
}
```

- [ ] Create `domain/text-layout/tsconfig.json` (same two-line extend pattern every package uses):

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "tests"]
}
```

- [ ] Create `domain/text-layout/tsdown.config.ts` (single entry, node platform — identical to `viewer-core`/`readout`):

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'node',
})
```

- [ ] Create `domain/text-layout/vitest.config.ts` (shared base extension, identical to `viewer-core`):

```ts
import { defineConfig } from 'vitest/config'

import { extendVitestBaseConfig } from '../../vitest.config.base'

export default extendVitestBaseConfig(defineConfig({}))
```

- [ ] Create a deliberately-empty stub so the test fails to import (RED): `domain/text-layout/src/index.ts`

```ts
// Stub — implementations land in Task 2. Tests should fail to resolve these
// exports until then.
export {}
```

- [ ] Write the unit tests FIRST in `domain/text-layout/tests/text-layout.test.ts`. These cases are derived from the real implementation's Unicode ranges (CJK ideographs 0x4e00–0x9fff, fullwidth punctuation 0xff01–0xff60, Hangul 0xac00–0xd7af) plus ASCII, empty-string, and a combining-mark case. NOTE on the combining case: the real `visualWidth` iterates by code point and counts every non-fullwidth code point as width 1 — combining marks (e.g. U+0301) are NOT special-cased, so `'e' + U+0301` measures as **2**. The test pins that ACTUAL behaviour (it is a known limitation, not a bug to fix in this slice):

```ts
import { describe, expect, it } from 'vitest'

import {
  centerVisual,
  padStartVisual,
  padToColumn,
  visualWidth,
} from '../src/index.js'

describe('visualWidth', () => {
  it('counts ASCII as one column each', () => {
    expect(visualWidth('abc')).toBe(3)
    expect(visualWidth('')).toBe(0)
  })
  it('counts CJK ideographs as two columns', () => {
    expect(visualWidth('巽')).toBe(2)
    expect(visualWidth('上6')).toBe(3)
    expect(visualWidth('乾坤')).toBe(4)
  })
  it('counts fullwidth punctuation as two columns', () => {
    // 0xff08/0xff09 are fullwidth parentheses used in the position labels.
    expect(visualWidth('（一）')).toBe(6)
  })
  it('counts Hangul syllables as two columns', () => {
    // 0xac00 '가' is in the AC00–D7AF fullwidth block.
    expect(visualWidth('가')).toBe(2)
  })
  it('does not special-case combining marks (counts each code point)', () => {
    // 'e' + COMBINING ACUTE ACCENT (U+0301) — two code points, each width 1.
    // This pins the function's real (limited) behaviour, not an ideal.
    expect(visualWidth(`e${String.fromCodePoint(0x0301)}`)).toBe(2)
  })
})

describe('padToColumn', () => {
  it('pads to targetColumn with at least the default minGap of 1', () => {
    expect(padToColumn('ab', 5)).toBe('ab   ')
  })
  it('honours an explicit minGap when already at/over the target', () => {
    expect(padToColumn('abcde', 5, 2)).toBe('abcde  ')
  })
  it('measures width CJK-aware when computing the gap', () => {
    // '巽' is width 2, target 5 -> 3 trailing spaces.
    expect(padToColumn('巽', 5)).toBe('巽   ')
  })
})

describe('padStartVisual', () => {
  it('right-aligns within the visual width', () => {
    expect(padStartVisual('ab', 5)).toBe('   ab')
  })
  it('clamps to zero padding when text already exceeds width', () => {
    expect(padStartVisual('abcde', 3)).toBe('abcde')
  })
})

describe('centerVisual', () => {
  it('centres within the visual width (extra space on the right)', () => {
    expect(centerVisual('ab', 6)).toBe('  ab  ')
    expect(centerVisual('ab', 5)).toBe(' ab  ')
  })
  it('clamps to zero padding when text already exceeds width', () => {
    expect(centerVisual('abcde', 3)).toBe('abcde')
  })
})
```

- [ ] Add the package to the install graph and confirm the test is RED (cannot resolve the four exports):

```bash
pnpm install
pnpm --filter @hexagram/text-layout test
```

Expected: vitest runs and FAILS — the import of `centerVisual`/`padStartVisual`/`padToColumn`/`visualWidth` from the empty stub errors (e.g. `No "centerVisual" export is defined` or all `expect`s fail). This proves the tests exercise the real module.

- [ ] Commit the RED scaffold:

```bash
git add domain/text-layout pnpm-lock.yaml
git commit -m "scaffold @hexagram/text-layout with failing width/pad tests

New leaf domain package to own the CJK-aware column helpers that are
currently copied verbatim across readout, consultation-file, and
playground-ui. Tests-first: they fail against the empty stub. The real
implementation (canonical copy from readout's layout-utils) lands next.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf"
```

---

## Task 2: Implement the canonical helpers (GREEN)

**Files:**
- Modify: `domain/text-layout/src/index.ts`

Steps:

- [ ] Replace the stub with the canonical implementation, copied verbatim from `cli/readout/src/layout-utils.ts` (the `character`/`codePoint` naming variant, with its doc comment). This is the single authoritative representation going forward:

```ts
/**
 * Compute the display width of a string, counting CJK and other fullwidth
 * characters as two columns and everything else as one. Used by
 * `padToColumn` to keep fixed-width diagrams aligned even when they contain
 * Chinese characters or fullwidth punctuation.
 */
export function visualWidth(text: string): number {
  let width = 0
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0
    const isFullwidth =
      (codePoint >= 0x1100 && codePoint <= 0x115f) ||
      (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
      (codePoint >= 0x3041 && codePoint <= 0x33ff) ||
      (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
      (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
      (codePoint >= 0xa000 && codePoint <= 0xa4cf) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff01 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    width += isFullwidth ? 2 : 1
  }
  return width
}

// Pad text to targetColumn with at least minGap spaces.
export function padToColumn(
  text: string,
  targetColumn: number,
  minGap = 1,
): string {
  return text + ' '.repeat(Math.max(minGap, targetColumn - visualWidth(text)))
}

/** Right-align `text` within `width` visual columns (CJK-aware). */
export function padStartVisual(text: string, width: number): string {
  return ' '.repeat(Math.max(0, width - visualWidth(text))) + text
}

/** Centre `text` within `width` visual columns (CJK-aware). */
export function centerVisual(text: string, width: number): string {
  const total = Math.max(0, width - visualWidth(text))
  const left = Math.floor(total / 2)
  return ' '.repeat(left) + text + ' '.repeat(total - left)
}
```

- [ ] Confirm GREEN and that the package type-checks and builds:

```bash
pnpm --filter @hexagram/text-layout test
pnpm --filter @hexagram/text-layout type:check
pnpm --filter @hexagram/text-layout build
```

Expected: all tests pass (4 describe blocks, all green); `tsc --noEmit` clean; `tsdown` emits `dist/index.mjs` + `dist/index.d.mts`.

- [ ] Commit GREEN:

```bash
git add domain/text-layout/src/index.ts
git commit -m "implement @hexagram/text-layout canonical width/pad helpers

Canonical copy of visualWidth/padToColumn/padStartVisual/centerVisual,
taken verbatim from readout's layout-utils. All Task 1 tests now pass.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf"
```

---

## Task 3: Point `cli/readout` at the new package

`cli/readout/src/layout-utils.ts` contains ONLY the four functions, and they are imported with the `.js` relative specifier by `casting-ledger.ts` (`centerVisual`, `padStartVisual`) and `output-sections.ts` (`padToColumn`). The cleanest reversible change is to turn `layout-utils.ts` into a thin re-export shim from `@hexagram/text-layout`, so every existing relative import keeps working untouched. (This keeps the diff tiny and one-pass reviewable; collapsing the indirection — rewriting each importer to import directly from `@hexagram/text-layout` and deleting the shim — is a clean optional follow-up, noted at the end.)

**Files:**
- Modify: `cli/readout/package.json` (add dep)
- Modify: `cli/readout/src/layout-utils.ts` (becomes a re-export shim)
- Modify: `cli/readout/tests/layout-utils.test.ts` (retarget import to the shim is unnecessary — it already imports `../src/layout-utils.js`, which still works; leave as-is so it now transitively asserts the shim re-exports correctly)

Steps:

- [ ] Add the dependency to `cli/readout/package.json`. Insert the workspace dep alphabetically into `dependencies` (after `@hexagram/core`, before `@hexagram/viewer-core`):

```json
    "@hexagram/core": "workspace:*",
    "@hexagram/text-layout": "workspace:*",
    "@hexagram/viewer-core": "workspace:*",
```

- [ ] Replace the entire body of `cli/readout/src/layout-utils.ts` with a re-export shim (delete the four implementations):

```ts
// The CJK-aware column helpers moved to @hexagram/text-layout (a leaf domain
// package) so domain packages can share them without importing a cli package.
// This shim re-exports them so existing relative `./layout-utils.js` importers
// in this package stay unchanged.
export {
  centerVisual,
  padStartVisual,
  padToColumn,
  visualWidth,
} from '@hexagram/text-layout'
```

- [ ] Reinstall to link the new dep, then verify the readout package end-to-end (its own width tests + the casting-ledger/output-sections consumers + fixtures must be byte-identical):

```bash
pnpm install
pnpm --filter @hexagram/readout test
pnpm --filter @hexagram/readout type:check
```

Expected: `tests/layout-utils.test.ts` passes (now exercising the shim → text-layout), all other readout tests pass unchanged, type-check clean. Because the implementation is byte-identical, no fixture should change.

- [ ] Commit:

```bash
git add cli/readout/package.json cli/readout/src/layout-utils.ts pnpm-lock.yaml
git commit -m "readout: source width helpers from @hexagram/text-layout

layout-utils.ts is now a re-export shim over the new domain package;
the four implementations are deleted (single authoritative copy now
lives in text-layout). Relative './layout-utils.js' importers are
unchanged. cli -> domain dependency is legal under the boundary lint.

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf"
```

---

## Task 4: De-duplicate `domain/consultation-file/src/markdown-sections.ts`

This file defines all four helpers as **module-private** functions (the `ch`/`cp` naming variant) and uses them in `castingMarkdownSection` and `transformationMarkdownSection`. Replace the private definitions with a top-of-file import from `@hexagram/text-layout`. The call sites stay identical. This is domain→domain — legal under the boundary lint.

**Files:**
- Modify: `domain/consultation-file/package.json` (add dep)
- Modify: `domain/consultation-file/src/markdown-sections.ts` (delete 4 private fns, add import)

Steps:

- [ ] Add the dependency to `domain/consultation-file/package.json`. Insert alphabetically into `dependencies` (after `@hexagram/core`, before `dayjs`):

```json
    "@hexagram/core": "workspace:*",
    "@hexagram/text-layout": "workspace:*",
    "dayjs": "^1.11.20",
```

- [ ] In `domain/consultation-file/src/markdown-sections.ts`, add the import. The current top of the file imports from `@hexagram/core/...`; add the text-layout import alongside (place it after the core imports, before the `// `✕` U+2715` comment block):

```ts
import { deriveSplit } from '@hexagram/core/casting-derivation'
import {
  getEmergingHexagram,
  getHexagramRecord,
  getTrigramRecord,
} from '@hexagram/core/getters'
import type { CastingRecord, Hexagram, Line } from '@hexagram/core/types'
import {
  centerVisual,
  padStartVisual,
  padToColumn,
  visualWidth,
} from '@hexagram/text-layout'
```

- [ ] Delete the four private function definitions from `markdown-sections.ts`. Remove exactly these blocks (lines currently 33–62 and 73–75 in the pre-edit file):
  - the `function visualWidth(text: string): number { ... }` block,
  - the `function padStartVisual(text: string, width: number): string { ... }` block,
  - the `function centerVisual(text: string, width: number): string { ... }` block,
  - the `function padToColumn(text: string, targetColumn: number, minGap = 1): string { ... }` block.

  Leave everything else (`LINE_DIAGRAM`, `POSITION_LABELS`, `isMovingLine`, `LINE_LABELS`, `LEDGER_COLUMNS`, and all the `*MarkdownSection`/`*Block` functions) untouched — the imported names are drop-in replacements at every call site. NOTE: `visualWidth` is imported even though `markdown-sections.ts` does not call it directly today; the other three (`centerVisual`, `padStartVisual`, `padToColumn`) call it internally. Import only the three actually referenced to keep the import minimal:

```ts
import {
  centerVisual,
  padStartVisual,
  padToColumn,
} from '@hexagram/text-layout'
```

  (Drop `visualWidth` from the import list — grep `markdown-sections.ts` for `visualWidth` after deleting the local def; if there are zero remaining references, do not import it, to keep lint's no-unused-imports green.)

- [ ] Verify the consultation-file package — its `.md` save-output fixtures must remain byte-identical (the implementation is unchanged, only relocated):

```bash
pnpm install
pnpm --filter @hexagram/consultation-file test
pnpm --filter @hexagram/consultation-file type:check
```

Expected: all tests pass including the frontmatter+body fixture comparisons (no fixture drift), type-check clean.

- [ ] Commit:

```bash
git add domain/consultation-file/package.json domain/consultation-file/src/markdown-sections.ts pnpm-lock.yaml
git commit -m "consultation-file: use @hexagram/text-layout for column helpers

Delete the four module-private copies of visualWidth/padToColumn/
padStartVisual/centerVisual from markdown-sections and import them from
the new domain package. domain -> domain dependency, legal under the
boundary lint. Save-output fixtures unchanged (byte-identical math).

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf"
```

---

## Task 5: De-duplicate `visualWidth` in `cli/playground-ui`

`cli/playground-ui/src/playground-display-text.ts` exports `visualWidth` (verbatim) plus the unrelated `plainVisualWidth`, `padRightToWidth`, `padCellToWidth`, `capitalizeFirst`. Only `visualWidth` is shared knowledge. Replace its local definition with a re-export of the canonical one, and have `plainVisualWidth` keep using it (now the imported one). The module's public surface (the names it exports) is unchanged, so its tests and all consumers keep working.

**Files:**
- Modify: `cli/playground-ui/package.json` (add dep)
- Modify: `cli/playground-ui/src/playground-display-text.ts` (delete local `visualWidth`, re-export from text-layout)

Steps:

- [ ] Add the dependency to `cli/playground-ui/package.json`. Insert alphabetically into `dependencies` (after `@hexagram/readout`, before `@hexagram/viewer-core`):

```json
    "@hexagram/readout": "workspace:*",
    "@hexagram/text-layout": "workspace:*",
    "@hexagram/viewer-core": "workspace:*",
```

- [ ] Edit `cli/playground-ui/src/playground-display-text.ts`: delete the local `visualWidth` function (lines currently 7–26) and its leading comment block (lines 1–5), and replace with a re-export import. The file becomes:

```ts
// CJK-aware width measurement now lives in @hexagram/text-layout. Re-exported
// here so this module keeps its existing public surface; the ANSI-stripping
// and padding siblings below build on the shared `visualWidth`.
export { visualWidth } from '@hexagram/text-layout'

import { visualWidth } from '@hexagram/text-layout'

const ANSI_PATTERN = /\[[0-9;]*m/g

export function plainVisualWidth(text: string): number {
  return visualWidth(text.replace(ANSI_PATTERN, ''))
}

export function padRightToWidth(row: string, target: number): string {
  const gap = target - plainVisualWidth(row)
  return gap > 0 ? `${row}${' '.repeat(gap)}` : row
}

// Pad an already-coloured cell to `target` display cols. ANSI codes are
// zero-width, so we measure only the plain content.
export function padCellToWidth(cell: string, target: number): string {
  const gap = target - plainVisualWidth(cell)
  return gap > 0 ? `${cell}${' '.repeat(gap)}` : cell
}

export function capitalizeFirst(text: string): string {
  if (text.length === 0) return text
  return `${text[0]!.toUpperCase()}${text.slice(1)}`
}
```

  NOTE: a `re-export` plus a separate `import` of the same name is intentional — `export { visualWidth } from '...'` does NOT bind the name into the module scope, so `plainVisualWidth` still needs the explicit `import`. If the repo's lint flags the dual statement, collapse to one form: `import { visualWidth } from '@hexagram/text-layout'` followed by `export { visualWidth }`. Pick whichever oxlint/eslint accepts (verify in the lint step below); the behaviour is identical.

- [ ] Verify the playground package. Its `playground-display-text.test.ts` imports `visualWidth` from `../src/playground-display-text` and asserts `visualWidth('巽') === 2`, plus `plainVisualWidth` ANSI-stripping — both must still pass. The width-invariant tests and the in-test `visualWidth` doubles are unaffected (intentionally left duplicated):

```bash
pnpm install
pnpm --filter @hexagram/playground-ui test
pnpm --filter @hexagram/playground-ui type:check
```

Expected: all playground tests pass; type-check clean.

- [ ] Commit:

```bash
git add cli/playground-ui/package.json cli/playground-ui/src/playground-display-text.ts pnpm-lock.yaml
git commit -m "playground-ui: re-export visualWidth from @hexagram/text-layout

Drop playground-display-text's verbatim visualWidth copy; re-export the
shared one and let plainVisualWidth build on it. The module's public
surface is unchanged. The in-test visualWidth doubles are left as-is
(deliberately decoupled scaffolding).

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf"
```

---

## Task 6: Whole-workspace verification (boundary lint stays green)

**Files:** none (verification only)

Steps:

- [ ] Confirm there are no remaining PRODUCTION copies of the four function bodies. Search and read each hit — the only definitions of `visualWidth` etc. should be in `domain/text-layout/src/index.ts`; everything else should be an `import`/`export ... from '@hexagram/text-layout'` or an intentional in-test/in-script double:

```bash
pnpm exec rg -n "function visualWidth|function padToColumn|function centerVisual|function padStartVisual" domain cli
```

Expected hits: exactly one `function visualWidth` / `function padToColumn` / `function padStartVisual` / `function centerVisual` in `domain/text-layout/src/index.ts`; plus the deliberately-left test doubles under `cli/playground-ui/tests/*` and `cli/playground-ui/scripts/measure-identity-stack-width.ts`. NO `function visualWidth` should remain in `cli/readout/src/layout-utils.ts`, `domain/consultation-file/src/markdown-sections.ts`, or `cli/playground-ui/src/playground-display-text.ts`.

- [ ] Run the full build (topological — proves the new package slots into the DAG and every consumer resolves it), the full test suite, type-check, lint, and format across the workspace:

```bash
pnpm build
pnpm type:check
pnpm test
pnpm lint:check
pnpm format:check
```

Expected: all green. In particular `pnpm lint:check` must pass the **Slice 0 boundary rule** — `text-layout` is domain; `cli/readout` and `cli/playground-ui` importing it are cli→domain (legal); `consultation-file` importing it is domain→domain (legal). If the boundary lint reports a violation, the package was created in the wrong tier (it must be under `domain/`, not `cli/`) — fix the location, do not relax the rule.

- [ ] If `pnpm format:check` flags the new files, run `pnpm format:fix` and re-run `format:check`, then amend the relevant commit.

- [ ] Final verification commit (only if any formatting/lint touch-ups were needed; otherwise skip):

```bash
git add -A
git commit -m "slice 2: formatting/lint touch-ups for text-layout extraction

https://claude.ai/code/session_013psvyKdKysvpzsYwcwFSMf"
```

---

## Done criteria

- `@hexagram/text-layout` exists under `domain/text-layout` with exactly the four exports `visualWidth`, `padToColumn`, `padStartVisual`, `centerVisual`, its own passing unit tests (CJK + ASCII + fullwidth-punctuation + Hangul + combining-mark + padding/centring cases), and a `package.json` using the `source`/`types`/`import` exports conditions.
- The three production copies are gone: `cli/readout/src/layout-utils.ts` is a re-export shim, `domain/consultation-file/src/markdown-sections.ts` imports the helpers, `cli/playground-ui/src/playground-display-text.ts` re-exports `visualWidth`.
- `pnpm build && pnpm test && pnpm type:check && pnpm lint:check && pnpm format:check` are all green; no fixtures drifted (the math is byte-identical).
- The Slice 0 boundary lint is still green.

## Reversibility & optional follow-ups (not in scope)

- Reversibility: each consumer change is a small, isolated diff over an unchanged implementation; reverting any single commit restores the prior local copy. The byte-identical math means no behavioural risk.
- Optional follow-up A: collapse the `cli/readout/src/layout-utils.ts` shim — rewrite `casting-ledger.ts` / `output-sections.ts` to import directly from `@hexagram/text-layout` and delete the shim + its test (or retarget the test). Left out here to keep this slice's diff minimal and reviewable.
- Optional follow-up B: couple the playground in-test `visualWidth` doubles (`tests/playground-display.test.ts`, `tests/top-half-width-invariant.test.ts`, `scripts/measure-identity-stack-width.ts`) to `@hexagram/text-layout` if the human wants literally zero copies anywhere. They are intentionally decoupled scaffolding today.
- Alternative design (rejected per shared decision): fold the four helpers into `@hexagram/core`. Cheaper (no new package) but dilutes "core = divination domain"; the dedicated leaf package keeps the domain boundary crisp.
```
