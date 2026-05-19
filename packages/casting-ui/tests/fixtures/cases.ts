import type { CastingRecord, Hexagram, LineCasting } from '@hexagram/types'

// Build one line's three divisions from its picks and selectable ranges. The
// `max` values follow a real yarrow casting: the first division always ranges
// 1–48, later divisions narrow as stalks are set aside.
const lineCasting = (
  p1: number,
  p2: number,
  p3: number,
  m1 = 48,
  m2 = 43,
  m3 = 39,
): LineCasting => [
  { pick: p1, max: m1 },
  { pick: p2, max: m2 },
  { pick: p3, max: m3 },
]

export interface ConsultationCase {
  name: string
  query: string
  hexagram: Hexagram
  casting: CastingRecord
}

// The four scenarios the plain-output fixtures are captured from, shared by the
// byte-identity test (`output.test.ts`) and the fixture regeneration
// script (`scripts/generate-fixtures.ts`).
//
// The casting picks are illustrative: `castingSection` is purely presentational,
// so they need not algorithmically reproduce each case's hexagram.
export const cases: ConsultationCase[] = [
  {
    name: 'no-moving',
    query: 'Will the harvest be plentiful?',
    hexagram: [7, 8, 7, 8, 7, 8],
    casting: [
      lineCasting(27, 28, 30),
      lineCasting(22, 23, 29, 48, 43, 35),
      lineCasting(17, 24, 14, 48, 43, 35),
      lineCasting(22, 34, 25),
      lineCasting(10, 26, 33),
      lineCasting(12, 20, 18, 48, 39, 31),
    ],
  },
  {
    name: 'one-moving',
    query: 'Should I take the new position?',
    hexagram: [6, 7, 8, 7, 8, 7],
    casting: [
      lineCasting(5, 11, 7),
      lineCasting(31, 19, 22),
      lineCasting(8, 40, 13, 48, 43, 35),
      lineCasting(44, 2, 28),
      lineCasting(16, 33, 9, 48, 39, 35),
      lineCasting(21, 6, 30, 48, 39, 31),
    ],
  },
  {
    name: 'multi-moving',
    query: 'How will the journey unfold?',
    hexagram: [6, 9, 7, 8, 7, 8],
    casting: [
      lineCasting(13, 25, 4),
      lineCasting(41, 7, 36),
      lineCasting(9, 18, 27, 48, 43, 35),
      lineCasting(30, 12, 1),
      lineCasting(22, 38, 15, 48, 39, 35),
      lineCasting(3, 29, 20, 48, 39, 31),
    ],
  },
  {
    name: 'empty-query',
    query: '',
    hexagram: [7, 7, 7, 7, 7, 7],
    casting: [
      lineCasting(24, 20, 16),
      lineCasting(24, 20, 16),
      lineCasting(24, 20, 16),
      lineCasting(24, 20, 16),
      lineCasting(24, 20, 16),
      lineCasting(24, 20, 16),
    ],
  },
]
