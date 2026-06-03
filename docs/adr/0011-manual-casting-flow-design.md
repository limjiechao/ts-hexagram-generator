# Manual casting flow design

Status: Accepted
Date: 2026-05-29

`hexagram-manual` lets a user who casts with physical yarrow stalks transcribe each
division, while the app does the arithmetic and bookkeeping. This ADR consolidates
the design decisions reached across several iterations of the prompt (two-field →
side-by-side cards → vertical flow diagram); the iterations converged on one goal —
**the prompt should teach the conservation law as the user types**, not just
collect numbers.

**Four-field entry per cast.** The user transcribes both heaps as piles-of-4 and
remainder (`pilesL`, `remL`, `pilesR`, `remR`). The split is derived from the
**left** heap (`pick = 4·pilesL + remL`); the right heap is a cross-check, not a
second source of truth. The user never has to know or re-enter the original heap
size.

**Tiered validation, in priority order** — the prompt always shows the
highest-priority failing rule:

1. **incomplete** — any field empty → neutral placeholder.
2. **conservation** — `4·pilesL + remL + 4·pilesR + remR + 1 ≠ unpartedStalks` →
   red, with the "a heap divisible by 4 yields remainder 4, not 0" hint.
3. **suspended sum** — `1 + remL + remR` must be in `{5, 9}` for cast 1 or `{4, 8}`
   for casts 2/3 → red, with the "remove the last group of 4" hint.

The bottom strip reads `X of M stalks accounted` while editing (X counts the typed
heap totals plus the always-suspended stalk) and turns bold-green
`→ next cast: N unparted` on commit.

**Two-line rewind window.** `Ctrl+R` rewinds the most-recently-completed line:
mid-line it wipes the current line; immediately after a line completes it drops back
to that line. This is a deliberate two-line lookback, not unlimited undo — expressed
as the reducer's `lineRewound` action and the hook's `rewindCurrentLine()` op, which
are the single source of truth. It is built directly on the pure, rebuildable
`LineState` from [ADR-0006](0006-casting-algorithm-rewindable-core-and-randomness.md).

**No provenance field.** A manual reading saves through the _same_ path and the
_same_ schema as interactive/random — there is no "cast method" field. A Phase-7
byte-identity test drives the same 18-pick sequence through both flows and asserts
the captured save arguments are equal. (Consultation provenance is a Readout display
property, not a stored fact — see `CONTEXT.md`.)

**Ink-only, with a height floor.** The bin refuses non-TTY like the other Ink-only
bins ([ADR-0010](0010-interactive-environment-policy-and-input-modes.md)) — no `--plain`, no
`--numeric-input`, no slider knobs; the manual prompt is its own input branch. It
additionally requires ~34 terminal rows (the flow diagram reserves 24, chrome ~9,
plus a content floor) and refuses shorter terminals rather than render broken.

**Pure row-builder layout.** The prompt is assembled from pure text row-builders
(diagram rows, question/hint rows, input box, bottom strip), which keeps it
testable and lets it pan horizontally on narrow terminals without reflow.
On terminals wider than the natural body width, the body block (diagram + right pane) and the title centre horizontally within the box as one rigid unit, clamping to left-aligned + horizontal pan below it; the centring is a leading-pad post-pass in `manual-prompt.tsx`, so the row-builders stay width-pure.

## Considered options

- **Single pre-computed `pick` entry.** Rejected: it would force the user to do the
  arithmetic the app exists to do, and surface no conservation feedback.
- **Right heap as an independent input.** Rejected: deriving the split from the left
  heap and using the right as a cross-check catches transcription errors without
  double-entry ambiguity.
- **Unlimited undo.** Rejected: a two-line window covers the realistic "I mis-typed
  the last line" case; unbounded history is complexity the physical workflow doesn't
  need (the rebuildable `LineState` leaves the door open if it ever does).
- **A `castMethod` provenance field.** Rejected: it would fork the schema and the
  save path for no reader benefit; byte-identity is simpler and tested.
- **Clip on short terminals.** Rejected: a broken diagram teaches nothing; refusing
  with a clear message is honest.

## Consequences

- The manual and interactive flows must keep saving byte-identically — the Phase-7
  test guards this; don't add a manual-only field without revisiting it.
- The 34-row floor is a real constraint on the diagram's height budget; growing the
  diagram means revisiting the floor.
- Rewind semantics live in the reducer/hook, not in the component — extend undo
  there.

## Where it's enforced

- `packages/casting-ui/src/casting-prompt-box.tsx` — `ManualCastingPrompt`, the
  row-builders, validation tiers, `MANUAL_REVEAL_MS`.
- `packages/casting-ui/src/viewer-flow.ts` — `lineRewound` action.
- `packages/casting-ui/src/use-line-generator.ts` — `rewindCurrentLine()` op.
- `packages/casting-ui/tests/viewer.test.tsx` — manual≡interactive byte-identity test.
- `apps/cli/src/manual.ts` — non-TTY guard + the row floor.
