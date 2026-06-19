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
