import { deriveSplit } from '@hexagram/core/casting-derivation'
import type {
  PartialCastingRecord,
  PartialSplitRecord,
} from '@hexagram/core/types'
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

import { centerVisual, padStartVisual } from './layout-utils.js'

// I-Ching line labels: the classical ordinal glyph (初 for line 1, 上 for
// line 6, else 二..五) fused with the Arabic line number, mirroring the
// diagram sections' position labels (初/二/三/四/五/上). `上6` is 3 visual
// columns — well inside the `爻Line` column's width of 6.
const LINE_LABELS = {
  1: '初1',
  2: '二2',
  3: '三3',
  4: '四4',
  5: '五5',
  6: '上6',
} as const

// Column layout for the enumerated casting ledger. Eighteen rows (6 lines × 3
// casts) each carry twelve right-aligned cells joined by a ` │ ` gutter under a
// two-level header: the `左Left` / `右Right` banners span their sub-columns.
// Every field is derived from one `SplitRecord {pick, max}` via `deriveSplit`;
// no algorithm or `CastingRecord` change is needed. Header names fuse plain
// English with classical glosses, compact (no space after the glyph) so the
// content fits the 120-col default wrap — 111 visual columns.
const LEDGER_COLUMNS = [
  { key: 'line', header: '爻Line', width: 6 },
  { key: 'cast', header: '變Cast', width: 6 },
  { key: 'stalks', header: '蓍Stalks', width: 8 },
  { key: 'leftHeap', header: '左Heap', width: 6 },
  { key: 'leftPiles', header: '揲Fours', width: 7 },
  { key: 'leftRemainder', header: '扐Odd', width: 5 },
  { key: 'rightHeap', header: '右Heap', width: 6 },
  { key: 'rightPiles', header: '揲Fours', width: 7 },
  { key: 'held', header: '掛Held', width: 6 },
  { key: 'rightRemainder', header: '扐Odd', width: 5 },
  { key: 'setAside', header: '歸奇Aside', width: 9 },
  { key: 'sigma', header: '營Tally', width: 7 },
] as const

const LEDGER_INDENT = '   '
// The inter-cell gutter `│` is painted the same NORMAL_GREY as the `═╪═` /
// `─┼─` rule rows so every border in the table reads as one uniform grey
// grid. The flanking spaces stay uncoloured (invisible) and the ANSI codes
// are zero-width, so the gutter is still exactly 3 visual columns — the `+ 3`
// span arithmetic in the banner row is unaffected.
const LEDGER_GUTTER = ` ${NORMAL_GREY}│${NORMAL} `

// ── Casting-table row geometry ────────────────────────────────────────────
// Single source for the Casting tab's content-row layout (the string
// castingSection returns, before the readout prepends its scroll breather).
// Top-first: a 5-row header, then six 4-row line blocks (line 6 on top, line 1
// at the bottom); the last block omits its trailing rule. The readout's
// auto-follow scroll pins a line's cast-1 (block-bottom) row near the viewport
// bottom using these constants; a consistency test asserts they still describe
// castingSection's output. Keep them in lockstep with the bannerRow / headerRow
// / headerRule / body assembly below.
export const CASTING_HEADER_ROWS = 5 // "CASTING:", blank, banner, header, rule
export const CASTING_ROWS_PER_BLOCK = 4 // cast3, cast2, cast1, blockRule
export const CAST1_OFFSET_IN_BLOCK = 2 // cast-1 row, measured from the block top

/**
 * Content-row index (0-based, pre-breather) of the cast-1 / block-bottom row
 * for the given hexagram line. `lineIndex` 0 => line 1 (bottom, row 27); 5 =>
 * line 6 (top, row 7). Consumed by the viewer to drive auto-follow scroll.
 */
export function castingTableActiveRow(lineIndex: number): number {
  const blockTop =
    CASTING_HEADER_ROWS + (5 - lineIndex) * CASTING_ROWS_PER_BLOCK
  return blockTop + CAST1_OFFSET_IN_BLOCK
}

