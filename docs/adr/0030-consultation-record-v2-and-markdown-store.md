# Consultation record version 2, Consultation Id, and the Markdown Store's rules

Status: Superseded by ADR-0046
Date: 2026-11-05
Supersedes: the record shape of [ADR-0008](0008-consultation-file-format.md)

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
- **Writes are atomic** (temporary file, then rename), and a new file never
  overwrites an existing one.

## Consequences

- A one-off migration converts the existing version-1 files. Each file gets an
  Id. The old save `timestamp` becomes `divinedAt`, since for Cast
  Consultations those were the same moment. `hexagram` becomes
  `transformation`, and `castingAbsence` is dropped. Every file is verified
  as it migrates.
- ADR-0008's strict refusal of unknown schema versions stays. Version 2 is a
  new version, read only after migration.
