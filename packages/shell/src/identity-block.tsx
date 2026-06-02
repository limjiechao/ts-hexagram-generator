// `<IdentityBlock>` — the static identity block beneath the home banner: a
// centred seal, motto, divider, wordmark, and tagline. Pure presentation: no
// state, no input, no animation. It is a sibling of `<AnimatedBanner>` rather
// than a child so that, once Slice 2 brings the banner to life, the banner's
// per-tick re-render never touches this block.

import { NORMAL, NORMAL_GREY, WHITE } from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

// Seal + motto use the ideographic space (U+3000) between glyphs.
const SEAL = '易　筮　占'
const MOTTO = '黑窗問易　受命終端'
const DIVIDER = '──── ◇ ────'
// RubiFont figlet rendering of "HEXAGRAM" (4 rows, each exactly 42 columns
// wide) drawn with Unicode quadrant block elements (U+2580–U+259F). The
// uniform width matters: Ink's `alignItems="center"` centres each `<Text>`
// row independently, so equal-width rows shift by the same amount and stay
// vertically aligned. 42 cols sits comfortably inside the 80-col home-screen
// baseline.
const WORDMARK_LINES = [
  '▗▖ ▗▖▗▄▄▄▖▗▖  ▗▖ ▗▄▖  ▗▄▄▖▗▄▄▖  ▗▄▖ ▗▖  ▗▖',
  '▐▌ ▐▌▐▌    ▝▚▞▘ ▐▌ ▐▌▐▌   ▐▌ ▐▌▐▌ ▐▌▐▛▚▞▜▌',
  '▐▛▀▜▌▐▛▀▀▘  ▐▌  ▐▛▀▜▌▐▌▝▜▌▐▛▀▚▖▐▛▀▜▌▐▌  ▐▌',
  '▐▌ ▐▌▐▙▄▄▖▗▞▘▝▚▖▐▌ ▐▌▝▚▄▞▘▐▌ ▐▌▐▌ ▐▌▐▌  ▐▌',
]
const TAGLINE = 'Yijing Yarrow Oracle in your terminal'

/**
 * The static identity block. Centred via Ink's `alignItems="center"` (Ink
 * measures `<Text>` width CJK-aware); `flexShrink={0}` so the rows clip rather
 * than reflow on terminals shorter than the 80×24 baseline.
 */
export function IdentityBlock(): ReactElement {
  return (
    <Box flexDirection="column" alignItems="center" flexShrink={0}>
      <Text>{`${WHITE}${SEAL}${NORMAL}`}</Text>
      <Text>{`${NORMAL_GREY}${MOTTO}${NORMAL}`}</Text>
      <Text>{`${NORMAL_GREY}${DIVIDER}${NORMAL}`}</Text>
      {WORDMARK_LINES.map((line, index) => (
        // `index` is a stable key: five fixed positional rows of ASCII art,
        // never reordered or filtered — the row position IS its identity.
        <Text key={index}>{`${WHITE}${line}${NORMAL}`}</Text>
      ))}
      <Text>{`${NORMAL_GREY}${TAGLINE}${NORMAL}`}</Text>
    </Box>
  )
}
