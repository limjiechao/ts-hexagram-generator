# Round-4 Seam Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 17 conceptual-integrity seams found by the round-4 cold-read review — collapsing each duplicated/forked piece of knowledge to a single owner and making every affected ADR/CONTEXT statement agree with the code.

**Architecture:** A sequence of 14 single-intent slices, each one conceptual fix = one reviewable commit. Slices are ordered so that no slice rewrites an import line, ADR paragraph, or symbol home that a later slice also touches. Most slices are behaviour-preserving refactors gated by the existing byte-identity fixtures (`pnpm generate-fixtures` must produce zero diff) plus `pnpm build`, `pnpm type:check`, and `pnpm boundaries:check`; a minority add one new test for genuinely new behaviour.

**Tech Stack:** TypeScript, pnpm workspaces + Turborepo, tsdown (build), vitest (test), Ink/React (terminal UI), oxlint + eslint, dependency-cruiser (boundary lint), oxfmt.

**Human rulings baked into this plan (do not re-litigate):**
1. **ADR mutation policy:** correct *factual errata* (wrong format prose, phantom-field references, stale `packages/` paths) **in-place** in the ADR body; record genuine *decision refinements* as a dated **`## Amendment — 2026-06-06`** section (matching the existing ADR-0006 precedent). Only S5 gets a brand-new ADR.
2. **S5:** delete the global `process.chdir`; thread an explicit `consultationsDir` from each bin to the save edge (FCIS). This deliberately reverses round-3's keep-chdir choice.
3. **S6/S7:** add an explicit per-section `media` visibility flag to the consultation-view IR; serializers filter uniformly; no implicit skips.
4. **S11:** relocate `banner-lines` to `cli/shell`; drop `@hexagram/consultation-view` from `cli/viewer-core`.

---

## Global sequencing & collision matrix

Execute slices **in this order**. The "Why here" column is the collision constraint — violating the order forces a file/ADR to be edited twice.

| # | Slice | Seam(s) | Primary files | Why here |
|---|-------|---------|---------------|----------|
| 1 | consultation-view concrete subpath exports | S8 | `domain/consultation-view/*`, all its importers | Foundation: downstream slices (S4/S6/S7/S11) edit the **final** subpath specifiers, not the barrel. |
| 2 | Relocate emergence transform into line-semantics | S3 | `domain/core/src/{line-semantics,getters}.ts` + 3 importers | Must precede S10 (S10 collapses the comment S3 relocates). Different package from S8. |
| 3 | Collapse duplicated line-vocabulary comments | S10 | `domain/core/src/getters.ts`, `cli/playground-ui/src/playground-lines.ts` | After S3: `getters.ts` may be a re-export by then; S10 writes the final pointer. |
| 4 | Explicit `media` visibility flag on IR sections | S6 | `domain/consultation-view/src/{ir,build-view}.ts`, both serializers | Behaviour-preserving. Must precede S7 (S7 reuses the clarified casting subset). Edits ir.ts created-final by S8. |
| 5 | Partial casting from ledger subset (drop sentinel) | S7 | `cli/readout/src/output-composers.ts` | After S6: reuses S6's section semantics; no fake `[7,7,7,7,7,7]`. |
| 6 | Playground imports shared geometry | S4 | `cli/playground-ui/src/playground-display-geometry.ts` + test | After S8 (imports the final `vocabulary` subpath) and S6 (ir.ts settled). |
| 7 | Relocate banner-lines to cli/shell | S11 | `cli/viewer-core/*`, `cli/shell/*` | After S8 (carries the final import specifier when moved). |
| 8 | env-policy owns `headless` | S2 | `cli/viewer-core/src/env-policy.ts`, `cli/casting-ui/src/utils-mode.ts`, `apps/cli/src/manual.ts` | Before S5 (both touch `apps/cli/src/manual.ts`). |
| 9 | Thread consultationsDir; delete chdir | S5 | `apps/cli/src/{workspace-root,random,manual,interactive,hexagram}.ts`, `cli/casting-ui/src/{viewer.tsx,log-and-save.ts}`, `cli/shell/src/hexagram-app.tsx` | After S2 (manual.ts). New ADR-0020. |
| 10 | Reconcile pick-clamp prose | S1 | `domain/core/src/casting-derivation.ts` (comment only) | Independent. |
| 11 | Rename cli manual-validation → manual-feedback | S9 | `cli/casting-ui/src/manual-validation.ts` (+test) → `manual-feedback.ts` | Independent (does NOT touch the domain file S1 edits). |
| 12 | Consultation-file reconciliation | S12+S13+S14+S15 | `domain/consultation-file/src/legacy-converter.ts`, ADR-0008/0006, CLAUDE.md, AGENTS.md | All four edit the same `legacy-converter.ts` envelope literal + ADR-0008 region — bundle to avoid 3× rewrites. |
| 13 | Narrate `no-raw-string-width` | S16 | `dependency-cruiser.config.cjs`, ADR-0019, ADR-0005 | Docs/config only. |
| 14 | Normalise relative-import extensions + lint rule | S17 | repo-wide codemod, `.oxlintrc.json`/`eslint.config.js`, ADR-0004/0005 | **LAST**: rewrites import lines repo-wide; must run after all structural moves settle. |

**Standing verification (run after every slice unless the slice says otherwise):**
```bash
pnpm build && pnpm type:check && pnpm test && pnpm boundaries:check && pnpm lint:check && pnpm format:check
```
For refactor slices, additionally: `pnpm generate-fixtures && git diff --exit-code` (the fixtures MUST be byte-identical; a diff means the refactor changed output and the slice is wrong).

---

### Task 1 (S8): consultation-view → concrete subpath exports

**Rationale:** ADR-0003 mandates concrete-file subpath `exports` (no barrels); `@hexagram/core` already complies. `domain/consultation-view/src/index.ts` is the lone `export *` barrel. This is conformance, not a new decision — no ADR amendment.

