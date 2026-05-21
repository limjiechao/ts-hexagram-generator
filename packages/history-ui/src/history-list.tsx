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
import { useMemo, useReducer, useRef, useState, type ReactElement } from 'react'

import { DeleteConfirmModal } from './delete-confirm-modal.js'
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
  /**
   * Called with the focused row's path when the user confirms a Ctrl+D
   * delete (presses `Y` in the confirm modal). `HistoryApp` wires this to
   * `fs.unlink` + a rescan. Defaults to a no-op.
   */
  onDelete?: (path: string) => void
  /**
   * Transient status line set by `HistoryApp` after a delete resolves or
   * rejects — `dim` tone for success, `error` for failure. Mirrored into
   * internal state and cleared on the next navigation keypress, exactly like
   * the unreadable-row "Cannot open" status. Defaults to `null`.
   */
  deleteStatusLine?: { text: string; tone: 'dim' | 'error' } | null
  /**
   * Seeds the initially-focused row by `path` on mount — used by `HistoryApp`
   * to restore focus when the user returns from a loaded consultation. Read
   * only by the `useReducer` initializer; a stale/unknown path falls back to
   * the first row via `focusIndexOf`. Defaults to `null` (first row).
   */
  initialFocusPath?: string | null
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

/** The on-disk path uniquely identifying a row regardless of its kind. */
function rowPath(row: ListRow): string {
  return row.kind === 'entry' ? row.entry.path : row.item.path
}

/**
 * Resolve the focused row's index from its identity `path`. When the path is
 * still present, returns its index. When it is gone (the row was deleted),
 * falls back to `fallbackIndex` — the numeric slot the deleted row occupied —
 * clamped to the new list size, so the row below the deletion slides into
 * focus (or the previous row when the last row was deleted).
 */
function focusIndexOf(
  listRows: ListRow[],
  focusPath: string | null,
  fallbackIndex = 0,
): number {
  if (focusPath === null || listRows.length === 0) return 0
  const idx = listRows.findIndex((r) => rowPath(r) === focusPath)
  if (idx !== -1) return idx
  return Math.min(fallbackIndex, Math.max(0, listRows.length - 1))
}

interface State {
  /** Identity anchor for the focused row; `null` only when the list is empty. */
  focusPath: string | null
  /** Index of the first windowed row — kept sticky across navigation. */
  windowStart: number
  filterMode: boolean
  filter: string
  /** Holds the target row's path while the delete confirm modal is open. */
  confirmingDelete: { path: string } | null
}

/**
 * Navigation actions carry the resolved `listRows`, `windowHeight`, and the
 * render-time `currentIndex` (fallback already applied) so the reducer can
 * re-derive `focusPath` + a sticky `windowStart` in one pure step — and
 * crucially never re-resolves `focusIndexOf` itself, which would lose the
 * post-delete fallback that only the component knows.
 */
type NavGeometry = {
  listRows: ListRow[]
  windowHeight: number
  currentIndex: number
}
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
  | { type: 'deleteRequest'; path: string }
  | { type: 'deleteCancel' }

