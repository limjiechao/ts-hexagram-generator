import type { Hexagram } from '@hexagram/types'
import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'

import { HistoryList } from '../src/history-list'

// Matches ANSI SGR escape sequences (ESC[...m) — e.g. the inverse-video codes
// Ink emits for the focused row. Built from char code 0x1b so the literal
// control character never appears in source. Stripped before measuring width.
const ANSI_PATTERN = new RegExp(
  String.raw`${String.fromCodePoint(0x1b)}\[[0-9;]*m`,
  'g',
)

function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}

/** Yield to the event loop so Ink can process queued stdin + re-render. */
const tick = (ms = 50): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

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
  it('renders a centered empty-state when there are no entries', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={[]}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('No consultations yet.')
    expect(frame).toContain('Run hexagram-random or hexagram-interactive')
    // Empty state suppresses nav/filter hints — footer is just ESC exit.
    expect(frame).toContain('ESC exit')
    expect(frame).not.toContain('PgUp/PgDn')
  })

  it('renders inside a bordered "Past Consultations" container', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Past Consultations')
    // Round border corner.
    expect(frame).toContain('╭')
    // Keybinding footer.
    expect(frame).toContain('PgUp/PgDn page')
  })

  it('renders one two-line row per entry, newest first', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame.indexOf('2026-03-16 13:28')).toBeLessThan(
      frame.indexOf('2026-01-15 18:16'),
    )
    expect(frame).toMatch(/#\d+/)
  })

  it('truncates long queries to fit the inner width', () => {
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
        rows={24}
        onPick={() => {}}
      />,
    )
    for (const line of (lastFrame() ?? '').split('\n')) {
      expect(stripAnsi(line).length).toBeLessThanOrEqual(50)
    }
  })

  it('shows the filter text and match count in the border title', async () => {
    const { lastFrame, stdin } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    stdin.write('/')
    await tick()
    stdin.write('study')
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('filter: "study"')
    expect(frame).toContain('1 match')
  })

  it('windows a long list and shows the "… N more" indicator', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      path: `/x/${i}.md`,
      envelope: {
        schemaVersion: 1,
        timestamp: `2026-03-${String(40 - i).padStart(2, '0')}T10:00:00+0800`,
        query: `Question number ${i}`,
        hexagram: [7, 7, 7, 7, 7, 7] as Hexagram,
        casting: [] as never,
      },
      body: '',
    }))
    const { lastFrame } = render(
      <HistoryList
        entries={many}
        unreadable={[]}
        cols={80}
        rows={16}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toMatch(/… \d+ more/)
    expect(frame).not.toMatch(/… \d+ above/)
  })

  it('renders dimmed unreadable rows with the filename on line 2', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={[]}
        unreadable={[{ path: '/x/broken.md', reason: 'invalid-yaml' }]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('[unreadable — invalid-yaml]')
    expect(frame).toContain('/x/broken.md')
  })
})
