import path from 'node:path'
import process from 'node:process'

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
  padEndToWidth,
  ScreenShell,
  ScrollbarTrack,
  truncateEnd,
  truncateStart,
} from '@hexagram/viewer-core'
import { Box, Text, useInput } from 'ink'
import { useMemo, useReducer, useState, type ReactElement } from 'react'

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
  /**
   * Called when the user presses Escape outside the filter row (or Ctrl+C is
   * handled upstream). The list owns Escape so that — while the filter row is
   * open — Escape clears/closes the filter instead of leaking through to an
   * app-level exit handler. Defaults to a no-op.
   */
  onExit?: () => void
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
  | { type: 'filterClear' }
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
    case 'filterClear':
      // Clear the typed text but keep the filter row open.
      return { ...state, filter: '' }
    case 'filterChange':
      return { ...state, filter: action.value }
  }
}

function shortenTimestamp(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
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
    query: truncateEnd(query, innerWidth - TIMESTAMP_PREFIX_WIDTH),
  }
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
    unreadableCount > 0 ? ` · ${unreadableCount} unreadable` : ''
  return `Past Consultations · consultations/ · ${countClause}${unreadableClause}`
}

export function HistoryList({
  entries,
  unreadable,
  cols,
  rows,
  statusLine = null,
  onPick,
  onExit = () => {},
}: HistoryListProps): ReactElement {
  const [state, dispatch] = useReducer(reducer, {
    focus: 0,
    windowStart: 0,
    filterMode: false,
    filter: '',
  })

  /**
   * Set when `Enter` is pressed on an unreadable row; cleared on the next
   * navigation key. Overrides the footer bottom row with
   * `Cannot open — <reason>`.
   */
  const [cannotOpenStatus, setCannotOpenStatus] = useState<string | null>(null)

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

  // Content height = rows minus title (1) minus filter block minus footer (2).
  // The filter block, when open, is the labeled row plus one blank line above
  // and below it (3 rows total). FOOTER_HEIGHT = 2, title = 1.
  const FILTER_ROW_HEIGHT = state.filterMode ? 3 : 0
  const contentHeight = Math.max(
    2,
    rows - TITLE_HEIGHT - FILTER_ROW_HEIGHT - FOOTER_HEIGHT,
  )

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
        // Escape with typed text clears it but keeps the filter row open;
        // Escape on an empty filter row closes the row. Either way the
        // keypress is consumed here so it never reaches an app-level exit.
        dispatch({
          type: state.filter.length > 0 ? 'filterClear' : 'filterExit',
        })
        return
      }
      if (key.return) {
        const row = listRows[focus]
        if (row?.kind === 'entry') onPick(row.entry)
        return
      }
      // Arrow / page keys still navigate the focused row while filtering —
      // they carry no character input, so they never collide with typing.
      const filterGeom = { size: listRows.length, windowHeight }
      if (key.upArrow) {
        dispatch({ type: 'up', ...filterGeom })
        return
      }
      if (key.downArrow) {
        dispatch({ type: 'down', ...filterGeom })
        return
      }
      if (key.pageUp) {
        dispatch({ type: 'pageUp', ...filterGeom })
        return
      }
      if (key.pageDown) {
        dispatch({ type: 'pageDown', ...filterGeom })
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
    if (key.escape) {
      onExit()
      return
    }
    if (input === '/') {
      setCannotOpenStatus(null)
      dispatch({ type: 'filterEnter' })
      return
    }
    const geom = { size: listRows.length, windowHeight }
    if (key.upArrow) {
      setCannotOpenStatus(null)
      dispatch({ type: 'up', ...geom })
    } else if (key.downArrow) {
      setCannotOpenStatus(null)
      dispatch({ type: 'down', ...geom })
    } else if (key.pageUp) {
      setCannotOpenStatus(null)
      dispatch({ type: 'pageUp', ...geom })
    } else if (key.pageDown) {
      setCannotOpenStatus(null)
      dispatch({ type: 'pageDown', ...geom })
    } else if (input === 'g') {
      setCannotOpenStatus(null)
      dispatch({ type: 'first', ...geom })
    } else if (input === 'G') {
      setCannotOpenStatus(null)
      dispatch({ type: 'last', ...geom })
    } else if (key.return) {
      const row = listRows[focus]
      if (row?.kind === 'entry') {
        onPick(row.entry)
      } else if (row?.kind === 'unreadable') {
        setCannotOpenStatus(`Cannot open — ${row.item.reason}`)
      }
    }
  })

  // Empty state — no consultations and no unreadable files.
  // Renders inside ScreenShell so the chrome is consistent with the populated
  // list. Title shows "0 consultations"; footer is just "ESC exit".
  if (isEmpty) {
    const emptyTitle = 'Past Consultations · consultations/ · 0 consultations'
    const emptyFooter = (
      <Box flexDirection="column" flexShrink={0}>
        <Text dimColor> ESC exit</Text>
        <Text>{` `}</Text>
      </Box>
    )
    const emptyContent = (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
      >
        <Text>No consultations yet.</Text>
        <Text dimColor>Run hexagram-random or hexagram-interactive first.</Text>
      </Box>
    )
    return (
      <ScreenShell
        cols={cols}
        rows={rows}
        title={emptyTitle}
        aboveContent={null}
        contentSlot={emptyContent}
        scrollbarSlot={null}
        belowContent={null}
        footerSlot={emptyFooter}
      />
    )
  }

  const title = buildTitle(entries.length, unreadable.length)

  const visibleRows = listRows.slice(win.start, win.end)

  // Key hint line (top line of footer). While the filter row is open, Escape
  // clears typed text (when present) or closes the row (when empty) — the hint
  // names whichever action the next Escape press will take.
  let hintLine: string
  if (!state.filterMode) {
    hintLine =
      ' ↑/↓ nav · PgUp/PgDn page · g/G first/last · Enter load · / filter · ESC exit'
  } else if (state.filter.length > 0) {
    hintLine = ' Esc clear filter · Enter load'
  } else {
    hintLine = ' Esc close filter · Enter load'
  }

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

  // Bottom line: focused file path (relative to cwd), or statusLine override,
  // or cannotOpenStatus override (when Enter is pressed on an unreadable row).
  const focusedRow = listRows[focus]
  let focusedPath = ''
  if (focusedRow != null) {
    focusedPath =
      focusedRow.kind === 'entry'
        ? path.relative(process.cwd(), focusedRow.entry.path)
        : path.relative(process.cwd(), focusedRow.item.path)
  }

  // cannotOpenStatus takes the highest priority; statusLine overrides the
  // normal focused-path line; otherwise show the focused path.
  const effectiveStatusLine: { text: string; tone: 'dim' | 'error' } | null =
    cannotOpenStatus === null
      ? statusLine
      : { text: cannotOpenStatus, tone: 'error' }

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

  // Every row is exactly two display lines. Truncation and padding are done
  // by *display width* (wide CJK glyphs count as two columns) so a line never
  // overshoots `innerCols` and wraps a stray third line into the content box.
  // `flexShrink={0}` keeps each row at its natural two-line height — if the
  // window maths ever overcount, the shell's `overflow: hidden` clips the
  // excess cleanly instead of flexbox squashing rows into each other.
  const indent = ' '.repeat(TIMESTAMP_PREFIX_WIDTH)
  const contentNode = (
    <Box flexDirection="column">
      {visibleRows.map((row, index) => {
        const absoluteIndex = win.start + index
        const isFocused = absoluteIndex === focus
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
    return entries.filter((e) =>
      e.envelope.query.toLowerCase().includes(needle),
    ).length
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
            filterInnerCols -
              FILTER_LABEL.length -
              displayText.length -
              matchLabelWidth,
          ),
        )
        // `marginY={1}` sets the filter row off from the title above and the
        // list below with one blank line on each side.
        return (
          <Box flexDirection="row" flexShrink={0} marginY={1}>
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
