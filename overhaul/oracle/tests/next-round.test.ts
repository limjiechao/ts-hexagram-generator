import { describe, expect, it } from 'vitest'

import type { PartialCasting } from '#src/casting.js'
import {
  emptyCasting,
  nextRound,
  type NextRound,
  type NextRoundResult,
} from '#src/division.js'
import type { Pick } from '#src/pick.js'
import type { Remainder } from '#src/remainder.js'
import type { Round } from '#src/round.js'
import type { SetAside } from '#src/set-aside.js'

/** What is left after counting a heap off in fours: 1 to 4, never 0. */
const remainderOf = (count: number): Remainder => {
  switch (((count % 4) + 4) % 4) {
    case 1:
      return 1
    case 2:
      return 2
    case 3:
      return 3
    case 0:
      return 4
    default:
      throw new Error(`not a whole count: ${count}`)
  }
}

const setAsideOf = (total: number): SetAside => {
  switch (total) {
    case 4:
    case 5:
    case 8:
    case 9:
      return total
    default:
      throw new Error(`not a Set-aside: ${total}`)
  }
}

/**
 * A Round built by hand from its stalks and Pick: the left heap holds the
 * Pick, the Hung Stalk comes from the right heap, each heap is counted off in
 * fours, and the Set-aside is the Hung Stalk with both Remainders.
 */
const roundOf = (stalks: number, pick: Pick): Round => {
  const remainderLeft = remainderOf(pick)
  const remainderRight = remainderOf(stalks - pick - 1)
  return {
    stalks,
    pick,
    remainderLeft,
    remainderRight,
    setAside: setAsideOf(1 + remainderLeft + remainderRight),
  }
}

/** A Round built by hand from a valid Pick (ADR-0023: 1 to stalks − 2). */
const validRoundOf = (stalks: number, pick: Pick): Round => {
  if (!Number.isInteger(pick) || pick < 1 || pick > stalks - 2) {
    throw new Error(`not a valid Pick at ${stalks} stalks: ${pick}`)
  }
  return roundOf(stalks, pick)
}

/** A finished Line built from its three Picks, stalks derived Round by Round. */
const lineOf = (
  first: Pick,
  second: Pick,
  third: Pick,
): readonly [Round, Round, Round] => {
  const one = validRoundOf(49, first)
  const two = validRoundOf(one.stalks - one.setAside, second)
  const three = validRoundOf(two.stalks - two.setAside, third)
  return [one, two, three]
}

/** The whole numbers from `from` to `to`, stepping by `step`. */
const range = (from: number, to: number, step = 1): number[] => {
  const numbers: number[] = []
  for (let n = from; n <= to; n += step) numbers.push(n)
  return numbers
}

/** The Round ADR-0023 and ADR-0038 describe for a Round of `stalks`. */
const expectedNextRound = (stalks: number): NextRound => {
  const validPicks = range(1, stalks - 2)
  return {
    stalks,
    validPicks: { min: 1, max: stalks - 2 },
    remainderGroups: {
      1: validPicks.filter((pick) => remainderOf(pick) === 1),
      2: validPicks.filter((pick) => remainderOf(pick) === 2),
      3: validPicks.filter((pick) => remainderOf(pick) === 3),
      4: validPicks.filter((pick) => remainderOf(pick) === 4),
    },
  }
}

const partial = (rounds: PartialCasting['rounds']): PartialCasting => ({
  state: 'partial',
  rounds,
})

const nextOf = (result: NextRoundResult): NextRound => {
  if (result.outcome !== 'next') {
    throw new Error(`refused: ${JSON.stringify(result.refusal)}`)
  }
  return result.round
}

/** The fields compared, in a fixed order, so key order does not matter. */
const fingerprint = (round: NextRound): string =>
  JSON.stringify([
    round.stalks,
    round.validPicks.min,
    round.validPicks.max,
    round.remainderGroups[1],
    round.remainderGroups[2],
    round.remainderGroups[3],
    round.remainderGroups[4],
  ])

const refusal = (
  line: 1 | 2 | 3 | 4 | 5 | 6,
  round: 1 | 2 | 3,
  stalks: number,
  pick: Pick,
) => ({
  outcome: 'refused',
  refusal: { line, round, stalks, pick, rule: 'replay' },
})

