import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { CastingRecord } from '@hexagram/core/types'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadConsultationFile, saveConsultationFile } from '../src/file.js'

// A fully-populated casting built with the renamed in-memory field. The
// converter passes each SplitRecord through opaquely, so the on-disk YAML key
// tracks this field name — these tests pin BOTH the in-memory field and the
// on-disk key as recordedMax, so a future converter change can't silently
// re-introduce the lying `max:` key.
const lc = (p1: number, p2: number, p3: number) =>
  [
    { pick: p1, recordedMax: 48 },
    { pick: p2, recordedMax: 43 },
    { pick: p3, recordedMax: 39 },
  ] as const

const casting = [
  lc(27, 28, 30),
  lc(22, 23, 29),
  lc(17, 24, 14),
  lc(22, 34, 25),
  lc(10, 26, 33),
  lc(12, 20, 18),
] as unknown as CastingRecord

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
