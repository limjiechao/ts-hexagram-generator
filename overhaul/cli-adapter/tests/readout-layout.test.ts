import { stripVTControlCharacters } from 'node:util'

import { consultationReadoutFor } from '@hexagram/application/consultation-readout'
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

const lineRowValue = /[6-9] {2}[━✕○ ]{9} {2}（/gu

/**
 * Where each row of the Transformation tab starts its Emerging cell: the six
 * Line rows (the second Line half of each), the `#N` row and each other
 * Edition's name row, and the two Trigram rows. Each Emerging cell is found
 * after its Standing cell, by the Emerging Hexagram's own names. Rows that
 * break the layout are reported as problems rather than thrown.
 */
function emergingStarts(readout: ConsultationReadout): {
  readonly starts: readonly number[]
  readonly problems: readonly string[]
  readonly widest: number
} {
  const lines = transformationLines(readout)
  const { standing, emerging } = readout.transformation
  const starts: number[] = []
  const problems: string[] = []

  const lineRows = lines.filter(
    (line) => [...line.matchAll(lineRowValue)].length > 0,
  )
  if (lineRows.length !== 6) problems.push(`${lineRows.length} Line rows`)
  for (const row of lineRows) {
    const index = [...row.matchAll(lineRowValue)][1]?.index
    if (index === undefined) {
      problems.push(`no Emerging half: ${row}`)
      continue
    }
    starts.push(columns(row.slice(0, index)))
    if (row.includes('─▶') !== row.slice(0, index).endsWith('▶ '))
      problems.push(`the arrow does not end "▶ " at the Emerging cell: ${row}`)
  }
  const movingRows = lineRows.filter((row) => row.includes('▶'))
  const movingLines = standing.lines.filter((line) => line.change === 'moving')
  if (movingRows.length !== movingLines.length)
    problems.push(
      `${movingRows.length} arrows for ${movingLines.length} Moving Lines`,
    )

  /** The Emerging cell of a row whose Standing cell comes first. */
  const findCell = (
    row: number,
    standingCell: string,
    emergingCell: string,
  ): void => {
    const line = lines[row] ?? ''
    if (!line.trimStart().startsWith(standingCell)) {
      problems.push(`row ${row} does not start with ${standingCell}: ${line}`)
      return
    }
    const after = line.indexOf(standingCell) + standingCell.length
    const at = line.indexOf(emergingCell, after)
    if (at === -1) {
      problems.push(`row ${row} has no ${emergingCell}: ${line}`)
      return
    }
    starts.push(columns(line.slice(0, at)))
  }

  const standingNames = standing.hexagram.names
  const emergingNames = emerging.hexagram.names
  const [standingFirst, ...standingOthers] = standingNames
  const [emergingFirst, ...emergingOthers] = emergingNames
  if (standingFirst === undefined || emergingFirst === undefined)
    throw new Error('no names')
  const standingNumber = `#${standing.hexagram.receivedSequenceNumber} ${standingFirst.name}`
  const numberAt = lines.findIndex((line) =>
    line.trimStart().startsWith(standingNumber),
  )
  if (numberAt === -1) problems.push(`no ${standingNumber} row`)
  else {
    findCell(
      numberAt,
      standingNumber,
      `#${emerging.hexagram.receivedSequenceNumber} ${emergingFirst.name}`,
    )
    for (const [offset, each] of standingOthers.entries()) {
      const row = numberAt + 1 + offset
      for (const other of standingNames)
        if (
          other !== each &&
          other.name !== each.name &&
          (lines[row] ?? '').includes(other.name)
        )
          problems.push(`row ${row} also holds ${other.name}`)
      findCell(row, each.name, emergingOthers[offset]?.name ?? '\u0000')
    }
  }

  for (const position of ['Upper:', 'Lower:'] as const) {
    const row = lines.findIndex((line) => line.trimStart().startsWith(position))
    if (row === -1) problems.push(`no ${position} row`)
    else findCell(row, position, position)
  }

  return {
    starts,
    problems,
    widest: Math.max(...lines.map((line) => columns(line))),
  }
}

/** These Line Values, bottom-up, with the Lines at `positions` made to move: 7 to 9, 8 to 6. */
function moving(
  values: readonly LineValue[],
  positions: readonly number[],
): Transformation {
  const value = (index: number): LineValue => {
    const each = values[index] ?? 7
    if (!positions.includes(index + 1)) return each
    if (each === 7) return 9
    return each === 8 ? 6 : each
  }
  return [value(0), value(1), value(2), value(3), value(4), value(5)]
}

