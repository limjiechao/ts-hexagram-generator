import { waitFor, waitForReady, yieldMacrotask } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'

import { HelpOverlay } from '../src/help-overlay.js'
import { stripAnsi } from '../src/viewer-layout.js'

const ESC = String.fromCodePoint(0x1b)
const ARROW_DOWN = `${ESC}[B`

// `HelpOverlay` derives its viewport from `useWindowSize`. ink-testing-library's
// fake stdout reports 100 columns but no rows, so the real terminal would leak
// in via `terminal-size` — making the windowing math depend on whoever runs the
// suite. Pin the dimensions here (same idiom as casting-ui's viewer.test) so the
// viewport is a deterministic 24 rows on every machine and CI.
const windowSize = vi.hoisted(() => ({ current: { columns: 100, rows: 24 } }))
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>()
  return { ...actual, useWindowSize: () => windowSize.current }
})

// A 50-line body overflows the pinned 24-row viewport (= rows − title − footer =
// 22), so the scroll affordances engage.
const longBody = Array.from({ length: 50 }, (_, i) => `Guide line ${i + 1}`)

describe('<HelpOverlay> — rendering', () => {
  it('renders the title and body lines', () => {
    const { lastFrame, unmount } = render(
      <HelpOverlay
        title="Manual casting guide"
        lines={['First line', 'Second line']}
        onClose={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Manual casting guide')
    expect(frame).toContain('First line')
    expect(frame).toContain('Second line')
    unmount()
  })

  it('shows the footer hint and a scroll position when the body overflows', () => {
    const { lastFrame, unmount } = render(
      <HelpOverlay
        title="Guide"
        lines={longBody}
        footerHint="? or Esc close"
        onClose={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('? or Esc close')
    // Opens at the top: first window is rows 1–22 of 50.
    expect(frame).toContain('1–22 of 50')
    unmount()
  })

  it('bakes in no domain words — only the props supply text', () => {
    const { lastFrame, unmount } = render(
      <HelpOverlay title="My title" lines={['My body']} onClose={() => {}} />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).not.toContain('consultation')
    expect(frame).not.toContain('hexagram')
    unmount()
  })
})

describe('<HelpOverlay> — scrolling', () => {
  it('scrolls the body down on the down arrow', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <HelpOverlay
        title="Guide"
        lines={longBody}
        onClose={() => {}}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write(ARROW_DOWN)
    await waitFor(() =>
      expect(stripAnsi(lastFrame() ?? '')).toContain('2–23 of 50'),
    )
    unmount()
  })

  it('jumps to the end on G and back to the top on g', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <HelpOverlay
        title="Guide"
        lines={longBody}
        onClose={() => {}}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write('G')
    await waitFor(() =>
      expect(stripAnsi(lastFrame() ?? '')).toContain('29–50 of 50'),
    )
    stdin.write('g')
    await waitFor(() =>
      expect(stripAnsi(lastFrame() ?? '')).toContain('1–22 of 50'),
    )
    unmount()
  })
})

describe('<HelpOverlay> — close callbacks', () => {
  it('fires onClose on ?', async () => {
    const onClose = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <HelpOverlay
        title="Guide"
        lines={['A']}
        onClose={onClose}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write('?')
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    unmount()
  })

  it('fires onClose on Escape', async () => {
    const onClose = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <HelpOverlay
        title="Guide"
        lines={['A']}
        onClose={onClose}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write(ESC)
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    unmount()
  })

  it('does not close on an unrelated key', async () => {
    const onClose = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <HelpOverlay
        title="Guide"
        lines={['A']}
        onClose={onClose}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write('x')
    await yieldMacrotask()
    expect(onClose).not.toHaveBeenCalled()
    unmount()
  })
})

describe('<HelpOverlay> — onReady witness', () => {
  it('fires onReady once after useInput is bound', async () => {
    const onReady = vi.fn()
    const { unmount } = render(
      <HelpOverlay
        title="Guide"
        lines={['A']}
        onClose={() => {}}
        onReady={onReady}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    unmount()
  })
})
