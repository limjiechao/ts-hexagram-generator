# Split Over-Long Files (candidates #1–#4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split four over-long source files into focused, single-responsibility siblings — a pure structural move with zero behaviour change — and mirror each split in the test layout.

**Architecture:** Four independent **tracks**, one per package, with disjoint file sets so they run fully in parallel. Each track extracts cohesive units into flat sibling files under the package's `src/` (and `tests/`), repoints consumers directly (no barrels / no re-export façades), and verifies per-package before a final whole-repo gate.

**Tech Stack:** TypeScript (ESM, `--isolatedDeclarations`), pnpm workspaces + Turborepo, Vitest, Ink/React, tsdown.

---

## Conventions for every task in this plan (read first)

These are refactors, not new features. The discipline is **move declarations verbatim**:

1. **Verbatim move.** When a task says "move lines A–B (`symbolName`)", cut that declaration _including its leading comment block_ and paste it unchanged. Do NOT reword comments, reflow ANSI string literals, or change `[...]` byte content. The only permitted edits are (a) import statements, (b) reordering for the stepdown rule, (c) adding type annotations required by `--isolatedDeclarations`.
2. **No barrels / no façades.** The kept file keeps only what it genuinely owns. Each consumer is updated to import directly from the new owning module. Never add `export … from './new-file.js'` to bridge old import paths.
3. **Identical symbol names.** Exported names never change. Only import _paths_ change.
4. **`--isolatedDeclarations`.** A newly-_exported_ `const` whose initializer is an expression (e.g. `A + 2`, `Math.max(...)`, a reference to another const) needs an explicit type annotation (`: number`). Literal initializers (`= 17`) are fine. Each task flags the specific consts.
5. **Fixtures must NOT drift.** A correct move needs **no** `pnpm generate-fixtures`. The `--plain` fixtures (`packages/casting-ui/tests/fixtures/`), the `.md` save fixtures (`packages/consultation-file/tests/fixtures/`), and the byte-identity test in `packages/casting-ui/tests/viewer.test.tsx` must stay green untouched. If any fixture test fails, the move was not behaviour-preserving — revert and investigate, do **not** regenerate.
6. **Test imports use no `.js` suffix** in this repo (e.g. `from '../src/manual-diagram'`); **source imports use `.js`** (e.g. `from './manual-diagram.js'`). Match the file you are editing.
7. **`stripAnsi` helper.** `packages/casting-ui/tests/helpers/ansi.ts` already exports `stripAnsi`; new casting-ui test files import it from `./helpers/ansi`. Other packages' new tests define/extract as noted per track.

---

## Parallelization model

| Track | Package                   | File split              | Touches files in other packages? | Race-prone?   |
| ----- | ------------------------- | ----------------------- | -------------------------------- | ------------- |
| **A** | `@hexagram/casting-ui`    | `manual-diagram.ts`     | No                               | No            |
| **B** | `@hexagram/readout`       | `output-sections.ts`    | No                               | No            |
| **C** | `@hexagram/playground-ui` | `playground-display.ts` | No                               | No            |
| **D** | `@hexagram/history-ui`    | `history-list.tsx`      | No                               | **Yes (Ink)** |

The four tracks have **disjoint file sets** — no two tracks edit the same file. They can run concurrently. Two execution shapes:

- **Separate worktrees (true parallel):** create one git worktree per track off `claude/jolly-rubin-gCAj8` via the `superpowers:using-git-worktrees` skill; each agent works its track; merge all four back to `claude/jolly-rubin-gCAj8` (clean — no overlapping files). Then run the **Final Integration Gate**.
- **Single tree (sequential commits):** run tracks one after another on `claude/jolly-rubin-gCAj8`; each track's commits are self-contained.

Each track is scoped to fit a 100k-token agent budget: one source file (≤ 800 lines) + its direct consumers + per-package verification.

**Branch setup (once, before any track):**

- [ ] **Ensure the working branch exists**

Run:

```bash
git rev-parse --abbrev-ref HEAD
git checkout claude/jolly-rubin-gCAj8 2>/dev/null || git checkout -b claude/jolly-rubin-gCAj8
```

Expected: on `claude/jolly-rubin-gCAj8`.

- [ ] **Confirm a clean baseline**

Run: `pnpm install && pnpm --filter @hexagram/casting-ui --filter @hexagram/readout --filter @hexagram/playground-ui --filter @hexagram/history-ui test`
Expected: all four packages PASS before any change (records the green starting point).

---

# Track A — split `packages/casting-ui/src/manual-diagram.ts` (558 lines)

## File structure (after)

| File                                               | Owns                                                                             | Imports                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------- |
| `src/manual-diagram.ts` (kept, ~70 ln)             | Shared vocabulary + the full fixed-width **geometry cluster** + `manualTitleRow` | none                              |
| `src/manual-diagram-heap-cards.ts` (new, ~185 ln)  | LEFT/RIGHT heap-card builder + cell styling                                      | viewer-core, `string-width`, base |
| `src/manual-diagram-flow.ts` (new, ~75 ln)         | UNPARTED/COUNTED connectors + ledger + MISSING gauge                             | viewer-core, `string-width`, base |
| `src/manual-diagram-right-pane.ts` (new, ~95 ln)   | step dots + question panel + focused input box                                   | base                              |
| `src/manual-diagram-bottom-strip.ts` (new, ~90 ln) | feedback strip (editing/error/resolved)                                          | viewer-core, `string-width`       |

Dependency direction (acyclic): `heap-cards`, `flow`, `right-pane` → `manual-diagram.ts` (base); `bottom-strip` is a leaf. No builder imports another builder.

**Why the geometry stays in the base:** `DIAGRAM_WIDTH`/`LEFT_TEE_COL`/`RIGHT_TEE_COL` derive from `CARD_OUTER` which derives from `HEAP_CARD_INTERIOR`; `flow` needs the tee columns and `heap-cards` needs `HEAP_CARD_INTERIOR`, and `manual-prompt.tsx` needs `DIAGRAM_WIDTH`/`MANUAL_*`. Keeping the whole geometry cluster together in the base preserves vertical proximity and gives every builder a single base dependency.

### Task A1: Carve the base file down to vocabulary + geometry + `manualTitleRow`

**Files:**

- Modify: `packages/casting-ui/src/manual-diagram.ts`

- [ ] **Step 1: Delete everything that is moving out, keeping only the base.**

After this step `manual-diagram.ts` retains exactly these declarations (verbatim, in this order), and **nothing else**:

