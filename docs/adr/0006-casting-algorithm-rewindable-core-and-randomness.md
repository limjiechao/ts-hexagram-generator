# Casting algorithm, rewindable core & randomness

Status: Accepted
Date: 2026-05-28

The yarrow-stalk procedure (四營, the four operations, run three times per line —
三變成爻) is modelled as a **pure step function over an immutable state value**,
with a generator kept as a thin compatibility wrapper.

- **`performCast(state, pick) → state`** is the algorithm of record. `LineState`
  is a phase-discriminated union (`0th-cast` → `1st-cast` → `2nd-cast` →
  `3rd-cast`), and a conditional `NextPhase` type binds the output phase to the
  input phase exactly. `AdvanceableLineState` excludes the resolved `3rd-cast`
  phase, so calling `performCast` on a finished line is a **compile error**, not a
  runtime throw.
- **`makeLineGenerator`** is re-expressed as a wrapper that drives `performCast`.
  Existing callers keep the generator interface; the pure step is what new code
  builds on.

The pure-value design is what makes the casting UI **rewindable**: state is just
data, so a line can be reset or replayed from a `SplitRecord` prefix without any
suspended generator frame to unwind. The manual flow's undo is built directly on
this — see [ADR-0011](0011-manual-casting-flow-design.md).

**Randomness uses `node:crypto`, never `Math.random`.** Random casting splits are
drawn with `node:crypto.randomInt`, and `cryptoRandom()` (`@hexagram/core/crypto-random`)
provides a `[0, 1)` float for the few places that need one (e.g. the Home banner
animation). Its default `MAX` is `2^48 − 1` — `randomInt`'s safe upper bound and
the largest value that divides evenly into a JS double without low-bit precision
loss. The result: no flow in the app depends on V8's pseudorandom generator. (The
file is named `random-casting.ts`, not `random.ts`, to reserve the generic name —
it is yarrow casting, not a general RNG utility.)

