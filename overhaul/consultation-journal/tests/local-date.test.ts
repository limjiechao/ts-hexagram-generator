import { describe, expect, it } from 'vitest'

import {
  isDay,
  isUtcOffset,
  localDate,
  type Day,
  type Moment,
} from '#src/divined-at.js'

/** Reads the instant from ISO 8601 text, so each row states its instant plainly. */
function moment(instant: string, offset: string): Moment {
  const epochMilliseconds = Date.parse(instant)
  if (Number.isNaN(epochMilliseconds)) {
    throw new RangeError(`the instant ${instant} is malformed`)
  }
  if (!isUtcOffset(offset)) throw new Error(`the offset ${offset} is malformed`)
  return { precision: 'moment', epochMilliseconds, offset }
}

function day(year: number, month: number, dayOfMonth: number): Day {
  const value = { precision: 'day', year, month, day: dayOfMonth } as const
  if (!isDay(value)) throw new Error('no such day')
  return value
}

describe('localDate of a Moment', () => {
  it.each([
    ['2026-11-26T00:00:00.123Z', '+08:00', [2026, 11, 26]],
    ['2026-11-26T00:00:00.123Z', '+00:00', [2026, 11, 26]],
    ['2026-11-26T12:00:00.000Z', '-12:00', [2026, 11, 26]],
    ['2026-11-26T09:59:59.999Z', '+14:00', [2026, 11, 26]],
    ['2026-11-26T12:00:00.000Z', '+05:45', [2026, 11, 26]],
  ] as const)(
    'keeps the date of %s read at %s',
    (instant, offset, [year, month, dayOfMonth]) => {
      expect(localDate(moment(instant, offset))).toEqual(
        day(year, month, dayOfMonth),
      )
    },
  )

  it.each([
    ['2026-11-01T20:00:00.000Z', '+14:00', [2026, 11, 2]],
    ['2026-11-01T10:00:00.000Z', '+14:00', [2026, 11, 2]],
    ['2026-11-01T18:30:00.000Z', '+05:30', [2026, 11, 2]],
    ['2026-11-01T23:30:00.000Z', '+00:30', [2026, 11, 2]],
    ['2026-12-31T10:00:00.000Z', '+14:00', [2027, 1, 1]],
    ['2028-02-28T12:00:00.000Z', '+14:00', [2028, 2, 29]],
  ] as const)(
    'moves the date of %s forward across midnight at %s',
    (instant, offset, [year, month, dayOfMonth]) => {
      expect(localDate(moment(instant, offset))).toEqual(
        day(year, month, dayOfMonth),
      )
    },
  )

  it.each([
    ['2026-11-02T03:00:00.000Z', '-10:00', [2026, 11, 1]],
    ['2026-11-02T11:59:59.999Z', '-12:00', [2026, 11, 1]],
    ['2026-11-02T09:29:59.999Z', '-09:30', [2026, 11, 1]],
    ['2026-11-02T00:29:59.999Z', '-00:30', [2026, 11, 1]],
    ['2027-01-01T05:00:00.000Z', '-12:00', [2026, 12, 31]],
    ['2028-03-01T03:00:00.000Z', '-10:00', [2028, 2, 29]],
  ] as const)(
    'moves the date of %s back across midnight at %s',
    (instant, offset, [year, month, dayOfMonth]) => {
      expect(localDate(moment(instant, offset))).toEqual(
        day(year, month, dayOfMonth),
      )
    },
  )

  it.each([
    ['2026-11-01T18:29:59.999Z', '+05:30', [2026, 11, 1]],
    ['2026-11-02T09:30:00.000Z', '-09:30', [2026, 11, 2]],
    ['2026-11-02T00:30:00.000Z', '-00:30', [2026, 11, 2]],
    ['2026-11-02T12:00:00.000Z', '-12:00', [2026, 11, 2]],
  ] as const)(
    'puts %s at %s on its side of local midnight, to the millisecond',
    (instant, offset, [year, month, dayOfMonth]) => {
      expect(localDate(moment(instant, offset))).toEqual(
        day(year, month, dayOfMonth),
      )
    },
  )

  it('reads the first instant of year 0000 at +14:00 as 0000-01-01', () => {
    expect(
      localDate(moment('0000-01-01T00:00:00.000+14:00', '+14:00')),
    ).toEqual(day(0, 1, 1))
  })

  it('reads the last instant of year 9999 at -12:00 as 9999-12-31', () => {
    expect(
      localDate(moment('9999-12-31T23:59:59.999-12:00', '-12:00')),
    ).toEqual(day(9999, 12, 31))
  })
})

describe('localDate of a Day', () => {
  it.each([
    [2026, 11, 19],
    [2024, 2, 29],
    [0, 1, 1],
    [9999, 12, 31],
  ])(
    'returns the Day %i-%i-%i as the same object',
    (year, month, dayOfMonth) => {
      const divinedAt = day(year, month, dayOfMonth)
      expect(localDate(divinedAt)).toBe(divinedAt)
    },
  )
})
