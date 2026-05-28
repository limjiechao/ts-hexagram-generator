# `hexagram-manual` casting prompt — visual redesign

**Status:** design approved 2026-05-28, awaiting implementation plan
**Owner:** Lim Jiechao

## Goal

Redesign the visual presentation of the `ManualCastingPrompt` box (the
right-of-Casting prompt rendered by `@hexagram/casting-ui`'s
`<CastingPromptBox>` when `flowKind === 'manual'`) so it is legible,
self-evident, and less wordy. The underlying state machine, validator,
generator advance, save path, and Phase 7 byte-identity contract with
the interactive flow are unchanged. This spec is **purely a re-rendering**
of the same four validator outcomes (`incomplete` / `conservation` /
`suspended-sum` / `ok`) over the same four input fields.

## Pain points being addressed

User feedback on the post-launch UI:

1. Too wordy — `Left heap : [pilesL] piles × 4 stalks + [remL] remainder`
   is a sentence-fragment per row.
2. Not self-evident — no top-line instruction telling the user what to do.
3. `[ _ ]` brackets do not read as input fields.
4. Two fields per line forces the eye to parse text before locating the
   next thing to type.
5. `→ SPLIT = N` is unclear — “SPLIT” comes from the algorithmic name and
   doesn't describe the user-facing concept (parting unparted stalks into
   two heaps).
6. `(range 1 to M-1)` parses worse than `(valid range: 1 to M-1)` and
   its purpose is unclear in context.

## Non-goals

- Changing the validator priority order, the closed-form round result
  maths (`computeManualRoundResult`), the per-field bounds, or the
  derived `pick = 4 · pilesL + remL` storage shape.
- Changing the `manualRevealMs` default (2500 ms), the
  `--manual-reveal-ms` flag, or the `manualRevealMs={0}` test opt-out.
- Changing the `onReady`, `onFocusedFieldChange` test witnesses, the
  `useLineGenerator.rewindCurrentLine()` Ctrl+R behaviour, or the
  Phase 7 byte-identity test that drives 18 picks through both manual
  and interactive flows.
- Touching the slider or number-mode branches of `<CastingPromptBox>`.
- Changing the non-TTY guard in the `hexagram-manual` bin.
- Adding any new fields to the consultation file format.

## Locked design decisions

The brainstorming session walked eight decision branches. The chosen
options are listed here so the implementation plan inherits the
constraints without re-litigating.

1. **Layout — side-by-side, diagram left, input right.** The persistent
   two-heap diagram lives on the left half of the prompt content area;
   the question copy and the focused input widget live on the right
   half. The diagram is always rendered; only one of the four fields is
   focused at any moment.

2. **Live mirror + highlighted target cell.** As the user types a digit
   in the right-side input, the corresponding cell in the diagram
   updates immediately, character-by-character. The active cell is
   rendered with inverse video on the value so the user can see exactly
   where their typing is landing.

3. **Full-sentence question copy with dim range hint below.** Each step
   asks a complete, self-evident question, and the per-field range hint
   appears as a dim line directly under the question. Range hint
   phrasing follows the form `valid X to Y` (no `(valid range: …)`
   parens).
   - Step 1 (`pilesL`): `How many piles of 4 stalks in the LEFT heap?`
     → dim: `valid 0 to ⌊M/4⌋`
   - Step 2 (`remL`): `How many leftover stalks in the LEFT heap?`
     → dim: `valid 1 to 4`
   - Step 3 (`pilesR`): `How many piles of 4 stalks in the RIGHT heap?`
     → dim: `valid 0 to ⌊M/4⌋`
   - Step 4 (`remR`): `How many leftover stalks in the RIGHT heap?`
     → dim: `valid 1 to 4`

   `M` is `unpartedStalks` for the current round, threaded through from
   `useLineGenerator` exactly as today.

4. **Validation errors land below the totals strip.** When Enter on
   step 4 fails the cross-field validator (conservation or
   suspended-sum), the bottom strip's `· 1 suspended · total X of M`
   segment is replaced by a `BOLD_RED` error message, and the
   `Enter: next · Shift+Tab: back` hint is replaced by
   `Shift+Tab: back to fix`.
   - Conservation: `BOLD_RED 21 + 27 + 1 = 49, expected 48 — recount (a heap divisible by 4 yields rem 4, not 0) NORMAL`
   - Suspended sum: `BOLD_RED Suspended sum (1 + remL + remR) = S, expected {4 or 8 | 5 or 9} — check if you removed the last group of 4 NORMAL`

   The two existing message strings are tightened to fit the bottom
   strip's single-row budget on a 70-col content width but otherwise
   carry the same information as today.

