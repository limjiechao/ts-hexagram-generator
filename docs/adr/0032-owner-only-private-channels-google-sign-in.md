# Every channel is owner-only, behind Google Sign-in

Status: Accepted
Date: 2026-11-05

The CLI, the PWA and the HATEOAS REST API are all **Private Channels**:
reachable only by the owner. The PWA and the REST API require **Google
Sign-in** and accept exactly one Google account, the owner's. Any other
signed-in account is refused, just as an anonymous request is.

## Why

Full feature parity across the CLI, the PWA and the REST API includes the
Wilhelm–Baynes translation (in copyright; the owner's personal EPUB) and the
ctext-sourced Chinese text (redistribution unverified). Both are licensed for
the owner's personal use only (ADR-0028). Restricting every channel to the
owner keeps all three channels at full parity without redistributing anyone's
protected work. A public deployment would have shipped Legge alone.

"Authenticated" alone is not enough. A channel open to any signed-in user
would be distribution again, so the allow-list is a single account.

## Considered options

- **A public PWA and REST API that ship open-licensed Editions only, with
  users importing their own copies of gated Editions.** Rejected. It adds an
  Edition-import use case and gives up parity, to serve users the owner does
  not intend to have.
- **Public channels with open data only.** Rejected. Wilhelm–Baynes would
  never be available beyond the CLI.

## Consequences

- Every REST response is `Cache-Control: private` (ADR-0038). Shared and CDN
  caching are off the table; client caching remains.
- The Licence Gate stays in the design. It applies the moment any channel
  admits anyone other than the owner.
- Google is an external dependency for the PWA and REST API. The CLI needs no
  sign-in.
