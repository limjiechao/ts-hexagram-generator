import { describe, expect, test } from 'vitest'

import { assertSelectablePick, deriveSplit } from '../src/casting-derivation.js'
import {
  generateRandomConsultation,
  generateRandomHexagram,
  generateRandomHexagrams,
  generateRandomLines,
  splitStalksRandomly,
} from '../src/random-casting.js'

describe('generateRandomHexagram', () => {
  test('generateRandomHexagram() should return a valid hexagram', () => {
    const hexagram = generateRandomHexagram()

    expect(hexagram).toBeInstanceOf(Array)
    expect(hexagram).toHaveLength(6)
    expect(hexagram.join('')).toMatch(/^[6-9]{6}$/)

    // eslint-disable-next-line no-console
    console.table(
      Object.fromEntries(
        hexagram.map((line, index) => [`Line ${index + 1}`, line]).toReversed(),
      ),
    )
  })
})

describe('splitStalksRandomly (pick ceiling)', () => {
  // Regression: a pick equal to the recorded max (`length - 1`) would leave the
  // right heap with only its suspended stalk — nothing to count — and a
  // remainder of 0, which can never occur. The RNG must reserve a SECOND,
  // countable stalk, so every pick stays in `[1, length - 2]`.
  test('never parts at the recorded max (length - 1)', () => {
    for (const length of [49, 44, 40, 36, 32]) {
      const unparted = Array.from({ length }, (_, index) => index + 1)
      for (let iteration = 0; iteration < 5_000; iteration += 1) {
        const pick = splitStalksRandomly(unparted)
        expect(pick).toBeGreaterThanOrEqual(1)
        // `length - 1` is the recorded `SplitRecord.recordedMax`; the ceiling is
        // one below it.
        expect(pick).toBeLessThanOrEqual(length - 2)
      }
    }
  })
})

describe('generateRandomConsultation (no zero remainders)', () => {
  // End-to-end invariant the bug report is about: across whole random
  // consultations, no heap — left or right — ever sorts to a remainder of 0.
  // Derived straight from each recorded `{ pick, max }` via `deriveSplit`.
  test('no heap remainder is ever 0 across 500 consultations', () => {
    for (let iteration = 0; iteration < 500; iteration += 1) {
      const { casting } = generateRandomConsultation()
      for (const line of casting) {
        for (const split of line) {
          const { leftRemainder, rightRemainder } = deriveSplit(split)
          expect(leftRemainder).toBeGreaterThanOrEqual(1)
          expect(leftRemainder).toBeLessThanOrEqual(4)
          expect(rightRemainder).toBeGreaterThanOrEqual(1)
          expect(rightRemainder).toBeLessThanOrEqual(4)
        }
      }
    }
  })
})

describe('generateRandomHexagrams', () => {
  test('generateHexagrams() should return valid hexagrams', () => {
    const hexagrams = generateRandomHexagrams(1_000)

    expect(hexagrams).toBeInstanceOf(Array)
    expect(hexagrams).toHaveLength(1_000)

    for (const hexagram of hexagrams) {
      expect(hexagram).toBeInstanceOf(Array)
      expect(hexagram).toHaveLength(6)
      expect(hexagram.join('')).toMatch(/^[6-9]{6}$/)
    }
  })
})

describe('rng distribution (slow)', () => {
  test(
    'generateLines() should return valid report',
    // Bounded by Node throughput on the slowest matrix runner. macOS / Linux
    // GHA finish in ~28-30 s; Windows GHA has been observed at ~44 s
    // (synchronous, no I/O — pure compute over 1M iterations). 90 s gives
    // ~2× headroom for further runner variance.
    { timeout: 90_000 },
    () => {
      /*
      Line distribution of the RNG flow WITH the never-zero clamp (the
      shipped behavior: each pick is drawn over [1, recordedMax - 1], so the
      empty-right-heap split is excluded). Observed over n=1M:

      Line | equiprobable-remainder model | Band  | observed (n=1M, with clamp)
      -----|------------------------------|-------|----------------------------
      6    |  1/16 = 6.25%                | 2-10% | ~5.2%
      7    |  5/16 = 31.25%               | 25-35%| ~28.8%
      8    |  7/16 = 43.75%               | 39-49%| ~44.9%
      9    |  3/16 = 18.75%               | 14-26%| ~21.1%

      The "equiprobable-remainder model" column is a reference, not a target:
      those fractions assume uniform sort remainders, whereas this code models
      a uniform split point, so the observed figures differ by design. The
      clamp's effect on the distribution (a with-vs-without percentage-point
      comparison and the provenance of the never-zero rule) is documented in
      ADR-0006's amendment "the never-zero clamp shifts the line distribution".
      The bands below are a wide smoke test against a grossly broken generator,
      not a tight distributional assertion.
     */

      const report = generateRandomLines(1_000_000)

      expect(report).toBeInstanceOf(Object)

      expect(report).toHaveProperty('Line 5')
      expect(report['Line 5']).toBe('0.000%')

      expect(report).toHaveProperty('Line 10')
      expect(report['Line 10']).toBe('0.000%')

      const requirePercentage = (lineKey: string): string => {
        const value = report[lineKey]
        expect(value).toMatch(/^\d+\.\d+%$/)
        if (value === undefined) {
          throw new Error(`Expected ${lineKey} in distribution report`)
        }
        return value
      }

      const line6Percentage = requirePercentage('Line 6')
      const line6Float = Number.parseFloat(line6Percentage)
      expect(line6Float).toBeGreaterThanOrEqual(2)
      expect(line6Float).toBeLessThanOrEqual(10)

      const line7Percentage = requirePercentage('Line 7')
      const line7Float = Number.parseFloat(line7Percentage)
      expect(line7Float).toBeGreaterThanOrEqual(25)
      expect(line7Float).toBeLessThanOrEqual(35)

      const line8Percentage = requirePercentage('Line 8')
      const line8Float = Number.parseFloat(line8Percentage)
      expect(line8Float).toBeGreaterThanOrEqual(39)
      expect(line8Float).toBeLessThanOrEqual(49)

      const line9Percentage = requirePercentage('Line 9')
      const line9Float = Number.parseFloat(line9Percentage)
      expect(line9Float).toBeGreaterThanOrEqual(14)
      expect(line9Float).toBeLessThanOrEqual(26)

      expect(line6Float + line7Float + line8Float + line9Float).toBeCloseTo(
        100,
        1,
      )

      // eslint-disable-next-line no-console
      console.table(report)
    },
  )
})

// S3 lock-in: every RNG-drawn pick must satisfy the core's never-zero guard, so
// the random flow — which now routes each pick through `performCast`
// (`assertSelectablePick`) in the viewer's reducer — can never surface a thrown
// RangeError to the user. `SplitRecord.recordedMax` is the recorded max for that
// round; the pick must stay in `[1, selectablePickMax(recordedMax)]`. Mirrors the manual
// flow's "manual 'ok' picks satisfy the core never-zero guard" property.
describe('random picks satisfy the core never-zero guard', () => {
  test('every plan pick passes assertSelectablePick across 200 consultations', () => {
    for (let i = 0; i < 200; i += 1) {
      const { casting } = generateRandomConsultation()
      for (const line of casting) {
        for (const split of line) {
          expect(() =>
            assertSelectablePick(split.recordedMax, split.pick),
          ).not.toThrow()
        }
      }
    }
  })
})