5. **Drawn-box input + inverse-video active diagram cell.** The
   right-side focused-input widget is a three-row drawn box
   (`┌─────────┐ / │   X█   │ / └─────────┘`) housing the
   `<NumberInput>`'s value + cursor. The diagram's active cell uses
   `<Text inverse>` on the value; inactive cells render plain numbers
   (or a literal `?` if not yet entered).

   The existing `[ ]` brackets and the `<ManualNumberField>` empty-state
   `_` placeholder are retired.

6. **Progress strip — dots + numeric, in the title row.** Title becomes
   `Line N/6 · Cast C/3   ●●○○   step 2 of 4` on one line. Dots fill
   left-to-right as the user advances through the four steps.

7. **Resolved dwell — greenify diagram + extend bottom strip.** During
   the 2.5 s `manualRevealMs` window after a valid Enter on step 4:
   - The two `LEFT HEAP` / `RIGHT HEAP` cards and their `= X stalks`
     totals all render in `BOLD_GREEN`.
   - The bottom strip turns `BOLD_GREEN` and gains a `→ next cast: W
unparted` segment: `· 1 suspended · 48 of 49 · → next cast: 40
unparted`.
   - The right side (question + input box) is replaced by a calm
     three-line `Resolved.` / blank / `Enter to advance (or wait
2.5 s)`. The skip-to-advance Enter remains hot during the dwell.

8. **Key bindings — Enter = advance/commit, Shift+Tab = back, Tab =
   alias for Enter.** Each Enter validates the current field's per-field
   bounds and advances focus. Enter on step 4 runs the full cross-field
   validator: valid → start dwell; invalid → render error and hold focus
   on step 4 so the user can `Shift+Tab` back to fix any of the previous
   fields. Tab is a discoverability alias for Enter (forward only;
   Shift+Tab is the only back-stepper).

   `Ctrl+R` line-rewind is unchanged — same `useLineGenerator`-driven
   semantics as today.

## The three rendered states

### Steady state — step 2 of 4, after typing `1` into LEFT rem

```
╭──────────────────────────────────────────────────────────────────────────────╮
│ Line N/6 · Cast C/3   ●●○○   step 2 of 4                                     │
│                                                                              │
│  ┌── LEFT HEAP ──┐   ┌── RIGHT HEAP ──┐         How many leftover stalks     │
│  │  piles    5   │   │  piles    ?    │         in the LEFT heap?            │
│  │  rem.    [1]  │   │  rem.     ?    │         dim: valid 1 to 4            │
│  │  = 21 stalks  │   │  = ? stalks    │              ┌────────┐               │
│  └───────────────┘   └────────────────┘              │   1█   │               │
│                                                      └────────┘               │
│  · 1 suspended · total 21 of 49           Enter: next · Shift+Tab: back      │
╰──────────────────────────────────────────────────────────────────────────────╯
```

`[1]` denotes the inverse-video active cell. `= 21 stalks` is the live
echo of `4·5 + 1`.

### Error state — Enter at step 4 violates conservation

Round-1 example (M = 49), all four fields entered: pilesL=5, remL=1,
pilesR=6, remR=2. LEFT total = 21, RIGHT total = 26, sum + 1 = 48 ≠ 49,
so conservation fails. The validator's error message renders below the
totals strip and the commit hint flips to `Shift+Tab: back to fix`.

```
╭──────────────────────────────────────────────────────────────────────────────╮
│ Line N/6 · Cast C/3   ●●●●   step 4 of 4                                     │
│                                                                              │
│  ┌── LEFT HEAP ──┐   ┌── RIGHT HEAP ──┐         How many leftover stalks    │
│  │  piles    5   │   │  piles    6    │         in the RIGHT heap?          │
│  │  rem.     1   │   │  rem.    [2]   │         dim: valid 1 to 4           │
│  │  = 21 stalks  │   │  = 26 stalks   │              ┌────────┐              │
│  └───────────────┘   └────────────────┘              │   2█   │              │
│                                                      └────────┘              │
│  RED 21 + 26 + 1 = 48, expected 49              Shift+Tab: back to fix      │
╰──────────────────────────────────────────────────────────────────────────────╯
```

