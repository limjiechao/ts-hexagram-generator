import type { CastConsultation } from '@hexagram/consultation-journal/cast-consultation'
import {
  isConsultationId,
  type ConsultationId,
} from '@hexagram/consultation-journal/consultation-id'
import {
  isDay,
  isUtcOffset,
  type Day,
  type Moment,
} from '@hexagram/consultation-journal/divined-at'
import { isQuery, type Query } from '@hexagram/consultation-journal/query'
import type { RecordedConsultation } from '@hexagram/consultation-journal/recorded-consultation'
import type { CompleteCasting, PartialCasting } from '@hexagram/oracle/casting'
import { divide, emptyCasting } from '@hexagram/oracle/division'
import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { PassageReference } from '@hexagram/oracle/passage-reference'
import type { Pick } from '@hexagram/oracle/pick'
import { resolve, type Resolution } from '@hexagram/oracle/resolution'
import type { Transformation } from '@hexagram/oracle/transformation'
import type { Trigram } from '@hexagram/oracle/trigram'
import type { Citation } from '@hexagram/scripture-catalogue/citation'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import { isEditionId } from '@hexagram/scripture-catalogue/edition-id'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import type { ReceivedSequenceNumber } from '@hexagram/scripture-catalogue/received-sequence-number'
import type { TrigramName } from '@hexagram/scripture-catalogue/trigram-name'
import type { Work } from '@hexagram/scripture-catalogue/work'
import { describe, expect, it } from 'vitest'

import {
  consultationReadout,
  divinedAtText,
  hexagramsNamed,
  transformationReadout,
  trigramsNamed,
  type ReadoutNames,
  type ResolvedTransformation,
} from '#src/build-readout.js'
import type {
  HexagramTab,
  LedgerRound,
  NamedHexagram,
  PassageShown,
  TransformationReadout,
} from '#src/readout.js'

// The Readout only arranges what it is given, so every input is built here
// by hand: the Resolution through the Oracle, and the passage texts and
// names in use case 3's and use case 8's documented order. Every text and
// name is an invented tag naming its Edition and Citation, never scripture;
// the real Catalogue's texts are checked through cli-adapter, which may
// reach it.

// --- Editions -----------------------------------------------------------------

/** One EditionId as the inputs use it: a Chinese script or a Translation. */
type Source =
  | { readonly id: string; readonly script: 'traditional' | 'simplified' }
  | { readonly id: string; readonly language: string }

const traditional: Source = { id: 'test-traditional', script: 'traditional' }
const simplified: Source = { id: 'test-simplified', script: 'simplified' }
const translationA: Source = { id: 'test-translation-a', language: 'en' }
const translationB: Source = { id: 'test-translation-b', language: 'en' }
const yilinSource: Source = { id: 'test-yilin', script: 'traditional' }

/** The Edition record of an EditionId for one Work, as the Catalogue labels it. */
function editionOf(source: Source, work: Work): Edition {
  if (!isEditionId(source.id)) throw new Error(`${source.id} is no EditionId`)
  const common = {
    id: source.id,
    work,
    shortName: `short ${source.id}`,
    title: `title ${source.id}`,
    witness: { description: `witness ${source.id}` },
    unidentified: false,
    licence: 'public-domain',
  } as const
  return 'script' in source
    ? { ...common, script: source.script }
    : { ...common, language: source.language }
}

// --- Figures as keys ----------------------------------------------------------

/** A Figure's string form, bottom-up, 1 = yang (ADR-0025). */
const keyOf = (figure: Hexagram | Trigram): string =>
  figure.map((polarity) => (polarity === 'yang' ? '1' : '0')).join('')

const sameFigure = (a: Hexagram | Trigram, b: Hexagram | Trigram): boolean =>
  keyOf(a) === keyOf(b)

function uniqueByKey<Figure extends Hexagram | Trigram>(
  figures: readonly Figure[],
): Figure[] {
  const seen = new Map<string, Figure>()
  for (const figure of figures)
    if (!seen.has(keyOf(figure))) seen.set(keyOf(figure), figure)
  return [...seen.values()]
}

