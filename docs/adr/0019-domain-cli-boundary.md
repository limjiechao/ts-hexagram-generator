# The boundary is domain vs CLI, not computation vs rendering

Status: Accepted (amended by 0022)
Date: 2026-06-04

> **Amended by [ADR-0022](0022-monospace-text-grid-is-medium-bound.md) (2026-06-19).** The
> domain-vs-cli boundary decision stands. But this ADR classified "the ledger geometry" as
> medium-neutral domain knowledge and claimed an HTML host reuses the *whole* consultation
> structure. ADR-0022 corrects that: the monospace character-cell geometry + the Markdown body
> serializer are medium-bound and move to the cli package `@hexagram/text-grid`; an HTML host
> reuses the *semantic* IR (+ glyph vocabulary + section order) and supplies its own table layout.

The codebase had drawn its top-level boundary at **computation vs rendering**: the
casting algorithm, the data tables, and the type vocabulary were single-homed in
`@hexagram/core`, but everything that _renders_ a consultation was treated as UI and
allowed to live in the UI packages. That line was wrong. **Presentation-of-domain** —
which lines move, the line-glyph vocabulary, the position labels, the ledger geometry,
the section order, the manual-flow invariants — is domain knowledge, not UI. Splitting
it off as "rendering" let it leak into and duplicate across the UI packages, where it was
kept in sync by byte-identity fixtures rather than by a single authoritative
representation.

We draw the boundary at **domain (medium-neutral, reusable) vs CLI (medium-bound)**
instead. Domain knowledge is the algorithm + the data + the line semantics + the
presentation vocabulary + the medium-neutral Consultation-view IR + the manual
invariants — _all_ of it below the UI line, in `domain/*`. The `cli/*` packages are thin
**medium serializers**: they take the domain's IR and the generic terminal chrome and turn
it into ANSI/Ink output. A second host (a Next.js web app, a PDF exporter) would reuse
every `domain/*` package unchanged and supply its own serializers — that is the litmus
test the old boundary failed.

The boundary is enforced structurally: `domain/*` packages may not depend on `cli/*`
packages (a `domain/* → cli/*` import is a build-failing lint error). The domain layer
therefore cannot reach for a terminal primitive, and any presentation knowledge that the
domain needs must be expressed medium-neutrally (in the `consultation-view` IR or in
`text-layout`) rather than as ANSI strings.

This supersedes [ADR-0016](0016-readout-renderer-extraction.md), whose framing — extract
the Readout _renderer_ from the generic chrome — was a half-step inside the wrong boundary.
0016 claimed `viewer-core` no longer depended on `@hexagram/core` and that consultation
rendering had "one home"; in fact `viewer-core` carried `isMovingLine` (domain line
semantics) and rendering had three homes (the ANSI sections, the markdown body, and
geometry constants leaking into `playground-ui`), reconciled by fixtures. The fix is not a
cleaner renderer extraction; it is moving the _knowledge_ down into a medium-neutral IR and
letting the renderers become thin.

## Considered options

- **Keep computation-vs-rendering, deduplicate with shared fixtures (status quo).**
  Rejected: byte-identity fixtures are a _symptom_ of duplicated knowledge, not a fix for
  it. They detect drift after the fact; they do not give the knowledge a single home, and
  they make every presentation change a multi-surface edit guarded by regenerated golden
  files. DRY is about one authoritative representation of a _decision_, not matching bytes.
- **A medium-neutral Consultation-view IR, with `domain/*` vs `cli/*` buckets and a
  boundary lint (chosen).** The presentation vocabulary, section order, and ledger geometry
  live once in `domain/consultation-view`; `cli/readout` (ANSI) and the markdown body
  renderer in `domain/consultation-file` serialize the _same_ IR. The lint makes the
  boundary unfalsifiable by accident.
- **Push the renderers up into a single `ui` package.** Rejected for the same reasons
  ADR-0002 rejected one `ui` package: the interactive experiences would share a mutable
  surface and drift into coupling. It also leaves the _knowledge_ in the UI layer — the
  exact mistake this ADR corrects.
- **Leave ADR-0016 standing and add a footnote.** Rejected: 0016's two factual claims are
  false under the new structure, and its framing actively misdescribes the boundary. ADRs
  are append-only and reversals are signal — supersede, don't patch.

## Consequences