**Files:**
- Modify: `domain/consultation-view/package.json` (exports map → 6 subpaths)
- Modify: `domain/consultation-view/tsdown.config.ts` (6 entries)
- Delete: `domain/consultation-view/src/index.ts`
- Modify importers: `cli/readout/src/{serialize-ansi,index,output-composers}.ts`, `cli/casting-ui/src/output-composers.ts`, `domain/consultation-file/src/{markdown,serialize-markdown}.ts`, `cli/playground-ui/src/{playground-display-rows,playground-display-identity}.ts`, `cli/viewer-core/src/banner-lines.ts`, and 3 test files (`domain/consultation-file/tests/markdown-sections.test.ts`, `cli/readout/tests/casting-ledger.test.ts`, `cli/viewer-core/tests/banner-glyph-parity.test.ts`)

- [ ] **Step 1: Enumerate the symbol→source-file map.** The package has 6 non-index source modules. Run:

```bash
cd domain/consultation-view/src && for f in build-view diagram-template ir ledger-geometry ledger-template vocabulary; do echo "== $f =="; grep -E '^export ' $f.ts; done
```
Record which exported symbol lives in which file. This is the routing table for every importer rewrite.

- [ ] **Step 2: Rewrite `package.json` exports** to one entry per source file, mirroring `domain/core/package.json`'s `source`/`types`/`import` triple shape. One subpath each: `./build-view`, `./diagram-template`, `./ir`, `./ledger-geometry`, `./ledger-template`, `./vocabulary`. Keep the existing `.` key ONLY if a consumer still needs it — verify with `grep -rn "@hexagram/consultation-view'" --include=*.ts --include=*.tsx . | grep -v node_modules`; if every importer can move to a subpath, remove the `.` entry.

- [ ] **Step 3: Rewrite `tsdown.config.ts`** `entry` array to the same 6 source files.

- [ ] **Step 4: Delete `src/index.ts`.**

- [ ] **Step 5: Repoint every importer** to the owning subpath using the Step-1 table. Importers that pull symbols from multiple source files become multiple import statements (e.g. `serialize-ansi.ts` pulls from `diagram-template`, `ledger-template`, `vocabulary`, `ir` → four imports).

- [ ] **Step 6: Verify build + boundary + tests.**

Run: `pnpm build && pnpm type:check && pnpm test && pnpm boundaries:check`
Expected: PASS, zero changes to any fixture (this slice changes no runtime behaviour).

- [ ] **Step 7: Commit.**

```bash
git add -A
git commit -m "refactor(consultation-view): replace barrel with concrete subpath exports

Conform to ADR-0003 (no barrels; concrete-file exports). consultation-view
was the lone package publishing via a src/index.ts export* barrel; every
other package already uses granular subpaths. Importers now name the owning
module, so a future reader can find each symbol's home from its import."
```

---

### Task 2 (S3): relocate the emergence transform into `line-semantics.ts`

**Rationale:** ADR-0019:96-99 and ADR-0018:51 already name `@hexagram/core/line-semantics` as the home of moving-line algebra, but `EMERGING_LINE`/`getEmergingHexagram` (6→7, 9→8) live in `getters.ts` while `line-semantics.ts` only implements the unrelated `flipPolarity` (9↔6). This is code drift toward an already-correct ADR — no ADR change.

**Files:**
- Modify: `domain/core/src/line-semantics.ts` (add `EMERGING_LINE` + `getEmergingHexagram`)
- Modify: `domain/core/src/getters.ts` (delete both; drop orphaned `Line` import if unused)
- Modify importers: `domain/consultation-view/src/build-view.ts`, `cli/history-ui/src/history-list-transforms.ts`, `cli/playground-ui/src/playground-lines.ts`
- Test: `domain/core/tests/line-semantics.test.ts` (add the missing `getEmergingHexagram` coverage)

- [ ] **Step 1: Write the failing test** in `domain/core/tests/line-semantics.test.ts`:

```typescript
import { getEmergingHexagram } from '../src/line-semantics.js'
import type { Hexagram } from '../src/types.js'

describe('getEmergingHexagram', () => {
  it('collapses moving lines (6→7, 9→8) and passes static lines through', () => {
    const standing: Hexagram = [6, 7, 8, 9, 7, 8]
    expect(getEmergingHexagram(standing)).toEqual([7, 7, 8, 8, 7, 8])
  })
  it('returns an identical hexagram when there are no moving lines', () => {
    const standing: Hexagram = [7, 8, 7, 8, 7, 8]
    expect(getEmergingHexagram(standing)).toEqual([7, 8, 7, 8, 7, 8])
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (`getEmergingHexagram` not exported from line-semantics).

Run: `pnpm --filter @hexagram/core test -- line-semantics`
Expected: FAIL ("getEmergingHexagram is not a function" / import error).

- [ ] **Step 3: Move the code.** Cut `EMERGING_LINE` (the `{6:7,7:7,8:8,9:8}` map) and `getEmergingHexagram` from `getters.ts` into `line-semantics.ts`, placed beside `flipPolarity`. Keep the explanatory comment with the map. In `getters.ts`, delete both and remove the `Line` import if nothing else there uses it.

- [ ] **Step 4: Repoint importers** from `@hexagram/core/getters` to `@hexagram/core/line-semantics` in the three consumer files (only the `getEmergingHexagram` symbol moves; `getHexagramRecord` stays on `/getters`).

- [ ] **Step 5: Run test + full build — expect PASS, fixtures byte-identical.**

Run: `pnpm --filter @hexagram/core test -- line-semantics && pnpm build && pnpm test && pnpm generate-fixtures && git diff --exit-code -- '*fixtures*'`
Expected: PASS; no fixture diff.

- [ ] **Step 6: Commit.**

```bash
git add -A
git commit -m "refactor(core): home the emergence transform in line-semantics

