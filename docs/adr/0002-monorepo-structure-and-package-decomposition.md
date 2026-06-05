# Monorepo structure & package decomposition

Status: Accepted
Date: 2026-05-29

> **Amended by [ADR-0019](0019-domain-cli-boundary.md) (2026-06-04).** The package
> decomposition _rules_ below (one concern per package; depend only downward) still hold,
> but the top-level buckets are now `domain/*` (medium-neutral), `cli/*`
> (medium-bound terminal-layer libraries), and `apps/*` (runnable apps) — the original
> `packages/*`/`apps/*` split named below is superseded — and the presentation knowledge
> that this ADR left in the UI packages now lives below the UI line. The runnable CLI app
> is `apps/cli` (`@hexagram/cli`, renamed from the interim `@hexagram/bin`). See ADR-0019
> for the boundary and the current package map.

The project is a Turborepo + pnpm-workspaces monorepo. Published libraries live
under `packages/*`; the CLI lives under `apps/*` as the private `@hexagram/bin`.
The work is split into nine packages along a strict dependency DAG:

```
core → consultation-file → viewer-core → readout → {casting-ui, history-ui, playground-ui} → shell → bin
                                                    (test-utils is a dev-only leaf, consumed by every UI package)
```

The decomposition follows two rules: **a package owns one concern**, and **a
package depends only on layers strictly below it**. Concretely:

- `core` — the domain vocabulary (`Line`, `Hexagram`, `CastingRecord`,
  `LineState`) plus the pure casting algorithm, RNG, getters, and the 64+8
  records. It is UI-free and file-free, and sits at the bottom of the DAG with
  zero workspace dependencies. The vocabulary ships as the **`./types` subpath**,
  and `random-casting` / `getters` likewise ship as subpaths (not separate
  packages). See [ADR-0003](0003-package-publishing-and-module-strategy.md) for the
  subpath mechanics, and [ADR-0017](0017-types-folded-into-core.md) for why the
  vocabulary was folded into `core` (superseding the original separate-`types`
  package in this ADR).
- `consultation-file` — the on-disk format and (de)serialisation, with no React/
  Ink dependency, so the format can be read and written headlessly. See
  [ADR-0008](0008-consultation-file-format.md).
- `viewer-core` — generic terminal-UI building blocks (the `ScreenShell`,
  palette, chrome, keymap, layout maths, shared line-glyph primitives) that carry
  no divination meaning, shared by the casting and history UIs. Extracting it is
  the subject of [ADR-0001](0001-shared-screen-shell.md).
- `readout` — the Consultation Readout renderer: the `ConsultationReadout`
  component plus the per-section ANSI string builders that turn a consultation
  into per-tab strings. Split out of `viewer-core` so the generic chrome carries
  no hexagram knowledge and all consultation rendering has one home. See
  [ADR-0016](0016-readout-renderer-extraction.md).
- `casting-ui` / `history-ui` / `playground-ui` — the three interactive
  experiences, each a sibling leaf so a change to one cannot bleed into another.
- `shell` — the Home hub that aggregates the three UIs into one app; it is the
  only package that depends on all of them.
- `test-utils` — workspace-private test helpers (polling, witness signals); a
  dev-only dependency, never shipped. See [ADR-0012](0012-terminal-test-reliability.md).

## Considered options

- **One `ui` package** holding viewer + history + playground + shell. Rejected:
  the three experiences would share a mutable surface and drift into coupling;
  the `viewer-core`/`shell` split is what keeps them independent.
- **Separate `random-casting` / `getters` packages.** Rejected: both are tiny and
  depend on `core`'s algorithm and records — they belong _inside_ core, exposed as
  subpaths, not as packages that would invert the dependency.
- **A single flat package (no monorepo).** Rejected: the publish surface (a
  library vs. a private CLI), the per-layer test boundaries, and Turbo's
  topological caching all want real package boundaries.

## Consequences

- The DAG is load-bearing: a new cross-layer import (e.g. `core` importing a UI
  package) is a design error, not a convenience. Keep dependencies pointing down.
- Turbo's `^build` / `^type:check` ordering and caching rely on this graph being
  acyclic and accurate. See [ADR-0013](0013-test-execution-and-ci-posture.md).
- Adding a fourth interactive experience means a new leaf package + a `shell`
  wiring change — not edits spread across a shared UI blob.

## Where it's enforced

- `pnpm-workspace.yaml` — `packages/*` + `apps/*` globs.
- `turbo.json` — `dependsOn: ["^build"]` enforces topological build order.
- each `packages/*/package.json` `dependencies` — the actual DAG edges.
- `packages/core/package.json` `exports` — `random-casting`/`getters` as subpaths.
