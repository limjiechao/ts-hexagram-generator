import type { Hexagram } from '@hexagram/types'
import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'

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

/**
 * Rendered scrollbar-track height: the count of frame lines bearing a
 * scrollbar glyph. Title, footer and content rows never contain ░/█, so the
 * count equals the track's row span.
 */
function trackHeight(frame: string): number {
  return frame.split('\n').filter((line) => /[░█]/.test(line)).length
}

const ESC = String.fromCodePoint(0x1b)

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

  it('/ opens a dedicated filter row with "Filter" label and match count', async () => {
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
    // Dedicated filter row must show "Filter" label and match count.
    expect(frame).toContain('Filter ')
    expect(frame).toContain('1 match')
    // Filter text must NOT appear in the title.
    expect(frame).not.toContain('filter: "study"')
    // Title stays as the normal count title.
    expect(frame).toContain('Past Consultations')
  })

  it('filter row appears between the title and the list rows', async () => {
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
    const frame = stripAnsi(lastFrame() ?? '')
    const titlePos = frame.indexOf('Past Consultations')
    const filterPos = frame.indexOf('Filter ')
    const rowPos = frame.indexOf('2026-03-16')
    expect(titlePos).toBeGreaterThanOrEqual(0)
    expect(filterPos).toBeGreaterThan(titlePos)
    expect(rowPos).toBeGreaterThan(filterPos)
  })

  it('filter row has no border, accent bar, or inverse (no ╭ ▌ or invert codes)', async () => {
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
    stdin.write('raven')
    await tick()
    const rawFrame = lastFrame() ?? ''
    // No round border corner.
    expect(rawFrame).not.toContain('╭')
    // No accent bar character.
    expect(rawFrame).not.toContain('▌')
    // Filter row must not contain the inverse-video ESC code (ESC[7m).
    const invertCode = `${String.fromCodePoint(0x1b)}[7m`
    // The filter row itself — find lines containing "Filter" and check them.
    const filterLines = rawFrame
      .split('\n')
      .filter((l) => stripAnsi(l).includes('Filter '))
    expect(filterLines.length).toBeGreaterThan(0)
    for (const line of filterLines) {
      expect(line).not.toContain(invertCode)
    }
  })

  it('footer hint reads "Esc close filter · Enter load" with an empty filter row', async () => {
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
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Esc close filter')
    expect(frame).toContain('Enter load')
    // Normal nav hints must be absent during filter mode.
    expect(frame).not.toContain('PgUp/PgDn page')
  })

  it('ESC closes the empty filter row and restores normal footer hints', async () => {
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
    // Filter row is empty — a single ESC closes it.
    stdin.write(ESC)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    // Filter row must be gone.
    expect(frame).not.toContain('Filter ')
    // Normal footer hints restored.
    expect(frame).toContain('PgUp/PgDn page')
    // Count-based title restored.
    expect(frame).toContain('2 consultations')
  })

  it('filter row shows 0 matches when no entry query matches', async () => {
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
    stdin.write('zzznomatch')
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('0 matches')
  })

  it('filter matching is case-insensitive', async () => {
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
    // "STUDY" should still match the entry with "study"
    stdin.write('STUDY')
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('1 match')
    expect(frame).toContain('Should I study')
  })

  it('unreadable files are excluded from filter matches', async () => {
    const { lastFrame, stdin } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[{ path: '/x/broken.md', reason: 'invalid-yaml' }]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    stdin.write('/')
    await tick()
    // Type something that would match nothing readable.
    stdin.write('zzz')
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    // Unreadable file must not appear as a match.
    expect(frame).not.toContain('[unreadable')
    expect(frame).toContain('0 matches')
  })

  it('filter row match count excludes unreadable files even when filter text is empty', async () => {
    // Two readable consultations + one unreadable file.
    const { lastFrame, stdin } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[{ path: '/x/broken.md', reason: 'invalid-yaml' }]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    // Press `/` to open the filter row — filter text is empty at this point.
    stdin.write('/')
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    // Filter row is open.
    expect(frame).toContain('Filter ')
    // Match count must equal the number of readable consultations (2), NOT 3.
    // The unreadable file must not be counted.
    expect(frame).toContain('2 matches')
    expect(frame).not.toContain('3 matches')
  })

  it('Enter in filter mode calls onPick with the focused entry', async () => {
    const ENTER = '\r'
    const onPick = vi.fn()
    const { stdin } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={onPick}
      />,
    )
    // Open filter mode, type a substring that matches only the second entry.
    stdin.write('/')
    await tick()
    stdin.write('study')
    await tick()
    // Press Enter — should call onPick with the focused (only matching) entry.
    stdin.write(ENTER)
    await tick()
    expect(onPick).toHaveBeenCalledOnce()
    expect(onPick).toHaveBeenCalledWith(fakeEntries[1])
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

  it('renders the scrollbar track at the full content height', async () => {
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
    const { lastFrame, stdin } = render(
      <HistoryList
        entries={many}
        unreadable={[]}
        cols={80}
        rows={16}
        onPick={() => {}}
      />,
    )
    // The track must span the whole content area, not half it (regression: it
    // was sized in consultation units — 1 row per 2 display lines).
    // contentHeight = rows(16) − title(1) − filter(0) − footer(2) = 13.
    expect(trackHeight(lastFrame() ?? '')).toBe(13)

    // Opening the filter row consumes 3 rows; the track shrinks to match.
    stdin.write('/')
    await tick()
    // contentHeight = rows(16) − title(1) − filter(3) − footer(2) = 10.
    expect(trackHeight(lastFrame() ?? '')).toBe(10)
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

  // ── Issue #17: palette-colored rows + full-width inverse focus bar ───────────

  // A static entry with moving lines (lines 9 and 6 are moving).
  const movingEntry = {
    path: '/x/moving.md',
    envelope: {
      schemaVersion: 1,
      timestamp: '2026-03-16T13:28:33+0800',
      query: 'Will the project succeed?',
      hexagram: [9, 7, 8, 9, 7, 8] as Hexagram, // lines 1 and 4 are moving (9)
      casting: [] as never,
    },
    body: '',
  }

  // A static entry with NO moving lines (all young lines).
  const staticEntry = {
    path: '/x/static.md',
    envelope: {
      schemaVersion: 1,
      timestamp: '2026-03-15T10:00:00+0800',
      query: 'What is the current situation?',
      hexagram: [7, 7, 7, 7, 7, 7] as Hexagram, // all young yang, no moving
      casting: [] as never,
    },
    body: '',
  }

  it('unfocused row with moving lines shows BOLD_RED arrow and emerging hexagram', () => {
    // Render with two entries so the focused row (first) is different from the
    // second. We inspect the second (unfocused) entry which has moving lines.
    const { lastFrame } = render(
      <HistoryList
        entries={[staticEntry, movingEntry]}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    // The arrow glyph must be present in the visual content.
    expect(stripAnsi(frame)).toContain('──▶')
    // The BOLD_RED ANSI escape must appear in the frame. Ink may split bold and
    // colour into separate codes ([1m followed by [91m) rather than the combined
    // [1;91m form — check for the bright-red colour code directly.
    expect(frame).toContain(`${ESC}[91m`)
  })

  it('unfocused row with NO moving lines shows no red and no arrow', () => {
    // Render with two entries — the second (unfocused) is the static one.
    const { lastFrame } = render(
      <HistoryList
        entries={[movingEntry, staticEntry]}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    // Strip ANSI from the frame and confirm no arrow on the static entry's line.
    // The static entry text is on the second row — split and find it.
    const lines = stripAnsi(frame).split('\n')
    // No arrow present anywhere for the static entry.
    const staticLines = lines.filter((l) => l.includes('2026-03-15'))
    expect(staticLines.length).toBeGreaterThan(0)
    for (const line of staticLines) {
      expect(line).not.toContain('──▶')
    }
  })

  it('focused row is a full-width inverse bar — both lines rendered with inverse and trailing pad spaces', () => {
    const cols = 80
    const { lastFrame } = render(
      <HistoryList
        entries={[movingEntry]}
        unreadable={[]}
        cols={cols}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''

    // Ink emits inverse-video as \x1b[7m around the focused text.
    expect(frame).toContain(`${ESC}[7m`)

    // Find lines that carry the inverse-video attribute — those are the focused
    // row's two lines.
    const lines = frame.split('\n')
    const focusedLines = lines.filter((l) => l.includes(`${ESC}[7m`))
    // At least the head line and summary line must be rendered with inverse.
    expect(focusedLines.length).toBeGreaterThanOrEqual(2)

    // Each focused line must be padded edge-to-edge to the inner width.
    // The ScreenShell outer box adds paddingX={1}, so the stripped terminal line
    // is: 1 (outer left pad) + innerCols (padded content) = innerCols + 1.
    // computeInnerCols(80) = 80 - 2 - 1 = 77, so the full stripped line = 78.
    // Lines that contain multi-column CJK characters have a shorter .length but
    // wider visual width — those lines also end with trailing spaces from the pad.
    // We check the pure-ASCII head line by exact length and require all focused
    // content lines to have trailing spaces (confirming edge-to-edge padding).
    const innerCols = 77 // computeInnerCols(80)
    // The head line is always pure ASCII (timestamp + query from fakeEntries).
    const headFocusedLine = focusedLines.find((l) =>
      stripAnsi(l).includes('2026-03-16'),
    )
    expect(headFocusedLine).toBeDefined()
    // 1 outer-pad space + innerCols content chars = innerCols + 1.
    expect(stripAnsi(headFocusedLine!).length).toBe(innerCols + 1)
    // All content-bearing focused lines must end with a trailing space —
    // confirming padToWidth filled to the bar edge.
    for (const line of focusedLines) {
      const stripped = stripAnsi(line)
      if (stripped.trim().length === 0) continue // skip blank filler lines
      expect(stripped.endsWith(' ')).toBe(true)
    }
  })

  it('focused row has no per-segment color (no BOLD_RED, no BOLD_WHITE, no NORMAL_GREY on the focused lines)', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={[movingEntry, staticEntry]}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''

    // Collect the lines that carry the inverse-video attribute — those are the
    // focused row's two lines.
    const rawLines = frame.split('\n')
    const focusedRawLines = rawLines.filter((l) => l.includes(`${ESC}[7m`))
    expect(focusedRawLines.length).toBeGreaterThanOrEqual(1)

    // On the focused lines, the bright-red colour code ([91m) must not appear —
    // no BOLD_RED segment colour is allowed on the focused (uniform inverse) bar.
    for (const line of focusedRawLines) {
      expect(line).not.toContain(`${ESC}[91m`)
    }
    // Bright-white ([97m) must not appear on focused lines (no BOLD_WHITE).
    for (const line of focusedRawLines) {
      expect(line).not.toContain(`${ESC}[97m`)
    }
    // Dark-grey ([90m) must not appear on focused lines (no NORMAL_GREY).
    for (const line of focusedRawLines) {
      expect(line).not.toContain(`${ESC}[90m`)
    }
  })

  it('unfocused row head line has dim timestamp prefix (NORMAL_GREY) and bold-white query (BOLD_WHITE)', () => {
    // Render two entries so the second is unfocused and we can inspect its colors.
    const { lastFrame } = render(
      <HistoryList
        entries={[staticEntry, movingEntry]}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    // NORMAL_GREY (\x1b[90m) for the dim timestamp prefix must be present.
    // Ink may emit this as the standalone [90m code (bright-black/dark-grey).
    expect(frame).toContain(`${ESC}[90m`)
    // BOLD_WHITE: Ink emits bold as [1m and bright-white as [97m separately.
    // Check for the bright-white colour code that forms part of BOLD_WHITE.
    expect(frame).toContain(`${ESC}[97m`)
  })

  // ── Issue #19: empty state inside ScreenShell ──────────────────────────────

  it('empty state renders inside ScreenShell with "0 consultations" title', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={[]}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    // Title must include "Past Consultations" and "0 consultations".
    expect(frame).toContain('Past Consultations')
    expect(frame).toContain('0 consultations')
    // ScreenShell is borderless — no round-corner characters.
    expect(frame).not.toContain('╭')
  })

  it('empty state footer shows only "ESC exit" — no nav hints', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={[]}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('ESC exit')
    // Nav / filter hints must be absent in the empty state.
    expect(frame).not.toContain('PgUp/PgDn')
    expect(frame).not.toContain('/ filter')
  })

  it('empty state content area shows the centered message and guidance', () => {
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
    expect(frame).toContain(
      'Run hexagram-random or hexagram-interactive first.',
    )
  })

  it('only-unreadable case is NOT treated as empty — still shows rows', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={[]}
        unreadable={[{ path: '/x/broken.md', reason: 'invalid-yaml' }]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    // The list must show the unreadable row and nav hints — not the empty-state message.
    expect(frame).not.toContain('No consultations yet.')
    expect(frame).toContain('[unreadable — invalid-yaml]')
    expect(frame).toContain('PgUp/PgDn page')
  })

  // ── Issue #19: unreadable-row BOLD_RED label ────────────────────────────────

  it('unreadable row label contains a bright-red ANSI SGR code', () => {
    // Ink may split the combined '1;91m' into separate SGR codes '1m' and '91m'.
    // We verify the bright-red SGR 91 is present in the raw (non-stripped) frame.
    const BRIGHT_RED_SGR = '[91m'
    const { lastFrame } = render(
      <HistoryList
        entries={[]}
        unreadable={[
          { path: '/x/broken.md', reason: 'schema-version-mismatch' },
        ]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    // The raw frame must include the bright-red SGR code.
    expect(frame).toContain(BRIGHT_RED_SGR)
    expect(frame).toContain('[unreadable — schema-version-mismatch]')
  })

  it('unreadable row path line does not start with bright-red (dim path, not label)', () => {
    // The path line (line 2) must NOT start with the bright-red SGR code — only
    // the label (line 1) gets BOLD_RED; the path stays dim.
    const BRIGHT_RED_SGR = '[91m'
    const { lastFrame } = render(
      <HistoryList
        entries={[]}
        unreadable={[
          { path: '/x/broken.md', reason: 'schema-version-mismatch' },
        ]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    const lines = frame.split('\n')
    // The path line should NOT start with the bright-red SGR code.
    const pathLine = lines.find((l) => stripAnsi(l).includes('broken.md'))
    expect(pathLine).toBeDefined()
    // Strip leading whitespace before checking — the path is indented.
    expect(pathLine!.trimStart().startsWith(BRIGHT_RED_SGR)).toBe(false)
  })

  // ── Issue #19: Enter on unreadable row sets footer status ──────────────────

  it('Enter on an unreadable row sets "Cannot open — <reason>" footer status', async () => {
    const { lastFrame, stdin } = render(
      <HistoryList
        entries={[]}
        unreadable={[{ path: '/x/broken.md', reason: 'invalid-yaml' }]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    // The unreadable row is focused by default (only row in the list).
    stdin.write('\r')
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Cannot open — invalid-yaml')
  })

  it('Enter on readable entry does NOT set Cannot open status', async () => {
    const { lastFrame, stdin } = render(
      <HistoryList
        entries={[fakeEntries[0]!]}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    stdin.write('\r')
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).not.toContain('Cannot open')
  })

  it('Cannot open status is cleared on navigation', async () => {
    const { lastFrame, stdin } = render(
      <HistoryList
        entries={[fakeEntries[0]!]}
        unreadable={[{ path: '/x/broken.md', reason: 'invalid-yaml' }]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    // Navigate to the unreadable row (second row, index 1) then press Enter.
    stdin.write('[B') // down arrow
    await tick()
    stdin.write('\r')
    await tick()
    expect(stripAnsi(lastFrame() ?? '')).toContain('Cannot open — invalid-yaml')

    // Navigate away — status should clear.
    stdin.write('[A') // up arrow
    await tick()
    expect(stripAnsi(lastFrame() ?? '')).not.toContain('Cannot open')
  })
  // ── Finding #1: cannotOpenStatus cleared when entering filter mode ──────────

  it('Cannot open status is cleared when pressing / to enter filter mode', async () => {
    const { lastFrame, stdin } = render(
      <HistoryList
        entries={[]}
        unreadable={[{ path: '/x/broken.md', reason: 'invalid-yaml' }]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    // Press Enter on the unreadable row to set the "Cannot open" status.
    stdin.write('\r')
    await tick()
    expect(stripAnsi(lastFrame() ?? '')).toContain('Cannot open — invalid-yaml')

    // Press / to enter filter mode — the stale "Cannot open" status must clear.
    stdin.write('/')
    await tick()
    expect(stripAnsi(lastFrame() ?? '')).not.toContain('Cannot open')
  })

  // ── Finding #2: error-tone footer status renders with red ANSI code ─────────

  it('error-tone cannotOpenStatus footer renders with bright-red ANSI SGR code', async () => {
    // The error tone must use BOLD_RED (SGR 91) rather than being overridden by
    // the dead `color` prop fight — verify the raw frame contains the red code.
    const BRIGHT_RED_SGR = '[91m'
    const { lastFrame, stdin } = render(
      <HistoryList
        entries={[]}
        unreadable={[{ path: '/x/broken.md', reason: 'invalid-yaml' }]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    // Press Enter on the unreadable row to trigger the "Cannot open" error status.
    stdin.write('\r')
    await tick()
    // The raw (un-stripped) frame must include the bright-red SGR code on the
    // footer line containing "Cannot open".
    const frame = lastFrame() ?? ''
    expect(stripAnsi(frame)).toContain('Cannot open — invalid-yaml')
    const lines = frame.split('\n')
    const errorLine = lines.find((l) => stripAnsi(l).includes('Cannot open'))
    expect(errorLine).toBeDefined()
    expect(errorLine).toContain(BRIGHT_RED_SGR)
  })

  // ── Bug fix: wide-CJK rows must never wrap a stray third line ────────────────

  it('focused row is exactly two inverse lines — wide CJK glyphs never wrap a third', () => {
    // movingEntry's summary line carries CJK hexagram names (display width 2
    // per glyph). A .length-based pad overshoots the inner width and wraps a
    // stray third inverse line; display-width padding keeps it at two.
    const { lastFrame } = render(
      <HistoryList
        entries={[movingEntry]}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    const focusedLines = (lastFrame() ?? '')
      .split('\n')
      .filter((l) => l.includes(`${ESC}[7m`))
    expect(focusedLines.length).toBe(2)
  })

  it('no rendered line exceeds the terminal width with wide CJK glyphs', () => {
    const { lastFrame } = render(
      <HistoryList
        entries={[movingEntry, staticEntry]}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
      />,
    )
    for (const line of (lastFrame() ?? '').split('\n')) {
      // CJK ideographs / kana / fullwidth forms render two columns wide; a
      // .length check understates them. Count those ranges as 2, everything
      // else (including the width-1 box-drawing arrow glyphs) as 1.
      const stripped = stripAnsi(line)
      let width = 0
      for (const ch of stripped) {
        const cp = ch.codePointAt(0) ?? 0
        const wide =
          (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
          (cp >= 0x2e80 && cp <= 0x303e) || // CJK radicals / symbols
          (cp >= 0x3041 && cp <= 0x33ff) || // kana, CJK symbols
          (cp >= 0x3400 && cp <= 0x9fff) || // CJK ideographs
          (cp >= 0xf900 && cp <= 0xfaff) || // CJK compatibility
          (cp >= 0xff00 && cp <= 0xff60) // fullwidth forms
        width += wide ? 2 : 1
      }
      expect(width).toBeLessThanOrEqual(80)
    }
  })

  it('every windowed entry keeps its timestamp visible on a tall wide terminal (no overdraw)', () => {
    // A focused row that wraps overflows the content box; flexbox then shrinks
    // every row and the head (timestamp) lines overdraw. With clean two-line
    // rows the first windowHeight timestamps stay visible.
    const many = Array.from({ length: 40 }, (_, i) => ({
      path: `/x/${i}.md`,
      body: '',
      envelope: {
        schemaVersion: 1,
        timestamp: `2026-04-${String(i + 1).padStart(2, '0')}T09:00:00+0800`,
        query: `Question ${i} about the path ahead`,
        hexagram: [9, 7, 8, 9, 7, 8] as Hexagram,
        casting: [] as never,
      },
    }))
    const { lastFrame } = render(
      <HistoryList
        entries={many}
        unreadable={[]}
        cols={237}
        rows={53}
        onPick={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    // windowHeight = floor((53 - 1 - 0 - 2) / 2) = 25 — first 25 visible.
    for (let i = 0; i < 25; i += 1) {
      expect(frame).toContain(`2026-04-${String(i + 1).padStart(2, '0')} 09:00`)
    }
  })

  // ── Bug fix: navigation stays live while the filter row is open ──────────────

  it('up/down arrows move the focused row while the filter row is open', async () => {
    const onPick = vi.fn()
    const { stdin } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={onPick}
      />,
    )
    // Open filter, type a substring matching BOTH entries (each query has 'i').
    stdin.write('/')
    await tick()
    stdin.write('i')
    await tick()
    // Down then Enter must pick the second matching entry, not the first.
    stdin.write(`${ESC}[B`)
    await tick()
    stdin.write('\r')
    await tick()
    expect(onPick).toHaveBeenCalledWith(fakeEntries[1])
  })

  // ── Bug fix: ESC semantics in and out of the filter row ─────────────────────

  it('ESC with non-empty filter text clears the text but keeps the filter row open', async () => {
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
    stdin.write(ESC)
    await tick()
    const frame = stripAnsi(lastFrame() ?? '')
    // Filter row stays open; the cleared text shows all entries again.
    expect(frame).toContain('Filter ')
    expect(frame).toContain('2 matches')
  })

  it('ESC in normal mode calls onExit', async () => {
    const onExit = vi.fn()
    const { stdin } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
        onExit={onExit}
      />,
    )
    stdin.write(ESC)
    await tick()
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('ESC does not call onExit while the filter row is open', async () => {
    const onExit = vi.fn()
    const { stdin } = render(
      <HistoryList
        entries={fakeEntries}
        unreadable={[]}
        cols={80}
        rows={24}
        onPick={() => {}}
        onExit={onExit}
      />,
    )
    stdin.write('/')
    await tick()
    stdin.write(ESC) // empty filter — closes the row, must not exit
    await tick()
    expect(onExit).not.toHaveBeenCalled()
  })

  it('filter footer hint reads "Esc clear filter" when the filter text is non-empty', async () => {
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
    expect(stripAnsi(lastFrame() ?? '')).toContain('Esc clear filter')
  })

  // ── Bug fix: blank line above and below the filter row ──────────────────────

  it('filter row has a blank line above and below it', async () => {
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
    const lines = stripAnsi(lastFrame() ?? '').split('\n')
    const filterIndex = lines.findIndex((l) => l.includes('Filter '))
    expect(filterIndex).toBeGreaterThan(0)
    expect((lines[filterIndex - 1] ?? 'x').trim()).toBe('')
    expect((lines[filterIndex + 1] ?? 'x').trim()).toBe('')
  })

  // ── Issue #23: Ctrl+D delete-a-row confirm modal ────────────────────────────

  // Ink decodes the control char U+0004 (EOT) to input='d', key.ctrl=true.
  const CTRL_D = String.fromCodePoint(0x04)

  describe('Ctrl+D delete confirm modal', () => {
    it('Ctrl+D in normal mode opens the red modal with heading, identity, path and prompt', async () => {
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      stdin.write(CTRL_D)
      await tick()
      const frame = stripAnsi(lastFrame() ?? '')
      // Heading + permanence warning + key prompt.
      expect(frame).toContain('Delete consultation')
      expect(frame).toContain(
        'This permanently deletes the file — it cannot be undone.',
      )
      expect(frame).toContain('Press Y to delete · N to cancel')
      // Row identity — the focused (first) entry's timestamp + query.
      expect(frame).toContain('[2026-03-16 13:28]')
      expect(frame).toContain('What will working with Raven be like?')
      // The modal box has a red round border.
      expect(lastFrame() ?? '').toContain(`${ESC}[91m`)
      expect(frame).toContain('╭')
    })

    it('Ctrl+D on an unreadable row opens the modal with an [unreadable — reason] identity', async () => {
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={[]}
          unreadable={[{ path: '/x/broken.md', reason: 'invalid-yaml' }]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      stdin.write(CTRL_D)
      await tick()
      const frame = stripAnsi(lastFrame() ?? '')
      expect(frame).toContain('Delete consultation')
      expect(frame).toContain('[unreadable — invalid-yaml]')
    })

    it('Ctrl+D is a no-op on an empty list', async () => {
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={[]}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      stdin.write(CTRL_D)
      await tick()
      const frame = stripAnsi(lastFrame() ?? '')
      expect(frame).not.toContain('Delete consultation')
      expect(frame).toContain('No consultations yet.')
    })

    it('Ctrl+D clears an active Cannot open status', async () => {
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={[]}
          unreadable={[{ path: '/x/broken.md', reason: 'invalid-yaml' }]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      stdin.write('\r')
      await tick()
      expect(stripAnsi(lastFrame() ?? '')).toContain(
        'Cannot open — invalid-yaml',
      )
      stdin.write(CTRL_D)
      await tick()
      expect(stripAnsi(lastFrame() ?? '')).not.toContain('Cannot open')
    })

    it('Y confirms the delete → onDelete called once with the focused path; modal closes', async () => {
      const onDelete = vi.fn()
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
          onDelete={onDelete}
        />,
      )
      stdin.write(CTRL_D)
      await tick()
      stdin.write('Y')
      await tick()
      expect(onDelete).toHaveBeenCalledOnce()
      expect(onDelete).toHaveBeenCalledWith('/x/a.md')
      // Modal closed.
      expect(stripAnsi(lastFrame() ?? '')).not.toContain('Delete consultation')
    })

    it('lowercase y also confirms the delete', async () => {
      const onDelete = vi.fn()
      const { stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
          onDelete={onDelete}
        />,
      )
      stdin.write(CTRL_D)
      await tick()
      stdin.write('y')
      await tick()
      expect(onDelete).toHaveBeenCalledOnce()
      expect(onDelete).toHaveBeenCalledWith('/x/a.md')
    })

    it('N cancels → modal closes, onDelete not called', async () => {
      const onDelete = vi.fn()
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
          onDelete={onDelete}
        />,
      )
      stdin.write(CTRL_D)
      await tick()
      stdin.write('N')
      await tick()
      expect(onDelete).not.toHaveBeenCalled()
      expect(stripAnsi(lastFrame() ?? '')).not.toContain('Delete consultation')
    })

    it('lowercase n cancels', async () => {
      const onDelete = vi.fn()
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
          onDelete={onDelete}
        />,
      )
      stdin.write(CTRL_D)
      await tick()
      stdin.write('n')
      await tick()
      expect(onDelete).not.toHaveBeenCalled()
      expect(stripAnsi(lastFrame() ?? '')).not.toContain('Delete consultation')
    })

    it('Esc cancels the modal → modal closes, onDelete not called', async () => {
      const onDelete = vi.fn()
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
          onDelete={onDelete}
        />,
      )
      stdin.write(CTRL_D)
      await tick()
      stdin.write(ESC)
      await tick()
      expect(onDelete).not.toHaveBeenCalled()
      expect(stripAnsi(lastFrame() ?? '')).not.toContain('Delete consultation')
    })

    it('Enter is ignored while the modal is open — modal stays, onDelete not called', async () => {
      const onDelete = vi.fn()
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
          onDelete={onDelete}
        />,
      )
      stdin.write(CTRL_D)
      await tick()
      stdin.write('\r')
      await tick()
      expect(onDelete).not.toHaveBeenCalled()
      expect(stripAnsi(lastFrame() ?? '')).toContain('Delete consultation')
    })

    it('arrow keys are frozen while the modal is open — focus unchanged', async () => {
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      stdin.write(CTRL_D)
      await tick()
      // The modal identifies the first entry.
      expect(stripAnsi(lastFrame() ?? '')).toContain(
        'What will working with Raven be like?',
      )
      stdin.write(`${ESC}[B`) // down arrow — frozen
      await tick()
      const frame = stripAnsi(lastFrame() ?? '')
      // Modal still open and still identifying the same (first) row.
      expect(frame).toContain('Delete consultation')
      expect(frame).toContain('What will working with Raven be like?')
      // Focus did not move — the footer bottom line still shows a.md, not b.md.
      const footerPath = frame.split('\n').find((l) => l.trim().endsWith('.md'))
      expect(footerPath?.trim().endsWith('a.md')).toBe(true)
    })

    it('/ is frozen while the modal is open', async () => {
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      stdin.write(CTRL_D)
      await tick()
      stdin.write('/')
      await tick()
      const frame = stripAnsi(lastFrame() ?? '')
      // No filter row opened.
      expect(frame).not.toContain('Filter ')
      // Modal still open.
      expect(frame).toContain('Delete consultation')
    })

    it('Ctrl+D works while the filter row is open — the d is not typed into the filter', async () => {
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
      stdin.write(CTRL_D)
      await tick()
      const frame = stripAnsi(lastFrame() ?? '')
      // The modal opened.
      expect(frame).toContain('Delete consultation')
      // The filter row is still shown (HistoryList stays mounted) with an
      // empty filter — the `d` was not typed in.
      expect(frame).toContain('Filter _')
    })
  })

  describe('identity-follow focus', () => {
    it('keeps the same row focused (by identity) across a filter toggle', async () => {
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      // Focus the second row (b.md / "Should I study…").
      stdin.write(`${ESC}[B`)
      await tick()
      // Open the filter and narrow to only the second row.
      stdin.write('/')
      await tick()
      stdin.write('study')
      await tick()
      // Close the filter — list grows back to both rows.
      stdin.write(ESC) // clears text, keeps row open
      await tick()
      stdin.write(ESC) // closes the (now empty) filter row
      await tick()
      // The SAME row by identity must still be focused — its path in the
      // footer bottom line is b.md, not a.md.
      const frame = stripAnsi(lastFrame() ?? '')
      const pathLine = frame.split('\n').find((l) => /\bb\.md/.test(l))
      expect(pathLine).toBeDefined()
    })

    it('restores focus by identity when the filter excludes the focused row then clears', async () => {
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      // Focus the second row (b.md / "Should I study…").
      stdin.write(`${ESC}[B`)
      await tick()
      // Filter to a needle that matches only a.md — b.md drops out of the list.
      stdin.write('/')
      await tick()
      stdin.write('raven')
      await tick()
      // Clear and close the filter WITHOUT navigating — `focusPath` was never
      // rewritten, so identity-follow re-points to b.md once it reappears.
      stdin.write(ESC) // clears text
      await tick()
      stdin.write(ESC) // closes the empty filter row
      await tick()
      const frame = stripAnsi(lastFrame() ?? '')
      const pathLine = frame.split('\n').find((l) => /\bb\.md/.test(l))
      expect(pathLine).toBeDefined()
    })

    it('after a delete, focus lands on the next row at the same clamped index', async () => {
      const threeEntries = [
        fakeEntries[0]!,
        fakeEntries[1]!,
        {
          path: '/x/c.md',
          envelope: {
            schemaVersion: 1,
            timestamp: '2025-12-01T09:00:00+0800',
            query: 'Third question',
            hexagram: [7, 7, 7, 7, 7, 7] as Hexagram,
            casting: [] as never,
          },
          body: '',
        },
      ]
      const { lastFrame, rerender, stdin } = render(
        <HistoryList
          entries={threeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      // Focus the middle row (index 1, b.md).
      stdin.write(`${ESC}[B`)
      await tick()
      expect(
        stripAnsi(lastFrame() ?? '')
          .split('\n')
          .some((l) => /\bb\.md/.test(l)),
      ).toBe(true)
      // Simulate the delete: re-render with b.md spliced out.
      rerender(
        <HistoryList
          entries={[threeEntries[0]!, threeEntries[2]!]}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      await tick()
      // The row below the deletion (c.md) slides into index 1 and is focused.
      const frame = stripAnsi(lastFrame() ?? '')
      expect(frame.split('\n').some((l) => /\bc\.md/.test(l))).toBe(true)
      expect(frame).toContain('Third question')
    })

    it('deleting the last focused row moves focus to the new last row', async () => {
      const { lastFrame, rerender, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      // Focus the last row (index 1, b.md).
      stdin.write('G')
      await tick()
      // Simulate deleting it — re-render with only the first entry.
      rerender(
        <HistoryList
          entries={[fakeEntries[0]!]}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
        />,
      )
      await tick()
      // Focus falls back to the clamped index — the new last (only) row.
      const frame = stripAnsi(lastFrame() ?? '')
      const pathLine = frame.split('\n').find((l) => /\ba\.md/.test(l))
      expect(pathLine).toBeDefined()
    })
  })

  describe('deleteStatusLine prop', () => {
    it('renders the delete status in the footer bottom line', () => {
      const { lastFrame } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
          deleteStatusLine={{ text: 'Deleted a.md', tone: 'dim' }}
        />,
      )
      expect(stripAnsi(lastFrame() ?? '')).toContain('Deleted a.md')
    })

    it('clears the delete status on the next navigation keypress', async () => {
      const { lastFrame, stdin } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
          deleteStatusLine={{ text: 'Deleted a.md', tone: 'dim' }}
        />,
      )
      expect(stripAnsi(lastFrame() ?? '')).toContain('Deleted a.md')
      stdin.write(`${ESC}[B`) // down arrow
      await tick()
      expect(stripAnsi(lastFrame() ?? '')).not.toContain('Deleted a.md')
    })

    it('renders an error-tone delete status with a bright-red ANSI code', () => {
      const { lastFrame } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={80}
          rows={24}
          onPick={() => {}}
          deleteStatusLine={{ text: 'Delete failed', tone: 'error' }}
        />,
      )
      const frame = lastFrame() ?? ''
      expect(stripAnsi(frame)).toContain('Delete failed')
      const errorLine = frame
        .split('\n')
        .find((l) => stripAnsi(l).includes('Delete failed'))
      expect(errorLine).toBeDefined()
      expect(errorLine).toContain('[91m')
    })
  })

  describe('footer shows ^D delete hint', () => {
    it('normal mode footer includes "^D delete" before "ESC exit"', () => {
      // A wide terminal so the full hint line is visible without truncation.
      const { lastFrame } = render(
        <HistoryList
          entries={fakeEntries}
          unreadable={[]}
          cols={120}
          rows={24}
          onPick={() => {}}
        />,
      )
      const frame = stripAnsi(lastFrame() ?? '')
      expect(frame).toContain('^D delete')
      // `^D delete` is inserted right before `ESC exit`.
      expect(frame.indexOf('^D delete')).toBeLessThan(frame.indexOf('ESC exit'))
    })

    it('filter mode (empty) footer includes "^D delete"', async () => {
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
      const frame = stripAnsi(lastFrame() ?? '')
      expect(frame).toContain('Esc close filter')
      expect(frame).toContain('^D delete')
    })

    it('filter mode (non-empty) footer includes "^D delete"', async () => {
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
      expect(frame).toContain('Esc clear filter')
      expect(frame).toContain('^D delete')
    })
  })
})
