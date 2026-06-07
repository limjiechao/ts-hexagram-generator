import { deriveSplit } from '@hexagram/core/casting-derivation'
import {
  POSITIONS_TOP_FIRST,
  type LineIndex,
  type PartialCastingRecord,
} from '@hexagram/core/types'

import type { LedgerRow } from './ir.js'

// Casting-table row geometry — single source for the auto-follow scroll math.
export const CASTING_HEADER_ROWS = 5 // "CASTING:", blank, banner, header, rule
export const CASTING_ROWS_PER_BLOCK = 4 // cast3, cast2, cast1, blockRule
export const CAST1_OFFSET_IN_BLOCK = 2 // cast-1 row, from the block top

export function castingTableActiveRow(lineIndex: number): number {
  const blockTop =
    CASTING_HEADER_ROWS + (5 - lineIndex) * CASTING_ROWS_PER_BLOCK
  return blockTop + CAST1_OFFSET_IN_BLOCK
}

export function castingTableFollowRow(lineIndex: number): number {
  return castingTableActiveRow(Math.max(0, lineIndex - 1))
}

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