- `ManualFocusedField` (currently L16)
- `MANUAL_FIELD_ORDER` (L21–26)
- `manualTitleRow` (L34–41)
- `ManualDiagramState` (L58)
- the geometry block: `HEAP_CARD_INTERIOR` (L72), `HEAP_LABEL_COL_WIDTH` (L77), and the L297–326 geometry block (`CARD_OUTER`, `CARD_GAP`, `DIAGRAM_WIDTH`, `CARD_TEE_OFFSET`, `LEFT_TEE_COL`, `RIGHT_TEE_COL`, `READOUT_WIDTH`, `LEDGER_VALUE_END_COL`, `MANUAL_BODY_GAP`, `MANUAL_RIGHT_PANE_WIDTH`, `MANUAL_NATURAL_BODY_WIDTH`) — keep their comments.

Remove the file's top imports (`import { BOLD_GREEN, … } from '@hexagram/viewer-core'` and `import stringWidth …`) — the base needs no imports. `stepDotsRow` (L48–53) moves to right-pane (Task A4), so remove it here.

- [ ] **Step 2: Add `export` + `: number` to the geometry consts that other files now consume.**

These become cross-file exports and (being expressions) need annotations for `--isolatedDeclarations`:

```ts
export const HEAP_CARD_INTERIOR = 17
export const HEAP_LABEL_COL_WIDTH = 11
export const LEFT_TEE_COL: number = CARD_TEE_OFFSET
export const RIGHT_TEE_COL: number = CARD_OUTER + CARD_GAP + CARD_TEE_OFFSET
export const READOUT_WIDTH: number = 22
export const LEDGER_VALUE_END_COL: number = READOUT_WIDTH - 1
```

`CARD_OUTER`, `CARD_GAP`, `CARD_TEE_OFFSET` stay **non-exported** (only used inside the base to derive the above). `DIAGRAM_WIDTH`, `MANUAL_BODY_GAP`, `MANUAL_RIGHT_PANE_WIDTH`, `MANUAL_NATURAL_BODY_WIDTH` keep their existing `export`/annotations.

- [ ] **Step 3: Verify the base type-checks in isolation later (it will after the new files exist).** No command yet — proceed to A2.

### Task A2: Create `manual-diagram-heap-cards.ts`

**Files:**

- Create: `packages/casting-ui/src/manual-diagram-heap-cards.ts`

- [ ] **Step 1: Write the import header.**

```ts
import { BOLD_GREEN, BOLD_WHITE, NORMAL } from '@hexagram/viewer-core'
import stringWidth from 'string-width'

import {
  HEAP_CARD_INTERIOR,
  HEAP_LABEL_COL_WIDTH,
  type ManualDiagramState,
  type ManualFocusedField,
} from './manual-diagram.js'
```

- [ ] **Step 2: Move these declarations verbatim from the old `manual-diagram.ts`, in this order:**
      `TwoHeapDiagramRowsArgs` (L60–67), the field-palette consts `FIELD_DIM`/`FIELD_DIM_OFF`/`FIELD_CYAN`/`FIELD_FG_RESET` (L93–96), `inverseCell` (L100–103), `boldInputCell` (L109–111), `plainCell` (L114–116), `cellText` (L118–137), `CardCellArgs` (L143–154), `cardSeparatorRow` (L157–161), `buildCardRows` (L168–241), `twoHeapDiagramRows` (L256–295, `export`).

- [ ] **Step 3: Type-check.**

Run: `pnpm --filter @hexagram/casting-ui type:check`
Expected: may still error until A3/A4/A5 + A6 done (manual-prompt imports). That's fine — final check is A7.

### Task A3: Create `manual-diagram-flow.ts`

**Files:**

- Create: `packages/casting-ui/src/manual-diagram-flow.ts`

- [ ] **Step 1: Write the import header.**

```ts
import { BOLD_GREEN, BOLD_RED, NORMAL } from '@hexagram/viewer-core'
import stringWidth from 'string-width'

import {
  DIAGRAM_WIDTH,
  LEDGER_VALUE_END_COL,
  LEFT_TEE_COL,
  READOUT_WIDTH,
  RIGHT_TEE_COL,
} from './manual-diagram.js'
```

- [ ] **Step 2: Move verbatim, in this order:**
      `connectorRow` (L332–343), `ledgerRow` (L348–351), `flowHeaderRows` (L359–364, `export`), `MissingColor` (L368, `export`), `FlowFooterArgs` (L370–374), `MISSING_WRAP` (L384–388), `flowFooterRows` (L390–401, `export`).

### Task A4: Create `manual-diagram-right-pane.ts`

**Files:**

- Create: `packages/casting-ui/src/manual-diagram-right-pane.ts`

- [ ] **Step 1: Write the import header.**

```ts
import {
  MANUAL_FIELD_ORDER,
  type ManualDiagramState,
  type ManualFocusedField,
} from './manual-diagram.js'
```

- [ ] **Step 2: Move verbatim, in this order:**
      `stepDotsRow` (L48–53, `export`), `QuestionPanelRowsArgs` (L403–407), `questionLineForField` (L409–420), `questionPanelRows` (L430–441, `export`), `FocusedInputBoxRowsArgs` (L443–446), `focusedInputBoxRows` (L454–467, `export`).

### Task A5: Create `manual-diagram-bottom-strip.ts`

**Files:**

- Create: `packages/casting-ui/src/manual-diagram-bottom-strip.ts`

- [ ] **Step 1: Write the import header.**

```ts
import { BOLD_GREEN, BOLD_RED, NORMAL } from '@hexagram/viewer-core'
import stringWidth from 'string-width'
```

- [ ] **Step 2: Move verbatim, in this order:**
      `BottomStripErrorArgs` (L473–485), `BottomStripArgs` (L487–501, `export`), `zeroRemainderSide` (L503–507), `errorMessageText` (L509–516), `leftRightRow` (L520–529), `bottomStripRow` (L543–558, `export`).

### Task A6: Repoint the two consumers

**Files:**

- Modify: `packages/casting-ui/src/manual-prompt.tsx:6-23`
- Verify-only: `packages/casting-ui/src/casting-prompt-box.tsx`

- [ ] **Step 1: Replace the single `from './manual-diagram.js'` import block in `manual-prompt.tsx` (L6–23) with five imports:**

