# Line-Index Guard De-duplication (finding S7) Implementation Plan

> **For agentic workers:** This is a SELF-CONTAINED handoff. You need no other
> conversation context. REQUIRED SUB-SKILL: use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans` to
> implement task-by-task, and `tdd` (red → green → refactor) for each task that
> ships behaviour. Steps use checkbox (`- [ ]`) syntax. Work on branch
> `claude/cool-carson-Aig03`. Do NOT create a PR. End every commit message body
> with the trailer line
> `https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh` and put no model
> identifier anywhere.

**Goal:** Collapse a duplicated piece of knowledge — *"a hexagram line index is
an integer in 0..5"* — that today exists as two separate `isLineIndex` guards
straddling the `domain/*` ↔ `cli/*` boundary. Hoist a **single** `LineIndex`
type + `isLineIndex` guard into `@hexagram/core` (the shared low package both
sides already depend on), then have both call sites import it and delete the two
local copies. This is a **pure refactor** — no observable behaviour changes.

**Architecture:** `@hexagram/core` sits at the bottom of the DAG and owns the
`Line`/`Hexagram`/`CastingRecord` vocabulary. `LineIndex` is the same kind of
pure vocabulary, so it belongs alongside them in `@hexagram/core/types` (an
already-exported subpath). Both consumers — `cli/viewer-core` (a `cli/*`
package) and `domain/consultation-view` (a `domain/*` package) — already declare
`@hexagram/core` as a `workspace:*` dependency, so importing from it introduces
**no new `domain → cli` edge** (which the ESLint boundary rule, ADR-0019, would
reject). The unification replaces a prose "byte-equivalent" comment with a real
shared definition + a unit test.

**Tech Stack:** TypeScript, pnpm + Turborepo monorepo, vitest, ESLint
`no-restricted-imports` boundary rule (ADR-0019). Byte-locked golden fixtures
(`cli/casting-ui/tests/fixtures/*`, `domain/consultation-file/tests/fixtures/*`)
that this refactor MUST leave untouched.

---

## Background — what S7 is (read once, then refer back)

A tiny piece of knowledge — "a hexagram line index is an integer in 0..5" — is
encoded as `isLineIndex` and DUPLICATED across the domain↔cli boundary:

- **cli copy** — `cli/viewer-core/src/utils-validators.ts:1-11`: a private
  `type LineIndex = 0 | 1 | 2 | 3 | 4 | 5` plus an exported
  `isLineIndex(maybeLineIndex: unknown): maybeLineIndex is LineIndex` whose body
  is `typeof maybeLineIndex === 'number' && maybeLineIndex !== -1 && maybeLineIndex >= 0 && maybeLineIndex <= 5`.
  Re-exported from `cli/viewer-core/src/index.ts:67-71`.
- **domain copy** — `domain/consultation-view/src/build-view.ts:23-29`: a
  PRIVATE `function isLineIndex(i: number): i is 0 | 1 | 2 | 3 | 4 | 5 { return i >= 0 && i <= 5 }`
  carrying a comment that admits it is "byte-equivalent to viewer-core's
  isLineIndex … kept local so this domain package needs no cli dependency". Its
  ONLY call site is `build-view.ts:114` inside `oneMovingLineVariants`
  (`const movingIndex = hexagram.findIndex(isMovingLine); if (!isLineIndex(movingIndex)) return []`),
  narrowing the `number` from `findIndex` to a `0|1|2|3|4|5` to build an
  `L${movingIndex + 1}` key.

Why the duplication exists, and why it is wrong to leave it:

- The two copies are NOT logically identical: the cli copy accepts `unknown` and
  adds `typeof === 'number'` and `!== -1` guards; the domain copy takes `number`
  and omits both. They agree only under the domain call site's input contract
  (`findIndex` returns `-1` or `0..5`).
- NEITHER copy checks for an integer (no `Number.isInteger`); the `0|1|2|3|4|5`
  narrowing type claims more than the runtime enforces. (Flagged below as an
  OPTIONAL hardening — out of scope for this pure refactor.)
- The duplication is FORCED by the boundary today: `consultation-view` is a
  `domain/*` package and may not import from `cli/viewer-core` (a `cli/*`
  package) — enforced by `eslint.config.js:88-101` (`no-restricted-imports`
  scoped to `domain/**`, ADR-0019). So the cli copy cannot be shared as-is.
- A natural shared home EXISTS and is unused: `@hexagram/core` is at the bottom
  of the DAG, owns the `Line`/`Hexagram` vocabulary, and BOTH consumers already
  depend on it (`workspace:*`). It does NOT currently export any `LineIndex`
  type or `isLineIndex` guard.
- No test pins the two copies together — only the prose comment asserts
  equivalence.

### Settled design decisions (do not relitigate)

1. **Home / subpath = `@hexagram/core/types`.** `LineIndex` is pure line
   vocabulary, so it sits alongside `Line`, `Hexagram`, `CastingRecord`,
   `CastingAbsenceReason` in `domain/core/src/types.ts`. The `./types` subpath is
   ALREADY exported — `domain/core/tsdown.config.ts:14` (`'./src/types.ts'`
   entry) and `domain/core/package.json:53-57` (`"./types"` export). **No new
   subpath, no tsdown/package.json change.** (Considered and rejected:
   `@hexagram/core/line-semantics` — `build-view.ts` already imports from it, but
   that module is the *behavioural* line algebra; an index-range type is plain
   vocabulary and reads more naturally next to `Hexagram`. Considered and
   rejected: a new small module — unnecessary churn for one type + one guard.)

2. **Unify on the viewer-core body (the more defensive one) — preserve current
   behaviour exactly.** The shared guard accepts `unknown` and runs
   `typeof === 'number' && value !== -1 && value >= 0 && value <= 5`. This is a
   valid drop-in for the domain call site: a `number` in `0..5` passes; the
   `-1` that `findIndex` returns fails the range check anyway (`-1 >= 0` is
   false), so the `!== -1` clause is redundant-but-harmless there and keeps the
   guard a faithful superset of both originals. Nothing changes at either call
   site. The `!== -1` clause is retained verbatim (rather than dropped as dead)
   so the unified guard is a strict superset of the cli copy — i.e. every input
   that the cli guard rejected, the unified guard also rejects.

3. **Retire viewer-core's `LineIndex` type alias too** — replace the local
   `type LineIndex` with the imported core one, so there is a single
   authoritative `LineIndex` (not just a single `isLineIndex`).

4. **`isLine1ToLine6` / `assertLine1ToLine6` are OUT OF SCOPE.** They encode a
   *different* piece of knowledge (a 1-based `'L1'..'L6'` key string, not a
   0-based index integer) and are not duplicated in the domain layer. Leave them
   exactly where they are.

5. **Pure refactor — zero fixture diff is a hard gate.** `oneMovingLineVariants`
   behaviour must be byte-identical, so `cli/casting-ui/tests/fixtures/*` and
   `domain/consultation-file/tests/fixtures/*` MUST NOT change. The verification
   plan runs `pnpm generate-fixtures` and asserts an empty diff.

### Forks flagged for the human (confirm when you review this committed plan)

> **FORK A — integer check (recommend: DEFER, out of scope).** Neither original
> guard checks `Number.isInteger`, yet the `0|1|2|3|4|5` narrowing claims an
> integer. Adding `Number.isInteger(value)` to the unified guard would close
> that gap but is a **behaviour change** (a hypothetical `2.5` input would flip
> from `true`→`false`). For the two real call sites it is moot (`findIndex`
> yields integers; the cli export has no live caller). Recommendation: keep this
> refactor pure (no integer check) and, if desired, do the hardening as a
> SEPARATE, separately-reviewed change with its own fixture re-check. Implement
> the plan as written unless the human says otherwise.

> **FORK B — keep vs. drop the cli `isLineIndex` re-export.** `isLineIndex` is
> re-exported from `cli/viewer-core/src/index.ts:70` but has **no live consumer**
> anywhere in `cli/` (verified: the only references to `isLineIndex` are its own
> definition and that re-export line). The plan KEEPS the re-export (now pointing
> at the core guard) to avoid widening the diff / touching the public surface of
> viewer-core. Recommendation: keep it for now; a follow-up could delete the dead
> re-export. Implement as written (keep the re-export) unless the human says
> otherwise.

### Grounded facts (verified against source 2026-06-07 — RE-CONFIRM line numbers before editing)

> **Important:** branch `claude/cool-carson-Aig03` currently carries in-progress
> **S4** work. S4's `CastingAbsenceReason` type + `isCastingAbsenceReason` guard
> have ALREADY landed in `domain/core/src/types.ts:69-96` (this plan's Task 1
> inserts `LineIndex` NEAR them but does not touch them). S4's **Phase B** also
> edits `buildConsultationView` in `domain/consultation-view/src/build-view.ts`
> (adding an `absenceReason` param + casting-section field). That edits a
> DIFFERENT region (`build-view.ts:184-197`) than this plan's call site
> (`build-view.ts:23-29` + `:112-115`), so they should not collide — but
> **re-grep `isLineIndex` and re-read `build-view.ts` before editing**; the line
> numbers below may have drifted.

- **cli guard + alias:** `cli/viewer-core/src/utils-validators.ts`
  - `type LineIndex = 0 | 1 | 2 | 3 | 4 | 5` at `:1`.
  - exported `isLineIndex(maybeLineIndex: unknown): maybeLineIndex is LineIndex`
    body at `:2-11` (`typeof === 'number' && !== -1 && >= 0 && <= 5`).
  - `type LineKey` + `isLine1ToLine6` + `assertLine1ToLine6` at `:13-27`
    (OUT OF SCOPE — leave intact).
- **cli re-export:** `cli/viewer-core/src/index.ts:67-71` re-exports
  `assertLine1ToLine6, isLine1ToLine6, isLineIndex` from `./utils-validators.js`.
- **domain guard + only call site:** `domain/consultation-view/src/build-view.ts`
  - private `isLineIndex` + its admitting comment at `:23-29`.
  - the sole call at `:114` inside `oneMovingLineVariants` (`:112-115`).
  - existing imports: `@hexagram/core/getters` (`:1`),
    `@hexagram/core/line-semantics` (`:2-6`), `@hexagram/core/types` (`:7`,
    currently `import type { Hexagram, PartialCastingRecord } from '@hexagram/core/types'`).
- **core home:** `domain/core/src/types.ts` — `Line` at `:1-3`, `isLine` at
  `:2-3`, `Hexagram` at `:13`, casting types at `:51-67`, the S4
  `CastingAbsenceReason` block at `:69-96`. The `./types` subpath is exported
  (`domain/core/package.json:53-57`, `domain/core/tsdown.config.ts:14`).
- **core test:** `domain/core/tests/types.test.ts` exists (currently the S4
  `isCastingAbsenceReason` tests, lines 1-17). Append the `isLineIndex` block.
- **both consumers depend on core:** `domain/consultation-view/package.json:51-54`
  (`"@hexagram/core": "workspace:*"`) and `cli/viewer-core/package.json:26-33`
  (`"@hexagram/core": "workspace:*"`). No `package.json` edits needed.
- **boundary rule:** `eslint.config.js:88-101` — `no-restricted-imports` scoped
  to `domain/**`, forbidding imports of the seven `cli/*` package names. Importing
  `@hexagram/core/types` from `build-view.ts` is allowed (core is not a `cli/*`
  package). The cli copy stays a cli package importing core — also allowed.
- **no live consumer of the cli `isLineIndex`** beyond its definition + the
  index re-export (verified by grepping `cli/`). See FORK B.

---

## File-by-file decomposition

- `domain/core/src/types.ts` — ADD `LineIndex` type + `isLineIndex` guard
  (the single authoritative definition).
- `domain/core/tests/types.test.ts` — ADD a unit test pinning the guard's
  behaviour (the contract previously asserted only by prose).
- `domain/consultation-view/src/build-view.ts` — DELETE the private
  `isLineIndex` + comment (`:23-29`); IMPORT `isLineIndex` from
  `@hexagram/core/types`; call site at `:114` is unchanged.
- `cli/viewer-core/src/utils-validators.ts` — DELETE the local `type LineIndex`
  + `isLineIndex` (`:1-11`); IMPORT both from `@hexagram/core/types` and
  re-export `isLineIndex` so `index.ts`'s existing re-export still resolves
  (keep `isLine1ToLine6` / `assertLine1ToLine6` untouched).
- `cli/viewer-core/src/index.ts` — UNCHANGED (it already re-exports `isLineIndex`
  from `./utils-validators.js`; that file now re-exports the core guard).

No `package.json`, no `tsdown.config.ts`, no fixture changes.

---

## TASK 1: single `LineIndex` + `isLineIndex` in `@hexagram/core/types`

**Files:**
- Modify: `domain/core/src/types.ts`
- Test: `domain/core/tests/types.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `domain/core/tests/types.test.ts` (it already imports from
`../src/types.js` for the S4 `isCastingAbsenceReason` block — extend that import
or add a second one):

```ts
import { isLineIndex } from '../src/types.js'

describe('isLineIndex', () => {
  it('accepts every integer 0..5', () => {
    for (const i of [0, 1, 2, 3, 4, 5]) expect(isLineIndex(i)).toBe(true)
  })
  it('rejects out-of-range numbers, including findIndex sentinel -1', () => {
    expect(isLineIndex(-1)).toBe(false)
    expect(isLineIndex(6)).toBe(false)
    expect(isLineIndex(-0.5)).toBe(false)
    expect(isLineIndex(100)).toBe(false)
  })
  it('rejects non-numbers', () => {
    expect(isLineIndex('3')).toBe(false)
    expect(isLineIndex(undefined)).toBe(false)
    expect(isLineIndex(null)).toBe(false)
    expect(isLineIndex(Number.NaN)).toBe(false)
  })
})
```

> NOTE: this refactor deliberately does NOT assert integer-ness (e.g.
> `isLineIndex(2.5)` is currently `true` and stays `true`) — see FORK A. Do not
> add a `2.5 → false` case unless the human opted into the hardening.

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @hexagram/core test -- types.test`
Expected: FAIL — `isLineIndex` is not exported from `@hexagram/core/types`.

- [ ] **Step 3: Add the type + guard**

In `domain/core/src/types.ts`, add directly under the `Hexagram` definition
(after `assertIsHexagram`, around `:25`) — `LineIndex` is the 0-based positional
index INTO a `Hexagram`, so it reads best next to it:

```ts
/**
 * A 0-based index into a `Hexagram` tuple: `0` = Line 1 (bottom) … `5` = Line 6
 * (top). The single authoritative range guard — previously duplicated as a
 * private guard in `consultation-view`'s view builder and an exported guard in
 * `cli/viewer-core` (finding S7). Both now import this one.
 */
