# Seam Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the surviving and newly-introduced conceptual-integrity seams found in the post-refactor review (branch `claude/adoring-mendel-HD80k`), without changing any observable output.

**Architecture:** Three risk-ordered parts. Part 1 = zero-behaviour single-home cleanups. Part 2 = boundary-respecting unifications (single home, no algorithm change). Part 3 = the relocated "row-assembly grammar" fault line (S1): a medium-neutral diagram-row template in `@hexagram/consultation-view` that the ANSI and Markdown serializers consume via a `decorate` callback, so structure lives once and each surface owns only its medium. Every behaviour-touching task is gated by the existing byte-identity fixture suites — green means output is unchanged.

**Tech Stack:** TypeScript, Turborepo + pnpm workspaces, vitest, tsdown, dependency-cruiser, Ink/React.

---

## Before you start (one-time)

- [ ] **Environment is built and green.** A fresh clone needs deps + a build before cross-package `source` resolution works under vitest.

Run:
```bash
pnpm install --ignore-scripts
pnpm build
pnpm boundaries:check
```
Expected: install completes; build = `12 successful`; boundaries:check = `✔ no dependency violations found`.

**The universal gate** (referenced below as "the parity gate"):
```bash
pnpm --filter @hexagram/consultation-view --filter @hexagram/readout \
     --filter @hexagram/consultation-file --filter @hexagram/casting-ui test
```
Expected: all suites pass (consultation-view 13, consultation-file 60+2 skipped, readout 41, casting-ui 385+2 skipped). These suites pin the `.md` body and `--plain` stdout byte-for-byte. For any output-touching task, "byte-identical preserved" == "this command stays green WITHOUT regenerating fixtures".

---

## Deliberately out of scope (considered, deferred)

Two seams the review surfaced are NOT addressed here, by design:

- **The non-interactive-refusal fork (S3).** `classifyEnv` is single-homed, but the refusal *message* is authored ~3× and the enforcement forks two ways (`refuseIfNonInteractive` → `process.exit(1)` in the app bins vs a local `NON_INTERACTIVE_MESSAGE` + `return false` in `shell`/`playground-ui`). Unifying this requires choosing one control-flow contract (throw/exit vs boolean) across boot paths — a behavioural decision worth its own brainstorm, not a mechanical de-dupe. Left for a follow-up.
- **The emerging-gate re-derivation (S-B/E).** `hasMovingLines` is single-homed in `@hexagram/core`, but `build-view.ts` re-derives it inline (`hexagram.some(isMovingLine)`) and `consultation-readout.tsx` uses a deliberately *different* predicate during the `locked` casting phase (`locked || sections.emerging != null`). These are arguably different knowledge (the in-progress UI cannot see the hexagram yet), so collapsing them risks conflating two real states. Flagged, not merged.

If you want either closed, run `superpowers:brainstorming` then `superpowers:writing-plans` for that one seam.

---

# PART 1 — Safe single-home cleanups (no behaviour change)

## Task 1: Delete the dead vocabulary re-export shim in `@hexagram/readout`

The review confirmed `MOVING_ARROW`, `STATIC_GAP`, `POSITION_LABELS` are forwarded by `cli/readout/src/index.ts` but **no consumer imports them via `@hexagram/readout`** (playground + serializers import them straight from `@hexagram/consultation-view`). The two casting-table helpers in the same block (`castingTableActiveRow`, `castingTableFollowRow`) ARE live (`cli/casting-ui/src/viewer.tsx` imports them via readout) — keep those.

**Files:**
- Modify: `cli/readout/src/index.ts:29-39`

- [ ] **Step 1: Prove the three constants are dead via readout**

Run:
```bash
grep -rn "from '@hexagram/readout'" cli apps --include=*.ts --include=*.tsx -A6 \
  | grep -E "MOVING_ARROW|STATIC_GAP|POSITION_LABELS"
```
Expected: **no output** (nobody pulls those three from readout).

- [ ] **Step 2: Edit the re-export block to keep only the live helpers**

Replace `cli/readout/src/index.ts:29-39` with:
```ts
// Casting-table row geometry helpers, re-exported from their canonical home
// (@hexagram/consultation-view) so the viewer's auto-follow scroll keeps
// resolving them via @hexagram/readout.
export {
  castingTableActiveRow,
  castingTableFollowRow,
} from '@hexagram/consultation-view'
```

- [ ] **Step 3: Type-check readout and the viewer that uses the helpers**

Run:
```bash
pnpm --filter @hexagram/readout --filter @hexagram/casting-ui type:check
```
Expected: PASS (no missing-export errors).

- [ ] **Step 4: Parity gate**

Run the parity gate. Expected: green.

- [ ] **Step 5: Commit**

```bash
git add cli/readout/src/index.ts
git commit -m "refactor(readout): drop dead vocabulary re-export shim

MOVING_ARROW/STATIC_GAP/POSITION_LABELS were forwarded through the readout
barrel for consumers that no longer exist — every live importer reaches
them directly from @hexagram/consultation-view. Removing the vestigial
forward; the casting-table row helpers stay (the viewer still uses them).

https://claude.ai/code/session_01XP4ZHjCh2Z2rfQpSZ8BD6s"
```

---

## Task 2: Correct the stale rationale in the boundary-lint config

`dependency-cruiser.config.cjs:12-13` asserts "consultation-file depends on core only" — false since the IR slice (it now also depends on `consultation-view` and `text-layout`). The forbidden rule is still correct; only its explanatory comment lies.

**Files:**
- Modify: `dependency-cruiser.config.cjs:11-16`

- [ ] **Step 1: Confirm the comment is stale**

Run:
```bash
node -e "console.log(Object.keys(require('./domain/consultation-file/package.json').dependencies))"
```
Expected: includes `@hexagram/consultation-view`, `@hexagram/core`, `@hexagram/text-layout` — i.e. NOT "core only".

- [ ] **Step 2: Replace the stale sentence**

In `dependency-cruiser.config.cjs`, replace the comment paragraph that begins `// Today there are ZERO domain -> cli edges (core depends on nothing;` and ends `// future change inverts the arrow — not a detector of a current leak.` with:
```js
// Today there are ZERO domain -> cli edges: every domain package depends only
// on other domain packages (core/text-layout are leaves; consultation-view ->
// {core, text-layout}; consultation-file -> {core, consultation-view,
// text-layout}). So this rule passes green on introduction. It is a DRIFT
// GUARD that fails the build the moment a future change inverts the arrow —
// not a detector of a current leak.
```

- [ ] **Step 3: Verify the guard still runs and is green**

Run:
```bash
pnpm boundaries:check
```
Expected: `✔ no dependency violations found`.

- [ ] **Step 4: Commit**

