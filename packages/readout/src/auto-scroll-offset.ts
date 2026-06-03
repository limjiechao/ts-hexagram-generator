import { clamp } from '@hexagram/viewer-core'

/**
 * One-row gap kept below the pinned active row where the viewport has space.
 * Collapses on very short viewports (see the `fromBottom` clamp).
 */
export const AUTO_SCROLL_BOTTOM_MARGIN = 1

/**
 * Bottom-aligned auto-scroll offset for the casting table.
 *
 * `row` is in content-row space (the casting section's own rows, before the
 * readout prepends its leading breather). Returns the vertical scroll offset
 * that seats that row near the bottom of the viewport, leaving a one-row margin
 * where space allows. The margin collapses on tiny viewports so the active row
 * never overshoots off the bottom; the result is clamped to [0, maxOffset].
 */
export function computeAutoScrollOffset(params: {
  row: number
  viewportHeight: number
  maxOffset: number
}): number {
  const { row, viewportHeight, maxOffset } = params
  const windowedRow = row + 1 // one leading breather row in rowsWithBreathers
  const fromBottom = clamp(
    viewportHeight - 1 - AUTO_SCROLL_BOTTOM_MARGIN,
    0,
    viewportHeight - 1,
  )
  return clamp(windowedRow - fromBottom, 0, maxOffset)
}
