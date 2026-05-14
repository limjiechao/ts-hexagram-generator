import {
  Box,
  render,
  Text,
  useApp,
  useInput,
  useWindowSize,
  type Instance,
} from 'ink'
import { useMemo, useState, type ReactElement } from 'react'
import sliceAnsi from 'slice-ansi'
import stringWidth from 'string-width'
import wrapAnsi from 'wrap-ansi'

import {
  BOLD_GREY,
  NORMAL,
  type ConsultationSections,
} from './cli-utils-output.js'

type TabId = 'transformation' | 'originating' | 'resultant'

interface TabDescriptor {
  id: TabId
  label: string
}

interface ConsultationViewerProps {
  sections: ConsultationSections
  savedPath: string
}

const TAB_BAR_HEIGHT = 1
const FOOTER_HEIGHT = 2
const QUERY_BORDER_HEIGHT = 2
const ELLIPSIS = '…'

const KEY_HINTS =
  'Tab: switch   ↑↓/PgUp/PgDn: scroll   ←→: pan   g/G: top/bottom   q: quit'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Wrap a pre-formatted ANSI string to `width` columns. `trim: false` keeps the
// existing indentation; `hard: true` breaks words longer than the viewport.
function wrapToWidth(content: string, width: number): string {
  return wrapAnsi(content, Math.max(1, width), { hard: true, trim: false })
}

// Truncate `text` to `width` display columns, appending an ellipsis when cut.
// ANSI-aware: embedded SGR codes are preserved and never counted as width.
export function truncateEnd(text: string, width: number): string {
  if (width <= 0) return ''
  if (stringWidth(text) <= width) return text
  return `${sliceAnsi(text, 0, Math.max(0, width - 1))}${ELLIPSIS}`
}

// Truncate `text` to `width` display columns from the right — keeps the tail
// and prefixes an ellipsis, so the saved-path filename (the useful part) always
// survives. ANSI-aware (see truncateEnd).
export function truncateStart(text: string, width: number): string {
  if (width <= 0) return ''
  const total = stringWidth(text)
  if (total <= width) return text
  return `${ELLIPSIS}${sliceAnsi(text, total - Math.max(0, width - 1), total)}`
}

function QueryBox({
  query,
  width,
}: {
  query: string
  width: number
}): ReactElement {
  return (
    <Box borderStyle="round" width={width} flexShrink={0}>
      {/*
        Raw ANSI content: this <Text> (and its ancestors) must carry no color
        props, or Ink would emit its own SGR codes and override the embedded
        ones.
      */}
      <Text>{query}</Text>
    </Box>
  )
}

