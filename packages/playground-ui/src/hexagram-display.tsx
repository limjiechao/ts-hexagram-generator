// `<HexagramDisplay>` — composes the two trigram cards side-by-side. The
// standing card always renders. The emerging card always renders too, but
// dims into a ghost mirror when no lines are moving (the spec's
// "no-transformation" state — keeps the layout from reflowing).

import type { Hexagram } from '@hexagram/types'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

import { TrigramPanel } from './trigram-panel.js'

interface HexagramDisplayProps {
  /** The currently configured (standing) hexagram. */
  readonly standing: Hexagram
  /** The emerging hexagram (6→7, 9→8 from `standing`). */
  readonly emerging: Hexagram
  /** Whether at least one line in `standing` is moving (6 or 9). */
  readonly hasMoving: boolean
  /** 0-based bottom-first focus cursor on the standing card. */
  readonly focusIndex: number
  /** Pulse boolean from `usePulse`. */
  readonly pulse: boolean
}

/**
 * Two trigram cards in a horizontal row. The emerging card renders dim when
 * `hasMoving === false` so the layout stays stable; the user sees the same
 * hexagram on both sides but the emerging side is muted, signalling "no
 * transformation yet".
 */
export function HexagramDisplay({
  standing,
  emerging,
  hasMoving,
  focusIndex,
  pulse,
}: HexagramDisplayProps): ReactElement {
  return (
    <Box flexDirection="row" flexShrink={0}>
      <TrigramPanel
        role="STANDING"
        hexagram={standing}
        focusIndex={focusIndex}
        pulse={pulse}
        showArrows={hasMoving}
      />
      <Box width={4} flexShrink={0}>
        {/* Spacer column between the two cards. */}
        <Text> </Text>
      </Box>
      <TrigramPanel
        role="EMERGING"
        hexagram={hasMoving ? emerging : standing}
        focusIndex={null}
        pulse={false}
        showArrows={false}
        dim={!hasMoving}
      />
    </Box>
  )
}
