import type { CastingRecord, Hexagram } from '@hexagram/core/types'

// Shared stubs reused across viewer tests. None of these need to be
// algorithmically valid — the viewer only renders them — but the casting
// picks/recordedMaxes are at least internally consistent so a curious reader who
// spot-checks the table sees plausible numbers.

export const STUB_SAVED_PATH = '/tmp/consultation-mocked.txt'

/** A static (no-moving-lines) hexagram, used by random-flow tests. */
export const STUB_STATIC_HEXAGRAM: Hexagram = [7, 8, 7, 8, 7, 8]

/** A casting record paired with `STUB_STATIC_HEXAGRAM`. */
export const STUB_CASTING: CastingRecord = [
  [
    { pick: 24, recordedMax: 48 },
    { pick: 20, recordedMax: 43 },
    { pick: 16, recordedMax: 35 },
  ],
  [
    { pick: 24, recordedMax: 48 },
    { pick: 20, recordedMax: 43 },
    { pick: 16, recordedMax: 35 },
  ],
  [
    { pick: 24, recordedMax: 48 },
    { pick: 20, recordedMax: 43 },
    { pick: 16, recordedMax: 35 },
  ],
  [
    { pick: 24, recordedMax: 48 },
    { pick: 20, recordedMax: 43 },
    { pick: 16, recordedMax: 35 },
  ],
  [
    { pick: 24, recordedMax: 48 },
    { pick: 20, recordedMax: 43 },
    { pick: 16, recordedMax: 35 },
  ],
  [
    { pick: 24, recordedMax: 48 },
    { pick: 20, recordedMax: 43 },
    { pick: 16, recordedMax: 35 },
  ],
]
