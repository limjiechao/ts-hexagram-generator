import fs from 'node:fs/promises'
import process from 'node:process'
import { input, number } from '@inquirer/prompts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getHexagramViaInteraction, main } from '../src/interactive'

vi.mock('node:fs/promises')
const mockedFs = vi.mocked(fs)

// Mock process.exit
vi.mock('node:process', () => ({
  default: {
    exit: vi.fn(),
  },
}))

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

const mockInputPrompt = (__input: string) => {
  vi.mocked(input).mockImplementation(() => {
    const promise = Promise.resolve(__input)
    return Object.assign(promise, { cancel: () => {} })
  })
}

const originalConsoleInfo = console.info
const originalConsoleError = console.error

const LINE_ARRAY_REGEX =
  // eslint-disable-next-line no-control-regex
  /\u001B\[1;\d{2}m9, \u001B\[1;\d{2}m9, \u001B\[1;\d{2}m6, \u001B\[1;\d{2}m7, \u001B\[1;\d{2}m8, \u001B\[1;\d{2}m9\n/

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

      const { hexagram } = await getHexagramViaInteraction()

      // 18 prompts for the 6 lines
      expect(hexagram).toHaveLength(6)
      // 18 prompts for the 6 lines
      expect(number).toHaveBeenCalledTimes(18)
      expect(hexagram).toEqual([9, 9, 9, 9, 9, 9])
    })

    it('should handle different valid split indices', async () => {
      // Mock different split indices to test variety
      const mockNumberPromptInputs: MockNumberPromptInputs = {
        type: 'valid',
        inputs: [
          48, 43, 39, 1, 1, 1, 24, 19, 16, 40, 30, 20, 16, 26, 6, 43, 22, 30,
        ],
      }
      mockNumberPrompt(mockNumberPromptInputs)

      const { hexagram } = await getHexagramViaInteraction()

      // 18 prompts for the 6 lines
      expect(number).toHaveBeenCalledTimes(18)

      // 6 lines in the hexagram
      expect(hexagram).toHaveLength(6)
      expect(hexagram).toEqual([9, 9, 6, 7, 8, 9])
    })
  })

  describe('main', () => {
    it('should run without errors with valid inputs', async () => {
      // Mock user inputs
      mockInputPrompt('Hello World')

      const mockNumberPromptInputs: MockNumberPromptInputs = {
        type: 'valid',
        inputs: [
          48, 43, 39, 1, 1, 1, 24, 19, 16, 40, 30, 20, 16, 26, 6, 43, 22, 30,
        ],
      }
      mockNumberPrompt(mockNumberPromptInputs)

      await main()

      expect(console.info).toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalledWith(
        'An error occurred:',
        expect.objectContaining({ message: 'Invalid line' }),
      )
      expect(console.error).not.toHaveBeenCalledWith(
        'An error occurred:',
        expect.objectContaining({ message: 'Invalid hexagram' }),
      )

      expect(console.info).toHaveBeenCalled()

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Hello World'),
      )

      // Get all calls to console.info
      const calls = vi.mocked(console.info).mock.calls
      // Verify the content of the calls
      expect(calls.length).toBeGreaterThan(0)
      // You can also verify specific content if you know what to expect
      // For example, if you expect a hexagram output:
      expect(calls.some((call) => call[0].match(LINE_ARRAY_REGEX))).toBe(true)
      expect(
        calls.some(
          (call) =>
            call[0].includes('9  ━━━━○━━━━') &&
            call[0].includes('8  ━━━   ━━━') &&
            call[0].includes('7  ━━━━━━━━━') &&
            call[0].includes('6  ━━━ × ━━━') &&
            call[0].includes('9  ━━━━○━━━━') &&
            call[0].includes('9  ━━━━○━━━━'),
        ),
      ).toBe(true)

      expect(mockedFs.mkdir).toHaveBeenCalledWith('./consultations', {
        recursive: true,
      })
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        './consultations/consultation-2024-01-15T10:30:00.000Z.txt',
        expect.any(String),
        { encoding: 'utf-8' },
      )

      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('should throw an invalid line error with invalid inputs', async () => {
      mockInputPrompt('Hello World')
      // Mock user inputs
      const mockNumberPromptInputs: MockNumberPromptInputs = {
        type: 'invalid',
        inputs: [99, 99, 99],
      }
      mockNumberPrompt(mockNumberPromptInputs)

      await main()

      expect(process.exit).toHaveBeenCalledWith(1)

      expect(console.error).toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalledWith(
        'An error occurred:',
        expect.objectContaining({ message: 'Invalid hexagram' }),
      )
      expect(console.error).toHaveBeenCalledWith(
        'An error occurred:',
        expect.objectContaining({
          message: 'Line generator should yield a Line',
        }),
      )
    })
  })
})
