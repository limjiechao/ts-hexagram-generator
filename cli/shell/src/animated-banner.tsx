// `<AnimatedBanner>` — the imperative shell of the home banner animation: a
// `useReducer` over the pure `banner-state` core, ticked by a `setInterval` at
// `timing.tickMs` (108 ms by default). It renders the six animated hexagram
// rows and the two-line name, scoped narrowly so only this subtree re-renders
// per tick — the static identity block and the menu are untouched. The
// interval is cleared on unmount, so leaving Home leaks no timer and every
// return is a fresh cycle.

import { cryptoRandom } from '@hexagram/core/crypto-random'
import { getHexagramRecord } from '@hexagram/core/getters'
import { lineColors, NORMAL, NORMAL_GREY } from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import { useEffect, useReducer, type ReactElement } from 'react'

import {
  advanceBannerState,
  createBannerState,
  DEFAULT_BANNER_TIMING,
  deriveBannerFrame,
  type BannerState,
  type BannerTestOverride,
  type BannerTimingConfig,
} from './banner-state.js'

interface AnimatedBannerProps {
  /**
   * Test-only override — an injected RNG and an interval-disable flag.
   * Production never sets it: the live `cryptoRandom`-driven animation is the
   * default. Forwarded from `<HexagramApp>` via `<HomeMenu>`.
   */
  readonly testOverride?: BannerTestOverride
  /**
   * Animation cadence — controls both the static-figure dwell and the pulse
   * dwell (equal by construction). Defaults to `DEFAULT_BANNER_TIMING`; the
   * composed CLI forwards a snapshot derived from `--banner-interval-ms`.
   */
  readonly timing?: BannerTimingConfig
}

/**
 * The animated banner: six hexagram rows (top line first) above the two-line
 * hexagram name, both re-derived from the pure core every `timing.tickMs` tick.
 */
export function AnimatedBanner({
  testOverride,
  timing = DEFAULT_BANNER_TIMING,
}: AnimatedBannerProps): ReactElement {
  const rng = testOverride?.rng ?? cryptoRandom

  // `useReducer` over the pure core; the action is unused (every tick simply
  // advances). The reducer closes over `rng` and `timing`; React always uses
  // the latest captured values.
  const [state, tick] = useReducer(
    // eslint-disable-next-line unused-imports/no-unused-vars
    (current: BannerState, _: void): BannerState =>
      advanceBannerState(current, rng, timing),
    rng,
    createBannerState,
  )

  const tickMs = timing.tickMs
  useEffect(() => {
    if (testOverride?.disableInterval === true) return
    const id = setInterval(() => {
      tick()
    }, tickMs)
    return () => {
      clearInterval(id)
    }
  }, [testOverride?.disableInterval, tickMs])

  const frame = deriveBannerFrame(state, timing)
  const record = getHexagramRecord(frame.nameHex)
  // `lines` is bottom-first; the banner draws the top line first.
  const topDownLines = frame.lines.toReversed()

  return (
    // `alignSelf="stretch"` spans this box across the full content width so
    // the six fixed-width hexagram rows are centred by a single rounding pass
    // against a constant width. Without it the box shrink-wraps to its widest
    // child — the variable-length English name — and the rows are centred
    // twice (within the box, then the box within the screen); the two integer
    // roundings beat against the name's parity, so the figure jitters ±1
    // column from frame to frame as the name length changes.
    <Box
      flexDirection="column"
      alignItems="center"
      alignSelf="stretch"
      flexShrink={0}
    >
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
      <Text>{`${NORMAL_GREY}${record.Name.Chinese.Traditional}${NORMAL}`}</Text>
      <Text>{`${NORMAL_GREY}${record.Name.English.WilhelmBaynes}${NORMAL}`}</Text>
    </Box>
  )
}
