import type { HistoryEntry, UnreadableEntry } from './history-scan.js'
import { computeWindowStart } from './row-window.js'

/** Page size for PgUp / PgDn. */
const PAGE_SIZE = 10

/** A unified list row — either a readable entry or an unreadable file. */
export type ListRow =
  | { kind: 'entry'; entry: HistoryEntry }
  | { kind: 'unreadable'; item: UnreadableEntry }

/** The on-disk path uniquely identifying a row regardless of its kind. */
export function rowPath(row: ListRow): string {
  return row.kind === 'entry' ? row.entry.path : row.item.path
}

/**
 * Resolve the focused row's index from its identity `path`. When the path is
 * still present, returns its index. When it is gone (the row was deleted),
 * falls back to `fallbackIndex` — the numeric slot the deleted row occupied —
 * clamped to the new list size, so the row below the deletion slides into
 * focus (or the previous row when the last row was deleted).
 */
export function focusIndexOf(
  listRows: ListRow[],
  focusPath: string | null,
  fallbackIndex = 0,
): number {
  if (focusPath === null || listRows.length === 0) return 0
  const idx = listRows.findIndex((r) => rowPath(r) === focusPath)
  if (idx !== -1) return idx
  return Math.min(fallbackIndex, Math.max(0, listRows.length - 1))
}

export interface State {
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
export type NavGeometry = {
  listRows: ListRow[]
  windowHeight: number
  currentIndex: number
}
export type Action =
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

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'up': {
      // ↑ wraps from the first row to the last for better browsing UX.
      // PgUp/g stay clamped — they have an explicit "go to top" meaning.
      const size = action.listRows.length
      if (size <= 1) return navigate(state, action.currentIndex, action)
      const target = (action.currentIndex - 1 + size) % size
      return navigate(state, target, action)
    }
    case 'down': {
      // ↓ wraps from the last row to the first.
      const size = action.listRows.length
      if (size <= 1) return navigate(state, action.currentIndex, action)
      const target = (action.currentIndex + 1) % size
      return navigate(state, target, action)
    }
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
