import type { Line } from '@hexagram/core/types'

import type { DiagramLineRow } from './ir.js'
import {
  LINE_GLYPH,
  MOVING_ARROW,
  POSITION_LABELS,
  STATIC_GAP,
} from './vocabulary.js'

type PositionKey = keyof typeof POSITION_LABELS

/** A `decorate` injects the medium: Markdown passes identity; ANSI wraps the
 *  cell in colour + reset. It receives one already-stringified cell at a time.
 */
export type DecorateCell = (text: string) => string

/** One half of a transformation row: `indent + value + "  " + glyph + "  " +
 *  position`. The value and glyph cells pass through `decorate`. The position
 *  label passes through `decoratePosition`, which defaults to identity — so
 *  every existing caller (the consultation serializers, which never colour
 *  position) emits byte-identical output, while the playground can inject its
 *  ghost-mirror position colour through the same skeleton. */
export function transformationHalfRow(
  cell: { line: Line; position: PositionKey },
  indent: string,
  decorate: DecorateCell,
  decoratePosition: DecorateCell = (text) => text,
): string {
  return (
    `${indent}${decorate(String(cell.line))}` +
    `  ${decorate(LINE_GLYPH[cell.line])}` +
    `  ${decoratePosition(POSITION_LABELS[cell.position])}`
  )
}

/** A full transformation row: standing half (indent `"  "`) + connector
 *  (`MOVING_ARROW` when the standing line moves, else `STATIC_GAP`) + emerging
 *  half (no indent). Each side gets its own `decorate`. */
export function transformationRow(
  standing: DiagramLineRow,
  emerging: { line: Line; position: PositionKey },
  decorateStanding: DecorateCell,
  decorateEmerging: DecorateCell,
): string {
  const gap = standing.moving ? MOVING_ARROW : STATIC_GAP
  return (
    transformationHalfRow(standing, '  ', decorateStanding) +
    gap +
    transformationHalfRow(emerging, '', decorateEmerging)
  )
}

/** The trigram-imagery identity fields the diagram braces interpolate. */
export interface DiagramImagery {
  readonly upperTrigramImageryChinese: string
  readonly upperTrigramImageryEnglish: string
  readonly lowerTrigramImageryChinese: string
  readonly lowerTrigramImageryEnglish: string
}

// Brace suffix per top-down row index (0 = top / position 6). The imagery rows
// (1 and 4) interpolate the upper/lower trigram glosses; the rest are bare
// connectors. Byte-identical to the legacy ANSI + Markdown diagram blocks.
function braceSuffix(topIndex: number, im: DiagramImagery): string {
  switch (topIndex) {
    case 0:
      return '──┐'
    case 1:
      return `──┼── ${im.upperTrigramImageryChinese}（上卦）`
    case 2:
      return `──┘   ${im.upperTrigramImageryEnglish} (upper trigram)`
    case 3:
      return '──┐'
    case 4:
      return `──┼── ${im.lowerTrigramImageryChinese}（下卦）`
    default:
      return `──┘   ${im.lowerTrigramImageryEnglish} (lower trigram)`
  }
}

/** Like `DecorateCell` but also receives the row, because the ANSI hexagram
 *  block colours the value/glyph chunk by THAT row's `moving` flag. Markdown
 *  ignores the row and passes the chunk through. */
export type DecorateRow = (chunk: string, row: DiagramLineRow) => string

/** The six hexagram-diagram rows, top-first (position 6 → 1). Each row is
 *  `"  " + decorate(value + "  " + glyph + "  ") + position + braceSuffix`.
 *  `decorate` wraps the value/glyph chunk (ANSI colour, by row) or passes it
 *  through (Markdown); the position label and brace are never decorated. */
export function hexagramDiagramRowStrings(
  rows: readonly DiagramLineRow[],
  imagery: DiagramImagery,
  decorate: DecorateRow,
): string[] {
  return rows.map((row, topIndex) => {
    const chunk = `${row.line}  ${LINE_GLYPH[row.line]}  `
    const pos = POSITION_LABELS[row.position as PositionKey]
    return `  ${decorate(chunk, row)}${pos}${braceSuffix(topIndex, imagery)}`
  })
}
