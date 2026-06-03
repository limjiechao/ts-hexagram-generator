# Casting-table auto-follow scroll — design

**Date:** 2026-06-03
**Status:** Approved (pending spec review)
**Packages touched:** `@hexagram/readout`, `@hexagram/casting-ui`

## Problem

During an in-flight casting flow the Casting tab table renders **line 6 at the
top and line 1 at the bottom** (26 content rows; 28 once breather-padded). But
casting proceeds **bottom-up** — line 1 first, climbing to line 6. The vertical
scroll offset is **purely user-driven** today (the `CAN_SCROLL` keymap:
↑/↓/PgUp/PgDn/g/G), with the offset pinned at `0` (top = line 6) until the user
scrolls by hand.

The manual prompt box is 22 rows tall (slider 7, numeric 5–6), so on a normal
terminal it crushes the table viewport to a handful of rows. The row the user is
actually casting — line 1, at the *bottom* of the table — sits below the fold,
invisible, and never follows as casting climbs to lines 2–6.

Observed in the manual flow (`pnpm hexagram-manual`): while casting line 1, the
line-1 row is off-screen below the visible window.

## Goal

While casting, automatically keep the **active line's row visible**, pinned near
the **bottom** of the table viewport, so completed lines accumulate above it —
mirroring the bottom-up construction of the hexagram. The clamp handles the
top edge: once the active line is high enough that the table can't scroll
further (line 6 on a tall viewport), it simply rides at the top.

Applies to **all casting flows**: manual, interactive slider, interactive
numeric, and random playback.

### Non-goals (YAGNI)

- No active-row highlight — the `⇒N` marker on each line's cast-3 row already
  identifies the resolving line.
- No change to `done`-mode scrolling. The offset is left wherever casting ended;
  the user scrolls freely once tabs unlock.
- No new keybindings. Existing manual scroll keys keep working (see §
  "User-override coexistence").

## Approach

Three ways to command the readout to scroll were considered, because scroll
state currently lives privately inside `ConsultationReadout` (`offsetsRef`):

- **A — declarative `autoScrollTarget` prop (chosen).** The viewer computes
  which line is active → a target content-row, and passes it down. The readout
  owns an effect that translates that to a clamped offset and applies it. Scroll
  state stays where it is; the readout stays generic (it scrolls to a
  row + alignment and knows nothing about "lines"); trivially unit-testable.
- **B — imperative ref handle.** Expose `scrollActiveTo` via
  `useImperativeHandle`; the viewer calls it from its own effect. Against the
  grain of this prop-driven codebase; harder to test. Rejected.
- **C — lift scroll state into the viewer.** Most invasive; drags the shared
  `CAN_SCROLL` keymap callbacks out of the readout and risks the casting↔done
  scroll-sharing that already works. Rejected.

## Design (Approach A)

### 1. Geometry helper — pure, co-located with `castingSection`

A pure function maps the active line index to the content-row of that line's
**last data row** (the cast-1 row), which is the row to pin near the viewport
bottom.

```ts
// in @hexagram/readout (near output-sections.ts castingSection)
//
// Casting section content-row layout (0-based), top-first:
//   0  banner (heap labels)
//   1  header
//   2  header rule
//   3..6   line 6 block: cast3, cast2, cast1, blockRule
//   7..10  line 5 block
//   11..14 line 4 block
//   15..18 line 3 block
//   19..22 line 2 block
//   23..25 line 1 block: cast3, cast2, cast1   (no trailing blockRule)
//
// lineIndex: 0 => line 1 (bottom), 5 => line 6 (top)
export function castingTableActiveRow(lineIndex: number): number {
  const firstRow = 3 + (5 - lineIndex) * 4 // cast-3 row of the block
  return firstRow + 2 // cast-1 row (last data row) of the block
}
// line 1 (idx 0) -> 25 ; line 6 (idx 5) -> 5
```

This is expressed in the casting section's own **content-row** space (rows
0–25). The breather translation is the readout's job (§3), so the helper never
needs to know about padding.

### 2. Viewer wiring — `packages/casting-ui/src/viewer.tsx`

While `state.mode === 'casting'`, compute the target and pass it to
`ConsultationReadout`; pass `null` (or omit) in every other mode:

```tsx
const autoScrollTarget =
  state.mode === 'casting'
    ? { row: castingTableActiveRow(state.lineIndex), align: 'bottom' as const }
    : null
```

