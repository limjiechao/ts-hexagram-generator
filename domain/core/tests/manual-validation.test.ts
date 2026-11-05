import { describe, expect, it } from 'vitest'

import { assertSelectablePick } from '../src/casting-derivation.js'
import { validateManualSplit } from '../src/manual-validation.js'

describe('validateManualSplit', () => {
  it('returns incomplete when any field is null', () => {
    expect(
      validateManualSplit({
        pilesL: 5,
        remL: null,
        pilesR: 5,
        remR: 4,
        unparted: 49,
        castIndex: 0,
      }),
    ).toEqual({ kind: 'incomplete' })
  })

  it('reports conservation failure with the actual total vs unparted', () => {
    // 4·5 + 4 + 4·4 + 4 + 1 = 45, but unparted = 49.
    expect(
      validateManualSplit({
        pilesL: 5,
        remL: 4,
        pilesR: 4,
        remR: 4,
        unparted: 49,
        castIndex: 0,
      }),
    ).toEqual({
      kind: 'conservation',
      total: 45,
      unparted: 49,
      leftHeapTotal: 24,
      rightHeapTotal: 20,
    })
  })

  it('reports suspended-sum failure when conservation passes but the suspended sum is off', () => {
    // M=10, castIndex=1 (cast 2, expected sums {4, 8}).
    //   4·1 + 1 + 4·0 + 4 + 1 = 10 ✓ conservation
    //   suspended sum = 1 + 1 + 4 = 6 (not in {4, 8}).
    expect(
      validateManualSplit({
        pilesL: 1,
        remL: 1,
        pilesR: 0,
        remR: 4,
        unparted: 10,
        castIndex: 1,
      }),
    ).toEqual({
      kind: 'suspended-sum',
      sum: 6,
      remL: 1,
      remR: 4,
      expectedLabel: '4 or 8',
    })
  })

  it('rejects rR=0 even when conservation and suspended-sum would otherwise pass', () => {
    // cast 1, M=49, pL=6, rL=4, pR=5, rR=0.
    expect(
      validateManualSplit({
        pilesL: 6,
        remL: 4,
        pilesR: 5,
        remR: 0,
        unparted: 49,
        castIndex: 0,
      }),
    ).toEqual({ kind: 'zero-remainder', remL: 4, remR: 0 })
  })

  it('rejects rL=0 with the same priority as rR=0', () => {
    expect(
      validateManualSplit({
        pilesL: 5,
        remL: 0,
        pilesR: 6,
        remR: 4,
        unparted: 49,
        castIndex: 0,
      }),
    ).toEqual({ kind: 'zero-remainder', remL: 0, remR: 4 })
  })

  it('zero-remainder fires before conservation when both fail', () => {
    const result = validateManualSplit({
      pilesL: 0,
      remL: 0,
      pilesR: 0,
      remR: 0,
      unparted: 49,
      castIndex: 0,
    })
    expect(result.kind).toBe('zero-remainder')
  })

  it('conservation fires before suspended-sum when both fail', () => {
    // Cast 1, M=49: pL=5, rL=4, pR=4, rR=2 → total 43 (not 49), suspended 7.
    const result = validateManualSplit({
      pilesL: 5,
      remL: 4,
      pilesR: 4,
      remR: 2,
      unparted: 49,
      castIndex: 0,
    })
    expect(result.kind).toBe('conservation')
  })

  it('returns ok with leftHeapTotal and rightHeapTotal for a valid commit', () => {
    // Cast 2 of M=40: pL=4, rL=3, pR=4, rR=4 → total 40, suspended 8. pick = 19.
    expect(
      validateManualSplit({
        pilesL: 4,
        remL: 3,
        pilesR: 4,
        remR: 4,
        unparted: 40,
        castIndex: 1,
      }),
    ).toEqual({
      kind: 'ok',
      pick: 19,
      leftHeapTotal: 19,
      rightHeapTotal: 20,
    })
  })

  it('round-1 ok validates a canonical 24/49 split', () => {
    expect(
      validateManualSplit({
        pilesL: 5,
        remL: 4,
        pilesR: 5,
        remR: 4,
        unparted: 49,
        castIndex: 0,
      }),
    ).toEqual({
      kind: 'ok',
      pick: 24,
      leftHeapTotal: 24,
      rightHeapTotal: 24,
    })
  })

  it('conservation result carries heap totals for downstream rendering', () => {
    const result = validateManualSplit({
      pilesL: 5,
      remL: 2,
      pilesR: 4,
      remR: 3,
      unparted: 40,
      castIndex: 1,
    })
    expect(result.kind).toBe('conservation')
    if (result.kind !== 'conservation') return
    expect(result.total).toBe(42)
    expect(result.unparted).toBe(40)
    expect(result.leftHeapTotal).toBe(22)
    expect(result.rightHeapTotal).toBe(19)
  })
})

