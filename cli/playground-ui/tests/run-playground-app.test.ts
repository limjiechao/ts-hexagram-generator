import process from 'node:process'

import { render } from 'ink'
import { describe, expect, test, vi } from 'vitest'

import { runPlaygroundApp } from '../src/run-playground-app.js'

// Mock Ink's `render` so the threading test never mounts the real
// alternate-screen app — we only need to inspect the element the run-entry
// constructs. The refusal tests bail out before `render` is reached, so the
// mock is inert for them.
vi.mock('ink', () => ({
  render: vi.fn(() => ({ waitUntilExit: () => Promise.resolve() })),
}))

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
      env: { isTTY: false, NO_COLOR: undefined, CI: undefined },
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
      env: { isTTY: true, NO_COLOR: undefined, CI: 'true' },
    })
    expect(result).toBe(false)
    stderr.mockRestore()
  })
})

describe('runPlaygroundApp consultations-dir threading (B1 / ADR-0020)', () => {
  test('threads the resolved dir into PlaygroundApp as saveDir', async () => {
    vi.mocked(render).mockClear()
    const dir = '/anchored/repo-root/consultations'

    const result = await runPlaygroundApp({
      dir,
      env: { isTTY: true, NO_COLOR: undefined, CI: undefined },
    })

    expect(result).toBe(true)
    const element = vi.mocked(render).mock.calls[0]?.[0] as {
      props: { saveDir?: string }
    }
    expect(element.props.saveDir).toBe(dir)
  })
})
