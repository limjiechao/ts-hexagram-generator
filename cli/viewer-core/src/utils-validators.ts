// `LineIndex` + `isLineIndex` are the single authoritative line-index
// vocabulary, owned by @hexagram/core (finding S7). Re-exported here so the
// existing viewer-core public surface (index.ts) is unchanged for consumers.
export { isLineIndex, type LineIndex } from '@hexagram/core/types'

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
