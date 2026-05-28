import { waitFor, waitForReady, yieldMacrotask } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import { useState, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  CastingPromptBox,
  getCastingPromptHeight,
  SliderInput,
  validateManualInput,
} from '../src/casting-prompt-box'
import { CTRL_C, CTRL_R, ENTER, ESCAPE, SPACE, TAB } from './helpers/keystrokes'
import { pickFromFrame } from './helpers/slider'

function CastingPromptBoxHost({
  onSubmit,
  onError,
  initialError = null,
}: {
  onSubmit: (parsed: number) => void
  onError: (message: string | null) => void
  initialError?: string | null
}): ReactElement {
  const [buffer, setBuffer] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  return (
    <CastingPromptBox
      lineNumber={1}
      castIndex={0}
      min={1}
      max={48}
      buffer={buffer}
      error={error}
      width={60}
      inputMode="number"
      onChange={setBuffer}
      onSubmit={onSubmit}
      onError={(message) => {
        setError(message)
        onError(message)
      }}
    />
  )
}

describe('CastingPromptBox', () => {
  it('renders the line/cast title and the prompt', () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBoxHost onSubmit={onSubmit} onError={onError} />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 1/6 · Cast 1/3')
    expect(frame).toContain('Divide the stalks. Pick a number from 1 to 48:')
    unmount()
  })

  it('shows the error line when one is supplied', () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBoxHost
        onSubmit={onSubmit}
        onError={onError}
        initialError="Pick a number from 1 to 48."
      />,
    )
    expect(lastFrame() ?? '').toContain('Pick a number from 1 to 48.')
    unmount()
  })

  it('hides the error line when error is null', () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBoxHost onSubmit={onSubmit} onError={onError} />,
    )
    // No error string present in the rendered frame.
    expect(lastFrame() ?? '').not.toContain('Pick a number from 1 to 48.\n')
    unmount()
  })

  it('submits a typed in-range value via Enter', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBoxHost onSubmit={onSubmit} onError={onError} />,
    )
    stdin.write('25')
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(25)
    })
    unmount()
  })

  it('fires onReady once after the slider-mode mount binds useInput', async () => {
    // Witness contract — see SliderInputProps.onReady. Tests gate cross-cast
    // SPACE on this signal instead of the spinner-glyph exploit.
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const { unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={60}
        inputMode="slider"
        tickMs={50}
        onSubmit={onSubmit}
        onReady={onReady}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    unmount()
  })
})

// ── SliderInput ──────────────────────────────────────────────────────────────

