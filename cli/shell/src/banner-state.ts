// Functional Core for the live home banner — the animation state machine.
// State is `{ hex, movingLines, phaseIndex }`; a cycle is split into a static
// half (the figure dwells unchanged) and a pulse half (moving lines beat
// bright ↔ dim) of equal length, so a static hexagram is rendered for exactly
// as long as the pulsing transformation that precedes it. The phase counts are
// derived from `BannerTimingConfig.intervalMs / tickMs`, so the same `ms`
// knob controls both halves — symmetry by construction, not by convention.
// Pure: no React, no I/O, no `cryptoRandom` — the RNG is injected so every
// frame transition is deterministic given a seeded RNG and unit-testable
// without rendering Ink.

import { polarityOf } from '@hexagram/core/line-semantics'
import type { Hexagram, Line } from '@hexagram/core/types'
import { deriveBannerLine, type LineCells } from '@hexagram/viewer-core'

/** An injected random source — returns a float in `[0, 1)`, like Math.random. */
export type Rng = () => number

/**
 * The banner animation state.
 * - `hex` — the current *settled* figure, bottom-first; only ever 7/8 values.
 * - `movingLines` — the current cycle's moving-line indices (sorted, 0..5).
 * - `phaseIndex` — cursor into the current cycle (0 .. 2 * framesPerPhase - 1).
 */
export interface BannerState {
  readonly hex: Hexagram
  readonly movingLines: readonly number[]
  readonly phaseIndex: number
}

/** A render-ready banner frame derived from a `BannerState`. */
export interface BannerFrame {
  /** The six line cells, bottom-first (parallel to the `hex` tuple). */
  readonly lines: readonly LineCells[]
  /** The hexagram whose name to display — the current cycle's `hex`. */
  readonly nameHex: Hexagram
}

/**
 * Test-only override for `<AnimatedBanner>`, threaded down from `<HexagramApp>`.
 * Production never sets it — the live animation is the default.
 */
export interface BannerTestOverride {
  /** Deterministic RNG replacing the live `cryptoRandom`, so frames are reproducible. */
  readonly rng: Rng
  /**
   * When true the per-tick interval is never started — the banner freezes on
   * its initial settled frame, keeping component frame tests deterministic.
   */
  readonly disableInterval: boolean
}

/**
 * The banner animation cadence. `intervalMs` controls how long each half of
 * the cycle (the static half and the pulse half) stays on screen; both halves
 * are equal by construction, so a single `--banner-interval-ms` knob sets the
 * symmetric pacing. `tickMs` is the per-frame interval driving the visible
 * pulse beat — it stays at 108 ms unless a test overrides it.
 */
export interface BannerTimingConfig {
  readonly intervalMs: number
  readonly tickMs: number
}

/** The canonical per-frame interval the live animation runs at. */
export const DEFAULT_BANNER_TICK_MS = 108

/**
 * The default duration each half of a cycle stays on screen, in ms. Matches
 * the pre-existing 20-frame pulse (20 × 108 ms) so the static figure now
 * dwells just as long as the pulse — symmetry restored without speeding the
 * existing pulse rhythm up or slowing it down.
 */
export const DEFAULT_BANNER_INTERVAL_MS = 2160

/** The default timing — `--banner-interval-ms` adjusts only `intervalMs`. */
export const DEFAULT_BANNER_TIMING: BannerTimingConfig = {
  intervalMs: DEFAULT_BANNER_INTERVAL_MS,
  tickMs: DEFAULT_BANNER_TICK_MS,
}

const MOVE_PROBABILITY = 0.4

/**
 * Frames per static (or pulse) phase, derived from `intervalMs / tickMs`.
 * Floor-clamped to one frame so an absurdly small `intervalMs` still produces
 * a runnable cycle — a zero-length phase would lock the wrap into a tight loop.
 */
export function framesPerPhase(timing: BannerTimingConfig): number {
  return Math.max(1, Math.round(timing.intervalMs / timing.tickMs))
}

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
 * it wraps past the cycle's last frame it commits the flip into `hex` and
 * draws a fresh moving-line plan for the next cycle — the only point `rng` is
 * consulted during animation. Defaults to `DEFAULT_BANNER_TIMING`.
 */
export function advanceBannerState(
  state: BannerState,
  rng: Rng,
  timing: BannerTimingConfig = DEFAULT_BANNER_TIMING,
): BannerState {
  const cycleLength = framesPerPhase(timing) * 2
  const nextPhase = state.phaseIndex + 1
  if (nextPhase >= cycleLength) {
    return {
      hex: flipHexagram(state.hex, state.movingLines),
      movingLines: planMovingLines(rng),
      phaseIndex: 0,
    }
  }
  return { ...state, phaseIndex: nextPhase }
}

/**
 * Derive the render-ready frame for a state. The first half of the cycle
 * draws the current figure statically; the second half pulses the moving
 * lines bright ↔ dim. Defaults to `DEFAULT_BANNER_TIMING`.
 */
export function deriveBannerFrame(
  state: BannerState,
  timing: BannerTimingConfig = DEFAULT_BANNER_TIMING,
): BannerFrame {
  const { hex, movingLines, phaseIndex } = state
  const frames = framesPerPhase(timing)

  if (phaseIndex < frames) {
    return {
      lines: hex.map((line) =>
        deriveBannerLine(polarityOf(line), false, false),
      ),
      nameHex: hex,
    }
  }

  const bright = (phaseIndex - frames) % 2 === 0
  return {
    lines: hex.map((line, index) =>
      deriveBannerLine(polarityOf(line), movingLines.includes(index), bright),
    ),
    nameHex: hex,
  }
}
