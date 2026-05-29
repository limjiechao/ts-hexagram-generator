# TypeScript compiler posture

Status: Accepted
Date: 2026-05-29

A single `tsconfig.base.json` sets the compiler posture for the whole workspace;
per-package `tsconfig.json` files extend it. The posture is deliberately strict
and modern, leaning on the Node ≥24.6 runtime floor so nothing is transpiled down.

The load-bearing options and why they're set:

- **Runtime-aligned, no down-levelling** — `target: esnext`, `lib: ["es2023"]`,
  `module: preserve`, `moduleResolution: bundler`. Node 24 runs ES2023 natively, so
  output stays close to source and tsdown/esbuild owns the emit format.
- **Maximum safety** — `strict: true` plus `noUncheckedIndexedAccess: true`. The
  latter matters for this domain: indexing a `Hexagram`/`CastingRecord` tuple yields
  `T | undefined`, forcing explicit guards instead of silent out-of-bounds reads.
- **Standalone-declaration discipline** — `isolatedDeclarations`,
  `isolatedModules`, `verbatimModuleSyntax`. These force explicit types at every
  exported boundary and per-file transpilability, which is what lets tsdown emit
  `.d.mts` per entry quickly and lets esbuild process files independently. They are
  the compiler-side contract behind [ADR-0003](0003-package-publishing-and-module-strategy.md).
- **JSON-as-source** — `resolveJsonModule: true` so `core` can `import` the
  generated `hexagrams.json` / `trigrams.json` at runtime. See
  [ADR-0007](0007-hexagram-and-trigram-data.md).
- **Hygiene** — `noUnusedLocals`, `react-jsx` transform (no `import React`),
  `skipLibCheck` (third-party `.d.ts` errors are out of scope).

The Node floor is pinned in `package.json#engines` (`>=24.6.0`); the whole posture
assumes it.

## Considered options

- **Down-level to a broad target** (ES2020, `module: commonjs`). Rejected: the
  runtime floor is Node 24; transpiling would only add output distance and build
  cost for compatibility we don't need.
- **Loosen `isolatedDeclarations`** to allow inferred export types. Rejected: it
  would make per-entry `.d.mts` emit slower and context-dependent, undermining the
  publishing strategy.
- **Drop `noUncheckedIndexedAccess`** for less ceremony. Rejected: tuple indexing is
  pervasive in the casting domain; the guard catches real off-by-one bugs.

## Consequences

- Every exported function needs explicit parameter/return types — non-negotiable,
  by design.
- Bumping the Node floor or `lib` is a deliberate decision, not a drive-by edit;
  CI's runtime matrix and `engines` must move together.

## Where it's enforced

- `tsconfig.base.json` — all options above (carries an inline pointer to this ADR).
- `package.json` `engines.node` — the `>=24.6.0` floor the posture assumes.
- `turbo.json` — `type:check` depends on `^build` so cross-package declarations exist.