describe('SliderInput', () => {
  it('renders the initial position at min with the initial spinner glyph', () => {
    const { lastFrame, unmount } = render(
      <SliderInput min={1} max={10} focused onSubmit={() => {}} tickMs={50} />,
    )
    const frame = lastFrame() ?? ''
    // Position is read from the bar (cursor cell location), not the readout.
    expect(pickFromFrame(frame)).toBe(1)
    // Readout no longer leaks the numeric position — both Braille spinners
    // (left clockwise, right anticlockwise) stand in for it, and both restart
    // at `⠋` on mount. Each heap cell is padded to 2 cols (leading space
    // before the 1-col glyph) so the row width matches the post-commit
    // numeric form in `<SliderCastingPrompt>`.
    expect(frame).toContain('Stalks: 10 | Left Heap:  ⠋ | Right Heap:  ⠋')
    // Bar should be present: 1 cursor cell (█) + 9 empty cells (░), bordered.
    expect(frame).toContain('█')
    expect(frame).toContain('░')
    unmount()
  })

  it('advances one cell per tick (bouncing rightward)', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(1)
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(2)
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('cycles the left-heap glyph clockwise one frame per tick', () => {
    // Verifies that the readout's left-heap Braille glyph advances in lockstep
    // with the cursor, so the user sees motion in the row below the bar
    // without the numeric position being revealed. The 10-glyph clockwise
    // cycle is `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={20}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(lastFrame() ?? '').toContain('Left Heap:  ⠋ ')
      const expected = ['⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏', '⠋']
      for (const glyph of expected) {
        vi.advanceTimersByTime(50)
        rerender(
          <SliderInput
            min={1}
            max={20}
            focused
            onSubmit={onSubmit}
            tickMs={50}
          />,
        )
        expect(lastFrame() ?? '').toContain(`Left Heap:  ${glyph} `)
      }
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('cycles the right-heap glyph anticlockwise one frame per tick', () => {
    // Mirror of the left-heap test: the right-heap glyph walks the same
    // 10-glyph cycle in reverse so the two spinners visibly counter-rotate.
    // At tickCount=0 both show `⠋`; from tickCount=1 the right glyph runs
    // `⠏⠇⠧⠦⠴⠼⠸⠹⠙⠋`.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={20}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(lastFrame() ?? '').toContain('Right Heap:  ⠋')
      const expected = ['⠏', '⠇', '⠧', '⠦', '⠴', '⠼', '⠸', '⠹', '⠙', '⠋']
      for (const glyph of expected) {
        vi.advanceTimersByTime(50)
        rerender(
          <SliderInput
            min={1}
            max={20}
            focused
            onSubmit={onSubmit}
            tickMs={50}
          />,
        )
        expect(lastFrame() ?? '').toContain(`Right Heap:  ${glyph}`)
      }
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('bounces off the max edge', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput min={1} max={3} focused onSubmit={onSubmit} tickMs={50} />,
      )
      // start at 1
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput min={1} max={3} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(2)
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput min={1} max={3} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)
      // Next tick should bounce back to 2 (max-1), not overflow.
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput min={1} max={3} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(2)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('commits the current position when SPACE is pressed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { stdin, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      // Advance two ticks: 1 → 2 → 3
      vi.advanceTimersByTime(100)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      stdin.write(SPACE)
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit).toHaveBeenCalledWith(3)
      })
      // Further ticks must not produce additional submits (timer stopped).
      vi.advanceTimersByTime(200)
      expect(onSubmit).toHaveBeenCalledTimes(1)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('resets to min and direction +1 when the range changes', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      vi.advanceTimersByTime(200)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(5)
      // New cast — narrower range. Position should rewind to 1, and both
      // spinners should restart at `⠋` for the new cast.
      rerender(
        <SliderInput min={1} max={5} focused onSubmit={onSubmit} tickMs={50} />,
      )
      const reset = lastFrame() ?? ''
      expect(pickFromFrame(reset)).toBe(1)
      expect(reset).toContain('Stalks: 5 | Left Heap:  ⠋ | Right Heap:  ⠋')
      // And direction should be +1: next tick goes to 2.
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput min={1} max={5} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(2)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not tick when focused is false', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused={false}
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      vi.advanceTimersByTime(500)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused={false}
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      // Should still show the initial position.
      expect(pickFromFrame(lastFrame() ?? '')).toBe(1)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not consume Escape or Ctrl+C', async () => {
    const onSubmit = vi.fn()
    const { stdin, unmount } = render(
      <SliderInput min={1} max={10} focused onSubmit={onSubmit} tickMs={50} />,
    )
    stdin.write(ESCAPE)
    stdin.write(CTRL_C)
    await yieldMacrotask()
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()
  })

  it('stops and resumes ticking when focused toggles off and on', () => {
    // Exercises the subscribe/unsubscribe contract on the store: when
    // `focused` flips false the noop subscriber takes over and the store's
    // last listener detaches, stopping the interval. Re-focusing re-attaches
    // and ticking resumes — no leaked timer, no crash on rerender. The
    // position is preserved across the toggle because the same store
    // instance stays in the ref (only the range reset clears it).
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      // Two ticks while focused: 1 → 2 → 3.
      vi.advanceTimersByTime(100)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)
      // Lose focus: interval should stop, position should hold.
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused={false}
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      vi.advanceTimersByTime(500)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused={false}
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)
      // Regain focus: ticking resumes from where it left off.
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(4)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('re-arms the interval at the new rate when tickMs changes mid-prompt', () => {
    // The store captures `tickMs` and must restart its interval whenever the
    // prop changes — otherwise per-cast tick rates would only take effect at
    // store construction. Verifies the setRange(min, max, tickMs) flow.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      // One 50ms tick → position 2.
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={50}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(2)

      // Drop tickMs to 20 — the store should re-arm the interval at the new
      // rate, so one 20ms tick advances by one cell.
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={20}
        />,
      )
      vi.advanceTimersByTime(20)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={20}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)

      // A second 20ms tick confirms the new cadence is steady-state, not a
      // one-off restart artefact.
      vi.advanceTimersByTime(20)
      rerender(
        <SliderInput
          min={1}
          max={10}
          focused
          onSubmit={onSubmit}
          tickMs={20}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(4)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})

// ── CastingPromptBox in slider mode ──────────────────────────────────────────

describe('CastingPromptBox (slider mode)', () => {
  it('renders the verbatim title above the bouncing bar', () => {
    const { lastFrame, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={80}
        inputMode="slider"
        tickMs={50}
        onSubmit={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain(
      'Line 1/6 · Cast 1/3: — Press SPACE to part the stalks',
    )
    expect(pickFromFrame(frame)).toBe(1)
    expect(frame).toContain('Stalks: 48 | Left Heap:  ⠋ | Right Heap:  ⠋')
    // Bar should be rendered as well.
    expect(frame).toContain('█')
    unmount()
  })

  it('reveals the numeric Left/Right Heap on SPACE, then defers onSubmit by commitRevealMs', async () => {
    // SPACE freezes the cursor and swaps the rotating Braille glyphs for the
    // concrete `Left Heap: <pick> | Right Heap: <max − pick>` numbers. The
    // parent's `onSubmit` only fires after the reveal window so the user has
    // time to see the cast they just made. Use a custom `commitRevealMs` so
    // the test's fake-time math is decoupled from the prod constant.
    const REVEAL_MS = 600
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, stdin, rerender, unmount } = render(
        <CastingPromptBox
          lineNumber={2}
          castIndex={1}
          min={1}
          max={40}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={REVEAL_MS}
          onSubmit={onSubmit}
        />,
      )
      // Four ticks: 1 → 2 → 3 → 4 → 5.
      vi.advanceTimersByTime(200)
      rerender(
        <CastingPromptBox
          lineNumber={2}
          castIndex={1}
          min={1}
          max={40}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={REVEAL_MS}
          onSubmit={onSubmit}
        />,
      )
      expect(pickFromFrame(lastFrame() ?? '')).toBe(5)
      stdin.write(SPACE)
      // Reveal in progress: numeric heaps shown, cursor parked, parent not
      // yet notified.
      await waitFor(() => {
        expect(lastFrame() ?? '').toContain(
          'Stalks: 40 | Left Heap:  5 | Right Heap: 35',
        )
      })
      const revealFrame = lastFrame() ?? ''
      expect(pickFromFrame(revealFrame)).toBe(5)
      expect(onSubmit).not.toHaveBeenCalled()
      // Cross the reveal boundary — onSubmit fires exactly once with the pick.
      // shouldAdvanceTime drift during waitFor's poll is bounded by REVEAL_MS,
      // which is ample headroom for one advance call to span the timer.
      vi.advanceTimersByTime(REVEAL_MS)
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit).toHaveBeenCalledWith(5)
      })
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('clips overflow on narrow terminals without reflowing', () => {
    // Box width 40 → inner content width 38, but title is 53 cols.
    const { lastFrame, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={40}
        inputMode="slider"
        tickMs={50}
        onSubmit={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    // Title is clipped (no full sentence present).
    expect(frame).not.toContain('part the stalks')
    // But the prefix should appear (i.e. the box rendered without reflowing
    // the title onto another line).
    expect(frame).toContain('Line 1/6')
    unmount()
  })

  it('describes the stalks being parted (not a SPACE instruction) during random playback', () => {
    // During random-casting playback the slider is auto-driven — the user
    // does not press SPACE — so the title describes the stalks being parted.
    const { lastFrame, unmount } = render(
      <CastingPromptBox
        lineNumber={3}
        castIndex={1}
        min={1}
        max={48}
        width={80}
        inputMode="slider"
        tickMs={50}
        autoLand={{ target: 24, armDelayMs: 0 }}
        onSubmit={() => {}}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 3/6 · Cast 2/3')
    expect(frame).not.toContain('Press SPACE')
    expect(frame).toContain('parting the stalks')
    unmount()
  })

  it('routes SPACE to onSkip during random playback while the slider is still ticking', async () => {
    // During random playback (auto-land active) SPACE abandons the rest of
    // the animation — it routes to `onSkip`, not the per-cast `onSubmit`.
    const onSubmit = vi.fn()
    const onSkip = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={80}
        inputMode="slider"
        tickMs={50}
        // Arm delay 1000 ms keeps the slider ticking — it has not landed yet.
        autoLand={{ target: 24, armDelayMs: 1000 }}
        commitRevealMs={0}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write(SPACE)
    await waitFor(() => {
      expect(onSkip).toHaveBeenCalledTimes(1)
    })
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()
  })

  it('routes SPACE to onSkip during the post-land reveal dwell', async () => {
    // SPACE skips even after the cursor has auto-landed and the cast is in
    // its reveal dwell — the user can cut the rest of the animation short.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const onSkip = vi.fn()
      const onReady = vi.fn()
      const { rerender, stdin, unmount } = render(
        <CastingPromptBox
          lineNumber={1}
          castIndex={0}
          min={1}
          max={10}
          width={80}
          inputMode="slider"
          tickMs={50}
          // Long reveal so the cast sits in the dwell when SPACE arrives.
          commitRevealMs={5000}
          autoLand={{ target: 3, armDelayMs: 0 }}
          onSubmit={onSubmit}
          onSkip={onSkip}
          onReady={onReady}
        />,
      )
      await waitForReady(onReady)
      // Cross the landing tick (tick 2 = 100 ms) so the slider auto-lands.
      vi.advanceTimersByTime(400)
      rerender(
        <CastingPromptBox
          lineNumber={1}
          castIndex={0}
          min={1}
          max={10}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={5000}
          autoLand={{ target: 3, armDelayMs: 0 }}
          onSubmit={onSubmit}
          onSkip={onSkip}
          onReady={onReady}
        />,
      )
      stdin.write(SPACE)
      await waitFor(() => {
        expect(onSkip).toHaveBeenCalledTimes(1)
      })
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not invoke onSkip for Ctrl+C / Escape during random playback', async () => {
    // Global exit keys keep their existing behaviour — they are NOT skip.
    const onSkip = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={80}
        inputMode="slider"
        tickMs={50}
        autoLand={{ target: 24, armDelayMs: 1000 }}
        commitRevealMs={0}
        onSubmit={() => {}}
        onSkip={onSkip}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write(CTRL_C)
    stdin.write(ESCAPE)
    await yieldMacrotask()
    expect(onSkip).not.toHaveBeenCalled()
    unmount()
  })

  it('keeps SPACE committing the pick for the interactive flow (no auto-land, no onSkip)', async () => {
    // Interactive callers pass no auto-land — SPACE commits the cast exactly
    // as before; the skip routing must not leak into that path.
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={10}
        width={80}
        inputMode="slider"
        tickMs={50}
        commitRevealMs={0}
        onSubmit={onSubmit}
        onReady={onReady}
      />,
    )
    await waitForReady(onReady)
    stdin.write(SPACE)
    // Windows GHA's slider commit + onSubmit microtask outruns a single 50 ms
    // tick — poll the assertion instead of racing it.
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    unmount()
  })

  it('auto-lands on the target pick after the arm delay, then submits', async () => {
    // With auto-land the cursor bounces freely and commits the instant it
    // naturally passes through the RNG-chosen target — no SPACE, no teleport.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { lastFrame, rerender, unmount } = render(
        <CastingPromptBox
          lineNumber={1}
          castIndex={0}
          min={1}
          max={10}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={0}
          // Target 3 in 1..10: cursor sits on 3 at tick 2. Arm delay 0 → the
          // first landing is tick 2.
          autoLand={{ target: 3, armDelayMs: 0 }}
          onSubmit={onSubmit}
        />,
      )
      // Advance past the landing tick (tick 2 = 100 ms) plus a margin.
      vi.advanceTimersByTime(400)
      rerender(
        <CastingPromptBox
          lineNumber={1}
          castIndex={0}
          min={1}
          max={10}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={0}
          autoLand={{ target: 3, armDelayMs: 0 }}
          onSubmit={onSubmit}
        />,
      )
      // The slider froze on the target.
      expect(pickFromFrame(lastFrame() ?? '')).toBe(3)
      // Cross the (zero-length) reveal window so the deferred onSubmit fires.
      vi.advanceTimersByTime(50)
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit).toHaveBeenCalledWith(3)
      })
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not auto-land before the arm delay elapses', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { unmount } = render(
        <CastingPromptBox
          lineNumber={1}
          castIndex={0}
          min={1}
          max={10}
          width={80}
          inputMode="slider"
          tickMs={50}
          commitRevealMs={0}
          // Cursor passes 3 at tick 2, but the arm delay (1000 ms = 20 ticks)
          // forbids landing until the next pass.
          autoLand={{ target: 3, armDelayMs: 1000 }}
          onSubmit={onSubmit}
        />,
      )
      // 10 ticks elapsed (500 ms) — well past tick 2 but before the arm delay.
      vi.advanceTimersByTime(500)
      expect(onSubmit).not.toHaveBeenCalled()
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shifts the visible window when horizontalOffset is non-zero', () => {
    const titleStart = 'Line 1/6 · Cast 1/3'
    const { lastFrame, rerender, unmount } = render(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={40}
        inputMode="slider"
        tickMs={50}
        horizontalOffset={0}
        onSubmit={() => {}}
      />,
    )
    // Title is centred-padded then sliced. With centering of a 53-char string
    // inside a 53-wide buffer that becomes 38 visible cols, the start of the
    // sliced row is "Line 1/6 · Cast 1/3: — Press SPACE to". Don't lock in
    // a specific column — just verify the title prefix is in view at offset 0.
    expect(lastFrame() ?? '').toContain(titleStart)
    rerender(
      <CastingPromptBox
        lineNumber={1}
        castIndex={0}
        min={1}
        max={48}
        width={40}
        inputMode="slider"
        tickMs={50}
        horizontalOffset={15}
        onSubmit={() => {}}
      />,
    )
    // After panning 15 cols right, the title prefix should be off-screen.
    expect(lastFrame() ?? '').not.toContain(titleStart)
    unmount()
  })
})

