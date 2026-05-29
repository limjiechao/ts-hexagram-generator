# Type vocabulary folded into core

Status: Accepted
Date: 2026-05-29

The domain type vocabulary (`Line`, `Hexagram`, `CastingRecord`, `LineState`,
and their assertions) now ships as the **`@hexagram/core/types` subpath** rather
than a standalone `@hexagram/types` package. This supersedes the
separate-`types`-package decision recorded in
[ADR-0002](0002-monorepo-structure-and-package-decomposition.md).

ADR-0002 justified a zero-dependency `types` package on cycle-avoidance grounds:
"every other package can import it without cycles." In practice the cycle was
theoretical. `types` had exactly one inbound edge from below — `core → types` —
and `core` is the package the vocabulary describes. Folding the vocabulary into
`core` as a subpath collapses a whole package (its own `package.json`,
`tsdown.config.ts`, `vitest.config.ts`, `tsconfig.json`, and build/test lane)
down to one source file plus one `exports` entry, and removes a dependency edge
from every consumer's manifest. `core` already sat at the bottom of the DAG with
no workspace dependencies, so it remains the acyclic base; consumers that
imported `@hexagram/types` now import `@hexagram/core/types`.

## Considered options

- **Keep `@hexagram/types` as a package.** Rejected: it was a shallow boundary —
  a single `index.ts` carrying full package ceremony, with no consumer that
  needed the vocabulary without otherwise depending (transitively) on `core`.
- **Fold into `@hexagram/core/types` (chosen).** One source file, one subpath
  export, one tsdown entry. Matches the existing `random-casting` / `getters`
  subpath pattern (ADR-0003).
- **Inline the types into `core/index`.** Rejected: a dedicated `./types`
  subpath keeps the vocabulary tree-shakeable and importable on its own, exactly
  as the standalone package was.

## Consequences

- Every former `@hexagram/types` consumer now imports `@hexagram/core/types` and
  drops the `@hexagram/types` dependency (`@hexagram/core` was already a
  dependency of all of them). `core`'s own source imports the vocabulary via the
  relative `./types.js`.
- **`viewer-core` re-acquires a `@hexagram/core` dependency.** After
  [ADR-0016](0016-readout-renderer-extraction.md) `viewer-core` had shed `core`
  entirely (its only `core/getters` use moved to `readout`). It still consumes
  the `Line` vocabulary (`banner-lines`, `utils-validators`), so folding the
  vocabulary into `core` means `viewer-core → core` returns — now purely for
  `./types`, not for getters. The edge points down (core is the base), so there
  is no cycle. This is the one place the fold trades a conceptual "vocabulary
  without algorithm" import for a `core` dependency; it was judged worth the
  package it deletes.
- `core` now ships a `./types` subpath (seven entries total). See ADR-0003.

## Where it's enforced

- `packages/core/src/types.ts` — the vocabulary (moved from `packages/types/src/index.ts`).
- `packages/core/package.json` `exports` — the `./types` subpath; and
  `tsdown.config.ts` — the matching entry.
- absence of `packages/types/` — the package is deleted.
- each consuming `packages/*/package.json` — no longer lists `@hexagram/types`.
