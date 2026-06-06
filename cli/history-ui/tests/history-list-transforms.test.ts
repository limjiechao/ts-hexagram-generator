import type { Hexagram } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import type { ListRow } from '../src/history-list-state.js'
import {
  buildTitle,
  deleteIdentity,
  entryHeadLineParts,
  summarizeHexParts,
} from '../src/history-list-transforms.js'
import type { HistoryEntry } from '../src/history-scan.js'

function entry(p: string, query: string): HistoryEntry {
  return {
    path: p,
    envelope: {
      schemaVersion: 1,
      timestamp: '2026-03-16T13:28:33+0800',
      query,
      hexagram: [7, 7, 7, 7, 7, 7] as Hexagram,
      casting: null,
    },
    body: '',
  }
}

describe('buildTitle', () => {
  it('uses singular vs plural for the consultation count', () => {
    expect(buildTitle(1, 0)).toBe(
      'Past Consultations · consultations/ · 1 consultation',
    )
    expect(buildTitle(3, 0)).toBe(
      'Past Consultations · consultations/ · 3 consultations',
    )
  })
  it('appends the unreadable clause only when it is > 0', () => {
    expect(buildTitle(3, 2)).toBe(
      'Past Consultations · consultations/ · 3 consultations · 2 unreadable',
    )
    expect(buildTitle(0, 0)).toBe(
      'Past Consultations · consultations/ · 0 consultations',
    )
  })
})

describe('entryHeadLineParts', () => {
  it('builds the [timestamp] prefix and keeps a short query intact', () => {
    const parts = entryHeadLineParts(entry('/x/a.md', 'Short query'), 200)
    expect(parts.prefix).toBe('[2026-03-16 13:28] ')
    expect(parts.query).toBe('Short query')
  })
  it('substitutes (no query) for an empty query', () => {
    expect(entryHeadLineParts(entry('/x/a.md', ''), 200).query).toBe(
      '(no query)',
    )
  })
})

describe('summarizeHexParts', () => {
  it('a static hexagram has no moving segment', () => {
    const parts = summarizeHexParts([7, 7, 7, 7, 7, 7] as Hexagram)
    expect(parts.movingSegment).toBe(null)
    expect(parts.standingText.startsWith('#1 ')).toBe(true)
  })
  it('a hexagram with a moving line gains an emerging-arrow segment', () => {
    const parts = summarizeHexParts([6, 7, 7, 7, 7, 7] as Hexagram)
    expect(parts.movingSegment).not.toBe(null)
    expect(parts.movingSegment?.startsWith(' ──▶ #')).toBe(true)
  })
})

describe('deleteIdentity', () => {
  const rows: ListRow[] = [
    { kind: 'entry', entry: entry('/x/a.md', 'What now?') },
    { kind: 'unreadable', item: { path: '/x/bad.md', reason: 'invalid-yaml' } },
  ]
  it('renders a readable row as [timestamp] query', () => {
    expect(deleteIdentity(rows, '/x/a.md', 200)).toBe(
      '[2026-03-16 13:28] What now?',
    )
  })
  it('renders an unreadable row with its reason', () => {
    expect(deleteIdentity(rows, '/x/bad.md', 200)).toBe(
      '[unreadable — invalid-yaml]',
    )
  })
})
