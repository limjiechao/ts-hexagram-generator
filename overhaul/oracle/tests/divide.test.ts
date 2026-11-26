import { describe, expect, it } from 'vitest'

import type { PartialCasting } from '#src/casting.js'
import { isCompleteCasting } from '#src/complete-casting.js'
import {
  divide,
  emptyCasting,
  nextRound,
  type DivisionResult,
} from '#src/division.js'
import type { LinePosition } from '#src/line-position.js'
import type { LineValue } from '#src/line-value.js'
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

/** The whole numbers from `from` to `to`. */
const range = (from: number, to: number): number[] => {
  const numbers: number[] = []
  for (let n = from; n <= to; n += 1) numbers.push(n)
  return numbers
}

/**
 * The Rounds a sequence of Picks makes, grouped by Line, three per Line:
 * 49 stalks at each Line's start, otherwise the previous Round's stalks minus
 * its Set-aside.
 */
const roundsOf = (picks: readonly Pick[]): Round[][] => {
  const lines: Round[][] = []
  let stalks = 49
  for (const pick of picks) {
    const open = lines.at(-1)
    const line = open !== undefined && open.length < 3 ? open : []
    if (line !== open) {
      lines.push(line)
      stalks = 49
    }
    const round = validRoundOf(stalks, pick)
    line.push(round)
    stalks = round.stalks - round.setAside
  }
  return lines
}

/** A Line Value as ADR-0023 gives it: 49 less the three Set-asides, over 4. */
const lineValueOf = (line: readonly Round[]): number =>
  (49 - line.reduce((sum, round) => sum + round.setAside, 0)) / 4

/** The result `divide` should give for the Casting these Picks make. */
const dividedTo = (picks: readonly Pick[]) => {
  const rounds = roundsOf(picks)
  return {
    outcome: 'divided',
    casting:
      picks.length === 18
        ? { state: 'complete', rounds, transformation: rounds.map(lineValueOf) }
        : { state: 'partial', rounds },
  }
}

/** Divides from the Empty Casting by each Pick in turn, refusing nothing. */
const castBy = (picks: readonly Pick[]): PartialCasting => {
  let casting = emptyCasting
  for (const pick of picks) {
    const result = divide(casting, pick)
    if (result.outcome !== 'divided') {
      throw new Error(`refused: ${JSON.stringify(result.refusal)}`)
    }
    if (result.casting.state !== 'partial') {
      throw new Error(`complete before Pick ${pick} of ${picks.join('-')}`)
    }
    casting = result.casting
  }
  return casting
}

/** The last Division of a whole sequence of Picks from the Empty Casting. */
const divideAll = (picks: readonly Pick[]): DivisionResult => {
  const last = picks.at(-1)
  if (last === undefined) throw new Error('no Picks')
  return divide(castBy(picks.slice(0, -1)), last)
}

const transformationOf = (result: DivisionResult): readonly LineValue[] => {
  if (result.outcome !== 'divided' || result.casting.state !== 'complete') {
    throw new Error(`not complete: ${JSON.stringify(result)}`)
  }
  return result.casting.transformation
}

const partial = (rounds: PartialCasting['rounds']): PartialCasting => ({
  state: 'partial',
  rounds,
})

const refused = (
  line: LinePosition,
  round: 1 | 2 | 3,
  stalks: number,
  pick: Pick,
  rule: 'valid-pick' | 'replay',
) => ({ outcome: 'refused', refusal: { line, round, stalks, pick, rule } })

// Picks that give each Line Value, two or three ways, checked against
// ADR-0023's tables: Old Yang 5-4-4, Young Yin one large Set-aside, Young Yang
// two, Old Yin 9-8-8.
const picksFor: Record<LineValue, readonly (readonly [Pick, Pick, Pick])[]> = {
  6: [
    [4, 3, 3],
    [24, 20, 19],
  ],
  7: [
    [4, 3, 1],
    [1, 3, 3],
  ],
  8: [
    [21, 18, 3],
    [4, 1, 1],
  ],
  9: [
    [21, 18, 17],
    [1, 1, 1],
    [47, 42, 38],
  ],
}

/** Seventeen Picks that pass through stalk counts 49, 44, 40, 36 and 32. */
const seventeen: readonly Pick[] = [
  [21, 18, 17],
  [4, 3, 3],
  [4, 3, 1],
  [21, 18, 3],
  [24, 20, 19],
  [47, 42],
].flat()

/** Every place a Division can be taken: Line 1 Round 1 to Line 6 Round 3. */
const places = range(0, 17).map((index) => ({
  line: Math.floor(index / 3) + 1,
  round: (index % 3) + 1,
  before: seventeen.slice(0, index),
}))

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

/** Five finished Lines and two Rounds of the sixth, as literals. */
const seventeenRounds = (
  first: Round,
  last: Round,
): PartialCasting['rounds'] => [
  [first, oldYangSecond, oldYangThird],
  oldYang,
  oldYang,
  oldYang,
  oldYang,
  [oldYangFirst, last],
]

