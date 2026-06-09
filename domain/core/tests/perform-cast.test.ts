import { describe, expect, test } from 'vitest'

import { deriveSplit, selectablePickMax } from '../src/casting-derivation.js'
import {
  initialLineState,
  performCast,
  recordedMaxFor,
  stalksBeforeParting,
} from '../src/index.js'
import type { AdvanceableLineState, LineState } from '../src/types.js'

describe('initialLineState', () => {
  test('is in 0th-cast phase with all 49 stalks unparted', () => {
    expect(initialLineState.phase).toBe('0th-cast')
    expect(initialLineState.unparted).toEqual(stalksBeforeParting)
    expect(initialLineState.unparted).toHaveLength(49)
    expect(initialLineState.suspended).toEqual([])
    expect(initialLineState.rounds).toEqual([])
  })
})

describe('recordedMaxFor', () => {
  test('reports unparted.length - 1 in 0th-cast (=48)', () => {
    expect(recordedMaxFor(initialLineState)).toBe(48)
  })

  test('reports the smaller recorded max after one cast', () => {
    const next = performCast(initialLineState, 24)
    expect(recordedMaxFor(next)).toBe(next.unparted.length - 1)
    expect(recordedMaxFor(next)).toBeLessThan(48)
  })

  // The name pins the value: `recordedMaxFor` returns the RECORDED max — the
  // value stored as `SplitRecord.recordedMax` — which is strictly one above the
  // highest pick a flow may offer (`selectablePickMax`). Reading the old name
  // (`maxPickFor`) as "the max pick you may make" was off by one; this asserts
  // the gap so the name can never silently collapse back onto the pick ceiling.
  test('is one above the selectable pick ceiling (not itself a selectable pick)', () => {
    expect(recordedMaxFor(initialLineState)).toBe(
      selectablePickMax(recordedMaxFor(initialLineState)) + 1,
    )
  })
})

describe('performCast', () => {
  test('0th-cast → 1st-cast adds round[0] and updates unparted/suspended', () => {
    const next = performCast(initialLineState, 24)
    expect(next.phase).toBe('1st-cast')
    expect(next.rounds).toHaveLength(1)
    expect(next.unparted).toEqual(next.rounds[0].unpartedStalks)
    expect(next.suspended).toEqual(next.rounds[0].suspendedFromNextRound)
  })

  test('three sequential casts produce a 3rd-cast state with a valid Line', () => {
    const s1 = performCast(initialLineState, 24)
    const s2 = performCast(s1, Math.max(1, s1.unparted.length - 2))
    const s3 = performCast(s2, Math.max(1, s2.unparted.length - 2))
    expect(s3.phase).toBe('3rd-cast')
    if (s3.phase !== '3rd-cast') throw new Error('phase narrowing failed')
    expect(s3.rounds).toHaveLength(3)
    expect([6, 7, 8, 9]).toContain(s3.line)
  })

  test('is deterministic: same picks → same Line', () => {
    const cast = (picks: [number, number, number]) => {
      const s1 = performCast(initialLineState, picks[0])
      const s2 = performCast(s1, picks[1])
      const s3 = performCast(s2, picks[2])
      if (s3.phase !== '3rd-cast') throw new Error('phase narrowing failed')
      return s3.line
    }
    const a = cast([24, 17, 9])
    const b = cast([24, 17, 9])
    expect(a).toBe(b)
  })

  test('throws RangeError when the pick empties the right heap (pick === recordedMax)', () => {
    // The degenerate split the input flows exclude: `pick = unparted.length - 1`
    // leaves the right heap with only the suspended stalk after 掛一 — nothing
    // to count by fours — so the round corrupts the line. `performCast` is the
    // algorithm of record and rejects it outright. (`deriveSplit`, the display
    // reconstruction, stays tolerant for historical records.)
    const recordedMax = initialLineState.unparted.length - 1 // 48
    expect(() => performCast(initialLineState, recordedMax)).toThrow(RangeError)
  })

  test('accepts the selectable ceiling pick === recordedMax - 1', () => {
    const recordedMax = initialLineState.unparted.length - 1 // 48
    expect(() => performCast(initialLineState, recordedMax - 1)).not.toThrow()
  })

  test('immutability: the input state is not mutated', () => {
    const before = initialLineState
    const beforeUnpartedSnapshot = [...before.unparted]
    performCast(before, 24)
    expect(before.unparted).toEqual(beforeUnpartedSnapshot)
    expect(before.rounds).toEqual([])
    expect(before.phase).toBe('0th-cast')
  })

  test('rewind-by-replay reproduces the same state from a SplitRecord prefix', () => {
    // The casting record (SplitRecord[]) is the natural input to rewind:
    // throw away picks past the rewind point, replay the survivors through
    // performCast, and you land on the exact state you had before.
    const picks: [number, number, number] = [24, 17, 9]
    let fullState: AdvanceableLineState | LineState =
      initialLineState as LineState
    for (const pick of picks) {
      if (fullState.phase === '3rd-cast') throw new Error('over-stepped')
      fullState = performCast(fullState, pick)
    }
    const full = fullState
    if (full.phase !== '3rd-cast') throw new Error('did not resolve')

    // Now simulate rewinding to after-cast-1 by replaying only the first pick.
    const rewound = performCast(initialLineState, picks[0])
    // Re-extending it with the same remaining picks should produce the same
    // line as the full play-through.
    const s2 = performCast(rewound, picks[1])
    const s3 = performCast(s2, picks[2])
    if (s3.phase !== '3rd-cast') throw new Error('replay did not resolve')
    expect(s3.line).toBe(full.line)
  })
})

