import { readFileSync } from 'node:fs'

import type { Clock } from '@hexagram/application/clock'
import type { ConsultationStore } from '@hexagram/application/consultation-store'
import type { RandomSource } from '@hexagram/application/random-source'
import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import type { Polarity } from '@hexagram/oracle/figure'
import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { Trigram } from '@hexagram/oracle/trigram'
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

import { composeCli } from '#src/composition-root.js'

// The real bundled Catalogue behind composeCli. Every expected text and name
// is read at run time, never typed here: from the pre-overhaul models' JSON,
// and, for the All-Moving Statements of Qian and Kun, from the owner's file
// docs/source-texts/yong-jiu-yong-liu.md. catalogue-bundled's own test
// helpers sit outside cli-adapter's reach, so the few readings needed here
// are made again.

function readRepositoryFile(relative: string): string {
  return readFileSync(new URL(`../../../${relative}`, import.meta.url), 'utf8')
}

/** Lookups touch only the Catalogue, so the other ports fail if touched. */
const untouched = (): never => {
  throw new Error('a lookup touched a port other than the Catalogue')
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

const cli = composeCli({
  scriptureCatalogue: bundledScriptureCatalogue,
  randomSource,
  consultationStore,
  clock,
})

// --- EditionIds and preferences -------------------------------------------

function editionId(slug: string): EditionId {
  if (!isEditionId(slug)) throw new Error(`the slug ${slug} is malformed`)
  return slug
}

const traditional = editionId('wuyingdian-1739')
const simplified = editionId('wuyingdian-1739-simplified')
const legge = editionId('legge-1882')
const wilhelmBaynes = editionId('wilhelm-baynes-1967')

/** The Chinese in Traditional script, then both Translations; every Commentary. */
const everything: ReadingPreference = {
  script: 'traditional',
  translations: [legge, wilhelmBaynes],
  commentaries: ['tuan', 'daxiang', 'xiaoxiang', 'wenyan'],
  yilinVerse: true,
}

/** The Chinese in Simplified script, then one Translation; the 大象 only. */
const narrow: ReadingPreference = {
  script: 'simplified',
  translations: [wilhelmBaynes],
  commentaries: ['daxiang'],
  yilinVerse: false,
}

// --- The pre-overhaul models ----------------------------------------------

/** A JSON object, narrowed from `unknown`. */
function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function valueAt(value: unknown, path: readonly string[]): unknown {
  let found = value
  for (const key of path) {
    if (!isObject(found) || !(key in found))
      throw new Error(`the legacy data has no ${path.join('.')}`)
    found = found[key]
  }
  return found
}

function stringAt(value: unknown, path: readonly string[]): string {
  const found = valueAt(value, path)
  if (typeof found !== 'string')
    throw new Error(`the legacy ${path.join('.')} is not a string`)
  return found
}

function legacyFile(relative: string): Readonly<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(readRepositoryFile(relative))
  if (!isObject(parsed)) throw new Error(`${relative} is not an object`)
  return parsed
}

const legacyHexagramRecords = legacyFile(
  'domain/core/src/models/hexagrams.json',
)
const legacyTrigramRecords = legacyFile('domain/core/src/models/trigrams.json')

/** Where every legacy record files each bundled Edition's value. */
function legacySlot(id: EditionId): readonly string[] {
  if (id === traditional) return ['Chinese', 'Traditional']
  if (id === simplified) return ['Chinese', 'Simplified']
  if (id === legge) return ['English', 'Legge']
  if (id === wilhelmBaynes) return ['English', 'WilhelmBaynes']
  throw new Error(`no legacy slot for ${id}`)
}

/** A legacy key: a letter, then the Lines bottom-up, 1 yang and 2 yin. */
function legacyKey(letter: 'H' | 'T', figure: readonly Polarity[]): string {
  return letter + figure.map((line) => (line === 'yang' ? '1' : '2')).join('')
}

function legacyHexagram(hexagram: Hexagram): unknown {
  return valueAt(legacyHexagramRecords, [legacyKey('H', hexagram)])
}

function legacyTrigram(trigram: Trigram): unknown {
  return valueAt(legacyTrigramRecords, [legacyKey('T', trigram)])
}

function polarities(key: string): Polarity[] {
  return Array.from(key.slice(1), (bit) => {
    if (bit === '1') return 'yang'
    if (bit === '2') return 'yin'
    throw new Error(`the legacy key ${key} is malformed`)
  })
}

const legacyHexagrams: readonly Hexagram[] = Object.keys(
  legacyHexagramRecords,
).map((key) => {
  const [one, two, three, four, five, six, ...rest] = polarities(key)
  if (
    one === undefined ||
    two === undefined ||
    three === undefined ||
    four === undefined ||
    five === undefined ||
    six === undefined ||
    rest.length > 0
  )
    throw new Error(`the legacy key ${key} is not a Hexagram's`)
  return [one, two, three, four, five, six]
})

