// Functional Core for the home banner — pure render derivation. Given a single
// line's polarity (yang/yin), whether it is currently a moving line, and the
// current pulse beat, derive the three things the Ink shell needs to draw the
// line: a fixed-width bar glyph string, the numeric casting value, and a
// colour role. No React, no I/O — every output is a pure function of the
// inputs, so the derivation is unit-testable without rendering Ink.
//
// This slice (#36) renders only settled lines, so `moving` is always false in
// production today. The `moving` / `pulse` parameters exist now so Slice 2
// (#37) can light up the animation without reshaping this interface.

import type { Line } from '@hexagram/types'

/** A line's polarity: `yang` is solid, `yin` is broken. */
export type LinePolarity = 'yang' | 'yin'

/**
 * The colour role of a banner line — the shell maps this to palette SGR runs.
 * `static` lines are bold-grey bars with normal-grey values; a moving line is
 * drawn entirely red, pulsing `moving-bright` ↔ `moving-dim`.
 */
export type BannerLineRole = 'static' | 'moving-bright' | 'moving-dim'

/** The render-ready cells for one banner line. */
export interface BannerLineCells {
  /** The 9-column bar glyph string — no ANSI. */
  readonly bar: string
  /** The casting value drawn beside the bar: 7/8 settled, 9/6 moving. */
  readonly value: Line
  /** Colour role; the shell maps it to palette SGR runs. */
  readonly role: BannerLineRole
}

// Fixed-width (9-column) bar glyphs. `━` U+2501, `○` U+25CB, `✕` U+2715.
const YANG_STATIC = '━━━━━━━━━'
const YANG_MOVING = '━━━━○━━━━'
const YIN_STATIC = '━━━   ━━━'
const YIN_MOVING = '━━━ ✕ ━━━'

/**
 * Classify a casting `Line` value by polarity. Solid lines (7 young yang,
 * 9 moving yang) are `yang`; broken lines (8 young yin, 6 moving yin) are
 * `yin`.
 */
export function polarityOf(line: Line): LinePolarity {
  return line === 7 || line === 9 ? 'yang' : 'yin'
}

/**
 * Derive the render-ready cells for one banner line. A moving line takes the
 * marked bar (`○` / `✕`), the moving casting value (9 / 6), and a pulsing red
 * role; a settled line takes the plain bar, the young value (7 / 8), and the
 * `static` role.
 */
export function deriveBannerLine(
  polarity: LinePolarity,
  moving: boolean,
  pulse: boolean,
): BannerLineCells {
  const movingRole: BannerLineRole = pulse ? 'moving-bright' : 'moving-dim'
  const role: BannerLineRole = moving ? movingRole : 'static'

  if (polarity === 'yang') {
    return {
      bar: moving ? YANG_MOVING : YANG_STATIC,
      value: moving ? 9 : 7,
      role,
    }
  }
  return {
    bar: moving ? YIN_MOVING : YIN_STATIC,
    value: moving ? 6 : 8,
    role,
  }
}
