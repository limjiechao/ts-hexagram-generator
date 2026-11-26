import type { NextRound } from '@hexagram/oracle/division'
import type { Pick } from '@hexagram/oracle/pick'
import type { Remainder } from '@hexagram/oracle/remainder'
import { describe, expect, it } from 'vitest'

import { choosePick } from '#src/choose-pick.js'

type RemainderGroups = NextRound['remainderGroups']

const remainders: readonly Remainder[] = [1, 2, 3, 4]

/** What is left of a heap counted off in fours: 1 to 4, never 0 (ADR-0023). */
const remainderOf = (stalks: number): Remainder => {
  const left = stalks % 4
  if (left === 1) return 1
  if (left === 2) return 2
  if (left === 3) return 3
  return 4
}

/** A Round's valid Picks, 1 to stalks − 2, grouped by left Remainder. */
const remainderGroupsOf = (stalks: number): RemainderGroups => {
  const groups: Record<Remainder, Pick[]> = { 1: [], 2: [], 3: [], 4: [] }
  for (let pick = 1; pick <= stalks - 2; pick += 1) {
    groups[remainderOf(pick)].push(pick)
  }
  return groups
}

/** The Hung Stalk and both Remainders of a Round. */
const setAsideOf = (stalks: number, pick: Pick): number =>
  1 + remainderOf(pick) + remainderOf(stalks - 1 - pick)

/** An `integerBelow` that returns the given draws in turn and keeps each bound. */
const scripted = (draws: readonly number[]) => {
  const bounds: number[] = []
  const integerBelow = (bound: number): number => {
    bounds.push(bound)
    const draw = draws[bounds.length - 1]
    if (draw === undefined) throw new Error('drew more than was scripted')
    return draw
  }
  return { integerBelow, bounds }
}

/** Exact probabilities, kept as reduced fractions of integers. */
interface Fraction {
  readonly numerator: bigint
  readonly denominator: bigint
}

const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b))

const fraction = (numerator: bigint, denominator: bigint): Fraction => {
  const divisor = gcd(numerator, denominator)
  return { numerator: numerator / divisor, denominator: denominator / divisor }
}

const zero = fraction(0n, 1n)

const add = (a: Fraction, b: Fraction): Fraction =>
  fraction(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  )

const times = (a: Fraction, b: Fraction): Fraction =>
  fraction(a.numerator * b.numerator, a.denominator * b.denominator)

const shown = (value: Fraction) => `${value.numerator}/${value.denominator}`

const accumulate = (
  totals: Map<number, Fraction>,
  key: number,
  weight: Fraction,
) => {
  totals.set(key, add(totals.get(key) ?? zero, weight))
}

/** Thrown to stop `choosePick` at a draw the walk has not yet branched on. */
class UnexploredDrawError extends Error {
  constructor(readonly bound: number) {
    super('a draw not yet explored')
    this.name = 'UnexploredDrawError'
  }
}

/**
 * Every sequence of draws `choosePick` makes in a Round, found by branching
 * on each value 0 to bound − 1 of each draw it asks for, so every pair of
 * draws is reached whatever bounds it asks with. Each sequence is weighted by
 * its probability under uniform draws, and gives its Pick with that weight.
 */
const everyPairOfDraws = (stalks: number) => {
  const groups = remainderGroupsOf(stalks)
  const outcomes: { pick: Pick; weight: Fraction }[] = []
  const walk = (draws: readonly number[], weight: Fraction) => {
    if (draws.length > 2) throw new Error('drew more than twice')
    let asked = 0
    const integerBelow = (bound: number): number => {
      const draw = draws[asked]
      asked += 1
      if (draw !== undefined) return draw
      throw new UnexploredDrawError(bound)
    }
    try {
      outcomes.push({ pick: choosePick(groups, integerBelow), weight })
    } catch (error) {
      if (!(error instanceof UnexploredDrawError)) throw error
      const branches = fraction(1n, BigInt(error.bound))
      for (let draw = 0; draw < error.bound; draw += 1) {
        walk([...draws, draw], times(weight, branches))
      }
    }
  }
  walk([], fraction(1n, 1n))
  return outcomes
}

const firstRounds = [49, 44, 40]