`state.lineIndex` is already in render scope. No new viewer state. The target's
`row` depends only on `lineIndex` (constant across a line's three casts), so it
changes exactly **once per line**.

### 3. Readout apply-effect — `packages/readout/src/consultation-readout.tsx`

New optional prop:

```ts
readonly autoScrollTarget?: {
  readonly row: number // content-row space (pre-breather)
  readonly align: 'top' | 'center' | 'bottom'
} | null
```

A `useEffect` applies it to the **active** tab's offset:

```ts
useEffect(() => {
  if (autoScrollTarget == null) return
  const windowedRow = autoScrollTarget.row + 1 // one leading breather row
  const BOTTOM_MARGIN = 1 // keep the active line off the very edge
  let target: number
  switch (autoScrollTarget.align) {
    case 'bottom':
      target = windowedRow - (viewportHeight - 1 - BOTTOM_MARGIN)
      break
    case 'center':
      target = windowedRow - Math.floor(viewportHeight / 2)
      break
    case 'top':
    default:
      target = windowedRow
  }
  offsetsRef.current[activeIndex] = clamp(target, 0, maxOffset)
  forceRender()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- value-keyed below
}, [autoScrollTarget?.row, autoScrollTarget?.align, viewportHeight, maxOffset, activeIndex])
```

Notes:
- The effect keys on the **primitive fields** (`row`, `align`) plus
  `viewportHeight`/`maxOffset`/`activeIndex`, so identity churn on the
  `autoScrollTarget` object from re-renders does **not** re-fire it. It runs
  on line change and on viewport resize only.
- `clamp` and `maxOffset` already exist in this component; the effect reuses
  them, so line 1 clamps to the bottom (`maxOffset`) and line 6 clamps to the
  top (`0`) automatically.
- The breather translation (`+ 1`) lives here, so the viewer/helper stay in
  clean content-row space. Only `bottom` is used today; `top`/`center` are
  defined for completeness and future reuse.

### 4. User-override coexistence — free, by construction

Because the effect fires **once per line** (the anchor row is identical across a
line's three casts), a manual scroll (↑/↓/PgUp/PgDn/g/G) within a line is **not**
overridden — the effect doesn't re-run until the line advances, at which point it
re-pins. No override flag or extra state is needed.

A viewport resize mid-line re-fires the effect and re-pins; this is an
acceptable, expected re-pin trigger.

### 5. Mode transitions

- Entering `casting` (line 1): `autoScrollTarget` goes from `null` → line-1
  anchor, firing the initial pin to the bottom of the table.
- Each subsequent line advance: `row` changes, re-pins.
- `casting` → `computing`/`done`: `autoScrollTarget` becomes `null`; the effect
  early-returns and the offset is left as-is. `done` scrolling stays
  user-driven (non-goal to reset).

## Data flow

```
viewer.tsx
  state.lineIndex ──► castingTableActiveRow(lineIndex)  [content-row]
                       │
                       ▼
        autoScrollTarget={ row, align:'bottom' }  (prop, casting mode only)
                       │
                       ▼
consultation-readout.tsx
   useEffect ─► windowedRow = row + 1
            ─► target = windowedRow - (viewportHeight - 1 - MARGIN)
            ─► offsetsRef[activeIndex] = clamp(target, 0, maxOffset)
            ─► forceRender()
                       │
                       ▼
        existing windowing: rowsWithBreathers.slice(offset, offset+viewportHeight)
```

## Error / edge handling

- **Short viewport (manual, 22-row prompt box):** viewport may be 3–6 rows.
  Bottom-align + clamp keeps the active line's last data row visible at/near the
  bottom; the trailing breather provides natural bottom padding at the extreme.
- **Tall viewport:** line 6 clamps to offset `0` (top); lower lines sit
  progressively lower — the intended "accumulate above" behavior.
- **`autoScrollTarget == null`:** effect no-ops (random pre-`casting`, computing,
  done).
- **Tab count / activeIndex churn:** the effect writes `offsetsRef[activeIndex]`;
  during casting `activeIndex` is the locked Casting tab, so writes always land
  on the right tab.

## Testing

1. **Unit — geometry** (`@hexagram/readout`): `castingTableActiveRow(lineIndex)`
   for all six lines, locked against the documented layout
   (`3 + (5-idx)*4 + 2`): idx0→25, idx1→21, idx2→17, idx3→13, idx4→9, idx5→5.
2. **Unit — offset formula:** given `(windowedRow, viewportHeight, maxOffset,
   align:'bottom', BOTTOM_MARGIN)`, assert the clamped offset, including:
   - line 1 on a short viewport → clamps to `maxOffset` (bottom shown),
   - line 6 on a tall viewport → clamps to `0` (top shown).
   Extract the pure offset computation so it is testable without rendering.
3. **Integration** (`packages/casting-ui/tests/viewer.test.tsx`): drive a manual
   flow and a slider flow at a short terminal height; after advancing to lines 1,
   4, and 6, assert the rendered frame contains the active line's row label/glyph
   (e.g. the `⇒N` marker and the line label for that line). Reuse the existing
   ink-testing-library harness and the readiness/`onReady` pattern already used
   by viewer tests for keystroke timing.

Tests assert on row labels/markers and offsets, **not** on ANSI colour, so they
are unaffected by the turbo colour-piping pitfall.

## Files

- `packages/readout/src/output-sections.ts` (or a sibling pure module) — add
  `castingTableActiveRow` + export.
- `packages/readout/src/consultation-readout.tsx` — add `autoScrollTarget` prop,
  the apply-effect, and an extracted pure offset helper for testing.
- `packages/casting-ui/src/viewer.tsx` — compute and pass `autoScrollTarget`
  during `casting`.
- `packages/readout/src/index.ts` / package exports — export the new helper if
  it lives in a new module.
- Tests: readout unit tests + `packages/casting-ui/tests/viewer.test.tsx`.

## Docs

After implementation, update `AGENTS.md` — the casting-flow scroll paragraph
("During casting (all flows …) ↑/↓/PgUp/PgDn/g/G scroll the Casting tab table")
to note that the table now **auto-follows** the active line (pinned near the
bottom), re-asserting once per line and yielding to manual scroll within a line.
