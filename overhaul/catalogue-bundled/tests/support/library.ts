import { readFileSync } from 'node:fs'

import type { Polarity } from '@hexagram/oracle/figure'
import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { Trigram } from '@hexagram/oracle/trigram'
import type { Citation } from '@hexagram/scripture-catalogue/citation'
import {
  isEditionId,
  type EditionId,
} from '@hexagram/scripture-catalogue/edition-id'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

// What the bundled Catalogue must hold, read at run time from the library and
// never typed here: the pre-overhaul models' JSON (the same records as their
// TypeScript sources), the owner's file of the All-Moving Statements of Qian
// and Kun (docs/source-texts/yong-jiu-yong-liu.md), and the glossary. No
// scripture and no Chinese is written in these tests; a mistranscription
// could only come from the data under test.

function readRepositoryFile(relative: string): string {
  return readFileSync(
    new URL(`../../../../${relative}`, import.meta.url),
    'utf8',
  )
}

/** The four bundled EditionIds, Chinese first. */
export const bundledEditionIds = [
  'wuyingdian-1739',
  'wuyingdian-1739-simplified',
  'legge-1882',
  'wilhelm-baynes-1967',
] as const

export type BundledEditionId = (typeof bundledEditionIds)[number]

/** The Works every bundled Edition prints. */
export const printedWorks = ['zhouyi', 'tuan', 'daxiang', 'xiaoxiang'] as const

export function editionId(slug: string): EditionId {
  if (!isEditionId(slug)) throw new Error(`the slug ${slug} is malformed`)
  return slug
}

/**
 * A preference that shows the Edition, among others: its script, or itself
 * as the one Translation, with every Commentary and the Yilin Verse asked for.
 */
export function preferenceShowing(id: BundledEditionId): ReadingPreference {
  return {
    script: id === 'wuyingdian-1739-simplified' ? 'simplified' : 'traditional',
    translations: id.startsWith('wuyingdian') ? [] : [editionId(id)],
    commentaries: ['tuan', 'daxiang', 'xiaoxiang', 'wenyan'],
    yilinVerse: true,
  }
}

// --- The pre-overhaul models ------------------------------------------------

/** A JSON object, narrowed from `unknown`. */
function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The value at a path of keys, or a thrown error naming the path. */
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

function numberAt(value: unknown, path: readonly string[]): number {
  const found = valueAt(value, path)
  if (typeof found !== 'number')
    throw new Error(`the legacy ${path.join('.')} is not a number`)
  return found
}

/** Each record of a legacy JSON file, in the file's order. */
function legacyRecords(relative: string): readonly unknown[] {
  const parsed: unknown = JSON.parse(readRepositoryFile(relative))
  if (!isObject(parsed)) throw new Error(`${relative} is not an object`)
  return Object.values(parsed)
}

/** The keys under which every legacy record files each bundled Edition's value. */
const legacySlot: Readonly<Record<BundledEditionId, readonly string[]>> = {
  'wuyingdian-1739': ['Chinese', 'Traditional'],
  'wuyingdian-1739-simplified': ['Chinese', 'Simplified'],
  'legge-1882': ['English', 'Legge'],
  'wilhelm-baynes-1967': ['English', 'WilhelmBaynes'],
}

const linePositions = [1, 2, 3, 4, 5, 6] as const

/** A legacy key's figure: after its letter, bottom-up, 1 yang and 2 yin. */
function polarities(key: string): Polarity[] {
  return Array.from(key.slice(1), (bit) => {
    if (bit === '1') return 'yang'
    if (bit === '2') return 'yin'
    throw new Error(`the legacy key ${key} is malformed`)
  })
}

function hexagramOf(key: string): Hexagram {
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
}

function trigramOf(key: string): Trigram {
  const [one, two, three, ...rest] = polarities(key)
  if (
    one === undefined ||
    two === undefined ||
    three === undefined ||
    rest.length > 0
  )
    throw new Error(`the legacy key ${key} is not a Trigram's`)
  return [one, two, three]
}

const legacyHexagramRecords = legacyRecords(
  'domain/core/src/models/hexagrams.json',
)
const legacyTrigramRecords = legacyRecords(
  'domain/core/src/models/trigrams.json',
)

/** A Hexagram as the legacy models hold it. */
export interface LegacyHexagramFacts {
  readonly hexagram: Hexagram
  readonly name: (id: BundledEditionId) => string
  /** Its place in the received order, as the legacy models number it. */
  readonly wenWang: number
}

export const legacyHexagrams: readonly LegacyHexagramFacts[] =
  legacyHexagramRecords.map((record) => ({
    hexagram: hexagramOf(stringAt(record, ['Key'])),
    name: (id) => stringAt(record, ['Name', ...legacySlot[id]]),
    wenWang: numberAt(record, ['Metadata', 'Order', 'WenWang']),
  }))

