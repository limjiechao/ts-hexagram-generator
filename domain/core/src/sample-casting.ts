import type { CastingRecord, Hexagram, Line, LineCasting } from './types.js'

/**
 * The casting algorithm's deterministic inverse: given a target hexagram, the
 * 18 stalk divisions that — replayed through `makeLineGenerator` — reproduce it.
 *
 * The forward algorithm maps 18 picks → 6 lines; this picks one canonical set
 * of divisions per line value, so any hexagram can be turned back into a
 * concrete, replay-valid `CastingRecord`. Useful for examples, documentation,
 * and as the source of truth for test fixtures that must survive `.md` load
 * replay-validation (ADR-0008): a hand-written casting that does not actually
 * replay to its hexagram is now refused, so fixtures cannot fake one.
 *
 * The per-line blocks are the smallest picks the generator accepts for each
 * line value; they are locked by `tests/sample-casting.test.ts`, which replays
 * each one and fails if an algorithm change makes it stop reproducing its line.
 */
const LINE_DIVISIONS: Record<Line, LineCasting> = {
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
 * Build a replay-valid `CastingRecord` for `hexagram`. Each line's three splits
 * are deep-copied so a caller can mutate the result without corrupting the
 * shared blocks.
 */
export function sampleCastingFor(hexagram: Hexagram): CastingRecord {
  return hexagram.map(
    (line) =>
      LINE_DIVISIONS[line].map((split) => ({ ...split })) as LineCasting,
  ) as CastingRecord
}
