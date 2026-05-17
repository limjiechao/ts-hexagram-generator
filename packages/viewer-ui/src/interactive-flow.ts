import { makeLineGenerator, stalksBeforeParting } from '@hexagram/core'
import {
  assertIsFourOperationsResult,
  assertIsLine,
  type CastingRecord,
  type Hexagram,
  type LineGeneratorResult,
  type SplitRecord,
} from '@hexagram/types'
import { number } from '@inquirer/prompts'

import { BOLD_GREY, NORMAL } from './output-palette.js'
import { getUserQuery } from './prompts.js'

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
