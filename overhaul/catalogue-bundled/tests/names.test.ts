import type { Edition } from '@hexagram/scripture-catalogue/edition'
import { describe, expect, it } from 'vitest'

import { bundledScriptureCatalogue } from '#src/bundled-scripture-catalogue.js'

import {
  bundledEditionIds,
  legacyHexagrams,
  legacyTrigrams,
  preferenceShowing,
  type BundledEditionId,
} from './support/library.js'

// Every expected name, imagery and sequence number is read at run time from
// the pre-overhaul models (see ./support/library.ts); none is typed here.

async function zhouyiRecord(id: BundledEditionId): Promise<Edition> {
  const editions = await bundledScriptureCatalogue.editions('zhouyi')
  const found = editions.find((edition) => edition.id === id)
  if (found === undefined) throw new Error(`no zhouyi record for ${id}`)
  return found
}

describe('the legacy data, as these tests read it', () => {
  it('holds 64 distinct Hexagrams and eight distinct Trigrams', () => {
    expect(
      new Set(legacyHexagrams.map(({ hexagram }) => hexagram.join(','))).size,
    ).toBe(64)
    expect(
      new Set(legacyTrigrams.map(({ trigram }) => trigram.join(','))).size,
    ).toBe(8)
  })
})

describe.each(bundledEditionIds)('the bundled %s', (id) => {
  it('names each of the 64 Hexagrams as the legacy data does, labelled with its zhouyi Edition record', async () => {
    const record = await zhouyiRecord(id)
    let named = 0
    for (const { hexagram, name } of legacyHexagrams) {
      const names = await bundledScriptureCatalogue.hexagramNames(
        hexagram,
        preferenceShowing(id),
      )
      const own = names.filter(({ edition }) => edition.id === id)
      expect(own, hexagram.join(',')).toHaveLength(1)
      expect(own[0]).toStrictEqual({
        hexagram,
        edition: record,
        name: name(id),
      })
      named++
    }
    expect(named).toBe(64)
  })

  it('names each of the eight Trigrams, with its imagery, as the legacy data does, labelled with its zhouyi Edition record', async () => {
    const record = await zhouyiRecord(id)
    let named = 0
    for (const { trigram, name, imagery } of legacyTrigrams) {
      const names = await bundledScriptureCatalogue.trigramNames(
        trigram,
        preferenceShowing(id),
      )
      const own = names.filter(({ edition }) => edition.id === id)
      expect(own, trigram.join(',')).toHaveLength(1)
      expect(own[0]).toStrictEqual({
        trigram,
        edition: record,
        name: name(id),
        imagery: imagery(id),
      })
      named++
    }
    expect(named).toBe(8)
  })
})

describe('the Received Sequence Number', () => {
  it('is the legacy data’s received order for every Hexagram', async () => {
    for (const { hexagram, wenWang } of legacyHexagrams)
      expect(
        await bundledScriptureCatalogue.receivedSequenceNumber(hexagram),
        hexagram.join(','),
      ).toBe(wenWang)
  })

  it('takes 64 distinct values, 1 to 64', async () => {
    const numbers = await Promise.all(
      legacyHexagrams.map(({ hexagram }) =>
        bundledScriptureCatalogue.receivedSequenceNumber(hexagram),
      ),
    )
    expect(new Set(numbers).size).toBe(64)
    expect(numbers.toSorted((left, right) => left - right)).toEqual(
      Array.from({ length: 64 }, (_, index) => index + 1),
    )
  })
})
