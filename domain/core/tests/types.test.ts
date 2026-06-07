import { describe, expect, it } from 'vitest'

import {
  isCastingAbsenceReason,
  isLineIndex,
  POSITIONS_TOP_FIRST,
  toTopFirst,
} from '../src/types.js'

describe('isCastingAbsenceReason', () => {
  it('accepts the three known reasons', () => {
    expect(isCastingAbsenceReason('legacy-no-table')).toBe(true)
    expect(isCastingAbsenceReason('legacy-unreplayable')).toBe(true)
    expect(isCastingAbsenceReason('playground')).toBe(true)
  })
  it('rejects unknown strings and non-strings', () => {
    expect(isCastingAbsenceReason('legacy')).toBe(false)
    expect(isCastingAbsenceReason('')).toBe(false)
    expect(isCastingAbsenceReason(undefined as unknown)).toBe(false)
    expect(isCastingAbsenceReason(null)).toBe(false)
    expect(isCastingAbsenceReason(3)).toBe(false)
  })
})

describe('isLineIndex', () => {
  it('accepts every integer 0..5', () => {
    for (const i of [0, 1, 2, 3, 4, 5]) expect(isLineIndex(i)).toBe(true)
  })
  it('rejects out-of-range numbers, including findIndex sentinel -1', () => {
    expect(isLineIndex(-1)).toBe(false)
    expect(isLineIndex(6)).toBe(false)
    expect(isLineIndex(-0.5)).toBe(false)
    expect(isLineIndex(100)).toBe(false)
  })
  it('rejects non-numbers', () => {
    expect(isLineIndex('3')).toBe(false)
    // oxlint-disable-next-line no-useless-undefined -- asserting the guard rejects undefined
    expect(isLineIndex(undefined)).toBe(false)
    expect(isLineIndex(null)).toBe(false)
    expect(isLineIndex(Number.NaN)).toBe(false)
  })
})

describe('top-first ordering primitive', () => {
  it('POSITIONS_TOP_FIRST is line 6 → line 1', () => {
    expect(POSITIONS_TOP_FIRST).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('toTopFirst reverses a bottom-first 6-tuple', () => {
    expect(toTopFirst([1, 2, 3, 4, 5, 6])).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('toTopFirst is an involution (applied twice = identity)', () => {
    const t = [10, 20, 30, 40, 50, 60] as const
    expect(toTopFirst(toTopFirst(t))).toEqual([...t])
  })
})
