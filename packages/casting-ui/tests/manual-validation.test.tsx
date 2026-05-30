import { describe, expect, it } from 'vitest'

import { validateManualInput } from '../src/manual-validation'

// ── validateManualInput (pure) ───────────────────────────────────────────────

describe('validateManualInput', () => {
  // The validator is the source of truth for the manual prompt's SPLIT row.
  // It runs incomplete → conservation → suspended-sum → ok in strict priority
  // order. We unit-test the failure-mode branches here because two of them
  // (suspended-sum, conservation+suspended both failing) require non-canonical
  // M values to be reachable — the canonical M = 49/40/32 sequence
  // mathematically rules out a suspended-sum failure when conservation passes.

  it('returns incomplete when any field is null', () => {
    expect(
      validateManualInput({
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
    const result = validateManualInput({
      pilesL: 5,
      remL: 4,
      pilesR: 4,
      remR: 4,
      unparted: 49,
      castIndex: 0,
    })
    expect(result).toEqual({
      kind: 'conservation',
      total: 45,
      unparted: 49,
      leftHeapTotal: 24,
      rightHeapTotal: 20,
    })
  })

  it('reports suspended-sum failure when conservation passes but the suspended sum is off', () => {
    // Non-canonical M to force a reachable suspended-sum failure:
    // M=10, castIndex=1 (cast 2, expected sums {4, 8}).
    //   4·1 + 1 + 4·0 + 4 + 1 = 10 ✓ conservation
    //   suspended sum = 1 + 1 + 4 = 6 (not in {4, 8}).
    const result = validateManualInput({
      pilesL: 1,
      remL: 1,
      pilesR: 0,
      remR: 4,
      unparted: 10,
      castIndex: 1,
    })
    expect(result).toEqual({
      kind: 'suspended-sum',
      sum: 6,
      remL: 1,
      remR: 4,
      expectedLabel: '4 or 8',
    })
  })

  it('rejects rR=0 even when conservation and suspended-sum would otherwise pass', () => {
    // Screenshot scenario: cast 1, M=49, pL=6, rL=4, pR=5, rR=0.
    // Conservation: 4·6+4+4·5+0+1 = 49 ✓ (the +0 sneaks past because the
    // missing 4 was shifted into pR=5). Suspended sum: 1+4+0 = 5 ∈ {5, 9} ✓.
    // Without the zero-remainder guard, the validator returned `ok` with
    // pick=28 — but rR=0 violates the I-Ching never-zero rule.
    const result = validateManualInput({
      pilesL: 6,
      remL: 4,
      pilesR: 5,
      remR: 0,
      unparted: 49,
      castIndex: 0,
    })
    expect(result).toEqual({ kind: 'zero-remainder', remL: 4, remR: 0 })
  })

  it('rejects rL=0 with the same priority as rR=0', () => {
    const result = validateManualInput({
      pilesL: 5,
      remL: 0,
      pilesR: 6,
      remR: 4,
      unparted: 49,
      castIndex: 0,
    })
    expect(result).toEqual({ kind: 'zero-remainder', remL: 0, remR: 4 })
  })

  it('zero-remainder fires before conservation when both fail', () => {
    // pL=0, rL=0, pR=0, rR=0 → total 1 (≠ 49). Zero-remainder must win.
    const result = validateManualInput({
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
    // Cast 1, M=49: pL=5, rL=4, pR=4, rR=2 → total 43 (not 49), suspended 7
    // (not in {5, 9}). Conservation must win the priority race.
    const result = validateManualInput({
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
    // Cast 2 of an M=40 round: pL=4, rL=3, pR=4, rR=4 → total 40 ✓,
    // suspended 1+3+4 = 8 ✓. Derived pick = leftHeapTotal = 19.
    const result = validateManualInput({
      pilesL: 4,
      remL: 3,
      pilesR: 4,
      remR: 4,
      unparted: 40,
      castIndex: 1,
    })
    expect(result).toEqual({
      kind: 'ok',
      pick: 19,
      leftHeapTotal: 19,
      rightHeapTotal: 20,
    })
  })

  it('round-1 ok validates a canonical 24/49 split', () => {
    // Cast 1 of M=49: pL=5, rL=4, pR=5, rR=4 → total 49 ✓, suspended 1+4+4 = 9 ✓.
    const result = validateManualInput({
      pilesL: 5,
      remL: 4,
      pilesR: 5,
      remR: 4,
      unparted: 49,
      castIndex: 0,
    })
    expect(result).toEqual({
      kind: 'ok',
      pick: 24,
      leftHeapTotal: 24,
      rightHeapTotal: 24,
    })
  })

  it('conservation result carries heap totals for downstream rendering', () => {
    // pL=5, rL=2 → left = 22; pR=4, rR=3 → right = 19;
    // total = 22 + 19 + 1 = 42 ≠ 40 → conservation fires.
    const result = validateManualInput({
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
