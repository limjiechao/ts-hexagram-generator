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
import { describe, expect, it, vi } from 'vitest'

import { composeCli } from '#src/composition-root.js'

// Every fixture below is invented: no Edition, Witness or text is real.

type Hexagram = HexagramName['hexagram']

function editionId(slug: string): EditionId {
  if (!isEditionId(slug)) throw new Error(`the slug ${slug} is malformed`)
  return slug
}

const qian: Hexagram = ['yang', 'yang', 'yang', 'yang', 'yang', 'yang']
const kun: Hexagram = ['yin', 'yin', 'yin', 'yin', 'yin', 'yin']

const chineseEdition: Edition = {
  id: editionId('invented-chinese'),
  work: 'zhouyi',
  script: 'traditional',
  witness: { description: 'an invented set of pages' },
  unidentified: false,
  licence: 'public-domain',
}
const translationEdition: Edition = {
  id: editionId('invented-translation'),
  work: 'zhouyi',
  language: 'en',
  witness: { description: 'an invented scanned copy' },
  unidentified: false,
  licence: 'in-copyright',
}
const unidentifiedEdition: Edition = {
  id: editionId('invented-unidentified'),
  work: 'zhouyi',
  script: 'simplified',
  witness: { description: 'an invented file of unknown origin' },
  unidentified: true,
  licence: 'public-domain',
}

const preference: ReadingPreference = {
  script: 'traditional',
  translations: [translationEdition.id],
  commentaries: ['daxiang', 'xiaoxiang'],
  yilinVerse: true,
}
const preferenceWithoutVerseOrCommentaries: ReadingPreference = {
  script: 'traditional',
  translations: [translationEdition.id],
  commentaries: [],
  yilinVerse: false,
}

const lineCitation: Citation = { work: 'zhouyi', hexagram: qian, line: 3 }
const yilinCitation: Citation = { work: 'yilin', standing: qian, emerging: kun }
const commentaryCitation: Citation = {
  work: 'xiaoxiang',
  hexagram: kun,
  line: 2,
}

function passageTexts(citation: Citation): readonly PassageText[] {
  return [
    { citation, edition: chineseEdition, text: 'invented Chinese text' },
    { citation, edition: translationEdition, text: 'invented translated text' },
  ]
}

const hexagramNames: readonly HexagramName[] = [
  { hexagram: qian, edition: chineseEdition, name: 'invented Chinese name' },
  {
    hexagram: qian,
    edition: translationEdition,
    name: 'invented translated name',
  },
]

function unstubbed(): Promise<never> {
  return Promise.reject(new Error('not stubbed'))
}

/** A stub Scripture Catalogue; a member a test does not stub rejects. */
function stubCatalogue(
  members: Partial<ScriptureCatalogue>,
): ScriptureCatalogue {
  return {
    passageTexts: members.passageTexts ?? unstubbed,
    hexagramNames: members.hexagramNames ?? unstubbed,
    editions: members.editions ?? unstubbed,
  }
}

/** A stub Random Source; a lookup that draws a random integer throws. */
const randomSource: RandomSource = {
  integerBelow: () => {
    throw new Error('a lookup drew a random integer')
  },
}

describe('composeCli: looking up passage texts', () => {
  it("returns the Scripture Catalogue's passage texts unchanged and in order", async () => {
    const expected = passageTexts(lineCitation)
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({
        passageTexts: () => Promise.resolve(expected),
      }),
    })

    await expect(
      cli.lookUpPassageTexts(lineCitation, preference),
    ).resolves.toStrictEqual(passageTexts(lineCitation))
  })

  it('passes the Citation and the Reading Preference to the Scripture Catalogue unchanged', async () => {
    const port = vi.fn<ScriptureCatalogue['passageTexts']>(() =>
      Promise.resolve([]),
    )
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({ passageTexts: port }),
    })

    await cli.lookUpPassageTexts(lineCitation, preference)

    expect(port).toHaveBeenCalledWith(
      { work: 'zhouyi', hexagram: qian, line: 3 },
      {
        script: 'traditional',
        translations: [translationEdition.id],
        commentaries: ['daxiang', 'xiaoxiang'],
        yilinVerse: true,
      },
    )
  })

  it('returns an empty list when the Scripture Catalogue has no passage text', async () => {
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({
        passageTexts: () => Promise.resolve([]),
      }),
    })

    await expect(
      cli.lookUpPassageTexts(lineCitation, preference),
    ).resolves.toStrictEqual([])
  })

  it('returns the Yilin Verse for a yilin Citation even when the Reading Preference hides the Yilin Verse', async () => {
    const expected = passageTexts(yilinCitation)
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({
        passageTexts: () => Promise.resolve(expected),
      }),
    })

    await expect(
      cli.lookUpPassageTexts(
        yilinCitation,
        preferenceWithoutVerseOrCommentaries,
      ),
    ).resolves.toStrictEqual(passageTexts(yilinCitation))
  })

  it("returns a Commentary's text for its Citation even when the Reading Preference shows no Commentaries", async () => {
    const expected = passageTexts(commentaryCitation)
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({
        passageTexts: () => Promise.resolve(expected),
      }),
    })

    await expect(
      cli.lookUpPassageTexts(
        commentaryCitation,
        preferenceWithoutVerseOrCommentaries,
      ),
    ).resolves.toStrictEqual(passageTexts(commentaryCitation))
  })

  it("rejects with the Scripture Catalogue's own error when the lookup fails", async () => {
    const failure = new Error('invented catalogue failure')
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({
        passageTexts: () => Promise.reject(failure),
      }),
    })

    await expect(cli.lookUpPassageTexts(lineCitation, preference)).rejects.toBe(
      failure,
    )
  })
})

