import type { Edition } from '@hexagram/scripture-catalogue/edition'
import { isEditionId } from '@hexagram/scripture-catalogue/edition-id'
import { describe, expect, it } from 'vitest'

import { bundledScriptureCatalogue } from '#src/bundled-scripture-catalogue.js'

import {
  bundledEditionIds,
  kun,
  legacyHexagrams,
  libraryWording,
  ownerAllMoving,
  printedWorks,
  qian,
  type BundledEditionId,
} from './support/library.js'

// The four Edition records as ruled. Their Chinese wording is put together at
// run time from the library (see ./support/library.ts), never typed here: the
// Traditional title from the owner's file, the short name from the glossary,
// the Hexagram names from the legacy data, the All-Moving Statements' terms and
// the xiaoxiang's name from the owner's file. Only the full-width parentheses
// around the Simplified short name's qualifier are written, as escapes.

function legacyName(hexagram: typeof qian): string {
  const found = legacyHexagrams.find(
    (each) => each.hexagram.join(',') === hexagram.join(','),
  )
  if (found === undefined) throw new Error('no legacy Hexagram')
  return found.name('wuyingdian-1739')
}

const qianName = legacyName(qian)
const kunName = legacyName(kun)
const [qianTerm, kunTerm] = ownerAllMoving('wuyingdian-1739').map(
  ({ term }) => term,
)
const { chineseTitle, chineseShortName, simplifiedWord, xiaoxiangName } =
  libraryWording
const ctextPages = `the ${qianName} and ${kunName} pages (${qianTerm}, ${kunTerm}) retrieved 2026-11-27`

/** What each Edition record holds, whatever its Work, less `language`. */
interface ExpectedRecord {
  readonly shortName: string
  readonly title: string
  readonly witness: { readonly description: string }
  readonly unidentified: false
  readonly licence: Edition['licence']
  readonly script?: 'traditional' | 'simplified'
}

const expectedRecords: Readonly<Record<BundledEditionId, ExpectedRecord>> = {
  'wuyingdian-1739': {
    shortName: chineseShortName,
    title: `${chineseTitle} (1739)`,
    witness: {
      description: `ctext.org's transcription of the ${chineseTitle}, from its Book of Changes pages (ctext.org/book-of-changes); ${ctextPages}`,
    },
    unidentified: false,
    licence: 'terms-unverified',
    script: 'traditional',
  },
  'wuyingdian-1739-simplified': {
    shortName: `${chineseShortName}（${simplifiedWord}）`,
    title: `${chineseTitle} (1739)`,
    witness: {
      description: `ctext.org's character conversion of the ${chineseShortName} text into Simplified characters, from the same pages' Simplified view; not an independent Edition; ${ctextPages}`,
    },
    unidentified: false,
    licence: 'terms-unverified',
    script: 'simplified',
  },
  'legge-1882': {
    shortName: 'Legge',
    title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
    witness: {
      description: `a scanned copy of Sacred Books of the East vol. 16 (1882); the ${qianName} and ${kunName} pages: pp. 58, 61 (text) and 267, 269 (${xiaoxiangName})`,
    },
    unidentified: false,
    licence: 'public-domain',
  },
  'wilhelm-baynes-1967': {
    shortName: 'Wilhelm–Baynes',
    title:
      'Wilhelm, tr. Baynes, The I Ching or Book of Changes (Princeton, 1967)',
    witness: { description: 'a personal EPUB' },
    unidentified: false,
    licence: 'in-copyright',
  },
}

async function recordOf(
  work: (typeof printedWorks)[number],
  id: BundledEditionId,
): Promise<Edition> {
  const editions = await bundledScriptureCatalogue.editions(work)
  const found = editions.filter((edition) => edition.id === id)
  expect(found, `${work} has one ${id} record`).toHaveLength(1)
  const [only] = found
  if (only === undefined) throw new Error(`no ${work} record for ${id}`)
  return only
}

describe.each(printedWorks)('the editions of %s', (work) => {
  it('are the four bundled Editions, each once, all of this Work', async () => {
    const editions = await bundledScriptureCatalogue.editions(work)
    expect(editions.map(({ id }) => id).toSorted()).toEqual(
      [...bundledEditionIds].toSorted(),
    )
    for (const edition of editions) {
      expect(isEditionId(edition.id)).toBe(true)
      expect(edition.work).toBe(work)
    }
  })

  it.each(bundledEditionIds)(
    'give %s the ruled short name, title, Witness, licence and script',
    async (id) => {
      const edition = await recordOf(work, id)
      const { language, ...record } = edition
      expect(record).toStrictEqual({ id, work, ...expectedRecords[id] })
      if (expectedRecords[id].script === undefined) {
        expect(typeof language).toBe('string')
        expect(language).not.toBe('')
      } else expect('language' in edition).toBe(false)
    },
  )

  it.each(bundledEditionIds)(
    'give %s a Witness of its description alone, the retrieval date in its words',
    async (id) => {
      const { witness } = await recordOf(work, id)
      expect(witness).toStrictEqual(expectedRecords[id].witness)
    },
  )
})

describe('the Works no bundled Edition prints', () => {
  it.each(['wenyan', 'yilin'] as const)('%s has no Edition', async (work) => {
    expect(await bundledScriptureCatalogue.editions(work)).toEqual([])
  })
})

describe('an EditionId’s records', () => {
  it.each(bundledEditionIds)(
    '%s differ from Work to Work only in their Work',
    async (id) => {
      const records = await Promise.all(
        printedWorks.map(async (work) => {
          const { work: _work, ...rest } = await recordOf(work, id)
          return rest
        }),
      )
      for (const record of records) expect(record).toStrictEqual(records[0])
    },
  )
})
