# Secondary-Boundary Hardening (Seam 4b/4c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two remaining secondary-boundary gaps from the theory-reconstruction handoff — the width-fence's test-file evasion + overstated lint message (4b) and the untested barrel/width lint bans (4c) — without touching the domain↔cli hard wall, which is already graph-true and unit-tested.

**Architecture:** Mirror the established `eslint.boundary.js` + `domain/core/tests/eslint-domain-boundary.test.ts` pattern. Factor the inline `barrelRootBans` and width-fence ban data out of `eslint.config.js` into the existing factored-rule-data module so they can be exercised in-process with ESLint's `Linter` API, add regression tests for them, then bring the width fence's enforcement scope in line with ADR-0021's prose ("`cli/**`-scoped") by extending it to cli test files and routing the three offending test imports through viewer-core's `terminalWidth`.

**Tech Stack:** ESLint flat config (`@sxzz/eslint-config`) + oxlint, the `eslint` package's `Linter` class (already a dev dep, used by the existing boundary test), Vitest, pnpm workspaces, Turborepo, oxfmt.

## Global Constraints

- **Branch:** all work on `claude/great-davinci-t8wmyq` (the Batch C/D branch). Do NOT open a PR unless explicitly asked.
- **Commits:** one intent per commit; body states WHY, not what. End every commit message with the two trailers used on this branch:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01UvHP3iBFErDjnBJDB7d2e9`. NEVER put a model identifier anywhere else in a committed artifact.
- **Verify before trust:** this repo's ADRs sometimes run ahead of the code — grep/read before acting on any "the doc says X".
- **Build before type/test:** library packages publish via `dist` (`types`/`import` conditions); run `pnpm build` once after pulling so cross-package `tsc --noEmit` and `vitest` resolve. The `source` condition lets `tsx`/`vitest` run unbuilt, but `tsc` needs `dist`.
- **Lint is two-layer:** `pnpm lint:check` runs oxlint then eslint over the whole tree. Treat 0 ERRORS as the gate; there are 7 pre-existing WARNINGS in untouched files (unrelated `consistent-function-scoping` etc.) that do not fail the build.
- **Format:** `pnpm format:check` (oxfmt) covers `.ts`/`.tsx` AND `.md`. Run `pnpm format:fix` before committing any new/edited file.
- **Data hygiene:** never put real consultation data in fixtures/docs/commits.

---

## Decision required before execution

**D1 — width-fence test scope (Seam 4b).** Two coherent options; this plan implements **Option A** (recommended). If the human picks **Option B**, replace **Task 4** with the one-task variant noted at its end and skip the test migration.

- **Option A (recommended, implemented below):** Extend the width fence to cli test files and migrate the three `string-width` test imports to viewer-core's `terminalWidth`. Rationale: it matches ADR-0021's own "structural, not asserted" philosophy and its stated `cli/**`-scope prose, removes the only evasion, and drops a now-unused dev dependency. `terminalWidth` is a thin re-export of `visualWidth` (both `string-width`-backed), so the migrated assertions are byte-for-byte equivalent.
- **Option B (accept prod-only scope):** Leave cli tests exempt by design (they are not shipped) and only document the exemption in the fence comment. Cheaper, but leaves the de-facto scope narrower than the ADR prose and keeps the stray `string-width` dev dep.

Tasks 1–3 are unaffected by D1 and should ship regardless.

---

## File structure

- `eslint.boundary.js` (root) — currently exports `cliPackageNames` + `cliBoundaryBans` (ADR-0019). **Generalise** it to be the single home for ALL factored lint-rule data: add `barrelRootBans` (moved from `eslint.config.js`) and `widthFenceBans` (the `string-width`/`slice-ansi` pair, extracted from the inline cli-scope block). Update the file header to say it now hosts the boundary data AND the barrel/width ban data, each unit-tested.
- `eslint.config.js` (root) — stop defining `barrelRootBans` inline and stop inlining the two width-ban objects; import all three (`barrelRootBans`, `widthFenceBans`, plus the existing `cliBoundaryBans`) from `eslint.boundary.js`. Behaviour must be identical (proven by `lint:check` staying at 0 errors).
- `domain/core/tests/eslint-secondary-bans.test.ts` (new) — regression test mirroring `eslint-domain-boundary.test.ts`: drives ESLint's `Linter` with `barrelRootBans` and `widthFenceBans` and asserts each fires on the bare/banned specifier and stays silent on the sanctioned alternative.
- `cli/casting-ui/tests/viewer.test.tsx`, `cli/casting-ui/tests/manual-diagram-right-pane.test.tsx`, `cli/casting-ui/tests/manual-diagram-bottom-strip.test.tsx` — migrate `import stringWidth from 'string-width'` → `import { terminalWidth } from '@hexagram/viewer-core'` and the call sites accordingly (Task 4, Option A).
- `cli/casting-ui/package.json` + `pnpm-lock.yaml` — drop the now-unused `string-width` devDependency (Task 4, Option A).
- `docs/adr/0021-rendered-width-single-home.md` — append a dated note that the fence scope now covers cli test files (Task 4, Option A).

---

### Task 1: Correct the overstated width-fence lint message (4b, part 1)

The two width-ban messages claim "viewer-core is the sole exempt wrapper". That overstates: ADR-0021 made `domain/text-layout`'s `visualWidth` the single width function (also `string-width`-backed) and explicitly sanctions the domain import — the rule simply isn't scoped to `domain/**`, so it never fires there. Fix the message so a reader isn't misled into thinking viewer-core is the only legitimate `string-width` site.

**Files:**
- Modify: `eslint.config.js` (the two `message` strings in the `cli/**/src` width-fence block, ~lines 139–146)

- [ ] **Step 1: Read the current block**

Run: open `eslint.config.js` at the `name: 'string-width'` / `name: 'slice-ansi'` objects.

- [ ] **Step 2: Reword both messages**

Replace "viewer-core is the sole exempt wrapper." in BOTH messages with:
`In cli/*, route through viewer-core; domain/text-layout's visualWidth is the sanctioned domain home (ADR-0021).`
(Keep the leading guidance unchanged — only the trailing overstated sentence changes.)

- [ ] **Step 3: Verify lint config still loads and is clean**

Run: `pnpm lint:check`
Expected: `Found 7 warnings and 0 errors.` (no new errors; config parses)

- [ ] **Step 4: Format**

Run: `pnpm format:fix && pnpm format:check`
Expected: "All matched files use the correct format."

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js
git commit -m "$(cat <<'EOF'
docs(lint): stop the width fence claiming viewer-core is the sole home

The string-width / slice-ansi ban messages said "viewer-core is the sole
exempt wrapper", but ADR-0021 made domain/text-layout's visualWidth the
single width function (also string-width-backed) and sanctions that
domain import — the rule just isn't scoped to domain/**. Reword so the
message reflects the real layering instead of overstating.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UvHP3iBFErDjnBJDB7d2e9
EOF
)"
```

---

### Task 2: Factor the barrel + width ban data into `eslint.boundary.js` (4c, part 1 — pure refactor)

Move `barrelRootBans` (currently a const in `eslint.config.js`) and the two width-ban objects (currently inline in the `cli/**/src` block) into `eslint.boundary.js` as exported consts, and import them back. This is a behaviour-preserving refactor whose ONLY purpose is to make the ban data importable by a test — `lint:check` staying at 0 errors is the proof of equivalence.

**Files:**
- Modify: `eslint.boundary.js` (add `barrelRootBans`, `widthFenceBans`; generalise header)
- Modify: `eslint.config.js` (import all three from `eslint.boundary.js`; delete the inline definitions)

**Interfaces:**
- Produces (consumed by `eslint.config.js` and Task 3's test):
  - `export const barrelRootBans: { name: string; message: string }[]` — bare-package bans for the barrel-less packages (`@hexagram/consultation-file`, `@hexagram/consultation-view`, `@hexagram/readout`, `@hexagram/text-grid`).
  - `export const widthFenceBans: { name: string; message: string }[]` — the `string-width` and `slice-ansi` bans (the corrected Task 1 messages).

- [ ] **Step 1: Add the two exports to `eslint.boundary.js`**

Append after `cliBoundaryBans`, copying the EXACT objects currently in `eslint.config.js` (use the Task-1-corrected width messages):

```js
// S9 drift-guard (no-barrel-files): these packages expose their public API as
// concrete subpath `exports`, NOT a root `.` barrel. Banning the bare package
// name keeps the per-subpath discipline from regressing into a re-export barrel.
export const barrelRootBans = [
  {
    name: '@hexagram/consultation-file',
    message:
      'Import the concrete subpath — @hexagram/consultation-file/{file,frontmatter,legacy-converter} — not the bare package; it has no root barrel (S9, no-barrel-files).',
  },
  {
    name: '@hexagram/consultation-view',
    message:
      'Import the concrete subpath — @hexagram/consultation-view/{build-view,ir,vocabulary} — not the bare package; it has no root barrel (S9, no-barrel-files).',
  },
  {
    name: '@hexagram/readout',
    message:
      'Import the concrete subpath — @hexagram/readout/{consultation-readout,output-composers,serialize-ansi,standing-line-color} — not the bare package; it has no root barrel. Casting-table row geometry lives at @hexagram/text-grid/scroll-geometry (S9, no-barrel-files).',
  },
  {
    name: '@hexagram/text-grid',
    message:
      'Import the concrete subpath — @hexagram/text-grid/{markdown,geometry,ledger-template,diagram-template,scroll-geometry} — not the bare package; it has no root barrel (S9, no-barrel-files).',
  },
]

