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
  type DivinedAt,
  type Moment,
} from '@hexagram/consultation-journal/divined-at'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import type { RecordedConsultation } from '@hexagram/consultation-journal/recorded-consultation'
import type { UnreadableFile } from '@hexagram/consultation-journal/unreadable-file'
import type { CompleteCasting } from '@hexagram/oracle/casting'
import { describe, expect, it, vi } from 'vitest'

import { beginCasting } from '#src/begin-casting.js'
import { browseConsultations } from '#src/browse-consultations.js'
import type { ConsultationStore } from '#src/consultation-store.js'
import { divide } from '#src/divide.js'

// Every Query, Id and date below is invented.

function query(text: string): Query {
  if (!isQuery(text))
    throw new Error(`the Query ${JSON.stringify(text)} is blank`)
  return text
}

/** A Consultation Id ending in `suffix`: a larger suffix is a larger Id. */
function id(suffix: string): ConsultationId {
  const text = `01M8AJDS3V${suffix.padStart(16, '0')}`
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

function recorded(
  idSuffix: string,
  divinedAt: DivinedAt,
  text = 'Should the invented mill at Brackenford be repaired?',
): RecordedConsultation {
  return {
    origin: 'recorded',
    id: id(idSuffix),
    query: query(text),
    divinedAt,
    transformation: [7, 8, 7, 8, 7, 8],
  }
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

// Pick 1 in every Round: Old Yang 9 in all six Lines.
const oldYangCasting = castByPicks(Array.from({ length: 18 }, () => 1))

function cast(idSuffix: string, divinedAt: Moment): CastConsultation {
  return {
    origin: 'cast',
    id: id(idSuffix),
    query: query('Will the invented ferry at Ostmere run before the thaw?'),
    divinedAt,
    transformation: oldYangCasting.transformation,
    casting: oldYangCasting,
    divisionMethod: 'automatic',
  }
}

const unreadableFiles: readonly UnreadableFile[] = [
  { location: 'b-not-a-record.md', reason: { kind: 'no-frontmatter' } },
  {
    location: 'a-broken-field.md',
    reason: { kind: 'invalid-field', field: 'divinedAt' },
  },
  {
    location: 'c-second-copy.md',
    reason: { kind: 'duplicate-id', firstLocation: 'a-first-copy.md' },
  },
]

function untouched(): Promise<never> {
  return Promise.reject(new Error('browsing used more of the Store than list'))
}

/** A Store whose `list` gives these records, in this order, and nothing else. */
function storeListing(
  consultations: readonly Consultation[],
  unreadable: readonly UnreadableFile[] = [],
) {
  const list = vi.fn<ConsultationStore['list']>(() =>
    Promise.resolve({ consultations, unreadable }),
  )
  const consultationStore: ConsultationStore = {
    keep: vi.fn(untouched),
    list,
    get: vi.fn(untouched),
    remove: vi.fn(untouched),
    deletionRecords: vi.fn(untouched),
  }
  return { ports: { consultationStore }, consultationStore, list }
}

/** The Ids browsing lists, in order, when the Store lists `consultations`. */
async function browsedIds(
  consultations: readonly Consultation[],
  filter = '',
): Promise<readonly string[]> {
  const browsed = await browseConsultations(
    storeListing(consultations).ports,
    filter,
  )
  return browsed.consultations.map((consultation) => consultation.id)
}

/** The same rows in several orders, so no test passes by keeping the Store's. */
function orders<Row>(rows: readonly Row[]): readonly (readonly Row[])[] {
  const rotated = [...rows.slice(1), ...rows.slice(0, 1)]
  return [rows, rows.toReversed(), rotated, rotated.toReversed()]
}

function sortedByLocation(files: readonly UnreadableFile[]) {
  return files.toSorted((left, right) =>
    left.location < right.location ? -1 : 1,
  )
}

// Rows sort by their date first, a moment's date being its date in its own
// offset, so across offsets a later date can outrank a later instant: ordering
// moments by instant alone and putting a Day above its date's moments would
// form a cycle.
describe('browseConsultations orders the Journal newest first by Divined At', () => {
  it('lists moments in one offset by instant, newest first', async () => {
    const rows = [
      recorded('1', moment('2026-11-02T21:14:00.000+08:00')),
      recorded('2', moment('2026-11-02T21:14:00.001+08:00')),
      recorded('3', moment('2026-10-28T07:30:00.000+08:00')),
      recorded('4', moment('2027-01-01T00:00:00.000+08:00')),
      recorded('5', moment('2026-11-02T09:00:00.000+08:00')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('4'),
        id('2'),
        id('1'),
        id('5'),
        id('3'),
      ])
    }
  })

  it('lists moments in different offsets by instant where their dates in their own offsets fall in the same order', async () => {
    const rows = [
      // 2026-11-02T02:00Z, the latest instant and the latest date.
      recorded('1', moment('2026-11-02T10:00:00.000+08:00')),
      // 2026-11-02T01:00Z, on 1 November in its own offset.
      recorded('2', moment('2026-11-01T20:00:00.000-05:00')),
      // 2026-11-01T09:00Z.
      recorded('3', moment('2026-11-01T09:00:00.000+00:00')),
      // 2026-11-01T04:00Z.
      recorded('4', moment('2026-11-01T12:00:00.000+08:00')),
      // 2026-10-31T23:30Z, on 31 October in its own offset.
      recorded('5', moment('2026-10-31T23:30:00.000+00:00')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('1'),
        id('2'),
        id('3'),
        id('4'),
        id('5'),
      ])
    }
  })

  it('lists moments of one instant in one offset by Consultation Id, the larger above', async () => {
    const instant = moment('2026-11-02T21:14:00.000+08:00')
    const rows = [
      recorded('A1', instant),
      recorded('A3', instant),
      recorded('A2', instant),
      recorded('1', moment('2026-11-02T21:14:00.001+08:00')),
      recorded('ZZ', moment('2026-11-02T21:13:59.999+08:00')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('1'),
        id('A3'),
        id('A2'),
        id('A1'),
        id('ZZ'),
      ])
    }
  })

  it('lists moments of one instant in different offsets, all on one date, by Consultation Id, the larger above', async () => {
    // Each is 2026-11-02T04:00Z, and 2 November in its own offset.
    const rows = [
      recorded('B2', moment('2026-11-02T12:00:00.000+08:00')),
      recorded('B3', moment('2026-11-02T04:00:00.000+00:00')),
      recorded('B1', moment('2026-11-02T02:00:00.000-02:00')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('B3'),
        id('B2'),
        id('B1'),
      ])
    }
  })

  it('lists a Day above every moment of its own date and below the moments of the next, all in one offset', async () => {
    const rows = [
      recorded('1', moment('2026-11-03T00:00:00.000+08:00')),
      recorded('2', day(2026, 11, 2)),
      recorded('3', moment('2026-11-02T23:59:59.999+08:00')),
      recorded('4', moment('2026-11-02T00:00:00.000+08:00')),
      recorded('5', moment('2026-11-01T23:59:59.999+08:00')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('1'),
        id('2'),
        id('3'),
        id('4'),
        id('5'),
      ])
    }
  })

  it('lists a Day above the moments of its own date, each in its own offset, with the moments of other dates where both instant and date put them', async () => {
    const rows = [
      // 2026-11-02T10:00Z, on 2 November in its own offset.
      recorded('1', moment('2026-11-02T18:00:00.000+08:00')),
      recorded('2', day(2026, 11, 1)),
      // 2026-11-02T01:00Z, on 1 November in its own offset.
      recorded('3', moment('2026-11-01T20:00:00.000-05:00')),
      // 2026-11-01T01:00Z, on 1 November in its own offset.
      recorded('4', moment('2026-11-01T09:00:00.000+08:00')),
      // 2026-10-31T04:00Z, on 31 October in its own offset.
      recorded('5', moment('2026-10-31T12:00:00.000+08:00')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('1'),
        id('2'),
        id('3'),
        id('4'),
        id('5'),
      ])
    }
  })

  it('lists two Days of one date by Consultation Id, the larger above, both above the moments of that date', async () => {
    const rows = [
      recorded('C1', day(2026, 11, 2)),
      recorded('1', moment('2026-11-02T08:00:00.000+08:00')),
      recorded('C2', day(2026, 11, 2)),
      recorded('2', moment('2026-11-03T08:00:00.000+08:00')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('2'),
        id('C2'),
        id('C1'),
        id('1'),
      ])
    }
  })

  it('lists Days of different dates newest first', async () => {
    const rows = [
      recorded('1', day(2026, 10, 28)),
      recorded('2', day(2027, 1, 1)),
      recorded('3', day(2026, 11, 2)),
      recorded('4', day(2024, 2, 29)),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('2'),
        id('3'),
        id('1'),
        id('4'),
      ])
    }
  })

  it('lists a moment of a later date above a moment of an earlier date, each in its own offset, even when its instant is earlier', async () => {
    const rows = [
      // 2026-11-01T11:00Z, on 2 November in its own offset.
      recorded('1', moment('2026-11-02T01:00:00.000+14:00')),
      // 2026-11-02T01:00Z, a later instant, on 1 November in its own offset.
      recorded('2', moment('2026-11-01T20:00:00.000-05:00')),
      // 2026-11-02T12:30Z, on 3 November in its own offset.
      recorded('3', moment('2026-11-03T00:30:00.000+12:00')),
      // 2026-11-03T09:00Z, the latest instant, on 2 November in its own offset.
      recorded('4', moment('2026-11-02T23:00:00.000-10:00')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('3'),
        id('4'),
        id('1'),
        id('2'),
      ])
    }
  })

  it('lists the moments of one date, each in its own offset, by instant, newest first', async () => {
    const rows = [
      // 2026-11-01T11:00Z.
      recorded('1', moment('2026-11-02T01:00:00.000+14:00')),
      // 2026-11-03T09:00Z.
      recorded('2', moment('2026-11-02T23:00:00.000-10:00')),
      // 2026-11-02T12:00Z.
      recorded('3', moment('2026-11-02T12:00:00.000+00:00')),
      // 2026-11-02T03:30Z.
      recorded('4', moment('2026-11-02T09:00:00.000+05:30')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('2'),
        id('3'),
        id('4'),
        id('1'),
      ])
    }
  })

  it('lists a moment of a later date above a Day, and the Day above a moment of its own date at a later instant', async () => {
    const rows = [
      // 2026-11-01T11:00Z, on 2 November in its own offset.
      recorded('1', moment('2026-11-02T01:00:00.000+14:00')),
      recorded('2', day(2026, 11, 1)),
      // 2026-11-02T01:00Z, on 1 November in its own offset.
      recorded('3', moment('2026-11-01T20:00:00.000-05:00')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('1'),
        id('2'),
        id('3'),
      ])
    }
  })

  it('lists a Day above every moment of its date, even one whose instant is later than a moment of the next date', async () => {
    const rows = [
      // 2026-11-02T11:00Z, on 3 November in its own offset.
      recorded('1', moment('2026-11-03T01:00:00.000+14:00')),
      recorded('2', day(2026, 11, 2)),
      // 2026-11-03T09:00Z, on 2 November in its own offset.
      recorded('3', moment('2026-11-02T23:00:00.000-10:00')),
      // 2026-11-01T16:00Z, on 2 November in its own offset.
      recorded('4', moment('2026-11-02T00:00:00.000+08:00')),
      recorded('5', day(2026, 11, 1)),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('1'),
        id('2'),
        id('3'),
        id('4'),
        id('5'),
      ])
    }
  })

  it('lists a Day whose date holds no moment between the moments of the dates around it', async () => {
    const rows = [
      recorded('1', moment('2026-11-04T09:00:00.000+08:00')),
      recorded('2', day(2026, 11, 2)),
      recorded('3', moment('2026-10-31T21:00:00.000+08:00')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('1'),
        id('2'),
        id('3'),
      ])
    }
  })

  it('orders Cast and Recorded Consultations together, by Divined At alone', async () => {
    const rows = [
      cast('1', moment('2026-11-02T21:14:00.000+08:00')),
      recorded('2', moment('2026-11-02T22:00:00.000+08:00')),
      recorded('3', day(2026, 11, 2)),
      cast('4', moment('2026-11-03T06:00:00.000+08:00')),
      recorded('5', moment('2026-11-02T08:00:00.000+08:00')),
    ]

    for (const listed of orders(rows)) {
      expect(await browsedIds(listed)).toStrictEqual([
        id('4'),
        id('3'),
        id('2'),
        id('1'),
        id('5'),
      ])
    }
  })

  it('returns the Consultations the Store lists, unchanged', async () => {
    const castRow = cast('1', moment('2026-11-02T21:14:00.000+08:00'))
    const dayRow = recorded('2', day(2026, 10, 28))

    const browsed = await browseConsultations(
      storeListing([dayRow, castRow]).ports,
      '',
    )

    expect(browsed.consultations).toStrictEqual([castRow, dayRow])
  })

  it('returns an empty list for an empty Journal', async () => {
    await expect(
      browseConsultations(storeListing([]).ports, ''),
    ).resolves.toStrictEqual({ consultations: [], unreadable: [] })
  })
})

