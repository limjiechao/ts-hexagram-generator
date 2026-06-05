import process from 'node:process'

import { describe, expect, test, vi } from 'vitest'

import { runHexagram } from '../src/run-hexagram.js'

describe('runHexagram non-interactive refusal', () => {
  test('returns false and writes the exact refusal for a non-TTY snapshot', async () => {
    const writes: string[] = []
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        writes.push(String(chunk))
        return true
      })

    // Injected snapshot — no render happens, so this never mounts Ink.
    const result = await runHexagram({
      isTTY: false,
      NO_COLOR: undefined,
      CI: undefined,
    })

    expect(result).toBe(false)
    expect(writes).toEqual(['hexagram requires an interactive terminal\n'])
    stderr.mockRestore()
  })

  test('NO_COLOR set non-empty is refused even on a TTY', async () => {
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true)
    const result = await runHexagram({
      isTTY: true,
      NO_COLOR: '1',
      CI: undefined,
    })
    expect(result).toBe(false)
    stderr.mockRestore()
  })
})