describe('deriveSplit bridges to the generation-path line', () => {
  // The generator computes the line as `unpartedStalks.length / 4`
  // (`performCast`, index.ts) and NEVER calls `deriveSplit` — that is the
  // display/replay reconstruction path. They are reconciled by the identity
  // `4·combinedPiles === unpartedStalks.length`, so on the third cast
  // `combinedPiles === line`. Lock that identity so the two readings of
  // casting-derivation.ts ("is the line value" vs "reconstruction only")
  // cannot silently drift apart.
  test.each([
    [24, 17, 9], // → line 8
    [24, 20, 12], // → line 6
    [12, 8, 4], // → line 6
  ])(
    'cast 3: combinedPiles === line === unparted/4 for picks %o',
    (...picks) => {
      const s1 = performCast(initialLineState, picks[0])
      const s2 = performCast(s1, picks[1])
      const recordedMax3 = recordedMaxFor(s2)
      const s3 = performCast(s2, picks[2])
      if (s3.phase !== '3rd-cast') throw new Error('phase narrowing failed')
      const d = deriveSplit({ pick: picks[2], recordedMax: recordedMax3 })
      expect(4 * d.combinedPiles).toBe(s3.rounds[2].unpartedStalks.length)
      expect(d.combinedPiles).toBe(s3.line)
    },
  )
})

describe('performCast — type-level invariants', () => {
  test('performCast on a 3rd-cast state is a compile error', () => {
    const s1 = performCast(initialLineState, 24)
    const s2 = performCast(s1, Math.max(1, s1.unparted.length - 2))
    const s3 = performCast(s2, Math.max(1, s2.unparted.length - 2))
    if (s3.phase !== '3rd-cast') throw new Error('phase narrowing failed')
    expect(() =>
      // @ts-expect-error — '3rd-cast' is not in the input domain of performCast.
      // If this directive ever becomes "unused", the conditional type has
      // weakened — investigate before deleting.
      performCast(s3, 1),
    ).toThrow()
  })

  test('the return phase narrows correctly: 0th-cast → 1st-cast', () => {
    // The conditional NextPhase type binds the output phase to the input
    // phase. We test it dynamically here (the runtime tag matches), and the
    // surrounding compile-time discriminant narrowing in performCast's
    // signature ensures the type matches statically too.
    const after = performCast(initialLineState, 24)
    expect(after.phase).toBe('1st-cast')
    // This branch must compile (after is narrowed to '1st-cast'). If
    // performCast ever loses its phase-binding behavior, this assignment
    // becomes a type error.
    const typedAfter: Extract<LineState, { phase: '1st-cast' }> = after
    expect(typedAfter.rounds).toHaveLength(1)
  })
})