const legacyTrigrams: readonly Trigram[] = Object.keys(
  legacyTrigramRecords,
).map((key) => {
  const [one, two, three, ...rest] = polarities(key)
  if (
    one === undefined ||
    two === undefined ||
    three === undefined ||
    rest.length > 0
  )
    throw new Error(`the legacy key ${key} is not a Trigram's`)
  return [one, two, three]
})

// --- The owner's file of All-Moving Statements -----------------------------

const ownerLines = readRepositoryFile(
  'docs/source-texts/yong-jiu-yong-liu.md',
).split('\n')

/** The heading that opens each Edition's part of the owner's file. */
function ownerHeadingStart(id: EditionId): string {
  if (id === traditional) return '## Traditional Chinese'
  if (id === simplified) return '## Simplified Chinese'
  if (id === legge) return '## Legge'
  if (id === wilhelmBaynes) return '## Wilhelm–Baynes'
  throw new Error(`no section of the owner's file for ${id}`)
}

/**
 * The owner's two texts under one Hexagram's subsection of the Edition's
 * section, Qian's first and Kun's second: the All-Moving Statement, then its
 * xiaoxiang. Each bullet holds its text after the colon, or, when nothing
 * follows the colon, in the fenced block below it.
 */
function ownerTexts(
  id: EditionId,
  which: 'qian' | 'kun',
): readonly [string, string] {
  const start = ownerLines.findIndex((line) =>
    line.startsWith(ownerHeadingStart(id)),
  )
  if (start === -1) throw new Error(`the owner's file has no section for ${id}`)
  const end = ownerLines.findIndex(
    (line, index) => index > start && line.startsWith('## '),
  )
  const section = ownerLines.slice(start + 1, end === -1 ? undefined : end)
  const subsections = section.flatMap((line, index) =>
    line.startsWith('### ') ? [index] : [],
  )
  const subsectionStart = subsections[which === 'qian' ? 0 : 1]
  if (subsections.length !== 2 || subsectionStart === undefined)
    throw new Error(`the owner's ${id} section has not two subsections`)
  const subsection = section.slice(
    subsectionStart + 1,
    which === 'qian' ? subsections[1] : undefined,
  )
  const texts: string[] = []
  for (let index = 0; index < subsection.length; index++) {
    const bullet = /^- [^:]+:(.*)$/.exec(subsection[index] ?? '')
    if (bullet === null) continue
    const rest = bullet[1] ?? ''
    if (rest.trim() !== '') {
      texts.push(rest.startsWith(' ') ? rest.slice(1) : rest)
      continue
    }
    let open = index + 1
    while (subsection[open] === '') open++
    const close = subsection.indexOf('```', open + 1)
    if (subsection[open] !== '```' || close === -1)
      throw new Error(`a bullet of the owner's ${id} section has no text`)
    texts.push(subsection.slice(open + 1, close).join('\n'))
    index = close
  }
  const [statement, commentary, ...extra] = texts
  if (statement === undefined || commentary === undefined || extra.length > 0)
    throw new Error(`the owner's ${id} ${which} subsection has not two texts`)
  return [statement, commentary]
}

// --- What a reading must show ----------------------------------------------

const qian: Hexagram = ['yang', 'yang', 'yang', 'yang', 'yang', 'yang']
const kun: Hexagram = ['yin', 'yin', 'yin', 'yin', 'yin', 'yin']
// 屯: yang at Line Positions 1 and 5.
const zhun: Hexagram = ['yang', 'yin', 'yin', 'yin', 'yang', 'yin']

const linePositions = [1, 2, 3, 4, 5, 6] as const

function isQian(hexagram: Hexagram): boolean {
  return hexagram.every((line) => line === 'yang')
}

/**
 * The text an Edition must give for a Citation: the owner's for an
 * All-Moving Statement or its xiaoxiang, the legacy models' otherwise. A
 * Citation neither holds (文言, Yilin) has none.
 */
function expectedText(citation: Citation, id: EditionId): string | undefined {
  if (citation.work === 'wenyan' || citation.work === 'yilin') return undefined
  const record = legacyHexagram(citation.hexagram)
  const text = (...path: string[]): string =>
    stringAt(record, ['Text', ...legacySlot(id), ...path])
  switch (citation.work) {
    case 'zhouyi':
      if (citation.line === undefined) return text('Scripture', 'Hexagram')
      if (citation.line === 'all-moving')
        return ownerTexts(id, isQian(citation.hexagram) ? 'qian' : 'kun')[0]
      return text('Scripture', 'Lines', `L${citation.line}`)
    case 'tuan':
      return text('Exegesis', 'Judgment')
    case 'daxiang':
      return text('Exegesis', 'Imagery', 'Hexagram')
    case 'xiaoxiang':
      if (citation.line === 'all-moving')
        return ownerTexts(id, isQian(citation.hexagram) ? 'qian' : 'kun')[1]
      return text('Exegesis', 'Imagery', 'Lines', `L${citation.line}`)
  }
}

