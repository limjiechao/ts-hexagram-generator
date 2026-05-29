# Monorepo structure & package decomposition

Status: Accepted
Date: 2026-05-29

The project is a Turborepo + pnpm-workspaces monorepo. Published libraries live
under `packages/*`; the CLI lives under `apps/*` as the private `@hexagram/bin`.
The work is split into ten packages along a strict dependency DAG:

```
types → core → consultation-file → viewer-core → readout → {casting-ui, history-ui, playground-ui} → shell → bin
                                                            (test-utils is a dev-only leaf, consumed by every UI package)
```

The decomposition follows two rules: **a package owns one concern**, and **a
package depends only on layers strictly below it**. Concretely:

- `types` — the domain vocabulary (`Line`, `Hexagram`, `CastingRecord`,
  `LineState`) with zero dependencies, so every other package can import it
  without cycles.
- `core` — the pure casting algorithm, RNG, getters, and the 64+8 records. It is
  UI-free and file-free. `random-casting` and `getters` ship as **subpaths of
  core** (not separate packages) because they are thin consumers of the same
  algorithm/records and splitting them out would only create a circular pull on
  core. See [ADR-0003](0003-package-publishing-and-module-strategy.md) for the subpath
  mechanics.
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
