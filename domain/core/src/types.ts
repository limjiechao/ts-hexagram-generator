export type Line = 6 | 7 | 8 | 9
export const isLine = (value: unknown): value is Line =>
  value === 6 || value === 7 || value === 8 || value === 9

export const assertIsLine: (value: unknown) => asserts value is Line = (
  value,
) => {
  if (!isLine(value)) {
    throw new TypeError('Line generator should yield a Line')
  }
}

export type Hexagram = [Line, Line, Line, Line, Line, Line]
export const isHexagram = (hexagram: unknown): hexagram is Hexagram =>
  Array.isArray(hexagram) &&
  hexagram.length === 6 &&
  hexagram.every((line) => isLine(line))

export const assertIsHexagram: (value: unknown) => asserts value is Hexagram = (
  value,
) => {
  if (!isHexagram(value)) {
    throw new TypeError('Hexagram generator should return a Hexagram')
  }
}

/**
 * A 0-based index into a `Hexagram` tuple: `0` = Line 1 (bottom) … `5` = Line 6
 * (top). The single authoritative range guard — previously duplicated as a
 * private guard in `consultation-view`'s view builder and an exported guard in
 * `cli/viewer-core` (finding S7). Both now import this one.
 */
export type LineIndex = 0 | 1 | 2 | 3 | 4 | 5

/**
 * Narrow an `unknown` (or the `number` that `Array.findIndex` returns) to a
 * `LineIndex`. The `>= 0` lower bound already rejects the `findIndex`
 * "not found" sentinel `-1` along with every other negative.
 * NOTE: this is a RANGE guard, not an integer guard — it admits non-integers
 * within [0, 5] (matches the prior behaviour).
 */
export function isLineIndex(value: unknown): value is LineIndex {
  return typeof value === 'number' && value >= 0 && value <= 5
}

/** Line positions in visual top-first order (line 6 top … line 1 bottom) — the
 *  order every hexagram diagram and the casting ledger render in. The single
 *  named owner of the bottom-first-tuple ↔ top-first-presentation flip for the
 *  view layer. (The YAML converters in `@hexagram/consultation-file` name the
 *  SAME flip separately at the disk boundary — they build a keyed `L6..L1`
 *  mapping, a different operation; ADR-0008.) */
export const POSITIONS_TOP_FIRST: readonly [6, 5, 4, 3, 2, 1] = [
  6, 5, 4, 3, 2, 1,
]

/** Reverse a bottom-first 6-tuple into a top-first 6-tuple (index 0 = line 6).
 *  Used by the view builder for the transformation emerging row; replaces the
 *  anonymous `x[5 - i]` literal. */
export function toTopFirst<T>(
  tuple: readonly [T, T, T, T, T, T],
): [T, T, T, T, T, T] {
  return [tuple[5], tuple[4], tuple[3], tuple[2], tuple[1], tuple[0]]
}

export type FourOperationsResult = {
  unpartedStalks: number[]
  suspendedFromNextRound: number[]
}
const isFourOperationsResult = (
  value: unknown,
): value is FourOperationsResult =>
  typeof value === 'object' &&
  value !== null &&
  'unpartedStalks' in value &&
  'suspendedFromNextRound' in value &&
  Array.isArray(value.unpartedStalks) &&
  Array.isArray(value.suspendedFromNextRound) &&
  value.unpartedStalks.every((stalk) => typeof stalk === 'number') &&
  value.suspendedFromNextRound.every((stalk) => typeof stalk === 'number')

export const assertIsFourOperationsResult: (
  value: unknown,
) => asserts value is FourOperationsResult = (value) => {
  if (!isFourOperationsResult(value)) {
    throw new TypeError('Line generator should yield a FourOperationsResult')
  }
}

// One stalk division: the index the stalks were parted at (`pick`) and the
// RECORDED ceiling for that round (`recordedMax` = `unparted − 1`, reserving the
// one suspended stalk 掛一). `recordedMax` is NOT a legal pick: the selectable
// range is `[1, recordedMax − 1]` = `[1, selectablePickMax(recordedMax)]` (see
// `casting-derivation.ts`). The field is PERSISTED — the on-disk YAML casting key
// is `recordedMax` too (no converter remap; no schemaVersion bump; ADR-0008).
// Captured for both interactive picks and RNG-chosen splits so the casting can
// be replayed.
export type SplitRecord = { pick: number; recordedMax: number }
// The three divisions (三變) that produce one line.
export type LineCasting = [SplitRecord, SplitRecord, SplitRecord]
// All eighteen divisions (十有八變) that produce a hexagram, in casting order
// (line 1 first).
export type CastingRecord = [
  LineCasting,
  LineCasting,
  LineCasting,
  LineCasting,
  LineCasting,
  LineCasting,
]

