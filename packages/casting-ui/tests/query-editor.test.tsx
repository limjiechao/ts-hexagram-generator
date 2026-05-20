import { render } from 'ink-testing-library'
import { useState, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { QueryEditor } from '../src/query-editor'
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

describe('QueryEditor', () => {
  it('renders the placeholder dimmed when empty', () => {
    const onSubmit = vi.fn()
    const { lastFrame, unmount } = render(
      <QueryEditorHost onSubmit={onSubmit} />,
    )
    expect(lastFrame() ?? '').toContain('Enter your query')
    unmount()
  })

  it('renders the accent bar before the cursor and placeholder when empty', () => {
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
    const INVERSE = '[7m'
    expect(frame).toContain(INVERSE)
    const cursorIndex = frame.indexOf(INVERSE)
    const before = frame.slice(0, cursorIndex)
    const after = frame.slice(cursorIndex + INVERSE.length)
    // Cursor sits before the placeholder text — column 0 of the editable
    // area, where typing appends, since the buffer is empty.
    expect(before).not.toContain('Enter')
    expect(after).toContain('Enter your query')
    // The accent bar (▌) appears before the cursor — no border character.
    expect(before).toContain('▌')
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
      const INVERSE = '[7m'
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
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Hi')

    // The typed text follows the `▌ ` accent bar — no border character.
    const inputRow = frame
      .split('\n')
      .find((row) => row.includes('Hi')) as string
    expect(inputRow).toBeDefined()
    expect(inputRow).toContain('▌')
    expect(inputRow).not.toContain('│')
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
