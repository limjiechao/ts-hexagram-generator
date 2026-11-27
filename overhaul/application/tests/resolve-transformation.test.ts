import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { LinePosition } from '@hexagram/oracle/line-position'
import { resolve } from '@hexagram/oracle/resolution'
import type { Transformation } from '@hexagram/oracle/transformation'
import type { Citation } from '@hexagram/scripture-catalogue/citation'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import {
  isEditionId,
  type EditionId,
} from '@hexagram/scripture-catalogue/edition-id'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import type { Work } from '@hexagram/scripture-catalogue/work'
import { describe, expect, it } from 'vitest'

import { resolveTransformation } from '#src/resolve-transformation.js'
import type { ScriptureCatalogue } from '#src/scripture-catalogue.js'

// Every Edition, Witness and text below is invented; none is real scripture.

function editionId(slug: string): EditionId {
  if (!isEditionId(slug)) throw new Error(`the slug ${slug} is malformed`)
  return slug
}

/** An invented Chinese Edition and an invented Translation of each Work. */
function editionsOf(work: Work): readonly [Edition, Edition] {
  return [
    {
      id: editionId(`invented-${work}-chinese`),
      work,
      shortName: `Invented ${work}`,
      title: `An invented copy of the ${work} Work (nowhere, 2026)`,
      script: 'traditional',
      witness: { description: `an invented copy of the ${work} Work` },
      unidentified: false,
      licence: 'public-domain',
    },
    {
      id: editionId(`invented-${work}-translation`),
      work,
      shortName: `Invented ${work} translation`,
      title: `An invented translation of the ${work} Work (nowhere, 2026)`,
      language: 'en',
      witness: { description: `an invented translation of the ${work} Work` },
      unidentified: false,
      licence: 'in-copyright',
    },
  ]
}

/** The invented text the stub Catalogue gives for a Citation, in each Edition. */
function textsFor(citation: Citation): readonly PassageText[] {
  return editionsOf(citation.work).map((edition) => ({
    citation,
    edition,
    text: `invented text for ${JSON.stringify(citation)} in ${edition.id}`,
  }))
}

/**
 * A Scripture Catalogue that records each `passageTexts` call and answers it
 * a macrotask later, counting how many calls are in flight at once. The call
 * numbered `rejectOn` (from 1) rejects with `failure`; a Citation in `missing`
 * gets an empty list. Names and Editions are never needed, so asking for them
 * fails the test.
 */
function recordingCatalogue(
  options: {
    readonly rejectOn?: number
    readonly failure?: Error
    readonly missing?: readonly Citation[]
  } = {},
) {
  const calls: { citation: Citation; preference: ReadingPreference }[] = []
  const unexpected: string[] = []
  let inFlight = 0
  let mostInFlight = 0
  const catalogue: ScriptureCatalogue = {
    passageTexts: async (citation, preference) => {
      calls.push({ citation, preference })
      const callNumber = calls.length
      inFlight += 1
      mostInFlight = Math.max(mostInFlight, inFlight)
      await new Promise((settle) => setTimeout(settle, 0))
      inFlight -= 1
      if (callNumber === options.rejectOn) {
        throw options.failure ?? new Error('an invented Catalogue failure')
      }
      const isMissing = (options.missing ?? []).some(
        (each) => JSON.stringify(each) === JSON.stringify(citation),
      )
      return isMissing ? [] : textsFor(citation)
    },
    hexagramNames: () => {
      unexpected.push('hexagramNames')
      return Promise.reject(new Error('use case 3 asked for Hexagram names'))
    },
    receivedSequenceNumber: () => {
      unexpected.push('receivedSequenceNumber')
      return Promise.reject(
        new Error('use case 3 asked for a Received Sequence Number'),
      )
    },
    trigramNames: () => {
      unexpected.push('trigramNames')
      return Promise.reject(new Error('use case 3 asked for Trigram names'))
    },
    editions: () => {
      unexpected.push('editions')
      return Promise.reject(new Error('use case 3 asked for Editions'))
    },
  }
  return {
    catalogue,
    citations: () => calls.map((call) => call.citation),
    preferences: () => calls.map((call) => call.preference),
    mostInFlight: () => mostInFlight,
    unexpected: () => unexpected,
  }
}

