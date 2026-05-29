# Hexagram & trigram data: TS source → generated JSON

Status: Accepted
Date: 2026-05-29

The 64 hexagram and 8 trigram records are **authored in TypeScript**
(`packages/core/src/models/*.ts`) and **generated into JSON**
(`hexagrams.json` / `trigrams.json`) by `pnpm generate-json-files`. The JSON is
the runtime source consumed via `resolveJsonModule`; the TypeScript is the editing
source.

The split gives both halves their strengths: the `.ts` form gets full type
checking, structural composition, and imports while a human edits scripture,
exegesis, names, and metadata; the `.json` form is a flat, inspectable artifact
that loads at runtime without pulling the authoring machinery into the bundle. The
generator output is run through `oxfmt` so the committed JSON is readable and its
diffs are stable.

Lookup is funnelled through `getHexagramRecord(hexagram)` (and siblings) at
`@hexagram/core/getters`, which converts a `[Line × 6]` tuple to a `HexagramKey`
and returns the record. Derived presentation data (names, scripture, translations)
is **never persisted into a consultation file** — it is always recomputed through
these getters. See [ADR-0008](0008-consultation-file-format.md).

## Considered options

- **Hand-maintained JSON only.** Rejected: no type safety while editing 64×
  multi-field records; easy to introduce a malformed entry.
- **Pure TS, no JSON, bundled at build.** Rejected: would drag the authoring
  module structure into every consumer and lose the cheap, inspectable runtime
  artifact; `resolveJsonModule` import is simpler and tree-shakes cleanly.

## Consequences

- The TS and JSON must be kept in sync: **after editing the `.ts` records, run
  `pnpm generate-json-files`** or the runtime data goes stale. This is the one
  manual step the split costs.
- The JSON is generated, not hand-edited — edits belong in the `.ts` source.

## Where it's enforced

- `packages/core/src/models/*.ts` — the authoring source.
- `packages/core/src/models/*.json` — generated runtime data.
- `packages/core/package.json` `generate-json-files` script — regenerates + `oxfmt`.
- `packages/core/src/getters.ts` — `getHexagramRecord` lookup entrypoint.
