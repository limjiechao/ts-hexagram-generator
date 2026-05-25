import { describe, expect, test } from 'vitest'

import {
  generateRandomHexagram,
  generateRandomHexagrams,
  generateRandomLines,
} from '../src/random-casting'

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
      Line | Fraction | Canonical | Band      | Observed (n=1M)
      -----|----------|-----------|-----------|----------------
      6    |  1/16    | 6.25%     | 2-10%     | ~4.8%
      7    |  5/16    | 31.25%    | 25-35%    | ~27.8%
      8    |  7/16    | 43.75%    | 39-49%    | ~45.2%
      9    |  3/16    | 18.75%    | 14-26%    | ~22.2%

      The observed distribution drifts ~1-3pp from the canonical Wilhelm-
      Baynes probabilities because this implementation sets aside 0 stalks
      from an empty right pile (when `pick === length - 1` empties the
      right pile after the "suspend one" step). The competing canonical
      interpretation treats an empty pile as "set aside 4". The bands here
      are wide enough to accommodate either reading while still catching
      a grossly broken generator.
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