```bash
git add dependency-cruiser.config.cjs
git commit -m "docs(boundaries): correct stale dependency note in cruiser config

The comment claimed consultation-file 'depends on core only'; since the
consultation-view IR slice it also depends on consultation-view and
text-layout. The forbidden domain->cli rule is unchanged; only the prose
described a graph the code had outgrown.

https://claude.ai/code/session_01XP4ZHjCh2Z2rfQpSZ8BD6s"
```

---

## Task 3: Relocate `parseIntFlag` to `@hexagram/viewer-core` and collapse the banner clone

`cli/shell/src/banner-flag.ts:23` re-implements the exact loop of `parseIntFlag` (`cli/casting-ui/src/utils-mode.ts:99`). The generic flag parser belongs in `@hexagram/viewer-core` — both `casting-ui` and `shell` already depend on it, so neither has to reach sideways. After the move, casting-ui's `parse*Ms`/`parseWrapWidth` wrappers and shell's `parseBannerIntervalMs` all delegate to one body.

**Files:**
- Create: `cli/viewer-core/src/parse-int-flag.ts`
- Create: `cli/viewer-core/tests/parse-int-flag.test.ts`
- Modify: `cli/viewer-core/src/index.ts` (add export)
- Modify: `cli/casting-ui/src/utils-mode.ts:99-119` (delete local body, import from viewer-core)
- Modify: `cli/shell/src/banner-flag.ts` (delegate)

- [ ] **Step 1: Write the failing test for the relocated parser**

Create `cli/viewer-core/tests/parse-int-flag.test.ts`:
```ts
import { describe, expect, it } from 'vitest'

import { parseIntFlag } from '../src/parse-int-flag.js'

describe('parseIntFlag', () => {
  it('reads `--flag <n>` (space form)', () => {
    expect(parseIntFlag(['--flag', '42'], '--flag', 7)).toBe(42)
  })
  it('reads `--flag=<n>` (equals form)', () => {
    expect(parseIntFlag(['--flag=42'], '--flag', 7)).toBe(42)
  })
  it('falls back when absent', () => {
    expect(parseIntFlag(['--other', '1'], '--flag', 7)).toBe(7)
  })
  it('rejects non-positive-integer values, returning the fallback', () => {
    expect(parseIntFlag(['--flag', '0'], '--flag', 7)).toBe(7)
    expect(parseIntFlag(['--flag', '-3'], '--flag', 7)).toBe(7)
    expect(parseIntFlag(['--flag', 'x'], '--flag', 7)).toBe(7)
  })
  it('returns the first valid occurrence', () => {
    expect(parseIntFlag(['--flag', '5', '--flag', '9'], '--flag', 7)).toBe(5)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run:
```bash
pnpm --filter @hexagram/viewer-core test -- parse-int-flag
```
Expected: FAIL — `Cannot find module '../src/parse-int-flag.js'`.

- [ ] **Step 3: Create the module (body lifted verbatim from utils-mode.ts:99-119)**

Create `cli/viewer-core/src/parse-int-flag.ts`:
```ts
/**
 * Parse `--name <n>` / `--name=<n>` from `argv`, returning the first value that
 * parses to a positive integer; otherwise `fallback`. The single home for
 * positive-integer CLI flag parsing — every per-flag helper delegates here so
 * the matching rule (space form, `=` form, `/^\d+$/`, `> 0`) lives once.
 */
export function parseIntFlag(
  argv: readonly string[],
  name: string,
  fallback: number,
): number {
  const eq = `${name}=`
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    let value: string | undefined
    if (argument === name) {
      value = argv[index + 1]
    } else if (argument?.startsWith(eq) === true) {
      value = argument.slice(eq.length)
    }
    if (value !== undefined && /^\d+$/.test(value)) {
      const parsed = Number.parseInt(value, 10)
      if (parsed > 0) return parsed
    }
  }
  return fallback
}
```

- [ ] **Step 4: Export it from the viewer-core public API**

In `cli/viewer-core/src/index.ts`, add next to the other utility exports (e.g. after the `isInteractiveEnv` export on line 63):
```ts
export { parseIntFlag } from './parse-int-flag.js'
```

Then register the new entry source for the build. In `cli/viewer-core/tsdown.config.ts` confirm the single `./src/index.ts` entry already bundles it (it does — the file is reached via the index re-export; no config change needed). Verify:
```bash
grep -n "index.ts" cli/viewer-core/tsdown.config.ts
```
Expected: the existing `./src/index.ts` entry is present.

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
pnpm --filter @hexagram/viewer-core test -- parse-int-flag
```
Expected: PASS (5 tests).

- [ ] **Step 6: Point casting-ui's wrappers at the viewer-core body**

In `cli/casting-ui/src/utils-mode.ts`: delete the local `export function parseIntFlag(...) { ... }` (lines 99-119, the whole body including its doc comment) and add to the file's import block an import from viewer-core. Find the existing `@hexagram/viewer-core` import and add `parseIntFlag` to it; if there is none, add:
```ts
import { parseIntFlag } from '@hexagram/viewer-core'
```
Leave the `parseWrapWidth` / `parseSliderSweepMs` / `parseCastBounceMs` / `parseCastRevealMs` / `parseManualRevealMs` wrappers exactly as they are — they already call `parseIntFlag(...)`, now resolving to the imported one.

- [ ] **Step 7: Type-check + run casting-ui's flag tests**

Run:
```bash
pnpm --filter @hexagram/casting-ui type:check
pnpm --filter @hexagram/casting-ui test -- utils-mode
```
Expected: PASS. (If utils-mode re-exported `parseIntFlag` for tests, keep the re-export by changing its local definition into `export { parseIntFlag } from '@hexagram/viewer-core'` instead of a bare import — check first:)
```bash
grep -rn "parseIntFlag" cli/casting-ui/tests
```
If tests import `parseIntFlag` from `../src/utils-mode.js`, use the `export { parseIntFlag } from '@hexagram/viewer-core'` form in utils-mode.ts so the name still surfaces there.

- [ ] **Step 8: Collapse the shell banner-flag clone**

