# The Transcription checks run complete, Remainders, Set-aside, conservation

Status: Proposed
Date: 2026-11-26
Amends: [ADR-0011](0011-manual-casting-flow-design.md) ("Tiered validation, in priority order"), for the overhaul only

This amends ADR-0011 on one point only: the order in which the overhaul checks
a **Transcription**. It folds R-276. Everything else in ADR-0011 stands as
"What remains of ADR-0011" sets out.

`transcribe` applies ADR-0038's four Transcription checks in this order. The
first check that fails is the rule the refusal names:

1. **`complete`**: all four counts are present, and `pilesLeft` and
   `pilesRight` are whole numbers from 0. A pile count that is not a whole
   number from 0, such as 2.5 or −1, fails `complete`, as the legacy
   Transcription flow treats it.
2. **`remainders`**: `remainderLeft` and `remainderRight` are each 1, 2, 3
   or 4. A Remainder is never 0.
3. **`set-aside`**: the Set-aside, the Hung Stalk plus both Remainders, is 5
   or 9 in a Line's first Round, and 4 or 8 in its second and third.
4. **`conservation`**: 4 × `pilesLeft` + `remainderLeft` + 4 × `pilesRight` +
   `remainderRight` + 1 equals the Round's stalks.

A Transcription that passes all four gives Pick = 4 × `pilesLeft` +
`remainderLeft` (ADR-0038).

## Why

ADR-0011's order runs conservation before the Set-aside. With pile counts
whole numbers from 0, that order can never report `set-aside`, and no order
can report `valid-pick`.

**Conservation forces the Set-aside.** A Line's first Round has 49 stalks.
Its later Rounds have 44, 40, 36 or 32, each a multiple of 4. The piles count
a multiple of 4, so conservation fixes the Remainders modulo 4:

- With 49 stalks, `remainderLeft` + `remainderRight` + 1 ≡ 1 (mod 4), so the
  two Remainders sum to 0 modulo 4. Each is 1 to 4, so they sum to 2 to 8, and
  therefore to 4 or 8. The Set-aside is 5 or 9.
- With 44, 40, 36 or 32 stalks, `remainderLeft` + `remainderRight` + 1 ≡ 0
  (mod 4), so the Remainders sum to 3 or 7. The Set-aside is 4 or 8.

A Transcription that passes `remainders` and `conservation` therefore always
passes `set-aside`. Run after conservation, the Set-aside check never fires.
Run before it, the check fires. In a first Round, Remainders 1 and 1 give a
Set-aside of 3 and fail `set-aside`, naming the Remainders as the miscount.
Conservation stays reachable: piles 5 and 1 with Remainders 2 and 2 give a
Set-aside of 5 but count 29 stalks, not 49.

**`valid-pick` is unreachable for Transcription.** A Transcription that
passes `remainders` and `conservation` leaves a left heap of 4 × `pilesLeft` +
`remainderLeft` ≥ 1 stalk. Its right heap, Hung Stalk included, holds
4 × `pilesRight` + `remainderRight` + 1 ≥ 2. The Pick is therefore 1 to
stalks − 2, which is ADR-0023's valid range. `valid-pick` stays in
`DivisionRule` for `divide`, but `transcribe` never reports it, and its tests
assert that.

**Why a non-whole pile count fails `complete`.** The arithmetic above holds
only for whole pile counts from 0. In a first Round, `pilesLeft` −1,
`remainderLeft` 1, `pilesRight` 12 and `remainderRight` 3 conserve 49 stalks
with a Set-aside of 5, yet derive a Pick of −3. `pilesLeft` 0.25,
`remainderLeft` 1, `pilesRight` 11 and `remainderRight` 2 conserve 49 with a
Set-aside of 4. Failing such counts as `complete` keeps both results out.

## Conservation's display

ADR-0011's CLI shows a failed conservation as the red `MISSING STALKS` gauge,
not as strip text. This ADR fixes only which rule a refusal names. How the
overhaul's CLI shows each rule, the gauge included, is now the CLI manual's
(ADR-0042, "User manuals").

## What remains of ADR-0011

- **For the legacy app**, ADR-0011 stands whole: its order (incomplete,
  zero-remainder, conservation, suspended sum), its gauge and its enforcement
  in `domain/core/src/manual-validation.ts`. This ADR does not change the
  legacy app.
- **For the overhaul**, this order replaces ADR-0011's tiers. These parts
  still hold:
  - Four-field entry, with the Pick derived from the left heap and the right
    heap only a cross-check. ADR-0038's `transcribe` form carries it.
  - Remainders checked before conservation, for ADR-0011's reason. A 0
    Remainder hidden by a compensating pile count passes the sum.
  - Conservation and the Set-aside together keep the Pick in range, so no
    separate range check exists. "Why" restates this as `valid-pick`'s
    unreachability.
- "No provenance field" is reversed by ADR-0027. The two-line rewind becomes
  Line Retraction, which moves out of the core into the casting use case
  (`CONTEXT.md`).
- ADR-0011's other decisions describe the legacy CLI's screen: Ink-only, the
  height floor, the pure row-builder layout, the bottom strip and the gauge.
  Whether the overhaul's CLI keeps them is the CLI manual's question. This
  ADR neither carries them over nor drops them.

## Considered options

- **Amend the order (chosen).** Every Transcription check can fire and be
  tested, and the more specific message comes first.
- **Keep ADR-0011's order and document `set-aside` as unreachable.**
  Rejected. It names a refusal that no Transcription can produce.
- **Drop `set-aside` from `DivisionRule`.** Rejected. It would amend the
  ratified type, ADR-0038 and `CONTEXT.md`'s Transcription, which names the
  Set-aside check, and lose the more specific message.

## Consequences

- `set-aside` must stay ahead of `conservation`. Swapping them back makes
  `set-aside` unreachable again.
- `complete`, `remainders`, `set-aside` and `conservation` each have a
  Transcription that reports them. `valid-pick` has none.
- ADR-0038 lists the Transcription checks. Their order is this ADR's.

## Where it's enforced

- `overhaul/oracle/src/division.ts`: `transcribe`, and `DivisionRule`.