// ADR-0019 + ADR-0021 rendered-width fence: only cli/viewer-core may import the
// width packages directly; every other cli/* measures via viewer-core's
// terminalWidth / panToWindow. (domain/text-layout's visualWidth is the
// sanctioned domain home — the rule is not scoped to domain/**.)
export const widthFenceBans = [
  {
    name: 'string-width',
    message:
      'Import rendered-string width via @hexagram/viewer-core (terminalWidth and the truncate/pad helpers), not string-width directly (ADR-0019). In cli/*, route through viewer-core; domain/text-layout’s visualWidth is the sanctioned domain home (ADR-0021).',
  },
  {
    name: 'slice-ansi',
    message:
      'Pan/slice a rendered string by display column via @hexagram/viewer-core (panToWindow), not slice-ansi directly (ADR-0021). In cli/*, route through viewer-core; domain/text-layout’s visualWidth is the sanctioned domain home (ADR-0021).',
  },
]
```

Also update the file's top-of-file comment to say it hosts the domain→cli boundary data AND the barrel/width ban data, each unit-tested.

- [ ] **Step 2: Rewire `eslint.config.js`**

In `eslint.config.js`: extend the existing import to pull the new names —
`import { barrelRootBans, cliBoundaryBans, widthFenceBans } from './eslint.boundary.js'` —
delete the inline `const barrelRootBans = [...]` block, and in the `cli/**/src` block replace the two inline width-ban objects with `...widthFenceBans`. Leave every `paths: [...barrelRootBans, ...]` reference as-is (they now point at the imported const). Keep `explicitJsExtensionPattern` re-listed in each scoped block.

- [ ] **Step 3: Prove behaviour is unchanged**

Run: `pnpm lint:check`
Expected: `Found 7 warnings and 0 errors.` (identical to before the refactor)

- [ ] **Step 4: Format**

Run: `pnpm format:fix && pnpm format:check`
Expected: "All matched files use the correct format."

- [ ] **Step 5: Commit**

```bash
git add eslint.boundary.js eslint.config.js
git commit -m "$(cat <<'EOF'
refactor(lint): factor barrel + width bans into eslint.boundary.js

