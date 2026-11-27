import type { Consultation } from '@hexagram/consultation-journal/consultation'
import { isConsultationId } from '@hexagram/consultation-journal/consultation-id'
import {
  isDay,
  isUtcOffset,
  type Day,
  type Moment,
} from '@hexagram/consultation-journal/divined-at'
import type { DivisionMethod } from '@hexagram/consultation-journal/division-method'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import type { CompleteCasting } from '@hexagram/oracle/casting'
import type { Transformation } from '@hexagram/oracle/transformation'
import { describe, expect, it, vi } from 'vitest'

import { beginCasting } from '#src/begin-casting.js'
import type { Clock } from '#src/clock.js'
import type { ConsultationStore } from '#src/consultation-store.js'
import { divide } from '#src/divide.js'
import {
  importLegacyFiles,
  type LegacyRecord,
} from '#src/import-legacy-files.js'
import type { RandomSource } from '#src/random-source.js'

// Use case 7 takes records the legacy importer has already parsed and
// replayed. Every Query and date below is invented.

function query(text: string): Query {
  if (!isQuery(text))
    throw new Error(`the Query ${JSON.stringify(text)} is blank`)
  return text
}

function moment(text: string): Moment {
  const offset = text.slice(-6)
  if (!isUtcOffset(offset)) throw new Error(`the offset ${offset} is malformed`)
  return { precision: 'moment', epochMilliseconds: Date.parse(text), offset }
}

