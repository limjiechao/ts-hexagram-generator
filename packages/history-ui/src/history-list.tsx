import { getEmergingHexagram, getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/types'
import {
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  computeInnerCols,
  FOOTER_HEIGHT,
  NORMAL,
  NORMAL_GREY,
  ScreenShell,
  ScrollbarTrack,
  truncateEnd,
  truncateStart,
} from '@hexagram/viewer-core'
import { Box, Text, useInput } from 'ink'
import path from 'node:path'
import process from 'node:process'
import { useMemo, useReducer, type ReactElement } from 'react'

import type { HistoryEntry, UnreadableEntry } from './history-scan.js'
import { computeWindowStart, resolveRowWindow } from './row-window.js'

interface HistoryListProps {
  entries: HistoryEntry[]
  unreadable: UnreadableEntry[]
  /** Terminal width in columns. */
  cols: number
  /** Terminal height in rows. */
  rows: number
  /**
   * When set, replaces the keybinding-hint footer with a transient status
   * line (e.g. "Loading…" or a load error). Filter-mode still owns the
   * footer while the filter input is active.
   */
  statusLine?: { text: string; tone: 'dim' | 'error' } | null
  onPick: (entry: HistoryEntry) => void
}

/**
 * Width of the fixed `[YYYY-MM-DD HH:mm] ` prefix on a row's first line —
 * `[` + 16 chars + `]` + one space. Line 2 is indented by this much so its
 * content aligns under the query text.
 */
const TIMESTAMP_PREFIX_WIDTH = 19

/** Page size for PgUp / PgDn. */
const PAGE_SIZE = 10

/** Height consumed by the title row. */
const TITLE_HEIGHT = 1

/** Label prefix for the dedicated filter row. */
const FILTER_LABEL = 'Filter '

/** Cursor character appended to the filter input. */
const FILTER_CURSOR = '_'

/** A unified list row — either a readable entry or an unreadable file. */
type ListRow =
  | { kind: 'entry'; entry: HistoryEntry }
  | { kind: 'unreadable'; item: UnreadableEntry }

interface State {
  focus: number
  /** Index of the first windowed row — kept sticky across navigation. */
  windowStart: number
  filterMode: boolean
  filter: string
}

/**
 * Navigation actions carry the current `size` (row count) and `windowHeight`
 * so the reducer can re-clamp focus and re-derive a sticky `windowStart` in
 * one pure step — no render-phase effects needed.
 */
type NavGeometry = { size: number; windowHeight: number }
type Action =
  | ({ type: 'up' } & NavGeometry)
  | ({ type: 'down' } & NavGeometry)
  | ({ type: 'pageUp' } & NavGeometry)
  | ({ type: 'pageDown' } & NavGeometry)
  | ({ type: 'first' } & NavGeometry)
  | ({ type: 'last' } & NavGeometry)
  | { type: 'filterEnter' }
  | { type: 'filterExit' }
  | { type: 'filterChange'; value: string }

/** Re-clamp focus and re-derive the sticky window in one step. */
function navigate(state: State, rawFocus: number, geom: NavGeometry): State {
  const focus = Math.min(Math.max(rawFocus, 0), Math.max(0, geom.size - 1))
  return {
    ...state,
    focus,
    windowStart: computeWindowStart(
      geom.size,
      geom.windowHeight,
      focus,
      state.windowStart,
    ),
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'up':
      return navigate(state, state.focus - 1, action)
    case 'down':
      return navigate(state, state.focus + 1, action)
    case 'pageUp':
      return navigate(state, state.focus - PAGE_SIZE, action)
    case 'pageDown':
      return navigate(state, state.focus + PAGE_SIZE, action)
    case 'first':
      return navigate(state, 0, action)
    case 'last':
      return navigate(state, action.size - 1, action)
    case 'filterEnter':
      return { ...state, filterMode: true }
    case 'filterExit':
      return { ...state, filterMode: false, filter: '' }
    case 'filterChange':
      return { ...state, filter: action.value }
  }
}

function shortenTimestamp(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
}

function truncate(text: string, max: number): string {
  if (max <= 0) return ''
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1))}…`
}

/**
 * Structured parts of the hexagram summary line for palette-colored rendering.
 * `movingSegment` is non-null only when there are moving lines.
 */
interface HexSummaryParts {
  standingText: string
  movingSegment: string | null
}

function summarizeHexParts(hexagram: Hexagram): HexSummaryParts {
  const standing = getHexagramRecord(hexagram)
  const hasMoving = hexagram.some((line) => line === 6 || line === 9)
  const standingText = `#${standing.Metadata.Order.WenWang} ${standing.Name.Chinese.Traditional} ${standing.Name.English.WilhelmBaynes.split(' / ')[0] ?? standing.Name.English.WilhelmBaynes}`
  if (!hasMoving) return { standingText, movingSegment: null }
  const emerging = getHexagramRecord(getEmergingHexagram(hexagram))
  const emergingText = `#${emerging.Metadata.Order.WenWang} ${emerging.Name.Chinese.Traditional} ${emerging.Name.English.WilhelmBaynes.split(' / ')[0] ?? emerging.Name.English.WilhelmBaynes}`
  return { standingText, movingSegment: ` ──▶ ${emergingText}` }
}

