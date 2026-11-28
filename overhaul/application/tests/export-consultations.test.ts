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
import {
  consultationReadout,
  hexagramsNamed,
  trigramsNamed,
} from '@hexagram/presentation/build-readout'
import type {
  ConsultationReadout,
  NamedHexagram,
} from '@hexagram/presentation/readout'
import { typstExport } from '@hexagram/presentation/typst-export'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import {
  isEditionId,
  type EditionId,
} from '@hexagram/scripture-catalogue/edition-id'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import type { TrigramName } from '@hexagram/scripture-catalogue/trigram-name'
import { describe, expect, it, vi } from 'vitest'

import { beginCasting } from '#src/begin-casting.js'
import type { ConsultationStore } from '#src/consultation-store.js'
import { divide } from '#src/divide.js'
import { exportConsultations } from '#src/export-consultations.js'
import {
  lookUpHexagramNames,
  lookUpReceivedSequenceNumber,
  lookUpTrigramNames,
} from '#src/look-up-catalogue.js'
import { resolveTransformation } from '#src/resolve-transformation.js'
import type { ScriptureCatalogue } from '#src/scripture-catalogue.js'

// Use case 9 over a fake Store and a fake Catalogue. Every Query, Id, date,
// Edition, name and text below is invented. The Typst bytes themselves are
// presentation's; the CLI's export tests pin them against byte fixtures.
// Here the source must be presentation's Typst export of the matching
// Consultations' Readouts, in the browse list's order, each built as every
// other Readout is.

function query(text: string): Query {
  if (!isQuery(text)) throw new Error(`the Query ${text} is blank`)
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
  const value = { precision: 'day', year, month, day: dayOfMonth } as const
  if (!isDay(value)) throw new Error(`${year}-${month}-${dayOfMonth} is no day`)
  return value
}

function editionId(slug: string): EditionId {
  if (!isEditionId(slug)) throw new Error(`the slug ${slug} is malformed`)
  return slug
}

/** Divides by each Pick in turn, from the Empty Casting to a complete one. */
function castByPicks(picks: readonly number[]): CompleteCasting {
  let casting = beginCasting()
  for (const pick of picks) {
    const result = divide(casting, pick)
    if (result.outcome !== 'divided') throw new Error(`refused Pick ${pick}`)
    if (result.casting.state === 'complete') return result.casting
    casting = result.casting
  }
  throw new Error('the Picks did not complete the Casting')
}

// Pick 1 in every Round: Old Yang 9 in all six Lines.
const oldYangCasting = castByPicks(Array.from({ length: 18 }, () => 1))

function cast(
  suffix: string,
  text: string,
  divinedAt: Moment,
): CastConsultation {
  return {
    origin: 'cast',
    id: id(suffix),
    query: query(text),
    divinedAt,
    transformation: oldYangCasting.transformation,
    casting: oldYangCasting,
    divisionMethod: 'virtual',
  }
}

function recorded(
  suffix: string,
  text: string,
  divinedAt: Moment | Day,
): RecordedConsultation {
  return {
    origin: 'recorded',
    id: id(suffix),
    query: query(text),
    divinedAt,
    transformation: [6, 7, 8, 9, 7, 8],
  }
}

// Four Consultations, listed by the Store out of order. Newest first, as
// the browse list orders them: ferry, mill, granary, beacon.
const mill = recorded(
  '2',
  'Should the invented mill at Brackenford be repaired?',
  moment('2026-09-14T18:30:00+08:00'),
)
const beacon = cast(
  '3',
  'Will the invented BEACON at Ostmere be lit?',
  moment('2026-09-01T07:00:00+01:00'),
)
const ferry = cast(
  '1',
  'Will the invented ferry at Ostmere run before the thaw?',
  moment('2026-09-20T09:15:00-05:00'),
)
const granary = recorded(
  '4',
  'Is the invented granary at Brackenford sound?',
  day(2026, 9, 10),
)
const listed: readonly Consultation[] = [mill, beacon, ferry, granary]

const unreadableFiles: readonly UnreadableFile[] = [
  { location: 'a-not-a-record.md', reason: { kind: 'no-frontmatter' } },
  {
    location: 'b-broken.md',
    reason: { kind: 'invalid-field', field: 'divinedAt' },
  },
]

