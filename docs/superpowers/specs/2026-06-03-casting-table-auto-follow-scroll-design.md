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

### 1. Geometry helper — pure, **co-located inside `output-sections.ts`** with named constants

A pure function maps the active line index to the content-row of that line's
**last data row** (the cast-1 / block-bottom row), the row to pin near the
viewport bottom. It is defined **in `output-sections.ts`, next to
`castingSection`**, and expressed via **named layout constants** that the
renderer's own row assembly references, so the two can't drift apart unnoticed.

The actual casting-tab content-row layout was verified against
`castingSection(null)` — note the `CASTING:` title line and the blank line are
part of the tab content (not stripped), so the header is **5 rows**, not 3:

```ts
// in packages/readout/src/output-sections.ts (with castingSection)
//
// Casting section content-row layout (0-based), top-first — 28 rows total:
//   0  "CASTING:" title line          ── header (5 rows) ──
//   1  (blank)
//   2  左Left / 右Right banner
//   3  爻Line 變Cast … column header
//   4  ═╪═ header rule
//   5..8   line 6 block: cast3 (⇒6, labeled), cast2, cast1, blockRule
//   9..12  line 5 block
//   13..16 line 4 block
//   17..20 line 3 block
//   21..24 line 2 block
//   25..27 line 1 block: cast3 (⇒1), cast2, cast1   (no trailing blockRule)
//
// lineIndex: 0 => line 1 (bottom), 5 => line 6 (top)
export const CASTING_HEADER_ROWS = 5 // title, blank, banner, header, rule
export const CASTING_ROWS_PER_BLOCK = 4 // cast3, cast2, cast1, blockRule
export const CAST1_OFFSET_IN_BLOCK = 2 // cast-1 row, relative to block top

export function castingTableActiveRow(lineIndex: number): number {
  const blockTop = CASTING_HEADER_ROWS + (5 - lineIndex) * CASTING_ROWS_PER_BLOCK
  return blockTop + CAST1_OFFSET_IN_BLOCK
}
// line 1 (idx 0) -> 27 ; line 6 (idx 5) -> 7
```

This is expressed in the casting section's own **content-row** space (rows
0–27). The breather translation is the readout's job (§3), so the helper never
needs to know about padding. A **consistency test** (see § Testing) renders
`castingSection` and asserts these constants still describe its output.

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

### 3. Readout apply — render-phase ref guard — `packages/readout/src/consultation-readout.tsx`

New optional prop. `align` is narrowed to the single variant the feature uses —
no speculative `top`/`center` arms:

```ts
readonly autoScrollTarget?: {
  readonly row: number // content-row space (pre-breather)
  readonly align: 'bottom'
} | null
```

Applied with a **render-phase ref guard**, mirroring the existing
`lastResetTokenRef` mechanism that already resets `castingHorizontalOffsetRef`
when `castingPromptPan.resetToken` changes (consultation-readout.tsx:248–259).
This runs *during render*, before `offset` is computed from `offsetsRef`, so the
new offset lands on the **first** paint of a line change — no post-commit effect,
no `forceRender`, no `eslint-disable`, no one-frame flash:

```ts
const lastAutoScrollRowRef = useRef<number>(-1)
if (autoScrollTarget != null) {
  if (autoScrollTarget.row !== lastAutoScrollRowRef.current) {
    const windowedRow = autoScrollTarget.row + 1 // one leading breather row
    const BOTTOM_MARGIN = 1 // keep the active line off the very edge
    // align: 'bottom' — seat the active row at visible position
    // (viewportHeight - 1 - MARGIN), clamped so a tiny viewport (≤ MARGIN+1
    // rows) never overshoots and pushes the active row off the bottom.
    const fromBottom = clamp(
      viewportHeight - 1 - BOTTOM_MARGIN,
      0,
      viewportHeight - 1,
    )
    const target = windowedRow - fromBottom
    offsetsRef.current[activeIndex] = clamp(target, 0, maxOffset)
    lastAutoScrollRowRef.current = autoScrollTarget.row
  }
} else {
  // Reset so re-entry into a casting flow re-pins from scratch.
  lastAutoScrollRowRef.current = -1
}
// `offset` is then computed from `offsetsRef` as today and picks up the
// write in the same frame.
```

