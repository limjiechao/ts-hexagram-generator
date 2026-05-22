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
const WORDMARK = 'H · E · X · A · G · R · A · M'
const TAGLINE = 'the Yijing Yarrow Oracle — in your terminal'

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
      <Text>{`${WHITE}${WORDMARK}${NORMAL}`}</Text>
      <Text>{`${NORMAL_GREY}${TAGLINE}${NORMAL}`}</Text>
    </Box>
  )
}
