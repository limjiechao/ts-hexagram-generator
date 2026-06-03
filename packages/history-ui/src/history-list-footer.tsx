import path from 'node:path'
import process from 'node:process'

import {
  BOLD_GREY,
  BOLD_RED,
  DEFAULT_FG,
  NORMAL,
  NORMAL_GREY,
  truncateEnd,
  truncateStart,
} from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

import { rowPath, type ListRow } from './history-list-state.js'

interface HistoryListFooterArgs {
  filterMode: boolean
  filter: string
  exitLabel: string
  winStart: number
  winEnd: number
  windowHeight: number
  totalConsultations: number
  listRows: ListRow[]
  focusIndex: number
  innerCols: number
  statusLine: { text: string; tone: 'dim' | 'error' } | null
  internalDeleteStatus: { text: string; tone: 'dim' | 'error' } | null
  cannotOpenStatus: string | null
}

export function renderHistoryListFooter(
  args: HistoryListFooterArgs,
): ReactElement {
  const {
    filterMode,
    filter,
    exitLabel,
    winStart,
    winEnd,
    windowHeight,
    totalConsultations,
    listRows,
    focusIndex,
    innerCols,
    statusLine,
    internalDeleteStatus,
    cannotOpenStatus,
  } = args

  // Key hint line (top line of footer). While the filter row is open, Escape
  // clears typed text (when present) or closes the row (when empty) — the hint
  // names whichever action the next Escape press will take.
  let hintLine: string
  if (!filterMode) {
    // The trailing `ESC <exitLabel>` names the top-level Escape destination —
    // "quit" standalone, or whatever the host (`HistoryApp`) injected.
    hintLine = ` ↑/↓ nav · PgUp/PgDn page · g/G first/last · Enter load · / filter · ^D delete · ESC ${exitLabel}`
  } else if (filter.length > 0) {
    hintLine = ' Esc clear filter · Enter load · ^D delete'
  } else {
    hintLine = ' Esc close filter · Enter load · ^D delete'
  }

  // Scroll position status — counted in consultations, not display lines.
  // The count is always shown so a filtered result set still reveals its size.
  // When the list overflows, the ▲/▼ arrows render at the footer's normal dim;
  // when everything fits (nothing to scroll) they are greyed so the absence of
  // scrolling reads at a glance. DEFAULT_FG (not NORMAL) ends the grey run so
  // the surrounding `dimColor` wrapper stays intact.
  const scrollRange = `${winStart + 1}–${winEnd} of ${totalConsultations}`
  const scrollStatus =
    totalConsultations > windowHeight
      ? `▲ ${scrollRange} ▼   `
      : `${NORMAL_GREY}▲${DEFAULT_FG} ${scrollRange} ${NORMAL_GREY}▼${DEFAULT_FG}   `

  const statusLine1 = truncateEnd(
    `${scrollStatus}${hintLine.trimStart()}`,
    innerCols,
  )

  // Bottom line: focused file path (relative to cwd), or a status override.
  const focusedRow = listRows[focusIndex]
  let focusedPath = ''
  if (focusedRow != null) {
    focusedPath = path.relative(process.cwd(), rowPath(focusedRow))
  }

  // Footer bottom-line priority: cannotOpenStatus (highest) → internal delete
  // status → statusLine prop → focused path. Start from the lowest tier and
  // let each higher tier override; `statusLine` may itself be null, in which
  // case `bottomLineRaw` falls through to the focused path.
  let effectiveStatusLine: { text: string; tone: 'dim' | 'error' } | null =
    statusLine
  if (internalDeleteStatus !== null) {
    effectiveStatusLine = internalDeleteStatus
  }
  if (cannotOpenStatus !== null) {
    effectiveStatusLine = { text: cannotOpenStatus, tone: 'error' }
  }

  const bottomLineRaw =
    effectiveStatusLine === null ? focusedPath : effectiveStatusLine.text

  const bottomLine = truncateStart(bottomLineRaw, innerCols)

  const footerNode = (
    <Box flexDirection="column" flexShrink={0}>
      <Text dimColor>{` ${statusLine1}`}</Text>
      {effectiveStatusLine === null ? (
        <Text>{`${BOLD_GREY} ${bottomLine}${NORMAL}`}</Text>
      ) : (
        <Text dimColor>
          {`${effectiveStatusLine.tone === 'error' ? BOLD_RED : BOLD_GREY} ${bottomLine}${NORMAL}`}
        </Text>
      )}
    </Box>
  )

  return footerNode
}
