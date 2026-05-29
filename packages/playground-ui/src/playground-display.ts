// Pure renderer for the Playground's P6 top-half layout. Builds the
// 13-row ANSI block consumed by `<PlaygroundApp>` (header row + 6 line rows
// + blank + 4 identity rows + divider between rows 2 and 3 of the identity
// stack). No React, no Ink — every output is a deterministic function of
// the inputs, so the geometry, padding, dim-ghost behaviour, and chevron
// placement are all unit-testable without rendering.
//
// Single-column geometry model (all three layers share one anchor):
//
//   col 0 1 2 ........... 26 27 .......... 45 46 .......... 70 71 ... 87
//       [chev]   [bar block 25]  [gap 19]      [bar block 25]   [pad]
//       └─ chevron(2)  └─ value(1)+2sp+bar(9)+2sp+pos(11) ─┘
//
//   * Line rows:        chevron + standing(25) + gap(19) + emerging(25) → pad to TOP_HALF_WIDTH
//   * Header row:       blank chev + 'Standing Hexagram' left-flush in 25 + gap(19) +
//                       'Emerging Hexagram' left-flush in 25 → pad. The "S" / "E"
//                       sit directly above the line value digits below them, so
//                       the header lines up with the casting viewer's
//                       transformation tab.
//   * Identity rows:    blank chev + left-flush ID (≤ 44 cols, overlaps into gap on left only)
//                       + right-flush anchor at col 46 + left-flush ID (≤ 42 cols)
//
// `TOP_HALF_WIDTH` is driven by the worst-case identity row on the right side
// (where the chevron column isn't reserved), so the right ID extends from
// col 46 to col 46 + max(RIGHT_LINE_WIDTH, IDENTITY_STACK_WIDTH).
//
// When `hasMoving === false`, the emerging side is a "dim ghost" — same
// identity as standing but rendered in NORMAL_GREY everywhere.

import { getHexagramRecord, getTrigramRecord } from '@hexagram/core/getters'
import type { Hexagram, Line } from '@hexagram/core/types'
import { MOVING_ARROW, POSITION_LABELS, STATIC_GAP } from '@hexagram/readout'
import {
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  deriveBannerLine,
  isMovingLine,
  NORMAL,
  NORMAL_GREY,
  polarityOf,
} from '@hexagram/viewer-core'

// ---------------------------------------------------------------------------
// Geometry constants (single-column model)
// ---------------------------------------------------------------------------

/** Focus-chevron column (always reserved, even when not focused). */
export const CHEVRON_WIDTH = 2

/**
 * Width of the bar+pos block on each side (no chevron):
 *   value(1) + 2sp + bar(9) + 2sp + pos(11) = 25 cols.
 */
export const BAR_BLOCK_WIDTH = 25

/** Width of the left line cell (chevron + bar block). */
export const LEFT_LINE_WIDTH: number = CHEVRON_WIDTH + BAR_BLOCK_WIDTH

/** Width of the right line cell (no chevron on the right). */
export const RIGHT_LINE_WIDTH: number = BAR_BLOCK_WIDTH

/**
 * Inter-column gap width — matches the casting viewer's `MOVING_ARROW` /
 * `STATIC_GAP` width (19 cols) so the playground sits flush with the
 * transformation section's geometry.
 */
export const GAP_WIDTH = 19

/**
 * Worst-case identity-stack row width in display cols, scanned across all
 * 64 hexagrams. As of 2026-05-26 the worst case is hexagram #9 小畜
 * (Hsiao Ch’u / The Taming Power of the Small — 42 cols on the Wilhelm-Baynes
 * row); the new trigram rows (`Upper: 巽 Xùn (Wind, wood)` etc., 26 cols max)
 * are narrower than that. Re-run the scan after any hexagram-data change:
 *
 *   pnpm --filter @hexagram/playground-ui exec tsx \
 *     scripts/measure-identity-stack-width.ts
 *
 * The `top-half-width-invariant.test.ts` test guards this constant — it fails
 * if the actual max ever exceeds `IDENTITY_STACK_WIDTH`.
 */
export const IDENTITY_STACK_WIDTH = 42

/**
 * Right-side identity cell width: the larger of the line block and the
 * identity-stack row. Drives where the row's right padding starts.
 */
const RIGHT_IDENTITY_CELL_WIDTH: number = Math.max(
  RIGHT_LINE_WIDTH,
  IDENTITY_STACK_WIDTH,
)

