// Pure helpers for the Playground's line transitions. No React, no
// Ink, no I/O — every function is deterministic and unit-testable in
// isolation. The reducer in `playground-state.ts` composes these primitives;
// see also `playground-keymap.ts` for the input → action mapping.
//
// Vocabulary:
//   - 7 = young yang  (solid, static)   ━━━━━━━━━
//   - 8 = young yin   (broken, static)  ━━━   ━━━
//   - 9 = old yang    (solid, moving)   ━━━━○━━━━
//   - 6 = old yin     (broken, moving)  ━━━ ✕ ━━━
// Moving lines transform on commit: 6→7, 9→8 (the emerging hexagram).

import { getEmergingHexagram } from '@hexagram/core/getters'
import type { Hexagram, Line } from '@hexagram/core/types'
import { isMovingLine } from '@hexagram/viewer-core'

/** The Playground opens on Qian #1 — all six lines young yang (7). */
export const INITIAL_HEXAGRAM: Hexagram = [7, 7, 7, 7, 7, 7]

/** All four `Line` values; total order picked by the spec for cycling. */
const CYCLE_FORWARD: readonly Line[] = [7, 9, 8, 6] as const

/**
 * Forward cycle: 7 → 9 → 8 → 6 → 7. Each `→` press advances one step.
 * Not a Gray-coded perimeter — the spec chose the digit-tour order, which
 * groups yang values (7,9) then yin values (8,6) on the cycle.
 */
export function cycleLineForward(line: Line): Line {
  const index = CYCLE_FORWARD.indexOf(line)
  // `Line` is an exhaustive union, but TS can't narrow `indexOf`'s number
  // return — fall through to 7 if a future Line value sneaks past the type.
  return CYCLE_FORWARD[(index + 1) % CYCLE_FORWARD.length] ?? 7
}

/**
 * Backward cycle: 7 → 6 → 8 → 9 → 7. Each `←` press steps in reverse so
 * pressing `←` once after `→` arrives at the previous state.
 */
export function cycleLineBackward(line: Line): Line {
  const index = CYCLE_FORWARD.indexOf(line)
  // Same TS-narrowing fall-through as `cycleLineForward`.
  return (
    CYCLE_FORWARD[(index - 1 + CYCLE_FORWARD.length) % CYCLE_FORWARD.length] ??
    7
  )
}

/**
 * Flip polarity preserving motion: 7↔8, 9↔6. SPACE in the playground performs
 * this — it is orthogonal to the ←/→ cycle's motion axis, so a user can
 * compose `SPACE` (polarity) and `←/→` (motion) to reach any state in ≤2
 * keystrokes from any other.
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

/**
 * Replace one line at `index` (0..5, bottom-first) with `next`. Returns a new
 * `Hexagram`; never mutates the input.
 */
export function setLineAt(
  hexagram: Hexagram,
  index: number,
  next: Line,
): Hexagram {
  const copy = [...hexagram] as Hexagram
  if (index >= 0 && index < copy.length) copy[index] = next
  return copy
}

/**
 * What `buildPlaygroundDerivation` returns — the fully derived render inputs
 * for the two trigram cards, the per-line moving-arrow mask, and the
 * single-moving-line gate that the judgment strip reads.
 */
export interface PlaygroundDerivation {
  /** The currently configured (standing) hexagram, bottom-first. */
  readonly standing: Hexagram
  /** The emerging hexagram after 6→7, 9→8. */
  readonly emerging: Hexagram
  /** 0-based bottom-first indices of moving lines in `standing`. */
  readonly movingIndices: readonly number[]
  /** Convenience: `movingIndices.length > 0`. */
  readonly hasMoving: boolean
  /**
   * The single moving line's 0-based index when exactly one line moves;
   * `null` for 0 or 2+. Drives the judgment-strip render condition.
   */
  readonly singleMovingIndex: number | null
}

/**
 * Derive everything the playground display needs from a `standing`
 * hexagram. Pure, cheap, and called once per render — the result is the
 * single source of truth fed to the cards, the per-line arrow mask, and the
 * judgment strip.
 */
export function buildPlaygroundDerivation(
  standing: Hexagram,
): PlaygroundDerivation {
  const emerging = getEmergingHexagram(standing)
  const movingIndices = movingLineIndices(standing)
  const hasMoving = movingIndices.length > 0
  const singleMovingIndex =
    movingIndices.length === 1 ? (movingIndices[0] as number) : null
  return { standing, emerging, movingIndices, hasMoving, singleMovingIndex }
}
