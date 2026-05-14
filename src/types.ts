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
