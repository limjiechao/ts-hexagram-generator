// `<ReadingsPanel>` — the scrollable readings strip shown below the
// hexagram cards when exactly one line is moving. Purely presentational:
// the host computes the pre-wrapped row array via `buildReadingsRows`
// (exported below) during its own render and passes it down with the
// viewport height and scroll offset. The panel renders the slice; the
// host owns measurement and clamping.
//
// Mount condition is the host's responsibility: it must only mount this
// component iff `derivation.singleMovingIndex !== null`. For 0 or 2+
// moving lines the strip is suppressed entirely (the playground is a
// fiddler, not a divination flow — no 用九/用六 or stacked multi-line
// judgments).

import { getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/core/types'
import {
  BOLD_GREY,
  BOLD_WHITE,
  NORMAL,
  NORMAL_GREY,
  ScrollableSection,
  wrapToWidth,
} from '@hexagram/viewer-core'
import type { ReactElement } from 'react'

interface ReadingsPanelProps {
  /**
   * Pre-built, ANSI-wrapped rows for the readings strip. Produced by
   * `buildReadingsRows()` (exported from this module) and passed down
   * by the host so total-row measurement and scroll clamping happen
   * synchronously during the host's render — no `useEffect` round trip.
   */
  readonly rows: readonly string[]
  /**
   * Vertical viewport height in rows — the host computes this from
   * remaining space below the top-half hexagrams. Always ≥ 1.
   */
  readonly viewportHeight: number
  /**
   * Scroll offset in rows (0-based), already clamped by the host to a
   * valid in-range value. The panel does NOT clamp defensively — an
   * out-of-range offset is a host bug and should surface, not be
   * silently masked.
   */
  readonly scrollOffset: number
}

const LINE_KEYS: readonly ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] = [
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
  'L6',
] as const

// Indent prose payload by two spaces and preserve embedded newlines from
// the Wilhelm-Baynes verse (multi-line stanzas) by re-indenting their
// continuations to match the leading indent. wrapAnsi then re-wraps each
// resulting paragraph to the viewport width.
function indentParagraph(text: string): string {
  return `  ${text.replaceAll('\n', '\n  ')}`
}

function buildContent(
  standing: Hexagram,
  movingLineIndex: 0 | 1 | 2 | 3 | 4 | 5,
): string {
  const { Text: HexText } = getHexagramRecord(standing)
  const lineKey = LINE_KEYS[movingLineIndex]
  const traditionalScripture =
    HexText.Chinese.Traditional.Scripture.Lines[lineKey]
  const englishScripture =
    HexText.English.WilhelmBaynes.Scripture.Lines[lineKey]
  const traditionalExegesis =
    HexText.Chinese.Traditional.Exegesis.Imagery.Lines[lineKey]
  const englishExegesis =
    HexText.English.WilhelmBaynes.Exegesis.Imagery.Lines[lineKey]

  // Single blank rows separate the six blocks; embed ANSI colour
  // markers inline so wrapAnsi treats them as zero-width and breaks
  // visible columns correctly.
  return [
    `${BOLD_GREY}MOVING LINE ${movingLineIndex + 1}${NORMAL}`,
    '',
    '(Scripture)',
    '',
    `${BOLD_WHITE}${indentParagraph(traditionalScripture)}${NORMAL}`,
    '',
    `${NORMAL_GREY}${indentParagraph(englishScripture)}${NORMAL}`,
    '',
    '(Exegesis — 象傳)',
    '',
    `${BOLD_WHITE}${indentParagraph(traditionalExegesis)}${NORMAL}`,
    '',
    `${NORMAL_GREY}${indentParagraph(englishExegesis)}${NORMAL}`,
  ].join('\n')
}

/**
 * Pure row-builder for the readings strip. Returns the ANSI-wrapped
 * rows the host then slices for the panel. Exported so the host can
 * compute `totalRows` synchronously during its render and clamp the
 * scroll offset before passing it down — no `onMeasure` callback,
 * no extra render pass.
 */
export function buildReadingsRows(
  standing: Hexagram,
  movingLineIndex: 0 | 1 | 2 | 3 | 4 | 5,
  wrapWidth: number,
): string[] {
  const content = buildContent(standing, movingLineIndex)
  const wrapped = wrapToWidth(content, wrapWidth)
  return wrapped.split('\n')
}

export function ReadingsPanel({
  rows,
  viewportHeight,
  scrollOffset,
}: ReadingsPanelProps): ReactElement {
  const height = Math.max(1, viewportHeight)
  const visible = rows.slice(scrollOffset, scrollOffset + height)

  return <ScrollableSection rows={visible} viewportHeight={height} />
}