/** A Citation's tag for the invented texts: Work, then its Oracle identities. */
function citationTag(citation: Citation): string {
  if (citation.work === 'yilin')
    return `yilin ${keyOf(citation.standing)}>${keyOf(citation.emerging)}`
  const line = 'line' in citation ? `.${String(citation.line)}` : ''
  return `${citation.work} ${keyOf(citation.hexagram)}${line}`
}

// --- Use case 3's result, by hand ---------------------------------------------

type CommentaryWork = ReadingPreference['commentaries'][number]

interface Shown {
  /** The Chinese Edition then each Translation, in the preference's order. */
  readonly sources: readonly Source[]
  readonly commentaries: readonly CommentaryWork[]
  readonly yilin?: Source
  /** Whether an Edition gives a Citation; every one gives every one by default. */
  readonly gives?: (source: Source, citation: Citation) => boolean
}

const allShown: Shown = {
  sources: [traditional, translationA],
  commentaries: ['tuan', 'daxiang', 'xiaoxiang', 'wenyan'],
}

function textsOf(shown: Shown, citation: Citation): PassageText[] {
  const gives = shown.gives ?? (() => true)
  return shown.sources
    .filter((source) => gives(source, citation))
    .map((source) => ({
      citation,
      edition: editionOf(source, citation.work),
      text: `${source.id} gives ${citationTag(citation)}`,
    }))
}

/** The Commentaries' Citations on one passage, as use case 3 documents them. */
function commentaryCitations(
  passage: PassageReference,
  commentaries: readonly CommentaryWork[],
): Citation[] {
  if (passage.line === undefined)
    return commentaries.flatMap((work): Citation[] =>
      work === 'xiaoxiang' ? [] : [{ work, hexagram: passage.hexagram }],
    )
  return commentaries.includes('xiaoxiang')
    ? [{ work: 'xiaoxiang', hexagram: passage.hexagram, line: passage.line }]
    : []
}

/**
 * Use case 3's documented result: each Applicable Passage's texts followed
 * by its Commentaries', then the Yilin Verse's.
 */
function resolvedFor(
  transformation: Transformation,
  shown: Shown = allShown,
): ResolvedTransformation {
  const resolution = resolve(transformation)
  const passageTexts = resolution.applicablePassages.flatMap((passage) => [
    ...textsOf(shown, { work: 'zhouyi', ...passage }),
    ...commentaryCitations(passage, shown.commentaries).flatMap((citation) =>
      textsOf(shown, citation),
    ),
  ])
  const yilin = shown.yilin
  const yilinTexts: PassageText[] =
    yilin === undefined
      ? []
      : textsOf(
          { ...shown, sources: [yilin] },
          {
            work: 'yilin',
            standing: resolution.standing.hexagram,
            emerging: resolution.emerging.hexagram,
          },
        )
  return { resolution, passageTexts: [...passageTexts, ...yilinTexts] }
}

// --- Use case 8's names, by hand ----------------------------------------------

const isReceivedSequenceNumber = (
  value: number,
): value is ReceivedSequenceNumber =>
  Number.isInteger(value) && value >= 1 && value <= 64

/**
 * An invented number, the Figure's binary value plus one, not the received
 * order: the Readout only carries what it is given.
 */
function inventedNumber(hexagram: Hexagram): ReceivedSequenceNumber {
  const value = Number.parseInt(keyOf(hexagram), 2) + 1
  if (!isReceivedSequenceNumber(value)) throw new Error(`${value} is no number`)
  return value
}

function namedHexagram(
  hexagram: Hexagram,
  sources: readonly Source[],
): NamedHexagram {
  return {
    hexagram,
    receivedSequenceNumber: inventedNumber(hexagram),
    names: sources.map((source) => ({
      hexagram,
      edition: editionOf(source, 'zhouyi'),
      name: `${source.id} names ${keyOf(hexagram)}`,
    })),
  }
}

function trigramNamesOf(
  trigram: Trigram,
  sources: readonly Source[],
): TrigramName[] {
  return sources.map((source) => ({
    trigram,
    edition: editionOf(source, 'zhouyi'),
    name: `${source.id} names ${keyOf(trigram)}`,
    imagery: `${source.id} images ${keyOf(trigram)}`,
  }))
}