/** A Trigram as the legacy models hold it. */
export interface LegacyTrigramFacts {
  readonly trigram: Trigram
  readonly name: (id: BundledEditionId) => string
  readonly imagery: (id: BundledEditionId) => string
}

export const legacyTrigrams: readonly LegacyTrigramFacts[] =
  legacyTrigramRecords.map((record) => ({
    trigram: trigramOf(stringAt(record, ['Key'])),
    name: (id) => stringAt(record, ['Name', ...legacySlot[id]]),
    imagery: (id) => stringAt(record, ['Imagery', ...legacySlot[id]]),
  }))

export const qian: Hexagram = hexagramOf('H111111')
export const kun: Hexagram = hexagramOf('H222222')

/** A Citation and the text an Edition must give for it. */
export interface ExpectedPassage {
  readonly citation: Citation
  readonly text: string
}

/**
 * Every passage the legacy data holds for the Edition, under the Work it
 * belongs to: the Hexagram and Line Statements (zhouyi), the Judgment
 * (tuan), the Hexagram's Imagery (daxiang) and each Line's (xiaoxiang).
 * Legacy fields with no Work are left out.
 */
export function legacyPassages(id: BundledEditionId): ExpectedPassage[] {
  return legacyHexagramRecords.flatMap((record): ExpectedPassage[] => {
    const hexagram = hexagramOf(stringAt(record, ['Key']))
    const text = (...path: string[]): string =>
      stringAt(record, ['Text', ...legacySlot[id], ...path])
    return [
      {
        citation: { work: 'zhouyi', hexagram },
        text: text('Scripture', 'Hexagram'),
      },
      ...linePositions.map(
        (line): ExpectedPassage => ({
          citation: { work: 'zhouyi', hexagram, line },
          text: text('Scripture', 'Lines', `L${line}`),
        }),
      ),
      {
        citation: { work: 'tuan', hexagram },
        text: text('Exegesis', 'Judgment'),
      },
      {
        citation: { work: 'daxiang', hexagram },
        text: text('Exegesis', 'Imagery', 'Hexagram'),
      },
      ...linePositions.map(
        (line): ExpectedPassage => ({
          citation: { work: 'xiaoxiang', hexagram, line },
          text: text('Exegesis', 'Imagery', 'Lines', `L${line}`),
        }),
      ),
    ]
  })
}

// --- The owner's file of All-Moving Statements -----------------------------

const ownerFile = readRepositoryFile('docs/source-texts/yong-jiu-yong-liu.md')

interface Section {
  readonly heading: string
  readonly lines: readonly string[]
}

/** Splits lines at each heading of exactly this level, dropping the preamble. */
function sections(lines: readonly string[], marker: '## ' | '### '): Section[] {
  const found: { heading: string; lines: string[] }[] = []
  for (const line of lines) {
    if (line.startsWith(marker))
      found.push({ heading: line.slice(marker.length), lines: [] })
    else found.at(-1)?.lines.push(line)
  }
  return found
}

const editionSections = sections(ownerFile.split('\n'), '## ')

/** The heading that opens each Edition's part of the owner's file. */
const sectionHeadingStart: Readonly<Record<BundledEditionId, string>> = {
  'wuyingdian-1739': 'Traditional Chinese',
  'wuyingdian-1739-simplified': 'Simplified Chinese',
  'legge-1882': 'Legge',
  'wilhelm-baynes-1967': 'Wilhelm–Baynes',
}

function editionSection(id: BundledEditionId): Section {
  const matching = editionSections.filter(({ heading }) =>
    heading.startsWith(sectionHeadingStart[id]),
  )
  if (matching.length !== 1 || matching[0] === undefined)
    throw new Error(`the owner's file has no single section for ${id}`)
  return matching[0]
}

interface OwnerPassage {
  /** The bullet's label, less any parenthesis: `Line text`, then the xiaoxiang's. */
  readonly label: string
  readonly text: string
}

/**
 * Each bullet `- Label: text` of a passage subsection, in order. A text on
 * the bullet's own line is everything after the colon and its one space; a
 * bullet with nothing after the colon takes the fenced block that follows,
 * its lines joined by newlines, the fences and the last newline left out.
 */