/**
 * Left-side identity cell width: stretches from after the chevron (col 2) up
 * to the start of the right column (col `LEFT_LINE_WIDTH + GAP_WIDTH = 46`),
 * so identity rows up to 44 cols sit before the right column begins. The
 * worst-case identity (42 cols) fits with 2 cols of margin.
 */
const LEFT_IDENTITY_CELL_WIDTH: number =
  LEFT_LINE_WIDTH + GAP_WIDTH - CHEVRON_WIDTH

/** Total display width of every emitted row. */
export const TOP_HALF_WIDTH: number =
  LEFT_LINE_WIDTH + GAP_WIDTH + RIGHT_IDENTITY_CELL_WIDTH

/**
 * Number of rows in the top-half block: 1 header + 6 line rows + 1 blank
 * + 2 name rows + 1 divider + 2 trigram rows = 13. Exported so
 * `<PlaygroundApp>` can size its top-half slot without re-deriving the
 * row count.
 */
export const TOP_HALF_ROWS = 13

// ---------------------------------------------------------------------------
// CJK-aware width measurement (replicates `visualWidth` from
// `viewer-core/output-sections.ts` — kept local so this module has no
// internal-only import on a viewer-core helper).
// ---------------------------------------------------------------------------

export function visualWidth(text: string): number {
  let width = 0
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0
    const isFullwidth =
      (codePoint >= 0x1100 && codePoint <= 0x115f) ||
      (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
      (codePoint >= 0x3041 && codePoint <= 0x33ff) ||
      (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
      (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
      (codePoint >= 0xa000 && codePoint <= 0xa4cf) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff01 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    width += isFullwidth ? 2 : 1
  }
  return width
}

const ANSI_PATTERN = /\[[0-9;]*m/g

function plainVisualWidth(text: string): number {
  return visualWidth(text.replace(ANSI_PATTERN, ''))
}

function padRightToWidth(row: string, target: number): string {
  const gap = target - plainVisualWidth(row)
  return gap > 0 ? `${row}${' '.repeat(gap)}` : row
}

// Pad an already-coloured cell to `target` display cols. ANSI codes are
// zero-width, so we measure only the plain content.
function padCellToWidth(cell: string, target: number): string {
  const gap = target - plainVisualWidth(cell)
  return gap > 0 ? `${cell}${' '.repeat(gap)}` : cell
}

function capitalizeFirst(text: string): string {
  if (text.length === 0) return text
  return `${text[0]!.toUpperCase()}${text.slice(1)}`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PlaygroundDisplayInputs {
  readonly standing: Hexagram
  /** Already computed by caller via `getEmergingHexagram`. */
  readonly emerging: Hexagram
  /** 0..5 bottom-first cursor; always supplied by the playground reducer. */
  readonly focusIndex: number
  /** Pulse beat from `usePulse`; only consulted for moving lines. */
  readonly pulse: boolean
  /** Whether the standing hexagram has any moving lines. */
  readonly hasMoving: boolean
}

export interface PlaygroundDisplayOutput {
  /** Rendered ANSI rows, in render order, ready for one-per-`<Text>` emission. */
  readonly rows: string[]
  /** Total display width (cols) of every row. */
  readonly width: number
}

/**
 * Build the playground's top-half display block: header + 6 line rows
 * + blank + 2 name rows + 1 divider + 2 trigram rows = `TOP_HALF_ROWS`
 * rows total. Every row is padded to exactly `TOP_HALF_WIDTH` display
 * columns.
 */
export function buildPlaygroundDisplay(
  inputs: PlaygroundDisplayInputs,
): PlaygroundDisplayOutput {
  const { standing, emerging, focusIndex, pulse, hasMoving } = inputs

  const rows: string[] = []
  rows.push(buildHeaderRow())
  // Render top-down: L6, L5, ..., L1 (line at bottom is first; displayed at
  // the bottom of the block). `lineIndex` is the bottom-first 0..5 index used
  // to match `focusIndex`.
  for (let lineIndex = 5; lineIndex >= 0; lineIndex--) {
    rows.push(
      buildLineRow({
        standingLine: standing[lineIndex] as Line,
        emergingLine: emerging[lineIndex] as Line,
        positionLabel:
          POSITION_LABELS[(lineIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6],
        focused: focusIndex === lineIndex,
        pulse,
        hasMoving,
      }),
    )
  }
  rows.push(
    padRightToWidth('', TOP_HALF_WIDTH),
    ...buildIdentityStack(standing, emerging, hasMoving),
  )

  return { rows, width: TOP_HALF_WIDTH }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function buildHeaderRow(): string {
  // The chevron column stays blank; "Standing Hexagram" is left-flush at the
  // start of the 25-col bar block (col 2), so the "S" sits directly above
  // each line row's value digit. The gap is 19 cols (cols 27..45);
  // "Emerging Hexagram" is left-flush at the right column anchor (col 46),
  // again aligning with the right-column value digits. Trailing padding
  // fills out to TOP_HALF_WIDTH. Matches the casting viewer's
  // `transformationSection` header.
  const chevronPad = ' '.repeat(CHEVRON_WIDTH)
  const left = padCellToWidth(
    `${BOLD_GREY}Standing Hexagram${NORMAL}`,
    BAR_BLOCK_WIDTH,
  )
  const right = padCellToWidth(
    `${BOLD_GREY}Emerging Hexagram${NORMAL}`,
    BAR_BLOCK_WIDTH,
  )
  const gap = ' '.repeat(GAP_WIDTH)
  return padRightToWidth(`${chevronPad}${left}${gap}${right}`, TOP_HALF_WIDTH)
}

// ---------------------------------------------------------------------------
// Line rows
// ---------------------------------------------------------------------------

interface LineRowInputs {
  readonly standingLine: Line
  readonly emergingLine: Line
  readonly positionLabel: string
  readonly focused: boolean
  readonly pulse: boolean
  readonly hasMoving: boolean
}

function buildLineRow(input: LineRowInputs): string {
  const {
    standingLine,
    emergingLine,
    positionLabel,
    focused,
    pulse,
    hasMoving,
  } = input
  const moving = isMovingLine(standingLine)
  const chevron = focused ? '› ' : '  '

  // Standing side: use `deriveBannerLine` so the bar + value vocabulary
  // matches the home banner / casting readout. The pulse flag flips the
  // moving-bar colour between bright and dim red; the bar glyph itself is
  // identical on either beat.
  const standingCells = deriveBannerLine(
    polarityOf(standingLine),
    moving,
    pulse,
  )
  const emergingCells = deriveBannerLine(polarityOf(emergingLine), false, pulse)

  // Mirror `transformationSection`'s colour scheme: standing moving lines are
  // BOLD_RED (no pulse-dim flicker — the playground's pulse only matters when
  // the cursor pauses on a moving line and the user wants to see motion); the
  // emerging side is BOLD_WHITE normally, NORMAL_GREY when the standing has
  // no moving lines (the "ghost mirror").
  const standingColor = moving ? BOLD_RED : BOLD_WHITE
  const emergingColor = hasMoving ? BOLD_WHITE : NORMAL_GREY
  const positionColor = hasMoving ? NORMAL : NORMAL_GREY
  const gap = moving ? MOVING_ARROW : STATIC_GAP

  const leftCell =
    `${chevron}${standingColor}${standingCells.value}${NORMAL}` +
    `  ${standingColor}${standingCells.bar}${NORMAL}` +
    `  ${positionLabel}`

  const rightCell =
    `${emergingColor}${emergingCells.value}${NORMAL}` +
    `  ${emergingColor}${emergingCells.bar}${NORMAL}` +
    `  ${positionColor}${positionLabel}${NORMAL}`

  return padRightToWidth(`${leftCell}${gap}${rightCell}`, TOP_HALF_WIDTH)
}

// ---------------------------------------------------------------------------
// Identity stack (below the line rows)
// ---------------------------------------------------------------------------

/**
 * Visible width of the identity-stack divider on each side — matches the
 * bar block above so the divider lines up with the hexagram structure.
 */
const IDENTITY_DIVIDER_WIDTH = BAR_BLOCK_WIDTH

function buildIdentityStack(
  standing: Hexagram,
  emerging: Hexagram,
  hasMoving: boolean,
): string[] {
  const standingId = identityRows(standing)
  // When no moving lines: the emerging side shows the SAME identity as the
  // standing, but every cell renders in NORMAL_GREY (the "ghost mirror"). When
  // moving lines exist: the emerging side shows the actual emerging
  // hexagram's identity, in its normal colour.
  const emergingId = identityRows(hasMoving ? emerging : standing)
  const emergingDim = !hasMoving

  // Per-row colour choices for the standing column:
  //   row1 (#N Chinese（pinyin）) : BOLD_WHITE
  //   row2 (Wilhelm-Baynes EN)    : NORMAL_GREY
  //   row3 (Upper: trigram)       : NORMAL_GREY
  //   row4 (Lower: trigram)       : NORMAL_GREY
  const standingColors = [BOLD_WHITE, NORMAL_GREY, NORMAL_GREY, NORMAL_GREY]
  // Emerging column uses NORMAL_GREY everywhere in dim mode; otherwise mirror
  // the standing scheme.
  const emergingColors = emergingDim
    ? [NORMAL_GREY, NORMAL_GREY, NORMAL_GREY, NORMAL_GREY]
    : [BOLD_WHITE, NORMAL_GREY, NORMAL_GREY, NORMAL_GREY]

  const chevronPad = ' '.repeat(CHEVRON_WIDTH)
  const rows: string[] = []
  for (let rowIndex = 0; rowIndex < 4; rowIndex++) {
    const leftText = standingId[rowIndex] ?? ''
    const rightText = emergingId[rowIndex] ?? ''
    const leftColor = standingColors[rowIndex] ?? NORMAL
    const rightColor = emergingColors[rowIndex] ?? NORMAL
    // Left identity is left-flush at col 2, padded to fill cols 2..45 (so the
    // right column always starts at col 46, matching the line rows).
    const leftCell = padCellToWidth(
      `${leftColor}${leftText}${NORMAL}`,
      LEFT_IDENTITY_CELL_WIDTH,
    )
    // Right identity is left-flush at col 46, padded out to its cell width.
    const rightCell = padCellToWidth(
      `${rightColor}${rightText}${NORMAL}`,
      RIGHT_IDENTITY_CELL_WIDTH,
    )
    rows.push(
      padRightToWidth(`${chevronPad}${leftCell}${rightCell}`, TOP_HALF_WIDTH),
    )
    // After the English-name row (index 1), insert a divider that visually
    // separates the name block above from the trigram block below.
    if (rowIndex === 1) {
      rows.push(buildIdentityDivider())
    }
  }
  return rows
}

function buildIdentityDivider(): string {
  const chevronPad = ' '.repeat(CHEVRON_WIDTH)
  const dashes = '─'.repeat(IDENTITY_DIVIDER_WIDTH)
  const left = padCellToWidth(
    `${NORMAL_GREY}${dashes}${NORMAL}`,
    LEFT_IDENTITY_CELL_WIDTH,
  )
  const right = padCellToWidth(
    `${NORMAL_GREY}${dashes}${NORMAL}`,
    RIGHT_IDENTITY_CELL_WIDTH,
  )
  return padRightToWidth(`${chevronPad}${left}${right}`, TOP_HALF_WIDTH)
}

function identityRows(
  hexagram: Hexagram,
): readonly [string, string, string, string] {
  const record = getHexagramRecord(hexagram)
  // The template-literal types on `WenWang`, `Chinese.Traditional`, and
  // `Pinyin` produce a 64-way union when composed inside a single template;
  // `String(...)` collapses each to `string` and keeps tsc's checker tractable.
  const wenwang = String(record.Metadata.Order.WenWang)
  const chinese = String(record.Name.Chinese.Traditional)
  const pinyin = String(record.Metadata.Pronunciation.Pinyin)
  const english = String(record.Name.English.WilhelmBaynes)
  const upperTrigram = getTrigramRecord(record.Metadata.Trigram.Upper)
  const lowerTrigram = getTrigramRecord(record.Metadata.Trigram.Lower)
  const upperChinese = String(upperTrigram.Name.Chinese.Traditional)
  const lowerChinese = String(lowerTrigram.Name.Chinese.Traditional)
  const upperPinyin = capitalizeFirst(
    String(upperTrigram.Metadata.Pronunciation.Pinyin),
  )
  const lowerPinyin = capitalizeFirst(
    String(lowerTrigram.Metadata.Pronunciation.Pinyin),
  )
  const upperEnglish = capitalizeFirst(
    String(upperTrigram.Imagery.English.WilhelmBaynes),
  )
  const lowerEnglish = capitalizeFirst(
    String(lowerTrigram.Imagery.English.WilhelmBaynes),
  )
  return [
    `#${wenwang} ${chinese}（${pinyin}）`,
    english,
    `Upper: ${upperChinese} ${upperPinyin} (${upperEnglish})`,
    `Lower: ${lowerChinese} ${lowerPinyin} (${lowerEnglish})`,
  ] as const
}