/** A passage text as compared: its Citation, its Edition's id and Work, and its text. */
interface Shown {
  readonly citation: Citation
  readonly edition: EditionId
  readonly work: Work
  readonly text: string
}

function shown(passageTexts: readonly PassageText[]): Shown[] {
  return passageTexts.map(({ citation, edition, text }) => ({
    citation,
    edition: edition.id,
    work: edition.work,
    text,
  }))
}

/** Each Citation's text in each Edition, in order, where one is expected. */
function expectedShown(
  citations: readonly Citation[],
  editions: readonly EditionId[],
): Shown[] {
  return citations.flatMap((citation) =>
    editions.flatMap((edition): Shown[] => {
      const text = expectedText(citation, edition)
      return text === undefined
        ? []
        : [{ citation, edition, work: citation.work, text }]
    }),
  )
}

/** The Edition record composeCli lists for the Work under the id. */
async function editionRecord(work: Work, id: EditionId): Promise<Edition> {
  const editions = await cli.lookUpEditions(work)
  const record = editions.find((edition) => edition.id === id)
  if (record === undefined) throw new Error(`no ${work} Edition ${id}`)
  return record
}

/** A Hexagram Statement and the Hexagram-wide Works, in `everything`'s order. */
function hexagramStatement(hexagram: Hexagram): Citation[] {
  return [
    { work: 'zhouyi', hexagram },
    { work: 'tuan', hexagram },
    { work: 'daxiang', hexagram },
    { work: 'wenyan', hexagram },
  ]
}

/**
 * The Citations of an all-moving 乾 or 坤 under `everything`: each Applicable
 * Passage followed by its Commentaries in the preference's order (the
 * Hexagram-wide Works for a Hexagram Statement, the 小象 for a Line or the
 * All-Moving Statement), then the Yilin Verse.
 */
function allMovingCitations(
  standing: Hexagram,
  emerging: Hexagram,
): Citation[] {
  return [
    ...hexagramStatement(standing),
    ...linePositions.flatMap((line): Citation[] => [
      { work: 'zhouyi', hexagram: standing, line },
      { work: 'xiaoxiang', hexagram: standing, line },
    ]),
    { work: 'zhouyi', hexagram: standing, line: 'all-moving' },
    { work: 'xiaoxiang', hexagram: standing, line: 'all-moving' },
    ...hexagramStatement(emerging),
    { work: 'yilin', standing, emerging },
  ]
}

// --- The tests --------------------------------------------------------------

describe('composeCli with the bundled Catalogue: resolving a Transformation', () => {
  it('resolves an all-moving 乾 to 坤 with every passage, 用九 included, in each Edition the preference shows', async () => {
    const result = await cli.resolveTransformation(
      [9, 9, 9, 9, 9, 9],
      everything,
    )

    expect(result.resolution.standing.hexagram).toStrictEqual(qian)
    expect(result.resolution.emerging.hexagram).toStrictEqual(kun)
    expect(result.resolution.movingLines).toStrictEqual([1, 2, 3, 4, 5, 6])
    // Twenty Citations hold text (the 文言 and the Yilin Verse hold none), each in three Editions.
    expect(result.passageTexts).toHaveLength(60)
    expect(shown(result.passageTexts)).toStrictEqual(
      expectedShown(allMovingCitations(qian, kun), [
        traditional,
        legge,
        wilhelmBaynes,
      ]),
    )
  })

  it('shows 用九 and its 小象 exactly as the owner’s file gives them, in each Edition', async () => {
    const result = await cli.resolveTransformation(
      [9, 9, 9, 9, 9, 9],
      everything,
    )
    const allMoving = shown(result.passageTexts).filter(
      ({ citation }) => 'line' in citation && citation.line === 'all-moving',
    )

    const ids = [traditional, legge, wilhelmBaynes]

    expect(
      allMoving.map(({ edition, work, text }) => ({ edition, work, text })),
    ).toStrictEqual([
      ...ids.map((id) => ({
        edition: id,
        work: 'zhouyi',
        text: ownerTexts(id, 'qian')[0],
      })),
      ...ids.map((id) => ({
        edition: id,
        work: 'xiaoxiang',
        text: ownerTexts(id, 'qian')[1],
      })),
    ])
  })

  it('resolves an all-moving 坤 to 乾 with 用六 in each Edition the preference shows', async () => {
    const result = await cli.resolveTransformation(
      [6, 6, 6, 6, 6, 6],
      everything,
    )

    expect(result.resolution.standing.hexagram).toStrictEqual(kun)
    expect(result.resolution.emerging.hexagram).toStrictEqual(qian)
    expect(shown(result.passageTexts)).toStrictEqual(
      expectedShown(allMovingCitations(kun, qian), [
        traditional,
        legge,
        wilhelmBaynes,
      ]),
    )
  })

  it('resolves a Transformation with no Moving Line to its Hexagram Statement, in the Simplified script and one Translation', async () => {
    const result = await cli.resolveTransformation([7, 8, 8, 8, 7, 8], narrow)

    expect(result.resolution.standing.hexagram).toStrictEqual(zhun)
    expect(result.resolution.emerging.hexagram).toStrictEqual(zhun)
    expect(result.resolution.movingLines).toStrictEqual([])
    expect(result.resolution.applicablePassages).toStrictEqual([
      { hexagram: zhun },
    ])
    expect(result.passageTexts).toHaveLength(4)
    expect(shown(result.passageTexts)).toStrictEqual(
      expectedShown(
        [
          { work: 'zhouyi', hexagram: zhun },
          { work: 'daxiang', hexagram: zhun },
        ],
        [simplified, wilhelmBaynes],
      ),
    )
  })

  it('labels each passage text with the Edition record composeCli lists for its Work', async () => {
    const result = await cli.resolveTransformation(
      [9, 9, 9, 9, 9, 9],
      everything,
    )

    for (const { edition } of result.passageTexts)
      expect(edition).toStrictEqual(
        await editionRecord(edition.work, edition.id),
      )
  })
})

