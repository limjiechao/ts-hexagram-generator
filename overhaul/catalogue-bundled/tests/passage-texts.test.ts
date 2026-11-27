import type { Citation } from '@hexagram/scripture-catalogue/citation'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'
import type { Work } from '@hexagram/scripture-catalogue/work'
import { describe, expect, it } from 'vitest'

import { bundledScriptureCatalogue } from '#src/bundled-scripture-catalogue.js'

import {
  bundledEditionIds,
  citationKey,
  kun,
  legacyHexagrams,
  legacyPassages,
  ownerAllMoving,
  ownerPassagesFor,
  preferenceShowing,
  printedWorks,
  qian,
  type BundledEditionId,
  type ExpectedPassage,
} from './support/library.js'

// Every expected text is read at run time from the pre-overhaul models or the
// owner's file of All-Moving Statements (see ./support/library.ts); none is
// typed here.

/** The Edition's own text for the Citation, if the Catalogue gives one. */
async function textIn(
  id: BundledEditionId,
  citation: Citation,
): Promise<PassageText | undefined> {
  const texts = await bundledScriptureCatalogue.passageTexts(
    citation,
    preferenceShowing(id),
  )
  const own = texts.filter(({ edition }) => edition.id === id)
  expect(own.length, `${id} gives one text at most`).toBeLessThanOrEqual(1)
  return own[0]
}

/** Every passage the Edition must hold: the legacy data's, then the owner's. */
function expectedPassages(id: BundledEditionId): ExpectedPassage[] {
  return [...legacyPassages(id), ...ownerPassagesFor(id)]
}

async function givenTexts(
  id: BundledEditionId,
  citations: readonly Citation[],
): Promise<Map<string, PassageText>> {
  const given = new Map<string, PassageText>()
  for (const citation of citations) {
    const text = await textIn(id, citation)
    if (text !== undefined) given.set(citationKey(citation), text)
  }
  return given
}

function countByWork(citations: readonly Citation[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const { work } of citations) counts[work] = (counts[work] ?? 0) + 1
  return counts
}

describe('the owner file and the legacy data, as these tests read them', () => {
  it('names Qian then Kun in each Edition’s subsections, and the same two terms in each', () => {
    const terms = ownerAllMoving('wuyingdian-1739').map(({ term }) => term)
    const names = [qian, kun].map((hexagram) =>
      legacyHexagrams
        .find((each) => each.hexagram.join(',') === hexagram.join(','))
        ?.name('wuyingdian-1739'),
    )
    for (const id of bundledEditionIds) {
      const subsections = ownerAllMoving(id)
      expect(subsections.map(({ hexagramName }) => hexagramName)).toEqual(names)
      expect(subsections.map(({ term }) => term)).toEqual(terms)
    }
  })

  it('reads 64 Hexagrams and seven zhouyi, one tuan, one daxiang and six xiaoxiang passages for each', () => {
    for (const id of bundledEditionIds)
      expect(
        countByWork(legacyPassages(id).map(({ citation }) => citation)),
      ).toEqual({
        zhouyi: 64 * 7,
        tuan: 64,
        daxiang: 64,
        xiaoxiang: 64 * 6,
      })
  })
})

describe.each(bundledEditionIds)('the bundled %s', (id) => {
  it('counts a text for every Citation the legacy data holds, and for the All-Moving Statements of Qian and Kun with their xiaoxiang', async () => {
    const expected = expectedPassages(id)
    const given = await givenTexts(
      id,
      expected.map(({ citation }) => citation),
    )
    const givenCitations = [...given.values()].map(({ citation }) => citation)
    expect(countByWork(givenCitations)).toEqual(
      countByWork(expected.map(({ citation }) => citation)),
    )
    expect(countByWork(givenCitations)).toEqual({
      zhouyi: 64 * 7 + 2,
      tuan: 64,
      daxiang: 64,
      xiaoxiang: 64 * 6 + 2,
    })
  })

  it('gives each text exactly as the legacy data gives it for this Edition', async () => {
    const expected = legacyPassages(id)
    const given = await givenTexts(
      id,
      expected.map(({ citation }) => citation),
    )
    const mismatches = expected
      .filter(
        ({ citation, text }) => given.get(citationKey(citation))?.text !== text,
      )
      .map(({ citation }) => citationKey(citation))
    expect(mismatches).toEqual([])
  })

  it('gives the All-Moving Statements of Qian and Kun and their xiaoxiang exactly as the owner’s file does', async () => {
    for (const { citation, text } of ownerPassagesFor(id)) {
      const given = await textIn(id, citation)
      expect(given?.text, citationKey(citation)).toBe(text)
    }
  })

  it('labels each text with its own Edition record for the Citation’s Work', async () => {
    const records = new Map<Work, Edition | undefined>(
      await Promise.all(
        printedWorks.map(async (work) => {
          const editions = await bundledScriptureCatalogue.editions(work)
          return [work, editions.find((edition) => edition.id === id)] as const
        }),
      ),
    )
    const expected = expectedPassages(id)
    const given = await givenTexts(
      id,
      expected.map(({ citation }) => citation),
    )
    expect(given.size).toBe(expected.length)
    for (const { citation, edition } of given.values()) {
      expect(edition.work).toBe(citation.work)
      expect(edition).toEqual(records.get(citation.work))
    }
  })

  it('gives no text the legacy data and the owner lack: no other All-Moving Statement, no wenyan, no yilin', async () => {
    const others = legacyHexagrams
      .map(({ hexagram }) => hexagram)
      .filter(
        (hexagram) =>
          hexagram.join(',') !== qian.join(',') &&
          hexagram.join(',') !== kun.join(','),
      )
    const lacking: Citation[] = [
      ...others.flatMap((hexagram): Citation[] => [
        { work: 'zhouyi', hexagram, line: 'all-moving' },
        { work: 'xiaoxiang', hexagram, line: 'all-moving' },
      ]),
      ...legacyHexagrams.map(
        ({ hexagram }): Citation => ({ work: 'wenyan', hexagram }),
      ),
      ...legacyHexagrams.flatMap(({ hexagram: standing }) =>
        legacyHexagrams.map(
          ({ hexagram: emerging }): Citation => ({
            work: 'yilin',
            standing,
            emerging,
          }),
        ),
      ),
    ]
    expect(lacking).toHaveLength(62 * 2 + 64 + 64 * 64)
    const given = await givenTexts(id, lacking)
    expect([...given.keys()]).toEqual([])
  })
})

describe('the bundled Simplified Edition', () => {
  it('gives the legacy Simplified data’s texts, never a conversion of the Traditional', async () => {
    const traditional = new Map(
      legacyPassages('wuyingdian-1739').map(({ citation, text }) => [
        citationKey(citation),
        text,
      ]),
    )
    const simplified = expectedPassages('wuyingdian-1739-simplified')
    const differing = simplified.filter(
      ({ citation, text }) => traditional.get(citationKey(citation)) !== text,
    )
    expect(differing.length).toBeGreaterThan(0)
    const given = await givenTexts(
      'wuyingdian-1739-simplified',
      differing.map(({ citation }) => citation),
    )
    for (const { citation, text } of differing)
      expect(
        given.get(citationKey(citation))?.text,
        citationKey(citation),
      ).toBe(text)
  })
})
