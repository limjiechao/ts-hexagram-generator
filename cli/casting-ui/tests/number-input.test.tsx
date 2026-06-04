import { waitFor, waitForReady, yieldMacrotask } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import { useState, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { NumberInput } from '../src/number-input'
import { BACKSPACE, CTRL_C, ENTER, ESCAPE } from './helpers/keystrokes'

function NumberInputHost({
  onSubmit,
  onError,
  onReady,
  min,
  max,
  initialValue = '',
  focused = true,
}: {
  onSubmit: (parsed: number) => void
  onError: (message: string | null) => void
  onReady?: () => void
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
      onReady={onReady}
    />
  )
}

describe('NumberInput', () => {
  it('accumulates digit input', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        onReady={onReady}
        min={1}
        max={48}
      />,
    )
    // Gate the first keystroke on the onReady witness so the bytes land
    // after Ink's useInput is bound — see ink-useinput-bind skill.
    await waitForReady(onReady)
    stdin.write('24')
    await waitFor(() => expect(lastFrame() ?? '').toContain('24'))
    unmount()
  })

  it('ignores non-digit input', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        onReady={onReady}
        min={1}
        max={48}
      />,
    )
    await waitForReady(onReady)
    stdin.write('a.b')
    // Negative assertion — give the dispatch a macrotask before checking
    // that no forbidden characters were committed to the buffer.
    await yieldMacrotask()
    expect(lastFrame() ?? '').not.toContain('a')
    expect(lastFrame() ?? '').not.toContain('.')
    unmount()
  })

  it('treats Enter on empty buffer as a no-op', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        onReady={onReady}
        min={1}
        max={48}
      />,
    )
    await waitForReady(onReady)
    stdin.write(ENTER)
    // Negative assertion — yield one macrotask so the dispatcher has a
    // chance to run before asserting neither callback fired.
    await yieldMacrotask()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    unmount()
  })

  it('submits in-range values via Enter', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        onReady={onReady}
        min={1}
        max={48}
      />,
    )
    await waitForReady(onReady)
    stdin.write('24')
    // Yield one macrotask between the digit write and the ENTER write so
    // the buffer commit lands before the submit gate reads it.
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(24)
      expect(onError).toHaveBeenLastCalledWith(null)
    })
    unmount()
  })

  it('reports an error for values below min', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        onReady={onReady}
        min={1}
        max={48}
      />,
    )
    await waitForReady(onReady)
    stdin.write('0')
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
      expect(onError).toHaveBeenLastCalledWith('Pick a number from 1 to 48.')
    })
    unmount()
  })

  it('reports an error for values above max', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        onReady={onReady}
        min={1}
        max={48}
      />,
    )
    await waitForReady(onReady)
    stdin.write('99')
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
      expect(onError).toHaveBeenLastCalledWith('Pick a number from 1 to 48.')
    })
    unmount()
  })

  it('clears the error and pops a digit on Backspace', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const onReady = vi.fn()
    const { lastFrame, stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        onReady={onReady}
        min={1}
        max={48}
      />,
    )
    await waitForReady(onReady)
    stdin.write('99')
    await yieldMacrotask()
    stdin.write(ENTER)
    // Wait for the out-of-range ENTER to surface the error before clearing
    // the spy, so mockClear can't outrun the dispatch.
    await waitFor(() =>
      expect(onError).toHaveBeenLastCalledWith('Pick a number from 1 to 48.'),
    )
    onError.mockClear()
    stdin.write(BACKSPACE)
    await waitFor(() => {
      expect(onError).toHaveBeenLastCalledWith(null)
      expect(lastFrame() ?? '').toContain('9')
      expect(lastFrame() ?? '').not.toContain('99')
    })
    unmount()
  })

  it('fires onReady once per false→true focused transition', async () => {
    // Witness contract — see NumberInputProps.onReady. Callers can gate the
    // next keystroke on this signal so a byte written between mount/refocus
    // and `useInput` re-bind isn't silently dropped.
    const onReady = vi.fn()
    const props = {
      value: '',
      min: 1,
      max: 48,
      onChange: () => {},
      onSubmit: () => {},
      onError: () => {},
      onReady,
    }
    const { rerender, unmount } = render(
      <NumberInput {...props} focused={false} />,
    )
    // focused=false on first render → onReady has not been called.
    expect(onReady).not.toHaveBeenCalled()
    rerender(<NumberInput {...props} focused />)
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    unmount()
  })

  it('does not consume Escape or Ctrl+C', async () => {
    const onSubmit = vi.fn()
    const onError = vi.fn()
    const onReady = vi.fn()
    const { stdin, unmount } = render(
      <NumberInputHost
        onSubmit={onSubmit}
        onError={onError}
        onReady={onReady}
        min={1}
        max={48}
      />,
    )
    await waitForReady(onReady)
    stdin.write(ESCAPE)
    stdin.write(CTRL_C)
    // Negative assertion — yield a macrotask so the dispatcher has a chance
    // to (try to) deliver both keystrokes before asserting nothing fired.
    await yieldMacrotask()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    unmount()
  })
})
