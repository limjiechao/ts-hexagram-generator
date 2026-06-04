import type { Hexagram, Line } from '@hexagram/core/types'
import { MOVING_ARROW, STATIC_GAP } from '@hexagram/readout'
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

import {
  BAR_BLOCK_WIDTH,
  CHEVRON_WIDTH,
  GAP_WIDTH,
  IDENTITY_DIVIDER_WIDTH,
  LEFT_IDENTITY_CELL_WIDTH,
  RIGHT_IDENTITY_CELL_WIDTH,
  TOP_HALF_WIDTH,
} from './playground-display-geometry.js'
import { identityRows } from './playground-display-identity.js'
import { padCellToWidth, padRightToWidth } from './playground-display-text.js'

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function buildHeaderRow(): string {
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

export function buildLineRow(input: LineRowInputs): string {
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

export function buildIdentityStack(
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
