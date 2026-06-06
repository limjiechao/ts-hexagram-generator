// Pure unit tests for the extracted history-list input handler. The factory
// takes plain data + spies and returns a `(input, key) => void` keystroke
// router — no Ink render, no React. The footer/rows renderers return JSX and
// stay covered by the `history-list.test.tsx` integration test, so they are
// not duplicated here.

import type { Key } from 'ink'
import { describe, expect, it, vi } from 'vitest'

import { createHistoryListInputHandler } from '../src/history-list-input.js'
import type { ListRow } from '../src/history-list-state.js'

function makeKey(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    home: false,
    end: false,
    super: false,
    hyper: false,
    capsLock: false,
    numLock: false,
    ...overrides,
  }
}

const rows: ListRow[] = []

describe('createHistoryListInputHandler', () => {
  it('Ctrl+D on a focused row dispatches deleteRequest and clears statuses', () => {
    const dispatch = vi.fn()
    const setCannotOpenStatus = vi.fn()
    const setInternalDeleteStatus = vi.fn()
    // The handler derives the path via `rowPath(row)` from the state module —
    // for an entry row that resolves to `row.entry.path`.
    const row = {
      kind: 'entry',
      entry: { path: '/x.md' },
    } as unknown as ListRow
    const handler = createHistoryListInputHandler({
      state: { confirmingDelete: null, filterMode: false, filter: '' },
      dispatch,
      listRows: [row],
      focusIndex: 0,
      windowHeight: 5,
      onPick: vi.fn(),
      onExit: vi.fn(),
      setCannotOpenStatus,
      setInternalDeleteStatus,
    })
    handler('d', makeKey({ ctrl: true }))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'deleteRequest',
      path: '/x.md',
    })
    expect(setCannotOpenStatus).toHaveBeenCalledWith(null)
    expect(setInternalDeleteStatus).toHaveBeenCalledWith(null)
  })

  it('is a no-op while the confirm modal is open', () => {
    const dispatch = vi.fn()
    const handler = createHistoryListInputHandler({
      state: {
        confirmingDelete: { path: '/x.md' },
        filterMode: false,
        filter: '',
      },
      dispatch,
      listRows: rows,
      focusIndex: 0,
      windowHeight: 5,
      onPick: vi.fn(),
      onExit: vi.fn(),
      setCannotOpenStatus: vi.fn(),
      setInternalDeleteStatus: vi.fn(),
    })
    handler('d', makeKey({ ctrl: true }))
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('Escape outside filter mode calls onExit', () => {
    const onExit = vi.fn()
    const handler = createHistoryListInputHandler({
      state: { confirmingDelete: null, filterMode: false, filter: '' },
      dispatch: vi.fn(),
      listRows: rows,
      focusIndex: 0,
      windowHeight: 5,
      onPick: vi.fn(),
      onExit,
      setCannotOpenStatus: vi.fn(),
      setInternalDeleteStatus: vi.fn(),
    })
    handler('', makeKey({ escape: true }))
    expect(onExit).toHaveBeenCalledOnce()
  })
})