getEmergingHexagram / EMERGING_LINE (6->7, 9->8) lived in getters.ts while
the file named line-semantics implemented only the unrelated flipPolarity
(9<->6). ADR-0019 and ADR-0018 already name line-semantics as the home for
moving-line algebra; move the transform there and add the unit test it
lacked. Pure relocation; no behaviour change."
```

---

### Task 3 (S10): collapse the duplicated line-vocabulary comments

**Rationale:** The 6/7/8/9 prose semantics are restated in ≥4 files. After Task 2, `line-semantics.ts:9-13` is the canonical home; other sites should point, not restate. `vocabulary.ts` documents *glyphs* (distinct knowledge) — leave it.

**Files:**
- Modify: `domain/core/src/getters.ts` (trim its comment to a one-line pointer; if Task 2 left only re-exports here, the comment may simply go)
- Modify: `cli/playground-ui/src/playground-lines.ts` (replace the 4-line vocabulary block with a one-line pointer)
- Do NOT touch: `domain/core/src/line-semantics.ts` (canonical), `domain/consultation-view/src/vocabulary.ts` (glyph knowledge)

- [ ] **Step 1: Edit `playground-lines.ts:6-11`** — replace the vocabulary recital with:
```typescript
// Line vocabulary (6/7/8/9, moving lines) → @hexagram/core line-semantics.ts.
```
Keep the glyph mini-table only if it genuinely aids the cast-explorer reader; otherwise delete it (glyphs are single-sourced in `vocabulary.ts`).

- [ ] **Step 2: Edit `getters.ts`** — if `getHexagramKey`/`getHexagramRecord` still live here, leave a one-line note: `// Line vocabulary lives in line-semantics.ts.` Remove any general 6/7/8/9 recital.

- [ ] **Step 3: Verify (docs/comments only — no behaviour).**

Run: `pnpm type:check && pnpm lint:check`
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add -A
git commit -m "docs(core): point to line-semantics for line vocabulary, stop restating it

The 6/7/8/9 moving-line prose was duplicated across four files; only the
executable glyph table (vocabulary.ts) and the canonical algebra
(line-semantics.ts) should state it. Other sites now point."
```

---

### Task 4 (S6): explicit `media` visibility flag on IR sections

**Rationale:** The IR claims a single section order, but `serialize-markdown` silently drops `text:hexagram` and `serialize-ansi` drops `lines:none`, with a duplicated text pair compensating. Make visibility an explicit, type-checked property of the IR owned by `buildConsultationView`. Behaviour-preserving: fixtures must stay byte-identical.

**Files:**
- Modify: `domain/consultation-view/src/ir.ts` (add `media` to the section union)
- Modify: `domain/consultation-view/src/build-view.ts` (set `media`; remove the backwards compensating comment)
- Modify: `cli/readout/src/serialize-ansi.ts` (filter by `media`; delete the `''`-return skip)
- Modify: `domain/consultation-file/src/serialize-markdown.ts` (filter by `media`; delete the `role === 'lines'` skip)
- Modify: `docs/adr/0018-consultation-view-ir.md` (add a Consequence documenting the projection rule)

- [ ] **Step 1: Add the visibility type to `ir.ts`.** Define and attach to every section descriptor:

```typescript
/** Which render media emit this section. buildConsultationView is the sole owner. */
export type SectionMedium = 'ansi' | 'markdown'
// add to the base shape every ConsultationSection extends:
//   readonly media: readonly SectionMedium[]
```

- [ ] **Step 2: Set `media` in `build-view.ts`.** Every section gets `media: ['ansi', 'markdown']` EXCEPT: the `text:hexagram` sections get `media: ['ansi']`; the no-moving `role:'lines', variant:'none'` section gets `media: ['markdown']`. This encodes today's implicit behaviour exactly. Delete the now-obsolete comment that explained the markdown skip.

- [ ] **Step 3: Make both serializers filter uniformly.** In `serialize-ansi.ts` replace the special-case `''` return / `out !== ''` guard with: iterate only `view.sections.filter(s => s.media.includes('ansi'))`. In `serialize-markdown.ts` replace the `if (s.role === 'lines') …` skip with `view.sections.filter(s => s.media.includes('markdown'))`.

- [ ] **Step 4: Prove byte-identity.**

Run: `pnpm build && pnpm test && pnpm generate-fixtures && git diff --exit-code -- '*fixtures*'`
Expected: PASS; **zero** fixture diff (a diff means `media` was assigned wrong on some section — fix the assignment, not the fixture).

- [ ] **Step 5: Document the projection in ADR-0018** (factual refinement → in-place per the human ruling). Add to "Consequences":

```markdown
- **Section→medium visibility is explicit, not implicit.** Each IR section carries a
  `media: ('ansi'|'markdown')[]` flag; serializers filter on it rather than skipping
  sections in their switch arms. Hexagram-level text is emitted as `text:hexagram`
  (ANSI-only; Markdown folds it into the trailing LINES block via the no-moving
  `lines:none` section, Markdown-only). `buildConsultationView` is the sole owner of
  visibility.
```

- [ ] **Step 6: Commit.**

```bash
git add -A
git commit -m "refactor(consultation-view): make section→medium visibility explicit

The IR claimed one section order but each serializer silently dropped
sections (markdown: text:hexagram; ansi: lines:none), reconciled by a
duplicated text pair and a comment. Add a per-section media flag owned by
buildConsultationView; serializers filter uniformly. Output is byte-identical
(fixtures unchanged). ADR-0018 records the projection rule."
```

---

### Task 5 (S7): render partial casting from the ledger subset (drop the sentinel hexagram)

**Rationale:** `buildPartialCastingSections` (in `cli/readout/src/output-composers.ts`) feeds a fake `[7,7,7,7,7,7]` hexagram through the full `buildConsultationView` just to reuse the casting serializer mid-flow, then discards every other section. `buildLedgerRows` is hexagram-free and already exported — render the casting section directly from it.

**Files:**
- Modify: `cli/readout/src/output-composers.ts` (`buildPartialCastingSections`)
- Modify: `docs/adr/0018-consultation-view-ir.md` (one Consequence bullet)

- [ ] **Step 1: Confirm the in-flight callers & current output.** `cli/casting-ui/src/viewer.tsx` calls `buildPartialCastingSections`; tests in `cli/casting-ui/tests/output.test.ts` assert its output. Note the current bytes (the test is the oracle).

- [ ] **Step 2: Rewrite `buildPartialCastingSections`** to compose from the subset rather than the full view + sentinel:

```typescript
// WHY: a partial (mid-flow) casting render needs only the ledger; the hexagram
// isn't known yet. Build the casting section straight from buildLedgerRows
// instead of round-tripping a fake [7,7,7,7,7,7] through buildConsultationView.
export function buildPartialCastingSections(query: string, casting: PartialCastingRecord) {
  const rows = buildLedgerRows(casting)
  return {
    query: serializeQueryAnsi(query),
    casting: serializeCastingAnsi({ kind: 'casting', rows }),
  }
}
```
Import `buildLedgerRows` from `@hexagram/consultation-view/ledger-geometry` and `serializeCastingAnsi`/`serializeQueryAnsi` from their `serialize-ansi` home (final subpaths from Task 1). Keep the exact return-shape `viewer.tsx` expects.

- [ ] **Step 3: Verify byte-identity** (the existing `output.test.ts` assertions are the gate — they must pass unchanged).

Run: `pnpm --filter @hexagram/casting-ui test -- output && pnpm build && pnpm test && pnpm generate-fixtures && git diff --exit-code -- '*fixtures*'`
Expected: PASS; no fixture diff.

- [ ] **Step 4: Document in ADR-0018** (in-place Consequence):
```markdown
- **Mid-flow casting renders from the `buildLedgerRows` subset**, not a
  sentinel-hexagram round-trip through the full assembly.