function ownerPassages(lines: readonly string[]): OwnerPassage[] {
  const found: OwnerPassage[] = []
  for (let index = 0; index < lines.length; index++) {
    const bullet = /^- ([^:]+):(.*)$/.exec(lines[index] ?? '')
    if (bullet === null) continue
    const label = (bullet[1] ?? '').replace(/ \(.*\)$/, '')
    const rest = bullet[2] ?? ''
    if (rest.trim() !== '') {
      found.push({ label, text: rest.startsWith(' ') ? rest.slice(1) : rest })
      continue
    }
    let open = index + 1
    while (lines[open] === '') open++
    if (lines[open] !== '```')
      throw new Error(`the bullet "${lines[index]}" has no text and no block`)
    const close = lines.indexOf('```', open + 1)
    if (close === -1)
      throw new Error('a fenced block in the owner file is open')
    found.push({ label, text: lines.slice(open + 1, close).join('\n') })
    index = close
  }
  return found
}

/** The All-Moving Statement and its xiaoxiang for Qian or Kun, as the owner wrote them. */
export interface OwnerAllMoving {
  readonly hexagram: Hexagram
  /** The Hexagram's name in the subsection heading, `<name> · <term>`. */
  readonly hexagramName: string
  /** The All-Moving Statement's term, after the heading's `·`. */
  readonly term: string
  readonly statement: OwnerPassage
  readonly commentary: OwnerPassage
}

/** The owner's Qian and Kun subsections for the Edition, in that order. */
export function ownerAllMoving(
  id: BundledEditionId,
): readonly OwnerAllMoving[] {
  const subsections = sections(editionSection(id).lines, '### ')
  if (subsections.length !== 2)
    throw new Error(`the owner's ${id} section has not two passage subsections`)
  return subsections.map(({ heading, lines }, index) => {
    const [hexagramName, term, ...extra] = heading.split(' · ')
    const passages = ownerPassages(lines)
    const [statement, commentary] = passages
    if (
      hexagramName === undefined ||
      term === undefined ||
      extra.length > 0 ||
      passages.length !== 2 ||
      statement === undefined ||
      commentary === undefined ||
      statement.label !== 'Line text'
    )
      throw new Error(`the owner's subsection "${heading}" is not as read`)
    return {
      hexagram: index === 0 ? qian : kun,
      hexagramName,
      term,
      statement,
      commentary,
    }
  })
}

/**
 * The four texts the owner gives the Edition: each All-Moving Statement, Qian's
 * then Kun's, followed by its xiaoxiang.
 */
export function ownerPassagesFor(id: BundledEditionId): ExpectedPassage[] {
  return ownerAllMoving(id).flatMap(({ hexagram, statement, commentary }) => [
    {
      citation: { work: 'zhouyi', hexagram, line: 'all-moving' },
      text: statement.text,
    },
    {
      citation: { work: 'xiaoxiang', hexagram, line: 'all-moving' },
      text: commentary.text,
    },
  ])
}

function onlyMatch(pattern: RegExp, text: string, what: string): string {
  const found = pattern.exec(text)?.[1]
  if (found === undefined) throw new Error(`no ${what} found`)
  return found
}

/**
 * Wording the Edition records use, read from the library: the Traditional
 * Edition's title from the owner's section heading, the word for Simplified
 * from the owner's note on that Edition, the Traditional Edition's short name
 * from the glossary's Edition, and the xiaoxiang's name from the owner's
 * bullet label.
 */
/** Wording the ruled Edition records share with the library. */
export interface LibraryWording {
  readonly chineseTitle: string
  readonly simplifiedWord: string
  readonly chineseShortName: string
  readonly xiaoxiangName: string
}

function xiaoxiangLabel(): string {
  const [qianPassages] = ownerAllMoving('wuyingdian-1739')
  if (qianPassages === undefined) throw new Error('no owner passages')
  return qianPassages.commentary.label
}

export const libraryWording: LibraryWording = {
  chineseTitle: onlyMatch(
    /^Traditional Chinese: (.+), via /,
    editionSection('wuyingdian-1739').heading,
    "the Traditional Edition's title",
  ),
  simplifiedWord: onlyMatch(
    /independent\s+(\S+)\s+Edition/,
    editionSection('wuyingdian-1739-simplified').lines.join('\n'),
    'the word for Simplified',
  ),
  chineseShortName: onlyMatch(
    /character conversion of the (\S+) text/,
    readRepositoryFile('CONTEXT.md'),
    "the Traditional Edition's short name",
  ),
  xiaoxiangName: xiaoxiangLabel(),
}

/** A Citation's string form, to key a map; any injective form will do. */
export function citationKey(citation: Citation): string {
  switch (citation.work) {
    case 'yilin':
      return `yilin ${citation.standing.join(',')} ${citation.emerging.join(',')}`
    case 'zhouyi':
    case 'xiaoxiang':
      return `${citation.work} ${citation.hexagram.join(',')} ${citation.line ?? ''}`
    case 'tuan':
    case 'daxiang':
    case 'wenyan':
      return `${citation.work} ${citation.hexagram.join(',')}`
  }
}
