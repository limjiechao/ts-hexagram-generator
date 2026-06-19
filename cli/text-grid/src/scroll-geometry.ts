// Casting-table auto-follow scroll math (medium-bound). Terminal-viewport ROW
// counts for the live Ink casting table's auto-scroll — consumed by the viewer
// (the in-flight table) and the ANSI readout (the bottom-align offset). Row
// counts, not bytes; moved from the former consultation-view ledger-geometry as
// part of the monospace render layer (ADR-0022).
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
