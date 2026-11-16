# The application layer: ten use cases, four driven ports, and the channels that invoke them

Status: Accepted
Date: 2026-11-16
Supersedes: [ADR-0029](0029-application-use-cases-and-driven-ports.md), [ADR-0033](0033-merging-journals-by-union-with-deletions.md), [ADR-0034](0034-pwa-is-a-pure-rest-client.md), and the PWA-side parts of [ADR-0035](0035-pwa-feature-parity-with-the-cli.md)

This consolidates ADRs 0029, 0033 and 0034, plus the parts of ADR-0035 about
the PWA, into one current text (ADR-0036: one statement per topic). Every
decision and every rejected option in them is kept. The REST engine itself is
in [ADR-0038](0038-rest-engine.md).

The overhaul is hexagonal. The driving ports are the use cases; the CLI, the
REST engine and the PWA are adapters that invoke them. The driven ports are
the only things the application needs from the outside world. The Oracle is
pure and needs no ports. Every channel is a Private Channel (ADR-0032).

## Use cases (driving ports)

| #   | Use case                                                                       | Actor      | Changes state |
| --- | ------------------------------------------------------------------------------ | ---------- | ------------- |
| 1   | Cast a Consultation (Query, 18 Divisions by one Division Method, keep it)      | Querent    | yes           |
| 2   | Record a Consultation (Query, Divined At, Transformation)                      | Querent    | yes           |
| 3   | Resolve a Transformation (Hexagrams, structure, Applicable Passages with text) | anyone     | no            |
| 4   | Browse Consultations (list, filter by Query)                                   | Querent    | no            |
| 5   | Open a Consultation (load it, then Resolve its Transformation)                 | Querent    | no            |
| 6   | Delete a Consultation                                                          | Querent    | yes           |
| 7   | Import legacy files (anti-corruption layer onto 1 and 2)                       | Maintainer | yes           |
| 8   | Look up the catalogue (Hexagram, passage, Yilin Verse, Edition)                | anyone     | no            |
| 9   | Export Consultations (to Typst / PDF)                                          | Querent    | no            |
| 10  | Merge Journals                                                                 | Querent    | yes           |

- The Playground ("Explore") is use case 3 behind a UI that sets Line Values.
  It has no use case of its own and saves nothing.
- Transcription (with Line Retraction) and Virtual Division are ways Picks
  arrive within use case 1, not use cases of their own.
- A kept Consultation is never edited, only deleted. There is deliberately no
  "edit Query" use case.
- Opening (5) never writes to storage.

## Driven ports

| Port                                                                                                                        | Needed by                             | Adapters                                             |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Consultation Store: keep, list, get, remove, and Deletion Records                                                           | 1, 2, 4, 5, 6, 7, 9, 10               | Markdown files (CLI), IndexedDB (PWA)                |
| Scripture Catalogue: text for passage references, names, Yilin, Editions; applies Reading Preference, then the Licence Gate | 3, 5, 8, 9                            | bundled data (CLI, REST engine); a REST client (PWA) |
| Random Source: uniform random integers                                                                                      | 1 (Automatic Division)                | `node:crypto` (CLI), WebCrypto (PWA)                 |
| Clock: the current moment                                                                                                   | 1 (Divined At of a Cast Consultation) | system clock                                         |

ADR-0023's Remainder-Group policy is a pure rule that consumes random
integers. It lives in the application, not the Oracle; only the integers
cross the port.

## Channels

| Use case                              | CLI | PWA                                        | REST engine                               |
| ------------------------------------- | --- | ------------------------------------------ | ----------------------------------------- |
| 1 Cast (Physical, Virtual, Automatic) | ✅  | ✅ (Divisions and Transcriptions via REST) | the pure Casting resource only (ADR-0038) |
| 2 Record                              | ✅  | ✅                                         | —                                         |
| 3 Resolve / Explore                   | ✅  | ✅ (via REST)                              | ✅                                        |
| 4 Browse, 5 Open, 6 Delete            | ✅  | ✅                                         | —                                         |
| 7 Import legacy files                 | ✅  | ✅                                         | —                                         |
| 8 Look up the catalogue               | ✅  | ✅ (via REST)                              | ✅                                        |
| 9 Export (Typst / PDF)                | ✅  | ✅                                         | —                                         |
| 10 Merge Journals                     | ✅  | ✅                                         | —                                         |

