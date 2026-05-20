import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  markdownConsultationBody,
  serializeFrontmatter,
} from '@hexagram/consultation-file'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { rerenderOnDisk } from '../src/history-app'

let tmpDir: string
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'history-rerender-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('rerenderOnDisk', () => {
  it('rewrites a file whose body diverges from the renderer', async () => {
    const envelope = {
      schemaVersion: 1,
      timestamp: '2026-05-19T14:23:11+0800',
      query: 'Q',
      hexagram: [7, 8, 7, 8, 7, 8] as const,
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
    }
    const filePath = path.join(tmpDir, 'consultation.md')
    await fs.writeFile(
      filePath,
      serializeFrontmatter(envelope as never, 'STALE BODY'),
      'utf8',
    )
    const r = await rerenderOnDisk(filePath, envelope as never)
    expect(r.rewrote).toBe(true)
    const after = await fs.readFile(filePath, 'utf8')
    expect(after).toContain('## QUERY')
  })

  it('leaves a file untouched if the body already matches', async () => {
    const envelope = {
      schemaVersion: 1,
      timestamp: '2026-05-19T14:23:11+0800',
      query: 'Q',
      hexagram: [7, 8, 7, 8, 7, 8] as const,
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
    }
    const body = markdownConsultationBody(
      envelope.query,
      envelope.hexagram as never,
      envelope.casting as never,
    )
    const filePath = path.join(tmpDir, 'consultation.md')
    await fs.writeFile(
      filePath,
      serializeFrontmatter(envelope as never, body),
      'utf8',
    )
    const before = await fs.readFile(filePath, 'utf8')
    const r = await rerenderOnDisk(filePath, envelope as never)
    expect(r.rewrote).toBe(false)
    const after = await fs.readFile(filePath, 'utf8')
    expect(after).toBe(before)
  })
})
