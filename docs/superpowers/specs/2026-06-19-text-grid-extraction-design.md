# Design — Extract the monospace text-grid from the medium-neutral IR (Gate B / Seam 2)

**Date:** 2026-06-19
**Branch:** `claude/zero-knowledge-theory-reconstruction-evuyib`
**Handoff:** `docs/handoffs/theory-reconstruction-seams.md` — Seam 2, Decision Gate B
**Decision:** B-full — reclassify the `.md` body as a medium-bound rendering and extract the
monospace layer to a new cli package. Records as **ADR-0022**.

---

## 1. The seam (verified against code, not just the ADR)

ADR-0018/0019 call `@hexagram/consultation-view` **medium-neutral** and assert a Next.js HTML
host can reuse the **whole** consultation structure (the "HTML serializer" litmus). A cold read
plus direct verification this session found the package actually carries **two conflated layers**:

1. **A genuinely medium-neutral semantic IR** — section descriptors, section order, the emerging
   gate, the glyph vocabulary, the `LedgerRow` builder. An HTML host can reuse all of this.
2. **A monospace text-grid layer that is _not_ medium-neutral**:
   - `vocabulary.ts:40-53` — 12 fixed **character-cell** column widths, commented "so the content
     fits the 120-col default wrap (111 visual columns)" — i.e. tuned to a terminal width.
   - `ledger-template.ts` — draws an ASCII table: `padStartVisual` cells, `'═'.repeat(width)` rule
     rows, `═╪═`/`─┼─` joiners.
   - `diagram-template.ts` — the hexagram/transformation diagram skeleton: `MOVING_ARROW`
     (17×`─`), `braceSuffix` (`──┼──` connectors), monospace spacing.
   - `ledger-geometry.ts:11-23` — terminal-viewport scroll row-math.
   - `vocabulary.ts:60-66` — `RIGHT_COLUMN=46`, `STATIC_GAP`, `TRIGRAM_DIVIDER_WIDTH=25`.
   - `ir.ts:11` — `SectionMedium = 'ansi' | 'markdown'`: the "neutral" layer enumerates exactly its
     two **monospace** consumers.

These only render correctly in a **monospace font** where every glyph is one cell. The alignment is
pure character-counting — an HTML host with a proportional font would get ragged garbage; it would
emit a `<table>` and let CSS lay it out, not reuse `width: 6`.

