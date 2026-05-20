import { getEmergingHexagram, getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/types'
import { Box, Text, useInput } from 'ink'
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

function summarizeHex(hexagram: Hexagram): string {
  const standing = getHexagramRecord(hexagram)
  const hasMoving = hexagram.some((line) => line === 6 || line === 9)
  const left = `#${standing.Metadata.Order.WenWang} ${standing.Name.Chinese.Traditional} ${standing.Name.English.WilhelmBaynes.split(' / ')[0] ?? standing.Name.English.WilhelmBaynes}`
  if (!hasMoving) return left
  const emerging = getHexagramRecord(getEmergingHexagram(hexagram))
  const right = `#${emerging.Metadata.Order.WenWang} ${emerging.Name.Chinese.Traditional} ${emerging.Name.English.WilhelmBaynes.split(' / ')[0] ?? emerging.Name.English.WilhelmBaynes}`
  return `${left} ──▶ ${right}`
}

/** First line of a row: `[timestamp] <query>`, truncated to the inner width. */
function entryHeadLine(entry: HistoryEntry, innerWidth: number): string {
  const query =
    entry.envelope.query.length > 0 ? entry.envelope.query : '(no query)'
  const prefix = `[${shortenTimestamp(entry.envelope.timestamp)}] `
  return `${prefix}${truncate(query, innerWidth - TIMESTAMP_PREFIX_WIDTH)}`
}

/** Second line of a row: indented hexagram summary, truncated. */
function entrySummaryLine(entry: HistoryEntry, innerWidth: number): string {
  const indent = ' '.repeat(TIMESTAMP_PREFIX_WIDTH)
  return `${indent}${truncate(
    summarizeHex(entry.envelope.hexagram),
    innerWidth - TIMESTAMP_PREFIX_WIDTH,
  )}`
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
  const isFiltering = state.filter.length > 0

  // While filtering, only readable entries whose query matches show; the
  // unreadable rows have no query field and are excluded. With no filter,
  // entries come first (newest-first), then the unreadable files.
  const listRows = useMemo<ListRow[]>(() => {
    const entryRows: ListRow[] = entries.map((entry) => ({
      kind: 'entry',
      entry,
    }))
    if (isFiltering) {
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
  }, [entries, unreadable, isFiltering, state.filter])

  const focus = Math.min(state.focus, Math.max(0, listRows.length - 1))

  // The bordered container occupies the full terminal height. Inside it, two
  // border rows + two padding rows are chrome; the remaining lines hold the
  // windowed rows. Each entry is two display lines, and the "… N above" /
  // "… N more" indicators each consume one line when present.
  const innerWidth = Math.max(10, cols - 4)
  const contentHeight = Math.max(2, rows - 4)
  // Reserve a line for each indicator that may appear. Rows are 2 lines each.
  const rowsCapacity = Math.max(1, Math.floor((contentHeight - 2) / 2))
  const windowHeight = Math.min(rowsCapacity, Math.max(1, listRows.length))

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
          borderStyle="round"
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

  const title = isFiltering
    ? `Past Consultations ─── filter: "${state.filter}" ── ${listRows.length} ${
        listRows.length === 1 ? 'match' : 'matches'
      } `
    : 'Past Consultations '

  const visibleRows = listRows.slice(win.start, win.end)

  const hintFooter = state.filterMode
    ? ` filter: ${state.filter}_ · ESC clear · Enter load`
    : ' ↑/↓ nav · PgUp/PgDn page · g/G first/last · Enter load · / filter · ESC exit'

  return (
    <Box flexDirection="column" width={cols} height={rows}>
      <Box flexGrow={1} borderStyle="round" flexDirection="column" paddingX={1}>
        <Text>{title}</Text>
        {win.above > 0 ? <Text dimColor>{`… ${win.above} above`}</Text> : null}
        {visibleRows.map((row, index) => {
          const absoluteIndex = win.start + index
          const isFocused = absoluteIndex === focus
          if (row.kind === 'unreadable') {
            return (
              <Box key={row.item.path} flexDirection="column">
                <Text inverse={isFocused} dimColor>
                  {truncate(`[unreadable — ${row.item.reason}]`, innerWidth)}
                </Text>
                <Text inverse={isFocused} dimColor>
                  {' '.repeat(TIMESTAMP_PREFIX_WIDTH) +
                    truncate(
                      row.item.path,
                      innerWidth - TIMESTAMP_PREFIX_WIDTH,
                    )}
                </Text>
              </Box>
            )
          }
          return (
            <Box key={row.entry.path} flexDirection="column">
              <Text inverse={isFocused}>
                {entryHeadLine(row.entry, innerWidth)}
              </Text>
              <Text inverse={isFocused}>
                {entrySummaryLine(row.entry, innerWidth)}
              </Text>
            </Box>
          )
        })}
        {win.below > 0 ? <Text dimColor>{`… ${win.below} more`}</Text> : null}
      </Box>
      {statusLine === null || state.filterMode ? (
        <Text dimColor>{hintFooter}</Text>
      ) : (
        <Text color={statusLine.tone === 'error' ? 'red' : undefined} dimColor>
          {` ${statusLine.text}`}
        </Text>
      )}
    </Box>
  )
}
