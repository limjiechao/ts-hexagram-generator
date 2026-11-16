# The application layer: nine use cases and four driven ports

Status: Superseded by ADR-0037
Date: 2026-11-05

The overhaul is hexagonal. The driving ports are the use cases, and CLI, REST
and the PWA are adapters that invoke them. The driven ports are the only
things the application needs from the outside world. The Oracle itself is
pure and needs no ports.

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

- The Playground ("Explore") is use case 3 behind a UI that sets Line Values.
  It has no use case of its own and saves nothing.
- The public REST engine offers only use cases 3 and 8. It is stateless, with
  no Journal.
- Transcription (with Line Retraction) and Virtual Division are ways Picks
  arrive within use case 1, not use cases of their own.
- A kept Consultation is never edited, only deleted. There is deliberately no
  "edit Query" use case.
- Opening (5) never writes to storage.

## Driven ports

| Port                                                                                                                         | Needed by                             | Adapters                                                             |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| Consultation Store (keep, list, get, remove)                                                                                 | 1, 2, 4, 5, 6, 7, 9                   | Markdown files (CLI), IndexedDB (PWA)                                |
| Scripture Catalogue (text for passage references, names, Yilin, Editions; applies Reading Preference, then the Licence Gate) | 3, 5, 8, 9                            | bundled data (CLI, REST); the PWA reaches it through REST (ADR-0034) |
| Random Source (uniform random integers)                                                                                      | 1 (Automatic Division)                | `node:crypto`, WebCrypto                                             |
| Clock (the current moment)                                                                                                   | 1 (Divined At of a Cast Consultation) | system clock                                                         |

ADR-0023's Remainder-Group policy is a pure rule that consumes random
integers. Only the integers cross the port.

## Considered options

- **Typst as a Consultation Store**, next to Markdown and IndexedDB. Rejected.
  A store must read back what it kept, and recovering records by parsing
  typesetting source is fragile. Typst is an output medium in the Presentation
  context, reached by use case 9.
- **"Open" refreshing a stale Markdown body**, as the current history browser
  does. Rejected. A read must not write. Re-rendering bodies is an explicit
  maintenance action of the Markdown Store (ADR-0030).
