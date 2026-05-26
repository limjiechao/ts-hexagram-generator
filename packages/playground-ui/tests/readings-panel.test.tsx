// Unit tests for `<ReadingsPanel>` — drives the presentational scrollable
// readings strip via `ink-testing-library` and asserts content presence,
// width clamping, viewport clamping, scroll behaviour, and the
// `onMeasure` deferred-callback contract. Mirrors the `useWindowSize`
// mocking pattern in `playground-app.test.tsx` so the fake stdout never
// reports zero rows.

import { getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/types'
import { stripAnsi } from '@hexagram/viewer-core'
import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'

import { ReadingsPanel } from '../src/readings-panel'

// Match the `playground-app.test.tsx` setup: ink-testing-library's fake
// stdout reports zero rows, so any code path that consults
// `useWindowSize` would short-circuit. `<ReadingsPanel>` itself does
// not, but staying consistent prevents surprises if internals change.
const windowSize = vi.hoisted(() => ({ current: { columns: 120, rows: 40 } }))
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>()
  return { ...actual, useWindowSize: () => windowSize.current }
})

// East-Asian-wide aware display-width counter. The payload contains
// Traditional Chinese characters (range U+3000..U+9FFF and friends) and
// the descriptive 象傳 in the exegesis header — both render two columns
// wide in a monospaced terminal. ASCII / Latin-1 chars count as one.
// We use this to verify `wrapToWidth`'s output stays within the
// viewport. Kept inline so the test does not require an extra
// `string-width` runtime dep (which is not in playground-ui's
// dependency closure).
const WIDE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
]

function displayWidth(text: string): number {
  let width = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    const wide = WIDE_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)
    width += wide ? 2 : 1
  }
  return width
}

// Standing hexagram with the bottom line moving — [9,7,7,7,7,7]: all
// six positions yang, L1 moving. Hexagram lookup folds polarity
// (9→yang, 7→yang) and resolves to #1 Qian.
const STANDING_QIAN_L1_MOVING: Hexagram = [9, 7, 7, 7, 7, 7]

describe('<ReadingsPanel>', () => {
  it('renders the headers and the L1 scripture for the standing hexagram', () => {
    const record = getHexagramRecord(STANDING_QIAN_L1_MOVING)
    const traditionalScripture =
      record.Text.Chinese.Traditional.Scripture.Lines.L1
    // First few characters are stable; assert presence in the rendered
    // frame as a guard against the wrong line being looked up.
    const traditionalHead = traditionalScripture.slice(0, 4)

    const { lastFrame, unmount } = render(
      <ReadingsPanel
        standing={STANDING_QIAN_L1_MOVING}
        movingLineIndex={0}
        wrapWidth={80}
        viewportHeight={40}
        scrollOffset={0}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('MOVING LINE 1')
    expect(frame).toContain('(Scripture)')
    expect(frame).toContain('(Exegesis — 象傳)')
    expect(frame).toContain(traditionalHead)
    unmount()
  })

  it('hard-wraps content to wrapWidth (no row exceeds the limit)', () => {
    const wrapWidth = 40
    const { lastFrame, unmount } = render(
      <ReadingsPanel
        standing={STANDING_QIAN_L1_MOVING}
        movingLineIndex={0}
        wrapWidth={wrapWidth}
        viewportHeight={40}
        scrollOffset={0}
      />,
    )
    const rows = stripAnsi(lastFrame() ?? '').split('\n')
    for (const row of rows) {
      expect(displayWidth(row)).toBeLessThanOrEqual(wrapWidth)
    }
    unmount()
  })

  it('clamps the rendered output to viewportHeight rows', () => {
    const { lastFrame, unmount } = render(
      <ReadingsPanel
        standing={STANDING_QIAN_L1_MOVING}
        movingLineIndex={0}
        wrapWidth={80}
        viewportHeight={3}
        scrollOffset={0}
      />,
    )
    const rows = stripAnsi(lastFrame() ?? '').split('\n')
    // Strip a single trailing blank if ink-testing-library appended one.
    while (rows.length > 0 && rows.at(-1) === '') rows.pop()
    expect(rows.length).toBeLessThanOrEqual(3)
    unmount()
  })

  it('scrollOffset selects a different window of rows', () => {
    const props = {
      standing: STANDING_QIAN_L1_MOVING,
      movingLineIndex: 0 as const,
      wrapWidth: 80,
      viewportHeight: 3,
    }
    const a = render(<ReadingsPanel {...props} scrollOffset={0} />)
    const b = render(<ReadingsPanel {...props} scrollOffset={2} />)
    const frameA = stripAnsi(a.lastFrame() ?? '')
    const frameB = stripAnsi(b.lastFrame() ?? '')
    expect(frameA).not.toEqual(frameB)
    // The top of the offset-0 frame is the bold MOVING LINE header;
    // offset-2 should have scrolled past it.
    expect(frameA).toContain('MOVING LINE 1')
    expect(frameB).not.toContain('MOVING LINE 1')
    a.unmount()
    b.unmount()
  })

  it('fires onMeasure with the total wrapped row count (>= 6 blocks)', async () => {
    const onMeasure = vi.fn<(totalRows: number) => void>()
    const { unmount } = render(
      <ReadingsPanel
        standing={STANDING_QIAN_L1_MOVING}
        movingLineIndex={0}
        wrapWidth={80}
        viewportHeight={40}
        scrollOffset={0}
        onMeasure={onMeasure}
      />,
    )
    // The callback is deferred via `useEffect`; wait one microtask /
    // macrotask for the effect to flush.
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(onMeasure).toHaveBeenCalled()
    const lastCall = onMeasure.mock.calls.at(-1)
    expect(lastCall).toBeDefined()
    const [totalRows] = lastCall as [number]
    // 6 content blocks + 5 single-row blank separators = at least 11
    // rows pre-wrap, and the four payload paragraphs always add more.
    // 6 is a generous lower bound from the spec.
    expect(totalRows).toBeGreaterThanOrEqual(6)
    unmount()
  })
})