describe('choosePick', () => {
  it("builds each Round's Remainder Groups and Set-asides as ADR-0023 tabulates them", () => {
    const sizes = (stalks: number) =>
      remainders.map((remainder) => remainderGroupsOf(stalks)[remainder].length)
    expect(sizes(49)).toStrictEqual([12, 12, 12, 11])
    expect(sizes(44)).toStrictEqual([11, 11, 10, 10])
    expect(sizes(40)).toStrictEqual([10, 10, 9, 9])

    const setAsides = (stalks: number) =>
      remainders.map((remainder) => [
        ...new Set(
          remainderGroupsOf(stalks)[remainder].map((pick) =>
            setAsideOf(stalks, pick),
          ),
        ),
      ])
    expect(setAsides(49)).toStrictEqual([[5], [5], [5], [9]])
    expect(setAsides(44)).toStrictEqual([[4], [4], [8], [8]])
    expect(setAsides(40)).toStrictEqual([[4], [4], [8], [8]])
  })

  it.each(remainders)(
    "gives draws (%i − 1, i) Pick i of that Remainder's group, in ascending order, in each Round",
    (remainder) => {
      for (const stalks of firstRounds) {
        const groups = remainderGroupsOf(stalks)
        const group = groups[remainder]
        const chosen = group.map((_, at) =>
          choosePick(groups, scripted([remainder - 1, at]).integerBelow),
        )
        expect(chosen).toStrictEqual(group)
      }
    },
  )

  it("draws first with bound 4, then with the chosen group's size, and no more", () => {
    for (const stalks of firstRounds) {
      const groups = remainderGroupsOf(stalks)
      for (const [first, remainder] of remainders.entries()) {
        const { integerBelow, bounds } = scripted([first, 0])
        choosePick(groups, integerBelow)
        expect(bounds).toStrictEqual([4, groups[remainder].length])
      }
    }
  })

  it('gives the first Pick for a second draw of 0 and the last for size − 1', () => {
    const groups = remainderGroupsOf(49)
    expect(choosePick(groups, scripted([0, 0]).integerBelow)).toBe(1)
    expect(choosePick(groups, scripted([0, 11]).integerBelow)).toBe(45)
    expect(choosePick(groups, scripted([3, 0]).integerBelow)).toBe(4)
    expect(choosePick(groups, scripted([3, 10]).integerBelow)).toBe(44)
  })

  it('chooses from groups that each hold one Pick', () => {
    const groups = remainderGroupsOf(6)
    expect(groups).toStrictEqual({ 1: [1], 2: [2], 3: [3], 4: [4] })
    for (const [first, remainder] of remainders.entries()) {
      const { integerBelow, bounds } = scripted([first, 0])
      expect(choosePick(groups, integerBelow)).toBe(remainder)
      expect(bounds).toStrictEqual([4, 1])
    }
  })

  it("gives each Pick of a Round probability ¼ times one over its group's size, by exact enumeration", () => {
    for (const stalks of firstRounds) {
      const groups = remainderGroupsOf(stalks)
      const totals = new Map<number, Fraction>()
      for (const { pick, weight } of everyPairOfDraws(stalks)) {
        accumulate(totals, pick, weight)
      }
      const expected = new Map<number, string>()
      for (const remainder of remainders) {
        const group = groups[remainder]
        for (const pick of group) {
          expected.set(pick, shown(fraction(1n, 4n * BigInt(group.length))))
        }
      }
      const actual = new Map(
        [...totals].map(([pick, weight]) => [pick, shown(weight)]),
      )
      expect(actual).toStrictEqual(expected)
    }
  })

  it('gives Line Values 6, 7, 8 and 9 probabilities exactly 1/16, 5/16, 7/16 and 3/16, by exact enumeration', () => {
    // The stalks left after each Round, with the probability of reaching them.
    let reached = new Map<number, Fraction>([[49, fraction(1n, 1n)]])
    for (let round = 1; round <= 3; round += 1) {
      const next = new Map<number, Fraction>()
      for (const [stalks, probability] of reached) {
        for (const { pick, weight } of everyPairOfDraws(stalks)) {
          accumulate(
            next,
            stalks - setAsideOf(stalks, pick),
            times(probability, weight),
          )
        }
      }
      reached = next
    }

    const lineValues = new Map<number, string>()
    for (const [stalks, probability] of [...reached].toSorted(
      ([a], [b]) => a - b,
    )) {
      lineValues.set(stalks / 4, shown(probability))
    }
    expect(lineValues).toStrictEqual(
      new Map([
        [6, '1/16'],
        [7, '5/16'],
        [8, '7/16'],
        [9, '3/16'],
      ]),
    )
  })
})
