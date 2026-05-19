import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { consultationFileOutput } from '../src/output-file'

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn(() => Promise.resolve()),
    writeFile: vi.fn(() => Promise.resolve()),
  },
}))

const mockedFs = vi.mocked(fs)

afterEach(() => {
  mockedFs.mkdir.mockClear()
  mockedFs.writeFile.mockClear()
})

describe('consultationFileOutput default directory', () => {
  // Regression: previously the default resolved relative to the viewer-ui
  // package's source file via `import.meta.url`, so files always landed in
  // `packages/viewer-ui/consultations` no matter where the CLI was invoked.
  // The default must instead be relative to the invoking process's working
  // directory — `process.cwd()` — so an end-user running the CLI from their
  // own project gets `<their-cwd>/consultations`.
  it('defaults to `<cwd>/consultations` (not the viewer-ui package source path)', async () => {
    const savedPath = await consultationFileOutput('plain reading')

    const expectedDirectory = path.join(process.cwd(), 'consultations')

    expect(mockedFs.mkdir).toHaveBeenCalledWith(expectedDirectory, {
      recursive: true,
    })
    expect(savedPath.startsWith(`${expectedDirectory}${path.sep}`)).toBe(true)

    // The old `__dirname`-based path always passed through `dist/..` or
    // `src/..` segments — those must NOT appear in the resolved default,
    // even when cwd happens to be inside the package during tests.
    expect(savedPath).not.toContain(`${path.sep}dist${path.sep}`)
    expect(savedPath).not.toContain(`${path.sep}src${path.sep}`)
  })

  it('respects an explicit output directory override', async () => {
    const customDirectory = path.join(process.cwd(), 'tmp-consultations')

    const savedPath = await consultationFileOutput(
      'plain reading',
      customDirectory,
    )

    expect(mockedFs.mkdir).toHaveBeenCalledWith(customDirectory, {
      recursive: true,
    })
    expect(savedPath.startsWith(`${customDirectory}${path.sep}`)).toBe(true)
  })
})

describe('consultationFileOutput plain text stripping', () => {
  it('strips all ANSI escape bytes from the saved .txt file (regression: monorepo refactor dropped the ESC anchor in the strip regex)', async () => {
    await consultationFileOutput('Test query for ESC byte assertion')
    // The mock captures every fs.writeFile call. Find the one that wrote the
    // plain-text consultation (the .txt path, not any sidecar JSON).
    const calls = mockedFs.writeFile.mock.calls
    const txtCall = calls.find(
      ([p]) => typeof p === 'string' && p.endsWith('.txt'),
    )
    expect(txtCall).toBeDefined()
    const content = String(txtCall![1])
    // Bug regression: every styled segment used to leave a lone ESC (0x1B)
    // byte in the file because the strip regex matched only `[…m` without
    // the ESC anchor. Assert the saved plain text is free of all ESC bytes.
    expect(content.includes('')).toBe(false)
  })
})
