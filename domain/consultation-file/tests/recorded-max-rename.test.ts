import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadConsultationFile, saveConsultationFile } from '../src/file.js'
import { realCastingFor } from './fixtures/real-casting.js'

// A fully-populated, replay-valid casting for the round-trip hexagram. The
// converter passes each SplitRecord through opaquely, so the on-disk YAML key
// tracks the in-memory field name — these tests pin BOTH the in-memory field
// and the on-disk key as recordedMax, so a future converter change can't
// silently re-introduce the lying `max:` key. The first split of every line is
// recordedMax 48, which is what both assertions below check. The casting must
// replay to its hexagram now that `.md` load validates it (ADR-0008 S7), so it
// is built from real divisions rather than synthetic picks.
const casting = realCastingFor([7, 8, 7, 8, 7, 8])

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'recmax-'))
})
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('SplitRecord.recordedMax — in-memory and on-disk', () => {
  it('round-trips: the loaded in-memory split field is recordedMax, not max', async () => {
    const file = await saveConsultationFile({
      query: 'round-trip',
      hexagram: [7, 8, 7, 8, 7, 8],
      casting,
      dir: tmpDir,
    })
    const loaded = await loadConsultationFile(file)
    if (!loaded.ok) throw new Error(`expected ok, got ${loaded.reason}`)
    const split = loaded.envelope.casting![0][0]
    expect(split).toHaveProperty('recordedMax', 48)
    expect(split).not.toHaveProperty('max')
  })

  it('persists the on-disk YAML casting key as recordedMax, never max', async () => {
    const file = await saveConsultationFile({
      query: 'on-disk',
      hexagram: [7, 8, 7, 8, 7, 8],
      casting,
      dir: tmpDir,
    })
    const text = await fs.readFile(file, 'utf8')
    expect(text).toContain('recordedMax: 48')
    expect(text).not.toMatch(/^\s*max:/m)
  })
})