describe('divide at every place in a Casting', () => {
  it.each(places.slice(0, 17).map((place) => [place.line, place.round, place]))(
    'takes every valid Pick at Line %i Round %i to the partial Casting of the rebuilt Rounds and the new one',
    (_line, _round, { before }) => {
      const casting = castBy(before)
      const round = roundsOf(before).at(-1)?.at(-1)
      const stalks =
        round === undefined || before.length % 3 === 0
          ? 49
          : round.stalks - round.setAside
      const picks = range(1, stalks - 2)
      expect(picks.map((pick) => divide(casting, pick))).toStrictEqual(
        picks.map((pick) => dividedTo([...before, pick])),
      )
    },
  )

  it('takes every valid Pick of the eighteenth Round to the complete Casting and its Transformation', () => {
    const casting = castBy(seventeen)
    const picks = range(1, 38)
    expect(picks.map((pick) => divide(casting, pick))).toStrictEqual(
      picks.map((pick) => dividedTo([...seventeen, pick])),
    )
  })

  it('records the stalks, Remainders and Set-aside ADR-0023 gives for a first Round', () => {
    expect(divide(emptyCasting, 21)).toStrictEqual({
      outcome: 'divided',
      casting: { state: 'partial', rounds: [[oldYangFirst]] },
    })
    expect(divide(emptyCasting, 4)).toStrictEqual({
      outcome: 'divided',
      casting: {
        state: 'partial',
        rounds: [
          [
            {
              stalks: 49,
              pick: 4,
              remainderLeft: 4,
              remainderRight: 4,
              setAside: 9,
            },
          ],
        ],
      },
    })
  })

  it("takes a second Round's stalks as the first Round's stalks less its Set-aside", () => {
    const first = roundOf(49, 4)
    expect(divide(partial([[first]]), 3)).toStrictEqual({
      outcome: 'divided',
      casting: {
        state: 'partial',
        rounds: [
          [
            first,
            {
              stalks: 40,
              pick: 3,
              remainderLeft: 3,
              remainderRight: 4,
              setAside: 8,
            },
          ],
        ],
      },
    })
  })

  it('opens a new Line of 49 stalks with the new Round alone', () => {
    expect(divide(partial([oldYang]), 21)).toStrictEqual({
      outcome: 'divided',
      casting: { state: 'partial', rounds: [oldYang, [oldYangFirst]] },
    })
  })

  it('leaves the incoming Casting unchanged', () => {
    const casting = partial([oldYang, [oldYangFirst, oldYangSecond]])
    const before = structuredClone(casting)
    divide(casting, 17)
    divide(casting, 0)
    expect(casting).toStrictEqual(before)
  })
})

describe('divide at the bounds of the valid Picks', () => {
  const awaited = [
    { name: 'the first Round', line: 1, round: 1, stalks: 49, before: [] },
    { name: 'a second Round', line: 1, round: 2, stalks: 44, before: [21] },
    {
      name: "a later Line's third Round",
      line: 3,
      round: 3,
      stalks: 32,
      before: seventeen.slice(0, 8),
    },
    {
      name: 'the eighteenth Round',
      line: 6,
      round: 3,
      stalks: 40,
      before: seventeen,
    },
  ] satisfies readonly {
    name: string
    line: LinePosition
    round: 1 | 2 | 3
    stalks: number
    before: readonly Pick[]
  }[]

  describe.each(awaited)('at $name', ({ line, round, stalks, before }) => {
    it.each([
      ['0', 0],
      ['stalks − 1', stalks - 1],
      ['stalks', stalks],
      ['−1', -1],
      ['2.5', 2.5],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['−Infinity', Number.NEGATIVE_INFINITY],
    ])(
      "refuses Pick %s with the awaited Round's place and the Pick passed in",
      (_name, pick) => {
        expect(divide(castBy(before), pick)).toStrictEqual(
          refused(line, round, stalks, pick, 'valid-pick'),
        )
      },
    )

    it.each([
      ['1', 1],
      ['stalks − 2', stalks - 2],
    ])('takes Pick %s', (_name, pick) => {
      expect(divide(castBy(before), pick)).toStrictEqual(
        dividedTo([...before, pick]),
      )
    })
  })
})

describe('divide on a Casting that does not replay', () => {
  const spoiled: readonly [string, PartialCasting][] = [
    [
      'wrong stalks in its first Round',
      partial([[{ ...oldYangFirst, stalks: 48 }]]),
    ],
    [
      'a wrong Set-aside in a finished Line',
      partial([
        [oldYangFirst, { ...oldYangSecond, setAside: 8 }, oldYangThird],
      ]),
    ],
    [
      'an invalid recorded Pick in its open Line',
      partial([oldYang, [oldYangFirst, roundOf(44, 43)]]),
    ],
    [
      'a wrong left Remainder in the last of seventeen Rounds',
      partial(
        seventeenRounds(oldYangFirst, { ...oldYangSecond, remainderLeft: 4 }),
      ),
    ],
  ]

  it.each(spoiled)(
    'gives the replay refusal nextRound gives for %s',
    (_name, casting) => {
      const result = divide(casting, 1)
      expect(result).toStrictEqual(nextRound(casting))
      expect(result.outcome === 'refused' && result.refusal.rule).toBe('replay')
    },
  )

  it('names the failing Round with its recorded stalks and Pick', () => {
    const casting = partial([oldYang, [{ ...oldYangFirst, remainderRight: 4 }]])
    expect(divide(casting, 18)).toStrictEqual(refused(2, 1, 49, 21, 'replay'))
  })

  it('gives the replay refusal, not the valid-pick one, when the Pick is also invalid', () => {
    const casting = partial([[oldYangFirst, { ...oldYangSecond, stalks: 40 }]])
    expect(divide(casting, 0)).toStrictEqual(refused(1, 2, 40, 18, 'replay'))
    expect(divide(casting, Number.NaN)).toStrictEqual(
      refused(1, 2, 40, 18, 'replay'),
    )
  })
})

