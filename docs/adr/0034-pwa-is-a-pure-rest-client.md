# The PWA is a pure client of the REST engine

Status: Superseded by ADR-0037
Date: 2026-11-05
Amends: [ADR-0029](0029-application-use-cases-and-driven-ports.md) (the PWA's adapters)

The PWA does not bundle the Oracle or the Scripture Catalogue. It reaches
both through the private REST engine (ADR-0031), as an ordinary HATEOAS
client:

- **Casting.** It follows `next-pick` and the HAL-FORMS `divide` form, one
  request per Division. For Automatic Division it draws Picks with WebCrypto
  (its Random Source) and submits them like any other Pick.
- **Resolution and text.** It follows links from `/transformations/…` and
  `/works/…`.
- **Journal.** Kept locally in IndexedDB (its Consultation Store); merged with
  other Journals by use case 10 (ADR-0033).
- **Offline.** A service worker caches every immutable response (Casting
  states, Transformations, Hexagrams, passages) indefinitely. Anything already
  seen works offline; a new Casting or an unseen Transformation needs the
  network.

## Why

Dogfooding. The PWA is the API's first real client. If anything about the
hypermedia is missing or awkward, the owner meets it directly. Every Oracle
response is immutable, so a service worker can cache it forever, and offline
use degrades gracefully rather than failing.

## Considered options

- **Bundle the Oracle and catalogue in the PWA (fully offline).** Rejected.
  It bypasses the API, so the API never gets exercised by a real client.
- **Bundle a fallback Oracle for offline casting.** Rejected. It would create
  two Oracles to keep in step and defeat the dogfooding.

## Consequences

- A Casting in the PWA costs about 18 round trips, one per Division. This is
  acceptable for a deliberate, paced act.
- The PWA's Scripture Catalogue adapter is a REST client, not bundled data.
- Casting or resolving anything new requires the network and the owner's
  Google sign-in.
