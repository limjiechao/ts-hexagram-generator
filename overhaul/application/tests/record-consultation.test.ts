import { isConsultationId } from '@hexagram/consultation-journal/consultation-id'
import {
  isDay,
  isUtcOffset,
  type Day,
  type Moment,
  type UtcOffset,
} from '@hexagram/consultation-journal/divined-at'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import type { Transformation } from '@hexagram/oracle/transformation'
import { describe, expect, it, vi } from 'vitest'

import type { Clock } from '#src/clock.js'
import type { ConsultationStore } from '#src/consultation-store.js'
import type { RandomSource } from '#src/random-source.js'
import { recordConsultation } from '#src/record-consultation.js'

// Every Query below is invented.

function query(text: string): Query {
  if (!isQuery(text))
    throw new Error(`the Query ${JSON.stringify(text)} is blank`)
  return text
}

function utcOffset(text: string): UtcOffset {
  if (!isUtcOffset(text)) throw new Error(`the offset ${text} is malformed`)
  return text
}

function moment(epochMilliseconds: number, offset: string): Moment {
  return { precision: 'moment', epochMilliseconds, offset: utcOffset(offset) }
}

function day(year: number, month: number, dayOfMonth: number): Day {
  const value: Parameters<typeof isDay>[0] = {
    precision: 'day',
    year,
    month,
    day: dayOfMonth,
  }
  if (!isDay(value)) throw new Error(`${year}-${month}-${dayOfMonth} is no day`)
  return value
}

/** 2026-11-26T00:00:00.123Z, whose 48 bits are `01M8AJDS3V` in Crockford's base 32. */
const clockMoment = moment(1_795_651_200_123, '+08:00')
const clockTime = '01M8AJDS3V'

/** Draws 0 to 15, which are the symbols `0` to `F` of Crockford's alphabet. */
const ascendingDraws = Array.from({ length: 16 }, (_, at) => at)

function untouched(): Promise<never> {
  return Promise.reject(new Error('recording used more of the Store than keep'))
}

/**
 * Ports for one record: a Store whose `keep` resolves unless told otherwise,
 * a Clock that reads `clockMoment` unless told otherwise, and a Random Source
 * that returns the scripted draws in turn and records each bound.
 */
function stubPorts(
  options: {
    readonly now?: Clock['now']
    readonly draws?: readonly number[]
    readonly integerBelow?: RandomSource['integerBelow']
    readonly keep?: ConsultationStore['keep']
  } = {},
) {
  const bounds: number[] = []
  const draws = options.draws ?? ascendingDraws
  const keep = vi.fn<ConsultationStore['keep']>(
    options.keep ?? (() => Promise.resolve()),
  )
  const now = vi.fn<Clock['now']>(options.now ?? (() => clockMoment))
  const consultationStore: ConsultationStore = {
    keep,
    list: untouched,
    get: untouched,
    remove: untouched,
    deletionRecords: untouched,
  }
  const randomSource: RandomSource = {
    integerBelow:
      options.integerBelow ??
      ((bound) => {
        bounds.push(bound)
        const draw = draws[bounds.length - 1]
        if (draw === undefined) throw new Error('drew more than was scripted')
        return draw
      }),
  }
  return {
    ports: { consultationStore, clock: { now }, randomSource },
    keep,
    now,
    bounds,
  }
}

const aQuery = query('Should the invented village rebuild its old bridge?')
const transformation: Transformation = [7, 8, 7, 8, 9, 6]
/** 2016-07-30T22:36:16.385Z, long before the Clock's Moment. */
const enteredMoment = moment(1_469_918_176_385, '+05:45')