export type LineIndex = 0 | 1 | 2 | 3 | 4 | 5

/**
 * Narrow an `unknown` (or the `number` that `Array.findIndex` returns) to a
 * `LineIndex`. The `!== -1` clause is redundant given the range check but is
 * kept so this is a faithful superset of the former viewer-core guard — it
 * documents the `findIndex` "not found" sentinel as an explicit reject.
 * NOTE: this is a RANGE guard, not an integer guard (matches the prior
 * behaviour; see the S7 plan, fork A).
 */
export function isLineIndex(value: unknown): value is LineIndex {
  return (
    typeof value === 'number' && value !== -1 && value >= 0 && value <= 5
  )
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm --filter @hexagram/core test -- types.test`
Expected: PASS. Then `pnpm --filter @hexagram/core type:check` — green.
(`LineIndex`/`isLineIndex` ship via the existing `@hexagram/core/types`
subpath — no export-map change needed.)

- [ ] **Step 5: Commit**

```bash
git add domain/core/src/types.ts domain/core/tests/types.test.ts
git commit  # subject: "feat(core): add single LineIndex vocabulary + range guard (S7)"
```

---

## TASK 2: `consultation-view` imports the core guard, deletes its private copy

**Files:**
- Modify: `domain/consultation-view/src/build-view.ts`

This is a pure refactor of one module; its correctness is covered by the
existing `consultation-view` suite and the byte fixtures. No new test.

- [ ] **Step 1: Re-confirm the current source**

Run `grep -n "isLineIndex" domain/consultation-view/src/build-view.ts` (expect a
private definition near `:23-29` and one call near `:114`). If S4's Phase B has
shifted these, adjust the edits below to match.

- [ ] **Step 2: Import the core guard**

Extend the `@hexagram/core/types` import at `build-view.ts:7`. Before:

```ts
import type { Hexagram, PartialCastingRecord } from '@hexagram/core/types'
```

After (value import for the guard + the existing type-only imports):

```ts
import { isLineIndex } from '@hexagram/core/types'
import type { Hexagram, PartialCastingRecord } from '@hexagram/core/types'
```

> Keep the project's import ordering convention — value import then type import
> from the same specifier is how the repo already splits them (see
> `frontmatter.ts`). If `oxlint`/`eslint` complains about ordering after the
> edit, run `pnpm lint:fix` and re-inspect.

- [ ] **Step 3: Delete the private guard + its comment**

Remove `build-view.ts:23-29` in full:

```ts
// Private Line-index guard (0..5). Mirrors the guard the pre-IR markdown
// renderer used (`i >= 0 && i <= 5`); kept local so this domain package needs
// no cli dependency for the validator. `findIndex` returns -1 or 0..5, so this
// is byte-equivalent to viewer-core's isLineIndex at the only call site.
function isLineIndex(i: number): i is 0 | 1 | 2 | 3 | 4 | 5 {
  return i >= 0 && i <= 5
}
```

The call site at `:114` (`if (!isLineIndex(movingIndex)) return []`) is
UNCHANGED — it now resolves to the imported guard. `movingIndex` is the `number`
from `hexagram.findIndex(isMovingLine)`; the imported guard accepts `unknown`,
so the `number` argument type-checks and still narrows to `LineIndex`.

- [ ] **Step 4: Verify the package**

Run:
```bash
pnpm --filter @hexagram/consultation-view type:check
pnpm --filter @hexagram/consultation-view test
```
Both green. The `L${movingIndex + 1}` key construction (`:115`) still type-checks
because `movingIndex` is narrowed to `LineIndex` exactly as before.

- [ ] **Step 5: Commit**

```bash
git add domain/consultation-view/src/build-view.ts
git commit  # subject: "refactor(consultation-view): use core isLineIndex, drop private copy (S7)"
```

---

## TASK 3: `viewer-core` re-exports the core guard, deletes its local copy

**Files:**
- Modify: `cli/viewer-core/src/utils-validators.ts`
- (`cli/viewer-core/src/index.ts` is unchanged — it already re-exports
  `isLineIndex` from `./utils-validators.js`.)

- [ ] **Step 1: Replace the local definition with a re-export**

In `cli/viewer-core/src/utils-validators.ts`, delete `:1-11` (the local
`type LineIndex` + `isLineIndex`) and prepend a re-export so
`index.ts:70`'s `export { … isLineIndex } from './utils-validators.js'` keeps
resolving. The file becomes:

```ts
// `LineIndex` + `isLineIndex` are the single authoritative line-index
// vocabulary, owned by @hexagram/core (finding S7). Re-exported here so the
// existing viewer-core public surface (index.ts) is unchanged for consumers.
export { isLineIndex, type LineIndex } from '@hexagram/core/types'

type LineKey = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'
export function isLine1ToLine6(maybeLineKey: unknown): maybeLineKey is LineKey {
  return (
    typeof maybeLineKey === 'string' &&
    ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].includes(maybeLineKey)
  )
}

