import {
  BOLD_RED,
  BOLD_WHITE,
  NORMAL,
  NORMAL_GREY,
  padEndToWidth,
  truncateEnd,
} from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

import type { ListRow } from './history-list-state.js'
import {
  entryHeadLineParts,
  summarizeHexParts,
  TIMESTAMP_PREFIX_WIDTH,
} from './history-list-transforms.js'

interface HistoryListRowsArgs {
  visibleRows: ListRow[]
  winStart: number
  focusIndex: number
  innerCols: number
}

export function renderHistoryListRows(args: HistoryListRowsArgs): ReactElement {
  const { visibleRows, winStart, focusIndex, innerCols } = args
  const indent = ' '.repeat(TIMESTAMP_PREFIX_WIDTH)
  return (
    <Box flexDirection="column">
      {visibleRows.map((row, index) => {
        const absoluteIndex = winStart + index
        const isFocused = absoluteIndex === focusIndex
        if (row.kind === 'unreadable') {
          return (
            <Box key={row.item.path} flexDirection="column" flexShrink={0}>
              <Text inverse={isFocused}>
                {`${BOLD_RED}${truncateEnd(`[unreadable — ${row.item.reason}]`, innerCols)}${NORMAL}`}
              </Text>
              <Text inverse={isFocused} dimColor>
                {indent +
                  truncateEnd(
                    row.item.path,
                    innerCols - TIMESTAMP_PREFIX_WIDTH,
                  )}
              </Text>
            </Box>
          )
        }

        // Readable entry row.
        const headParts = entryHeadLineParts(row.entry, innerCols)
        const hexParts = summarizeHexParts(row.entry.envelope.hexagram)

        if (isFocused) {
          // Focused row: full-width plain bold inverse bar — no per-segment
          // color. Both lines are truncated then padded to the inner width so
          // the inverse highlight spans edge to edge without wrapping.
          const headLine = padEndToWidth(
            truncateEnd(headParts.prefix + headParts.query, innerCols),
            innerCols,
          )
          const summaryLine = padEndToWidth(
            truncateEnd(
              `${indent}${hexParts.standingText}${hexParts.movingSegment ?? ''}`,
              innerCols,
            ),
            innerCols,
          )
          return (
            <Box key={row.entry.path} flexDirection="column" flexShrink={0}>
              <Text bold inverse>
                {headLine}
              </Text>
              <Text bold inverse>
                {summaryLine}
              </Text>
            </Box>
          )
        }

        // Unfocused row: palette-colored segments. The moving segment rides in
        // BOLD_RED; truncateEnd is ANSI-aware so embedded SGR codes survive a
        // (rare) truncation.
        const summaryLine =
          hexParts.movingSegment === null
            ? truncateEnd(`${indent}${hexParts.standingText}`, innerCols)
            : truncateEnd(
                `${indent}${hexParts.standingText}${BOLD_RED}${hexParts.movingSegment}${NORMAL}`,
                innerCols,
              )
        return (
          <Box key={row.entry.path} flexDirection="column" flexShrink={0}>
            {/* Line 1: dim timestamp prefix + bold-white query */}
            <Text>
              {`${NORMAL_GREY}${headParts.prefix}${NORMAL}${BOLD_WHITE}${headParts.query}${NORMAL}`}
            </Text>
            {/* Line 2: default-weight standing name + BOLD_RED moving segment */}
            <Text>{summaryLine}</Text>
          </Box>
        )
      })}
    </Box>
  )
}
