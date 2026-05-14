import process from 'node:process'

import { number } from '@inquirer/prompts'

import { makeLineGenerator, stalksBeforeParting } from '.'
import { resolveOutputMode, resolveWrapWidth } from './cli-utils-mode'
import {
  BOLD_GREY,
  BOLD_WHITE,
  getUserQuery,
  logAndSaveConsultationOutput,
  NORMAL,
  saveConsultation,
} from './cli-utils-output'
import { runConsultationViewer } from './cli-viewer'
import {
  assertIsCastingRecord,
  assertIsFourOperationsResult,
  assertIsHexagram,
  assertIsLine,
  type CastingRecord,
  type Hexagram,
  type LineCasting,
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

export async function* getOneLineViaInteraction(): AsyncGenerator<
  /* Yield */ LineGeneratorResult,
  /* Return */ void,
  /* Next */ void
> {
  const firstSplit = await getSplitIndex(stalksBeforeParting)
  const roundOneArguments = {
    unpartedStalks: stalksBeforeParting,
    suspendedFromNextRound: [],
    partStalksAtIndex: firstSplit.pick,
  }

  const lineGenerator = makeLineGenerator(roundOneArguments)
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

  yield {
    line,
    rounds: [roundOneResults, roundTwoResults, roundThreeResults],
    splits: [firstSplit, secondSplit, thirdSplit],
  }
}

async function* makeInteractiveHexagramGenerator() {
  const lines = Array.from<unknown, [number, typeof getOneLineViaInteraction]>(
    { length: 6 },
    (_, index) => [index + 1, getOneLineViaInteraction],
  )

  for (const [index, line] of lines) {
    console.info(
      `
${BOLD_GREY}Line ${index}:${NORMAL}
      `.trimEnd(),
    )
    yield* line()
  }
}

export async function getHexagramViaInteraction(): Promise<{
  query: string
  hexagram: Hexagram
  casting: CastingRecord
}> {
  const query = await getUserQuery()

  const getHexagram = makeInteractiveHexagramGenerator()
  const maybeHexagram: number[] = []
  const maybeCasting: LineCasting[] = []

  for await (const { line, splits } of getHexagram) {
    assertIsLine(line)

    maybeHexagram.push(line)
    maybeCasting.push(splits)
  }

  assertIsHexagram(maybeHexagram)
  assertIsCastingRecord(maybeCasting)

  return { query, hexagram: maybeHexagram, casting: maybeCasting }
}

type Style = typeof BOLD_GREY | typeof BOLD_WHITE | typeof NORMAL

function welcomeOutput(
  strings: TemplateStringsArray,
  prologueStyle: Style,
  textStyle: Style,
  epilogueStyle: Style,
): string {
  const [prologue, text, epilogue] = strings.reduce<string[]>(
    (acc, string) => (string.trim() ? [...acc, string.trim()] : acc),
    [],
  )

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
    const { query, hexagram, casting } = await getHexagramViaInteraction()

    if (resolveOutputMode() === 'plain') {
      await logAndSaveConsultationOutput(query, hexagram, casting)
    } else {
      const { sections, savedPath } = await saveConsultation(
        query,
        hexagram,
        casting,
      )
      await runConsultationViewer(sections, savedPath, resolveWrapWidth())
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