Replace the body of `parseBannerIntervalMs` in `cli/shell/src/banner-flag.ts` (the `for` loop, lines 23-38) so the function delegates. The final file's parser section becomes:
```ts
import process from 'node:process'

import { parseIntFlag } from '@hexagram/viewer-core'

import { DEFAULT_BANNER_INTERVAL_MS } from './banner-state.js'

export { DEFAULT_BANNER_INTERVAL_MS } from './banner-state.js'

const FLAG = '--banner-interval-ms'

/**
 * Parse `--banner-interval-ms <n>` / `--banner-interval-ms=<n>`. Pure — takes
 * `argv` explicitly for unit testing. Falls back to
 * `DEFAULT_BANNER_INTERVAL_MS` when the flag is absent or not a positive
 * integer. Delegates to the shared `parseIntFlag`.
 */
export function parseBannerIntervalMs(argv: readonly string[]): number {
  return parseIntFlag(argv, FLAG, DEFAULT_BANNER_INTERVAL_MS)
}

/**
 * Resolve `--banner-interval-ms` from the live `process.argv`. Thin wrapper —
 * production callers use this; tests call the pure parser with crafted argv.
 */
export function resolveBannerIntervalMs(): number {
  return parseBannerIntervalMs(process.argv.slice(2))
}
```
(Note `FLAG_PREFIX` is now unused — its deletion is included above.)

- [ ] **Step 9: Run shell's banner-flag tests + type-check**

Run:
```bash
pnpm --filter @hexagram/shell type:check
pnpm --filter @hexagram/shell test -- banner-flag
```
Expected: PASS (the existing `banner-flag.test.ts` cases still hold — behaviour is identical).

- [ ] **Step 10: Full boundary + parity gate**

Run:
```bash
pnpm boundaries:check
```
Expected: green (shell→viewer-core and casting-ui→viewer-core are pre-existing legal edges; no new cross edge). Then run the parity gate. Expected: green.

- [ ] **Step 11: Commit**

```bash
git add cli/viewer-core/src/parse-int-flag.ts cli/viewer-core/tests/parse-int-flag.test.ts \
        cli/viewer-core/src/index.ts cli/casting-ui/src/utils-mode.ts cli/shell/src/banner-flag.ts
git commit -m "refactor: home parseIntFlag in viewer-core; drop the banner clone

The positive-integer flag-parse rule lived twice: parseIntFlag in casting-ui
and a byte-identical loop in shell's banner-flag. Move the one body to
viewer-core (both packages already depend on it) and delegate both call sites.
One representation of the parse rule; no behaviour change.

https://claude.ai/code/session_01XP4ZHjCh2Z2rfQpSZ8BD6s"
```

---

## Task 4: Dedupe the line-glyph vocabulary — source banner glyphs from `LINE_GLYPH`

