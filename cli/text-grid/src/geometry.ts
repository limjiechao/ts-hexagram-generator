// Monospace text-grid geometry (medium-bound). These are TERMINAL character-cell
// measurements: column widths tuned so the casting ledger fits the 120-col
// default wrap (111 visual columns), and the fixed-width inter-column connectors
// for the transformation/hexagram diagrams. They render correctly only in a
// monospace font where one glyph is one cell; an HTML host lays the table out
// with CSS instead (ADR-0022). Moved verbatim from the former consultation-view
// vocabulary; the bytes are load-bearing for fixture parity.

// Column layout for the enumerated casting ledger. 18 rows × 12 right-aligned
// cells under a two-level header (左Left / 右Right banners span their
// sub-columns). Header names fuse plain English with classical glosses,
// compact so the content fits the 120-col default wrap (111 visual columns).
export const LEDGER_COLUMNS = [
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

export type LedgerColumnKey = (typeof LEDGER_COLUMNS)[number]['key']

// Transformation / hexagram-diagram geometry (terminal columns; ANSI is
// zero-width). RIGHT_COLUMN is where the emerging column starts; MOVING_ARROW
// / STATIC_GAP are the 19-col inter-column connectors.
export const RIGHT_COLUMN = 46
/** 19-col inter-column connector for moving lines: 17×─ + ▶ + 1 space. */
export const MOVING_ARROW = '─────────────────▶ '
/** 19-col blank gap for static lines (matches `MOVING_ARROW` width). */
export const STATIC_GAP = '                   '
/** Width of the per-side bar block, reused as the trigram divider width. */
export const TRIGRAM_DIVIDER_WIDTH = 25
