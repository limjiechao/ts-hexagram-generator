# Round-3 Seam Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close four conceptual-integrity seams surfaced by the round-3 review — the triplicated ANSI-strip regex (A), the forked non-interactive refusal (B), the inline emerging-gate + fixture literal (C/E), and the duplicated casting-ledger assembly (D) — without changing any observable output.

**Architecture:** Four risk-ordered parts. Parts 1–3 are mechanical single-home moves with no byte-output risk. Part 4 lifts the casting-ledger assembly into one medium-neutral `ledgerBlock` in `@hexagram/consultation-view` that the ANSI and Markdown serializers consume via a `LedgerStyle` strategy object — the same decorate-callback pattern the existing `transformationRow` template uses. Every output-touching change is gated by the existing byte-identity fixture suites: green WITHOUT `pnpm generate-fixtures` is the proof bytes are unchanged.

**Tech Stack:** TypeScript, Turborepo + pnpm workspaces, vitest, tsdown, dependency-cruiser, Ink/React.

**Spec:** `docs/superpowers/specs/2026-06-06-round3-seam-remediation-design.md`

---

## Before you start (one-time)

- [ ] **Environment is built and green.** A fresh clone needs deps + a build before cross-package `source` resolution works under vitest. **Node ≥24.6 is required** (the repo's engine floor; vitest resolves the `source` export condition).

Run:
```bash
node --version          # must be >= 24.6.0
pnpm install --ignore-scripts
pnpm build
pnpm boundaries:check
```
Expected: install completes; build = `12 successful`; boundaries:check = `✔ no dependency violations found`.

**The parity gate** (referenced throughout):
```bash
pnpm --filter @hexagram/consultation-view --filter @hexagram/readout \
     --filter @hexagram/consultation-file --filter @hexagram/casting-ui test
```
These suites pin the `.md` body and `--plain` stdout byte-for-byte. For any output-touching task, "byte-identical preserved" == "this command stays green WITHOUT regenerating fixtures".

---

# PART 1 — Trivial single-home cleanups (C + E)

## Task 1: Call `hasMovingLines` in build-view instead of re-rolling it

`domain/consultation-view/src/build-view.ts:181` computes `hexagram.some(isMovingLine)` inline, duplicating core's single-homed `hasMovingLines` (`domain/core/src/line-semantics.ts:38`).

**Files:**
- Modify: `domain/consultation-view/src/build-view.ts`

- [ ] **Step 1: Inspect the current import + use site**

Run:
```bash
grep -n "isMovingLine\|hasMovingLines\|line-semantics" domain/consultation-view/src/build-view.ts
```
Expected: an import of `isMovingLine` from `@hexagram/core/line-semantics` and the inline `hexagram.some(isMovingLine)` at ~line 181.

- [ ] **Step 2: Add `hasMovingLines` to the import**

In `domain/consultation-view/src/build-view.ts`, change the `@hexagram/core/line-semantics` import to include `hasMovingLines`. If the line reads `import { isMovingLine } from '@hexagram/core/line-semantics'`, and `isMovingLine` is still used elsewhere in the file, make it:
```ts
import { hasMovingLines, isMovingLine } from '@hexagram/core/line-semantics'
```
If `isMovingLine` is NOT used anywhere else after Step 3, make it:
```ts
import { hasMovingLines } from '@hexagram/core/line-semantics'
```
Check first:
```bash
grep -n "isMovingLine" domain/consultation-view/src/build-view.ts
```

- [ ] **Step 3: Replace the inline derivation**

Change the line:
```ts
  const hasMovingLines = hexagram.some(isMovingLine)
```
to:
```ts
  const hasMovingLines = hasMovingLines(hexagram)
```
**Wait — that shadows the name.** Rename the local to avoid the self-reference:
```ts
  const moving = hasMovingLines(hexagram)
```
Then update the two downstream uses in the same function (the `body: hasMovingLines ? ...` at ~line 191, the `if (hasMovingLines)` at ~line 220, and the returned `{ sections, hasMovingLines }` at ~line 238) to use `moving`, with the return shorthand expanded:
```bash
grep -n "hasMovingLines" domain/consultation-view/src/build-view.ts
```
Replace each local reference with `moving`, and the return becomes `{ sections, hasMovingLines: moving }`.

- [ ] **Step 4: Type-check**

Run:
```bash
pnpm --filter @hexagram/consultation-view type:check
```
Expected: PASS (no unused-import error, no shadow).

- [ ] **Step 5: Parity gate**

Run the parity gate. Expected: green (same predicate, same result).

- [ ] **Step 6: Commit**

```bash
git add domain/consultation-view/src/build-view.ts
git commit -m "refactor(consultation-view): call core hasMovingLines in build-view

build-view re-rolled hexagram.some(isMovingLine) inline though core already
exports the named hasMovingLines one import away. Use the single-homed
predicate. No behaviour change.

https://claude.ai/code/session_01SRPWuc5XHteFHccobxwAv7"
```

---

## Task 2: Use `isMovingLine` in the fixture generator instead of the `6||9` literal

`cli/casting-ui/scripts/generate-fixtures.ts:35` hardcodes `line === 6 || line === 9`, re-literalizing the predicate `isMovingLine` owns.

**Files:**
- Modify: `cli/casting-ui/scripts/generate-fixtures.ts`

- [ ] **Step 1: Inspect the line**

Run:
```bash
grep -n "line === 6\|isMovingLine\|line-semantics" cli/casting-ui/scripts/generate-fixtures.ts
```
Expected: `const hasMovingLines = hexagram.some((line) => line === 6 || line === 9)` at ~line 35; likely no existing import of `isMovingLine`.

- [ ] **Step 2: Add the import**

At the top of `cli/casting-ui/scripts/generate-fixtures.ts`, with the other `@hexagram/core` imports, add:
```ts
import { isMovingLine } from '@hexagram/core/line-semantics'
```

- [ ] **Step 3: Replace the literal**

Change:
```ts
  const hasMovingLines = hexagram.some((line) => line === 6 || line === 9)
```
to:
```ts
  const hasMovingLines = hexagram.some(isMovingLine)
```

- [ ] **Step 4: Type-check + dry-run the generator (must NOT change fixtures)**

Run:
```bash
pnpm --filter @hexagram/casting-ui type:check
pnpm generate-fixtures
git status --short
```
Expected: type:check PASS; `git status` shows **no modified fixture files** (the predicate is identical, so the generated bytes are unchanged). If any fixture changed, STOP — the literal and `isMovingLine` disagree, which is itself a finding; investigate before continuing.

- [ ] **Step 5: Commit**

```bash
git add cli/casting-ui/scripts/generate-fixtures.ts
git commit -m "refactor(casting-ui): derive fixture moving-lines from isMovingLine

The fixture generator hardcoded line === 6 || line === 9 — the exact rule
isMovingLine owns. Use the predicate so the generator can never drift from
the runtime definition. Generated fixtures unchanged.

https://claude.ai/code/session_01SRPWuc5XHteFHccobxwAv7"
```

---

# PART 2 — One ANSI-strip home (A)

## Task 3: Route both local `ANSI_PATTERN` copies through viewer-core

`cli/viewer-core/src/viewer-layout.ts:48` exports the canonical `ANSI_PATTERN`/`stripAnsi` (already re-exported from `@hexagram/viewer-core`). Two cli files re-roll it: `cli/casting-ui/src/viewer-flow.ts:100` (identical) and `cli/playground-ui/src/playground-display-text.ts:8` (`/\[[0-9;]*m/g` — **missing the `` ESC anchor**, a latent bug). Both packages already depend on viewer-core.

**Files:**
- Modify: `cli/casting-ui/src/viewer-flow.ts`
- Modify: `cli/playground-ui/src/playground-display-text.ts`

- [ ] **Step 1: Confirm the canonical export exists**

Run:
```bash
grep -n "ANSI_PATTERN\|stripAnsi" cli/viewer-core/src/index.ts
```
Expected: both `ANSI_PATTERN` and `stripAnsi` are exported (from `./viewer-layout.js`).

- [ ] **Step 2: Repoint casting-ui's viewer-flow**

In `cli/casting-ui/src/viewer-flow.ts`: delete the local definition (the comment block at ~lines 96-99, the `oxlint-disable-next-line no-control-regex`, and `const ANSI_PATTERN: RegExp = /\[[0-9;]*m/g` at ~line 100). Add `ANSI_PATTERN` to the file's existing `@hexagram/viewer-core` import (or add `import { ANSI_PATTERN } from '@hexagram/viewer-core'`). The use site at `extractQueryText` (`querySection.replaceAll(ANSI_PATTERN, '')`, ~line 110) is unchanged — it now resolves to the imported pattern.

Check the import block first:
```bash
grep -n "from '@hexagram/viewer-core'" cli/casting-ui/src/viewer-flow.ts
```

- [ ] **Step 3: Repoint playground's display-text (fixes the weaker regex)**

In `cli/playground-ui/src/playground-display-text.ts`: delete `const ANSI_PATTERN = /\[[0-9;]*m/g` (line 8). Add the import:
```ts
import { stripAnsi } from '@hexagram/viewer-core'
```
Change `plainVisualWidth` (lines 10-12) to use the shared stripper, keeping `visualWidth` (text-layout) as the width engine — do NOT switch to `terminalWidth`:
```ts
export function plainVisualWidth(text: string): number {
  return visualWidth(stripAnsi(text))
}
```

- [ ] **Step 4: Type-check both packages**

Run:
```bash
pnpm --filter @hexagram/casting-ui --filter @hexagram/playground-ui type:check
```
Expected: PASS.

- [ ] **Step 5: Run the playground width invariant + the viewer-flow tests**

Run:
```bash
pnpm --filter @hexagram/playground-ui test
pnpm --filter @hexagram/casting-ui test -- viewer-flow
```
Expected: green — `top-half-width-invariant.test.ts` unchanged (no identity string contains a bare `[Nm` sequence, so the stricter regex measures identically). If the width invariant fails, the playground was relying on the weaker strip — STOP and surface it; do not loosen the shared pattern.

- [ ] **Step 6: Confirm no local copies remain + boundary guard**

Run:
```bash
grep -rn "ANSI_PATTERN *[:=]" cli/casting-ui/src cli/playground-ui/src
pnpm boundaries:check
```
Expected: first grep prints nothing (no local definitions remain — only imports); boundaries:check green (both packages already depend on viewer-core).

- [ ] **Step 7: Parity gate**

Run the parity gate. Expected: green.

- [ ] **Step 8: Commit**

```bash
git add cli/casting-ui/src/viewer-flow.ts cli/playground-ui/src/playground-display-text.ts
git commit -m "refactor: one ANSI-strip pattern home in viewer-core

viewer-flow and playground-display-text each re-rolled ANSI_PATTERN; the
playground copy was missing the ESC anchor (/\\[[0-9;]*m/g) and would strip a
literal [0m in plain text. Import the canonical stripAnsi/ANSI_PATTERN from
viewer-core. Behaviour preserved (no identity string carries a bare [Nm).

https://claude.ai/code/session_01SRPWuc5XHteFHccobxwAv7"
```

---

# PART 3 — One refusal contract (B)

## Task 4: Add `warnIfNonInteractive` + `liveSnapshot` to env-policy; collapse the message + snapshot copies

The refusal message is authored 3× and the live-env snapshot literal is authored 3× (`env-policy.ts`'s `refuseIfNonInteractive`, `run-hexagram.tsx`, `run-playground-app.ts`). Introduce one boolean guard and one snapshot helper; keep `process.exit` confined to `refuseIfNonInteractive` (the app-bin wrapper).

**Files:**
- Modify: `cli/viewer-core/src/env-policy.ts`
- Modify: `cli/viewer-core/src/index.ts`
- Modify: `cli/viewer-core/tests/env-policy.test.ts`
- Modify: `cli/shell/src/run-hexagram.tsx`
- Modify: `cli/playground-ui/src/run-playground-app.ts`

- [ ] **Step 1: Write the failing tests for `warnIfNonInteractive`**

In `cli/viewer-core/tests/env-policy.test.ts`, add `warnIfNonInteractive` to the import from `../src/env-policy.js`, and append a new describe block:
```ts
describe('warnIfNonInteractive', () => {
  test('interactive env -> returns true, writes nothing', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    const result = warnIfNonInteractive('hexagram', {
      isTTY: true,
      NO_COLOR: undefined,
      CI: undefined,
    })
    expect(result).toBe(true)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('non-interactive env -> returns false, writes the bin-named message', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    const result = warnIfNonInteractive('hexagram-playground', {
      isTTY: false,
      NO_COLOR: undefined,
      CI: undefined,
    })
    expect(result).toBe(false)
    expect(spy).toHaveBeenCalledWith(
      'hexagram-playground requires an interactive terminal\n',
    )
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run:
```bash
pnpm --filter @hexagram/viewer-core test -- env-policy
```
Expected: FAIL — `warnIfNonInteractive` is not exported.

- [ ] **Step 3: Implement `liveSnapshot` + `warnIfNonInteractive`; delegate `refuseIfNonInteractive`**

In `cli/viewer-core/src/env-policy.ts`, replace the existing `refuseIfNonInteractive` function (lines 49-68) with:
```ts
/** The live environment snapshot from `process` — the single reading both the
 *  boolean guard and the run-entries use, so the snapshot shape lives once. */
export function liveSnapshot(): EnvSnapshot {
  return {
    isTTY: Boolean(process.stdout.isTTY),
    NO_COLOR: process.env.NO_COLOR,
    CI: process.env.CI,
  }
}

/**
 * Warn (to stderr) and report whether the environment is interactive enough to
 * mount an Ink UI. The SINGLE home for the refusal message. It never exits —
 * callers decide. `env` defaults to the live snapshot; tests inject one to
 * reach the refusal branch.
 *
 * Returns true when interactive (caller proceeds); false after writing
 * `<binName> requires an interactive terminal` (caller refuses).
 */
export function warnIfNonInteractive(
  binName: string,
  env: EnvSnapshot = liveSnapshot(),
): boolean {
  if (classifyEnv(env).interactive) return true
  process.stderr.write(`${binName} requires an interactive terminal\n`)
  return false
}

/**
 * Refuse a non-interactive environment by warning and exiting 1. Thin wrapper
 * over `warnIfNonInteractive`; the `process.exit` lives at this app-boundary
 * helper so the app bins stay one-liners while the library run-entries use the
 * boolean form. `binName` is the FULL bin name (e.g. `hexagram-history`).
 */
export function refuseIfNonInteractive(binName: string): void {
  if (!warnIfNonInteractive(binName)) process.exit(1)
}
```

- [ ] **Step 4: Export the new symbols from the package API**

In `cli/viewer-core/src/index.ts`, extend the env-policy export block (lines 32-37) to add `liveSnapshot` and `warnIfNonInteractive`:
```ts
export {
  classifyEnv,
  liveSnapshot,
  refuseIfNonInteractive,
  warnIfNonInteractive,
  type EnvPolicy,
  type EnvSnapshot,
} from './env-policy.js'
```

- [ ] **Step 5: Run the env-policy tests to verify they pass**

Run:
```bash
pnpm --filter @hexagram/viewer-core type:check
pnpm --filter @hexagram/viewer-core test -- env-policy
```
Expected: PASS (the new describe block + the existing `classifyEnv` / `refuseIfNonInteractive` tests).

- [ ] **Step 6: Repoint run-hexagram**

In `cli/shell/src/run-hexagram.tsx`:
1. Delete the `NON_INTERACTIVE_MESSAGE` constant (lines 31-32, including its doc comment).
2. Change the `@hexagram/viewer-core` import (line 21) from `{ classifyEnv, type EnvSnapshot }` to `{ liveSnapshot, warnIfNonInteractive, type EnvSnapshot }`.
3. Replace the snapshot + guard (lines 56-64) with:
```ts
  const snapshot: EnvSnapshot = env ?? liveSnapshot()
  if (!warnIfNonInteractive('hexagram', snapshot)) return false
```

- [ ] **Step 7: Repoint run-playground-app**

In `cli/playground-ui/src/run-playground-app.ts`:
1. Delete the `NON_INTERACTIVE_MESSAGE` constant (lines 15-17, including its doc comment).
2. Change the import (line 9) from `{ classifyEnv, type EnvSnapshot }` to `{ liveSnapshot, warnIfNonInteractive, type EnvSnapshot }`.
3. Replace the snapshot + guard (lines 32-42, the `const snapshot = env ?? {...}` through the `return false` block) with:
```ts
  // `env` defaults to the live snapshot; tests inject one to reach refusal.
  const snapshot: EnvSnapshot = env ?? liveSnapshot()
  if (!warnIfNonInteractive('hexagram-playground', snapshot)) return false
```

- [ ] **Step 8: Type-check + run the run-entry refusal tests**

Run:
```bash
pnpm --filter @hexagram/shell --filter @hexagram/playground-ui type:check
pnpm --filter @hexagram/shell test -- run-hexagram
pnpm --filter @hexagram/playground-ui test -- run-playground
```
Expected: PASS — the existing refusal-branch tests (which inject a non-TTY snapshot and assert `false` + the stderr message) still hold; the message text is byte-identical.

If a test asserts the message via the deleted `NON_INTERACTIVE_MESSAGE` export, point it at the literal string `'hexagram requires an interactive terminal\n'` / `'hexagram-playground requires an interactive terminal\n'` instead. Check:
```bash
grep -rn "NON_INTERACTIVE_MESSAGE" cli/shell cli/playground-ui
```
Expected after fixes: no references outside git history.

- [ ] **Step 9: Confirm the message + snapshot now live once**

Run:
```bash
grep -rn "requires an interactive terminal" cli apps --include=*.ts --include=*.tsx | grep -v tests
grep -rn "isTTY: Boolean(process.stdout.isTTY)" cli --include=*.ts --include=*.tsx | grep -v tests
```
Expected: the message string appears ONLY in `cli/viewer-core/src/env-policy.ts`; the snapshot literal appears ONLY in `cli/viewer-core/src/env-policy.ts` (`liveSnapshot`).

- [ ] **Step 10: Boundary + parity gate**

Run:
```bash
pnpm boundaries:check
```
Expected: green (no new cross edges; shell + playground-ui already depend on viewer-core). Then run the parity gate. Expected: green.

- [ ] **Step 11: Commit**

```bash
git add cli/viewer-core/src/env-policy.ts cli/viewer-core/src/index.ts \
        cli/viewer-core/tests/env-policy.test.ts cli/shell/src/run-hexagram.tsx \
        cli/playground-ui/src/run-playground-app.ts
git commit -m "refactor: one non-interactive refusal contract

The refusal message and the live-env snapshot were each authored three times,
with enforcement forked exit(1) vs return-false. Add warnIfNonInteractive
(boolean, single message) and liveSnapshot to viewer-core; refuseIfNonInteractive
becomes its thin exit-wrapper so process.exit stays at the bin boundary while
the run-entries keep their testable boolean return. One message, one snapshot.

https://claude.ai/code/session_01SRPWuc5XHteFHccobxwAv7"
```

---

# PART 4 — One casting-ledger assembler (D)

> **Scope note:** This is the only part with byte-output risk. The transformation header/footer/divider is deliberately NOT touched (its two-column knowledge is already single-homed via `RIGHT_COLUMN`). The new `ledgerBlock` is lifted faithfully from the existing serializers; the EXISTING byte-identity fixtures are the real gate — green WITHOUT `pnpm generate-fixtures` proves the bytes are unchanged.

## Task 5: Create the medium-neutral `ledgerBlock` template

The casting-ledger assembly (banner-span math, gutter join, `═╪═`/`─┼─` rules, null→placeholder) is hand-written in parallel at `cli/readout/src/serialize-ansi.ts:52-159` and `domain/consultation-file/src/serialize-markdown.ts:40-125`. Move it into one template parameterized by a `LedgerStyle`.

**Files:**
- Create: `domain/consultation-view/src/ledger-template.ts`
- Create: `domain/consultation-view/tests/ledger-template.test.ts`
- Modify: `domain/consultation-view/src/index.ts` (export)

- [ ] **Step 1: Write the failing characterization test**

Create `domain/consultation-view/tests/ledger-template.test.ts`:
```ts
import { deriveSplit } from '@hexagram/core/casting-derivation'
import { describe, expect, it } from 'vitest'

import type { LedgerRow } from '../src/ir.js'
import { ledgerBlock, type LedgerStyle } from '../src/ledger-template.js'

// Identity style = the Markdown medium (plain gutter, no colour, throw on null).
const plainStyle: LedgerStyle = {
  gutter: ' │ ',
  heading: (t) => t,
  rule: (t) => t,
  dataCell: (_key, text) => text,
  placeholder: () => {
    throw new Error('markdown casting expects a full record')
  },
}

// One full line-6 block (3 casts), all selectable picks valid (pick < max).
const rows: readonly LedgerRow[] = [
  { lineNumber: 6, castNumber: 3, showLine: true, trailingRule: false, cell: deriveSplit({ pick: 4, max: 8 }) },
  { lineNumber: 6, castNumber: 2, showLine: false, trailingRule: false, cell: deriveSplit({ pick: 4, max: 7 }) },
  { lineNumber: 6, castNumber: 1, showLine: false, trailingRule: false, cell: deriveSplit({ pick: 4, max: 7 }) },
]

describe('ledgerBlock', () => {
  it('plain style: emits banner, header, rule, and one data row per input', () => {
    const out = ledgerBlock(rows, plainStyle)
    const lines = out.split('\n')
    // banner + header + headerRule + 3 data rows = 6 lines (no trailingRule here).
    expect(lines).toHaveLength(6)
    expect(lines[0]).toContain('左Left')
    expect(lines[0]).toContain('右Right')
    expect(lines[1]).toContain('爻Line')
    expect(lines[2]).toMatch(/═╪═/)
    // The cast-3 (block-top) data row shows the line label and the ⇒ tally.
    expect(lines[3]).toContain('上6')
    expect(lines[3]).toContain('⇒')
  })

  it('decorating style: wraps cells via the callbacks, plain stays unwrapped', () => {
    const wrapStyle: LedgerStyle = {
      ...plainStyle,
      dataCell: (key, text) => (key === 'sigma' ? `<${text}>` : text),
    }
    const wrapped = ledgerBlock(rows, wrapStyle).split('\n')[3]!
    const plain = ledgerBlock(rows, plainStyle).split('\n')[3]!
    expect(wrapped).not.toBe(plain)
    expect(wrapped).toContain('<')
  })

  it('null cell uses the placeholder callback (not dataCell)', () => {
    const placeholderRows: readonly LedgerRow[] = [
      { lineNumber: 6, castNumber: 3, showLine: true, trailingRule: false, cell: null },
    ]
    const dots = ledgerBlock(placeholderRows, {
      ...plainStyle,
      placeholder: (dot) => `[${dot}]`,
    })
    expect(dots).toContain('[·]')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run:
```bash
pnpm --filter @hexagram/consultation-view test -- ledger-template
```
Expected: FAIL — `Cannot find module '../src/ledger-template.js'`.

- [ ] **Step 3: Implement the template (lifted faithfully from the two serializers)**

Create `domain/consultation-view/src/ledger-template.ts`:
```ts
import type { DerivedSplit } from '@hexagram/core/casting-derivation'
import { centerVisual, padStartVisual } from '@hexagram/text-layout'

import type { LedgerRow } from './ir.js'
import { LEDGER_COLUMNS, LINE_LABELS } from './vocabulary.js'

/** The medium a serializer injects into the shared ledger geometry. Markdown
 *  passes identity callbacks + a plain gutter; ANSI passes its palette runs. */
export interface LedgerStyle {
  /** Inter-cell gutter — ANSI: ` <grey>│</reset> `; Markdown: ` │ `. */
  readonly gutter: string
  /** Banner (左Left/右Right) + column-header cells (ANSI: HEADING_GREY). */
  readonly heading: (text: string) => string
  /** A complete rule row, post-join (ANSI: NORMAL_GREY wrap; Markdown: id). */
  readonly rule: (text: string) => string
  /** One padded data cell, by column key + row (ANSI: per-column colour). */
  readonly dataCell: (columnKey: string, text: string, row: LedgerRow) => string
  /** A `·` placeholder cell for a null split (ANSI: PLACEHOLDER_GREY).
   *  Markdown only renders full records, so it passes a throwing function. */
  readonly placeholder: (dot: string) => string
}

const INDENT = '   '

// The ten data columns after line+cast, in fixed order (matches both legacy
// serializers). `sigma` maps to the DerivedSplit `combinedPiles` field; the
// rest share the column key with their field name.
const DATA_KEYS = [
  'stalks',
  'leftHeap',
  'leftPiles',
  'leftRemainder',
  'rightHeap',
  'rightPiles',
  'held',
  'rightRemainder',
  'setAside',
  'sigma',
] as const

const colWidth = (key: string): number =>
  LEDGER_COLUMNS.find((c) => c.key === key)!.width

// The padded raw value for one data column. `sigma` carries the `⇒ ` prefix on
// the third cast (the line value); every other column is its DerivedSplit field.
function cellContent(key: string, d: DerivedSplit, row: LedgerRow): string {
  if (key === 'sigma') {
    const raw =
      row.castNumber === 3 ? `⇒ ${d.combinedPiles}` : String(d.combinedPiles)
    return padStartVisual(raw, colWidth('sigma'))
  }
  return padStartVisual(String(d[key as keyof DerivedSplit]), colWidth(key))
}

/**
 * Assemble the CASTING ledger block (banner row, header row, header rule, and
 * the 18 data rows with their block rules) from the IR rows + a medium style.
 * The single home for ledger geometry: span math, gutter join, the `═╪═` /
 * `─┼─` rule joiners, and the null→placeholder branch live here once. Returns
 * the block WITHOUT the `CASTING:` / `## CASTING` heading or ```text fence —
 * each serializer keeps its own heading wrapper.
 */
export function ledgerBlock(
  rows: readonly LedgerRow[],
  style: LedgerStyle,
): string {
  const { gutter, heading, rule, dataCell, placeholder } = style
  const blank = (key: string): string => ' '.repeat(colWidth(key))

  // Banner row: 左Left / 右Right each span their sub-columns plus the interior
  // 3-col gutters between them.
  const leftSpan =
    colWidth('leftHeap') + 3 + colWidth('leftPiles') + 3 + colWidth('leftRemainder')
  const rightSpan =
    colWidth('rightHeap') +
    3 +
    colWidth('rightPiles') +
    3 +
    colWidth('held') +
    3 +
    colWidth('rightRemainder')
  const bannerRow =
    INDENT +
    [blank('line'), blank('cast'), blank('stalks')].join(gutter) +
    gutter +
    heading(centerVisual('左Left', leftSpan)) +
    gutter +
    heading(centerVisual('右Right', rightSpan)) +
    gutter +
    [blank('setAside'), blank('sigma')].join(gutter)

  const headerRow =
    INDENT +
    LEDGER_COLUMNS.map((c) => heading(padStartVisual(c.header, c.width))).join(
      gutter,
    )

  const headerRule =
    INDENT + rule(LEDGER_COLUMNS.map((c) => '═'.repeat(c.width)).join('═╪═'))
  const blockRule =
    INDENT + rule(LEDGER_COLUMNS.map((c) => '─'.repeat(c.width)).join('─┼─'))

  const dataRow = (row: LedgerRow): string => {
    const cells: string[] = [
      dataCell(
        'line',
        padStartVisual(
          row.showLine ? LINE_LABELS[row.lineNumber] : '',
          colWidth('line'),
        ),
        row,
      ),
      dataCell('cast', padStartVisual(String(row.castNumber), colWidth('cast')), row),
    ]
    if (row.cell === null) {
      for (const key of DATA_KEYS)
        cells.push(placeholder(padStartVisual('·', colWidth(key))))
    } else {
      const d = row.cell
      for (const key of DATA_KEYS)
        cells.push(dataCell(key, cellContent(key, d, row), row))
    }
    return INDENT + cells.join(gutter)
  }

  const body = rows
    .map((row) => (row.trailingRule ? `${dataRow(row)}\n${blockRule}` : dataRow(row)))
    .join('\n')

  return `${bannerRow}\n${headerRow}\n${headerRule}\n${body}`
}
```

- [ ] **Step 4: Export from the package index + verify the test passes**

In `domain/consultation-view/src/index.ts`, add (near the diagram-template export):
```ts
export { ledgerBlock, type LedgerStyle } from './ledger-template.js'
```
Run:
```bash
pnpm --filter @hexagram/consultation-view type:check
pnpm --filter @hexagram/consultation-view test -- ledger-template
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit the template (not yet consumed)**

```bash
git add domain/consultation-view/src/ledger-template.ts \
        domain/consultation-view/src/index.ts \
        domain/consultation-view/tests/ledger-template.test.ts
git commit -m "feat(consultation-view): medium-neutral ledgerBlock template

The casting-ledger assembly (banner-span math, gutter join, ═╪═/─┼─ rules,
null→placeholder) was hand-written in parallel in the ANSI and Markdown
serializers. Add one ledgerBlock parameterized by a LedgerStyle strategy so the
geometry lives once; serializers inject only their medium. Not yet consumed.

https://claude.ai/code/session_01SRPWuc5XHteFHccobxwAv7"
```

---

## Task 6: Consume `ledgerBlock` in the ANSI serializer

**Files:**
- Modify: `cli/readout/src/serialize-ansi.ts`

- [ ] **Step 1: Build consultation-view so the new export resolves**

Run:
```bash
pnpm --filter @hexagram/consultation-view build
```
Expected: build OK (the `import` condition now exposes `ledgerBlock`).

- [ ] **Step 2: Replace the body of `serializeCastingAnsi`**

In `cli/readout/src/serialize-ansi.ts`, add `ledgerBlock` and `type LedgerStyle` to the `@hexagram/consultation-view` import block. Replace the entire body of `serializeCastingAnsi` (lines 52-159) — KEEPING the null-rows early return and the `CASTING:` heading wrapper — with:
```ts
export function serializeCastingAnsi(section: CastingSection): string {
  if (section.rows === null)
    return `
${BOLD_GREY}CASTING:${NORMAL}

${NORMAL}Casting not recorded
`.trim()

  const ansiStyle: LedgerStyle = {
    gutter: ` ${NORMAL_GREY}│${NORMAL} `,
    heading: (t) => `${HEADING_GREY}${t}${NORMAL}`,
    rule: (t) => `${NORMAL_GREY}${t}${NORMAL}`,
    dataCell: (key, text, row) => {
      switch (key) {
        case 'line':
          return `${BOLD_WHITE}${text}${NORMAL}`
        case 'cast':
        case 'stalks':
        case 'held':
        case 'setAside':
          return `${NORMAL_GREY}${text}${NORMAL}`
        case 'leftRemainder':
        case 'rightRemainder':
          return `${YELLOW}${text}${NORMAL}`
        case 'sigma':
          return row.castNumber === 3 ? `${BOLD_CYAN}${text}${NORMAL}` : text
        default:
          // leftHeap, leftPiles, rightHeap, rightPiles — bare.
          return text
      }
    },
    placeholder: (dot) => `${PLACEHOLDER_GREY}${dot}${NORMAL}`,
  }

  return `
${BOLD_GREY}CASTING:${NORMAL}

${ledgerBlock(section.rows, ansiStyle)}
`.trim()
}
```
Now remove the locals this was the sole user of. Confirm scope first:
```bash
grep -n "colWidth\|LEDGER_INDENT\|LEDGER_GUTTER" cli/readout/src/serialize-ansi.ts
```
Expected: every hit is inside the old `serializeCastingAnsi` body (the transformation/hexagram serializers use `padToColumn`, not `colWidth`). Delete `colWidth` (line 49), `LEDGER_INDENT`, and `LEDGER_GUTTER` (lines 43-47). Then trim the `@hexagram/text-layout` import — `centerVisual` and `padStartVisual` are now unused here (they were casting-only); keep `padToColumn` (the transformation serializer still uses it). Confirm:
```bash
grep -n "centerVisual\|padStartVisual\|padToColumn" cli/readout/src/serialize-ansi.ts
```
Keep only the names that still appear below the import line.

- [ ] **Step 3: Type-check**

Run:
```bash
pnpm --filter @hexagram/readout type:check
```
Expected: PASS. If `BOLD_CYAN`/`YELLOW`/`HEADING_GREY`/`PLACEHOLDER_GREY` show as unused, they are still used here (the style object) — no removal needed.

- [ ] **Step 4: PARITY GATE — bytes must be unchanged**

Run the parity gate (do NOT run `pnpm generate-fixtures`). Expected: green. A red here means the template diverged from a legacy byte — diff the failing fixture, fix the TEMPLATE or the style object, never the fixture.

- [ ] **Step 5: Commit**

```bash
git add cli/readout/src/serialize-ansi.ts
git commit -m "refactor(readout): serialize the casting ledger via ledgerBlock

serializeCastingAnsi now injects an ANSI LedgerStyle into the shared ledgerBlock
instead of hand-assembling the banner/header/rule/data rows. Byte-identity
fixtures unchanged.

https://claude.ai/code/session_01SRPWuc5XHteFHccobxwAv7"
```

---

## Task 7: Consume `ledgerBlock` in the Markdown serializer

**Files:**
- Modify: `domain/consultation-file/src/serialize-markdown.ts`

- [ ] **Step 1: Replace the body of `serializeCastingMarkdown`**

In `domain/consultation-file/src/serialize-markdown.ts`, add `ledgerBlock` and `type LedgerStyle` to the `@hexagram/consultation-view` import block. Replace the entire body of `serializeCastingMarkdown` (lines 40-125) — KEEPING the null-rows early return and the `## CASTING` + ```text fence wrapper — with:
```ts
export function serializeCastingMarkdown(section: CastingSection): string {
  if (section.rows === null) return `## CASTING\n\n_Casting not recorded._\n`

  const markdownStyle: LedgerStyle = {
    gutter: ' │ ',
    heading: (t) => t,
    rule: (t) => t,
    dataCell: (_key, text) => text,
    placeholder: () => {
      // Markdown is only ever rendered from a full CastingRecord, so a null
      // cell is a programmer error — the same invariant the old guard asserted.
      throw new Error('markdown casting expects a full record')
    },
  }

  return `## CASTING

\`\`\`text
${ledgerBlock(section.rows, markdownStyle)}
\`\`\`
`
}
```
Then remove now-unused locals. Check first:
```bash
grep -n "colWidth\|LEDGER_INDENT\|LEDGER_GUTTER" domain/consultation-file/src/serialize-markdown.ts
```
`LEDGER_INDENT` and `LEDGER_GUTTER` (lines 34-35) are used only by `serializeCastingMarkdown` — delete them. `colWidth` (lines 37-38) — delete only if no other function uses it (the transformation/hexagram serializers below do not; confirm via the grep, then delete).

- [ ] **Step 2: Type-check**

Run:
```bash
pnpm --filter @hexagram/consultation-file type:check
```
Expected: PASS. If `padStartVisual` / `centerVisual` become unused in this file, remove them from the `@hexagram/text-layout` import (confirm with `grep -n "padStartVisual\|centerVisual\|padToColumn" domain/consultation-file/src/serialize-markdown.ts` — `padToColumn` is still used by the transformation serializer, keep it).

- [ ] **Step 3: PARITY GATE**

Run the parity gate (no fixture regen). Expected: green. Red == a gutter/space/rule byte drifted — fix the template/style, not the fixture.

- [ ] **Step 4: Commit**

```bash
git add domain/consultation-file/src/serialize-markdown.ts
git commit -m "refactor(consultation-file): serialize the casting ledger via ledgerBlock

serializeCastingMarkdown now injects an identity LedgerStyle (plain gutter, no
colour, throw-on-null) into the shared ledgerBlock instead of hand-assembling
the table. The ledger geometry now has one home across both media. Byte-identity
fixtures unchanged.

https://claude.ai/code/session_01SRPWuc5XHteFHccobxwAv7"
```

---

## Final verification (after all tasks)

- [ ] **Run the full gate**

```bash
pnpm boundaries:check
pnpm build
pnpm test
pnpm type:check
pnpm lint:check
pnpm format:check
```
Expected: all green. The byte-identity fixtures passing WITHOUT any `pnpm generate-fixtures` run is the proof that Parts 2 and 4 preserved output exactly. If `lint:check`/`format:check` flag the touched files, run `pnpm lint:fix && pnpm format:fix`, re-run the parity gate, and amend the relevant commit.

- [ ] **Confirm the seams are closed (grep checks)**

```bash
# one ANSI-strip home:
grep -rn "const ANSI_PATTERN" cli/casting-ui/src cli/playground-ui/src && echo "FAIL: local copy survives" || echo "ok: stripAnsi imported from viewer-core"
# one refusal message + snapshot:
grep -rn "requires an interactive terminal" cli apps --include=*.ts --include=*.tsx | grep -v tests | grep -v env-policy && echo "FAIL: message authored elsewhere" || echo "ok: message single-homed"
# one ledger assembler (no banner-span math outside the template):
grep -rn "leftSpan\|═╪═\|─┼─" cli/readout/src domain/consultation-file/src && echo "FAIL: ledger assembly survives in a serializer" || echo "ok: ledgerBlock is the one home"
# emerging-gate + fixture literal:
grep -rn "some(isMovingLine)" domain/consultation-view/src && echo "check: should be gone from build-view" || echo "ok: build-view calls hasMovingLines"
grep -rn "line === 6 || line === 9" cli/casting-ui/scripts && echo "FAIL: literal survives" || echo "ok: generator uses isMovingLine"
```
Expected: each prints `ok`.

- [ ] **Update the round-3 review's status (optional)**

If desired, append a note to `docs/reviews/` (or open a follow-up) recording that A/B/C/D/E are now closed by structure; leave S-items intentionally deferred as documented.
