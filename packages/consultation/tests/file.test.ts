import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadConsultationFile, saveConsultationFile } from '../src/file'

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
  })
})
