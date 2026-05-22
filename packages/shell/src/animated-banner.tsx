// `<AnimatedBanner>` — the home banner's animated region: a six-line hexagram
// and its two-line name. This slice (#36) renders a single static *settled*
// frame from a fixed hexagram; Slice 2 (#37) makes it the imperative shell of
// the animation state machine. It is scoped narrowly to just these eight rows
// so that, once animated, only this subtree re-renders per tick.

import { getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/types'
import { BOLD_GREY, NORMAL, NORMAL_GREY } from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

import { deriveBannerLine, polarityOf } from './banner-lines.js'

// A fixed settled hexagram for the static slice — an alternating yang/yin
// figure so the frame shows both bar styles. Bottom line first, matching the
// `Hexagram` tuple. Slice 2 replaces this with the RNG-driven state machine.
const SETTLED_HEXAGRAM: Hexagram = [7, 8, 7, 8, 7, 8]

/**
 * The static banner: six hexagram rows (top line first) above the two-line
 * hexagram name. Centred via Ink's `alignItems="center"`; `flexShrink={0}` so
 * rows clip rather than reflow on short terminals.
 */
export function AnimatedBanner(): ReactElement {
  const record = getHexagramRecord(SETTLED_HEXAGRAM)
  // The tuple is bottom-first; the banner draws the top line first.
  const topDownLines = SETTLED_HEXAGRAM.toReversed()

  return (
    <Box flexDirection="column" alignItems="center" flexShrink={0}>
      {topDownLines.map((line, index) => {
        const cells = deriveBannerLine(polarityOf(line), false, false)
        // Slice 1 renders only the `static` role: bold-grey bar, normal-grey
        // value. Slice 2 generalises this to the pulsing-red moving roles.
        return (
          <Text key={index}>
            {`${NORMAL_GREY}${cells.value}${NORMAL}  ${BOLD_GREY}${cells.bar}${NORMAL}`}
          </Text>
        )
      })}
      <Text> </Text>
      <Text>{`${NORMAL_GREY}${record.Name.Chinese.Traditional}${NORMAL}`}</Text>
      <Text>{`${NORMAL_GREY}${record.Name.English.WilhelmBaynes}${NORMAL}`}</Text>
    </Box>
  )
}
