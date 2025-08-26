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
import { getHexagramRecord, getTrigramRecord } from './getters.js'
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

function consultationConsoleOutput(
  _: TemplateStringsArray,
  query: string,
  hexagram: Hexagram,
): string {
  const [line1, line2, line3, line4, line5, line6] = hexagram
  const movingLines = hexagram.filter((line) => line === 6 || line === 9)
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
${queryOutput`QUERY: ${query}`}

${BOLD_GREY}HEXAGRAM ${Metadata.Order.WenWang}:

${NORMAL}(Line at bottom is first)

  ${getLineColor(line6)}${line6}  ${hexagramLineDiagramMap[line6]}  ${NORMAL}（六, 6th）──┐
  ${getLineColor(line5)}${line5}  ${hexagramLineDiagramMap[line5]}  ${NORMAL}（五, 5th）──┼── ${UpperTrigramImageryChinese}（上卦）
  ${getLineColor(line4)}${line4}  ${hexagramLineDiagramMap[line4]}  ${NORMAL}（四, 4th）──┘   ${UpperTrigramImageryEnglish} (upper trigram)
  ${getLineColor(line3)}${line3}  ${hexagramLineDiagramMap[line3]}  ${NORMAL}（三, 3rd）──┐
  ${getLineColor(line2)}${line2}  ${hexagramLineDiagramMap[line2]}  ${NORMAL}（二, 2nd）──┼── ${LowerTrigramImageryChinese}（下卦）
  ${getLineColor(line1)}${line1}  ${hexagramLineDiagramMap[line1]}  ${NORMAL}（初, 1st）──┘   ${LowerTrigramImageryEnglish} (lower trigram)

${NORMAL}(First is line at bottom)

  ${getLineColor(line1)}${line1}, ${getLineColor(line2)}${line2}, ${getLineColor(line3)}${line3}, ${getLineColor(line4)}${line4}, ${getLineColor(line5)}${line5}, ${getLineColor(line6)}${line6}

${BOLD_GREY}HEXAGRAM NAME AND PRONUNCIATION:

${NORMAL_GREY}[Traditional Chinese]

  ${BOLD_WHITE}${Name.Chinese.Traditional}（${Metadata.Pronunciation.Zhuyin}）

${NORMAL_GREY}[Simplified Chinese]

  ${BOLD_WHITE}${Name.Chinese.Simplified}（${Metadata.Pronunciation.Pinyin}）

${NORMAL_GREY}[English, Wilhelm-Baynes]

  ${BOLD_WHITE}${Name.English.WilhelmBaynes}

${NORMAL_GREY}[English, James Legge]
  
  ${BOLD_WHITE}${Name.English.Legge}

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
`
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CONSULTATIONS_OUTPUT_DIRECTORY = path.join(
  __dirname,
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
  // eslint-disable-next-line no-control-regex
  const textOutput = consoleOutput.replaceAll(/\u001B\[[0-9;]*m/g, '')

  // Ensure output directory exists (create if needed)
  await fs.mkdir(outputDirectory, { recursive: true })

  // Generate filesystem-safe, timezone-aware timestamp
  const timestamp = getFilesystemSafeTimestamp()
  const filePath = path.join(outputDirectory, `consultation-${timestamp}.txt`)

  await fs.writeFile(filePath, textOutput, { encoding: 'utf-8' })

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