/** Every Hexagram a Readout of the Resolution shows, read off its structure. */
const hexagramsShown = (resolution: Resolution): Hexagram[] =>
  uniqueByKey(
    [resolution.standing, resolution.emerging].flatMap((each) => [
      each.hexagram,
      each.nuclearHexagram,
      each.inverseHexagram,
      each.reversedHexagram,
    ]),
  )

const trigramsShown = (resolution: Resolution): Trigram[] =>
  uniqueByKey(
    [resolution.standing, resolution.emerging].flatMap((each) => [
      each.upperTrigram,
      each.lowerTrigram,
    ]),
  )

/**
 * The names the caller gathers, listed in reverse ("in any order"); each
 * Trigram's names stay in the Editions' order.
 */
function namesFor(
  resolution: Resolution,
  sources: readonly Source[] = allShown.sources,
): ReadoutNames {
  return {
    hexagrams: hexagramsShown(resolution)
      .toReversed()
      .map((hexagram) => namedHexagram(hexagram, sources)),
    trigrams: trigramsShown(resolution)
      .toReversed()
      .flatMap((trigram) => trigramNamesOf(trigram, sources)),
  }
}

/** The Readout of a Transformation from inputs built by hand. */
function readoutOf(
  transformation: Transformation,
  shown: Shown = allShown,
): TransformationReadout {
  const resolved = resolvedFor(transformation, shown)
  return transformationReadout(
    transformation,
    resolved,
    namesFor(resolved.resolution, shown.sources),
  )
}

// --- Reading a Readout --------------------------------------------------------

const labels = (tab: HexagramTab): string[] =>
  tab.passages.map((passage) => passage.label)

const commentaryLabels = (passage: PassageShown | undefined): string[] =>
  passage?.commentaries.map((commentary) => commentary.label) ?? []

const passageWith = (
  tab: HexagramTab,
  label: string,
): PassageShown | undefined =>
  tab.passages.find((passage) => passage.label === label)

const qian: Transformation = [9, 9, 9, 9, 9, 9]
const kun: Transformation = [6, 6, 6, 6, 6, 6]
const unmoving: Transformation = [7, 8, 7, 8, 7, 8]
const threeMoving: Transformation = [9, 8, 6, 7, 9, 8]

// --- hexagramsNamed and trigramsNamed -----------------------------------------

describe('hexagramsNamed and trigramsNamed', () => {
  const cases: readonly (readonly [string, Transformation])[] = [
    ['X之X', unmoving],
    ['乾 with no Line moving', [7, 7, 7, 7, 7, 7]],
    ['several Moving Lines', threeMoving],
    ['all six Lines of 乾 moving', qian],
  ]

  it.each(cases)(
    'for %s, list each Hexagram shown once: the Standing and Emerging Hexagrams and their Nuclear, Inverse and Reversed',
    (_name, transformation) => {
      const resolution = resolve(transformation)
      const listed = hexagramsNamed(resolution).map(keyOf)
      expect(listed.toSorted()).toEqual(
        hexagramsShown(resolution).map(keyOf).toSorted(),
      )
      expect(new Set(listed).size).toBe(listed.length)
    },
  )

  it.each(cases)(
    'for %s, list each Trigram shown once: both Hexagrams’ Upper and Lower Trigrams',
    (_name, transformation) => {
      const resolution = resolve(transformation)
      const listed = trigramsNamed(resolution).map(keyOf)
      expect(listed.toSorted()).toEqual(
        trigramsShown(resolution).map(keyOf).toSorted(),
      )
      expect(new Set(listed).size).toBe(listed.length)
    },
  )
})

// --- transformationReadout: passages and their order --------------------------