function untouched(): Promise<never> {
  return Promise.reject(
    new Error('the export used more of the Store than list'),
  )
}

/** A Store whose `list` gives these records and nothing else. */
function storeListing(
  consultations: readonly Consultation[],
  unreadable: readonly UnreadableFile[] = [],
): ConsultationStore {
  return {
    keep: vi.fn(untouched),
    list: vi.fn<ConsultationStore['list']>(() =>
      Promise.resolve({ consultations, unreadable }),
    ),
    get: vi.fn(untouched),
    remove: vi.fn(untouched),
    deletionRecords: vi.fn(untouched),
  }
}

const chineseEdition: Edition = {
  id: editionId('invented-chinese'),
  work: 'zhouyi',
  shortName: 'Invented Chinese',
  title: 'An invented Chinese text (nowhere, 2026)',
  script: 'traditional',
  witness: { description: 'an invented set of pages' },
  unidentified: false,
  licence: 'public-domain',
}

const translationEdition: Edition = {
  id: editionId('invented-translation'),
  work: 'zhouyi',
  shortName: 'Invented',
  title: 'An invented translation (nowhere, 2026)',
  language: 'en',
  witness: { description: 'an invented scanned copy' },
  unidentified: false,
  licence: 'public-domain',
}

const preference: ReadingPreference = {
  script: 'traditional',
  translations: [translationEdition.id],
  commentaries: ['daxiang', 'xiaoxiang'],
  yilinVerse: true,
}

/**
 * A fake Catalogue: every name, imagery and passage is invented filler in
 * the Chinese Edition and the Translation, and every Hexagram is number 37.
 * Each call is recorded in `calls`, in order.
 */
function fakeCatalogue(calls: string[] = []): ScriptureCatalogue {
  return {
    passageTexts: vi.fn<ScriptureCatalogue['passageTexts']>((citation) => {
      calls.push('passageTexts')
      return Promise.resolve([
        { citation, edition: chineseEdition, text: '擬文。' },
        { citation, edition: translationEdition, text: 'Invented filler.' },
      ])
    }),
    hexagramNames: vi.fn<ScriptureCatalogue['hexagramNames']>((hexagram) => {
      calls.push('hexagramNames')
      return Promise.resolve([
        { hexagram, edition: chineseEdition, name: '擬名' },
        { hexagram, edition: translationEdition, name: 'Invented name' },
      ])
    }),
    receivedSequenceNumber: vi.fn<ScriptureCatalogue['receivedSequenceNumber']>(
      () => {
        calls.push('receivedSequenceNumber')
        return Promise.resolve(37)
      },
    ),
    trigramNames: vi.fn<ScriptureCatalogue['trigramNames']>((trigram) => {
      calls.push('trigramNames')
      return Promise.resolve([
        { trigram, edition: chineseEdition, name: '擬', imagery: '擬象' },
        {
          trigram,
          edition: translationEdition,
          name: 'invented',
          imagery: 'an invented image',
        },
      ])
    }),
    editions: vi.fn<ScriptureCatalogue['editions']>(() => {
      calls.push('editions')
      return Promise.resolve([chineseEdition, translationEdition])
    }),
  }
}

/**
 * A Consultation's Readout as every Readout is built: use case 3 resolves
 * its Transformation and use case 8 looks up the names presentation
 * lists, both with the same preference, and presentation builds it.
 */
async function readoutOf(
  scriptureCatalogue: ScriptureCatalogue,
  consultation: Consultation,
  shown: ReadingPreference,
): Promise<ConsultationReadout> {
  const ports = { scriptureCatalogue }
  const resolved = await resolveTransformation(
    ports,
    consultation.transformation,
    shown,
  )
  const hexagrams: NamedHexagram[] = []
  for (const hexagram of hexagramsNamed(resolved.resolution)) {
    hexagrams.push({
      hexagram,
      receivedSequenceNumber: await lookUpReceivedSequenceNumber(
        ports,
        hexagram,
      ),
      names: await lookUpHexagramNames(ports, hexagram, shown),
    })
  }
  const trigrams: TrigramName[] = []
  for (const trigram of trigramsNamed(resolved.resolution))
    trigrams.push(...(await lookUpTrigramNames(ports, trigram, shown)))
  return consultationReadout(consultation, resolved, { hexagrams, trigrams })
}