The domain→cli boundary data already lives in eslint.boundary.js so it
can be unit-tested in-process; the barrel-root bans and the width fence
did not, so they were untestable (the invisible-drift state the boundary
test's own comment warns about). Move both into the same factored module
with no behaviour change — lint:check stays at 0 errors — so the next
task can pin them with a regression test.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UvHP3iBFErDjnBJDB7d2e9
EOF
)"
```

---

### Task 3: Regression-test the barrel + width bans (4c, part 2 — TDD)

Mirror `domain/core/tests/eslint-domain-boundary.test.ts`: drive ESLint's `Linter` with the factored ban data and assert each fires on the banned specifier and stays silent on the sanctioned alternative.

**Files:**
- Create: `domain/core/tests/eslint-secondary-bans.test.ts`

**Interfaces:**
- Consumes: `barrelRootBans`, `widthFenceBans` from `../../../eslint.boundary.js` (Task 2).

- [ ] **Step 1: Write the failing test**

```ts
import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'

import { barrelRootBans, widthFenceBans } from '../../../eslint.boundary.js'

// Pins the S9 no-barrel bans and the ADR-0019/0021 rendered-width fence — the
// two secondary boundaries that previously had no test (only the domain→cli
// hard wall did). Same in-process Linter approach as eslint-domain-boundary.test.

const linter = new Linter()

