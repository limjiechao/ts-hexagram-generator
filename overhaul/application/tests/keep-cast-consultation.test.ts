import type { CastConsultation } from '@hexagram/consultation-journal/cast-consultation'
import { isConsultationId } from '@hexagram/consultation-journal/consultation-id'
import {
  isUtcOffset,
  type Moment,
  type UtcOffset,
} from '@hexagram/consultation-journal/divined-at'
import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import type { CompleteCasting } from '@hexagram/oracle/casting'
import { describe, expect, it, vi } from 'vitest'

import { beginCasting } from '#src/begin-casting.js'
import type { Clock } from '#src/clock.js'
import type { ConsultationStore } from '#src/consultation-store.js'
import { divide } from '#src/divide.js'
import {
  buildCastConsultation,
  keepCastConsultation,
} from '#src/keep-cast-consultation.js'
import type { RandomSource } from '#src/random-source.js'

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

/** Divides by each Pick in turn, from the Empty Casting to a complete one. */
function castByPicks(picks: readonly number[]): CompleteCasting {
  let casting = beginCasting()
  for (const pick of picks) {
    const result = divide(casting, pick)
    if (result.outcome !== 'divided') {
      throw new Error(`refused: ${JSON.stringify(result.refusal)}`)
    }
    if (result.casting.state === 'complete') return result.casting
    casting = result.casting
  }
  throw new Error('the Picks did not complete the Casting')
}

// Line by Line, the Picks of an Old Yin 6, a Young Yang 7, a Young Yin 8, an
// Old Yang 9, a Young Yang 7 and an Old Yin 6 (ADR-0023's tables).
const mixedCasting = castByPicks([
  4, 3, 4, 4, 3, 1, 22, 1, 3, 47, 42, 37, 4, 3, 1, 4, 3, 4,
])
// Pick 1 in every Round: Old Yang 9 in all six Lines.
const oldYangCasting = castByPicks(Array.from({ length: 18 }, () => 1))

/** 2026-11-26T00:00:00.123Z, whose 48 bits are `01M8AJDS3V` in Crockford's base 32. */
const clockMoment = moment(1_795_651_200_123, '+08:00')
const clockTime = '01M8AJDS3V'

/** Draws 0 to 15, which are the symbols `0` to `F` of Crockford's alphabet. */
const ascendingDraws = Array.from({ length: 16 }, (_, at) => at)

function untouched(): Promise<never> {
  return Promise.reject(new Error('keeping used more of the Store than keep'))
}

/**
 * Ports for one keep: a Store whose `keep` resolves unless told otherwise, a
 * Clock that reads `clockMoment` unless told otherwise, and a Random Source
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

/**
 * Use case 1's last step whole: builds the Cast Consultation, keeps it, and
 * resolves to what was kept, so a throw while building rejects as the keep
 * did before the split.
 */
async function buildThenKeep(
  ports: Parameters<typeof buildCastConsultation>[0] &
    Parameters<typeof keepCastConsultation>[0],
  query: Query,
  casting: CompleteCasting,
  divisionMethod: DivisionMethod,
): Promise<CastConsultation> {
  const consultation = buildCastConsultation(
    ports,
    query,
    casting,
    divisionMethod,
  )
  await keepCastConsultation(ports, consultation)
  return consultation
}

const aQuery = query('Should the invented guild open a second workshop?')

