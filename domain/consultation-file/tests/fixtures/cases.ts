import { sampleCastingFor } from '@hexagram/core/sample-casting'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'

// Fixed timestamp string used in the full-file fixtures so the bytes stay locked.
export const FIXTURE_TIMESTAMP = '2026-05-19T14:23:11+0800'

export interface ConsultationCase {
  name: string
  query: string
  hexagram: Hexagram
  casting: CastingRecord
}

// Each casting is the replay-valid set of 18 stalk divisions that the algorithm
// produces for the case's hexagram (`@hexagram/core/sample-casting`). They are
// derived from the hexagram, not hand-written, so the byte-identity fixtures
// (`.plain` + `.md`) encode physically-real divinations and survive `.md`
// load replay-validation (ADR-0008 S7) — a synthetic casting would not.
const buildCase = (
  name: string,
  query: string,
  hexagram: Hexagram,
): ConsultationCase => ({
  name,
  query,
  hexagram,
  casting: sampleCastingFor(hexagram),
})

export const cases: ConsultationCase[] = [
  buildCase('no-moving', 'Will the harvest be plentiful?', [7, 8, 7, 8, 7, 8]),
  buildCase(
    'one-moving',
    'Should I take the new position?',
    [6, 7, 8, 7, 8, 7],
  ),
  buildCase('multi-moving', 'How will the journey unfold?', [6, 9, 7, 8, 7, 8]),
  buildCase('empty-query', '', [7, 7, 7, 7, 7, 7]),
]
