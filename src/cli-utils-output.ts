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

// Returns the terminal display width of a string, counting CJK/fullwidth chars as 2.
function visualWidth(text: string): number {
  let width = 0
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0
    if (
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
    ) {
      width += 2
    } else {
      width += 1
    }
  }
  return width
}

// Pad text to targetColumn with at least minGap spaces.
function padToColumn(text: string, targetColumn: number, minGap = 1): string {
  return text + ' '.repeat(Math.max(minGap, targetColumn - visualWidth(text)))
}

function transformationSection(hexagram: Hexagram): string {
  const movingLines = hexagram.filter(isMovingLine)
  if (movingLines.length === 0)
    return `
${BOLD_GREY}TRANSFORMATION:
${NORMAL}(No transformation)
`.trim()

  const resultant = getResultantHexagram(hexagram)
  const { Name: originatingName, Metadata: originatingMetadata } =
    getHexagramRecord(hexagram)
  const { Name: resultantName, Metadata: resultantMetadata } =
    getHexagramRecord(resultant)

  const [
    originatingLine1,
    originatingLine2,
    originatingLine3,
    originatingLine4,
    originatingLine5,
    originatingLine6,
  ] = hexagram
  const [
    resultantLine1,
    resultantLine2,
    resultantLine3,
    resultantLine4,
    resultantLine5,
    resultantLine6,
  ] = resultant

  const pairs: [
    Line,
    Line,
    (typeof POSITION_LABELS)[keyof typeof POSITION_LABELS],
  ][] = [
    [originatingLine6, resultantLine6, POSITION_LABELS[6]],
    [originatingLine5, resultantLine5, POSITION_LABELS[5]],
    [originatingLine4, resultantLine4, POSITION_LABELS[4]],
    [originatingLine3, resultantLine3, POSITION_LABELS[3]],
    [originatingLine2, resultantLine2, POSITION_LABELS[2]],
    [originatingLine1, resultantLine1, POSITION_LABELS[1]],
  ]

  const headerLine = `${padToColumn('  Originating', RIGHT_COLUMN)}Resultant`

  const lineRows = pairs
    .map(([originatingLine, resultantLine, pos]) => {
      const moving = isMovingLine(originatingLine)
      const originatingColor = moving ? BOLD_RED : BOLD_WHITE
      const gap = moving ? MOVING_ARROW : STATIC_GAP
      const left = `  ${originatingColor}${originatingLine}${NORMAL}  ${originatingColor}${hexagramLineDiagramMap[originatingLine]}${NORMAL}  ${pos}`
      const right = `${BOLD_WHITE}${resultantLine}${NORMAL}  ${BOLD_WHITE}${hexagramLineDiagramMap[resultantLine]}${NORMAL}  ${pos}`
      return `${left}${gap}${right}`
    })
    .join('\n')

  // Footer line 1: #N Chinese（pinyin）  — aligned to RIGHT_COLUMN
  const originatingFooter1 = `  #${originatingMetadata.Order.WenWang} ${originatingName.Chinese.Traditional}（${originatingMetadata.Pronunciation.Pinyin}）`
  const resultantFooter1 = `#${resultantMetadata.Order.WenWang} ${resultantName.Chinese.Traditional}（${resultantMetadata.Pronunciation.Pinyin}）`
  const footer1 = `${BOLD_WHITE}${padToColumn(originatingFooter1, RIGHT_COLUMN)}${resultantFooter1}${NORMAL}`

  // Footer line 2: English — exactly 6 spaces after originating name
  const originatingFooter2 = `  ${originatingName.English.WilhelmBaynes}`
  const resultantFooter2 = resultantName.English.WilhelmBaynes
  const footer2 = `${NORMAL_GREY}${padToColumn(originatingFooter2, RIGHT_COLUMN, 6)}${resultantFooter2}${NORMAL}`

  return `
${BOLD_GREY}TRANSFORMATION:

${NORMAL}${headerLine}

${lineRows}

${footer1}
${footer2}
`.trim()
}

function querySection(query: string): string {
  return `${BOLD_GREY}QUERY:

  ${BOLD_WHITE}${query || '(Query not provided)'}`
}

function noMovingLinesSection(hexagram: Hexagram): string {
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
function linesBlock(hexagram: Hexagram): string {
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

function originatingHexagramSection(hexagram: Hexagram): string {
  return hexagramSection(hexagram, 'ORIGINATING', getLineColor)
}

function resultantHexagramSection(hexagram: Hexagram): string {
  return hexagramSection(
    getResultantHexagram(hexagram),
    'RESULTANT',
    () => BOLD_WHITE,
  )
}

/**
 * The consultation broken into its presentational sections, each a
 * pre-formatted ANSI string. Consumed both by `consultationConsoleOutput`
 * (the plain composer) and by the Ink tabbed viewer.
 *
 * - `transformation` always renders (it shows "(No transformation)" when
 *   there are no moving lines).
 * - `resultant` is `null` when there are no moving lines — the resultant
 *   hexagram is identical to the originating one, so there is no third tab.
 */
export interface ConsultationSections {
  query: string
  transformation: string
  originating: string
  resultant: string | null
}

/**
 * Build the consultation's presentational sections. This is the
 * content-generation layer shared by the plain output and the Ink viewer.
 */
export function buildConsultationSections(
  query: string,
  hexagram: Hexagram,
): ConsultationSections {
  const movingLines = hexagram.filter(isMovingLine)

  return {
    query: querySection(query),
    transformation: transformationSection(hexagram),
    originating:
      `${originatingHexagramSection(hexagram)}\n\n${linesBlock(hexagram)}`.trim(),
    resultant:
      movingLines.length > 0
        ? `${resultantHexagramSection(hexagram)}\n\n${noMovingLinesSection(getResultantHexagram(hexagram))}`.trim()
        : null,
  }
}

/**
 * Compose the full plain console output. Kept as a thin composer over the
 * same section builders that feed `buildConsultationSections`, so the
 * `--plain` output (and the saved file) stays byte-identical.
 */
export function consultationConsoleOutput(
  query: string,
  hexagram: Hexagram,
): string {
  const movingLines = hexagram.filter(isMovingLine)

  return `

${querySection(query)}

${transformationSection(hexagram)}

${originatingHexagramSection(hexagram)}

${linesBlock(hexagram)}

${movingLines.length > 0 ? resultantHexagramSection(hexagram) : ''}

${movingLines.length > 0 ? noMovingLinesSection(getResultantHexagram(hexagram)) : ''}
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

/**
 * Build the consultation sections and persist the plain output to a
 * timestamped file, without printing anything. Used by the Ink viewer path,
 * which owns the screen — the file is saved up front so the viewer can show
 * the saved path in its footer.
 */
export async function saveConsultation(
  query: string,
  hexagram: Hexagram,
): Promise<{
  sections: ConsultationSections
  savedPath: string
  plainOutput: string
}> {
  const sections = buildConsultationSections(query, hexagram)
  const plainOutput = consultationConsoleOutput(query, hexagram)
  const savedPath = await consultationFileOutput(plainOutput)

  return { sections, savedPath, plainOutput }
}

export async function logAndSaveConsultationOutput(
  question: string,
  hexagram: Hexagram,
): Promise<void> {
  const consoleOutput = consultationConsoleOutput(question, hexagram)

  console.clear()
  console.info(consoleOutput)

  const filePath = await consultationFileOutput(consoleOutput)

  console.info('')
  console.info(`${BOLD_GREY}Consultation output saved to ${filePath}.${NORMAL}`)
  console.info('')
}
