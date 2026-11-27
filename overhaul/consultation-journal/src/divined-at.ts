declare const utcOffset: unique symbol
declare const day: unique symbol

/**
 * A UTC offset in ISO 8601's form, exactly `+HH:MM` or `-HH:MM`, so it
 * copies straight into the record (ADR-0046). Only `isUtcOffset` admits one.
 */
export type UtcOffset = string & { readonly [utcOffset]: true }

/** An instant with the UTC offset it was read in: Divined At's precise form, and what the Clock returns. */
export interface Moment {
  readonly precision: 'moment'
  readonly epochMilliseconds: number
  readonly offset: UtcOffset
}

/**
 * A calendar day: Divined At's form for a Recorded Consultation entered to the
 * day only (ADR-0046). Only `isDay` admits one.
 */
export interface Day {
  readonly [day]: true
  readonly precision: 'day'
  readonly year: number
  /** 1 to 12. */
  readonly month: number
  /** 1 to the length of the month. */
  readonly day: number
}

/**
 * When the divination took place, never when it was saved: a Moment, or a
 * Day only for a Recorded Consultation (ADR-0046). Its ISO 8601 text exists
 * only in the stored record.
 */
export type DivinedAt = Moment | Day

const offsetPattern = /^(?<sign>[+-])(?<hours>\d{2}):(?<minutes>\d{2})$/

/**
 * Admits -12:00 to +14:00, the span of the offsets real time zones use, with
 * minutes 00 to 59. `-00:00` is refused: RFC 3339 reserves it for an unknown
 * local offset.
 */
export function isUtcOffset(value: string): value is UtcOffset {
  const groups = offsetPattern.exec(value)?.groups
  if (groups === undefined) return false
  const { sign, hours, minutes } = groups
  if (Number(minutes) > 59) return false
  const totalMinutes = Number(hours) * 60 + Number(minutes)
  return sign === '-'
    ? totalMinutes > 0 && totalMinutes <= 12 * 60
    : totalMinutes <= 14 * 60
}

/**
 * Admits a date that exists in the Gregorian calendar, leap years included,
 * in the years 0000 to 9999, so every Day writes as ISO 8601's `YYYY-MM-DD`
 * (ADR-0046).
 */
export function isDay(value: {
  readonly precision: 'day'
  readonly year: number
  readonly month: number
  readonly day: number
}): value is Day {
  const { year, month, day: dayOfMonth } = value
  if (!Number.isInteger(year) || !Number.isInteger(month)) return false
  if (year < 0 || year > 9999) return false
  if (month < 1 || month > 12) return false
  return (
    Number.isInteger(dayOfMonth) &&
    dayOfMonth >= 1 &&
    dayOfMonth <= daysInMonth(year, month)
  )
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * The calendar date Divined At falls on in its own offset. A Day is returned
 * as it is; a Moment gives the date its wall clock read in its offset, not
 * its UTC date, the date its record text begins with (ADR-0030). The
 * Journal's order and the record's date both read it. For a Moment this holds
 * only when `epochMilliseconds` is an integer and the date lies in the years
 * 0000 to 9999; for any other Moment the result is unspecified.
 */
export function localDate(divinedAt: DivinedAt): Day {
  throw new Error('not built', { cause: divinedAt })
}
