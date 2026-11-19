import { describe, expect, it } from 'vitest'

import { isDay, isUtcOffset } from '#src/divined-at.js'

describe('isUtcOffset', () => {
  it.each(['+00:00', '+08:00', '-05:00', '+05:30', '+05:45', '-09:30'])(
    'accepts %s',
    (offset) => {
      expect(isUtcOffset(offset)).toBe(true)
    },
  )

  it.each(['+14:00', '-12:00', '+13:59', '-11:59'])(
    'accepts the edge %s',
    (offset) => {
      expect(isUtcOffset(offset)).toBe(true)
    },
  )

  it.each(['+14:01', '+15:00', '-12:01', '-13:00', '+08:60', '+24:00'])(
    'rejects the out-of-range %s',
    (offset) => {
      expect(isUtcOffset(offset)).toBe(false)
    },
  )

  it.each([
    '',
    'Z',
    '-00:00',
    '08:00',
    '+8:00',
    '+08:0',
    '+0800',
    '+08',
    '+08:00:00',
    ' +08:00',
    '+08:00 ',
    '+０８:00',
    '−08:00',
    '2026-11-19T10:00:00+08:00',
  ])('rejects the malformed %j', (offset) => {
    expect(isUtcOffset(offset)).toBe(false)
  })
})

const day = (year: number, month: number, dayOfMonth: number) =>
  ({ precision: 'day', year, month, day: dayOfMonth }) as const

describe('isDay', () => {
  it.each([
    [2026, 11, 19],
    [2026, 1, 31],
    [2026, 4, 30],
    [2026, 12, 31],
    [2024, 2, 29],
    [2000, 2, 29],
    [2026, 2, 28],
  ])('accepts %i-%i-%i', (year, month, dayOfMonth) => {
    expect(isDay(day(year, month, dayOfMonth))).toBe(true)
  })

  it.each([
    [2026, 2, 29],
    [1900, 2, 29],
    [2100, 2, 29],
    [2024, 2, 30],
    [2026, 4, 31],
    [2026, 6, 31],
    [2026, 9, 31],
    [2026, 11, 31],
    [2026, 1, 32],
    [2026, 1, 0],
    [2026, 0, 1],
    [2026, 13, 1],
  ])('rejects the impossible %i-%i-%i', (year, month, dayOfMonth) => {
    expect(isDay(day(year, month, dayOfMonth))).toBe(false)
  })

  it.each([
    [0, 1, 1],
    [9999, 12, 31],
    [0, 2, 29],
  ])('accepts the edge year in %i-%i-%i', (year, month, dayOfMonth) => {
    expect(isDay(day(year, month, dayOfMonth))).toBe(true)
  })

  it.each([
    [-1, 1, 1],
    [-1, 12, 31],
    [10000, 1, 1],
  ])('rejects the out-of-range year in %i-%i-%i', (year, month, dayOfMonth) => {
    expect(isDay(day(year, month, dayOfMonth))).toBe(false)
  })

  it.each([
    [2026.5, 1, 1],
    [2026, 1.5, 1],
    [2026, 1, 1.5],
    [Number.NaN, 1, 1],
    [2026, Number.NaN, 1],
    [2026, 1, Number.NaN],
    [Number.POSITIVE_INFINITY, 1, 1],
  ])('rejects the non-integer %d-%d-%d', (year, month, dayOfMonth) => {
    expect(isDay(day(year, month, dayOfMonth))).toBe(false)
  })
})
