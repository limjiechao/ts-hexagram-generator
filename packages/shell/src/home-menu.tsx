// `<HomeMenu>` — the Home screen of the composed `hexagram` CLI. It is the hub
// the app opens on: a small app-level banner over three flat, selectable menu
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
import { useState, type ReactElement } from 'react'

import { AnimatedBanner } from './animated-banner.js'
import type { BannerTestOverride } from './banner-state.js'
import { IdentityBlock } from './identity-block.js'

/**
 * The three Home-menu choices, in render order. The string union is the menu's
 * public vocabulary — `<HexagramApp>` maps each value onto a `nav-machine`
 * `NavEvent`. "interactive" is first so it is the default focused item (the
 * PRD's required default).
 */
export type HomeMenuSelection = 'interactive' | 'random' | 'history'

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
  { value: 'history', label: 'Browse history' },
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
}

export function HomeMenu({
  onSelect,
  onQuit,
  bannerTestOverride,
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
      setFocusIndex((index) => (index > 0 ? index - 1 : index))
      return
    }
    if (key.downArrow) {
      setFocusIndex((index) =>
        index < MENU_ITEMS.length - 1 ? index + 1 : index,
      )
      return
    }
    if (key.return) {
      const item = MENU_ITEMS[focusIndex]
      if (item != null) onSelect(item.value)
    }
  })

  // ── Menu — three flat selectable rows. The focused row rides a bold inverse
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
      <AnimatedBanner testOverride={bannerTestOverride} />
      <Box marginTop={2} flexShrink={0}>
        <IdentityBlock />
      </Box>
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