### Resolved state — `manualRevealMs` dwell after a valid step-4 Enter

Round-1 example (M = 49), all four fields entered: pilesL=5, remL=4,
pilesR=5, remR=4. LEFT total = 24, RIGHT total = 24, sum + 1 = 49 ✓,
suspended-sum = 1 + 4 + 4 = 9 ∈ {5, 9} ✓. `computeManualRoundResult`
yields `next = 40` (the canonical M for round 2).

```
╭──────────────────────────────────────────────────────────────────────────────╮
│ Line N/6 · Cast C/3   ●●●●   step 4 of 4                                     │
│                                                                              │
│  GR┌── LEFT HEAP ──┐ GR┌── RIGHT HEAP ──┐       Resolved.                   │
│  GR│  piles    5   │ GR│  piles    5    │                                   │
│  GR│  rem.     4   │ GR│  rem.     4    │       Enter to advance            │
│  GR│  = 24 stalks  │ GR│  = 24 stalks   │       (or wait 2.5 s)             │
│  GR└───────────────┘ GR└────────────────┘                                   │
│  GR · 1 suspended · 48 of 49 · → next cast: 40 unparted                     │
╰──────────────────────────────────────────────────────────────────────────────╯
```

The "wait 2.5 s" string is a literal; if a future change templates it
against `manualRevealMs` it must format the value as one decimal place
to avoid `Enter to advance (or wait 2500 ms)` ugliness when tests pass
e.g. `manualRevealMs={1234}`.

## Size budget

- **Rendered height:** 11 rows total — 9 content + 2 border. **Unchanged
  from the current implementation.** Breakdown:
  - 1 row · title with inline progress strip
  - 1 row · blank spacer
  - 6 rows · side-by-side body (LEFT: 5-row diagram + 1 implicit blank
    under it to align with RIGHT; RIGHT: 2-row question + 1-row dim
    range hint + 3-row drawn-box input)
  - 1 row · bottom strip

  `getCastingPromptHeight(_, _, 'manual')` keeps returning `11`. The
  JSDoc above it must be rewritten to describe the new layout so a
  future reader counting rows doesn't see the old "title / blank /
  unparted / --- / left heap / right heap / SPLIT / --- / resolved"
  breakdown that no longer corresponds to anything on screen.

- **Content width:** ~70 columns inside the box. The diagram half is
  ~38 cols (two 16-col heap cards + a 4-col gap + spare); the
  question/input half is ~28 cols.
- **Narrow-terminal behaviour:** below ~70 cols of inner width, the box
  content keeps its full width and the viewer's existing `<` / `>` pan
  scrolls it horizontally. Implementation mirrors the slider prompt's
  `sliceAnsi(row, horizontalOffset, horizontalOffset + innerCols)`
  pattern (see `SliderCastingPrompt` in `casting-prompt-box.tsx`).
  `<CastingPromptBox>` already receives `horizontalOffset` from the
  viewer; the manual branch starts honouring it.

## Implementation contract

This is the surface area the implementation plan must cover. Each item
is a concrete change in code; none of them are negotiable design points.

1. **`getCastingPromptHeight(_, _, 'manual')` keeps returning `11`.**
   The constant does not change, but the JSDoc block above it must be
   rewritten to enumerate the new layout (1 title with inline progress /
   1 blank / 6 side-by-side / 1 bottom strip = 9 content + 2 border).
   The current "title / blank / unparted / dim sep / left heap field
   row / right heap field row / SPLIT / dim sep / resolved-heaps row"
   breakdown is stale post-redesign and would mislead the next reader.

2. **`<ManualCastingPrompt>` is re-rendered, not re-architected.** The
   four `useState` buffers, the `focusedField` state machine, the
   `committed` ref, the validator call, the reveal-dwell `setTimeout`,
   the mount-witness `useEffect`, the focus-witness `useEffect`, and
   the parent-owned `useInput` (Tab + Enter) all stay. What changes is
   the JSX subtree below them.

3. **New `<TwoHeapDiagram>` sub-component** inside
   `casting-prompt-box.tsx` (file-local — not exported). Props:
   `pilesL`, `remL`, `pilesR`, `remR` (all `number | null`),
   `focusedField`, `state: 'editing' | 'error' | 'resolved'`. Renders
   the 5-row LEFT/RIGHT heap cards. Cells:
   - `piles`, `rem.` value: `?` if the corresponding buffer is null,
     else the number.
   - Active cell (matches `focusedField`) wraps the value in `<Text
inverse>`.
   - `state === 'resolved'`: whole subtree wraps in `<Text color="green"
bold>` (or per-row equivalent if Ink propagation gets in the way).
   - `state === 'error'`: no special colouring on the diagram — the
     error message in the bottom strip carries the cue.

