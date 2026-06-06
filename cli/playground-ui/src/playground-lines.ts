// Pure helpers for the Playground's line transitions. No React, no
// Ink, no I/O — every function is deterministic and unit-testable in
// isolation. The reducer in `playground-state.ts` composes these primitives;
// see also `playground-keymap.ts` for the input → action mapping.
//
// Line vocabulary (6/7/8/9, moving lines) → @hexagram/core line-semantics.ts.

import {
  getEmergingHexagram,
  movingLineIndices,
} from '@hexagram/core/line-semantics'
import type { Hexagram, Line } from '@hexagram/core/types'

/** The Playground opens on Qian #1 — all six lines young yang (7). */
export const INITIAL_HEXAGRAM: Hexagram = [7, 7, 7, 7, 7, 7]

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
