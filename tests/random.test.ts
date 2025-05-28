import { expect, test } from 'vitest'
import {
  generateRandomHexagram,
  generateRandomHexagrams,
  generateRandomLines,
} from '../src/random'

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

test('generateLines() should return valid report', { timeout: 40_000 }, () => {
  /*
    Line | Fraction | Percentage | Range
    -----|----------|------------|--------
    6    |  1/16    | 6.25%      | 2-10%
    7    |  5/16    | 31.25%     | 27-35%
    8    |  7/16    | 43.75%     | 39-47%
    9    |  3/16    | 18.75%     | 14-22%
   */

  const report = generateRandomLines(1_000_000)

  expect(report).toBeInstanceOf(Object)

  expect(report).toHaveProperty('Line 5')
  expect(report['Line 5']).toBe('0.000%')

  expect(report).toHaveProperty('Line 10')
  expect(report['Line 10']).toBe('0.000%')

  expect(report).toHaveProperty('Line 6')
  const line6Percentage = report['Line 6']
  expect(line6Percentage).toMatch(/^\d+\.\d+%$/)

  const line6Float = Number.parseFloat(line6Percentage)
  expect(line6Float).toBeGreaterThanOrEqual(2)
  expect(line6Float).toBeLessThanOrEqual(10)

  expect(report).toHaveProperty('Line 7')
  const line7Percentage = report['Line 7']
  expect(line7Percentage).toMatch(/^\d+\.\d+%$/)

  const line7Float = Number.parseFloat(line7Percentage)
  expect(line7Float).toBeGreaterThanOrEqual(27)
  expect(line7Float).toBeLessThanOrEqual(35)

  expect(report).toHaveProperty('Line 8')
  const line8Percentage = report['Line 8']
  expect(line8Percentage).toMatch(/^\d+\.\d+%$/)

  const line8Float = Number.parseFloat(line8Percentage)
  expect(line8Float).toBeGreaterThanOrEqual(39)
  expect(line8Float).toBeLessThanOrEqual(47)

  expect(report).toHaveProperty('Line 9')
  const line9Percentage = report['Line 9']
  expect(line9Percentage).toMatch(/^\d+\.\d+%$/)

  const line9Float = Number.parseFloat(line9Percentage)
  expect(line9Float).toBeGreaterThanOrEqual(14)
  expect(line9Float).toBeLessThanOrEqual(22)

  expect(line6Float + line7Float + line8Float + line9Float).toBeCloseTo(100, 1)

  // eslint-disable-next-line no-console
  console.table(report)
})
