# S5 — Playground geometry constants: resolve the self-contradicting DRY story

**Branch:** `claude/round5-seams-s5-s6-s8` (already checked out, based on merged
`origin/main`). Stay on it. Do NOT open a PR. Planning is done; this doc is for a
FRESH execution agent.

**Type of change:** Pure refactor (conceptual-integrity / legibility seam, NOT a
correctness bug). The playground render bytes MUST NOT change.

---

## ⚠️ HUMAN-DECISION FORK — confirm BEFORE executing

The whole plan turns on one question that is a human's to settle, not the agent's:

> **Is the playground's `BAR_BLOCK_WIDTH = 25` the SAME piece of knowledge as the
> consultation-view's `TRIGRAM_DIVIDER_WIDTH = 25`, or two independent decisions
> that happen to share a number?**

The repo's engineering rule §5 (DRY-of-knowledge) says: do not duplicate a
*decision*, but do NOT abstract two things that *merely look alike*. So this is
the crux. The evidence (see Phase-1 study below) points strongly to **SAME
decision**:

- The consultation-view bar block is built by `transformationHalfRow`
  (`domain/consultation-view/src/diagram-template.ts:24-35`) as
  `value(1) + "  " + glyph(9) + "  " + position(11)` = **25** cols.
- The playground's `BAR_BLOCK_WIDTH` comment
  (`cli/playground-ui/src/playground-display-geometry.ts:14-20`) documents the
  *identical* breakdown: `value(1) + 2sp + bar(9) + 2sp + pos(11) = 25 cols`.
- The playground's own line rows ALREADY call `transformationHalfRow`
  (`cli/playground-ui/src/playground-display-rows.ts:88-99`) — i.e. the playground
  already shares the half-row *grammar*; only the *width number* is re-pegged
  locally.
- `TRIGRAM_DIVIDER_WIDTH`'s own doc-comment
  (`domain/consultation-view/src/vocabulary.ts:65`) reads: *"Width of the per-side
  bar block, reused as the trigram divider width."* That is exactly the role
  `BAR_BLOCK_WIDTH` plays in the playground (bar-block cell width + identity
  divider). Both packages call the same 25 "the per-side bar block".

**This plan's RECOMMENDED approach assumes the human confirms SAME decision** and
imports `TRIGRAM_DIVIDER_WIDTH` as the single authority (Approach A below). If the
human instead rules they are TWO decisions, switch to Approach B (keep
independent, but make the comment + guard tell ONE honest story) — Approach B
tasks are sketched at the bottom. **Do not proceed past Task 1 without that
confirmation.**

A prior round (`docs/superpowers/plans/2026-06-06-round4-seam-remediation.md`,
Step 3) explicitly chose to leave `BAR_BLOCK_WIDTH` local and call the equality a
"coincidence". S5 is the re-examination of that call: that same plan's Step 2
*also* added the runtime `throw` for the `46` alignment, and the two decisions
together produced the self-contradiction this plan resolves. If the human reaffirms
round4's "coincidence" verdict, that is the Approach-B path and is legitimate — but
the contradiction (coincidence here, must-match there) must still be removed.

---

## Phase-1 study — the seam, fully grounded (file:line)

### What the seam IS

Two competent readers infer opposite intent from the same `25`:

1. **`cli/playground-ui/src/playground-display-geometry.ts:13-20`** —
   `BAR_BLOCK_WIDTH = 25`, with a comment asserting its equality with
   `TRIGRAM_DIVIDER_WIDTH` (25) is *"only by coincidence — distinct knowledge …
   so it is deliberately NOT imported."*

2. **`cli/playground-ui/src/playground-display-geometry.ts:84-88`** —
   `IDENTITY_DIVIDER_WIDTH = BAR_BLOCK_WIDTH`, justified as *"matches the bar block
   above so the divider lines up with the hexagram structure."*

   So the **same 25** is "coincidence, keep separate" at L16-18 and "must match, so
   share" at L86-88. That is the self-contradiction.

3. **Runtime load-time `throw`** —
   `cli/playground-ui/src/playground-display-geometry.ts:31-37` couples
   `LEFT_LINE_WIDTH + GAP_WIDTH` to the IR's `RIGHT_COLUMN` (=46) with a module-load
   `throw`, i.e. a cross-package alignment defended by a runtime assertion instead of
   by construction. `RIGHT_COLUMN` is imported from
   `@hexagram/consultation-view/vocabulary` (L5-8).

### Every appearance of the constants in scope

