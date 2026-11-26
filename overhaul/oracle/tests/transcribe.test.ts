import { describe, expect, it } from 'vitest'

import type { PartialCasting } from '#src/casting.js'
import {
  divide,
  emptyCasting,
  nextRound,
  transcribe,
  type DivisionResult,
  type DivisionRule,
  type Transcription,
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
 * A Round built by hand from its stalks and a valid Pick (ADR-0023: 1 to
 * stalks − 2): the left heap holds the Pick, the Hung Stalk comes from the
 * right heap, each heap is counted off in fours, and the Set-aside is the Hung
 * Stalk with both Remainders.
 */
const roundOf = (stalks: number, pick: Pick): Round => {
  if (!Number.isInteger(pick) || pick < 1 || pick > stalks - 2) {
    throw new Error(`not a valid Pick at ${stalks} stalks: ${pick}`)
  }
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

/** The Transcription a person reads off the heaps a valid Pick leaves. */
const transcriptionOf = (stalks: number, pick: Pick): Transcription => {
  const { remainderLeft, remainderRight } = roundOf(stalks, pick)
  return {
    pilesLeft: (pick - remainderLeft) / 4,
    remainderLeft,
    pilesRight: (stalks - pick - 1 - remainderRight) / 4,
    remainderRight,
  }
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
    const round = roundOf(stalks, pick)
    line.push(round)
    stalks = round.stalks - round.setAside
  }
  return lines
}

/** A Line Value as ADR-0023 gives it: 49 less the three Set-asides, over 4. */
const lineValueOf = (line: readonly Round[]): number =>
  (49 - line.reduce((sum, round) => sum + round.setAside, 0)) / 4

/** The Division the Casting these Picks make should be given. */
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

/** The stalks the Round after these Picks starts from. */
const stalksAfter = (picks: readonly Pick[]): number => {
  const round = roundsOf(picks).at(-1)?.at(-1)
  return round === undefined || picks.length % 3 === 0
    ? 49
    : round.stalks - round.setAside
}

/** Transcribes from the Empty Casting the heaps each Pick leaves. */
const castBy = (picks: readonly Pick[]): PartialCasting => {
  let casting = emptyCasting
  for (const [index, pick] of picks.entries()) {
    const stalks = stalksAfter(picks.slice(0, index))
    const result = transcribe(casting, transcriptionOf(stalks, pick))
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

/** A refusal as compared with toStrictEqual, its place given as numbers. */
const refused = (
  line: number,
  round: number,
  stalks: number,
  pick: Pick | undefined,
  rule: DivisionRule,
) => ({ outcome: 'refused', refusal: { line, round, stalks, pick, rule } })

const heaps = (
  pilesLeft: number | undefined,
  remainderLeft: number | undefined,
  pilesRight: number | undefined,
  remainderRight: number | undefined,
): Transcription => ({ pilesLeft, remainderLeft, pilesRight, remainderRight })

/** A Transcription with every field absent. */
const blank: Transcription = {
  pilesLeft: undefined,
  remainderLeft: undefined,
  pilesRight: undefined,
  remainderRight: undefined,
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
const places = range(0, 17).map((index) => {
  const before = seventeen.slice(0, index)
  return {
    line: Math.floor(index / 3) + 1,
    round: (index % 3) + 1,
    before,
    stalks: stalksAfter(before),
  }
})

const wholeFromZero = (count: number | undefined) =>
  count !== undefined && Number.isInteger(count) && count >= 0

const isRemainder = (count: number) => [1, 2, 3, 4].includes(count)

/**
 * The rule ADR-0043 says a Transcription breaks, its checks run in order,
 * first failure wins; `undefined` when it passes all four.
 */
const ruleBroken = (
  stalks: number,
  firstRound: boolean,
  { pilesLeft, remainderLeft, pilesRight, remainderRight }: Transcription,
): DivisionRule | undefined => {
  if (
    !wholeFromZero(pilesLeft) ||
    !wholeFromZero(pilesRight) ||
    remainderLeft === undefined ||
    remainderRight === undefined ||
    pilesLeft === undefined ||
    pilesRight === undefined
  ) {
    return 'complete'
  }
  if (!isRemainder(remainderLeft) || !isRemainder(remainderRight)) {
    return 'remainders'
  }
  const setAside = 1 + remainderLeft + remainderRight
  if (!(firstRound ? [5, 9] : [4, 8]).includes(setAside)) return 'set-aside'
  const counted =
    4 * pilesLeft + remainderLeft + 4 * pilesRight + remainderRight + 1
  return counted === stalks ? undefined : 'conservation'
}

/** Every Transcription with pile counts 0 to 12 and Remainders 0 to 5. */
const grid: readonly Transcription[] = range(0, 12).flatMap((pilesLeft) =>
  range(0, 5).flatMap((remainderLeft) =>
    range(0, 12).flatMap((pilesRight) =>
      range(0, 5).map((remainderRight) =>
        heaps(pilesLeft, remainderLeft, pilesRight, remainderRight),
      ),
    ),
  ),
)

/** The Pick a complete Transcription derives from its left heap. */
const derivedPick = ({ pilesLeft, remainderLeft }: Transcription) =>
  4 * (pilesLeft ?? Number.NaN) + (remainderLeft ?? Number.NaN)

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

/** The Round awaited at a first Round, a second, a third and the eighteenth. */
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

describe('transcribe at every place in a Casting', () => {
  it.each(places.slice(0, 17).map((place) => [place.line, place.round, place]))(
    'takes every valid Transcription at Line %i Round %i to the partial Casting of the rebuilt Rounds and the new one',
    (_line, _round, { before, stalks }) => {
      const casting = castBy(before)
      const picks = range(1, stalks - 2)
      expect(
        picks.map((pick) => transcribe(casting, transcriptionOf(stalks, pick))),
      ).toStrictEqual(picks.map((pick) => dividedTo([...before, pick])))
    },
  )

  it('takes every valid Transcription of the eighteenth Round to the complete Casting and its Transformation', () => {
    const casting = castBy(seventeen)
    const picks = range(1, 38)
    expect(
      picks.map((pick) => transcribe(casting, transcriptionOf(40, pick))),
    ).toStrictEqual(picks.map((pick) => dividedTo([...seventeen, pick])))
  })

  it.each(places.map((place) => [place.line, place.round, place]))(
    'gives what divide gives for the derived Pick, over every Transcription that passes, at Line %i Round %i',
    (_line, _round, { before, stalks }) => {
      const casting = castBy(before)
      const passing = grid.filter(
        (transcription) =>
          ruleBroken(stalks, before.length % 3 === 0, transcription) ===
          undefined,
      )
      expect(passing).toHaveLength(stalks - 2)
      expect(
        passing.map((transcription) => transcribe(casting, transcription)),
      ).toStrictEqual(
        passing.map((transcription) =>
          divide(casting, derivedPick(transcription)),
        ),
      )
    },
  )

  it('gives the Transformation bottom-up, Line Position 1 at index 0', () => {
    const picks = [
      [4, 3, 3],
      [4, 3, 1],
      [21, 18, 3],
      [21, 18, 17],
      [4, 1, 1],
      [1, 3, 3],
    ].flat()
    const casting = castBy(picks.slice(0, 17))
    expect(
      transformationOf(
        transcribe(
          casting,
          transcriptionOf(stalksAfter(picks.slice(0, 17)), 3),
        ),
      ),
    ).toStrictEqual([6, 7, 8, 9, 8, 7])
  })

  it('leaves the incoming Casting unchanged', () => {
    const casting = partial([oldYang, [oldYangFirst, oldYangSecond]])
    const before = structuredClone(casting)
    transcribe(casting, transcriptionOf(40, 17))
    transcribe(casting, heaps(undefined, 1, 2, 3))
    transcribe(casting, heaps(4, 1, 4, 1))
    expect(casting).toStrictEqual(before)
  })
})

describe('transcribe applies ADR-0043 checks in order', () => {
  it.each(places.map((place) => [place.line, place.round, place]))(
    'refuses every Transcription with pile counts 0 to 12 and Remainders 0 to 5 that fails a check, naming the first failed, at Line %i Round %i',
    (line, round, { before, stalks }) => {
      const casting = castBy(before)
      const failing = grid.flatMap((transcription) => {
        const rule = ruleBroken(stalks, before.length % 3 === 0, transcription)
        return rule === undefined ? [] : [{ transcription, rule }]
      })
      expect(
        failing.map(({ transcription }) => transcribe(casting, transcription)),
      ).toStrictEqual(
        failing.map(({ transcription, rule }) =>
          refused(line, round, stalks, derivedPick(transcription), rule),
        ),
      )
    },
  )
})

describe('transcribe refuses an incomplete Transcription', () => {
  it.each([
    ['pilesLeft', heaps(undefined, 1, 6, 3)],
    ['remainderLeft', heaps(5, undefined, 6, 3)],
    ['pilesRight', heaps(5, 1, undefined, 3)],
    ['remainderRight', { ...heaps(5, 1, 6, 3), remainderRight: undefined }],
    ['every field', blank],
  ])('with no Pick when %s is absent', (_name, transcription) => {
    expect(transcribe(emptyCasting, transcription)).toStrictEqual(
      refused(1, 1, 49, undefined, 'complete'),
    )
  })

  describe.each([
    ['−1', -1],
    ['2.5', 2.5],
    ['0.25', 0.25],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['−Infinity', Number.NEGATIVE_INFINITY],
  ])('with a pile count of %s', (_name, count) => {
    it('on the left, with no Pick', () => {
      expect(transcribe(emptyCasting, heaps(count, 1, 6, 3))).toStrictEqual(
        refused(1, 1, 49, undefined, 'complete'),
      )
    })

    it('on the right, with no Pick', () => {
      expect(transcribe(emptyCasting, heaps(5, 1, count, 3))).toStrictEqual(
        refused(1, 1, 49, undefined, 'complete'),
      )
    })
  })

  it.each([
    ['−1, 1, 12, 3', heaps(-1, 1, 12, 3)],
    ['0.25, 1, 11, 2', heaps(0.25, 1, 11, 2)],
  ])(
    'with ADR-0043 pile counts %s, which conserve 49 stalks with a valid Set-aside',
    (_name, transcription) => {
      expect(transcribe(emptyCasting, transcription)).toStrictEqual(
        refused(1, 1, 49, undefined, 'complete'),
      )
    },
  )

  it('as complete before any Remainder check', () => {
    expect(transcribe(emptyCasting, heaps(undefined, 0, 6, 5))).toStrictEqual(
      refused(1, 1, 49, undefined, 'complete'),
    )
    expect(transcribe(emptyCasting, heaps(-1, 0, 6, 3))).toStrictEqual(
      refused(1, 1, 49, undefined, 'complete'),
    )
  })

  it('takes a pile count of 0 on either side', () => {
    expect(transcribe(emptyCasting, heaps(0, 1, 11, 3))).toStrictEqual(
      dividedTo([1]),
    )
    expect(transcribe(emptyCasting, heaps(11, 3, 0, 1))).toStrictEqual(
      dividedTo([47]),
    )
  })
})

describe('transcribe refuses a Remainder outside 1 to 4', () => {
  describe.each([
    ['0', 0],
    ['5', 5],
    ['2.5', 2.5],
    ['−1', -1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('of %s', (_name, remainder) => {
    it('on the left, with the derived Pick', () => {
      expect(transcribe(emptyCasting, heaps(5, remainder, 6, 3))).toStrictEqual(
        refused(1, 1, 49, 20 + remainder, 'remainders'),
      )
    })

    it('on the right, with the derived Pick', () => {
      expect(transcribe(emptyCasting, heaps(5, 1, 6, remainder))).toStrictEqual(
        refused(1, 1, 49, 21, 'remainders'),
      )
    })
  })

  it('when a 0 Remainder is hidden by a pile count that conserves the stalks with a valid Set-aside', () => {
    // 0 left and 4 right sum like 4 and 4 after a pile of four moves over.
    expect(transcribe(emptyCasting, heaps(0, 4, 11, 0))).toStrictEqual(
      refused(1, 1, 49, 4, 'remainders'),
    )
    expect(transcribe(emptyCasting, heaps(1, 0, 10, 4))).toStrictEqual(
      refused(1, 1, 49, 4, 'remainders'),
    )
  })
})

describe('transcribe refuses a Set-aside the Round cannot have', () => {
  it('names set-aside for Remainders 1 and 1 in a first Round, as ADR-0043 gives', () => {
    expect(transcribe(emptyCasting, heaps(5, 1, 5, 1))).toStrictEqual(
      refused(1, 1, 49, 21, 'set-aside'),
    )
  })

  it.each([
    ['4', 1, 2],
    ['6', 2, 3],
    ['7', 3, 3],
    ['8', 3, 4],
  ])(
    'names set-aside for a Set-aside of %s in a first Round, before conservation',
    (_name, remainderLeft, remainderRight) => {
      expect(
        transcribe(emptyCasting, heaps(5, remainderLeft, 6, remainderRight)),
      ).toStrictEqual(refused(1, 1, 49, 20 + remainderLeft, 'set-aside'))
    },
  )

  it.each([
    ['3', 1, 1],
    ['5', 2, 2],
    ['6', 2, 3],
    ['7', 3, 3],
    ['9', 4, 4],
  ])(
    'names set-aside for a Set-aside of %s in a second Round, before conservation',
    (_name, remainderLeft, remainderRight) => {
      expect(
        transcribe(castBy([21]), heaps(4, remainderLeft, 5, remainderRight)),
      ).toStrictEqual(refused(1, 2, 44, 16 + remainderLeft, 'set-aside'))
    },
  )

  it('names set-aside for a Set-aside of 9 in a third Round', () => {
    expect(transcribe(castBy([21, 18]), heaps(4, 4, 4, 4))).toStrictEqual(
      refused(1, 3, 40, 20, 'set-aside'),
    )
  })
})

describe('transcribe refuses a Transcription that does not conserve the stalks', () => {
  it('names conservation for piles 5 and 1 with Remainders 2 and 2, as ADR-0043 gives', () => {
    expect(transcribe(emptyCasting, heaps(5, 2, 1, 2))).toStrictEqual(
      refused(1, 1, 49, 22, 'conservation'),
    )
  })

  it.each(places.map((place) => [place.line, place.round, place]))(
    'names conservation for one pile of four more or less on either side at Line %i Round %i',
    (line, round, { before, stalks }) => {
      const casting = castBy(before)
      const pick = Math.floor(stalks / 2)
      const valid = transcriptionOf(stalks, pick)
      const pilesLeft = valid.pilesLeft ?? Number.NaN
      const pilesRight = valid.pilesRight ?? Number.NaN
      const off = [
        { ...valid, pilesLeft: pilesLeft + 1 },
        { ...valid, pilesLeft: pilesLeft - 1 },
        { ...valid, pilesRight: pilesRight + 1 },
        { ...valid, pilesRight: pilesRight - 1 },
      ]
      expect(off.map((t) => transcribe(casting, t))).toStrictEqual([
        refused(line, round, stalks, pick + 4, 'conservation'),
        refused(line, round, stalks, pick - 4, 'conservation'),
        refused(line, round, stalks, pick, 'conservation'),
        refused(line, round, stalks, pick, 'conservation'),
      ])
    },
  )

  it('carries a derived Pick beyond the stalks', () => {
    expect(transcribe(emptyCasting, heaps(1e6, 1, 0, 3))).toStrictEqual(
      refused(1, 1, 49, 4e6 + 1, 'conservation'),
    )
  })
})

describe('transcribe names the Round it was transcribing', () => {
  describe.each(awaited)('at $name', ({ line, round, stalks, before }) => {
    const casting = () => castBy(before)
    const firstRound = round === 1
    const failing: readonly [DivisionRule, Transcription, Pick | undefined][] =
      [
        ['complete', heaps(2, 1, undefined, 1), undefined],
        ['remainders', heaps(2, 0, 2, 1), 8],
        ['set-aside', heaps(2, 1, 2, 1), 9],
        ['conservation', heaps(2, 1, 2, firstRound ? 3 : 2), 9],
      ]

    it.each(failing)(
      'with its Line, Round and stalks for %s',
      (rule, transcription, pick) => {
        expect(transcribe(casting(), transcription)).toStrictEqual(
          refused(line, round, stalks, pick, rule),
        )
      },
    )
  })
})

describe('transcribe on a Casting that does not replay', () => {
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
      partial([
        oldYang,
        [
          oldYangFirst,
          {
            stalks: 44,
            pick: 43,
            remainderLeft: 3,
            remainderRight: 4,
            setAside: 8,
          },
        ],
      ]),
    ],
    [
      'a wrong left Remainder in the last of seventeen Rounds',
      partial(
        seventeenRounds(oldYangFirst, { ...oldYangSecond, remainderLeft: 4 }),
      ),
    ],
  ]

  describe.each(spoiled)('with %s', (_name, casting) => {
    it.each([
      ['a valid', transcriptionOf(44, 18)],
      ['an incomplete', blank],
      ['a zero-Remainder', heaps(4, 0, 6, 0)],
      ['a wrong-Set-aside', heaps(5, 1, 5, 1)],
      ['a non-conserving', heaps(1, 1, 1, 1)],
    ])(
      'gives the replay refusal nextRound gives, for %s Transcription',
      (_kind, transcription) => {
        const result = transcribe(casting, transcription)
        expect(result).toStrictEqual(nextRound(casting))
        expect(result.outcome === 'refused' && result.refusal.rule).toBe(
          'replay',
        )
      },
    )
  })

  it('names the failing Round with its recorded stalks and Pick', () => {
    const casting = partial([oldYang, [{ ...oldYangFirst, remainderRight: 4 }]])
    expect(transcribe(casting, heaps(undefined, 1, 2, 3))).toStrictEqual(
      refused(2, 1, 49, 21, 'replay'),
    )
  })
})

describe('transcribe drops extra keys on recorded Rounds', () => {
  it('returns the rebuilt Rounds in a partial Casting', () => {
    const noted = { ...oldYangSecond, note: 'an invented note' }
    const casting = partial([[oldYangFirst, noted]])
    expect(transcribe(casting, transcriptionOf(40, 17))).toStrictEqual({
      outcome: 'divided',
      casting: { state: 'partial', rounds: [oldYang] },
    })
  })

  it('returns the rebuilt Rounds in the complete Casting', () => {
    const notedFirst = { ...oldYangFirst, note: 'an invented note' }
    const notedLast = { ...oldYangSecond, extra: 0 }
    const casting = partial(seventeenRounds(notedFirst, notedLast))
    expect(transcribe(casting, transcriptionOf(40, 17))).toStrictEqual({
      outcome: 'divided',
      casting: {
        state: 'complete',
        rounds: [oldYang, oldYang, oldYang, oldYang, oldYang, oldYang],
        transformation: [9, 9, 9, 9, 9, 9],
      },
    })
  })
})

describe('the rules transcribe reports', () => {
  /** Transcriptions at every place: the grid, and values off each bound. */
  const reported = (): DivisionRule[] => {
    const odd = [-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY, undefined]
    const rules = new Set<DivisionRule>()
    for (const { before } of places) {
      const casting = castBy(before)
      const offBounds = odd.flatMap((value) => [
        heaps(value, 1, 6, 3),
        heaps(5, value, 6, 3),
        heaps(5, 1, value, 3),
        heaps(5, 1, 6, value),
      ])
      for (const transcription of [...grid, ...offBounds]) {
        const result = transcribe(casting, transcription)
        if (result.outcome === 'refused') rules.add(result.refusal.rule)
      }
    }
    const spoiled = partial([[{ ...oldYangFirst, stalks: 48 }]])
    const result = transcribe(spoiled, transcriptionOf(44, 18))
    if (result.outcome === 'refused') rules.add(result.refusal.rule)
    return [...rules]
  }

  it('include complete, remainders, set-aside, conservation and replay, and never valid-pick', () => {
    const rules = reported()
    expect(rules).toEqual(
      expect.arrayContaining([
        'complete',
        'remainders',
        'set-aside',
        'conservation',
        'replay',
      ]),
    )
    expect(rules).not.toContain('valid-pick')
  })

  it.each(places.map((place) => [place.line, place.round, place]))(
    'never include valid-pick: every Pick taken at Line %i Round %i runs from 1 to stalks − 2',
    (_line, _round, { before, stalks }) => {
      const casting = castBy(before)
      const picks: Pick[] = []
      for (const transcription of grid) {
        const result = transcribe(casting, transcription)
        if (result.outcome === 'refused') {
          expect(result.refusal.rule).not.toBe('valid-pick')
        } else {
          picks.push(derivedPick(transcription))
        }
      }
      expect(picks.toSorted((a, b) => a - b)).toStrictEqual(
        range(1, stalks - 2),
      )
    },
  )
})
