// Functional Core for the live home banner — the animation state machine.
// State is `{ hex, movingLines, phaseIndex }`; the cycle is the signed-off
// "Six Lines, Changing" sequence: two settled lead-in frames, twenty pulse
// frames, one flipped frame (23 frames, one 108 ms tick each ≈ 2.48 s/cycle).
// Pure: no React, no I/O, no Math.random — the RNG is injected so every frame
// transition is deterministic given a seeded RNG and unit-testable without
// rendering Ink.

import type { Hexagram, Line } from '@hexagram/types'

import {
  deriveBannerLine,
  polarityOf,
  type BannerLineCells,
} from './banner-lines.js'

/** An injected random source — returns a float in `[0, 1)`, like Math.random. */
export type Rng = () => number

/**
 * The banner animation state.
 * - `hex` — the current *settled* figure, bottom-first; only ever 7/8 values.
 * - `movingLines` — the current cycle's moving-line indices (sorted, 0..5).
 * - `phaseIndex` — cursor into the 23-frame cycle (0..22).
 */
export interface BannerState {
  readonly hex: Hexagram
  readonly movingLines: readonly number[]
  readonly phaseIndex: number
}

/** A render-ready banner frame derived from a `BannerState`. */
export interface BannerFrame {
  /** The six line cells, bottom-first (parallel to the `hex` tuple). */
  readonly lines: readonly BannerLineCells[]
  /** The hexagram whose name to display — the new figure on the flipped frame. */
  readonly nameHex: Hexagram
}

/**
 * Test-only override for `<AnimatedBanner>`, threaded down from `<HexagramApp>`.
 * Production never sets it — the live animation is the default.
 */
export interface BannerTestOverride {
  /** Deterministic RNG replacing Math.random, so frames are reproducible. */
  readonly rng: Rng
  /**
   * When true the 108 ms tick is never started — the banner freezes on its
   * initial settled frame, keeping component frame tests deterministic.
   */
  readonly disableInterval: boolean
}

/** The animation tick interval, in milliseconds (≈2.48 s for the 23-frame cycle). */
export const BANNER_TICK_MS = 108

// Cycle geometry. 0,1 settled · 2..21 pulse (20 frames) · 22 flipped.
const SETTLED_FRAMES = 2
const PULSE_FRAMES = 20
const FLIPPED_INDEX = SETTLED_FRAMES + PULSE_FRAMES // 22
const MOVE_PROBABILITY = 0.4

/** A fresh random settled hexagram — six independent young yang/yin lines. */
function randomHex(rng: Rng): Hexagram {
  return Array.from({ length: 6 }, () => (rng() < 0.5 ? 7 : 8)) as Hexagram
}

/**
 * Draw a cycle's moving-line plan: each of the six lines independently moves
 * with probability `MOVE_PROBABILITY`; if none are selected, exactly one is
 * forced at random so every cycle always transforms. Always consults `rng`
 * six times (once per line), plus once more only for the forced pick.
 */
function planMovingLines(rng: Rng): readonly number[] {
  const moving: number[] = []
  for (let index = 0; index < 6; index += 1) {
    if (rng() < MOVE_PROBABILITY) moving.push(index)
  }
  if (moving.length === 0) {
    // `rng` is contracted to [0, 1), so floor(rng() * 6) ∈ 0..5; clamp anyway
    // to stay in range against a misbehaving injected RNG.
    return [Math.min(5, Math.floor(rng() * 6))]
  }
  return moving
}

/** Toggle a settled line's polarity: yang (7) ⇄ yin (8). */
function flipLine(line: Line): Line {
  return polarityOf(line) === 'yang' ? 8 : 7
}

/** Apply a cycle's flip — toggle exactly the moving lines, leave the rest. */
function flipHexagram(hex: Hexagram, movingLines: readonly number[]): Hexagram {
  return hex.map((line, index) =>
    movingLines.includes(index) ? flipLine(line) : line,
  ) as Hexagram
}

/** The initial banner state: a random hexagram and its first cycle's plan. */
export function createBannerState(rng: Rng): BannerState {
  return {
    hex: randomHex(rng),
    movingLines: planMovingLines(rng),
    phaseIndex: 0,
  }
}

/**
 * Advance one tick. Within a cycle this only moves `phaseIndex` forward. When
 * it wraps past the flipped frame it commits the flip into `hex` and draws a
 * fresh moving-line plan for the next cycle — the only point `rng` is
 * consulted during animation.
 */
export function advanceBannerState(state: BannerState, rng: Rng): BannerState {
  const nextPhase = state.phaseIndex + 1
  if (nextPhase > FLIPPED_INDEX) {
    return {
      hex: flipHexagram(state.hex, state.movingLines),
      movingLines: planMovingLines(rng),
      phaseIndex: 0,
    }
  }
  return { ...state, phaseIndex: nextPhase }
}

/**
 * Derive the render-ready frame for a state. Settled lead-in frames (0,1) and
 * the flipped frame (22) draw a static figure; pulse frames (2..21) draw the
 * moving lines beating bright ↔ dim. The flipped frame shows — and names — the
 * post-flip figure, so the name updates the instant the lines settle.
 */
export function deriveBannerFrame(state: BannerState): BannerFrame {
  const { hex, movingLines, phaseIndex } = state

  if (phaseIndex >= FLIPPED_INDEX) {
    const flipped = flipHexagram(hex, movingLines)
    return {
      lines: flipped.map((line) =>
        deriveBannerLine(polarityOf(line), false, false),
      ),
      nameHex: flipped,
    }
  }

  if (phaseIndex < SETTLED_FRAMES) {
    return {
      lines: hex.map((line) =>
        deriveBannerLine(polarityOf(line), false, false),
      ),
      nameHex: hex,
    }
  }

  const bright = (phaseIndex - SETTLED_FRAMES) % 2 === 0
  return {
    lines: hex.map((line, index) =>
      deriveBannerLine(polarityOf(line), movingLines.includes(index), bright),
    ),
    nameHex: hex,
  }
}