describe('transformationReadout: the Applicable Passages across the two tabs', () => {
  it('X之X: the Standing tab holds its Hexagram Statement, and the Emerging tab is present with no passage', () => {
    const readout = readoutOf(unmoving)
    const resolution = resolve(unmoving)
    expect(labels(readout.standing)).toEqual(['卦辭'])
    expect(readout.standing.passages[0]?.reference).toEqual({
      hexagram: resolution.standing.hexagram,
    })
    expect(readout.emerging.passages).toEqual([])
    expect(keyOf(readout.emerging.figure.hexagram.hexagram)).toBe(
      keyOf(resolution.standing.hexagram),
    )
  })

  it('several Moving Lines: the Hexagram Statement then each Moving Line bottom-up on the Standing tab, the Emerging Hexagram Statement on the other', () => {
    const readout = readoutOf(threeMoving)
    const resolution = resolve(threeMoving)
    expect(readout.standing.passages.map((each) => each.reference)).toEqual([
      { hexagram: resolution.standing.hexagram },
      { hexagram: resolution.standing.hexagram, line: 1 },
      { hexagram: resolution.standing.hexagram, line: 3 },
      { hexagram: resolution.standing.hexagram, line: 5 },
    ])
    expect(labels(readout.standing)).toEqual(['卦辭', '初九', '六三', '九五'])
    expect(readout.emerging.passages.map((each) => each.reference)).toEqual([
      { hexagram: resolution.emerging.hexagram },
    ])
    expect(labels(readout.emerging)).toEqual(['卦辭'])
  })

  it('read across both tabs, the passages are the Resolution’s Applicable Passages in order', () => {
    for (const transformation of [unmoving, threeMoving, qian, kun]) {
      const readout = readoutOf(transformation)
      expect(
        [...readout.standing.passages, ...readout.emerging.passages].map(
          (each) => each.reference,
        ),
      ).toEqual(resolve(transformation).applicablePassages)
    }
  })

  it('all six Lines of 乾 moving: 用九 closes the Standing tab with its 小象, and 坤’s tab shows no 用六', () => {
    const readout = readoutOf(qian)
    const resolution = resolve(qian)
    expect(labels(readout.standing)).toEqual([
      '卦辭',
      '初九',
      '九二',
      '九三',
      '九四',
      '九五',
      '上九',
      '用九',
    ])
    expect(readout.standing.passages.at(-1)?.reference).toEqual({
      hexagram: resolution.standing.hexagram,
      line: 'all-moving',
    })
    expect(commentaryLabels(passageWith(readout.standing, '用九'))).toEqual([
      '小象',
    ])
    expect(labels(readout.emerging)).toEqual(['卦辭'])
    expect([
      ...labels(readout.standing),
      ...labels(readout.emerging),
    ]).not.toContain('用六')
  })

  it('all six Lines of 坤 moving: 用六 closes the Standing tab', () => {
    const readout = readoutOf(kun)
    expect(labels(readout.standing)).toEqual([
      '卦辭',
      '初六',
      '六二',
      '六三',
      '六四',
      '六五',
      '上六',
      '用六',
    ])
    expect(labels(readout.emerging)).toEqual(['卦辭'])
  })

  it.each([
    [
      [9, 6, 9, 6, 9, 6] satisfies Transformation,
      ['卦辭', '初九', '六二', '九三', '六四', '九五', '上六'],
    ],
    [
      [6, 9, 6, 9, 6, 9] satisfies Transformation,
      ['卦辭', '初六', '九二', '六三', '九四', '六五', '上九'],
    ],
  ])(
    'six Moving Lines of neither 乾 nor 坤 (%j): each Line named from its Position and Value, and no All-Moving Statement',
    (transformation, expected) => {
      expect(labels(readoutOf(transformation).standing)).toEqual(expected)
    },
  )
})

// --- transformationReadout: texts and Commentaries ----------------------------

