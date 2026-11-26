import { describe, expect, it } from 'vitest'

import { cryptoRandomSource } from '#src/crypto-random-source.js'

// Uniformity cannot be checked deterministically and is left to review. The
// coverage checks below fail falsely with probability below 1e-50: for bound
// 2, missing a value in 200 draws is 2 * 2^-200; for bound 3, missing one in
// 300 draws is under 3 * (2/3)^300.

function draws(bound: number, count: number): number[] {
  return Array.from({ length: count }, () =>
    cryptoRandomSource.integerBelow(bound),
  )
}

describe('cryptoRandomSource', () => {
  it('always draws 0 below 1', () => {
    expect(draws(1, 100)).toStrictEqual(Array.from({ length: 100 }, () => 0))
  })

  it.each([2, 3, 6, 2 ** 32 - 1, 2 ** 32])(
    'draws only integers from 0 to %d minus 1',
    (bound) => {
      for (const draw of draws(bound, 1000)) {
        expect(Number.isInteger(draw)).toBe(true)
        expect(draw).toBeGreaterThanOrEqual(0)
        expect(draw).toBeLessThan(bound)
      }
    },
  )

  it('draws both values below 2 within 200 draws', () => {
    expect(new Set(draws(2, 200))).toStrictEqual(new Set([0, 1]))
  })

  it('draws all three values below 3 within 300 draws', () => {
    expect(new Set(draws(3, 300))).toStrictEqual(new Set([0, 1, 2]))
  })
})
