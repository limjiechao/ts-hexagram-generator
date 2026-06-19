import { deriveSplit } from '@hexagram/core/casting-derivation'
import {
  POSITIONS_TOP_FIRST,
  type LineIndex,
  type PartialCastingRecord,
} from '@hexagram/core/types'

import type { LedgerRow } from './ir.js'

// Build the 18 ledger rows from a (partial) casting record. Lines top→bottom
// are 6→1; within a block casts are reversed (cast 3 top, cast 1 bottom); the
// line label shows on the block-top (cast-3) row only; every block but the
// last carries a trailing rule.
export function buildLedgerRows(
  casting: PartialCastingRecord,
): readonly LedgerRow[] {
  // Top-first line numbers (6 → 1) paired with their bottom-first casting cell
  // (`casting[lineNumber - 1]`) — the same flip the diagram rows use.
  const lineOrder = POSITIONS_TOP_FIRST.map(
    (lineNumber) =>
      [lineNumber, casting[(lineNumber - 1) as LineIndex]] as const,
  )
  const rows: LedgerRow[] = []
  for (const [blockIndex, [lineNumber, lineCasting]] of lineOrder.entries()) {
    const [cast1, cast2, cast3] = lineCasting
    const last = blockIndex === lineOrder.length - 1
    const cell = (s: (typeof lineCasting)[number]) =>
      s === null ? null : deriveSplit(s)
    rows.push(
      {
        lineNumber,
        castNumber: 3,
        showLine: true,
        trailingRule: false,
        cell: cell(cast3),
      },
      {
        lineNumber,
        castNumber: 2,
        showLine: false,
        trailingRule: false,
        cell: cell(cast2),
      },
      {
        lineNumber,
        castNumber: 1,
        showLine: false,
        trailingRule: !last,
        cell: cell(cast1),
      },
    )
  }
  return rows
}
