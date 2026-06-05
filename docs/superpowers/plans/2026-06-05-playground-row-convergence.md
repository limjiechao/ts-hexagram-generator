# Playground Row Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> This plan executes the approved design spec at
> `docs/superpowers/specs/2026-06-05-playground-row-convergence-design.md`. Read the
> spec first — it carries the both-halves decision, the optional `decoratePosition`
> knob, the byte-preservation argument, and the deliberate scope boundaries this
> plan operationalises.

**Goal:** Retire the third (and last) hand-built copy of the transformation-row grammar — the playground's `buildLineRow` — by composing it from `@hexagram/consultation-view`'s shared `transformationHalfRow` template, extended with one optional position-decorate callback so the playground's ghost-mirror position colour rides the same skeleton.

**Architecture:** Two byte-gated tasks plus a characterization pre-step. Task 1 extends `transformationHalfRow` with an optional fourth `decoratePosition` parameter (default identity) — additive, so every existing 3-arg caller (`transformationRow`, used by both the ANSI and Markdown serializers) is byte-unchanged. Task 2 first locks `buildLineRow`'s current output bytes with a characterization test (proving `pulse` is inert), then rewrites `buildLineRow` to compose two `transformationHalfRow` calls and drops the now-dead `deriveBannerLine`/`polarityOf`/`pulse`. The consultation surfaces' byte-identity fixtures stay green throughout WITHOUT regeneration — that green is the proof nothing observable changed.

**Tech Stack:** TypeScript, Turborepo + pnpm workspaces, vitest, tsdown, dependency-cruiser, Ink/React.

---

## Before you start (one-time)

- [ ] **Environment is built and green.** A fresh clone needs deps + a build before cross-package `source` resolution works under vitest.

Run:
```bash
pnpm install --ignore-scripts
pnpm build
pnpm boundaries:check
```
Expected: install completes; build = `12 successful`; boundaries:check = `✔ no dependency violations found`.

**The parity gate** (referenced below by that name):
```bash
pnpm --filter @hexagram/consultation-view --filter @hexagram/readout \
     --filter @hexagram/consultation-file --filter @hexagram/casting-ui test
```
Expected: all suites pass (consultation-view, consultation-file 60+2 skipped, readout 41, casting-ui 385+2 skipped). These suites pin the `.md` body and `--plain` stdout byte-for-byte. For every output-touching task in this plan, "byte-identical preserved" == "this command stays green WITHOUT running `pnpm generate-fixtures`". If a byte test goes red: the CODE diverged — fix the code, never the fixture/snapshot, and STOP and report rather than presenting it as done.

---

## Task 1: Extend `transformationHalfRow` with an optional `decoratePosition`

The standing half of a playground row maps byte-identically onto `transformationHalfRow`, but the emerging half does one thing the shared template deliberately never does: it **colours the position label**. Add an optional fourth parameter `decoratePosition`, defaulting to identity, so the position cell can pass through a callback. `transformationRow` (and therefore both serializers) keeps calling the half-row with three arguments, so it gets the identity default and emits byte-identical output. `transformationRow` itself is **unchanged**.

**Files:**
- Modify: `domain/consultation-view/src/diagram-template.ts:21-31` (add the optional param; `transformationRow` at lines 36-48 stays untouched)
- Modify: `domain/consultation-view/tests/diagram-template.test.ts` (add a `decoratePosition` case)

- [ ] **Step 1: Write the failing test for the position-decorate callback**

Append this `it` block inside the existing `describe('transformationRow', ...)` in `domain/consultation-view/tests/diagram-template.test.ts` — note it imports `transformationHalfRow` directly, so add it to the existing top-of-file import from `../src/diagram-template.js`:

