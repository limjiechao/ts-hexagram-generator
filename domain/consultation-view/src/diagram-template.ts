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
 *  position`. The value and glyph cells pass through `decorate`; the position
 *  label never does (matches both legacy serializers). */
export function transformationHalfRow(
  cell: { line: Line; position: PositionKey },
  indent: string,
  decorate: DecorateCell,
): string {
  return (
    `${indent}${decorate(String(cell.line))}` +
    `  ${decorate(LINE_GLYPH[cell.line])}` +
    `  ${POSITION_LABELS[cell.position]}`
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