```

- [ ] **Step 5: Commit.**

```bash
git add -A
git commit -m "refactor(readout): render partial casting from the ledger subset

buildPartialCastingSections fed a fake [7,7,7,7,7,7] hexagram through the
whole buildConsultationView just to reuse the casting serializer mid-flow.
buildLedgerRows is hexagram-free; compose the casting section from it
directly. Byte-identical; no sentinel."
```

---

### Task 6 (S4): playground imports shared geometry instead of re-deriving it

**Rationale:** `playground-display-geometry.ts` re-declares `GAP_WIDTH = 19` and computes `46` locally, reconciled only by a comment + test. ADR-0019 names "geometry constants leaking into playground-ui" as the exact sin ADR-0018 was meant to close. Share the cross-column numbers; keep the genuinely-local single-column numbers.

**Files:**
- Modify: `cli/playground-ui/src/playground-display-geometry.ts`
- Modify: `cli/playground-ui/tests/top-half-width-invariant.test.ts` (stop re-encoding the literal)

- [ ] **Step 1: Derive `GAP_WIDTH` from the shared glyph width.** Import `MOVING_ARROW` (and `RIGHT_COLUMN`) from `@hexagram/consultation-view/vocabulary` (final subpath from Task 1). Replace:
```typescript
export const GAP_WIDTH = 19
```
with:
```typescript
import { MOVING_ARROW, RIGHT_COLUMN } from '@hexagram/consultation-view/vocabulary'
/** Inter-column gap — shares the transformation section's arrow/gap width. */
export const GAP_WIDTH = MOVING_ARROW.length
```

- [ ] **Step 2: Turn the `46` comment into a checked identity.** After `LEFT_LINE_WIDTH` is defined, add:
```typescript
// The playground's left column must end exactly where the consultation's right
// column begins, so the two surfaces sit flush.
if (LEFT_LINE_WIDTH + GAP_WIDTH !== RIGHT_COLUMN) {
  throw new Error(`playground geometry drift: ${LEFT_LINE_WIDTH + GAP_WIDTH} !== RIGHT_COLUMN ${RIGHT_COLUMN}`)
}
```

- [ ] **Step 3: Leave `BAR_BLOCK_WIDTH = 25` local** with a clarifying comment that its equality with `TRIGRAM_DIVIDER_WIDTH` is a coincidence (different knowledge — value+bar+pos column sum vs divider width), NOT a shared authority. Do not import it.

- [ ] **Step 4: Fix the test** at `top-half-width-invariant.test.ts:~111` to compute from the imported `MOVING_ARROW.length` rather than the literal `19`.

- [ ] **Step 5: Verify byte-identity** (geometry numbers are unchanged in value, only in source).

Run: `pnpm --filter @hexagram/playground-ui test && pnpm build && pnpm test && pnpm generate-fixtures && git diff --exit-code -- '*fixtures*'`
Expected: PASS; no fixture diff.

- [ ] **Step 6: Commit.**

```bash
git add -A
git commit -m "refactor(playground): import shared gap/right-column geometry

playground-display-geometry re-derived GAP_WIDTH=19 and the col-46 anchor as
local literals, reconciled only by a comment. Derive GAP_WIDTH from
MOVING_ARROW.length and assert LEFT_LINE_WIDTH+GAP_WIDTH===RIGHT_COLUMN so
drift fails loudly. BAR_BLOCK_WIDTH stays local (distinct knowledge)."
```

---

### Task 7 (S11): relocate `banner-lines` to `cli/shell`; make `viewer-core` honestly generic

**Rationale (human ruling):** `banner-lines.ts` carries divination meaning (line glyphs, moving-line semantics, casting values) yet lives in `cli/viewer-core`, described by ADR-0001 and CLAUDE.md as "generic frame, no divination meaning." Its only live consumer is the `cli/shell` home banner. Move it to its consumer; drop the `consultation-view` dependency from `viewer-core`.

**Files:**
- Move: `cli/viewer-core/src/banner-lines.ts` → `cli/shell/src/banner-lines.ts`
- Move: `cli/viewer-core/tests/banner-lines.test.ts`, `cli/viewer-core/tests/banner-glyph-parity.test.ts` → `cli/shell/tests/`
- Modify: `cli/viewer-core/src/index.ts` (drop the banner-lines export + the stale "shared by readout/playground" comment)
- Modify: `cli/viewer-core/package.json` (remove `@hexagram/consultation-view` dependency)
- Modify: `cli/shell/package.json` (add `@hexagram/consultation-view` if not already present)
- Modify: `cli/shell/src/{banner-state.ts,animated-banner.tsx}` (import from the new local home)
- Modify: `CLAUDE.md` (drop "line glyphs" from viewer-core's role description), `docs/adr/0001-shared-screen-shell.md` (the "no divination meaning" claim is now true — keep it; optionally note the home-banner glyph derivation lives in `cli/shell`)

- [ ] **Step 1: Confirm sole consumer.** Run `grep -rn "banner-lines\|deriveBannerLine\|lineColors" --include=*.ts --include=*.tsx cli apps | grep -v node_modules`. Expected: only `cli/shell` (banner-state, animated-banner) + the two test files + viewer-core's own index export. If anything else consumes it, STOP and report.

- [ ] **Step 2: Move the file + tests** with `git mv` to preserve history:
```bash
git mv cli/viewer-core/src/banner-lines.ts cli/shell/src/banner-lines.ts
git mv cli/viewer-core/tests/banner-lines.test.ts cli/shell/tests/banner-lines.test.ts
git mv cli/viewer-core/tests/banner-glyph-parity.test.ts cli/shell/tests/banner-glyph-parity.test.ts
```

- [ ] **Step 3: Fix imports.** In the moved files, the palette imports (`./output-palette.js`) now need to come from `@hexagram/viewer-core`'s public export; the `LINE_GLYPH` import (`@hexagram/consultation-view/vocabulary`) stays. In `banner-state.ts`/`animated-banner.tsx`, change the import from `@hexagram/viewer-core` to `./banner-lines.js`. Remove the export + stale comment from `cli/viewer-core/src/index.ts`.

- [ ] **Step 4: Move the dependency.** Remove `@hexagram/consultation-view` from `cli/viewer-core/package.json`; ensure it's in `cli/shell/package.json`. Run `pnpm install`.

- [ ] **Step 5: Verify build + boundary + that viewer-core no longer imports consultation-view.**

Run: `grep -rn "@hexagram/consultation-view" cli/viewer-core/src` (expect: empty) && `pnpm install && pnpm build && pnpm test && pnpm boundaries:check`
Expected: empty grep; PASS.

- [ ] **Step 6: Fix docs.** In `CLAUDE.md` remove "line glyphs" from the `cli/viewer-core` role line. ADR-0001's "generic frame, no divination meaning" is now accurate — leave its body; the move restores its truth.

- [ ] **Step 7: Commit.**

```bash
git add -A
git commit -m "refactor(shell): move banner-lines to its only consumer; viewer-core goes generic

