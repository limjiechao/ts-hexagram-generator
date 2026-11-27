import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { Trigram } from '@hexagram/oracle/trigram'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import {
  isEditionId,
  type EditionId,
} from '@hexagram/scripture-catalogue/edition-id'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import type { ReceivedSequenceNumber } from '@hexagram/scripture-catalogue/received-sequence-number'
import type { TrigramName } from '@hexagram/scripture-catalogue/trigram-name'
import { describe, expect, it, vi } from 'vitest'

import {
  lookUpReceivedSequenceNumber,
  lookUpTrigramNames,
} from '#src/look-up-catalogue.js'
import type { ScriptureCatalogue } from '#src/scripture-catalogue.js'

// Every fixture below is invented: no Edition, Witness, name or imagery is real.

function editionId(slug: string): EditionId {
  if (!isEditionId(slug)) throw new Error(`the slug ${slug} is malformed`)
  return slug
}

const qian: Hexagram = ['yang', 'yang', 'yang', 'yang', 'yang', 'yang']
const kun: Hexagram = ['yin', 'yin', 'yin', 'yin', 'yin', 'yin']
const heaven: Trigram = ['yang', 'yang', 'yang']
const thunder: Trigram = ['yang', 'yin', 'yin']

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
  licence: 'in-copyright',
}

const preference: ReadingPreference = {
  script: 'traditional',
  translations: [translationEdition.id],
  commentaries: ['daxiang'],
  yilinVerse: true,
}

function unstubbed(): Promise<never> {
  return Promise.reject(new Error('not stubbed'))
}

/** A fake Catalogue: the members given, and every other member rejecting. */
function fakeCatalogue(
  members: Partial<ScriptureCatalogue>,
): ScriptureCatalogue {
  return {
    passageTexts: vi.fn(members.passageTexts ?? unstubbed),
    hexagramNames: vi.fn(members.hexagramNames ?? unstubbed),
    receivedSequenceNumber: vi.fn(members.receivedSequenceNumber ?? unstubbed),
    trigramNames: vi.fn(members.trigramNames ?? unstubbed),
    editions: vi.fn(members.editions ?? unstubbed),
  }
}

describe("lookUpReceivedSequenceNumber: a Hexagram's Received Sequence Number", () => {
  it('returns the number the Scripture Catalogue gives, not one of its own', async () => {
    // Deliberately not 乾's place in the received text: the use case reports
    // the Catalogue's data and computes nothing.
    const scriptureCatalogue = fakeCatalogue({
      receivedSequenceNumber: () => Promise.resolve(37),
    })

    await expect(
      lookUpReceivedSequenceNumber({ scriptureCatalogue }, qian),
    ).resolves.toBe(37)
  })

  it('passes the Hexagram to the Scripture Catalogue unchanged, once', async () => {
    const receivedSequenceNumber = vi.fn(
      (): Promise<ReceivedSequenceNumber> => Promise.resolve(2),
    )
    const scriptureCatalogue = fakeCatalogue({ receivedSequenceNumber })

    await lookUpReceivedSequenceNumber({ scriptureCatalogue }, kun)

    expect(receivedSequenceNumber).toHaveBeenCalledTimes(1)
    expect(receivedSequenceNumber).toHaveBeenCalledWith(kun)
  })

  it('asks the Scripture Catalogue for nothing else', async () => {
    const scriptureCatalogue = fakeCatalogue({
      receivedSequenceNumber: () => Promise.resolve(1),
    })

    await lookUpReceivedSequenceNumber({ scriptureCatalogue }, qian)

    expect(scriptureCatalogue.passageTexts).not.toHaveBeenCalled()
    expect(scriptureCatalogue.hexagramNames).not.toHaveBeenCalled()
    expect(scriptureCatalogue.trigramNames).not.toHaveBeenCalled()
    expect(scriptureCatalogue.editions).not.toHaveBeenCalled()
  })

  it("rejects with the Scripture Catalogue's own error when the lookup fails", async () => {
    const failure = new Error('an invented Catalogue failure')
    const scriptureCatalogue = fakeCatalogue({
      receivedSequenceNumber: () => Promise.reject(failure),
    })

    await expect(
      lookUpReceivedSequenceNumber({ scriptureCatalogue }, qian),
    ).rejects.toBe(failure)
  })
})

describe("lookUpTrigramNames: a Trigram's name and imagery in each Edition shown", () => {
  const names: readonly TrigramName[] = [
    {
      trigram: heaven,
      edition: chineseEdition,
      name: 'invented Chinese name',
      imagery: 'invented Chinese imagery',
    },
    {
      trigram: heaven,
      edition: translationEdition,
      name: 'invented translated name',
      imagery: 'invented translated imagery',
    },
  ]

  it("returns the Scripture Catalogue's names and imagery unchanged and in order", async () => {
    const scriptureCatalogue = fakeCatalogue({
      trigramNames: () => Promise.resolve(names),
    })

    await expect(
      lookUpTrigramNames({ scriptureCatalogue }, heaven, preference),
    ).resolves.toStrictEqual(names)
  })

  it('passes the Trigram and the Reading Preference to the Scripture Catalogue unchanged, once', async () => {
    const trigramNames = vi.fn(
      (): Promise<readonly TrigramName[]> => Promise.resolve([]),
    )
    const scriptureCatalogue = fakeCatalogue({ trigramNames })

    await lookUpTrigramNames({ scriptureCatalogue }, thunder, preference)

    expect(trigramNames).toHaveBeenCalledTimes(1)
    expect(trigramNames).toHaveBeenCalledWith(thunder, preference)
  })

  it('asks the Scripture Catalogue for nothing else', async () => {
    const scriptureCatalogue = fakeCatalogue({
      trigramNames: () => Promise.resolve(names),
    })

    await lookUpTrigramNames({ scriptureCatalogue }, heaven, preference)

    expect(scriptureCatalogue.passageTexts).not.toHaveBeenCalled()
    expect(scriptureCatalogue.hexagramNames).not.toHaveBeenCalled()
    expect(scriptureCatalogue.receivedSequenceNumber).not.toHaveBeenCalled()
    expect(scriptureCatalogue.editions).not.toHaveBeenCalled()
  })

  it('returns an empty list when the Scripture Catalogue has no name for the Trigram', async () => {
    const scriptureCatalogue = fakeCatalogue({
      trigramNames: () => Promise.resolve([]),
    })

    await expect(
      lookUpTrigramNames({ scriptureCatalogue }, heaven, preference),
    ).resolves.toStrictEqual([])
  })

  it("rejects with the Scripture Catalogue's own error when the lookup fails", async () => {
    const failure = new Error('an invented Catalogue failure')
    const scriptureCatalogue = fakeCatalogue({
      trigramNames: () => Promise.reject(failure),
    })

    await expect(
      lookUpTrigramNames({ scriptureCatalogue }, heaven, preference),
    ).rejects.toBe(failure)
  })
})
