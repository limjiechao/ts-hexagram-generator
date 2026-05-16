import { render } from 'ink-testing-library'
import { useState, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  CastingPromptBox,
  NumberInput,
  QueryEditor,
  SliderInput,
} from '../src/cli-editors'
import { tick } from './helpers/async'
import { BACKSPACE, CTRL_C, ENTER, ESCAPE } from './helpers/keystrokes'

// Controlled-state host so tests exercise the editor exactly the way the
// viewer will — buffer lifted into a parent component.
function QueryEditorHost({
  onSubmit,
  initialValue = '',
  focused = true,
}: {
  onSubmit: (final: string) => void
  initialValue?: string
  focused?: boolean
}): ReactElement {
  const [value, setValue] = useState(initialValue)
  return (
    <QueryEditor
      value={value}
      focused={focused}
      width={40}
      placeholder="Enter your query"
      onChange={setValue}
      onSubmit={() => onSubmit(value)}
    />
  )
}

function NumberInputHost({
  onSubmit,
  onError,
  min,
  max,
  initialValue = '',
  focused = true,
}: {
  onSubmit: (parsed: number) => void
  onError: (message: string | null) => void
  min: number
  max: number
  initialValue?: string
  focused?: boolean
}): ReactElement {
  const [value, setValue] = useState(initialValue)
  return (
    <NumberInput
      value={value}
      focused={focused}
      min={min}
      max={max}
      onChange={setValue}
      onSubmit={onSubmit}
      onError={onError}
    />
  )
}

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

describe('QueryEditor', () => {
  it('renders the placeholder dimmed when empty', () => {
    const onSubmit = vi.fn()
    const { lastFrame, unmount } = render(
      <QueryEditorHost onSubmit={onSubmit} />,
    )
    expect(lastFrame() ?? '').toContain('Enter your query')
    unmount()
  })

  it('places the cursor at the start of the placeholder', () => {
    const onSubmit = vi.fn()
    const { lastFrame, unmount } = render(
      <QueryEditor
        value=""
        focused
        width={40}
        placeholder="Enter your query."
        onChange={() => {}}
        onSubmit={onSubmit}
      />,
    )
    const frame = lastFrame() ?? ''
    // Inverse SGR marks the rendered cursor cell.
    const INVERSE = '[7m'
    expect(frame).toContain(INVERSE)
    const cursorIndex = frame.indexOf(INVERSE)
    const before = frame.slice(0, cursorIndex)
    const after = frame.slice(cursorIndex + INVERSE.length)
    // Cursor sits before the placeholder text — column 0 is where typing
    // appends to, since the buffer is empty.
    expect(before).not.toContain('Enter')
    expect(after).toContain('Enter your query')
    unmount()
  })

  it('blinks the cursor every 500ms', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { lastFrame, rerender, unmount } = render(
        <QueryEditor
          value=""
          focused
          width={40}
          placeholder="Enter your query."
          onChange={() => {}}
          onSubmit={() => {}}
        />,
      )
      const INVERSE = '[7m'
      const initial = lastFrame() ?? ''
      expect(initial).toContain(INVERSE)

      vi.advanceTimersByTime(500)
      // Nudge React to re-render after the interval fires.
      rerender(
        <QueryEditor
          value=""
          focused
          width={40}
          placeholder="Enter your query."
          onChange={() => {}}
          onSubmit={() => {}}
        />,
      )
      const blinkedOff = lastFrame() ?? ''
      expect(blinkedOff).not.toContain(INVERSE)

      vi.advanceTimersByTime(500)
      rerender(
        <QueryEditor
          value=""
          focused
          width={40}
          placeholder="Enter your query."
          onChange={() => {}}
          onSubmit={() => {}}
        />,
      )
      const blinkedOn = lastFrame() ?? ''
      expect(blinkedOn).toContain(INVERSE)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('accumulates typed characters', async () => {
    const onSubmit = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <QueryEditorHost onSubmit={onSubmit} />,
    )
    stdin.write('Hi')
    await tick()
    expect(lastFrame() ?? '').toContain('Hi')
    unmount()
  })

  it('accepts q as a regular character', async () => {
    const onSubmit = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <QueryEditorHost onSubmit={onSubmit} />,
    )
    stdin.write('quit?')
    await tick()
    expect(lastFrame() ?? '').toContain('quit?')
    unmount()
  })

  it('pops characters on backspace', async () => {
    const onSubmit = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <QueryEditorHost onSubmit={onSubmit} />,
    )
    stdin.write('Hello')
    await tick()
    stdin.write(BACKSPACE)
    await tick()
    expect(lastFrame() ?? '').toContain('Hell')
    expect(lastFrame() ?? '').not.toContain('Hello')
    unmount()
  })

  it('treats backspace on empty buffer as a no-op', async () => {
    const onSubmit = vi.fn()
    const { stdin, unmount } = render(<QueryEditorHost onSubmit={onSubmit} />)
    expect(() => stdin.write(BACKSPACE)).not.toThrow()
    await tick()
    unmount()
  })

  it('does not submit on Enter with an empty buffer', async () => {
    const onSubmit = vi.fn()
    const { stdin, unmount } = render(<QueryEditorHost onSubmit={onSubmit} />)
    stdin.write(ENTER)
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()
  })

  it('submits on Enter when the buffer is non-empty', async () => {
    const onSubmit = vi.fn()
    const { stdin, unmount } = render(<QueryEditorHost onSubmit={onSubmit} />)
    stdin.write('Hello')
    await tick()
    stdin.write(ENTER)
    await tick()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('Hello')
    unmount()
  })

  it('does not consume Escape or Ctrl+C', async () => {
    const onSubmit = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <QueryEditorHost onSubmit={onSubmit} />,
    )
    stdin.write(ESCAPE)
    stdin.write(CTRL_C)
    await tick()
    // The buffer must NOT have collected escape/ctrl-c bytes; placeholder
    // still shown because nothing was typed.
    expect(lastFrame() ?? '').toContain('Enter your query')
    expect(onSubmit).not.toHaveBeenCalled()
    unmount()
  })
})

