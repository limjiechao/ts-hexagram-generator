import path from 'node:path'
import process from 'node:process'

import {
  computeInnerCols,
  FOOTER_HEIGHT,
  ScreenShell,
  ScrollbarTrack,
} from '@hexagram/viewer-core'
import { Box, Text, useInput } from 'ink'
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactElement,
} from 'react'

import { DeleteConfirmModal } from './delete-confirm-modal.js'
import { renderHistoryListFooter } from './history-list-footer.js'
import { createHistoryListInputHandler } from './history-list-input.js'
import { renderHistoryListRows } from './history-list-rows.js'
import { focusIndexOf, reducer, type ListRow } from './history-list-state.js'
import { buildTitle, deleteIdentity } from './history-list-transforms.js'
import type { HistoryEntry, UnreadableEntry } from './history-scan.js'
import { resolveRowWindow } from './row-window.js'

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
   * Verb shown after `ESC` in the footer key hints — names the real
   * destination of the top-level Escape exit. `HistoryApp` forwards its own
   * `exitLabel` here; standalone (`hexagram-history`) Escape quits the
   * program, so the default is `"quit"`. Used verbatim in both the populated
   * `hintLine` and the empty-state footer. Does NOT affect the filter-mode
   * hints (`Esc clear/close filter`) — those are a different Escape action.
   */
  exitLabel?: string
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
  /**
   * Fired exactly once per mount, in a `useEffect` that runs after this
   * component's `useInput` registration has been bound to Ink's stdin
   * dispatcher. The contract is: by the time `onReady` is called, the next
   * `stdin.write(...)` will be received by this list's `useInput` handler.
   *
   * Exists to defuse the `useInput` bind race that previously forced test
   * helpers (`pressUntil`) to retry the first cross-state keystroke up to ten
   * times: Ink registers a `useInput` handler inside its own `useEffect`,
   * which runs *after* the render commit on the next macrotask. Bytes written
   * between commit and bind get dispatched to ancestor handlers and silently
   * dropped. Because effects fire in declaration order, the `useEffect`
   * powering this callback is queued immediately after the `useInput` hook
   * above and therefore runs only once Ink's listener is in place — see
   * commit `800d3fc` (the `pressUntil` workaround it replaces) for context.
   * Defaults to a no-op.
   */
  onReady?: () => void
}

/** Height consumed by the title row. */
const TITLE_HEIGHT = 1

/** Label prefix for the dedicated filter row. */
const FILTER_LABEL = 'Filter '

/** Cursor character appended to the filter input. */
const FILTER_CURSOR = '_'

export function HistoryList({
  entries,
  unreadable,
  cols,
  rows,
  statusLine = null,
  onPick,
  onExit = () => {},
  exitLabel = 'quit',
  onDelete = () => {},
  deleteStatusLine = null,
  initialFocusPath = null,
  onReady,
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

  useInput(
    createHistoryListInputHandler({
      state,
      dispatch,
      listRows,
      focusIndex,
      windowHeight,
      onPick,
      onExit,
      setCannotOpenStatus,
      setInternalDeleteStatus,
    }),
  )

  // ── onReady witness signal ────────────────────────────────────────────────
  // Fires after this component's `useInput` registration above has bound to
  // Ink's stdin dispatcher. Effects run in declaration order, so this
  // `useEffect` is queued immediately after the one Ink uses internally for
  // `useInput` — by the time `onReady` is invoked, the next `stdin.write` is
  // guaranteed to land on the handler above. Guarded by a ref so it fires
  // exactly once per mount even if `onReady` identity changes between
  // renders (a re-fire would defeat its meaning as a one-shot ready latch).
  const readyFiredRef = useRef(false)
  // `onReady` is read once on mount; subsequent identity changes do not
  // re-fire the latch. The empty dep array is intentional and is NOT a
  // missing-dep mistake — see the JSDoc on `onReady` for the contract.
  useEffect(() => {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    onReady?.()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  // list. Title shows "0 consultations"; footer is just "ESC <exitLabel>".
  if (isEmpty) {
    const emptyTitle = 'Past Consultations · consultations/ · 0 consultations'
    const emptyFooter = (
      <Box flexDirection="column" flexShrink={0}>
        <Text dimColor>{` ESC ${exitLabel}`}</Text>
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

  const footerNode = renderHistoryListFooter({
    filterMode: state.filterMode,
    filter: state.filter,
    exitLabel,
    winStart: win.start,
    winEnd: win.end,
    windowHeight,
    totalConsultations: listRows.length,
    listRows,
    focusIndex,
    innerCols,
    statusLine,
    internalDeleteStatus,
    cannotOpenStatus,
  })

  // Every row is exactly two display lines. Truncation and padding are done
  // by *display width* (wide CJK glyphs count as two columns) so a line never
  // overshoots `innerCols` and wraps a stray third line into the content box.
  // `flexShrink={0}` keeps each row at its natural two-line height — if the
  // window maths ever overcount, the shell's `overflow: hidden` clips the
  // excess cleanly instead of flexbox squashing rows into each other.
  const contentNode = renderHistoryListRows({
    visibleRows,
    winStart: win.start,
    focusIndex,
    innerCols,
  })

  // Scrollbar geometry is in display-line units (1 consultation = 2 lines), so
  // the track spans the full content height. `windowHeight` is consultations,
  // hence the ×2 — passing it directly would render a half-height track.
  // Footer counters and windowing stay in consultation units.
  const totalConsultations = listRows.length
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
  // stays mounted so its reducer state is preserved behind the modal; its
  // `useInput` is frozen (see the modal-open branch above) so only the modal's
  // own `useInput` acts on Y/N/Esc. `onConfirm` closes the modal and fires the
  // host `onDelete` (→ `fs.unlink`); `onCancel` just closes the modal.
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
            onConfirm={() => {
              dispatch({ type: 'deleteCancel' })
              onDelete(confirmingDelete.path)
            }}
            onCancel={() => {
              dispatch({ type: 'deleteCancel' })
            }}
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