```ts
import {
  DIAGRAM_WIDTH,
  MANUAL_BODY_GAP,
  MANUAL_FIELD_ORDER,
  MANUAL_NATURAL_BODY_WIDTH,
  manualTitleRow,
  type ManualDiagramState,
  type ManualFocusedField,
} from './manual-diagram.js'
import { twoHeapDiagramRows } from './manual-diagram-heap-cards.js'
import {
  flowFooterRows,
  flowHeaderRows,
  type MissingColor,
} from './manual-diagram-flow.js'
import {
  focusedInputBoxRows,
  questionPanelRows,
  stepDotsRow,
} from './manual-diagram-right-pane.js'
import {
  bottomStripRow,
  type BottomStripArgs,
} from './manual-diagram-bottom-strip.js'
```

- [ ] **Step 2: Confirm `casting-prompt-box.tsx` needs NO change.** It imports only `type ManualFocusedField from './manual-diagram.js'`, which still lives in the base.

Run: `grep -n "manual-diagram" packages/casting-ui/src/casting-prompt-box.tsx`
Expected: still `import type { ManualFocusedField } from './manual-diagram.js'`.

### Task A7: Verify source + repoint, then commit

- [ ] **Step 1: Type-check + build + lint/format.**

Run:

```bash
pnpm --filter @hexagram/casting-ui type:check
pnpm lint:fix && pnpm format:fix
pnpm --filter @hexagram/casting-ui build
```

Expected: type:check PASS (if isolatedDeclarations complains about an exported const, add `: number` per Convention 4); build PASS.

- [ ] **Step 2: Run the casting-ui suite (proves fixtures + byte-identity unaffected).**

