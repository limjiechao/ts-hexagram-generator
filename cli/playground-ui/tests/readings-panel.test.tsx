// Unit tests for `<ReadingsPanel>` and its companion pure row-builder
// `buildReadingsRows`. The panel is now purely presentational — the host
// supplies pre-wrapped rows, a viewport height, and an already-clamped
// scroll offset. Mirrors the `useWindowSize` mocking pattern in
// `playground-app.test.tsx` so the fake stdout never reports zero rows.

import { getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/core/types'
import { stripAnsi } from '@hexagram/viewer-core'
import { render } from 'ink-testing-library'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { buildReadingsRows, ReadingsPanel } from '../src/readings-panel.js'

// Match the `playground-app.test.tsx` setup: ink-testing-library's fake
// stdout reports zero rows, so any code path that consults
// `useWindowSize` would short-circuit. `<ReadingsPanel>` itself does
// not, but staying consistent prevents surprises if internals change.
const windowSize = vi.hoisted(() => ({ current: { columns: 120, rows: 40 } }))
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>()
  return { ...actual, useWindowSize: () => windowSize.current }
})

// Standing hexagram with the bottom line moving — [9,7,7,7,7,7]: all
// six positions yang, L1 moving. Hexagram lookup folds polarity
// (9→yang, 7→yang) and resolves to #1 Qian.
const STANDING_QIAN_L1_MOVING: Hexagram = [9, 7, 7, 7, 7, 7]

describe('buildReadingsRows', () => {
  it('produces a non-empty row array for a hexagram with a moving line', () => {
    const rows = buildReadingsRows(STANDING_QIAN_L1_MOVING, 0, 80)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('includes the MOVING LINE N header for the given index', () => {
    const rows = buildReadingsRows(STANDING_QIAN_L1_MOVING, 2, 80)
    const joined = stripAnsi(rows.join('\n'))
    expect(joined).toContain('MOVING LINE 3')
  })

  it('includes Traditional Chinese scripture and Wilhelm-Baynes English', () => {
    const record = getHexagramRecord(STANDING_QIAN_L1_MOVING)
    const traditionalScripture =
      record.Text.Chinese.Traditional.Scripture.Lines.L1
    const englishScripture =
      record.Text.English.WilhelmBaynes.Scripture.Lines.L1
    const rows = buildReadingsRows(STANDING_QIAN_L1_MOVING, 0, 80)
    const joined = stripAnsi(rows.join('\n'))
    // The first few characters of each are stable and survive wrapping.
    expect(joined).toContain(traditionalScripture.slice(0, 4))
    expect(joined).toContain(englishScripture.slice(0, 8))
  })

  it('includes Traditional Chinese exegesis (象傳) and Wilhelm-Baynes English', () => {
    const record = getHexagramRecord(STANDING_QIAN_L1_MOVING)
    const traditionalExegesis =
      record.Text.Chinese.Traditional.Exegesis.Imagery.Lines.L1
    const englishExegesis =
      record.Text.English.WilhelmBaynes.Exegesis.Imagery.Lines.L1
    const rows = buildReadingsRows(STANDING_QIAN_L1_MOVING, 0, 80)
    const joined = stripAnsi(rows.join('\n'))
    expect(joined).toContain('(Exegesis — 象傳)')
    expect(joined).toContain(traditionalExegesis.slice(0, 4))
    expect(joined).toContain(englishExegesis.slice(0, 8))
  })

  it('grows the row count when wrapWidth is reduced', () => {
    const wide = buildReadingsRows(STANDING_QIAN_L1_MOVING, 0, 80)
    const narrow = buildReadingsRows(STANDING_QIAN_L1_MOVING, 0, 30)
    expect(narrow.length).toBeGreaterThan(wide.length)
  })
})

describe('<ReadingsPanel>', () => {
  it('renders the rows slice between scrollOffset and scrollOffset + viewportHeight', () => {
    const rows = [
      'alpha',
      'beta',
      'gamma',
      'delta',
      'epsilon',
      'zeta',
      'eta',
      'theta',
    ]
    const { lastFrame, unmount } = render(
      <ReadingsPanel rows={rows} viewportHeight={3} scrollOffset={0} />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('alpha')
    expect(frame).toContain('beta')
    expect(frame).toContain('gamma')
    expect(frame).not.toContain('delta')
    unmount()
  })

  it('passing a non-zero scrollOffset shifts the visible window', () => {
    const rows = [
      'alpha',
      'beta',
      'gamma',
      'delta',
      'epsilon',
      'zeta',
      'eta',
      'theta',
    ]
    const { lastFrame, unmount } = render(
      <ReadingsPanel rows={rows} viewportHeight={3} scrollOffset={2} />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).not.toContain('alpha')
    expect(frame).not.toContain('beta')
    expect(frame).toContain('gamma')
    expect(frame).toContain('delta')
    expect(frame).toContain('epsilon')
    unmount()
  })

  it('renders the readings content end-to-end when fed buildReadingsRows output', () => {
    const rows = buildReadingsRows(STANDING_QIAN_L1_MOVING, 0, 80)
    const { lastFrame, unmount } = render(
      <ReadingsPanel rows={rows} viewportHeight={40} scrollOffset={0} />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('MOVING LINE 1')
    expect(frame).toContain('(Scripture)')
    expect(frame).toContain('(Exegesis — 象傳)')
    unmount()
  })

  it('does not invoke any callback during render (no onMeasure surface)', async () => {
    // The new prop surface has no callback field — verify at runtime
    // that even if a stray callback leaks onto the props bag, the
    // panel never reaches for it. (TypeScript-level: the
    // `ReadingsPanelProps` interface declares no callbacks at all.)
    const probe = vi.fn()
    const rows = ['alpha', 'beta', 'gamma']
    const propsBag = {
      rows,
      viewportHeight: 3,
      scrollOffset: 0,
      onMeasure: probe,
    } as unknown as ComponentProps<typeof ReadingsPanel>
    const { unmount } = render(<ReadingsPanel {...propsBag} />)
    // Wait one macrotask to ensure any stray effect would have flushed.
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(probe).not.toHaveBeenCalled()
    unmount()
  })
})
