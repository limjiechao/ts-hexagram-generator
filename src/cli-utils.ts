import { input } from '@inquirer/prompts'
import type { Hexagram, Line } from './types'

export async function getUserQuery(): Promise<string> {
  return await input({
    message: 'Enter your query for the oracle.',
    required: true,
  })
}

export const BOLD_GREY = '\u001B[1;90m'
export const BOLD_WHITE = '\u001B[1;97m'
export const NORMAL = '\u001B[0m'

const hexagramLineDiagramMap = {
  6: '=== X ===',
  7: '=========',
  8: '===   ===',
  9: '====O====',
} as const satisfies Record<Line, string>

function queryOutput(_: TemplateStringsArray, query: string): string {
  return query
    ? `
${BOLD_GREY}Query:

  ${BOLD_WHITE}${query}`
    : ''
}

function consultationOutput(
  _: TemplateStringsArray,
  query: string,
  hexagram: Hexagram,
): string {
  const [lineOne, lineTwo, lineThree, lineFour, lineFive, lineSix] = hexagram

  return `
${queryOutput`Query: ${query}`}

${BOLD_GREY}Hexagram obtained:
${NORMAL}(line at bottom is first)
${BOLD_WHITE}
  ${lineSix}  ${hexagramLineDiagramMap[lineSix]}
  ${lineFive}  ${hexagramLineDiagramMap[lineFive]}
  ${lineFour}  ${hexagramLineDiagramMap[lineFour]}
  ${lineThree}  ${hexagramLineDiagramMap[lineThree]}
  ${lineTwo}  ${hexagramLineDiagramMap[lineTwo]}
  ${lineOne}  ${hexagramLineDiagramMap[lineOne]}
${NORMAL}

${BOLD_GREY}Lines:
${NORMAL}(first is line at bottom)
${BOLD_WHITE}
  ${lineOne}, ${lineTwo}, ${lineThree}, ${lineFour}, ${lineFive}, ${lineSix}
${NORMAL}
`
}

export function logConsultationOutput(
  question: string,
  hexagram: Hexagram,
): void {
  console.clear()
  console.info(consultationOutput`Question: ${question}, Hexagram: ${hexagram}`)
}
