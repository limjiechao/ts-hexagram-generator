import type {
  CastingRecord,
  Hexagram,
  Line,
  LineCasting,
} from '@hexagram/core/types'

/**
 * Real, replay-valid stalk-division building blocks — one per line value.
 *
 * Each triple was found by driving the production `makeLineGenerator` (the
 * yarrow-stalk algorithm) and recording the `(pick, recordedMax)` of every
 * round, so replaying it through the SAME generator reproduces the line value
 * it is keyed under. They are the smallest such picks.
 *
 * WHY this exists: until ADR-0008's S7 amendment landed, nothing replayed a
 * `.md` casting on load, so fixtures across the suite carried SYNTHETIC
 * castings (e.g. picks 1, 2, 3) that never actually replayed to their stated
 * hexagram — the asymmetry S7 closed. Once `.md` load replay-validates, any
 * test that loads such data fails. `realCastingFor` lets a fixture ask for a
 * physically-real casting that replays to any hexagram it chooses. The blocks
 * are locked by `tests/real-casting.test.ts`, which replays each one and fails
 * if an algorithm change makes them stop reproducing their line.
 */
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

/**
 * Build a replay-valid `CastingRecord` for `hexagram`: the 18 stalk divisions
 * that, replayed through `makeLineGenerator`, reproduce exactly `hexagram`.
 * Each split is deep-copied so a caller can mutate the result without
 * corrupting the shared blocks.
 */
export function realCastingFor(hexagram: Hexagram): CastingRecord {
  return hexagram.map(
    (line) =>
      REAL_LINE_CASTING[line].map((split) => ({ ...split })) as LineCasting,
  ) as CastingRecord
}