**The decisive structural fact:** the saved-`.md` Markdown body renderer lives in
`domain/consultation-file` (a _domain_ package) and drives the _same_ monospace skeletons — the
`.md` body literally _is_ a monospace ASCII table inside a ` ```text ` fence. So this geometry is
not a CLI-only leak; it is shared with a domain consumer. The honest conclusion (Gate B decision):
the **decorative `.md` body is itself a medium-bound monospace rendering**, mis-homed in the domain.
The HTML litmus can never fully pass while the domain owns the `.md` body format — because that
format is a monospace table.

---

## 2. Decision

Reclassify the monospace layer as **medium-bound**, and move it (plus the Markdown body serializer)
out of the domain into a new Ink-free cli package, **`@hexagram/text-grid`** (`cli/text-grid`).

The reclassification is **surgical**: ADR-0019's core insight — that presentation-of-domain
(glyphs, labels, section order, line semantics, the semantic IR) is domain knowledge, not UI —
stays true. We carve out **only** the monospace character-cell _geometry_ and the monospace
_serializers_. The glyph vocabulary stays in the domain because unicode glyph strings are genuinely
medium-neutral (an HTML host reuses them verbatim).

---

## 3. Target architecture

### `domain/consultation-view` — the true medium-neutral IR (stays; shrinks)

Keeps: `ir.ts` (section descriptor types), `build-view.ts` (`buildConsultationView`,
`sectionsForMedium`, all sub-builders), the **glyph vocabulary** (`LINE_GLYPH`, `POSITION_LABELS`,
`LINE_LABELS`), and `buildLedgerRows` (builds `LedgerRow` IR from a casting record — no widths;
consumed by `build-view.ts`). After this change an HTML host reuses _all_ of `consultation-view`.

### `cli/text-grid` — the monospace render layer (NEW, Ink-free)

Owns: the monospace **geometry** (column widths + diagram/transformation connectors + dividers), the
shared **rendering skeletons** (`ledger-template`, `diagram-template`, both driven by the existing
`decorate`-callback pattern), the **viewport scroll math**, and the pure-text **Markdown body
serializer** (`serializeConsultationMarkdownBody` + `markdownConsultationBody`).
Depends only on `@hexagram/consultation-view`, `@hexagram/core`, `@hexagram/text-layout`. No `ink`,
no `react`, no colour. It is medium-bound (to monospace text), hence `cli/*`.

### `cli/readout` — unchanged role; rewires imports

`serialize-ansi.ts` stays here (it is colour-bound to the viewer-core palette) but now imports the
geometry + skeletons from `@hexagram/text-grid` instead of from `consultation-view`. The Ink
`<ConsultationReadout>` component is untouched. This keeps the saved-`.md` body renderer **out** of
the Ink/React package — the clean concept boundary that motivated a new package over expanding
`readout`.

### `cli/playground-ui` — rewires imports

Imports geometry + diagram skeleton from `@hexagram/text-grid`.

### `domain/consultation-file` — becomes purely canonical

- `saveConsultationFile` takes the rendered body as **injected text** instead of rendering it
  (see §4). Drops `markdown.ts` + `serialize-markdown.ts` and, with them, its
  `@hexagram/consultation-view` dependency **entirely** (verified: those are the only two files that
  import it). The package then owns only the canonical YAML envelope, file IO, casting-replay,
  legacy conversion, and timestamps.

### Inventory (file/symbol level)

| Item                                                                                                                               | Action                                      | Destination                |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------- |
| `ledger-template.ts` (`ledgerBlock`, `LedgerStyle`)                                                                                | move                                        | `cli/text-grid`            |
| `diagram-template.ts` (`transformationRow`, `hexagramDiagramRowStrings`, `braceSuffix`, `DecorateCell/Row`)                        | move                                        | `cli/text-grid`            |
| `serialize-markdown.ts` + `markdown.ts` (`markdownConsultationBody`)                                                               | move                                        | `cli/text-grid`            |
| `vocabulary.ts` → `LEDGER_COLUMNS`, `RIGHT_COLUMN`, `MOVING_ARROW`, `STATIC_GAP`, `TRIGRAM_DIVIDER_WIDTH`                          | **split out**                               | `cli/text-grid`            |
| `vocabulary.ts` → `LINE_GLYPH`, `POSITION_LABELS`, `LINE_LABELS`                                                                   | **stays** (split into a glyphs module)      | `domain/consultation-view` |
| `ledger-geometry.ts` → `castingTableActiveRow/FollowRow`, `CASTING_HEADER_ROWS`, `CASTING_ROWS_PER_BLOCK`, `CAST1_OFFSET_IN_BLOCK` | **split out**                               | `cli/text-grid`            |
| `ledger-geometry.ts` → `buildLedgerRows`                                                                                           | **stays** (split into a ledger-rows module) | `domain/consultation-view` |

---

## 4. The `saveConsultationFile` body-injection change

Today `saveConsultationFile` renders the body in-domain via `markdownConsultationBody`. Once that
serializer is cli-resident, the domain can no longer render it. The fix makes save/load symmetric:

- **New param:** `saveConsultationFile({ query, hexagram, casting, castingAbsence, dir?, body })` —
  `body` is the already-rendered Markdown body (opaque text to the domain).
- **`loadConsultationFile` already** returns the body as opaque disk bytes; save now matches.
- **The three callers** (`cli/casting-ui/src/log-and-save.ts`, `cli/casting-ui/src/viewer.tsx`,
  `cli/playground-ui/src/playground-app.tsx` — all cli) render the body via
  `@hexagram/text-grid` and pass it in. The legacy migration (`apps/cli/src/migrate-legacy.ts`) and
  the history self-heal (`cli/history-ui/src/history-app.tsx`) already render the body in the
  cli/app layer; they only change the import path.

This is the architectural payoff: the domain owns the **canonical envelope**; the decorative
monospace body is a medium-layer artifact on both save and load.

---

## 5. ADR-0022 (drafted alongside this spec)

`docs/adr/0022-monospace-text-grid-is-medium-bound.md` records the decision and **amends** ADR-0018
(IR) and ADR-0019 (domain/cli boundary) by reference — the boundary _decision_ (domain vs cli)
stands; only the **classification** of the monospace geometry + `.md` body changes, and the
over-broad "whole-structure HTML reuse" litmus is corrected to "HTML reuses the semantic IR + glyphs

- section order and writes its own table." README index updated; 0018/0019 marked "Amended by 0022".

---

## 6. Doc updates (knowledge has one home)

- `CLAUDE.md` / `AGENTS.md` — repo layout + architecture sections: add `cli/text-grid`; correct the
  `consultation-view` description to "semantic IR only"; note `consultation-file` is canonical-only
  with injected body.
- `CONTEXT.md` — if it names the medium-neutral IR / ledger geometry, update the vocabulary.
- `docs/adr/README.md` — index row for 0022; "Amended by 0022" on 0018/0019.
- `eslint.config.js` — add `@hexagram/text-grid` to the `domain/**` → cli import ban list (so the new
  cli package cannot be imported from the domain by accident).

---

## 7. Verification plan

- **Zero-diff fixture regeneration is the core proof.** This is a _move_, not a behaviour change:
  after the refactor, `pnpm generate-fixtures` (both the `cli/casting-ui` plain set and the
  `domain/consultation-file` `.md` set) must produce **no diff**. Any diff means something rendered
  differently — a regression.
- **The manual≡interactive byte-identity test** (`cli/casting-ui/tests/viewer.test.tsx`) is the
  save-path gate: both flows must still produce identical `saveConsultationFile` args, now including
  the injected `body`.
- `pnpm type:check`, `pnpm lint:check` (the domain→cli boundary + the new ban-list entry),
  `pnpm format:check`.
- `pnpm test` (full suite, serialised; the 1M-iteration slow block runs by design).

---

## 8. Scope, slicing, risks

**Scope:** wide blast radius, accepted at Gate B — splits two files, moves three, changes one public
signature + 3 callers, scaffolds one package, regenerates two fixture sets, writes one ADR + doc
updates. To be sliced into reviewable single-intent commits by `writing-plans`. Rough slice shape
(planner owns the final cut):

1. Scaffold `cli/text-grid` (package.json, tsdown, workspace/DAG wiring, empty exports).
2. Move geometry + skeletons + scroll math (split `vocabulary.ts`/`ledger-geometry.ts`); rewire
   `readout` + `playground-ui` imports. Domain still renders the body. (Compiles; fixtures unchanged.)
3. Move the Markdown serializer to `text-grid`; change `saveConsultationFile` to injected body;
   rewire the 3 save callers + migration/history imports; drop `consultation-file`'s
   `consultation-view` dep.
4. ADR-0022 + doc updates + eslint ban-list entry.
5. Regenerate fixtures (must be zero-diff); full verification.

**Non-goals:** no change to the `.md` file format, the YAML envelope, the casting algorithm, or any
rendered byte. No change to the glyph vocabulary's home. Not touching the other seams (3–7).

**Risks:**

- _Mid-refactor boundary-lint failures_ — ordering matters; the planner sequences so each commit
  compiles and the boundary lint stays green.
- _Accidental byte drift_ — guarded by zero-diff fixture regeneration + the byte-identity test.
- _Over-rotation_ — keep the glyph vocabulary and the semantic IR in the domain; do **not** sweep
  all "presentation" into cli (that would contradict the legitimately-neutral glyphs and ADR-0019's
  surviving core).
