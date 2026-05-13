import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { input } from '@inquirer/prompts'

import { getFilesystemSafeTimestamp } from './cli-utils-dayjs'
import {
  assertLine1ToLine6,
  isLineIndex,
  isMovingLine,
} from './cli-utils-validators.js'
import {
  getHexagramRecord,
  getResultantHexagram,
  getTrigramRecord,
} from './getters.js'
import type { Hexagram, Line } from './types'

export async function getUserQuery(): Promise<string> {
  return await input({
    message: 'Enter your query for the oracle.',
    required: true,
  })
}

export const BOLD_GREY = '\u001B[1;90m'
export const BOLD_WHITE = '\u001B[1;97m'
export const BOLD_RED = '\u001B[1;91m'
export const NORMAL = '\u001B[0m'
export const NORMAL_GREY = '\u001B[90m'

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
//   right col starts at                                                  col 46
//
// pos labels like （六, 6th）: （(2) + CJK(2) + ", "(2) + "6th"(3) + ）(2) = 11 cols
const RIGHT_COL = 46
const MOVING_ARROW = '─────────────────▶ ' // 17×─ + ▶ + 1 space = 19 cols
const STATIC_GAP = '                   ' // 19 spaces

const POS_LABELS = [
  '（六, 6th）',
  '（五, 5th）',
  '（四, 4th）',
  '（三, 3rd）',
  '（二, 2nd）',
  '（初, 1st）',
] as const

// Returns the terminal display width of a string, counting CJK/fullwidth chars as 2.
function visualWidth(str: string): number {
  let width = 0
  for (const char of str) {
    const cp = char.codePointAt(0) ?? 0
    if (
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0x303e) ||
      (cp >= 0x3041 && cp <= 0x33ff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0xa000 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7af) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe10 && cp <= 0xfe6f) ||
      (cp >= 0xff01 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6)
    ) {
      width += 2
    } else {
      width += 1
    }
  }
  return width
}

// Pad str to targetCol with at least minGap spaces.
function padToCol(str: string, targetCol: number, minGap = 1): string {
  return str + ' '.repeat(Math.max(minGap, targetCol - visualWidth(str)))
}

function transformationSectionOutput(hexagram: Hexagram): string {
  const movingLines = hexagram.filter(isMovingLine)
  if (movingLines.length === 0) return ''

  const resultant = getResultantHexagram(hexagram)
  const { Name: origName, Metadata: origMeta } = getHexagramRecord(hexagram)
  const { Name: resName, Metadata: resMeta } = getHexagramRecord(resultant)

  const [o1, o2, o3, o4, o5, o6] = hexagram
  const [r1, r2, r3, r4, r5, r6] = resultant

  const pairs: [Line, Line, (typeof POS_LABELS)[number]][] = [
    [o6, r6, POS_LABELS[0]],
    [o5, r5, POS_LABELS[1]],
    [o4, r4, POS_LABELS[2]],
    [o3, r3, POS_LABELS[3]],
    [o2, r2, POS_LABELS[4]],
    [o1, r1, POS_LABELS[5]],
  ]

  const headerLine = `${padToCol('  Originating', RIGHT_COL)}Resultant`

  const lineRows = pairs
    .map(([origLine, resLine, pos]) => {
      const moving = isMovingLine(origLine)
      const origColor = moving ? BOLD_RED : BOLD_WHITE
      const gap = moving ? MOVING_ARROW : STATIC_GAP
      const left = `  ${origColor}${origLine}${NORMAL}  ${origColor}${hexagramLineDiagramMap[origLine]}${NORMAL}  ${pos}`
      const right = `${BOLD_WHITE}${resLine}${NORMAL}  ${BOLD_WHITE}${hexagramLineDiagramMap[resLine]}${NORMAL}  ${pos}`
      return `${left}${gap}${right}`
    })
    .join('\n')

  // Footer line 1: #N Chinese（pinyin）  — aligned to RIGHT_COL
  const origF1 = `  #${origMeta.Order.WenWang} ${origName.Chinese.Traditional}（${origMeta.Pronunciation.Pinyin}）`
  const resF1 = `#${resMeta.Order.WenWang} ${resName.Chinese.Traditional}（${resMeta.Pronunciation.Pinyin}）`
  const footer1 = `${BOLD_WHITE}${padToCol(origF1, RIGHT_COL)}${resF1}${NORMAL}`

  // Footer line 2: English — exactly 6 spaces after originating name
  const origF2 = `  ${origName.English.WilhelmBaynes}`
  const resF2 = resName.English.WilhelmBaynes
  const footer2 = `${NORMAL_GREY}${padToCol(origF2, RIGHT_COL, 6)}${resF2}${NORMAL}`

  return `
${BOLD_GREY}TRANSFORMATION:

${NORMAL}${headerLine}

${lineRows}

${footer1}
${footer2}
`.trim()
}

