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
import type { CastingRecord } from '../src/types'

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
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )

    // The default Casting tab (eighteen divisions) is long enough to scroll.
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
