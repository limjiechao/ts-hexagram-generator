import { describe, expect, it } from 'vitest'

import {
  cycleLineBackward,
  cycleLineForward,
  flipPolarity,
  getEmergingHexagram,
  hasMovingLines,
  isMovingLine,
  movingLineIndices,
  polarityOf,
} from '../src/line-semantics.js'
import type { Hexagram, Line } from '../src/types.js'

const ALL_LINES: Line[] = [6, 7, 8, 9]

describe('isMovingLine', () => {
  it('is true only for the moving values 6 and 9', () => {
    expect(isMovingLine(6)).toBe(true)
    expect(isMovingLine(9)).toBe(true)
  })

  it('is false for the static values 7 and 8', () => {
    expect(isMovingLine(7)).toBe(false)
    expect(isMovingLine(8)).toBe(false)
  })
})

describe('polarityOf', () => {
  it('classifies solid lines (7, 9) as yang', () => {
    expect(polarityOf(7)).toBe('yang')
    expect(polarityOf(9)).toBe('yang')
  })

  it('classifies broken lines (8, 6) as yin', () => {
    expect(polarityOf(8)).toBe('yin')
    expect(polarityOf(6)).toBe('yin')
  })
})

describe('flipPolarity', () => {
  it('flips polarity preserving motion: 7↔8, 9↔6', () => {
    expect(flipPolarity(7)).toBe(8)
    expect(flipPolarity(8)).toBe(7)
    expect(flipPolarity(9)).toBe(6)
    expect(flipPolarity(6)).toBe(9)
  })

  it('is its own inverse', () => {
    for (const line of ALL_LINES) {
      expect(flipPolarity(flipPolarity(line))).toBe(line)
    }
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

  it('round-trips with cycleLineForward (one backward undoes one forward)', () => {
    for (const line of ALL_LINES) {
      expect(cycleLineBackward(cycleLineForward(line))).toBe(line)
    }
  })
})

describe('getEmergingHexagram', () => {
  it('collapses moving lines (6→7, 9→8) and passes static lines through', () => {
    const standing: Hexagram = [6, 7, 8, 9, 7, 8]
    expect(getEmergingHexagram(standing)).toEqual([7, 7, 8, 8, 7, 8])
  })

  it('returns an identical hexagram when there are no moving lines', () => {
    const standing: Hexagram = [7, 8, 7, 8, 7, 8]
    expect(getEmergingHexagram(standing)).toEqual([7, 8, 7, 8, 7, 8])
  })
})

describe('movingLineIndices', () => {
  it('is empty when no line moves', () => {
    const hex: Hexagram = [7, 7, 7, 7, 7, 7]
    expect(movingLineIndices(hex)).toEqual([])
  })

  it('returns 0-based bottom-first indices of moving lines', () => {
    const hex: Hexagram = [6, 7, 9, 7, 6, 7]
    expect(movingLineIndices(hex)).toEqual([0, 2, 4])
  })

  it('returns all six indices when every line moves', () => {
    const hex: Hexagram = [6, 9, 6, 9, 6, 9]
    expect(movingLineIndices(hex)).toEqual([0, 1, 2, 3, 4, 5])
  })
})

describe('hasMovingLines', () => {
  it('is false when no line moves', () => {
    expect(hasMovingLines([7, 8, 7, 8, 7, 8])).toBe(false)
  })

  it('is true when at least one line moves', () => {
    expect(hasMovingLines([7, 8, 9, 8, 7, 8])).toBe(true)
    expect(hasMovingLines([6, 8, 7, 8, 7, 8])).toBe(true)
  })
})
