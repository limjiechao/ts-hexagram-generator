import { render } from 'ink-testing-library'
import stringWidth from 'string-width'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildConsultationSections } from '../src/cli-utils-output'
import {
  computeWrapWidth,
  ConsultationViewer,
  truncateEnd,
  truncateStart,
} from '../src/cli-viewer'
import type { CastingRecord, Hexagram } from '../src/types'

// Stub the filesystem-touching half of `cli-utils-output` so the
// interactive-mode tests can drive the viewer to completion without writing
// real files to `consultations/`. `buildConsultationSections` and the partial-
// rendering helpers stay live — they're pure.
const consultationFileOutputMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve('/tmp/consultation-mocked.txt')),
)
vi.mock('../src/cli-utils-output', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/cli-utils-output')>()
  return { ...actual, consultationFileOutput: consultationFileOutputMock }
})

// `generateRandomConsultation` is deterministic for the random-flow tests so
// the viewer arrives at `done` with predictable casting data.
const randomConsultationMock = vi.hoisted(() => {
  const stubHexagram: Hexagram = [7, 8, 7, 8, 7, 8]
  const stubCasting = Array.from({ length: 6 }, () => [
    { pick: 24, max: 48 },
    { pick: 20, max: 43 },
    { pick: 16, max: 35 },
  ]) as CastingRecord
  return vi.fn(() => ({ hexagram: stubHexagram, casting: stubCasting }))
})
vi.mock('../src/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/random')>()
  return { ...actual, generateRandomConsultation: randomConsultationMock }
})

// `useWindowSize` reads stdout dimensions; ink-testing-library's fake stdout
// is fixed at 100 columns with no rows. Mock the hook so tests can exercise
// narrow terminals.
const windowSize = vi.hoisted(() => ({
  current: { columns: 100, rows: 24 },
}))
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>()
  return { ...actual, useWindowSize: () => windowSize.current }
})

const SAVED_PATH = '/tmp/consultation-test.txt'
const ARROW_DOWN = '\u001B[B'
const ARROW_LEFT = '\u001B[D'
const ARROW_RIGHT = '\u001B[C'

// Let Ink process the simulated keypress and re-render.
const tick = (ms = 50): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

// A valid CastingRecord — the viewer only renders it, so the picks need not
// algorithmically reproduce the hexagrams under test.
const sampleCasting = Array.from({ length: 6 }, () => [
  { pick: 24, max: 48 },
  { pick: 20, max: 43 },
  { pick: 16, max: 35 },
]) as CastingRecord

const movingSections = buildConsultationSections(
  'Should I take the journey?',
  [6, 9, 7, 8, 7, 8],
  sampleCasting,
)
const staticSections = buildConsultationSections(
  'Will the harvest be plentiful?',
  [7, 8, 7, 8, 7, 8],
  sampleCasting,
)

beforeEach(() => {
  windowSize.current = { columns: 100, rows: 24 }
})

