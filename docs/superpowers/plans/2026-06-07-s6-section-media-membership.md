# S6 — Section→Medium Membership Legibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the consultation section→medium visibility ("which sections does ANSI show vs which does Markdown show") surveyable in ONE place, WITHOUT changing a single rendered byte — a docs/comment consolidation of an already-single-sourced, ADR-blessed design.

**Architecture:** S6 is **working-as-designed**, not a defect. The per-section `media: ('ansi'|'markdown')[]` flag is already single-sourced in `buildConsultationView` and ratified by ADR-0018. The only residual legibility cost is that a reader must scan ten scattered `media:[...]` literals (interleaved with section payloads) and mentally tabulate them to answer "who shows what." This plan adds ONE consolidated visibility-matrix comment block at the head of `buildConsultationView`, points the two serializer walks at it, and adds one clarifying sentence to ADR-0018 about the tab grouping being a third (order-independent) composition view. Zero code-behaviour change, zero fixture change.

**Tech Stack:** TypeScript, Turborepo + pnpm workspaces, vitest, oxlint/eslint, oxfmt. No new dependencies.

---

## ⚠️ HUMAN-DECISION FORK — CONFIRM BEFORE EXECUTING

This plan implements **Approach C (docs/comment consolidation, "do little")**. It rests on a human judgment that MUST be confirmed first:

> **Does the human consider the ANSI/Markdown membership divergence a DEFECT to remove, or an INTENDED design to merely make more legible?**

