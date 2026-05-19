import type { Hexagram } from '@hexagram/types'
import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'

import { HistoryList } from '../src/history-list'

const fakeEntries = [
  {
    path: '/x/a.md',
    envelope: {
      schemaVersion: 1,
      timestamp: '2026-03-16T13:28:33+0800',
      query: 'What will working with Raven be like?',
      hexagram: [8, 7, 8, 9, 9, 9] as Hexagram,
      casting: [] as never,
    },
    body: '',
  },
  {
    path: '/x/b.md',
    envelope: {
      schemaVersion: 1,
      timestamp: '2026-01-15T18:16:38+0800',
      query: 'Should I study full-time or part-time?',
      hexagram: [8, 8, 6, 8, 8, 8] as Hexagram,
      casting: [] as never,
    },
    body: '',
  },
]

describe('<HistoryList>', () => {
  it('renders an empty-state line when entries are empty', () => {
    const { lastFrame } = render(
      <HistoryList entries={[]} unreadable={[]} cols={80} onPick={() => {}} />,
    )
    expect(lastFrame()).toContain('No consultations yet')
  })

  it('renders one two-line row per entry, newest first', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame.indexOf('2026-03-16 13:28')).toBeLessThan(
      frame.indexOf('2026-01-15 18:16'),
    )
    expect(frame).toMatch(/#\d+/)
  })

  it('truncates long queries to cols - 22', () => {
    const longQuery = 'x'.repeat(200)
    const { lastFrame } = render(
      <HistoryList
        entries={[
          {
            ...fakeEntries[0]!,
            envelope: { ...fakeEntries[0]!.envelope, query: longQuery },
          },
        ]}
        unreadable={[]}
        cols={50}
        onPick={() => {}}
      />,
    )
    expect((lastFrame() ?? '').split('\n')[0]!.length).toBeLessThanOrEqual(50)
  })
})