// ── getCastingPromptHeight (manual arm) ─────────────────────────────────────

describe('getCastingPromptHeight', () => {
  it('returns 11 for manual flow regardless of inputMode/error', () => {
    expect(getCastingPromptHeight('number', false, 'manual')).toBe(11)
    expect(getCastingPromptHeight('slider', false, 'manual')).toBe(11)
    expect(getCastingPromptHeight('number', true, 'manual')).toBe(11)
  })

  it('preserves the existing slider/number heights for interactive', () => {
    expect(getCastingPromptHeight('number', false, 'interactive')).toBe(5)
    expect(getCastingPromptHeight('number', true, 'interactive')).toBe(6)
    expect(getCastingPromptHeight('slider', false, 'interactive')).toBe(7)
  })

  it("defaults flowKind to 'interactive' so existing callers stay source-compatible", () => {
    expect(getCastingPromptHeight('number', false)).toBe(5)
    expect(getCastingPromptHeight('slider', false)).toBe(7)
  })
})

// ── validateManualInput (pure) ───────────────────────────────────────────────

describe('validateManualInput', () => {
  // The validator is the source of truth for the manual prompt's SPLIT row.
  // It runs incomplete → conservation → suspended-sum → ok in strict priority
  // order. We unit-test the failure-mode branches here because two of them
  // (suspended-sum, conservation+suspended both failing) require non-canonical
  // M values to be reachable — the canonical M = 49/40/32 sequence
  // mathematically rules out a suspended-sum failure when conservation passes.

  it('returns incomplete when any field is null', () => {
    expect(
      validateManualInput({
        pilesL: 5,
        remL: null,
        pilesR: 5,
        remR: 4,
        unparted: 49,
        castIndex: 0,
      }),
    ).toEqual({ kind: 'incomplete' })
  })

  it('reports conservation failure with the actual total vs unparted', () => {
    // 4·5 + 4 + 4·4 + 4 + 1 = 45, but unparted = 49.
    const result = validateManualInput({
      pilesL: 5,
      remL: 4,
      pilesR: 4,
      remR: 4,
      unparted: 49,
      castIndex: 0,
    })
    expect(result).toEqual({ kind: 'conservation', total: 45, unparted: 49 })
  })

  it('reports suspended-sum failure when conservation passes but the suspended sum is off', () => {
    // Non-canonical M to force a reachable suspended-sum failure:
    // M=10, castIndex=1 (cast 2, expected sums {4, 8}).
    //   4·1 + 1 + 4·0 + 4 + 1 = 10 ✓ conservation
    //   suspended sum = 1 + 1 + 4 = 6 (not in {4, 8}).
    const result = validateManualInput({
      pilesL: 1,
      remL: 1,
      pilesR: 0,
      remR: 4,
      unparted: 10,
      castIndex: 1,
    })
    expect(result).toEqual({
      kind: 'suspended-sum',
      sum: 6,
      expectedLabel: '4 or 8',
    })
  })

  it('conservation fires before suspended-sum when both fail', () => {
    // Cast 1, M=49: pL=5, rL=4, pR=4, rR=2 → total 43 (not 49), suspended 7
    // (not in {5, 9}). Conservation must win the priority race.
    const result = validateManualInput({
      pilesL: 5,
      remL: 4,
      pilesR: 4,
      remR: 2,
      unparted: 49,
      castIndex: 0,
    })
    expect(result.kind).toBe('conservation')
  })

  it('returns ok with leftHeapTotal and rightHeapTotal for a valid commit', () => {
    // Cast 2 of an M=40 round: pL=4, rL=3, pR=4, rR=4 → total 40 ✓,
    // suspended 1+3+4 = 8 ✓. Derived pick = leftHeapTotal = 19.
    const result = validateManualInput({
      pilesL: 4,
      remL: 3,
      pilesR: 4,
      remR: 4,
      unparted: 40,
      castIndex: 1,
    })
    expect(result).toEqual({
      kind: 'ok',
      pick: 19,
      leftHeapTotal: 19,
      rightHeapTotal: 20,
    })
  })

  it('round-1 ok validates a canonical 24/49 split', () => {
    // Cast 1 of M=49: pL=5, rL=4, pR=5, rR=4 → total 49 ✓, suspended 1+4+4 = 9 ✓.
    const result = validateManualInput({
      pilesL: 5,
      remL: 4,
      pilesR: 5,
      remR: 4,
      unparted: 49,
      castIndex: 0,
    })
    expect(result).toEqual({
      kind: 'ok',
      pick: 24,
      leftHeapTotal: 24,
      rightHeapTotal: 24,
    })
  })
})

