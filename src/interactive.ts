import process from 'node:process'
import { number } from '@inquirer/prompts'
import {
  BOLD_GREY,
  BOLD_WHITE,
  NORMAL,
  printHexagramInformation,
} from './cli-utils'
import {
  assertIsFourOperationsResult,
  assertIsHexagram,
  assertIsLine,
  type Hexagram,
  type LineGeneratorResult,
} from './types'
import { makeLineGenerator, stalksBeforeParting } from '.'

async function getSplitIndex(unpartedStalks: number[]): Promise<number> {
  const min = 1
  const max = unpartedStalks.length - 1

  const result = await number({
    message: `Divide the stalks. Pick a number from ${min} to ${max}.`,
    min,
    max,
    step: 1,
    required: true,
  })

  return result
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
    partStalksAtIndex: firstSplit,
  }

  const lineGenerator = makeLineGenerator(roundOneArguments)
  const roundOneResults = lineGenerator.next().value

  assertIsFourOperationsResult(roundOneResults)

  const secondSplit = await getSplitIndex(roundOneResults.unpartedStalks)
  const roundTwoResults = lineGenerator.next(secondSplit).value

  assertIsFourOperationsResult(roundTwoResults)

  const thirdSplit = await getSplitIndex(roundTwoResults.unpartedStalks)
  const roundThreeResults = lineGenerator.next(thirdSplit).value

  assertIsFourOperationsResult(roundThreeResults)

  const { value: line } = lineGenerator.next()

  assertIsLine(line)

  yield {
    line,
    rounds: [roundOneResults, roundTwoResults, roundThreeResults],
  }
}

async function* makeInteractiveHexagramGenerator() {
  const lines = Array.from<unknown, [number, typeof getOneLineViaInteraction]>(
    { length: 6 },
    (_, index) => [index + 1, getOneLineViaInteraction],
  )

  for (const [index, line] of lines) {
    console.info('')
    console.info(`${BOLD_GREY}Line ${index}:${NORMAL}`)
    yield* line()
  }
}

export async function getHexagramViaInteraction(): Promise<Hexagram> {
  const getHexagram = makeInteractiveHexagramGenerator()
  const maybeHexagram: number[] = []

  for await (const { line } of getHexagram) {
    assertIsLine(line)

    maybeHexagram.push(line)
  }

  assertIsHexagram(maybeHexagram)

  return maybeHexagram
}

// Main CLI function
export async function main(): Promise<void> {
  console.info(BOLD_GREY)
  console.info('Welcome to the Interactive Yijing Hexagram Generator')
  console.info(NORMAL)
  console.info(
    'Divide the stalks 18 times, 3 times per line to get 6 lines to form a hexagram.',
  )
  console.info(BOLD_WHITE)
  console.info('Let your instinct guide the division of the stalks.')
  console.info(NORMAL)

  try {
    const hexagram = await getHexagramViaInteraction()

    printHexagramInformation(hexagram)

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