banner-lines carries divination meaning (line glyphs, moving-line semantics)
but lived in viewer-core, which ADR-0001/CLAUDE.md call a generic frame with
no divination meaning. Its sole consumer is the shell home banner. Move it to
cli/shell and drop the consultation-view dependency from viewer-core, making
the 'generic' description true again."
```

---

### Task 8 (S2): env-policy owns the `headless` (plain-vs-Ink) decision

**Rationale:** `env-policy.ts` calls itself the single source of truth but `utils-mode.ts` decides plain-vs-Ink on a private `!isTTY` check. The ADR-0010 *behaviour* (NO_COLOR/CI in a TTY → Ink with typed input, NOT plain) is correct and must not change — only make the decision read from `classifyEnv`. Also record the un-ADR'd `MANUAL_MIN_TERMINAL_ROWS` gate.

**Files:**
- Modify: `cli/viewer-core/src/env-policy.ts` (add `headless`; fix the header claim)
- Modify: `cli/casting-ui/src/utils-mode.ts` (read `classifyEnv().headless`)
- Modify: `cli/viewer-core/tests/env-policy.test.ts` (add `headless` truth-table cases)
- Modify: `apps/cli/src/manual.ts` (comment cross-ref to ADR-0010; the constant stays here)
- Modify: `docs/adr/0010-interactive-environment-policy-and-input-modes.md` (Amendment section)

- [ ] **Step 1: Write the failing test** in `env-policy.test.ts`:

```typescript
it('headless is true iff stdout is not a TTY, regardless of NO_COLOR/CI', () => {
  expect(classifyEnv({ isTTY: false, NO_COLOR: undefined, CI: undefined }).headless).toBe(true)
  expect(classifyEnv({ isTTY: true,  NO_COLOR: '1',       CI: undefined }).headless).toBe(false)
  expect(classifyEnv({ isTTY: true,  NO_COLOR: undefined, CI: 'true'     }).headless).toBe(false)
})
```

- [ ] **Step 2: Run it — expect FAIL** (`headless` undefined).

Run: `pnpm --filter @hexagram/viewer-core test -- env-policy`
Expected: FAIL.

- [ ] **Step 3: Add `headless` to `EnvPolicy`** in `env-policy.ts` as `headless: !isTTY`, alongside `interactive` and `forceNumeric`. Update the header comment so the "single source of truth" claim is finally true (it now exposes all three env-derived bits).

- [ ] **Step 4: Read it in `utils-mode.ts:~166`** — replace `shouldUsePlainMode(argv) || !env.isTTY` with `shouldUsePlainMode(argv) || classifyEnv(env).headless`. Do NOT gate plain on NO_COLOR/CI (that would break ADR-0010's tier-1 rule). The existing `utils-mode.test.ts` NO_COLOR/CI→numeric-but-Ink assertions must stay green.

- [ ] **Step 5: Run tests — expect PASS, including the unchanged utils-mode assertions.**

Run: `pnpm --filter @hexagram/viewer-core test && pnpm --filter @hexagram/casting-ui test -- utils-mode`
Expected: PASS.

- [ ] **Step 6: Amend ADR-0010** (decision refinement → dated Amendment per the human ruling). Append:

```markdown
## Amendment — 2026-06-06

- `EnvPolicy` now carries three orthogonal projections of one snapshot:
  `interactive`, `forceNumeric`, and `headless` (= `!isTTY`). The plain-vs-Ink
  decision reads `headless` and is explicitly NOT gated on NO_COLOR/CI — a
  NO_COLOR/CI TTY stays Ink with typed input (tier-1 behaviour above).
- `MANUAL_MIN_TERMINAL_ROWS = 32` (`apps/cli/src/manual.ts`) is a fourth,
  manual-only gate: the manual prompt needs ≥32 rows for its diagram + chrome,
  so the bin refuses shorter terminals. It stays in the bin (it needs
  `process.stdout.rows`) but is recorded here as policy.
- Stale paths: the "Where it's enforced" list says `packages/…`; the tree uses
  `cli/…` and `apps/…`.
```
Also correct the `packages/…` paths in ADR-0010's "Where it's enforced" body (factual erratum → in-place).

- [ ] **Step 7: Commit.**

```bash
git add -A
git commit -m "refactor(viewer-core): env-policy owns the plain-vs-Ink (headless) decision