```ts
  it('transformationHalfRow decorates the position cell when given a fourth callback', () => {
    const cell = { line: 8, position: 3 } as const
    const wrapCell = (t: string): string => `<${t}>`
    const wrapPos = (t: string): string => `[${t}]`
    expect(transformationHalfRow(cell, '  ', wrapCell, wrapPos)).toBe(
      `  <8>  <━━━   ━━━>  [（三, 3rd）]`,
    )
  })

  it('transformationHalfRow leaves the position cell undecorated by default', () => {
    const cell = { line: 8, position: 3 } as const
    const id = (t: string): string => t
    expect(transformationHalfRow(cell, '  ', id)).toBe(
      `  8  ━━━   ━━━  （三, 3rd）`,
    )
  })
```

The top-of-file import becomes:
```ts
import {
  hexagramDiagramRowStrings,
  transformationHalfRow,
  transformationRow,
} from '../src/diagram-template.js'
```

- [ ] **Step 2: Run it to verify the new case fails**

Run:
```bash
pnpm --filter @hexagram/consultation-view test -- diagram-template
```
Expected: FAIL — the `decoratePosition` case errors because the position cell is not wrapped (the fourth argument is currently ignored / not a parameter). The default-behaviour case passes.

- [ ] **Step 3: Add the optional `decoratePosition` parameter**

In `domain/consultation-view/src/diagram-template.ts`, replace the `transformationHalfRow` function (lines 18-31, including its doc comment) with:

```ts
/** One half of a transformation row: `indent + value + "  " + glyph + "  " +
 *  position`. The value and glyph cells pass through `decorate`. The position
 *  label passes through `decoratePosition`, which defaults to identity — so
 *  every existing caller (the consultation serializers, which never colour
 *  position) emits byte-identical output, while the playground can inject its
 *  ghost-mirror position colour through the same skeleton. */
export function transformationHalfRow(
  cell: { line: Line; position: PositionKey },
  indent: string,
  decorate: DecorateCell,
  decoratePosition: DecorateCell = (text) => text,
): string {
  return (
    `${indent}${decorate(String(cell.line))}` +
    `  ${decorate(LINE_GLYPH[cell.line])}` +
    `  ${decoratePosition(POSITION_LABELS[cell.position])}`
  )
}
```

Leave `transformationRow` (lines 36-48) exactly as it is — it calls the half-row with three arguments, so the new parameter takes its identity default. (No new import is needed; `DecorateCell`, `LINE_GLYPH`, `POSITION_LABELS`, `PositionKey` are already in scope.)

- [ ] **Step 4: Run the template tests to verify they pass**

Run:
```bash
pnpm --filter @hexagram/consultation-view test -- diagram-template
```
Expected: PASS — all `transformationRow`, `transformationHalfRow`, and `hexagramDiagramRowStrings` cases green.

- [ ] **Step 5: Type-check the package**

Run:
```bash
pnpm --filter @hexagram/consultation-view type:check
```
Expected: PASS.

- [ ] **Step 6: PARITY GATE — consultation bytes must be unchanged**

Run the parity gate (do NOT run `pnpm generate-fixtures`):
```bash
pnpm --filter @hexagram/consultation-view --filter @hexagram/readout \
     --filter @hexagram/consultation-file --filter @hexagram/casting-ui test
```
Expected: green. This green proves the additive parameter did not perturb the ANSI/Markdown surfaces — the 3-arg callers still emit identical bytes. If red, the default is not truly identity — fix the template, not the fixture, and STOP and report.

- [ ] **Step 7: Commit**

```bash
git add domain/consultation-view/src/diagram-template.ts \
        domain/consultation-view/tests/diagram-template.test.ts
git commit -m "feat(consultation-view): optional position decorate on transformationHalfRow

The playground's emerging half colours the position label — the one thing the
shared half-row template deliberately never did, and the sole reason its row
grammar stayed a third hand-built copy. Add an optional fourth decoratePosition
parameter defaulting to identity, so existing 3-arg callers (transformationRow,
hence both serializers) emit byte-identical output while the playground can
ride the same skeleton next. Parity fixtures stay green without regeneration.

https://claude.ai/code/session_01MNMphA8128RrLy6mjwUZkY"
```

---

## Task 2: Converge `buildLineRow` onto `transformationHalfRow`

