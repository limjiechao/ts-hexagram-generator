import type {
  CastingRecord,
  Hexagram,
  Line,
  LineCasting,
} from '@hexagram/core/types'

// Real, replay-valid stalk-division building blocks — one per line value.
// CANONICAL copy lives at
// `domain/consultation-file/tests/fixtures/real-casting.ts` and is locked by
// `domain/consultation-file/tests/real-casting.test.ts` (it replays each block
// through the algorithm). This is a verbatim mirror: ADR-0019 forbids a
// `cli/*` file from importing a `domain/*` test fixture and vice-versa, so the
// helper exists once per side of the boundary.
const REAL_LINE_CASTING: Record<Line, LineCasting> = {
  6: [
    { pick: 4, recordedMax: 48 },
    { pick: 3, recordedMax: 39 },
    { pick: 3, recordedMax: 31 },
  ],
  7: [
    { pick: 1, recordedMax: 48 },
    { pick: 3, recordedMax: 43 },
    { pick: 3, recordedMax: 35 },
  ],
  8: [
    { pick: 1, recordedMax: 48 },
    { pick: 1, recordedMax: 43 },
    { pick: 3, recordedMax: 39 },
  ],
  9: [
    { pick: 1, recordedMax: 48 },
    { pick: 1, recordedMax: 43 },
    { pick: 1, recordedMax: 39 },
  ],
}

// Build the replay-valid casting the algorithm produces for `hexagram`, so the
// `.plain` byte-identity fixtures depict the same physically-real divinations
// as the `.md` fixtures (ADR-0008 S7) rather than illustrative picks.
const realCastingFor = (hexagram: Hexagram): CastingRecord =>
  hexagram.map(
    (line) =>
      REAL_LINE_CASTING[line].map((split) => ({ ...split })) as LineCasting,
  ) as CastingRecord

export interface ConsultationCase {
  name: string
  query: string
  hexagram: Hexagram
  casting: CastingRecord
}

// The four scenarios the plain-output fixtures are captured from, shared by the
// byte-identity test (`output.test.ts`) and the fixture regeneration
// script (`scripts/generate-fixtures.ts`).
const buildCase = (
  name: string,
  query: string,
  hexagram: Hexagram,
): ConsultationCase => ({
  name,
  query,
  hexagram,
  casting: realCastingFor(hexagram),
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