describe('ConsultationViewer', () => {
  it('renders the query, tab bar and saved path on the first frame', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''

    expect(frame).toContain('Should I take the journey?')
    expect(frame).toContain('Casting')
    expect(frame).toContain('Transformation')
    expect(frame).toContain('Originating')
    expect(frame).toContain('Resultant')
    expect(frame).toContain(`saved to ${SAVED_PATH}`)

    unmount()
  })

  it('shows three tabs when there are no moving lines', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={staticSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''

    expect(frame).toContain('Casting')
    expect(frame).toContain('Transformation')
    expect(frame).toContain('Originating')
    expect(frame).not.toContain('Resultant')

    unmount()
  })

  it('opens on the Casting tab', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )

    expect(lastFrame() ?? '').toContain('CASTING:')

    unmount()
  })

  it('switches tabs on Tab and changes the visible content', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const before = lastFrame() ?? ''

    stdin.write('\t')
    await tick()
    const after = lastFrame() ?? ''

    // One Tab from the default Casting tab lands on Transformation.
    expect(after).not.toBe(before)
    expect(after).toContain('TRANSFORMATION:')

    unmount()
  })

  it('scrolls the active section on arrow-down', async () => {
    // The Casting table is compact (~14 rows) — fits a default 24-row
    // viewport. Shrink rows so it overflows and arrow-down has to scroll.
    windowSize.current = { columns: 100, rows: 14 }
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )

    const beforeScroll = lastFrame() ?? ''

    stdin.write(ARROW_DOWN)
    await tick()
    const afterScroll = lastFrame() ?? ''

    expect(afterScroll).not.toBe(beforeScroll)

    unmount()
  })

  it('does not switch tabs on the arrow keys (they pan instead)', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )

    stdin.write(ARROW_RIGHT)
    await tick()
    const frame = lastFrame() ?? ''

    // Still on the default Casting tab — the arrow did not advance the tab.
    expect(frame).toContain('CASTING:')
    expect(frame).not.toContain('TRANSFORMATION:')

    unmount()
  })

  it('exits without throwing when q is pressed', async () => {
    const { stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )

    expect(() => {
      stdin.write('q')
    }).not.toThrow()
    await tick()

    unmount()
  })

  describe('narrow terminal', () => {
    it('does not overflow the terminal height', () => {
      windowSize.current = { columns: 40, rows: 20 }
      const { lastFrame, unmount } = render(
        <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
      )
      const frame = lastFrame() ?? ''

      expect(frame.split('\n').length).toBeLessThanOrEqual(20)
      // Chrome is still intact: the saved-path line and tab bar both render.
      // At 40 columns the tab bar collapses to the compact indicator, which
      // shows the active tab's label — Casting, the default.
      expect(frame).toContain('Casting')
      expect(frame).toContain('consultation-test.txt')

      unmount()
    })

    it('collapses the tab bar to a compact indicator when too narrow', async () => {
      windowSize.current = { columns: 30, rows: 20 }
      const { lastFrame, stdin, unmount } = render(
        <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
      )

      expect(lastFrame() ?? '').toContain('(1/4)')

      stdin.write('\t')
      await tick()
      expect(lastFrame() ?? '').toContain('(2/4)')

      unmount()
    })

    it('pans wide content horizontally with the arrow keys', async () => {
      windowSize.current = { columns: 40, rows: 20 }
      const { lastFrame, stdin, unmount } = render(
        <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
      )
      const before = lastFrame() ?? ''

      stdin.write(ARROW_RIGHT)
      await tick()
      const afterRight = lastFrame() ?? ''
      expect(afterRight).not.toBe(before)

      stdin.write(ARROW_LEFT)
      await tick()
      const afterLeft = lastFrame() ?? ''
      expect(afterLeft).toBe(before)

      unmount()
    })

    it('keeps the saved-path line within the terminal width', () => {
      windowSize.current = { columns: 40, rows: 20 }
      const { lastFrame, unmount } = render(
        <ConsultationViewer
          sections={movingSections}
          savedPath="/Users/someone/Documents/ts-hexagram-generator/consultations/consultation.txt"
        />,
      )
      const frame = lastFrame() ?? ''
      const savedLine = frame
        .split('\n')
        .find((line) => line.includes('consultation.txt'))

      expect(savedLine).toBeDefined()
      // Leading-ellipsis truncation keeps the filename, drops the prefix, and
      // the rendered line fits within the terminal width.
      expect(savedLine).toContain('…')
      expect(stringWidth(savedLine ?? '')).toBeLessThanOrEqual(40)

      unmount()
    })
  })

  it('renders within the terminal height on a wide terminal', async () => {
    windowSize.current = { columns: 200, rows: 40 }
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer
        sections={movingSections}
        savedPath={SAVED_PATH}
        maxWrapWidth={120}
      />,
    )

    // Switch to the prose-heavy Originating tab.
    stdin.write('\t')
    await tick()
    const frame = lastFrame() ?? ''

    expect(frame.length).toBeGreaterThan(0)
    expect(frame.split('\n').length).toBeLessThanOrEqual(40)

    unmount()
  })
})

