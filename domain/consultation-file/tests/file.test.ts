import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  defaultConsultationsDir,
  loadConsultationFile,
  saveConsultationFile,
} from '../src/file'

describe('defaultConsultationsDir', () => {
  it('is <cwd>/consultations', () => {
    expect(defaultConsultationsDir()).toBe(
      path.join(process.cwd(), 'consultations'),
    )
  })

  it('tracks process.cwd()', () => {
    const fake = path.join(path.sep, 'tmp', 'fake-cwd')
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(fake)
    expect(defaultConsultationsDir()).toBe(path.join(fake, 'consultations'))
    cwd.mockRestore()
  })
})

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'consultation-test-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('saveConsultationFile + loadConsultationFile', () => {
  it('saves a .md file with frontmatter and round-trips through the parser', async () => {
    const savedPath = await saveConsultationFile({
      query: 'Will it rain?',
      hexagram: [7, 8, 7, 8, 7, 8],
      casting: [
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
        [
          { pick: 1, max: 48 },
          { pick: 2, max: 43 },
          { pick: 3, max: 39 },
        ],
      ],
      dir: tmpDir,
    })

    expect(savedPath).toMatch(/consultation-.*\.md$/)
    const loaded = await loadConsultationFile(savedPath)
    if (!loaded.ok) throw new Error(`expected ok, got ${loaded.reason}`)
    expect(loaded.envelope.query).toBe('Will it rain?')
    expect(loaded.envelope.hexagram).toEqual([7, 8, 7, 8, 7, 8])
    expect(loaded.envelope.casting).not.toBeNull()
  })

  it('saves a null-casting consultation with no casting key and loads it back as null', async () => {
    const savedPath = await saveConsultationFile({
      query: 'What will it be like?',
      hexagram: [8, 7, 8, 9, 9, 9],
      casting: null,
      dir: tmpDir,
    })

    const text = await fs.readFile(savedPath, 'utf8')
    expect(text).not.toMatch(/^casting:/m)
    expect(text).toContain('_Casting not recorded._')

    const loaded = await loadConsultationFile(savedPath)
    if (!loaded.ok) throw new Error(`expected ok, got ${loaded.reason}`)
    expect(loaded.envelope.query).toBe('What will it be like?')
    expect(loaded.envelope.hexagram).toEqual([8, 7, 8, 9, 9, 9])
    expect(loaded.envelope.casting).toBeNull()
  })
})
