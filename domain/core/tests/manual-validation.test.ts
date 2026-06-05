import { assertSelectablePick } from '@hexagram/core/casting-derivation'
import { validateManualSplit as validateViaSubpath } from '@hexagram/core/manual-validation'
import { describe, expect, it } from 'vitest'

import { validateManualSplit } from '../src/manual-validation.js'

describe('@hexagram/core/manual-validation subpath', () => {
  it('resolves the validator through the package public API', () => {
    expect(
      validateViaSubpath({
        pilesL: 5,
        remL: 4,
        pilesR: 5,
        remR: 4,
        unparted: 49,
        castIndex: 0,
      }),
    ).toEqual({ kind: 'ok', pick: 24, leftHeapTotal: 24, rightHeapTotal: 24 })
  })
})

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

// The structurally-derived range never escapes the core never-zero guard.
describe('validateManualSplit "ok" picks satisfy assertSelectablePick', () => {
  it('every accepted cast-0 input has a pick the core accepts', () => {
    const unparted = 49
    for (let pilesL = 0; pilesL <= Math.floor(unparted / 4); pilesL++) {
      for (let remL = 1; remL <= 4; remL++) {
        for (let pilesR = 0; pilesR <= Math.floor(unparted / 4); pilesR++) {
          for (let remR = 1; remR <= 4; remR++) {
            const result = validateManualSplit({
              pilesL,
              remL,
              pilesR,
              remR,
              unparted,
              castIndex: 0,
            })
            if (result.kind !== 'ok') continue
            expect(() =>
              assertSelectablePick(unparted - 1, result.pick),
            ).not.toThrow()
          }
        }
      }
    }
  })
})
