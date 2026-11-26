import type { Clock } from '@hexagram/application/clock'
import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import type { Citation } from '@hexagram/scripture-catalogue/citation'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import {
  isEditionId,
  type EditionId,
} from '@hexagram/scripture-catalogue/edition-id'
import type { HexagramName } from '@hexagram/scripture-catalogue/hexagram-name'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import { describe, expect, it } from 'vitest'

import { composeCli } from '#src/composition-root.js'

// Every Edition, Witness and text below is invented; none is real scripture.

type Hexagram = HexagramName['hexagram']

function editionId(slug: string): EditionId {
  if (!isEditionId(slug)) throw new Error(`the slug ${slug} is malformed`)
  return slug
}

function inventedEdition(work: Citation['work']): Edition {
  return {
    id: editionId(`invented-${work}`),
    work,
    script: 'traditional',
    witness: { description: `an invented copy of the ${work} Work` },
    unidentified: false,
    licence: 'public-domain',
  }
}

function textsFor(citation: Citation): readonly PassageText[] {
  return [
    {
      citation,
      edition: inventedEdition(citation.work),
      text: `invented text for ${JSON.stringify(citation)}`,
    },
  ]
}

/**
 * A stub Scripture Catalogue recording each `passageTexts` call; the call
 * numbered `rejectOn` (from 1) rejects with `failure`.
 */
function recordingCatalogue(
  options: { readonly rejectOn?: number; readonly failure?: Error } = {},
) {
  const citations: Citation[] = []
  const catalogue: ScriptureCatalogue = {
    passageTexts: async (citation) => {
      citations.push(citation)
      const callNumber = citations.length
      await new Promise((settle) => setTimeout(settle, 0))
      if (callNumber === options.rejectOn) {
        throw options.failure ?? new Error('an invented Catalogue failure')
      }
      return textsFor(citation)
    },
    hexagramNames: () =>
      Promise.reject(new Error('the reading asked for Hexagram names')),
    editions: () => Promise.reject(new Error('the reading asked for Editions')),
  }
  return { catalogue, citations: () => [...citations] }
}

/** Resolving keeps nothing and draws nothing, so these ports fail if touched. */
const untouched = (): never => {
  throw new Error('resolving touched a port other than the Catalogue')
}
const randomSource: RandomSource = { integerBelow: untouched }
const consultationStore: ConsultationStore = {
  keep: untouched,
  list: untouched,
  get: untouched,
  remove: untouched,
  deletionRecords: untouched,
}
const clock: Clock = { now: untouched }

// 屯 (yang at Line Positions 1 and 5) with its fifth Line moving becomes 復.
const zhun: Hexagram = ['yang', 'yin', 'yin', 'yin', 'yang', 'yin']
const fu: Hexagram = ['yang', 'yin', 'yin', 'yin', 'yin', 'yin']

const preference: ReadingPreference = {
  script: 'traditional',
  translations: [editionId('invented-translation')],
  commentaries: ['xiaoxiang', 'daxiang'],
  yilinVerse: true,
}

const citations: readonly Citation[] = [
  { work: 'zhouyi', hexagram: zhun },
  { work: 'daxiang', hexagram: zhun },
  { work: 'zhouyi', hexagram: zhun, line: 5 },
  { work: 'xiaoxiang', hexagram: zhun, line: 5 },
  { work: 'zhouyi', hexagram: fu },
  { work: 'daxiang', hexagram: fu },
  { work: 'yilin', standing: zhun, emerging: fu },
]

describe('composeCli: resolving a Transformation', () => {
  it('resolves the Transformation with the Scripture Catalogue it was given', async () => {
    const stub = recordingCatalogue()
    const cli = composeCli({
      randomSource,
      consultationStore,
      clock,
      scriptureCatalogue: stub.catalogue,
    })

    const result = await cli.resolveTransformation(
      [7, 8, 8, 8, 9, 8],
      preference,
    )

    expect(result.resolution.standing.hexagram).toStrictEqual(zhun)
    expect(result.resolution.emerging.hexagram).toStrictEqual(fu)
    expect(result.resolution.movingLines).toStrictEqual([5])
    expect(result.resolution.applicablePassages).toStrictEqual([
      { hexagram: zhun },
      { hexagram: zhun, line: 5 },
      { hexagram: fu },
    ])
    expect(stub.citations()).toStrictEqual(citations)
    expect(result.passageTexts).toStrictEqual(citations.flatMap(textsFor))
  })

  it("passes on the Scripture Catalogue's failure unchanged and asks for nothing more", async () => {
    const failure = new Error('an invented Catalogue failure')
    const stub = recordingCatalogue({ rejectOn: 3, failure })
    const cli = composeCli({
      randomSource,
      consultationStore,
      clock,
      scriptureCatalogue: stub.catalogue,
    })

    await expect(
      cli.resolveTransformation([7, 8, 8, 8, 9, 8], preference),
    ).rejects.toBe(failure)
    for (let round = 0; round < 50; round += 1) {
      await new Promise((settle) => setTimeout(settle, 0))
    }
    expect(stub.citations()).toStrictEqual(citations.slice(0, 3))
  })
})