/**
 * Structured parts of the first row line for palette-colored rendering.
 */
interface HeadLineParts {
  prefix: string
  query: string
}

/** First line parts of a row: `[timestamp]` prefix and truncated query. */
function entryHeadLineParts(
  entry: HistoryEntry,
  innerWidth: number,
): HeadLineParts {
  const query =
    entry.envelope.query.length > 0 ? entry.envelope.query : '(no query)'
  const prefix = `[${shortenTimestamp(entry.envelope.timestamp)}] `
  return {
    prefix,
    query: truncate(query, innerWidth - TIMESTAMP_PREFIX_WIDTH),
  }
}

/**
 * Pad a plain text string to `width` with trailing spaces, so that an inverse
 * highlight spans edge to edge on the focused row.
 */
function padToWidth(text: string, width: number): string {
  if (text.length >= width) return text
  return text + ' '.repeat(width - text.length)
}

/**
 * Build the shell title string.
 * `Past Consultations · consultations/ · N consultations [· M unreadable]`
 * The `· M unreadable` clause appears only when M > 0.
 */
function buildTitle(
  consultationCount: number,
  unreadableCount: number,
): string {
  const countClause = `${consultationCount} ${consultationCount === 1 ? 'consultation' : 'consultations'}`
  const unreadableClause =
    unreadableCount > 0
      ? ` · ${unreadableCount} unreadable`
      : ''
  return `Past Consultations · consultations/ · ${countClause}${unreadableClause}`
}