function TabBar({
  tabs,
  activeIndex,
  cols,
}: {
  tabs: TabDescriptor[]
  activeIndex: number
  cols: number
}): ReactElement {
  // Each cell renders as ` label ` — two padding spaces around the label.
  const fullRowWidth = tabs.reduce((sum, tab) => sum + tab.label.length + 2, 0)

  // Below the width the full label row needs, collapse to a compact indicator
  // so the tab bar always stays exactly one row tall.
  if (fullRowWidth > cols) {
    const active = tabs[activeIndex]
    return (
      <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
        <Text bold inverse>{` ${active.label} `}</Text>
        <Text dimColor>{` (${activeIndex + 1}/${tabs.length})`}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="row" flexWrap="nowrap" flexShrink={0}>
      {tabs.map((tab, index) => {
        const active = index === activeIndex
        return (
          <Text key={tab.id} bold={active} inverse={active} dimColor={!active}>
            {` ${tab.label} `}
          </Text>
        )
      })}
    </Box>
  )
}

function ScrollableSection({
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

function FooterBar({
  savedPath,
  cols,
  verticalStatus,
  horizontalStatus,
}: {
  savedPath: string
  cols: number
  verticalStatus: string | null
  horizontalStatus: string | null
}): ReactElement {
  const segments: string[] = []
  if (verticalStatus) segments.push(verticalStatus)
  if (horizontalStatus) segments.push(horizontalStatus)
  segments.push(KEY_HINTS)
  const status = truncateEnd(segments.join('   '), cols)
  const savedLine = truncateStart(
    `Consultation output saved to ${savedPath}.`,
    cols,
  )

  return (
    <Box flexDirection="column" flexShrink={0}>
      <Text dimColor>{status}</Text>
      {/* Raw ANSI constants for parity with the plain-mode "saved to" line. */}
      <Text>{`${BOLD_GREY}${savedLine}${NORMAL}`}</Text>
    </Box>
  )
}

export function ConsultationViewer({
  sections,
  savedPath,
}: ConsultationViewerProps): ReactElement {
  const { exit } = useApp()
  const { columns, rows: windowRows } = useWindowSize()
  const cols = columns || 80
  const termRows = windowRows || 24

  const tabs = useMemo<TabDescriptor[]>(() => {
    const base: TabDescriptor[] = [
      { id: 'transformation', label: 'Transformation' },
      { id: 'originating', label: 'Originating' },
    ]
    if (sections.resultant !== null) {
      base.push({ id: 'resultant', label: 'Resultant' })
    }
    return base
  }, [sections.resultant])

  const [activeIndex, setActiveIndex] = useState(0)
  const [offsets, setOffsets] = useState<number[]>(() => tabs.map(() => 0))
  const [horizontalOffsets, setHorizontalOffsets] = useState<number[]>(() =>
    tabs.map(() => 0),
  )

  const wrappedQuery = useMemo(
    () => wrapToWidth(sections.query, cols - 2),
    [sections.query, cols],
  )
  const queryBoxHeight = wrappedQuery.split('\n').length + QUERY_BORDER_HEIGHT
  const viewportHeight = Math.max(
    1,
    termRows - queryBoxHeight - TAB_BAR_HEIGHT - FOOTER_HEIGHT,
  )

  const activeTab = tabs[activeIndex]
  const activeContent =
    activeTab.id === 'transformation'
      ? sections.transformation
      : activeTab.id === 'originating'
        ? sections.originating
        : (sections.resultant ?? '')

  // Wrap to a floor of the content's intrinsic width so fixed-width diagrams
  // are never hard-broken mid-art; anything wider than the terminal stays
  // reachable through horizontal scrolling instead.
  const intrinsicWidth = useMemo(
    () =>
      activeContent
        .split('\n')
        .reduce((widest, line) => Math.max(widest, stringWidth(line)), 1),
    [activeContent],
  )
  const wrapWidth = Math.max(cols, intrinsicWidth)
  const contentRows = useMemo(
    () => wrapToWidth(activeContent, wrapWidth).split('\n'),
    [activeContent, wrapWidth],
  )
  const contentWidth = wrapWidth

  const maxOffset = Math.max(0, contentRows.length - viewportHeight)
  const offset = clamp(offsets[activeIndex] ?? 0, 0, maxOffset)
  const canScrollVertically = contentRows.length > viewportHeight

  const maxHorizontalOffset = Math.max(0, contentWidth - cols)
  const horizontalOffset = clamp(
    horizontalOffsets[activeIndex] ?? 0,
    0,
    maxHorizontalOffset,
  )
  const canScrollHorizontally = maxHorizontalOffset > 0

  const visibleRows = contentRows
    .slice(offset, offset + viewportHeight)
    .map((row) => sliceAnsi(row, horizontalOffset, horizontalOffset + cols))

  const scrollActiveBy = (delta: number): void => {
    setOffsets((previous) => {
      const next = [...previous]
      next[activeIndex] = clamp((next[activeIndex] ?? 0) + delta, 0, maxOffset)
      return next
    })
  }
  const scrollActiveTo = (target: number): void => {
    setOffsets((previous) => {
      const next = [...previous]
      next[activeIndex] = clamp(target, 0, maxOffset)
      return next
    })
  }
  const panActiveBy = (delta: number): void => {
    setHorizontalOffsets((previous) => {
      const next = [...previous]
      next[activeIndex] = clamp(
        (next[activeIndex] ?? 0) + delta,
        0,
        maxHorizontalOffset,
      )
      return next
    })
  }
  const stepToTab = (delta: number): void => {
    setActiveIndex((index) => (index + delta + tabs.length) % tabs.length)
  }

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit()
      return
    }
    if (key.tab && key.shift) {
      stepToTab(-1)
      return
    }
    if (key.tab || input === ']') {
      stepToTab(1)
      return
    }
    if (input === '[') {
      stepToTab(-1)
      return
    }
    if (key.leftArrow) {
      panActiveBy(key.shift ? -(cols - 1) : -1)
      return
    }
    if (key.rightArrow) {
      panActiveBy(key.shift ? cols - 1 : 1)
      return
    }
    if (key.upArrow) {
      scrollActiveBy(-1)
      return
    }
    if (key.downArrow) {
      scrollActiveBy(1)
      return
    }
    if (key.pageUp) {
      scrollActiveBy(-(viewportHeight - 1))
      return
    }
    if (key.pageDown) {
      scrollActiveBy(viewportHeight - 1)
      return
    }
    if (key.home || input === 'g') {
      scrollActiveTo(0)
      return
    }
    if (key.end || input === 'G') {
      scrollActiveTo(maxOffset)
    }
  })

  const verticalStatus = canScrollVertically
    ? `▲ ${offset + 1}–${Math.min(offset + viewportHeight, contentRows.length)} of ${contentRows.length} ▼`
    : null
  const horizontalStatus = canScrollHorizontally
    ? `◀ ${horizontalOffset + 1}–${Math.min(horizontalOffset + cols, contentWidth)} of ${contentWidth} ▶`
    : null

  return (
    <Box flexDirection="column" width={cols} height={termRows}>
      <QueryBox query={wrappedQuery} width={cols} />
      <TabBar tabs={tabs} activeIndex={activeIndex} cols={cols} />
      {/*
        Chrome (query/tabs/footer) is flexShrink={0}; this content box absorbs
        the remainder. overflow="hidden" clips rather than overflows if the
        computed viewportHeight is ever a row too tall — chrome never collides.
      */}
      <Box flexGrow={1} flexShrink={1} flexDirection="column" overflow="hidden">
        <ScrollableSection rows={visibleRows} viewportHeight={viewportHeight} />
      </Box>
      <FooterBar
        savedPath={savedPath}
        cols={cols}
        verticalStatus={verticalStatus}
        horizontalStatus={horizontalStatus}
      />
    </Box>
  )
}

/**
 * Render the consultation as a full-screen, tabbed Ink viewer and resolve once
 * the user exits. Uses the alternate screen buffer so the terminal's prior
 * contents are restored on exit.
 */
export async function runConsultationViewer(
  sections: ConsultationSections,
  savedPath: string,
): Promise<void> {
  const instance: Instance = render(
    <ConsultationViewer sections={sections} savedPath={savedPath} />,
    { alternateScreen: true },
  )
  await instance.waitUntilExit()
}