// ── CastingPromptBox — manual branch ────────────────────────────────────────

describe('CastingPromptBox (manual flow)', () => {
  // Baseline: cast 2/3 of line 3, current round has 40 unparted stalks
  // (max = 39, the maximum legal pick is max). Tests opt out of the post-
  // commit reveal dwell with `manualRevealMs={0}` unless they specifically
  // want to observe the reveal text.
  const baseProps = {
    lineNumber: 3 as const,
    castIndex: 1 as const,
    min: 1,
    max: 39,
    unpartedStalks: 40,
    width: 80,
    inputMode: 'number' as const,
    flowKind: 'manual' as const,
    manualRevealMs: 0,
  }

  // Conservation-passing, suspended-sum-passing 4-field commit for baseProps
  // (cast 2, M=40): pL=4, rL=3, pR=4, rR=4 → split = 19, suspended = 8,
  // next = 32. Used by several tests as a stable valid commit.
  const validBasePropsInput = {
    pilesL: '4',
    remL: '3',
    pilesR: '4',
    remR: '4',
    expectedPick: 19,
    expectedLeftHeapTotal: 19,
    expectedRightHeapTotal: 20,
    expectedSuspended: 8,
    expectedNext: 32,
  }

  // Drive the four fields in sequence, gating Tab→digit transitions on the
  // focus witness so we never write a digit before the next field's
  // `useInput` has registered with Ink's stdin dispatcher.
  async function typeFourFields(
    stdin: { write: (data: string) => unknown },
    onFocusedFieldChange: ReturnType<typeof vi.fn>,
    {
      pilesL,
      remL,
      pilesR,
      remR,
    }: { pilesL: string; remL: string; pilesR: string; remR: string },
  ): Promise<void> {
    stdin.write(pilesL)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remL'),
    )
    stdin.write(remL)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('pilesR'),
    )
    stdin.write(pilesR)
    await yieldMacrotask()
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remR'),
    )
    stdin.write(remR)
    await yieldMacrotask()
  }

  it('renders title, unparted, four-field input, and the live SPLIT row', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBox {...baseProps} onSubmit={() => {}} onReady={onReady} />,
    )
    await waitForReady(onReady)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Line 3/6 · Cast 2/3')
    expect(frame).toContain('Unparted stalks: 40')
    // Both heap input rows render their textual scaffold.
    expect(frame).toContain('Left heap :')
    expect(frame).toContain('Right heap:')
    expect(frame).toContain('piles × 4 stalks +')
    expect(frame).toContain('remainder')
    expect(frame).toContain('1 suspended')
    // SPLIT row with empty buffers — the prompt shows the range hint.
    expect(frame).toMatch(/SPLIT = \?.*range 1 to 39/)
    // Live bottom row reflects zeroed totals before anything is typed.
    expect(frame).toContain('LEFT HEAP: 0 stalks')
    expect(frame).toContain('RIGHT HEAP: 0 stalks')
    unmount()
  })

  it('renders three unfocused fields with `_` placeholder; brackets never collapse', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <CastingPromptBox {...baseProps} onSubmit={() => {}} onReady={onReady} />,
    )
    await waitForReady(onReady)
    const frame = lastFrame() ?? ''
    // Strip ANSI before counting placeholders — the cyan SGR around the
    // underscore (ESC[36m _ ESC[39m) would otherwise hide the literal `[_]`.
    const stripped = frame.replaceAll(/\[[0-9;]*m/g, '')
    const placeholderMatches = stripped.match(/\[_\]/g)
    expect(placeholderMatches?.length ?? 0).toBeGreaterThanOrEqual(3)
    unmount()
  })

  it('Tab cycles forward through pilesL → remL → pilesR → remR → pilesL', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // The initial mount fires `pilesL` once via the focus-witness effect.
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('pilesL'),
    )
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remL'),
    )
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('pilesR'),
    )
    stdin.write(TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remR'),
    )
    stdin.write(TAB)
    // Wrap back to pilesL — the last call should now be `pilesL` again.
    await waitFor(() => {
      const lastCall = onFocusedFieldChange.mock.calls.at(-1)?.[0]
      expect(lastCall).toBe('pilesL')
    })
    unmount()
  })

  it('Shift+Tab cycles focus backward through the same order', async () => {
    // xterm's Shift+Tab is `ESC [ Z` (CSI Z) — Ink's input.js parses this
    // as `{ tab: true, shift: true }`.
    const SHIFT_TAB = '[Z'
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('pilesL'),
    )
    // Shift+Tab from pilesL → remR (last in cycle).
    stdin.write(SHIFT_TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remR'),
    )
    // Shift+Tab again → pilesR.
    stdin.write(SHIFT_TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('pilesR'),
    )
    // Shift+Tab again → remL.
    stdin.write(SHIFT_TAB)
    await waitFor(() =>
      expect(onFocusedFieldChange).toHaveBeenCalledWith('remL'),
    )
    unmount()
  })

  it('updates the SPLIT row live to the derived pick when conservation + suspended-sum pass', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, validBasePropsInput)
    await waitFor(() => {
      expect(lastFrame() ?? '').toMatch(/SPLIT = 19 \(range 1 to 39\)/)
    })
    unmount()
  })

  it('suspended-sum failure renders the actual remainders (no literal "null" leak)', async () => {
    // Regression guard: the message template formerly interpolated
    // closure-scoped `remL`/`remR` (typed `number | null`); a future
    // refactor that reordered validator priority could let it render as
    // `(1 + null + null)`. The message now reads from the (narrowed)
    // validator return type — so even at the type level the values are
    // `number`, and at runtime they must be the same digits the user
    // typed. Uses an unreachable-in-production M=10 prop to force a
    // reachable suspended-sum failure (conservation+suspended both fire
    // only for non-canonical unparted totals).
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        unpartedStalks={10}
        max={9}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // pilesL=1, remL=1, pilesR=0, remR=4 → conservation total = 10 ✓,
    // suspended sum = 1 + 1 + 4 = 6 ∉ {4, 8} for cast 2 (castIndex=1).
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '1',
      remL: '1',
      pilesR: '0',
      remR: '4',
    })
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      // The actual rendered message must include the typed remainders.
      expect(frame).toMatch(/Suspended sum \(1 \+ 1 \+ 4\) = 6/)
      expect(frame).toContain('expected 4 or 8')
      // Strip ANSI before scanning for the literal `null` — colour codes
      // can't leak the string, but defence in depth.
      const stripped = frame.replaceAll(/\[[0-9;]*m/g, '')
      expect(stripped).not.toMatch(/null/)
    })
    unmount()
  })

  it('conservation failure shows the red message + never-zero hint in the SPLIT row', async () => {
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={() => {}}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // pilesL=5, remL=2, pilesR=4, remR=3 → total 4·5+2+4·4+3+1 = 42 (≠ 40).
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '5',
      remL: '2',
      pilesR: '4',
      remR: '3',
    })
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toMatch(/Stalks total 42 ≠ 40 unparted/)
      expect(frame).toContain('recount heaps')
      expect(frame).toContain('remainder 4, not 0')
    })
    unmount()
  })

  it('Enter is a no-op when the validator does not return ok', async () => {
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // Conservation failure: pL=5, rL=2, pR=4, rR=3 → total 42 ≠ 40.
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '5',
      remL: '2',
      pilesR: '4',
      remR: '3',
    })
    stdin.write(ENTER)
    await yieldMacrotask()
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()
  })

  it('Enter on a valid input commits onSubmit(pick) after manualRevealMs={0}', async () => {
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, validBasePropsInput)
    stdin.write(ENTER)
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(validBasePropsInput.expectedPick)
    })
    unmount()
  })

  it('boundary commit: minimum-piles input commits the smallest valid pick', async () => {
    // Smallest pL that yields conservation+suspended for cast 2/M=40 with
    // rL=4, rR=3: 4·pL + 4 + 4·pR + 3 + 1 = 40 → pL + pR = 8. suspended = 1+4+3 = 8 ✓.
    // Take pL=0, pR=8 → pick = 4·0+4 = 4.
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '0',
      remL: '4',
      pilesR: '8',
      remR: '3',
    })
    stdin.write(ENTER)
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(4)
    })
    unmount()
  })

  it('post-commit reveal swaps the bottom row to the green resolved string', async () => {
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        manualRevealMs={150}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, validBasePropsInput)
    stdin.write(ENTER)
    // Reveal appears immediately; onSubmit hasn't fired yet.
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toContain(
        `LEFT HEAP: ${validBasePropsInput.expectedLeftHeapTotal}`,
      )
      expect(frame).toContain(
        `RIGHT HEAP: ${validBasePropsInput.expectedRightHeapTotal}`,
      )
      expect(frame).toContain(
        `SUSPENDED: ${validBasePropsInput.expectedSuspended}`,
      )
      expect(frame).toContain(
        `NEXT CAST: ${validBasePropsInput.expectedNext} unparted`,
      )
    })
    expect(onSubmit).not.toHaveBeenCalled()
    await waitFor(
      () =>
        expect(onSubmit).toHaveBeenCalledWith(validBasePropsInput.expectedPick),
      { timeoutMs: 1000 },
    )
    unmount()
  })

  it('Enter during the reveal dwell skips to advance (fires onSubmit immediately)', async () => {
    // Long dwell so the test sits inside it; the second Enter should
    // short-circuit and fire onSubmit well before the timer would.
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        manualRevealMs={2500}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    await typeFourFields(stdin, onFocusedFieldChange, validBasePropsInput)
    stdin.write(ENTER)
    // First Enter starts the dwell; onSubmit must not have fired yet.
    await yieldMacrotask()
    expect(onSubmit).not.toHaveBeenCalled()
    // Second Enter during the dwell fires onSubmit immediately.
    stdin.write(ENTER)
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    expect(onSubmit).toHaveBeenCalledWith(validBasePropsInput.expectedPick)
    unmount()
  }, 5000)

  it('Ctrl+R is NOT consumed by the prompt (no state change, no onSubmit)', async () => {
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox {...baseProps} onSubmit={onSubmit} onReady={onReady} />,
    )
    await waitForReady(onReady)
    const before = lastFrame()
    stdin.write(CTRL_R)
    await yieldMacrotask()
    expect(onSubmit).not.toHaveBeenCalled()
    // The frame should be unchanged — Ctrl+R is owned by the viewer, not us.
    expect(lastFrame()).toBe(before)
    unmount()
  })

  it('reveal uses byte-identity arithmetic (round-1 commit pinned to 24/49 → suspended 9, next 40)', async () => {
    // Anchor the closed-form helper against the canonical first-round split.
    //   pick = 24, unparted = 49
    //   leftRem  = ((24 - 1) % 4) + 1 = 4
    //   rightAfterPart = 49 - 24 = 25
    //   rightCount     = 25 - 1 = 24
    //   rightRem       = ((24 - 1) % 4) + 1 = 4
    //   next           = 24 - 4 + (24 - 4) = 40
    //   suspended      = 49 - 40 = 9
    const onSubmit = vi.fn()
    const onReady = vi.fn()
    const onFocusedFieldChange = vi.fn()
    const { stdin, lastFrame, unmount } = render(
      <CastingPromptBox
        {...baseProps}
        castIndex={0}
        max={48}
        unpartedStalks={49}
        manualRevealMs={150}
        onSubmit={onSubmit}
        onReady={onReady}
        onFocusedFieldChange={onFocusedFieldChange}
      />,
    )
    await waitForReady(onReady)
    // Conservation + suspended (cast 1 expects {5, 9}) passing input for pick=24:
    //   pilesL=5, remL=4, pilesR=5, remR=4 → total 49 ✓, suspended 9 ✓.
    await typeFourFields(stdin, onFocusedFieldChange, {
      pilesL: '5',
      remL: '4',
      pilesR: '5',
      remR: '4',
    })
    stdin.write(ENTER)
    await waitFor(() => {
      const frame = lastFrame() ?? ''
      expect(frame).toContain('SUSPENDED: 9')
      expect(frame).toContain('NEXT CAST: 40 unparted')
    })
    unmount()
  })
})