Run: `pnpm --filter @hexagram/casting-ui test`
Expected: PASS, including the `--plain` fixtures and the manual-vs-interactive byte-identity test. (Tests still import the moved builders from the old path — that's fixed in A8, so the `manual-diagram.test.tsx` file may fail to resolve here; if so, run only non-manual-diagram tests this step or proceed to A8 first, then re-run.)

- [ ] **Step 3: Commit the source split.**

```bash
git add packages/casting-ui/src
git commit -m "refactor(casting-ui): split manual-diagram.ts into heap-cards/flow/right-pane/bottom-strip"
```

### Task A8: Mirror the split in tests

**Files:**

- Modify: `packages/casting-ui/tests/manual-diagram.test.tsx`
- Create: `packages/casting-ui/tests/manual-diagram-heap-cards.test.tsx`
- Create: `packages/casting-ui/tests/manual-diagram-flow.test.tsx`
- Create: `packages/casting-ui/tests/manual-diagram-right-pane.test.tsx`
- Create: `packages/casting-ui/tests/manual-diagram-bottom-strip.test.tsx`

- [ ] **Step 1: In `manual-diagram.test.tsx`, keep ONLY the `manualTitleRow` describe block (current L16–27).** Move the other seven describe blocks out (Steps 2–5). Final imports:

```ts
import { describe, expect, it } from 'vitest'

import { manualTitleRow } from '../src/manual-diagram'
```

(If the `manualTitleRow` block uses `stringWidth`/`stripAnsi`, keep only the imports it actually references.)

- [ ] **Step 2: `manual-diagram-heap-cards.test.tsx`** — move the `twoHeapDiagramRows` describe (current L38–214). Header:

```ts
import stringWidth from 'string-width'
import { describe, expect, it } from 'vitest'

import { twoHeapDiagramRows } from '../src/manual-diagram-heap-cards'
import { stripAnsi } from './helpers/ansi'
```

- [ ] **Step 3: `manual-diagram-flow.test.tsx`** — move the `flowHeaderRows` (L215–234) and `flowFooterRows` (L235–289) describes. Header:

```ts
import { describe, expect, it } from 'vitest'

import { flowFooterRows, flowHeaderRows } from '../src/manual-diagram-flow'
import { stripAnsi } from './helpers/ansi'
```

- [ ] **Step 4: `manual-diagram-right-pane.test.tsx`** — move the `stepDotsRow` (L29–36), `questionPanelRows` (L290–351), `focusedInputBoxRows` (L352–374) describes. Header:

```ts
import { describe, expect, it } from 'vitest'

import {
  focusedInputBoxRows,
  questionPanelRows,
  stepDotsRow,
} from '../src/manual-diagram-right-pane'
import { stripAnsi } from './helpers/ansi'
```

- [ ] **Step 5: `manual-diagram-bottom-strip.test.tsx`** — move the `bottomStripRow` describe (L375–459). Header:

```ts
import stringWidth from 'string-width'
import { describe, expect, it } from 'vitest'

import { bottomStripRow } from '../src/manual-diagram-bottom-strip'
import { stripAnsi } from './helpers/ansi'
```

(Drop `stringWidth` if the block doesn't use it.)

- [ ] **Step 6: Run the full casting-ui suite + lint/format.**

Run:

```bash
pnpm lint:fix && pnpm format:fix
pnpm --filter @hexagram/casting-ui type:check
pnpm --filter @hexagram/casting-ui test
```

Expected: all PASS; five `manual-diagram*.test.tsx` files green; fixtures + byte-identity green.

- [ ] **Step 7: Commit the test split.**

```bash
git add packages/casting-ui/tests
git commit -m "test(casting-ui): mirror manual-diagram split across per-module test files"
```

- [ ] **Step 8: Confirm each new file is meaningfully shorter and single-purpose.**

Run: `wc -l packages/casting-ui/src/manual-diagram*.ts`
Expected: base ≤ ~90; each builder ≤ ~190; none re-introduces the multi-builder smell.

---

# Track B — split `packages/readout/src/output-sections.ts` (605 lines)

## File structure (after)

| File                                     | Owns                                                | Imports                                |
| ---------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| `src/layout-utils.ts` (new, ~45 ln)      | pure CJK width/padding helpers                      | none                                   |
| `src/casting-ledger.ts` (new, ~145 ln)   | casting ledger table builder                        | core, viewer-core, `./layout-utils.js` |
| `src/output-sections.ts` (kept, ~420 ln) | hexagram / transformation / query / lines renderers | core, viewer-core, `./layout-utils.js` |

Dependency direction (acyclic): `layout-utils` (leaf) ← `casting-ledger`, `output-sections`.

### Task B1: Create `layout-utils.ts` (pure seam)

**Files:**

- Create: `packages/readout/src/layout-utils.ts`
- Modify: `packages/readout/src/output-sections.ts`

- [ ] **Step 1: Create `layout-utils.ts` with these four functions moved verbatim** from `output-sections.ts`: `visualWidth` (L73–92), `padToColumn` (L95–97), `padStartVisual` (L100–102), `centerVisual` (L105–109). Add `export` to all four (currently module-private). No imports needed.

```ts
// (move the four functions here verbatim, each prefixed with `export`)
export function visualWidth(text: string): number {
  /* …verbatim… */
}
export function padToColumn(
  text: string,
  targetColumn: number,
  minGap = 1,
): string {
  /* … */
}
export function padStartVisual(text: string, width: number): string {
  /* … */
}
export function centerVisual(text: string, width: number): string {
  /* … */
}
```

- [ ] **Step 2: In `output-sections.ts`, delete the four functions (L73–109) and import them:**

```ts
import { centerVisual, padStartVisual, padToColumn } from './layout-utils.js'
```

(Only `padToColumn` is used by the hexagram/transformation renderers; `padStartVisual`/`centerVisual` move out with the ledger in B2, so after B2 this import in `output-sections.ts` narrows to just `padToColumn`. Keep all three for now; B2's type-check will tell you to trim.)

### Task B2: Create `casting-ledger.ts` (casting seam)

**Files:**

- Create: `packages/readout/src/casting-ledger.ts`
- Modify: `packages/readout/src/output-sections.ts`

- [ ] **Step 1: Create `casting-ledger.ts` import header.**

```ts
import { deriveSplit } from '@hexagram/core/casting-derivation'
import type {
  PartialCastingRecord,
  PartialSplitRecord,
} from '@hexagram/core/types'
import {
  BOLD_CYAN,
  BOLD_GREY,
  BOLD_WHITE,
  HEADING_GREY,
  NORMAL,
  NORMAL_GREY,
  PLACEHOLDER_GREY,
  YELLOW,
} from '@hexagram/viewer-core'

import { centerVisual, padStartVisual } from './layout-utils.js'
```

- [ ] **Step 2: Move verbatim from `output-sections.ts`, in this order:**
      `LINE_LABELS` (L115–122), `LEDGER_COLUMNS` (L268–281), `LEDGER_INDENT` (L283), `LEDGER_GUTTER` (L289), `castingSection` (L298–430, `export`).

- [ ] **Step 3: In `output-sections.ts`, delete those five declarations** (L115–122, L268–281, L283, L289, L298–430). Then trim the unused imports left behind: `LINE_LABELS` is gone, so any now-unused viewer-core symbols (`BOLD_CYAN`, `HEADING_GREY`, `PLACEHOLDER_GREY`, `YELLOW`) and `deriveSplit`, `PartialCastingRecord`, `PartialSplitRecord` should be removed from `output-sections.ts`'s imports if no longer referenced. Narrow the `./layout-utils.js` import to what remains used (`padToColumn`).

- [ ] **Step 4: Type-check readout.**

Run: `pnpm --filter @hexagram/readout type:check`
Expected: PASS after B3 repoints consumers (the `index.ts`/`output-composers.ts` still point at the old path until B3). If type:check is run now it may flag the consumers — proceed to B3.

### Task B3: Repoint consumers

**Files:**

- Modify: `packages/readout/src/output-composers.ts:8-17`
- Modify: `packages/readout/src/index.ts`

- [ ] **Step 1: In `output-composers.ts`, split the `from './output-sections.js'` import** so `castingSection` comes from the new module:

```ts
import { castingSection } from './casting-ledger.js'
import {
  emergingHexagramSection,
  hexagramTextSection,
  linesBlock,
  querySection,
  standingHexagramSection,
  transformationSection,
} from './output-sections.js'
```

- [ ] **Step 2: In `index.ts`, move `castingSection` to a new export line from `./casting-ledger.js`** and drop it from the `./output-sections.js` export block. The `./output-sections.js` block keeps `emergingHexagramSection, hexagramTextSection, linesBlock, MOVING_ARROW, POSITION_LABELS, querySection, standingHexagramSection, STATIC_GAP, transformationSection`. Add:

```ts
// Casting ledger table builder.
export { castingSection } from './casting-ledger.js'
```

(Public symbol names are unchanged, so `@hexagram/readout`'s external surface is identical — `casting-ui` and `playground-ui` are unaffected.)

### Task B4: Verify, mirror tests, commit

**Files:**

- Rename: `packages/readout/tests/casting-section.test.ts` → `packages/readout/tests/casting-ledger.test.ts`
- Create: `packages/readout/tests/layout-utils.test.ts`

- [ ] **Step 1: Rename the casting test and repoint its import.**

```bash
git mv packages/readout/tests/casting-section.test.ts packages/readout/tests/casting-ledger.test.ts
```

Then change its import line 7 from `'../src/output-sections.js'` to `'../src/casting-ledger.js'`.

- [ ] **Step 2: Add a focused `layout-utils.test.ts`** for the newly-public pure helpers:

```ts
import { describe, expect, it } from 'vitest'

import {
  centerVisual,
  padStartVisual,
  padToColumn,
  visualWidth,
} from '../src/layout-utils.js'

describe('layout-utils', () => {
  it('counts CJK as two columns', () => {
    expect(visualWidth('上6')).toBe(3)
    expect(visualWidth('abc')).toBe(3)
  })
  it('padToColumn pads with at least minGap', () => {
    expect(padToColumn('ab', 5)).toBe('ab   ')
    expect(padToColumn('abcde', 5, 2)).toBe('abcde  ')
  })
  it('padStartVisual right-aligns within visual width', () => {
    expect(padStartVisual('ab', 5)).toBe('   ab')
  })
  it('centerVisual centres within visual width', () => {
    expect(centerVisual('ab', 6)).toBe('  ab  ')
  })
})
```

- [ ] **Step 3: Run readout verification.**

Run:

```bash
pnpm lint:fix && pnpm format:fix
pnpm --filter @hexagram/readout type:check
pnpm --filter @hexagram/readout build
pnpm --filter @hexagram/readout test
```

Expected: all PASS.

- [ ] **Step 4: Cross-package smoke (readout feeds casting-ui plain fixtures + consultation-file `.md`).**

Run: `pnpm --filter @hexagram/casting-ui --filter @hexagram/consultation-file test`
Expected: PASS with **no fixture drift** (do NOT run `generate-fixtures`). If a fixture fails, the move changed bytes — revert and investigate.

- [ ] **Step 5: Commit.**

```bash
git add packages/readout
git commit -m "refactor(readout): extract layout-utils + casting-ledger from output-sections.ts"
```

- [ ] **Step 6: Length check.**

Run: `wc -l packages/readout/src/layout-utils.ts packages/readout/src/casting-ledger.ts packages/readout/src/output-sections.ts`
Expected: layout-utils ≤ ~50; casting-ledger ≤ ~150; output-sections ≤ ~430.

---

# Track C — split `packages/playground-ui/src/playground-display.ts` (421 lines)

## File structure (after)

| File                                               | Owns                                                        | Imports                                                    |
| -------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| `src/playground-display-geometry.ts` (new, ~70 ln) | all geometry constants                                      | none                                                       |
| `src/playground-display-text.ts` (new, ~45 ln)     | CJK width + ANSI-aware padding helpers                      | none                                                       |
| `src/playground-display-identity.ts` (new, ~40 ln) | `identityRows` data extraction                              | core/getters, `./playground-display-text.js`               |
| `src/playground-display-rows.ts` (new, ~165 ln)    | header / line / identity-stack / divider renderers          | geometry, text, identity, viewer-core, `@hexagram/readout` |
| `src/playground-display.ts` (kept, ~60 ln)         | `PlaygroundDisplayInputs/Output` + `buildPlaygroundDisplay` | geometry, text, rows                                       |

Dependency direction (acyclic): `geometry`(leaf), `text`(leaf) ← `identity` ← `rows` ← `playground-display.ts`.

### Task C1: Create `playground-display-geometry.ts`

**Files:**

- Create: `packages/playground-ui/src/playground-display-geometry.ts`
- Modify: `packages/playground-ui/src/playground-display.ts`

- [ ] **Step 1: Move verbatim** the geometry constants (L49–113) — `CHEVRON_WIDTH`, `BAR_BLOCK_WIDTH`, `LEFT_LINE_WIDTH`, `RIGHT_LINE_WIDTH`, `GAP_WIDTH`, `IDENTITY_STACK_WIDTH`, `RIGHT_IDENTITY_CELL_WIDTH`, `LEFT_IDENTITY_CELL_WIDTH`, `TOP_HALF_WIDTH`, `TOP_HALF_ROWS` — plus `IDENTITY_DIVIDER_WIDTH` (L317). No imports.

- [ ] **Step 2: Add `export` to the two currently-private consts and `IDENTITY_DIVIDER_WIDTH`** (the rows file needs them). They are expressions → annotate per `--isolatedDeclarations`:

```ts
export const RIGHT_IDENTITY_CELL_WIDTH: number = Math.max(
  RIGHT_LINE_WIDTH,
  IDENTITY_STACK_WIDTH,
)
export const LEFT_IDENTITY_CELL_WIDTH: number =
  LEFT_LINE_WIDTH + GAP_WIDTH - CHEVRON_WIDTH
export const IDENTITY_DIVIDER_WIDTH: number = BAR_BLOCK_WIDTH
```

(The already-exported `LEFT_LINE_WIDTH`/`RIGHT_LINE_WIDTH`/`TOP_HALF_WIDTH` already carry `: number`; `TOP_HALF_ROWS = 13` and the literal widths stay as-is.)

- [ ] **Step 3: In `playground-display.ts`, delete the moved consts (L49–113, L317).** Imports come together in C5.

### Task C2: Create `playground-display-text.ts`

**Files:**

- Create: `packages/playground-ui/src/playground-display-text.ts`

- [ ] **Step 1: Move verbatim** the width/padding helpers (L121–163): `visualWidth` (keep its existing `export`), `ANSI_PATTERN`, `plainVisualWidth`, `padRightToWidth`, `padCellToWidth`, `capitalizeFirst`. Add `export` to `plainVisualWidth`, `padRightToWidth`, `padCellToWidth`, `capitalizeFirst` (consumed by the rows/identity files). No imports. Keep the explanatory comment block (L115–119).

### Task C3: Create `playground-display-identity.ts`

**Files:**

- Create: `packages/playground-ui/src/playground-display-identity.ts`

- [ ] **Step 1: Import header.**

```ts
import { getHexagramRecord, getTrigramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/core/types'

import { capitalizeFirst } from './playground-display-text.js'
```

- [ ] **Step 2: Move `identityRows` verbatim (L388–421)** and add `export`.

### Task C4: Create `playground-display-rows.ts`

**Files:**

- Create: `packages/playground-ui/src/playground-display-rows.ts`

- [ ] **Step 1: Import header.**

```ts
import type { Hexagram, Line } from '@hexagram/core/types'
import { MOVING_ARROW, POSITION_LABELS, STATIC_GAP } from '@hexagram/readout'
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

import {
  BAR_BLOCK_WIDTH,
  CHEVRON_WIDTH,
  GAP_WIDTH,
  IDENTITY_DIVIDER_WIDTH,
  LEFT_IDENTITY_CELL_WIDTH,
  RIGHT_IDENTITY_CELL_WIDTH,
  TOP_HALF_WIDTH,
} from './playground-display-geometry.js'
import { identityRows } from './playground-display-identity.js'
import { padCellToWidth, padRightToWidth } from './playground-display-text.js'
```

- [ ] **Step 2: Move verbatim, in this order:** `buildHeaderRow` (L229–248), `LineRowInputs` (L254–261), `buildLineRow` (L263–307), `buildIdentityStack` (L319–372), `buildIdentityDivider` (L374–386). Add `export` to `buildHeaderRow`, `buildLineRow`, `buildIdentityStack` (consumed by `playground-display.ts`); `buildIdentityDivider` stays private to this file. `POSITION_LABELS` is referenced only inside `buildPlaygroundDisplay` (the loop), not in these helpers — confirm `buildLineRow` takes `positionLabel` as a param (it does), so the rows file needs `POSITION_LABELS` only if a moved helper references it; if none do, drop it from the header.

### Task C5: Reduce `playground-display.ts` to the orchestrator + repoint

**Files:**

- Modify: `packages/playground-ui/src/playground-display.ts`

- [ ] **Step 1: Final `playground-display.ts` import block** (replace the old viewer-core/readout/getters imports — the orchestrator only needs these):

```ts
import type { Hexagram, Line } from '@hexagram/core/types'
import { POSITION_LABELS } from '@hexagram/readout'

import { TOP_HALF_WIDTH } from './playground-display-geometry.js'
import {
  buildHeaderRow,
  buildIdentityStack,
  buildLineRow,
} from './playground-display-rows.js'
import { padRightToWidth } from './playground-display-text.js'
```

(`buildPlaygroundDisplay`'s loop uses `POSITION_LABELS`, `TOP_HALF_WIDTH`, `padRightToWidth`, and the three row builders. Keep the file's top doc-comment block L1–28.)

- [ ] **Step 2: Confirm the kept file contains only** `PlaygroundDisplayInputs` (L169–179), `PlaygroundDisplayOutput` (L181–186), `buildPlaygroundDisplay` (L194–223). `hexagram-display.tsx` imports `buildPlaygroundDisplay` from here — unchanged.

Run: `grep -n "playground-display" packages/playground-ui/src/hexagram-display.tsx`
Expected: `import { buildPlaygroundDisplay } from './playground-display.js'` (no change needed).

### Task C6: Verify, repoint tests, commit

**Files:**

- Modify: `packages/playground-ui/tests/playground-display.test.ts`
- Modify: `packages/playground-ui/tests/top-half-width-invariant.test.ts`
- Create: `packages/playground-ui/tests/playground-display-text.test.ts`

- [ ] **Step 1: Repoint geometry-const imports in the two existing tests.** In `playground-display.test.ts`, split the import so geometry consts come from the geometry module and `buildPlaygroundDisplay` stays from the main module:

```ts
import { buildPlaygroundDisplay } from '../src/playground-display'
import {
  BAR_BLOCK_WIDTH,
  CHEVRON_WIDTH,
  GAP_WIDTH,
  LEFT_LINE_WIDTH,
  TOP_HALF_ROWS,
  TOP_HALF_WIDTH,
} from '../src/playground-display-geometry'
```

In `top-half-width-invariant.test.ts`, change `from '../src/playground-display'` to `from '../src/playground-display-geometry'`.

- [ ] **Step 2: Grep for any other consumer of the moved geometry consts and repoint.**

Run:

```bash
grep -rn "from '../src/playground-display'" packages/playground-ui/tests
grep -rn "playground-display'" packages/playground-ui/src
```

Expected: only `hexagram-display.tsx` (buildPlaygroundDisplay) and the main test (buildPlaygroundDisplay) still reference `playground-display`; everything geometry-shaped points at `playground-display-geometry`.

- [ ] **Step 3: Add `playground-display-text.test.ts`** for the newly-public helpers:

```ts
import { describe, expect, it } from 'vitest'

import {
  capitalizeFirst,
  padRightToWidth,
  plainVisualWidth,
  visualWidth,
} from '../src/playground-display-text'

describe('playground-display-text', () => {
  it('visualWidth counts CJK as two', () => {
    expect(visualWidth('巽')).toBe(2)
  })
  it('plainVisualWidth ignores ANSI codes', () => {
    expect(
      plainVisualWidth(
        `${String.fromCodePoint(0x1b)}[36mab${String.fromCodePoint(0x1b)}[39m`,
      ),
    ).toBe(2)
  })
  it('padRightToWidth pads to target', () => {
    expect(padRightToWidth('ab', 5)).toBe('ab   ')
  })
  it('capitalizeFirst capitalizes', () => {
    expect(capitalizeFirst('wind')).toBe('Wind')
  })
})
```

- [ ] **Step 4: Run playground-ui verification.**

Run:

```bash
pnpm lint:fix && pnpm format:fix
pnpm --filter @hexagram/playground-ui type:check
pnpm --filter @hexagram/playground-ui build
pnpm --filter @hexagram/playground-ui test
```

Expected: all PASS (including `top-half-width-invariant` and the 64-hexagram test).

- [ ] **Step 5: Commit.**

```bash
git add packages/playground-ui
git commit -m "refactor(playground-ui): split playground-display.ts into geometry/text/identity/rows"
```

- [ ] **Step 6: Length check.**

Run: `wc -l packages/playground-ui/src/playground-display*.ts`
Expected: main ≤ ~70; geometry ≤ ~75; text ≤ ~55; identity ≤ ~45; rows ≤ ~170.

---

# Track D — split `packages/history-ui/src/history-list.tsx` (675 lines) ⚠️ Ink / race-prone

## File structure (after)

| File                                        | Owns                                                                                                             | Imports                                          |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `src/history-list-input.ts` (new, ~120 ln)  | `createHistoryListInputHandler` — pure keystroke→dispatch routing (no React)                                     | history-list-state types, Ink `Key` type         |
| `src/history-list-footer.tsx` (new, ~95 ln) | `renderHistoryListFooter` — footer string cascade + `<Box>` node                                                 | viewer-core, ink, react                          |
| `src/history-list-rows.tsx` (new, ~95 ln)   | `renderHistoryListRows` — content `<Box>` builder                                                                | viewer-core, history-list-transforms, ink, react |
| `src/history-list.tsx` (kept, ~370 ln)      | props, state, memos, layout math, `useInput` call, onReady, empty-state, filter row, modal, ScreenShell assembly | unchanged + the three new modules                |

Dependency direction (acyclic): the three new files are leaves consumed only by `history-list.tsx`. **The `useInput(...)` call stays in `history-list.tsx`** — only the handler body moves to a factory — so Ink's bind timing is unchanged (Convention: this preserves the `onReady`/bind-race contract).

> **Risk note:** This track touches the keystroke handler. After it, the **stress gate** (`pnpm test:stress:once`) is mandatory, not optional.

### Task D1: Extract the input handler (pure)

**Files:**

- Create: `packages/history-ui/src/history-list-input.ts`
- Modify: `packages/history-ui/src/history-list.tsx`

- [ ] **Step 1: Create `history-list-input.ts`** exporting a factory that returns the exact handler currently inline at L235–351. Its args object carries every value the closure reads:

```ts
import type { Key } from 'ink'
import type { Dispatch } from 'react'

import type { ListRow, NavGeometry } from './history-list-state.js'

interface HistoryListInputArgs {
  state: {
    confirmingDelete: { path: string } | null
    filterMode: boolean
    filter: string
  }
  dispatch: Dispatch<
    Parameters<typeof import('./history-list-state.js').reducer>[1]
  >
  listRows: ListRow[]
  focusIndex: number
  windowHeight: number
  rowPath: (row: ListRow) => string
  onPick: (entry: import('./history-scan.js').HistoryEntry) => void
  onExit: () => void
  setCannotOpenStatus: (value: string | null) => void
  setInternalDeleteStatus: (
    value: { text: string; tone: 'dim' | 'error' } | null,
  ) => void
}

export function createHistoryListInputHandler(
  args: HistoryListInputArgs,
): (input: string, key: Key) => void {
  return (input, key) => {
    // …move the body of the current useInput callback (L236–350) here verbatim,
    // reading from `args.` instead of the enclosing-scope locals…
  }
}
```

**Implementation note:** prefer destructuring `const { state, dispatch, listRows, focusIndex, windowHeight, rowPath, onPick, onExit, setCannotOpenStatus, setInternalDeleteStatus } = args` at the top of the factory so the moved body reads identically to the original. Keep `dispatch({ type: 'deleteRequest', path: rowPath(row) })`, the `NavGeometry` construction, and every branch byte-identical. Replace the inline `dispatch` action type with the project's existing action type if `Parameters<typeof reducer>[1]` is awkward — import the action type directly from `history-list-state.ts` if it is exported; otherwise type `dispatch` as `(action: …) => void` matching the reducer's signature.

- [ ] **Step 2: In `history-list.tsx`, replace the inline `useInput((input, key) => { … })` (L235–351) with:**

```ts
useInput(
  createHistoryListInputHandler({
    state,
    dispatch,
    listRows,
    focusIndex,
    windowHeight,
    rowPath,
    onPick,
    onExit,
    setCannotOpenStatus,
    setInternalDeleteStatus,
  }),
)
```

Add `import { createHistoryListInputHandler } from './history-list-input.js'`. Keep the `onReady` `useEffect` (L361–370) immediately after the `useInput` call exactly as before — its position relative to `useInput` is load-bearing.

### Task D2: Extract the row renderer

**Files:**

- Create: `packages/history-ui/src/history-list-rows.tsx`
- Modify: `packages/history-ui/src/history-list.tsx`

- [ ] **Step 1: Create `history-list-rows.tsx`** exporting `renderHistoryListRows(args): ReactElement` containing the `contentNode` JSX (L508–583). Header:

```ts
import {
  BOLD_RED,
  BOLD_WHITE,
  NORMAL,
  NORMAL_GREY,
  padEndToWidth,
  truncateEnd,
} from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

import {
  entryHeadLineParts,
  summarizeHexParts,
  TIMESTAMP_PREFIX_WIDTH,
} from './history-list-transforms.js'
import type { ListRow } from './history-list-state.js'

interface HistoryListRowsArgs {
  visibleRows: ListRow[]
  winStart: number
  focusIndex: number
  innerCols: number
}

export function renderHistoryListRows(args: HistoryListRowsArgs): ReactElement {
  const { visibleRows, winStart, focusIndex, innerCols } = args
  const indent = ' '.repeat(TIMESTAMP_PREFIX_WIDTH)
  return (
    // …the <Box flexDirection="column">{visibleRows.map(...)} </Box> body, verbatim,
    // with `win.start` → `winStart` and `indent` defined above…
  )
}
```

- [ ] **Step 2: In `history-list.tsx`, replace the `const contentNode = (…)` block (L507–583)** with:

```ts
const contentNode = renderHistoryListRows({
  visibleRows,
  winStart: win.start,
  focusIndex,
  innerCols,
})
```

Add `import { renderHistoryListRows } from './history-list-rows.js'`. Remove the now-unused `indent` local (it moved into the rows file) and trim any viewer-core import only used by the moved JSX (`padEndToWidth`, `truncateEnd` — keep in `history-list.tsx` only if still referenced by the footer block, which Task D3 also moves).

### Task D3: Extract the footer renderer

**Files:**

- Create: `packages/history-ui/src/history-list-footer.tsx`
- Modify: `packages/history-ui/src/history-list.tsx`

- [ ] **Step 1: Create `history-list-footer.tsx`** exporting `renderHistoryListFooter(args): ReactElement` containing the footer computation + node (L431–499: `hintLine`, `scrollStatus`, `statusLine1`, `focusedPath`, `effectiveStatusLine`, `bottomLineRaw`, `bottomLine`, `footerNode`). Header:

```ts
import path from 'node:path'
import process from 'node:process'

import {
  BOLD_GREY,
  BOLD_RED,
  DEFAULT_FG,
  NORMAL,
  NORMAL_GREY,
  truncateEnd,
  truncateStart,
} from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

import { rowPath, type ListRow } from './history-list-state.js'

interface HistoryListFooterArgs {
  filterMode: boolean
  filter: string
  exitLabel: string
  winStart: number
  winEnd: number
  windowHeight: number
  totalConsultations: number
  listRows: ListRow[]
  focusIndex: number
  innerCols: number
  statusLine: { text: string; tone: 'dim' | 'error' } | null
  internalDeleteStatus: { text: string; tone: 'dim' | 'error' } | null
  cannotOpenStatus: string | null
}

export function renderHistoryListFooter(
  args: HistoryListFooterArgs,
): ReactElement {
  // …move L431–499 verbatim, sourcing `state.filterMode`→`filterMode`,
  // `state.filter`→`filter`, `win.start`→`winStart`, `win.end`→`winEnd`,
  // and returning `footerNode`…
}
```

(`rowPath` is already exported from `history-list-state.ts` — used for `focusedPath`.)

- [ ] **Step 2: In `history-list.tsx`, replace the L431–499 footer block** with a single call:

```ts
const footerNode = renderHistoryListFooter({
  filterMode: state.filterMode,
  filter: state.filter,
  exitLabel,
  winStart: win.start,
  winEnd: win.end,
  windowHeight,
  totalConsultations: listRows.length,
  listRows,
  focusIndex,
  innerCols,
  statusLine,
  internalDeleteStatus,
  cannotOpenStatus,
})
```

Add `import { renderHistoryListFooter } from './history-list-footer.js'`. Remove imports now unused by `history-list.tsx` (e.g. `truncateStart`, `DEFAULT_FG` if only the footer used them). Keep the empty-state footer (L394–425) where it is — it is a separate branch.

### Task D4: Verify (with stress gate) and commit source

- [ ] **Step 1: Type-check + lint/format + build.**

```bash
pnpm lint:fix && pnpm format:fix
pnpm --filter @hexagram/history-ui type:check
pnpm --filter @hexagram/history-ui build
```

Expected: PASS. Resolve any `--isolatedDeclarations` annotation prompts per Convention 4.

- [ ] **Step 2: Run the history-ui suite.**

Run: `pnpm --filter @hexagram/history-ui test`
Expected: PASS — `history-list.test.tsx` (1917 ln integration) still exercises the extracted footer/rows/input through the mounted component.

- [ ] **Step 3: STRESS GATE (mandatory for this track).**

Run: `pnpm test:stress:once`
Expected: PASS. This reproduces 2-CPU contention to catch any `useInput` bind-race regression introduced by the handler extraction. If it flakes, re-run to confirm; a real regression here means the `useInput` call or `onReady` effect moved relative to each other — revert D1 and re-extract keeping their order.

- [ ] **Step 4: Commit source.**

```bash
git add packages/history-ui/src
git commit -m "refactor(history-ui): extract input handler + footer + rows from history-list.tsx"
```

### Task D5: Mirror the pure module in tests

**Files:**

- Create: `packages/history-ui/tests/history-list-input.test.ts`

- [ ] **Step 1: Add a unit test for the pure input handler.** The factory takes plain data + spies — no Ink render needed. (The footer/rows renderers return JSX and stay covered by the `history-list.test.tsx` integration test; do not duplicate them with render-based unit tests.)

```ts
import { describe, expect, it, vi } from 'vitest'

import { createHistoryListInputHandler } from '../src/history-list-input'
import type { ListRow } from '../src/history-list-state'

function makeKey(overrides: Record<string, boolean> = {}) {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageUp: false,
    pageDown: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    ...overrides,
  } as never
}

const rows: ListRow[] = []

describe('createHistoryListInputHandler', () => {
  it('Ctrl+D on a focused row dispatches deleteRequest and clears statuses', () => {
    const dispatch = vi.fn()
    const setCannotOpenStatus = vi.fn()
    const setInternalDeleteStatus = vi.fn()
    const row = {
      kind: 'entry',
      entry: { path: '/x.md' },
    } as unknown as ListRow
    const handler = createHistoryListInputHandler({
      state: { confirmingDelete: null, filterMode: false, filter: '' },
      dispatch,
      listRows: [row],
      focusIndex: 0,
      windowHeight: 5,
      rowPath: () => '/x.md',
      onPick: vi.fn(),
      onExit: vi.fn(),
      setCannotOpenStatus,
      setInternalDeleteStatus,
    })
    handler('d', makeKey({ ctrl: true }))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'deleteRequest',
      path: '/x.md',
    })
    expect(setCannotOpenStatus).toHaveBeenCalledWith(null)
  })

  it('is a no-op while the confirm modal is open', () => {
    const dispatch = vi.fn()
    const handler = createHistoryListInputHandler({
      state: {
        confirmingDelete: { path: '/x.md' },
        filterMode: false,
        filter: '',
      },
      dispatch,
      listRows: rows,
      focusIndex: 0,
      windowHeight: 5,
      rowPath: () => '',
      onPick: vi.fn(),
      onExit: vi.fn(),
      setCannotOpenStatus: vi.fn(),
      setInternalDeleteStatus: vi.fn(),
    })
    handler('d', makeKey({ ctrl: true }))
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('Escape outside filter mode calls onExit', () => {
    const onExit = vi.fn()
    const handler = createHistoryListInputHandler({
      state: { confirmingDelete: null, filterMode: false, filter: '' },
      dispatch: vi.fn(),
      listRows: rows,
      focusIndex: 0,
      windowHeight: 5,
      rowPath: () => '',
      onPick: vi.fn(),
      onExit,
      setCannotOpenStatus: vi.fn(),
      setInternalDeleteStatus: vi.fn(),
    })
    handler('', makeKey({ escape: true }))
    expect(onExit).toHaveBeenCalledOnce()
  })
})
```

(Adjust the `makeKey` shape / action-type details to match the project's `Key` and reducer action union if type:check complains — the three behaviours asserted are the contract.)

- [ ] **Step 2: Run history-ui tests + lint/format.**

```bash
pnpm lint:fix && pnpm format:fix
pnpm --filter @hexagram/history-ui type:check
pnpm --filter @hexagram/history-ui test
```

Expected: PASS, including the new `history-list-input.test.ts`.

- [ ] **Step 3: Commit tests.**

```bash
git add packages/history-ui/tests
git commit -m "test(history-ui): unit-test extracted history-list input handler"
```

- [ ] **Step 4: Length check.**

Run: `wc -l packages/history-ui/src/history-list*.tsx packages/history-ui/src/history-list-input.ts`
Expected: `history-list.tsx` ≤ ~380; each new module ≤ ~120.

---

# Final Integration Gate (run once, after all chosen tracks land on `claude/jolly-rubin-gCAj8`)

- [ ] **Step 1: Full topological build (proves the new import graph resolves across packages).**

Run: `pnpm build`
Expected: PASS in topological order.

- [ ] **Step 2: Whole-repo type-check.**

Run: `pnpm type:check`
Expected: PASS (catches isolatedDeclarations + any moved-import breaks).

- [ ] **Step 3: Full test suite (includes the ~40s slow RNG distribution test — expected, not a hang).**

Run: `pnpm test`
Expected: PASS. Critically: the `--plain` fixtures, the `.md` save fixtures, and the manual-vs-interactive byte-identity test are all green **without** any `generate-fixtures` run. Any fixture drift = a move that changed bytes; revert that track's offending move.

- [ ] **Step 4: Lint + format gates.**

Run:

```bash
pnpm lint:check
pnpm format:check
```

Expected: both PASS (import/export ordering, control-regex disables, oxfmt). If they fail, run `pnpm lint:fix && pnpm format:fix` and re-check.

- [ ] **Step 5: Final length audit — confirm the smell is gone, not relocated.**

Run:

```bash
git ls-files 'packages/**/src/*.ts' 'packages/**/src/*.tsx' | xargs wc -l | sort -rn | head -30
```

Expected: `manual-diagram.ts`, `output-sections.ts`, `playground-display.ts`, `history-list.tsx` are all materially shorter; no newly-created file is itself a 400+ line multi-responsibility module.

- [ ] **Step 6: Push the branch.**

```bash
git push -u origin claude/jolly-rubin-gCAj8
```

(Retry up to 4× with exponential backoff on network error. Do NOT open a PR unless explicitly asked.)

---

## Self-review notes (verification of this plan against the report)

- **Coverage:** Tracks A–D implement report candidates #1–#4 respectively; each lists exact source moves, consumer repoints, test mirroring, and per-package + final gates.
- **No barrels:** every consumer (`manual-prompt.tsx`, `output-composers.ts`, `index.ts`, the test files) is repointed directly; no kept file re-exports a moved symbol.
- **Vertical proximity kept:** Track A keeps the coupled geometry cluster + vocabulary together in the base; the bottom-strip union stays with `bottomStripRow`. Track D keeps `useInput` + its `onReady` effect adjacent and in order. Track B keeps `LEDGER_*` with `castingSection`.
- **isolatedDeclarations:** flagged exactly where expression-initialized consts become exported (A2/A1 tee columns, C1 cell widths + divider).
- **Fixture safety:** every track and the final gate assert fixtures stay green with no regeneration.
- **Parallelism:** disjoint file sets per track; worktree-or-sequential both supported.
