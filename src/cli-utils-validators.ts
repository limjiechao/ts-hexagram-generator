import type { Line } from './types'

export function isMovingLine(line: Line): line is Extract<Line, 6 | 9> {
  return line === 6 || line === 9
}

type LineIndex = 0 | 1 | 2 | 3 | 4 | 5
export function isLineIndex(
  maybeLineIndex: unknown,
): maybeLineIndex is LineIndex {
  return (
    typeof maybeLineIndex === 'number' &&
    maybeLineIndex !== -1 &&
    maybeLineIndex >= 0 &&
    maybeLineIndex <= 5
  )
}

type LineKey = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'
export function isLine1ToLine6(maybeLineKey: unknown): maybeLineKey is LineKey {
  return (
    typeof maybeLineKey === 'string' &&
    ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].includes(maybeLineKey)
  )
}

export function assertLine1ToLine6(
  maybeLine: unknown,
): asserts maybeLine is LineKey {
  if (!isLine1ToLine6(maybeLine)) {
    throw new Error('Line is not between 1 and 6')
  }
}