describe('keepCastConsultation', () => {
  it("keeps a Cast Consultation of the Query, the Clock's Moment, the Casting with its Transformation, and the Division Method, and returns what it kept", async () => {
    const { ports, keep } = stubPorts()

    const kept = await buildThenKeep(ports, aQuery, mixedCasting, 'virtual')

    expect(kept).toStrictEqual({
      origin: 'cast',
      id: `${clockTime}0123456789ABCDEF`,
      query: aQuery,
      divinedAt: clockMoment,
      transformation: [6, 7, 8, 9, 7, 6],
      casting: mixedCasting,
      divisionMethod: 'virtual',
    })
    expect(keep).toHaveBeenCalledTimes(1)
    expect(keep).toHaveBeenCalledWith(kept)
  })

  it('builds the Consultation Id from the 48-bit time first, then one character per draw, in the order drawn', async () => {
    const descending = Array.from({ length: 16 }, (_, at) => 31 - at)
    const { ports } = stubPorts({ draws: descending })

    const { id } = await buildThenKeep(
      ports,
      aQuery,
      oldYangCasting,
      'automatic',
    )

    // Draws 31 down to 16 are the symbols Z down to G, skipping I, L, O and U.
    expect(id).toBe(`${clockTime}ZYXWVTSRQPNMKJHG`)
    expect(isConsultationId(id)).toBe(true)
  })

  it('draws integerBelow(32) exactly sixteen times', async () => {
    const { ports, bounds } = stubPorts()

    await buildThenKeep(ports, aQuery, oldYangCasting, 'automatic')

    expect(bounds).toStrictEqual(Array.from({ length: 16 }, () => 32))
  })

  it("reads the Clock exactly once, and uses that one Moment for both the Consultation Id's time and Divined At", async () => {
    const later = moment(1_469_918_176_385, '+00:00')
    const { ports, now } = stubPorts({
      now: vi
        .fn<Clock['now']>()
        .mockReturnValueOnce(clockMoment)
        .mockReturnValue(later),
    })

    const kept = await buildThenKeep(ports, aQuery, oldYangCasting, 'physical')

    expect(now).toHaveBeenCalledTimes(1)
    expect(kept.id.slice(0, 10)).toBe(clockTime)
    expect(kept.divinedAt).toStrictEqual(clockMoment)
  })

  it("keeps Divined At as the Clock's Moment, its UTC offset included", async () => {
    // 2016-07-30T22:36:16.385Z, whose 48 bits are 01ARYZ6S41.
    const westOfGreenwich = moment(1_469_918_176_385, '-03:30')
    const { ports } = stubPorts({ now: () => westOfGreenwich })

    const kept = await buildThenKeep(ports, aQuery, oldYangCasting, 'automatic')

    expect(kept.divinedAt).toStrictEqual({
      precision: 'moment',
      epochMilliseconds: 1_469_918_176_385,
      offset: '-03:30',
    })
    expect(kept.id).toBe('01ARYZ6S410123456789ABCDEF')
  })

  it.each<DivisionMethod>(['automatic', 'physical', 'virtual'])(
    'keeps the Division Method the caller gives, %s, without checking it against the Casting',
    async (divisionMethod) => {
      const { ports, keep } = stubPorts()

      const kept = await buildThenKeep(
        ports,
        aQuery,
        oldYangCasting,
        divisionMethod,
      )

      expect(kept.divisionMethod).toBe(divisionMethod)
      expect(keep).toHaveBeenCalledWith(
        expect.objectContaining({ divisionMethod }),
      )
    },
  )

  it('keeps the Query exactly as written, with its surrounding spaces and its several lines', async () => {
    const written = query(
      '  Will the invented harvest fair go ahead?\n\nAnd when?  ',
    )
    const { ports } = stubPorts()

    const kept = await buildThenKeep(
      ports,
      written,
      oldYangCasting,
      'automatic',
    )

    expect(kept.query).toBe(
      '  Will the invented harvest fair go ahead?\n\nAnd when?  ',
    )
  })

  it('keeps a Consultation at the Unix epoch, its time characters 0000000000', async () => {
    const { ports } = stubPorts({ now: () => moment(0, '+00:00') })

    const kept = await buildThenKeep(ports, aQuery, oldYangCasting, 'automatic')

    expect(kept.id).toBe('00000000000123456789ABCDEF')
  })

  it('keeps a Consultation at the last millisecond 48 bits hold, 2^48 − 1, its time characters 7ZZZZZZZZZ', async () => {
    const { ports, keep } = stubPorts({
      now: () => moment(2 ** 48 - 1, '+00:00'),
    })

    const kept = await buildThenKeep(ports, aQuery, oldYangCasting, 'automatic')

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
        buildThenKeep(ports, aQuery, oldYangCasting, 'automatic'),
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
      buildThenKeep(ports, aQuery, oldYangCasting, 'automatic'),
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
      buildThenKeep(ports, aQuery, oldYangCasting, 'automatic'),
    ).rejects.toBe(failure)
    expect(keep).not.toHaveBeenCalled()
  })

  it("rejects with the Store's error unchanged when keeping fails", async () => {
    const failure = new Error('the invented disk is full')
    const { ports } = stubPorts({ keep: () => Promise.reject(failure) })

    await expect(
      buildThenKeep(ports, aQuery, oldYangCasting, 'automatic'),
    ).rejects.toBe(failure)
  })
})
