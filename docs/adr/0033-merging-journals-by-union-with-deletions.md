# Journals merge by union with Deletion Records; the REST engine stays stateless

Status: Superseded by ADR-0037
Date: 2026-11-05
Amends: [ADR-0029](0029-application-use-cases-and-driven-ports.md) (adds use case 10, extends the Consultation Store port)

The owner keeps one Journal per Consultation Store: Markdown files for the CLI,
and IndexedDB per browser for the PWA. They are united by a new use case,
**10 Merge Journals**. One Journal is exported as a bundle of version-2
records (ADR-0030) plus its Deletion Records. That bundle is merged into
another Journal: the union of Consultations by Consultation Id, minus every
Id named in either side's Deletion Records. Merging is symmetric and
idempotent.

## Why

ADR-0031 keeps the REST engine stateless, so it holds no Journal, yet a
Consultation cast on the phone should be able to reach the CLI's history.
Two earlier decisions make merging trivial. Kept Consultations are never
edited (ADR-0029), and Consultation Ids are globally unique ULIDs
(ADR-0030). So the same Id always means byte-identical content, and a union
has no conflicts to resolve. The only case a plain union gets wrong is
deletion, which it would undo. A Deletion Record (the Id and when it was
deleted) prevents that.

## Considered options

- **Separate, unconnected Journals.** Rejected: the owner's history would be
  split across devices.
- **A server-side Journal on the private REST API, with sync.** Deferred, not
  rejected. It makes the engine stateful and needs a database and a sync
  protocol. Immutable records and ULIDs would make it equally simple to add
  later, if manual merging becomes a chore.

## Consequences

- The Consultation Store port gains Deletion Records: `remove` keeps one, and
  the Store lists them for export. Each store keeps them its own way (e.g. a
  small file of deleted Ids beside the Markdown files).
- A Deletion Record is permanent: a merged-in copy of a deleted Consultation
  is always dropped. Undoing a deletion is not supported.
- A bundle carries Consultations, so it carries private data. It must never
  be committed to the repository (the data-hygiene rules of ADR-0015).