`cli/viewer-core/src/banner-lines.ts:38-41` holds `YANG_STATIC/YANG_MOVING/YIN_STATIC/YIN_MOVING` as byte-identical copies of `LINE_GLYPH[7|9|8|6]` (`domain/consultation-view/src/vocabulary.ts:8-13`). Source them from the single home. `viewer-core` already imports hexagram types from `@hexagram/core`; adding a `@hexagram/consultation-view` dependency for the glyph dictionary keeps the one vocabulary. (Trade-off: it couples viewer-core's banner derivation to the consultation domain. That is acceptable — `banner-lines.ts` is already hexagram-specific — and is preferable to a second glyph source. Recorded here so the reviewer sees the choice.)

**Files:**
- Modify: `cli/viewer-core/package.json` (add dependency)
- Modify: `cli/viewer-core/src/banner-lines.ts:37-41` (import instead of redeclare)
- Create: `cli/viewer-core/tests/banner-glyph-parity.test.ts` (lock the four mappings)

- [ ] **Step 1: Confirm the four values are byte-identical to LINE_GLYPH**

Run:
```bash
node -e "const {LINE_GLYPH}=require('./domain/consultation-view/dist/vocabulary.mjs'); console.log([LINE_GLYPH[7],LINE_GLYPH[9],LINE_GLYPH[8],LINE_GLYPH[6]])" 2>/dev/null \
  || grep -nE \"6: |7: |8: |9: \" domain/consultation-view/src/vocabulary.ts
```
Expected: `['━━━━━━━━━','━━━━○━━━━','━━━   ━━━','━━━ ✕ ━━━']` — matching YANG_STATIC/YANG_MOVING/YIN_STATIC/YIN_MOVING.

- [ ] **Step 2: Add the workspace dependency**

In `cli/viewer-core/package.json`, add to `dependencies`:
```json
"@hexagram/consultation-view": "workspace:*"
```
Then:
```bash
pnpm install --ignore-scripts
```

- [ ] **Step 3: Write a parity test that pins the mapping**

Create `cli/viewer-core/tests/banner-glyph-parity.test.ts`:
```ts
import { LINE_GLYPH } from '@hexagram/consultation-view'
import { describe, expect, it } from 'vitest'

import { deriveBannerLine } from '../src/banner-lines.js'

describe('banner glyphs are the single LINE_GLYPH vocabulary', () => {
  it('yang static/moving bars equal LINE_GLYPH[7]/[9]', () => {
    expect(deriveBannerLine('yang', false, false).bar).toBe(LINE_GLYPH[7])
    expect(deriveBannerLine('yang', true, false).bar).toBe(LINE_GLYPH[9])
  })
  it('yin static/moving bars equal LINE_GLYPH[8]/[6]', () => {
    expect(deriveBannerLine('yin', false, false).bar).toBe(LINE_GLYPH[8])
    expect(deriveBannerLine('yin', true, false).bar).toBe(LINE_GLYPH[6])
  })
})
```

- [ ] **Step 4: Run it to verify it passes against the CURRENT (duplicated) constants**

Run:
```bash
pnpm build --filter @hexagram/consultation-view
pnpm --filter @hexagram/viewer-core test -- banner-glyph-parity
```
Expected: PASS (the copies are byte-identical today — this test now guards the merge).

- [ ] **Step 5: Replace the redeclared constants with the imported dictionary**

In `cli/viewer-core/src/banner-lines.ts`, add to the imports:
```ts
import { LINE_GLYPH } from '@hexagram/consultation-view'
```
Delete lines 37-41 (the `// Fixed-width…` comment and the four `const YANG_*/YIN_*` declarations) and change `deriveBannerLine`'s returns (lines 62-73) to read from `LINE_GLYPH`:
```ts
  if (polarity === 'yang') {
    return {
      bar: moving ? LINE_GLYPH[9] : LINE_GLYPH[7],
      value: moving ? 9 : 7,
      role,
    }
  }
  return {
    bar: moving ? LINE_GLYPH[6] : LINE_GLYPH[8],
    value: moving ? 6 : 8,
    role,
  }
```

- [ ] **Step 6: Re-run parity + the existing banner-lines suite + type-check**

Run:
```bash
pnpm --filter @hexagram/viewer-core type:check
pnpm --filter @hexagram/viewer-core test -- banner
```
Expected: PASS (banner-glyph-parity + the existing `banner-lines.test.ts`).

- [ ] **Step 7: Boundary + parity gate**

Run:
```bash
pnpm boundaries:check
```
Expected: green (viewer-core→consultation-view is a legal cli→domain edge; no cycle — consultation-view depends only on core+text-layout). Then run the parity gate. Expected: green.

- [ ] **Step 8: Commit**

```bash
git add cli/viewer-core/package.json cli/viewer-core/src/banner-lines.ts \
        cli/viewer-core/tests/banner-glyph-parity.test.ts pnpm-lock.yaml
git commit -m "refactor(viewer-core): source banner bars from the LINE_GLYPH vocabulary

banner-lines redeclared the four line-glyph bars byte-identically to
consultation-view's LINE_GLYPH. Import the one dictionary instead; a parity
test pins the four mappings. The glyph vocabulary now has a single home.

https://claude.ai/code/session_01XP4ZHjCh2Z2rfQpSZ8BD6s"
```

---

## Task 5: Wire `boundaries:check` into CI

The drift guard exists but `.github/workflows/unit-test.yml` never runs it — it can go red unnoticed. Add it to the lint/type/format job.

**Files:**
- Modify: `.github/workflows/unit-test.yml`

- [ ] **Step 1: Read the current check job**

Run:
```bash
grep -nE "name:|run:" .github/workflows/unit-test.yml
```
Expected: a `check` job with Lint / Typecheck / Format check steps (around lines 28-35).

- [ ] **Step 2: Add a Boundaries step**

In `.github/workflows/unit-test.yml`, immediately after the `Lint` step (`run: pnpm run lint:check`), insert:
```yaml
      - name: Boundaries
        run: pnpm run boundaries:check
```

- [ ] **Step 3: Validate the YAML locally**

Run:
```bash
node -e "const y=require('js-yaml'); y.load(require('fs').readFileSync('.github/workflows/unit-test.yml','utf8')); console.log('yaml ok')"
```
Expected: `yaml ok`.

- [ ] **Step 4: Confirm the command it will run is green**

Run:
```bash
pnpm run boundaries:check
```
Expected: `✔ no dependency violations found`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/unit-test.yml
git commit -m "ci: run boundaries:check in the unit-test workflow

The domain->cli drift guard was only in the check:all/check:affected
aggregates, never in CI — it could go red without failing a PR. Add it to
the lint/type/format job.

https://claude.ai/code/session_01XP4ZHjCh2Z2rfQpSZ8BD6s"
```

---

# PART 2 — Boundary-respecting unifications (single home, no algorithm change)

## Task 6: Route raw `string-width` through one viewer-core terminal-width helper

The chrome's `string-width` (ANSI-aware) and `text-layout`'s `visualWidth` (ANSI-naive, for raw diagram text) are **different knowledge** — the boundary split is correct, so we do NOT merge them. The real seam is that 8 cli files import the `string-width` package directly instead of through `viewer-core`, the medium-bound home. Give viewer-core a named `terminalWidth` and repoint the raw imports; behaviour is identical (same underlying function). Then forbid raw `string-width` outside viewer-core with a cruiser rule.

**Files:**
- Modify: `cli/viewer-core/src/viewer-layout.ts` (export `terminalWidth`)
- Modify: `cli/viewer-core/src/index.ts` (re-export it)
- Modify (repoint imports → `terminalWidth`): `cli/readout/src/consultation-readout.tsx`, `cli/casting-ui/src/manual-diagram-bottom-strip.ts`, `cli/casting-ui/src/manual-diagram-flow.ts`, `cli/casting-ui/src/manual-diagram-heap-cards.ts`, `cli/casting-ui/src/manual-prompt.tsx`, `cli/casting-ui/src/slider-prompt.tsx`, `cli/casting-ui/src/viewer.tsx`
- Modify: `dependency-cruiser.config.cjs` (add `no-raw-string-width` rule)

- [ ] **Step 1: Inventory the raw imports (so none is missed)**

Run:
```bash
grep -rn "from 'string-width'" cli --include=*.ts --include=*.tsx | grep -v node_modules
```
Expected: `viewer-core/src/viewer-layout.ts` plus the seven src files listed above (tests may also appear — leave test files alone for now; the cruiser rule below excludes `tests/`).

- [ ] **Step 2: Export `terminalWidth` from viewer-core**

In `cli/viewer-core/src/viewer-layout.ts`, directly under the `import stringWidth from 'string-width'` line, add:
```ts
/**
 * Display width of a terminal string in columns. ANSI-aware: embedded SGR
 * escapes count as zero; wide CJK glyphs count as two. The single home for
 * rendered-string width in the CLI layer — components import this, never the
 * `string-width` package directly (raw imports are blocked by
 * `boundaries:check`). Distinct from @hexagram/text-layout's `visualWidth`,
 * which measures raw (ANSI-free) diagram text.
 */
export function terminalWidth(text: string): number {
  return stringWidth(text)
}
```
Then in `cli/viewer-core/src/index.ts`, add (near the other viewer-layout exports):
```ts
export { terminalWidth } from './viewer-layout.js'
```
Verify viewer-layout's existing helpers are already exported from the index:
```bash
grep -n "truncateEnd\|padEndToWidth\|truncateStart\|viewer-layout" cli/viewer-core/src/index.ts
```
If `terminalWidth` is the only new symbol, the single line above is sufficient.

- [ ] **Step 3: Repoint each consumer (import swap + call rename)**

In EACH of the seven consumer files: delete `import stringWidth from 'string-width'`, add `terminalWidth` to that file's existing `@hexagram/viewer-core` import (or add `import { terminalWidth } from '@hexagram/viewer-core'`), and replace every `stringWidth(` call with `terminalWidth(`. Do this mechanically per file, e.g. for `cli/casting-ui/src/manual-diagram-bottom-strip.ts`:
```bash
# illustration only — apply equivalent edits in each of the 7 files
# 1. remove:   import stringWidth from 'string-width'
# 2. ensure:   import { terminalWidth } from '@hexagram/viewer-core'
# 3. rename:   stringWidth( -> terminalWidth(
```
Confirm no stragglers in src:
```bash
grep -rn "stringWidth" cli/casting-ui/src cli/readout/src | grep -v node_modules
```
Expected: **no output** (every src call is now `terminalWidth`).

- [ ] **Step 4: Type-check the touched packages**

Run:
```bash
pnpm --filter @hexagram/viewer-core --filter @hexagram/readout --filter @hexagram/casting-ui type:check
```
Expected: PASS.

- [ ] **Step 5: Add the `no-raw-string-width` cruiser rule**

In `dependency-cruiser.config.cjs`, add a second entry to the `forbidden` array (after the existing `no-domain-to-cli` object):
```js
    {
      name: 'no-raw-string-width',
      comment:
        'Import rendered-string width via @hexagram/viewer-core (terminalWidth ' +
        'and the truncate/pad helpers), not the string-width package directly, ' +
        'so the CLI layer has one ANSI-aware width home. viewer-core itself is ' +
        'the wrapper and is exempt.',
      severity: 'error',
      from: { pathNot: '^cli/viewer-core/' },
      to: { path: 'node_modules/string-width' },
    },
```
(The config's `options.exclude` already drops `tests/` and `scripts/`, so test/script files are not cruised.)

- [ ] **Step 6: Run the boundary guard — it must catch nothing now**

Run:
```bash
pnpm boundaries:check
```
Expected: `✔ no dependency violations found` (all src consumers now go through viewer-core). If it reports a `no-raw-string-width` violation, a src file was missed in Step 3 — fix and re-run.

- [ ] **Step 7: Parity gate + manual/slider suites**

Run the parity gate, then:
```bash
pnpm --filter @hexagram/casting-ui test -- manual-diagram slider-prompt manual-prompt
```
Expected: green (identical function, identical widths — fixtures unchanged).

- [ ] **Step 8: Commit**

```bash
git add cli/viewer-core/src/viewer-layout.ts cli/viewer-core/src/index.ts \
        cli/readout/src/consultation-readout.tsx cli/casting-ui/src/manual-diagram-bottom-strip.ts \
        cli/casting-ui/src/manual-diagram-flow.ts cli/casting-ui/src/manual-diagram-heap-cards.ts \
        cli/casting-ui/src/manual-prompt.tsx cli/casting-ui/src/slider-prompt.tsx \
        cli/casting-ui/src/viewer.tsx dependency-cruiser.config.cjs
git commit -m "refactor: one ANSI-aware terminalWidth home in viewer-core

Eight cli files imported the string-width package directly. Route them
through viewer-core's terminalWidth (same function, ANSI-aware) so the CLI
layer has a single rendered-width home, and add a cruiser rule forbidding raw
string-width outside viewer-core. text-layout's visualWidth (raw diagram
width) is deliberately left distinct — different knowledge, different inputs.

https://claude.ai/code/session_01XP4ZHjCh2Z2rfQpSZ8BD6s"
```

---

## Task 7: De-duplicate the `'consultations'` directory-name literal (keep `chdir`)

Per the chosen approach, keep the `process.chdir` strategy untouched and remove only the duplicated `'consultations'` string literal (`domain/consultation-file/src/file.ts:36` and `apps/cli/src/workspace-root.ts:55`). Export one name constant from consultation-file and reuse it in both path builders.

**Files:**
- Modify: `domain/consultation-file/src/file.ts` (add constant, use it)
- Modify: `domain/consultation-file/src/index.ts` (export the constant)
- Modify: `apps/cli/src/workspace-root.ts` (import and use it)
- Modify: `domain/consultation-file/tests/file.test.ts` (assert via the constant)

- [ ] **Step 1: Add the name constant and use it in the default resolver**

In `domain/consultation-file/src/file.ts`, above `defaultConsultationsDir` (line 35), add:
```ts
/** The conventional consultations directory NAME — the single literal both the
 *  cwd-anchored default (here) and the app layer's repo-root anchor reuse, so
 *  the folder name is stated once. */
export const CONSULTATIONS_DIR_NAME = 'consultations'
```
Change the body of `defaultConsultationsDir` to:
```ts
export function defaultConsultationsDir(): string {
  return path.join(process.cwd(), CONSULTATIONS_DIR_NAME)
}
```

- [ ] **Step 2: Export the constant from the package public API**

In `domain/consultation-file/src/index.ts`, add `CONSULTATIONS_DIR_NAME` to the existing `export { ... } from './file.js'` list (alongside `defaultConsultationsDir`):
```bash
grep -n "defaultConsultationsDir" domain/consultation-file/src/index.ts
```
Add the name to that same export statement.

- [ ] **Step 3: Reuse the constant in the app-layer repo-root anchor**

In `apps/cli/src/workspace-root.ts`, add the import:
```ts
import { CONSULTATIONS_DIR_NAME } from '@hexagram/consultation-file'
```
Change `workspaceConsultationsDir`'s join (line 55) to:
```ts
  return path.join(workspaceRoot(moduleUrl), CONSULTATIONS_DIR_NAME)
```
(Leave `anchorCwdToWorkspaceRoot` and the chdir strategy exactly as they are.)

- [ ] **Step 4: Point the existing dir test at the constant**

In `domain/consultation-file/tests/file.test.ts`, the case asserting `defaultConsultationsDir()` equals `path.join(process.cwd(), 'consultations')` — change the literal to the constant so the test references the single home. Read the current test:
```bash
grep -n "consultations" domain/consultation-file/tests/file.test.ts
```
Replace the `'consultations'` literal in that assertion with an imported `CONSULTATIONS_DIR_NAME` (add it to the test's `@hexagram/consultation-file`/`../src/file.js` import).

- [ ] **Step 5: Type-check + run the affected suites**

Run:
```bash
pnpm --filter @hexagram/consultation-file --filter @hexagram/cli type:check
pnpm --filter @hexagram/consultation-file test -- file
pnpm --filter @hexagram/cli test -- workspace-root
```
Expected: PASS — `workspace-root.test.ts` still asserts the resolved dir ends in `consultations` and is not `apps/cli/consultations`.

- [ ] **Step 6: Boundary + parity gate**

Run `pnpm boundaries:check` (apps/cli→consultation-file is a pre-existing edge) and the parity gate. Expected: green.

- [ ] **Step 7: Commit**

```bash
git add domain/consultation-file/src/file.ts domain/consultation-file/src/index.ts \
        domain/consultation-file/tests/file.test.ts apps/cli/src/workspace-root.ts
git commit -m "refactor: state the consultations dir name once

The 'consultations' folder name was hardcoded in both the cwd-anchored
default (consultation-file) and the repo-root anchor (apps/cli). Export one
CONSULTATIONS_DIR_NAME constant and reuse it in both. The chdir bridge is
deliberately retained — only the duplicated literal is removed.

https://claude.ai/code/session_01XP4ZHjCh2Z2rfQpSZ8BD6s"
```

---

# PART 3 — The relocated fault line (S1): one diagram-row template

> **Scope note:** This is the largest change and the only one with real byte-output risk. It is structured as two independent, fully parity-gated tasks (transformation row; hexagram-diagram block), each shrinking the ANSI+Markdown duplication. Task 10 (converging the playground's third renderer) is the riskiest and lowest-yield; it is specified but **may be split into its own plan** if Tasks 8-9 already consume a review budget. Each task must keep the parity gate green WITHOUT regenerating fixtures — that green is the proof the bytes are unchanged.

The shared grammar (confirmed from `serialize-ansi.ts:191-238/240-282` and `serialize-markdown.ts:134-183`):
- **Transformation half-row:** `indent + value + "  " + glyph + "  " + position`, two halves joined by `MOVING_ARROW`/`STATIC_GAP`. ANSI wraps `value` and `glyph` each in colour+`NORMAL`; Markdown wraps nothing; position is never coloured in either.
- **Hexagram-diagram row:** `"  " + value + "  " + glyph + "  " + position + braceSuffix`. ANSI wraps the `value + "  " + glyph + "  "` chunk in colour+`NORMAL`; Markdown wraps nothing. `braceSuffix` is a fixed function of the top-down row index and the trigram imagery.

The template lives in `@hexagram/consultation-view` (medium-neutral) and exposes a `decorate` callback so the serializer injects its medium. No ANSI/Markdown enters the domain.

## Task 8: Shared transformation-row template

**Files:**
- Create: `domain/consultation-view/src/diagram-template.ts`
- Create: `domain/consultation-view/tests/diagram-template.test.ts`
- Modify: `domain/consultation-view/src/index.ts` (export the template)
- Modify: `cli/readout/src/serialize-ansi.ts:195-204` (consume it)
- Modify: `domain/consultation-file/src/serialize-markdown.ts:143-151` (consume it)

- [ ] **Step 1: Write the template's characterization test (locks both renderings)**

Create `domain/consultation-view/tests/diagram-template.test.ts`:
```ts
import { describe, expect, it } from 'vitest'

import { MOVING_ARROW, STATIC_GAP } from '../src/vocabulary.js'
import { transformationRow } from '../src/diagram-template.js'

const id = (t: string): string => t

describe('transformationRow', () => {
  it('plain (Markdown) form: indent, two-space separators, gap by moving', () => {
    const standing = { line: 9, position: 3, moving: true } as const
    const emerging = { line: 8, position: 3, moving: false } as const
    expect(transformationRow(standing, emerging, id, id)).toBe(
      `  9  ━━━━○━━━━  （三, 3rd）${MOVING_ARROW}8  ━━━   ━━━  （三, 3rd）`,
    )
  })

  it('static line uses STATIC_GAP', () => {
    const standing = { line: 7, position: 1, moving: false } as const
    const emerging = { line: 7, position: 1, moving: false } as const
    expect(transformationRow(standing, emerging, id, id)).toBe(
      `  7  ━━━━━━━━━  （初, 1st）${STATIC_GAP}7  ━━━━━━━━━  （初, 1st）`,
    )
  })

  it('decorate wraps value and glyph cells only (position untouched)', () => {
    const standing = { line: 9, position: 3, moving: true } as const
    const emerging = { line: 8, position: 3, moving: false } as const
    const wrap = (t: string): string => `<${t}>`
    expect(transformationRow(standing, emerging, wrap, wrap)).toBe(
      `  <9>  <━━━━○━━━━>  （三, 3rd）${MOVING_ARROW}<8>  <━━━   ━━━>  （三, 3rd）`,
    )
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run:
```bash
pnpm --filter @hexagram/consultation-view test -- diagram-template
```
Expected: FAIL — `Cannot find module '../src/diagram-template.js'`.

- [ ] **Step 3: Implement the template**

Create `domain/consultation-view/src/diagram-template.ts`:
```ts
import type { Line } from '@hexagram/core/types'

import type { DiagramLineRow } from './ir.js'
import {
  LINE_GLYPH,
  MOVING_ARROW,
  POSITION_LABELS,
  STATIC_GAP,
} from './vocabulary.js'

type PositionKey = keyof typeof POSITION_LABELS

/** A `decorate` injects the medium: Markdown passes identity; ANSI wraps the
 *  cell in colour + reset. It receives one already-stringified cell at a time.
 */
export type DecorateCell = (text: string) => string

/** One half of a transformation row: `indent + value + "  " + glyph + "  " +
 *  position`. The value and glyph cells pass through `decorate`; the position
 *  label never does (matches both legacy serializers). */
export function transformationHalfRow(
  cell: { line: Line; position: PositionKey },
  indent: string,
  decorate: DecorateCell,
): string {
  return (
    `${indent}${decorate(String(cell.line))}` +
    `  ${decorate(LINE_GLYPH[cell.line])}` +
    `  ${POSITION_LABELS[cell.position]}`
  )
}

/** A full transformation row: standing half (indent `"  "`) + connector
 *  (`MOVING_ARROW` when the standing line moves, else `STATIC_GAP`) + emerging
 *  half (no indent). Each side gets its own `decorate`. */
export function transformationRow(
  standing: DiagramLineRow,
  emerging: { line: Line; position: PositionKey },
  decorateStanding: DecorateCell,
  decorateEmerging: DecorateCell,
): string {
  const gap = standing.moving ? MOVING_ARROW : STATIC_GAP
  return (
    transformationHalfRow(standing, '  ', decorateStanding) +
    gap +
    transformationHalfRow(emerging, '', decorateEmerging)
  )
}
```
(If `DiagramLineRow`'s `position` type is not `keyof typeof POSITION_LABELS`, confirm with `grep -n "position" domain/consultation-view/src/ir.ts` and align the `PositionKey` cast.)

- [ ] **Step 4: Export from the package index and verify the test passes**

In `domain/consultation-view/src/index.ts` add:
```ts
export {
  transformationRow,
  transformationHalfRow,
  type DecorateCell,
} from './diagram-template.js'
```
Run:
```bash
pnpm --filter @hexagram/consultation-view test -- diagram-template
```
Expected: PASS (3 tests).

- [ ] **Step 5: Consume it in the ANSI serializer**

In `cli/readout/src/serialize-ansi.ts`, replace the `lineRows` map body (lines 195-204) with a call to the template, preserving the exact colours:
```ts
  const lineRows = rows
    .map(({ standing: s, emerging: e }) => {
      const standingColor = s.moving ? BOLD_RED : BOLD_WHITE
      return transformationRow(
        s,
        e,
        (t) => `${standingColor}${t}${NORMAL}`,
        (t) => `${BOLD_WHITE}${t}${NORMAL}`,
      )
    })
    .join('\n')
```
Add `transformationRow` to the file's `@hexagram/consultation-view` import. (`LINE_GLYPH`, `MOVING_ARROW`, `STATIC_GAP`, `POSITION_LABELS` may become unused here — remove them from this file's imports only if no longer referenced; `serializeHexagramAnsi` below still uses `LINE_GLYPH`/`POSITION_LABELS`, so keep those.)

- [ ] **Step 6: Consume it in the Markdown serializer**

In `domain/consultation-file/src/serialize-markdown.ts`, replace the `lineRows` map body (lines 143-151) with:
```ts
  const lineRows = rows
    .map(({ standing: s, emerging: e }) =>
      transformationRow(s, e, (t) => t, (t) => t),
    )
    .join('\n')
```
Add `transformationRow` to this file's `@hexagram/consultation-view` import.

- [ ] **Step 7: Type-check both serializer packages**

Run:
```bash
pnpm --filter @hexagram/readout --filter @hexagram/consultation-file type:check
```
Expected: PASS.

- [ ] **Step 8: PARITY GATE — bytes must be unchanged**

Run the parity gate (do NOT run `pnpm generate-fixtures`). Expected: green. A red here means the template diverged from a legacy byte — diff and fix the template, not the fixture.

- [ ] **Step 9: Commit**

```bash
git add domain/consultation-view/src/diagram-template.ts domain/consultation-view/src/index.ts \
        domain/consultation-view/tests/diagram-template.test.ts cli/readout/src/serialize-ansi.ts \
        domain/consultation-file/src/serialize-markdown.ts
git commit -m "refactor(consultation-view): one transformation-row template

The standing|gap|emerging row grammar was hand-assembled identically in the
ANSI and Markdown serializers. Move the skeleton into a medium-neutral
template that takes a decorate callback; each serializer injects its medium
(ANSI colour vs none). Byte-identity fixtures unchanged.

https://claude.ai/code/session_01XP4ZHjCh2Z2rfQpSZ8BD6s"
```

---

## Task 9: Shared hexagram-diagram-block template

**Files:**
- Modify: `domain/consultation-view/src/diagram-template.ts` (add block builder)
- Modify: `domain/consultation-view/tests/diagram-template.test.ts` (lock it)
- Modify: `cli/readout/src/serialize-ansi.ts:253-258` (consume it)
- Modify: `domain/consultation-file/src/serialize-markdown.ts:171-183` (consume it)

- [ ] **Step 1: Add a failing test for the block builder**

Append to `domain/consultation-view/tests/diagram-template.test.ts`:
```ts
import { hexagramDiagramRows } from '../src/diagram-template.js'

describe('hexagramDiagramRows', () => {
  const rows = [
    { line: 9, position: 6, moving: true },
    { line: 7, position: 5, moving: false },
    { line: 7, position: 4, moving: false },
    { line: 8, position: 3, moving: false },
    { line: 7, position: 2, moving: false },
    { line: 7, position: 1, moving: false },
  ] as const
  const identity = {
    upperTrigramImageryChinese: '天',
    upperTrigramImageryEnglish: 'Heaven',
    lowerTrigramImageryChinese: '澤',
    lowerTrigramImageryEnglish: 'Lake',
  }

  it('plain form: six brace rows with imagery on the middle rows', () => {
    const out = hexagramDiagramRows(rows, identity, (t) => t)
    expect(out).toEqual([
      '  9  ━━━━○━━━━  （上, 6th）──┐',
      '  7  ━━━━━━━━━  （五, 5th）──┼── 天（上卦）',
      '  7  ━━━━━━━━━  （四, 4th）──┘   Heaven (upper trigram)',
      '  8  ━━━   ━━━  （三, 3rd）──┐',
      '  7  ━━━━━━━━━  （二, 2nd）──┼── 澤（下卦）',
      '  7  ━━━━━━━━━  （初, 1st）──┘   Lake (lower trigram)',
    ])
  })

  it('decorate wraps the value+glyph chunk, not the position or brace', () => {
    const out = hexagramDiagramRows(rows, identity, (t) => `<${t}>`)
    expect(out[0]).toBe('  <9  ━━━━○━━━━  >（上, 6th）──┐')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run:
```bash
pnpm --filter @hexagram/consultation-view test -- diagram-template
```
Expected: FAIL — `hexagramDiagramRows` is not exported.

- [ ] **Step 3: Implement the block builder**

Append to `domain/consultation-view/src/diagram-template.ts`:
```ts
/** The trigram-imagery identity fields the diagram braces interpolate. */
export interface DiagramImagery {
  readonly upperTrigramImageryChinese: string
  readonly upperTrigramImageryEnglish: string
  readonly lowerTrigramImageryChinese: string
  readonly lowerTrigramImageryEnglish: string
}

// Brace suffix per top-down row index (0 = top / position 6). The imagery rows
// (1 and 4) interpolate the upper/lower trigram glosses; the rest are bare
// connectors. Byte-identical to the legacy ANSI + Markdown diagram blocks.
function braceSuffix(topIndex: number, im: DiagramImagery): string {
  switch (topIndex) {
    case 0:
      return '──┐'
    case 1:
      return `──┼── ${im.upperTrigramImageryChinese}（上卦）`
    case 2:
      return `──┘   ${im.upperTrigramImageryEnglish} (upper trigram)`
    case 3:
      return '──┐'
    case 4:
      return `──┼── ${im.lowerTrigramImageryChinese}（下卦）`
    default:
      return `──┘   ${im.lowerTrigramImageryEnglish} (lower trigram)`
  }
}

/** Like `DecorateCell` but also receives the row, because the ANSI hexagram
 *  block colours the value/glyph chunk by THAT row's `moving` flag. Markdown
 *  ignores the row and passes the chunk through. */
export type DecorateRow = (chunk: string, row: DiagramLineRow) => string

/** The six hexagram-diagram rows, top-first (position 6 → 1). Each row is
 *  `"  " + decorate(value + "  " + glyph + "  ") + position + braceSuffix`.
 *  `decorate` wraps the value/glyph chunk (ANSI colour, by row) or passes it
 *  through (Markdown); the position label and brace are never decorated. */
export function hexagramDiagramRows(
  rows: readonly DiagramLineRow[],
  imagery: DiagramImagery,
  decorate: DecorateRow,
): string[] {
  return rows.map((row, topIndex) => {
    const chunk = `${row.line}  ${LINE_GLYPH[row.line]}  `
    const pos = POSITION_LABELS[row.position as PositionKey]
    return `  ${decorate(chunk, row)}${pos}${braceSuffix(topIndex, imagery)}`
  })
}
```

The Step 1 test's unary callbacks (`(t) => t`, `(t) => `<${t}>``) remain valid — a
unary function is assignable to `DecorateRow` (the extra `row` arg is ignored).

- [ ] **Step 4: Export + verify the test passes**

In `domain/consultation-view/src/index.ts`, extend the diagram-template export to include `hexagramDiagramRows`, `type DiagramImagery`, and `type DecorateRow`. Run:
```bash
pnpm --filter @hexagram/consultation-view test -- diagram-template
```
Expected: PASS (all transformation + block cases).

- [ ] **Step 5: Consume it in the ANSI serializer**

In `cli/readout/src/serialize-ansi.ts`, the `serializeHexagramAnsi` diagram block currently spells out six template literals (lines 253-258), each coloured per-row by `colorOf(r#!.moving)`. The `DecorateRow` signature (Step 3) carries the row, so the per-row colour is preserved. Just above the `return` template, add:
```ts
  const diagram = hexagramDiagramRows(
    section.rows,
    id,
    (chunk, row) => `${colorOf(row.moving)}${chunk}${NORMAL}`,
  ).join('\n')
```
Then replace the six literal rows in the `return` template (lines 253-258) with `${diagram}`. Add `hexagramDiagramRows` to the file's `@hexagram/consultation-view` import.

- [ ] **Step 6: Consume it in the Markdown serializer**

In `domain/consultation-file/src/serialize-markdown.ts`, replace the body of `hexagramDiagramBlockMarkdown` (lines 171-183) with:
```ts
function hexagramDiagramBlockMarkdown(section: HexagramSection): string {
  return hexagramDiagramRows(section.rows, section.identity, (chunk) => chunk).join(
    '\n',
  )
}
```
Add `hexagramDiagramRows` to this file's `@hexagram/consultation-view` import. (`section.identity` carries the four imagery fields; confirm with `grep -n "TrigramImagery" domain/consultation-view/src/ir.ts`.)

- [ ] **Step 7: Type-check both packages**

Run:
```bash
pnpm --filter @hexagram/readout --filter @hexagram/consultation-file type:check
```
Expected: PASS.

- [ ] **Step 8: PARITY GATE**

Run the parity gate (no fixture regen). Expected: green. Red == a brace/space/imagery byte drifted — fix the template.

- [ ] **Step 9: Commit**

```bash
git add domain/consultation-view/src/diagram-template.ts domain/consultation-view/src/index.ts \
        domain/consultation-view/tests/diagram-template.test.ts cli/readout/src/serialize-ansi.ts \
        domain/consultation-file/src/serialize-markdown.ts
git commit -m "refactor(consultation-view): one hexagram-diagram-block template

The six brace rows (──┐ / ──┼── imagery / ──┘) were spelled out identically
in the ANSI and Markdown serializers. Generate them from a medium-neutral
template with a per-row decorate callback. Byte-identity fixtures unchanged.

https://claude.ai/code/session_01XP4ZHjCh2Z2rfQpSZ8BD6s"
```

---

## Task 10 (optional / may split out): Converge the playground onto the transformation template

The playground's `buildLineRow` (`cli/playground-ui/src/playground-display-rows.ts:63-107`) is the third assembler of the standing|gap|emerging row. It differs structurally — it sources glyphs via `deriveBannerLine` (now LINE_GLYPH-backed after Task 4), adds a focus chevron, a "ghost mirror" colour scheme, and pads to `TOP_HALF_WIDTH`. Its output is guarded by `top-half-width-invariant.test.ts`, not the consultation fixtures, so the yield is lower and the risk profile is different.

> **Recommendation:** implement only if Tasks 8-9 landed cleanly and review budget remains. Otherwise spin this into its own plan via `superpowers:writing-plans`, because converging it safely needs its own design pass (the chevron/padding/ghost-colour concerns must be layered on top of `transformationHalfRow` without disturbing the width invariant).

- [ ] **Step 1: Characterize the current playground row output**

Run:
```bash
pnpm --filter @hexagram/playground-ui test -- top-half-width-invariant playground-display
```
Expected: green — capture this as the baseline the convergence must preserve.

- [ ] **Step 2: Refactor `buildLineRow` to compose `transformationHalfRow`**

Rewrite the left/right cell construction in `buildLineRow` so each half calls `transformationHalfRow({ line: cells.value, position }, indent, decorate)` where `decorate` applies the playground's per-column colour (`standingColor`/`emergingColor`), and the chevron + `padRightToWidth(..., TOP_HALF_WIDTH)` wrap the composed row. The glyph the half-row emits (`LINE_GLYPH[cells.value]`) must equal `cells.bar` — true after Task 4 — so the bytes are preserved. (Add `@hexagram/consultation-view`'s `transformationHalfRow` to the import; the package dependency already exists.)

- [ ] **Step 3: Run the playground width invariant + display suites**

Run:
```bash
pnpm --filter @hexagram/playground-ui type:check
pnpm --filter @hexagram/playground-ui test
```
Expected: green — `top-half-width-invariant.test.ts` unchanged, display snapshots unchanged.

- [ ] **Step 4: Commit**

```bash
git add cli/playground-ui/src/playground-display-rows.ts
git commit -m "refactor(playground): compose the shared transformation half-row

buildLineRow was the third independent assembler of the standing|emerging
row grammar. Compose consultation-view's transformationHalfRow for the cell
skeleton, keeping the playground's chevron/ghost-colour/width-pad on top. The
top-half width invariant and display output are unchanged.

https://claude.ai/code/session_01XP4ZHjCh2Z2rfQpSZ8BD6s"
```

---

## Final verification (after all tasks)

- [ ] **Run the full gate**

```bash
pnpm boundaries:check
pnpm build
pnpm --filter @hexagram/consultation-view --filter @hexagram/readout \
     --filter @hexagram/consultation-file --filter @hexagram/casting-ui \
     --filter @hexagram/viewer-core --filter @hexagram/shell \
     --filter @hexagram/playground-ui --filter @hexagram/cli test
pnpm type:check
pnpm lint:check
pnpm format:check
```
Expected: all green. The byte-identity fixtures passing WITHOUT any `pnpm generate-fixtures` run is the proof that every behaviour-touching task preserved output exactly.

- [ ] **Confirm the seams are closed (grep checks)**

```bash
# one glyph vocabulary:
grep -rn "YANG_MOVING\|YIN_MOVING" cli/viewer-core/src && echo "FAIL: copy survives" || echo "ok: banner sources LINE_GLYPH"
# one flag parser:
grep -rn "for (let index" cli/shell/src/banner-flag.ts && echo "FAIL: clone survives" || echo "ok: banner-flag delegates"
# no raw string-width in cli src outside viewer-core:
grep -rn "from 'string-width'" cli --include=*.ts --include=*.tsx | grep -v viewer-core | grep -v tests && echo "FAIL" || echo "ok: terminalWidth is the one home"
# one consultations name literal in path builders:
grep -rn "'consultations'" domain/consultation-file/src apps/cli/src | grep -v CONSULTATIONS_DIR_NAME
# transformation/hex row grammar single-homed:
grep -rn "LINE_GLYPH\[s.line\]\|──┼──" cli/readout/src domain/consultation-file/src && echo "check: should only be the template now"
```
Expected: each prints `ok` (or, for the last two, only template-internal references remain).
