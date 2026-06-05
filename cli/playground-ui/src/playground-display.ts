// Pure renderer for the Playground's P6 top-half layout. Builds the
// 13-row ANSI block consumed by `<PlaygroundApp>` (header row + 6 line rows
// + blank + 4 identity rows + divider between rows 2 and 3 of the identity
// stack). No React, no Ink — every output is a deterministic function of
// the inputs, so the geometry, padding, dim-ghost behaviour, and chevron
// placement are all unit-testable without rendering.
//
// Single-column geometry model (all three layers share one anchor):
//
//   col 0 1 2 ........... 26 27 .......... 45 46 .......... 70 71 ... 87
//       [chev]   [bar block 25]  [gap 19]      [bar block 25]   [pad]
//       └─ chevron(2)  └─ value(1)+2sp+bar(9)+2sp+pos(11) ─┘
//
//   * Line rows:        chevron + standing(25) + gap(19) + emerging(25) → pad to TOP_HALF_WIDTH
//   * Header row:       blank chev + 'Standing Hexagram' left-flush in 25 + gap(19) +
//                       'Emerging Hexagram' left-flush in 25 → pad. The "S" / "E"
//                       sit directly above the line value digits below them, so
//                       the header lines up with the casting viewer's
//                       transformation tab.
//   * Identity rows:    blank chev + left-flush ID (≤ 44 cols, overlaps into gap on left only)
//                       + right-flush anchor at col 46 + left-flush ID (≤ 42 cols)
//
// `TOP_HALF_WIDTH` is driven by the worst-case identity row on the right side
// (where the chevron column isn't reserved), so the right ID extends from
// col 46 to col 46 + max(RIGHT_LINE_WIDTH, IDENTITY_STACK_WIDTH).
//
// When `hasMoving === false`, the emerging side is a "dim ghost" — same
// identity as standing but rendered in NORMAL_GREY everywhere.

import type { Hexagram, Line } from '@hexagram/core/types'

import { TOP_HALF_WIDTH } from './playground-display-geometry.js'
import {
  buildHeaderRow,
  buildIdentityStack,
  buildLineRow,
} from './playground-display-rows.js'
import { padRightToWidth } from './playground-display-text.js'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PlaygroundDisplayInputs {
  readonly standing: Hexagram
  /** Already computed by caller via `getEmergingHexagram`. */
  readonly emerging: Hexagram
  /** 0..5 bottom-first cursor; always supplied by the playground reducer. */
  readonly focusIndex: number
  /** Pulse beat from `usePulse`; only consulted for moving lines. */
  readonly pulse: boolean
  /** Whether the standing hexagram has any moving lines. */
  readonly hasMoving: boolean
}

export interface PlaygroundDisplayOutput {
  /** Rendered ANSI rows, in render order, ready for one-per-`<Text>` emission. */
  readonly rows: string[]
  /** Total display width (cols) of every row. */
  readonly width: number
}

/**
 * Build the playground's top-half display block: header + 6 line rows
 * + blank + 2 name rows + 1 divider + 2 trigram rows = `TOP_HALF_ROWS`
 * rows total. Every row is padded to exactly `TOP_HALF_WIDTH` display
 * columns.
 */
export function buildPlaygroundDisplay(
  inputs: PlaygroundDisplayInputs,
): PlaygroundDisplayOutput {
  const { standing, emerging, focusIndex, hasMoving } = inputs

  const rows: string[] = []
  rows.push(buildHeaderRow())
  // Render top-down: L6, L5, ..., L1 (line at bottom is first; displayed at
  // the bottom of the block). `lineIndex` is the bottom-first 0..5 index used
  // to match `focusIndex`.
  for (let lineIndex = 5; lineIndex >= 0; lineIndex--) {
    rows.push(
      buildLineRow({
        standingLine: standing[lineIndex] as Line,
        emergingLine: emerging[lineIndex] as Line,
        position: (lineIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6,
        focused: focusIndex === lineIndex,
        hasMoving,
      }),
    )
  }
  rows.push(
    padRightToWidth('', TOP_HALF_WIDTH),
    ...buildIdentityStack(standing, emerging, hasMoving),
  )

  return { rows, width: TOP_HALF_WIDTH }
}
