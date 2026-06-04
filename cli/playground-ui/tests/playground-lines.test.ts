// Pure unit tests for the Playground's line helpers. No React, no
// Ink — every function is exercised directly with plain value inputs.

import {
  cycleLineBackward,
  cycleLineForward,
  flipPolarity,
  movingLineIndices,
} from '@hexagram/core/line-semantics'
import type { Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import {
  buildPlaygroundDerivation,
  INITIAL_HEXAGRAM,
  setLineAt,
} from '../src/playground-lines'

describe('INITIAL_HEXAGRAM', () => {
  it('opens on Qian — six lines of young yang (7)', () => {
    expect(INITIAL_HEXAGRAM).toEqual([7, 7, 7, 7, 7, 7])
  })
})

describe('cycleLineForward', () => {
  it('walks 7 → 9 → 8 → 6 → 7', () => {
    expect(cycleLineForward(7)).toBe(9)
    expect(cycleLineForward(9)).toBe(8)
    expect(cycleLineForward(8)).toBe(6)
    expect(cycleLineForward(6)).toBe(7)
  })
})

describe('cycleLineBackward', () => {
  it('walks 7 → 6 → 8 → 9 → 7 — the reverse of cycleLineForward', () => {
    expect(cycleLineBackward(7)).toBe(6)
    expect(cycleLineBackward(6)).toBe(8)
    expect(cycleLineBackward(8)).toBe(9)
    expect(cycleLineBackward(9)).toBe(7)
  })

  it('round-trips with cycleLineForward (one ← undoes one →)', () => {
    for (const line of [6, 7, 8, 9] as const) {
      expect(cycleLineBackward(cycleLineForward(line))).toBe(line)
    }
  })
})

describe('flipPolarity', () => {
  it('flips young yang ↔ young yin (7 ↔ 8), preserving motion', () => {
    expect(flipPolarity(7)).toBe(8)
    expect(flipPolarity(8)).toBe(7)
  })

  it('flips moving yang ↔ moving yin (9 ↔ 6), preserving motion', () => {
    expect(flipPolarity(9)).toBe(6)
    expect(flipPolarity(6)).toBe(9)
  })

  it('is its own inverse', () => {
    for (const line of [6, 7, 8, 9] as const) {
      expect(flipPolarity(flipPolarity(line))).toBe(line)
    }
  })
})

describe('movingLineIndices', () => {
  it('returns an empty array for Qian (no moving lines)', () => {
    expect(movingLineIndices(INITIAL_HEXAGRAM)).toEqual([])
  })

  it('returns 0-based bottom-first indices for the moving lines', () => {
    // L1 = 9 (moving yang), L3 = 6 (moving yin), L5 = 9; rest = 7
    const hex: Hexagram = [9, 7, 6, 7, 9, 7]
    expect(movingLineIndices(hex)).toEqual([0, 2, 4])
  })

  it('returns all six indices when every line is moving', () => {
    const hex: Hexagram = [6, 9, 6, 9, 6, 9]
    expect(movingLineIndices(hex)).toEqual([0, 1, 2, 3, 4, 5])
  })
})

describe('setLineAt', () => {
  it('replaces one line and returns a new tuple', () => {
    const next = setLineAt(INITIAL_HEXAGRAM, 2, 9)
    expect(next).toEqual([7, 7, 9, 7, 7, 7])
    expect(next).not.toBe(INITIAL_HEXAGRAM)
  })

  it('is a no-op for out-of-range indices', () => {
    expect(setLineAt(INITIAL_HEXAGRAM, -1, 9)).toEqual([7, 7, 7, 7, 7, 7])
    expect(setLineAt(INITIAL_HEXAGRAM, 6, 9)).toEqual([7, 7, 7, 7, 7, 7])
  })
})

describe('buildPlaygroundDerivation', () => {
  it('returns Qian on both sides with no moving lines and no judgment gate', () => {
    const d = buildPlaygroundDerivation(INITIAL_HEXAGRAM)
    expect(d.standing).toEqual(INITIAL_HEXAGRAM)
    expect(d.emerging).toEqual(INITIAL_HEXAGRAM)
    expect(d.movingIndices).toEqual([])
    expect(d.hasMoving).toBe(false)
    expect(d.singleMovingIndex).toBe(null)
  })

  it('exposes singleMovingIndex when exactly one line is moving', () => {
    // L3 = 9, rest = 7
    const hex: Hexagram = [7, 7, 9, 7, 7, 7]
    const d = buildPlaygroundDerivation(hex)
    expect(d.hasMoving).toBe(true)
    expect(d.movingIndices).toEqual([2])
    expect(d.singleMovingIndex).toBe(2)
    // 9 → 8 in emerging at index 2
    expect(d.emerging).toEqual([7, 7, 8, 7, 7, 7])
  })

  it('sets singleMovingIndex to null when 2+ lines are moving', () => {
    const hex: Hexagram = [9, 7, 6, 7, 7, 7]
    const d = buildPlaygroundDerivation(hex)
    expect(d.hasMoving).toBe(true)
    expect(d.movingIndices).toEqual([0, 2])
    expect(d.singleMovingIndex).toBe(null)
  })
})
