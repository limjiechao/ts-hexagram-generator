/**
 * Pure focus-following row-windowing logic for the history list.
 *
 * The history list renders a fixed-height window onto a (possibly longer)
 * list of rows. As the focus cursor moves, the window slides just enough to
 * keep the focused row visible — the window is "sticky" otherwise, so paging
 * and jumping feel stable.
 */

export interface RowWindow {
  /** Index of the first rendered row (inclusive). */
  start: number
  /** Index just past the last rendered row (exclusive). */
  end: number
  /** Count of rows scrolled off the top edge (`start`). */
  above: number
  /** Count of rows scrolled off the bottom edge (after `end`). */
  below: number
}

/**
 * Compute the new window start so that `focusIndex` stays visible, moving the
 * previous window (`currentStart`) as little as possible.
 *
 * - When the whole list fits (`totalRows <= windowHeight`), the window is
 *   pinned to 0.
 * - When focus is above the current window, the window scrolls up to it.
 * - When focus is below the current window, the window scrolls down so the
 *   focused row sits on the last visible line.
 * - Otherwise the window does not move.
 *
 * The result is always clamped to `[0, max(0, totalRows - windowHeight)]`.
 */
export function computeWindowStart(
  totalRows: number,
  windowHeight: number,
  focusIndex: number,
  currentStart: number,
): number {
  if (windowHeight <= 0 || totalRows <= 0) return 0
  if (totalRows <= windowHeight) return 0

  const maxStart = totalRows - windowHeight
  const clampedFocus = Math.min(Math.max(focusIndex, 0), totalRows - 1)

  let start = Math.min(Math.max(currentStart, 0), maxStart)
  if (clampedFocus < start) {
    start = clampedFocus
  } else if (clampedFocus > start + windowHeight - 1) {
    start = clampedFocus - windowHeight + 1
  }
  return Math.min(Math.max(start, 0), maxStart)
}

/**
 * Resolve the full window descriptor — `start`/`end` plus the off-edge
 * `above`/`below` counts used to render the "… N above" / "… N more"
 * indicators.
 */
export function resolveRowWindow(
  totalRows: number,
  windowHeight: number,
  focusIndex: number,
  currentStart: number,
): RowWindow {
  const start = computeWindowStart(
    totalRows,
    windowHeight,
    focusIndex,
    currentStart,
  )
  const visible = Math.max(0, Math.min(windowHeight, totalRows - start))
  const end = start + visible
  return {
    start,
    end,
    above: start,
    below: Math.max(0, totalRows - end),
  }
}
