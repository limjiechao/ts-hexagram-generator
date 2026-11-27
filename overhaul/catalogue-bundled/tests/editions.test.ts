import type { Edition } from '@hexagram/scripture-catalogue/edition'
import { isEditionId } from '@hexagram/scripture-catalogue/edition-id'
import { describe, expect, it } from 'vitest'

import { bundledScriptureCatalogue } from '#src/bundled-scripture-catalogue.js'

import {
  bundledEditionIds,
  printedWorks,
  type BundledEditionId,
} from './support/library.js'

// The four Edition records in the ruled wording, as the doc comment of
// src/bundled-data.ts records it: names, titles and Witnesses, not scripture.

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
    shortName: '武英殿本',
    title: '武英殿十三經注疏本《周易正義》 (1739)',
    witness: {
      description:
        "ctext.org's transcription of the 武英殿十三經注疏本《周易正義》, from its Book of Changes pages (ctext.org/book-of-changes); the 乾 and 坤 pages (用九, 用六) retrieved 2026-11-27",
    },
    unidentified: false,
    licence: 'terms-unverified',
    script: 'traditional',
  },
  'wuyingdian-1739-simplified': {
    shortName: '武英殿本（简体）',
    title: '武英殿十三經注疏本《周易正義》 (1739)',
    witness: {
      description:
        "ctext.org's character conversion of the 武英殿本 text into Simplified characters, from the same pages' Simplified view; not an independent Edition; the 乾 and 坤 pages (用九, 用六) retrieved 2026-11-27",
    },
    unidentified: false,
    licence: 'terms-unverified',
    script: 'simplified',
  },
  'legge-1882': {
    shortName: 'Legge',
    title: 'Legge, Sacred Books of the East vol. 16 (Oxford, 1882)',
    witness: {
      description:
        'a scanned copy of Sacred Books of the East vol. 16 (1882); the 乾 and 坤 pages: pp. 58, 61 (text) and 267, 269 (小象)',
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
        expect(language).toBe('en')
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