`25` / `BAR_BLOCK_WIDTH` / `TRIGRAM_DIVIDER_WIDTH`:

- `domain/consultation-view/src/vocabulary.ts:65-66` — `TRIGRAM_DIVIDER_WIDTH = 25`,
  doc *"Width of the per-side bar block, reused as the trigram divider width."*
- `domain/consultation-view/tests/vocabulary.test.ts:76` — `expect(TRIGRAM_DIVIDER_WIDTH).toBe(25)`.
- `cli/readout/src/serialize-ansi.ts:28,142-143` — imports `TRIGRAM_DIVIDER_WIDTH`,
  builds the consultation's trigram divider from it (the cross-surface SHARE that
  the playground declines).
- `cli/playground-ui/src/playground-display-geometry.ts:20` — `BAR_BLOCK_WIDTH = 25`.
- `cli/playground-ui/src/playground-display-geometry.ts:23,26` —
  `LEFT_LINE_WIDTH = CHEVRON_WIDTH + BAR_BLOCK_WIDTH`, `RIGHT_LINE_WIDTH = BAR_BLOCK_WIDTH`.
- `cli/playground-ui/src/playground-display-geometry.ts:88` —
  `IDENTITY_DIVIDER_WIDTH = BAR_BLOCK_WIDTH`.
- `cli/playground-ui/src/playground-display-rows.ts:17,43,47` — `BAR_BLOCK_WIDTH`
  pads the header's "Standing/Emerging Hexagram" bar cells.
- `cli/playground-ui/src/playground-display-rows.ts:20,164` —
  `IDENTITY_DIVIDER_WIDTH` sizes the identity divider dashes.
- `cli/playground-ui/tests/playground-display.test.ts:12,52-53,64-65` —
  pins `LEFT_LINE_WIDTH === CHEVRON_WIDTH + BAR_BLOCK_WIDTH` and the width floor.
- `cli/playground-ui/scripts/measure-identity-stack-width.ts:150,152,154,157` —
  a standalone measurement script re-declares its OWN local `BAR_BLOCK_WIDTH = 25`
  and `GAP_WIDTH = 19` (NOT imported; out of scope — see below).

`46` / `RIGHT_COLUMN`:

- `domain/consultation-view/src/vocabulary.ts:60` — `RIGHT_COLUMN = 46`.
- `domain/consultation-view/tests/vocabulary.test.ts:72` — `expect(RIGHT_COLUMN).toBe(46)`.
- `cli/readout/src/serialize-ansi.ts:27,119,136,140,143,148` — consultation ANSI uses it.
- `domain/consultation-file/src/serialize-markdown.ts:32,76,89,91` — markdown uses it.
- `cli/playground-ui/src/playground-display-geometry.ts:7,33,35` — imported + the `throw`.
- `cli/playground-ui/src/playground-display-geometry.ts:65` — comment "col … = 46".
- `cli/playground-ui/tests/playground-display.test.ts:201,253,268-273,309` and
  `cli/playground-ui/tests/top-half-width-invariant.test.ts:108-114` — tests assert
  the right column lands at `LEFT_LINE_WIDTH + GAP_WIDTH` (= 46).

`LEFT_LINE_WIDTH` / `GAP_WIDTH`:

- `cli/playground-ui/src/playground-display-geometry.ts:22-29` — `LEFT_LINE_WIDTH`,
  `GAP_WIDTH = MOVING_ARROW.length` (already derived from the shared glyph — the
  round4 fix).
- consumed across `playground-display-rows.ts`, `playground-app.tsx`,
  `playground-display.ts`, the tests.

### What the `throw` actually guards — and whether construction removes it

The `throw` (L31-37) guards: *the playground's left column ends exactly where the
consultation's right column begins (col 46), so the two surfaces sit flush.* It
fires at MODULE LOAD if `LEFT_LINE_WIDTH + GAP_WIDTH !== RIGHT_COLUMN`.

