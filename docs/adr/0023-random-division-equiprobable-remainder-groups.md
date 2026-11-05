# Random Divisions draw a Remainder Group first (¼ each), then a Pick within it

Status: Accepted
Date: 2026-11-05
Supersedes: the "uniform split point" random model of [ADR-0006](0006-casting-algorithm-rewindable-core-and-randomness.md) (its 2026-06-08 amendment)

When the computer casts at random, each **Division** is made by first choosing one
of the four **Remainder Groups** with probability ¼ each, then choosing a valid
**Pick** uniformly from within that group. The ritual order is unchanged: the Pick
is a real Division, and the Hung Stalk, counting off in fours, Remainders and
Set-aside all follow from it as in every other Round. A random Casting therefore
stays fully determined by its eighteen Picks. Only the _weighting_ of which Pick
the computer makes changes. The resulting Line Values have exactly the classical
yarrow probabilities: Old Yin 6 = 1/16, Young Yang 7 = 5/16, Young Yin 8 = 7/16,
Old Yang 9 = 3/16.

The justification is that this is how a real hand behaves. A hand dividing
stalks by feel cannot place its split precisely enough to steer which Remainder
comes out. The superseded model, which makes every valid Pick equally likely,
treats a split at the extreme edge (1 | 48) as being as likely as one in the
middle (24 | 25). That edge weighting, not any property of the procedure, is why
it misses the classical figures.

This ADR records the reasoning in full, because the decision overturns an
earlier one and is surprising without it. Terms (Round, Division, Pick, Hung
Stalk, Remainder, Set-aside, Remainder Group) are as defined in `CONTEXT.md`.

## Context: random casting is just another source of Picks

A Casting is fully determined by its eighteen Picks, and the Pick (the count of
stalks in the left heap) is the only freely chosen value in a Round. Slider,
typed number, Transcription and random casting differ only in _where the Pick
comes from_. So "random casting" raises exactly one question: **with what
probability should the computer choose each Pick?**

A valid Pick leaves at least one stalk in the left heap, and at least one
countable stalk in the right heap after the Hung Stalk is taken from it. With N
stalks in the Round, the valid Picks are 1 … N−2.

## How the classical probabilities are derived

The classical figures rest on one assumption: in each Round, the left Remainder
is equally likely to be 1, 2, 3 or 4. Everything else is arithmetic.

**Round 1.** 49 stalks. One is hung, leaving 48 to count in two heaps. Because
48 is a multiple of 4, the two Remainders must sum to 4 or 8:

| Left Remainder | Right Remainder | Set-aside (1 + both) |
| -------------- | --------------- | -------------------- |
| 1              | 3               | 5                    |
| 2              | 2               | 5                    |
| 3              | 1               | 5                    |
| 4              | 4               | **9**                |

So P(Set-aside 5) = ¾ and P(Set-aside 9) = ¼.

**Rounds 2 and 3.** 44 or 40 stalks remain. One is hung, leaving 43 or 39. Both
are 3 more than a multiple of 4, so the Remainders sum to 3 or 7:

| Left Remainder | Right Remainder | Set-aside |
| -------------- | --------------- | --------- |
| 1              | 2               | 4         |
| 2              | 1               | 4         |
| 3              | 4               | **8**     |
| 4              | 3               | **8**     |

So P(Set-aside 4) = P(Set-aside 8) = ½ in each of these Rounds.

**The Line.** After three Rounds the stalks remaining are 49 minus the three
Set-asides. Divided by four, that gives the Line Value. Count how many of the
three Set-asides were the large one (9 in Round 1, 8 in Rounds 2 and 3):

| Large Set-asides | Remaining    | ÷ 4 | Line Value | Probability                            |
| ---------------- | ------------ | --- | ---------- | -------------------------------------- |
| 0                | 49 − 13 = 36 | 9   | Old Yang   | ¾ · ½ · ½ = **3/16**                   |
| 1                | 49 − 17 = 32 | 8   | Young Yin  | ¼ · ½ · ½ + ¾ · (2 · ½ · ½) = **7/16** |
| 2                | 49 − 21 = 28 | 7   | Young Yang | ¼ · (2 · ½ · ½) + ¾ · ½ · ½ = **5/16** |
| 3                | 49 − 25 = 24 | 6   | Old Yin    | ¼ · ½ · ½ = **1/16**                   |

Two well-known characteristics of yarrow follow directly. Yang and yin are
balanced overall (8/16 each). Old Yang is three times as likely as Old Yin.
Three-coin casting, by contrast, gives 1/8, 3/8, 3/8, 1/8. That asymmetry is the
classic difference between the two methods, and it is part of what makes this
a yarrow oracle.

## Why the uniform-Pick model misses those figures: Remainder Groups

A **Remainder Group** is the set of valid Picks that leave the same left
Remainder. The left Remainder is the Pick mod 4, with 0 counted as 4. Under a
uniform choice over all valid Picks, each group's probability is its size
divided by the number of valid Picks. The groups are not the same size:

| Stalks in Round | Valid Picks | Group sizes (Remainder 1 / 2 / 3 / 4) |
| --------------- | ----------- | ------------------------------------- |
| 49 (Round 1)    | 1 … 47      | 12 / 12 / 12 / **11**                 |
| 44              | 1 … 42      | 11 / 11 / **10** / **10**             |
| 40              | 1 … 38      | 10 / 10 / **9** / **9**               |

In Round 1, Remainder 4 is one short because its next member, Pick 48, would
leave the right heap empty, and the never-empty rule excludes it. So P(Set-aside 9) = 11/47 ≈ 23.4% instead of ¼.