// One Line of Old Yang, as ADR-0023's tables give it: 49 → 5, 44 → 4, 40 → 4.
const oldYangFirst: Round = {
  stalks: 49,
  pick: 21,
  remainderLeft: 1,
  remainderRight: 3,
  setAside: 5,
}
const oldYangSecond: Round = {
  stalks: 44,
  pick: 18,
  remainderLeft: 2,
  remainderRight: 1,
  setAside: 4,
}
const oldYangThird: Round = {
  stalks: 40,
  pick: 17,
  remainderLeft: 1,
  remainderRight: 2,
  setAside: 4,
}
const oldYang = [oldYangFirst, oldYangSecond, oldYangThird] as const

describe('nextRound on the Empty Casting', () => {
  it('gives 49 stalks, valid Picks 1 to 47 and four ascending Remainder Groups', () => {
    expect(nextRound(emptyCasting)).toEqual({
      outcome: 'next',
      round: {
        stalks: 49,
        validPicks: { min: 1, max: 47 },
        remainderGroups: {
          1: range(1, 45, 4),
          2: range(2, 46, 4),
          3: range(3, 47, 4),
          4: range(4, 44, 4),
        },
      },
    })
  })
})

describe('nextRound on a Casting that replays', () => {
  it('gives 44 stalks after a first Round with Set-aside 5', () => {
    expect(nextRound(partial([[oldYangFirst]]))).toEqual({
      outcome: 'next',
      round: expectedNextRound(44),
    })
  })

  it('gives 40 stalks after a second Round with Set-aside 4', () => {
    expect(nextRound(partial([[oldYangFirst, oldYangSecond]]))).toEqual({
      outcome: 'next',
      round: expectedNextRound(40),
    })
  })

  it('gives 49 stalks again once a Line is finished', () => {
    expect(nextRound(partial([oldYang]))).toEqual({
      outcome: 'next',
      round: expectedNextRound(49),
    })
  })

  it.each([
    [49, emptyCasting, [12, 12, 12, 11]],
    [44, partial([[roundOf(49, 1)]]), [11, 11, 10, 10]],
    [40, partial([[roundOf(49, 4)]]), [10, 10, 9, 9]],
  ])(
    'gives the Remainder Group sizes in ADR-0023 at %i stalks',
    (stalks, casting, sizes) => {
      const round = nextOf(nextRound(casting))
      expect(round.stalks).toBe(stalks)
      expect([
        round.remainderGroups[1].length,
        round.remainderGroups[2].length,
        round.remainderGroups[3].length,
        round.remainderGroups[4].length,
      ]).toEqual(sizes)
    },
  )

  it('gives the third Round of the sixth Line after five finished Lines and two Rounds', () => {
    const sixthFirst = roundOf(49, 4)
    const sixthSecond = roundOf(40, 3)
    const casting = partial([
      oldYang,
      lineOf(1, 2, 3),
      lineOf(4, 7, 28),
      lineOf(47, 42, 38),
      lineOf(24, 20, 19),
      [sixthFirst, sixthSecond],
    ])
    expect(sixthSecond.setAside).toBe(8)
    expect(nextRound(casting)).toEqual({
      outcome: 'next',
      round: expectedNextRound(32),
    })
  })

  it('follows every valid Pick of a whole Line to the stalks, valid Picks and Remainder Groups the Picks derive', () => {
    const expectedByStalks = new Map<number, string>()
    const expectedFingerprint = (stalks: number): string => {
      const known = expectedByStalks.get(stalks)
      if (known !== undefined) return known
      const made = fingerprint(expectedNextRound(stalks))
      expectedByStalks.set(stalks, made)
      return made
    }

    const failures: string[] = []
    let paths = 0
    const check = (
      picks: readonly Pick[],
      casting: PartialCasting,
      stalks: number,
    ) => {
      const result = nextRound(casting)
      const actual =
        result.outcome === 'next'
          ? fingerprint(result.round)
          : JSON.stringify(result.refusal)
      if (actual !== expectedFingerprint(stalks) && failures.length < 5) {
        failures.push(`Picks ${picks.join('-')}: ${actual}`)
      }
    }

    for (const first of range(1, 47)) {
      const one = roundOf(49, first)
      const afterOne = one.stalks - one.setAside
      check([first], partial([[one]]), afterOne)
      for (const second of range(1, afterOne - 2)) {
        const two = roundOf(afterOne, second)
        const afterTwo = two.stalks - two.setAside
        check([first, second], partial([[one, two]]), afterTwo)
        for (const third of range(1, afterTwo - 2)) {
          const three = roundOf(afterTwo, third)
          check([first, second, third], partial([[one, two, three]]), 49)
          paths += 1
        }
      }
    }

    expect(failures).toEqual([])
    // The loop itself is checked: 47 first Picks fan out to this many paths.
    expect(paths).toBe(67_996)
  })
})

