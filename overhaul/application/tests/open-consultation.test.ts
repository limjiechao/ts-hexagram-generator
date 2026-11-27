import type { CastConsultation } from '@hexagram/consultation-journal/cast-consultation'
import type { Consultation } from '@hexagram/consultation-journal/consultation'
import {
  isConsultationId,
  type ConsultationId,
} from '@hexagram/consultation-journal/consultation-id'
import {
  isDay,
  isUtcOffset,
  type Day,
  type Moment,
} from '@hexagram/consultation-journal/divined-at'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import type { RecordedConsultation } from '@hexagram/consultation-journal/recorded-consultation'
import type { UnreadableFile } from '@hexagram/consultation-journal/unreadable-file'
import type { CompleteCasting } from '@hexagram/oracle/casting'
import { describe, expect, it, vi } from 'vitest'

import { beginCasting } from '#src/begin-casting.js'
import type { ConsultationStore } from '#src/consultation-store.js'
import { divide } from '#src/divide.js'
import { openConsultation } from '#src/open-consultation.js'

// Every Query, Id and date below is invented.

function query(text: string): Query {
  if (!isQuery(text))
    throw new Error(`the Query ${JSON.stringify(text)} is blank`)
  return text
}

function id(text: string): ConsultationId {
  if (!isConsultationId(text)) throw new Error(`${text} is no Consultation Id`)
  return text
}

/** A Moment from ISO text ending in its own offset, such as `+08:00`. */
function moment(iso: string): Moment {
  const offset = iso.slice(-6)
  if (!isUtcOffset(offset)) throw new Error(`the offset ${offset} is malformed`)
  return { precision: 'moment', epochMilliseconds: Date.parse(iso), offset }
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

const castConsultation: CastConsultation = {
  origin: 'cast',
  id: id('01M8AJDS3VQ4X7M2N5P9T0W1YC'),
  query: query('Will the invented ferry at Ostmere run before the thaw?'),
  divinedAt: moment('2026-11-26T08:00:00.123+08:00'),
  transformation: mixedCasting.transformation,
  casting: mixedCasting,
  divisionMethod: 'physical',
}

const recordedDay: RecordedConsultation = {
  origin: 'recorded',
  id: id('01JE0B7Q2W5X8Z3N6R9T1V4Y7C'),
  query: query("Will Steward Aelric's embassy to Westmill succeed?"),
  divinedAt: day(2026, 10, 28),
  transformation: [8, 8, 7, 6, 7, 9],
}

const recordedMoment: RecordedConsultation = {
  origin: 'recorded',
  id: id('01JE0A1B2C3D4E5F6G7H8J9K0M'),
  query: query('Should the granary at Greyfen Hold be rebuilt?\nAnd by whom?'),
  divinedAt: moment('2026-10-28T07:30:00.000-05:00'),
  transformation: [7, 7, 7, 7, 7, 7],
}

/** An Id that only an Unreadable file carries, so the Store holds no Consultation for it. */
const unreadableId = id('01M8AJDS3V7777777777777777')
const unreadable: readonly UnreadableFile[] = [
  {
    location: `2026-11-03--${unreadableId}.md`,
    reason: { kind: 'not-version-2' },
  },
]

function untouched(): Promise<never> {
  return Promise.reject(new Error('opening used more of the Store than get'))
}

/** A Store holding these Consultations, whose `get` answers as the port says. */
function storeHolding(consultations: readonly Consultation[]) {
  const get = vi.fn<ConsultationStore['get']>((wanted) =>
    Promise.resolve(
      consultations.find((consultation) => consultation.id === wanted),
    ),
  )
  const consultationStore: ConsultationStore = {
    keep: vi.fn(untouched),
    list: vi.fn(() => Promise.resolve({ consultations, unreadable })),
    get,
    remove: vi.fn(untouched),
    deletionRecords: vi.fn(untouched),
  }
  return { ports: { consultationStore }, consultationStore, get }
}

const journal = [castConsultation, recordedDay, recordedMoment]

describe('openConsultation', () => {
  it.each([
    ['a Cast Consultation, its Casting whole', castConsultation],
    ['a Recorded Consultation divined on a Day', recordedDay],
    [
      'a Recorded Consultation divined at a Moment, its Query of two lines',
      recordedMoment,
    ],
  ] as const)('returns %s as the Store holds it', async (_, consultation) => {
    await expect(
      openConsultation(storeHolding(journal).ports, consultation.id),
    ).resolves.toStrictEqual(consultation)
  })

  it('asks the Store for that Id, once', async () => {
    const { ports, get } = storeHolding(journal)

    await openConsultation(ports, recordedDay.id)

    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith(recordedDay.id)
  })

  it('returns undefined for an Id the Store does not hold', async () => {
    await expect(
      openConsultation(
        storeHolding(journal).ports,
        id('01M8AJDS3V0000000000000000'),
      ),
    ).resolves.toBeUndefined()
  })

  it('returns undefined for an Id that only an Unreadable file carries', async () => {
    await expect(
      openConsultation(storeHolding(journal).ports, unreadableId),
    ).resolves.toBeUndefined()
  })

  it('returns undefined from an empty Journal', async () => {
    await expect(
      openConsultation(storeHolding([]).ports, castConsultation.id),
    ).resolves.toBeUndefined()
  })

  it('never writes to the Store', async () => {
    const { ports, consultationStore } = storeHolding(journal)

    await openConsultation(ports, castConsultation.id)
    await openConsultation(ports, unreadableId)

    expect(consultationStore.keep).not.toHaveBeenCalled()
    expect(consultationStore.remove).not.toHaveBeenCalled()
  })

  it('passes a Store failure on unchanged', async () => {
    const failure = new Error('the Journal cannot be read')
    const { ports, get } = storeHolding(journal)
    get.mockImplementation(() => Promise.reject(failure))

    await expect(openConsultation(ports, recordedDay.id)).rejects.toBe(failure)
  })
})
