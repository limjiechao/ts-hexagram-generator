# SplitRecord `max` Legibility / DRY Refactor (finding S2)

> **For agentic workers:** This is a SELF-CONTAINED handoff. You need no other
> context than this file plus the repository. Every fact you need is embedded
> below with a verified `file:line` citation (re-confirm each before editing —
> line numbers drift). Implement task-by-task; each task is one
> independently-reviewable, single-intent commit per `AGENTS.md` § "Small,
> single-intent diffs". Do **not** batch tasks into one commit.
>
> **This is NOT a correctness fix.** There is a correct runtime backstop already
> (`assertSelectablePick` in `performCast`). Do not "fix the bug" — there is no
> bug. The whole point is legibility + DRY. If you find yourself changing
> behaviour, a rendered byte, or a saved byte, you have over-reached — STOP.

---

## Context — why this work exists (finding S2)

A conceptual-integrity review of the casting layer flagged finding **S2**: the
field `SplitRecord.max` is a **lying name**, and the single quantity it relates
to is open-coded under at least three different names with ad-hoc `±1`
conversions scattered across the tree. This trips both humans and agents — three
independent reviewers misread one `max - 1` as a hand-rolled invariant violation
(it is not; it is slider-bounce geometry). The cost is paid every time someone
reads the casting code; the fix is pure renaming + helper extraction.

### The lie, precisely

`SplitRecord = { pick: number; max: number }` is defined at
**`domain/core/src/types.ts:55`**. The field `max` is the **recorded ceiling**:
`unparted − 1`, where the `− 1` reserves the one suspended stalk (掛一). The
*actually-legal* pick range is **`[1, max − 1]`** — so **the value of the field
named `max` is itself never a legal pick.** The name says "the maximum pick";
the truth is "one above the maximum pick". That is the lie.

### Why it is not a bug

The legal range is enforced at runtime in exactly one place —
`assertSelectablePick(recordedMax, pick)`, called by `performCast`
(**`domain/core/src/index.ts:227`**, guard defined at
**`domain/core/src/casting-derivation.ts:33`**). Every input flow (slider,
typed, plain-Inquirer, RNG) already clamps to `selectablePickMax(recordedMax) =
recordedMax − 1` *before* committing. So an illegal pick cannot reach a saved
file. The hazard is legibility, not correctness.

### The "one quantity, many names" problem

There are three distinct concepts derived from the same number, and only one of
them has a named home today:

| Concept | Value | Named today? |
| --- | --- | --- |
| **Recorded ceiling** (`SplitRecord.max`) | `unparted − 1` | named `max` / `currentMax` / `recordedMax` (inconsistent) |
| **Selectable ceiling** (highest legal pick) | `max − 1` | ✅ `selectablePickMax(recordedMax)` — `domain/core/src/casting-derivation.ts:24` |
| **True stalk count** | `max + 1` | open-coded as `max + 1`, named `stalksTotal` / `unpartedStalks` / `totalStalks` (inconsistent) |

The selectable ceiling already has a definitional home and several call-sites
route through it. The *true stalk count* (`+ 1`) has **no** named home — it is
open-coded everywhere. That is the gap Tier-1a closes.

---

## Grounded facts (re-verify each `file:line` before editing)

1. **The lying field.** `SplitRecord = { pick: number; max: number }` —
   `domain/core/src/types.ts:55`. The doc comment above it
   (`types.ts:51-54`) already explains `max` is the recorded selectable ceiling.

2. **`max` is persisted on disk.** Every saved consultation `.md` writes `max:`
   in its YAML frontmatter — e.g.
   `domain/consultation-file/tests/fixtures/md-file-empty-query.md:15`
   (`max: 48`), `:17` (`max: 43`), `:19` (`max: 39`). The converter boundary is
   `castingToYaml` (`domain/consultation-file/src/frontmatter.ts:38`) and
   `castingFromYaml` (`:44`). **Important:** these converters map whole
   `LineCasting` tuples by position — they pass each `SplitRecord` through as an
   opaque YAML object, so the on-disk key `max` is *identical to the in-memory
   field name* today. Renaming the on-disk field is therefore an ADR-0008
   file-format change, **not** a local rename. (This is why the field rename is
   Tier 2, gated.)