/** Lets any call still scheduled by a misbehaving use case happen. */
async function settleEverything(): Promise<void> {
  for (let round = 0; round < 50; round += 1) {
    await new Promise((settle) => setTimeout(settle, 0))
  }
}

function preferenceWith(
  commentaries: ReadingPreference['commentaries'],
  yilinVerse: boolean,
): ReadingPreference {
  return {
    script: 'traditional',
    translations: [editionId('invented-translation')],
    commentaries,
    yilinVerse,
  }
}

// 復 (yang at the bottom only) with its fourth Line moving becomes 震.
const fu: Hexagram = ['yang', 'yin', 'yin', 'yin', 'yin', 'yin']
const zhen: Hexagram = ['yang', 'yin', 'yin', 'yang', 'yin', 'yin']
const fuFourthMoving: Transformation = [7, 8, 8, 6, 8, 8]

// 既濟 with no Moving Line: the identity 既濟之既濟.
const jiji: Hexagram = ['yang', 'yin', 'yang', 'yin', 'yang', 'yin']
const jijiUnmoved: Transformation = [7, 8, 7, 8, 7, 8]

// 坤 with all six Lines moving becomes 乾.
const kun: Hexagram = ['yin', 'yin', 'yin', 'yin', 'yin', 'yin']
const qian: Hexagram = ['yang', 'yang', 'yang', 'yang', 'yang', 'yang']
const kunAllMoving: Transformation = [6, 6, 6, 6, 6, 6]

// The Citations, in order, for 復之震 with the 彖傳, 大象 and 小象 and the
// Yilin Verse asked for.
const fuToZhenCitations: readonly Citation[] = [
  { work: 'zhouyi', hexagram: fu },
  { work: 'tuan', hexagram: fu },
  { work: 'daxiang', hexagram: fu },
  { work: 'zhouyi', hexagram: fu, line: 4 },
  { work: 'xiaoxiang', hexagram: fu, line: 4 },
  { work: 'zhouyi', hexagram: zhen },
  { work: 'tuan', hexagram: zhen },
  { work: 'daxiang', hexagram: zhen },
  { work: 'yilin', standing: fu, emerging: zhen },
]
const fuToZhenPreference = preferenceWith(
  ['tuan', 'daxiang', 'xiaoxiang'],
  true,
)

describe('resolveTransformation: a single Moving Line', () => {
  it('returns the Resolution of the Transformation', async () => {
    const stub = recordingCatalogue()

    const result = await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      fuFourthMoving,
      fuToZhenPreference,
    )

    expect(result.resolution).toStrictEqual(resolve(fuFourthMoving))
  })

  it('gives each Applicable Passage followed by its Commentaries, then the Yilin Verse, each in every Edition', async () => {
    const stub = recordingCatalogue()

    const result = await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      fuFourthMoving,
      fuToZhenPreference,
    )

    expect(result.passageTexts).toStrictEqual(
      fuToZhenCitations.flatMap(textsFor),
    )
  })

  it('asks the Catalogue for each Citation once, in that order, with the Reading Preference unchanged', async () => {
    const stub = recordingCatalogue()

    await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      fuFourthMoving,
      fuToZhenPreference,
    )

    expect(stub.citations()).toStrictEqual(fuToZhenCitations)
    expect(stub.preferences()).toStrictEqual(
      fuToZhenCitations.map(() =>
        preferenceWith(['tuan', 'daxiang', 'xiaoxiang'], true),
      ),
    )
  })

  it('waits for each Catalogue call before making the next', async () => {
    const stub = recordingCatalogue()

    await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      fuFourthMoving,
      fuToZhenPreference,
    )

    expect(stub.mostInFlight()).toBe(1)
  })

  it('never asks the Catalogue for Hexagram names or Editions', async () => {
    const stub = recordingCatalogue()

    await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      fuFourthMoving,
      fuToZhenPreference,
    )

    expect(stub.unexpected()).toStrictEqual([])
  })

  it('leaves out a passage the Catalogue has no text for, and keeps the rest in order', async () => {
    const missing: readonly Citation[] = [
      { work: 'tuan', hexagram: fu },
      { work: 'zhouyi', hexagram: zhen },
    ]
    const stub = recordingCatalogue({ missing })

    const result = await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      fuFourthMoving,
      fuToZhenPreference,
    )

    expect(stub.citations()).toStrictEqual(fuToZhenCitations)
    expect(result.passageTexts).toStrictEqual(
      fuToZhenCitations
        .filter(
          (citation) =>
            !missing.some(
              (each) => JSON.stringify(each) === JSON.stringify(citation),
            ),
        )
        .flatMap(textsFor),
    )
  })
})

