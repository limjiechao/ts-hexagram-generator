import type { CastingRecord, Hexagram } from '@hexagram/types'

// Shared stubs reused across viewer tests. None of these need to be
// algorithmically valid — the viewer only renders them — but the casting
// picks/maxes are at least internally consistent so a curious reader who
// spot-checks the table sees plausible numbers.

export const STUB_SAVED_PATH = '/tmp/consultation-mocked.txt'

/** A static (no-moving-lines) hexagram, used by random-flow tests. */
export const STUB_STATIC_HEXAGRAM: Hexagram = [7, 8, 7, 8, 7, 8]

/** A casting record paired with `STUB_STATIC_HEXAGRAM`. */
export const STUB_CASTING: CastingRecord = [
  [
    { pick: 24, max: 48 },
    { pick: 20, max: 43 },
    { pick: 16, max: 35 },
  ],
  [
    { pick: 24, max: 48 },
    { pick: 20, max: 43 },
    { pick: 16, max: 35 },
  ],
  [
    { pick: 24, max: 48 },
    { pick: 20, max: 43 },
    { pick: 16, max: 35 },
  ],
  [
    { pick: 24, max: 48 },
    { pick: 20, max: 43 },
    { pick: 16, max: 35 },
  ],
  [
    { pick: 24, max: 48 },
    { pick: 20, max: 43 },
    { pick: 16, max: 35 },
  ],
  [
    { pick: 24, max: 48 },
    { pick: 20, max: 43 },
    { pick: 16, max: 35 },
  ],
]