3. **The named home already exists.** `selectablePickMax(recordedMax) =
   recordedMax − 1` — `domain/core/src/casting-derivation.ts:24`; runtime guard
   `assertSelectablePick` — `:33`; called by `performCast` —
   `domain/core/src/index.ts:227`. Several sites already import and call
   `selectablePickMax` (e.g. `random-casting.ts:27`, `viewer.tsx:255`,
   `interactive-flow.ts:23`). Only the un-named `+ 1` / `− 1` arithmetic needs
   routing.

4. **The open-coded `±1` sites** (re-confirm each):
   - `domain/core/src/random-casting.ts:27` — `selectablePickMax(recordedMax) + 1`
     (the `+ 1` is `randomInt`'s exclusive-max correction, **NOT** a stalk-count
     conversion — see Task 1a note: leave this one).
   - `domain/core/src/casting-derivation.ts:52` (doc `(max + 1)`), `:80`
     (`const stalks = max + 1`).
   - `domain/core/src/index.ts:198` — `state.unparted.length - 1` (this is
     `maxPickFor`, the recorded-ceiling derivation — a different `− 1`; see note).
   - `cli/casting-ui/src/viewer.tsx:537` (doc), `:546` (`Stalks: ${currentMax + 1}`),
     `:611` (`stalksTotal={currentMax + 1}`), `:618` (`unpartedStalks={currentMax + 1}`).
   - `cli/casting-ui/src/slider-prompt.tsx:211` (doc), `:240` (doc), `:266`
     (`stalksTotal ?? max + 1`), `:334` (doc), `:387` (`stalksTotal ?? max + 1`).
   - `cli/casting-ui/src/casting-prompt-box.tsx:66` (doc), `:76` (doc), `:147`
     (doc), `:182` (doc), `:185` (doc), `:239` (doc), `:241`
     (`unpartedStalks ?? stalksTotal ?? max + 1`).

   > **Nuance — not every `+ 1` is the same `+ 1`.** In `slider-prompt.tsx` and
   > `casting-prompt-box.tsx`, the local prop is named `max` but it is already
   > the **selectable** ceiling `reachablePickMax = selectablePickMax(currentMax)`
   > (passed from `viewer.tsx:610`). So in those files `max + 1` is
   > `selectableCeiling + 1 = recordedMax`, **not** the true stalk count. These
   > are *defensive fallback defaults* for standalone callers/tests; the viewer
   > always threads the real `stalksTotal`/`unpartedStalks` explicitly. Do not
   > blindly swap these for the new count helper — read each comment first.

5. **The bounce-reflection false-match (Task 1b).** `next = this.max - 1` at
   `cli/casting-ui/src/bouncing-slider-store.ts:174`, and the reference loop at
   `cli/casting-ui/src/bounce-trajectory.ts:12` (`if next > max → direction = -1,
   next = max - 1`). This is **geometric reflection at the slider wall** (cursor
   hits the ceiling → reverse → step one cell inward), **NOT** the pick clamp.
   The store's `max` is the slider prop, which is already
   `reachablePickMax = selectablePickMax(currentMax)` (`viewer.tsx:255`, passed at
   `viewer.tsx:610`). Three reviewers misread this `max - 1` as a hand-rolled
   invariant violation. It actively misleads.

6. **OUT OF SCOPE — the manual validator.** `validateManualSplit` in
   `domain/core/src/manual-validation.ts` re-derives the `[1, unparted − 1]`
   range *structurally* from its four typed fields and does **not** call
   `selectablePickMax` (it has no `pick` to clamp). This is ADR-0006-documented
   intent, and the manual commit still flows through `performCast →
   assertSelectablePick`. Their agreement is locked by the property test
   `validateManualSplit "ok" picks satisfy assertSelectablePick` at
   `domain/core/tests/manual-validation.test.ts:170-194`. **Leave this file
   as-is.** The most this refactor may do is add an *optional* one-line comment
   cross-linking to `selectablePickMax` — and even that is not required.

7. **Branch context.** This plan layers cleanly on top of the recently-merged
   depcruise→ESLint boundary change (branch `claude/cool-carson-Aig03`, commit
   `5f8f75d`). It does not touch the boundary lint config. Boundary checks run
   via `pnpm boundaries:check` (now ESLint-backed). No `domain/* → cli/*` import
   is introduced by any task here, so the boundary stays clean.