`buildLineRow` (`cli/playground-ui/src/playground-display-rows.ts:63-107`) is the last independent assembler of the `standing | gap | emerging` row grammar. Lock its current output bytes with a characterization test first (proving along the way that `pulse` has zero effect on its output), then rewrite it to compose two `transformationHalfRow` calls, dropping `deriveBannerLine`/`polarityOf` and the now-inert `pulse`. The chevron, gap, and width-pad framing stay. The existing 130 `@hexagram/playground-ui` display tests and `top-half-width-invariant.test.ts` are the byte gate — they must stay green untouched.

**Files:**
- Create: `cli/playground-ui/tests/build-line-row.test.ts` (characterization test)
- Modify: `cli/playground-ui/src/playground-display-rows.ts:1-11` (imports), `:54-61` (`LineRowInputs`), `:63-107` (`buildLineRow`)
- Modify: `cli/playground-ui/src/playground-display.ts:30` (drop `POSITION_LABELS` import), `:73` (drop `pulse` destructure if unused), `:80-92` (call site → pass `position` index, drop `pulse`)

- [ ] **Step 1: Write the characterization test that locks `buildLineRow`'s bytes**

`buildLineRow` is not currently exported from its module. Confirm:
```bash
grep -n "export function buildLineRow" cli/playground-ui/src/playground-display-rows.ts
```
Expected: `export function buildLineRow(` — it is already exported (the rows module exports it for `playground-display.ts`).

Create `cli/playground-ui/tests/build-line-row.test.ts`:

```ts
// Characterization test: locks buildLineRow's exact output bytes across the
// input matrix BEFORE the convergence refactor, then guards it through the
// rewrite. The pulse-on vs pulse-off pair MUST be identical — that equality
// is the proof that `pulse` is inert in this function (it only ever fed
// deriveBannerLine's role, which buildLineRow never reads), justifying its
// removal in this task.

import type { Line } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import { buildLineRow } from '../src/playground-display-rows'

// One representative cell per axis. Standing 9 = moving yang (→ emerging 8);
// standing 7 = static yang (→ emerging 7). Position label is the 3rd-place
// label the call site computes from POSITION_LABELS[3].
interface Case {
  readonly name: string
  readonly standingLine: Line
  readonly emergingLine: Line
  readonly focused: boolean
  readonly hasMoving: boolean
}

const cases: readonly Case[] = [
  { name: 'moving + focused + hasMoving', standingLine: 9, emergingLine: 8, focused: true, hasMoving: true },
  { name: 'moving + unfocused + hasMoving', standingLine: 9, emergingLine: 8, focused: false, hasMoving: true },
  { name: 'static + focused + hasMoving', standingLine: 7, emergingLine: 7, focused: true, hasMoving: true },
  { name: 'static + unfocused + ghost (no moving)', standingLine: 7, emergingLine: 7, focused: false, hasMoving: false },
  { name: 'static + focused + ghost (no moving)', standingLine: 7, emergingLine: 7, focused: true, hasMoving: false },
]

describe('buildLineRow output is stable across the input matrix', () => {
  for (const c of cases) {
    it(`${c.name} matches the locked snapshot`, () => {
      const row = buildLineRow({
        standingLine: c.standingLine,
        emergingLine: c.emergingLine,
        positionLabel: '（三, 3rd）',
        focused: c.focused,
        pulse: false,
        hasMoving: c.hasMoving,
      })
      expect(row).toMatchSnapshot()
    })
  }

  it('pulse is inert: pulse=true and pulse=false produce identical bytes', () => {
    for (const c of cases) {
      const off = buildLineRow({
        standingLine: c.standingLine,
        emergingLine: c.emergingLine,
        positionLabel: '（三, 3rd）',
        focused: c.focused,
        pulse: false,
        hasMoving: c.hasMoving,
      })
      const on = buildLineRow({
        standingLine: c.standingLine,
        emergingLine: c.emergingLine,
        positionLabel: '（三, 3rd）',
        focused: c.focused,
        pulse: true,
        hasMoving: c.hasMoving,
      })
      expect(on).toBe(off)
    }
  })
})
```

