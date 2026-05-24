/* eslint-disable no-restricted-syntax -- pre-existing `await tick(...)` calls; lifted by Wave 3 migration to @hexagram/test-utils. See cross-platform-tests skill. */
import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmModal } from '../src/confirm-modal.js'
import { stripAnsi } from '../src/viewer-layout.js'

const ESC = String.fromCodePoint(0x1b)

/** Yield to the event loop so Ink can process queued stdin + re-render. */
const tick = (ms = 50): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

describe('<ConfirmModal> — rendering', () => {
  it('renders the title, body lines and prompt', () => {
    const { lastFrame, unmount } = render(
      <ConfirmModal
        title="Discard cast"
        bodyLines={['Line A', 'Line B']}
        prompt="Press Y to discard · N to keep"
        innerCols={60}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).toContain('Discard cast')
    expect(frame).toContain('Line A')
    expect(frame).toContain('Line B')
    expect(frame).toContain('Press Y to discard · N to keep')
    unmount()
  })

  it('renders a round border framed consistently with viewer-core chrome', () => {
    const { lastFrame, unmount } = render(
      <ConfirmModal
        title="Confirm"
        bodyLines={[]}
        prompt="Y / N"
        innerCols={60}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    // A `borderStyle="round"` box renders the `╭` corner.
    expect(stripAnsi(lastFrame() ?? '')).toContain('╭')
    unmount()
  })

  it('bakes in no domain-specific words — only the props supply text', () => {
    const { lastFrame, unmount } = render(
      <ConfirmModal
        title="My title"
        bodyLines={['My body']}
        prompt="My prompt"
        innerCols={60}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const frame = stripAnsi(lastFrame() ?? '')
    expect(frame).not.toContain('consultation')
    expect(frame).not.toContain('Delete')
    unmount()
  })
})

describe('<ConfirmModal> — keypress callbacks', () => {
  it('fires onConfirm when the confirm key (default Y) is pressed', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { stdin, unmount } = render(
      <ConfirmModal
        title="Confirm"
        bodyLines={[]}
        prompt="Y / N"
        innerCols={60}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    stdin.write('Y')
    await tick()
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).not.toHaveBeenCalled()
    unmount()
  })

  it('confirm key is case-insensitive — lowercase y also fires onConfirm', async () => {
    const onConfirm = vi.fn()
    const { stdin, unmount } = render(
      <ConfirmModal
        title="Confirm"
        bodyLines={[]}
        prompt="Y / N"
        innerCols={60}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )
    stdin.write('y')
    await tick()
    expect(onConfirm).toHaveBeenCalledOnce()
    unmount()
  })

  it('fires onCancel when the cancel key (default N) is pressed', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { stdin, unmount } = render(
      <ConfirmModal
        title="Confirm"
        bodyLines={[]}
        prompt="Y / N"
        innerCols={60}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    stdin.write('N')
    await tick()
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
    unmount()
  })

  it('cancel key is case-insensitive — lowercase n also fires onCancel', async () => {
    const onCancel = vi.fn()
    const { stdin, unmount } = render(
      <ConfirmModal
        title="Confirm"
        bodyLines={[]}
        prompt="Y / N"
        innerCols={60}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )
    stdin.write('n')
    await tick()
    expect(onCancel).toHaveBeenCalledOnce()
    unmount()
  })

  it('fires onCancel when Escape is pressed', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { stdin, unmount } = render(
      <ConfirmModal
        title="Confirm"
        bodyLines={[]}
        prompt="Y / N"
        innerCols={60}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    stdin.write(ESC)
    await tick()
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
    unmount()
  })

  it('ignores unrelated keys — no callback fires', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { stdin, unmount } = render(
      <ConfirmModal
        title="Confirm"
        bodyLines={[]}
        prompt="Y / N"
        innerCols={60}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    stdin.write('\r') // Enter
    await tick()
    stdin.write('x')
    await tick()
    stdin.write(`${ESC}[B`) // down arrow
    await tick()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
    unmount()
  })

  it('ignores the confirm key when modified by Ctrl', async () => {
    const onConfirm = vi.fn()
    const { stdin, unmount } = render(
      <ConfirmModal
        title="Confirm"
        bodyLines={[]}
        prompt="Y / N"
        innerCols={60}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )
    // U+0019 is Ctrl+Y — input='y', key.ctrl=true; must not confirm.
    stdin.write(String.fromCodePoint(0x19))
    await tick()
    expect(onConfirm).not.toHaveBeenCalled()
    unmount()
  })

  it('honours custom confirm/cancel keys supplied via props', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { stdin, unmount } = render(
      <ConfirmModal
        title="Confirm"
        bodyLines={[]}
        prompt="D / K"
        innerCols={60}
        confirmKey="d"
        cancelKey="k"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    // The default Y/N must no longer confirm/cancel.
    stdin.write('y')
    await tick()
    expect(onConfirm).not.toHaveBeenCalled()
    // The custom keys do.
    stdin.write('d')
    await tick()
    expect(onConfirm).toHaveBeenCalledOnce()
    stdin.write('k')
    await tick()
    expect(onCancel).toHaveBeenCalledOnce()
    unmount()
  })
})
