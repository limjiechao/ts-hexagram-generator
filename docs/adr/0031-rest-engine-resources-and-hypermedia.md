# The REST engine: resources, Casting URLs, and HAL + HAL-FORMS

Status: Accepted
Date: 2026-11-05

The REST engine (a Private Channel, ADR-0032) serves use cases 3 (Resolve a Transformation) and 8
(Look up the catalogue) of ADR-0029. It also offers a **pure** Casting
resource. It keeps no state and never generates randomness: every response
except passage text is a pure function of its URL. It is read-only (every
resource is a `GET`), and its representation format is **HAL** with
**HAL-FORMS**.

## Resources

| Resource                      | Example                                                | Contents and links                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry point                   | `/`                                                    | links to everything below; clients never hard-code URLs                                                                                              |
| Casting (complete or partial) | `/castings/L1/21-18-17/L2/21`                          | each Round's stalks, Pick, Remainders, Set-aside; Line Values so far; `parent`, templated `next-pick`, `divide` form; `transformation` once complete |
| Empty Casting                 | `/castings`                                            | 49 stalks, Round 1, valid Picks 1–47                                                                                                                 |
| Transformation                | `/transformations/978678` (six Line Values, bottom-up) | Standing and Emerging Hexagram, Moving Line Positions; links to each Applicable Passage and the Yilin Verse                                          |
| Hexagram                      | `/hexagrams/110010` (Figure, bottom-up, 1 = yang)      | Fuxi Sequence Number, Trigrams, Nuclear / Inverse / Reversed Hexagram; links to its passages                                                         |
| Trigram                       | `/trigrams/110`                                        | links to Hexagrams containing it                                                                                                                     |
| Works                         | `/works`, `/works/zhouyi`, `/works/yilin`, …           | each Work and its Citation scheme                                                                                                                    |
| Editions of a Work            | `/works/zhouyi/editions`                               | Witness, licence, language or script                                                                                                                 |
| Passage (Edition-independent) | `/works/zhouyi/passages/110010.4`                      | text per Reading Preference and Licence Gate, labelled with its Edition; links to each Edition's text and to Commentaries                            |
| Passage in one Edition        | `/works/zhouyi/editions/legge-1882/passages/110010.4`  | that Edition's text, explicit and cacheable                                                                                                          |

Citations are per Work, built on Oracle identities: 周易 `110010` (Hexagram
Statement), `110010.4` (Line Statement), `111111.all-moving`; 焦氏易林
`110010.010110` (the verse for 節之困). There are two ways in, matching the two
contexts: divination-first (Casting → Transformation → passages) and text-first
(Work → Edition → passages). Both arrive at the same passage resources.

## Casting URLs

- **One labelled segment pair per Line, Picks joined by hyphens:**
  `/castings/L1/21-18-17/L2/21-19-15/…/L6/21-18-15`. The Lines are readable
  without counting.
- **Every prefix is a resource.** A partial Casting is a shorter URL, matching
  the append-only Casting (a sequence of Picks that only grows).
- **Labels are strict.** Anything other than `L1 … Ln` in sequence, each with
  1–3 Picks and every earlier Line complete, is not a resource (`404`).
- **One canonical URL per Casting state.** A label with no Picks
  (`/castings/L1`) is rejected rather than aliasing `/castings`.
- **An invalid Pick is `422`**, naming the Line, Round, stalks, Pick, the rule
  broken and the valid range, and linking to the last valid prefix.
- **No Automatic Casting on the engine.** A random draw is not a function of a
  URL. Clients with a Random Source (CLI, PWA) choose Picks; the engine only
  validates and resolves them.

## Hypermedia: HAL + HAL-FORMS

- **HAL `_links`** carries relations: `self`, `parent`, `transformation`,
  `standing`, `emerging`, `applicable-passage`, `yilin-verse`, `edition`, and
  so on. Custom relations are compacted by curies (`yi:`) whose URLs document
  them. **`_embedded`** carries small related resources to save round trips.
- **The templated `yi:next-pick` link** (`/castings/L1/21-18-{pick}`, RFC 6570)
  lets a domain-aware client land on the canonical URL in one step.
- **The HAL-FORMS `divide` template** states the Round's valid Picks as a
  generic `min`/`max`, so a generic client can offer a correct input with no
  domain knowledge. This is the "true HATEOAS" requirement. A form submits a
  query string, so `GET …/divide?pick=17` answers `303 See Other` to the
  canonical `…-17`. `…/divide` is a redirecting entry point, not a resource.

## Caching and negotiation

- Castings, Transformations, Hexagrams, Trigrams and Work / Edition metadata
  are immutable: `Cache-Control: private, max-age=31536000, immutable`
  (`private`, because every response requires the owner's sign-in and must
  not sit in a shared cache).
- Passage text varies by Reading Preference (`Accept-Language` for script,
  query parameters for Translations and Commentaries), with
  `Vary: Accept-Language` and an Edition-version `ETag`.
- The engine is a Private Channel (ADR-0032): every request must carry the
  owner's sign-in, so every Edition is served. The Licence Gate would apply only
  if the engine were ever opened up: a public response omits gated Editions' text and
  never substitutes another.

## Considered options

- **All 18 Picks in one parameter** (`21-18-17.21-19-15…`). Rejected as
  unreadable.
- **One segment per Pick** (`/castings/21/18/17/…`). Rejected: it hides the
  Line structure.
- **Comma-separated Line segments without labels.** A workable fallback, but
  rejected because labels make the URL self-explanatory.
- **`/yilin/{…}` as a top-level resource.** Rejected: scripture is reached
  through Works, and the Yilin is one Work among several.
- **Plain HAL.** Rejected: the valid Pick range would sit in a domain field
  that only a client written for this API can read.
- **Siren, or HTML forms.** Rejected: neither has URI templates, so every
  Division would need a redirect, and HTML needs parsing.
- **JSON-LD + Hydra.** Rejected as too heavy (a vocabulary to author and
  maintain, niche tooling) for a read-only API.