- **Intended design → make more legible (Approach A or C).** This plan = Approach C. The Phase-1 study concluded S6 is working-as-designed: the divergence is intentional, commented at all three sites, and explicitly blessed by ADR-0018 ("Section→medium visibility is explicit, not implicit … buildConsultationView is the sole owner of visibility"). **Proceed with this plan as written.**
- **Defect to remove → unify ANSI/Markdown membership (Approach B — NOT this plan).** Eliminating the `text:hexagram`/`lines:none` split would change rendered bytes (breaks `md-body-*.md`, `ink-sections-*.json`, `plain-output-*.txt` fixtures) AND directly contradict ADR-0018. That requires a **separate plan + an ADR-0018 amendment** and is out of scope here. STOP and escalate if the human wants Approach B.
- **Approach A (declarative section×medium matrix as CODE) was considered and rejected** for this plan: visibility depends on `kind`+`role`+`variant` *combinations* (e.g. `text/lines/none` is markdown-only but `text/lines/one` is both, and `text/hexagram` is ansi-only), so a map keyed by a synthetic composite key trades ten honest inline literals for one map plus a key-derivation function — premature abstraction (repo guideline #6) for a single real divergence, with real fixture-diff risk. If the human specifically wants the matrix machine-enforced, that is a different plan.

**If the human confirms "intended design, make it legible" (the recommended reading), execute the tasks below.**

---

## Phase-1 facts (grounding — verified file:line at time of writing)

The membership knowledge and its single divergence:

- **`SectionMedium` type + the flag contract:** `domain/consultation-view/src/ir.ts:9-10` (`/** Which render media emit this section. buildConsultationView is the sole owner. */ export type SectionMedium = 'ansi' | 'markdown'`). Every section interface carries `readonly media: readonly SectionMedium[]`.
- **The sole owner — all visibility literals live here:** `domain/consultation-view/src/build-view.ts`:
  - `linesSection` (lines 138-166): no-moving → `media: ['markdown']` (line 146); one-moving → `['ansi','markdown']` (line 154); multi-moving → `['ansi','markdown']` (line 161).
  - `buildConsultationView` (lines 181-254): `query` `['ansi','markdown']` (190); `casting` `['ansi','markdown']` (193); `transformation` `['ansi','markdown']` (201); `hexagram/standing` `['ansi','markdown']` (219); **`text/hexagram` (standing) `['ansi']` (227)** — ANSI-only; `hexagram/emerging` `['ansi','markdown']` (237); **`text/hexagram` (emerging) `['ansi']` (245)** — ANSI-only; then `sections.push(linesSection(hexagram))` (252).
- **The single divergence (S6 proper):** for a **static (no-moving) hexagram**, the hexagram-level scripture is rendered by exactly ONE of two mutually-exclusive sections:
  - ANSI: `text:hexagram` (`media:['ansi']`, build-view.ts:226-231) → `serializeTextAnsi` role==='hexagram' prints a `HEXAGRAM:` block.
  - Markdown: folded into `lines:none` (`media:['markdown']`, build-view.ts:144-150) → `serializeLinesMarkdown` variant==='none' prints the same scripture under `## LINES` / `_No moving lines._`.
  - The WHY is commented at: build-view.ts:142-143, serialize-markdown.ts:8-12, serialize-ansi.ts:233-235.
- **The two media-filtering walks (consumers of the flag):**
  - ANSI console walk: `cli/readout/src/serialize-ansi.ts:299-322` (`serializeConsoleOutput`, `if (!s.media.includes('ansi')) continue` at :302).
  - Markdown body walk: `domain/consultation-file/src/serialize-markdown.ts:183-208` (`serializeConsultationMarkdownBody`, `if (!s.media.includes('markdown')) continue` at :188).
- **The THIRD, order-independent composition view (adjacent to S6, NOT a new divergence):** `cli/readout/src/serialize-ansi.ts:256-291` (`serializeConsultationTabs`) re-groups sections by `kind`/`role` via `find`/`filter` into four named tabs; LINES rides inside the `standing` tab string gated by `lines.media.includes('ansi')` at :276 — the SAME membership knowledge consulted a third way. It re-expresses the existing divergence; it does not introduce a new one.
- **Inert `media` literals (do not touch behaviour):** `cli/readout/src/output-composers.ts:77-78` set `media` on transient mid-flow sections, but those call `serializeQueryAnsi`/`serializeCastingAnsi` DIRECTLY (not through a filtering loop), so the flag is decorative there — comment at :71-74 explains this. **Leave these alone.**
- **ADR sanction:** `docs/adr/0018-consultation-view-ir.md:77-82` ("Section→medium visibility is explicit, not implicit … `buildConsultationView` is the sole owner of visibility.").

---

## File structure

This is a comment/docs-only change. Files touched:

- Modify: `domain/consultation-view/src/build-view.ts` — add ONE consolidated visibility-matrix comment block immediately above `buildConsultationView` (and a one-line pointer above `linesSection`, since the no-moving fold lives there). No code change.
- Modify: `cli/readout/src/serialize-ansi.ts` — one-line cross-reference comment above the `serializeConsoleOutput` filter pointing at the matrix (the existing `serialize-ansi.ts:233-235` comment stays).
- Modify: `domain/consultation-file/src/serialize-markdown.ts` — one-line cross-reference comment above the `serializeConsultationMarkdownBody` filter pointing at the matrix (the existing header comment at :8-12 stays).
- Modify: `docs/adr/0018-consultation-view-ir.md` — append ONE sentence to the "Section→medium visibility is explicit" consequence noting (a) the consolidated matrix comment is the single survey point and (b) `serializeConsultationTabs` is a third, order-independent composition view of the same flag.

No test files change (there is no behaviour to test; the regression gate is the zero-fixture-diff check). No `.ts` logic changes.

---

## Out of scope

- **Any change to rendered bytes** (ANSI, Markdown, Ink JSON, plain-output fixtures). If `pnpm generate-fixtures` produces a diff, you broke the contract — STOP and revert.
- **Approach B** (unifying ANSI/Markdown membership / removing the `text:hexagram`/`lines:none` split). That needs a human decision + ADR-0018 amendment — separate plan.
- **Approach A** (a `SECTION_VISIBILITY` map as executable code). Rejected above; do not introduce a visibility map or key-derivation function.
- The inert `media` literals in `output-composers.ts:77-78`. Leave untouched.
- Refactoring `serializeConsultationTabs`. It is correct; only documented, not changed.

## Risks

- **MAIN RISK: accidentally changing which section renders in a medium → fixture diff.** This plan changes ONLY comments and one ADR sentence. The zero-fixture-diff gate (Task 5) is load-bearing: it is the proof that no rendered byte moved.
- Touching a code line while editing an adjacent comment. Mitigate: each edit replaces a comment-only region; re-read the file region before editing.
- Comment drift from the code it describes. Mitigate: the matrix comment is anchored directly above `buildConsultationView` (the sole owner), so it sits where the literals it tabulates live.

## Dev/dist build-coupling note

This monorepo's library packages resolve to `./src/index.ts` (the `source` exports condition) under `tsx`/`vitest` no-build dev, but to `./dist/*.mjs` for built consumers. Because this change touches only comments + one `.md`, there is **no semantic difference between dev and dist** here — but you must still run the full build so `type:check` and the fixture generators see a consistent tree. Do NOT assume a dev-only check is sufficient; run the full-workspace verification in Task 6.

---

### Task 1: Add the consolidated visibility-matrix comment to `buildConsultationView`

**Files:**
- Modify: `domain/consultation-view/src/build-view.ts` (above the `export function buildConsultationView` at line 181)

- [ ] **Step 1: Re-read the region to confirm line anchors**

Run: read `domain/consultation-view/src/build-view.ts` lines 168-200. Confirm `linesSection` ends at 166, the two public sub-builders occupy 168-179, and `export function buildConsultationView(` begins at 181. If line numbers have drifted, anchor on the text `export function buildConsultationView(` instead.

- [ ] **Step 2: Insert the matrix comment immediately above `buildConsultationView`**

Insert this block directly before `export function buildConsultationView(` (after the `hexagramDiagramRows` sub-builder's closing `}` on line 179):

```ts
// ── Section → medium visibility matrix (the single survey point) ─────────────
// buildConsultationView is the SOLE owner of which sections each medium emits
// (ADR-0018: "Section→medium visibility is explicit, not implicit"). The
// serializers do NOT decide visibility — they filter on each section's `media`
// flag. This table is what those scattered `media:[...]` literals add up to:
//
//   section (kind / role / variant)        ansi   markdown
//   query                                    ✓        ✓
//   casting                                  ✓        ✓
//   transformation                           ✓        ✓
//   hexagram / standing                      ✓        ✓
//   text / hexagram   (standing scripture)   ✓        ✗   ← ANSI-only
//   hexagram / emerging  (moving only)       ✓        ✓
//   text / hexagram   (emerging, moving)     ✓        ✗   ← ANSI-only
//   text / lines / none  (no moving lines)   ✗        ✓   ← Markdown-only
//   text / lines / one   (one moving line)   ✓        ✓
//   text / lines / multi (multi moving)      ✓        ✓
//
// The ONE deliberate divergence: for a STATIC (no-moving) hexagram the
// hexagram-level scripture is rendered ANSI-side by `text:hexagram` and
// Markdown-side by `text:lines:none` (Markdown folds that scripture into the
// trailing `## LINES` block). Same words, different sections, by design — so
// the bytes match each medium's legacy layout. Consumers of this flag:
//   • cli/readout/src/serialize-ansi.ts        serializeConsoleOutput  (ansi)
//   • domain/consultation-file/src/serialize-markdown.ts  body composer (md)
//   • cli/readout/src/serialize-ansi.ts        serializeConsultationTabs
//     — a THIRD, order-independent re-grouping by kind/role that consults the
//     SAME flag (the `lines.media.includes('ansi')` guard), not a new rule.
```

- [ ] **Step 3: Confirm no code line changed**

Run: `git diff domain/consultation-view/src/build-view.ts`
Expected: the diff is PURE addition of comment lines (every `+` line begins with `//` or is the blank separator); zero `-` lines; no change to any `media:[...]` literal or any executable statement.

- [ ] **Step 4: Type-check the package**

Run: `pnpm --filter @hexagram/consultation-view type:check`
Expected: PASS (a comment cannot break types; this confirms you did not corrupt the file).

- [ ] **Step 5: Commit**

```bash
git add domain/consultation-view/src/build-view.ts
git commit -m "docs(consultation-view): tabulate section→medium visibility in one place

S6 study found the per-section media flag already single-sourced in
buildConsultationView and ADR-blessed, but the membership ('which sections
does ANSI show vs Markdown') was only surveyable by scanning ten scattered
media:[...] literals. Add the matrix they add up to as one comment at the
sole-owner site so a reader answers the question at a glance. No code change.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

### Task 2: Add a pointer comment above `linesSection` (where the no-moving fold lives)

**Files:**
- Modify: `domain/consultation-view/src/build-view.ts` (above `function linesSection` at line 138)

- [ ] **Step 1: Re-read lines 138-150**

Confirm the existing inline comment at 142-143 ("No moving lines: markdown-only…"). You will add a ONE-LINE pointer above the function signature, leaving the existing inline comment intact.

- [ ] **Step 2: Insert the pointer above `function linesSection(`**

Insert directly above the `function linesSection(hexagram: Hexagram): TextSection {` line (after `oneMovingLineVariants`' closing `}` on line 136):

```ts
// The no-moving `lines:none` branch is the Markdown half of S6's one
// divergence — see the visibility matrix above buildConsultationView.
```

- [ ] **Step 3: Confirm pure-comment diff**

Run: `git diff domain/consultation-view/src/build-view.ts`
Expected: only added comment lines since the last commit; zero `-` lines; the `media: ['markdown']` literal on what was line 146 is unchanged.

- [ ] **Step 4: Commit**

```bash
git add domain/consultation-view/src/build-view.ts
git commit -m "docs(consultation-view): point linesSection at the visibility matrix

The no-moving lines:none branch is one half of S6's single ANSI/Markdown
divergence; cross-link it to the survey matrix so the fold is discoverable
from where it is written. No code change.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

### Task 3: Cross-reference the matrix from both serializer walks

**Files:**
- Modify: `cli/readout/src/serialize-ansi.ts` (above `serializeConsoleOutput`, ~line 299)
- Modify: `domain/consultation-file/src/serialize-markdown.ts` (above `serializeConsultationMarkdownBody`, ~line 183)

- [ ] **Step 1: Re-read the two filter sites**

Read `cli/readout/src/serialize-ansi.ts` lines 293-303 and `domain/consultation-file/src/serialize-markdown.ts` lines 179-189. Both have an existing explanatory header comment; you ADD one line pointing at the matrix and leave the rest.

- [ ] **Step 2: Add the pointer in `serialize-ansi.ts`**

In `cli/readout/src/serialize-ansi.ts`, the existing block comment above `export function serializeConsoleOutput(view: ConsultationView): string {` ends with "harmonizing it here makes every surface speak one order." Append one line to that comment block (immediately before the function signature):

```ts
// Visibility (which sections reach this ANSI walk) is owned upstream — see the
// section→medium matrix above buildConsultationView in @hexagram/consultation-view.
```

- [ ] **Step 3: Add the pointer in `serialize-markdown.ts`**

In `domain/consultation-file/src/serialize-markdown.ts`, the existing comment above `export function serializeConsultationMarkdownBody(` ends with "(hexagram-level text is ANSI-only and markdown folds it into the trailing LINES block)." Append one line immediately before the function signature:

```ts
// Visibility is owned upstream — see the section→medium matrix above
// buildConsultationView in @hexagram/consultation-view.
```

- [ ] **Step 4: Confirm pure-comment diffs**

Run: `git diff cli/readout/src/serialize-ansi.ts domain/consultation-file/src/serialize-markdown.ts`
Expected: only added `//` comment lines; zero `-` lines; no change to the `.includes(...)` filters or any switch arm.

- [ ] **Step 5: Type-check both packages**

Run: `pnpm --filter @hexagram/readout type:check && pnpm --filter @hexagram/consultation-file type:check`
Expected: PASS for both.

- [ ] **Step 6: Commit**

```bash
git add cli/readout/src/serialize-ansi.ts domain/consultation-file/src/serialize-markdown.ts
git commit -m "docs(readout,consultation-file): link serializer walks to visibility matrix

Each media-filtered walk now points back to the single survey point (the
matrix above buildConsultationView) so a reader landing on a serializer
learns visibility is owned upstream, not decided locally. No code change.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

### Task 4: Add one clarifying sentence to ADR-0018

**Files:**
- Modify: `docs/adr/0018-consultation-view-ir.md` (the "Section→medium visibility is explicit, not implicit." consequence, lines 77-82)

- [ ] **Step 1: Re-read the consequence bullet (lines 77-82)**

It currently ends: "…via the no-moving `lines:none` section, Markdown-only). `buildConsultationView` is the sole owner of visibility."

- [ ] **Step 2: Append the clarifying sentences**

Edit the end of that bullet (after "sole owner of visibility.") to add:

```md
 The per-section `media:[...]` literals are tabulated once as a section→medium
matrix comment directly above `buildConsultationView` — the single survey point
for "which sections each medium shows." `serializeConsultationTabs`
(`cli/readout/src/serialize-ansi.ts`) is a third, order-independent re-grouping
of the same sections by `kind`/`role` into the four viewer tabs; it consults the
same `media` flag (it does not introduce a second visibility rule).
```

- [ ] **Step 3: Confirm the ADR diff is additive prose only**

Run: `git diff docs/adr/0018-consultation-view-ir.md`
Expected: added sentences only inside the existing consequence bullet; no other section altered.

- [ ] **Step 4: Commit**

```bash
git add docs/adr/0018-consultation-view-ir.md
git commit -m "docs(adr-0018): name the visibility matrix + the third tab composition view

Record that the section→medium membership is surveyable in one matrix comment
and that serializeConsultationTabs is an order-independent re-grouping of the
SAME media flag, not a competing visibility rule — closing the S6 legibility
gap without changing the blessed design.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

### Task 5: Zero-fixture-diff gate (LOAD-BEARING)

**Files:** none modified — this task PROVES no rendered byte moved.

- [ ] **Step 1: Regenerate every byte-locked fixture**

Run: `pnpm generate-fixtures`
(This runs `turbo run generate-fixtures` for `@hexagram/casting-ui` + `@hexagram/consultation-file`, regenerating the plain-output, Ink-sections, and md-body/md-file fixtures.)

- [ ] **Step 2: Assert ZERO diff**

Run: `git status --porcelain && git diff --stat`
Expected: **completely empty output.** No fixture changed. If ANY fixture file appears as modified, you have changed a rendered byte — STOP, run `git diff` to see what moved, revert the offending edit, and re-investigate. A non-empty diff here means the change is NOT the zero-byte refactor this plan promises.

- [ ] **Step 3: (No commit — nothing should have changed.)**

If Step 2 was clean, there is nothing to commit. Proceed to Task 6.

---

### Task 6: Full-workspace verification

**Files:** none modified.

- [ ] **Step 1: Format check**

Run: `pnpm format:check`
Expected: PASS (oxfmt). If it fails, run `pnpm format:fix`, re-run the Task-5 gate to confirm fixtures are still clean, then `git add -A && git commit -m "style: oxfmt the S6 comment additions"` (with the trailer).

- [ ] **Step 2: Lint check**

Run: `pnpm lint:check`
Expected: PASS (oxlint + eslint, including the `domain/**` no-cli-import boundary — comments cannot violate it, but this confirms the tree is clean).

- [ ] **Step 3: Type check (whole workspace)**

Run: `pnpm type:check`
Expected: PASS.

- [ ] **Step 4: Build (whole workspace)**

Run: `pnpm build`
Expected: PASS (topological tsdown build; confirms the dev/dist tree is consistent).

- [ ] **Step 5: Test (whole workspace)**

Run: `pnpm test`
Expected: PASS. Note: the `rng distribution (slow)` block runs ~40s under a 90s timeout — this is expected, let it finish.

- [ ] **Step 6: Final clean-tree confirmation**

Run: `git status --porcelain`
Expected: empty. All commits are made; no stray changes.

---

## Self-review (completed by plan author)

- **Spec coverage:** The recommendation (Approach C, docs/comment consolidation) maps to Tasks 1-4 (matrix comment + two cross-refs + ADR sentence); the zero-byte guarantee maps to Task 5; full-workspace verification to Task 6. The human-decision fork is at the top. ✓
- **Placeholder scan:** No TBD/TODO; every comment block and command is literal. ✓
- **Type consistency:** No new types/functions introduced (comments + prose only), so no signature drift possible. ✓
- **Scope:** Single focused change; no decomposition needed. ✓
