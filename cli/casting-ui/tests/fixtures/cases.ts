import { sampleCastingFor } from '@hexagram/core/sample-casting'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'

export interface ConsultationCase {
  name: string
  query: string
  hexagram: Hexagram
  casting: CastingRecord
}

// The four scenarios the plain-output fixtures are captured from, shared by the
// byte-identity test (`output.test.ts`) and the fixture regeneration script
// (`scripts/generate-fixtures.ts`). Each casting is the replay-valid set of 18
// stalk divisions the algorithm produces for the case's hexagram (so the
// fixtures depict physically-real divinations and survive `.md` load
// replay-validation, ADR-0008 S7).
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
