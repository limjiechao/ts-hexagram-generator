import { number } from '@inquirer/prompts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getHexagramViaInteraction } from '../src/interactive-flow.js'

// Mock the inquirer prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  number: vi.fn(),
}))

type MockNumberPromptInputs =
  | {
      type: 'valid'
      inputs: [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ]
    }
  | {
      type: 'invalid'
      inputs: number[]
    }
const mockNumberPrompt = ({ inputs }: MockNumberPromptInputs) => {
  vi.mocked(number).mockImplementation(() => {
    const value = inputs.shift() ?? 1
    const promise = Promise.resolve(value)
    return Object.assign(promise, { cancel: () => {} })
  })
}

const originalConsoleInfo = console.info
const originalConsoleError = console.error

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock the current time to get predictable timestamps
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'))

    // Mock console.info to prevent output during tests
    console.info = vi.fn()
    console.error = vi.fn()
  })

  afterEach(() => {
    // Restore console.info
    console.info = originalConsoleInfo
    console.error = originalConsoleError

    // Restore real timers
    vi.useRealTimers()
  })

  describe('getHexagramViaInteraction', () => {
    it('should generate a hexagram with 6 lines', async () => {
      // Mock user inputs for all 18 splits (3 splits per line, 6 lines)
      const mockNumberPromptInputs: MockNumberPromptInputs = {
        type: 'valid',
        inputs: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      }
      mockNumberPrompt(mockNumberPromptInputs)

      const { hexagram, casting } = await getHexagramViaInteraction()

      // 18 prompts for the 6 lines
      expect(hexagram).toHaveLength(6)
      // 18 prompts for the 6 lines
      expect(number).toHaveBeenCalledTimes(18)
      expect(hexagram).toEqual([9, 9, 9, 9, 9, 9])

      // The casting record captures all 18 splits: 6 lines × 3 divisions.
      expect(casting).toHaveLength(6)
      expect(casting.every((line) => line.length === 3)).toBe(true)
      // Every mocked pick was 1; the first division records recordedMax 48 (=
      // stalks - 1; the selectable pick range is 1–47, reserving the right
      // heap's countable stalk so the remainder is never 0).
      expect(casting.flat().map((split) => split.pick)).toEqual(
        Array.from({ length: 18 }, () => 1),
      )
      expect(casting[0][0]).toEqual({ pick: 1, recordedMax: 48 })
    })

    it('should handle different valid split indices', async () => {
      // Line 1 uses each round's selectable CEILING (47, 42, 38) — one below the
      // recordedMax (48, 43, 39). The ceiling is the largest pick `performCast`
      // accepts; a pick equal to the recordedMax empties the right heap after
      // suspension and is rejected (never-zero-remainder invariant, ADR-0006).
      // The ceilings yield the same line value (9) as the old degenerate
      // recordedMax picks did, so the hexagram is unchanged.
      const mockNumberPromptInputs: MockNumberPromptInputs = {
        type: 'valid',
        inputs: [
          47, 42, 38, 1, 1, 1, 24, 19, 16, 40, 30, 20, 16, 26, 6, 43, 22, 30,
        ],
      }
      mockNumberPrompt(mockNumberPromptInputs)

      const { hexagram, casting } = await getHexagramViaInteraction()

      // 18 prompts for the 6 lines
      expect(number).toHaveBeenCalledTimes(18)

      // 6 lines in the hexagram
      expect(hexagram).toHaveLength(6)
      expect(hexagram).toEqual([9, 9, 6, 7, 8, 9])

      // The casting record's picks mirror the 18 mocked inputs, in order.
      expect(casting.flat().map((split) => split.pick)).toEqual([
        47, 42, 38, 1, 1, 1, 24, 19, 16, 40, 30, 20, 16, 26, 6, 43, 22, 30,
      ])
      expect(casting[0][0].recordedMax).toBe(48)
    })
  })
})
