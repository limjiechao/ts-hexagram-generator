// Pure unit tests for the banner animation state machine — the Functional Core
// of the live home banner. No React, no Ink: `createBannerState`,
// `advanceBannerState`, and `deriveBannerFrame` are exercised directly with a
// scripted, fully-deterministic RNG.

import type { Hexagram } from '@hexagram/types'
import { describe, expect, it } from 'vitest'

import {
  advanceBannerState,
  createBannerState,
  deriveBannerFrame,
  type BannerState,
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

describe('advanceBannerState — one full cycle', () => {
  it('walks phases 0→22 holding the figure, then wraps with the flip', () => {
    // randomHex ⇒ [7,7,7,7,7,7]; plan ⇒ only index 0 moves.
    const rng = scriptedRng([
      0, 0, 0, 0, 0, 0, 0.1, 0.9, 0.9, 0.9, 0.9, 0.9,
      // consumed only by the wrap (the next cycle's plan): index 1 moves.
      0.9, 0.1, 0.9, 0.9, 0.9, 0.9,
    ])
    let state = createBannerState(rng)
    const settledHex = state.hex

    // Phases 1..22: phaseIndex advances, the figure is unchanged.
    for (let phase = 1; phase <= 22; phase += 1) {
      state = advanceBannerState(state, rng)
      expect(state.phaseIndex).toBe(phase)
      expect(state.hex).toEqual(settledHex)
    }

    // The 23rd advance wraps past the flipped frame: phase resets to 0, the
    // moving line (index 0) has toggled 7→8, and a fresh plan is drawn.
    state = advanceBannerState(state, rng)
    expect(state.phaseIndex).toBe(0)
    expect(state.hex).toEqual([8, 7, 7, 7, 7, 7])
    expect(state.movingLines).toEqual([1])
  })
})

describe('advanceBannerState — flip correctness', () => {
  it('toggles exactly the moving lines, leaving the rest untouched', () => {
    const rng = scriptedRng([0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.5])
    const state: BannerState = {
      hex: [7, 8, 7, 8, 7, 8],
      movingLines: [1, 3],
      phaseIndex: 22,
    }
    const wrapped = advanceBannerState(state, rng)
    // Indices 1 and 3 toggle (8→7); 0,2,4,5 unchanged.
    expect(wrapped.hex).toEqual([7, 7, 7, 7, 7, 8])
    expect(wrapped.phaseIndex).toBe(0)
  })
})

describe('deriveBannerFrame', () => {
  const hex: Hexagram = [7, 8, 7, 8, 7, 8]

  it('renders phases 0 and 1 as the settled figure with no moving lines', () => {
    for (const phaseIndex of [0, 1]) {
      const frame = deriveBannerFrame({ hex, movingLines: [2], phaseIndex })
      expect(frame.lines.every((cell) => cell.role === 'static')).toBe(true)
      expect(frame.nameHex).toEqual(hex)
    }
  })

  it('renders pulse frames bright on even offsets, dim on odd', () => {
    // Frame 2 = offset 0 = bright; frame 3 = offset 1 = dim.
    const bright = deriveBannerFrame({ hex, movingLines: [2], phaseIndex: 2 })
    const dim = deriveBannerFrame({ hex, movingLines: [2], phaseIndex: 3 })
    // Line index 2 is the moving line; the rest stay static.
    expect(bright.lines[2]?.role).toBe('moving-bright')
    expect(dim.lines[2]?.role).toBe('moving-dim')
    expect(bright.lines[0]?.role).toBe('static')
    // The name still shows the OLD hexagram until the flip lands.
    expect(bright.nameHex).toEqual(hex)
  })

  it('renders the flipped frame as the new figure, named anew', () => {
    const frame = deriveBannerFrame({ hex, movingLines: [2], phaseIndex: 22 })
    // Index 2 has toggled 7→8; the figure is settled (no moving roles).
    expect(frame.lines.every((cell) => cell.role === 'static')).toBe(true)
    expect(frame.nameHex).toEqual([7, 8, 8, 8, 7, 8])
  })
})
