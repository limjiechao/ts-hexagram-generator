import { describe, expect, test } from 'vitest'

import { cryptoRandom } from '../src/crypto-random'

describe('cryptoRandom', () => {
  test('returns a number in [0, 1) by default', () => {
    const samples = Array.from({ length: 10_000 }, () => cryptoRandom())

    for (const value of samples) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  test('upper bound is exclusive — never reaches 1', () => {
    // randomInt(min, max) is exclusive on max, so n / MAX is always < 1.
    // Force the upper edge deterministically: when MIN = MAX - 1, randomInt
    // always returns MIN, so the result is (MAX - 1) / MAX < 1.
    expect(cryptoRandom(3, 4)).toBe(0.75)
  })

  test('produces distinct values across calls', () => {
    const samples = new Set(Array.from({ length: 100 }, () => cryptoRandom()))
    // Default range spans 2^48 buckets — collisions over 100 samples have
    // probability ≈ 2^-43, statistically impossible.
    expect(samples.size).toBe(100)
  })
})
