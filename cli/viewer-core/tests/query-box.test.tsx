import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'

import { QueryBox } from '../src/viewer-chrome.js'

// ANSI strip helper — removes ESC + SGR sequences so assertions can match
// visible text without worrying about colour codes.
// oxlint-disable-next-line no-control-regex
const stripAnsi = (s: string): string => s.replaceAll(/\[[\d;]*m/g, '')

describe('QueryBox — accent-bar rendering', () => {
  it('renders the accent bar before the query text', () => {
    const { lastFrame, unmount } = render(
      <QueryBox query="Will the harvest be plentiful?" width={60} />,
    )
    const frame = lastFrame() ?? ''
    // Both the accent bar and the query text must be present.
    expect(frame).toContain('▌')
    const stripped = stripAnsi(frame)
    expect(stripped).toContain('▌ Will the harvest be plentiful?')
    unmount()
  })

  it('uses no border — no `╭`, `╰`, or `│` characters', () => {
    const { lastFrame, unmount } = render(
      <QueryBox query="Single line query." width={60} />,
    )
    const stripped = stripAnsi(lastFrame() ?? '')
    expect(stripped).not.toContain('╭')
    expect(stripped).not.toContain('╰')
    expect(stripped).not.toContain('│')
    unmount()
  })

  it('wraps long queries to multiple lines each with an accent bar', () => {
    // width=20: text area = 18 cols (20 - 2 for `▌ ` prefix).
    // A query longer than 18 chars must wrap to at least two lines.
    const { lastFrame, unmount } = render(
      <QueryBox query="Hello world how are you doing today" width={20} />,
    )
    const frame = lastFrame() ?? ''
    const stripped = stripAnsi(frame)
    // Every non-empty line must carry the `▌ ` prefix.
    const lines = stripped.split('\n').filter((l) => l.trim().length > 0)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      expect(line.startsWith('▌ ')).toBe(true)
    }
    unmount()
  })

  it('renders query text with bold styling in the frame', () => {
    const { lastFrame, unmount } = render(
      <QueryBox query="Test query" width={60} />,
    )
    const frame = lastFrame() ?? ''
    // The component uses the BOLD_WHITE raw ANSI constant. Ink processes
    // the embedded SGR and may emit equivalent but separate sequences
    // (e.g. `[1m[97m` instead of `[1;97m`). Assert the bold code is
    // present — along with the query text itself.
    expect(frame).toContain('Test query')
    // Bold SGR: either combined `[1;97m` or separate `[1m` is present.
    expect(frame.includes('[1;97m') || frame.includes('[1m')).toBe(true)
    unmount()
  })
})