// BUG-008: conservation + suspended-sum alone do not bound the fields — a
// remainder above 4 or a negative pile count can still balance both sums.
describe('validateManualSplit rejects out-of-range fields', () => {
  it('rejects a remainder above 4 that conservation and suspended-sum accept', () => {
    // 25 + 23 + 1 = 49 ✓, 1 + 5 + 3 = 9 ✓ — but a real heap of 25 has remainder 1.
    const result = validateManualSplit({
      pilesL: 5,
      remL: 5,
      pilesR: 5,
      remR: 3,
      unparted: 49,
      castIndex: 0,
    })
    expect(result.kind).not.toBe('ok')
  })

  it('rejects a negative left pile count that would derive pick 0', () => {
    const result = validateManualSplit({
      pilesL: -1,
      remL: 4,
      pilesR: 11,
      remR: 4,
      unparted: 49,
      castIndex: 0,
    })
    expect(result.kind).not.toBe('ok')
  })

  it('rejects a negative right pile count that would derive pick = recordedMax', () => {
    const result = validateManualSplit({
      pilesL: 11,
      remL: 4,
      pilesR: -1,
      remR: 4,
      unparted: 49,
      castIndex: 0,
    })
    expect(result.kind).not.toBe('ok')
  })
})

// The structurally-derived range never escapes the core never-zero guard.
// The enumeration deliberately strays one step outside the valid field
// ranges (piles from -1, remainders 0..5) so an unbounded field that slips
// through to `ok` is caught here.
describe('validateManualSplit "ok" picks satisfy assertSelectablePick', () => {
  const rounds: Array<{ castIndex: 0 | 1 | 2; unparted: number }> = [
    { castIndex: 0, unparted: 49 },
    { castIndex: 1, unparted: 44 },
    { castIndex: 1, unparted: 40 },
    { castIndex: 2, unparted: 40 },
    { castIndex: 2, unparted: 36 },
    { castIndex: 2, unparted: 32 },
  ]
  for (const { castIndex, unparted } of rounds) {
    it(`every accepted castIndex ${castIndex} input at ${unparted} has a pick the core accepts`, () => {
      const pilesMax = Math.floor(unparted / 4)
      for (let pilesL = -1; pilesL <= pilesMax + 1; pilesL++) {
        for (let remL = 0; remL <= 5; remL++) {
          for (let pilesR = -1; pilesR <= pilesMax + 1; pilesR++) {
            for (let remR = 0; remR <= 5; remR++) {
              const result = validateManualSplit({
                pilesL,
                remL,
                pilesR,
                remR,
                unparted,
                castIndex,
              })
              if (result.kind !== 'ok') continue
              expect(pilesL).toBeGreaterThanOrEqual(0)
              expect(pilesR).toBeGreaterThanOrEqual(0)
              expect([1, 2, 3, 4]).toContain(remL)
              expect([1, 2, 3, 4]).toContain(remR)
              expect(() =>
                assertSelectablePick(unparted - 1, result.pick),
              ).not.toThrow()
            }
          }
        }
      }
    })
  }
})