describe('recordConsultation', () => {
  it('keeps a Recorded Consultation of the Query, Divined At as entered and the Transformation, and returns what it kept', async () => {
    const { ports, keep } = stubPorts()

    const kept = await recordConsultation(
      ports,
      aQuery,
      enteredMoment,
      transformation,
    )

    expect(kept).toStrictEqual({
      origin: 'recorded',
      id: `${clockTime}0123456789ABCDEF`,
      query: aQuery,
      divinedAt: {
        precision: 'moment',
        epochMilliseconds: 1_469_918_176_385,
        offset: '+05:45',
      },
      transformation: [7, 8, 7, 8, 9, 6],
    })
    expect(keep).toHaveBeenCalledTimes(1)
    expect(keep).toHaveBeenCalledWith(kept)
  })

  it('keeps Divined At entered to the day only, 29 February of a leap year, as entered', async () => {
    const leapDay = day(2024, 2, 29)
    const { ports } = stubPorts()

    const kept = await recordConsultation(
      ports,
      aQuery,
      leapDay,
      transformation,
    )

    expect(kept.divinedAt).toStrictEqual(day(2024, 2, 29))
    expect(kept.id).toBe(`${clockTime}0123456789ABCDEF`)
  })

  it("builds the Consultation Id from the Clock's 48-bit time first, then one character per draw, in the order drawn", async () => {
    const descending = Array.from({ length: 16 }, (_, at) => 31 - at)
    const { ports, now } = stubPorts({ draws: descending })

    const { id } = await recordConsultation(
      ports,
      aQuery,
      enteredMoment,
      transformation,
    )

    // Draws 31 down to 16 are the symbols Z down to G, skipping I, L, O and U.
    expect(id).toBe(`${clockTime}ZYXWVTSRQPNMKJHG`)
    expect(isConsultationId(id)).toBe(true)
    expect(now).toHaveBeenCalled()
  })

  it('draws integerBelow(32) exactly sixteen times', async () => {
    const { ports, bounds } = stubPorts()

    await recordConsultation(ports, aQuery, enteredMoment, transformation)

    expect(bounds).toStrictEqual(Array.from({ length: 16 }, () => 32))
  })

  it('keeps the Query exactly as written, with its surrounding spaces and its several lines', async () => {
    const written = query(
      '\tWas the invented well dug in the right place?\nWho asked?  ',
    )
    const { ports } = stubPorts()

    const kept = await recordConsultation(
      ports,
      written,
      enteredMoment,
      transformation,
    )

    expect(kept.query).toBe(
      '\tWas the invented well dug in the right place?\nWho asked?  ',
    )
  })

  it('records a Consultation when the Clock reads the last millisecond 48 bits hold, 2^48 − 1, its time characters 7ZZZZZZZZZ', async () => {
    const { ports, keep } = stubPorts({
      now: () => moment(2 ** 48 - 1, '+00:00'),
    })

    const kept = await recordConsultation(
      ports,
      aQuery,
      enteredMoment,
      transformation,
    )

    expect(kept.id).toBe('7ZZZZZZZZZ0123456789ABCDEF')
    expect(keep).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['2^48, one past what 48 bits hold', 2 ** 48],
    ['−1, before the Unix epoch', -1],
    ['1.5, not a whole millisecond', 1.5],
  ])(
    'rejects with an Error and keeps nothing when the Clock reads %s',
    async (_, epochMilliseconds) => {
      const { ports, keep } = stubPorts({
        now: () => moment(epochMilliseconds, '+00:00'),
      })

      await expect(
        recordConsultation(ports, aQuery, enteredMoment, transformation),
      ).rejects.toBeInstanceOf(Error)
      expect(keep).not.toHaveBeenCalled()
    },
  )

  it("rejects with the Clock's error unchanged, and keeps nothing, when the Clock fails", async () => {
    const failure = new Error('the invented clock stopped')
    const { ports, keep } = stubPorts({
      now: () => {
        throw failure
      },
    })

    await expect(
      recordConsultation(ports, aQuery, enteredMoment, transformation),
    ).rejects.toBe(failure)
    expect(keep).not.toHaveBeenCalled()
  })

  it("rejects with the Random Source's error unchanged, and keeps nothing, when the Random Source fails", async () => {
    const failure = new Error('the invented entropy ran dry')
    const { ports, keep } = stubPorts({
      integerBelow: () => {
        throw failure
      },
    })

    await expect(
      recordConsultation(ports, aQuery, enteredMoment, transformation),
    ).rejects.toBe(failure)
    expect(keep).not.toHaveBeenCalled()
  })

  it("rejects with the Store's error unchanged when keeping fails", async () => {
    const failure = new Error('the invented disk is full')
    const { ports } = stubPorts({ keep: () => Promise.reject(failure) })

    await expect(
      recordConsultation(ports, aQuery, enteredMoment, transformation),
    ).rejects.toBe(failure)
  })
})
