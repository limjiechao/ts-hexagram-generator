import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import { describe, expect, it } from 'vitest'

import { bundledScriptureCatalogue } from '#src/bundled-scripture-catalogue.js'

import {
  citationKey,
  editionId,
  legacyHexagrams,
  legacyPassages,
  legacyTrigrams,
  type BundledEditionId,
} from './support/library.js'

// Reading Preferences that name several Editions, or none, or one the
// Catalogue does not hold. Every expected text and name is read at run time
// from the pre-overhaul models (see ./support/library.ts).

const traditionalTexts = new Map(
  legacyPassages('wuyingdian-1739').map(({ citation, text }) => [
    citationKey(citation),
    text,
  ]),
)

// A passage whose Simplified text differs from its Traditional one, so a
// Traditional text given for the Simplified script cannot pass unseen.
const sample = legacyPassages('wuyingdian-1739-simplified').find(
  ({ citation, text }) => traditionalTexts.get(citationKey(citation)) !== text,
)
if (sample === undefined || sample.citation.work === 'yilin')
  throw new Error('no passage of one Hexagram differs by script')
const { citation } = sample
const sampleHexagram = sample.citation.hexagram

const hexagramFacts = legacyHexagrams.find(
  ({ hexagram }) => hexagram.join(',') === sampleHexagram.join(','),
)
if (hexagramFacts === undefined) throw new Error('no legacy Hexagram')

const [trigramFacts] = legacyTrigrams
if (trigramFacts === undefined) throw new Error('no legacy Trigram')

function legacyText(id: BundledEditionId): string | undefined {
  return legacyPassages(id).find(
    (each) => citationKey(each.citation) === citationKey(citation),
  )?.text
}

function preference(
  script: ReadingPreference['script'],
  translations: readonly string[],
): ReadingPreference {
  return {
    script,
    translations: translations.map(editionId),
    commentaries: ['daxiang', 'xiaoxiang'],
    yilinVerse: false,
  }
}

interface Row {
  readonly name: string
  readonly preference: ReadingPreference
  /** The Editions shown, in order. */
  readonly shown: readonly BundledEditionId[]
}

const rows: readonly Row[] = [
  {
    name: 'Traditional, then Wilhelm–Baynes and Legge in the order asked',
    preference: preference('traditional', [
      'wilhelm-baynes-1967',
      'legge-1882',
    ]),
    shown: ['wuyingdian-1739', 'wilhelm-baynes-1967', 'legge-1882'],
  },
  {
    name: 'an id the Catalogue does not hold, before Legge, shows nothing',
    preference: preference('traditional', ['not-held-1900', 'legge-1882']),
    shown: ['wuyingdian-1739', 'legge-1882'],
  },
  {
    name: 'the Traditional id as a Translation shows nothing there',
    preference: preference('traditional', ['wuyingdian-1739']),
    shown: ['wuyingdian-1739'],
  },
  {
    name: 'the Simplified id as a Translation shows nothing there',
    preference: preference('traditional', ['wuyingdian-1739-simplified']),
    shown: ['wuyingdian-1739'],
  },
  {
    name: 'the Simplified script with the Traditional id as a Translation shows the Simplified once',
    preference: preference('simplified', ['wuyingdian-1739']),
    shown: ['wuyingdian-1739-simplified'],
  },
  {
    name: 'the Simplified script gives the Simplified Edition, never the Traditional',
    preference: preference('simplified', ['legge-1882']),
    shown: ['wuyingdian-1739-simplified', 'legge-1882'],
  },
  {
    name: 'no Translations gives the Chinese only',
    preference: preference('traditional', []),
    shown: ['wuyingdian-1739'],
  },
  {
    name: 'Legge asked twice is shown twice',
    preference: preference('traditional', ['legge-1882', 'legge-1882']),
    shown: ['wuyingdian-1739', 'legge-1882', 'legge-1882'],
  },
]

describe.each(rows)('a preference: $name', ({ preference: asked, shown }) => {
  it('gives the passage text in each Edition shown, in order', async () => {
    const texts = await bundledScriptureCatalogue.passageTexts(citation, asked)
    expect(texts.map(({ edition }) => edition.id)).toEqual(shown)
    expect(texts.map(({ text }) => text)).toEqual(shown.map(legacyText))
  })

  it('gives the Hexagram name in each Edition shown, in order', async () => {
    const names = await bundledScriptureCatalogue.hexagramNames(
      hexagramFacts.hexagram,
      asked,
    )
    expect(names.map(({ edition }) => edition.id)).toEqual(shown)
    expect(names.map(({ name }) => name)).toEqual(
      shown.map((id) => hexagramFacts.name(id)),
    )
  })
})

describe('a preference with two Translations, for a Trigram', () => {
  it('gives the name and imagery in the Chinese, then Wilhelm–Baynes, then Legge', async () => {
    const shown: BundledEditionId[] = [
      'wuyingdian-1739',
      'wilhelm-baynes-1967',
      'legge-1882',
    ]
    const names = await bundledScriptureCatalogue.trigramNames(
      trigramFacts.trigram,
      preference('traditional', ['wilhelm-baynes-1967', 'legge-1882']),
    )
    expect(
      names.map(({ edition, name, imagery }) => [edition.id, name, imagery]),
    ).toEqual(
      shown.map((id) => [id, trigramFacts.name(id), trigramFacts.imagery(id)]),
    )
  })
})
