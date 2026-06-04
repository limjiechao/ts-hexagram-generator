# Slice 6: Supersede ADR-0016 + Document the Domain/CLI Boundary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the corrected architectural boundary (domain vs cli, not computation vs rendering) as a new ADR, supersede the now-stale ADR-0016, and bring every structural doc (ADR index, AGENTS.md, CLAUDE.md, CONTEXT.md, README.md) into line with the merged `domain/*` + `cli/*` package tree.

**Architecture:** This is a docs-only slice — no source code changes. Slices 0–5 already moved the packages into `domain/*` and `cli/*` buckets, hoisted line semantics + manual invariants into `domain/core`, added `domain/text-layout` and the `domain/consultation-view` IR, and added a `domain/* ✗→ cli/*` boundary lint. This slice writes the decision record that names *why* that boundary is the right one, marks ADR-0016 superseded (correcting its two false claims), and removes every stale `packages/*` / `apps/*` structural reference from the prose docs so the documentation matches the shipped reality.

**Tech Stack:** Markdown, ADRs

---

## Background — the de-facto theory this slice records

The codebase originally drew its "domain vs UI" boundary at **computation vs rendering**:
the casting algorithm, data, and types were single-homed in `@hexagram/core`, but
**presentation-of-domain** — which lines move, the line-glyph vocabulary, position labels,
ledger geometry, section order, the manual-flow invariants — leaked into UI packages and was
duplicated across surfaces, held in sync by byte-identity fixtures rather than by structure.

Slices 0–5 corrected this:

- **Slice 0** — introduced `domain/` and `cli/` buckets with a boundary lint (`domain/* ✗→ cli/*`).
- **Slice 1** — hoisted line semantics (`isMovingLine`, moving-line set, the `6/7/8/9` vocabulary) into `domain/core`.
- **Slice 2** — hoisted the manual-flow invariants (conservation, zero-remainder, suspended-sum) into `domain/core`.
- **Slice 3** — moved `visualWidth` and the glyph/column maths into `domain/text-layout`.
- **Slice 4** — introduced a medium-neutral `consultation-view` IR (`domain/consultation-view`); `readout` and `markdown` became thin serializers of it.
- **Slice 5** — unified the interactive-environment / env policy.

ADR-0016 ("Readout renderer extracted from viewer-core") made two claims that are now
**stale or were always partly false**:

1. *"viewer-core … no longer depends on `@hexagram/core` at all."* — Untrue after ADR-0017
   folded the type vocabulary into core (`viewer-core` re-acquired `core` for the `Line` type),
   and structurally wrong regardless: `viewer-core` hosted `isMovingLine`, a piece of domain
   line-semantics, so it carried divination knowledge the whole time.
2. *"All consultation rendering … now has one home."* — Untrue: rendering had **three** homes
   (`readout` ANSI sections, the markdown body renderer in `consultation-file`, and geometry
   constants leaking into `playground-ui`), reconciled by byte-identity fixtures, not by a
   single shared representation.

The new ADR names the corrected boundary and supersedes 0016.

---

## The new package map (post-reorg, after Slices 0–5)

```
domain/                         # medium-neutral, reusable — below the UI line
├── core/                       # @hexagram/core — algorithm + data + types + line semantics + manual invariants
├── consultation-file/          # @hexagram/consultation-file — on-disk format (Markdown + YAML), serializer of the IR
├── text-layout/                # @hexagram/text-layout — visualWidth + glyph/column maths (no divination meaning)
└── consultation-view/          # @hexagram/consultation-view — medium-neutral Consultation-view IR (presentation vocabulary, section order, ledger geometry)
cli/                            # medium-bound — thin serializers of the domain
├── viewer-core/                # @hexagram/viewer-core — generic terminal chrome (ScreenShell, palette, keymap, layout)
├── readout/                    # @hexagram/readout — ANSI serializer of the consultation-view IR
├── casting-ui/                 # @hexagram/casting-ui — Ink casting Viewer + interactive/manual flows
├── history-ui/                 # @hexagram/history-ui — Ink history browser
├── playground-ui/              # @hexagram/playground-ui — Ink 4-state line explorer
├── shell/                      # @hexagram/shell — Home hub aggregating the UIs
└── cli/                        # @hexagram/bin (private) — the bins
```

