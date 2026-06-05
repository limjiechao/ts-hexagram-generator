// IR → ANSI serializers. Each function owns ONLY medium formatting: the
// viewer-core palette, the text-layout CJK width/padding helpers, and the
// ANSI-coloured ledger gutter. Geometry + glyphs + section order come from
// @hexagram/consultation-view. The byte output is locked by the casting-ui
// plain-output-*.txt + ink-sections-*.json fixtures (see the slice plan).

import {
  type CastingSection,
  LEDGER_COLUMNS,
  type LedgerRow,
  LINE_LABELS,
} from '@hexagram/consultation-view'
import { centerVisual, padStartVisual } from '@hexagram/text-layout'
import {
  BOLD_CYAN,
  BOLD_GREY,
  BOLD_WHITE,
  HEADING_GREY,
  NORMAL,
  NORMAL_GREY,
  PLACEHOLDER_GREY,
  YELLOW,
} from '@hexagram/viewer-core'

const LEDGER_INDENT = '   '
// The inter-cell gutter `│` is painted NORMAL_GREY (matching the rule rows) so
// the whole table reads as one grey grid; the flanking spaces stay uncoloured
// and the ANSI codes are zero-width, so the gutter is exactly 3 visual columns.
const LEDGER_GUTTER = ` ${NORMAL_GREY}│${NORMAL} `

const colWidth = (key: string): number =>
  LEDGER_COLUMNS.find((c) => c.key === key)!.width

export function serializeCastingAnsi(section: CastingSection): string {
  if (section.rows === null)
    return `
${BOLD_GREY}CASTING:${NORMAL}

${NORMAL}Casting not recorded
`.trim()

  const blank = (key: string): string => ' '.repeat(colWidth(key))

  // Banner row: the 左Left / 右Right banners each span their sub-columns plus
  // the interior 3-col gutters between them.
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
  const bannerRow = `${
    LEDGER_INDENT +
    [blank('line'), blank('cast'), blank('stalks')].join(LEDGER_GUTTER) +
    LEDGER_GUTTER
  }${HEADING_GREY}${centerVisual('左Left', leftSpan)}${NORMAL}${
    LEDGER_GUTTER
  }${HEADING_GREY}${centerVisual('右Right', rightSpan)}${NORMAL}${
    LEDGER_GUTTER
  }${[blank('setAside'), blank('sigma')].join(LEDGER_GUTTER)}`

  const headerRow =
    LEDGER_INDENT +
    LEDGER_COLUMNS.map(
      (c) => `${HEADING_GREY}${padStartVisual(c.header, c.width)}${NORMAL}`,
    ).join(LEDGER_GUTTER)

  const headerRule = `${
    LEDGER_INDENT
  }${NORMAL_GREY}${LEDGER_COLUMNS.map((c) => '═'.repeat(c.width)).join('═╪═')}${NORMAL}`
  const blockRule = `${
    LEDGER_INDENT
  }${NORMAL_GREY}${LEDGER_COLUMNS.map((c) => '─'.repeat(c.width)).join('─┼─')}${NORMAL}`

  const dataRow = (row: LedgerRow): string => {
    const lineCell = row.showLine ? LINE_LABELS[row.lineNumber] : ''
    const cells: string[] = [
      `${BOLD_WHITE}${padStartVisual(lineCell, colWidth('line'))}${NORMAL}`,
      `${NORMAL_GREY}${padStartVisual(String(row.castNumber), colWidth('cast'))}${NORMAL}`,
    ]
    if (row.cell === null) {
      for (const key of [
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
      ])
        cells.push(
          `${PLACEHOLDER_GREY}${padStartVisual('·', colWidth(key))}${NORMAL}`,
        )
    } else {
      const d = row.cell
      const plain = (value: number, key: string): string =>
        padStartVisual(String(value), colWidth(key))
      cells.push(
        `${NORMAL_GREY}${plain(d.stalks, 'stalks')}${NORMAL}`,
        plain(d.leftHeap, 'leftHeap'),
        plain(d.leftPiles, 'leftPiles'),
        `${YELLOW}${plain(d.leftRemainder, 'leftRemainder')}${NORMAL}`,
        plain(d.rightHeap, 'rightHeap'),
        plain(d.rightPiles, 'rightPiles'),
        `${NORMAL_GREY}${plain(d.held, 'held')}${NORMAL}`,
        `${YELLOW}${plain(d.rightRemainder, 'rightRemainder')}${NORMAL}`,
        `${NORMAL_GREY}${plain(d.setAside, 'setAside')}${NORMAL}`,
        row.castNumber === 3
          ? `${BOLD_CYAN}${padStartVisual(`⇒ ${d.combinedPiles}`, colWidth('sigma'))}${NORMAL}`
          : padStartVisual(String(d.combinedPiles), colWidth('sigma')),
      )
    }
    return LEDGER_INDENT + cells.join(LEDGER_GUTTER)
  }

  const body = section.rows
    .map((row) => (row.trailingRule ? `${dataRow(row)}\n${blockRule}` : dataRow(row)))
    .join('\n')

  return `
${BOLD_GREY}CASTING:${NORMAL}

${bannerRow}
${headerRow}
${headerRule}
${body}
`.trim()
}
