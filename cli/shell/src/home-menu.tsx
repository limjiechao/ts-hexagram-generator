// `<HomeMenu>` — the Home screen of the composed `hexagram` CLI. It is the hub
// the app opens on: a small app-level banner over four flat, selectable menu
// items, framed in the shared `<ScreenShell>` chrome so it sits visually
// alongside the history list and the consultation readout.
//
// This component is deliberately presentational + input-only: it owns the
// focused-item state and the keymap, but knows nothing about navigation. It
// reports a selection upward via `onSelect` and a quit request via `onQuit`;
// `<HexagramApp>` translates those into `nav-machine` events. Keeping the menu
// navigation-agnostic means it can be unit-tested in isolation.

import { BOLD_WHITE, NORMAL, ScreenShell } from '@hexagram/viewer-core'
import { Box, Text, useInput, useWindowSize } from 'ink'
import { useEffect, useRef, useState, type ReactElement } from 'react'

import { AnimatedBanner } from './animated-banner.js'
import type { BannerTestOverride, BannerTimingConfig } from './banner-state.js'
import { IdentityBlock } from './identity-block.js'

/**
 * The five Home-menu choices, in render order. The string union is the menu's
 * public vocabulary — `<HexagramApp>` maps each value onto a `nav-machine`
 * `NavEvent`. "interactive" is first so it is the default focused item (the
 * PRD's required default). "manual" slots between the random flow and the
 * history browser — see the hexagram-manual spec § "Wiring".
 */
export type HomeMenuSelection =
  | 'interactive'
  | 'random'
  | 'manual'
  | 'history'
  | 'playground'

/** A single menu row: the selection value plus its rendered label. */
interface MenuItem {
  readonly value: HomeMenuSelection
  readonly label: string
}

/**
 * The menu items in display order. The first item is focused by default
 * (`focusIndex` starts at 0), satisfying the PRD's "New interactive
 * consultation focused by default" rule.
 */
const MENU_ITEMS: readonly MenuItem[] = [
  { value: 'interactive', label: 'New interactive consultation' },
  { value: 'random', label: 'New random consultation' },
  { value: 'manual', label: 'New manual consultation' },
  { value: 'history', label: 'Browse history' },
  { value: 'playground', label: 'Playground' },
]

/** Footer key hints for the Home screen — Esc here quits the whole app. */
const HOME_KEY_HINTS = ' ↑/↓ nav · Enter select · Esc quit'

interface HomeMenuProps {
  /**
   * Invoked with the chosen menu value when the user presses Enter on a row.
   * `<HexagramApp>` dispatches the matching `nav-machine` event.
   */
  onSelect: (selection: HomeMenuSelection) => void
  /**
   * Invoked when Escape is pressed on Home — the PRD's "Esc on Home quits the
   * app" rule. `<HexagramApp>` wires this to Ink's program exit. Ctrl+C is the
   * separate hard quit and is handled by `<HexagramApp>`, not here.
   */
  onQuit: () => void
  /**
   * Test-only banner override, forwarded verbatim to `<AnimatedBanner>`.
   * Production never sets it — the live animation is the default.
   */
  bannerTestOverride?: BannerTestOverride
  /**
   * Banner animation cadence, forwarded verbatim to `<AnimatedBanner>`.
   * `<HexagramApp>` builds this from `--banner-interval-ms`; tests can
   * override to lock a deterministic cycle length.
   */
  bannerTiming?: BannerTimingConfig
  /**
   * Fired exactly once per mount, in a `useEffect` that runs after this
   * component's `useInput` registration has been bound to Ink's stdin
   * dispatcher. The contract is: by the time `onReady` is called, the next
   * `stdin.write(...)` will be received by this menu's `useInput` handler.
   *
   * Exists to defuse the `useInput` bind race that previously forced test
   * helpers (`pressUntil`) to retry the first cross-state keystroke up to ten
   * times: Ink registers a `useInput` handler inside its own `useEffect`,
   * which runs *after* the render commit on the next macrotask. Bytes written
   * between commit and bind get dispatched to ancestor handlers and silently
   * dropped. Because effects fire in declaration order, the `useEffect`
   * powering this callback is queued immediately after the `useInput` hook
   * above and therefore runs only once Ink's listener is in place — see the
   * matching witness on `<HistoryList>` and `<CastingStatus>` for prior art.
   * Defaults to a no-op.
   */
  onReady?: () => void
}

