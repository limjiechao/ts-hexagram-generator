// `<TrigramPanel>` — one bordered hexagram card (P7 layout):
//   ┌─ STANDING #1 乾 / Qian ──┐
//   │ UPPER  ━━━━━━━━━   L6  │
//   │ ☰ 乾   ━━━━━━━━━   L5  │
//   │ Qian   ━━━━━━━━━   L4  │
//   ├──────────────────────────┤
//   │ LOWER ›━━━━○━━━━   L3  │
//   │ ☰ 乾   ━━━━━━━━━   L2  │
//   │ Qian   ━━━━━━━━━   L1  │
//   └──────────────────────────┘
//
// Six rows split by an upper/lower divider, with a multi-line stack identity
// to the left of each trigram block:
//   row 1: ROLE label ("UPPER" / "LOWER")
//   row 2: ☰ symbol + Traditional Chinese trigram name
//   row 3: Wilhelm-Baynes English trigram name
//
// The card title shows the hexagram identity: #N Chinese / Wilhelm-Baynes.
// Each line row composes `<LineCard>` for the bar glyph and chevron.
//
// When `dim` is true (the emerging side of the playground at 0 moving lines)
// the entire card renders dim-grey — Ink's `<Text dimColor>` wraps each row,
// signalling "no transformation" without collapsing the layout.

import { getHexagramRecord, getTrigramRecord } from '@hexagram/core/getters'
import type { Hexagram, Line } from '@hexagram/types'
import {
  BOLD_GREY,
  isMovingLine,
  NORMAL,
  NORMAL_GREY,
} from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

import { LineCard } from './line-card.js'

// Trigram Unicode symbols, indexed by FuxiOrder (`'1'..'8'`). Order
// references `packages/core/src/models/foundation.ts:TRIGRAM_NAMES`.
const TRIGRAM_SYMBOL: Record<string, string> = {
  '1': '☰',
  '2': '☱',
  '3': '☲',
  '4': '☳',
  '5': '☴',
  '6': '☵',
  '7': '☶',
  '8': '☷',
}

interface TrigramPanelProps {
  /** Card title segment: 'STANDING' or 'EMERGING'. */
  readonly role: 'STANDING' | 'EMERGING'
  /** The six lines, bottom-first (L1 at index 0). */
  readonly hexagram: Hexagram
  /**
   * 0-based bottom-first focus cursor (0..5), or `null` to suppress the
   * chevron entirely (the emerging card never shows a cursor — focus is on
   * the standing).
   */
  readonly focusIndex: number | null
  /** Pulse boolean from `usePulse`; only consulted for moving lines. */
  readonly pulse: boolean
  /**
   * Whether to render the trailing `─→` arrow on each MOVING row. The
   * playground sets this `true` on the standing card so each moving line
   * visibly reaches across to its emerging counterpart; the emerging card
   * sets it `false`.
   */
  readonly showArrows: boolean
  /**
   * Render the whole card in dim grey — used as the "dim ghost mirror" of
   * the standing hexagram on the emerging side when no lines are moving.
   */
  readonly dim?: boolean
}

/** A single trigram block: 3 line rows with a stacked identity column. */
function TrigramBlock(props: {
  readonly role: 'UPPER' | 'LOWER'
  readonly trigramKey: number
  readonly lines: readonly [Line, Line, Line]
  readonly lineNumbers: readonly [
    1 | 2 | 3 | 4 | 5 | 6,
    1 | 2 | 3 | 4 | 5 | 6,
    1 | 2 | 3 | 4 | 5 | 6,
  ]
  readonly focusIndex: number | null
  readonly pulse: boolean
  readonly showArrows: boolean
  readonly dim: boolean
}): ReactElement {
  const trigram = getTrigramRecord(props.trigramKey as never)
  const symbol = TRIGRAM_SYMBOL[String(props.trigramKey)] ?? '◌'
  const chineseName = trigram.Name.Chinese.Traditional
  const englishName = trigram.Name.English.WilhelmBaynes
  const labels: readonly [string, string, string] = [
    props.role,
    `${symbol} ${chineseName}`,
    englishName,
  ]

  return (
    <Box flexDirection="row">
      <Box flexDirection="column" width={9} flexShrink={0}>
        {labels.map((label, rowIndex) => (
          // Positional row keys: three static identity rows per block.
          <Text key={rowIndex} dimColor={props.dim}>
            {`${NORMAL_GREY}${label}${NORMAL}`}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column">
        {props.lines.map((line, rowIndex) => {
          const lineNumber = props.lineNumbers[rowIndex] as
            | 1
            | 2
            | 3
            | 4
            | 5
            | 6
          const focused =
            props.focusIndex !== null && lineNumber === props.focusIndex + 1
          return (
            // Positional row keys: three line rows per block; never
            // reordered.
            <LineCard
              key={rowIndex}
              line={line}
              lineNumber={lineNumber}
              focused={focused}
              pulse={props.pulse}
              arrowConnector={props.showArrows && isMovingLine(line)}
              dim={props.dim}
            />
          )
        })}
      </Box>
    </Box>
  )
}

/**
 * The bordered hexagram card with two trigram blocks split by a horizontal
 * divider. Hexagram identity (#N name / Wilhelm-Baynes) renders above the
 * top border as the card title.
 */
export function TrigramPanel(props: TrigramPanelProps): ReactElement {
  const { role, hexagram, focusIndex, pulse, showArrows, dim = false } = props
  const record = getHexagramRecord(hexagram)
  const wenWang = record.Metadata.Order.WenWang
  const chineseName = record.Name.Chinese.Traditional
  const englishName = record.Name.English.WilhelmBaynes
  const upperKey = record.Metadata.Trigram.Upper
  const lowerKey = record.Metadata.Trigram.Lower

  // Lines bottom-first; render top-first (L6 at top, L1 at bottom).
  const [l1, l2, l3, l4, l5, l6] = hexagram
  const upperLines: readonly [Line, Line, Line] = [l6, l5, l4]
  const lowerLines: readonly [Line, Line, Line] = [l3, l2, l1]
  const upperNumbers: readonly [6, 5, 4] = [6, 5, 4]
  const lowerNumbers: readonly [3, 2, 1] = [3, 2, 1]

  const title = `${role} #${wenWang} ${chineseName} / ${englishName}`

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      flexShrink={0}
    >
      <Text dimColor={dim}>{`${BOLD_GREY}${title}${NORMAL}`}</Text>
      <TrigramBlock
        role="UPPER"
        trigramKey={upperKey as never}
        lines={upperLines}
        lineNumbers={upperNumbers}
        focusIndex={focusIndex}
        pulse={pulse}
        showArrows={showArrows}
        dim={dim}
      />
      <Box>
        <Text
          dimColor={dim}
        >{`${NORMAL_GREY}────────────────────────────${NORMAL}`}</Text>
      </Box>
      <TrigramBlock
        role="LOWER"
        trigramKey={lowerKey as never}
        lines={lowerLines}
        lineNumbers={lowerNumbers}
        focusIndex={focusIndex}
        pulse={pulse}
        showArrows={showArrows}
        dim={dim}
      />
    </Box>
  )
}
