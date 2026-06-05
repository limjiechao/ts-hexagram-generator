import process from 'node:process'

import { describe, expect, test, vi } from 'vitest'

import { runPlaygroundApp } from '../src/run-playground-app.js'

describe('runPlaygroundApp non-interactive refusal', () => {
  test('returns false and writes the exact refusal for a non-TTY snapshot', async () => {
    const writes: string[] = []
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        writes.push(String(chunk))
        return true
      })

    const result = await runPlaygroundApp({
      isTTY: false,
      NO_COLOR: undefined,
      CI: undefined,
    })

    expect(result).toBe(false)
    expect(writes).toEqual([
      'hexagram-playground requires an interactive terminal\n',
    ])
    stderr.mockRestore()
  })

  test('CI set non-empty is refused even on a TTY', async () => {
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true)
    const result = await runPlaygroundApp({
      isTTY: true,
      NO_COLOR: undefined,
      CI: 'true',
    })
    expect(result).toBe(false)
    stderr.mockRestore()
  })
})
