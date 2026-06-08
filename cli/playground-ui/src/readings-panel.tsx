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

import { movingLineVariants } from '@hexagram/consultation-view/build-view'
import type { TextVariant } from '@hexagram/consultation-view/ir'
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

// The playground strip shows a compact two-variant subset of the IR's four —
// the same Traditional-Chinese + Wilhelm-Baynes pair the identity stack shows.
// These labels are the IR's own (set in `movingLineVariants` / build-view.ts);
// we select against them so the strip and the consultation readout draw the
// per-line text from one derivation.
const TRADITIONAL_CHINESE = 'Traditional Chinese'
const WILHELM_BAYNES = 'English, Wilhelm-Baynes'

// Indent prose payload by two spaces and preserve embedded newlines from
// the Wilhelm-Baynes verse (multi-line stanzas) by re-indenting their
// continuations to match the leading indent. wrapAnsi then re-wraps each
// resulting paragraph to the viewport width.
function indentParagraph(text: string): string {
  return `  ${text.replaceAll('\n', '\n  ')}`
}

// The IR guarantees both labels for a one-moving-line hexagram. A miss means the
// IR's variant set drifted out from under us — surface it rather than render a
// blank block (mirrors this panel's no-defensive-clamp stance).
function requireVariant(
  variants: readonly TextVariant[],
  language: string,
): TextVariant {
  const found = variants.find((variant) => variant.language === language)
  if (found === undefined)
    throw new Error(
      `readings panel: IR has no "${language}" moving-line variant`,
    )
  return found
}

function buildContent(
  standing: Hexagram,
  movingLineIndex: 0 | 1 | 2 | 3 | 4 | 5,
): string {
  // Source the per-line reading text from the IR sub-builder — the single home
  // of that derivation (ADR-0018) — instead of re-traversing the hexagram
  // record. The host only mounts this strip when `standing` has exactly one
  // moving line, which is the line `movingLineIndex` names.
  const variants = movingLineVariants(standing)
  const traditional = requireVariant(variants, TRADITIONAL_CHINESE)
  const wilhelmBaynes = requireVariant(variants, WILHELM_BAYNES)

  // Single blank rows separate the six blocks; embed ANSI colour
  // markers inline so wrapAnsi treats them as zero-width and breaks
  // visible columns correctly.
  return [
    `${BOLD_GREY}MOVING LINE ${movingLineIndex + 1}${NORMAL}`,
    '',
    '(Scripture)',
    '',
    `${BOLD_WHITE}${indentParagraph(traditional.scripture)}${NORMAL}`,
    '',
    `${NORMAL_GREY}${indentParagraph(wilhelmBaynes.scripture)}${NORMAL}`,
    '',
    '(Exegesis — 象傳)',
    '',
    `${BOLD_WHITE}${indentParagraph(traditional.exegesis)}${NORMAL}`,
    '',
    `${NORMAL_GREY}${indentParagraph(wilhelmBaynes.exegesis)}${NORMAL}`,
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
