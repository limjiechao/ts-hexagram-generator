// The pure Line → Line / boolean algebra of the I Ching casting vocabulary —
// the single authoritative home for "what is a moving line", polarity, the
// polarity flip, and the playground's forward/backward cycle. No glyphs, no
// labels, no colours (those live in the render layers); every function here is
// a deterministic function of `Line`/`Hexagram` values and is reusable by any
// consumer of @hexagram/core, including a future web adapter, without pulling
// in a CLI package.
//
// Line semantics:
//   - 7 = young yang  (solid, static)
//   - 8 = young yin   (broken, static)
//   - 9 = old yang    (solid, moving → becomes 8)
//   - 6 = old yin     (broken, moving → becomes 7)

import type { Hexagram, Line } from './types.js'

/** A line's polarity: `yang` is solid, `yin` is broken. */
export type LinePolarity = 'yang' | 'yin'

/** A moving line is an old line (6 old yin, 9 old yang); it transforms. */
export function isMovingLine(line: Line): line is Extract<Line, 6 | 9> {
  return line === 6 || line === 9
}

/**
 * 0-based indices (bottom-first; `0` = Line 1, `5` = Line 6) of the moving
 * lines in the given hexagram. Empty when no lines are moving.
 */
export function movingLineIndices(hexagram: Hexagram): number[] {
  const indices: number[] = []
  for (const [index, line] of hexagram.entries()) {
    if (isMovingLine(line)) indices.push(index)
  }
  return indices
}

/** Whether the hexagram has at least one moving line (6 or 9). */
export function hasMovingLines(hexagram: Hexagram): boolean {
  return hexagram.some(isMovingLine)
}

/**
 * Classify a casting `Line` by polarity. Solid lines (7 young yang, 9 moving
 * yang) are `yang`; broken lines (8 young yin, 6 moving yin) are `yin`.
 */
export function polarityOf(line: Line): LinePolarity {
  return line === 7 || line === 9 ? 'yang' : 'yin'
}

/**
 * Flip polarity preserving motion: 7↔8, 9↔6. Orthogonal to the cycle's motion
 * axis, so composing flip + cycle reaches any state in ≤2 steps from any other.
 */
export function flipPolarity(line: Line): Line {
  switch (line) {
    case 7:
      return 8
    case 8:
      return 7
    case 9:
      return 6
    case 6:
      return 9
  }
}

// Moving lines collapse to their non-moving counterparts: 6→7, 9→8;
// static lines pass through.
const EMERGING_LINE = {
  6: 7,
  7: 7,
  8: 8,
  9: 8,
} as const satisfies Record<Line, Line>

/**
 * The emerging hexagram: collapse every moving line to its static counterpart
 * (6→7, 9→8), leaving static lines unchanged.
 */
export function getEmergingHexagram(hexagram: Hexagram): Hexagram {
  return hexagram.map((line) => EMERGING_LINE[line]) as Hexagram
}

/** The four `Line` values in the cycle's total order (spec's digit-tour). */
const CYCLE_FORWARD: readonly Line[] = [7, 9, 8, 6] as const

/**
 * Forward cycle: 7 → 9 → 8 → 6 → 7. Not a Gray code — the spec chose this
 * digit-tour order, grouping yang values (7, 9) then yin values (8, 6).
 */
export function cycleLineForward(line: Line): Line {
  const index = CYCLE_FORWARD.indexOf(line)
  // `Line` is an exhaustive union, but TS can't narrow `indexOf`'s number
  // return — fall through to 7 if a future Line value sneaks past the type.
  return CYCLE_FORWARD[(index + 1) % CYCLE_FORWARD.length] ?? 7
}

/**
 * Backward cycle: 7 → 6 → 8 → 9 → 7 — the inverse of `cycleLineForward` over
 * the same order, so one backward step undoes one forward step.
 */
export function cycleLineBackward(line: Line): Line {
  const index = CYCLE_FORWARD.indexOf(line)
  return (
    CYCLE_FORWARD[(index - 1 + CYCLE_FORWARD.length) % CYCLE_FORWARD.length] ??
    7
  )
}