describe('browseConsultations narrows by the filter', () => {
  const granary = recorded(
    '1',
    moment('2026-11-02T21:14:00.000+08:00'),
    'Should the granary at Greyfen Hold be rebuilt before winter?',
  )
  const embassy = recorded(
    '2',
    day(2026, 10, 28),
    "Will Steward Aelric's embassy to Westmill succeed?",
  )
  const festival = recorded(
    '3',
    moment('2026-10-20T10:00:00.000+08:00'),
    'Will the Élan festival at Thornbury draw the river guilds?',
  )
  const road = recorded(
    '4',
    moment('2026-10-10T10:00:00.000+08:00'),
    'Is the road (west) to Harrowgate open?',
  )
  const ledger = recorded(
    '5',
    moment('2026-10-01T10:00:00.000+08:00'),
    'Should the guild keep its old ledger?\nOr start a new one at midwinter?',
  )
  const journal = [road, festival, granary, ledger, embassy]

  it('keeps every Consultation, in order, for an empty filter', async () => {
    expect(await browsedIds(journal, '')).toStrictEqual([
      id('1'),
      id('2'),
      id('3'),
      id('4'),
      id('5'),
    ])
  })

  it('keeps the Consultations whose Query contains the filter, ignoring ASCII case, in order', async () => {
    expect(await browsedIds(journal, 'GREYFEN')).toStrictEqual([id('1')])
    expect(await browsedIds(journal, 'wILL')).toStrictEqual([id('2'), id('3')])
    expect(await browsedIds(journal, 'west')).toStrictEqual([id('2'), id('4')])
  })

  it('matches the filter anywhere in the Query, not only whole words', async () => {
    expect(await browsedIds(journal, 'ran')).toStrictEqual([id('1')])
    expect(await browsedIds(journal, 'mill succ')).toStrictEqual([id('2')])
  })

  it('ignores the case of É and é, either way round', async () => {
    expect(await browsedIds(journal, 'élan')).toStrictEqual([id('3')])
    expect(await browsedIds(journal, 'ÉLAN')).toStrictEqual([id('3')])

    const lowerCased = recorded(
      '6',
      moment('2026-09-01T10:00:00.000+08:00'),
      'Is the élan of the invented choir spent?',
    )
    expect(await browsedIds([lowerCased], 'Élan')).toStrictEqual([id('6')])
  })

  it('reads the filter as literal text, not a pattern', async () => {
    expect(await browsedIds(journal, '(west)')).toStrictEqual([id('4')])
    expect(await browsedIds(journal, 'w.st')).toStrictEqual([])
    expect(await browsedIds(journal, 'r.*d')).toStrictEqual([])
  })

  it('matches across a line break of a multi-line Query only where the filter holds that line break', async () => {
    expect(await browsedIds(journal, 'ledger?\nor')).toStrictEqual([id('5')])
    expect(await browsedIds(journal, 'ledger? or')).toStrictEqual([])
    expect(await browsedIds(journal, 'midwinter')).toStrictEqual([id('5')])
  })

  it('keeps no Consultation when none matches', async () => {
    expect(await browsedIds(journal, 'Ostmere')).toStrictEqual([])
  })

  it('returns every Unreadable file whatever the filter', async () => {
    for (const filter of ['', 'granary', 'Ostmere']) {
      const browsed = await browseConsultations(
        storeListing(journal, unreadableFiles).ports,
        filter,
      )
      expect(sortedByLocation(browsed.unreadable)).toStrictEqual(
        sortedByLocation(unreadableFiles),
      )
    }
  })
})

describe('browseConsultations and the Store', () => {
  it('reads the Store through list alone, once', async () => {
    const { ports, consultationStore, list } = storeListing(
      [recorded('1', day(2026, 11, 2))],
      unreadableFiles,
    )

    await browseConsultations(ports, 'mill')

    expect(list).toHaveBeenCalledTimes(1)
    expect(consultationStore.keep).not.toHaveBeenCalled()
    expect(consultationStore.get).not.toHaveBeenCalled()
    expect(consultationStore.remove).not.toHaveBeenCalled()
    expect(consultationStore.deletionRecords).not.toHaveBeenCalled()
  })

  it('returns the Unreadable files the Store lists, unchanged', async () => {
    const browsed = await browseConsultations(
      storeListing([], unreadableFiles).ports,
      '',
    )

    expect(browsed.consultations).toStrictEqual([])
    expect(sortedByLocation(browsed.unreadable)).toStrictEqual(
      sortedByLocation(unreadableFiles),
    )
  })

  it('passes a Store failure on unchanged', async () => {
    const failure = new Error('the Journal cannot be read')
    const { ports, list } = storeListing([])
    list.mockImplementation(() => Promise.reject(failure))

    await expect(browseConsultations(ports, '')).rejects.toBe(failure)
  })
})
