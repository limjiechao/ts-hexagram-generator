import process from 'node:process'

import { number } from '@inquirer/prompts'

import { makeLineGenerator, stalksBeforeParting } from '.'
import { logAndSaveConsultationOutput } from './cli-output-file'
import { BOLD_GREY, BOLD_WHITE, NORMAL } from './cli-output-palette'
import { getUserQuery } from './cli-prompts'
import {
  resolveInputMode,
  resolveOutputMode,
  resolveWrapWidth,
} from './cli-utils-mode'
import { runConsultationViewer } from './cli-viewer'
import {
  assertIsFourOperationsResult,
  assertIsLine,
  type CastingRecord,
  type Hexagram,
  type LineGeneratorResult,
  type SplitRecord,
} from './types'

async function getSplitIndex(unpartedStalks: number[]): Promise<SplitRecord> {
  const min = 1
  const max = unpartedStalks.length - 1

  const pick = await number({
    message: `Divide the stalks. Pick a number from ${min} to ${max}.`,
    min,
    max,
    step: 1,
    required: true,
  })

  return { pick, max }
}

/**
 * Drive one line's three-split casting with the Inquirer prompt. Each split
 * advances the per-line `makeLineGenerator` and the returned object captures
 * both the resultant Line and the three SplitRecords for replay.
 */
export async function getOneLineViaInteraction(): Promise<LineGeneratorResult> {
  const firstSplit = await getSplitIndex(stalksBeforeParting)
  const lineGenerator = makeLineGenerator({
    unpartedStalks: stalksBeforeParting,
    suspendedFromNextRound: [],
    partStalksAtIndex: firstSplit.pick,
  })

  const roundOneResults = lineGenerator.next().value
  assertIsFourOperationsResult(roundOneResults)

  const secondSplit = await getSplitIndex(roundOneResults.unpartedStalks)
  const roundTwoResults = lineGenerator.next(secondSplit.pick).value
  assertIsFourOperationsResult(roundTwoResults)

  const thirdSplit = await getSplitIndex(roundTwoResults.unpartedStalks)
  const roundThreeResults = lineGenerator.next(thirdSplit.pick).value
  assertIsFourOperationsResult(roundThreeResults)

  const { value: line } = lineGenerator.next()
  assertIsLine(line)

  return {
    line,
    rounds: [roundOneResults, roundTwoResults, roundThreeResults],
    splits: [firstSplit, secondSplit, thirdSplit],
  }
}

function logLineBanner(lineNumber: 1 | 2 | 3 | 4 | 5 | 6): void {
  console.info(
    `
${BOLD_GREY}Line ${lineNumber}:${NORMAL}
      `.trimEnd(),
  )
}

export async function getHexagramViaInteraction(): Promise<{
  query: string
  hexagram: Hexagram
  casting: CastingRecord
}> {
  const query = await getUserQuery()

  // Six explicit sequential awaits — produces a typed 6-tuple at
  // construction time, so the resulting `hexagram` / `casting` are typed as
  // their exact tuple shapes without any runtime assertion narrowing.
  const castOneLine = (
    lineNumber: 1 | 2 | 3 | 4 | 5 | 6,
  ): Promise<LineGeneratorResult> => {
    logLineBanner(lineNumber)
    return getOneLineViaInteraction()
  }
  const results: readonly [
    LineGeneratorResult,
    LineGeneratorResult,
    LineGeneratorResult,
    LineGeneratorResult,
    LineGeneratorResult,
    LineGeneratorResult,
  ] = [
    await castOneLine(1),
    await castOneLine(2),
    await castOneLine(3),
    await castOneLine(4),
    await castOneLine(5),
    await castOneLine(6),
  ]

  const hexagram: Hexagram = [
    results[0].line,
    results[1].line,
    results[2].line,
    results[3].line,
    results[4].line,
    results[5].line,
  ]
  const casting: CastingRecord = [
    results[0].splits,
    results[1].splits,
    results[2].splits,
    results[3].splits,
    results[4].splits,
    results[5].splits,
  ]

  return { query, hexagram, casting }
}

type Style = typeof BOLD_GREY | typeof BOLD_WHITE | typeof NORMAL

function welcomeOutput(
  strings: TemplateStringsArray,
  prologueStyle: Style,
  textStyle: Style,
  epilogueStyle: Style,
): string {
  const nonEmpty: string[] = []
  for (const part of strings) {
    const trimmed = part.trim()
    if (trimmed) nonEmpty.push(trimmed)
  }
  const [prologue, text, epilogue] = nonEmpty

  return `
${prologueStyle}${prologue}${NORMAL}

${textStyle}${text}${NORMAL}

${epilogueStyle}${epilogue}${NORMAL}
  `.trim()
}

// Main CLI function
export async function main(): Promise<void> {
  console.info(welcomeOutput`
    ${BOLD_GREY}Welcome to the Interactive Yijing Yarrow Stalk Oracle
    ${NORMAL}Divide the stalks 18 times, 3 times per line to get 6 lines to form a hexagram.
    ${BOLD_WHITE}Let your instinct guide the division of the stalks.
  `)

  try {
    if (resolveOutputMode() === 'plain') {
      // Plain mode keeps the Inquirer-driven terminal flow: gather the
      // query and 18 splits at the prompt, then print + save the formatted
      // reading.
      const { query, hexagram, casting } = await getHexagramViaInteraction()
      await logAndSaveConsultationOutput(query, hexagram, casting)
    } else {
      // Ink mode hands the entire flow to the viewer — query box and the
      // 18 split prompts live inside the Casting tab.
      await runConsultationViewer({
        flowKind: 'interactive',
        inputMode: resolveInputMode(),
        maxWrapWidth: resolveWrapWidth(),
      })
    }

    process.exit(0)
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'ExitPromptError' &&
      error.message.startsWith('User has exited the prompt')
    ) {
      process.exit(0)
    }

    console.error('An error occurred:', error)
    process.exit(1)
  }
}
