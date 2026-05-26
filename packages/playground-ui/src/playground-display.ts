// Pure renderer for the Playground's P6 top-half layout. Builds the
// 12-row ANSI block consumed by `<PlaygroundApp>` (header row + blank + 6
// line rows + blank + 4 identity rows). No React, no Ink — every output is a
// deterministic function of the inputs, so the geometry, padding, dim-ghost
// behaviour, and chevron placement are all unit-testable without rendering.
//
// Visual blueprint per line row:
//
//   [chevron 2]  [value 1]  [2 sp]  [bar 9]  [2 sp]  [pos 11]
//     [arrow/gap 19]
//   [value 1]  [2 sp]  [bar 9]  [2 sp]  [pos 11]
//     [right-pad to TOP_HALF_WIDTH]
//
// Header row centers `Standing` / `Emerging` over each COLUMN_WIDTH column.
// Identity stack (4 rows below) shows hexagram identity + trigrams in two
// COLUMN_WIDTH columns separated by GAP_WIDTH.
//
// When `hasMoving === false`, the emerging side is a "dim ghost" — same
// identity as standing but rendered in NORMAL_GREY everywhere.

import { getHexagramRecord, getTrigramRecord } from '@hexagram/core/getters'
import type { Hexagram, Line } from '@hexagram/types'
import {
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  deriveBannerLine,
  isMovingLine,
  MOVING_ARROW,
  NORMAL,
  NORMAL_GREY,
  polarityOf,
  POSITION_LABELS,
  STATIC_GAP,
} from '@hexagram/viewer-core'

// ---------------------------------------------------------------------------
// Geometry constants
// ---------------------------------------------------------------------------

/**
 * Column width (display cols) for each side of the playground top half.
 * Picked to fit both the line area (27 cols) and the widest identity-stack
 * row across all 64 hexagrams plus a small buffer.
 *
 * As of 2026-05-26 the worst case is hexagram #9 小畜
 * (Hsiao Ch’u / The Taming Power of the Small — 42 cols on the Wilhelm-Baynes
 * row); 42 + 2 = 44. Re-run the scan after any hexagram-data change:
 *
 *   pnpm --filter @hexagram/playground-ui exec tsx \
 *     scripts/measure-identity-stack-width.ts
 *
 * The `top-half-width-invariant.test.ts` test guards this constant — it fails
 * if the actual max ever exceeds COLUMN_WIDTH.
 */
export const COLUMN_WIDTH = 44

/**
 * Inter-column gap width — matches the casting viewer's `MOVING_ARROW` /
 * `STATIC_GAP` width (19 cols) so the playground sits flush with the
 * transformation section's geometry.
 */
export const GAP_WIDTH = 19

/** Total display width of every emitted row. */
export const TOP_HALF_WIDTH: number = COLUMN_WIDTH * 2 + GAP_WIDTH

// ---------------------------------------------------------------------------
// Trigram unicode symbols (FuxiOrder 1..8). Inlined so this display module
// owns its glyph vocabulary independently of any React component.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CJK-aware width measurement (replicates `visualWidth` from
// `viewer-core/output-sections.ts` — kept local so this module has no
// internal-only import on a viewer-core helper).
// ---------------------------------------------------------------------------

function visualWidth(text: string): number {
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

function padCenterToWidth(
  text: string,
  target: number,
  color?: string,
): string {
  const textWidth = visualWidth(text)
  const total = Math.max(0, target - textWidth)
  const leftPad = Math.floor(total / 2)
  const rightPad = total - leftPad
  const body = color ? `${color}${text}${NORMAL}` : text
  return `${' '.repeat(leftPad)}${body}${' '.repeat(rightPad)}`
}

// Pad an already-coloured cell to `target` display cols. ANSI codes are
// zero-width, so we measure only the plain content.
function padCellToWidth(cell: string, target: number): string {
  const gap = target - plainVisualWidth(cell)
  return gap > 0 ? `${cell}${' '.repeat(gap)}` : cell
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PlaygroundDisplayInputs {
  readonly standing: Hexagram
  /** Already computed by caller via `getEmergingHexagram`. */
  readonly emerging: Hexagram
  /** 0..5 bottom-first cursor; `null` to hide the chevron entirely. */
  readonly focusIndex: number | null
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
 * Build the playground's top-half display block: header + blank + 6 line rows
 * + blank + 4 identity rows = 12 rows total. Every row is padded to exactly
 * `TOP_HALF_WIDTH` display columns.
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
  // 2-col chevron slot stays empty in the header; centered headings inside
  // each COLUMN_WIDTH column.
  const left = padCenterToWidth('Standing', COLUMN_WIDTH, BOLD_GREY)
  const right = padCenterToWidth('Emerging', COLUMN_WIDTH, BOLD_GREY)
  const gap = ' '.repeat(GAP_WIDTH)
  return padRightToWidth(`${left}${gap}${right}`, TOP_HALF_WIDTH)
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
  //   row3 (upper trigram)        : NORMAL_GREY
  //   row4 (lower trigram)        : NORMAL_GREY
  const standingColors = [BOLD_WHITE, NORMAL_GREY, NORMAL_GREY, NORMAL_GREY]
  // Emerging column uses NORMAL_GREY everywhere in dim mode; otherwise mirror
  // the standing scheme.
  const emergingColors = emergingDim
    ? [NORMAL_GREY, NORMAL_GREY, NORMAL_GREY, NORMAL_GREY]
    : [BOLD_WHITE, NORMAL_GREY, NORMAL_GREY, NORMAL_GREY]

  const rows: string[] = []
  for (let rowIndex = 0; rowIndex < 4; rowIndex++) {
    const leftText = standingId[rowIndex] ?? ''
    const rightText = emergingId[rowIndex] ?? ''
    const leftColor = standingColors[rowIndex] ?? NORMAL
    const rightColor = emergingColors[rowIndex] ?? NORMAL
    const leftCell = padCellToWidth(
      `${leftColor}${leftText}${NORMAL}`,
      COLUMN_WIDTH,
    )
    const rightCell = padCellToWidth(
      `${rightColor}${rightText}${NORMAL}`,
      COLUMN_WIDTH,
    )
    const gap = ' '.repeat(GAP_WIDTH)
    rows.push(padRightToWidth(`${leftCell}${gap}${rightCell}`, TOP_HALF_WIDTH))
  }
  return rows
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
  const upperKey = record.Metadata.Trigram.Upper as unknown as number
  const lowerKey = record.Metadata.Trigram.Lower as unknown as number
  const upperTrigram = getTrigramRecord(upperKey as never)
  const lowerTrigram = getTrigramRecord(lowerKey as never)
  const upperSym =
    TRIGRAM_SYMBOL[String(upperTrigram.Metadata.Order.Fuxi)] ?? '◌'
  const lowerSym =
    TRIGRAM_SYMBOL[String(lowerTrigram.Metadata.Order.Fuxi)] ?? '◌'
  const upperChinese = String(upperTrigram.Name.Chinese.Traditional)
  const lowerChinese = String(lowerTrigram.Name.Chinese.Traditional)
  return [
    `#${wenwang} ${chinese}（${pinyin}）`,
    english,
    `${upperSym} ${upperChinese}`,
    `${lowerSym} ${lowerChinese}`,
  ] as const
}
