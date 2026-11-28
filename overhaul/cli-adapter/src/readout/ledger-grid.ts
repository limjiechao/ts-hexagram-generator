import type { LinePosition } from '@hexagram/oracle/line-position'
import type { LedgerRound } from '@hexagram/presentation/readout'

import type { Palette } from '#src/readout/palette.js'
import { centre, padStart, textWidth } from '#src/readout/text-width.js'

/*
 * The Casting ledger as a monospace grid (ADR-0022): two heading rows, the
 * Chinese above the glossary's English, under the 左Left and 右Right banners,
 * then one row per Round. Each column is as wide as its wider heading.
 */

type PaintKey = keyof Omit<Palette, 'reset'>

interface Column {
  readonly chinese: string
  readonly english: string
  /** The cell's text for a Round, before it is right-aligned. */
  readonly cell: (round: LedgerRound) => string
  /** The cell's colour; a column without one is left unpainted. */
  readonly paint?: (round: LedgerRound) => PaintKey | undefined
}

const lineLabels: Readonly<Record<LinePosition, string>> = {
  1: '初1',
  2: '二2',
  3: '三3',
  4: '四4',
  5: '五5',
  6: '上6',
}

const always = (paint: PaintKey) => (): PaintKey => paint

const columns: readonly Column[] = [
  {
    chinese: '爻',
    english: 'Line',
    cell: (round) => (round.round === 3 ? lineLabels[round.line] : ''),
    paint: always('emphasis'),
  },
  {
    chinese: '變',
    english: 'Round',
    cell: (round) => String(round.round),
    paint: always('muted'),
  },
  {
    chinese: '蓍',
    english: 'Stalks',
    cell: (round) => String(round.stalks),
    paint: always('muted'),
  },
  {
    chinese: '左',
    english: 'Heap',
    cell: (round) => String(round.leftHeap),
  },
  {
    chinese: '揲',
    english: 'Fours',
    cell: (round) => String(round.leftPiles),
  },
  {
    chinese: '扐',
    english: 'Remainder',
    cell: (round) => String(round.leftRemainder),
    paint: always('remainder'),
  },
  {
    chinese: '右',
    english: 'Heap',
    cell: (round) => String(round.rightHeap),
  },
  {
    chinese: '揲',
    english: 'Fours',
    cell: (round) => String(round.rightPiles),
  },
  {
    // Every Round hangs exactly one stalk from the right heap.
    chinese: '掛',
    english: 'Hung Stalk',
    cell: () => '1',
    paint: always('muted'),
  },
  {
    chinese: '扐',
    english: 'Remainder',
    cell: (round) => String(round.rightRemainder),
    paint: always('remainder'),
  },
  {
    chinese: '歸奇',
    english: 'Set-aside',
    cell: (round) => String(round.setAside),
    paint: always('muted'),
  },
  {
    chinese: '營',
    english: 'Tally',
    cell: (round) =>
      round.lineValue === undefined
        ? String(round.remainingFours)
        : `⇒ ${String(round.lineValue)}`,
    paint: (round) => (round.lineValue === undefined ? undefined : 'lineValue'),
  },
]

const widthOf = (column: Column): number =>
  Math.max(textWidth(column.chinese), textWidth(column.english))

const indent = '   '

/** The banners' spans: the left heap's three columns, the right heap's four. */
const leftHeapColumns = [3, 4, 5] as const
const rightHeapColumns = [6, 7, 8, 9] as const

/** The ledger's rows, from Line 6's third Round down to Line 1's first. */
export function ledgerGrid(
  rounds: readonly LedgerRound[],
  palette: Palette,
): string {
  const { reset } = palette
  const gutter = ` ${palette.muted}│${reset} `
  const heading = (text: string): string => `${palette.heading}${text}${reset}`
  const rule = (text: string): string => `${palette.muted}${text}${reset}`
  const widths = columns.map(widthOf)
  const width = (index: number): number => widths[index] ?? 0
  const span = (indices: readonly number[]): number =>
    indices.reduce((sum, index) => sum + width(index), 0) +
    3 * (indices.length - 1)
  const blank = (index: number): string => ' '.repeat(width(index))

  const banner =
    indent +
    [blank(0), blank(1), blank(2)].join(gutter) +
    gutter +
    heading(centre('左Left', span(leftHeapColumns))) +
    gutter +
    heading(centre('右Right', span(rightHeapColumns))) +
    gutter +
    [blank(10), blank(11)].join(gutter)
  const headingRow = (text: (column: Column) => string): string =>
    indent +
    columns
      .map((column, index) => heading(padStart(text(column), width(index))))
      .join(gutter)
  const ruleRow = (line: string, joint: string): string =>
    indent + rule(widths.map((each) => line.repeat(each)).join(joint))

  const roundRow = (round: LedgerRound): string =>
    indent +
    columns
      .map((column, index) => {
        const text = padStart(column.cell(round), width(index))
        const paint = column.paint?.(round)
        return paint === undefined ? text : `${palette[paint]}${text}${reset}`
      })
      .join(gutter)

  const body = rounds
    .map((round, index) =>
      // A rule closes each Line's first Round but the last.
      round.round === 1 && index < rounds.length - 1
        ? `${roundRow(round)}\n${ruleRow('─', '─┼─')}`
        : roundRow(round),
    )
    .join('\n')

  return [
    banner,
    headingRow((column) => column.chinese),
    headingRow((column) => column.english),
    ruleRow('═', '═╪═'),
    body,
  ].join('\n')
}