describe('resolveTransformation: X之X', () => {
  it('gives the one Hexagram Statement with one set of its Commentaries, then the Yilin Verse for X之X', async () => {
    const stub = recordingCatalogue()
    const citations: readonly Citation[] = [
      { work: 'zhouyi', hexagram: jiji },
      { work: 'tuan', hexagram: jiji },
      { work: 'daxiang', hexagram: jiji },
      { work: 'yilin', standing: jiji, emerging: jiji },
    ]

    const result = await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      jijiUnmoved,
      preferenceWith(['tuan', 'daxiang', 'xiaoxiang'], true),
    )

    expect(result.resolution).toStrictEqual(resolve(jijiUnmoved))
    expect(stub.citations()).toStrictEqual(citations)
    expect(result.passageTexts).toStrictEqual(citations.flatMap(textsFor))
  })
})

describe('resolveTransformation: the All-Moving Statement', () => {
  it('gives every Line Statement and the All-Moving Statement each with its 小象, and both Hexagram Statements with their Commentaries', async () => {
    const stub = recordingCatalogue()
    const lines: readonly LinePosition[] = [1, 2, 3, 4, 5, 6]
    const citations: readonly Citation[] = [
      { work: 'zhouyi', hexagram: kun },
      { work: 'wenyan', hexagram: kun },
      { work: 'daxiang', hexagram: kun },
      ...lines.flatMap((line): Citation[] => [
        { work: 'zhouyi', hexagram: kun, line },
        { work: 'xiaoxiang', hexagram: kun, line },
      ]),
      { work: 'zhouyi', hexagram: kun, line: 'all-moving' },
      { work: 'xiaoxiang', hexagram: kun, line: 'all-moving' },
      { work: 'zhouyi', hexagram: qian },
      { work: 'wenyan', hexagram: qian },
      { work: 'daxiang', hexagram: qian },
    ]

    const result = await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      kunAllMoving,
      preferenceWith(['xiaoxiang', 'wenyan', 'daxiang'], false),
    )

    expect(result.resolution).toStrictEqual(resolve(kunAllMoving))
    expect(stub.citations()).toStrictEqual(citations)
    expect(result.passageTexts).toStrictEqual(citations.flatMap(textsFor))
  })
})