> **Note:** this test deliberately uses the CURRENT `LineRowInputs` shape (`positionLabel: string`, `pulse: boolean`). It is updated in Step 7 to the new shape after the rewrite. Snapshots written here are the byte lock the rewrite must preserve.

- [ ] **Step 2: Run it to capture the baseline snapshots (green)**

Run:
```bash
pnpm --filter @hexagram/playground-ui test -- build-line-row
```
Expected: PASS — vitest writes `cli/playground-ui/tests/__snapshots__/build-line-row.test.ts.snap` (5 new snapshots) and the inertness case passes (pulse on == pulse off). The passing inertness assertion is the proof that dropping `pulse` is safe. If the inertness case FAILS, STOP — the design's inertness assumption is false and the work cannot proceed as planned; report it.

- [ ] **Step 3: Rewrite `buildLineRow`'s imports**

In `cli/playground-ui/src/playground-display-rows.ts`, replace the import block (lines 1-23) so it imports `transformationHalfRow` and drops the now-unused `deriveBannerLine`, `polarityOf`, and `MOVING_ARROW`/`STATIC_GAP` only if they become unused. `MOVING_ARROW`/`STATIC_GAP` are still used by `buildLineRow`'s gap, so keep them. `deriveBannerLine` and `polarityOf` go.

Replace lines 1-11:
```ts
import {
  MOVING_ARROW,
  STATIC_GAP,
  transformationHalfRow,
} from '@hexagram/consultation-view'
import { isMovingLine } from '@hexagram/core/line-semantics'
import type { Hexagram, Line } from '@hexagram/core/types'
import { BOLD_GREY, BOLD_RED, BOLD_WHITE, NORMAL, NORMAL_GREY } from '@hexagram/viewer-core'
```

(`isMovingLine` stays — it derives the standing `moving` flag. `polarityOf` and `deriveBannerLine` are gone. `BOLD_GREY` stays — `buildHeaderRow` below still uses it.)

- [ ] **Step 4: Change `LineRowInputs` to carry the position index, drop `pulse`**