env-policy.ts claimed to be the single source of truth, but utils-mode.ts
made the plain/Ink call on a private !isTTY check. Add headless to EnvPolicy
and route the decision through it; the ADR-0010 NO_COLOR/CI behaviour is
unchanged. Record MANUAL_MIN_TERMINAL_ROWS as policy in ADR-0010."
```

---

### Task 9 (S5): thread an explicit `consultationsDir`; delete `process.chdir`

**Rationale (human ruling):** Two strategies anchor the consultations dir — a global `process.chdir` (casting/save bins) and an explicit `dir` (history). Delete the global mutation; thread `workspaceConsultationsDir()` from each bin to the single `saveConsultationFile` call (FCIS: side-effect at the shell edge). New ADR records the policy.

**Files:**
- Modify: `apps/cli/src/workspace-root.ts` (delete `anchorCwdToWorkspaceRoot`; keep pure `workspaceConsultationsDir`)
- Modify: `apps/cli/src/{random,manual,interactive,hexagram}.ts` (compute + thread the dir)
- Modify: `cli/casting-ui/src/viewer.tsx` (accept + pass `dir` to `saveConsultationFile`)
- Modify: `cli/casting-ui/src/log-and-save.ts` (accept + pass `dir`)
- Modify: `cli/shell/src/hexagram-app.tsx` (accept the threaded dir for the History mount)
- Modify: `cli/shell/tests/hexagram-app.test.tsx` (pass `dir`; drop its `process.chdir`)
- Modify: `apps/cli/tests/workspace-root.test.ts` (drop the chdir-anchor test)
- Create: `docs/adr/0020-consultations-dir-anchoring.md`
- Modify: `docs/adr/README.md` (index row), `CONTEXT.md` (one-line pointer)

- [ ] **Step 1: Add the dir prop down the save chain.** Give `runConsultationViewer`/`runManualConsultationViewer` and `logAndSaveConsultationOutput` an optional `consultationsDir?: string`; pass it to the single `saveConsultationFile({ …, dir })` call in `viewer.tsx` and `log-and-save.ts`. `defaultConsultationsDir()` remains the domain default when the prop is absent.

- [ ] **Step 2: Compute the dir once per bin.** In `random.ts`/`manual.ts`/`interactive.ts`/`hexagram.ts`, replace `anchorCwdToWorkspaceRoot()` with `const consultationsDir = workspaceConsultationsDir()` and pass it into the viewer/save call.

- [ ] **Step 3: Thread the History dir in the shell.** `hexagram-app.tsx` already mounts `<HistoryApp dir={defaultConsultationsDir()} />`; change to accept the anchored dir from the bin and pass it down.

- [ ] **Step 4: Delete `anchorCwdToWorkspaceRoot`** from `workspace-root.ts` and remove its 4 call sites + the chdir-anchor test.

- [ ] **Step 5: Fix the shell test** to pass an explicit `dir` (a tmpdir) instead of `process.chdir`-ing into one.

- [ ] **Step 6: Verify no `process.chdir` remains in app entry + saves land correctly.**

Run: `grep -rn "process.chdir\|anchorCwdToWorkspaceRoot" apps cli | grep -v node_modules` (expect: empty) && `pnpm build && pnpm test`
Expected: empty grep; PASS.

- [ ] **Step 7: Write ADR-0020** using the repo template (`docs/adr/README.md`):

```markdown
# Consultations directory anchoring

Status: Accepted
Date: 2026-06-06

Saved consultations must land in `<repo-root>/consultations` regardless of the
directory a bin is invoked from. The app computes that path once at the shell
edge (`workspaceConsultationsDir()`, derived from `pnpm-workspace.yaml`) and
threads it as an explicit `consultationsDir`/`dir` to the save and history APIs.
No bin mutates `process.cwd()`.

## Considered options
- **Global `process.chdir(workspaceRoot())` at bin entry.** Rejected: a
  process-wide mutation to avoid threading one value; it changes resolution of
  every relative path for the process lifetime and hid the save dir from the
  call signature.
- **Thread an explicit dir (chosen).** The side effect (path resolution) stays
  at the shell edge; the save path is a pure function of its argument.

## Consequences
- `defaultConsultationsDir()` (cwd-based) stays the domain default; the app's
  answer is always the threaded `workspaceConsultationsDir()`.
- A new save-producing bin must compute and pass the dir.

## Where it's enforced
- `apps/cli/src/workspace-root.ts` — `workspaceConsultationsDir` (pure).
- `apps/cli/src/{random,manual,interactive,hexagram}.ts` — compute + thread.
- `cli/casting-ui/src/{viewer.tsx,log-and-save.ts}` — accept `dir`, pass to save.
- `domain/consultation-file/src/file.ts` — `saveConsultationFile({ dir })`.
```
Add the index row to `docs/adr/README.md` and a one-line pointer in `CONTEXT.md`.

- [ ] **Step 8: Commit.**

```bash
git add -A
git commit -m "refactor(cli): thread explicit consultationsDir; delete process.chdir

The consultations dir was anchored two ways: a global process.chdir (casting
bins) and an explicit dir (history). Delete the global mutation and thread
workspaceConsultationsDir() from each bin to the single saveConsultationFile
call, so the side effect lives at the shell edge. Records ADR-0020."
```

---

### Task 10 (S1): reconcile the pick-clamp prose

**Rationale:** `casting-derivation.ts` asserts both "single source of truth" (:22) and "no single owner" (:26) in one comment block; ADR-0006 says "one home." The multi-owner *design* is correct; only the prose lies. Align the comment with ADR-0006's framing: one definitional owner (`selectablePickMax`) + one runtime enforcer (`assertSelectablePick` in `performCast`); producers clamp to the definition or are proven-equivalent by test. Comment-only; no code, no ADR change.

**Files:**
- Modify: `domain/core/src/casting-derivation.ts` (comment block ~lines 12-33 only)

- [ ] **Step 1: Rewrite the comment block** so it states exactly one theory:

```typescript
/**
 * selectablePickMax(recordedMax) = recordedMax − 1 is the DEFINITIONAL home of
 * the never-zero-remainder rule (a pick of `max` would leave the right heap one
 * suspended stalk, nothing to count by fours, remainder 0). The slider, typed,
 * plain-Inquirer, and RNG flows clamp to this value. assertSelectablePick —
 * called by performCast, the algorithm of record — is the single RUNTIME
 * enforcer. The manual validator derives the same [1, recordedMax−1] range
 * structurally from its four typed fields (it cannot call a pick-clamp because
 * it has no pick); its agreement with the guard is locked by manual-validation
 * .test ("manual 'ok' picks satisfy the core never-zero guard"). One definition,
 * one runtime enforcer; see ADR-0006.
 */
