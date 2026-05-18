import {
  getEmergingHexagram,
  getHexagramRecord,
  getTrigramRecord,
} from '@hexagram/core/getters'
import type {
  Hexagram,
  Line,
  PartialCastingRecord,
  PartialSplitRecord,
} from '@hexagram/types'

import {
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  HEADING_GREY,
  NORMAL,
  NORMAL_GREY,
  PLACEHOLDER_GREY,
} from './output-palette.js'
import {
  assertLine1ToLine6,
  isLineIndex,
  isMovingLine,
} from './utils-validators.js'

const hexagramLineDiagramMap = {
  6: '━━━ × ━━━',
  7: '━━━━━━━━━',
  8: '━━━   ━━━',
  9: '━━━━○━━━━',
} as const satisfies Record<Line, string>

function getLineColor(line: Line): typeof BOLD_RED | typeof BOLD_WHITE {
  return isMovingLine(line) ? BOLD_RED : BOLD_WHITE
}

// Layout geometry (all values in terminal columns; ANSI codes are zero-width):
//
//   left line = 2 indent + 1 value + 2 sp + 9 diagram + 2 sp + 11 pos = 27 cols
//   gap/arrow = 17×─ + ▶ + 1 space                                    = 19 cols
//   right column starts at                                               col 46
//
// position labels like （六, 6th）: （(2) + CJK(2) + ", "(2) + "6th"(3) + ）(2) = 11 cols
const RIGHT_COLUMN = 46
const MOVING_ARROW = '─────────────────▶ ' // 17×─ + ▶ + 1 space = 19 cols
const STATIC_GAP = '                   ' // 19 spaces

const POSITION_LABELS = {
  1: '（初, 1st）',
  2: '（二, 2nd）',
  3: '（三, 3rd）',
  4: '（四, 4th）',
  5: '（五, 5th）',
  6: '（六, 6th）',
} as const

/**
 * Compute the display width of a string, counting CJK and other fullwidth
 * characters as two columns and everything else as one. Used by
 * `padToColumn` to keep fixed-width diagrams aligned even when they contain
 * Chinese characters or fullwidth punctuation.
 */