> NOTE TO IMPLEMENTER: Slices 0–5 are the source of truth for the *exact* on-disk paths
> and package names. Before writing the doc edits, run the inventory greps in Task 5 and
> confirm the bucket names (`domain/`, `cli/`) and any package renames (e.g. `apps/cli` →
> `cli/cli`). If a path in this plan disagrees with the merged tree, the **merged tree wins** —
> fix this plan's text inline and proceed. Do not invent packages that Slices 0–5 did not create.

---

## Task 1 — Create the new ADR (0019)

**Files:** `docs/adr/0019-domain-cli-boundary.md` (new)

The next free ADR number is **0019**. Slice 3 (which executes BEFORE this slice) already created **ADR-0018** (`docs/adr/0018-consultation-view-ir.md`, the consultation-view IR decision), so after Slice 3 lands the highest existing ADR is 0018 and the next free number is 0019. Confirm with the verification grep in Task 6. Match the house style observed in `docs/adr/0001`, `0002`, `0011`, `0016`, `0017`, `0018`: a `Status:` / `Date:` header pair (not the `- Status:` bullet form of the generic Nygard template), a prose decision opening, then `## Considered options`, `## Consequences`, `## Where it's enforced`.

- [ ] Confirm `0019` is free AND that `0018` already exists (authored by Slice 3): `ls docs/adr/ | grep -E '^0019'` returns nothing, and `ls docs/adr/0018-consultation-view-ir.md` prints the path. Do **not** create or overwrite `0018` — it is Slice 3's consultation-view IR ADR.
- [ ] Create `docs/adr/0019-domain-cli-boundary.md` with the full content below.
- [ ] Commit: `docs(adr): add ADR-0019 recording the domain/cli boundary`.

### Full content of `docs/adr/0019-domain-cli-boundary.md`

