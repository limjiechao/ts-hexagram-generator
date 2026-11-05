# Hexagram identity is its Figure; invariant facts are data in the core, tradition-dependent facts are data in the catalogue

Status: Accepted
Date: 2026-11-05

**Identity.** In the Oracle, a Hexagram is identified only by its Figure: six
yin/yang polarities, read bottom-up from Line Position 1 (e.g. `111111` for 乾,
written with 1 = yang). REST resources use the Figure as their identity
(`/hexagrams/111111`). That identity stays stable whatever name or sequence
number a text tradition attaches.

**Invariant facts are data, in the core.** The facts that never change for a
Hexagram, under any text tradition, are held in one 64-row table owned by the
Oracle. Each row maps a Figure to its Lower and Upper Trigram, its Nuclear,
Inverse and Reversed Hexagram, and its Fuxi Sequence Number. They are _data_,
not functions computed on demand. This follows the Law of Least Power: a
finite, unchanging fact is most transparent as a readable table. Any consumer
can use it without running our code (a REST client, a PWA, a Typst template),
and nobody needs to know, for example, the yin = 1 / bottom-bit-highest
convention behind the Fuxi number. Tests check all 64 rows exhaustively
against the defining rules. The rules live in the tests, as proof; the table
is the published fact.

**Tradition-dependent facts are data, in the Scripture Catalogue.** Names and
the Received Sequence Number (the King Wen order) follow no rule and vary by
text tradition. The Mawangdui manuscript names 乾 鍵 and orders the Hexagrams
differently. So they belong to an edition, alongside the passages.

**What stays computation.** Only what composes those tables over the 4,096
Transformations: the Emerging Hexagram (flipping the Moving Lines) and the
Applicable Passages. A 4,096-row table would be generated output, less clear
than the rule over the 64-row table.

## Considered options

- **Derive the Fuxi number (and Trigrams, 互, 錯, 綜) by rule at run time.**
  Rejected by the owner on Least Power grounds. It is cheap, but it hides an
  unchanging fact behind code that every consumer must run or re-implement.
- **Put the Fuxi number in the catalogue with the King Wen number.** Rejected.
  The catalogue holds facts that depend on a text tradition. The Fuxi number is
  the same for every tradition; it is the Figure read as a number. Placing it
  with edition data would tie it to an edition.
- **Use the Fuxi number (1–64) as the identity instead of the Figure.**
  Rejected. It encodes the Figure through a convention (yin = 1, top line least
  significant) that a reader must know, and it runs against bottom-up Line
  Positions. The six-digit Figure is self-describing.
- **Drop the Fuxi order entirely.** Initially proposed, then withdrawn once it
  was recognised as a pure property of the Figure rather than tradition data.

## Consequences

- There are exactly two kinds of tabulated data with different owners: the
  Oracle's 64-row Hexagram table (invariant), and the catalogue's per-edition
  tables (names, Received Sequence Number, passages).
- Adding a new edition never touches the Oracle's table. Correcting a row of
  the Oracle's table is a domain change, caught by the exhaustive rule tests.
