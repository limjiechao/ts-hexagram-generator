# A Licence Gate per Edition decides which channels may show its text

Status: Accepted
Date: 2026-11-05

Each Edition in the Scripture Catalogue carries its licence, and its text is
shown only on the channels that licence permits. The decision is made per
Edition, never per request. A public channel omits gated text; it never
substitutes another Translation or Edition in its place.

| Edition                                          | Witness                                           | Channels                                                |
| ------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------- |
| Legge, _Sacred Books of the East_ vol. 16 (1882) | a scanned copy                                    | every channel (public domain)                           |
| Wilhelm–Baynes (Princeton)                       | a personal EPUB                                   | private local use only (in copyright)                   |
| Chinese text, Traditional and Simplified         | ctext.org; Edition of the Simplified unidentified | private local use only, until ctext's terms are checked |

## Why

The requirements include a public HATEOAS REST API and a PWA. Wilhelm–Baynes
is a commercial work: Baynes died in 1977 and Princeton holds the rights. The
app's copy is a purchased EPUB. ctext.org forbids scraping, and its terms for
redistributing its transcriptions are unverified. Publishing either through a
public channel would redistribute someone else's protected work. Nothing in
the code would make this constraint visible, so it is recorded here.

## Considered options

- **Drop Wilhelm–Baynes entirely.** Rejected. It is legitimately usable in the
  owner's private local use, and it is valued there.
- **Fall back to another Translation when one is gated.** Rejected. Silently
  showing different text than the reader chose misrepresents what they are
  reading.

## Amendment — 2026-11-05: every channel is private

The owner decided that the PWA and the REST API, like the CLI, are **Private
Channels**: reachable only by the owner, behind Google Sign-in restricted to
the owner's own account (ADR-0032). "Private local use only" in the table above
therefore means "Private Channels only". Every Edition is shown on every
channel today, with full parity. The gate stays in the design: it would apply
at once to any public channel, or to any user other than the owner.

## Consequences

- Public channels ship only Legge until open-licensed Chinese Witnesses are
  sourced (for example Wikisource, or a transcription of a public-domain
  scan) or ctext's terms are confirmed.
- Every Edition needs a recorded licence before any channel can show it.