```markdown
# The boundary is domain vs CLI, not computation vs rendering

Status: Accepted
Date: 2026-06-04

The codebase had drawn its top-level boundary at **computation vs rendering**: the
casting algorithm, the data tables, and the type vocabulary were single-homed in
`@hexagram/core`, but everything that *renders* a consultation was treated as UI and
allowed to live in the UI packages. That line was wrong. **Presentation-of-domain** —
which lines move, the line-glyph vocabulary, the position labels, the ledger geometry,
the section order, the manual-flow invariants — is domain knowledge, not UI. Splitting
it off as "rendering" let it leak into and duplicate across the UI packages, where it was
kept in sync by byte-identity fixtures rather than by a single authoritative
representation.

We draw the boundary at **domain (medium-neutral, reusable) vs CLI (medium-bound)**
instead. Domain knowledge is the algorithm + the data + the line semantics + the
presentation vocabulary + the medium-neutral Consultation-view IR + the manual
invariants — *all* of it below the UI line, in `domain/*`. The `cli/*` packages are thin
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
the Readout *renderer* from the generic chrome — was a half-step inside the wrong boundary.
0016 claimed `viewer-core` no longer depended on `@hexagram/core` and that consultation
rendering had "one home"; in fact `viewer-core` carried `isMovingLine` (domain line
semantics) and rendering had three homes (the ANSI sections, the markdown body, and
geometry constants leaking into `playground-ui`), reconciled by fixtures. The fix is not a
cleaner renderer extraction; it is moving the *knowledge* down into a medium-neutral IR and
letting the renderers become thin.

## Considered options

- **Keep computation-vs-rendering, deduplicate with shared fixtures (status quo).**
  Rejected: byte-identity fixtures are a *symptom* of duplicated knowledge, not a fix for
  it. They detect drift after the fact; they do not give the knowledge a single home, and
  they make every presentation change a multi-surface edit guarded by regenerated golden
  files. DRY is about one authoritative representation of a *decision*, not matching bytes.
- **A medium-neutral Consultation-view IR, with `domain/*` vs `cli/*` buckets and a
  boundary lint (chosen).** The presentation vocabulary, section order, and ledger geometry
  live once in `domain/consultation-view`; `cli/readout` (ANSI) and the markdown body
  renderer in `domain/consultation-file` serialize the *same* IR. The lint makes the
  boundary unfalsifiable by accident.
- **Push the renderers up into a single `ui` package.** Rejected for the same reasons
  ADR-0002 rejected one `ui` package: the interactive experiences would share a mutable
  surface and drift into coupling. It also leaves the *knowledge* in the UI layer — the
  exact mistake this ADR corrects.
- **Leave ADR-0016 standing and add a footnote.** Rejected: 0016's two factual claims are
  false under the new structure, and its framing actively misdescribes the boundary. ADRs
  are append-only and reversals are signal — supersede, don't patch.

## Consequences

- **Two top-level buckets.** Packages live under `domain/*` (medium-neutral) and `cli/*`
  (medium-bound). `pnpm-workspace.yaml` globs both; the bins package is `cli/cli`
  (`@hexagram/bin`), no longer `apps/cli`.
- **The lint is load-bearing.** A `domain/* → cli/*` import is a design error caught at
  lint time, not review time. New domain code that "just needs a colour" must instead
  express the intent medium-neutrally and let a `cli/*` serializer choose the colour.
- **Renderers are thin and plural by design.** `cli/readout` (ANSI) and the markdown body
  renderer both serialize `domain/consultation-view`; adding a third medium is a new
  serializer over the same IR, not a new copy of the section logic. The byte-identity
  fixtures shrink to *serializer* tests over a shared IR rather than cross-surface
  consistency checks.
- **The Next.js reuse litmus test now passes.** A web host can depend on `domain/core`,
  `domain/consultation-file`, `domain/text-layout`, and `domain/consultation-view` with
  zero `cli/*` (and zero Ink/terminal) in its dependency graph, and render a consultation
  by writing an HTML serializer of the IR. Under the old boundary this was impossible: the
  line semantics, glyph vocabulary, and section order were tangled into terminal-bound
  packages.
- **ADR-0002 and ADR-0017 are amended by reference, not rewritten.** Their package lists
  and DAG still describe the same decomposition *rules* (one concern per package, depend
  only downward); only the bucket names and the home of the presentation knowledge change.
  This ADR is the canonical statement of the boundary; 0002 remains the canonical statement
  of the package decomposition.

## Where it's enforced

- `pnpm-workspace.yaml` — `domain/*` + `cli/*` globs (replacing `packages/*` + `apps/*`).
- the boundary lint config (oxlint/eslint import rule) — forbids `domain/* → cli/*` edges.
- `domain/consultation-view/` — the medium-neutral IR: presentation vocabulary, section
  order, ledger geometry.
- `domain/core/` — line semantics (`isMovingLine`, the moving-line set) and the manual
  invariants (conservation, zero-remainder, suspended-sum), hoisted out of the UI packages.
- `domain/text-layout/` — `visualWidth` and the glyph/column maths.
- `cli/readout/` and `domain/consultation-file/`'s markdown body renderer — thin serializers
  of the IR.
- [ADR-0016](0016-readout-renderer-extraction.md) — superseded by this ADR.
- [ADR-0002](0002-monorepo-structure-and-package-decomposition.md) — the package
  decomposition rules (unchanged) and the DAG.
```

> IMPLEMENTER NOTE: If Slices 0–5 named the boundary-lint mechanism concretely (a specific
> oxlint rule id, an eslint `no-restricted-imports` group, or a Turborepo `boundaries`
> tag), replace the generic "the boundary lint config (oxlint/eslint import rule)" bullet
> in *Where it's enforced* with the exact file + rule. Verify against the merged tree;
> do not guess a rule name.

---

## Task 2 — Supersede ADR-0016

**Files:** `docs/adr/0016-readout-renderer-extraction.md` (edit)

The supersede convention (per `docs/adr/README.md` Conventions and the worked example in
ADR-0017's opening): change the `Status:` line to `Superseded by 0019`, and add a short
superseded-note at the top correcting the two false claims. Do **not** rewrite the body —
ADRs are append-only; the historical reasoning stays.

> COORDINATION NOTE: Slice 3 has **already** added a "deepened by [ADR-0018]" pointer to
> ADR-0016 (the consultation-view IR deepens 0016's "one home for rendering" claim). When
> this slice runs, ADR-0016 therefore *already contains* a 0018 pointer near the top. Edit
> 0016 **additively**: set its `Status:` to `Superseded by 0019` and add the superseded-note
> below, WITHOUT removing or rewriting the existing Slice-3 deepening pointer to 0018. The
> "Before" snippets below show only the header/status lines you are changing; if the file as
> it sits on disk has the Slice-3 0018 deepening blockquote between the `Date:` line and the
> body, leave that blockquote in place and insert the supersede note alongside it.

- [ ] Edit the status line.

  **Before:**
  ```
  # Readout renderer extracted from viewer-core

  Status: Accepted
  Date: 2026-05-29
  ```

  **After** (set the `Status:` line; keep the Slice-3 `deepened by [ADR-0018]` blockquote that
  is already present, and add the supersede note below it):
  ```
  # Readout renderer extracted from viewer-core

  Status: Superseded by 0019
  Date: 2026-05-29

  > **Superseded by [ADR-0019](0019-domain-cli-boundary.md) (2026-06-04).** This ADR
  > framed the boundary as computation vs rendering and made two claims that did not hold:
  > (1) that `viewer-core` "no longer depends on `@hexagram/core` at all" — it carried
  > `isMovingLine` (domain line semantics) and re-acquired the `core` dependency under
  > [ADR-0017](0017-types-folded-into-core.md); and (2) that "all consultation rendering …
  > now has one home" — rendering had three homes (the ANSI sections, the markdown body,
  > and geometry constants leaking into `playground-ui`), reconciled by byte-identity
  > fixtures rather than by structure. ADR-0019 redraws the boundary as domain (medium-
  > neutral) vs CLI (medium-bound) and moves the presentation knowledge into a medium-
  > neutral IR. The reasoning below is preserved as the record of that earlier step.
  ```

  > IMPLEMENTER NOTE: The `deepened by [ADR-0018](0018-consultation-view-ir.md)` pointer that
  > Slice 3 added to this file stays. The supersede note above and that deepening pointer
  > coexist — 0018 deepened one of 0016's claims; 0019 supersedes the whole framing. Do not
  > delete the 0018 pointer.

- [ ] Commit: `docs(adr): supersede ADR-0016 with ADR-0019; correct its two stale claims`.

---

## Task 3 — Update the ADR index (README.md)

**Files:** `docs/adr/README.md` (edit)

- [ ] Add the 0019 boundary row and flip 0016's status in the index table.

  > COORDINATION NOTE: Slice 3 already added the `0018 | Consultation-view IR` row to this
  > index as part of its own task. Do **not** add or duplicate a 0018 row here — it is
  > expected to already be present. This slice adds only the 0019 boundary row and flips
  > 0016 to `Superseded by 0019`. The "Before" snippet below assumes the 0018 IR row is
  > already in place (added by Slice 3); preserve it.

  **Before** (the 0018 IR row is already present, added by Slice 3):
  ```
  | 0016 | Readout renderer extracted from viewer-core         | Accepted |
  | 0017 | Type vocabulary folded into core                    | Accepted |
  | 0018 | Consultation-view IR                                | Accepted |
  ```

  **After:**
  ```
  | 0016 | Readout renderer extracted from viewer-core         | Superseded by 0019 |
  | 0017 | Type vocabulary folded into core                    | Accepted |
  | 0018 | Consultation-view IR                                | Accepted |
  | 0019 | The boundary is domain vs CLI, not computation vs rendering | Accepted |
  ```

  The final index must show BOTH 0018 (consultation-view IR, from Slice 3) and 0019
  (domain/cli boundary, this slice), plus 0016 marked `Superseded by 0019`.

- [ ] Update the `Config → ADR reverse map` row for `pnpm-workspace.yaml` so it reflects the
  `domain/*` + `cli/*` globs decision now living in 0019.

  **Before:**
  ```
  | `pnpm-workspace.yaml`          | yes      | 0002, 0003                                                            |
  ```

  **After:**
  ```
  | `pnpm-workspace.yaml`          | yes      | 0002, 0003, 0019                                                      |
  ```

- [ ] Commit: `docs(adr): index ADR-0019 and mark ADR-0016 superseded`.

---

## Task 4 — Update ADR-0002's cross-references

**Files:** `docs/adr/0002-monorepo-structure-and-package-decomposition.md` (edit)

ADR-0002 is the canonical package-decomposition record. ADR-0019 deliberately does **not**
rewrite it (the decomposition *rules* are unchanged). Add a one-line forward-pointer so a
reader of 0002 learns the buckets were renamed and the boundary recast, without editing the
historical body. Use the same superseded/amended-by phrasing 0002 already uses for 0017.

- [ ] Add an amendment pointer near the top of 0002, immediately after the `Date:` line.

  **Before:**
  ```
  # Monorepo structure & package decomposition

  Status: Accepted
  Date: 2026-05-29

  The project is a Turborepo + pnpm-workspaces monorepo.
  ```

  **After:**
  ```
  # Monorepo structure & package decomposition

  Status: Accepted
  Date: 2026-05-29

  > **Amended by [ADR-0019](0019-domain-cli-boundary.md) (2026-06-04).** The package
  > decomposition *rules* below (one concern per package; depend only downward) still hold,
  > but the two top-level buckets are now `domain/*` (medium-neutral) and `cli/*`
  > (medium-bound) — not `packages/*` and `apps/*` — and the presentation knowledge that
  > this ADR left in the UI packages now lives below the UI line. See ADR-0019 for the
  > boundary and the current package map.

  The project is a Turborepo + pnpm-workspaces monorepo.
  ```

> IMPLEMENTER NOTE: Leave the rest of ADR-0002 (the `packages/*` DAG diagram and the
> `Where it's enforced` paths) historically intact — the amendment pointer is enough.
> The verification grep in Task 6 deliberately scopes structural-path checks to the
> *prose* docs (AGENTS/CLAUDE/CONTEXT/README), **not** the historical ADR bodies, which
> are append-only by policy.

- [ ] Commit: `docs(adr): point ADR-0002 at ADR-0019 for the renamed buckets`.

---

## Task 5 — Update the structural prose docs

These four docs describe the *current* package tree as fact (not as history), so they must
match the merged `domain/*` + `cli/*` reality. Run the inventory grep first to confirm the
exact lines, then apply the edits.

### 5a — Inventory the stale references

- [ ] Run and record the hits:
  ```bash
  rg -n 'packages/|apps/cli|apps/' AGENTS.md CLAUDE.md CONTEXT.md README.md docs/agents/domain.md
  ```
  Expected current hits (pre-edit): AGENTS.md "Repository layout" tree + the `## Architecture`
  path references; README.md "Monorepo layout" intro + pack-per-package list; CONTEXT.md
  glossary intro; docs/agents/domain.md the package enumeration + the `packages/` / `apps/`
  file-structure block.

### 5b — AGENTS.md "Repository layout"

**Files:** `AGENTS.md` (edit)

- [ ] Replace the intro sentence and the tree block.

  **Before** (lines ~92–108):
  ```
  This is a **Turborepo + pnpm-workspaces monorepo**. The root is private; published packages live under `packages/*` and CLI bins under `apps/*`.

  ```
  ts-hexagram-generator/         # workspace root (private)
  ├── packages/
  │   ├── core/                  # @hexagram/core — type vocabulary (./types), algorithm, random, getters, hexagram/trigram records
  │   ├── consultation-file/     # @hexagram/consultation-file — file format (Markdown + YAML frontmatter), renderers, legacy converter
  │   ├── viewer-core/           # @hexagram/viewer-core — generic terminal-UI primitives (ScreenShell, palette, chrome, keymap, layout, line glyphs)
  │   ├── readout/               # @hexagram/readout — Consultation Readout renderer (ConsultationReadout + per-section ANSI string builders)
  │   ├── casting-ui/            # @hexagram/casting-ui — Ink casting viewer + interactive/manual flows, plain-mode renderers
  │   ├── history-ui/            # @hexagram/history-ui — Ink history browser
  │   ├── playground-ui/         # @hexagram/playground-ui — Ink interactive playground (4-state line explorer)
  │   ├── shell/                 # @hexagram/shell — Home hub aggregating the casting/history/playground UIs
  │   └── test-utils/            # @hexagram/test-utils (private, dev-only) — polling + readiness-witness test helpers
  └── apps/
      └── cli/                   # @hexagram/bin (private) — hexagram + hexagram-random + hexagram-interactive + hexagram-manual + hexagram-history + hexagram-playground bins
  ```
  ```

  **After:**
  ```
  This is a **Turborepo + pnpm-workspaces monorepo**. The root is private. Packages live under two top-level buckets: `domain/*` holds the medium-neutral, reusable layer (algorithm, data, types, line semantics, presentation IR); `cli/*` holds the medium-bound terminal layer (chrome, serializers, Ink UIs, bins). A `domain/* → cli/*` import is a build-failing lint error. See `docs/adr/0019-domain-cli-boundary.md`.

  ```
  ts-hexagram-generator/             # workspace root (private)
  ├── domain/                        # medium-neutral, reusable — below the UI line
  │   ├── core/                      # @hexagram/core — type vocabulary (./types), algorithm, random, getters, line semantics, manual invariants, hexagram/trigram records
  │   ├── consultation-file/         # @hexagram/consultation-file — file format (Markdown + YAML frontmatter), markdown-body serializer of the view IR, legacy converter
  │   ├── text-layout/               # @hexagram/text-layout — visualWidth + glyph/column maths (no divination meaning)
  │   └── consultation-view/         # @hexagram/consultation-view — medium-neutral Consultation-view IR (presentation vocabulary, section order, ledger geometry)
  └── cli/                           # medium-bound — thin serializers of the domain
      ├── viewer-core/               # @hexagram/viewer-core — generic terminal-UI primitives (ScreenShell, palette, chrome, keymap, layout)
      ├── readout/                   # @hexagram/readout — ANSI serializer of the Consultation-view IR
      ├── casting-ui/                # @hexagram/casting-ui — Ink casting viewer + interactive/manual flows, plain-mode renderers
      ├── history-ui/                # @hexagram/history-ui — Ink history browser
      ├── playground-ui/             # @hexagram/playground-ui — Ink interactive playground (4-state line explorer)
      ├── shell/                     # @hexagram/shell — Home hub aggregating the casting/history/playground UIs
      ├── cli/                       # @hexagram/bin (private) — hexagram + hexagram-random + hexagram-interactive + hexagram-manual + hexagram-history + hexagram-playground bins
      └── test-utils/                # @hexagram/test-utils (private, dev-only) — polling + readiness-witness test helpers
  ```
  ```

  > IMPLEMENTER NOTE: Confirm where `test-utils` landed in the merged tree (it is a dev-only
  > leaf; Slices 0–5 may have placed it under `cli/` or kept it elsewhere). Place it where it
  > actually lives and adjust the comment. Same for whether `text-layout`/`consultation-view`
  > are the exact merged names.

- [ ] Update the decomposition pointer line directly below the tree.

  **Before:**
  ```
  The decision behind this decomposition (and the dependency DAG) is recorded in `docs/adr/0002-monorepo-structure-and-package-decomposition.md`; see `docs/adr/` for the full set of architecture decisions.
  ```

  **After:**
  ```
  The decision behind this decomposition (and the dependency DAG) is recorded in `docs/adr/0002-monorepo-structure-and-package-decomposition.md`; the domain-vs-CLI boundary that names the two buckets is `docs/adr/0019-domain-cli-boundary.md`. See `docs/adr/` for the full set of architecture decisions.
  ```

> IMPLEMENTER NOTE — `## Architecture` section path references in AGENTS.md (lines ~203–313)
> use concrete `packages/<pkg>/src/...` and `apps/cli/src/...` paths in running prose. These
> are illustrative file pointers, not the structural tree. **Update them too** so they don't
> contradict the new buckets: rewrite `packages/core/...` → `domain/core/...`,
> `packages/consultation-file/...` → `domain/consultation-file/...`,
> `packages/viewer-core/...` → `cli/viewer-core/...`, `packages/readout/...` →
> `cli/readout/...`, `packages/casting-ui/...` → `cli/casting-ui/...`,
> `packages/history-ui/...` → `cli/history-ui/...`, `packages/playground-ui/...` →
> `cli/playground-ui/...`, `packages/shell/...` → `cli/shell/...`, and `apps/cli/src/...` →
> `cli/cli/src/...`. The Task 6 grep will fail if any `packages/` or `apps/` token remains in
> AGENTS.md, so this pass is required. Do these as a single mechanical find-and-confirm pass
> (read each hit, rewrite the prefix, keep the rest of the path identical).

### 5c — CLAUDE.md

**Files:** `CLAUDE.md` (edit)

CLAUDE.md `@AGENTS.md`-includes AGENTS.md, so most structural prose is inherited. Confirm
CLAUDE.md itself has no independent `packages/*` / `apps/*` references.

- [ ] Run `rg -n 'packages/|apps/' CLAUDE.md`. If it returns nothing, no edit is needed
  (the inherited AGENTS.md content was fixed in 5b). If it has hits, rewrite each prefix the
  same way as 5b.

### 5d — CONTEXT.md glossary intro

**Files:** `CONTEXT.md` (edit)

- [ ] Replace the package enumeration in the opening paragraph.

  **Before** (lines ~4–8):
  ```
  divination or random generation — and browsing past readings. This glossary
  covers the whole single-context repo: the `packages/*` libraries (`core`
  — which also owns the type vocabulary at `./types` —, `consultation-file`,
  `viewer-core`, `readout`, `casting-ui`, `history-ui`, `playground-ui`, `shell`,
  `test-utils`) and the `apps/cli` bins (`@hexagram/bin`).
  ```

  **After:**
  ```
  divination or random generation — and browsing past readings. This glossary
  covers the whole single-context repo across both buckets: the medium-neutral
  `domain/*` libraries (`core` — which also owns the type vocabulary at `./types` —,
  `consultation-file`, `text-layout`, `consultation-view`) and the medium-bound
  `cli/*` packages (`viewer-core`, `readout`, `casting-ui`, `history-ui`,
  `playground-ui`, `shell`, `test-utils`, and the `cli` bins package `@hexagram/bin`).
  See `docs/adr/0019-domain-cli-boundary.md` for the boundary.
  ```

### 5e — README.md "Monorepo layout"

**Files:** `README.md` (edit)

- [ ] Replace the layout intro sentence.

  **Before:**
  ```
  The repo is a **Turborepo + pnpm-workspaces** monorepo. The root is private; published packages live under `packages/*` and CLI bins under `apps/*`.
  ```

  **After:**
  ```
  The repo is a **Turborepo + pnpm-workspaces** monorepo. The root is private. Packages live under two top-level buckets: `domain/*` (medium-neutral, reusable — algorithm, data, types, presentation IR) and `cli/*` (medium-bound — terminal chrome, serializers, Ink UIs, bins). A `domain/* → cli/*` import is a lint error; see [docs/adr/0019](docs/adr/0019-domain-cli-boundary.md).
  ```

- [ ] Add `@hexagram/text-layout` and `@hexagram/consultation-view` rows to the package
  table (after the `consultation-file` row), and update the table's framing if it groups by
  bucket. Minimum: add the two missing domain packages so the table is complete.

  Insert after the `@hexagram/consultation-file` row:
  ```
  | `@hexagram/text-layout`       | `visualWidth` + glyph/column maths shared by the serializers — no divination meaning.                                                                                                                                       |
  | `@hexagram/consultation-view` | The medium-neutral Consultation-view IR (presentation vocabulary, section order, ledger geometry) that `readout` (ANSI) and the markdown body renderer both serialize.                                                       |
  ```

- [ ] Update the `@hexagram/readout` row description.

  **Before:**
  ```
  | `@hexagram/readout`           | The Consultation Readout renderer: the `ConsultationReadout` component + the per-section ANSI string builders.                                                                                                                            |
  ```

  **After:**
  ```
  | `@hexagram/readout`           | The ANSI serializer of the Consultation-view IR: the `ConsultationReadout` component + the per-section ANSI string builders.                                                                                                               |
  ```

- [ ] Fix the pack-per-package command list (Option 3) so it uses the new packages and
  drops nothing that ships. Add the two new domain packages to the `pnpm --filter … pack`
  block:
  ```
  pnpm --filter @hexagram/text-layout       pack
  pnpm --filter @hexagram/consultation-view pack
  ```
  (Place them after `@hexagram/consultation-file` to keep the topological order.) The
  `./apps/cli/...` install paths in that section become `./cli/cli/...` — rewrite them.

> IMPLEMENTER NOTE: README.md also has `./apps/cli` literal paths in the install
> instructions and npm-equivalents block. The Task 6 grep covers README.md, so rewrite every
> `apps/cli` → `cli/cli` and any remaining `packages/` token there too.

### 5f — docs/agents/domain.md

**Files:** `docs/agents/domain.md` (edit)

- [ ] Replace the package enumeration sentence.

  **Before:**
  ```
  This is a **single-context** repo: one `CONTEXT.md` and one `docs/adr/` directory at the repo root cover the whole monorepo. All packages (`types`, `core`, `consultation-file`, `viewer-core`, `casting-ui`, `history-ui`, `playground-ui`, `shell`, `test-utils`) and the `apps/cli` bins share the same divination domain vocabulary.
  ```

  **After:**
  ```
  This is a **single-context** repo: one `CONTEXT.md` and one `docs/adr/` directory at the repo root cover the whole monorepo. All packages — the `domain/*` libraries (`core`, `consultation-file`, `text-layout`, `consultation-view`) and the `cli/*` packages (`viewer-core`, `readout`, `casting-ui`, `history-ui`, `playground-ui`, `shell`, `test-utils`, `cli`) — share the same divination domain vocabulary.
  ```

- [ ] Replace the file-structure block.

  **Before:**
  ```
  /
  ├── CONTEXT.md
  ├── docs/adr/
  │   ├── 0001-some-decision.md
  │   └── 0002-another-decision.md
  ├── packages/
  └── apps/
  ```

  **After:**
  ```
  /
  ├── CONTEXT.md
  ├── docs/adr/
  │   ├── 0001-some-decision.md
  │   └── 0002-another-decision.md
  ├── domain/
  └── cli/
  ```

- [ ] Commit (5b–5f together): `docs: align structural prose with the domain/cli package tree`.

---

## Task 6 — Verification (doc-consistency checks)

These are the slice's "tests". Each is an exact command with the expected output.

- [ ] **No stale structural `packages/*` references remain in the prose docs.** (ADR bodies
  are excluded — they are append-only history and legitimately mention `packages/*`.)
  ```bash
  rg -n 'packages/|apps/' AGENTS.md CLAUDE.md CONTEXT.md README.md docs/agents/domain.md
  ```
  **Expected:** no output (exit code 1).

- [ ] **The new boundary ADR exists and is numbered 0019** (and Slice 3's 0018 IR ADR is
  present, untouched).
  ```bash
  ls docs/adr/0019-domain-cli-boundary.md docs/adr/0018-consultation-view-ir.md
  ```
  **Expected:** both paths print (this slice's boundary ADR is 0019; Slice 3's IR ADR is 0018).

- [ ] **The new boundary ADR is linked from the index.**
  ```bash
  rg -n '0019' docs/adr/README.md
  ```
  **Expected:** at least two hits — the index-table row and the `pnpm-workspace.yaml`
  reverse-map row. (The pre-existing `0018` IR row, added by Slice 3, is separate and must
  remain — confirm both 0018 and 0019 index rows are present.)

- [ ] **ADR-0016 is marked superseded everywhere it has a status.**
  ```bash
  rg -n 'Superseded by 0019' docs/adr/0016-readout-renderer-extraction.md docs/adr/README.md
  ```
  **Expected:** one hit in the ADR file (its `Status:` line) and one in the index table.

- [ ] **ADR-0016's body no longer asserts the two false claims unqualified** — i.e. the
  superseded-note precedes them. Eyeball, plus confirm the note is present:
  ```bash
  rg -n 'Superseded by \[ADR-0019\]' docs/adr/0016-readout-renderer-extraction.md
  ```
  **Expected:** one hit (the supersede blockquote near the top). Note: the Slice-3
  `deepened by [ADR-0018]` pointer is also expected to be present in this file — it is
  legitimate and must NOT be removed by this slice.

- [ ] **The new buckets are named in the structural docs.**
  ```bash
  rg -n 'domain/\*|cli/\*' AGENTS.md README.md CONTEXT.md docs/agents/domain.md
  ```
  **Expected:** at least one hit in each file.

- [ ] **No accidental forward-reference to a non-existent ADR.** (0018 and 0019 both legitimately
  exist after Slice 3 + this slice, so this checks only for *higher* unwritten numbers.)
  ```bash
  rg -no '0020|0021' docs/adr/ || true
  ```
  **Expected:** no output.

- [ ] Run the repo's own doc/lint checks if they cover markdown link integrity (e.g.
  `pnpm lint:check` if it walks `*.md`, or a markdown-link checker if one exists). Record the
  result; this slice changes no source, so source tests are out of scope.

- [ ] Final commit if any verification fix was needed: `docs: fix doc-consistency check failures for slice 6`.

---

## Notes & boundaries

- **No source code changes.** This slice is docs-only. If a verification grep reveals that
  Slices 0–5 did *not* in fact create a package this plan names (e.g. `consultation-view`
  landed under a different name), fix this plan's prose to match the merged tree — do not
  create or rename packages here.
- **ADR bodies are append-only.** Tasks 2 and 4 add superseded/amendment *notes*; they do
  not rewrite the historical reasoning. The Task 6 structural grep deliberately excludes ADR
  bodies for this reason.
- **Commit frequently** — one commit per task (Tasks 1–4) and one for the prose-doc batch
  (Task 5), so a reviewer can verify each in one pass.
```