/**
 * Why a consultation has no recorded casting. Present in the saved envelope only
 * when `casting` is absent (see ADR-0008). The three origins are otherwise
 * indistinguishable:
 *  - 'legacy-no-table'    — migrated legacy .txt with no CASTING table (also the
 *                           read-time default for pre-field null-casting files).
 *  - 'legacy-unreplayable'— migrated legacy .txt whose table failed replay.
 *  - 'playground'         — saved from the playground line-explorer (never cast).
 */
export type CastingAbsenceReason =
  | 'legacy-no-table'
  | 'legacy-unreplayable'
  | 'playground'

const CASTING_ABSENCE_REASONS: readonly CastingAbsenceReason[] = [
  'legacy-no-table',
  'legacy-unreplayable',
  'playground',
]

export function isCastingAbsenceReason(
  value: unknown,
): value is CastingAbsenceReason {
  return (
    typeof value === 'string' &&
    (CASTING_ABSENCE_REASONS as readonly string[]).includes(value)
  )
}

const isSplitRecord = (value: unknown): value is SplitRecord =>
  typeof value === 'object' &&
  value !== null &&
  'pick' in value &&
  'recordedMax' in value &&
  typeof value.pick === 'number' &&
  typeof value.recordedMax === 'number'

const isLineCasting = (value: unknown): value is LineCasting =>
  Array.isArray(value) && value.length === 3 && value.every(isSplitRecord)

export const isCastingRecord = (value: unknown): value is CastingRecord =>
  Array.isArray(value) && value.length === 6 && value.every(isLineCasting)

export const assertIsCastingRecord: (
  value: unknown,
) => asserts value is CastingRecord = (value) => {
  if (!isCastingRecord(value)) {
    throw new TypeError('A consultation should produce a CastingRecord')
  }
}

// Partial counterparts of the above — used while the casting is still being
// collected (e.g. inside the Ink viewer's interactive flow). A `null` cell
// means "not yet picked"; the casting table renders it as a placeholder.
// `CastingRecord` is structurally a subtype, so fully-populated callers
// continue working without a widening cast.
export type PartialSplitRecord = SplitRecord | null
export type PartialLineCasting = [
  PartialSplitRecord,
  PartialSplitRecord,
  PartialSplitRecord,
]
export type PartialCastingRecord = [
  PartialLineCasting,
  PartialLineCasting,
  PartialLineCasting,
  PartialLineCasting,
  PartialLineCasting,
  PartialLineCasting,
]

export const emptyPartialCastingRecord = (): PartialCastingRecord => [
  [null, null, null],
  [null, null, null],
  [null, null, null],
  [null, null, null],
  [null, null, null],
  [null, null, null],
]

export type LineGeneratorResult = {
  line: Line
  rounds: [FourOperationsResult, FourOperationsResult, FourOperationsResult]
  splits: LineCasting
}
const isLineGeneratorResult = (value: unknown): value is LineGeneratorResult =>
  typeof value === 'object' &&
  value !== null &&
  'line' in value &&
  'rounds' in value &&
  'splits' in value &&
  Array.isArray(value.rounds) &&
  value.rounds.every((round) => isFourOperationsResult(round)) &&
  isLineCasting(value.splits)

export const assertIsLineGeneratorResult: (
  value: unknown,
) => asserts value is LineGeneratorResult = (value) => {
  if (!isLineGeneratorResult(value)) {
    throw new TypeError('Line generator should yield a LineGeneratorResult')
  }
}

// Per-line algorithmic state, indexed by the number of casts committed so
// far. Each cast advances the phase by one; `'3rd-cast'` is the resolved
// terminal phase carrying the emerged Line. Designed to let `performCast`
// in `@hexagram/core` be a pure forward-step function — the phase
// discriminant lets the static type system narrow `rounds` to the exact
// tuple length per phase and exclude resolved states from the input domain
// of the step function (so stepping a resolved line is a compile error,
// not a runtime throw).
export type LineState =
  | {
      phase: '0th-cast'
      unparted: number[]
      suspended: number[]
      rounds: []
    }
  | {
      phase: '1st-cast'
      unparted: number[]
      suspended: number[]
      rounds: [FourOperationsResult]
    }
  | {
      phase: '2nd-cast'
      unparted: number[]
      suspended: number[]
      rounds: [FourOperationsResult, FourOperationsResult]
    }
  | {
      phase: '3rd-cast'
      rounds: [FourOperationsResult, FourOperationsResult, FourOperationsResult]
      line: Line
    }

// The non-terminal phases — the input domain of `performCast`. A line in
// the `'3rd-cast'` phase is fully resolved; calling `performCast` on it
// would be a programming error and is rejected at the type level.
export type AdvanceableLineState = Extract<
  LineState,
  { phase: '0th-cast' | '1st-cast' | '2nd-cast' }
>
