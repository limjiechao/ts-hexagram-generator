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

const KEY_HINTS =
  'Tab/←→: switch   ↑↓/PgUp/PgDn: scroll   g/G: top/bottom   q: quit'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Wrap a pre-formatted ANSI string to `width` columns. `trim: false` keeps the
// existing indentation; `hard: true` breaks words longer than the viewport.
function wrapToWidth(content: string, width: number): string {
  return wrapAnsi(content, Math.max(1, width), { hard: true, trim: false })
}

function QueryBox({
  query,
  width,
}: {
  query: string
  width: number
}): ReactElement {
  return (
    <Box borderStyle="round" width={width}>
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
}: {
  tabs: TabDescriptor[]
  activeIndex: number
}): ReactElement {
  return (
    <Box flexDirection="row">
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
  offset,
  viewportHeight,
}: {
  rows: string[]
  offset: number
  viewportHeight: number
}): ReactElement {
  const visible = rows.slice(offset, offset + viewportHeight).join('\n')
  return (
    <Box height={viewportHeight} flexDirection="column">
      {/* Raw ANSI content — no color props (see QueryBox). */}
      <Text>{visible}</Text>
    </Box>
  )
}

function FooterBar({
  savedPath,
  canScroll,
  offset,
  total,
  viewportHeight,
}: {
  savedPath: string
  canScroll: boolean
  offset: number
  total: number
  viewportHeight: number
}): ReactElement {
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + viewportHeight, total)
  const status = canScroll
    ? `▲ ${from}–${to} of ${total} ▼   ${KEY_HINTS}`
    : KEY_HINTS

  return (
    <Box flexDirection="column">
      <Text dimColor>{status}</Text>
      {/* Raw ANSI constants for parity with the plain-mode "saved to" line. */}
      <Text>{`${BOLD_GREY}Consultation output saved to ${savedPath}.${NORMAL}`}</Text>
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

  const contentRows = useMemo(
    () => wrapToWidth(activeContent, cols).split('\n'),
    [activeContent, cols],
  )
  const maxOffset = Math.max(0, contentRows.length - viewportHeight)
  const offset = clamp(offsets[activeIndex] ?? 0, 0, maxOffset)
  const canScroll = contentRows.length > viewportHeight

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
    if (key.tab || key.rightArrow) {
      stepToTab(1)
      return
    }
    if (key.leftArrow) {
      stepToTab(-1)
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

  return (
    <Box flexDirection="column" width={cols} height={termRows}>
      <QueryBox query={wrappedQuery} width={cols} />
      <TabBar tabs={tabs} activeIndex={activeIndex} />
      <ScrollableSection
        rows={contentRows}
        offset={offset}
        viewportHeight={viewportHeight}
      />
      <FooterBar
        savedPath={savedPath}
        canScroll={canScroll}
        offset={offset}
        total={contentRows.length}
        viewportHeight={viewportHeight}
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
