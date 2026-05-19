import type { CastingRecord, Hexagram, LineCasting } from '@hexagram/types'

const lc = (
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

// Fixed timestamp string used in the full-file fixtures so the bytes stay locked.
export const FIXTURE_TIMESTAMP = '2026-05-19T14:23:11+0800'

export interface ConsultationCase {
  name: string
  query: string
  hexagram: Hexagram
  casting: CastingRecord
}

export const cases: ConsultationCase[] = [
  {
    name: 'no-moving',
    query: 'Will the harvest be plentiful?',
    hexagram: [7, 8, 7, 8, 7, 8],
    casting: [
      lc(27, 28, 30),
      lc(22, 23, 29, 48, 43, 35),
      lc(17, 24, 14, 48, 43, 35),
      lc(22, 34, 25),
      lc(10, 26, 33),
      lc(12, 20, 18, 48, 39, 31),
    ],
  },
  {
    name: 'one-moving',
    query: 'Should I take the new position?',
    hexagram: [6, 7, 8, 7, 8, 7],
    casting: [
      lc(5, 11, 7),
      lc(31, 19, 22),
      lc(8, 40, 13, 48, 43, 35),
      lc(44, 2, 28),
      lc(16, 33, 9, 48, 39, 35),
      lc(21, 6, 30, 48, 39, 31),
    ],
  },
  {
    name: 'multi-moving',
    query: 'How will the journey unfold?',
    hexagram: [6, 9, 7, 8, 7, 8],
    casting: [
      lc(13, 25, 4),
      lc(41, 7, 36),
      lc(9, 18, 27, 48, 43, 35),
      lc(30, 12, 1),
      lc(22, 38, 15, 48, 39, 35),
      lc(3, 29, 20, 48, 39, 31),
    ],
  },
  {
    name: 'empty-query',
    query: '',
    hexagram: [7, 7, 7, 7, 7, 7],
    casting: [
      lc(24, 20, 16),
      lc(24, 20, 16),
      lc(24, 20, 16),
      lc(24, 20, 16),
      lc(24, 20, 16),
      lc(24, 20, 16),
    ],
  },
]
