import { stripVTControlCharacters } from 'node:util'

import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import type { Consultation } from '@hexagram/consultation-journal/consultation'
import { isConsultationId } from '@hexagram/consultation-journal/consultation-id'
import { isDay } from '@hexagram/consultation-journal/divined-at'
import { isQuery } from '@hexagram/consultation-journal/query'
import type { LineValue } from '@hexagram/oracle/line-value'
import type { Transformation } from '@hexagram/oracle/transformation'
import type { ConsultationReadout } from '@hexagram/presentation/readout'
import { isEditionId } from '@hexagram/scripture-catalogue/edition-id'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import { describe, expect, it } from 'vitest'

import { plainReadout } from '#src/readout/plain-readout.js'
import { consultationReadoutFor } from '#src/readout/readout-for.js'

// The plain Readout's layout under Reading Preferences other than the
// default, which the byte fixtures do not reach: the Transformation tab's
// columns with several Translations, how several Editions' names share a
// line, and a Chinese-only preference. Every name is read from the bundled
// Catalogue at run time; every Query and date is invented.

const ports = { scriptureCatalogue: bundledScriptureCatalogue }

function preference(
  script: ReadingPreference['script'],
  translations: readonly string[],
): ReadingPreference {
  return {
    script,
    translations: translations.filter(isEditionId),
    commentaries: ['daxiang', 'xiaoxiang'],
    yilinVerse: false,
  }
}

const wilhelmBaynesAlone = preference('traditional', ['wilhelm-baynes-1967'])
const wilhelmBaynesAndLegge = preference('traditional', [
  'wilhelm-baynes-1967',
  'legge-1882',
])
const simplifiedWithBoth = preference('simplified', [
  'wilhelm-baynes-1967',
  'legge-1882',
])
const chineseOnly = preference('traditional', [])

/** A Recorded Consultation of this Transformation, dated to the day. */
function recorded(transformation: Transformation): Consultation {
  const id = '01M6E6AHA84T7V2M5N6P0R1S2P'
  const text = 'Should the mill at Greyfen Hold be sold?'
  const divinedAt = { precision: 'day', year: 2026, month: 11, day: 3 } as const
  if (!isConsultationId(id) || !isQuery(text) || !isDay(divinedAt))
    throw new Error('invalid invented Consultation')
  return { origin: 'recorded', id, query: text, divinedAt, transformation }
}

/** X之X for each of the 64 Figures: 7 for a yang Line, 8 for a yin one. */
const everyStillTransformation: readonly Transformation[] = Array.from(
  { length: 64 },
  (_, bits) => {
    const value = (line: number): LineValue => ((bits >> line) & 1 ? 7 : 8)
    return [value(0), value(1), value(2), value(3), value(4), value(5)]
  },
)

function readoutOf(
  transformation: Transformation,
  shown: ReadingPreference,
): Promise<ConsultationReadout> {
  return consultationReadoutFor(ports, recorded(transformation), shown)
}

/** The X之X Readouts of these Received Sequence Numbers. */
async function stillReadouts(
  numbers: readonly number[],
  shown: ReadingPreference,
): Promise<ConsultationReadout[]> {
  const readouts = await Promise.all(
    everyStillTransformation.map((each) => readoutOf(each, shown)),
  )
  return readouts.filter((readout) =>
    numbers.includes(
      readout.transformation.standing.hexagram.receivedSequenceNumber,
    ),
  )
}

const stripped = (text: string): string => stripVTControlCharacters(text)

// The East Asian Wide and Fullwidth blocks the bundled names and labels use.
const wideRanges: readonly (readonly [number, number])[] = [
  [0x11_00, 0x11_5f],
  [0x2e_80, 0xa4_cf],
  [0xac_00, 0xd7_a3],
  [0xf9_00, 0xfa_ff],
  [0xfe_30, 0xfe_4f],
  [0xff_00, 0xff_60],
  [0xff_e0, 0xff_e6],
  [0x2_00_00, 0x3_ff_fd],
]

const isWide = (character: string): boolean => {
  const point = character.codePointAt(0) ?? 0
  return wideRanges.some(([low, high]) => point >= low && point <= high)
}

/** Terminal columns: CJK and fullwidth characters take two. */
function columns(text: string): number {
  let count = 0
  for (const character of text) count += isWide(character) ? 2 : 1
  return count
}

/** The plain Transformation section's lines, without escape codes. */
function transformationLines(readout: ConsultationReadout): string[] {
  const lines = stripped(plainReadout(readout, { colour: true })).split('\n')
  const start = lines.indexOf('TRANSFORMATION:')
  const end = lines.findIndex((line) => line.startsWith('STANDING HEXAGRAM'))
  if (start === -1 || end < start) throw new Error('no Transformation section')
  return lines.slice(start + 1, end)
}

/** The column at which `cell` last starts in `line`, the Emerging side for X之X. */
function emergingColumn(line: string, cell: string): number {
  const at = line.lastIndexOf(cell)
  if (at <= 0) throw new Error(`no ${cell} in: ${line}`)
  return columns(line.slice(0, at))
}

const lineRowValue = /[6-9] {2}[━✕○ ]{9} {2}（/gu

