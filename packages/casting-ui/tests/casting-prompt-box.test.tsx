import { render } from 'ink-testing-library'
import { useState, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CastingPromptBox, SliderInput } from '../src/casting-prompt-box'
import { tick } from './helpers/async'
import { CTRL_C, ENTER, ESCAPE, SPACE } from './helpers/keystrokes'
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
    await tick()
    stdin.write(ENTER)
    await tick()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(25)
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
      await tick()
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(3)
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
    await tick()
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
      await tick()
      // Reveal in progress: numeric heaps shown, cursor parked, parent not
      // yet notified.
      const revealFrame = lastFrame() ?? ''
      expect(revealFrame).toContain(
        'Stalks: 40 | Left Heap:  5 | Right Heap: 35',
      )
      expect(pickFromFrame(revealFrame)).toBe(5)
      expect(onSubmit).not.toHaveBeenCalled()
      // Cross the reveal boundary — onSubmit fires exactly once with the pick.
      // shouldAdvanceTime drift during await tick() is ~50ms, so REVEAL_MS is
      // ample headroom for one advance call to span the timer.
      vi.advanceTimersByTime(REVEAL_MS)
      await tick()
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(5)
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
      />,
    )
    await tick()
    stdin.write(SPACE)
    await tick()
    expect(onSkip).toHaveBeenCalledTimes(1)
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
        />,
      )
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
        />,
      )
      await tick()
      stdin.write(SPACE)
      await tick()
      expect(onSkip).toHaveBeenCalledTimes(1)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not invoke onSkip for Ctrl+C / Escape during random playback', async () => {
    // Global exit keys keep their existing behaviour — they are NOT skip.
    const onSkip = vi.fn()
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
      />,
    )
    await tick()
    stdin.write(CTRL_C)
    stdin.write(ESCAPE)
    await tick()
    expect(onSkip).not.toHaveBeenCalled()
    unmount()
  })

  it('keeps SPACE committing the pick for the interactive flow (no auto-land, no onSkip)', async () => {
    // Interactive callers pass no auto-land — SPACE commits the cast exactly
    // as before; the skip routing must not leak into that path.
    const onSubmit = vi.fn()
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
      />,
    )
    await tick()
    stdin.write(SPACE)
    await tick()
    expect(onSubmit).toHaveBeenCalledTimes(1)
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
      await tick()
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(3)
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