8. **An adjacent existing helper.** The viewer already has
   `recordedMaxFor(lineState)` in `cli/casting-ui/src/viewer-flow.ts:126`
   (re-exported / used at `viewer.tsx:241`). That is the *recorded-ceiling*
   getter for a live `LineState`. Do not confuse it with the new count helper;
   the count helper takes a plain `recordedMax: number`, not a `LineState`.

---

## Scope summary

- **Tier 1 (recommended — DO THIS).** No file-format change. Name the two
  un-named concepts in core, route open-coded `±1` sites through the named
  helpers, and defuse the bounce false-match. Three commits (1a, 1b, 1c).
- **Tier 2 (OPTIONAL — gated on a human decision; DO NOT start without it).**
  Rename the in-memory field `SplitRecord.max → recordedMax` while keeping the
  on-disk key `max` via the converter. Sketched below; not part of Tier 1.
- **Tier 3 (REJECTED).** Branded `Pick` type / storing the selectable ceiling.
  Recorded below with rationale; do not build it.

---

## Tier 1 — commit-by-commit

### Before you start (one-time)

```bash
pnpm install
pnpm build
pnpm boundaries:check
```
Expected: install completes; build succeeds topologically; boundaries:check
reports no violations.

**The byte-gate (referenced below by that name).** This whole refactor must not
change a single rendered or saved byte. The proof is that the byte-identity
fixtures stay green **without** regeneration:

```bash
pnpm --filter @hexagram/casting-ui test
pnpm --filter @hexagram/consultation-file test
pnpm --filter @hexagram/core test
```
These pin the `--plain` stdout (`cli/casting-ui/tests/fixtures/*`) and the saved
`.md` body + frontmatter (`domain/consultation-file/tests/fixtures/*`)
byte-for-byte. For every task: **byte-gate green WITHOUT running
`pnpm generate-fixtures`**. If a fixture test goes red, the code diverged —
fix the code, never the fixture, and STOP and report. If you ever feel the urge
to run `pnpm generate-fixtures`, the refactor went too far.

---

### Task 1a — Name the true-stalk-count concept and route the `+ 1` sites

**Intent.** Give the `max + 1` ("true stalk count") concept a named, documented
home next to `selectablePickMax`, then replace each genuine open-coded
recorded-ceiling→stalk-count conversion with a call to it — removing the
now-redundant per-site explanatory comments. This closes the only un-named
member of the "one quantity, three concepts" table.

**New helper.** Add to `domain/core/src/casting-derivation.ts`, immediately
after `selectablePickMax` (so the inverse pair sits together):

```ts
/**
 * stalkCountFor(recordedMax) = recordedMax + 1 is the inverse of the `− 1` that
 * `SplitRecord.max` bakes in: `max` is the unparted stalk count minus the one
 * suspended stalk (掛一), so adding it back recovers the true count of stalks
 * before this division. The slider/manual readouts show this as `Stalks: <n>`.
 * Paired with `selectablePickMax` so the two `± 1` conversions around the
 * recorded ceiling each have exactly one named owner.
 */
export const stalkCountFor = (recordedMax: number): number => recordedMax + 1
```

> **Name justification.** `stalkCountFor` reads at the call-site as
> "the stalk count for this recorded max" and parallels `selectablePickMax`
> (both take `recordedMax`, both return a derived number). Verified there is **no
> existing export** named `stalkCountFor` / `stalksFor` / `unpartedFor` anywhere
> in the tree, so no collision. (Do not reuse `unpartedStalks` — that name is
> already an overloaded local in the casting-ui files.)

**Call-sites to route (only the genuine recorded-ceiling → stalk-count `+ 1`):**

1. `domain/core/src/casting-derivation.ts:80` — `const stalks = max + 1`
   → `const stalks = stalkCountFor(max)`. Keep the surrounding `deriveSplit`
   maths byte-identical; only this one line and (optionally) the `:52` doc
   comment `(max + 1)` → `(stalkCountFor(max))` change.

2. `cli/casting-ui/src/viewer.tsx:611` — `stalksTotal={currentMax + 1}`
   → `stalksTotal={stalkCountFor(currentMax)}`.

3. `cli/casting-ui/src/viewer.tsx:618` — `unpartedStalks={currentMax + 1}`
   → `unpartedStalks={stalkCountFor(currentMax)}`.

