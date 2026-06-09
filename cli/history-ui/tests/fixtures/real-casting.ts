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
// `cli/*` file from importing a `domain/*` test fixture, so the helper exists
// once per side of the boundary. A fixture consultation now needs a casting
// that REPLAYS to its hexagram — `.md` load validates the splits (ADR-0008 S7),
// so a synthetic casting would surface the row as `[unreadable]`.
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

/** Build the replay-valid casting the algorithm produces for `hexagram`. */
export const realCastingFor = (hexagram: Hexagram): CastingRecord =>
  hexagram.map(
    (line) =>
      REAL_LINE_CASTING[line].map((split) => ({ ...split })) as LineCasting,
  ) as CastingRecord
