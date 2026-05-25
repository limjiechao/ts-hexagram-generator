// Contract test for `<HomeMenu>`'s `onReady` witness — proves the menu's
// `useInput` handler is bound to Ink's stdin dispatcher by the time the
// witness fires, so the next `stdin.write(...)` is guaranteed to land.
//
// The pattern mirrors `CastingStatus.onReady` (see
// `packages/casting-ui/tests/casting-status.test.tsx`) and `HistoryList.onReady`
// (see `packages/history-ui/tests/history-list.test.tsx`).

import { waitFor } from '@hexagram/test-utils'
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
})
