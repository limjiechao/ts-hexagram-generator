import type { DerivedSplit } from '@hexagram/core/casting-derivation'
import { centerVisual, padStartVisual } from '@hexagram/text-layout'

import type { LedgerRow } from './ir.js'
import { LEDGER_COLUMNS, LINE_LABELS } from './vocabulary.js'

/** The medium a serializer injects into the shared ledger geometry. Markdown
 *  passes identity callbacks + a plain gutter; ANSI passes its palette runs. */
export interface LedgerStyle {
  /** Inter-cell gutter — ANSI: ` <grey>│</reset> `; Markdown: ` │ `. */
  readonly gutter: string
  /** Banner (左Left/右Right) + column-header cells (ANSI: HEADING_GREY). */
  readonly heading: (text: string) => string
  /** A complete rule row, post-join (ANSI: NORMAL_GREY wrap; Markdown: id). */
  readonly rule: (text: string) => string
  /** One padded data cell, by column key + row (ANSI: per-column colour). */
  readonly dataCell: (columnKey: string, text: string, row: LedgerRow) => string
  /** A `·` placeholder cell for a null split (ANSI: PLACEHOLDER_GREY).
   *  Markdown only renders full records, so it passes a throwing function. */
  readonly placeholder: (dot: string) => string
}

const INDENT = '   '

// The ten data columns after line+cast, in fixed order (matches both legacy
// serializers). `sigma` maps to the DerivedSplit `combinedPiles` field; the
// rest share the column key with their field name.
const DATA_KEYS = [
  'stalks',
  'leftHeap',
  'leftPiles',
  'leftRemainder',
  'rightHeap',
  'rightPiles',
  'held',
  'rightRemainder',
  'setAside',
  'sigma',
] as const

const colWidth = (key: string): number =>
  LEDGER_COLUMNS.find((c) => c.key === key)!.width

// The padded raw value for one data column. `sigma` carries the `⇒ ` prefix on
// the third cast (the line value); every other column is its DerivedSplit field.
function cellContent(key: string, d: DerivedSplit, row: LedgerRow): string {
  if (key === 'sigma') {
    const raw =
      row.castNumber === 3 ? `⇒ ${d.combinedPiles}` : String(d.combinedPiles)
    return padStartVisual(raw, colWidth('sigma'))
  }
  return padStartVisual(String(d[key as keyof DerivedSplit]), colWidth(key))
}

/**
 * Assemble the CASTING ledger block (banner row, header row, header rule, and
 * the 18 data rows with their block rules) from the IR rows + a medium style.
 * The single home for ledger geometry: span math, gutter join, the `═╪═` /
 * `─┼─` rule joiners, and the null→placeholder branch live here once. Returns
 * the block WITHOUT the `CASTING:` / `## CASTING` heading or ```text fence —
 * each serializer keeps its own heading wrapper.
 */
export function ledgerBlock(
  rows: readonly LedgerRow[],
  style: LedgerStyle,
): string {
  const { gutter, heading, rule, dataCell, placeholder } = style
  const blank = (key: string): string => ' '.repeat(colWidth(key))

  // Banner row: 左Left / 右Right each span their sub-columns plus the interior
  // 3-col gutters between them.
  const leftSpan =
    colWidth('leftHeap') + 3 + colWidth('leftPiles') + 3 + colWidth('leftRemainder')
  const rightSpan =
    colWidth('rightHeap') +
    3 +
    colWidth('rightPiles') +
    3 +
    colWidth('held') +
    3 +
    colWidth('rightRemainder')
  const bannerRow =
    INDENT +
    [blank('line'), blank('cast'), blank('stalks')].join(gutter) +
    gutter +
    heading(centerVisual('左Left', leftSpan)) +
    gutter +
    heading(centerVisual('右Right', rightSpan)) +
    gutter +
    [blank('setAside'), blank('sigma')].join(gutter)

  const headerRow =
    INDENT +
    LEDGER_COLUMNS.map((c) => heading(padStartVisual(c.header, c.width))).join(
      gutter,
    )

  const headerRule =
    INDENT + rule(LEDGER_COLUMNS.map((c) => '═'.repeat(c.width)).join('═╪═'))
  const blockRule =
    INDENT + rule(LEDGER_COLUMNS.map((c) => '─'.repeat(c.width)).join('─┼─'))

  const dataRow = (row: LedgerRow): string => {
    const cells: string[] = [
      dataCell(
        'line',
        padStartVisual(
          row.showLine ? LINE_LABELS[row.lineNumber] : '',
          colWidth('line'),
        ),
        row,
      ),
      dataCell('cast', padStartVisual(String(row.castNumber), colWidth('cast')), row),
    ]
    if (row.cell === null) {
      for (const key of DATA_KEYS)
        cells.push(padStartVisual(placeholder('·'), colWidth(key)))
    } else {
      const d = row.cell
      for (const key of DATA_KEYS)
        cells.push(dataCell(key, cellContent(key, d, row), row))
    }
    return INDENT + cells.join(gutter)
  }

  const body = rows
    .map((row) => (row.trailingRule ? `${dataRow(row)}\n${blockRule}` : dataRow(row)))
    .join('\n')

  return `${bannerRow}\n${headerRow}\n${headerRule}\n${body}`
}