describe('ConsultationViewer (interactive flow)', () => {
  beforeEach(() => {
    consultationFileOutputMock.mockClear()
    randomConsultationMock.mockClear()
  })

  it('opens in awaitingQuery mode with an empty editable query box', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer flowKind="interactive" />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Enter your query for the oracle.')
    // The empty casting table is visible in the content area.
    expect(frame).toContain('CASTING:')
    // The footer-bottom line shows the flow hint, not a saved-path line.
    expect(frame).toContain('Type your query and press Enter.')
    expect(frame).not.toContain('saved to')
    unmount()
  })

  it('locks Tab while awaiting the query', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" />,
    )
    const before = lastFrame() ?? ''
    stdin.write('\t')
    await tick()
    const after = lastFrame() ?? ''
    expect(after).toContain('Enter your query for the oracle.')
    expect(after).not.toContain('TRANSFORMATION:')
    // The query buffer should NOT have absorbed the tab character.
    expect(before).toContain('Enter your query')
    unmount()
  })

  it('reveals the casting prompt box once the query is submitted', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" />,
    )
    stdin.write('Hi')
    await tick()
    stdin.write('\r')
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 1 · 1st Cast')
    expect(frame).toContain('Divide the stalks. Pick a number from 1 to 48')
    // Saved-path line still absent — casting hasn't completed.
    expect(frame).not.toContain('saved to')
    unmount()
  })

  it('shows a validation error for out-of-range picks', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" />,
    )
    stdin.write('Query')
    await tick()
    stdin.write('\r')
    await tick()
    // 99 is above the round-1 max of 48 — pressing Enter should surface the
    // canonical error line and stay on the same cast.
    stdin.write('99')
    await tick()
    stdin.write('\r')
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Pick a number from 1 to 48.')
    expect(frame).toContain('Line 1 · 1st Cast')
    unmount()
  })

  it('locks Tab while the casting phase is in progress', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" />,
    )
    stdin.write('Query')
    await tick()
    stdin.write('\r')
    await tick()
    stdin.write('\t')
    await tick()
    const frame = lastFrame() ?? ''
    // Tab must not have advanced the active tab — Casting prompt still shown.
    expect(frame).toContain('Line 1 · 1st Cast')
    expect(frame).not.toContain('TRANSFORMATION:')
    unmount()
  })

  it('drives a random flow to done after the query is submitted', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="random" />,
    )
    stdin.write('Will the harvest be plentiful?')
    await tick()
    stdin.write('\r')
    // Give the compute effect (microtask + mocked file write) time to settle.
    await tick(150)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('saved to /tmp/consultation-mocked.txt')
    expect(randomConsultationMock).toHaveBeenCalledTimes(1)
    expect(consultationFileOutputMock).toHaveBeenCalledTimes(1)
    // No casting prompt box was ever rendered — the random flow skips that
    // phase entirely.
    expect(frame).not.toContain('Divide the stalks. Pick a number')
    unmount()
  })

  it('unlocks Tab once the random flow reaches done', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="random" />,
    )
    stdin.write('Query')
    await tick()
    stdin.write('\r')
    await tick(150)
    stdin.write('\t')
    await tick()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('TRANSFORMATION:')
    unmount()
  })

  it('exits cleanly when Escape is pressed mid-query', async () => {
    const { stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" />,
    )
    expect(() => stdin.write('')).not.toThrow()
    await tick()
    unmount()
  })

  it('exits cleanly when Ctrl+C is pressed mid-query', async () => {
    const { stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" />,
    )
    expect(() => stdin.write('')).not.toThrow()
    await tick()
    unmount()
  })

  it('accepts q as a regular character during the query phase', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer flowKind="interactive" />,
    )
    stdin.write('quit?')
    await tick()
    expect(lastFrame() ?? '').toContain('quit?')
    unmount()
  })
})

describe('computeWrapWidth', () => {
  it('caps wrapping at maxWrapWidth on a wide terminal', () => {
    expect(computeWrapWidth(200, 120, 483)).toBe(120)
  })

  it('wraps to the terminal width when it is below the cap', () => {
    expect(computeWrapWidth(110, 120, 483)).toBe(110)
  })

  it('never wraps below the structural floor', () => {
    expect(computeWrapWidth(90, 120, 483)).toBe(100)
    expect(computeWrapWidth(40, 120, 483)).toBe(100)
    // A user cap below the floor is clamped up so diagrams stay intact.
    expect(computeWrapWidth(200, 80, 483)).toBe(100)
  })

  it('lets a large cap widen wrapping', () => {
    expect(computeWrapWidth(200, 500, 483)).toBe(200)
  })

  it('does not floor higher than the section actually needs', () => {
    // Transformation tab: intrinsic width ~92, below the 100 floor constant.
    expect(computeWrapWidth(200, 120, 92)).toBe(120)
    expect(computeWrapWidth(40, 120, 92)).toBe(92)
  })
})

describe('truncateEnd', () => {
  it('returns the text unchanged when it fits', () => {
    expect(truncateEnd('hello', 10)).toBe('hello')
  })

  it('truncates with a trailing ellipsis when too long', () => {
    expect(truncateEnd('hello world', 8)).toBe('hello w…')
  })

  it('returns an empty string for a non-positive width', () => {
    expect(truncateEnd('hello', 0)).toBe('')
  })
})

describe('truncateStart', () => {
  it('returns the text unchanged when it fits', () => {
    expect(truncateStart('/a/b/file.txt', 20)).toBe('/a/b/file.txt')
  })

  it('keeps the tail with a leading ellipsis when too long', () => {
    expect(truncateStart('/very/long/path/file.txt', 10)).toBe('…/file.txt')
  })
})