describe('NumberInput', () => {
  it('accumulates digit input', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        min={1}
        max={48}
      />,
    )
    stdin.write('24')
    await tick()
    expect(lastFrame() ?? '').toContain('24')
    unmount()
  })

  it('ignores non-digit input', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        min={1}
        max={48}
      />,
    )
    stdin.write('a.b')
    await tick()
    expect(lastFrame() ?? '').not.toContain('a')
    expect(lastFrame() ?? '').not.toContain('.')
    unmount()
  })

  it('treats Enter on empty buffer as a no-op', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        min={1}
        max={48}
      />,
    )
    stdin.write(ENTER)
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    unmount()
  })

  it('submits in-range values via Enter', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        min={1}
        max={48}
      />,
    )
    stdin.write('24')
    await tick()
    stdin.write(ENTER)
    await tick()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(24)
    expect(onError).toHaveBeenLastCalledWith(null)
    unmount()
  })

  it('reports an error for values below min', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        min={1}
        max={48}
      />,
    )
    stdin.write('0')
    await tick()
    stdin.write(ENTER)
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onError).toHaveBeenLastCalledWith('Pick a number from 1 to 48.')
    unmount()
  })

  it('reports an error for values above max', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        min={1}
        max={48}
      />,
    )
    stdin.write('99')
    await tick()
    stdin.write(ENTER)
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onError).toHaveBeenLastCalledWith('Pick a number from 1 to 48.')
    unmount()
  })

  it('clears the error and pops a digit on Backspace', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        min={1}
        max={48}
      />,
    )
    stdin.write('99')
    await tick()
    stdin.write(ENTER)
    await tick()
    onError.mockClear()
    stdin.write(BACKSPACE)
    await tick()
    expect(onError).toHaveBeenLastCalledWith(null)
    expect(lastFrame() ?? '').toContain('9')
    expect(lastFrame() ?? '').not.toContain('99')
    unmount()
  })

  it('does not consume Escape or Ctrl+C', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const { stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        min={1}
        max={48}
      />,
    )
    stdin.write(ESCAPE)
    stdin.write(CTRL_C)
    await tick()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    unmount()
  })
})

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
  it('renders the initial position at min', () => {
    const { lastFrame, unmount } = render(
      <SliderInput min={1} max={10} focused onSubmit={() => {}} tickMs={50} />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('pick: 1 / 10')
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
      expect(lastFrame() ?? '').toContain('pick: 1 / 10')
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
      expect(lastFrame() ?? '').toContain('pick: 2 / 10')
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
      expect(lastFrame() ?? '').toContain('pick: 3 / 10')
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
      expect(lastFrame() ?? '').toContain('pick: 2 / 3')
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput min={1} max={3} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(lastFrame() ?? '').toContain('pick: 3 / 3')
      // Next tick should bounce back to 2 (max-1), not overflow.
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput min={1} max={3} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(lastFrame() ?? '').toContain('pick: 2 / 3')
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
      stdin.write(' ')
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
      expect(lastFrame() ?? '').toContain('pick: 5 / 10')
      // New cast — narrower range. Position should rewind to 1.
      rerender(
        <SliderInput min={1} max={5} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(lastFrame() ?? '').toContain('pick: 1 / 5')
      // And direction should be +1: next tick goes to 2.
      vi.advanceTimersByTime(50)
      rerender(
        <SliderInput min={1} max={5} focused onSubmit={onSubmit} tickMs={50} />,
      )
      expect(lastFrame() ?? '').toContain('pick: 2 / 5')
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
      expect(lastFrame() ?? '').toContain('pick: 1 / 10')
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
    expect(frame).toContain('pick: 1 / 48')
    // Bar should be rendered as well.
    expect(frame).toContain('█')
    unmount()
  })

  it('commits the position when SPACE is pressed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onSubmit = vi.fn()
      const { stdin, rerender, unmount } = render(
        <CastingPromptBox
          lineNumber={2}
          castIndex={1}
          min={1}
          max={40}
          width={80}
          inputMode="slider"
          tickMs={50}
          onSubmit={onSubmit}
        />,
      )
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
          onSubmit={onSubmit}
        />,
      )
      stdin.write(' ')
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
