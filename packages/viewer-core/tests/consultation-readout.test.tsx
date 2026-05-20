import type { CastingRecord, Hexagram } from '@hexagram/types'
import { Box, Text } from 'ink'
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

const tick = (ms = 50): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
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

// A minimal read-only query box stub for the slot.
function queryBoxSlot(query: string) {
  return (innerCols: number) => (
    <Box borderStyle="round" width={innerCols}>
      <Text>{` ${query}`}</Text>
    </Box>
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
    const { lastFrame, stdin, unmount } = renderReadout({})
    const before = lastFrame() ?? ''
    stdin.write(TAB)
    await tick()
    const after = lastFrame() ?? ''
    expect(after).not.toBe(before)
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
    expect(frame).toContain(' Casting ')
    expect(frame).not.toContain('Transformation')
    expect(frame).not.toContain('Standing Hexagram')
    expect(frame).not.toContain('Emerging Hexagram')
    unmount()
  })

  it('does not switch tabs on Tab while locked', async () => {
    const { lastFrame, stdin, unmount } = renderReadout({ locked: true })
    const before = lastFrame() ?? ''
    stdin.write(TAB)
    await tick()
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
    const { stdin, unmount } = renderReadout({ onExit })
    stdin.write('')
    await tick()
    expect(onExit).toHaveBeenCalledTimes(1)
    unmount()
  })
})
