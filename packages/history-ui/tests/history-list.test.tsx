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

  it('renders inside ScreenShell with the "Past Consultations" title (no round border)', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    // Title line must be present.
    expect(frame).toContain('Past Consultations')
    // No round-border corner — ScreenShell is borderless.
    expect(frame).not.toContain('╭')
    // Keybinding footer.
    expect(frame).toContain('PgUp/PgDn page')
  })

  it('includes consultation count in the title', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('2 consultations')
    // No unreadable files — the clause must be absent.
    expect(frame).not.toContain('unreadable')
  })

  it('shows the unreadable count in the title only when unreadable > 0', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[{ path: '/x/broken.md', reason: 'invalid-yaml' }]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('1 unreadable')
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

  it('shows the filter text and match count in the title', async () => {
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
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('filter: "study"')
    expect(frame).toContain('1 match')
  })

  it('windows a long list and uses the scrollbar gutter (no "… N more" indicator)', () => {
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
    // Text "… N more" indicators must be gone — scrollbar gutter is used instead.
    expect(frame).not.toMatch(/… \d+ more/)
    expect(frame).not.toMatch(/… \d+ above/)
    // Scrollbar gutter track characters must be present.
    expect(frame).toMatch(/[░█]/)
    // Scroll position in footer: ▲ start–end of total ▼.
    expect(stripAnsi(frame)).toMatch(/▲ \d+–\d+ of 40 ▼/)
  })

  it('footer status row shows the scroll position counted in consultations', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      path: `/x/${i}.md`,
      envelope: {
        schemaVersion: 1,
        timestamp: `2026-03-${String(20 - i).padStart(2, '0')}T10:00:00+0800`,
        query: `Consultation ${i}`,
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
    const frame = stripAnsi(lastFrame() ?? '')
    // Footer must report position counted in consultations (not display lines).
    expect(frame).toMatch(/▲ \d+–\d+ of 20 ▼/)
  })

  it('footer bottom row shows the focused file path', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    // Focused row is the first entry by default.
    expect(frame).toContain('a.md')
  })

  it('statusLine overrides the footer bottom row with Loading…', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        statusLine={{ text: 'Loading…', tone: 'dim' }}
        onPick={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Loading…')
  })

  it('statusLine with error tone overrides the footer bottom row', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        statusLine={{ text: 'Failed to load', tone: 'error' }}
        onPick={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Failed to load')
  })

  it('footer bottom line starts with a leading space in both the normal and statusLine paths', () => {
    // Normal path: focused file path has a leading space.
    const { lastFrame: normalFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const normalLines = stripAnsi(normalFrame() ?? '').split('\n')
    const pathLine = normalLines.find((l) => l.includes('a.md'))
    expect(pathLine).toBeDefined()
    expect(pathLine!.startsWith(' ')).toBe(true)

    // statusLine path: the status text must also have a leading space.
    const { lastFrame: statusFrame } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        statusLine={{ text: 'Loading…', tone: 'dim' }}
        onPick={() => {}}
      />,
    )
    const statusLines = stripAnsi(statusFrame() ?? '').split('\n')
    const loadingLine = statusLines.find((l) => l.includes('Loading…'))
    expect(loadingLine).toBeDefined()
    expect(loadingLine!.startsWith(' ')).toBe(true)
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