describe('divide drops extra keys on recorded Rounds', () => {
  it('returns the rebuilt Rounds in a partial Casting', () => {
    const noted = { ...oldYangSecond, note: 'an invented note' }
    const casting = partial([[oldYangFirst, noted]])
    expect(divide(casting, 17)).toStrictEqual({
      outcome: 'divided',
      casting: { state: 'partial', rounds: [oldYang] },
    })
  })

  it('returns the rebuilt Rounds in the complete Casting', () => {
    const notedFirst = { ...oldYangFirst, note: 'an invented note' }
    const notedLast = { ...oldYangSecond, extra: 0 }
    const casting = partial(seventeenRounds(notedFirst, notedLast))
    expect(divide(casting, 17)).toStrictEqual({
      outcome: 'divided',
      casting: {
        state: 'complete',
        rounds: [oldYang, oldYang, oldYang, oldYang, oldYang, oldYang],
        transformation: [9, 9, 9, 9, 9, 9],
      },
    })
  })
})

describe('divide at the eighteenth Round', () => {
  it('gives a complete Casting of six Lines that passes isCompleteCasting', () => {
    const result = divideAll([...seventeen, 38])
    if (result.outcome !== 'divided') throw new Error('refused')
    expect(result.casting.state).toBe('complete')
    expect(result.casting.rounds).toHaveLength(6)
    expect(isCompleteCasting(result.casting)).toBe(true)
  })

  it('leaves the incoming seventeen Rounds unchanged', () => {
    const casting = castBy(seventeen)
    const before = structuredClone(casting)
    divide(casting, 38)
    expect(casting).toStrictEqual(before)
  })

  it('gives the Transformation bottom-up, Line Position 1 at index 0', () => {
    const picks = [
      [4, 3, 3],
      [4, 3, 1],
      [21, 18, 3],
      [21, 18, 17],
      [4, 1, 1],
      [1, 3, 3],
    ].flat()
    expect(transformationOf(divideAll(picks))).toStrictEqual([6, 7, 8, 9, 8, 7])
  })
})

describe('Line Values', () => {
  // Every path of Set-asides through one Line: 1 or 4 picks Set-aside 5 or 9
  // from 49 stalks, and 1 or 3 picks 4 or 8 from 44, 40, 36 or 32.
  const paths: readonly [LineValue, string, readonly [Pick, Pick, Pick]][] = [
    [9, '5-4-4', [1, 1, 1]],
    [8, '9-4-4', [4, 1, 1]],
    [8, '5-8-4', [1, 3, 1]],
    [8, '5-4-8', [1, 1, 3]],
    [7, '9-8-4', [4, 3, 1]],
    [7, '9-4-8', [4, 1, 3]],
    [7, '5-8-8', [1, 3, 3]],
    [6, '9-8-8', [4, 3, 3]],
  ]

  it.each(paths)(
    'gives %i for Set-asides %s at every Line Position',
    (value, setAsides, line) => {
      const filler = [21, 18, 17]
      for (const position of range(0, 5)) {
        const picks = range(0, 5).flatMap((at) =>
          at === position ? line : filler,
        )
        const result = divideAll(picks)
        const rounds =
          result.outcome === 'divided' ? result.casting.rounds[position] : []
        expect(rounds?.map((round) => round.setAside).join('-')).toBe(setAsides)
        expect(transformationOf(result)[position]).toBe(value)
      }
    },
  )

  it('reaches all 4,096 Transformations by choosing Picks per Line', () => {
    const values: readonly LineValue[] = [6, 7, 8, 9]
    const reached = new Set<string>()
    const failures: string[] = []
    for (let code = 0; code < 4096; code += 1) {
      const expected = range(0, 5).map(
        (position) => values[Math.floor(code / 4 ** position) % 4] ?? 6,
      )
      const picks = expected.flatMap((value, position) => {
        const choices = picksFor[value]
        return choices[(code + position) % choices.length] ?? []
      })
      const actual = transformationOf(divideAll(picks))
      reached.add(actual.join(''))
      if (actual.join('') !== expected.join('') && failures.length < 5) {
        failures.push(`${expected.join('')}: got ${actual.join('')}`)
      }
    }
    expect(failures).toStrictEqual([])
    expect(reached.size).toBe(4096)
  })
})
