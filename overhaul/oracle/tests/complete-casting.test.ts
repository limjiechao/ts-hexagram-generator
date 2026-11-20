import { describe, expect, it } from 'vitest'

import { isCompleteCasting } from '#src/complete-casting.js'

// One Line of Old Yang: 49 → Set-aside 5, 44 → 4, 40 → 4, leaving 36.
const first = {
  stalks: 49,
  pick: 21,
  remainderLeft: 1,
  remainderRight: 3,
  setAside: 5,
} as const
const second = {
  stalks: 44,
  pick: 18,
  remainderLeft: 2,
  remainderRight: 1,
  setAside: 4,
} as const
const third = {
  stalks: 40,
  pick: 17,
  remainderLeft: 1,
  remainderRight: 2,
  setAside: 4,
} as const
const line = [first, second, third] as const

const complete = {
  state: 'complete',
  rounds: [line, line, line, line, line, line],
  transformation: [9, 9, 9, 9, 9, 9],
} as const

/** The complete Casting with the Round at `index` of its first Line replaced. */
const withRound = (index: number, round: unknown) => ({
  ...complete,
  rounds: [
    line.map((each, at) => (at === index ? round : each)),
    line,
    line,
    line,
    line,
    line,
  ],
})

const withFirstRound = (round: unknown) => withRound(0, round)

/** An array of empty slots, which `every` would skip. */
const emptySlots = (length: number): unknown[] => {
  const slots: unknown[] = []
  slots.length = length
  return slots
}

/** A copy of `items` with an empty slot at `index`. */
const withHole = (items: readonly unknown[], index: number): unknown[] => {
  const holed = emptySlots(items.length)
  for (const [at, item] of items.entries()) {
    if (at !== index) holed[at] = item
  }
  return holed
}

describe('isCompleteCasting', () => {
  it('accepts six Lines of three Rounds with a Transformation', () => {
    expect(isCompleteCasting(complete)).toBe(true)
  })

  it.each([undefined, null, 'complete', 18, []])('rejects %j', (value) => {
    expect(isCompleteCasting(value)).toBe(false)
  })

  it('rejects a partial Casting', () => {
    expect(isCompleteCasting({ ...complete, state: 'partial' })).toBe(false)
  })

  it.each([
    ['five Lines', [line, line, line, line, line]],
    ['seven Lines', [line, line, line, line, line, line, line]],
    ['a Line of two Rounds', [[first, second], line, line, line, line, line]],
    [
      'a Line of four Rounds',
      [[first, second, third, third], line, line, line, line, line],
    ],
    ['Rounds not grouped by Line', [...line, ...line, ...line]],
  ])('rejects %s', (_, rounds) => {
    expect(isCompleteCasting({ ...complete, rounds })).toBe(false)
  })

  it('rejects a Casting of empty slots', () => {
    expect(
      isCompleteCasting({
        state: 'complete',
        rounds: emptySlots(6),
        transformation: emptySlots(6),
      }),
    ).toBe(false)
  })

  it('rejects Rounds with an empty slot for a Line', () => {
    const rounds = withHole([line, line, line, line, line, line], 2)
    expect(isCompleteCasting({ ...complete, rounds })).toBe(false)
  })

  it('rejects a Line with an empty slot for a Round', () => {
    const rounds = [withHole(line, 1), line, line, line, line, line]
    expect(isCompleteCasting({ ...complete, rounds })).toBe(false)
  })

  it('rejects a Transformation with an empty slot', () => {
    const transformation = withHole([9, 9, 9, 9, 9, 9], 4)
    expect(isCompleteCasting({ ...complete, transformation })).toBe(false)
  })

  it.each([
    ['a missing Pick', { ...first, pick: undefined }],
    ['a Pick of 0', { ...first, pick: 0 }],
    ['a Pick leaving no countable stalk on the right', { ...first, pick: 48 }],
    ['a fractional Pick', { ...first, pick: 21.5 }],
    ['a Pick as text', { ...first, pick: '21' }],
    ['more than 49 stalks', { ...first, stalks: 50, pick: 21 }],
    ['too few stalks for any Pick', { ...first, stalks: 2, pick: 1 }],
    ['a left Remainder of 0', { ...first, remainderLeft: 0 }],
    ['a right Remainder of 5', { ...first, remainderRight: 5 }],
    ['a Set-aside of 6', { ...first, setAside: 6 }],
    ['a Round that is not an object', 21],
  ])('rejects a Round with %s', (_, round) => {
    expect(isCompleteCasting(withFirstRound(round))).toBe(false)
  })

  it.each([
    ['missing', undefined],
    ['of five Line Values', [9, 9, 9, 9, 9]],
    ['of seven Line Values', [9, 9, 9, 9, 9, 9, 9]],
    ['with a Line Value of 5', [5, 9, 9, 9, 9, 9]],
    ['with a Line Value of 10', [9, 9, 9, 9, 9, 10]],
    ['written as digits', '999999'],
  ])('rejects a Transformation %s', (_, transformation) => {
    expect(isCompleteCasting({ ...complete, transformation })).toBe(false)
  })

  it.each([[[6, 7, 8, 9, 6, 7]], [[8, 8, 8, 8, 8, 8]]])(
    'accepts the Transformation %j',
    (transformation) => {
      expect(isCompleteCasting({ ...complete, transformation })).toBe(true)
    },
  )

  describe("by the Round's place in its Line", () => {
    it.each([
      ['first Round of 44 stalks', 0, { ...first, stalks: 44 }],
      ['first Round of 40 stalks', 0, { ...first, stalks: 40 }],
      ['first Round with a Set-aside of 4', 0, { ...first, setAside: 4 }],
      ['first Round with a Set-aside of 8', 0, { ...first, setAside: 8 }],
      ['second Round with a Set-aside of 5', 1, { ...second, setAside: 5 }],
      ['second Round with a Set-aside of 9', 1, { ...second, setAside: 9 }],
      ['third Round with a Set-aside of 5', 2, { ...third, setAside: 5 }],
      ['third Round with a Set-aside of 9', 2, { ...third, setAside: 9 }],
    ])('rejects a %s', (_, index, round) => {
      expect(isCompleteCasting(withRound(index, round))).toBe(false)
    })

    // Shape only: these values need not follow from the Rounds before them.
    it.each([
      ['first Round with a Set-aside of 9', 0, { ...first, setAside: 9 }],
      ['second Round with a Set-aside of 8', 1, { ...second, setAside: 8 }],
      ['third Round with a Set-aside of 8', 2, { ...third, setAside: 8 }],
    ])('accepts a %s', (_, index, round) => {
      expect(isCompleteCasting(withRound(index, round))).toBe(true)
    })
  })
})
