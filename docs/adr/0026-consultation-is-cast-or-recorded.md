# A Consultation is Cast or Recorded; the Playground does not save

Status: Accepted
Date: 2026-11-05
Amends: [ADR-0008](0008-consultation-file-format.md) (its `castingAbsence` reasons)

A Consultation is a Query, the moment it was divined (Divined At), and a
Transformation, plus a Casting when one exists. Every Consultation has one of
two origins:

- **Cast**: divined in the app. It carries its Casting (18 Picks), and the
  Casting must replay to exactly its Transformation.
- **Recorded**: divined elsewhere (physical stalks, an old notebook) and
  entered afterwards from its Transformation. It has no Casting.

Everything else is derived and never stored: the Hexagrams, Trigrams and
Applicable Passages. Divined At is when the divination took place. For a
Recorded Consultation the user enters it, possibly to the day only, and it is
never the save time.

## Why

The Playground's save button existed to keep real past divinations whose
Casting was never recorded. That is a genuine use case, but it was hidden
inside a study tool. It also produced a third `castingAbsence` reason
(`playground`) that mixed _how a record was made_ with _why data is missing_.
Making "Record a Consultation" a first-class action names the use case. It
lets the Playground return to pure study, and it reduces the three absence
reasons (`legacy-no-table`, `legacy-unreplayable`, `playground`) to one domain
fact: there is no Casting, so the Consultation is Recorded. Why a legacy file
had no usable table is the legacy importer's anti-corruption concern, not
domain vocabulary.

## Considered options

- **Keep saving from the Playground with `castingAbsence: playground`.**
  Rejected. It conflates study with divination and leaves the use case
  unnamed.
- **Invent a Casting that yields the known Transformation.** Rejected. Many
  Pick sequences give the same Transformation, so any chosen sequence would be
  fiction presented as a record.
- **Make Playground studies a kind of Consultation.** Rejected. Choosing a
  Transformation to study is not divination (再三瀆 marks the difference). If
  studies are ever kept, they are a separate record.
- **Use the save time as the Consultation's moment.** Rejected. For a Recorded
  Consultation the meaningful moment is when the divination happened, which may
  be days earlier.

## Consequences

- The persisted record changes. Today `hexagram` is stored alongside `casting`
  and a `timestamp` that is the save time. The overhaul stores the
  Transformation (and the Casting when present) and Divined At. Migration of
  existing files is a task for the persistence adapter.
- Legacy imports map onto the two origins. A replayable Shape-A table becomes
  a Cast Consultation. Shape B and unreplayable tables become Recorded
  Consultations.
- The Playground has no save action.