describe('nextRound on a Casting that does not replay', () => {
  it("refuses a Line's first Round whose stalks are not 49", () => {
    const casting = partial([[{ ...oldYangFirst, stalks: 48 }]])
    expect(nextRound(casting)).toEqual(refusal(1, 1, 48, 21))
  })

  it("refuses a later Line's first Round whose stalks are not 49", () => {
    const casting = partial([oldYang, [roundOf(44, 21)]])
    expect(nextRound(casting)).toEqual(refusal(2, 1, 44, 21))
  })

  it('refuses a second Round whose stalks are not the derived ones', () => {
    const casting = partial([[oldYangFirst, { ...oldYangSecond, stalks: 40 }]])
    expect(nextRound(casting)).toEqual(refusal(1, 2, 40, 18))
  })

  it('refuses a third Round whose stalks are not the derived ones', () => {
    const casting = partial([
      [oldYangFirst, oldYangSecond, { ...oldYangThird, stalks: 36 }],
    ])
    expect(nextRound(casting)).toEqual(refusal(1, 3, 36, 17))
  })

  describe.each([
    [
      'left Remainder',
      (round: Round): Round => ({
        ...round,
        remainderLeft: round.remainderLeft === 4 ? 3 : 4,
      }),
    ],
    [
      'right Remainder',
      (round: Round): Round => ({
        ...round,
        remainderRight: round.remainderRight === 4 ? 3 : 4,
      }),
    ],
    [
      'Set-aside',
      (round: Round): Round => ({
        ...round,
        setAside: round.setAside === 9 ? 5 : 9,
      }),
    ],
  ])('a wrong recorded %s', (_field, spoil) => {
    it("refuses it in a Line's first Round", () => {
      expect(nextRound(partial([[spoil(oldYangFirst)]]))).toEqual(
        refusal(1, 1, 49, 21),
      )
    })

    it('refuses it in a finished Line', () => {
      const casting = partial([
        [oldYangFirst, oldYangSecond, spoil(oldYangThird)],
      ])
      expect(nextRound(casting)).toEqual(refusal(1, 3, 40, 17))
    })

    it("refuses it in the open Line's last Round", () => {
      const casting = partial([
        oldYang,
        lineOf(4, 7, 28),
        [oldYangFirst, spoil(oldYangSecond)],
      ])
      expect(nextRound(casting)).toEqual(refusal(3, 2, 44, 18))
    })
  })

  // Each invalid Pick records the Remainders and Set-aside that counting off
  // in fours would naively give, where it gives any, so only the Pick's
  // validity can refuse it.
  const naiveRound = (stalks: number, pick: Pick): Round =>
    Number.isInteger(pick)
      ? roundOf(stalks, pick)
      : { stalks, pick, remainderLeft: 1, remainderRight: 3, setAside: 5 }

  it.each([
    ['0', 0],
    ['stalks − 1', 48],
    ['stalks', 49],
    ['negative', -1],
    ['not a whole number', 2.5],
    ['NaN', Number.NaN],
  ])(
    'refuses a first Round with Pick %s, carrying the recorded Pick',
    (_name, pick) => {
      expect(nextRound(partial([[naiveRound(49, pick)]]))).toEqual(
        refusal(1, 1, 49, pick),
      )
    },
  )

  it.each([
    ['0', 0],
    ['stalks − 1', 43],
    ['stalks', 44],
    ['negative', -4],
    ['not a whole number', 17.5],
    ['NaN', Number.NaN],
  ])(
    'refuses a later Round with Pick %s, carrying the recorded Pick',
    (_name, pick) => {
      const casting = partial([oldYang, [oldYangFirst, naiveRound(44, pick)]])
      expect(nextRound(casting)).toEqual(refusal(2, 2, 44, pick))
    },
  )

  it('names the earlier of two failing Rounds', () => {
    const casting = partial([
      [oldYangFirst, { ...oldYangSecond, setAside: 8 }, oldYangThird],
      [naiveRound(49, 0)],
    ])
    expect(nextRound(casting)).toEqual(refusal(1, 2, 44, 18))
  })

  it('names the earlier of two failing Rounds in one Line', () => {
    const casting = partial([
      [{ ...oldYangFirst, remainderRight: 4 }, naiveRound(44, 44)],
    ])
    expect(nextRound(casting)).toEqual(refusal(1, 1, 49, 21))
  })
})
