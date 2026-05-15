import { render } from 'ink-testing-library'
import { useState, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CastingPromptBox, NumberInput, QueryEditor } from '../src/cli-editors'

const ENTER = '\r'
const BACKSPACE = ''
const ESCAPE = ''
const CTRL_C = ''

// Let Ink's stdin → React → render pipeline settle after a simulated keypress.
const tick = (ms = 30): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

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
    // The cursor cell now sits between the two placeholder halves, so the
    // literal "Enter your query" is split by ANSI escapes. Assert the two
    // segments individually.
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Enter ')
    expect(frame).toContain('your query')
    unmount()
  })

  it("places the cursor after the placeholder's first space", () => {
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
    expect(before).toContain('Enter ')
    expect(after).toContain('your')
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
    // still shown because nothing was typed. The cursor splits the two
    // halves of the placeholder, so assert each segment individually.
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Enter ')
    expect(frame).toContain('your query')
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
