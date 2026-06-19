import { randomInt } from 'node:crypto'

import {
  recordedMaxForUnparted,
  selectablePickMax,
} from './casting-derivation.js'
import { makeLineGenerator, stalksBeforeParting } from './index.js'
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
// Draw a pick in `[1, selectablePickMax(recordedMax)]`, the same range the
// interactive/manual flows offer (see `selectablePickMax` in
// `casting-derivation.ts`): one below the recorded `SplitRecord.recordedMax` so the
// right heap keeps a countable stalk after the suspended one (掛一) and its
// remainder is never 0. `randomInt(min, max)` is exclusive on `max`, so we add
// 1 to include the ceiling. (`length` is never below ~32 across the three
// casts, so the ceiling is always ≥ 1 and `randomInt` has a valid `min < max`.)
export const splitStalksRandomly = (unpartedStalks: number[]): number => {
  const recordedMax = recordedMaxForUnparted(unpartedStalks)
  return randomInt(1, selectablePickMax(recordedMax) + 1)
}

export const getOneRandomLine = function* (): Generator<
  /* Yield */ LineGeneratorResult,
  /* Return */ void,
  /* Next */ void
> {
  // `recordedMax` mirrors the selectable range an interactive prompt would show
  // for this round ("Pick a number from 1 to recordedMax"), so RNG castings
  // replay the same way as interactive ones.
  const firstMax = recordedMaxForUnparted(stalksBeforeParting)
  const firstSplit = splitStalksRandomly(stalksBeforeParting)
  const roundOneArguments = {
    unpartedStalks: stalksBeforeParting,
    suspendedFromNextRound: [],
    partStalksAtIndex: firstSplit,
  }
  const lineGenerator = makeLineGenerator(roundOneArguments)
  const roundOneResults = lineGenerator.next().value

  assertIsFourOperationsResult(roundOneResults)

  const secondMax = recordedMaxForUnparted(roundOneResults.unpartedStalks)
  const secondSplit = splitStalksRandomly(roundOneResults.unpartedStalks)
  const roundTwoResults = lineGenerator.next(secondSplit).value

  assertIsFourOperationsResult(roundTwoResults)

  const thirdMax = recordedMaxForUnparted(roundTwoResults.unpartedStalks)
  const thirdSplit = splitStalksRandomly(roundTwoResults.unpartedStalks)
  const roundThreeResults = lineGenerator.next(thirdSplit).value

  assertIsFourOperationsResult(roundThreeResults)

  const { value: line } = lineGenerator.next()

  assertIsLine(line)

  yield {
    line,
    rounds: [roundOneResults, roundTwoResults, roundThreeResults] as const,
    splits: [
      { pick: firstSplit, recordedMax: firstMax },
      { pick: secondSplit, recordedMax: secondMax },
      { pick: thirdSplit, recordedMax: thirdMax },
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