describe('resolveTransformation: Commentaries in the Reading Preference order', () => {
  it("gives each passage's Commentaries in the order the Reading Preference lists them", async () => {
    const stub = recordingCatalogue()
    const citations: readonly Citation[] = [
      { work: 'zhouyi', hexagram: fu },
      { work: 'daxiang', hexagram: fu },
      { work: 'tuan', hexagram: fu },
      { work: 'zhouyi', hexagram: fu, line: 4 },
      { work: 'xiaoxiang', hexagram: fu, line: 4 },
      { work: 'zhouyi', hexagram: zhen },
      { work: 'daxiang', hexagram: zhen },
      { work: 'tuan', hexagram: zhen },
    ]

    const result = await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      fuFourthMoving,
      preferenceWith(['xiaoxiang', 'daxiang', 'tuan'], false),
    )

    expect(stub.citations()).toStrictEqual(citations)
    expect(result.passageTexts).toStrictEqual(citations.flatMap(textsFor))
  })

  it('gives the Applicable Passages alone when the Reading Preference asks for no Commentaries', async () => {
    const stub = recordingCatalogue()
    const citations: readonly Citation[] = [
      { work: 'zhouyi', hexagram: fu },
      { work: 'zhouyi', hexagram: fu, line: 4 },
      { work: 'zhouyi', hexagram: zhen },
    ]

    const result = await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      fuFourthMoving,
      preferenceWith([], false),
    )

    expect(stub.citations()).toStrictEqual(citations)
    expect(result.passageTexts).toStrictEqual(citations.flatMap(textsFor))
  })

  it('asks for the 文言 of a Hexagram other than 乾 and 坤 in its place, and leaves it out when the Catalogue has no text for it', async () => {
    const missing: readonly Citation[] = [
      { work: 'wenyan', hexagram: fu },
      { work: 'wenyan', hexagram: zhen },
    ]
    const stub = recordingCatalogue({ missing })
    const citations: readonly Citation[] = [
      { work: 'zhouyi', hexagram: fu },
      { work: 'tuan', hexagram: fu },
      { work: 'wenyan', hexagram: fu },
      { work: 'daxiang', hexagram: fu },
      { work: 'zhouyi', hexagram: fu, line: 4 },
      { work: 'zhouyi', hexagram: zhen },
      { work: 'tuan', hexagram: zhen },
      { work: 'wenyan', hexagram: zhen },
      { work: 'daxiang', hexagram: zhen },
    ]

    const result = await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      fuFourthMoving,
      preferenceWith(['tuan', 'wenyan', 'daxiang'], false),
    )

    expect(stub.citations()).toStrictEqual(citations)
    expect(result.passageTexts).toStrictEqual(
      citations
        .filter((citation) => citation.work !== 'wenyan')
        .flatMap(textsFor),
    )
  })
})

describe('resolveTransformation: the Yilin Verse', () => {
  it('ends with the Yilin Verse for the Standing and Emerging Hexagrams when the Reading Preference asks for it', async () => {
    const stub = recordingCatalogue()
    const citations: readonly Citation[] = [
      { work: 'zhouyi', hexagram: fu },
      { work: 'zhouyi', hexagram: fu, line: 4 },
      { work: 'zhouyi', hexagram: zhen },
      { work: 'yilin', standing: fu, emerging: zhen },
    ]

    const result = await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      fuFourthMoving,
      preferenceWith([], true),
    )

    expect(stub.citations()).toStrictEqual(citations)
    expect(result.passageTexts).toStrictEqual(citations.flatMap(textsFor))
  })

  it('neither asks for nor gives the Yilin Verse when the Reading Preference hides it', async () => {
    const stub = recordingCatalogue()
    const citations: readonly Citation[] = [
      { work: 'zhouyi', hexagram: fu },
      { work: 'tuan', hexagram: fu },
      { work: 'daxiang', hexagram: fu },
      { work: 'zhouyi', hexagram: fu, line: 4 },
      { work: 'xiaoxiang', hexagram: fu, line: 4 },
      { work: 'zhouyi', hexagram: zhen },
      { work: 'tuan', hexagram: zhen },
      { work: 'daxiang', hexagram: zhen },
    ]

    const result = await resolveTransformation(
      { scriptureCatalogue: stub.catalogue },
      fuFourthMoving,
      preferenceWith(['tuan', 'daxiang', 'xiaoxiang'], false),
    )

    expect(stub.citations()).toStrictEqual(citations)
    expect(result.passageTexts).toStrictEqual(citations.flatMap(textsFor))
  })
})

describe('resolveTransformation: a Catalogue failure', () => {
  it.each([1, 4, 9])(
    'rejects with the failure of call %i unchanged and makes no later call',
    async (rejectOn) => {
      const failure = new Error('an invented Catalogue failure')
      const stub = recordingCatalogue({ rejectOn, failure })

      const outcome = resolveTransformation(
        { scriptureCatalogue: stub.catalogue },
        fuFourthMoving,
        fuToZhenPreference,
      )

      await expect(outcome).rejects.toBe(failure)
      await settleEverything()
      expect(stub.citations()).toStrictEqual(
        fuToZhenCitations.slice(0, rejectOn),
      )
    },
  )
})
