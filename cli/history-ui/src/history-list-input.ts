import type { Key } from 'ink'
import type { Dispatch } from 'react'

import {
  rowPath,
  type Action,
  type ListRow,
  type NavGeometry,
} from './history-list-state.js'
import type { HistoryEntry } from './history-scan.js'

interface HistoryListInputArgs {
  state: {
    confirmingDelete: { path: string } | null
    filterMode: boolean
    filter: string
  }
  dispatch: Dispatch<Action>
  listRows: ListRow[]
  focusIndex: number
  windowHeight: number
  onPick: (entry: HistoryEntry) => void
  onExit: () => void
  setCannotOpenStatus: (value: string | null) => void
  setInternalDeleteStatus: (
    value: { text: string; tone: 'dim' | 'error' } | null,
  ) => void
}

export function createHistoryListInputHandler(
  args: HistoryListInputArgs,
): (input: string, key: Key) => void {
  const {
    state,
    dispatch,
    listRows,
    focusIndex,
    windowHeight,
    onPick,
    onExit,
    setCannotOpenStatus,
    setInternalDeleteStatus,
  } = args
  return (input, key) => {
    // ── Modal-open branch: this handler is fully frozen. ───────────────────
    // While the confirm modal is open, `<DeleteConfirmModal>` (built on
    // viewer-core's `<ConfirmModal>`) owns a `useInput` of its own and
    // resolves Y/N/Esc. Ink dispatches every keypress to ALL mounted
    // `useInput` hooks, so this one must early-return to a pure no-op — that
    // freezes list nav/filter exactly as before and leaves the modal's
    // handler the sole actor on the keypress.
    if (state.confirmingDelete !== null) return

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
  }
}
