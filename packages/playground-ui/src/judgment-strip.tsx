// `<JudgmentStrip>` — the moving-line judgment text shown below the
// hexagram cards when exactly one line is moving. Reads the line's text
// from `getHexagramRecord` for both Traditional Chinese and English
// Wilhelm-Baynes (matching the playground's inline language pair).
//
// Render condition is the host's responsibility: it must mount this
// component iff `derivation.singleMovingIndex !== null`. For 0 or 2+
// moving lines the strip is suppressed entirely (the spec explicitly
// declines to display 用九/用六 or stacked multi-line judgments — the
// playground is a fiddler, not a divination flow).

import { getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/types'
import {
  BOLD_GREY,
  BOLD_WHITE,
  NORMAL,
  NORMAL_GREY,
} from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

interface JudgmentStripProps {
  /** The standing hexagram — used to look up the line's scripture/exegesis. */
  readonly standing: Hexagram
  /**
   * The 0-based bottom-first index of the single moving line (0 → Line 1,
   * 5 → Line 6). The host must only mount this strip when exactly one line
   * is moving, so this is always a valid line index.
   */
  readonly movingLineIndex: 0 | 1 | 2 | 3 | 4 | 5
}

const LINE_KEYS: readonly ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] = [
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
  'L6',
] as const

export function JudgmentStrip({
  standing,
  movingLineIndex,
}: JudgmentStripProps): ReactElement {
  const { Text: HexText } = getHexagramRecord(standing)
  const lineKey = LINE_KEYS[movingLineIndex]
  const traditional = HexText.Chinese.Traditional.Scripture.Lines[lineKey]
  const englishRaw = HexText.English.WilhelmBaynes.Scripture.Lines[lineKey]
  // Wilhelm-Baynes line texts can contain literal newlines (multi-line
  // verse); normalise to a 2-space-indented continuation so the strip
  // reads as one paragraph.
  const english = englishRaw.replaceAll('\n', '\n  ')

  return (
    <Box flexDirection="column" marginTop={1} flexShrink={0}>
      <Text>{`${BOLD_GREY}MOVING LINE ${movingLineIndex + 1}${NORMAL}`}</Text>
      <Box marginTop={1}>
        <Text>{`  ${BOLD_WHITE}${traditional}${NORMAL}`}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>{`  ${NORMAL_GREY}${english}${NORMAL}`}</Text>
      </Box>
    </Box>
  )
}
