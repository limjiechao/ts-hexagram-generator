import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'

import { CastingStatus, getCastingStatusHeight } from '../src/casting-status'
import { tick } from './helpers/async'
import { CTRL_C, ESCAPE, SPACE } from './helpers/keystrokes'

describe('CastingStatus', () => {
  it('renders the line/cast progress', () => {
    const { lastFrame, unmount } = render(
      <CastingStatus
        lineNumber={2}
        castIndex={1}
        width={60}
        active
        onSkip={vi.fn()}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 2/6')
    expect(frame).toContain('Cast 2/3')
    unmount()
  })

  it('renders a distinct header above the progress row', () => {
    const { lastFrame, unmount } = render(
      <CastingStatus
        lineNumber={2}
        castIndex={1}
        width={60}
        active
        onSkip={vi.fn()}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Casting in progress')
    // The header is a distinct label, not a second copy of the fraction.
    const fractionRows = frame
      .split('\n')
      .filter((row) => row.includes('Line 2/6'))
    expect(fractionRows).toHaveLength(1)
    unmount()
  })

  it('shows the press-SPACE-to-skip hint', () => {
    const { lastFrame, unmount } = render(
      <CastingStatus
        lineNumber={1}
        castIndex={0}
        width={60}
        active
        onSkip={vi.fn()}
      />,
    )
    expect((lastFrame() ?? '').toLowerCase()).toContain('skip')
    unmount()
  })

  it('routes SPACE to onSkip while active', async () => {
    const onSkip = vi.fn()
    const { stdin, unmount } = render(
      <CastingStatus
        lineNumber={1}
        castIndex={0}
        width={60}
        active
        onSkip={onSkip}
      />,
    )
    stdin.write(SPACE)
    await tick()
    expect(onSkip).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('does not route SPACE to onSkip while inactive', async () => {
    const onSkip = vi.fn()
    const { stdin, unmount } = render(
      <CastingStatus
        lineNumber={1}
        castIndex={0}
        width={60}
        active={false}
        onSkip={onSkip}
      />,
    )
    stdin.write(SPACE)
    await tick()
    expect(onSkip).not.toHaveBeenCalled()
    unmount()
  })

  it('ignores global exit keys (Esc / Ctrl+C)', async () => {
    const onSkip = vi.fn()
    const { stdin, unmount } = render(
      <CastingStatus
        lineNumber={1}
        castIndex={0}
        width={60}
        active
        onSkip={onSkip}
      />,
    )
    stdin.write(ESCAPE)
    await tick()
    stdin.write(CTRL_C)
    await tick()
    expect(onSkip).not.toHaveBeenCalled()
    unmount()
  })

  it('getCastingStatusHeight() reports the exact reserved height (5)', () => {
    // 2 border rows + header + progress + skip-hint = 5. The viewer reserves
    // this for the above-footer slot before mounting `<CastingStatus>`.
    expect(getCastingStatusHeight()).toBe(5)
  })

  it('getCastingStatusHeight() matches the real rendered row count', () => {
    // Pin the constant to what `<CastingStatus>` actually renders — a drift
    // between the two would silently break the viewer's `aboveFooterHeight`.
    const { lastFrame, unmount } = render(
      <CastingStatus
        lineNumber={1}
        castIndex={0}
        width={60}
        active
        onSkip={vi.fn()}
      />,
    )
    const renderedRows = (lastFrame() ?? '').split('\n').length
    expect(renderedRows).toBe(getCastingStatusHeight())
    unmount()
  })
})