/** presentation's Typst export of these Consultations' Readouts, in this order. */
async function expectedSource(
  consultations: readonly [Consultation, ...Consultation[]],
  shown: ReadingPreference = preference,
): Promise<string> {
  const catalogue = fakeCatalogue()
  const [first, ...rest] = consultations
  const readouts: [ConsultationReadout, ...ConsultationReadout[]] = [
    await readoutOf(catalogue, first, shown),
  ]
  for (const consultation of rest)
    readouts.push(await readoutOf(catalogue, consultation, shown))
  return typstExport(readouts, shown.script)
}

/** The Typst string literal presentation passes a text as. */
const typstString = (text: string): string =>
  `"${text
    .replaceAll('\\', '\\\\')
    .replaceAll('"', String.raw`\"`)
    .replaceAll('\n', String.raw`\n`)}"`

describe('exportConsultations: what it exports', () => {
  it('with an empty filter, every Consultation, newest first, as presentation renders their Readouts', async () => {
    const consultationStore = storeListing(listed, unreadableFiles)
    const exported = await exportConsultations(
      { consultationStore, scriptureCatalogue: fakeCatalogue() },
      '',
      preference,
    )

    expect(exported).toEqual({
      outcome: 'exported',
      consultations: 4,
      typst: await expectedSource([ferry, mill, granary, beacon]),
    })
  })

  it('the filter keeps the Consultations whose Query contains it, ignoring case, as the browse list does', async () => {
    const consultationStore = storeListing(listed, unreadableFiles)
    const exported = await exportConsultations(
      { consultationStore, scriptureCatalogue: fakeCatalogue() },
      'ostMERE',
      preference,
    )

    expect(exported).toEqual({
      outcome: 'exported',
      consultations: 2,
      typst: await expectedSource([ferry, beacon]),
    })
  })

  it('one Consultation matching gives a source holding one Readout', async () => {
    const exported = await exportConsultations(
      {
        consultationStore: storeListing(listed),
        scriptureCatalogue: fakeCatalogue(),
      },
      'mill',
      preference,
    )

    expect(exported).toEqual({
      outcome: 'exported',
      consultations: 1,
      typst: await expectedSource([mill]),
    })
  })

  it('Unreadable files are left out and not counted', async () => {
    const exported = await exportConsultations(
      {
        consultationStore: storeListing([granary], unreadableFiles),
        scriptureCatalogue: fakeCatalogue(),
      },
      '',
      preference,
    )

    expect(exported).toEqual({
      outcome: 'exported',
      consultations: 1,
      typst: await expectedSource([granary]),
    })
  })

  it('the Reading Preference given shapes the Readouts and the script', async () => {
    const simplified: ReadingPreference = {
      script: 'simplified',
      translations: [],
      commentaries: ['wenyan'],
      yilinVerse: false,
    }
    const scriptureCatalogue = fakeCatalogue()
    const exported = await exportConsultations(
      { consultationStore: storeListing([beacon]), scriptureCatalogue },
      '',
      simplified,
    )

    expect(exported).toEqual({
      outcome: 'exported',
      consultations: 1,
      typst: await expectedSource([beacon], simplified),
    })
    expect(scriptureCatalogue.hexagramNames).toHaveBeenCalledWith(
      expect.anything(),
      simplified,
    )
    expect(scriptureCatalogue.passageTexts).toHaveBeenCalledWith(
      expect.anything(),
      simplified,
    )
  })

  it(
    String.raw`a Query on two lines, and one holding ", \, # and $, reach the source as string literals, kept as given`,
    async () => {
      const twoLines = recorded(
        '5',
        'Should the invented reeve\nbe seated this spring?',
        day(2026, 9, 2),
      )
      const marked = recorded(
        '6',
        String.raw`Will the "#1 road" or the ford\ferry cost $3?`,
        day(2026, 9, 3),
      )
      const exported = await exportConsultations(
        {
          consultationStore: storeListing([twoLines, marked]),
          scriptureCatalogue: fakeCatalogue(),
        },
        '',
        preference,
      )

      expect(exported.outcome).toBe('exported')
      const typst = exported.outcome === 'exported' ? exported.typst : ''
      expect(typst).toBe(await expectedSource([marked, twoLines]))
      expect(typst).toContain(typstString(twoLines.query))
      expect(typst).toContain(typstString(marked.query))
    },
  )

  it('the source pins its neutral title and no date, and the title holds no Query', async () => {
    const exported = await exportConsultations(
      {
        consultationStore: storeListing(listed),
        scriptureCatalogue: fakeCatalogue(),
      },
      '',
      preference,
    )

    const typst = exported.outcome === 'exported' ? exported.typst : ''
    // Oldest and newest local dates: 2026-09-01 at +01:00 and 2026-09-20
    // at -05:00.
    expect(typst).toContain(
      '#set document(title: "Consultations, 2026-09-01 to 2026-09-20", date: none)',
    )
    for (const forbidden of ['@preview', '#import', '#read', '#image'])
      expect(typst).not.toContain(forbidden)
  })

  it('never writes to the Store: it only lists', async () => {
    const consultationStore = storeListing(listed, unreadableFiles)
    await exportConsultations(
      { consultationStore, scriptureCatalogue: fakeCatalogue() },
      '',
      preference,
    )

    expect(consultationStore.list).toHaveBeenCalledTimes(1)
    expect(consultationStore.keep).not.toHaveBeenCalled()
    expect(consultationStore.get).not.toHaveBeenCalled()
    expect(consultationStore.remove).not.toHaveBeenCalled()
    expect(consultationStore.deletionRecords).not.toHaveBeenCalled()
  })
})

