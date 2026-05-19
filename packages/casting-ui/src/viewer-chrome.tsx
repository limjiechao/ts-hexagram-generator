import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

import { BOLD_GREY, NORMAL } from './output-palette.js'
import type { InputMode } from './utils-mode.js'
import { truncateEnd, truncateStart } from './viewer-layout.js'

// Presentational chrome for the Ink viewer. Each component is a "dumb"
// React component — props in, JSX out. No state, no side effects.
// `<ConsultationViewer>` (in viewer.tsx) is the orchestrator; it owns
// the flow and composes these pieces.

// ── Tab descriptor ───────────────────────────────────────────────────────────

export type TabId = 'casting' | 'transformation' | 'standing' | 'emerging'

export interface TabDescriptor {
  id: TabId
  label: string
  wrapMode: 'wrap' | 'never'
}

// Used by TabBar / the activeTab lookup in viewer.tsx. The viewer
// always has at least the `casting` tab, so encoding non-emptiness in the
// type lets `tabs[0]` serve as a safe fallback for the activeIndex lookup
// under noUncheckedIndexedAccess.
export type NonEmpty<T> = readonly [T, ...T[]]

// ── Key-hint formatters ──────────────────────────────────────────────────────

export const KEY_HINTS_TEMPLATE = (tabCount: number): string =>
  `Tab/1-${tabCount}: switch   ↑↓/PgUp/PgDn: scroll   ←→: pan   g/G: top/bottom   Esc/Ctrl+C: quit`

/**
 * Footer key hints during the casting phase. The slider's load-bearing key
 * is SPACE — without surfacing it here the prompt is undiscoverable.
 * Number mode advertises Enter for parity with the in-tab prompt label.
 * ←/→ is the horizontal-pan binding the viewer registers when slider
 * content overflows.
 */
export function keyHintsForCasting(inputMode: InputMode): string {
  return inputMode === 'slider'
    ? 'SPACE: part   ←→: pan   Esc/Ctrl+C: quit'
    : 'Enter: commit   Esc/Ctrl+C: quit'
}

export const KEY_HINTS_FLOW_DEFAULT = 'Esc/Ctrl+C: quit'

// ── Components ───────────────────────────────────────────────────────────────

export function QueryBox({
  query,
  width,
}: {
  query: string
  width: number
}): ReactElement {
  return (
    <Box borderStyle="round" width={width} flexShrink={0}>
      <Text>{` ${query}`}</Text>
    </Box>
  )
}

export function TabBar({
  tabs,
  activeIndex,
  cols,
  locked,
}: {
  tabs: NonEmpty<TabDescriptor>
  activeIndex: number
  cols: number
  locked: boolean
}): ReactElement {
  // `activeIndex` is clamped against `tabs.length` upstream, but
  // noUncheckedIndexedAccess still types `tabs[activeIndex]` as `T |
  // undefined`. `tabs[0]` is provably defined (NonEmpty), so it's the safe
  // fallback when the clamp races with a tab-list shrink.
  const activeTab = tabs[activeIndex] ?? tabs[0]

  // Flow in progress: only the active tab shows, rendered with the same
  // bold+inverse styling as done-mode — there's no agency to switch tabs.
  if (locked) {
    return (
      <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
        <Text bold inverse>{` ${activeTab.label} `}</Text>
      </Box>
    )
  }

  // Done mode: all tabs visible, dim ` · ` separator between them.
  // Each cell renders as ` label ` (label.length + 2); separators add 3 cols.
  const renderedWidth = tabs.reduce(
    (sum, t, i) => sum + t.label.length + 2 + (i > 0 ? 3 : 0),
    0,
  )
  if (renderedWidth > cols) {
    return (
      <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
        <Text bold inverse>{` ${activeTab.label} `}</Text>
        <Text dimColor>{` (${activeIndex + 1}/${tabs.length})`}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
      {tabs.flatMap((tab, index) => {
        const active = index === activeIndex
        const cells: ReactElement[] = [
          <Text key={tab.id} bold={active} inverse={active} dimColor={!active}>
            {` ${tab.label} `}
          </Text>,
        ]
        if (index < tabs.length - 1) {
          cells.push(
            <Text key={`sep-${tab.id}`} dimColor>
              {' · '}
            </Text>,
          )
        }
        return cells
      })}
    </Box>
  )
}

export function ScrollableSection({
  rows,
  viewportHeight,
}: {
  rows: string[]
  viewportHeight: number
}): ReactElement {
  return (
    <Box height={viewportHeight} flexDirection="column">
      {/* Raw ANSI content — no color props (see QueryBox). */}
      <Text>{rows.join('\n')}</Text>
    </Box>
  )
}

/**
 * 1-column vertical scrollbar gutter. When content overflows the viewport,
 * renders a proportional `█` handle over a `░` track; otherwise reserves
 * the column with whitespace so chrome above/below doesn't shift when
 * overflow state toggles.
 */
export function ScrollbarTrack({
  offset,
  totalRows,
  viewportHeight,
}: {
  offset: number
  totalRows: number
  viewportHeight: number
}): ReactElement {
  if (totalRows <= viewportHeight) {
    return (
      <Text>
        {Array.from({ length: viewportHeight }, () => ' ').join('\n')}
      </Text>
    )
  }
  const handleHeight = Math.max(
    1,
    Math.floor((viewportHeight * viewportHeight) / totalRows),
  )
  const handleTop = Math.floor(
    (offset * (viewportHeight - handleHeight)) /
      Math.max(1, totalRows - viewportHeight),
  )
  const chars: string[] = []
  for (let i = 0; i < viewportHeight; i += 1) {
    chars.push(i >= handleTop && i < handleTop + handleHeight ? '█' : '░')
  }
  return <Text dimColor>{chars.join('\n')}</Text>
}

export function FooterBar({
  savedPath,
  cols,
  verticalStatus,
  horizontalStatus,
  wrapChip,
  flowHint,
  inFlow,
  flowKeyHints,
  tabsLength,
}: {
  savedPath: string
  cols: number
  verticalStatus: string | null
  horizontalStatus: string | null
  wrapChip: string | null
  flowHint: string | null
  inFlow: boolean
  flowKeyHints: string
  tabsLength: number
}): ReactElement {
  const segments: string[] = []
  if (verticalStatus) segments.push(verticalStatus)
  if (horizontalStatus) segments.push(horizontalStatus)
  if (wrapChip) segments.push(wrapChip)
  segments.push(inFlow ? flowKeyHints : KEY_HINTS_TEMPLATE(tabsLength))
  const status = truncateEnd(segments.join('   '), cols)
  // During the flow, replace the saved-path line with a one-line progress
  // hint — there's no saved file yet.
  const bottomLineRaw = inFlow
    ? (flowHint ?? '')
    : `Consultation output saved to ${savedPath}.`
  const bottomLine = truncateStart(bottomLineRaw, cols)

  return (
    <Box flexDirection="column" flexShrink={0}>
      <Text dimColor>{status}</Text>
      {/* Raw ANSI constants for parity with the plain-mode "saved to" line. */}
      <Text>{`${BOLD_GREY}${bottomLine}${NORMAL}`}</Text>
    </Box>
  )
}
