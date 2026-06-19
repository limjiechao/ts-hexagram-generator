// ---------------------------------------------------------------------------
// Geometry constants (single-column model)
// ---------------------------------------------------------------------------

import {
  MOVING_ARROW,
  TRIGRAM_DIVIDER_WIDTH,
} from '@hexagram/text-grid/geometry'

/** Focus-chevron column (always reserved, even when not focused). */
export const CHEVRON_WIDTH = 2

/**
 * Width of the bar+pos block on each side (no chevron):
 *   value(1) + 2sp + bar(9) + 2sp + pos(11) = 25 cols.
 * This IS the consultation IR's per-side bar block (`transformationHalfRow`
 * emits the same value/glyph/position skeleton), so it is sourced from the
 * single authority — `TRIGRAM_DIVIDER_WIDTH` — rather than re-pegged here.
 */
export const BAR_BLOCK_WIDTH: number = TRIGRAM_DIVIDER_WIDTH

/** Width of the left line cell (chevron + bar block). */
export const LEFT_LINE_WIDTH: number = CHEVRON_WIDTH + BAR_BLOCK_WIDTH

/** Width of the right line cell (no chevron on the right). */
export const RIGHT_LINE_WIDTH: number = BAR_BLOCK_WIDTH

/** Inter-column gap — shares the transformation section's arrow/gap width. */
export const GAP_WIDTH: number = MOVING_ARROW.length

// The playground's left column ends exactly where the consultation's right
// column begins (col 46), flush by construction: LEFT_LINE_WIDTH + GAP_WIDTH =
// CHEVRON_WIDTH(2) + TRIGRAM_DIVIDER_WIDTH(25) + MOVING_ARROW.length(19) = 46 =
// RIGHT_COLUMN. The bar block and the connector are now both sourced from the
// shared IR vocabulary, so there is nothing left to drift at runtime.

/**
 * Worst-case identity-stack row width in display cols, scanned across all
 * 64 hexagrams. As of 2026-05-26 the worst case is hexagram #9 小畜
 * (Hsiao Ch’u / The Taming Power of the Small — 42 cols on the Wilhelm-Baynes
 * row); the new trigram rows (`Upper: 巽 Xùn (Wind, wood)` etc., 26 cols max)
 * are narrower than that. Re-run the scan after any hexagram-data change:
 *
 *   pnpm --filter @hexagram/playground-ui exec tsx \
 *     scripts/measure-identity-stack-width.ts
 *
 * The `top-half-width-invariant.test.ts` test guards this constant — it fails
 * if the actual max ever exceeds `IDENTITY_STACK_WIDTH`.
 */
export const IDENTITY_STACK_WIDTH = 42

/**
 * Right-side identity cell width: the larger of the line block and the
 * identity-stack row. Drives where the row's right padding starts.
 */
export const RIGHT_IDENTITY_CELL_WIDTH: number = Math.max(
  RIGHT_LINE_WIDTH,
  IDENTITY_STACK_WIDTH,
)

/**
 * Left-side identity cell width: stretches from after the chevron (col 2) up
 * to the start of the right column (col `LEFT_LINE_WIDTH + GAP_WIDTH = 46`),
 * so identity rows up to 44 cols sit before the right column begins. The
 * worst-case identity (42 cols) fits with 2 cols of margin.
 */
export const LEFT_IDENTITY_CELL_WIDTH: number =
  LEFT_LINE_WIDTH + GAP_WIDTH - CHEVRON_WIDTH

/** Total display width of every emitted row. */
export const TOP_HALF_WIDTH: number =
  LEFT_LINE_WIDTH + GAP_WIDTH + RIGHT_IDENTITY_CELL_WIDTH

/**
 * Number of rows in the top-half block: 1 header + 6 line rows + 1 blank
 * + 2 name rows + 1 divider + 2 trigram rows = 13. Exported so
 * `<PlaygroundApp>` can size its top-half slot without re-deriving the
 * row count.
 */
export const TOP_HALF_ROWS = 13

/**
 * Visible width of the identity-stack divider on each side — matches the
 * bar block above so the divider lines up with the hexagram structure.
 */
export const IDENTITY_DIVIDER_WIDTH: number = BAR_BLOCK_WIDTH