describe('exportConsultations: when nothing matches', () => {
  it.each([
    {
      shown: 'the filter matches no Query',
      consultations: listed,
      unreadable: unreadableFiles,
      filter: 'harvest',
    },
    {
      shown: 'the Journal holds no Consultation',
      consultations: [],
      unreadable: [],
      filter: '',
    },
    {
      shown: 'the Journal holds only Unreadable files',
      consultations: [],
      unreadable: unreadableFiles,
      filter: '',
    },
  ])(
    '$shown: none-matching, and the Catalogue is never asked',
    async ({ consultations, unreadable, filter }) => {
      const calls: string[] = []
      const exported = await exportConsultations(
        {
          consultationStore: storeListing(consultations, unreadable),
          scriptureCatalogue: fakeCatalogue(calls),
        },
        filter,
        preference,
      )

      expect(exported).toEqual({ outcome: 'none-matching' })
      expect(calls).toEqual([])
    },
  )
})

describe('exportConsultations: a port that fails', () => {
  it('a Store failure rejects unchanged, and the Catalogue is never asked', async () => {
    const failure = new Error('an invented Store failure')
    const calls: string[] = []
    const consultationStore: ConsultationStore = {
      ...storeListing([]),
      list: () => Promise.reject(failure),
    }

    await expect(
      exportConsultations(
        { consultationStore, scriptureCatalogue: fakeCatalogue(calls) },
        '',
        preference,
      ),
    ).rejects.toBe(failure)
    expect(calls).toEqual([])
  })

  it.each([
    'passageTexts',
    'hexagramNames',
    'receivedSequenceNumber',
    'trigramNames',
  ] as const)(
    'a Catalogue failure in %s rejects unchanged, and no lookup follows it',
    async (failing) => {
      const failure = new Error(`an invented ${failing} failure`)
      const calls: string[] = []
      const working = fakeCatalogue(calls)
      const fails = (): Promise<never> => {
        calls.push(`${failing} failed`)
        return Promise.reject(failure)
      }
      const scriptureCatalogue: ScriptureCatalogue = {
        passageTexts: failing === 'passageTexts' ? fails : working.passageTexts,
        hexagramNames:
          failing === 'hexagramNames' ? fails : working.hexagramNames,
        receivedSequenceNumber:
          failing === 'receivedSequenceNumber'
            ? fails
            : working.receivedSequenceNumber,
        trigramNames: failing === 'trigramNames' ? fails : working.trigramNames,
        editions: working.editions,
      }

      await expect(
        exportConsultations(
          { consultationStore: storeListing(listed), scriptureCatalogue },
          '',
          preference,
        ),
      ).rejects.toBe(failure)
      expect(calls.at(-1)).toBe(`${failing} failed`)
      expect(calls.filter((call) => call.endsWith('failed'))).toHaveLength(1)
    },
  )
})