/** Re-derive the focused path and the sticky window from a raw index. */
function navigate(state: State, rawIndex: number, geom: NavGeometry): State {
  const size = geom.listRows.length
  const idx = Math.min(Math.max(rawIndex, 0), Math.max(0, size - 1))
  const row = geom.listRows[idx]
  return {
    ...state,
    focusPath: row == null ? null : rowPath(row),
    windowStart: computeWindowStart(
      size,
      geom.windowHeight,
      idx,
      state.windowStart,
    ),
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'up':
      return navigate(state, action.currentIndex - 1, action)
    case 'down':
      return navigate(state, action.currentIndex + 1, action)
    case 'pageUp':
      return navigate(state, action.currentIndex - PAGE_SIZE, action)
    case 'pageDown':
      return navigate(state, action.currentIndex + PAGE_SIZE, action)
    case 'first':
      return navigate(state, 0, action)
    case 'last':
      return navigate(state, action.listRows.length - 1, action)
    case 'filterEnter':
      return { ...state, filterMode: true }
    case 'filterExit':
      return { ...state, filterMode: false, filter: '' }
    case 'filterClear':
      // Clear the typed text but keep the filter row open.
      return { ...state, filter: '' }
    case 'filterChange':
      return { ...state, filter: action.value }
    case 'deleteRequest':
      return { ...state, confirmingDelete: { path: action.path } }
    case 'deleteCancel':
      return { ...state, confirmingDelete: null }
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
 * Build the human-readable identity line shown in the delete confirm modal —
 * `[YYYY-MM-DD HH:mm] <query>` (truncated) for a readable entry, or
 * `[unreadable — <reason>]` for an unreadable row. Falls back to the path
 * when the row can no longer be found in the list.
 */
function deleteIdentity(
  listRows: ListRow[],
  targetPath: string,
  innerCols: number,
): string {
  const row = listRows.find((r) => rowPath(r) === targetPath)
  if (row == null) return path.relative(process.cwd(), targetPath)
  if (row.kind === 'unreadable') return `[unreadable — ${row.item.reason}]`
  const head = entryHeadLineParts(row.entry, innerCols)
  return `${head.prefix}${head.query}`
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
  onDelete = () => {},
  deleteStatusLine = null,
  initialFocusPath = null,
}: HistoryListProps): ReactElement {
  const [state, dispatch] = useReducer(reducer, {
    focusPath:
      initialFocusPath ?? entries[0]?.path ?? unreadable[0]?.path ?? null,
    windowStart: 0,
    filterMode: false,
    filter: '',
    confirmingDelete: null,
  })

  /**
   * Set when `Enter` is pressed on an unreadable row; cleared on the next
   * navigation key. Overrides the footer bottom row with
   * `Cannot open — <reason>`.
   */
  const [cannotOpenStatus, setCannotOpenStatus] = useState<string | null>(null)

  /**
   * Internal mirror of the `deleteStatusLine` prop. Displayed in the footer
   * bottom line and cleared on the next navigation keypress (like
   * `cannotOpenStatus`). The prop is synced in render-phase via a
   * previous-value ref compare — an effect would trip
   * `react-hooks/set-state-in-effect`.
   */
  const [internalDeleteStatus, setInternalDeleteStatus] = useState<{
    text: string
    tone: 'dim' | 'error'
  } | null>(deleteStatusLine)
  const prevDeleteStatusRef = useRef(deleteStatusLine)
  if (prevDeleteStatusRef.current !== deleteStatusLine) {
    prevDeleteStatusRef.current = deleteStatusLine
    setInternalDeleteStatus(deleteStatusLine)
  }

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

  // The focused index is DERIVED — never stored. `lastKnownFocusRef` carries
  // the previous render's resolved index so a post-delete `focusIndexOf`
  // fallback knows which numeric slot the deleted row occupied. The fallback
  // is only meaningful on the render where `focusPath` first disappears from
  // `listRows` (the optimistic splice); on the next navigation the reducer
  // rewrites `focusPath` to a concrete row and the fallback stops mattering.
  const lastKnownFocusRef = useRef<number>(0)
  const focusIndex = focusIndexOf(
    listRows,
    state.focusPath,
    lastKnownFocusRef.current,
  )
  lastKnownFocusRef.current = focusIndex

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
    focusIndex,
    state.windowStart,
  )

  useInput((input, key) => {
    // ── Modal-open branch: all other keys are frozen. ──────────────────────
    if (state.confirmingDelete !== null) {
      if ((input === 'y' || input === 'Y') && !key.ctrl && !key.meta) {
        const targetPath = state.confirmingDelete.path
        dispatch({ type: 'deleteCancel' })
        onDelete(targetPath)
        return
      }
      if (input === 'n' || input === 'N' || key.escape) {
        dispatch({ type: 'deleteCancel' })
        return
      }
      // Everything else (including Enter) is a no-op while the modal is open.
      return
    }

    // ── Ctrl+D: open the delete confirm modal for the focused row. ─────────
    // Placed before the filterMode branch so it fires in both modes; the
    // filter input guards typing with `!key.ctrl`, so there is no collision.
    if (key.ctrl && input === 'd') {
      setCannotOpenStatus(null)
      setInternalDeleteStatus(null)
      const row = listRows[focusIndex]
      if (row != null) dispatch({ type: 'deleteRequest', path: rowPath(row) })
      return
    }

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
        const row = listRows[focusIndex]
        if (row?.kind === 'entry') onPick(row.entry)
        return
      }
      // Arrow / page keys still navigate the focused row while filtering —
      // they carry no character input, so they never collide with typing.
      const filterGeom: NavGeometry = {
        listRows,
        windowHeight,
        currentIndex: focusIndex,
      }
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
      setInternalDeleteStatus(null)
      dispatch({ type: 'filterEnter' })
      return
    }
    const geom: NavGeometry = {
      listRows,
      windowHeight,
      currentIndex: focusIndex,
    }
    if (key.upArrow) {
      setCannotOpenStatus(null)
      setInternalDeleteStatus(null)
      dispatch({ type: 'up', ...geom })
    } else if (key.downArrow) {
      setCannotOpenStatus(null)
      setInternalDeleteStatus(null)
      dispatch({ type: 'down', ...geom })
    } else if (key.pageUp) {
      setCannotOpenStatus(null)
      setInternalDeleteStatus(null)
      dispatch({ type: 'pageUp', ...geom })
    } else if (key.pageDown) {
      setCannotOpenStatus(null)
      setInternalDeleteStatus(null)
      dispatch({ type: 'pageDown', ...geom })
    } else if (input === 'g') {
      setCannotOpenStatus(null)
      setInternalDeleteStatus(null)
      dispatch({ type: 'first', ...geom })
    } else if (input === 'G') {
      setCannotOpenStatus(null)
      setInternalDeleteStatus(null)
      dispatch({ type: 'last', ...geom })
    } else if (key.return) {
      const row = listRows[focusIndex]
      if (row?.kind === 'entry') {
        onPick(row.entry)
      } else if (row?.kind === 'unreadable') {
        setCannotOpenStatus(`Cannot open — ${row.item.reason}`)
      }
    }
  })

  // Dedicated filter row — plain labeled form field: dim "Filter" label, bold
  // typed text, right-aligned dim match count. No border, no accent bar, no
  // inverse. Only shown while filterMode is active.
  //
  // Match count is always derived from readable `entries` only — unreadable
  // files have no query field and must never appear in the count, even when
  // the filter text is empty (spec: "unreadable files are excluded from matches").
  //
  // Declared before the `isEmpty` early return so the hook is called
  // unconditionally — a populated→empty transition (e.g. deleting the last
  // row) must not change the hook count between renders.
  const filterMatchCount = useMemo(() => {
    if (state.filter.length === 0) return entries.length
    const needle = state.filter.toLowerCase()
    return entries.filter((e) =>
      e.envelope.query.toLowerCase().includes(needle),
    ).length
  }, [entries, state.filter])

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
      ' ↑/↓ nav · PgUp/PgDn page · g/G first/last · Enter load · / filter · ^D delete · ESC exit'
  } else if (state.filter.length > 0) {
    hintLine = ' Esc clear filter · Enter load · ^D delete'
  } else {
    hintLine = ' Esc close filter · Enter load · ^D delete'
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

  // Scrollbar geometry is in display-line units (1 consultation = 2 lines), so
  // the track spans the full content height. `windowHeight` is consultations,
  // hence the ×2 — passing it directly would render a half-height track.
  // Footer counters and windowing stay in consultation units.
  const scrollbarNode = (
    <ScrollbarTrack
      offset={win.start * 2}
      totalRows={totalConsultations * 2}
      viewportHeight={contentHeight}
    />
  )

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

  // Delete confirm modal — rendered in the `belowContent` slot (between the
  // list and the footer) while `confirmingDelete` is active. `HistoryList`
  // stays mounted so its reducer state is preserved behind the modal.
  const confirmingDelete = state.confirmingDelete
  const belowContentNode =
    confirmingDelete === null
      ? null
      : (modalInnerCols: number) => (
          <DeleteConfirmModal
            displayIdentity={deleteIdentity(
              listRows,
              confirmingDelete.path,
              modalInnerCols,
            )}
            relativePath={path.relative(process.cwd(), confirmingDelete.path)}
            innerCols={modalInnerCols}
          />
        )

  return (
    <ScreenShell
      cols={cols}
      rows={rows}
      title={title}
      aboveContent={filterRowNode}
      contentSlot={contentNode}
      scrollbarSlot={scrollbarNode}
      belowContent={belowContentNode}
      footerSlot={footerNode}
    />
  )
}
