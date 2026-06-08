# Rendered-width operations have a single home

Status: Accepted
Date: 2026-06-08

[ADR-0019](0019-domain-cli-boundary.md) promised that rendered-string width has
a single home: only `cli/viewer-core` may measure it, and every other `cli/*`
package routes through its ANSI-aware `terminalWidth` wrapper (the `string-width`
package is lint-fenced everywhere else). Two seams escaped that promise. **First,
the fence covers only `string-width` (measurement); the sibling rendered-width
operation `slice-ansi` (slicing a string by display column for horizontal panning)
is imported directly by four `cli/*` files** — `cli/playground-ui/src/hexagram-display.tsx`,
`cli/readout/src/consultation-readout.tsx`, `cli/casting-ui/src/slider-prompt.tsx`,
and `cli/casting-ui/src/manual-prompt.tsx` — all computing the same `sliceAnsi(row, off, off + window)`
pan, with no viewer-core helper to route through. (`wrap-ansi`, the third such
operation, already routes through viewer-core's `wrapToWidth`.) **Second, "which
codepoints are fullwidth" is one piece of knowledge encoded twice**: `domain/text-layout`'s
`visualWidth` walks eleven hand-rolled fullwidth codepoint ranges (ANSI-unaware,
used by the saved `.md` diagrams), while `viewer-core`'s `terminalWidth` delegates
to `string-width`'s maintained East-Asian-width table (ANSI-aware, used by the live
viewer). 0019 called this split "distinct by design … separate homes," but the two
tables agree only by accident: every glyph the app currently emits sits in the BMP
CJK block (`U+4e00–U+9fff`) both agree on, while the hand-rolled approximation
silently omits emoji, supplementary-plane CJK (`U+20000+`), and combining marks —
glyphs `string-width` measures correctly. A saved file and the live screen would
misalign the day such a glyph appears.

We will give rendered-width operations a single home, completing 0019's promise.
**(a)** `slice-ansi` joins `string-width` under the `cli/**`-scoped
`no-restricted-imports` fence (viewer-core exempt); viewer-core gains a pan/slice
helper alongside `terminalWidth` and `wrapToWidth`, and the four call-sites route
through it. **(b)** We collapse the two width implementations into one: `visualWidth`
(in `domain/text-layout`) becomes the single width function, backed by `string-width`,
and `terminalWidth` becomes a thin re-export of it. Because `string-width` strips
ANSI internally, the raw-vs-ANSI distinction that justified two functions dissolves
— one function, one table, used identically by the saved `.md` and the live viewer.

This amends ADR-0019's `string-width`-only fence and retires its "separate homes"
enforcement note. The decision is captured here; the implementation is sequenced as
follow-up slices (one for the `slice-ansi` fence + helper, one for the width collapse),
each its own small single-intent change.

## Considered options

- **(a) Narrow the fence to measurement only.** Rejected: `wrap-ansi` and
  `string-width` already centralise through viewer-core; leaving `slice-ansi` out
  makes "rendered-width single home" mean "measurement single home" and keeps a
  silent leak that the next panning component would copy.
- **(a) Thin re-export of `sliceAnsi` from viewer-core, no helper.** Rejected:
  bookkeeping without substance — the four call-sites share an actual operation
  (pan a row to a window), which deserves a named helper, not just a relocated import.
- **(b) Keep the two width functions, add a parity test** over the real glyph
  universe asserting `visualWidth === stringWidth`. Rejected: it monitors the drift
  instead of closing it. A red test catches a diverging glyph after someone adds it,
  but leaves one piece of knowledge in two encodings — the exact duplication 0019
  set out to remove. The human chose to eliminate the seam, not instrument it.
- **(b) Let `visualWidth` delegate to `string-width` but keep both named functions.**
  Rejected as dominated: it pays this decision's entire cost (a `string-width`
  dependency in the domain layer, possible fixture churn) without the payoff —
  you are left with two functions that compute the identical value, which reads as
  _more_ confusing than today, where they at least differ on purpose.
- **(b) Collapse to one width home backed by `string-width` (chosen).** One
  authoritative representation of fullwidth-codepoint knowledge, in the lowest
  layer. The live viewer gains the maintained table's accuracy on arbitrary query
  glyphs; the saved file gets the identical numbers; drift becomes structurally
  impossible rather than asserted.

## Consequences

- **Width knowledge has exactly one home and one table.** `visualWidth` in
  `domain/text-layout`, backed by `string-width`, is the single width function;
  `terminalWidth` is a thin re-export. Saved `.md` and the live viewer can no longer
  disagree on a glyph's width — the misalignment class is gone, not merely tested.
- **`domain/text-layout` gains its first runtime dependency** (`string-width`). The
  domain layer is no longer strictly zero-dep. This is the accepted cost of a single
  width table; the lint fence stays `cli/**`-scoped, so a domain import of
  `string-width` is permitted by design. Watch: future domain width needs ride on
  this one function rather than re-deriving a table.
- **The raw-vs-ANSI two-function design is retired.** ADR-0019's enforcement note
  describing `visualWidth` and `terminalWidth` as deliberately separate homes is
  superseded by this ADR (append-only: 0019's body is unchanged; this is the newer
  decision of record).
- **`slice-ansi` is fenced like `string-width`.** viewer-core becomes the sole
  exempt wrapper for all three rendered-width operations — measure (`terminalWidth`),
  wrap (`wrapToWidth`), and slice/pan (new helper).
- **`.md` byte-identity fixtures may need regeneration** if `string-width`'s table
  ever differs from the old hand-rolled ranges on a glyph that actually appears in a
  saved diagram. On current data the diff is empty; a future glyph would surface it
  via `pnpm generate-fixtures` with a justified diff rather than a silent skew.
- **Implementation is pending.** This commit captures the decision only. The
  `slice-ansi` fence + viewer-core pan helper and the `visualWidth`/`terminalWidth`
  collapse land as separate follow-up changes.

## Where it's enforced

_(Targets; implementation sequenced as follow-up slices.)_

- `eslint.config.js` — the `cli/**`-scoped `no-restricted-imports` override (viewer-core
  ignored) extends to forbid `slice-ansi` alongside `string-width`.
- `cli/viewer-core/` — gains a pan/slice helper (the single home for slicing a row to a
  display-column window) beside `terminalWidth` and `wrapToWidth`; `terminalWidth`
  becomes a thin re-export of `domain/text-layout`'s `visualWidth`.
- `domain/text-layout/` — `visualWidth` is the single width function, backed by
  `string-width`.
- `cli/playground-ui/src/hexagram-display.tsx`, `cli/readout/src/consultation-readout.tsx`,
  `cli/casting-ui/src/slider-prompt.tsx`, `cli/casting-ui/src/manual-prompt.tsx` — route
  their pan through the viewer-core helper instead of importing `slice-ansi`.
- [ADR-0019](0019-domain-cli-boundary.md) — its `string-width`-only fence and "separate
  homes" width note are amended by this ADR.
