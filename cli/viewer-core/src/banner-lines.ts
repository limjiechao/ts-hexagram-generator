// Pure render derivation for an animated hexagram line. Given a single line's
// polarity (yang/yin), whether it is currently a moving line, and the current
// pulse beat, derive the three things an Ink renderer needs to draw the line:
// a fixed-width bar glyph string, the numeric casting value, and a colour
// role. No React, no I/O — every output is a pure function of the inputs, so
// the derivation is unit-testable without rendering Ink.
//
// Originally introduced for the home banner; lifted here so the casting
// readout, the home banner, and the playground can all share one
// glyph + role vocabulary without `playground-ui` depending on `shell`.

import { LINE_GLYPH } from '@hexagram/consultation-view'
import type { LinePolarity } from '@hexagram/core/line-semantics'
import type { Line } from '@hexagram/core/types'

import { BOLD_GREY, BOLD_RED, DIM_RED, NORMAL_GREY } from './output-palette.js'

export type { LinePolarity }

/**
 * The colour role of an animated hexagram line — the shell maps this to
 * palette SGR runs. `static` lines are bold-grey bars with normal-grey
 * values; a moving line is drawn entirely red, pulsing `moving-bright` ↔
 * `moving-dim`.
 */
export type LineRole = 'static' | 'moving-bright' | 'moving-dim'

/** The render-ready cells for one animated hexagram line. */
export interface LineCells {
  /** The 9-column bar glyph string — no ANSI. */
  readonly bar: string
  /** The casting value drawn beside the bar: 7/8 settled, 9/6 moving. */
  readonly value: Line
  /** Colour role; the shell maps it to palette SGR runs. */
  readonly role: LineRole
}

/** The colour role for a line, by its moving + pulse state. */
function roleOf(moving: boolean, pulse: boolean): LineRole {
  if (!moving) return 'static'
  return pulse ? 'moving-bright' : 'moving-dim'
}

/**
 * Derive the render-ready cells for one animated hexagram line. A moving
 * line takes the marked bar (`○` / `✕`), the moving casting value (9 / 6),
 * and a pulsing red role; a settled line takes the plain bar, the young
 * value (7 / 8), and the `static` role.
 */
export function deriveBannerLine(
  polarity: LinePolarity,
  moving: boolean,
  pulse: boolean,
): LineCells {
  const role = roleOf(moving, pulse)

  if (polarity === 'yang') {
    return {
      bar: moving ? LINE_GLYPH[9] : LINE_GLYPH[7],
      value: moving ? 9 : 7,
      role,
    }
  }
  return {
    bar: moving ? LINE_GLYPH[6] : LINE_GLYPH[8],
    value: moving ? 6 : 8,
    role,
  }
}

/**
 * The two SGR runs for a line, by colour role: `[value colour, bar colour]`.
 * Shared by every line renderer (`<AnimatedBanner>` for the home banner;
 * `<LineCard>` for the playground) so the same `LineRole` always maps to the
 * same on-screen colour.
 */
export function lineColors(role: LineRole): readonly [string, string] {
  switch (role) {
    case 'static':
      return [NORMAL_GREY, BOLD_GREY]
    case 'moving-bright':
      return [BOLD_RED, BOLD_RED]
    case 'moving-dim':
      return [DIM_RED, DIM_RED]
  }
}
