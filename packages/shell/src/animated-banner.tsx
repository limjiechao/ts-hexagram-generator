// `<AnimatedBanner>` — the imperative shell of the home banner animation: a
// `useReducer` over the pure `banner-state` core, ticked by a 108 ms
// `setInterval`. It renders the six animated hexagram rows and the two-line
// name, scoped narrowly so only this subtree re-renders per tick — the static
// identity block and the menu are untouched. The interval is cleared on
// unmount, so leaving Home leaks no timer and every return is a fresh cycle.

import { getHexagramRecord } from '@hexagram/core/getters'
import {
  BOLD_GREY,
  BOLD_RED,
  DIM_RED,
  NORMAL,
  NORMAL_GREY,
} from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import { useEffect, useReducer, type ReactElement } from 'react'

import type { BannerLineRole } from './banner-lines.js'
import {
  advanceBannerState,
  BANNER_TICK_MS,
  createBannerState,
  deriveBannerFrame,
  type BannerState,
  type BannerTestOverride,
} from './banner-state.js'

interface AnimatedBannerProps {
  /**
   * Test-only override — an injected RNG and an interval-disable flag.
   * Production never sets it: the live Math.random-driven animation is the
   * default. Forwarded from `<HexagramApp>` via `<HomeMenu>`.
   */
  readonly testOverride?: BannerTestOverride
}

/** The two SGR runs for a line, by colour role: `[value colour, bar colour]`. */
function lineColors(role: BannerLineRole): readonly [string, string] {
  switch (role) {
    case 'static':
      return [NORMAL_GREY, BOLD_GREY]
    case 'moving-bright':
      return [BOLD_RED, BOLD_RED]
    case 'moving-dim':
      return [DIM_RED, DIM_RED]
  }
}

/**
 * The animated banner: six hexagram rows (top line first) above the two-line
 * hexagram name, both re-derived from the pure core every 108 ms tick.
 */
export function AnimatedBanner({
  testOverride,
}: AnimatedBannerProps): ReactElement {
  const rng = testOverride?.rng ?? Math.random

  // `useReducer` over the pure core; the action is unused (every tick simply
  // advances). The reducer closes over `rng`; React always uses the latest.
  const [state, tick] = useReducer(
    // eslint-disable-next-line unused-imports/no-unused-vars
    (current: BannerState, _: void): BannerState =>
      advanceBannerState(current, rng),
    rng,
    createBannerState,
  )

  useEffect(() => {
    if (testOverride?.disableInterval === true) return
    const id = setInterval(() => {
      tick()
    }, BANNER_TICK_MS)
    return () => {
      clearInterval(id)
    }
  }, [testOverride?.disableInterval])

  const frame = deriveBannerFrame(state)
  const record = getHexagramRecord(frame.nameHex)
  // `lines` is bottom-first; the banner draws the top line first.
  const topDownLines = frame.lines.toReversed()

  return (
    <Box flexDirection="column" alignItems="center" flexShrink={0}>
      {topDownLines.map((cells, index) => {
        const [valueColor, barColor] = lineColors(cells.role)
        return (
          // `index` is a stable key: six fixed positional rows, never
          // reordered or filtered — the row position IS its identity.
          <Text key={index}>
            {`${valueColor}${cells.value}${NORMAL}  ${barColor}${cells.bar}${NORMAL}`}
          </Text>
        )
      })}
      <Text> </Text>
      <Text>{`${NORMAL_GREY}${record.Name.Chinese.Traditional}${NORMAL}`}</Text>
      <Text>{`${NORMAL_GREY}${record.Name.English.WilhelmBaynes}${NORMAL}`}</Text>
    </Box>
  )
}