`LEFT_LINE_WIDTH + GAP_WIDTH = (CHEVRON_WIDTH + BAR_BLOCK_WIDTH) + MOVING_ARROW.length
= (2 + 25) + 19 = 46`. `GAP_WIDTH` is ALREADY derived from the shared `MOVING_ARROW`
(no longer a local `19`). The ONLY remaining locally-pegged input is `BAR_BLOCK_WIDTH
= 25`. If `BAR_BLOCK_WIDTH` is also sourced from the shared authority
(`TRIGRAM_DIVIDER_WIDTH`), then `LEFT_LINE_WIDTH + GAP_WIDTH` is `CHEVRON_WIDTH(2) +
TRIGRAM_DIVIDER_WIDTH(25) + MOVING_ARROW.length(19) = 46 = RIGHT_COLUMN` — and the
equality holds **by construction from shared constants**, with `CHEVRON_WIDTH = 2`
the only playground-local input. The `throw` then guards an arithmetic identity over
imported constants and can be deleted (a `vocabulary.test.ts`-pinned constant plus
the playground's existing `playground-display.test.ts` width assertions already
catch any real drift; see verification).

> **Note (informational):** `2 + 25 + 19 = 46` is itself a numeric coincidence of
> the three independent terminal-geometry facts (chevron, bar block, connector). The
> `throw`/identity does NOT claim these three were *designed* to sum to 46; it claims
> that *given* today's three values they DO, and that the playground's surface must
> stay flush with the consultation's `RIGHT_COLUMN`. Approach A keeps that as a
> by-construction expression; it does not assert a deeper invariant than exists.

### Is the playground display a serializer of the IR? (ADR-0018)

Yes. `docs/adr/0018-consultation-view-ir.md:14-17,58-62` states the playground
top-half display is a **serializer of an identity/diagram SUBSET of the IR**, and
`docs/adr/0018:100-101` names `cli/playground-ui/src/playground-display-*.ts` as
"the playground display as a serializer of the IR identity/diagram subset". ADR-0019
(`docs/adr/0019-domain-cli-boundary.md:31-38`) explicitly calls out "geometry
constants leaking into `playground-ui`" as the exact sin the IR was meant to close.
The playground line rows already import and call `transformationHalfRow` from
`@hexagram/consultation-view/diagram-template`
(`cli/playground-ui/src/playground-display-rows.ts:1,88-99`), so it ALREADY shares
the bar-block *grammar* — re-pegging only the *width* is the residue. As a serializer
of the IR, the playground SHOULD source the IR's geometry vocabulary rather than
re-peg it. (The `cli/* → domain/consultation-view` import direction is allowed; only
`domain/* → cli/*` is forbidden. `vocabulary` is already an exported subpath the
playground imports today — no new export, no boundary inversion.)

### Honest verdict

This is a **legibility / DRY-of-knowledge seam, NOT a correctness bug.** The rendered
bytes are correct today; the `throw` and tests keep them correct. The defect is that
the code "speaks with a forked tongue" about whether `25`-here and `25`-there are the
same decision, and defends a cross-package alignment by runtime assertion rather than
by construction. The fix changes legibility, not behaviour — hence the
zero-fixture-diff gate.

### Coverage / confidence

Read in full: `cli/playground-ui/src/playground-display-geometry.ts`,
`cli/playground-ui/src/playground-display-rows.ts`,
`domain/consultation-view/src/vocabulary.ts`,
`domain/consultation-view/src/diagram-template.ts`,
`domain/consultation-view/tests/vocabulary.test.ts`,
`cli/playground-ui/tests/playground-display.test.ts` (geometry block),
ADR-0018, ADR-0019, the round4 plan. Grepped every occurrence of the seven constants
tree-wide. Did NOT exhaustively read `playground-app.tsx` / `hexagram-display.tsx`
internals beyond their `TOP_HALF_WIDTH` use (they consume the width, they do not
define the `25`/`46`). Confidence the seam is legibility-only and the fix is
byte-neutral: high, contingent on the zero-fixture-diff gate passing.

---

## Phase-2 — approaches considered, recommendation

### Approach A — hoist: import the real constant, hold the alignment by construction (RECOMMENDED)

Source `BAR_BLOCK_WIDTH` from the IR's `TRIGRAM_DIVIDER_WIDTH` (the single authority
for "per-side bar block width"). Then `LEFT_LINE_WIDTH + GAP_WIDTH === RIGHT_COLUMN`
holds by construction over imported constants, and the module-load `throw` is
deleted. The contradiction vanishes: there is one `25`, owned by the IR, and the
playground is a faithful serializer.

- **Pros:** single authoritative representation of the bar-block decision (rule §5
  satisfied); alignment by construction, no runtime assertion; matches ADR-0018/0019
  (playground = IR serializer); the half-row grammar is *already* shared, so this
  finishes the job.
- **Cons:** asserts the human-fork answer is "SAME decision" — must be confirmed.
  Couples playground width to a domain constant (intended per ADR; the direction is
  allowed).