describe('transformationReadout: texts and Commentaries', () => {
  it('each passage shows its texts as given, the Chinese then each Translation, each with its Edition', () => {
    const resolved = resolvedFor(threeMoving, {
      ...allShown,
      sources: [traditional, translationA, translationB],
    })
    const readout = transformationReadout(
      threeMoving,
      resolved,
      namesFor(resolved.resolution),
    )
    for (const passage of [
      ...readout.standing.passages,
      ...readout.emerging.passages,
    ]) {
      expect(passage.texts).toEqual(
        resolved.passageTexts.filter(
          (each) =>
            each.citation.work === 'zhouyi' &&
            citationTag(each.citation) ===
              citationTag({ work: 'zhouyi', ...passage.reference }),
        ),
      )
      expect(passage.texts.map((each) => each.edition.id)).toEqual([
        traditional.id,
        translationA.id,
        translationB.id,
      ])
    }
  })

  it('a Hexagram Statement takes 彖傳, 大象 and 文言, a Line Statement its 小象, each with its texts', () => {
    const resolved = resolvedFor(threeMoving)
    const readout = transformationReadout(
      threeMoving,
      resolved,
      namesFor(resolved.resolution),
    )
    const statement = passageWith(readout.standing, '卦辭')
    expect(commentaryLabels(statement)).toEqual(['彖傳', '大象', '文言'])
    expect(statement?.commentaries.map((each) => each.work)).toEqual([
      'tuan',
      'daxiang',
      'wenyan',
    ])
    expect(statement?.commentaries[1]?.texts).toEqual(
      textsOf(allShown, {
        work: 'daxiang',
        hexagram: resolved.resolution.standing.hexagram,
      }),
    )
    const line = passageWith(readout.standing, '六三')
    expect(commentaryLabels(line)).toEqual(['小象'])
    expect(line?.commentaries[0]?.texts).toEqual(
      textsOf(allShown, {
        work: 'xiaoxiang',
        hexagram: resolved.resolution.standing.hexagram,
        line: 3,
      }),
    )
    expect(commentaryLabels(passageWith(readout.emerging, '卦辭'))).toEqual([
      '彖傳',
      '大象',
      '文言',
    ])
  })

  it('Commentaries follow the order they are given in, the Reading Preference’s', () => {
    const readout = readoutOf(threeMoving, {
      ...allShown,
      commentaries: ['wenyan', 'daxiang', 'xiaoxiang', 'tuan'],
    })
    expect(commentaryLabels(passageWith(readout.standing, '卦辭'))).toEqual([
      '文言',
      '大象',
      '彖傳',
    ])
  })

  it('a Commentary no Edition gives is left out, and a Translation lacking a passage shows nothing for it', () => {
    const readout = readoutOf(threeMoving, {
      ...allShown,
      gives: (source, citation) =>
        citation.work !== 'tuan' &&
        (source !== translationA || citation.work !== 'zhouyi'),
    })
    const statement = passageWith(readout.standing, '卦辭')
    expect(commentaryLabels(statement)).toEqual(['大象', '文言'])
    expect(statement?.texts.map((each) => each.edition.id)).toEqual([
      traditional.id,
    ])
  })

  it('a passage no Edition shown gives keeps its label and its Commentaries, with no text', () => {
    const readout = readoutOf(threeMoving, {
      ...allShown,
      gives: (_source, citation) =>
        citationTag(citation) !==
        citationTag({
          work: 'zhouyi',
          hexagram: resolve(threeMoving).standing.hexagram,
          line: 3,
        }),
    })
    const line = passageWith(readout.standing, '六三')
    expect(line?.texts).toEqual([])
    expect(commentaryLabels(line)).toEqual(['小象'])
    expect(labels(readout.standing)).toEqual(['卦辭', '初九', '六三', '九五'])
  })

  it('labels are the Traditional ones whatever the script shown', () => {
    const shown: Shown = { ...allShown, sources: [simplified, translationA] }
    const readout = readoutOf(qian, shown)
    expect(labels(readout.standing)).toEqual([
      '卦辭',
      '初九',
      '九二',
      '九三',
      '九四',
      '九五',
      '上九',
      '用九',
    ])
    expect(commentaryLabels(passageWith(readout.standing, '卦辭'))).toEqual([
      '彖傳',
      '大象',
      '文言',
    ])
    expect(commentaryLabels(passageWith(readout.standing, '用九'))).toEqual([
      '小象',
    ])
    expect(passageWith(readout.standing, '卦辭')?.texts[0]?.edition.id).toBe(
      simplified.id,
    )
  })

  it('the Yilin Verse shows its texts when given, and nothing when not', () => {
    const withVerse = resolvedFor(threeMoving, {
      ...allShown,
      yilin: yilinSource,
    })
    const readout = transformationReadout(
      threeMoving,
      withVerse,
      namesFor(withVerse.resolution),
    )
    expect(readout.yilinVerse).toEqual(
      withVerse.passageTexts.filter((each) => each.citation.work === 'yilin'),
    )
    expect(readout.yilinVerse).toHaveLength(1)
    expect(readoutOf(threeMoving).yilinVerse).toEqual([])
  })
})

