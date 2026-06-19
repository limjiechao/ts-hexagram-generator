# The monospace text-grid is medium-bound, not domain

Status: Accepted
Date: 2026-06-19

[ADR-0019](0019-domain-cli-boundary.md) drew the boundary at **domain (medium-neutral) vs CLI
(medium-bound)** and classified "the ledger geometry" as medium-neutral domain knowledge living in
`@hexagram/consultation-view`; [ADR-0018](0018-consultation-view-ir.md) called the package's payloads
"pure data (no ANSI, no Markdown)" and offered a litmus: a Next.js HTML serializer reuses the
**whole** consultation structure. A fresh cold read (the theory-reconstruction seam survey) found
that the package conflates two layers. One is a genuinely medium-neutral **semantic IR** — section
descriptors, section order, the emerging gate, the glyph vocabulary, the `LedgerRow` builder. The
other is a **monospace text-grid**: 12 fixed character-cell column widths tuned "so the content fits
the 120-col default wrap" (`vocabulary.ts`), `'═'.repeat(width)` rule rows and `═╪═`/`─┼─` joiners
(`ledger-template.ts`), the hexagram/transformation diagram skeleton with its `──┼──` connectors
(`diagram-template.ts`), and terminal-viewport scroll math (`ledger-geometry.ts`). That grid renders
correctly only in a **monospace font** where every glyph is one cell; an HTML host with a
proportional font gets ragged garbage and would emit a `<table>`, not reuse `width: 6`. So the
geometry is reusable only by media that are themselves monospace text grids — the ANSI terminal and
the Markdown ` ```text ` code-fence (exactly the two members the IR's `SectionMedium` union names) —
not by HTML. The "whole-structure HTML reuse" litmus was therefore only half true.

The decisive fact is that the saved-`.md` Markdown **body** renderer lived in
`domain/consultation-file` (a domain package) and drove the _same_ monospace skeletons: the `.md`
body literally _is_ a monospace ASCII table inside a ` ```text ` fence. The geometry was not a
CLI-only leak; it was shared with a domain consumer. We conclude that the decorative `.md` body is
itself a **medium-bound monospace rendering** that was mis-homed in the domain.

We therefore split `consultation-view`. The semantic IR (descriptors, order, emerging gate, glyph
vocabulary, `buildLedgerRows`) stays medium-neutral in `domain/consultation-view`. The monospace
text-grid (column widths, the ledger/diagram rendering skeletons, the scroll math) and the Markdown
body serializer move to a new Ink-free, colour-free cli package, **`@hexagram/text-grid`**. Because
the `.md` body is now a cli-rendered artifact, `saveConsultationFile` takes the body as **injected
text** rather than rendering it; the domain owns only the canonical YAML envelope — symmetric with
load, which already treated the body as opaque bytes. This **amends** ADR-0019 and ADR-0018 by
reference: the domain/cli boundary _decision_ is unchanged; only the **classification** of the
monospace geometry + `.md` body moves from domain to cli, and the HTML litmus is corrected to "an
HTML host reuses the semantic IR + glyphs + section order and writes its own table."

The reclassification is surgical. ADR-0019's core insight — presentation-of-domain (glyphs, labels,
section order, line semantics, the semantic IR) is domain knowledge, not UI — stays true. Only the
monospace character-cell _geometry_ and the monospace _serializers_ are medium-bound. The glyph
vocabulary stays in the domain because unicode glyph strings are genuinely medium-neutral (an HTML
host reuses them verbatim).

## Considered options

- **Narrow the claim only (doc amendment, no code).** Rejected: leaves the conflation in code. The
  package keeps doing two jobs, the "medium-neutral" name stays aspirational, and the next reader has
  to consult an amendment to learn the litmus is partial.
- **Extract only the auto-scroll geometry (the one CLI-only leak) and narrow the rest.** Rejected as
  a half-measure: the column/table skeletons and the Markdown body are equally medium-bound; they
  were merely harder to see because a domain package (`consultation-file`) consumed them.
- **Expand `cli/readout` to hold the moved layer.** Rejected: `readout` is an Ink/React package
  (the `<ConsultationReadout>` component + colour-bound ANSI builders). Putting the pure-text `.md`
  body renderer there recreates the muddle this boundary work exists to remove — file-body rendering
  colocated with the terminal widget.
- **Reclassify the monospace layer into a new Ink-free cli package (chosen).** The `.md` body is
  itself a monospace rendering; move the whole monospace layer + the Markdown serializer to
  `@hexagram/text-grid`; the domain becomes truly medium-neutral and the HTML litmus passes for the
  parts that legitimately transfer.

## Consequences

- **`domain/consultation-view` is now medium-neutral for real.** An HTML (or PDF) host depends on it
  - `domain/core` + `domain/text-layout`, reuses the section IR, glyph vocabulary, section order and
    emerging gate, and writes its own table/diagram layout — without inheriting a 120-col character
    grid.
- **`saveConsultationFile` gains a `body` parameter** and no longer renders the body; the medium
  layer renders it and injects it. Save and load are now symmetric (both treat the body as opaque
  text). `domain/consultation-file` drops its `@hexagram/consultation-view` dependency entirely.
- **A new cli package, `@hexagram/text-grid`**, owns the monospace geometry + rendering skeletons +
  the Markdown serializer. It is Ink-free and colour-free; `cli/readout` (ANSI, colour) and
  `cli/playground-ui` consume it. The ADR-0019 `domain/** → cli/*` import ban list gains
  `@hexagram/text-grid`.
- **The byte-identity fixtures are unchanged.** This is a move, not a behaviour change: regenerating
  both fixture sets must produce zero diff. That zero-diff regeneration is the regression proof, and
  the manual≡interactive byte-identity test remains the save-path gate.

## Where it's enforced

- `cli/text-grid/` — the monospace geometry (column widths + connectors + dividers), the
  `ledger-template`/`diagram-template` rendering skeletons, the viewport scroll math, and the
  Markdown body serializer.
- `domain/consultation-view/` — the semantic IR (`ir.ts`), `buildConsultationView` /
  `sectionsForMedium` / sub-builders (`build-view.ts`), the glyph vocabulary, and `buildLedgerRows`.
- `domain/consultation-file/src/file.ts` — `saveConsultationFile` takes the injected `body`;
  `loadConsultationFile` already treats the body as opaque bytes.
- `eslint.config.js` — `@hexagram/text-grid` added to the `domain/**` → cli `no-restricted-imports`
  ban list.
- the byte-locked fixtures (`cli/casting-ui/tests/fixtures/*`,
  `domain/consultation-file/tests/fixtures/*`) — unchanged; zero-diff regeneration is the proof.
- [ADR-0019](0019-domain-cli-boundary.md) and [ADR-0018](0018-consultation-view-ir.md) — amended by
  reference (the boundary and IR decisions stand; the monospace-layer classification + HTML litmus
  are corrected here).