### Approach B — keep independent, tell ONE honest story (fallback if human rules "two decisions")

Leave `BAR_BLOCK_WIDTH = 25` local but rewrite the comment so it does NOT call the
equality a "coincidence" while the divider line calls it "must match". Pick ONE
framing: e.g. "the playground deliberately owns its own bar-block width; the identity
divider re-uses THAT local width (not the IR's) so it lines up with the playground's
own bar block." Keep a SINGLE guard (the existing `throw`, or convert it to a test)
and ensure no second contradictory justification remains.

- **Pros:** preserves the round4 "distinct knowledge" stance if the human reaffirms
  it; smaller blast radius.
- **Cons:** still duplicates a number that has identical structure and an identical
  name ("per-side bar block") in both homes — the seam is narrated away, not closed;
  the runtime `throw` stays as a cross-package coupling defended by assertion.

### Approach C — leave as-is (do nothing)

Evaluated and rejected. The `throw` is "good enough" for *correctness* (it would fire
on real drift), but it does nothing for the *legibility* defect — the self-contradicting
comment remains, and a future maintainer still cannot tell whether the `25`s are one
decision or two. The task is to resolve the seam, and C does not.

### Recommendation

**Approach A**, contingent on the human confirming SAME decision. It is the only
option that removes the contradiction at the root (one home for the number) AND
replaces the runtime assertion with by-construction correctness — exactly what
"defended by construction, not by a runtime throw" asks for, and exactly what
ADR-0018/0019 prescribe for an IR serializer.

---

## Phase-3 — implementation plan (TDD, commit-by-commit) for Approach A

### Build-coupling note (read first)

Downstream packages type-check against built `.d.mts`, not source. Approach A does
**NOT modify any `domain/*` source** — it only changes the playground's import in
`cli/playground-ui`. `@hexagram/consultation-view`'s `vocabulary` subpath already
exists and is already imported by the playground (`MOVING_ARROW`, `RIGHT_COLUMN`),
so no upstream rebuild is required for the new symbol to resolve at type-check time
(it is already in the published `vocabulary.d.mts`). Still, before running the full
verification suite, ensure the workspace is built once (`pnpm build`) so every
package's `dist` is current; if you touch nothing in `domain/*`, no domain rebuild
is needed beyond that baseline. No `domain → cli` import is introduced (playground is
`cli/*` importing `domain/consultation-view` — the allowed direction).

### Commit 1 — confirm-then-pin: make `BAR_BLOCK_WIDTH` track the IR authority (test-first)

**WHY:** establish, as an executable claim, that the playground's bar-block width IS
the IR's per-side bar-block width — so the "coincidence" framing is provably false and
the alignment becomes a property of shared constants.

1. **Add a test FIRST** in `cli/playground-ui/tests/playground-display.test.ts`
   (geometry-constants block, after the existing `LEFT_LINE_WIDTH` test). Import
   `TRIGRAM_DIVIDER_WIDTH` from `@hexagram/consultation-view/vocabulary` at the top
   of the test file (alongside existing imports), and add:

   ```ts
   it('BAR_BLOCK_WIDTH is the IR per-side bar-block width (one decision, one home)', () => {
     expect(BAR_BLOCK_WIDTH).toBe(TRIGRAM_DIVIDER_WIDTH)
   })
   ```

   Run `pnpm --filter @hexagram/playground-ui test`. It passes immediately (both are
   25) — that is fine; this test's job is to PIN the decision so the next step's
   import is guarded against future drift, not to go red first. (If you prefer a
   red→green beat, temporarily change the source `25` to `24`, watch it fail, revert.)

2. Commit message (ending with the trailer — see Phase-4):

   ```
   test(playground): pin BAR_BLOCK_WIDTH to the IR per-side bar-block width

   S5: the playground's 25-col bar block and consultation-view's
   TRIGRAM_DIVIDER_WIDTH are the SAME decision (value+glyph+pos per-side block),
   not a coincidence. Pin the equality before sourcing it, so the next commit's
   import cannot silently diverge.
   ```

### Commit 2 — source the constant + delete the runtime `throw`

**WHY:** give the bar-block number ONE home (the IR), make the col-46 alignment hold
by construction over imported constants, and remove the self-contradiction + the
module-load assertion.

Edit `cli/playground-ui/src/playground-display-geometry.ts`:

**(a) Import the constant** — extend the existing import (L5-8):

   *Before:*
   ```ts
   import {
     MOVING_ARROW,
     RIGHT_COLUMN,
   } from '@hexagram/consultation-view/vocabulary'
   ```
   *After:*
   ```ts
   import {
     MOVING_ARROW,
     TRIGRAM_DIVIDER_WIDTH,
   } from '@hexagram/consultation-view/vocabulary'
   ```
   (`RIGHT_COLUMN` is removed because the `throw` that used it is deleted in (c).
   Verify no other use of `RIGHT_COLUMN` remains in this file — per the Phase-1
   study, L33/L35 are its only uses.)

**(b) Replace the `BAR_BLOCK_WIDTH` definition + comment** (L13-20):

   *Before:*
   ```ts
   /**
    * Width of the bar+pos block on each side (no chevron):
    *   value(1) + 2sp + bar(9) + 2sp + pos(11) = 25 cols.
    * NB: this equals the consultation vocabulary's TRIGRAM_DIVIDER_WIDTH (25) only
    * by coincidence — distinct knowledge (single-column sum vs divider width), so
    * it is deliberately NOT imported.
    */
   export const BAR_BLOCK_WIDTH = 25
   ```
   *After:*
   ```ts
   /**
    * Width of the bar+pos block on each side (no chevron):
    *   value(1) + 2sp + bar(9) + 2sp + pos(11) = 25 cols.
    * This IS the consultation IR's per-side bar block (`transformationHalfRow`
    * emits the same value/glyph/position skeleton), so it is sourced from the
    * single authority — `TRIGRAM_DIVIDER_WIDTH` — rather than re-pegged here.
    */
   export const BAR_BLOCK_WIDTH: number = TRIGRAM_DIVIDER_WIDTH
   ```
   (The `: number` annotation is required: it is now an expression, and the package
   builds under `--isolatedDeclarations`, so the exported type must be explicit.)

**(c) Delete the runtime `throw` block** (L31-37) entirely:

   *Before:*
   ```ts
   // The playground's left column must end exactly where the consultation's right
   // column begins, so the two surfaces sit flush.
   if (LEFT_LINE_WIDTH + GAP_WIDTH !== RIGHT_COLUMN) {
     throw new Error(
       `playground geometry drift: ${LEFT_LINE_WIDTH + GAP_WIDTH} !== RIGHT_COLUMN ${RIGHT_COLUMN}`,
     )
   }
   ```
   *After:* (removed — replace with a one-line comment recording WHY it is gone)
   ```ts
   // The playground's left column ends exactly where the consultation's right
   // column begins (col 46), flush by construction: LEFT_LINE_WIDTH + GAP_WIDTH =
   // CHEVRON_WIDTH(2) + TRIGRAM_DIVIDER_WIDTH(25) + MOVING_ARROW.length(19) = 46 =
   // RIGHT_COLUMN. The bar block and the connector are now both sourced from the
   // shared IR vocabulary, so there is nothing left to drift at runtime.
   ```

**(d) `IDENTITY_DIVIDER_WIDTH` (L84-88) needs no change** — `= BAR_BLOCK_WIDTH` now
   transitively means "= the IR per-side bar block", and its comment ("matches the
   bar block above so the divider lines up") is now consistent with (b) rather than
   contradicting it. Leave it. (Optionally tighten its comment to read "matches the
   per-side bar block (the shared IR width) so the divider lines up" — non-essential.)

Run `pnpm --filter @hexagram/playground-ui test` and
`pnpm --filter @hexagram/playground-ui type:check`. Both must be green.

Commit message:

   ```
   refactor(playground): source bar-block width from the IR; drop runtime throw

   S5 (Approach A): the playground top-half is a serializer of the
   consultation-view IR (ADR-0018/0019). Its 25-col per-side bar block is the
   SAME decision as TRIGRAM_DIVIDER_WIDTH, so source it from that single
   authority instead of re-pegging 25 with a self-contradicting "coincidence"
   comment. With the bar block and connector both shared, the col-46 flush
   alignment holds by construction (2 + 25 + 19 = 46 = RIGHT_COLUMN); the
   module-load throw that asserted it at runtime is deleted. Pure refactor —
   rendered bytes unchanged (zero-fixture-diff gate).
   ```

### Verification (run from worktree root, after the commits)

1. **Full build (baseline dist):** `pnpm build`
2. **Type-check:** `pnpm type:check` — whole workspace green.
3. **Lint:** `pnpm lint:check` — green (no `domain → cli` import introduced; the new
   import is `cli/* → domain/consultation-view`, allowed).
4. **Test:** `pnpm test` — whole workspace green (note the ~40s slow RNG
   distribution test in `@hexagram/core` runs; that is expected).
5. **Zero-fixture-diff gate (the load-bearing check):**
   ```bash
   pnpm generate-fixtures
   git status --porcelain        # MUST be empty for fixture files
   git diff --stat               # MUST show no changes under any tests/fixtures/
   ```
   Any byte change to a playground or consultation fixture means the refactor altered
   a rendered byte — STOP, the change is not pure. (It should not: 25 === 25, no
   render path observes the constant's *provenance*.)
6. **Format:** `pnpm format:check` — green (run `pnpm format:fix` if the edit needs
   reflowing).

### Out of scope (do NOT touch)

- `cli/playground-ui/scripts/measure-identity-stack-width.ts` — it re-declares its own
  local `BAR_BLOCK_WIDTH = 25` / `GAP_WIDTH = 19`. It is a standalone measurement
  script, not part of the render path; sharing its constants is a separate concern.
  Leave it. (Flag for a future round if desired, but not here.)
- The ledger geometry (`LEDGER_COLUMNS`), the diagram templates
  (`diagram-template.ts`), `RIGHT_COLUMN` / `MOVING_ARROW` / `STATIC_GAP`
  definitions in `vocabulary.ts` — all unrelated; do not modify `domain/*` source.
- `TOP_HALF_WIDTH`, `IDENTITY_STACK_WIDTH`, `RIGHT_IDENTITY_CELL_WIDTH`,
  `LEFT_IDENTITY_CELL_WIDTH`, `TOP_HALF_ROWS` — unrelated geometry; leave as-is.
- Any other S5/S6/S8 seam on this branch — separate plans.

### Risks

- **Primary risk: a changed rendered byte in the playground.** Mitigated by the
  zero-fixture-diff gate (step 5) and the existing `playground-display.test.ts` /
  `top-half-width-invariant.test.ts` width assertions, which still assert the right
  column lands at col 46. If any fixture diffs, the change is wrong — revert and
  reconsider.
- **`--isolatedDeclarations`:** forgetting the `: number` annotation on the now-derived
  `BAR_BLOCK_WIDTH` will fail type-check. Included above.
- **Stale `RIGHT_COLUMN` import:** removing the `throw` orphans the `RIGHT_COLUMN`
  import; leaving it triggers a no-unused-vars lint error. The import edit in (a)
  removes it. Double-check no other line in the file references `RIGHT_COLUMN`.
- **Human-fork reversal:** if the human rules "two decisions", abandon Approach A and
  execute Approach B (below) instead.

### Approach B tasks (only if human rules "two decisions")

1. Do NOT import `TRIGRAM_DIVIDER_WIDTH`. Keep `BAR_BLOCK_WIDTH = 25` local.
2. Rewrite the L13-20 comment to drop "coincidence" and state ONE framing: the
   playground owns its own bar-block width as a deliberate local decision.
3. Rewrite the `IDENTITY_DIVIDER_WIDTH` comment (L84-88) so it references the
   playground's OWN local bar block (not the IR), removing the must-match-vs-coincidence
   contradiction.
4. Keep exactly ONE guard for the col-46 alignment. Prefer converting the module-load
   `throw` into an explicit test in `playground-display.test.ts`
   (`expect(LEFT_LINE_WIDTH + GAP_WIDTH).toBe(46)` plus a comment that 46 must equal
   the IR `RIGHT_COLUMN`, importing `RIGHT_COLUMN` in the test), so the runtime
   assertion leaves the module — but if the human prefers the runtime `throw`, leave it
   and just fix the comments. Either way: NO contradictory second justification remains.
5. Same verification suite + zero-fixture-diff gate.

### Build-coupling reminder (restated)

Approach A touches only `cli/playground-ui`. Approach B touches only
`cli/playground-ui` (+ its test). Neither edits `domain/*` source, so no upstream
`.d.mts` regeneration is needed beyond a baseline `pnpm build`. The
`@hexagram/consultation-view/vocabulary` subpath is already published and already
imported by the playground — `TRIGRAM_DIVIDER_WIDTH` resolves with no export change.

### No `domain → cli` reminder

The playground is `cli/*`. Importing from `@hexagram/consultation-view` (`domain/*`)
is the allowed direction. Never invert it — `domain/*` must never import a `cli/*`
package (enforced by the ESLint `no-restricted-imports` rule, run by
`pnpm lint:check`).
