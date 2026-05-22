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

  it('getCastingStatusHeight() reports a stable border-inclusive height', () => {
    expect(getCastingStatusHeight()).toBeGreaterThan(0)
  })
})
