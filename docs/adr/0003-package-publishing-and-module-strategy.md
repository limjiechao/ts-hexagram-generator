# Package publishing & module strategy

Status: Accepted
Date: 2026-05-29

Every library package declares its public surface through `package.json#exports`
**only** — no `main`, no `module`, no top-level `types`. Each export entry (the
root and every subpath) carries three conditions:

- `source` → `./src/*.ts` — the raw TypeScript, used by `tsx` and `vitest` for
  no-build development and testing.
- `types` → `./dist/*.d.mts` — declarations for consumers.
- `import` → `./dist/*.mjs` — the built ESM for consumers.

The `source` condition is the keystone: it lets the whole workspace run, test, and
dogfood off raw `.ts` with **no build step**, while published consumers get the
built `.mjs`/`.d.mts`. (`vitest` is wired to honour `source` — see
[ADR-0013](0013-test-execution-and-ci-posture.md).)

Packages with more than one concern expose **multiple entry points** rather than a
single barrel, so consumers import exactly what they need and bundlers can
tree-shake: `core` ships ten (`index`, `casting-derivation`, `crypto-random`,
`getters`, `line-semantics`, `manual-validation`, `hexagrams`, `random-casting`,
`trigrams`, `types`), `consultation-file` ships several
(`index`, `file`, `markdown`, `frontmatter`, `legacy-converter`), and `bin` ships
one per CLI command. tsdown builds each entry to its own `.mjs` + `.d.mts`; all
configs target `platform: 'node'`.

## Considered options

- **Traditional `main`/`module` + a single `index`.** Rejected: a single barrel
  defeats tree-shaking and subpath isolation, and `main`/`module` invite the wrong
  entry to be picked. `exports`-only is unambiguous.
- **Build-before-run everywhere** (no `source` condition). Rejected: it would make
  every test run and CLI invocation depend on a prior `dist/`, the exact coupling
  that raced under concurrent CI (see [ADR-0013](0013-test-execution-and-ci-posture.md)).
- **tsc / esbuild / rollup directly.** Rejected: tsdown gives per-entry `.mjs` +
  `.d.mts` with minimal config and matches the workspace's exports shape.

## Consequences

- Adding a new public surface means adding an `exports` entry **and** a matching
  tsdown entry — keep the two in sync, or the build emits something the package
  doesn't advertise (or vice-versa).
- Deep imports into a package's internals are impossible by construction;
  everything consumers touch is an explicit subpath.
- Declarations require `isolatedDeclarations` to hold — see
  [ADR-0004](0004-typescript-compiler-posture.md).

## Where it's enforced

- each `domain/*`/`cli/*` `package.json` `exports` — `source`/`types`/`import` conditions.
- each `domain/*`/`cli/*` `tsdown.config.ts` — entry list + `platform: 'node'`.
- `vitest.config.base.ts` — resolves the `source` condition for no-build tests.