```
Remove both the "single source of truth" phrase attached to the clamp alone and the "no single owner" sentence.

- [ ] **Step 2: Verify (comment only).**

Run: `pnpm type:check && pnpm test`
Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add domain/core/src/casting-derivation.ts
git commit -m "docs(core): state one pick-clamp ownership theory

The comment claimed both 'single source of truth' and 'no single owner'; ADR
-0006 says one home. Align: selectablePickMax is the definitional owner,
assertSelectablePick (in performCast) the single runtime enforcer, the manual
validator a test-locked structural equivalent."
```

---

### Task 11 (S9): rename the cli `manual-validation.ts` → `manual-feedback.ts`

**Rationale:** Two files named `manual-validation.ts` in different layers (domain = invariants, cli = UI feedback routing). Rename the cli one (package-internal, cheap) to name its responsibility; keep the domain file (public `@hexagram/core/manual-validation` export). Fix stale `validateManualInput` doc references.

**Files:**
- Move: `cli/casting-ui/src/manual-validation.ts` → `cli/casting-ui/src/manual-feedback.ts`
- Move: `cli/casting-ui/tests/manual-validation.test.tsx` → `cli/casting-ui/tests/manual-feedback.test.tsx`
- Modify: `cli/casting-ui/src/manual-prompt.tsx` (import specifier)
- Modify: `AGENTS.md:~246`, `docs/adr/0011-manual-casting-flow-design.md:~90` (`validateManualInput` → `validateManualSplit`)

- [ ] **Step 1: `git mv` the file + test.**
```bash
git mv cli/casting-ui/src/manual-validation.ts cli/casting-ui/src/manual-feedback.ts
git mv cli/casting-ui/tests/manual-validation.test.tsx cli/casting-ui/tests/manual-feedback.test.tsx
```

- [ ] **Step 2: Fix the import** in `manual-prompt.tsx` (`./manual-validation.js` → `./manual-feedback.js`) and the test's relative import.

- [ ] **Step 3: Fix stale doc symbol names** — `AGENTS.md` and ADR-0011 reference `validateManualInput`; the symbol is `validateManualSplit` (factual erratum → in-place).

- [ ] **Step 4: Verify.**

Run: `grep -rn "validateManualInput" docs AGENTS.md CLAUDE.md` (expect: empty) && `pnpm build && pnpm test`
Expected: empty grep; PASS.

- [ ] **Step 5: Commit.**

```bash
git add -A
git commit -m "refactor(casting-ui): rename manual-validation -> manual-feedback

Two files were named manual-validation.ts (domain = invariants, cli = UI
feedback routing). The cli one routes/parses an already-computed result; name
it by that responsibility. Keep the domain file (public export). Fix stale
validateManualInput doc refs to validateManualSplit."
```

---

### Task 12 (S12+S13+S14+S15): consultation-file reconciliation

**Rationale:** Four file-format seams share `legacy-converter.ts` + ADR-0008 and must land together. (S12) `castingRecovered` is a phantom — never a field, only prose. (S13) `casting: null` legitimately means "no casting record" from three indistinguishable origins. (S14) the converter hardcodes `schemaVersion: 1` instead of `CURRENT_SCHEMA_VERSION`. (S15) ADR-0008/CLAUDE/AGENTS misdescribe the persisted `hexagram` as a flat array — it is a keyed `L6..L1` mapping like `casting`.

**Files:**
- Modify: `domain/consultation-file/src/legacy-converter.ts` (schemaVersion ref; scrub `castingRecovered` comments)
- Modify: `docs/adr/0008-consultation-file-format.md` (errata: hexagram shape, Shape-B `casting:null`, stale paths)
- Modify: `docs/adr/0006-casting-algorithm-rewindable-core-and-randomness.md` (drop the `castingRecovered: false` parenthetical)
- Modify: `CLAUDE.md`, `AGENTS.md` (file-format + legacy-conversion + playground text)

- [ ] **Step 1 (S14): Write the failing test** in `domain/consultation-file/tests/` (converter test file):

```typescript
import { CURRENT_SCHEMA_VERSION } from '../src/frontmatter.js'
it('converted legacy files carry CURRENT_SCHEMA_VERSION, not a frozen literal', () => {
  const env = convertLegacyTxt(/* a Shape-A legacy fixture string */)
  expect(env.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
})
```

- [ ] **Step 2: Run it — currently PASSES** (because `CURRENT_SCHEMA_VERSION === 1` today). This is a regression guard, not red-green. Note in the commit that it pins the converter to the constant so a future v2 bump can't silently mint v1 files.

- [ ] **Step 3 (S14): Reference the constant.** In `legacy-converter.ts:~44`, `schemaVersion: 1` → `schemaVersion: CURRENT_SCHEMA_VERSION`; add it to the existing `./frontmatter.js` import at line ~11.

- [ ] **Step 4 (S12/S13): Scrub the phantom.** In `legacy-converter.ts` comments (~:37-39, ~:189-190), replace any `castingRecovered: false` / "synthesises sentinel casting" wording with: a failed or absent legacy CASTING table → `casting: null` (key omitted; no sentinel field exists). Do NOT add a discriminator field — `casting: null` means "no casting record," provenance intentionally not retained.

- [ ] **Step 5 (S15+S13+S12): ADR-0008 errata (in-place).** Correct: (a) `hexagram` is a keyed `L6..L1` mapping (top-first), NOT a flat array — collapse the false "two asymmetries" framing to one (bottom-first in memory / top-first on disk, applied uniformly to both `hexagram` and `casting`); (b) Shape B sets `casting: null` (it does not "synthesise sentinel casting" nor "mark `castingRecovered: false`"); (c) `packages/consultation-file/…` → `domain/consultation-file/…`.

- [ ] **Step 6 (S12): ADR-0006 erratum (in-place).** At ~:77, drop the `(castingRecovered: false)` parenthetical; a failed replay converts to `casting: null`, full stop.

- [ ] **Step 7: CLAUDE.md + AGENTS.md.** Correct the file-format bullet (`hexagram` = keyed mapping), the legacy-conversion text (no sentinel; `casting: null`), and note playground saves land in `consultations/` as null-casting, history-browsable rows.

- [ ] **Step 8: Verify (fixtures byte-identical — no behaviour change).**

