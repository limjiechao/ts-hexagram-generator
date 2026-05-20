import { Box, Text } from 'ink'
import type { ReactElement, ReactNode } from 'react'

import { BOLD_GREY, NORMAL } from './output-palette.js'

// `<ScreenShell>` — the generic borderless screen frame shared by the
// Consultation Readout and the History list.
//
// The shell owns only the outer frame:
//   - a borderless full-screen `paddingX={1}` box sized to `cols × rows`
//   - an optional `BOLD_GREY` title line
//   - a layout row pairing the scrollable content with the 1-column scrollbar
//     gutter (right side)
//   - a two-line footer at the bottom
//
// Everything else — scroll/window state, the keymap, tabs, the query slot —
// stays with each consumer. The shell provides structural slots that let
// consumers inject their chrome without the shell absorbing it.
//
// Slots:
//   `aboveContent` — region above the scrollable content row (query label,
//     query box, tab bar in the Readout; nothing for the History list).
//     Render-prop form `(innerCols: number) => ReactNode` or plain `ReactNode`.
//   `contentSlot` — the scrollable content rows, placed inside the content
//     half of the content+gutter row. Render-prop `(innerCols: number) =>
//     ReactNode` or plain `ReactNode`.
//   `scrollbarSlot` — a `ReactNode` placed in the 1-column gutter column to
//     the right of `contentSlot`. Consumers pass `<ScrollbarTrack …/>` here.
//   `belowContent` — region below the content row and above the footer
//     (notice, above-footer casting prompt in the Readout). Render-prop or
//     plain `ReactNode`.
//   `footerSlot` — the two-line footer `ReactNode`. Consumers render their own
//     `<FooterBar …/>` or equivalent here.

/** `innerCols = cols - paddingX*2 - scrollbarWidth`. */
export function computeInnerCols(cols: number): number {
  return Math.max(1, cols - 2 - 1)
}

type SlotProp = ReactNode | ((innerCols: number) => ReactNode)

function resolveSlot(
  slot: SlotProp | null | undefined,
  innerCols: number,
): ReactNode {
  if (slot == null) return null
  if (typeof slot === 'function') return slot(innerCols)
  return slot
}

export interface ScreenShellProps {
  /** Terminal width in columns. */
  readonly cols: number
  /** Terminal height in rows. */
  readonly rows: number
  /**
   * Optional title rendered as a `BOLD_GREY` line at the very top, above all
   * content. Omit to suppress the line entirely.
   */
  readonly title?: string
  /**
   * Slot rendered above the content+scrollbar row (query label, query box,
   * tab bar in the Readout). Accepts a plain `ReactNode` or a render-prop
   * `(innerCols: number) => ReactNode`.
   */
  readonly aboveContent: SlotProp
  /**
   * The scrollable content rows. Placed in the flexible (flexGrow) left column
   * of the content+scrollbar row. Accepts a plain `ReactNode` or a render-prop
   * `(innerCols: number) => ReactNode`.
   */
  readonly contentSlot: SlotProp
  /**
   * 1-column scrollbar gutter, placed to the right of `contentSlot`. Consumers
   * render `<ScrollbarTrack …/>` here.
   */
  readonly scrollbarSlot: ReactNode
  /**
   * Slot rendered below the content+scrollbar row and above the footer
   * (notice, casting prompt box in the Readout). Accepts a plain `ReactNode`
   * or a render-prop `(innerCols: number) => ReactNode`.
   */
  readonly belowContent: SlotProp
  /**
   * Two-line footer rendered at the bottom of the shell. Consumers render
   * their own `<FooterBar …/>` or equivalent — the shell does not prescribe
   * the footer's internal structure.
   */
  readonly footerSlot: ReactNode
}

export function ScreenShell({
  cols,
  rows,
  title,
  aboveContent,
  contentSlot,
  scrollbarSlot,
  belowContent,
  footerSlot,
}: ScreenShellProps): ReactElement {
  const innerCols = computeInnerCols(cols)

  return (
    <Box flexDirection="column" paddingX={1} width={cols} height={rows}>
      {title != null && <Text>{`${BOLD_GREY}${title}${NORMAL}`}</Text>}
      {resolveSlot(aboveContent, innerCols)}
      <Box flexGrow={1} flexShrink={1} flexDirection="row" overflow="hidden">
        <Box flexDirection="column" flexGrow={1}>
          {resolveSlot(contentSlot, innerCols)}
        </Box>
        <Box width={1} flexShrink={0}>
          {scrollbarSlot}
        </Box>
      </Box>
      {resolveSlot(belowContent, innerCols)}
      {footerSlot}
    </Box>
  )
}
