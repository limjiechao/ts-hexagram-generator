# Consultation view IR + renderer collapse

Status: Accepted
Date: 2026-06-05

The consultation's **presentation vocabulary** (the line-diagram glyph map,
position/line labels, the 12-column casting-ledger geometry, the
transformation column/connector/divider constants), its **section order**, and
its **emerging gate** now live exactly once in a new medium-neutral package,
`@hexagram/consultation-view`. The package exposes a typed **IR** — a
discriminated union of section descriptors whose payloads are pure data (no
ANSI, no Markdown) — and one assembly, `buildConsultationView(query, hexagram,
casting)`, that produces the ordered section list with the emerging gate already
applied. The **four** render surfaces — the ANSI readout, the Markdown body, the
collapsed plain-console composer, and the playground top-half display — are now
thin **serializers** of that IR (or, for the playground, of an identity/diagram
**subset** of it).

Before this, the same presentation knowledge was reimplemented in three packages
(`@hexagram/readout` ANSI, `@hexagram/consultation-file` Markdown,
`@hexagram/playground-ui` display), with two divergent consultation composers
(`buildConsultationSections` and `consultationConsoleOutput`), kept in sync only
by byte-identity fixtures rather than by structure. `consultation-view` depends
only on `@hexagram/core` (data, getters, line-semantics, casting derivation) and
`@hexagram/text-layout` (CJK width) — never on a CLI package — so a hypothetical
non-CLI consumer (e.g. a Next.js app) can reuse the whole consultation structure
without pulling in any terminal code.

## Considered options

- **Leave the presentation knowledge duplicated.** Rejected: three copies of the
  glyph/label/geometry vocabulary and a divergent pair of composers, held
  together by fixtures — exactly the drift hazard this refactor exists to remove.
- **Put the vocabulary + a section builder as a subpath of `@hexagram/readout`.**
  Rejected: `readout` is a CLI package (ANSI/Ink); a domain consumer
  (`consultation-file`, or a web app) may not depend on it. The shared knowledge
  cannot live above the domain/CLI boundary.
- **A dedicated medium-neutral IR package (chosen).** `consultation-view` owns
  the vocabulary, the IR types, and the single assembly; every renderer becomes a
  serializer. The IR carries _semantic structure_ (which sections, in what order,
  with what rows/cells/identity), while each serializer owns _medium formatting_
  (ANSI palette + `padToColumn` vs `text`-fenced Markdown vs the playground's
  chevron/pulse/ghost Ink rows). That division is the seam that makes byte
  identity provable.

## Consequences

- **One vocabulary, one section order, one emerging gate.** `buildConsultationView`
  is the single place that knows the section order
  (`QUERY → CASTING → TRANSFORMATION → STANDING → [EMERGING] → LINES`) and applies
  the no/one/multi-moving gate via `@hexagram/core/line-semantics`.
- **`HexagramIdentity` carries two trigram presentations.** The transformation
  footer and the playground identity stack render the trigram NAME (Chinese) with
  capitalized pinyin + capitalized English imagery; the hexagram-section diagram
  braces render the trigram IMAGERY (Chinese) with raw English imagery. These are
  different strings, so the IR carries both sets — the seam that lets both
  surfaces serialize byte-identically from one extraction.
- **The playground consumes a SUBSET of the IR**, not the whole document — it is a
  live 4-state line explorer with no query, casting ledger, or scripture, and it
  paints a pulse and a dim-ghost emerging mirror the consultation never shows. So
  `consultation-view` exposes `hexagramIdentity` + `hexagramDiagramRows`
  sub-builders, and the playground composes its Ink rows from those.
- **The `--plain` console section order changed once, intentionally.** Plain
  output now emits the LINES block **last** (after the emerging diagram/text),
  matching the Ink viewer's tab grouping and the saved `.md` body. This is the
  slice's single sanctioned byte change (only `plain-output-one-moving.txt` /
  `plain-output-multi-moving.txt`); every other rendered byte (Ink
  `ink-sections-*.json`, Markdown `md-body-*.md` / `md-file-*.md`, the other plain
  fixtures, the playground render) is unchanged.
- **This DEEPENS [ADR-0016](0016-readout-renderer-extraction.md).** ADR-0016
  extracted the Consultation Readout from `viewer-core` so "all consultation
  rendering has one home" (`readout`). ADR-0018 records that the _vocabulary +
  section structure + assembly_ home is now `consultation-view`, with `readout`
  owning ANSI serialization + the Ink `ConsultationReadout` component. The
  byte-identity fixtures that ADR-0016 relied on remain the regression gate; they
  now prove the serializers match the IR rather than each other.

## Where it's enforced

- `domain/consultation-view/src/vocabulary.ts` — the single glyph/label/geometry
  vocabulary (`vocabulary.test.ts` pins every constant).
- `domain/consultation-view/src/ir.ts` — the section IR type union.
- `domain/consultation-view/src/build-view.ts` — `buildConsultationView` (section
  order + emerging gate) + the `hexagramIdentity` / `hexagramDiagramRows`
  sub-builders.
- `domain/consultation-view/src/ledger-geometry.ts` — the 18-row ledger builder +
  the auto-follow row math (re-exported by `readout`).
- `cli/readout/src/serialize-ansi.ts` — the IR→ANSI serializers + the tab/console
  composers.
- `domain/consultation-file/src/serialize-markdown.ts` — the IR→Markdown
  serializers + the body composer.
- `cli/playground-ui/src/playground-display-*.ts` — the playground display as a
  serializer of the IR identity/diagram subset.
- the byte-locked fixtures (`cli/casting-ui/tests/fixtures/*`,
  `domain/consultation-file/tests/fixtures/*`) — the standing regression gate.
- the dependency-cruiser `no-domain-to-cli` rule — keeps `consultation-view`
  UI-free.