4. **New `<FocusedInputBox>` sub-component** — the 3-row drawn box
   housing the `<NumberInput>`. Props: `value`, `onChange`, `min`,
   `max`, `focused`. The current `<ManualNumberField>` is deleted; its
   responsibility splits cleanly between `<TwoHeapDiagram>`'s cell
   rendering (inactive + active static styling) and `<FocusedInputBox>`
   (the actual input widget).

5. **New `<QuestionPanel>` sub-component** — the right-half question +
   dim range hint above the `<FocusedInputBox>`. Props: `focusedField`,
   `unpartedStalks`. Renders the 4-case `switch` on `focusedField` with
   the question copy from decision 3. The range-hint string is also
   derived from `focusedField` (`'pilesL'|'pilesR'` → `valid 0 to
${Math.floor(unpartedStalks / 4)}`; `'remL'|'remR'` → `valid 1 to
4`). Resolved state replaces this entire panel with the
   `Resolved.` / blank / `Enter to advance (or wait 2.5 s)` three-line
   block.

6. **New `<BottomStrip>` sub-component** — the one-line strip below the
   side-by-side body. Three branches:
   - **Editing:** `· 1 suspended · total ${liveLeftTotal +
liveRightTotal} of ${unpartedStalks}` on the left,
     `Enter: next · Shift+Tab: back` right-aligned.
   - **Error:** `BOLD_RED` validator-derived message on the left,
     `Shift+Tab: back to fix` right-aligned.
   - **Resolved:** `BOLD_GREEN · 1 suspended · ${leftHeapTotal +
rightHeapTotal} of ${unpartedStalks} · → next cast: ${next}
unparted`, full-width (right-side hint suppressed because the
     right panel already says `Enter to advance`).

7. **Horizontal pan plumbing.** `<CastingPromptBox>` already receives
   `horizontalOffset`. Currently the manual branch ignores it; after
   the redesign, `<ManualCastingPrompt>` builds each row as a fixed
   `renderWidth`-wide string and pipes it through `sliceAnsi(row,
horizontalOffset, horizontalOffset + innerContentWidth)` exactly as
   `<SliderCastingPrompt>` does. The pan keys themselves are owned by
   the viewer's chrome — no change there.

8. **Title row collapses to one line.** Replace today's two-line
   `Line N/6 · Cast C/3` + blank with `Line N/6 · Cast C/3   ●●○○
step ${castIndex + 1} of 4`. The dots strip is a 4-char literal of
   `●` (active) and `○` (pending) derived from `focusedField`'s position
   in `['pilesL','remL','pilesR','remR']`. Step counter is `1`-indexed.

## What carries over from the current implementation (regression budget)

The following are deliberate non-changes — the implementation must
preserve all of them. Listed so the plan's verification checklist can
be exhaustive.

- `validateManualInput` — pure, same four-priority ordering, same
  outputs. Message-text edits in decision 4 are the only changes, and
  they must keep the same `kind` discriminants.
- `computeManualRoundResult` — unchanged; same closed-form maths
  driving the resolved-dwell numbers.
- `MANUAL_REVEAL_MS = 2500`, the `--manual-reveal-ms <n>` CLI flag, and
  `manualRevealMs={0}` test opt-out — unchanged values, unchanged
  threading.
- `onReady`, `onFocusedFieldChange` test witnesses — unchanged
  signatures, unchanged firing rules.
- `Ctrl+R` line-rewind via `useLineGenerator.rewindCurrentLine()` —
  unchanged.
- Phase 7 byte-identity test (`packages/casting-ui/tests/viewer.test.tsx`)
  — must still pass byte-for-byte. The saved `CastingRecord` and
  rendered consultation file are unaffected by this redesign; only the
  prompt's on-screen pixels change.
- The non-TTY guard on the `hexagram-manual` bin
  (`NO_COLOR=1`/`CI=true`/piped stdout → stderr + exit 1) — unchanged.
- Plain-mode plumbing — there is none, and this spec adds none.

## Open questions

None. All eight branches resolved during brainstorming on 2026-05-28.