- **The REST engine** offers only use cases 3 and 8 and the pure Casting
  resource. It is stateless, with no Journal.
- **The PWA has full feature parity with the CLI.** It bundles neither the
  Oracle nor the Scripture Catalogue, and reaches both through the REST engine
  as an ordinary HATEOAS client:
  - **Casting**: it follows the Casting links and forms (`next-pick`,
    `divide`, `transcribe`, `line-start`), one request per Division. For
    Automatic Division it draws random integers with WebCrypto and applies the
    Remainder-Group policy to the Remainder Groups the engine supplies.
  - **Resolution and text**: it follows links from `/transformations/…` and
    `/works/…`.
  - **Journal**: kept locally in IndexedDB.
  - **Import legacy files**: the legacy parser is anti-corruption code, not
    Oracle code, so the CLI and the PWA share it as one library. Legacy
    castings are replayed through the engine's Casting resource.
  - **Export**: the PWA renders Typst source and compiles it to PDF in the
    browser with Typst's WebAssembly build.
  - **Offline**: a service worker caches every immutable response (Casting
    states, Transformations, Hexagrams, passages) indefinitely. Anything
    already seen works offline. A new Casting or an unseen Transformation needs
    the network.
- Every domain rule the PWA needs comes through the engine and is never
  re-implemented in the PWA.

## Journals merge by union with Deletion Records

The owner keeps one Journal per Consultation Store: Markdown files for the CLI,
and IndexedDB per browser for the PWA. **Merge Journals** (10) exports one
Journal as a bundle of version-2 records (ADR-0030) plus its Deletion Records,
and merges it into another. The result is the union of Consultations by
Consultation Id, minus every Id named in either side's Deletion Records, plus
the union of the Deletion Records. Merging is symmetric and idempotent.

It has no conflicts: kept Consultations are never edited, and Consultation Ids
are globally unique ULIDs (ADR-0030), so the same Id always means
byte-identical content. The only case a plain union gets wrong is deletion,
which it would undo. A Deletion Record (the Id and when it was deleted)
prevents that.

- `remove` keeps a Deletion Record, and the Store lists them for export. Each
  store keeps them its own way (e.g. a small file of deleted Ids beside the
  Markdown files).
- A Deletion Record is permanent. A merged-in copy of a deleted Consultation is
  always dropped; undoing a deletion is not supported.
- A bundle carries Consultations, so it carries private data. It must never be
  committed to the repository (ADR-0015).

## Why

- **Use cases as the driving ports** keep orchestration out of UI components.
  The survey found the save pipeline in five places.
- **The PWA as a pure REST client is dogfooding.** The PWA is the API's first
  real client, so any gap in the hypermedia surfaces immediately. Every Oracle
  response is immutable, so offline use degrades gracefully.
- **Parity through the engine** avoids two Oracles. In every case the
  alternative was to re-implement a domain rule in the PWA or to make the
  engine stateful.
- **Merging rather than syncing** keeps the engine stateless while letting a
  Consultation cast on the phone reach the CLI's history.

## Considered options

- **Typst as a Consultation Store**, next to Markdown and IndexedDB. Rejected.
  A store must read back what it kept, and recovering records by parsing
  typesetting source is fragile. Typst is an output medium, reached by use
  case 9.
- **"Open" refreshing a stale Markdown body**, as the old history browser did.
  Rejected. A read must not write. Re-rendering bodies is an explicit
  maintenance action of the Markdown Store (ADR-0030).
- **Bundle the Oracle and catalogue in the PWA (fully offline).** Rejected. It
  bypasses the API, so the API never gets exercised by a real client.
- **Bundle a fallback Oracle for offline casting.** Rejected. It would create
  two Oracles to keep in step and defeat the dogfooding.
- **Separate, unconnected Journals.** Rejected: the owner's history would be
  split across devices.
- **A server-side Journal on the private REST engine, with sync.** Deferred,
  not rejected. It makes the engine stateful and needs a database and a sync
  protocol. Immutable records and ULIDs would make it equally simple to add
  later, if manual merging becomes a chore.

## Consequences

- A Casting in the PWA costs about 18 round trips, one per Division. This is
  acceptable for a deliberate, paced act.
- Casting or resolving anything new in the PWA requires the network and the
  owner's Google sign-in.
- The legacy parser is a shared library, not CLI code.
