# Readout renderer extracted from viewer-core

Status: Accepted
Date: 2026-05-29

The Consultation **Readout** renderer now lives in its own package,
`@hexagram/readout`, split out of `@hexagram/viewer-core`. `viewer-core`
previously carried two concerns at once: the generic terminal chrome
(`ScreenShell`, `TabBar`, `FooterBar`, the ANSI palette, the data-driven keymap,
the layout maths) — which has no divination meaning — and the Readout itself
(the `ConsultationReadout` component plus the `*Section` string builders and
`buildConsultationSections`, which know about hexagrams, casting records, and
moving lines). `CONTEXT.md` already draws exactly this line: a **Readout**
displays a Consultation; the screen frame "is not a Readout… carries no
divination meaning."

The split makes the package boundary match the domain concept. `viewer-core`
becomes genuinely generic — after the move it no longer depends on
`@hexagram/core` at all (the only `@hexagram/core/getters` usage rode along in
the moved section builders). `@hexagram/readout` depends on `@hexagram/viewer-core`
for its chrome and on `@hexagram/core/getters` for the derived hexagram data it
renders. All consultation rendering — for the casting flow, the history readout,
and the playground's reused geometry constants — now has one home.

This is the deepening identified in an architecture review: `viewer-core` was a
shallow mix of two concerns; concentrating the Readout in one named package
improves locality (all consultation rendering changes in one place) and
AI-navigability (the domain noun maps 1:1 to a package).

## Considered options

- **Subpath exports inside `viewer-core`** (`@hexagram/viewer-core/readout`).
  A lighter touch that keeps one package. Rejected here in favour of a real
  package so the domain boundary is explicit in the dependency DAG and the
  generic chrome can shed its `@hexagram/core` dependency entirely.
- **Folder reorg only, single barrel.** Improves locality but leaves the two
  concerns sharing one public surface and one `@hexagram/core` dependency edge.
- **Leave it in `viewer-core`.** Rejected: the package's own description had to
  enumerate both "chrome" and "section renderers", the tell-tale of a shallow
  module whose interface is as complex as its implementation.

## Consequences

- `casting-ui`, `history-ui`, and `playground-ui` now depend on both
  `viewer-core` (chrome) and `readout` (consultation rendering); imports that
  used to come from `viewer-core` for the section builders / `ConsultationReadout`
  now come from `readout`. `shell` is unaffected (it uses only chrome + line
  glyphs).
- The DAG gains a layer: `viewer-core → readout → {UI packages}`. The edge is
  one-way; a `viewer-core → readout` import would be a cycle and a design error.
- `playground-ui` depends on `readout` only for three geometry constants
  (`MOVING_ARROW`, `POSITION_LABELS`, `STATIC_GAP`) that ship from the section
  module. If that coupling ever grates, those constants are the thing to hoist
  back into generic layout.
- Behaviour is unchanged: the plain-output and `.md` fixtures regenerate
  byte-for-byte after the move.

## Where it's enforced

- `packages/readout/` — the package: `ConsultationReadout`, `output-composers`,
  `output-sections`.
- `packages/viewer-core/package.json` — no longer depends on `@hexagram/core`.
- each consuming `packages/*/package.json` `dependencies` — the new `readout`
  edge.
- [ADR-0002](0002-monorepo-structure-and-package-decomposition.md) — the package
  list and DAG.
