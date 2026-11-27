# New Journal files are hard-linked

Status: Accepted
Date: 2026-11-27
Amends: [ADR-0030](0030-consultation-record-v2-and-markdown-store.md) ("Writes are atomic")

This amends ADR-0030 on one point only: how the Markdown Store makes a write
atomic. It folds R-471, and is a separate ADR by R-475. Everything else in
ADR-0030 stands.

ADR-0030's rule now reads:

- **Writes are atomic** (a temporary file, then a hard link for a new file,
  since a link refuses to replace one, or a rename for a re-rendered body),
  and a new file never overwrites an existing one.

## Why

ADR-0030 said "temporary file, then rename" and also that a new file never
overwrites an existing one. A rename silently replaces a file already at its
target, so for a new file the two rules could not both hold. A hard link from
the temporary file to the target is as atomic as a rename, and it fails when
a file already holds the name. Only a link meets both rules (R-471).

A re-rendered body is meant to replace the old one, so it keeps the rename.

## Considered options

- **A hard link for a new file, a rename for a re-rendered body (chosen).**
  Both of ADR-0030's rules hold.
- **A rename for every write.** Rejected. A new file could overwrite one
  already at its name.
- **Where a link is unsupported, fall back to check, then rename.**
  Rejected. Between the check and the rename lies a small window in which a
  file could be overwritten, which breaks never-overwrite.
- **Where a link is unsupported, fall back to writing the final name
  directly with `wx`.** Rejected. A reader could see a partial file, which
  breaks atomic writes.

Either fallback breaks one of ADR-0030's two rules, so a Journal without hard
links is unsupported instead. ADR-0020 puts the Journal in the repository's
`consultations` folder, and a fallback can be added later (R-471).

## Consequences

- The Journal's folder must be on a filesystem with hard links; on one without
  (FAT, exFAT, some network shares) writes fail.
- ADR-0030 and this ADR are to be consolidated into one text (R-475).

## Where it's enforced

- `overhaul/store-markdown/src/atomic-files.ts`: `createExclusively` links,
  `replaceAtomically` renames.