describe('composeCli: looking up Hexagram names', () => {
  it("returns the Scripture Catalogue's Hexagram names unchanged and in order", async () => {
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({
        hexagramNames: () => Promise.resolve(hexagramNames),
      }),
    })

    await expect(
      cli.lookUpHexagramNames(qian, preference),
    ).resolves.toStrictEqual([
      {
        hexagram: qian,
        edition: chineseEdition,
        name: 'invented Chinese name',
      },
      {
        hexagram: qian,
        edition: translationEdition,
        name: 'invented translated name',
      },
    ])
  })

  it('passes the Hexagram and the Reading Preference to the Scripture Catalogue unchanged', async () => {
    const port = vi.fn<ScriptureCatalogue['hexagramNames']>(() =>
      Promise.resolve([]),
    )
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({ hexagramNames: port }),
    })

    await cli.lookUpHexagramNames(kun, preference)

    expect(port).toHaveBeenCalledWith(
      ['yin', 'yin', 'yin', 'yin', 'yin', 'yin'],
      {
        script: 'traditional',
        translations: [translationEdition.id],
        commentaries: ['daxiang', 'xiaoxiang'],
        yilinVerse: true,
      },
    )
  })

  it('returns an empty list when the Scripture Catalogue has no Hexagram name', async () => {
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({
        hexagramNames: () => Promise.resolve([]),
      }),
    })

    await expect(
      cli.lookUpHexagramNames(qian, preference),
    ).resolves.toStrictEqual([])
  })

  it("rejects with the Scripture Catalogue's own error when the lookup fails", async () => {
    const failure = new Error('invented catalogue failure')
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({
        hexagramNames: () => Promise.reject(failure),
      }),
    })

    await expect(cli.lookUpHexagramNames(qian, preference)).rejects.toBe(
      failure,
    )
  })
})

describe('composeCli: looking up Editions', () => {
  it('returns every Edition the Scripture Catalogue lists, in order, in-copyright and unidentified ones included', async () => {
    const editions: readonly Edition[] = [
      chineseEdition,
      translationEdition,
      unidentifiedEdition,
    ]
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({
        editions: () => Promise.resolve(editions),
      }),
    })

    await expect(cli.lookUpEditions('zhouyi')).resolves.toStrictEqual([
      chineseEdition,
      translationEdition,
      unidentifiedEdition,
    ])
  })

  it('passes the Work to the Scripture Catalogue unchanged', async () => {
    const port = vi.fn<ScriptureCatalogue['editions']>(() =>
      Promise.resolve([]),
    )
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({ editions: port }),
    })

    await cli.lookUpEditions('wenyan')

    expect(port).toHaveBeenCalledWith('wenyan')
  })

  it('returns an empty list when the Scripture Catalogue has no Edition of the Work', async () => {
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({
        editions: () => Promise.resolve([]),
      }),
    })

    await expect(cli.lookUpEditions('tuan')).resolves.toStrictEqual([])
  })

  it("rejects with the Scripture Catalogue's own error when the lookup fails", async () => {
    const failure = new Error('invented catalogue failure')
    const cli = composeCli({
      randomSource,
      scriptureCatalogue: stubCatalogue({
        editions: () => Promise.reject(failure),
      }),
    })

    await expect(cli.lookUpEditions('zhouyi')).rejects.toBe(failure)
  })
})
