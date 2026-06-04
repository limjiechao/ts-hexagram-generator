// Pure unit tests for the banner animation state machine — the Functional Core
// of the live home banner. No React, no Ink: `createBannerState`,
// `advanceBannerState`, and `deriveBannerFrame` are exercised directly with a
// scripted, fully-deterministic RNG.

import type { Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import {
  advanceBannerState,
  createBannerState,
  DEFAULT_BANNER_INTERVAL_MS,
  DEFAULT_BANNER_TICK_MS,
  DEFAULT_BANNER_TIMING,
  deriveBannerFrame,
  framesPerPhase,
  type BannerState,
  type BannerTimingConfig,
} from '../src/banner-state'

// A deterministic RNG: replays `values` in order, cycling if exhausted. Lets a
// test pin exactly which hexagram and which moving-line plan are produced.
function scriptedRng(values: readonly number[]): () => number {
  let cursor = 0
  return () => {
    const value = values[cursor % values.length] ?? 0
    cursor += 1
    return value
  }
}

describe('DEFAULT_BANNER_TIMING', () => {
  it('exposes the canonical 108 ms tick', () => {
    expect(DEFAULT_BANNER_TICK_MS).toBe(108)
    expect(DEFAULT_BANNER_TIMING.tickMs).toBe(108)
  })

  // Regression for the static-vs-transforming asymmetry: the previous design
  // showed a static hexagram for only 3 frames (~324 ms) while pulsing the
  // transformation for 20 frames (~2160 ms) — a 6.7× gap. The default timing
  // must keep both halves of the cycle equal so the static figure dwells just
  // as long as the pulse that precedes it.
  it('keeps the default static and pulse intervals equal', () => {
    expect(DEFAULT_BANNER_TIMING.intervalMs).toBe(DEFAULT_BANNER_INTERVAL_MS)
    expect(framesPerPhase(DEFAULT_BANNER_TIMING)).toBe(20)
  })
})

describe('framesPerPhase', () => {
  it('derives the number of frames per static/pulse phase from intervalMs / tickMs', () => {
    expect(framesPerPhase({ intervalMs: 540, tickMs: 108 })).toBe(5)
    expect(framesPerPhase({ intervalMs: 1080, tickMs: 108 })).toBe(10)
    expect(framesPerPhase({ intervalMs: 1000, tickMs: 200 })).toBe(5)
  })

  it('clamps to at least one frame so phases never collapse to zero', () => {
    expect(framesPerPhase({ intervalMs: 10, tickMs: 108 })).toBe(1)
    expect(framesPerPhase({ intervalMs: 0, tickMs: 108 })).toBe(1)
  })
})

describe('createBannerState', () => {
  it('starts at phase 0 with a settled 6-line hexagram', () => {
    // 6 values < 0.5 ⇒ randomHex is all yang (7); next 6 ⇒ the moving plan.
    const rng = scriptedRng([0, 0, 0, 0, 0, 0, 0.1, 0.9, 0.9, 0.9, 0.9, 0.9])
    const state = createBannerState(rng)
    expect(state.phaseIndex).toBe(0)
    expect(state.hex).toEqual([7, 7, 7, 7, 7, 7])
    // Every line is a settled young value (7 or 8).
    expect(state.hex.every((line) => line === 7 || line === 8)).toBe(true)
  })

  it('selects each line independently at rng() < 0.4 (boundary exclusive)', () => {
    // First 6 values feed randomHex; next 6 feed the moving-line plan.
    // 0.4 is NOT < 0.4, so index 3 must be excluded.
    const rng = scriptedRng([0, 0, 0, 0, 0, 0, 0.1, 0.5, 0.39, 0.4, 0, 0.99])
    expect(createBannerState(rng).movingLines).toEqual([0, 2, 4])
  })

  it('forces exactly one moving line when none are selected', () => {
    // 6 randomHex values, then 6 values all ≥ 0.4 ⇒ none selected, then one
    // more value for the forced pick: Math.floor(0.5 * 6) = 3.
    const rng = scriptedRng([
      0, 0, 0, 0, 0, 0, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.5,
    ])
    expect(createBannerState(rng).movingLines).toEqual([3])
  })
})

describe('advanceBannerState — default-timing cycle', () => {
  it('walks every phase holding the figure, then wraps with the flip on the last advance', () => {
    // randomHex ⇒ [7,7,7,7,7,7]; plan ⇒ only index 0 moves.
    const rng = scriptedRng([
      0, 0, 0, 0, 0, 0, 0.1, 0.9, 0.9, 0.9, 0.9, 0.9,
      // consumed only by the wrap (the next cycle's plan): index 1 moves.
      0.9, 0.1, 0.9, 0.9, 0.9, 0.9,
    ])
    let state = createBannerState(rng)
    const settledHex = state.hex
    const cycleLength = framesPerPhase(DEFAULT_BANNER_TIMING) * 2 // 40

    // Phases 1..cycleLength-1: phaseIndex advances, the figure is unchanged.
    for (let phase = 1; phase < cycleLength; phase += 1) {
      state = advanceBannerState(state, rng)
      expect(state.phaseIndex).toBe(phase)
      expect(state.hex).toEqual(settledHex)
    }

    // The wrap commits the flip: the moving line (index 0) toggles 7→8, the
    // phase resets to 0, and a fresh plan is drawn (index 1 next).
    state = advanceBannerState(state, rng)
    expect(state.phaseIndex).toBe(0)
    expect(state.hex).toEqual([8, 7, 7, 7, 7, 7])
    expect(state.movingLines).toEqual([1])
  })
})

describe('advanceBannerState — flip correctness', () => {
  it('toggles exactly the moving lines, leaving the rest untouched', () => {
    const rng = scriptedRng([0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.5])
    const lastPhase = framesPerPhase(DEFAULT_BANNER_TIMING) * 2 - 1
    const state: BannerState = {
      hex: [7, 8, 7, 8, 7, 8],
      movingLines: [1, 3],
      phaseIndex: lastPhase,
    }
    const wrapped = advanceBannerState(state, rng)
    // Indices 1 and 3 toggle (8→7); 0,2,4,5 unchanged.
    expect(wrapped.hex).toEqual([7, 7, 7, 7, 7, 8])
    expect(wrapped.phaseIndex).toBe(0)
  })

  it('honours a custom timing config when wrapping', () => {
    // 3 frames per phase → cycle length 6, last phase = 5.
    const timing: BannerTimingConfig = { intervalMs: 324, tickMs: 108 }
    const rng = scriptedRng([0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.5])
    const state: BannerState = {
      hex: [7, 8, 7, 8, 7, 8],
      movingLines: [1, 3],
      phaseIndex: framesPerPhase(timing) * 2 - 1,
    }
    const wrapped = advanceBannerState(state, rng, timing)
    expect(wrapped.hex).toEqual([7, 7, 7, 7, 7, 8])
    expect(wrapped.phaseIndex).toBe(0)
  })
})

describe('deriveBannerFrame — default timing renders symmetric halves', () => {
  const hex: Hexagram = [7, 8, 7, 8, 7, 8]
  const movingLines = [2]
  const frames = framesPerPhase(DEFAULT_BANNER_TIMING) // 20

  it('renders all 20 static phases as the settled figure', () => {
    for (let phaseIndex = 0; phaseIndex < frames; phaseIndex += 1) {
      const frame = deriveBannerFrame({ hex, movingLines, phaseIndex })
      expect(frame.lines.every((cell) => cell.role === 'static')).toBe(true)
      expect(frame.nameHex).toEqual(hex)
    }
  })

  it('renders all 20 pulse phases with the moving line beating bright ↔ dim', () => {
    for (let offset = 0; offset < frames; offset += 1) {
      const phaseIndex = frames + offset
      const frame = deriveBannerFrame({ hex, movingLines, phaseIndex })
      const movingCell = frame.lines[2]
      expect(movingCell?.role).toBe(
        offset % 2 === 0 ? 'moving-bright' : 'moving-dim',
      )
      // Non-moving lines stay static through the pulse.
      expect(frame.lines[0]?.role).toBe('static')
      // The name still shows the OLD hexagram until the wrap commits the flip.
      expect(frame.nameHex).toEqual(hex)
    }
  })
})

describe('deriveBannerFrame — configurable timing', () => {
  const hex: Hexagram = [7, 8, 7, 8, 7, 8]
  const movingLines = [2]

  it('stretches the static and pulse halves equally for a custom intervalMs', () => {
    // 540 ms / 108 ms tick = 5 frames per phase ⇒ phases 0..4 static, 5..9 pulse.
    const timing: BannerTimingConfig = { intervalMs: 540, tickMs: 108 }

    for (let phaseIndex = 0; phaseIndex < 5; phaseIndex += 1) {
      const frame = deriveBannerFrame({ hex, movingLines, phaseIndex }, timing)
      expect(frame.lines.every((cell) => cell.role === 'static')).toBe(true)
    }
    for (let phaseIndex = 5; phaseIndex < 10; phaseIndex += 1) {
      const frame = deriveBannerFrame({ hex, movingLines, phaseIndex }, timing)
      expect(frame.lines[2]?.role).not.toBe('static')
    }
  })
})
