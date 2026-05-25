// `<LineCard>` — one row of the trigram panel: chevron prefix when focused,
// the bar glyph + casting value derived from `deriveBannerLine`, the line
// number, and (when the line is moving) an arrow trailing into the emerging
// column. Pure-presentation, no input. Colour mirrors the home banner via
// the shared `lineColors()` mapping in `viewer-core/banner-lines.ts`.

import type { Line } from '@hexagram/types'
import {
  BOLD_GREY,
  BOLD_WHITE,
  deriveBannerLine,
  lineColors,
  NORMAL,
  NORMAL_GREY,
  polarityOf,
} from '@hexagram/viewer-core'
import { Text } from 'ink'
import type { ReactElement } from 'react'

interface LineCardProps {
  /** The line's casting value. */
  readonly line: Line
  /** 1-based line number rendered after the bar. */
  readonly lineNumber: 1 | 2 | 3 | 4 | 5 | 6
  /** Whether this line is the focused cursor target. */
  readonly focused: boolean
  /** The pulse boolean from `usePulse`; only consulted when the line is moving. */
  readonly pulse: boolean
  /**
   * Whether to render the trailing `─→` arrow connector. The playground sets
   * this to `true` for moving lines so the eye reads `standing line ──▶
   * emerging line` per row. Static lines render whitespace of the same
   * width so the trigram cards stay aligned in width.
   */
  readonly arrowConnector: boolean
  /**
   * Render the whole row dim — used by the emerging card's "dim ghost
   * mirror" when no lines are moving.
   */
  readonly dim?: boolean
}

// The trailing zone is the same width whether or not an arrow renders, so
// adding/removing a moving line never reflows the trigram card.
const ARROW = ' ──▶'
const NO_ARROW_PAD = '    '

/**
 * Render the row as a single `<Text>` with embedded ANSI. The chevron sits
 * in a 2-column slot so a focused/unfocused swap never shifts the bar's
 * column position.
 */
export function LineCard({
  line,
  lineNumber,
  focused,
  pulse,
  arrowConnector,
  dim = false,
}: LineCardProps): ReactElement {
  const polarity = polarityOf(line)
  const isMoving = line === 6 || line === 9
  const cells = deriveBannerLine(polarity, isMoving, pulse)
  const [valueColor, barColor] = lineColors(cells.role)

  const chevron = focused ? `${BOLD_WHITE}›${NORMAL} ` : '  '
  const lineLabel = `L${lineNumber}`
  const trail = arrowConnector ? `${BOLD_GREY}${ARROW}${NORMAL}` : NO_ARROW_PAD

  return (
    <Text dimColor={dim}>
      {`${chevron}${valueColor}${cells.value}${NORMAL}  ${barColor}${cells.bar}${NORMAL}   ${NORMAL_GREY}${lineLabel}${NORMAL}${trail}`}
    </Text>
  )
}
