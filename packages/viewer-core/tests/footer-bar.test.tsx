import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'

import { FooterBar, KEY_HINTS_TEMPLATE } from '../src/viewer-chrome.js'
import { ANSI_PATTERN } from '../src/viewer-layout.js'

function stripAnsi(s: string): string {
  return s.replaceAll(ANSI_PATTERN, '')
}

// ── KEY_HINTS_TEMPLATE wording ───────────────────────────────────────────────

describe('KEY_HINTS_TEMPLATE', () => {
  it('fits within 77 columns (80-col terminal inner width)', () => {
    // innerCols for an 80-col terminal = 80 - 2 (paddingX) - 1 (scrollbar) = 77
    const hint = KEY_HINTS_TEMPLATE()
    expect(hint.length).toBeLessThanOrEqual(77)
  })
})

// ── FooterBar — status row ordering ─────────────────────────────────────────
//
// The status row must render hints FIRST so they survive truncation.
// Scroll/pan/wrap status is pushed to the right and is what truncates
// when the row overflows the terminal width.

describe('FooterBar — status row hint ordering', () => {
  const baseProps = {
    savedPath: '/consultations/consultation-2026-01-01T00:00:00.md',
    inFlow: false,
    flowHint: null,
    flowKeyHints: 'SPACE: part   Esc/Ctrl+C: quit',
  }

  it('renders hints before scroll status in the output string', () => {
    const { lastFrame, unmount } = render(
      <FooterBar
        {...baseProps}
        cols={80}
        verticalStatus="▲ 1–20 of 100 ▼"
        horizontalStatus={null}
        wrapChip={null}
      />,
    )
    const frame = lastFrame() ?? ''
    // The status row is the first text line in the footer
    const lines = frame.split('\n')
    const statusLine = lines[0] ?? ''
    const hintPos = statusLine.indexOf('switch')
    const scrollPos = statusLine.indexOf('▲ 1')
    expect(hintPos).toBeGreaterThanOrEqual(0)
    expect(scrollPos).toBeGreaterThanOrEqual(0)
    // Hints appear before the scroll status
    expect(hintPos).toBeLessThan(scrollPos)
    unmount()
  })

  it('renders hints before horizontal pan status', () => {
    const { lastFrame, unmount } = render(
      <FooterBar
        {...baseProps}
        cols={80}
        verticalStatus={null}
        horizontalStatus="◀ 1–77 of 200 ▶"
        wrapChip={null}
      />,
    )
    const frame = lastFrame() ?? ''
    const lines = frame.split('\n')
    const statusLine = lines[0] ?? ''
    const hintPos = statusLine.indexOf('switch')
    const panPos = statusLine.indexOf('◀')
    expect(hintPos).toBeGreaterThanOrEqual(0)
    expect(panPos).toBeGreaterThanOrEqual(0)
    expect(hintPos).toBeLessThan(panPos)
    unmount()
  })

  it('hints survive and status truncates when the row overflows — narrow 60-col terminal', () => {
    // Make a very wide status string that will force truncation
    const longVerticalStatus = '▲ 999–1018 of 9999 ▼'
    const longHorizontalStatus = '◀ 1–60 of 9999 ▶'
    const wrapChip = 'wrap 120'

    const { lastFrame, unmount } = render(
      <FooterBar
        {...baseProps}
        cols={60}
        verticalStatus={longVerticalStatus}
        horizontalStatus={longHorizontalStatus}
        wrapChip={wrapChip}
      />,
    )
    const frame = lastFrame() ?? ''
    const lines = frame.split('\n')
    const statusLine = lines[0] ?? ''

    // Key hint wording must survive fully — check for a known word from the hint
    expect(statusLine).toContain('switch')
    expect(statusLine).toContain('scroll')
    expect(statusLine).toContain('Esc')

    // The status side should be what is truncated — the visible line must end
    // with '…' when the combined string exceeds 60 columns. Strip ANSI codes
    // first since ink-testing-library preserves SGR sequences.
    const visible = stripAnsi(statusLine).trimEnd()
    expect(visible.endsWith('…')).toBe(true)

    unmount()
  })

  it('hints survive intact on an extremely narrow terminal where all status is cut', () => {
    // At 40 cols the hints themselves won't fit fully, but they are at least
    // rendered before any status parts — the status is what gets cut first.
    const { lastFrame, unmount } = render(
      <FooterBar
        {...baseProps}
        cols={40}
        verticalStatus="▲ 1–20 of 100 ▼"
        horizontalStatus="◀ 1–40 of 500 ▶"
        wrapChip="wrap 120"
      />,
    )
    const frame = lastFrame() ?? ''
    const lines = frame.split('\n')
    const statusLine = lines[0] ?? ''

    // The hints are rendered first — "switch" must appear (it is near the
    // start of the hint string and 40 cols is enough to include it)
    expect(statusLine).toContain('switch')

    // None of the status parts should appear before any hint content —
    // check that the hint is not after a status marker
    const hintPos = statusLine.indexOf('switch')
    const scrollMarker = statusLine.indexOf('▲')
    // Either scroll is absent (fully cut) or appears after the hint
    if (scrollMarker !== -1) {
      expect(hintPos).toBeLessThan(scrollMarker)
    }

    unmount()
  })

  it('shows no truncation ellipsis when hints + status fit within the column width', () => {
    // Provide no status parts — only hints — well within 80 cols
    const { lastFrame, unmount } = render(
      <FooterBar
        {...baseProps}
        cols={80}
        verticalStatus={null}
        horizontalStatus={null}
        wrapChip={null}
      />,
    )
    const frame = lastFrame() ?? ''
    const lines = frame.split('\n')
    const statusLine = lines[0] ?? ''
    expect(stripAnsi(statusLine)).not.toContain('…')
    unmount()
  })

  it('renders flow key hints (not done-mode hints) during casting flow', () => {
    const castingHints = 'SPACE: part   ←→: pan   Esc/Ctrl+C: quit'
    const { lastFrame, unmount } = render(
      <FooterBar
        {...baseProps}
        cols={80}
        inFlow={true}
        flowKeyHints={castingHints}
        verticalStatus={null}
        horizontalStatus={null}
        wrapChip={null}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('SPACE: part')
    unmount()
  })

  it('renders the doneKeyHints override in done mode', () => {
    const { lastFrame, unmount } = render(
      <FooterBar
        {...baseProps}
        cols={80}
        doneKeyHints="Tab switch · ↑↓ scroll · ←→ pan · g/G ends · Esc back to history"
        verticalStatus={null}
        horizontalStatus={null}
        wrapChip={null}
      />,
    )
    expect(lastFrame() ?? '').toContain('Esc back to history')
    unmount()
  })
})