**A pick must never empty the right heap — the never-zero-remainder invariant.**
Each cast parts the unparted stalks at an index `pick`. The recorded
`SplitRecord.max` is `unparted − 1` (it reserves the right heap's suspended
stalk, 掛一). The _selectable_ ceiling is one lower still — `max − 1` — because a
pick of `max` would leave the right heap with only that suspended stalk, nothing
to count by fours, and a division-by-four remainder of 0. A remainder is always
1..4 (揲之以四 counts a multiple of four's last group as the remainder, never 0),
so the right heap must keep a second, countable stalk. The rule has **one home**
— `selectablePickMax(recordedMax)` in `casting-derivation.ts` — and one runtime
guard, `assertSelectablePick`, which `performCast` calls on every cast. Every
input flow (slider, typed, plain Inquirer, RNG, legacy replay) clamps to
`selectablePickMax`; the manual flow's validator derives the same `[1, max−1]`
range structurally. The recorded `max` is unchanged, so the `Stalks` readout,
conservation, and the saved file are untouched.

## Considered options

- **Scatter the `− 1` cap at each input boundary** (the original fix). Rejected
  after the fact: the rule lived as bare arithmetic in four flows, a fifth
  hand-rolled copy in the legacy converter encoded the _wrong_ bound, and the
  core tolerated the degenerate pick silently. Centralised into
  `selectablePickMax` / `assertSelectablePick` with `performCast` as the single
  enforcer; `deriveSplit` stays tolerant since it reconstructs possibly-historical
  records for display, not live casts.
- **Keep state inside the generator** (no pure step). Rejected: a suspended
  generator can't be rewound or rebuilt from a prefix; resumable/undoable casting
  would have needed an external history stack bolted on.
- **Runtime guard against over-stepping** a finished line. Rejected: the
  `AdvanceableLineState` type makes it a compile error — strictly better than a
  throw.
- **`Math.random`.** Rejected: for a divination tool the quality and
  non-dependence on V8's PRNG is worth the `node:crypto` call; the cost is
  negligible at 18 splits per consultation.

## Consequences

- The generator stays for back-compat but is not where the logic lives; change the
  algorithm in `performCast`.
- `LineState` currently never leaves the pure core (no serialise/deserialise path);
  adding persistence later is a deliberate follow-up, not assumed.
- The injected-RNG test override contract is preserved across the rename.
- Because `performCast` is also the replay engine, a legacy `.txt` that recorded
  a degenerate `pick === max` (an empty right heap) no longer replay-validates:
  its casting converts to `null` rather than being
  resurrected. We drop that recovery deliberately — `deriveSplit` still renders
  such a record for display, but the algorithm of record won't reproduce it.
  As of 2026-06-07 ([ADR-0008](0008-consultation-file-format.md)) that null is
  tagged `castingAbsence: legacy-unreplayable` — the _fact of_ unreplayability is
  now recorded, even though the casting data itself still is not recovered.

## Where it's enforced

- `domain/core/src/index.ts` — `performCast` (calls `assertSelectablePick`),
  `initialLineState`, `recordedMaxFor` (the _recorded_ max, not the selectable
  ceiling), `makeLineGenerator` wrapper.
- `domain/core/src/casting-derivation.ts` — `selectablePickMax` +
  `assertSelectablePick` (single source of truth for the never-zero-remainder
  invariant), alongside `neverZeroMod4` / `deriveSplit`.
- `domain/core/src/types.ts` — `LineState` / `AdvanceableLineState` unions.
- `domain/core/src/crypto-random.ts` — `cryptoRandom` + the `2^48 − 1` bound.
- `domain/core/src/random-casting.ts` — `randomInt`-driven splits, clamped via
  `selectablePickMax`.
- `cli/casting-ui/src/viewer.tsx`, `src/interactive-flow.ts` — slider/typed
  and plain Inquirer prompts cap the pick at `selectablePickMax`.
- `cli/casting-ui/src/viewer-flow.ts` — `splitCommitted` runs `performCast`
  over `FlowState.lineState` (the per-line algorithm's single owner).
- `domain/consultation-file/src/legacy-converter.ts` — replay guards each
  recorded pick with `assertSelectablePick`.

## Amendment — 2026-06-04: the reducer owns the per-line `LineState`

The viewer originally drove `performCast` from an imperative React hook
(`use-line-generator.ts`) that held the per-line `LineState` and the running
selectable max in `useRef`s, dispatching pre-computed `{ pick, max, line }` into
the flow reducer. That was two state machines kept in lockstep by convention,
and the manual Ctrl+R rewind needed a ref-reset-**before**-dispatch ordering to
keep the next render's max correct.

Because `performCast`/`recordedMaxFor` are pure, the per-line state now lives in the
reducer itself (`FlowState.lineState`, advanced inside the `splitCommitted`
case). The reducer is the **single owner** of the casting algorithm: it derives
the recorded `max` and the resolved `Line` from just `{ pick }`; `lineRewound`
resets the algorithm in one pure dispatch (no ordering handshake); and the random
flow's pick now passes through `performCast`'s `assertSelectablePick` guard like
every other cast. The `useLineGenerator` hook is deleted. The change is
byte-identical — the manual≡interactive saved-output test
(`cli/casting-ui/tests/viewer.test.tsx`) is the regression gate.

## Amendment — 2026-06-08: the never-zero clamp shifts the line distribution (S1)

The never-zero-remainder invariant above is stated as a structural rule (a
remainder is 1..4, never 0). It also has a **measurable effect on the line
frequencies** the RNG flow produces, which was previously recorded only as a band
width in `domain/core/tests/random-casting.test.ts`. This amendment moves that
fact into the record and states the decision explicitly.

**What the clamp does, restated.** The RNG draws each pick uniformly over the
_selectable_ range `[1, recordedMax − 1]`. Dropping the top of that range
(`pick = recordedMax`) excludes exactly the one split that would empty the right
heap after the suspended stalk (掛一) is set aside — the split whose right-heap
remainder would be 0. The excluded split is not redirected anywhere; it simply
never occurs.

**Provenance.** The invariant entered the code as the fix for a bug report:
whole consultations could surface a heap that sorted to a remainder of 0, which
the procedure (揲之以四) never yields. The fix capped the pick. What was _not_
recorded at the time is that capping the pick also reweights the four line
outcomes, because the excluded split is not distributed uniformly across line
results.

**The shift, measured.** Empirical line frequencies over n = 1,000,000 lines,
`node:crypto` RNG, drawing the pick uniformly over the split range, **with** the
clamp (`[1, recordedMax − 1]`, the shipped behavior) versus **without** it
(`[1, recordedMax]`, allowing the empty-right-heap split with a 0 remainder).
Figures vary roughly ±0.1 pp run-to-run.

| Line (value)   | with clamp (shipped) | without clamp | shift (pp) |
| -------------- | -------------------- | ------------- | ---------- |
| 6 (old yin)    | ~5.2%                | ~4.8%         | +0.4       |
| 7 (young yang) | ~28.8%               | ~27.9%        | +0.9       |
| 8 (young yin)  | ~44.9%               | ~45.1%        | −0.2       |
| 9 (old yang)   | ~21.1%               | ~22.2%        | −1.1       |

The clamp raises the two odd-numbered lines (6, 7) and lowers the two
even-positioned tails (8, 9); the largest single move is line 9 at ~1.1 pp.

**One neutral reference point, not a target.** The figures most printed I Ching
references give for these lines — 1/16, 5/16, 7/16, 3/16 (6.25% / 31.25% /
43.75% / 18.75%) — come from an _equiprobable-remainder_ model: it assumes the
sort remainders are uniform, not that the _split point_ is uniform. This codebase
models a uniform split point (it simulates the physical division 分而為二), so
**neither** the with- nor the without-clamp distribution reproduces those
fractions; they are a different modeling assumption, not a correctness oracle for
this implementation. For reference only: relative to those fractions, the clamp
happens to move every line _toward_ them, but that is an observation, not the
reason for the clamp.

**Decision.** Keep the clamp. The binding rule is the ritual one — a sort
remainder is never 0 — and the ~0.2–1.1 pp reweighting it induces is an accepted,
now-documented consequence, not an unrecorded side effect. The alternative
readings were considered and rejected:

- _Allow the empty-heap split and treat its remainder as "set aside 4"_ (the
  other never-zero-preserving reading). Rejected here: it would change the
  central single-sourced invariant (`selectablePickMax` / `assertSelectablePick`
  / `neverZeroMod4`) and the recorded-max semantics for a sub-1.1 pp move, and it
  still would not reach the equiprobable-remainder fractions (the uniform
  split-point model, not the clamp, is the dominant reason those fractions are
  not hit).
- _Draw the line outcomes from the equiprobable-remainder model directly._
  Rejected: it abandons the "simulate the four operations 四營" fidelity this whole
  pipeline is built on and makes the recorded splits synthetic rather than a real
  division.

The wide assertion bands in `random-casting.test.ts` stay a smoke test against a
grossly broken generator; the precise figures and their provenance live here.