- **Three top-level buckets.** Packages live under `domain/*` (medium-neutral), `cli/*`
  (medium-bound terminal-layer libraries), and `apps/*` (runnable apps). `pnpm-workspace.yaml`
  globs all three; the bins package is `apps/cli` (`@hexagram/cli`). `apps/*` sits at the top
  of the DAG and may depend on both `cli/*` and `domain/*`; the boundary lint still forbids only
  `domain/* → cli/*`. (A predecessor reorg briefly housed the bins at `cli/cli` as `@hexagram/bin`;
  the runnable app now lives in its own `apps/*` bucket.)
- **The lint is load-bearing.** A `domain/* → cli/*` import is a design error caught at
  lint time, not review time. New domain code that "just needs a colour" must instead
  express the intent medium-neutrally and let a `cli/*` serializer choose the colour.
- **Renderers are thin and plural by design.** `cli/readout` (ANSI) and the markdown body
  renderer both serialize `domain/consultation-view`; adding a third medium is a new
  serializer over the same IR, not a new copy of the section logic. The byte-identity
  fixtures shrink to _serializer_ tests over a shared IR rather than cross-surface
  consistency checks.
- **The Next.js reuse litmus test now passes.** A web host can depend on `domain/core`,
  `domain/consultation-file`, `domain/text-layout`, and `domain/consultation-view` with
  zero `cli/*` (and zero Ink/terminal) in its dependency graph, and render a consultation
  by writing an HTML serializer of the IR. Under the old boundary this was impossible: the
  line semantics, glyph vocabulary, and section order were tangled into terminal-bound
  packages.
- **ADR-0002 and ADR-0017 are amended by reference, not rewritten.** Their package lists
  and DAG still describe the same decomposition _rules_ (one concern per package, depend
  only downward); only the bucket names and the home of the presentation knowledge change.
  This ADR is the canonical statement of the boundary; 0002 remains the canonical statement
  of the package decomposition.

## Where it's enforced

- `pnpm-workspace.yaml` — `domain/*` + `cli/*` globs (replacing `packages/*` + `apps/*`).
- `eslint.config.js` — a `no-restricted-imports` override scoped to `domain/**/*.{ts,tsx}`
  (severity `error`) lists the seven `cli/*` package names as forbidden `paths`, so any
  `domain/* → cli/*` import fails the build. Run by `pnpm lint:check` and wired into Turbo
  `lint:check` + `check:all` / `check:affected`.
- `eslint.config.js` — a `no-restricted-imports` override scoped to `cli/**/src/**/*.{ts,tsx}`
  with `cli/viewer-core/**` ignored (severity `error`) forbids the rendered-width packages
  (`string-width`, and `slice-ansi` per [ADR-0021](0021-rendered-width-single-home.md)):
  only `cli/viewer-core` may import them directly; every other `cli/*` measures rendered width
  through viewer-core's ANSI-aware `terminalWidth` wrapper and pans through `panToWindow`.
  (This ADR originally described `terminalWidth` and `domain/text-layout`'s `visualWidth` as
  deliberately _separate homes_ — raw vs ANSI'd. ADR-0021 retired that split: `terminalWidth`
  is now a thin re-export of `visualWidth`, the single `string-width`-backed width table, so
  the saved `.md` diagrams and the live viewer can no longer disagree on a glyph's width.)
- The enforcement MECHANISM moved from dependency-cruiser (`dependency-cruiser.config.cjs`,
  `pnpm boundaries:check`) to these ESLint `no-restricted-imports` overrides; the boundary
  DECISION is unchanged. As a side effect the boundary now also covers domain `tests/` and
  `scripts/` (dependency-cruiser excluded those paths).
- `domain/consultation-view/` — the medium-neutral IR: presentation vocabulary, section
  order, ledger geometry.
- `domain/core/` — line semantics (`@hexagram/core/line-semantics`: `isMovingLine`, the
  moving-line set, polarity/cycle) and the manual invariants
  (`@hexagram/core/manual-validation`: conservation, zero-remainder, suspended-sum),
  hoisted out of the UI packages.
- `domain/text-layout/` — `visualWidth` and the glyph/column maths.
- `cli/readout/` and `domain/consultation-file/`'s markdown body renderer — thin serializers
  of the IR.
- [ADR-0016](0016-readout-renderer-extraction.md) — superseded by this ADR.
- [ADR-0018](0018-consultation-view-ir.md) — the consultation-view IR this boundary relies on.
- [ADR-0002](0002-monorepo-structure-and-package-decomposition.md) — the package
  decomposition rules (unchanged) and the DAG.