// --- transformationReadout: Figures and names ---------------------------------

describe('transformationReadout: Figures and names', () => {
  it('the Standing Figure marks its Moving Lines, and the Emerging Figure the Changed Lines they become, bottom-up', () => {
    const readout = readoutOf(threeMoving)
    expect(readout.transformation.standing.lines).toEqual([
      { position: 1, value: 9, change: 'moving' },
      { position: 2, value: 8, change: 'static' },
      { position: 3, value: 6, change: 'moving' },
      { position: 4, value: 7, change: 'static' },
      { position: 5, value: 9, change: 'moving' },
      { position: 6, value: 8, change: 'static' },
    ])
    expect(readout.transformation.emerging.lines).toEqual([
      { position: 1, value: 8, change: 'changed' },
      { position: 2, value: 8, change: 'static' },
      { position: 3, value: 7, change: 'changed' },
      { position: 4, value: 7, change: 'static' },
      { position: 5, value: 8, change: 'changed' },
      { position: 6, value: 8, change: 'static' },
    ])
  })

  it('X之X marks no Line on either Figure', () => {
    const readout = readoutOf(unmoving)
    for (const figure of [
      readout.transformation.standing,
      readout.transformation.emerging,
    ]) {
      expect(figure.lines.map((line) => line.change)).toEqual(
        Array.from({ length: 6 }, () => 'static'),
      )
      expect(figure.lines.map((line) => line.value)).toEqual([...unmoving])
    }
  })

  it('each Figure carries its Hexagram’s number and names as given, and its Trigrams’ names in the Editions’ order', () => {
    const resolved = resolvedFor(threeMoving)
    const names = namesFor(resolved.resolution)
    const readout = transformationReadout(threeMoving, resolved, names)
    for (const [figure, structure] of [
      [readout.transformation.standing, resolved.resolution.standing],
      [readout.transformation.emerging, resolved.resolution.emerging],
    ] as const) {
      expect(figure.hexagram).toEqual(
        namedHexagram(structure.hexagram, allShown.sources),
      )
      expect(figure.upperTrigram).toEqual(
        trigramNamesOf(structure.upperTrigram, allShown.sources),
      )
      expect(figure.lowerTrigram).toEqual(
        trigramNamesOf(structure.lowerTrigram, allShown.sources),
      )
    }
  })

  it('each Hexagram tab holds its Figure and its Nuclear, Inverse and Reversed Hexagrams with their names', () => {
    const resolved = resolvedFor(threeMoving)
    const readout = transformationReadout(
      threeMoving,
      resolved,
      namesFor(resolved.resolution),
    )
    for (const [tab, figure, structure] of [
      [
        readout.standing,
        readout.transformation.standing,
        resolved.resolution.standing,
      ],
      [
        readout.emerging,
        readout.transformation.emerging,
        resolved.resolution.emerging,
      ],
    ] as const) {
      expect(tab.figure).toEqual(figure)
      expect(tab.nuclearHexagram).toEqual(
        namedHexagram(structure.nuclearHexagram, allShown.sources),
      )
      expect(tab.inverseHexagram).toEqual(
        namedHexagram(structure.inverseHexagram, allShown.sources),
      )
      expect(tab.reversedHexagram).toEqual(
        namedHexagram(structure.reversedHexagram, allShown.sources),
      )
    }
  })
})

// --- transformationReadout: the Editions shown --------------------------------

describe('transformationReadout: the closing list of Editions', () => {
  it('lists each EditionId once, in the order it first appears: names first, then passages, then the Yilin Verse', () => {
    // translationB gives no name and only the Standing Hexagram Statement;
    // the Yilin Verse's Edition appears nowhere else.
    const shown: Shown = {
      sources: [traditional, translationA, translationB],
      commentaries: ['daxiang', 'xiaoxiang'],
      yilin: yilinSource,
      gives: (source, citation) =>
        source !== translationB ||
        (citation.work === 'zhouyi' && !('line' in citation)),
    }
    const resolved = resolvedFor(threeMoving, shown)
    const readout = transformationReadout(
      threeMoving,
      resolved,
      namesFor(resolved.resolution, [traditional, translationA]),
    )
    expect(readout.editions.map((edition) => edition.id)).toEqual([
      traditional.id,
      translationA.id,
      translationB.id,
      yilinSource.id,
    ])
  })
})