export function HomeMenu({
  onSelect,
  onQuit,
  bannerTestOverride,
  bannerTiming,
  onReady,
}: HomeMenuProps): ReactElement {
  const { columns, rows } = useWindowSize()
  const cols = columns || 80
  const termRows = rows || 24

  // The focused row index. Starts at 0 → "New interactive consultation" is
  // focused on first mount, per the PRD.
  const [focusIndex, setFocusIndex] = useState(0)

  useInput((input, key) => {
    if (key.escape) {
      onQuit()
      return
    }
    if (key.upArrow) {
      // ↑ wraps from the first row to the last, matching the history list.
      setFocusIndex(
        (index) => (index - 1 + MENU_ITEMS.length) % MENU_ITEMS.length,
      )
      return
    }
    if (key.downArrow) {
      // ↓ wraps from the last row to the first.
      setFocusIndex((index) => (index + 1) % MENU_ITEMS.length)
      return
    }
    if (key.return) {
      const item = MENU_ITEMS[focusIndex]
      if (item != null) onSelect(item.value)
    }
  })

  // ── onReady witness signal ────────────────────────────────────────────────
  // Fires after this component's `useInput` registration above has bound to
  // Ink's stdin dispatcher. Effects run in declaration order, so this
  // `useEffect` is queued immediately after the one Ink uses internally for
  // `useInput` — by the time `onReady` is invoked, the next `stdin.write` is
  // guaranteed to land on the handler above. Guarded by a ref so it fires
  // exactly once per mount even if `onReady` identity changes between
  // renders (a re-fire would defeat its meaning as a one-shot ready latch).
  const readyFiredRef = useRef(false)
  // `onReady` is read once on mount; subsequent identity changes do not
  // re-fire the latch. The empty dep array is intentional and is NOT a
  // missing-dep mistake — see the JSDoc on `onReady` for the contract.
  useEffect(() => {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    onReady?.()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Menu — four flat selectable rows. The focused row rides a bold inverse
  // bar (same affordance as the history list's focused row); the rest render
  // as bold-white labels. A leading `›` marker on the focused row makes the
  // selection legible even where inverse video is muted.
  const menu = (
    <Box
      flexDirection="column"
      alignItems="center"
      flexShrink={0}
      marginTop={2}
    >
      {MENU_ITEMS.map((item, index) => {
        const isFocused = index === focusIndex
        const text = `${isFocused ? '› ' : '  '}${item.label}  `
        return isFocused ? (
          <Text key={item.value} bold inverse>
            {text}
          </Text>
        ) : (
          <Text key={item.value}>{`${BOLD_WHITE}${text}${NORMAL}`}</Text>
        )
      })}
    </Box>
  )

  // The shell's content slot has no scroll content — the banner, identity
  // block, and menu are vertically centred in the available space. Each
  // sub-block owns `flexShrink={0}`, so a terminal shorter than the layout
  // clips whole rows from the bottom rather than reflowing.
  const content = (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
    >
      <Box marginBottom={2} flexShrink={0}>
        <IdentityBlock />
      </Box>
      <AnimatedBanner testOverride={bannerTestOverride} timing={bannerTiming} />
      {menu}
    </Box>
  )

  // Two-line footer mirroring the history empty-state footer: a dim hint line
  // plus a blank second line (`<ScreenShell>` reserves a two-line footer).
  const footer = (
    <Box flexDirection="column" flexShrink={0}>
      <Text dimColor>{HOME_KEY_HINTS}</Text>
      <Text> </Text>
    </Box>
  )

  return (
    <ScreenShell
      cols={cols}
      rows={termRows}
      title="hexagram"
      aboveContent={null}
      contentSlot={content}
      scrollbarSlot={null}
      belowContent={null}
      footerSlot={footer}
    />
  )
}
