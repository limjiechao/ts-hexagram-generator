// Tests for `<HomeMenu>` covering two contracts:
//
//   1. The `onReady` witness — proves the menu's `useInput` handler is bound
//      to Ink's stdin dispatcher by the time the witness fires, so the next
//      `stdin.write(...)` is guaranteed to land. Mirrors `CastingStatus.onReady`
//      (see `packages/casting-ui/tests/casting-status.test.tsx`) and
//      `HistoryList.onReady` (see
//      `packages/history-ui/tests/history-list.test.tsx`).
//
//   2. The ↑/↓ focus keymap — locks in wrap-around at the menu edges, parallel
//      to the history list's wrap behavior shipped in commit `15e3a21`. The
//      assertions are outcome-based: we press ↑ or ↓ to reach a focused row,
//      then ENTER, and check the `onSelect` value. This avoids parsing ANSI
//      inverse-video escapes from `ink-testing-library` frames.

import { waitFor, yieldMacrotask } from '@hexagram/test-utils'
import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'

import { HomeMenu } from '../src/home-menu'

// `useWindowSize` reads stdout dimensions; ink-testing-library's fake stdout
// reports zero rows. Mock the hook so `<HomeMenu>` sizes to a usable terminal.
const windowSize = vi.hoisted(() => ({ current: { columns: 100, rows: 30 } }))
vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>()
  return { ...actual, useWindowSize: () => windowSize.current }
})

// A deterministic, interval-disabled banner override so the test does not
// race the live animation. Mirrors `frozenBannerOverride()` in
// `hexagram-app.test.tsx`.
function frozenBannerOverride() {
  const sequence = [0, 0.9, 0, 0.9, 0, 0.9]
  let cursor = 0
  return {
    rng: () => sequence[cursor++ % sequence.length] ?? 0,
    disableInterval: true,
  }
}

const ENTER = '\r'
const ESC = String.fromCodePoint(0x1b)
const UP = `${ESC}[A`
const DOWN = `${ESC}[B`

describe('HomeMenu', () => {
  it('fires onReady once, then the next ENTER reaches the menu handler', async () => {
    // Witness contract — see HomeMenuProps.onReady. The shell host (and any
    // test driving the menu) gates the first keystroke on this signal so a
    // press written between render-commit and useInput re-bind isn't
    // silently dropped.
    const onReady = vi.fn()
    const onSelect = vi.fn()
    const onQuit = vi.fn()

    const { stdin, unmount } = render(
      <HomeMenu
        onSelect={onSelect}
        onQuit={onQuit}
        onReady={onReady}
        bannerTestOverride={frozenBannerOverride()}
      />,
    )

    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))

    // Default focus is row 0 ("New interactive consultation"). Pressing ENTER
    // after the witness fires must land on the menu's `useInput` and invoke
    // `onSelect('interactive')` exactly once.
    stdin.write(ENTER)
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1))
    expect(onSelect).toHaveBeenCalledWith('interactive')
    expect(onQuit).not.toHaveBeenCalled()

    unmount()
  })

  // ── UX: up/down wrap around the menu edges ─────────────────────────────────
  // Parallels the history-list regression pair at
  // `packages/history-ui/tests/history-list.test.tsx:1125` and `:1152`. The
  // PgUp-still-clamps test (`:1180`) is not mirrored because `<HomeMenu>` has
  // no PgUp handler — clamp behavior on a non-existent key is not at risk.

  it('↑ from the first row wraps focus to the last row', async () => {
    const onReady = vi.fn()
    const onSelect = vi.fn()
    const onQuit = vi.fn()

    const { stdin, unmount } = render(
      <HomeMenu
        onSelect={onSelect}
        onQuit={onQuit}
        onReady={onReady}
        bannerTestOverride={frozenBannerOverride()}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))

    // Default focus is row 0 ("New interactive consultation"). Pressing ↑ once
    // must wrap focus to the last row ("Playground"); pressing ENTER
    // then must fire `onSelect('playground')`.
    //
    // `yieldMacrotask` between keystrokes is load-bearing: ENTER's handler
    // reads `focusIndex` from its render closure, so the React commit from the
    // ↑ keystroke must finish (which rebinds `useInput` with the fresh
    // closure) before ENTER is dispatched. Without the yield, ENTER reads the
    // stale `focusIndex = 0` and fires `onSelect('interactive')`. This matches
    // the keystroke-pacing idiom in
    // `packages/history-ui/tests/history-list.test.tsx:1140`.
    stdin.write(UP)
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1))
    expect(onSelect).toHaveBeenCalledWith('playground')
    expect(onQuit).not.toHaveBeenCalled()

    unmount()
  })

  it('↓ from the last row wraps focus to the first row', async () => {
    const onReady = vi.fn()
    const onSelect = vi.fn()
    const onQuit = vi.fn()

    const { stdin, unmount } = render(
      <HomeMenu
        onSelect={onSelect}
        onQuit={onQuit}
        onReady={onReady}
        bannerTestOverride={frozenBannerOverride()}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))

    // Step ↓ four times to land on the last row (5 items total — interactive,
    // random, manual, history, playground), then ↓ once more — the
    // wrap-around must bring focus back to row 0. ENTER then must fire
    // `onSelect('interactive')`. `yieldMacrotask` between keystrokes is
    // load-bearing for the same reason called out in the ↑-wrap test above.
    for (let i = 0; i < 5; i++) {
      stdin.write(DOWN)
      await yieldMacrotask()
    }
    stdin.write(ENTER)
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1))
    expect(onSelect).toHaveBeenCalledWith('interactive')
    expect(onQuit).not.toHaveBeenCalled()

    unmount()
  })

  // ── Manual flow ─────────────────────────────────────────────────────────

  it('renders five items in order: interactive, random, manual, history, playground', async () => {
    const onReady = vi.fn()
    const { lastFrame, unmount } = render(
      <HomeMenu
        onSelect={() => {}}
        onQuit={() => {}}
        onReady={onReady}
        bannerTestOverride={frozenBannerOverride()}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    const frame = lastFrame() ?? ''
    const positions = [
      'New interactive consultation',
      'New random consultation',
      'New manual consultation',
      'Browse history',
      'Playground',
    ].map((label) => frame.indexOf(label))
    // Every label must be present (no -1) and in strictly-ascending order.
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect(positions).toEqual([...positions].toSorted((a, b) => a - b))
    unmount()
  })

  it('↓ ↓ ENTER selects "manual"', async () => {
    const onReady = vi.fn()
    const onSelect = vi.fn()
    const { stdin, unmount } = render(
      <HomeMenu
        onSelect={onSelect}
        onQuit={() => {}}
        onReady={onReady}
        bannerTestOverride={frozenBannerOverride()}
      />,
    )
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    stdin.write(DOWN)
    await yieldMacrotask()
    stdin.write(DOWN)
    await yieldMacrotask()
    stdin.write(ENTER)
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1))
    expect(onSelect).toHaveBeenCalledWith('manual')
    unmount()
  })
})