describe('composeCli with the bundled Catalogue: names', () => {
  it('looks up the Standing and Emerging Hexagrams’ names in each Edition the preference shows', async () => {
    for (const hexagram of [qian, kun, zhun]) {
      const names = await cli.lookUpHexagramNames(hexagram, everything)
      const expected = await Promise.all(
        [traditional, legge, wilhelmBaynes].map(async (id) => ({
          hexagram,
          edition: await editionRecord('zhouyi', id),
          name: stringAt(legacyHexagram(hexagram), ['Name', ...legacySlot(id)]),
        })),
      )
      expect(names).toStrictEqual(expected)
    }
  })

  it('looks up every Hexagram’s Received Sequence Number', async () => {
    expect(legacyHexagrams).toHaveLength(64)
    for (const hexagram of legacyHexagrams) {
      expect(await cli.lookUpReceivedSequenceNumber(hexagram)).toBe(
        valueAt(legacyHexagram(hexagram), ['Metadata', 'Order', 'WenWang']),
      )
    }
  })

  it('looks up every Trigram’s name and imagery in each Edition the preference shows', async () => {
    expect(legacyTrigrams).toHaveLength(8)
    for (const preference of [everything, narrow]) {
      const ids = [
        preference.script === 'traditional' ? traditional : simplified,
        ...preference.translations,
      ]
      for (const trigram of legacyTrigrams) {
        const record = legacyTrigram(trigram)
        const expected = await Promise.all(
          ids.map(async (id) => ({
            trigram,
            edition: await editionRecord('zhouyi', id),
            name: stringAt(record, ['Name', ...legacySlot(id)]),
            imagery: stringAt(record, ['Imagery', ...legacySlot(id)]),
          })),
        )
        expect(await cli.lookUpTrigramNames(trigram, preference)).toStrictEqual(
          expected,
        )
      }
    }
  })
})

describe('composeCli with the bundled Catalogue: the Licence Gate for a Private Channel', () => {
  const printedWorks = ['zhouyi', 'tuan', 'daxiang', 'xiaoxiang'] as const

  it('lists every Edition of each printed Work, those gated on other channels included', async () => {
    for (const work of printedWorks) {
      const editions = await cli.lookUpEditions(work)
      expect(new Set(editions.map(({ id }) => id))).toStrictEqual(
        new Set([traditional, simplified, legge, wilhelmBaynes]),
      )
      expect(editions).toHaveLength(4)
      expect(new Set(editions.map(({ licence }) => licence))).toStrictEqual(
        new Set(['public-domain', 'in-copyright', 'terms-unverified']),
      )
    }
  })

  it('shows the text of every Edition, whatever its licence', async () => {
    const citation: Citation = { work: 'zhouyi', hexagram: zhun, line: 5 }
    for (const script of ['traditional', 'simplified'] as const) {
      const chinese = script === 'traditional' ? traditional : simplified
      const texts = await cli.lookUpPassageTexts(citation, {
        ...everything,
        script,
      })
      expect(shown(texts)).toStrictEqual(
        expectedShown([citation], [chinese, legge, wilhelmBaynes]),
      )
      expect(texts.map(({ edition }) => edition.licence)).toStrictEqual([
        'terms-unverified',
        'public-domain',
        'in-copyright',
      ])
    }
  })
})
