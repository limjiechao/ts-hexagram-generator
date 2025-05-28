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

export type LineGeneratorResult = {
  line: Line
  rounds: [FourOperationsResult, FourOperationsResult, FourOperationsResult]
}
const isLineGeneratorResult = (value: unknown): value is LineGeneratorResult =>
  typeof value === 'object' &&
  value !== null &&
  'line' in value &&
  'rounds' in value &&
  Array.isArray(value.rounds) &&
  value.rounds.every((round) => isFourOperationsResult(round))

export const assertIsLineGeneratorResult: (
  value: unknown,
) => asserts value is LineGeneratorResult = (value) => {
  if (!isLineGeneratorResult(value)) {
    throw new TypeError('Line generator should yield a LineGeneratorResult')
  }
}
