# Survey 04 — Presentation pipeline (Consultation-view IR → serializers)

Scope: `domain/consultation-view`, `domain/text-layout`, `cli/text-grid`, `cli/readout`
(serialize-ansi, output-composers; `output-sections.ts` no longer exists), the Markdown
serializer (`cli/text-grid/src/serialize-markdown.ts`), ADR-0016/0018/0021/0022, `refactor.md`.
Nothing under `consultations/` was opened.

## Pipeline as built

```
core (records, getters, line-semantics, deriveSplit)
  └─ consultation-view.buildConsultationView(query, hexagram, casting, reason)   [domain]
        → ConsultationView { sections[], hasMovingLines }
        → sectionsForMedium(view, 'ansi' | 'markdown')                           [domain]
  ├─ text-grid: ledgerBlock / hexagramDiagramRowStrings / transformationRow (monospace skeletons)
  │     └─ serializeConsultationMarkdownBody → markdownConsultationBody          [cli]
  └─ readout: serializeConsultationTabs (4 tab strings) / serializeConsoleOutput  [cli]
        → ConsultationSections (pre-rendered ANSI strings) → <ConsultationReadout>
```

The IR is built separately per output: `buildConsultationSections` (cli/readout/src/output-composers.ts:56-58)
and `markdownConsultationBody` (cli/text-grid/src/markdown.ts:24-26) each call `buildConsultationView`.

## 1. Is the IR medium-neutral? Mostly not. Leaks:

1. **Medium names inside the "neutral" IR.** `SectionMedium = 'ansi' | 'markdown'` (domain/consultation-view/src/ir.ts:11) plus `sectionVisibility` / `ANSI_ONLY` / `MARKDOWN_ONLY` (build-view.ts:242-273). The domain layer decides per-medium visibility. Adding REST/PWA/Typst forces edits to a domain package for every new adapter — inverted dependency for hexagonal design.
2. **Duplicate sections invented to serve a Markdown layout quirk.** For a static hexagram the same hexagram-level text is emitted twice: `text:hexagram` (ANSI-only) and `text:lines:none` (Markdown-only) (build-view.ts:143-156, 238-241, 317-322). This is a layout decision (Markdown folds the judgment into the trailing LINES block) encoded as IR structure.
3. **Table-rendering hints on ledger rows.** `LedgerRow.showLine` and `trailingRule` (ir.ts:24-27) are rule-row/label-placement instructions for a monospace grid; the "top-first, cast 3 above cast 1" ordering (ledger-rows.ts:10-13, 29-51) is a visual decision too.
4. **Comments reveal the target media.** `LedgerCell` "rendered as `·` in ANSI; the markdown path only ever sees full records" (ir.ts:14-16); `DiagramLineRow.moving` "drives the colour + arrow gap" (ir.ts:57).
5. **Surface-specific formatted strings in `HexagramIdentity`.** Two trigram presentations (identity-stack vs diagram-brace), pre-capitalised by `capitalizeFirst` (ir.ts:70-87, build-view.ts:29-31, 45-67). `wenWang` etc. are pre-stringified (ir.ts:61-68). These are view-model strings tuned to two specific monospace surfaces.
6. **Glyph vocabulary is monospace art.** `LINE_GLYPH` (vocabulary.ts:8-13) is a 9-cell box-drawing bar (`━━━ ✕ ━━━`); `POSITION_LABELS` use fullwidth parens `（初, 1st）` for CJK cell alignment (vocabulary.ts:16-23). ADR-0022 kept these in the domain as "medium-neutral glyph strings", but a PWA would draw SVG/CSS lines, not reuse a 9-character bar; only the Unicode symbol semantics (moving-yin ✕, moving-yang ○) are neutral.
7. **Display labels used as identity keys.** `TextVariant.language` is a human label (`'English, Wilhelm-Baynes'`, build-view.ts:102) and the ANSI serializer branches on that string (serialize-ansi.ts:218-219); the playground filters by it too (build-view.ts:216-219 comment). No language/translation ID in the IR.
8. **Redundant domain flag.** `ConsultationView.hasMovingLines` (ir.ts:160-161) duplicates what `sections` encode; the Ink readout then re-infers the domain fact from a presentation string — `hasMovingLines = locked || sections.emerging != null` (cli/readout/src/consultation-readout.tsx:198).
9. **Dead width dependency.** `domain/consultation-view/package.json:38` still declares `@hexagram/text-layout`, but no source or test imports it (a leftover from before ADR-0022).
10. **`domain/text-layout` is itself monospace-bound.** CJK column width/padding (`visualWidth`, `padToColumn`, `centerVisual`, domain/text-layout/src/index.ts:18-41) only matters for character grids. By ADR-0022's own reasoning it belongs on the cli side. ADR-0021 also gave it a runtime dep (`string-width`). It sits in `domain/` only because the Markdown serializer used to.