In `cli/playground-ui/src/playground-display-rows.ts`, replace the `LineRowInputs` interface (lines 54-61) with:
```ts
interface LineRowInputs {
  readonly standingLine: Line
  readonly emergingLine: Line
  /** The 1..6 PositionKey the template indexes into POSITION_LABELS; replaces
   *  the pre-rendered positionLabel string so the row grammar lives in one
   *  place (the shared half-row template). */
  readonly position: 1 | 2 | 3 | 4 | 5 | 6
  readonly focused: boolean
  readonly hasMoving: boolean
}
```
(`pulse` is removed — it was only ever passed into `deriveBannerLine` and never affected output; see the characterization test's inertness case.)

- [ ] **Step 5: Rewrite the `buildLineRow` body to compose two half-rows**

Replace `buildLineRow` (lines 63-107) with:
```ts
export function buildLineRow(input: LineRowInputs): string {
  const { standingLine, emergingLine, position, focused, hasMoving } = input
  const moving = isMovingLine(standingLine)
  const chevron = focused ? '› ' : '  '

  // Mirror `transformationSection`'s colour scheme: standing moving lines are
  // BOLD_RED (no pulse-dim flicker — that was always a no-op here); the
  // emerging side is BOLD_WHITE normally, NORMAL_GREY when the standing has no
  // moving lines (the "ghost mirror"). The position label is uncoloured on the
  // left and coloured on the right (NORMAL, or NORMAL_GREY in the ghost mirror).
  const standingColor = moving ? BOLD_RED : BOLD_WHITE
  const emergingColor = hasMoving ? BOLD_WHITE : NORMAL_GREY
  const positionColor = hasMoving ? NORMAL : NORMAL_GREY
  const gap = moving ? MOVING_ARROW : STATIC_GAP

  // The cell skeleton (indent + value + glyph + position) lives once, in the
  // shared half-row template. The half-row sources value/glyph from
  // `String(line)` / `LINE_GLYPH[line]`, byte-identical to the dropped
  // `deriveBannerLine(...).value` / `.bar`; the emerging side is always static
  // (6/9 flip to 7/8) so its previous hardcoded `moving = false` is implicit.
  const left = transformationHalfRow(
    { line: standingLine, position },
    chevron,
    (text) => `${standingColor}${text}${NORMAL}`,
    // position uncoloured on the left -> identity default (omitted)
  )
  const right = transformationHalfRow(
    { line: emergingLine, position },
    '',
    (text) => `${emergingColor}${text}${NORMAL}`,
    (text) => `${positionColor}${text}${NORMAL}`,
  )
  return padRightToWidth(`${left}${gap}${right}`, TOP_HALF_WIDTH)
}
```

(`padRightToWidth` and `TOP_HALF_WIDTH` imports are unchanged.)

- [ ] **Step 6: Update the call site in `playground-display.ts`**

In `cli/playground-ui/src/playground-display.ts`:

1. Delete the now-unused `POSITION_LABELS` import (line 30) — it was the only consumer (`grep` confirmed). The line to delete:
```ts
import { POSITION_LABELS } from '@hexagram/consultation-view'
```

2. In `buildPlaygroundDisplay` (lines 70-99), `pulse` is still destructured from `inputs` (line 73). `pulse` remains a documented field of `PlaygroundDisplayInputs` (it is part of the component's public input contract and the reducer supplies it); only its pass-through into `buildLineRow` is removed. So change the call site (lines 81-91) to drop `pulse` and pass the position index instead of the rendered label:
```ts
    rows.push(
      buildLineRow({
        standingLine: standing[lineIndex] as Line,
        emergingLine: emerging[lineIndex] as Line,
        position: (lineIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6,
        focused: focusIndex === lineIndex,
        hasMoving,
      }),
    )
```

3. `pulse` is now destructured (line 73) but no longer used inside `buildPlaygroundDisplay`. Remove it from the destructure to avoid a lint "unused variable" error — change line 73 from:
```ts
  const { standing, emerging, focusIndex, pulse, hasMoving } = inputs
```
to:
```ts
  const { standing, emerging, focusIndex, hasMoving } = inputs
```
(Leave `pulse` on the `PlaygroundDisplayInputs` interface — callers still pass it; it is simply no longer read here.)

- [ ] **Step 7: Update the characterization test to the new input shape**

The rewrite changed `LineRowInputs` (`positionLabel: string` → `position: 1|2|3|4|5|6`, `pulse` removed), so the test from Step 1 no longer type-checks. Update `cli/playground-ui/tests/build-line-row.test.ts` to the new shape while preserving the SAME assertions and snapshots:

- Replace every `positionLabel: '（三, 3rd）'` with `position: 3` (position 3's label IS `（三, 3rd）`, so the rendered bytes — and thus the existing snapshots — are unchanged).
- Remove `pulse: false` / `pulse: true` from the matrix-case calls.
- For the inertness case: `pulse` is gone from the input type, so the "pulse on == pulse off" assertion can no longer be written. Replace that `it(...)` block with a comment recording that pulse-inertness was proven by the pre-rewrite snapshot run (Step 2) and removed:
```ts
  // The pulse-inertness invariant was proven in the pre-rewrite snapshot run
  // (pulse=true and pulse=false produced byte-identical rows). `pulse` is now
  // gone from LineRowInputs, so there is nothing left to assert here.
```

The matrix cases keep `expect(row).toMatchSnapshot()` — they MUST match the snapshots captured in Step 2. If a snapshot mismatches, the rewrite changed bytes: fix the code, do NOT run vitest with `-u`, and STOP and report.

- [ ] **Step 8: Run the characterization test against the rewrite**

Run:
```bash
pnpm --filter @hexagram/playground-ui test -- build-line-row
```
Expected: PASS — all 5 matrix snapshots match the bytes captured in Step 2. A mismatch means the composition diverged from the hand-built row — diff and fix the code; never update the snapshot.

- [ ] **Step 9: Run the existing playground gates untouched**

Run:
```bash
pnpm --filter @hexagram/playground-ui type:check
pnpm --filter @hexagram/playground-ui test
```
Expected: green — the 130 display tests (including `playground-display.test.ts`) and `top-half-width-invariant.test.ts` all pass without any edit to them, plus the new `build-line-row` suite. That untouched-green is the byte gate: the playground's rendered output is unchanged.

- [ ] **Step 10: Boundary + consultation parity gate**

The convergence introduces no new `domain → cli` edge (`playground-ui` already depends on `@hexagram/consultation-view`). Confirm:
```bash
pnpm boundaries:check
```
Expected: `✔ no dependency violations found`.

Then run the parity gate (do NOT run `pnpm generate-fixtures`):
```bash
pnpm --filter @hexagram/consultation-view --filter @hexagram/readout \
     --filter @hexagram/consultation-file --filter @hexagram/casting-ui test
```
Expected: green — the consultation surfaces never touched the playground, so this is a belt-and-suspenders confirmation that Task 1's template change is still inert under Task 2's new caller.

- [ ] **Step 11: Commit**

```bash
git add cli/playground-ui/src/playground-display-rows.ts \
        cli/playground-ui/src/playground-display.ts \
        cli/playground-ui/tests/build-line-row.test.ts \
        cli/playground-ui/tests/__snapshots__/build-line-row.test.ts.snap
git commit -m "refactor(playground): compose buildLineRow from the shared half-row

buildLineRow was the third — and last — hand-built assembler of the
standing|gap|emerging row grammar (seam S1). Compose it from
consultation-view's transformationHalfRow for both halves, keeping the
playground's chevron / ghost-colour / width-pad framing on top. Drop
deriveBannerLine/polarityOf (the half-row sources value/glyph from
String(line) / LINE_GLYPH[line], byte-identical) and the inert pulse arg
(proven inert by a characterization snapshot before the rewrite). The row
grammar's spatial skeleton now lives in exactly one place. Playground display
tests and the top-half width invariant stay green untouched.

https://claude.ai/code/session_01MNMphA8128RrLy6mjwUZkY"
```

---

## Final verification (after all tasks)

- [ ] **Run the full gate**

```bash
pnpm boundaries:check
pnpm build
pnpm --filter @hexagram/consultation-view --filter @hexagram/readout \
     --filter @hexagram/consultation-file --filter @hexagram/casting-ui \
     --filter @hexagram/playground-ui test
pnpm type:check
pnpm lint:check
pnpm format:check
```
Expected: all green. The consultation byte-identity fixtures passing WITHOUT any `pnpm generate-fixtures` run, and the playground display + width-invariant tests passing untouched, together prove the convergence preserved every observable byte.

- [ ] **Confirm the seam is closed (grep checks)**

```bash
# buildLineRow no longer hand-derives banner cells:
grep -n "deriveBannerLine\|polarityOf" cli/playground-ui/src/playground-display-rows.ts \
  && echo "FAIL: hand-built derivation survives" || echo "ok: composes the shared half-row"
# the row grammar is sourced from the template:
grep -n "transformationHalfRow" cli/playground-ui/src/playground-display-rows.ts \
  && echo "ok: half-row template in use"
# pulse is gone from the row input contract:
grep -n "pulse" cli/playground-ui/src/playground-display-rows.ts \
  && echo "FAIL: inert pulse survives in rows module" || echo "ok: inert pulse removed"
```
Expected: `ok` on all three.

---

## Deliberately out of scope

Mirroring the spec's scope boundary — these are NOT part of this work:

- The identity stack (`buildIdentityStack`), the header row (`buildHeaderRow`), the identity divider, and all geometry constants — untouched.
- `deriveBannerLine` itself (still used by the home banner and elsewhere) — only its use inside `buildLineRow` is removed; the function and its other callers are left as-is.
- The two emerging-gate / refusal-fork seams (S-B/E, S3) the seam-remediation plan also deferred — not part of this work.
