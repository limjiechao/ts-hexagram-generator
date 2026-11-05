# The PWA has full feature parity with the CLI

Status: Accepted
Date: 2026-11-05
Amends: [ADR-0031](0031-rest-engine-resources-and-hypermedia.md) (adds the `transcribe` form and Line links), [ADR-0034](0034-pwa-is-a-pure-rest-client.md)

The PWA offers every use case the CLI does. Because it bundles no Oracle
(ADR-0034), every domain rule it needs comes through the REST engine, never a
re-implementation. Four additions close the gaps:

1. **Physical Division: a HAL-FORMS `transcribe` template**, beside `divide`,
   on every partial Casting. It takes `pilesLeft`, `remainderLeft`,
   `pilesRight` and `remainderRight`. The engine applies the Transcription
   checks (complete, Remainders 1–4, conservation, Set-aside), then answers
   `303 See Other` to the canonical next Casting (Pick = 4 × pilesLeft +
   remainderLeft), or `422` naming the check that failed. It is pure and
   cacheable.
2. **Line Retraction: links to Line boundaries.** Every Casting state links
   `line-start` (the prefix where the current Line began). Right after a Line
   completes, it also links `previous-line-start`. The PWA applies the
   retraction policy (Physical Division only, within the allowed window).
   Retracting is following a link back. Nothing is stored on the server, so
   nothing is deleted there.
3. **Import legacy files in the PWA.** The legacy parser is anti-corruption
   code, not Oracle code, so the CLI and the PWA share it as one library.
   Legacy castings are replayed through `/castings/…`. The results are kept in
   IndexedDB as Cast or Recorded Consultations.
4. **Export to Typst/PDF in the PWA.** The PWA renders the Typst source and
   compiles it to PDF in the browser with Typst's WebAssembly build. The REST
   engine stays read-only and stateless.

## Why

The owner expects the PWA to match the CLI feature for feature. The
alternative in each case was to re-implement a domain rule in the PWA or to
make the engine stateful. Both would recreate the "two Oracles" problem that
ADR-0034 rejected.

## Consequences

- Every use case (1–10) is available in both the CLI and the PWA.
- The REST engine gains one form and two link relations. It stays pure and
  read-only.
- The legacy parser becomes a shared library rather than CLI code.
