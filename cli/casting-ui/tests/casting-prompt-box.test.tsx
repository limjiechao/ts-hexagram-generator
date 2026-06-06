import { waitFor, yieldMacrotask } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import { useState, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CastingPromptBox } from '../src/casting-prompt-box.js'
import { ENTER } from './helpers/keystrokes.js'

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