describe('(A) the Transformation tab with Translations', () => {
  for (const [title, shown] of [
    ['Wilhelm–Baynes alone', wilhelmBaynesAlone],
    ['Wilhelm–Baynes then Legge', wilhelmBaynesAndLegge],
  ] as const) {
    it(`${title}: for 蠱, 小畜 and 井 (X之X), every Line row, name row and Trigram row starts its Emerging cell at one column, and each Edition's name has its own row`, async () => {
      const readouts = await stillReadouts([18, 9, 48], shown)
      expect(readouts).toHaveLength(3)
      for (const readout of readouts) {
        const lines = transformationLines(readout)
        const { hexagram } = readout.transformation.standing
        const named = hexagram.names
        const starts: number[] = []

        const lineRows = lines.filter(
          (line) =>
            line.includes('th）') ||
            line.includes('st）') ||
            line.includes('nd）') ||
            line.includes('rd）'),
        )
        expect(lineRows).toHaveLength(6)
        for (const row of lineRows) {
          const matches = [...row.matchAll(lineRowValue)]
          expect(matches).toHaveLength(2)
          starts.push(columns(row.slice(0, matches[1]?.index)))
        }

        const [first, ...others] = named
        if (first === undefined) throw new Error('no names')
        const numberRow = `#${hexagram.receivedSequenceNumber} ${first.name}`
        const numberAt = lines.findIndex((line) =>
          line.trimStart().startsWith(numberRow),
        )
        expect(numberAt).toBeGreaterThan(0)
        starts.push(emergingColumn(lines[numberAt] ?? '', numberRow))
        for (const [offset, each] of others.entries()) {
          const row = lines[numberAt + 1 + offset] ?? ''
          expect(row.trimStart().startsWith(each.name)).toBe(true)
          for (const other of named)
            if (other !== each) expect(row).not.toContain(other.name)
          starts.push(emergingColumn(row, each.name))
        }

        for (const position of ['Upper:', 'Lower:']) {
          const row = lines.find((line) =>
            line.trimStart().startsWith(position),
          )
          if (row === undefined) throw new Error(`no ${position} row`)
          starts.push(emergingColumn(row, position))
        }

        expect(new Set(starts).size).toBe(1)
        expect(starts[0]).toBeGreaterThanOrEqual(46)
      }
    })

    it(`${title}: across all 64 X之X, the Emerging cells align and no Transformation row is wider than 120 columns`, async () => {
      const failures: string[] = []
      for (const transformation of everyStillTransformation) {
        const readout = await readoutOf(transformation, shown)
        const lines = transformationLines(readout)
        const number =
          readout.transformation.standing.hexagram.receivedSequenceNumber
        const tooWide = lines.filter((line) => columns(line) > 120)
        if (tooWide.length > 0)
          failures.push(`#${number} wider than 120: ${tooWide[0]}`)
        const starts = [
          ...lines
            .map((line) => [...line.matchAll(lineRowValue)][1]?.index)
            .flatMap((index, row) =>
              index === undefined
                ? []
                : [columns((lines[row] ?? '').slice(0, index))],
            ),
          ...['Upper:', 'Lower:'].map((position) =>
            emergingColumn(
              lines.find((line) => line.trimStart().startsWith(position)) ?? '',
              position,
            ),
          ),
        ]
        if (new Set(starts).size !== 1)
          failures.push(`#${number} columns ${starts.join(',')}`)
      }
      expect(failures).toEqual([])
    })
  }
})

describe('(B) several Editions on one line', () => {
  it('Simplified, Wilhelm–Baynes and Legge: a Trigram row gives the Chinese name, a space, then the Translations joined by " · "', async () => {
    const [readout] = await stillReadouts([48], simplifiedWithBoth)
    if (readout === undefined) throw new Error('no 井')
    const upper = readout.transformation.standing.upperTrigram
    const [chinese, ...translations] = upper
    if (chinese === undefined) throw new Error('no Trigram names')
    expect(translations.map((each) => each.edition.id)).toEqual([
      'wilhelm-baynes-1967',
      'legge-1882',
    ])
    const cell = `Upper: ${chinese.name} ${translations.map((each) => each.name).join(' · ')}`
    const row = transformationLines(readout).find((line) =>
      line.trimStart().startsWith('Upper:'),
    )
    expect(row?.trimStart().slice(0, cell.length)).toBe(cell)
    expect(row?.trimEnd().slice(-cell.length)).toBe(cell)
  })

  it('Simplified, Wilhelm–Baynes and Legge: a related-Hexagram row gives the Chinese name, " / ", then the Translations joined by " · "', async () => {
    const [readout] = await stillReadouts([48], simplifiedWithBoth)
    if (readout === undefined) throw new Error('no 井')
    const nuclear = readout.standing.nuclearHexagram
    const [chinese, ...translations] = nuclear.names
    if (chinese === undefined) throw new Error('no names')
    expect(translations).toHaveLength(2)
    const cell = `#${nuclear.receivedSequenceNumber} ${chinese.name} / ${translations.map((each) => each.name).join(' · ')}`
    const row = stripped(plainReadout(readout, { colour: true }))
      .split('\n')
      .find((line) => line.includes('Nuclear Hexagram:'))
    expect(row?.trimEnd().slice(-cell.length)).toBe(cell)
  })
})

describe('(C) a Chinese-only preference', () => {
  it('the Transformation tab holds no line of spaces only, and the brace rows end "──┘   (upper trigram)" and "──┘   (lower trigram)"', async () => {
    const [readout] = await stillReadouts([48], chineseOnly)
    if (readout === undefined) throw new Error('no 井')
    const lines = transformationLines(readout)
    expect(lines.filter((line) => /^ +$/u.test(line))).toEqual([])
    const all = stripped(plainReadout(readout, { colour: true })).split('\n')
    const braces = all.filter((line) => line.includes('──┘'))
    expect(braces.length).toBeGreaterThan(0)
    for (const line of braces)
      expect(line).toMatch(/──┘ {3}\((upper|lower) trigram\)$/u)
    expect(braces.some((line) => line.endsWith('──┘   (upper trigram)'))).toBe(
      true,
    )
    expect(braces.some((line) => line.endsWith('──┘   (lower trigram)'))).toBe(
      true,
    )
  })
})
