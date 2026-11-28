import type { Clock } from '@hexagram/application/clock'
import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { divide } from '@hexagram/application/divide'
import type {
  buildCastConsultation,
  keepCastConsultation,
} from '@hexagram/application/keep-cast-consultation'
import type { RandomSource } from '@hexagram/application/random-source'
import type { recordConsultation } from '@hexagram/application/record-consultation'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import {
  isDay,
  isUtcOffset,
  type Day,
  type Moment,
  type UtcOffset,
} from '@hexagram/consultation-journal/divined-at'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { composeCli } from '#src/composition-root.js'

// Every Query below is invented.

type Composed = ReturnType<typeof composeCli>

function query(text: string): Query {
  if (!isQuery(text))
    throw new Error(`the Query ${JSON.stringify(text)} is blank`)
  return text
}

function utcOffset(text: string): UtcOffset {
  if (!isUtcOffset(text)) throw new Error(`the offset ${text} is malformed`)
  return text
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
const clockMoment: Moment = {
  precision: 'moment',
  epochMilliseconds: 1_795_651_200_123,
  offset: utcOffset('+08:00'),
}
const clockTime = '01M8AJDS3V'

/** Keeping and recording need no scripture, so every lookup fails the test. */
const unused = () => Promise.reject(new Error('keeping looked up scripture'))

function untouched(): Promise<never> {
  return Promise.reject(new Error('keeping used more of the Store than keep'))
}

/**
 * The driven ports, stubbed: a Store whose `keep` resolves, a Clock that
 * reads `clockMoment`, and a Random Source that returns the scripted draws in
 * turn and records each bound.
 */
function stubPorts(draws: readonly number[]) {
  const bounds: number[] = []
  const scriptureCatalogue = {
    passageTexts: vi.fn(unused),
    hexagramNames: vi.fn(unused),
    receivedSequenceNumber: vi.fn(unused),
    trigramNames: vi.fn(unused),
    editions: vi.fn(unused),
  } satisfies ScriptureCatalogue
  const keep = vi.fn<ConsultationStore['keep']>(() => Promise.resolve())
  const consultationStore: ConsultationStore = {
    keep,
    list: untouched,
    get: untouched,
    remove: untouched,
    deletionRecords: untouched,
  }
  const clock: Clock = { now: () => clockMoment }
  const randomSource: RandomSource = {
    integerBelow: (bound) => {
      bounds.push(bound)
      const draw = draws[bounds.length - 1]
      if (draw === undefined) throw new Error('drew more than was scripted')
      return draw
    },
  }
  return {
    ports: { scriptureCatalogue, randomSource, consultationStore, clock },
    scriptureCatalogue,
    keep,
    bounds,
  }
}

/** Casts eighteen Automatic Divisions through the composed steps. */
function castAutomatically(cli: Composed) {
  let casting = cli.beginCasting()
  let result: ReturnType<typeof divide> | undefined
  for (let round = 1; round <= 18; round += 1) {
    const next = cli.nextRound(casting)
    if (next.outcome !== 'next') throw new Error('the Casting did not replay')
    result = cli.divide(
      casting,
      cli.drawAutomaticPick(next.round.remainderGroups),
    )
    if (result.outcome !== 'divided') {
      throw new Error(`refused: ${JSON.stringify(result.refusal)}`)
    }
    if (result.casting.state === 'complete') return result.casting
    casting = result.casting
  }
  throw new Error('eighteen Divisions did not complete the Casting')
}

/** Draws 0 to 15, which are the symbols `0` to `F` of Crockford's alphabet. */
const ascendingDraws = Array.from({ length: 16 }, (_, at) => at)

describe('composeCli for keeping and recording a Consultation', () => {
  it('gives keepCastConsultation and recordConsultation the signatures @hexagram/application gives them, minus their ports', () => {
    expectTypeOf<Composed['keepCastConsultation']>().toEqualTypeOf<
      (
        consultation: Parameters<typeof keepCastConsultation>[1],
      ) => ReturnType<typeof keepCastConsultation>
    >()
    expectTypeOf<Composed['recordConsultation']>().toEqualTypeOf<
      (
        query: Parameters<typeof recordConsultation>[1],
        divinedAt: Parameters<typeof recordConsultation>[2],
        transformation: Parameters<typeof recordConsultation>[3],
      ) => ReturnType<typeof recordConsultation>
    >()
    const cli = composeCli(stubPorts([]).ports)
    expect(typeof cli.keepCastConsultation).toBe('function')
    expect(typeof cli.recordConsultation).toBe('function')
  })

  it('gives buildCastConsultation the signature @hexagram/application gives it, minus its ports', () => {
    expectTypeOf<Composed['buildCastConsultation']>().toEqualTypeOf<
      (
        query: Parameters<typeof buildCastConsultation>[1],
        casting: Parameters<typeof buildCastConsultation>[2],
        divisionMethod: Parameters<typeof buildCastConsultation>[3],
      ) => ReturnType<typeof buildCastConsultation>
    >()
    const cli = composeCli(stubPorts([]).ports)
    expect(typeof cli.buildCastConsultation).toBe('function')
  })

  it('casts from beginCasting by eighteen Automatic Divisions and keeps the Cast Consultation in the Store it takes, its Id from the Clock and the Random Source it takes', async () => {
    // 36 draws of 0 cast Pick 1 in every Round, so Old Yang 9 in all six
    // Lines; the 16 draws after them build the Consultation Id.
    const { ports, scriptureCatalogue, keep, bounds } = stubPorts([
      ...Array.from({ length: 36 }, () => 0),
      ...ascendingDraws,
    ])
    const cli = composeCli(ports)
    const aQuery = query(
      'Should the invented choir tour the coast this spring?',
    )

    const casting = castAutomatically(cli)
    const kept = cli.buildCastConsultation(aQuery, casting, 'automatic')
    await cli.keepCastConsultation(kept)

    expect(kept).toStrictEqual({
      origin: 'cast',
      id: `${clockTime}0123456789ABCDEF`,
      query: aQuery,
      divinedAt: clockMoment,
      transformation: [9, 9, 9, 9, 9, 9],
      casting,
      divisionMethod: 'automatic',
    })
    expect(keep).toHaveBeenCalledTimes(1)
    expect(keep).toHaveBeenCalledWith(kept)
    expect(bounds.slice(36)).toStrictEqual(Array.from({ length: 16 }, () => 32))
    expect(scriptureCatalogue.passageTexts).not.toHaveBeenCalled()
    expect(scriptureCatalogue.hexagramNames).not.toHaveBeenCalled()
    expect(scriptureCatalogue.editions).not.toHaveBeenCalled()
  })

  it('records a Consultation divined elsewhere in the Store it takes, with Divined At as entered and its Id from the Clock and the Random Source it takes', async () => {
    const { ports, scriptureCatalogue, keep } = stubPorts(ascendingDraws)
    const cli = composeCli(ports)
    const aQuery = query(
      'Was the invented orchard planted in the right season?',
    )

    const kept = await cli.recordConsultation(
      aQuery,
      day(2024, 2, 29),
      [8, 8, 7, 6, 7, 9],
    )

    expect(kept).toStrictEqual({
      origin: 'recorded',
      id: `${clockTime}0123456789ABCDEF`,
      query: aQuery,
      divinedAt: day(2024, 2, 29),
      transformation: [8, 8, 7, 6, 7, 9],
    })
    expect(keep).toHaveBeenCalledTimes(1)
    expect(keep).toHaveBeenCalledWith(kept)
    expect(scriptureCatalogue.passageTexts).not.toHaveBeenCalled()
    expect(scriptureCatalogue.hexagramNames).not.toHaveBeenCalled()
    expect(scriptureCatalogue.editions).not.toHaveBeenCalled()
  })
})
