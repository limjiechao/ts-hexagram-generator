import type { divide } from '@hexagram/application/divide'
import type { drawAutomaticPick } from '@hexagram/application/draw-automatic-pick'
import type { RandomSource } from '@hexagram/application/random-source'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { composeCli } from '#src/composition-root.js'

/** Casting needs no scripture, so every lookup fails the test if called. */
const unused = () => Promise.reject(new Error('casting looked up scripture'))

const stubCatalogue = () => {
  const scriptureCatalogue = {
    passageTexts: vi.fn(unused),
    hexagramNames: vi.fn(unused),
    editions: vi.fn(unused),
  } satisfies ScriptureCatalogue
  return scriptureCatalogue
}

/** A Random Source that returns the given draws in turn and keeps each bound. */
const scriptedSource = (draws: readonly number[]) => {
  const bounds: number[] = []
  const randomSource = {
    integerBelow: (bound: number): number => {
      bounds.push(bound)
      const draw = draws[bounds.length - 1]
      if (draw === undefined) throw new Error('drew more than was scripted')
      return draw
    },
  } satisfies RandomSource
  return { randomSource, bounds }
}

const compose = (
  randomSource: RandomSource,
  scriptureCatalogue = stubCatalogue(),
) => composeCli({ scriptureCatalogue, randomSource })

/**
 * Casts eighteen Divisions, each by the Pick `drawAutomaticPick` makes, and
 * gives the stalks and Pick of every Round with the Casting's Line Values.
 */
const castAutomatically = (steps: ReturnType<typeof compose>) => {
  const rounds: { stalks: number; pick: number; groupSize: number }[] = []
  let casting = steps.beginCasting()
  let result: ReturnType<typeof divide> | undefined
  for (let round = 1; round <= 18; round += 1) {
    const next = steps.nextRound(casting)
    if (next.outcome !== 'next') throw new Error('the Casting did not replay')
    const { remainderGroups, stalks } = next.round
    const pick = steps.drawAutomaticPick(remainderGroups)
    const group = Object.values(remainderGroups).find((picks) =>
      picks.includes(pick),
    )
    rounds.push({ stalks, pick, groupSize: group?.length ?? 0 })

    result = steps.divide(casting, pick)
    if (result.outcome !== 'divided') {
      throw new Error(`refused: ${JSON.stringify(result.refusal)}`)
    }
    if (result.casting.state === 'partial') casting = result.casting
  }
  const complete = result?.outcome === 'divided' ? result.casting : undefined
  return {
    rounds,
    transformation:
      complete?.state === 'complete' ? complete.transformation : undefined,
  }
}

