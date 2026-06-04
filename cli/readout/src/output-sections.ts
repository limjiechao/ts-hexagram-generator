import {
  getEmergingHexagram,
  getHexagramRecord,
  getTrigramRecord,
} from '@hexagram/core/getters'
import { isMovingLine } from '@hexagram/core/line-semantics'
import type { Hexagram, Line } from '@hexagram/core/types'
import {
  assertLine1ToLine6,
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  isLineIndex,
  NORMAL,
  NORMAL_GREY,
} from '@hexagram/viewer-core'

import { padToColumn } from './layout-utils.js'

// `✕` U+2715 — matches the home banner's moving-yin glyph so every render
// surface (banner, casting readout, history readout, playground) speaks one
// glyph vocabulary. Saved consultation `.md` files containing the older `×`
// U+00D7 character self-heal on next load via the history-app's byte-compare
// rerender.
const hexagramLineDiagramMap = {
  6: '━━━ ✕ ━━━',
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
// position labels like （上, 6th）: （(2) + CJK(2) + ", "(2) + "6th"(3) + ）(2) = 11 cols
const RIGHT_COLUMN = 46
/** 19-col inter-column connector for moving lines: 17×─ + ▶ + 1 space. */
export const MOVING_ARROW = '─────────────────▶ '
/** 19-col blank gap for static lines (matches `MOVING_ARROW` width). */
export const STATIC_GAP = '                   '

/** Bottom-first (`1`..`6`) fullwidth position labels for hexagram diagrams. */
export const POSITION_LABELS = {
  1: '（初, 1st）',
  2: '（二, 2nd）',
  3: '（三, 3rd）',
  4: '（四, 4th）',
  5: '（五, 5th）',
  6: '（上, 6th）',
} as const

function capitalizeFirst(text: string): string {
  if (text.length === 0) return text
  return `${text[0]!.toUpperCase()}${text.slice(1)}`
}

// Width of the bar block on each side (value(1) + 2sp + bar(9) + 2sp +
// pos(11) = 25), reused as the divider width under the hexagram identity
// names so the dashes line up with the bar diagrams above them. Mirrors
// `IDENTITY_DIVIDER_WIDTH` in playground-display.ts.
const TRIGRAM_DIVIDER_WIDTH = 25

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

  // Headers are left-flush with the bar-block column on each side (col 2
  // for standing, col 46 for emerging) so the labels line up with the line
  // value digits below them — matches the playground's left-aligned header.
  const headerLine =
    `${BOLD_GREY}${padToColumn('  Standing Hexagram', RIGHT_COLUMN)}${NORMAL}` +
    `${BOLD_GREY}Emerging Hexagram${NORMAL}`

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

  // Footer rows below the diagram, paired side-by-side:
  //   row 1: #N Chinese（pinyin） — aligned to RIGHT_COLUMN
  //   row 2: Wilhelm-Baynes English name — ≥6-col gap after standing
  //   row 3: a 25-col `─` divider per side, lining up with the bar block
  //   row 4: `Upper: <Chinese> <Pinyin> (<English imagery>)` per side
  //   row 5: `Lower: <Chinese> <Pinyin> (<English imagery>)` per side
  // Row format for rows 4/5 mirrors the playground's identity stack so a
  // future shared composer can render either surface from one builder.
  const standingFooter1 = `  #${standingMetadata.Order.WenWang} ${standingName.Chinese.Traditional}（${standingMetadata.Pronunciation.Pinyin}）`
  const emergingFooter1 = `#${emergingMetadata.Order.WenWang} ${emergingName.Chinese.Traditional}（${emergingMetadata.Pronunciation.Pinyin}）`
  const footer1 = `${BOLD_WHITE}${padToColumn(standingFooter1, RIGHT_COLUMN)}${emergingFooter1}${NORMAL}`

  const standingFooter2 = `  ${standingName.English.WilhelmBaynes}`
  const emergingFooter2 = emergingName.English.WilhelmBaynes
  const footer2 = `${NORMAL_GREY}${padToColumn(standingFooter2, RIGHT_COLUMN, 6)}${emergingFooter2}${NORMAL}`

  const dividerRow = (() => {
    const dashes = '─'.repeat(TRIGRAM_DIVIDER_WIDTH)
    return `${NORMAL_GREY}${padToColumn(`  ${dashes}`, RIGHT_COLUMN)}${dashes}${NORMAL}`
  })()

  const trigramRow = (position: 'Upper' | 'Lower'): string => {
    const standingTrigram = getTrigramRecord(
      position === 'Upper'
        ? standingMetadata.Trigram.Upper
        : standingMetadata.Trigram.Lower,
    )
    const emergingTrigram = getTrigramRecord(
      position === 'Upper'
        ? emergingMetadata.Trigram.Upper
        : emergingMetadata.Trigram.Lower,
    )
    const cell = (trigram: ReturnType<typeof getTrigramRecord>): string =>
      `${position}: ${trigram.Name.Chinese.Traditional} ${capitalizeFirst(
        String(trigram.Metadata.Pronunciation.Pinyin),
      )} (${capitalizeFirst(String(trigram.Imagery.English.WilhelmBaynes))})`
    const left = `  ${cell(standingTrigram)}`
    const right = cell(emergingTrigram)
    return `${NORMAL_GREY}${padToColumn(left, RIGHT_COLUMN)}${right}${NORMAL}`
  }
  const upperRow = trigramRow('Upper')
  const lowerRow = trigramRow('Lower')

  return `
${BOLD_GREY}TRANSFORMATION:

${NORMAL}${headerLine}

${lineRows}

${footer1}
${footer2}
${dividerRow}
${upperRow}
${lowerRow}
`.trim()
}

export function querySection(query: string): string {
  return `${BOLD_GREY}QUERY:

  ${BOLD_WHITE}${query || '(Query not provided)'}`
}

export function hexagramTextSection(hexagram: Hexagram): string {
  const { Text } = getHexagramRecord(hexagram)

  return `
${BOLD_GREY}HEXAGRAM:
${NORMAL_GREY}[Traditional Chinese]

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

// LINES block for a hexagram: per-line scripture/exegesis when one moving
// line is present, or a "no reference available" notice for multiple. With
// zero moving lines the block is empty — the HEXAGRAM-level scripture is
// rendered separately via `hexagramTextSection`.
export function linesBlock(hexagram: Hexagram): string {
  const movingLines = hexagram.filter(isMovingLine)

  if (movingLines.length === 0) return ''
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
