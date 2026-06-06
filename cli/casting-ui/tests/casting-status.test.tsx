import { waitFor, waitForReady, yieldMacrotask } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'

import { CastingStatus, getCastingStatusHeight } from '../src/casting-status.js'
import { CTRL_C, ESCAPE, SPACE } from './helpers/keystrokes.js'

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

  it('fires onReady once per false→true active transition', async () => {
    // Witness contract — see CastingStatusProps.onReady. The viewer (and
    // tests) gate the next SPACE on this signal so a keystroke written
    // between modal-close and useInput re-bind isn't silently dropped.
    const onReady = vi.fn()
    const props = {
      lineNumber: 1 as const,
      castIndex: 0 as const,
      width: 60,
      onSkip: () => {},
      onReady,
    }
    const { rerender, unmount } = render(
      <CastingStatus {...props} active={false} />,
    )
    // active=false on first render → onReady has not been called.
    expect(onReady).not.toHaveBeenCalled()
    rerender(<CastingStatus {...props} active />)
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    unmount()
  })

  it('routes SPACE to onSkip while active', async () => {
    const onSkip = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <CastingStatus
        lineNumber={1}
        castIndex={0}
        width={60}
        active
        onSkip={onSkip}
        onReady={onReady}
      />,
    )
    // Gate the first SPACE on the onReady witness so the keystroke lands
    // after Ink's useInput has bound to stdin — see ink-useinput-bind skill.
    await waitForReady(onReady)
    stdin.write(SPACE)
    await waitFor(() => expect(onSkip).toHaveBeenCalledTimes(1))
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
    // `active=false` on mount — the `onReady` witness never fires (it's
    // gated on a false→true transition), so we yield one macrotask to let
    // any in-flight dispatch reach `onSkip` before asserting it didn't.
    stdin.write(SPACE)
    await yieldMacrotask()
    expect(onSkip).not.toHaveBeenCalled()
    unmount()
  })

  it('ignores global exit keys (Esc / Ctrl+C)', async () => {
    const onSkip = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <CastingStatus
        lineNumber={1}
        castIndex={0}
        width={60}
        active
        onSkip={onSkip}
        onReady={onReady}
      />,
    )
    // Gate the first keystroke on the onReady witness.
    await waitForReady(onReady)
    stdin.write(ESCAPE)
    await yieldMacrotask()
    stdin.write(CTRL_C)
    // Negative assertion — give the second keystroke a macrotask to land
    // (or not land) before asserting `onSkip` was never called.
    await yieldMacrotask()
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
