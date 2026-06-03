# Casting Invariants

Domain rules every agent must uphold when touching the yarrow-stalk casting
pipeline — adding an input flow, a renderer, a converter, or anything that
produces or consumes a `SplitRecord`. The rationale lives in
[ADR-0006](../adr/0006-casting-algorithm-rewindable-core-and-randomness.md); this
file is the operational checklist.

## The never-zero-remainder invariant

A division-by-four remainder is **always 1..4**, never 0 (揲之以四 counts a
multiple of four's last group as the remainder). A remainder of 0 only appears
for a degenerate _empty_ heap, which the procedure must never produce.

There are **two different "maxes"** for each cast — keep them straight:

| Quantity                | Value        | Meaning                                                                                                                                                    |
| ----------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recorded max            | `stalks − 1` | `SplitRecord.max`; reserves the suspended stalk 掛一. Used for the readout, conservation, the saved file. Returned by `maxPickFor(state)`.                 |
| Selectable pick ceiling | `stalks − 2` | The highest `pick` a flow may offer/draw. Reserves a SECOND, countable stalk so the right heap's remainder stays 1..4. = `selectablePickMax(recordedMax)`. |

## Rules

1. **Never offer or draw `pick === recordedMax`.** Clamp every user- or
   RNG-chosen pick to `selectablePickMax(recordedMax)` from
   `@hexagram/core/casting-derivation`. Do **not** hand-roll the `− 1` — import
   the function. (A hand-rolled copy in the legacy converter once encoded the
   wrong bound; that's why this rule exists.)
2. **Still record the full `recordedMax`** in the `SplitRecord`. The cap is on
   the _pick_, not the recorded max — readout, conservation, and file format
   depend on the recorded value being `stalks − 1`.
3. **`performCast` is the single runtime enforcer.** It calls
   `assertSelectablePick(recordedMax, pick)` and throws `RangeError` on a bad
   pick. Any new path that advances casting goes through `performCast` (directly
   or via `makeLineGenerator`); don't add a competing validator.
4. **`deriveSplit` stays tolerant — do not add a throw there.** It reconstructs
   possibly-historical `SplitRecord`s for _display_; a legacy file may carry a
   degenerate pick, and the history browser must still render it. The throw lives
   in `performCast` (the algorithm of record), never in the display path.
5. **Replay must catch the throw.** `performCast` enforces on _replay_ too — it
   can't tell a live cast from a historical one — so code that replays recorded
   picks (e.g. the legacy converter) must treat a thrown `RangeError` as a
   recoverable mismatch, not a crash (see `castingReplaysTo`). Consequence: a
   legacy file that recorded an empty right heap (`pick === max`) is **not**
   recovered — its casting converts to `null`. That's deliberate (ADR-0006): we
   don't resurrect invariant-violating casting.

## Where it lives

- `packages/core/src/casting-derivation.ts` — `selectablePickMax`,
  `assertSelectablePick`, `neverZeroMod4`, `deriveSplit`.
- `packages/core/src/index.ts` — `performCast` (enforces), `maxPickFor` (records).
- All input flows clamp to `selectablePickMax`: `random-casting.ts`,
  `casting-ui/src/viewer.tsx`, `casting-ui/src/interactive-flow.ts`; the manual
  flow's validator derives the same range structurally.