Run: `grep -rn "castingRecovered" . | grep -v node_modules | grep -v docs/superpowers/plans` (expect: empty) && `pnpm build && pnpm test && pnpm generate-fixtures && git diff --exit-code -- '*fixtures*'`
Expected: empty grep; PASS; no fixture diff.

- [ ] **Step 9: Commit.**

```bash
git add -A
git commit -m "fix(consultation-file): one schemaVersion owner; scrub phantom castingRecovered; correct ADR-0008 format

- legacy-converter writes CURRENT_SCHEMA_VERSION, not a frozen 1 (a future bump
  would otherwise mint dead v1 files).
- castingRecovered was never a field, only prose; casting: null means 'no
  casting record' from three intentionally-indistinguishable origins.
- ADR-0008/0006/CLAUDE/AGENTS errata: hexagram persists as a keyed L6..L1
  mapping (not a flat array); Shape B sets casting: null; stale packages/ paths."
```

---

### Task 13 (S16): narrate the `no-raw-string-width` boundary rule

**Rationale:** `dependency-cruiser.config.cjs` ships two forbidden rules but its header narrates only `no-domain-to-cli`. The second rule (`no-raw-string-width`, funnel rendered width through `viewer-core`'s ANSI-aware `terminalWidth` / `text-layout`'s `visualWidth`) has no ADR home. The rule is correct; this is a documentation fix.

**Files:**
- Modify: `dependency-cruiser.config.cjs` (header comment narrating the second rule)
- Modify: `docs/adr/0019-domain-cli-boundary.md` ("Where it's enforced": add `no-raw-string-width`)
- Modify: `docs/adr/0005-lint-and-format-toolchain.md` ("Where it's enforced": add the cruiser config)

- [ ] **Step 1: Narrate the rule** in the config header — what `no-raw-string-width` forbids (importing `string-width` outside `cli/viewer-core`), the viewer-core wrapper exemption, and that `terminalWidth` (ANSI-aware, chrome) is distinct-by-design from `visualWidth` (raw diagram text, `domain/text-layout`).

- [ ] **Step 2: ADR-0019 "Where it's enforced"** — add a bullet for `no-raw-string-width` (it already owns the cruiser config and names `text-layout`'s `visualWidth`).

- [ ] **Step 3: ADR-0005 "Where it's enforced"** — add the `dependency-cruiser.config.cjs` line (currently omitted).

- [ ] **Step 4: Verify (docs/config comment only).**

Run: `pnpm boundaries:check && pnpm lint:check`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add -A
git commit -m "docs: narrate the no-raw-string-width boundary rule

dependency-cruiser ships two forbidden rules but the header documented only
no-domain-to-cli. Narrate no-raw-string-width (funnel rendered width through
viewer-core's terminalWidth / text-layout's visualWidth) in the config and add
it to ADR-0019/0005 'Where it's enforced'."
```

---

### Task 14 (S17): normalise relative-import extensions + lint rule

**Rationale:** ~125 of ~334 relative imports omit `.js`, mixed even within single files. Under `moduleResolution: bundler` (ADR-0004) both forms resolve, so this is style drift, not a bug. Normalise to explicit `.js` (the existing plurality, more portable) and add a lint rule so it can't drift again. **LAST** because it rewrites import lines repo-wide — it must run after every structural move.

**Files:**
- Modify: repo-wide (~50-60 `.ts`/`.tsx` files; import lines only)
- Modify: `.oxlintrc.json` and/or `eslint.config.js` (add `import/extensions`)
- Modify: `docs/adr/0004-typescript-compiler-posture.md`, `docs/adr/0005-lint-and-format-toolchain.md` (one sentence each)

- [ ] **Step 1: Inventory.** `grep -rEn "from '\\./[^']*[^.][^j][^s]'" --include=*.ts --include=*.tsx domain cli apps | grep -v node_modules | wc -l` to size the extensionless set (cross-check against the ~125 estimate).

- [ ] **Step 2: Codemod to explicit `.js`.** Add `.js` to every relative specifier missing an extension (skip `.json`/`.css`). Do this mechanically per package; after each package run `pnpm --filter <pkg> type:check`.

- [ ] **Step 3: Add the lint rule.** In `.oxlintrc.json` (preferred; eslint fallback if oxlint lacks it) enable `import/extensions` as `["error", "ignorePackages", { "ts": "always", "tsx": "always" }]`. Run `pnpm lint:check` — expect zero violations after Step 2.

- [ ] **Step 4: Document the convention.** One sentence in ADR-0004 (explicit `.js` on relative imports, enabled by `bundler` resolution) and ADR-0005 (the new `import/extensions` rule).

- [ ] **Step 5: Full verification.**

Run: `pnpm build && pnpm type:check && pnpm test && pnpm boundaries:check && pnpm lint:check && pnpm format:check`
Expected: PASS across the board.

- [ ] **Step 6: Commit.**

```bash
git add -A
git commit -m "style: normalise relative imports to explicit .js + lint rule

~125 relative imports omitted .js, mixed within single files. Under bundler
moduleResolution both resolve (no bug), but the drift is illegible. Normalise
to explicit .js and pin it with import/extensions so it can't drift again.
Recorded in ADR-0004/0005."
```

---

## Self-review

- **Spec coverage:** S1→T10, S2→T8, S3→T2, S4→T6, S5→T9, S6→T4, S7→T5, S8→T1, S9→T11, S10→T3, S11→T7, S12/13/14/15→T12, S16→T13, S17→T14. All 17 seams have a task.
- **Sequencing:** S8 first (foundation), S3→S10, S6→S7, S2→S5 (shared manual.ts), geometry/glyph after S8, S17 last. Collision matrix at top enforces this.
- **No-placeholder check:** every code-touching step carries the actual code or the exact command + expected output. Mechanical fan-outs (S8 importer rewrites, S17 codemod) give the routing command instead of reproducing N identical edits — intentional, since the edits are uniform and the symbol→file table is derived in-step.
- **Type consistency:** `media`/`SectionMedium` (T4) is the only new type; `headless` (T8) and `consultationsDir` (T9) are the only new fields; all referenced by their defining task before use.
- **ADR policy:** factual errata edited in-place (T8 paths, T11 symbol names, T12 format/phantom, T13/T16); decision refinements as dated Amendment (T8 ADR-0010); one new ADR (T9 ADR-0020). Matches the human ruling.
