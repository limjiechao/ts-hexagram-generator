import process from 'node:process'

import { isUtcOffset } from '@hexagram/consultation-journal/divined-at'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { systemClock } from '#src/system-clock.js'

// Node rereads the time zone whenever `process.env.TZ` is assigned, in the
// forks pool vitest runs by default; worker threads would not see it. Every
// zone below keeps one offset all year, so no assertion depends on the date.
// A POSIX zone such as `XYZ+15` counts hours west of UTC, so it reads -15:00.

let savedTimeZone: string | undefined

beforeEach(() => {
  savedTimeZone = process.env.TZ
})

afterEach(() => {
  if (savedTimeZone === undefined) delete process.env.TZ
  else process.env.TZ = savedTimeZone
})

function readIn(timeZone: string) {
  process.env.TZ = timeZone
  return systemClock.now()
}

describe('systemClock', () => {
  it('reads a Moment', () => {
    expect(readIn('UTC').precision).toBe('moment')
  })

  it('reads the current instant as whole milliseconds since the epoch', () => {
    const before = Date.now()
    const { epochMilliseconds } = systemClock.now()
    const after = Date.now()

    expect(Number.isInteger(epochMilliseconds)).toBe(true)
    expect(epochMilliseconds).toBeGreaterThanOrEqual(before)
    expect(epochMilliseconds).toBeLessThanOrEqual(after)
  })

  it.each([
    ['UTC', '+00:00'],
    ['XYZ+0', '+00:00'],
    ['Asia/Kolkata', '+05:30'],
    ['Pacific/Marquesas', '-09:30'],
    ['Etc/GMT+12', '-12:00'],
    ['XYZ+12', '-12:00'],
    ['Pacific/Kiritimati', '+14:00'],
    ['XYZ-14', '+14:00'],
  ])('reads the system offset in %s as %s', (timeZone, offset) => {
    const moment = readIn(timeZone)

    expect(isUtcOffset(moment.offset)).toBe(true)
    expect(moment.offset).toBe(offset)
  })

  it.each([
    ['XYZ+15', '-15:00'],
    ['XYZ-15', '+15:00'],
  ])(
    'throws an Error naming the offset when the system offset in %s, %s, is outside -12:00 to +14:00',
    (timeZone) => {
      process.env.TZ = timeZone

      expect(() => systemClock.now()).toThrow(Error)
      expect(() => systemClock.now()).toThrow(/15/)
    },
  )
})