Notes:
- The guard keys on `autoScrollTarget.row` only. Because the row is identical
  across a line's three casts (it is a function of `lineIndex`), the write fires
  exactly **once per line** — a manual scroll within a line is not clobbered
  (see § "User-override coexistence").
- This is intentionally **not** re-applied on viewport resize. The existing
  `offset = clamp(offsetsRef[...], 0, maxOffset)` already re-clamps every render,
  so a resize keeps the offset valid without forcibly re-pinning (which would
  discard a mid-line manual scroll). Resize re-pin is a deliberate non-goal.
- `clamp`/`maxOffset`/`offsetsRef`/`viewportHeight` all already exist in this
  component. Line 1 clamps to the bottom (`maxOffset`); line 6 clamps to the top
  (`0`).
- The breather translation (`+ 1`) lives here, so the viewer/helper stay in
  clean content-row space. `align` is `'bottom'`-only; widen the union and add
  the branch if a second alignment is ever genuinely needed.

### 4. User-override coexistence — free, by construction

Because the render-phase guard fires **once per line** (the anchor row is
identical across a line's three casts), a manual scroll (↑/↓/PgUp/PgDn/g/G)
within a line is **not** overridden — the guard does not re-write until the line
advances, at which point it re-pins. No override flag or extra state is needed.

A viewport resize mid-line does **not** re-pin: the existing per-render
`clamp(offsetsRef[...], 0, maxOffset)` keeps the offset valid, but the guard only
re-writes when `autoScrollTarget.row` changes. This preserves a mid-line manual
scroll across a resize.

### 5. Mode transitions

- Entering `casting` (line 1): `autoScrollTarget` goes from `null` → line-1
  anchor, firing the initial pin to the bottom of the table.
- Each subsequent line advance: `row` changes, re-pins.
- `casting` → `computing`/`done`: `autoScrollTarget` becomes `null`; the guard
  resets `lastAutoScrollRowRef` to `-1` and leaves the offset as-is. `done`
  scrolling stays user-driven (non-goal to reset).

## Data flow

```
viewer.tsx
  state.lineIndex ──► castingTableActiveRow(lineIndex)  [content-row]
                       │
                       ▼
        autoScrollTarget={ row, align:'bottom' }  (prop, casting mode only)
                       │
                       ▼
consultation-readout.tsx  (render phase, guarded by lastAutoScrollRowRef)
   if row changed ─► windowedRow = row + 1
                  ─► fromBottom = clamp(viewportHeight-1-MARGIN, 0, viewportHeight-1)
                  ─► offsetsRef[activeIndex] = clamp(windowedRow - fromBottom, 0, maxOffset)
                       │
                       ▼
   offset = clamp(offsetsRef[activeIndex], 0, maxOffset)   (same frame)
                       │
                       ▼
        existing windowing: rowsWithBreathers.slice(offset, offset+viewportHeight)
```

## Error / edge handling

- **Short viewport (manual, 22-row prompt box):** the table viewport is
  `termRows − ~30`, so it can collapse to 1 row on a ~30-row terminal. The
  `fromBottom = clamp(viewportHeight − 1 − BOTTOM_MARGIN, 0, viewportHeight − 1)`
  guard keeps the anchored row (the active line's **cast-1 / block-bottom** row)
  on-screen even at `viewportHeight === 1`, where it overshoots without the
  clamp. When the viewport is shorter than the 3-row line block, the block bottom
  wins and the labeled `⇒N` (cast-3) row may be clipped above the fold — accepted
  (the user can still hand-scroll); we do **not** special-case the identity row.
- **Tall viewport:** line 6 clamps to offset `0` (top); lower lines sit
  progressively lower — the intended "accumulate above" behavior.
- **`autoScrollTarget == null`:** effect no-ops (random pre-`casting`, computing,
  done).
- **Tab count / activeIndex churn:** the effect writes `offsetsRef[activeIndex]`;
  during casting `activeIndex` is the locked Casting tab, so writes always land
  on the right tab.

## Testing

1. **Unit — geometry** (`@hexagram/readout`): `castingTableActiveRow(lineIndex)`
   for all six lines, locked against the verified layout
   (`7 + (5-idx)*4`): idx0→27, idx1→23, idx2→19, idx3→15, idx4→11, idx5→7.
2. **Consistency / contract test** (`@hexagram/readout`): render
   `castingSection(null)`, split into rows, and for each line locate its cast-1
   row by structure (the `蓍Stalks` value column / `⇒N` label two rows above),
   then assert that index equals `castingTableActiveRow(lineIndex)`. This fails
   loudly if `castingSection`'s header height, block height, or ordering ever
   changes — the single guard against the constants in §1 drifting from the
   renderer.
3. **Unit — offset formula:** given `(windowedRow, viewportHeight, maxOffset,
   BOTTOM_MARGIN)`, assert the clamped offset (the `fromBottom`-clamped
   bottom-align), including:
   - line 1 on a short viewport → clamps to `maxOffset` (bottom shown),
   - line 6 on a tall viewport → clamps to `0` (top shown),
   - `viewportHeight === 1` → the active row itself is visible (no overshoot).
   Extract the pure offset computation so it is testable without rendering.
4. **Readout-level render test — PRIMARY behavioral check**
   (`@hexagram/readout`): render `ConsultationReadout` directly with a fixed
   `autoScrollTarget={{ row, align: 'bottom' }}`, a locked partial casting, and a
   deliberately **short terminal** so the 28-row table overflows the viewport.
   Assert the visible window both **contains** the active line's labeled `⇒N`
   row **and excludes** a row from the opposite end of the table (so the test
   proves it actually scrolled, not merely that everything fit). No flow, no
   timers, no `useInput` — deterministic. Cover at least line 1 (pins to bottom)
   and line 6 (clamps to top).
5. **Viewer integration — minimal wiring check**
   (`packages/casting-ui/tests/viewer.test.tsx`): drive the **manual flow only**,
   advance past **one** line boundary, and assert the active line's label is in
   the rendered frame — just enough to prove the viewer feeds `autoScrollTarget`
   end-to-end. Reuse the existing ink-testing-library harness and the
   readiness/`onReady` pattern. Deliberately **not** a two-flow × three-line
   matrix — the deterministic readout-level test (4) carries the behavioral load.

Tests assert on row labels/markers and offsets, **not** on ANSI colour, so they
are unaffected by the turbo colour-piping pitfall.

## Files

- `packages/readout/src/output-sections.ts` — add the `CASTING_HEADER_ROWS` /
  `CASTING_ROWS_PER_BLOCK` / `CAST1_OFFSET_IN_BLOCK` constants and
  `castingTableActiveRow`, co-located with `castingSection`; have the renderer's
  row assembly reference the same constants where practical.
- `packages/readout/src/consultation-readout.tsx` — add the `autoScrollTarget`
  prop, the render-phase ref guard (`lastAutoScrollRowRef`), and an extracted
  pure offset helper for testing.
- `packages/casting-ui/src/viewer.tsx` — compute and pass `autoScrollTarget`
  during `casting`.
- `packages/readout/src/index.ts` — export `castingTableActiveRow` (the viewer
  imports it from `@hexagram/readout`).
- Tests: readout unit + consistency tests (geometry, contract, offset) +
  `packages/casting-ui/tests/viewer.test.tsx` integration.

## Docs

After implementation, update `AGENTS.md` — the casting-flow scroll paragraph
("During casting (all flows …) ↑/↓/PgUp/PgDn/g/G scroll the Casting tab table")
to note that the table now **auto-follows** the active line (pinned near the
bottom), re-asserting once per line and yielding to manual scroll within a line.
