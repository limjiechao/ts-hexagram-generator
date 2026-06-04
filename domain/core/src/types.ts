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
// largest index that was selectable for that round (`max`, i.e. the prompt's
// "Pick a number from 1 to max"). Captured for both interactive picks and
// RNG-chosen splits so the casting can be replayed.
export type SplitRecord = { pick: number; max: number }
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

const isSplitRecord = (value: unknown): value is SplitRecord =>
  typeof value === 'object' &&
  value !== null &&
  'pick' in value &&
  'max' in value &&
  typeof value.pick === 'number' &&
  typeof value.max === 'number'

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