4. `cli/casting-ui/src/viewer.tsx:546` — the `Stalks: ${currentMax + 1}` inside
   the width-measurement template → `Stalks: ${stalkCountFor(currentMax)}`.
   (This is a width *probe* string; the rendered value still comes from the
   prop. Routing it keeps the probe and the prop derived from one helper. Verify
   the probe's measured width is unchanged — it is, since the number is equal.)

5. Update the explanatory comment at `viewer.tsx:537` and `:250-254` to point at
   `stalkCountFor` instead of restating `currentMax + 1` in prose.

**Add the import** in `viewer.tsx` (it already imports `selectablePickMax` from
`@hexagram/core/casting-derivation` at `viewer.tsx:2`):
`import { selectablePickMax, stalkCountFor } from '@hexagram/core/casting-derivation'`.

**Do NOT touch (these `± 1`s are a different quantity — see fact 4 nuance):**
- `random-casting.ts:27` — the `+ 1` is `randomInt` exclusive-max correction.
- `index.ts:198` (`maxPickFor`) — that is the recorded-ceiling *derivation*
  (`unparted.length − 1`), not a stalk-count conversion. Leave it (Task 1c may
  add a comment, but no helper applies).
- The `max + 1` fallback defaults in `slider-prompt.tsx:266,387` and
  `casting-prompt-box.tsx:241` — there `max` is already the *selectable*
  ceiling, so `max + 1 = recordedMax`, not the stalk count. Routing them through
  `stalkCountFor` would be **wrong** (off-by-one) and would change a rendered
  byte. Leave them. (If you want to name *that* concept too, it is `recordedMax`,
  which is `selectablePickMax`'s argument, not its inverse — out of scope.)

**Export plumbing.** `stalkCountFor` must be reachable where it is imported.
`casting-derivation.ts` is already an exported module of `@hexagram/core` (the
`selectablePickMax`/`assertSelectablePick`/`deriveSplit` exports live there and
are consumed cross-package). Confirm the package's `exports`/tsdown entry that
exposes `casting-derivation` does not need a new entry (it does not — same file,
new named export). Run `pnpm --filter @hexagram/core build` then
`pnpm type:check` to confirm the new export resolves cross-package.

**Add a focused unit test** in `domain/core/tests/casting-derivation.test.ts`
(alongside the existing `selectablePickMax` describe block at `:11`):

```ts
describe('stalkCountFor', () => {
  it('is the inverse of the recorded-ceiling − 1', () => {
    expect(stalkCountFor(48)).toBe(49)
    expect([48, 43, 39].map(stalkCountFor)).toEqual([49, 44, 40])
  })
  it('round-trips with selectablePickMax over a recorded max', () => {
    for (const recordedMax of [48, 43, 39, 13]) {
      // recorded ceiling sits one below the true count, two below... no:
      // selectablePickMax(recordedMax) = recordedMax − 1; stalkCountFor adds 1.
      expect(stalkCountFor(recordedMax)).toBe(selectablePickMax(recordedMax) + 2)
    }
  })
})
```

**Verification:** `pnpm --filter @hexagram/core test`, `pnpm type:check`, and
the **byte-gate** (all green, no regeneration).

**Commit subject:**
`refactor(core): name the true-stalk-count concept (stalkCountFor), retire open-coded recordedMax + 1`

---

### Task 1b — Defuse the slider-bounce false-match

**Intent.** Make it impossible to misread the slider's geometric reflection as a
hand-rolled pick-clamp. Rename the boundary local from `max` to a geometry name
and/or extract a small `reflectInto` helper, and add a one-line comment stating
this is reflection geometry and the ceiling already equals
`selectablePickMax(...)`. **Behaviour stays byte-identical** — the reflection
maths is unchanged.

**Files:**
- `cli/casting-ui/src/bouncing-slider-store.ts:167-179` (the `startTicking`
  reflection block; the offending line is `:174` `next = this.max - 1`).
- `cli/casting-ui/src/bounce-trajectory.ts:9-16` (the reference-loop comment at
  `:12`) and `:28-36` (`positionAtTick`, the closed-form triangle wave — already
  correct, just clarify the comment).

**Option A (minimal — preferred): rename + comment, no new function.**
In `bouncing-slider-store.ts`, the private field is `this.max`; renaming the
field ripples through the store. Instead, introduce a local at the top of the
reflection block and rename in the comment:

```ts
// Geometric reflection at the slider walls — the cursor steps one cell, and if
// it would pass a wall it reverses and steps one cell back inward. `this.max`
// here is the slider's UPPER BOUND (the reachable pick ceiling, already
// === selectablePickMax(currentMax) — see viewer.tsx), NOT a pick clamp:
// `upperBound - 1` is "one cell inward from the ceiling", reflection geometry.
const upperBound = this.max
let next = this.position + this.direction
if (next > upperBound) {
  this.direction = -1
  next = upperBound - 1
} else if (next < this.min) {
  this.direction = 1
  next = this.min + 1
}
```

**Option B (if you prefer extraction): add a pure `reflectInto` helper** to
`bounce-trajectory.ts` and call it from the store, keeping output byte-identical:

```ts
/**
 * Reflect a one-step advance off the inclusive `[min, max]` walls. Pure slider
 * geometry — `max` is the reachable cursor ceiling (already the selectable pick
 * ceiling), NOT a pick clamp; the `max - 1` / `min + 1` are "one cell inward
 * after bouncing", the standard triangle-wave reflection.
 */
export function reflectInto(
  position: number,
  direction: 1 | -1,
  min: number,
  max: number,
): { next: number; direction: 1 | -1 } {
  let next = position + direction
  if (next > max) return { next: max - 1, direction: -1 }
  if (next < min) return { next: min + 1, direction: 1 }
  return { next, direction }
}
```
Then the store calls it. **If you take Option B, you MUST add a unit test** that
locks `reflectInto` against the same input/output the imperative loop produced,
and confirm `bouncing-slider-store.test.ts` stays green. Option A needs no new
test (no extracted unit), only that the existing bounce tests stay green.

**Tests that MUST stay green (do not edit them):**
`cli/casting-ui/tests/bounce-trajectory.test.ts` and
`cli/casting-ui/tests/bouncing-slider-store.test.ts`. These lock the trajectory
maths. If either goes red you changed behaviour — revert and reconsider.

**Decision:** prefer **Option A** unless a reviewer asks for the extraction —
it is the smaller, lower-risk diff and fully discharges the "defuse the
false-match" goal. Record the choice in the commit body.

**Verification:** `pnpm --filter @hexagram/casting-ui test` (includes both
bounce suites), `pnpm type:check`, **byte-gate**.

**Commit subject:**
`refactor(casting-ui): name slider-bounce reflection as geometry, not a pick clamp (defuse S2 false-match)`

---

### Task 1c — Shrink the viewer/slider name vocabulary

**Intent.** Reduce the redundant aliases `currentMax` / `reachablePickMax` /
`stalksTotal` / `unpartedStalks` / `totalStalks` toward the small consistent
set: **recorded ceiling** (`currentMax` or `recordedMax`), the selectable
ceiling via `selectablePickMax(...)`, and the count via `stalkCountFor(...)`
(added in 1a).

**Decision — fold or separate?** Keep 1c **separate** from 1a. Rationale:
- 1a is a *core* change (new helper + routing the genuine `+ 1` sites) and is
  reviewable on its own — it touches `domain/core` plus four mechanical
  call-site edits in `viewer.tsx`.
- 1c is a *casting-ui-local* readability pass (renaming locals and prop
  defaults, collapsing aliases) that touches `slider-prompt.tsx`,
  `casting-prompt-box.tsx`, and `viewer.tsx` more invasively.
- Bundling them would make the 1a core change harder to verify and would mix
  "introduce the vocabulary" with "apply the vocabulary broadly" — two intents.
  Per `AGENTS.md` § "Small, single-intent diffs", keep them apart. 1c depends on
  1a (it uses `stalkCountFor`), so order is 1a → 1b → 1c.

**Concrete moves (all behaviour-preserving, byte-gate must stay green):**
- In `slider-prompt.tsx` and `casting-prompt-box.tsx`, the prop `max` is the
  *selectable* ceiling. Do **not** rename the public prop (it is the established
  contract and tests pass `max=`). Instead, tighten the doc comments at
  `slider-prompt.tsx:206-214,329-336` and `casting-prompt-box.tsx:64-79` so they
  say "`max` = selectable pick ceiling = `selectablePickMax(recordedMax)`" once,
  and stop re-deriving `max + 1` in prose — point at `stalkCountFor` / the
  recorded ceiling instead.
- Where a local re-computes a quantity that 1a now names, replace the inline
  arithmetic + comment with the helper call. Audit every remaining `+ 1` / `- 1`
  in these three files and classify it (recorded ceiling derivation,
  selectable ceiling, or stalk count) before touching it — fact 4's nuance
  applies file by file.
- Prefer the name `recordedMax` over `currentMax` only if it reduces total
  distinct names; if `currentMax` is already pervasive and consistent within a
  file, leave it (least churn). The goal is *fewer* names, not a global rename.

**Guard rails:** Do not change any prop name that a test passes by keyword
(`max`, `stalksTotal`, `unpartedStalks`). Do not alter the `Stalks: <n>` /
`Left Heap` / `Right Heap` readout text — it is byte-locked by the casting-ui
fixtures. This task is comments + local renames + helper substitution only.

**Verification:** `pnpm --filter @hexagram/casting-ui test`, `pnpm type:check`,
`pnpm lint:check`, **byte-gate**.

**Commit subject:**
`refactor(casting-ui): collapse the recorded-ceiling/stalk-count name vocabulary toward the named helpers`

---

## Tier 2 — OPTIONAL field rename (gated on a human decision)

> **DO NOT START Tier 2 without an explicit human "yes, rename the field."**
> It is a larger diff and changes the in-memory type used across the whole tree.
> It is deliberately kept out of Tier 1.

### 2-d2 (the gated option): `SplitRecord.max → recordedMax`, on-disk key stays `max`

**Idea.** Rename the in-memory field so the type no longer lies, while keeping
the persisted YAML key `max` via the converter — so **no `schemaVersion` bump,
no old files going `[unreadable]`, and the disk fixtures stay byte-unchanged.**

**Sketch (do not implement until approved):**
1. `domain/core/src/types.ts:55` — `{ pick: number; recordedMax: number }`.
2. Update every `.max` reference on a `SplitRecord`/derived value across the
   tree (`domain/core/src/casting-derivation.ts` `deriveSplit`'s destructure
   `{ pick, max }` → `{ pick, recordedMax: max }` or rename through; the casting
   producers in `random-casting.ts`, `index.ts`; every casting-ui reader). A
   tree-wide `grep` for `\.max\b` on split records plus the destructuring sites
   is the worklist.
3. **The converter is where the on-disk name is held.** Today
   `castingToYaml`/`castingFromYaml` (`frontmatter.ts:38,44`) pass each
   `SplitRecord` through verbatim, so the YAML key tracks the field name. After
   the rename you must make the converter *explicitly* map the renamed field to
   the `max` YAML key in both directions — e.g. map each
   `{ pick, recordedMax }` → `{ pick, max: recordedMax }` on write and
   `{ pick, max }` → `{ pick, recordedMax: max }` on read, per `SplitRecord`
   inside each `LineCasting`. This is the one seam where the old on-disk name
   survives.

**Trade-off to record in the PR description:** the in-memory type stops lying,
but the **on-disk name still lies** at exactly one documented converter seam.
That is a defensible bargain (the lie is now contained to one well-commented
function instead of smeared across the codebase) — but it is a judgement call,
hence the human gate. No `schemaVersion` change; disk fixtures
(`domain/consultation-file/tests/fixtures/*.md`) MUST remain byte-identical
(that green proves the converter mapping is correct).

### 2-d1 (REJECTED): hard rename + `schemaVersion` bump

Renaming the on-disk key to `recordedMax` and bumping `schemaVersion` from `1`
to `2` would make **every previously-saved consultation load as `[unreadable]`**
(the loader strict-equals `CURRENT_SCHEMA_VERSION` —
`domain/consultation-file/src/frontmatter.ts:26`). That is an enormous blast
radius for a cosmetic rename, with no migration upside the converter (2-d2)
doesn't already give for free. **Do not do this.**

---

## Tier 3 — REJECTED (recorded for completeness)

A branded `Pick` type, or storing the *selectable* ceiling instead of the
recorded one, would be invasive: it touches the persisted format, ripples a new
nominal type through every producer/consumer, and adds machinery to prevent a
class of bug that **cannot occur at runtime** (the guard already exists). This is
unrequested generality (`AGENTS.md` § "No unrequested generality"). **Do not
build it.**

---

## Verification plan (whole refactor)

Run from the worktree root after the Tier-1 commits:

```bash
pnpm type:check          # tsc --noEmit per package — the new export must resolve
pnpm lint:check          # oxlint + eslint (includes the boundary rule)
pnpm boundaries:check     # no new domain/* → cli/* edge introduced
pnpm test                # full suite (note: ~40 s rng distribution test runs)
```

**Byte-identity is the central acceptance gate.** These suites pin rendered and
saved bytes and MUST stay green **without** `pnpm generate-fixtures`:
- `cli/casting-ui/tests/fixtures/*` — `--plain` stdout + Ink sections.
- `domain/consultation-file/tests/fixtures/*` — saved `.md` body + frontmatter.

If `pnpm generate-fixtures` *would* change any fixture, the refactor altered an
observable byte and went too far — revert that hunk. **Bounce-trajectory tests**
(`cli/casting-ui/tests/bounce-trajectory.test.ts`,
`bouncing-slider-store.test.ts`) must stay green — they lock the slider geometry
1b is renaming around.

Optional pre-push hardening for the casting-ui changes (race-sensitive Ink
code): `pnpm test:stress:once` (see `CLAUDE.md` § "CI simulation").

---

## Out of scope / do-not-touch

- **The manual validator** (`domain/core/src/manual-validation.ts`,
  `validateManualSplit`) — fact 6. Leave the structural `[1, unparted−1]`
  derivation as-is; it is ADR-0006 intent and locked by the property test at
  `manual-validation.test.ts:170-194`. At most add an optional comment
  cross-link to `selectablePickMax`. Do **not** make it call `selectablePickMax`.
- **The runtime guard** `assertSelectablePick` — it is correct. Do not "fix",
  loosen, or remove it. This refactor adds no runtime behaviour.
- **The file format** — no `schemaVersion` change, no on-disk key change, unless
  the human explicitly approves Tier 2. The disk fixtures must stay byte-equal.
- **`random-casting.ts:27`'s `+ 1`** — it is `randomInt`'s exclusive-max
  correction, not a stalk-count conversion. Leave it.
- **Tier 3** — rejected above.
- **The boundary lint config** — untouched; this layers on top of branch
  `claude/cool-carson-Aig03`.

---

## Risks

- **Accidentally changing a rendered or saved byte.** The dominant risk — caught
  by the byte-identity fixtures. Mitigation: run the byte-gate after every task;
  never regenerate fixtures.
- **Misclassifying a `+ 1` / `- 1`.** Several `max + 1` sites in casting-ui use a
  `max` that is *already the selectable ceiling*, so `max + 1 = recordedMax`,
  not the stalk count. Routing those through `stalkCountFor` would be an
  off-by-one. Mitigation: fact 4's per-file nuance; classify before editing; the
  byte-gate catches the error if you slip.
- **Over-scoping into the persisted format.** Tempting to "just rename the
  field" — that is Tier 2 and gated. Keep Tier 1 in-memory + comments only.
- **Cross-package export resolution.** The new `stalkCountFor` export must be
  visible to `casting-ui` under both the `source` (tsx/vitest) and built
  conditions. Mitigation: it is a new named export of the *existing*
  `casting-derivation` module — no new `exports` entry needed — but run
  `pnpm --filter @hexagram/core build` + `pnpm type:check` to confirm.

---

## Hand-off summary (commit sequence)

1. **1a** `refactor(core): name the true-stalk-count concept (stalkCountFor),
   retire open-coded recordedMax + 1` — add `stalkCountFor(recordedMax) =
   recordedMax + 1` in `casting-derivation.ts` next to `selectablePickMax`;
   route the genuine `+ 1` sites (`casting-derivation.ts:80`, `viewer.tsx:546,
   611, 618`); add a unit test; leave the disguised `+ 1`s (random-casting,
   maxPickFor, the slider/prompt selectable-ceiling fallbacks).
2. **1b** `refactor(casting-ui): name slider-bounce reflection as geometry, not a
   pick clamp` — rename the boundary local in `bouncing-slider-store.ts:174` to
   `upperBound` (Option A) and clarify the `bounce-trajectory.ts:12` comment;
   keep both bounce test suites green; behaviour byte-identical.
3. **1c** `refactor(casting-ui): collapse the recorded-ceiling/stalk-count name
   vocabulary` — tighten comments and collapse redundant aliases in
   `slider-prompt.tsx` / `casting-prompt-box.tsx` / `viewer.tsx` toward
   `selectablePickMax` + `stalkCountFor` + one recorded-ceiling name; no prop
   renames, no readout-text changes.

Tier 2 (field rename via converter) is gated on a human "go"; Tier 3 is
rejected. Acceptance = byte-gate green without regeneration, plus
`type:check` / `lint:check` / `boundaries:check` / `test` all green.
