import { render } from 'ink-testing-library'
import { useState, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { NumberInput } from '../src/number-input'
import { tick } from './helpers/async'
import { BACKSPACE, CTRL_C, ENTER, ESCAPE } from './helpers/keystrokes'

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