const messagesFor = (paths: { name: string; message: string }[], code: string) =>
  linter
    .verify(code, {
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      rules: { 'no-restricted-imports': ['error', { paths }] },
    })
    .filter((m) => m.ruleId === 'no-restricted-imports')

describe('S9 barrel-root bans', () => {
  it('bans every barrel-less package by its bare name', () => {
    for (const { name } of barrelRootBans) {
      expect(messagesFor(barrelRootBans, `import { x } from '${name}'`)).toHaveLength(1)
    }
  })

  it('allows the concrete subpath import (the sanctioned form)', () => {
    expect(
      messagesFor(barrelRootBans, `import { x } from '@hexagram/readout/serialize-ansi'`),
    ).toHaveLength(0)
  })

  it('includes consultation-view (the 4a addition)', () => {
    expect(barrelRootBans.map((b) => b.name)).toContain('@hexagram/consultation-view')
  })
})

describe('ADR-0021 rendered-width fence', () => {
  it('bans direct string-width and slice-ansi imports', () => {
    expect(messagesFor(widthFenceBans, `import sw from 'string-width'`)).toHaveLength(1)
    expect(messagesFor(widthFenceBans, `import sa from 'slice-ansi'`)).toHaveLength(1)
  })

  it('allows measuring via viewer-core', () => {
    expect(
      messagesFor(widthFenceBans, `import { terminalWidth } from '@hexagram/viewer-core'`),
    ).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run it to confirm it passes against the factored data**

Run: `pnpm --filter @hexagram/core test -- tests/eslint-secondary-bans.test.ts`
Expected: the new describe blocks PASS. (If `barrelRootBans`/`widthFenceBans` are not yet exported, the import fails — that proves Task 2 landed.)

- [ ] **Step 3: Lint + format the new file**

Run: `pnpm lint:check && pnpm format:fix && pnpm format:check`
Expected: 0 errors; "All matched files use the correct format."

- [ ] **Step 4: Commit**

```bash
git add domain/core/tests/eslint-secondary-bans.test.ts
git commit -m "$(cat <<'EOF'
test(lint): pin the S9 barrel bans and the width fence

Only the domain→cli hard wall had a unit test; the barrel-root bans and
the rendered-width fence drifted untested (e.g. consultation-view was
missing from the barrel list until 4a, undetected). Add an in-process
Linter regression mirroring eslint-domain-boundary.test so a dropped or
mistyped ban fails CI instead of silently weakening the boundary.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UvHP3iBFErDjnBJDB7d2e9
EOF
)"
```

---

### Task 4: Extend the width fence to cli test files (4b, part 2 — Option A)

**Decision-gated (see D1).** Bring the fence's enforcement scope in line with ADR-0021's "`cli/**`-scoped" prose by covering cli test files, after migrating the only three test imports of `string-width` to viewer-core's `terminalWidth` (behaviour-equivalent — `terminalWidth` re-exports `visualWidth`, both `string-width`-backed).

**Files:**
- Modify: `cli/casting-ui/tests/viewer.test.tsx` (import line 5; call site ~line 287)
- Modify: `cli/casting-ui/tests/manual-diagram-right-pane.test.tsx` (import line 1; call site ~line 88)
- Modify: `cli/casting-ui/tests/manual-diagram-bottom-strip.test.tsx` (import line 1; call sites ~lines 20, 31, 88)
- Modify: `cli/casting-ui/package.json` (drop `string-width` devDependency) + `pnpm-lock.yaml`
- Modify: `eslint.config.js` (widen the fence's `files` glob)
- Modify: `docs/adr/0021-rendered-width-single-home.md` (append a dated scope note)

- [ ] **Step 1: Confirm the migration set is complete**

Run: `pnpm exec grep -rn "from 'string-width'\|from 'slice-ansi'" cli --include=*.ts --include=*.tsx`
Expected: exactly the three `string-width` import lines listed above, all in `cli/casting-ui/tests/`. (If any cli/*/src or cli/test-utils file appears, STOP — that is a real production import the fence would newly break; surface it before continuing.)

- [ ] **Step 2: Migrate the three test files**

In each file, replace `import stringWidth from 'string-width'` with `import { terminalWidth } from '@hexagram/viewer-core'`, and replace every `stringWidth(` call with `terminalWidth(`. The numeric assertions (`toBe(15)`, `toBe(78)`, `toBeLessThanOrEqual(40)`) stay identical.

- [ ] **Step 3: Run the migrated tests — behaviour must be unchanged**

Run: `pnpm --filter @hexagram/casting-ui test -- tests/manual-diagram-bottom-strip.test.tsx tests/manual-diagram-right-pane.test.tsx tests/viewer.test.tsx`
Expected: PASS (terminalWidth ≡ stringWidth for these inputs). The viewer byte-identity gate inside `viewer.test.tsx` must stay green.

- [ ] **Step 4: Drop the unused devDependency**

Remove `"string-width"` from `devDependencies` in `cli/casting-ui/package.json`, then:
Run: `pnpm install`
Expected: lockfile loses only the casting-ui `string-width` devDep entry; `string-width` remains in the lockfile (it backs `domain/text-layout`'s `visualWidth`).

- [ ] **Step 5: Widen the fence scope**

In `eslint.config.js`, change the width-fence block's `files: ['cli/**/src/**/*.{ts,tsx}']` to `files: ['cli/**/*.{ts,tsx}']` (keep `ignores: ['cli/viewer-core/**']`). Update the block's lead comment to note the fence now covers cli tests too.

- [ ] **Step 6: Verify the wider fence is clean**

Run: `pnpm lint:check`
Expected: `Found 7 warnings and 0 errors.` (the only test imports were just migrated; no cli/*/src file imports the width packages directly post-ADR-0021).

- [ ] **Step 7: Append the ADR scope note**

In `docs/adr/0021-rendered-width-single-home.md`, append (append-only, per repo convention) a dated note: the `string-width`/`slice-ansi` fence now applies to `cli/**` (src AND tests, viewer-core exempt), bringing the enforcement scope in line with this ADR's prose; the three casting-ui test measurements were migrated to `terminalWidth`.

- [ ] **Step 8: Format + full verification**

Run: `pnpm format:fix && pnpm format:check && pnpm type:check && pnpm test`
Expected: format clean; type:check all tasks pass; full suite green incl. the manual≡interactive byte-identity gate.

- [ ] **Step 9: Commit**

```bash
git add cli/casting-ui/tests/viewer.test.tsx cli/casting-ui/tests/manual-diagram-right-pane.test.tsx cli/casting-ui/tests/manual-diagram-bottom-strip.test.tsx cli/casting-ui/package.json pnpm-lock.yaml eslint.config.js docs/adr/0021-rendered-width-single-home.md
git commit -m "$(cat <<'EOF'
fix(lint): extend the rendered-width fence to cli tests

The fence was scoped cli/**/src, so cli test files could import
string-width directly — three casting-ui tests did, the de-facto scope
narrower than ADR-0021's "cli/**-scoped" prose. Route those measurements
through viewer-core's terminalWidth (a thin re-export of visualWidth, so
the asserted widths are unchanged), drop the now-unused string-width dev
dep, and widen the fence glob to cli/** (viewer-core exempt). Width
knowledge now has one home in tests too.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UvHP3iBFErDjnBJDB7d2e9
EOF
)"
```

**If Option B is chosen instead:** skip Steps 2–9 above. Replace Task 4 with a single doc commit that adds a comment to the width-fence block in `eslint.config.js` stating the fence is deliberately `cli/**/src`-scoped (test files are not shipped and may measure width directly), and leave the three test imports and the `string-width` dev dep in place. Verify with `pnpm lint:check` (0 errors) and commit as `docs(lint): record that the width fence is prod-only by design`.

---

## Self-review

- **Spec coverage:** 4b = Task 1 (message) + Task 4 (test scope, Option A); 4c = Task 2 (factor) + Task 3 (test). The domain↔cli hard wall is intentionally untouched (already solid/tested). ✓
- **Placeholder scan:** every code/step has concrete content; the only deferred decision is D1, surfaced explicitly with both branches written out. ✓
- **Type/name consistency:** `barrelRootBans` / `widthFenceBans` are defined in Task 2 and consumed verbatim in Tasks 2–3; `terminalWidth` is the viewer-core export used in Task 4. ✓
- **Ordering:** Task 2 must precede Task 3 (the test imports the factored data). Tasks 1–3 are independent of D1; Task 4 is the only decision-gated task. ✓

## Execution handoff

Two execution options:

1. **Subagent-Driven (recommended)** — one fresh subagent per task, review between tasks.
2. **Inline Execution** — execute in-session with checkpoints.

Resolve **D1** first (it only affects Task 4); Tasks 1–3 can start immediately either way.
