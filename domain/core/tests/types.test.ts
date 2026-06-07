import { describe, expect, it } from 'vitest'
import { isCastingAbsenceReason } from '../src/types.js'

describe('isCastingAbsenceReason', () => {
  it('accepts the three known reasons', () => {
    expect(isCastingAbsenceReason('legacy-no-table')).toBe(true)
    expect(isCastingAbsenceReason('legacy-unreplayable')).toBe(true)
    expect(isCastingAbsenceReason('playground')).toBe(true)
  })
  it('rejects unknown strings and non-strings', () => {
    expect(isCastingAbsenceReason('legacy')).toBe(false)
    expect(isCastingAbsenceReason('')).toBe(false)
    expect(isCastingAbsenceReason(undefined)).toBe(false)
    expect(isCastingAbsenceReason(null)).toBe(false)
    expect(isCastingAbsenceReason(3)).toBe(false)
  })
})
