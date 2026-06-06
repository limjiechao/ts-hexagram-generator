import process from 'node:process'

import { describe, expect, test, vi } from 'vitest'

import {
  classifyEnv,
  refuseIfNonInteractive,
  warnIfNonInteractive,
} from '../src/env-policy.js'

describe('classifyEnv', () => {
  // interactive = isTTY && !noColor && !ci
  test('TTY, no NO_COLOR, no CI -> interactive, not forceNumeric', () => {
    expect(
      classifyEnv({ isTTY: true, NO_COLOR: undefined, CI: undefined }),
    ).toEqual({ interactive: true, forceNumeric: false, headless: false })
  })

  test('non-TTY alone -> not interactive, not forceNumeric', () => {
    expect(
      classifyEnv({ isTTY: false, NO_COLOR: undefined, CI: undefined }),
    ).toEqual({ interactive: false, forceNumeric: false, headless: true })
  })

  test('NO_COLOR set non-empty -> not interactive, forceNumeric', () => {
    expect(classifyEnv({ isTTY: true, NO_COLOR: '1', CI: undefined })).toEqual({
      interactive: false,
      forceNumeric: true,
      headless: false,
    })
  })

  test('CI set non-empty -> not interactive, forceNumeric', () => {
    expect(
      classifyEnv({ isTTY: true, NO_COLOR: undefined, CI: 'true' }),
    ).toEqual({ interactive: false, forceNumeric: true, headless: false })
  })

  test('empty-string NO_COLOR / CI are treated as unset', () => {
    expect(classifyEnv({ isTTY: true, NO_COLOR: '', CI: '' })).toEqual({
      interactive: true,
      forceNumeric: false,
      headless: false,
    })
  })

  test('forceNumeric ignores isTTY (heuristic is env-only)', () => {
    expect(classifyEnv({ isTTY: false, NO_COLOR: '1', CI: undefined })).toEqual(
      {
        interactive: false,
        forceNumeric: true,
        headless: true,
      },
    )
  })

  test('headless is true iff stdout is not a TTY, regardless of NO_COLOR/CI', () => {
    expect(
      classifyEnv({ isTTY: false, NO_COLOR: undefined, CI: undefined })
        .headless,
    ).toBe(true)
    expect(
      classifyEnv({ isTTY: true, NO_COLOR: '1', CI: undefined }).headless,
    ).toBe(false)
    expect(
      classifyEnv({ isTTY: true, NO_COLOR: undefined, CI: 'true' }).headless,
    ).toBe(false)
  })
})

describe('refuseIfNonInteractive', () => {
  test('writes the exact message for a suffixed bin and exits 1', () => {
    const writes: string[] = []
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        writes.push(String(chunk))
        return true
      })
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as never)

    refuseIfNonInteractive('hexagram-history')

    expect(writes).toEqual([
      'hexagram-history requires an interactive terminal\n',
    ])
    expect(exit).toHaveBeenCalledWith(1)
    stderr.mockRestore()
    exit.mockRestore()
  })

  test('writes the prefix-less message for the composed shell bin', () => {
    const writes: string[] = []
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        writes.push(String(chunk))
        return true
      })
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as never)

    refuseIfNonInteractive('hexagram')

    expect(writes).toEqual(['hexagram requires an interactive terminal\n'])
    expect(exit).toHaveBeenCalledWith(1)
    stderr.mockRestore()
    exit.mockRestore()
  })
})

describe('warnIfNonInteractive', () => {
  test('interactive env -> returns true, writes nothing', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    const result = warnIfNonInteractive('hexagram', {
      isTTY: true,
      NO_COLOR: undefined,
      CI: undefined,
    })
    expect(result).toBe(true)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('non-interactive env -> returns false, writes the bin-named message', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    const result = warnIfNonInteractive('hexagram-playground', {
      isTTY: false,
      NO_COLOR: undefined,
      CI: undefined,
    })
    expect(result).toBe(false)
    expect(spy).toHaveBeenCalledWith(
      'hexagram-playground requires an interactive terminal\n',
    )
    spy.mockRestore()
  })
})
