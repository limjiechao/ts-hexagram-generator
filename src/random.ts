import { randomInt } from 'node:crypto'
import process from 'node:process'
import { getUserQuery, logAndSaveConsultationOutput } from './cli-utils-output'
import {
  assertIsFourOperationsResult,
  assertIsHexagram,
  assertIsLine,
  assertIsLineGeneratorResult,
  type Hexagram,
  type Line,
  type LineGeneratorResult,
} from './types'
import { makeLineGenerator, stalksBeforeParting } from '.'

// REF: https://nodejs.org/api/crypto.html#crypto_crypto_randomint_min_max_callback
export const splitStalksRandomly = (unpartedStalks: number[]): number =>
  randomInt(1, unpartedStalks.length - 1)

export const getOneRandomLine = function* (): Generator<
  /* Yield */ LineGeneratorResult,
  /* Return */ void,
  /* Next */ void
> {
  const firstSplit = splitStalksRandomly(stalksBeforeParting)
  const roundOneArguments = {
    unpartedStalks: stalksBeforeParting,
    suspendedFromNextRound: [],
    partStalksAtIndex: firstSplit,
  }
  const lineGenerator = makeLineGenerator(roundOneArguments)
  const roundOneResults = lineGenerator.next().value
  // console.log('roundOneResults', roundOneResults)

  assertIsFourOperationsResult(roundOneResults)

  const secondSplit = splitStalksRandomly(roundOneResults.unpartedStalks)
  const roundTwoResults = lineGenerator.next(secondSplit).value
  // console.log('roundTwoResults', roundTwoResults)

  assertIsFourOperationsResult(roundTwoResults)

  const thirdSplit = splitStalksRandomly(roundTwoResults.unpartedStalks)
  const roundThreeResults = lineGenerator.next(thirdSplit).value
  // console.log('roundThreeResults', roundThreeResults)

  assertIsFourOperationsResult(roundThreeResults)

  const { value: line } = lineGenerator.next()
  // console.log('line', line)

  assertIsLine(line)

  yield {
    line,
    rounds: [roundOneResults, roundTwoResults, roundThreeResults] as const,
  }
}

// 十有八變而成卦。
export const makeRandomHexagramGenerator = function* (): Generator<
  /* Yield */ LineGeneratorResult,
  /* Return */ void,
  /* Next */ void
> {
  const lines = Array.from({ length: 6 }, () => getOneRandomLine)

  for (const line of lines) {
    yield* line()
  }
}
export const generateRandomHexagram = (): Hexagram => {
  const getHexagram = makeRandomHexagramGenerator()

  const hexagram = Array.from({ length: 6 }, () => getHexagram.next()).map(
    ({ value }) => {
      assertIsLineGeneratorResult(value)

      return value.line
    },
  )

  assertIsHexagram(hexagram)

  return hexagram
}

export const generateRandomHexagrams = (
  hexagramCount = 1_000,
): [Line, Line, Line, Line, Line, Line][] =>
  Array.from({ length: hexagramCount }, () => generateRandomHexagram()).map(
    () => generateRandomHexagram(),
  )

export const generateRandomLines = (
  lineCount = 1_000,
): Record<string, string> => {
  const roundToPrecision = (number: number, precision = 4) =>
    number.toPrecision(precision)
  const runs = Array.from({ length: lineCount }, () => getOneRandomLine).map(
    (getOneLine) => getOneLine().next(),
  )

  const breakdown = Object.fromEntries(
    [5, 6, 7, 8, 9, 10].map((value) => {
      const count = runs.filter((result) => result.value?.line === value).length

      return [
        `Line ${value}`,
        `${roundToPrecision((count / lineCount) * 100)}%`,
      ]
    }),
  )

  return breakdown
}

export async function main(): Promise<void> {
  try {
    const query = await getUserQuery()
    const hexagram = generateRandomHexagram()

    await logAndSaveConsultationOutput(query, hexagram)

    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