function day(year: number, month: number, dayOfMonth: number): Day {
  const value = { precision: 'day', year, month, day: dayOfMonth } as const
  if (!isDay(value)) throw new Error('no such day')
  return value
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

// The Picks of the legacy corpus's HEAP file, Line 1 first, which replay to
// 8, 8, 7, 8, 6, 7.
const heapCasting = castByPicks([
  25, 20, 9, 25, 16, 14, 20, 20, 17, 23, 19, 17, 16, 19, 19, 22, 24, 19,
])

const castRecord: LegacyRecord = {
  query: query(
    'Will I find a worthy post once my studies at Greyfen Hold are complete?',
  ),
  divinedAt: moment('2026-05-19T11:08:42+08:00'),
  casting: heapCasting,
}

const recordedTransformation: Transformation = [8, 7, 8, 9, 9, 9]

const recordedRecord: LegacyRecord = {
  query: query('What will it be like at Westmill after the floods?'),
  divinedAt: moment('2026-03-16T13:28:33+08:00'),
  casting: undefined,
  transformation: recordedTransformation,
}

const recordedDayRecord: LegacyRecord = {
  query: query('Will Steward Aelric’s embassy to Westmill succeed?'),
  divinedAt: day(2026, 2, 28),
  casting: undefined,
  transformation: [7, 7, 7, 7, 7, 7],
}

/** 2026-11-26T00:00:00.123Z, whose 48 bits are `01M8AJDS3V` in Crockford's base 32. */
const clockMoment: Moment = {
  precision: 'moment',
  epochMilliseconds: 1_795_651_200_123,
  offset: (() => {
    const offset = '+08:00'
    if (!isUtcOffset(offset)) throw new Error('bad offset')
    return offset
  })(),
}
const clockTime = '01M8AJDS3V'

/** Crockford's base 32, the ULID alphabet. */
const crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function rejecting(port: string) {
  return (): Promise<never> =>
    Promise.reject(new Error(`importing used the Store's ${port}`))
}

/**
 * Ports for one import: a Store whose `keep` resolves unless told otherwise
 * and that holds no Deletion Record, a Clock that reads `clockMoment`, and a
 * Random Source that draws 0, 1, 2 … 31, 0, 1 … in turn.
 */
function stubPorts(
  options: { readonly keep?: ConsultationStore['keep'] } = {},
) {
  let draws = 0
  const keep = vi.fn<ConsultationStore['keep']>(
    options.keep ?? (() => Promise.resolve()),
  )
  const remove = vi.fn<ConsultationStore['remove']>(rejecting('remove'))
  const consultationStore: ConsultationStore = {
    keep,
    list: rejecting('list'),
    get: rejecting('get'),
    remove,
    deletionRecords: () => Promise.resolve([]),
  }
  const now = vi.fn<Clock['now']>(() => clockMoment)
  const randomSource: RandomSource = {
    integerBelow: (bound) => {
      const draw = draws % bound
      draws += 1
      return draw
    },
  }
  return {
    ports: { consultationStore, clock: { now }, randomSource },
    keep,
    remove,
  }
}

function keptOf(keep: ReturnType<typeof stubPorts>['keep']): Consultation[] {
  return keep.mock.calls.map(([consultation]) => consultation)
}

describe('importLegacyFiles (use case 7)', () => {
  it('keeps a record with a Casting as a Cast Consultation of its Query, Divined At and Casting, with the Casting’s Transformation and the run’s Division Method', async () => {
    const { ports, keep } = stubPorts()

    const kept = await importLegacyFiles(ports, [castRecord], 'physical')

    expect(kept).toHaveLength(1)
    expect(kept[0]).toEqual({
      origin: 'cast',
      id: kept[0]?.id,
      query: castRecord.query,
      divinedAt: castRecord.divinedAt,
      transformation: heapCasting.transformation,
      casting: heapCasting,
      divisionMethod: 'physical',
    })
    expect(keptOf(keep)).toEqual(kept)
  })

  it('keeps a record without a Casting as a Recorded Consultation of its Query, Divined At and Transformation', async () => {
    const { ports, keep } = stubPorts()

    const kept = await importLegacyFiles(ports, [recordedRecord], 'virtual')

    expect(kept).toEqual([
      {
        origin: 'recorded',
        id: kept[0]?.id,
        query: recordedRecord.query,
        divinedAt: recordedRecord.divinedAt,
        transformation: recordedTransformation,
      },
    ])
    expect(keptOf(keep)).toEqual(kept)
  })

  it('keeps a Recorded Consultation dated to the day only', async () => {
    const { ports } = stubPorts()

    const [kept] = await importLegacyFiles(
      ports,
      [recordedDayRecord],
      'automatic',
    )

    expect(kept?.origin).toBe('recorded')
    expect(kept?.divinedAt).toEqual(day(2026, 2, 28))
  })

  it.each(['physical', 'virtual', 'automatic'] as const)(
    'gives every Cast Consultation the one Division Method %s, and no Recorded Consultation any',
    async (divisionMethod: DivisionMethod) => {
      const { ports } = stubPorts()

      const kept = await importLegacyFiles(
        ports,
        [castRecord, recordedRecord, castRecord],
        divisionMethod,
      )

      expect(
        kept.map((consultation) =>
          consultation.origin === 'cast'
            ? consultation.divisionMethod
            : 'divisionMethod' in consultation,
        ),
      ).toEqual([divisionMethod, false, divisionMethod])
    },
  )

  it('takes each Divined At from its record, never from the Clock', async () => {
    const { ports } = stubPorts()

    const kept = await importLegacyFiles(
      ports,
      [castRecord, recordedRecord],
      'physical',
    )

    expect(kept.map((consultation) => consultation.divinedAt)).toEqual([
      castRecord.divinedAt,
      recordedRecord.divinedAt,
    ])
  })

  it('keeps each record once, in the records’ order, and returns what it kept in that order', async () => {
    const { ports, keep } = stubPorts()
    const records = [recordedRecord, castRecord, recordedDayRecord]

    const kept = await importLegacyFiles(ports, records, 'virtual')

    expect(kept.map((consultation) => consultation.query)).toEqual(
      records.map((record) => record.query),
    )
    expect(keep).toHaveBeenCalledTimes(3)
    expect(keptOf(keep)).toEqual(kept)
  })

  it('gives each kept Consultation a new Consultation Id, a ULID of the Clock’s time and sixteen draws', async () => {
    const { ports } = stubPorts()

    const kept = await importLegacyFiles(
      ports,
      [castRecord, recordedRecord],
      'physical',
    )
    const ids = kept.map((consultation) => consultation.id)

    expect(ids[0]).toBe(`${clockTime}${crockford.slice(0, 16)}`)
    expect(new Set(ids).size).toBe(2)
    for (const id of ids) {
      expect(isConsultationId(id)).toBe(true)
      expect(id.startsWith(clockTime)).toBe(true)
    }
  })

  it('keeps the same record twice, under two Ids, when it is given twice', async () => {
    const { ports, keep } = stubPorts()

    const kept = await importLegacyFiles(
      ports,
      [castRecord, castRecord],
      'physical',
    )

    expect(keep).toHaveBeenCalledTimes(2)
    expect(kept[0]?.id).not.toBe(kept[1]?.id)
    expect({ ...kept[0], id: undefined }).toEqual({ ...kept[1], id: undefined })
  })

  it('keeps the same files again, under new Ids, when the import is run twice', async () => {
    const { ports } = stubPorts()

    const first = await importLegacyFiles(ports, [recordedRecord], 'virtual')
    const second = await importLegacyFiles(ports, [recordedRecord], 'virtual')

    expect(first[0]?.id).not.toBe(second[0]?.id)
    expect({ ...first[0], id: undefined }).toEqual({
      ...second[0],
      id: undefined,
    })
  })

  it('keeps a Query of several lines exactly as given', async () => {
    const { ports } = stubPorts()
    const several = query(
      '  Will the mill grind again?\nAnd by which season?  ',
    )

    const [kept] = await importLegacyFiles(
      ports,
      [{ ...recordedRecord, query: several }],
      'virtual',
    )

    expect(kept?.query).toBe(several)
  })

  it('keeps nothing and resolves to nothing for no records', async () => {
    const { ports, keep } = stubPorts()

    expect(await importLegacyFiles(ports, [], 'physical')).toEqual([])
    expect(keep).not.toHaveBeenCalled()
  })

  it('never removes a Consultation', async () => {
    const { ports, remove } = stubPorts()

    await importLegacyFiles(ports, [castRecord, recordedRecord], 'automatic')

    expect(remove).not.toHaveBeenCalled()
  })

  it('rejects with the Store failure unchanged when keep fails', async () => {
    const failure = new Error('the disk is full')
    const { ports } = stubPorts({ keep: () => Promise.reject(failure) })

    await expect(
      importLegacyFiles(ports, [castRecord], 'physical'),
    ).rejects.toBe(failure)
  })

  it('rejects with the Store failure unchanged when a later keep fails', async () => {
    const failure = new Error('the disk is full')
    let calls = 0
    const { ports } = stubPorts({
      keep: () => {
        calls += 1
        return calls === 2 ? Promise.reject(failure) : Promise.resolve()
      },
    })

    await expect(
      importLegacyFiles(
        ports,
        [castRecord, recordedRecord, recordedDayRecord],
        'physical',
      ),
    ).rejects.toBe(failure)
  })
})