function queryOutput(_: TemplateStringsArray, query: string): string {
  return query
    ? `
${BOLD_GREY}QUERY:

  ${BOLD_WHITE}${query}`
    : ''
}

function noMovingLineOutput(
  _: TemplateStringsArray,
  hexagram: Hexagram,
): string {
  const { Text } = getHexagramRecord(hexagram)

  return `
${BOLD_GREY}LINES:
${NORMAL}(No moving lines)

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

function oneMovingLineOutput(
  _: TemplateStringsArray,
  hexagram: Hexagram,
): string {
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

function hexagramOutput(
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

  ${lineColor(line6)}${line6}  ${hexagramLineDiagramMap[line6]}  ${NORMAL}（六, 6th）──┐
  ${lineColor(line5)}${line5}  ${hexagramLineDiagramMap[line5]}  ${NORMAL}（五, 5th）──┼── ${UpperTrigramImageryChinese}（上卦）
  ${lineColor(line4)}${line4}  ${hexagramLineDiagramMap[line4]}  ${NORMAL}（四, 4th）──┘   ${UpperTrigramImageryEnglish} (upper trigram)
  ${lineColor(line3)}${line3}  ${hexagramLineDiagramMap[line3]}  ${NORMAL}（三, 3rd）──┐
  ${lineColor(line2)}${line2}  ${hexagramLineDiagramMap[line2]}  ${NORMAL}（二, 2nd）──┼── ${LowerTrigramImageryChinese}（下卦）
  ${lineColor(line1)}${line1}  ${hexagramLineDiagramMap[line1]}  ${NORMAL}（初, 1st）──┘   ${LowerTrigramImageryEnglish} (lower trigram)

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

function originatingHexagramOutput(
  _: TemplateStringsArray,
  originatingHexagram: Hexagram,
): string {
  return hexagramOutput(originatingHexagram, 'ORIGINATING', getLineColor)
}

function resultantHexagramOutput(
  _: TemplateStringsArray,
  originatingHexagram: Hexagram,
): string {
  return hexagramOutput(
    getResultantHexagram(originatingHexagram),
    'RESULTANT',
    () => BOLD_WHITE,
  )
}

function consultationConsoleOutput(
  _: TemplateStringsArray,
  query: string,
  hexagram: Hexagram,
): string {
  const movingLines = hexagram.filter((line) => line === 6 || line === 9)

  const transformationSection = transformationSectionOutput(hexagram)
  return `
${transformationSection ? `${transformationSection}\n` : ''}
${queryOutput`QUERY: ${query}`}

${originatingHexagramOutput`Originating: ${hexagram}`}

${
  movingLines.length === 0
    ? noMovingLineOutput`(No moving line): ${hexagram}`
    : movingLines.length === 1
      ? oneMovingLineOutput`(One moving line): ${hexagram}`
      : `${BOLD_GREY}LINES:

${NORMAL}(Multiple moving lines)

${BOLD_WHITE}No available reference scripture or exegesis for multiple moving lines.
${NORMAL}
`
}

${movingLines.length > 0 ? resultantHexagramOutput`Resultant: ${hexagram}` : ''}

${movingLines.length > 0 ? noMovingLineOutput`(Resultant hexagram): ${getResultantHexagram(hexagram)}` : ''}
`
}

const currentFilename = fileURLToPath(import.meta.url)
const currentDirname = path.dirname(currentFilename)
const CONSULTATIONS_OUTPUT_DIRECTORY = path.join(
  currentDirname,
  '..',
  'consultations',
)

/**
 * Save consultation output to a timestamped file
 * @param consoleOutput - The formatted console output with ANSI color codes
 * @param outputDirectory - Directory to save the file (optional, defaults to consultations directory)
 * @returns The full path of the created file
 */
export async function consultationFileOutput(
  consoleOutput: string,
  outputDirectory: string = CONSULTATIONS_OUTPUT_DIRECTORY,
): Promise<string> {
  // Strip ANSI color codes for file output
  // oxlint-disable-next-line no-control-regex
  const textOutput = consoleOutput.replaceAll(/\u001B\[[0-9;]*m/g, '')

  // Ensure output directory exists (create if needed)
  await fs.mkdir(outputDirectory, { recursive: true })

  // Generate filesystem-safe, timezone-aware timestamp
  const timestamp = getFilesystemSafeTimestamp()
  const filePath = path.join(outputDirectory, `consultation-${timestamp}.txt`)

  await fs.writeFile(filePath, textOutput, { encoding: 'utf8' })

  return filePath
}

export async function logAndSaveConsultationOutput(
  question: string,
  hexagram: Hexagram,
): Promise<void> {
  const consoleOutput = consultationConsoleOutput`Question: ${question}, Hexagram: ${hexagram}`

  console.clear()
  console.info(consoleOutput)

  const filePath = await consultationFileOutput(consoleOutput)

  console.info('')
  console.info(`${BOLD_GREY}Consultation output saved to ${filePath}.${NORMAL}`)
  console.info('')
}
