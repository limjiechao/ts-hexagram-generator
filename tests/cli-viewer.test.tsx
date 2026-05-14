import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'

import { buildConsultationSections } from '../src/cli-utils-output'
import { ConsultationViewer } from '../src/cli-viewer'

const SAVED_PATH = '/tmp/consultation-test.txt'
const ARROW_DOWN = '\u001B[B'

// Let Ink process the simulated keypress and re-render.
const tick = (ms = 50): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const movingSections = buildConsultationSections(
  'Should I take the journey?',
  [6, 9, 7, 8, 7, 8],
)
const staticSections = buildConsultationSections(
  'Will the harvest be plentiful?',
  [7, 8, 7, 8, 7, 8],
)

describe('ConsultationViewer', () => {
  it('renders the query, tab bar and saved path on the first frame', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''

    expect(frame).toContain('Should I take the journey?')
    expect(frame).toContain('Transformation')
    expect(frame).toContain('Originating')
    expect(frame).toContain('Resultant')
    expect(frame).toContain(`saved to ${SAVED_PATH}`)

    unmount()
  })

  it('shows only two tabs when there are no moving lines', () => {
    const { lastFrame, unmount } = render(
      <ConsultationViewer sections={staticSections} savedPath={SAVED_PATH} />,
    )
    const frame = lastFrame() ?? ''

    expect(frame).toContain('Transformation')
    expect(frame).toContain('Originating')
    expect(frame).not.toContain('Resultant')

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

    expect(after).not.toBe(before)
    expect(after).toContain('ORIGINATING HEXAGRAM')

    unmount()
  })

  it('scrolls the active section on arrow-down', async () => {
    const { lastFrame, stdin, unmount } = render(
      <ConsultationViewer sections={movingSections} savedPath={SAVED_PATH} />,
    )

    // Move to the (long) Originating tab, then scroll.
    stdin.write('\t')
    await tick()
    const beforeScroll = lastFrame() ?? ''

    stdin.write(ARROW_DOWN)
    await tick()
    const afterScroll = lastFrame() ?? ''

    expect(afterScroll).not.toBe(beforeScroll)

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
})
