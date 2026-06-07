import { describe, expect, it } from 'vitest'

import { isCastingAbsenceReason, isLineIndex } from '../src/types.js'

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
