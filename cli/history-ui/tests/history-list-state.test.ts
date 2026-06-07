import type { Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import {
  focusIndexOf,
  reducer,
  rowPath,
  type ListRow,
  type NavGeometry,
  type State,
} from '../src/history-list-state.js'
import type { HistoryEntry } from '../src/history-scan.js'

function entry(p: string): HistoryEntry {
  return {
    path: p,
    envelope: {
      schemaVersion: 1,
      timestamp: '2026-03-16T13:28:33+0800',
      query: `q-${p}`,
      hexagram: [7, 7, 7, 7, 7, 7] as Hexagram,
      casting: null,
      castingAbsence: 'legacy-no-table',
    },
    body: '',
  }
}

function entryRow(p: string): ListRow {
  return { kind: 'entry', entry: entry(p) }
}

const baseState: State = {
  focusPath: null,
  windowStart: 0,
  filterMode: false,
  filter: '',
  confirmingDelete: null,
}

describe('rowPath', () => {
  it('returns the entry path for an entry row', () => {
    expect(rowPath(entryRow('/x/a.md'))).toBe('/x/a.md')
  })
  it('returns the item path for an unreadable row', () => {
    const row: ListRow = {
      kind: 'unreadable',
      item: { path: '/x/bad.md', reason: 'invalid-yaml' },
    }
    expect(rowPath(row)).toBe('/x/bad.md')
  })
})

describe('focusIndexOf', () => {
  const rows = [entryRow('/a'), entryRow('/b'), entryRow('/c')]
  it('returns 0 when focusPath is null', () => {
    expect(focusIndexOf(rows, null)).toBe(0)
  })
  it('finds the row by path', () => {
    expect(focusIndexOf(rows, '/b')).toBe(1)
  })
  it('falls back to the clamped slot when the path is gone', () => {
    expect(focusIndexOf(rows, '/missing', 5)).toBe(2)
  })
})

describe('reducer navigation', () => {
  const rows = [entryRow('/a'), entryRow('/b'), entryRow('/c')]
  const geom = (currentIndex: number): NavGeometry => ({
    listRows: rows,
    windowHeight: 10,
    currentIndex,
  })

  it('down moves to the next row', () => {
    expect(reducer(baseState, { type: 'down', ...geom(0) }).focusPath).toBe(
      '/b',
    )
  })
  it('down wraps from the last row to the first', () => {
    expect(reducer(baseState, { type: 'down', ...geom(2) }).focusPath).toBe(
      '/a',
    )
  })
  it('up wraps from the first row to the last', () => {
    expect(reducer(baseState, { type: 'up', ...geom(0) }).focusPath).toBe('/c')
  })
  it('first and last jump to the ends', () => {
    expect(reducer(baseState, { type: 'first', ...geom(2) }).focusPath).toBe(
      '/a',
    )
    expect(reducer(baseState, { type: 'last', ...geom(0) }).focusPath).toBe(
      '/c',
    )
  })
})

describe('reducer filter + delete', () => {
  it('filterEnter opens the row; filterExit resets text and closes', () => {
    const opened = reducer(baseState, { type: 'filterEnter' })
    expect(opened.filterMode).toBe(true)
    const closed = reducer({ ...opened, filter: 'abc' }, { type: 'filterExit' })
    expect(closed.filterMode).toBe(false)
    expect(closed.filter).toBe('')
  })
  it('filterChange sets the needle; filterClear empties it', () => {
    expect(
      reducer(baseState, { type: 'filterChange', value: 'rav' }).filter,
    ).toBe('rav')
    expect(
      reducer({ ...baseState, filter: 'rav' }, { type: 'filterClear' }).filter,
    ).toBe('')
  })
  it('deleteRequest stores the path; deleteCancel clears it', () => {
    const req = reducer(baseState, { type: 'deleteRequest', path: '/a' })
    expect(req.confirmingDelete).toEqual({ path: '/a' })
    expect(reducer(req, { type: 'deleteCancel' }).confirmingDelete).toBe(null)
  })
})