describe('composeCli for Automatic Division', () => {
  it('gives drawAutomaticPick the signature @hexagram/application gives it, minus its ports', () => {
    type Composed = ReturnType<typeof composeCli>
    expectTypeOf<Composed['drawAutomaticPick']>().toEqualTypeOf<
      (
        remainderGroups: Parameters<typeof drawAutomaticPick>[1],
      ) => ReturnType<typeof drawAutomaticPick>
    >()
    const steps = compose(scriptedSource([]).randomSource)
    expect(typeof steps.drawAutomaticPick).toBe('function')
  })

  it("draws Round 1's Pick through the Random Source it takes: integerBelow(4), then integerBelow(12) for Remainder 1", () => {
    const { randomSource, bounds } = scriptedSource([0, 0])
    const steps = compose(randomSource)
    const next = steps.nextRound(steps.beginCasting())
    if (next.outcome !== 'next') throw new Error('the Casting did not replay')
    expect(steps.drawAutomaticPick(next.round.remainderGroups)).toBe(1)
    expect(bounds).toStrictEqual([4, 12])
  })

  it("draws Round 1's Pick through the Random Source it takes: integerBelow(4), then integerBelow(11) for Remainder 4", () => {
    const { randomSource, bounds } = scriptedSource([3, 10])
    const steps = compose(randomSource)
    const next = steps.nextRound(steps.beginCasting())
    if (next.outcome !== 'next') throw new Error('the Casting did not replay')
    expect(steps.drawAutomaticPick(next.round.remainderGroups)).toBe(44)
    expect(bounds).toStrictEqual([4, 11])
  })

  it('casts a whole Automatic Casting with every draw 0: Pick 1 in every Round, Set-asides 5, 4 and 4, and Old Yang 9 in all six Lines', () => {
    const { randomSource, bounds } = scriptedSource(
      Array.from({ length: 36 }, () => 0),
    )
    const scriptureCatalogue = stubCatalogue()
    const cast = castAutomatically(compose(randomSource, scriptureCatalogue))

    expect(cast.rounds.map(({ pick }) => pick)).toStrictEqual(
      Array.from({ length: 18 }, () => 1),
    )
    // 49 − 5 = 44 and 44 − 4 = 40 stalks; 40 − 4 = 36 leaves 36 ÷ 4 = 9.
    expect(cast.rounds.map(({ stalks }) => stalks)).toStrictEqual(
      Array.from({ length: 6 }, () => [49, 44, 40]).flat(),
    )
    expect(bounds).toStrictEqual(
      Array.from({ length: 6 }, () => [4, 12, 4, 11, 4, 10]).flat(),
    )
    expect(cast.transformation).toStrictEqual([9, 9, 9, 9, 9, 9])
    expect(scriptureCatalogue.passageTexts).not.toHaveBeenCalled()
    expect(scriptureCatalogue.hexagramNames).not.toHaveBeenCalled()
    expect(scriptureCatalogue.editions).not.toHaveBeenCalled()
  })

  it('casts a whole Automatic Casting that reaches Old Yin 6, Young Yang 7, Young Yin 8 and Old Yang 9', () => {
    // Each Line's draws as (Remainder − 1, place in its group), Round by
    // Round, and the Picks and stalks they give by ADR-0023's tables.
    const lines = [
      // Set-asides 9, 8, 8: 49 − 25 = 24, Old Yin 6.
      { draws: [3, 0, 2, 0, 3, 0], picks: [4, 3, 4], stalks: [49, 40, 32] },
      // Set-asides 9, 8, 4: 49 − 21 = 28, Young Yang 7.
      { draws: [3, 0, 2, 0, 0, 0], picks: [4, 3, 1], stalks: [49, 40, 32] },
      // Set-asides 5, 4, 8: 49 − 17 = 32, Young Yin 8.
      { draws: [1, 5, 0, 0, 2, 0], picks: [22, 1, 3], stalks: [49, 44, 40] },
      // Set-asides 5, 4, 4, each the last Pick of its group: Old Yang 9.
      {
        draws: [2, 11, 1, 10, 0, 9],
        picks: [47, 42, 37],
        stalks: [49, 44, 40],
      },
      { draws: [3, 0, 2, 0, 0, 0], picks: [4, 3, 1], stalks: [49, 40, 32] },
      { draws: [3, 0, 2, 0, 3, 0], picks: [4, 3, 4], stalks: [49, 40, 32] },
    ]
    const { randomSource, bounds } = scriptedSource(
      lines.flatMap(({ draws }) => draws),
    )
    const scriptureCatalogue = stubCatalogue()
    const cast = castAutomatically(compose(randomSource, scriptureCatalogue))

    expect(cast.rounds.map(({ pick }) => pick)).toStrictEqual(
      lines.flatMap(({ picks }) => picks),
    )
    expect(cast.rounds.map(({ stalks }) => stalks)).toStrictEqual(
      lines.flatMap(({ stalks }) => stalks),
    )
    expect(bounds).toStrictEqual(
      cast.rounds.flatMap(({ groupSize }) => [4, groupSize]),
    )
    // Round 1 of each Line: 12 Picks for Remainders 1 to 3, 11 for 4.
    expect(bounds.filter((_, at) => at % 6 === 1)).toStrictEqual([
      11, 11, 12, 12, 11, 11,
    ])
    expect(cast.transformation).toStrictEqual([6, 7, 8, 9, 7, 6])
    expect(scriptureCatalogue.passageTexts).not.toHaveBeenCalled()
    expect(scriptureCatalogue.hexagramNames).not.toHaveBeenCalled()
    expect(scriptureCatalogue.editions).not.toHaveBeenCalled()
  })
})
