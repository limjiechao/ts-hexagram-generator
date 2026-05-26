// `<ReadingsPanel>` — the scrollable readings strip shown below the
// hexagram cards when exactly one line is moving. Renders the focused
// moving line's scripture and exegesis (image-wing / 象傳) in both
// Traditional Chinese and Wilhelm-Baynes English, ANSI-wrapped to a
// host-supplied column width and clipped to a host-supplied viewport
// height. Scroll state lives in `<PlaygroundApp>`; this component is
// presentational.
//
// Mount condition is the host's responsibility: it must only mount this
// component iff `derivation.singleMovingIndex !== null`. For 0 or 2+
// moving lines the strip is suppressed entirely (the playground is a
// fiddler, not a divination flow — no 用九/用六 or stacked multi-line
// judgments).

import { getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/types'
import {
  BOLD_GREY,
  BOLD_WHITE,
  NORMAL,
  NORMAL_GREY,
  ScrollableSection,
  wrapToWidth,
} from '@hexagram/viewer-core'
import { useEffect, type ReactElement } from 'react'

interface ReadingsPanelProps {
  /** The standing hexagram — used to look up the line's scripture/exegesis. */
  readonly standing: Hexagram
  /**
   * The 0-based bottom-first index of the single moving line (0 → Line 1,
   * 5 → Line 6). The host only mounts this strip when exactly one line is
   * moving, so this is always a valid line index.
   */
  readonly movingLineIndex: 0 | 1 | 2 | 3 | 4 | 5
  /**
   * Width to which the readings content is hard-wrapped — pinned by the
   * caller to the top-half's `TOP_HALF_WIDTH` so the bottom half never
   * exceeds the top half's footprint.
   */
  readonly wrapWidth: number
  /**
   * Vertical viewport height in rows — the host computes this from
   * remaining space below the top-half hexagrams. Always ≥ 1.
   */
  readonly viewportHeight: number
  /**
   * Scroll offset in rows (0-based), provided by the host. The component
   * is presentational — scroll state lives in `<PlaygroundApp>`.
   */
  readonly scrollOffset: number
  /**
   * Reports `totalRows` back to the host on every render so the host can
   * clamp the scroll offset and size the scrollbar. Deferred via
   * `useEffect` so the callback lands AFTER the render commit and never
   * triggers a parent setState-during-render warning.
   */
  readonly onMeasure?: (totalRows: number) => void
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

export function ReadingsPanel({
  standing,
  movingLineIndex,
  wrapWidth,
  viewportHeight,
  scrollOffset,
  onMeasure,
}: ReadingsPanelProps): ReactElement {
  const content = buildContent(standing, movingLineIndex)
  const wrapped = wrapToWidth(content, wrapWidth)
  const rows = wrapped.split('\n')
  const totalRows = rows.length

  useEffect(() => {
    onMeasure?.(totalRows)
  }, [onMeasure, totalRows])

  const safeOffset = Math.max(
    0,
    Math.min(scrollOffset, Math.max(0, totalRows - 1)),
  )
  const visible = rows.slice(
    safeOffset,
    safeOffset + Math.max(1, viewportHeight),
  )

  return (
    <ScrollableSection
      rows={visible}
      viewportHeight={Math.max(1, viewportHeight)}
    />
  )
}
