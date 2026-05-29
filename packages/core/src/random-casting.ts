import { randomInt } from 'node:crypto'

import { makeLineGenerator, stalksBeforeParting } from './index'
import {
  assertIsCastingRecord,
  assertIsFourOperationsResult,
  assertIsHexagram,
  assertIsLine,
  assertIsLineGeneratorResult,
  type CastingRecord,
  type Hexagram,
  type Line,
  type LineGeneratorResult,
} from './types.js'

// REF: https://nodejs.org/api/crypto.html#crypto_crypto_randomint_min_max_callback
// `randomInt(min, max)` is exclusive on `max`, so passing `length` here yields
// picks in `[1, length-1]` — matching the inclusive upper bound the interactive
// prompt offers (`interactive-flow.ts` uses `max = unpartedStalks.length - 1`)
// and the `SplitRecord.max` we record alongside each pick.
export const splitStalksRandomly = (unpartedStalks: number[]): number =>
  randomInt(1, unpartedStalks.length)

export const getOneRandomLine = function* (): Generator<
  /* Yield */ LineGeneratorResult,
  /* Return */ void,
  /* Next */ void
> {
  // `max` mirrors the selectable range an interactive prompt would show for
  // this round ("Pick a number from 1 to max"), so RNG castings replay the
  // same way as interactive ones.
  const firstMax = stalksBeforeParting.length - 1
  const firstSplit = splitStalksRandomly(stalksBeforeParting)
  const roundOneArguments = {
    unpartedStalks: stalksBeforeParting,
    suspendedFromNextRound: [],
    partStalksAtIndex: firstSplit,
  }
  const lineGenerator = makeLineGenerator(roundOneArguments)
  const roundOneResults = lineGenerator.next().value

  assertIsFourOperationsResult(roundOneResults)

  const secondMax = roundOneResults.unpartedStalks.length - 1
  const secondSplit = splitStalksRandomly(roundOneResults.unpartedStalks)
  const roundTwoResults = lineGenerator.next(secondSplit).value

  assertIsFourOperationsResult(roundTwoResults)

  const thirdMax = roundTwoResults.unpartedStalks.length - 1
  const thirdSplit = splitStalksRandomly(roundTwoResults.unpartedStalks)
  const roundThreeResults = lineGenerator.next(thirdSplit).value

  assertIsFourOperationsResult(roundThreeResults)

  const { value: line } = lineGenerator.next()

  assertIsLine(line)

  yield {
    line,
    rounds: [roundOneResults, roundTwoResults, roundThreeResults] as const,
    splits: [
      { pick: firstSplit, max: firstMax },
      { pick: secondSplit, max: secondMax },
      { pick: thirdSplit, max: thirdMax },
    ],
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

// Like `generateRandomHexagram`, but also returns the eighteen RNG-chosen
// stalk divisions (the casting record) so the CLI can show how the hexagram
// was cast. `generateRandomHexagram` is kept untouched as the library API.
export const generateRandomConsultation = (): {
  hexagram: Hexagram
  casting: CastingRecord
} => {
  const getHexagram = makeRandomHexagramGenerator()

  const results = Array.from({ length: 6 }, () => getHexagram.next()).map(
    ({ value }) => {
      assertIsLineGeneratorResult(value)

      return value
    },
  )

  const hexagram = results.map((result) => result.line)
  assertIsHexagram(hexagram)

  const casting = results.map((result) => result.splits)
  assertIsCastingRecord(casting)

  return { hexagram, casting }
}

export const generateRandomHexagrams = (
  hexagramCount = 1_000,
): [Line, Line, Line, Line, Line, Line][] =>
  Array.from({ length: hexagramCount }, () => generateRandomHexagram())

const roundToPrecision = (number: number, precision = 4) =>
  number.toPrecision(precision)

export const generateRandomLines = (
  lineCount = 1_000,
): Record<string, string> => {
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
