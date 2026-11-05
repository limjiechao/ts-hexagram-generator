# Applicable Passages: every Moving Line counts, none is ranked (Zhu Xi's 考變占 rejected)

Status: Accepted
Date: 2026-11-05

The passages that bear on a Transformation are a pure structural function of it,
and all of them have equal standing:

- X之X (no Moving Line): the Standing Hexagram's 卦辭.
- Any Moving Lines: the Standing Hexagram's 卦辭, the 爻辭 of **every** Moving
  Line (in the Standing Hexagram), and the Emerging Hexagram's 卦辭.
- All six lines of 乾 or 坤 moving: additionally 用九 or 用六.

No line is ignored, none is marked primary, and Static Lines are never read in
place of Moving Lines. The Oracle returns references to these passages, never
their text. (The text lives in the Scripture Catalogue; see
`docs/reviews/2026-11-04-scripture-domain-analysis.md`.) This replaces the
current behaviour, which shows no line reference at all when two or more lines
move.

## Why (the owner's stance)

The Yijing oracle has 4,096 possible outcomes, not 384. A rule that discards
Moving Lines and keeps one passage collapses every multi-line Transformation
onto the 64 × 6 = 384 single-line cases. That throws away the distinctions
between the other 4,096 − 384 = 3,712 changes. When more than one line moves,
the diviner goes back to the fundamental images and symbols: those of the
Hexagrams and of their constituent trigrams. From these they make a fresh
interpretation from the ground up. With a single Moving Line they are equally
free to do so. The Oracle's job is therefore to present everything that
moved, with equal standing, and never to pre-digest it into one answer.

## Considered options

- **Zhu Xi's 考變占 (易學啟蒙).** This is the most widely implemented rule. It
  reads two Moving Lines with the upper as primary. With three it reads the two
  卦辭 as 貞 / 悔. With four or five it switches to the Emerging Hexagram's
  _Static_ Lines. Rejected by the owner, categorically. It discards Moving Lines
  and ranks one passage above the rest. Both are interpretive choices
  (占) that the Oracle should not make on the user's behalf (ADR-0014: the app
  casts, the user interprets).
- **A pluggable set of conventions (Zhu Xi, "all moving", …).** Rejected. It is
  generality nobody asked for. A second tradition, if ever wanted, would be
  added as a deliberate domain change.
- **Also include each Changed Line's 爻辭 (in the Emerging Hexagram).**
  Rejected. A line statement speaks of _that_ line moving within _its_ own
  Hexagram. The Changed Line's 爻辭 therefore describes the Emerging Hexagram's
  own onward transformation. For example, 姤 初六 belongs to 姤之乾, not to
  乾之姤. The outcome of the change is already carried by the Emerging
  Hexagram's 卦辭.

## Consequences

- With many Moving Lines the user sees many passages at once. Weighing them is
  the user's interpretation, by design.
- There is no "primary" concept anywhere in the domain, the API or the
  persisted data. Representations may order passages (e.g. bottom-up by Line
  Position), but order carries no rank.
- 用九 / 用六 must exist as addressable passages for 乾 and 坤, which the
  current data model lacks.
