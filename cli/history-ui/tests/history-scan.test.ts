import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { serializeFrontmatter } from '@hexagram/consultation-file/frontmatter'
import { sampleCastingFor } from '@hexagram/core/sample-casting'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { scanConsultations } from '../src/history-scan.js'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'history-scan-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('scanConsultations', () => {
  it('returns [] for an empty dir', async () => {
    const result = await scanConsultations(tmpDir)
    expect(result.entries).toEqual([])
    expect(result.unreadable).toEqual([])
  })

  it('returns entries sorted by timestamp descending', async () => {
    const mkFile = async (ts: string, query: string): Promise<void> => {
      const text = serializeFrontmatter(
        {
          schemaVersion: 1,
          timestamp: ts,
          query,
          hexagram: [7, 8, 7, 8, 7, 8],
          // Replay-valid casting: scanConsultations parses each `.md`, which now
          // replay-validates the splits (ADR-0008 S7); a synthetic casting would
          // land these rows in `unreadable` instead of `entries`.
          casting: sampleCastingFor([7, 8, 7, 8, 7, 8]),
          castingAbsence: null,
        },
        'BODY',
      )
      await fs.writeFile(
        path.join(tmpDir, `consultation-${ts.replaceAll(':', '-')}.md`),
        text,
        'utf8',
      )
    }
    await mkFile('2026-01-01T10:00:00+0800', 'first')
    await mkFile('2026-03-01T10:00:00+0800', 'third')
    await mkFile('2026-02-01T10:00:00+0800', 'second')
    const result = await scanConsultations(tmpDir)
    expect(result.entries.map((e) => e.envelope.query)).toEqual([
      'third',
      'second',
      'first',
    ])
  })

  it('ignores the legacy/ subdir', async () => {
    await fs.mkdir(path.join(tmpDir, 'legacy'))
    await fs.writeFile(
      path.join(tmpDir, 'legacy', 'foo.md'),
      'whatever',
      'utf8',
    )
    const result = await scanConsultations(tmpDir)
    expect(result.entries).toEqual([])
  })

  it('reports unreadable rows when frontmatter is bad', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'consultation-2026-01-01T10-00-00+0800.md'),
      '# no frontmatter here',
      'utf8',
    )
    const result = await scanConsultations(tmpDir)
    expect(result.entries).toEqual([])
    expect(result.unreadable.length).toBe(1)
  })
})
