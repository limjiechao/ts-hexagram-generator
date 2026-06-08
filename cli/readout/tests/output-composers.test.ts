import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import {
  buildConsultationSections,
  buildPartialCastingSections,
} from '../src/output-composers.js'

// Seam B2 (2026-06-08 review): the mid-flow render must not be a SECOND
// authority that mints its own IR `media` projection — both render paths now
// flow through the shared query/casting sub-builders (ADR-0018: one owner of
// visibility). This pins that the transient mid-flow render of a *complete*
// casting is byte-identical to the full render's query + casting sections, so a
// future change to canonical query/casting rendering can't silently diverge.
const casting: CastingRecord = Array.from({ length: 6 }, () => [
  { pick: 1, recordedMax: 48 },
  { pick: 2, recordedMax: 43 },
  { pick: 3, recordedMax: 39 },
]) as CastingRecord

const hexagram: Hexagram = [7, 7, 7, 7, 7, 7]

describe('buildPartialCastingSections / buildConsultationSections parity', () => {
  it('mid-flow query + casting strings match the full render', () => {
    const partial = buildPartialCastingSections('a question', casting)
    const full = buildConsultationSections('a question', hexagram, casting)
    expect(partial.query).toBe(full.query)
    expect(partial.casting).toBe(full.casting)
  })
})