function visualWidth(text: string): number {
  let width = 0
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0
    const isFullwidth =
      (codePoint >= 0x1100 && codePoint <= 0x115f) ||
      (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
      (codePoint >= 0x3041 && codePoint <= 0x33ff) ||
      (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
      (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
      (codePoint >= 0xa000 && codePoint <= 0xa4cf) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff01 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    width += isFullwidth ? 2 : 1
  }
  return width
}

// Pad text to targetColumn with at least minGap spaces.
function padToColumn(text: string, targetColumn: number, minGap = 1): string {
  return text + ' '.repeat(Math.max(minGap, targetColumn - visualWidth(text)))
}

export function transformationSection(hexagram: Hexagram): string {
  const movingLines = hexagram.filter(isMovingLine)
  if (movingLines.length === 0)
    return `
${BOLD_GREY}TRANSFORMATION:
${NORMAL}(No transformation)
`.trim()

  const emerging = getEmergingHexagram(hexagram)
  const { Name: standingName, Metadata: standingMetadata } =
    getHexagramRecord(hexagram)
  const { Name: emergingName, Metadata: emergingMetadata } =
    getHexagramRecord(emerging)

  const [
    standingLine1,
    standingLine2,
    standingLine3,
    standingLine4,
    standingLine5,
    standingLine6,
  ] = hexagram
  const [
    emergingLine1,
    emergingLine2,
    emergingLine3,
    emergingLine4,
    emergingLine5,
    emergingLine6,
  ] = emerging

  const pairs: [
    Line,
    Line,
    (typeof POSITION_LABELS)[keyof typeof POSITION_LABELS],
  ][] = [
    [standingLine6, emergingLine6, POSITION_LABELS[6]],
    [standingLine5, emergingLine5, POSITION_LABELS[5]],
    [standingLine4, emergingLine4, POSITION_LABELS[4]],
    [standingLine3, emergingLine3, POSITION_LABELS[3]],
    [standingLine2, emergingLine2, POSITION_LABELS[2]],
    [standingLine1, emergingLine1, POSITION_LABELS[1]],
  ]

  const headerLine =
    `${BOLD_GREY}${padToColumn('  Standing', RIGHT_COLUMN)}${NORMAL}` +
    `${BOLD_GREY}Emerging${NORMAL}`

  const lineRows = pairs
    .map(([standingLine, emergingLine, pos]) => {
      const moving = isMovingLine(standingLine)
      const standingColor = moving ? BOLD_RED : BOLD_WHITE
      const gap = moving ? MOVING_ARROW : STATIC_GAP
      const left = `  ${standingColor}${standingLine}${NORMAL}  ${standingColor}${hexagramLineDiagramMap[standingLine]}${NORMAL}  ${pos}`
      const right = `${BOLD_WHITE}${emergingLine}${NORMAL}  ${BOLD_WHITE}${hexagramLineDiagramMap[emergingLine]}${NORMAL}  ${pos}`
      return `${left}${gap}${right}`
    })
    .join('\n')

  // Footer line 1: #N Chinese（pinyin）  — aligned to RIGHT_COLUMN
  const standingFooter1 = `  #${standingMetadata.Order.WenWang} ${standingName.Chinese.Traditional}（${standingMetadata.Pronunciation.Pinyin}）`
  const emergingFooter1 = `#${emergingMetadata.Order.WenWang} ${emergingName.Chinese.Traditional}（${emergingMetadata.Pronunciation.Pinyin}）`
  const footer1 = `${BOLD_WHITE}${padToColumn(standingFooter1, RIGHT_COLUMN)}${emergingFooter1}${NORMAL}`

  // Footer line 2: English — exactly 6 spaces after standing name
  const standingFooter2 = `  ${standingName.English.WilhelmBaynes}`
  const emergingFooter2 = emergingName.English.WilhelmBaynes
  const footer2 = `${NORMAL_GREY}${padToColumn(standingFooter2, RIGHT_COLUMN, 6)}${emergingFooter2}${NORMAL}`

  return `
${BOLD_GREY}TRANSFORMATION:

${NORMAL}${headerLine}

${lineRows}

${footer1}
${footer2}
`.trim()
}

export function querySection(query: string): string {
  return `${BOLD_GREY}QUERY:

  ${BOLD_WHITE}${query || '(Query not provided)'}`
}

// Pad `text` to `width` visual columns, centred. The styling wraps just the
// text — ANSI codes are zero-width so the cell still aligns.
function castCenter(text: string, width: number, color?: string): string {
  const leftPad = Math.floor((width - text.length) / 2)
  const rightPad = width - text.length - leftPad
  const body = color ? `${color}${text}${NORMAL}` : text
  return `${' '.repeat(leftPad)}${body}${' '.repeat(rightPad)}`
}

// Right-aligned cell: filler, then the (optionally styled) text, then a single
// trailing space — keeps numeric values lined up against the right edge of the
// column with a touch of breathing room from the border.
function castRight(text: string, width: number, color?: string): string {
  const leading = Math.max(0, width - text.length - 1)
  const body = color ? `${color}${text}${NORMAL}` : text
  return `${' '.repeat(leading)}${body} `
}

// The eighteen stalk divisions (十有八變) that produced the hexagram, laid out
// as a single 6×3 table — rows are lines in hexagram order (Line 6 at top,
// matching the diagram sections), columns are the three casts. Each cast shows
// the stalks present before the division (`Stalks`, the round's selectable
// range) alongside the two heaps the stalks were parted into (`Left Heap` =
// the index parted at, `Right Heap` = `Stalks − Left Heap`). The query is not
// repeated here — it has its own section.
//
// Accepts a `PartialCastingRecord` so the same renderer is reused while the
// casting is still being collected by the interactive viewer — `null` cells
// fall back to a `·` placeholder of the same column width, so border characters
// never shift as cells fill in. `CastingRecord` is structurally a subtype, so
// fully-populated callers keep producing byte-identical output (the four
// `tests/fixtures/plain-output-*.txt` byte-identity tests guard this).
export function castingSection(casting: PartialCastingRecord): string {
  const TOP =
    '┌──────┬─────────────────────────────────┬─────────────────────────────────┬─────────────────────────────────┐'
  const SUB =
    '│      ├────────┬───────────┬────────────┼────────┬───────────┬────────────┼────────┬───────────┬────────────┤'
  const MID =
    '├──────┼────────┼───────────┼────────────┼────────┼───────────┼────────────┼────────┼───────────┼────────────┤'
  const BOTTOM =
    '└──────┴────────┴───────────┴────────────┴────────┴───────────┴────────────┴────────┴───────────┴────────────┘'

  // Plain (default-fg) cells leave the structural framing — cast names, the
  // Line/Stalks/Heap headers, and the row labels — calm against the bold-grey
  // Stalks scaffolding and the bold-white heap counts.
  const castRow =
    `│      │${castCenter('1st Cast', 33, HEADING_GREY)}│` +
    `${castCenter('2nd Cast', 33, HEADING_GREY)}│` +
    `${castCenter('3rd Cast', 33, HEADING_GREY)}│`

  const colRow =
    `│${castCenter('Line', 6, HEADING_GREY)}│` +
    `${castCenter('Stalks', 8, HEADING_GREY)}│${castCenter('Left Heap', 11, HEADING_GREY)}│${castCenter('Right Heap', 12, HEADING_GREY)}│` +
    `${castCenter('Stalks', 8, HEADING_GREY)}│${castCenter('Left Heap', 11, HEADING_GREY)}│${castCenter('Right Heap', 12, HEADING_GREY)}│` +
    `${castCenter('Stalks', 8, HEADING_GREY)}│${castCenter('Left Heap', 11, HEADING_GREY)}│${castCenter('Right Heap', 12, HEADING_GREY)}│`

  // All numeric body cells right-align so multi-digit values line up against
  // the right column edge. Pending cells get a `·` in all three sub-columns,
  // dimmed so the eye reads them as "not yet picked".
  const cell = (split: PartialSplitRecord): string =>
    split === null
      ? `${castRight('·', 8, PLACEHOLDER_GREY)}│${castRight('·', 11, PLACEHOLDER_GREY)}│${castRight('·', 12, PLACEHOLDER_GREY)}`
      : `${castRight(String(split.max), 8, NORMAL_GREY)}│${castRight(String(split.pick), 11, BOLD_WHITE)}│${castRight(String(split.max - split.pick), 12, BOLD_WHITE)}`

  // `casting` is a 6-tuple and the literal source `[6, 5, 4, 3, 2, 1]` covers
  // every valid index, but TS can't narrow `lineNumber - 1` to `0..5` from a
  // plain `number`. Index with the tuple-positioned literals instead — each
  // access is provably in-bounds.
  const indexedLines = [
    [6, casting[5]],
    [5, casting[4]],
    [4, casting[3]],
    [3, casting[2]],
    [2, casting[1]],
    [1, casting[0]],
  ] as const
  const dataRows = indexedLines
    .map(([lineNumber, lineCasting]) => {
      const [first, second, third] = lineCasting
      return `│${castRight(String(lineNumber), 6)}│${cell(first)}│${cell(second)}│${cell(third)}│`
    })
    .join('\n')

  return `
${BOLD_GREY}CASTING:${NORMAL}

${TOP}
${castRow}
${SUB}
${colRow}
${MID}
${dataRows}
${BOTTOM}
`.trim()
}

export function noMovingLinesSection(
  hexagram: Hexagram,
  options: { showNoMovingLinesNotice?: boolean } = {},
): string {
  const { showNoMovingLinesNotice = true } = options
  const { Text } = getHexagramRecord(hexagram)
  const notice = showNoMovingLinesNotice ? `${NORMAL}(No moving lines)\n\n` : ''

  return `
${BOLD_GREY}LINES:
${notice}${NORMAL_GREY}[Traditional Chinese]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.Chinese.Traditional.Scripture.Hexagram}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.Chinese.Traditional.Exegesis.Imagery.Hexagram}

${NORMAL_GREY}[Simplified Chinese]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.Chinese.Simplified.Scripture.Hexagram}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.Chinese.Simplified.Exegesis.Imagery.Hexagram}

${NORMAL_GREY}[English, Wilhelm-Baynes]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.English.WilhelmBaynes.Scripture.Hexagram.replaceAll('\n', '\n  ')}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.English.WilhelmBaynes.Exegesis.Imagery.Hexagram.replaceAll('\n', '\n  ')}

${NORMAL_GREY}[English, James Legge]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.English.Legge.Scripture.Hexagram}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.English.Legge.Exegesis.Imagery.Hexagram}
`.trim()
}

function oneMovingLineSection(hexagram: Hexagram): string {
  const movingLineIndex = hexagram.findIndex(isMovingLine)

  if (!isLineIndex(movingLineIndex)) return ''

  const movingLineKey = `L${movingLineIndex + 1}` as const

  assertLine1ToLine6(movingLineKey)

  const { Text } = getHexagramRecord(hexagram)

  return `
${BOLD_GREY}LINES:
${NORMAL}(One moving line)

${NORMAL_GREY}[Traditional Chinese]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.Chinese.Traditional.Scripture.Lines[movingLineKey]}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.Chinese.Traditional.Exegesis.Imagery.Lines[movingLineKey]}

${NORMAL_GREY}[Simplified Chinese]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.Chinese.Simplified.Scripture.Lines[movingLineKey]}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.Chinese.Simplified.Exegesis.Imagery.Lines[movingLineKey]}

${NORMAL_GREY}[English, Wilhelm-Baynes]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.English.WilhelmBaynes.Scripture.Lines[movingLineKey].replaceAll('\n', '\n  ')}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.English.WilhelmBaynes.Exegesis.Imagery.Lines[movingLineKey].replaceAll('\n', '\n  ')}

${NORMAL_GREY}[English, James Legge]

  ${NORMAL}(Scripture)
  ${BOLD_WHITE}${Text.English.Legge.Scripture.Lines[movingLineKey]}

  ${NORMAL}(Exegesis)
  ${BOLD_WHITE}${Text.English.Legge.Exegesis.Imagery.Lines[movingLineKey]}
`.trim()
}

// LINES block for a hexagram: scripture/exegesis keyed off how many moving
// lines it has (none / one / multiple).
export function linesBlock(hexagram: Hexagram): string {
  const movingLines = hexagram.filter(isMovingLine)

  if (movingLines.length === 0) return noMovingLinesSection(hexagram)
  if (movingLines.length === 1) return oneMovingLineSection(hexagram)

  return `${BOLD_GREY}LINES:

${NORMAL}(Multiple moving lines)

${BOLD_WHITE}No available reference scripture or exegesis for multiple moving lines.
${NORMAL}
`
}

function hexagramSection(
  hexagram: Hexagram,
  label: string,
  lineColor: (line: Line) => string,
): string {
  const [line1, line2, line3, line4, line5, line6] = hexagram
  const { Name, Metadata } = getHexagramRecord(hexagram)
  const {
    Imagery: {
      Chinese: { Traditional: UpperTrigramImageryChinese },
      English: { WilhelmBaynes: UpperTrigramImageryEnglish },
    },
  } = getTrigramRecord(Metadata.Trigram.Upper)
  const {
    Imagery: {
      Chinese: { Traditional: LowerTrigramImageryChinese },
      English: { WilhelmBaynes: LowerTrigramImageryEnglish },
    },
  } = getTrigramRecord(Metadata.Trigram.Lower)

  return `
${BOLD_GREY}${label} HEXAGRAM ${Metadata.Order.WenWang}:

${NORMAL}(Line at bottom is first)

  ${lineColor(line6)}${line6}  ${hexagramLineDiagramMap[line6]}  ${NORMAL}${POSITION_LABELS[6]}──┐
  ${lineColor(line5)}${line5}  ${hexagramLineDiagramMap[line5]}  ${NORMAL}${POSITION_LABELS[5]}──┼── ${UpperTrigramImageryChinese}（上卦）
  ${lineColor(line4)}${line4}  ${hexagramLineDiagramMap[line4]}  ${NORMAL}${POSITION_LABELS[4]}──┘   ${UpperTrigramImageryEnglish} (upper trigram)
  ${lineColor(line3)}${line3}  ${hexagramLineDiagramMap[line3]}  ${NORMAL}${POSITION_LABELS[3]}──┐
  ${lineColor(line2)}${line2}  ${hexagramLineDiagramMap[line2]}  ${NORMAL}${POSITION_LABELS[2]}──┼── ${LowerTrigramImageryChinese}（下卦）
  ${lineColor(line1)}${line1}  ${hexagramLineDiagramMap[line1]}  ${NORMAL}${POSITION_LABELS[1]}──┘   ${LowerTrigramImageryEnglish} (lower trigram)

${NORMAL}(First is line at bottom)

  ${lineColor(line1)}${line1}, ${lineColor(line2)}${line2}, ${lineColor(line3)}${line3}, ${lineColor(line4)}${line4}, ${lineColor(line5)}${line5}, ${lineColor(line6)}${line6}

${BOLD_GREY}${label} HEXAGRAM NAME AND PRONUNCIATION:

${NORMAL_GREY}[Traditional Chinese]

  ${BOLD_WHITE}${Name.Chinese.Traditional}（${Metadata.Pronunciation.Zhuyin}）

${NORMAL_GREY}[Simplified Chinese]

  ${BOLD_WHITE}${Name.Chinese.Simplified}（${Metadata.Pronunciation.Pinyin}）

${NORMAL_GREY}[English, Wilhelm-Baynes]

  ${BOLD_WHITE}${Name.English.WilhelmBaynes}

${NORMAL_GREY}[English, James Legge]

  ${BOLD_WHITE}${Name.English.Legge}
`
}

export function standingHexagramSection(hexagram: Hexagram): string {
  return hexagramSection(hexagram, 'STANDING', getLineColor)
}

export function emergingHexagramSection(hexagram: Hexagram): string {
  return hexagramSection(
    getEmergingHexagram(hexagram),
    'EMERGING',
    () => BOLD_WHITE,
  )
}