Not leaks, and done well: no ANSI bytes, no column widths, no `═╪═` in the IR. ADR-0022 cleanly removed the geometry (cli/text-grid/src/geometry.ts:1-39) and scroll math (cli/text-grid/src/scroll-geometry.ts).

## 2. Domain knowledge vs read-model knowledge

| Knowledge                                                                                               | Kind                          | Where it is computed                                                                                                       |
| ------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Emerging hexagram, moving lines                                                                         | domain                        | core `line-semantics`, called from build-view.ts:281-282 (good)                                                            |
| **Which text applies** (0 moving → judgment; 1 → that line's text; ≥2 → "no reference")                 | **oracle domain rule**        | **inside the IR builder**: `linesSection` / `oneMovingLineVariants` (build-view.ts:114-170)                                |
| Hexagram/trigram identity lookup                                                                        | domain data                   | build-view.ts:33-69 (`identityOf`, called 6+ times per build: 302-303, 310-312, 329-331)                                   |
| Derived split quantities                                                                                | domain                        | core `deriveSplit`, called from ledger-rows.ts:28 (good)                                                                   |
| Section order, emerging gate                                                                            | read model                    | build-view.ts:287-341 (appropriate)                                                                                        |
| Section headings/captions (`STANDING HEXAGRAM`, `(Line at bottom is first)`, `No available reference…`) | read model                    | **duplicated in each serializer**, not in the IR (see Q4)                                                                  |
| Tab grouping (query/casting/transformation/standing/emerging)                                           | read model (CLI)              | serialize-ansi.ts:257-293, re-deriving structure by `kind`/`role` with `!`/`as` casts and positional `hexes[0]`/`hexes[1]` |
| Line value ⇒ "result" marker                                                                            | domain fact rendered as glyph | ledger-template.ts:48-51 (`⇒` on cast 3)                                                                                   |

Verdict: the main oracle rule, "which texts apply to this reading", lives in the presentation builder, not in core. Each output builds the view again (output-composers.ts:56, markdown.ts:24). Other cli consumers bypass the builder and repeat identity derivation themselves. For example, `summarizeHexParts` (cli/history-ui/src/history-list-transforms.ts:34-42) reads `getHexagramRecord` directly and has its own "WilhelmBaynes before `/`" rule. A hexagonal core should compute a `Reading` once, holding the standing and emerging hexagrams, the changing positions, the applicable text selection and the ledger, and expose it through an output port. Today `buildConsultationView` does that job and the read-model's job in the same function.

## 3. Where should REST/HATEOAS and Typst sit?

- **REST/HATEOAS must not consume this IR.** The IR is a document layout: ordered display sections, duplicated judgment text, tab-oriented roles, visibility per medium. A resource representation needs stable domain identifiers (hexagram key, King Wen number, line positions, moving flags, text IDs and language codes) plus links (`emerging`, `casting`, `texts/lines/3`). It should consume the **domain result** directly. Forcing it through `sectionsForMedium` would add a third `SectionMedium` member to the domain package.
- **Typst / PWA / Markdown / Ink are siblings at the read-model level**, but not at the monospace level. Typst and the PWA would reuse section order, headings and the text selection. They would draw their own tables from `LedgerRow`/`DerivedSplit` and their own line graphics, not from `LINE_GLYPH`. Markdown+ASCII and Ink are monospace siblings that share `text-grid`.

**Recommended boundary (two tiers):**

1. **Core output port**: `ConsultationResult`/`Reading`, pure domain. It holds standing and emerging `HexagramKey`, the changing positions, a `TextSelection` discriminated union (`static{judgment}` | `single{position, lineText}` | `multiple{positions}`), casting splits plus derived values, and the absence reason. It carries no strings formatted for display. It is computed once per consultation. REST maps straight from this.
2. **Application/read-model layer** (today's `consultation-view`, slimmed): section order, captions and labels (as message keys or literal strings), language IDs, and no `SectionMedium`. Each adapter decides placement. For example, Markdown puts the judgment under LINES and Ink puts it in the Standing tab, so the duplicate `lines:none` section goes away.
3. **Adapters**: Ink/plain (ANSI + text-grid), Markdown body (text-grid), Typst, PWA. Monospace glyph art (`LINE_GLYPH`, fullwidth `POSITION_LABELS`) and `text-layout` move into the monospace tier.

## 4. DRY across ANSI / Markdown / plain; parallel switches; refactor.md

Parallel dispatches over section kind:

- `serializeConsoleOutput` switch (serialize-ansi.ts:303-325)
- `serializeConsultationMarkdownBody` switch (serialize-markdown.ts:181-205), structurally identical
- `sectionVisibility` switch (build-view.ts:247-260)
- `serializeConsultationTabs` find/filter by `kind`+`role` (serialize-ansi.ts:257-293)
- ANSI `serializeTextAnsi` branches on role/variant (serialize-ansi.ts:229-250); Markdown `serializeLinesMarkdown` on variant (serialize-markdown.ts:158-175)

The switches themselves are acceptable: they are the visitor shape of a closed union, and TS exhaustiveness covers them. The real duplication is **knowledge that sits outside the IR and is re-typed in each serializer**:

- The multi-line notice text: serialize-ansi.ts:238-242 vs serialize-markdown.ts:160-164.
- The `(Query not provided)` placeholder: serialize-ansi.ts:94 vs serialize-markdown.ts:62.
- The "Casting not recorded (why)" composition: serialize-ansi.ts:47-55 vs serialize-markdown.ts:34-38. Only the reason label is shared (ir.ts:45-49, a label table sitting in an IR types file).
- The transformation footer formats `#N 名（pinyin）`: serialize-ansi.ts:135-141 vs serialize-markdown.ts:85-89.
- The hexagram identity block (four language headings, `名（zhuyin）`): serialize-ansi.ts:194-210 vs serialize-markdown.ts:128-142.
- The bottom-first line list `r1, r2 … r6`: serialize-ansi.ts:192 vs serialize-markdown.ts:126.
- The captions "Line at bottom is first" / "One moving line" / "No moving lines".
- **A silent divergence:** the Markdown transformation omits the trigram divider and the Upper/Lower rows that ANSI renders (serialize-ansi.ts:143-152 vs serialize-markdown.ts:91-101). This may be intentional, but nothing records it.

The shared skeletons (`ledgerBlock` with a `LedgerStyle` strategy, ledger-template.ts:10-22, and `transformationRow`/`hexagramDiagramRowStrings` with decorate callbacks) are good DRY: geometry is defined once and each medium injects its decoration.

**refactor.md assessment.** It proposes replacing `role` + `variant` with a single `textKind`. Today's two fields permit illegal states such as `role:'hexagram', variant:'multi'` (ir.ts:123-130), so collapsing them is correct, small and well-scoped. Problems:

- It names a **stale path**: `domain/consultation-file/src/serialize-markdown.ts` no longer exists. The serializer moved to `cli/text-grid/src/serialize-markdown.ts` under ADR-0022.
- It **preserves the root defect**. `textKind:'hexagram'` (ANSI-only) and `'no-changing-lines'` (Markdown-only) both carry the same judgment text and exist only because of a per-medium layout difference. It also mixes two concepts in one union: the hexagram judgment, which every reading has, and line guidance, which depends on the changing-line count.
- Better: model the domain `TextSelection` (static/single/multiple) once, and keep "hexagram judgment" as a field of the hexagram section. `sectionVisibility` and `SectionMedium` then disappear, and each serializer chooses where the judgment goes.
- As a near-term, behaviour-preserving step, refactor.md is fine once the path is fixed. As overhaul direction it is a local tidy-up of something the overhaul should remove.

## 5. Churn / stability

Timeline: ADR-0016 (2026-05-29) extracts `readout` from `viewer-core`. ADR-0019 (06-04) supersedes 0016's framing. ADR-0018 (06-05) creates `consultation-view` and `text-layout` and moves the vocabulary, geometry and Markdown serializer into the domain. A commit on 06-06 adds a "medium-neutral `ledgerBlock` template". ADR-0021 (06-08) makes width a single home with `string-width` in the domain. ADR-0022 (06-19) moves the geometry, skeletons, scroll math and Markdown serializer back out to the new `cli/text-grid`.

Ledger geometry has lived in three places in three weeks: readout, then consultation-view, then text-grid. The Markdown serializer moved from consultation-file to text-grid. Four ADRs reworked one seam. Leftover traces:

- ADR-0018 "Where it's enforced" still lists `ledger-geometry.ts` and `domain/consultation-file/src/serialize-markdown.ts` (0018:109-118), and neither exists.
- `serialize-markdown.ts:3-5` still says geometry comes "from @hexagram/consultation-view" and fixtures are "consultation-file md-body".
- `serialize-ansi.ts:4` says the same.
- The `text-layout` dependency in consultation-view's package.json is dead.

Assessment: the oscillation is **damping but not settled**. Each ADR fixed a misclassification found by the previous one, because the missing concept is the split between domain result and read model. `domain/text-layout` is the next item 0022's own reasoning would reclassify, and `SectionMedium` in the domain will break when a third adapter arrives. Expect at least one more move unless the overhaul defines the core output port first.

## 6. Rating

**3 / 5.** The direction and local craft are strong: one assembly point, a closed union, shared monospace skeletons with strategy injection, honest ADRs that correct themselves, and fixture-gated moves. Conceptual integrity is held back by:

- the oracle's text-selection rule sitting inside the view builder;
- media names and visibility living in the "neutral" domain IR;
- a duplicated section that exists only to satisfy one medium's layout;
- headings and labels repeated across serializers outside the IR;
- stale docs and comments left by repeated moves.
