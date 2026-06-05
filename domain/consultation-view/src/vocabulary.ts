// `✕` U+2715 — every render surface (banner, casting readout, history
// readout, playground, saved .md) speaks one glyph vocabulary. Saved files
// with the older `×` U+00D7 self-heal on next load via the history-app
// byte-compare rerender. Copied verbatim from the pre-IR readout/markdown
// renderers; the bytes are load-bearing for fixture parity. Keyed by the four
// Line values (6/7/8/9); the bare `as const` keeps isolatedDeclarations happy
// on the exported const (the vocabulary test pins the keys + values).
export const LINE_GLYPH = {
  6: '━━━ ✕ ━━━',
  7: '━━━━━━━━━',
  8: '━━━   ━━━',
  9: '━━━━○━━━━',
} as const

/** Bottom-first (`1`..`6`) fullwidth position labels for hexagram diagrams. */
export const POSITION_LABELS = {
  1: '（初, 1st）',
  2: '（二, 2nd）',
  3: '（三, 3rd）',
  4: '（四, 4th）',
  5: '（五, 5th）',
  6: '（上, 6th）',
} as const

// I-Ching line labels: classical ordinal glyph (初/二/三/四/五/上) fused with
// the Arabic line number, mirroring the diagram position labels.
export const LINE_LABELS = {
  1: '初1',
  2: '二2',
  3: '三3',
  4: '四4',
  5: '五5',
  6: '上6',
} as const

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
