import { sampleCastingFor } from '@hexagram/core/sample-casting'
import { describe, expect, it } from 'vitest'

import { parseFrontmatter, serializeFrontmatter } from '../src/frontmatter.js'

// ADR-0008 S7: `.md` load replay-validates its casting, closing the asymmetry
// where a corrupted/hand-edited `.md` rendered a trusted-but-impossible ledger
// while the same data via legacy `.txt` was rejected. A mismatch fails closed
// to `[unreadable]` via the `casting-unreplayable` parse reason — refusal, not
// salvage (our own output always replays unless tampered with).
describe('parseFrontmatter — casting replay validation', () => {
  it('reports `casting-unreplayable` when the casting does not replay to the hexagram', () => {
    // A well-shaped, valid-YAML `.md` whose casting is physically impossible
    // for the stored hexagram: the casting replays to [7,8,7,8,7,8] but the
    // file claims [8,8,8,8,8,8].
    const text = serializeFrontmatter(
      {
        schemaVersion: 1,
        timestamp: '2026-01-01T00:00:00+0800',
        query: 'q',
        hexagram: [8, 8, 8, 8, 8, 8],
        casting: sampleCastingFor([7, 8, 7, 8, 7, 8]),
        castingAbsence: null,
      },
      'body',
    )
    const result = parseFrontmatter(text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('casting-unreplayable')
  })

  it('reports `casting-unreplayable` when a recorded pick is out of range', () => {
    // A `pick` that empties the right heap after suspension throws inside the
    // generator; `castingReplaysTo` catches the throw as a mismatch, so the
    // load fails closed rather than surfacing a `RangeError`.
    const real = sampleCastingFor([7, 7, 7, 7, 7, 7])
    real[0][0] = { pick: 999, recordedMax: 48 }
    const text = serializeFrontmatter(
      {
        schemaVersion: 1,
        timestamp: '2026-01-01T00:00:00+0800',
        query: 'q',
        hexagram: [7, 7, 7, 7, 7, 7],
        casting: real,
        castingAbsence: null,
      },
      'body',
    )
    const result = parseFrontmatter(text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('casting-unreplayable')
  })

  it('accepts a real, replay-valid casting', () => {
    // The positive control: a casting the algorithm actually produces for the
    // stored hexagram loads cleanly.
    const text = serializeFrontmatter(
      {
        schemaVersion: 1,
        timestamp: '2026-01-01T00:00:00+0800',
        query: 'q',
        hexagram: [6, 9, 7, 8, 7, 8],
        casting: sampleCastingFor([6, 9, 7, 8, 7, 8]),
        castingAbsence: null,
      },
      'body',
    )
    const result = parseFrontmatter(text)
    expect(result.ok).toBe(true)
  })
})