export function HistoryList({
  entries,
  unreadable,
  cols,
  rows,
  statusLine = null,
  onPick,
}: HistoryListProps): ReactElement {
  const [state, dispatch] = useReducer(reducer, {
    focus: 0,
    windowStart: 0,
    filterMode: false,
    filter: '',
  })

  const isEmpty = entries.length === 0 && unreadable.length === 0

  // While filtering, only readable entries whose query matches show; the
  // unreadable rows have no query field and are excluded. With no filter,
  // entries come first (newest-first), then the unreadable files.
  const listRows = useMemo<ListRow[]>(() => {
    const entryRows: ListRow[] = entries.map((entry) => ({
      kind: 'entry',
      entry,
    }))
    if (state.filter.length > 0) {
      const needle = state.filter.toLowerCase()
      return entryRows.filter(
        (row) =>
          row.kind === 'entry' &&
          row.entry.envelope.query.toLowerCase().includes(needle),
      )
    }
    const unreadableRows: ListRow[] = unreadable.map((item) => ({
      kind: 'unreadable',
      item,
    }))
    return [...entryRows, ...unreadableRows]
  }, [entries, unreadable, state.filter])

  const focus = Math.min(state.focus, Math.max(0, listRows.length - 1))

  // ScreenShell owns paddingX (1 each side) + 1-column scrollbar gutter.
  // innerCols = cols - 2 - 1 (same as computeInnerCols).
  const innerCols = computeInnerCols(cols)

  // Content height = rows minus title (1) minus filter row (1 when visible)
  // minus footer (2). FOOTER_HEIGHT = 2, title = 1.
  const FILTER_ROW_HEIGHT = state.filterMode ? 1 : 0
  const contentHeight = Math.max(2, rows - TITLE_HEIGHT - FILTER_ROW_HEIGHT - FOOTER_HEIGHT)

  // Each entry is two display lines. Window capacity in rows (consultation count).
  const windowHeight = Math.max(1, Math.floor(contentHeight / 2))

  const win = resolveRowWindow(
    listRows.length,
    windowHeight,
    focus,
    state.windowStart,
  )

  useInput((input, key) => {
    if (state.filterMode) {
      if (key.escape) {
        dispatch({ type: 'filterExit' })
        return
      }
      if (key.return) {
        const row = listRows[focus]
        if (row?.kind === 'entry') onPick(row.entry)
        return
      }
      if (key.backspace || key.delete) {
        dispatch({ type: 'filterChange', value: state.filter.slice(0, -1) })
        return
      }
      if (input.length > 0 && !key.ctrl && !key.meta) {
        dispatch({ type: 'filterChange', value: state.filter + input })
        return
      }
      return
    }
    if (input === '/') {
      dispatch({ type: 'filterEnter' })
      return
    }
    const geom = { size: listRows.length, windowHeight }
    if (key.upArrow) dispatch({ type: 'up', ...geom })
    else if (key.downArrow) dispatch({ type: 'down', ...geom })
    else if (key.pageUp) dispatch({ type: 'pageUp', ...geom })
    else if (key.pageDown) dispatch({ type: 'pageDown', ...geom })
    else if (input === 'g') dispatch({ type: 'first', ...geom })
    else if (input === 'G') dispatch({ type: 'last', ...geom })
    else if (key.return) {
      const row = listRows[focus]
      if (row?.kind === 'entry') onPick(row.entry)
    }
  })

  // Mockup D — empty state: centered message, no nav/filter hints.
  if (isEmpty) {
    return (
      <Box flexDirection="column" width={cols} height={rows}>
        <Box
          flexGrow={1}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <Text>No consultations yet.</Text>
          <Text dimColor>
            Run hexagram-random or hexagram-interactive first.
          </Text>
        </Box>
        {statusLine === null ? (
          <Text dimColor> ESC exit</Text>
        ) : (
          <Text
            color={statusLine.tone === 'error' ? 'red' : undefined}
            dimColor
          >
            {` ${statusLine.text}`}
          </Text>
        )}
      </Box>
    )
  }

  const title = buildTitle(
    entries.length,
    unreadable.length,
  )

  const visibleRows = listRows.slice(win.start, win.end)

  // Key hint line (top line of footer).
  const hintLine = state.filterMode
    ? ' ESC clear · Enter load'
    : ' ↑/↓ nav · PgUp/PgDn page · g/G first/last · Enter load · / filter · ESC exit'

  // Scroll position status — counted in consultations, not display lines.
  const totalConsultations = listRows.length
  const scrollStatus =
    totalConsultations > windowHeight
      ? `▲ ${win.start + 1}–${win.end} of ${totalConsultations} ▼   `
      : ''

  const statusLine1 = truncateEnd(
    `${scrollStatus}${hintLine.trimStart()}`,
    innerCols,
  )

  // Bottom line: focused file path (relative to cwd), or statusLine override.
  const focusedRow = listRows[focus]
  let focusedPath = ''
  if (focusedRow != null) {
    focusedPath =
      focusedRow.kind === 'entry'
        ? path.relative(process.cwd(), focusedRow.entry.path)
        : path.relative(process.cwd(), focusedRow.item.path)
  }

  const bottomLineRaw =
    statusLine === null ? focusedPath : statusLine.text

  const bottomLine = truncateStart(bottomLineRaw, innerCols)

  const footerNode = (
    <Box flexDirection="column" flexShrink={0}>
      <Text dimColor>{` ${statusLine1}`}</Text>
      {statusLine === null ? (
        <Text>{`${BOLD_GREY} ${bottomLine}${NORMAL}`}</Text>
      ) : (
        <Text color={statusLine.tone === 'error' ? 'red' : undefined} dimColor>
          {`${BOLD_GREY} ${bottomLine}${NORMAL}`}
        </Text>
      )}
    </Box>
  )

  const contentNode = (
    <Box flexDirection="column">
      {visibleRows.map((row, index) => {
        const absoluteIndex = win.start + index
        const isFocused = absoluteIndex === focus
        if (row.kind === 'unreadable') {
          return (
            <Box key={row.item.path} flexDirection="column">
              <Text inverse={isFocused} dimColor>
                {truncate(`[unreadable — ${row.item.reason}]`, innerCols)}
              </Text>
              <Text inverse={isFocused} dimColor>
                {' '.repeat(TIMESTAMP_PREFIX_WIDTH) +
                  truncate(
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

        // Summary line: indent + standing text (+ optional moving segment).
        const indent = ' '.repeat(TIMESTAMP_PREFIX_WIDTH)
        const summaryAvailable = innerCols - TIMESTAMP_PREFIX_WIDTH
        // Measure standing text; if moving segment exists, allocate remaining.
        const standingTruncated = truncate(hexParts.standingText, summaryAvailable)
        const movingTruncated =
          hexParts.movingSegment === null
            ? null
            : truncate(
                hexParts.movingSegment,
                summaryAvailable - standingTruncated.length,
              )

        if (isFocused) {
          // Focused row: full-width plain bold inverse bar — no per-segment color.
          const headLine = padToWidth(
            headParts.prefix + headParts.query,
            innerCols,
          )
          const summaryLine = padToWidth(
            indent + standingTruncated + (movingTruncated ?? ''),
            innerCols,
          )
          return (
            <Box key={row.entry.path} flexDirection="column">
              <Text bold inverse>
                {headLine}
              </Text>
              <Text bold inverse>
                {summaryLine}
              </Text>
            </Box>
          )
        }

        // Unfocused row: palette-colored segments.
        return (
          <Box key={row.entry.path} flexDirection="column">
            {/* Line 1: dim timestamp prefix + bold-white query */}
            <Text>
              {`${NORMAL_GREY}${headParts.prefix}${NORMAL}${BOLD_WHITE}${headParts.query}${NORMAL}`}
            </Text>
            {/* Line 2: default-weight standing name + BOLD_RED moving segment */}
            <Text>
              {movingTruncated === null
                ? `${indent}${standingTruncated}`
                : `${indent}${standingTruncated}${BOLD_RED}${movingTruncated}${NORMAL}`}
            </Text>
          </Box>
        )
      })}
    </Box>
  )

  // Scrollbar: treat consultations as the unit — totalRows and offset are in
  // consultation-row space, not display-line space.
  const scrollbarNode = (
    <ScrollbarTrack
      offset={win.start}
      totalRows={totalConsultations}
      viewportHeight={windowHeight}
    />
  )

  // Dedicated filter row — plain labeled form field: dim "Filter" label, bold
  // typed text, right-aligned dim match count. No border, no accent bar, no
  // inverse. Only shown while filterMode is active.
  //
  // Match count is always derived from readable `entries` only — unreadable
  // files have no query field and must never appear in the count, even when
  // the filter text is empty (spec: "unreadable files are excluded from matches").
  const filterMatchCount = useMemo(() => {
    if (state.filter.length === 0) return entries.length
    const needle = state.filter.toLowerCase()
    return entries.filter((e) => e.envelope.query.toLowerCase().includes(needle))
      .length
  }, [entries, state.filter])

  const filterRowNode = state.filterMode
    ? (filterInnerCols: number) => {
        const matchLabel = `${filterMatchCount} ${filterMatchCount === 1 ? 'match' : 'matches'}`
        // Width available for the text field between label and match count.
        // matchLabel length + 1 space gap on the right.
        const matchLabelWidth = matchLabel.length
        const textWidth = Math.max(
          0,
          filterInnerCols - FILTER_LABEL.length - matchLabelWidth - 1,
        )
        // Truncate the filter text to fit the available width (keep tail).
        const displayText =
          state.filter.length > textWidth - 1
            ? `…${state.filter.slice(-(textWidth - 2))}${FILTER_CURSOR}`
            : `${state.filter}${FILTER_CURSOR}`
        const gap = ' '.repeat(
          Math.max(
            0,
            filterInnerCols - FILTER_LABEL.length - displayText.length - matchLabelWidth,
          ),
        )
        return (
          <Box flexDirection="row" flexShrink={0}>
            <Text dimColor>{FILTER_LABEL}</Text>
            <Text bold>{displayText}</Text>
            <Text>{gap}</Text>
            <Text dimColor>{matchLabel}</Text>
          </Box>
        )
      }
    : null

  return (
    <ScreenShell
      cols={cols}
      rows={rows}
      title={title}
      aboveContent={filterRowNode}
      contentSlot={contentNode}
      scrollbarSlot={scrollbarNode}
      belowContent={null}
      footerSlot={footerNode}
    />
  )
}
