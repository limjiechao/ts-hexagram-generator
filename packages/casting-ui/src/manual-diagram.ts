// Pure ANSI row-builders + fixed-width geometry for the manual-flow casting
// prompt, lifted out of `<ManualCastingPrompt>`. Every function here returns
// pre-rendered text rows; no React, no Ink, no component state — the stateful
// component (`manual-casting-prompt.tsx`) composes these into its render.

// ── Manual flow ─────────────────────────────────────────────────────────────

/**
 * The four input fields owned by `<ManualCastingPrompt>`, in forward Tab
 * order. Production callers don't see this — it's exposed for the
 * `onFocusedFieldChange` test witness only.
 */
export type ManualFocusedField = 'pilesL' | 'remL' | 'pilesR' | 'remR'

// Forward Tab order for the four manual fields. Used by `manualTitleRow`,
// the row-builder helpers, and the `useInput` Tab handler in
// `<ManualCastingPrompt>`. Module-scope so all consumers stay in lockstep.
export const MANUAL_FIELD_ORDER = [
  'pilesL',
  'remL',
  'pilesR',
  'remR',
] as const satisfies readonly ManualFocusedField[]

// Compile-time guard (Seam 7): every `ManualFocusedField` MUST appear in
// `MANUAL_FIELD_ORDER`. If a member is added to the union but not the array,
// `(typeof MANUAL_FIELD_ORDER)[number]` no longer covers the union, the
// conditional resolves to `never`, and the assignment below fails `tsc`. The
// reverse (no stray members) is guaranteed by the array's element type.
type _AllManualFieldsOrdered =
  ManualFocusedField extends (typeof MANUAL_FIELD_ORDER)[number] ? true : never
// oxlint-disable-next-line no-underscore-dangle
const _assertAllManualFieldsOrdered: _AllManualFieldsOrdered = true
// eslint-disable-next-line no-void
void _assertAllManualFieldsOrdered

/**
 * Slim one-line manual-flow title: `Line N/6 · Cast C/3 · Step P/4`. The
 * step ordinal is the focused field's 1-based index in `MANUAL_FIELD_ORDER`
 * (cosmetic — navigation stays free Tab-cycling). The step-progress dots
 * relocated out of the title into the right pane; see `stepDotsRow`.
 */
export function manualTitleRow(
  lineNumber: number,
  castIndex: number,
  focusedField: ManualFocusedField,
): string {
  const stepIndex = MANUAL_FIELD_ORDER.indexOf(focusedField)
  return `Line ${lineNumber}/6 · Cast ${castIndex + 1}/3 · Step ${stepIndex + 1}/4`
}

// State discriminant shared between the diagram, question panel, and bottom
// strip row builders. Drives editing → error → resolved styling cues
// (inverse-video on active cells, BOLD_GREEN wraps, etc).
export type ManualDiagramState = 'editing' | 'error' | 'resolved'

// Card interior width (between the two vertical pipes). 17 cols accommodates
// `LEFT HEAP` / `RIGHT HEAP` headers, `= XX stalks` totals (up to 3 digits),
// and the full-word `remainder` / `suspended` labels.
export const HEAP_CARD_INTERIOR = 17

// Reserved width of the leading label column inside a content row: 2-col
// pad + longest label `remainder` (9 cols) = 11. Values are right-aligned
// within the remaining `interior - 11 - 2 (right margin)` cols.
export const HEAP_LABEL_COL_WIDTH = 11

// ── Manual flow-diagram geometry ─────────────────────────────────────────
// Both heap cards are CARD_OUTER cols wide; the pair sits CARD_GAP apart,
// giving DIAGRAM_WIDTH. Each card footer carries a centred `┬` tee at
// CARD_TEE_OFFSET (cols from the card's left edge); the branch/join connectors
// span the two card tees (LEFT_TEE_COL..RIGHT_TEE_COL) and point their
// `┴` / `┬` stub at LEDGER_VALUE_END_COL — under the last digit of the
// right-aligned UNPARTED / COUNTED value above/below — so the vertical flow
// reads as one circuit anchored to the numbers it sums.
const CARD_OUTER = HEAP_CARD_INTERIOR + 2
const CARD_GAP = 4
export const DIAGRAM_WIDTH: number = CARD_OUTER * 2 + CARD_GAP
const CARD_TEE_OFFSET = 1 + Math.floor((HEAP_CARD_INTERIOR - 1) / 2)
export const LEFT_TEE_COL: number = CARD_TEE_OFFSET
export const RIGHT_TEE_COL: number = CARD_OUTER + CARD_GAP + CARD_TEE_OFFSET
// Ledger readout column: label left-aligned, value right-aligned. Also the
// length of the COUNTED/MISSING subtraction rule.
export const READOUT_WIDTH: number = 22
// Column of the last digit of a right-aligned ledger value — the connector
// stub (`┴` / `┬`) points here so it lands under the UNPARTED / COUNTED
// number rather than the geometric midpoint of the card pair.
export const LEDGER_VALUE_END_COL: number = READOUT_WIDTH - 1

// The natural body width of the manual prompt: the diagram (DIAGRAM_WIDTH) +
// an 8-col gap + the right pane (45 — widest question, "How many piles of 4
// stalks in the RIGHT heap?"). Exported so `<ManualCastingPrompt>` floors its
// render width to it; the heap-card geometry stays the single source of truth.
export const MANUAL_BODY_GAP = 8
export const MANUAL_RIGHT_PANE_WIDTH = 45
export const MANUAL_NATURAL_BODY_WIDTH: number =
  DIAGRAM_WIDTH + MANUAL_BODY_GAP + MANUAL_RIGHT_PANE_WIDTH