// --- transformationReadout: the caller's errors -------------------------------

describe('transformationReadout: the caller’s errors', () => {
  it('throws a RangeError when the names lack a Hexagram the Readout shows', () => {
    const resolved = resolvedFor(threeMoving)
    const names = namesFor(resolved.resolution)
    const nuclear = resolved.resolution.standing.nuclearHexagram
    const lacking: ReadoutNames = {
      ...names,
      hexagrams: names.hexagrams.filter(
        (each) => !sameFigure(each.hexagram, nuclear),
      ),
    }
    expect(() => transformationReadout(threeMoving, resolved, lacking)).toThrow(
      RangeError,
    )
  })

  it('throws a RangeError when the result is not the Resolution of the Transformation', () => {
    const resolved = resolvedFor(threeMoving)
    const names = namesFor(resolved.resolution)
    expect(() => transformationReadout(unmoving, resolved, names)).toThrow(
      RangeError,
    )
  })
})

// --- consultationReadout ------------------------------------------------------

function consultationId(text: string): ConsultationId {
  if (!isConsultationId(text)) throw new Error(`${text} is no ULID`)
  return text
}

function query(text: string): Query {
  if (!isQuery(text)) throw new Error('a blank Query')
  return text
}

/** A Moment at its UTC instant, read in `offset`. */
function moment(utcMilliseconds: number, offset: string): Moment {
  if (!isUtcOffset(offset)) throw new Error(`${offset} is no offset`)
  return { precision: 'moment', epochMilliseconds: utcMilliseconds, offset }
}

function day(year: number, month: number, dayOfMonth: number): Day {
  const value = { precision: 'day', year, month, day: dayOfMonth } as const
  if (!isDay(value)) throw new Error('no such day')
  return value
}

/** The Casting these eighteen Picks make, divided through the Oracle. */
function castBy(picks: readonly Pick[]): CompleteCasting {
  let casting: PartialCasting = emptyCasting
  for (const pick of picks) {
    const result = divide(casting, pick)
    if (result.outcome !== 'divided') throw new Error(`refused Pick ${pick}`)
    if (result.casting.state === 'complete') return result.casting
    casting = result.casting
  }
  throw new Error('fewer than eighteen Picks')
}

// Line 1 by Picks 4, 3, 3 (Old Yin 6), as today's ledger fixture has it;
// Lines 2 to 6 by Picks 1, 1, 1 (Old Yang 9).
const casting = castBy([4, 3, 3, ...Array.from({ length: 15 }, () => 1)])

const castConsultation: CastConsultation = {
  origin: 'cast',
  id: consultationId('01M6E6AHA84T7V2M5N6P0R1S2K'),
  query: query('Should the granary at Greyfen Hold\nbe rebuilt before winter?'),
  divinedAt: moment(Date.UTC(2026, 10, 2, 13, 14), '+08:00'),
  transformation: casting.transformation,
  casting,
  divisionMethod: 'virtual',
}

const recordedConsultation: RecordedConsultation = {
  origin: 'recorded',
  id: consultationId('01M6E6AHA84T7V2M5N6P0R1S2M'),
  query: query('Will Steward Aelric’s embassy to Westmill succeed?'),
  divinedAt: day(2026, 10, 28),
  transformation: threeMoving,
}

/** A row of the ledger: its Line and Round, then the counts in field order. */
type Row = readonly [
  LedgerRound['line'],
  LedgerRound['round'],
  ...(readonly number[]),
]

const rowOf = (round: LedgerRound): Row => [
  round.line,
  round.round,
  round.stalks,
  round.leftHeap,
  round.leftPiles,
  round.leftRemainder,
  round.rightHeap,
  round.rightPiles,
  round.rightRemainder,
  round.setAside,
  round.remainingFours,
]