export function assertLine1ToLine6(
  maybeLine: unknown,
): asserts maybeLine is LineKey {
  if (!isLine1ToLine6(maybeLine)) {
    throw new Error('Line is not between 1 and 6')
  }
}
```

> Note: `LineKey` / `isLine1ToLine6` / `assertLine1ToLine6` are LEFT UNTOUCHED
> (different knowledge — a 1-based key string, not a 0-based index; see decision
> 4 / FORK B is about the `isLineIndex` re-export only).

- [ ] **Step 2: Verify viewer-core**

Run:
```bash
pnpm --filter @hexagram/viewer-core type:check
pnpm --filter @hexagram/viewer-core test
```
Both green. `cli/viewer-core/src/index.ts:67-71` still re-exports
`assertLine1ToLine6, isLine1ToLine6, isLineIndex` — all three resolve.

- [ ] **Step 3: Boundary lint check (scoped)**

Run `pnpm lint:check`. The new `@hexagram/core/types` import sits in a `cli/*`
file (importing core is always allowed) and in a `domain/*` file (core is not a
`cli/*` package, so the ADR-0019 rule does not fire). Expected: no NEW errors.

- [ ] **Step 4: Commit**

```bash
git add cli/viewer-core/src/utils-validators.ts
git commit  # subject: "refactor(viewer-core): re-export core isLineIndex, drop local copy (S7)"
```

---

## Verification plan (run after Task 3; this is the completion gate)

Run each and confirm actual output before claiming done (evidence before
assertions):

- [ ] `pnpm type:check` — green across all packages.
- [ ] `pnpm test` — all suites green. (The `rng distribution (slow)` block in
  `domain/core/tests/random-casting.test.ts` is ~40s by design — wait it out.)
- [ ] `pnpm lint:check` — no NEW errors. If there are pre-existing warnings,
  confirm they predate this change (they are unrelated to `isLineIndex`).
- [ ] **Zero-fixture-diff gate (the pure-refactor proof):**
  ```bash
  pnpm generate-fixtures
  git status --porcelain -- '**/tests/fixtures/**'
  ```
  The `git status` output MUST be empty. If ANY fixture under
  `cli/casting-ui/tests/fixtures/` or `domain/consultation-file/tests/fixtures/`
  changed, STOP — the refactor altered `oneMovingLineVariants` output and is no
  longer behaviour-preserving. (`pnpm generate-fixtures` regenerates the
  casting-ui plain-output fixtures; the consultation-file `.md` fixtures are
  covered by `pnpm test`.) Do not stage any regenerated fixture.
- [ ] **Single-definition proof:** `grep -rn "function isLineIndex\|type LineIndex" domain cli`
  should now show the `LineIndex` type + `isLineIndex` function ONLY in
  `domain/core/src/types.ts`; the other two files should show only IMPORT /
  RE-EXPORT lines, no definitions.

---

## Out of scope / do not touch

- **`isLine1ToLine6` / `assertLine1ToLine6`** — different knowledge (1-based key
  string), not duplicated; leave them in `viewer-core/utils-validators.ts`.
- **The integer-check gap (FORK A)** — do NOT add `Number.isInteger`; that is a
  behaviour change for a separate, separately-reviewed slice.
- **Deleting the dead `isLineIndex` re-export from `viewer-core` (FORK B)** — keep
  it; a follow-up may remove it.
- **Any `package.json` / `tsdown.config.ts` / export-map edit** — the `./types`
  subpath already exists; both consumers already depend on core. None needed.
- **Bumping any schema, touching the casting algorithm, or editing S4's
  `CastingAbsenceReason` block** in `types.ts`.

## Risks

- **Line-number drift from concurrent S4 work** → S4 Phase B edits
  `buildConsultationView` lower in `build-view.ts`. Mitigation: Task 2 Step 1
  re-greps before editing; the regions don't overlap (`:23-29`/`:114` vs
  `:184-197`).
- **A behaviour change leaking into `oneMovingLineVariants`** → caught by the
  zero-fixture-diff gate. The unified guard is a strict superset of both
  originals, so the only `findIndex` outputs (`-1` and `0..5`) classify
  identically: `-1` → false (range), `0..5` → true.
- **Import-ordering lint noise** → run `pnpm lint:fix` and re-inspect if the
  split value/type import trips the ordering rule.

---

## HANDOFF PROMPT (paste to a fresh implementation agent)

> Implement the plan at
> `docs/superpowers/plans/2026-06-07-line-index-guard-dedup.md` in
> `/home/user/ts-hexagram-generator`. It is a self-contained, TDD,
> commit-by-commit plan that de-duplicates the `isLineIndex` line-index guard
> (finding S7) by hoisting a single `LineIndex` type + `isLineIndex` guard into
> `@hexagram/core/types` and having both `cli/viewer-core` and
> `domain/consultation-view` import it, deleting their two local copies.
>
> Rules: work on branch `claude/cool-carson-Aig03` (already checked out; do NOT
> use any other branch; do NOT open a PR; this branch also carries concurrent S4
> work — re-grep `isLineIndex` and re-read `build-view.ts` before editing because
> line numbers may have drifted). Implement the three tasks as the plan's
> separate single-intent commits, in order. Each commit message records WHY and
> ends with the trailer `https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh`;
> put no model identifier anywhere. Use TodoWrite to track tasks.
>
> Hard guardrails: this is a PURE REFACTOR — no observable behaviour changes. Do
> NOT add a `Number.isInteger` check (fork A is deferred). Do NOT touch
> `isLine1ToLine6` / `assertLine1ToLine6`. After Task 3, the zero-fixture-diff
> gate MUST hold: run `pnpm generate-fixtures` then
> `git status --porcelain -- '**/tests/fixtures/**'` and confirm it is EMPTY — a
> changed fixture means you broke behaviour; stop and fix. Do NOT stage any
> regenerated fixture.
>
> Run `pnpm type:check`, `pnpm test`, and `pnpm lint:check` and report actual
> output. If a verification fails and you can't resolve it within the plan's
> scope, STOP and report with the command output rather than committing a broken
> state. When done, report the commit SHAs + the (empty) fixture status output +
> the single-definition grep result.
