import type { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Consultation } from '@hexagram/consultation-journal/consultation'
import {
  isConsultationId,
  type ConsultationId,
} from '@hexagram/consultation-journal/consultation-id'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import { defaultReadingPreference } from '@hexagram/scripture-catalogue/default-reading-preference'
import {
  isEditionId,
  type EditionId,
} from '@hexagram/scripture-catalogue/edition-id'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import { readoutCases } from './readout-cases.js'
import { inventedTranslationId } from './typst-catalogue.js'

// The Typst export's byte fixtures: the Readout fixtures' five
// invented Consultations, each under its own Consultation Id so one
// Journal can hold all five, the several-moving case's Query given `"`,
// `\`, `#` and `$`, which the source must hold as a string literal and
// never read as Typst. Each fixture is one export's whole `.typ` file over
// `typstFixtureCatalogue`, its Consultations in the browse list's order.

function consultationId(text: string): ConsultationId {
  if (!isConsultationId(text)) throw new Error(`${text} is no ULID`)
  return text
}

function query(text: string): Query {
  if (!isQuery(text)) throw new Error('a blank Query')
  return text
}

function editionId(text: string): EditionId {
  if (!isEditionId(text)) throw new Error(`${text} is no EditionId`)
  return text
}

function readoutCase(name: string): Consultation {
  const found = readoutCases.find((each) => each.name === name)
  if (found === undefined) throw new Error(`no Readout case ${name}`)
  return found.consultation
}

export type TypstCaseName =
  | 'cast-x-zhi-x'
  | 'cast-all-moving'
  | 'cast-several-moving'
  | 'recorded-moment'
  | 'recorded-day'

/** The five Consultations, by the Readout fixtures' case names. */
export const typstConsultations: Readonly<Record<TypstCaseName, Consultation>> =
  {
    'cast-x-zhi-x': {
      ...readoutCase('cast-x-zhi-x'),
      id: consultationId('01M6E6AHA84T7V2M5N6P0R1S30'),
    },
    'cast-all-moving': {
      ...readoutCase('cast-all-moving'),
      id: consultationId('01M6E6AHA84T7V2M5N6P0R1S31'),
    },
    'cast-several-moving': {
      ...readoutCase('cast-several-moving'),
      id: consultationId('01M6E6AHA84T7V2M5N6P0R1S32'),
      query: query(
        String.raw`How will Steward Aelric’s journey to Westmill unfold: by the "#2 road" or the ford\ferry at $3 a crossing?`,
      ),
    },
    'recorded-moment': readoutCase('recorded-moment'),
    'recorded-day': readoutCase('recorded-day'),
  }

/** The five, newest first, as the browse list orders them. */
export const browseOrder: readonly TypstCaseName[] = [
  'cast-several-moving',
  'cast-all-moving',
  'cast-x-zhi-x',
  'recorded-moment',
  'recorded-day',
]

export interface TypstFixture {
  /** The fixture's file name under `tests/fixtures/typst/`. */
  readonly file: string
  /** The Journal's Consultations; the export holds every one. */
  readonly consultations: readonly TypstCaseName[]
  /** The Reading Preference options, as `hexagram-history` takes them. */
  readonly options: readonly string[]
  readonly preference: ReadingPreference
}

const one = (name: TypstCaseName): TypstFixture => ({
  file: `${name}.typ`,
  consultations: [name],
  options: [],
  preference: defaultReadingPreference,
})

export const typstFixtures: readonly TypstFixture[] = [
  one('cast-x-zhi-x'),
  one('cast-all-moving'),
  one('cast-several-moving'),
  one('recorded-moment'),
  one('recorded-day'),
  {
    // All five, newest first, each on a new page; the title spans the
    // oldest and newest Divined At dates.
    file: 'all-five.typ',
    consultations: browseOrder,
    options: [],
    preference: defaultReadingPreference,
  },
  {
    // The Chinese set with region `cn`, so the CJK face gives its
    // Simplified forms.
    file: 'simplified.typ',
    consultations: ['cast-several-moving'],
    options: ['--script', 'simplified'],
    preference: { ...defaultReadingPreference, script: 'simplified' },
  },
  {
    // The Yilin Verse shown, and a second Translation that gives only the
    // Hexagram Statements: every other passage shows Legge alone, nothing
    // put in the empty slot.
    file: 'yilin-two-translations.typ',
    consultations: ['cast-several-moving'],
    options: [
      '--translation',
      'legge-1882',
      '--translation',
      inventedTranslationId,
      '--yilin',
    ],
    preference: {
      ...defaultReadingPreference,
      translations: [editionId('legge-1882'), inventedTranslationId],
      yilinVerse: true,
    },
  },
]

const fixtureFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'typst',
)

/** A Typst fixture's bytes. */
export function typstFixture(file: string): Buffer {
  return readFileSync(path.join(fixtureFolder, file))
}
