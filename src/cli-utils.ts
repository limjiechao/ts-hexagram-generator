import fs from 'node:fs/promises'
import { input } from '@inquirer/prompts'
import { HEXAGRAM_RECORDS } from './models/hexagrams'
import { TRIGRAM_RECORDS } from './models/trigrams'
import type { HexagramKey } from './models/foundation'
import type { GenericHexagramRecord } from './models/hexagram'
import type { GenericTrigramRecord, TrigramKey } from './models/trigram'
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

const HexagramLineToKey = {
  6: 2,
  7: 1,
  8: 2,
  9: 1,
} as const

function getHexagramKey([
  line1,
  line2,
  line3,
  line4,
  line5,
  line6,
]: Hexagram): HexagramKey {
  return `H${HexagramLineToKey[line1]}${HexagramLineToKey[line2]}${HexagramLineToKey[line3]}${HexagramLineToKey[line4]}${HexagramLineToKey[line5]}${HexagramLineToKey[line6]}` as const
}

function getTrigramRecord(trigram: TrigramKey): GenericTrigramRecord {
  return TRIGRAM_RECORDS[trigram]
}

function getHexagramRecord(hexagram: Hexagram): GenericHexagramRecord {
  const hexagramKey = getHexagramKey(hexagram)

  return HEXAGRAM_RECORDS[hexagramKey]
}

const hexagramLineDiagramMap = {
  6: '━━━ × ━━━',
  7: '━━━━━━━━━',
  8: '━━━   ━━━',
  9: '━━━━○━━━━',
} as const satisfies Record<Line, string>

function isMovingLine(line: Line): line is Extract<Line, 6 | 9> {
  return line === 6 || line === 9
}

function getLineColor(line: Line): typeof BOLD_RED | typeof BOLD_WHITE {
  return isMovingLine(line) ? BOLD_RED : BOLD_WHITE
}

type LineIndex = 0 | 1 | 2 | 3 | 4 | 5
function isLineIndex(maybeLineIndex: unknown): maybeLineIndex is LineIndex {
  return (
    typeof maybeLineIndex === 'number' &&
    maybeLineIndex !== -1 &&
    maybeLineIndex >= 0 &&
    maybeLineIndex <= 5
  )
}

type LineKey = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'
function isLine1ToLine6(maybeLineKey: unknown): maybeLineKey is LineKey {
  return (
    typeof maybeLineKey === 'string' &&
    ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].includes(maybeLineKey)
  )
}

function assertLine1ToLine6(maybeLine: unknown): asserts maybeLine is LineKey {
  if (!isLine1ToLine6(maybeLine)) {
    throw new Error('Line is not between 1 and 6')
  }
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

  ${getLineColor(line6)}${line6}  ${hexagramLineDiagramMap[line6]}  ${NORMAL}──┐
  ${getLineColor(line5)}${line5}  ${hexagramLineDiagramMap[line5]}  ${NORMAL}──┼── ${UpperTrigramImageryChinese}【上卦】
  ${getLineColor(line4)}${line4}  ${hexagramLineDiagramMap[line4]}  ${NORMAL}──┘   ${UpperTrigramImageryEnglish} (upper trigram)
  ${getLineColor(line3)}${line3}  ${hexagramLineDiagramMap[line3]}  ${NORMAL}──┐
  ${getLineColor(line2)}${line2}  ${hexagramLineDiagramMap[line2]}  ${NORMAL}──┼── ${LowerTrigramImageryChinese}【下卦】
  ${getLineColor(line1)}${line1}  ${hexagramLineDiagramMap[line1]}  ${NORMAL}──┘   ${LowerTrigramImageryEnglish} (lower trigram)

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

const CONSULTATIONS_OUTPUT_DIRECTORY = './consultations'

export async function logAndSaveConsultationOutput(
  question: string,
  hexagram: Hexagram,
): Promise<void> {
  const consoleOutput = consultationConsoleOutput`Question: ${question}, Hexagram: ${hexagram}`

  console.clear()
  console.info(consoleOutput)

  // eslint-disable-next-line no-control-regex
  const textOutput = consoleOutput.replaceAll(/\u001B\[[0-9;]*m/g, '')

  // Ensure "./consultants" directory exists (create if needed)
  await fs.mkdir(CONSULTATIONS_OUTPUT_DIRECTORY, { recursive: true })
  await fs.writeFile(
    `${CONSULTATIONS_OUTPUT_DIRECTORY}/consultation-${new Date().toISOString()}.txt`,
    textOutput,
    { encoding: 'utf-8' },
  )
}