// Each Line's three Rounds, third first: stalks, left heap, piles,
// Remainder, right heap (Hung Stalk still in it), piles, Remainder,
// Set-aside, then the stalks left over four.
const oldYangRounds = (line: LedgerRound['line']): Row[] => [
  [line, 3, 40, 1, 0, 1, 39, 9, 2, 4, 9],
  [line, 2, 44, 1, 0, 1, 43, 10, 2, 4, 10],
  [line, 1, 49, 1, 0, 1, 48, 11, 3, 5, 11],
]

describe('consultationReadout', () => {
  it('a Cast Consultation shows its Query, its Divined At and its Transformation’s Readout', () => {
    const resolved = resolvedFor(castConsultation.transformation)
    const names = namesFor(resolved.resolution)
    const readout = consultationReadout(castConsultation, resolved, names)
    expect(readout.query).toBe(castConsultation.query)
    expect(readout.divinedAt).toEqual(castConsultation.divinedAt)
    expect(readout).toMatchObject(
      transformationReadout(castConsultation.transformation, resolved, names),
    )
  })

  it('the Casting tab is a ledger from Line 6 down, each Line’s third Round first, with its Division Method and the piles derived', () => {
    const resolved = resolvedFor(castConsultation.transformation)
    const readout = consultationReadout(
      castConsultation,
      resolved,
      namesFor(resolved.resolution),
    )
    expect(readout.casting.origin).toBe('cast')
    if (readout.casting.origin !== 'cast') return
    expect(readout.casting.divisionMethod).toBe('virtual')
    expect(readout.casting.rounds.map(rowOf)).toEqual([
      ...oldYangRounds(6),
      ...oldYangRounds(5),
      ...oldYangRounds(4),
      ...oldYangRounds(3),
      ...oldYangRounds(2),
      [1, 3, 32, 3, 0, 3, 29, 6, 4, 8, 6],
      [1, 2, 40, 3, 0, 3, 37, 8, 4, 8, 8],
      [1, 1, 49, 4, 0, 4, 45, 10, 4, 9, 10],
    ])
    expect(readout.casting.rounds.map((each) => each.lineValue)).toEqual(
      [6, 5, 4, 3, 2, 1].flatMap((line) => [
        castConsultation.transformation[line - 1],
        undefined,
        undefined,
      ]),
    )
  })

  it('a Recorded Consultation’s Casting tab shows it has no Casting', () => {
    const resolved = resolvedFor(recordedConsultation.transformation)
    const readout = consultationReadout(
      recordedConsultation,
      resolved,
      namesFor(resolved.resolution),
    )
    expect(readout.casting).toEqual({ origin: 'recorded' })
    expect(readout.query).toBe(recordedConsultation.query)
    expect(readout.divinedAt).toEqual(recordedConsultation.divinedAt)
  })

  it('throws a RangeError when the result is not the Resolution of the Consultation’s Transformation', () => {
    const resolved = resolvedFor(unmoving)
    expect(() =>
      consultationReadout(
        recordedConsultation,
        resolved,
        namesFor(resolved.resolution),
      ),
    ).toThrow(RangeError)
  })
})

// --- divinedAtText ----------------------------------------------------

describe('divinedAtText', () => {
  it.each([
    ['+08:00', Date.UTC(2026, 10, 2, 13, 14), '2026-11-02 21:14'],
    ['-05:00', Date.UTC(2026, 10, 2, 3, 7), '2026-11-01 22:07'],
    ['+14:00', Date.UTC(2026, 10, 2, 13, 14), '2026-11-03 03:14'],
    ['+05:30', Date.UTC(2026, 2, 4, 23, 45), '2026-03-05 05:15'],
  ])(
    'writes a Moment at %s as the date and time its own offset reads',
    (offset, instant, expected) => {
      expect(divinedAtText(moment(instant, offset))).toBe(expected)
    },
  )

  it('writes a date-only Divined At as the date alone', () => {
    expect(divinedAtText(day(2026, 10, 28))).toBe('2026-10-28')
    expect(divinedAtText(day(2026, 3, 5))).toBe('2026-03-05')
  })
})
