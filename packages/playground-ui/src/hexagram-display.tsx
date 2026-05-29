// `<HexagramDisplay>` — thin React wrapper over `buildPlaygroundDisplay`
// (the pure renderer). Slices each row by the host's horizontal pan offset so
// the top half never wraps on narrow terminals; the host owns the offset and
// re-renders this component when it changes.

import type { Hexagram } from '@hexagram/core/types'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import sliceAnsi from 'slice-ansi'

import { buildPlaygroundDisplay } from './playground-display.js'

interface HexagramDisplayProps {
  /** The standing hexagram. */
  readonly standing: Hexagram
  /** The emerging hexagram (6→7, 9→8 from `standing`). */
  readonly emerging: Hexagram
  /** Whether the standing has any moving lines. */
  readonly hasMoving: boolean
  /** 0-based bottom-first focus cursor on the standing card. */
  readonly focusIndex: number
  /** Pulse boolean from `usePulse`. */
  readonly pulse: boolean
  /**
   * Horizontal pan offset (display cols). The host clamps this against
   * `TOP_HALF_WIDTH - innerCols` and increments / decrements it via the `</>`
   * key bindings.
   */
  readonly panOffset: number
  /** Visible width in cols — typically `<ScreenShell>`'s `innerCols`. */
  readonly innerCols: number
}

/**
 * Render the playground's top-half block as `<Text>`-per-row, sliced
 * horizontally. ANSI codes are zero-width, so `sliceAnsi` slices by display
 * columns.
 */
export function HexagramDisplay({
  standing,
  emerging,
  hasMoving,
  focusIndex,
  pulse,
  panOffset,
  innerCols,
}: HexagramDisplayProps): ReactElement {
  const { rows } = buildPlaygroundDisplay({
    standing,
    emerging,
    focusIndex,
    pulse,
    hasMoving,
  })
  const window = Math.max(1, innerCols)
  const sliced = rows.map((row) =>
    sliceAnsi(row, panOffset, panOffset + window),
  )

  return (
    <Box flexDirection="column" flexShrink={0}>
      {sliced.map((row, index) => (
        // Positional row keys: row order is fixed (12 rows) and never reorders.
        <Text key={index}>{row.length === 0 ? ' ' : row}</Text>
      ))}
    </Box>
  )
}
