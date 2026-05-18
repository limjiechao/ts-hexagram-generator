import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { consultationFileOutput } from '../src/output-file'

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
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