It is tempting to blame the never-empty rule for the whole drift. That is wrong.
In Rounds 2 and 3 the groups are unequal mainly because a range of Picks rarely
divides evenly into fours. Even if empty-heap Picks were allowed (1 … 43 for 44
stalks), the groups would be 11 / 11 / 11 / 10. ADR-0006's amendment measured
the same thing from the other side: removing the rule moves the figures
_further_ from the classical ones, not closer. The drift belongs to the
uniform-Pick model's edge effects. The rule is a small part of it.

Small per-Round tilts compound over three Rounds. The exact Line Value
probabilities under each model (computed by enumerating every Pick of every
Round, not sampled) are:

| Line Value   | Uniform Pick (superseded) | Remainder Group ¼ (this ADR) |
| ------------ | ------------------------- | ---------------------------- |
| Old Yin 6    | 5.17%                     | 6.25% (1/16)                 |
| Young Yang 7 | 28.87%                    | 31.25% (5/16)                |
| Young Yin 8  | 44.84%                    | 43.75% (7/16)                |
| Old Yang 9   | 21.12%                    | 18.75% (3/16)                |

The largest deviation of the superseded model is about 2.4 percentage points
(Young Yang 7 and Old Yang 9). This agrees with ADR-0006's empirical run of one
million Lines.

## Can we assume a hand gives equiprobable Remainders?

This is the load-bearing assumption, so it was examined rather than taken on
trust.

The left Remainder is simply _which of the four stalks in a group of four_ the
split lands on. The question is how precisely a hand can place a split. Model a
hand as splitting near the middle with some spread σ, measured in stalks. For
any smooth spread, the bias in the mod-4 position shrinks roughly as
e^(−π²σ²/8). Computing it exactly for a hand centred on the middle of each
Round:

| Hand's spread σ        | Largest deviation of any left-Remainder probability from ¼ | Resulting Line Values 6 / 7 / 8 / 9 |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------- |
| 1 stalk (nearly exact) | 10.3 pp                                                    | 19.9% / 16.9% / 50.7% / 12.5%       |
| 1.5 stalks             | 2.2 pp                                                     | 8.3% / 27.8% / 46.1% / 17.8%        |
| 2 stalks               | 0.25 pp                                                    | 6.5% / 30.8% / 44.0% / 18.7%        |
| 3 stalks or more       | ≈ 0                                                        | 6.25% / 31.25% / 43.75% / 18.75%    |

So equiprobable Remainders hold for **any hand that does not place its split to
within one or two stalks**. Dividing 49 thin stalks by feel, without counting,
is far less precise than that. The ritual also wants the division to be
unpremeditated (分而為二以象兩). A diviner who aims the split defeats its
purpose.

Two caveats are recorded honestly:

- This is reasoning, not measurement. No empirical study of real hands was
  consulted.
- Only a hand precise to about one stalk breaks the assumption. Such a hand
  could steer the outcome, which the procedure exists to prevent.

This reframes the choice. One could simulate a "realistic hand" directly, for
example splits spread around the middle with σ = 4. Every such hand converges
on the classical figures, but the model would need an invented σ. The
Remainder-Group model is **the limit that every realistic hand converges to**,
and it has no invented parameter. The uniform-Pick model is the outlier: it is
the only candidate in which splits at the extreme edges are as likely as splits
in the middle, which no hand does.

## Considered options

- **Uniform over all valid Picks** (superseded; shipped since ADR-0006).
  Rejected. It was justified as "simulating the physical division 分而為二", but
  it is no more physical than the alternative. Its distinguishing assumption
  (edge splits as likely as middle splits) is the least physical of all the
  candidates. It misses the classical figures by up to ~2.4 pp.
- **Simulate a realistic hand** (Picks spread around the middle with a chosen
  σ). Rejected. It reproduces the classical figures for any σ of about 3 or
  more, so it adds an invented parameter and buys nothing.
- **Draw Line Values directly from 1/16, 5/16, 7/16, 3/16** (no Picks).
  Rejected. A random Casting would have no Picks, which breaks "a Casting is
  fully determined by its eighteen Picks". Random Consultations would then
  carry a synthetic or absent record, unlike every other Casting.
- **Remainder Group ¼, then a uniform Pick within the group** (chosen). It
  produces a genuine, valid Pick for every Round. It gives the classical
  probabilities exactly. It rests on one stated, mild physical assumption, and
  it has no free parameter.

## Consequences

- **Random Picks are not uniform over the Pick range.** Within a Round, a Pick
  in a smaller Remainder Group is slightly more likely than one in a larger
  group (e.g. Round 1: each Pick with Remainder 4 has probability ¼ · 1/11; the
  others ¼ · 1/12). This is intended. Tests should assert the Remainder-Group
  and Line-Value distributions, not uniformity of Picks.
- **The classical probabilities become a correctness oracle for random
  casting.** ADR-0006 called them "a reference point, not a target". They are
  now the target, and they can be checked exactly by enumeration rather than by
  wide statistical bands.
- **The core does not change.** It still only defines which Picks are valid and
  what follows from them. The choice of probability model lives in the random
  Pick source, outside the core, behind a random-source port. The core stays
  pure and free of randomness.
- **The never-empty rule stays exactly as it is.** This decision does not
  depend on relaxing it.
- **Other Pick sources are unaffected.** Slider, typed and Transcription Picks
  are whatever the person chose or observed. Their distribution is the
  person's, not the computer's.
- **Saved random Castings stay comparable.** They are ordinary Pick sequences,
  so they replay and validate exactly like any other Casting.

## Where it's enforced

Not yet implemented; this is a design decision for the overhaul. When it is,
the random Pick source should carry an exact test that enumerates every Round
and asserts that the Line Value distribution equals 1/16, 5/16, 7/16, 3/16. The
test should be exact, not statistical.
