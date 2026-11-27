# Consultation record version 2, Consultation Id, and the Markdown Store's rules

Status: Accepted
Date: 2026-11-27
Supersedes: [ADR-0030](0030-consultation-record-v2-and-markdown-store.md), [ADR-0045](0045-new-journal-files-are-hard-linked.md)

This consolidates ADR-0030 and its amendment ADR-0045 into one current text
(R-475). Every decision and every rejected option in them is kept. ADR-0030
had itself superseded the record shape of
[ADR-0008](0008-consultation-file-format.md), so this ADR does too.

Every Consultation Store keeps the same canonical record, encoded and decoded
by one shared codec:

| Field            | Value                                          | Notes                                                                         |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `schemaVersion`  | `2`                                            |                                                                               |
| `id`             | ULID                                           | the Consultation Id: assigned once, opaque, the same in every store           |
| `divinedAt`      | ISO 8601 date-time with offset, or a date only | the form shows the precision; date-only is allowed for Recorded Consultations |
| `query`          | string                                         | required, non-blank, verbatim                                                 |
| `transformation` | six Line Values, bottom-up, e.g. `"789876"`    | Line Position 1 first                                                         |
| `casting`        | 18 Picks as six lists of three, bottom-up      | Cast Consultations only; Picks only                                           |
| `divisionMethod` | `physical` · `virtual` · `automatic`           | present if and only if `casting` is                                           |

## Why

- **A generated Id, not the timestamp or file path.** Divined At is not
  unique: Recorded Consultations may be dated to the day, and timestamp-named
  files let same-second saves collide (BUG-002, since fixed in the current
  code by refusing to overwrite; designed out here by a generated Id).
  IndexedDB and REST have no file paths. A ULID is unique without coordination and safe in filenames and
  URLs. It carries no meaning: ordering is always by `divinedAt`.
- **Bottom-up `transformation`.** It matches Line Positions and the REST
  identity of a Transformation. The old top-first `L6..L1` mapping inverted
  the domain's order at the storage boundary.
- **Picks only.** `recordedMax` is derived from the Picks, so storing it
  invited drift. BUG-007 was a stored `recordedMax` that went unverified yet
  changed the rendered ledger; the current code now verifies it during replay.
  Version 2 designs it out by not storing it.
- **Both `transformation` and `casting` for a Cast Consultation.** The
  Transformation is derivable, but keeping it lets Browse list every
  Consultation without replaying 18 Picks. Loading checks that the Casting
  replays to it, which catches corruption.
- **Removed:**
  - `castingAbsence`: no Casting now simply means Recorded (ADR-0026).
  - `hexagram`: replaced by `transformation`.
  - the save-time `timestamp`: replaced by `divinedAt`.

## The Markdown Store

- **The frontmatter is the record; the body is a view.** The body is rendered
  by Presentation's Markdown renderer when a file is written. The Store never
  reads it.
- **Reading never writes.** Get and list are pure reads.
- **Re-rendering bodies is an explicit maintenance action**, run deliberately
  after a renderer change. It is never a side effect of opening a file
  (this replaces the old self-heal on open; BUG-004, its non-atomic write,
  is fixed in the current code, and the overhaul removes the write on read
  altogether).
- **Filenames are `<divined date>--<Consultation Id>.md`.** The date keeps a
  hand-browsed folder in a sensible order; the Id makes the name unique and
  stable. The Store never parses meaning out of a filename.
- **Writes are atomic** (a temporary file, then a hard link for a new file,
  since a link refuses to replace one, or a rename for a re-rendered body),
  and a new file never overwrites an existing one.

## Why a new file is hard-linked

ADR-0030 first said "temporary file, then rename" and also that a new file
never overwrites an existing one. A rename silently replaces a file already
at its target, so for a new file the two rules could not both hold. A hard
link from the temporary file to the target is as atomic as a rename, and it
fails when a file already holds the name. Only a link meets both rules
(R-471).

A re-rendered body is meant to replace the old one, so it keeps the rename.

## Considered options

How a write is made atomic:

- **A hard link for a new file, a rename for a re-rendered body (chosen).**
  Both rules, atomic writes and never-overwrite, hold.
- **A rename for every write.** Rejected. A new file could overwrite one
  already at its name.
- **Where a link is unsupported, fall back to check, then rename.**
  Rejected. Between the check and the rename lies a small window in which a
  file could be overwritten, which breaks never-overwrite.
- **Where a link is unsupported, fall back to writing the final name
  directly with `wx`.** Rejected. A reader could see a partial file, which
  breaks atomic writes.

Either fallback breaks one of the two rules, so a Journal without hard links
is unsupported instead. ADR-0020 puts the Journal in the repository's
`consultations` folder, and a fallback can be added later (R-471).

## Consequences

- A one-off migration converts the existing version-1 files. Each file gets an
  Id. The old save `timestamp` becomes `divinedAt`, since for Cast
  Consultations those were the same moment. `hexagram` becomes
  `transformation`, and `castingAbsence` is dropped. Every file is verified
  as it migrates.
- ADR-0008's strict refusal of unknown schema versions stays. Version 2 is a
  new version, read only after migration.
- The Journal's folder must be on a filesystem with hard links; on one without
  (FAT, exFAT, some network shares) writes fail.

## Where it's enforced

- `overhaul/store-markdown/src/atomic-files.ts`: `createExclusively` links,
  `replaceAtomically` renames.