describe('(A) the Transformation tab with Translations', () => {
  for (const [title, shown] of [
    ['Wilhelm–Baynes alone', wilhelmBaynesAlone],
    ['Wilhelm–Baynes then Legge', wilhelmBaynesAndLegge],
  ] as const) {
    it(`${title}: for 蠱, 小畜 and 井 (X之X), every Line row, name row and Trigram row starts its Emerging cell at one column, and each Edition's name has its own row`, async () => {
      const readouts = await stillReadouts([18, 9, 48], shown)
      expect(readouts).toHaveLength(3)
      for (const readout of readouts) {
        const { starts, problems } = emergingStarts(readout)
        expect(problems).toEqual([])
        expect(starts).toHaveLength(
          6 + readout.transformation.standing.hexagram.names.length + 2,
        )
        expect(new Set(starts).size).toBe(1)
        expect(starts[0]).toBeGreaterThanOrEqual(46)
      }
    })

    it(`${title}: 小畜 with Lines 1 and 4 moving: every Line row, moving or still, starts its Emerging cell at the names' and Trigrams' column, each moving row with "▶ " just before it`, async () => {
      const [still] = await stillReadouts([9], shown)
      if (still === undefined) throw new Error('no 小畜')
      const readout = await readoutOf(
        moving(
          still.transformation.standing.lines.map((line) => line.value),
          [1, 4],
        ),
        shown,
      )
      expect(
        readout.transformation.standing.hexagram.receivedSequenceNumber,
      ).toBe(9)
      expect(
        readout.transformation.standing.lines.filter(
          (line) => line.change === 'moving',
        ),
      ).toHaveLength(2)
      const { starts, problems } = emergingStarts(readout)
      expect(problems).toEqual([])
      expect(starts).toHaveLength(
        6 + readout.transformation.standing.hexagram.names.length + 2,
      )
      expect(new Set(starts).size).toBe(1)
      expect(starts[0]).toBeGreaterThanOrEqual(46)
    })

    it(`${title}: across all 64 X之X, the Line, name and Trigram rows share one Emerging column of at least 46, and no Transformation row is wider than 120 columns`, async () => {
      const failures: string[] = []
      for (const transformation of everyStillTransformation) {
        const readout = await readoutOf(transformation, shown)
        const number =
          readout.transformation.standing.hexagram.receivedSequenceNumber
        const { starts, problems, widest } = emergingStarts(readout)
        failures.push(...problems.map((problem) => `#${number}: ${problem}`))
        if (widest > 120) failures.push(`#${number} is ${widest} wide`)
        if (new Set(starts).size !== 1 || (starts[0] ?? 0) < 46)
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

describe('several Translations in the diagram', () => {
  it('Simplified, Wilhelm–Baynes and Legge: the brace rows join the Translations\' imagery with " · "', async () => {
    const [readout] = await stillReadouts([48], simplifiedWithBoth)
    if (readout === undefined) throw new Error('no 井')
    const braces = stripped(plainReadout(readout, { colour: true }))
      .split('\n')
      .filter((line) => line.includes('──┘'))
    for (const [trigram, where] of [
      [readout.standing.figure.upperTrigram, 'upper'],
      [readout.standing.figure.lowerTrigram, 'lower'],
    ] as const) {
      const translations = trigram.slice(1)
      expect(translations.map((each) => each.edition.id)).toEqual([
        'wilhelm-baynes-1967',
        'legge-1882',
      ])
      expect(translations.every((each) => each.imagery !== '')).toBe(true)
      const imagery = translations.map((each) => each.imagery).join(' · ')
      const row = braces.find((line) => line.endsWith(`(${where} trigram)`))
      expect(row?.slice(row.indexOf('──┘'))).toBe(
        `──┘   ${imagery} (${where} trigram)`,
      )
    }
  })
})

describe('(C) a Chinese-only preference', () => {
  it('the Transformation tab holds no line of spaces only: the names row is left out, so the divider follows the #N row', async () => {
    const [readout] = await stillReadouts([48], chineseOnly)
    if (readout === undefined) throw new Error('no 井')
    const lines = transformationLines(readout)
    expect(lines.filter((line) => /^ +$/u.test(line))).toEqual([])
    const numberAt = lines.findIndex((line) =>
      line
        .trimStart()
        .startsWith(
          `#${readout.transformation.standing.hexagram.receivedSequenceNumber} `,
        ),
    )
    expect(numberAt).toBeGreaterThan(0)
    expect((lines[numberAt + 1] ?? '').trim().slice(0, 1)).toBe('─')
  })

  it('the brace rows end "──┘   (upper trigram)" and "──┘   (lower trigram)"', async () => {
    const [readout] = await stillReadouts([48], chineseOnly)
    if (readout === undefined) throw new Error('no 井')
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
