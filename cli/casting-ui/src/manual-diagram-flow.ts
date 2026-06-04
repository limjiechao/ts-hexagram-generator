import { BOLD_GREEN, BOLD_RED, NORMAL } from '@hexagram/viewer-core'
import stringWidth from 'string-width'

import {
  DIAGRAM_WIDTH,
  LEDGER_VALUE_END_COL,
  LEFT_TEE_COL,
  READOUT_WIDTH,
  RIGHT_TEE_COL,
} from './manual-diagram.js'

// A horizontal connector spanning the two card tees: corners at LEFT_TEE_COL /
// RIGHT_TEE_COL, a `─` bar between them, and a single `stub` at
// LEDGER_VALUE_END_COL — under the last digit of the UNPARTED / COUNTED value
// (`┴` points up to UNPARTED, `┬` points down to COUNTED).
function connectorRow(
  leftCorner: string,
  rightCorner: string,
  stub: string,
): string {
  const cells = Array.from({ length: DIAGRAM_WIDTH }, () => ' ')
  for (let c = LEFT_TEE_COL + 1; c < RIGHT_TEE_COL; c++) cells[c] = '─'
  cells[LEFT_TEE_COL] = leftCorner
  cells[RIGHT_TEE_COL] = rightCorner
  cells[LEDGER_VALUE_END_COL] = stub
  return cells.join('')
}

// A ledger readout: `LABEL    VALUE` — label left, value right-aligned within
// READOUT_WIDTH. ANSI in `value` (the coloured MISSING count) is width-
// discounted via `stringWidth`.
function ledgerRow(label: string, value: string): string {
  const gap = Math.max(1, READOUT_WIDTH - label.length - stringWidth(value))
  return `${label}${' '.repeat(gap)}${value}`
}

/**
 * The 2 rows above the heap-card band: the `UNPARTED STALKS: N` source
 * readout, and the downward-cornered branch directly below it whose `┴` stub
 * points up at the value's last digit. Pure text; aligned to the card
 * geometry above.
 */
export function flowHeaderRows(unparted: number): string[] {
  return [
    ledgerRow('UNPARTED STALKS:', String(unparted)),
    connectorRow('┌', '┐', '┴'),
  ]
}

// MISSING gauge colour: neutral while mid-countdown, green when commit-ready
// (count 0 + fully valid), red on a completed-but-wrong conservation total.
export type MissingColor = 'neutral' | 'green' | 'red'

interface FlowFooterArgs {
  counted: number
  missing: number
  missingColor: MissingColor
}

/**
 * The 4 rows below the heap-card band: the upward-cornered join (its `┬` stub
 * gathers the two card tees and points down at the COUNTED value's last
 * digit), the `COUNTED STALKS: - N` accumulator (subtraction-signed) directly
 * below it, a ledger rule, and the `MISSING STALKS N` conservation gauge —
 * coloured per `missingColor` (green = commit-ready, red = conservation
 * violation, neutral = mid-countdown). Pure text.
 */
const MISSING_WRAP: Record<MissingColor, string> = {
  green: BOLD_GREEN,
  red: BOLD_RED,
  neutral: '',
}

export function flowFooterRows(args: FlowFooterArgs): string[] {
  const { counted, missing, missingColor } = args
  const missingStr = String(missing)
  const wrap = MISSING_WRAP[missingColor]
  const coloredMissing = wrap ? `${wrap}${missingStr}${NORMAL}` : missingStr
  return [
    connectorRow('└', '┘', '┬'),
    ledgerRow('COUNTED STALKS:', `- ${counted}`),
    '─'.repeat(READOUT_WIDTH),
    ledgerRow('MISSING STALKS', coloredMissing),
  ]
}
