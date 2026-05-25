import { waitFor, waitForReady, yieldMacrotask } from '@hexagram/test-utils'
import type { CastingRecord, Hexagram } from '@hexagram/types'
import { Text } from 'ink'
import { render } from 'ink-testing-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ConsultationReadout,
  type ConsultationReadoutProps,
} from '../src/consultation-readout.js'
import { buildConsultationSections } from '../src/output-composers.js'

// `useWindowSize` reads stdout dimensions; ink-testing-library's fake stdout
// is fixed at 100 columns with no rows. Mock the hook so tests can exercise
// narrow terminals deterministically.
const windowSize = vi.hoisted(() => ({
  current: { columns: 100, rows: 24 },
}))
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>()
  return { ...actual, useWindowSize: () => windowSize.current }
})

const TAB = '\t'

const STUB_CASTING: CastingRecord = Array.from({ length: 6 }, () => [
  { pick: 24, max: 48 },
  { pick: 20, max: 43 },
  { pick: 16, max: 35 },
]) as CastingRecord

const MOVING_HEXAGRAM: Hexagram = [6, 9, 7, 8, 7, 8]
const STATIC_HEXAGRAM: Hexagram = [7, 8, 7, 8, 7, 8]

const movingSections = buildConsultationSections(
  'Should I take the journey?',
  MOVING_HEXAGRAM,
  STUB_CASTING,
)
const staticSections = buildConsultationSections(
  'Will the harvest be plentiful?',
  STATIC_HEXAGRAM,
  STUB_CASTING,
)

// A minimal read-only query box stub for the slot (no border — uses the
// accent-bar form matching the production `<QueryBox>`).
function queryBoxSlot(query: string) {
  return () => (
    <Text>
      <Text dimColor>{'▌ '}</Text>
      <Text>{query}</Text>
    </Text>
  )
}

function renderReadout(props: Partial<ConsultationReadoutProps>) {
  const base: ConsultationReadoutProps = {
    sections: movingSections,
    locked: false,
    savedPath: '/tmp/consultation-test.txt',
    maxWrapWidth: 120,
    querySlot: queryBoxSlot('Should I take the journey?'),
    queryText: 'Should I take the journey?',
  }
  return render(<ConsultationReadout {...base} {...props} />)
}

beforeEach(() => {
  windowSize.current = { columns: 100, rows: 24 }
})

describe('ConsultationReadout — done (unlocked) state', () => {
  it('fires onReady once after useInput is bound', async () => {
    // Witness contract — see ConsultationReadoutProps.onReady. Hosts gate
    // the first cross-state keystroke on this signal so a keystroke written
    // between render-commit and Ink's useInput bind is not silently dropped.
    const onReady = vi.fn()
    const { unmount } = renderReadout({ onReady })
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    unmount()
  })

  it('renders the query slot, all four tabs, and the saved path', () => {
    const { lastFrame, unmount } = renderReadout({})
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Should I take the journey?')
    expect(frame).toContain('Casting')
    expect(frame).toContain('Transformation')
    expect(frame).toContain('Standing Hexagram')
    expect(frame).toContain('Emerging Hexagram')
    expect(frame).toContain('saved to /tmp/consultation-test.txt')
    unmount()
  })

  it('drops Transformation + Emerging when there are no moving lines', () => {
    const { lastFrame, unmount } = renderReadout({
      sections: staticSections,
      querySlot: queryBoxSlot('Will the harvest be plentiful?'),
      queryText: 'Will the harvest be plentiful?',
    })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Casting')
    expect(frame).toContain('Standing Hexagram')
    expect(frame).not.toContain('Transformation')
    expect(frame).not.toContain('Emerging Hexagram')
    unmount()
  })

  it('switches tabs on Tab when unlocked', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = renderReadout({ onReady })
    // Gate the first TAB on the onReady witness so the keystroke lands
    // after Ink's useInput has bound to stdin — see ink-useinput-bind skill.
    await waitForReady(onReady)
    const before = lastFrame() ?? ''
    stdin.write(TAB)
    await waitFor(() => expect(lastFrame() ?? '').not.toBe(before))
    const after = lastFrame() ?? ''
    expect(after).toContain('TRANSFORMATION:')
    unmount()
  })

  it('shows the ` · ` tab separator when unlocked', () => {
    const { lastFrame, unmount } = renderReadout({})
    expect(lastFrame() ?? '').toContain(' · ')
    unmount()
  })
})