/**
 * Content-row the auto-follow scroll seats near the viewport bottom while
 * casting `lineIndex`. Anchors the *just-completed* line (`lineIndex - 1`)
 * rather than the active line, so when the third cast commits — filling that
 * cell and advancing the line pointer in one update — the line the user just
 * finished stays pinned at the bottom instead of scrolling off before its
 * result is seen. Line 1 (`lineIndex` 0) has no predecessor, so it anchors
 * itself; the pin therefore only moves on the *next* line transition.
 */
export function castingTableFollowRow(lineIndex: number): number {
  return castingTableActiveRow(Math.max(0, lineIndex - 1))
}

// Accepts a `PartialCastingRecord` so the same renderer is reused while the
// interactive viewer is still collecting casts: a `null` split renders its ten
// derived cells as width-stable `·` placeholders (the structural 爻Line / 變Cast
// cells still print), so column boundaries never shift as cells fill in.
// `CastingRecord` is a structural subtype, so fully-populated callers render the
// final table. A `null` casting (e.g. one migrated from a pre-CASTING legacy
// `.txt`) renders a "Casting not recorded" caption instead of the table.
export function castingSection(casting: PartialCastingRecord | null): string {
  if (casting === null)
    return `
${BOLD_GREY}CASTING:${NORMAL}

${NORMAL}Casting not recorded
`.trim()

  const width = (key: string): number =>
    LEDGER_COLUMNS.find((c) => c.key === key)!.width
  const blank = (key: string): string => ' '.repeat(width(key))

  // Banner row: the 左Left / 右Right banners each span their sub-columns plus
  // the interior 3-col gutters between them.
  const leftSpan =
    width('leftHeap') + 3 + width('leftPiles') + 3 + width('leftRemainder')
  const rightSpan =
    width('rightHeap') +
    3 +
    width('rightPiles') +
    3 +
    width('held') +
    3 +
    width('rightRemainder')
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

  const dataRow = (
    lineNumber: 1 | 2 | 3 | 4 | 5 | 6,
    castNumber: 1 | 2 | 3,
    split: PartialSplitRecord,
    showLine: boolean,
  ): string => {
    const lineCell = showLine ? LINE_LABELS[lineNumber] : ''
    const cells: string[] = [
      `${BOLD_WHITE}${padStartVisual(lineCell, width('line'))}${NORMAL}`,
      `${NORMAL_GREY}${padStartVisual(String(castNumber), width('cast'))}${NORMAL}`,
    ]
    if (split === null) {
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
          `${PLACEHOLDER_GREY}${padStartVisual('·', width(key))}${NORMAL}`,
        )
    } else {
      const d = deriveSplit(split)
      const plain = (value: number, key: string): string =>
        padStartVisual(String(value), width(key))
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
        castNumber === 3
          ? `${BOLD_CYAN}${padStartVisual(`⇒ ${d.combinedPiles}`, width('sigma'))}${NORMAL}`
          : padStartVisual(String(d.combinedPiles), width('sigma')),
      )
    }
    return LEDGER_INDENT + cells.join(LEDGER_GUTTER)
  }

  // Lines top→bottom are 6→1 (matching the diagram sections). Within each block
  // casts are reversed — cast 3 (the resolving cast, carrying `⇒ N`) on top,
  // cast 1 (`蓍Stalks` = 49) at the bottom. The line label prints only on the
  // block's top (cast-3) row. Index with tuple-positioned literals so TS proves
  // each access in-bounds and `lineNumber` is a 1..6 literal.
  const lineOrder = [
    [6, casting[5]],
    [5, casting[4]],
    [4, casting[3]],
    [3, casting[2]],
    [2, casting[1]],
    [1, casting[0]],
  ] as const

  const body = lineOrder
    .map(([lineNumber, lineCasting], blockIndex) => {
      const [cast1, cast2, cast3] = lineCasting
      const rows = [
        dataRow(lineNumber, 3, cast3, true),
        dataRow(lineNumber, 2, cast2, false),
        dataRow(lineNumber, 1, cast1, false),
      ]
      return blockIndex < lineOrder.length - 1
        ? [...rows, blockRule].join('\n')
        : rows.join('\n')
    })
    .join('\n')

  return `
${BOLD_GREY}CASTING:${NORMAL}

${bannerRow}
${headerRow}
${headerRule}
${body}
`.trim()
}