describe('ConsultationReadout — locked (in-flow) state', () => {
  it('collapses the tab bar to the active tab only', () => {
    const { lastFrame, unmount } = renderReadout({ locked: true })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('<1> Casting')
    expect(frame).not.toContain('Transformation')
    expect(frame).not.toContain('Standing Hexagram')
    expect(frame).not.toContain('Emerging Hexagram')
    unmount()
  })

  it('does not switch tabs on Tab while locked', async () => {
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = renderReadout({
      locked: true,
      onReady,
    })
    // Gate the first TAB on the onReady witness so the keystroke lands
    // after Ink's useInput has bound to stdin — see ink-useinput-bind skill.
    await waitForReady(onReady)
    const before = lastFrame() ?? ''
    stdin.write(TAB)
    // Negative assertion — yield one macrotask to let any in-flight
    // dispatch reach the input handler before asserting the frame did
    // not change.
    await yieldMacrotask()
    expect(lastFrame() ?? '').toBe(before)
    unmount()
  })

  it('shows the flow hint on the footer instead of a saved path', () => {
    const { lastFrame, unmount } = renderReadout({
      locked: true,
      flowHint: 'Type your query and press Enter.',
    })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Type your query and press Enter.')
    expect(frame).not.toContain('saved to')
    unmount()
  })

  it('renders the above-footer slot when populated', () => {
    const { lastFrame, unmount } = renderReadout({
      locked: true,
      aboveFooterSlot: () => <Text>CASTING PROMPT SLOT</Text>,
      aboveFooterHeight: 1,
    })
    expect(lastFrame() ?? '').toContain('CASTING PROMPT SLOT')
    unmount()
  })

  it('passes innerCols + horizontalOffset to the above-footer slot', () => {
    let receivedCols = -1
    let receivedOffset = -1
    const { unmount } = renderReadout({
      locked: true,
      aboveFooterSlot: (innerCols, horizontalOffset) => {
        receivedCols = innerCols
        receivedOffset = horizontalOffset
        return <Text>slot</Text>
      },
      aboveFooterHeight: 1,
      castingPromptPan: { contentWidth: 40, resetToken: '0.0' },
    })
    // innerCols = cols(100) - 2 - 1
    expect(receivedCols).toBe(97)
    expect(receivedOffset).toBe(0)
    unmount()
  })

  it('dims the placeholder content when dimContent is set', () => {
    const { lastFrame, unmount } = renderReadout({
      locked: true,
      dimContent: true,
    })
    // Ink's `<Text dimColor>` emits `[2m` around the content.
    expect(lastFrame() ?? '').toContain('[2m')
    unmount()
  })
})

describe('ConsultationReadout — numbered tab labels', () => {
  it('prefixes each tab label with its bracketed 1-based key hint in normal form', () => {
    const { lastFrame, unmount } = renderReadout({})
    const frame = lastFrame() ?? ''
    expect(frame).toContain('<1> Casting')
    expect(frame).toContain('<2> Transformation')
    expect(frame).toContain('<3> Standing Hexagram')
    expect(frame).toContain('<4> Emerging Hexagram')
    unmount()
  })

  it('prefixes the active tab label with its bracketed key hint in locked form', () => {
    const { lastFrame, unmount } = renderReadout({ locked: true })
    const frame = lastFrame() ?? ''
    expect(frame).toContain('<1> Casting')
    unmount()
  })

  it('prefixes the active tab label with its bracketed key hint in collapsed (overflow) form', () => {
    // Force collapsed mode by using a terminal too narrow for the full tab bar.
    windowSize.current = { columns: 30, rows: 24 }
    const { lastFrame, unmount } = renderReadout({})
    const frame = lastFrame() ?? ''
    // Collapsed form shows ` <N> label  (N/total)`.
    expect(frame).toContain('<1> Casting')
    expect(frame).toContain('(1/4)')
    unmount()
  })
})

describe('ConsultationReadout — footer key hints + query spacing', () => {
  it('uses doneKeyHints for the footer key-hint line in done mode', () => {
    const { lastFrame, unmount } = renderReadout({
      doneKeyHints: 'Esc back to history',
    })
    expect(lastFrame() ?? '').toContain('Esc back to history')
    unmount()
  })

  it('falls back to the default key hints when doneKeyHints is omitted', () => {
    const { lastFrame, unmount } = renderReadout({})
    expect(lastFrame() ?? '').toContain('Esc quit')
    unmount()
  })

  it('renders a blank line between the QUERY: header and the accent-bar query line', () => {
    const { lastFrame, unmount } = renderReadout({})
    const lines = (lastFrame() ?? '').split('\n')
    const headerIndex = lines.findIndex((l) => l.includes('QUERY:'))
    expect(headerIndex).toBeGreaterThanOrEqual(0)
    // One blank line separates the QUERY: label from the ▌ accent-bar line.
    expect((lines[headerIndex + 1] ?? 'x').trim()).toBe('')
    expect(lines[headerIndex + 2] ?? '').toContain('▌')
    unmount()
  })
})

describe('ConsultationReadout — optional title / notice / onExit', () => {
  it('renders an optional title line above the query', () => {
    const { lastFrame, unmount } = renderReadout({ title: 'PAST READING' })
    expect(lastFrame() ?? '').toContain('PAST READING')
    unmount()
  })

  it('renders an optional notice line above the footer', () => {
    const { lastFrame, unmount } = renderReadout({
      notice: 'Body refreshed; data unchanged.',
    })
    expect(lastFrame() ?? '').toContain('Body refreshed; data unchanged.')
    unmount()
  })

  it('invokes the onExit prop on Escape', async () => {
    const onExit = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = renderReadout({ onExit, onReady })
    // Gate the first keystroke on the onReady witness so Escape lands
    // after Ink's useInput has bound to stdin — see ink-useinput-bind skill.
    await waitForReady(onReady)
    stdin.write('')
    await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1))
    unmount()
  })
})
