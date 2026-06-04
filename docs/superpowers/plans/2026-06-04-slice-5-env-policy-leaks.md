# Slice 5: Environment Policy + Small Leak Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate four small duplications — the twice-encoded TTY/env policy, five near-identical `parse*Ms` flag parsers, the hardcoded `consultations/` path in four places, and the hand-rolled non-TTY refusal message at four bins — by introducing one `classifyEnv` policy module, one generic `parseIntFlag`, and one `defaultConsultationsDir()` export, with no behaviour change.

**Architecture:** A single environment-policy module (`cli/viewer-core/src/env-policy.ts`) computes `{ interactive, forceNumeric }` from a `{ isTTY, NO_COLOR, CI }` snapshot; both the old `isInteractiveEnv` consumers and `shouldForceNumericForAccessibility` derive from it, and a generic `refuseIfNonInteractive(binName)` prints the exact existing refusal and exits 1. The five `parse*Ms` bodies collapse to one `parseIntFlag(argv, name, fallback)` with per-flag clamps kept at the call site. `@hexagram/consultation-file` gains `defaultConsultationsDir()` that the three external `consultations/` callers import.

**Tech Stack:** TypeScript, vitest, tsdown, pnpm workspaces

> **PATHS — IMPORTANT.** This plan ASSUMES Slices 0–4 are merged, so it WRITES the post-reorg paths:
> `cli/viewer-core/...`, `cli/casting-ui/...`, `cli/shell/...`, `cli/playground-ui/...`, `cli/history-ui/...`, `cli/cli/...` (bins moved from `apps/cli`), `domain/consultation-file/...`.
> Current (pre-reorg) source was read from `packages/...` and `apps/cli/...`. If a slice ordering changes and the reorg has NOT landed, translate each post-reorg path back to its `packages/`/`apps/cli` equivalent before editing. The package import specifiers (`@hexagram/viewer-core`, `@hexagram/consultation-file`, `@hexagram/casting-ui`) are unchanged by the reorg.

---

## Task 1 — `classifyEnv` policy module + `refuseIfNonInteractive` (TDD)

Introduce one env-policy module in `cli/viewer-core` so the interactive gate and the force-numeric heuristic stop being two independent re-derivations of the same `NO_COLOR`/`CI` reading. `isInteractiveEnv()` stays as a thin wrapper (its callers and the `@hexagram/viewer-core` export are unchanged) but now delegates to `classifyEnv`. The exact stderr message string is owned by `refuseIfNonInteractive`.

**Files:**
- `cli/viewer-core/src/env-policy.ts` (NEW)
- `cli/viewer-core/tests/env-policy.test.ts` (NEW)
- `cli/viewer-core/src/run-utils.ts` (EDIT — `isInteractiveEnv` delegates)
- `cli/viewer-core/src/index.ts` (EDIT — add exports)

### Design notes (read before coding)

Current `isInteractiveEnv()` (`run-utils.ts`):
```ts
const isTty = Boolean(process.stdout.isTTY)
const noColor = process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== ''
const ci = process.env.CI !== undefined && process.env.CI !== ''
return isTty && !noColor && !ci
```

Current `shouldForceNumericForAccessibility(envVars)` (`casting-ui/src/utils-mode.ts`):
```ts
const noColor = envVars.NO_COLOR !== undefined && envVars.NO_COLOR !== ''
const ci = envVars.CI !== undefined && envVars.CI !== ''
return noColor || ci
```

So the shared primitive is "NO_COLOR set non-empty" and "CI set non-empty". The return shape `classifyEnv` must serve both call sites:
- `interactive` = `isTTY && !noColor && !ci` (the `isInteractiveEnv` truth value)
- `forceNumeric` = `noColor || ci` (the accessibility heuristic — note it does NOT depend on `isTTY`)

`shouldForceNumericForAccessibility` (Task 4) re-derives from `classifyEnv`, passing a placeholder `isTTY` since `forceNumeric` ignores it.

Exact refusal message format (verified at all four sites): `` `hexagram-${binName} requires an interactive terminal\n` ``, with the bare `hexagram` (no suffix) for the composed shell bin. To keep the EXACT strings, `refuseIfNonInteractive` takes the FULL bin name (e.g. `'hexagram'`, `'hexagram-history'`, `'hexagram-manual'`, `'hexagram-playground'`) and writes `` `${binName} requires an interactive terminal\n` `` — NOT a `hexagram-` prefix it prepends, so the shell's prefix-less `hexagram` is expressible.

### Steps

- [ ] Write `cli/viewer-core/tests/env-policy.test.ts` FIRST (red). Cover the `classifyEnv` truth table and `refuseIfNonInteractive`:

```ts
import process from 'node:process'

import { describe, expect, test, vi } from 'vitest'

import { classifyEnv, refuseIfNonInteractive } from '../src/env-policy.js'

describe('classifyEnv', () => {
  // interactive = isTTY && !noColor && !ci
  test('TTY, no NO_COLOR, no CI -> interactive, not forceNumeric', () => {
    expect(
      classifyEnv({ isTTY: true, NO_COLOR: undefined, CI: undefined }),
    ).toEqual({ interactive: true, forceNumeric: false })
  })

  test('non-TTY alone -> not interactive, not forceNumeric', () => {
    expect(
      classifyEnv({ isTTY: false, NO_COLOR: undefined, CI: undefined }),
    ).toEqual({ interactive: false, forceNumeric: false })
  })

  test('NO_COLOR set non-empty -> not interactive, forceNumeric', () => {
    expect(classifyEnv({ isTTY: true, NO_COLOR: '1', CI: undefined })).toEqual({
      interactive: false,
      forceNumeric: true,
    })
  })

  test('CI set non-empty -> not interactive, forceNumeric', () => {
    expect(classifyEnv({ isTTY: true, NO_COLOR: undefined, CI: 'true' })).toEqual(
      { interactive: false, forceNumeric: true },
    )
  })

  test('empty-string NO_COLOR / CI are treated as unset', () => {
    expect(classifyEnv({ isTTY: true, NO_COLOR: '', CI: '' })).toEqual({
      interactive: true,
      forceNumeric: false,
    })
  })

  test('forceNumeric ignores isTTY (heuristic is env-only)', () => {
    expect(classifyEnv({ isTTY: false, NO_COLOR: '1', CI: undefined })).toEqual({
      interactive: false,
      forceNumeric: true,
    })
  })
})

describe('refuseIfNonInteractive', () => {
  test('writes the exact message for a suffixed bin and exits 1', () => {
    const writes: string[] = []
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        writes.push(String(chunk))
        return true
      })
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never)

    refuseIfNonInteractive('hexagram-history')

    expect(writes).toEqual([
      'hexagram-history requires an interactive terminal\n',
    ])
    expect(exit).toHaveBeenCalledWith(1)
    stderr.mockRestore()
    exit.mockRestore()
  })

  test('writes the prefix-less message for the composed shell bin', () => {
    const writes: string[] = []
    const stderr = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        writes.push(String(chunk))
        return true
      })
    const exit = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never)

    refuseIfNonInteractive('hexagram')

    expect(writes).toEqual(['hexagram requires an interactive terminal\n'])
    expect(exit).toHaveBeenCalledWith(1)
    stderr.mockRestore()
    exit.mockRestore()
  })
})
```

- [ ] Run the test — confirm it FAILS to import (red):
  - `pnpm --filter @hexagram/viewer-core test -- env-policy`
  - Expected: `Failed to resolve import "../src/env-policy.js"` (module does not exist yet).

- [ ] Create `cli/viewer-core/src/env-policy.ts` (green):

```ts
// Single source of truth for the CLI's environment policy. Both the
// interactive-TTY gate (every Ink-only bin's run entry) and the force-numeric
// accessibility heuristic (the casting slider falls back to typed input) read
// the same `NO_COLOR` / `CI` signals — encoding that reading twice let the two
// drift. `classifyEnv` reads the snapshot once; the two consumers select the
// field they need.

import process from 'node:process'

export interface EnvSnapshot {
  isTTY: boolean
  NO_COLOR: string | undefined
  CI: string | undefined
}

export interface EnvPolicy {
  /** TTY, no NO_COLOR, no CI — safe to mount an alternate-screen Ink UI. */
  interactive: boolean
  /**
   * NO_COLOR or CI is set — the purely-visual bouncing slider should fall
   * back to the typed-number prompt. Independent of `isTTY` (non-TTY already
   * routes to plain mode, which is always typed).
   */
  forceNumeric: boolean
}

/** A non-empty env var per https://no-color.org/ semantics (set AND non-empty). */
function isSet(value: string | undefined): boolean {
  return value !== undefined && value !== ''
}

/**
 * Derive the CLI's environment policy from an explicit snapshot. Pure — takes
 * the snapshot so it can be unit-tested without `process`. The two booleans are
 * the only env-derived policy the CLI has:
 *
 *   interactive  = isTTY && !NO_COLOR && !CI
 *   forceNumeric = NO_COLOR || CI
 */
export function classifyEnv(env: EnvSnapshot): EnvPolicy {
  const noColor = isSet(env.NO_COLOR)
  const ci = isSet(env.CI)
  return {
    interactive: env.isTTY && !noColor && !ci,
    forceNumeric: noColor || ci,
  }
}

/**
 * Refuse a non-interactive environment with the exact, long-standing stderr
 * message and exit code 1. `binName` is the FULL bin name (e.g. `hexagram`,
 * `hexagram-history`) so the composed shell bin's prefix-less message is
 * expressible. Reads the live `process` state via `classifyEnv`.
 *
 * Returns when the environment IS interactive, so callers that previously
 * branched on a boolean can call this unconditionally and continue.
 */
export function refuseIfNonInteractive(binName: string): void {
  const policy = classifyEnv({
    isTTY: Boolean(process.stdout.isTTY),
    NO_COLOR: process.env.NO_COLOR,
    CI: process.env.CI,
  })
  if (!policy.interactive) {
    process.stderr.write(`${binName} requires an interactive terminal\n`)
    process.exit(1)
  }
}
```

- [ ] Re-point `isInteractiveEnv()` in `cli/viewer-core/src/run-utils.ts` to delegate (keeps the existing public export and all its callers working unchanged). Replace the body:

  BEFORE:
  ```ts
  import process from 'node:process'

  export function isInteractiveEnv(): boolean {
    const isTty = Boolean(process.stdout.isTTY)
    const noColor =
      process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== ''
    const ci = process.env.CI !== undefined && process.env.CI !== ''
    return isTty && !noColor && !ci
  }
  ```

  AFTER:
  ```ts
  import process from 'node:process'

  import { classifyEnv } from './env-policy.js'

  export function isInteractiveEnv(): boolean {
    return classifyEnv({
      isTTY: Boolean(process.stdout.isTTY),
      NO_COLOR: process.env.NO_COLOR,
      CI: process.env.CI,
    }).interactive
  }
  ```
  Keep the existing module-level comment block atop `run-utils.ts`.

- [ ] Add exports to `cli/viewer-core/src/index.ts` (place next to the existing `isInteractiveEnv` export):

```ts
// Environment policy — the single reading of TTY / NO_COLOR / CI that both the
// interactive gate and the force-numeric heuristic derive from.
export {
  classifyEnv,
  refuseIfNonInteractive,
  type EnvPolicy,
  type EnvSnapshot,
} from './env-policy.js'
```
  Leave the existing `export { isInteractiveEnv } from './run-utils.js'` line in place.

- [ ] Run the new test (green): `pnpm --filter @hexagram/viewer-core test -- env-policy`
  - Expected: `Test Files  1 passed (1)` / `Tests  8 passed (8)`.

- [ ] Type-check: `pnpm --filter @hexagram/viewer-core type:check` — expected: no output, exit 0.

- [ ] **Commit:** `feat(viewer-core): add classifyEnv env-policy + refuseIfNonInteractive`

---

## Task 2 — `parseIntFlag`: collapse the five `parse*Ms` into one (TDD)

The five parsers (`parseWrapWidth`, `parseSliderSweepMs`, `parseCastBounceMs`, `parseCastRevealMs`, `parseManualRevealMs`) are byte-identical apart from the flag name and the default constant — each scans argv for `--flag <n>` / `--flag=<n>`, accepts only `/^\d+$/` values, requires `> 0`, else returns its fallback. Collapse to one generic `parseIntFlag(argv, name, fallback)` and replace the five bodies with one-liners that delegate. **No per-flag clamp exists today** (all five share the identical `parsed > 0` gate and no upper bound) — so there is nothing extra to keep at a call site; `parseWrapWidth`'s "positive integer" floor is exactly the generic `> 0` gate. The `DEFAULT_*` constants are unchanged and stay the fallback at each call site.

**Files:**
- `cli/casting-ui/src/utils-mode.ts` (EDIT)
- `cli/casting-ui/tests/utils-mode.test.ts` (EDIT — add `parseIntFlag` tests; keep existing `parse*` tests as the behaviour-preservation guard)

### Steps

- [ ] In `cli/casting-ui/tests/utils-mode.test.ts`, ADD a `describe('parseIntFlag', ...)` block FIRST (red — function doesn't exist yet). Import `parseIntFlag` alongside the existing imports:

```ts
import { parseIntFlag } from '../src/utils-mode.js'

describe('parseIntFlag', () => {
  test('reads the space-separated form --flag <n>', () => {
    expect(parseIntFlag(['--cast-reveal-ms', '900'], '--cast-reveal-ms', 700)).toBe(
      900,
    )
  })

  test('reads the equals form --flag=<n>', () => {
    expect(parseIntFlag(['--cast-reveal-ms=900'], '--cast-reveal-ms', 700)).toBe(
      900,
    )
  })

  test('falls back when the flag is absent', () => {
    expect(parseIntFlag([], '--cast-reveal-ms', 700)).toBe(700)
  })

  test('falls back on a non-numeric value', () => {
    expect(parseIntFlag(['--cast-reveal-ms', 'fast'], '--cast-reveal-ms', 700)).toBe(
      700,
    )
  })

  test('falls back on a zero value (must be a positive integer)', () => {
    expect(parseIntFlag(['--cast-reveal-ms', '0'], '--cast-reveal-ms', 700)).toBe(
      700,
    )
  })

  test('falls back on a negative / signed value (regex rejects the sign)', () => {
    expect(parseIntFlag(['--cast-reveal-ms', '-5'], '--cast-reveal-ms', 700)).toBe(
      700,
    )
  })

  test('falls back on a decimal value (regex rejects the dot)', () => {
    expect(parseIntFlag(['--cast-reveal-ms', '1.5'], '--cast-reveal-ms', 700)).toBe(
      700,
    )
  })

  test('returns the first valid occurrence when repeated', () => {
    expect(
      parseIntFlag(['--cast-reveal-ms=900', '--cast-reveal-ms=1200'], '--cast-reveal-ms', 700),
    ).toBe(900)
  })

  test('does not match a flag that is a prefix of another flag', () => {
    // `--cast-reveal-ms-extra=900` must NOT satisfy `--cast-reveal-ms`.
    expect(
      parseIntFlag(['--cast-reveal-ms-extra=900'], '--cast-reveal-ms', 700),
    ).toBe(700)
  })
})
```

  > NOTE on the prefix test: the current `startsWith('--flag=')` guard already prevents `--flagX=...` from matching (it requires the `=` immediately after the name), so this test passes with a faithful port. Keep it — it pins the boundary so a future "optimisation" can't loosen it.

- [ ] Run: `pnpm --filter @hexagram/casting-ui test -- utils-mode` — expected RED: `parseIntFlag is not exported` / import resolution or assertion failures for the new block. The existing `parse*` tests still pass.

- [ ] In `cli/casting-ui/src/utils-mode.ts`, ADD the generic parser ABOVE `parseWrapWidth` (just after `shouldUseNumericInput`):

```ts
/**
 * Parse a `--<name> <n>` / `--<name>=<n>` integer flag from `argv`. Pure —
 * takes `argv` explicitly so it can be unit-tested without `process`. Accepts
 * only a run of ASCII digits (`/^\d+$/`, so no sign and no decimal point) that
 * parses to a value `> 0`; otherwise returns `fallback`. Returns the first
 * valid occurrence. This is the single body the per-flag `parse*` helpers
 * below delegate to — they differ only in flag name and default.
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

- [ ] Replace the five full parser bodies with one-line delegations. The exact before/after for each:

  `parseWrapWidth` (keep its JSDoc, replace the body):
  ```ts
  export function parseWrapWidth(argv: readonly string[]): number {
    return parseIntFlag(argv, '--wrap-width', DEFAULT_MAX_WRAP_WIDTH)
  }
  ```

  `parseSliderSweepMs`:
  ```ts
  export function parseSliderSweepMs(argv: readonly string[]): number {
    return parseIntFlag(argv, '--slider-sweep-ms', DEFAULT_SLIDER_SWEEP_MS)
  }
  ```

  `parseCastBounceMs`:
  ```ts
  export function parseCastBounceMs(argv: readonly string[]): number {
    return parseIntFlag(argv, '--cast-bounce-ms', DEFAULT_CAST_BOUNCE_MS)
  }
  ```

  `parseCastRevealMs`:
  ```ts
  export function parseCastRevealMs(argv: readonly string[]): number {
    return parseIntFlag(argv, '--cast-reveal-ms', DEFAULT_CAST_REVEAL_MS)
  }
  ```

  `parseManualRevealMs`:
  ```ts
  export function parseManualRevealMs(argv: readonly string[]): number {
    return parseIntFlag(argv, '--manual-reveal-ms', DEFAULT_MANUAL_REVEAL_MS)
  }
  ```

  Each JSDoc block stays (it documents the flag's meaning/default); only the for-loop body is replaced by the delegation. The "Mirrors X exactly" sentences in the `parseCast*`/`parseManual*` docs are now literally true via delegation — leave them or trim to "Delegates to `parseIntFlag`."; either is fine, do not expand scope.

- [ ] Run the full file's tests (green — the new block AND every existing `parse*` test, which are the behaviour-preservation oracle): `pnpm --filter @hexagram/casting-ui test -- utils-mode`
  - Expected: all tests pass, including the pre-existing `parseWrapWidth`/`parseSliderSweepMs`/etc. cases — proving the delegation is behaviour-identical.

- [ ] Type-check: `pnpm --filter @hexagram/casting-ui type:check` — expected: no output, exit 0.

- [ ] **Commit:** `refactor(casting-ui): collapse five parse*Ms flag parsers into parseIntFlag`

---

## Task 3 — `defaultConsultationsDir()` export + repoint the four callers (TDD)

The `path.join(process.cwd(), 'consultations')` literal appears in four places: the `saveConsultationFile` default (in `domain/consultation-file/src/file.ts`), and three external callers — the `--convert-legacy` migration (`cli/cli/src/history.ts`), the history viewer run entry (`cli/history-ui/src/run-history-viewer.tsx`), and the composed shell's History mount (`cli/shell/src/hexagram-app.tsx`). Make `domain/consultation-file/src/file.ts` host `defaultConsultationsDir()`, export it from `@hexagram/consultation-file` (and the `./file` subpath), use it as the `saveConsultationFile` default, and repoint the three external callers.

**Files:**
- `domain/consultation-file/src/file.ts` (EDIT — add `defaultConsultationsDir`, use it as the save default)
- `domain/consultation-file/src/index.ts` (EDIT — re-export)
- `domain/consultation-file/tests/file.test.ts` (NEW or EDIT — add `defaultConsultationsDir` test)
- `cli/cli/src/history.ts` (EDIT)
- `cli/history-ui/src/run-history-viewer.tsx` (EDIT)
- `cli/shell/src/hexagram-app.tsx` (EDIT)

### Steps

- [ ] Add a focused test FIRST (red). If `domain/consultation-file/tests/file.test.ts` exists, append; otherwise create it:

```ts
import path from 'node:path'
import process from 'node:process'

import { describe, expect, test, vi } from 'vitest'

import { defaultConsultationsDir } from '../src/file.js'

describe('defaultConsultationsDir', () => {
  test('is <cwd>/consultations', () => {
    expect(defaultConsultationsDir()).toBe(
      path.join(process.cwd(), 'consultations'),
    )
  })

  test('tracks process.cwd()', () => {
    const fake = path.join(path.sep, 'tmp', 'fake-cwd')
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(fake)
    expect(defaultConsultationsDir()).toBe(path.join(fake, 'consultations'))
    cwd.mockRestore()
  })
})
```

- [ ] Run: `pnpm --filter @hexagram/consultation-file test -- file` — expected RED (import of `defaultConsultationsDir` fails to resolve).

- [ ] In `domain/consultation-file/src/file.ts`, add the helper near the top (after the imports / type aliases, before `saveConsultationFile`):

```ts
/**
 * The conventional consultations directory: `<cwd>/consultations`. Every CLI
 * inherited this from the original implementation (the caller's cwd is the
 * convention). Single source of truth so the path is not re-hardcoded across
 * the save default, the history scanner, the legacy migration, and the shell.
 */
export function defaultConsultationsDir(): string {
  return path.join(process.cwd(), 'consultations')
}
```

- [ ] Repoint the `saveConsultationFile` default to call it. In `file.ts`:

  BEFORE:
  ```ts
  const dir = params.dir ?? path.join(process.cwd(), 'consultations')
  ```
  AFTER:
  ```ts
  const dir = params.dir ?? defaultConsultationsDir()
  ```

- [ ] Re-export from `domain/consultation-file/src/index.ts`. Extend the existing `./file.js` export block:

  BEFORE:
  ```ts
  export {
    loadConsultationFile,
    saveConsultationFile,
    type LoadResult,
  } from './file.js'
  ```
  AFTER:
  ```ts
  export {
    defaultConsultationsDir,
    loadConsultationFile,
    saveConsultationFile,
    type LoadResult,
  } from './file.js'
  ```

  > The `./file` subpath export already exists in `package.json#exports`, so `@hexagram/consultation-file/file` also exposes the new function automatically — no `package.json` or `tsdown.config.ts` change needed.

- [ ] Run: `pnpm --filter @hexagram/consultation-file test -- file` — expected GREEN. Then the package's full test run to confirm the save-default change is behaviour-neutral: `pnpm --filter @hexagram/consultation-file test`.

- [ ] Repoint `cli/cli/src/history.ts`. The `--convert-legacy` branch:

  BEFORE (imports + usage):
  ```ts
  import path from 'node:path'
  import process from 'node:process'

  import { runHistoryViewer } from '@hexagram/history-ui'
  import { isInteractiveEnv } from '@hexagram/viewer-core'

  import { migrateLegacy } from './migrate-legacy.js'
  ...
      await migrateLegacy(path.join(process.cwd(), 'consultations'))
  ```
  AFTER:
  ```ts
  import process from 'node:process'

  import { defaultConsultationsDir } from '@hexagram/consultation-file'
  import { runHistoryViewer } from '@hexagram/history-ui'
  import { refuseIfNonInteractive } from '@hexagram/viewer-core'

  import { migrateLegacy } from './migrate-legacy.js'
  ...
      await migrateLegacy(defaultConsultationsDir())
  ```
  - Drop the now-unused `import path from 'node:path'` (only used for the literal).
  - Also fold in Task 4's refusal swap here (see Task 4) — this file is touched once. Replace the `isInteractiveEnv()` guard block with `refuseIfNonInteractive('hexagram-history')`. (Detailed in Task 4; doing both in one edit avoids two passes over the same file.)
  - Keep `import process from 'node:process'` — still used by `process.argv` / `process.exit`.

- [ ] Repoint `cli/history-ui/src/run-history-viewer.tsx`:

  BEFORE:
  ```ts
  import path from 'node:path'
  import process from 'node:process'

  import { render } from 'ink'

  import { HistoryApp } from './history-app.js'

  export async function runHistoryViewer(args: { dir?: string }): Promise<void> {
    const dir = args.dir ?? path.join(process.cwd(), 'consultations')
  ```
  AFTER:
  ```ts
  import { defaultConsultationsDir } from '@hexagram/consultation-file'
  import { render } from 'ink'

  import { HistoryApp } from './history-app.js'

  export async function runHistoryViewer(args: { dir?: string }): Promise<void> {
    const dir = args.dir ?? defaultConsultationsDir()
  ```
  - Drop the now-unused `node:path` and `node:process` imports (verify neither is used elsewhere in the file — current file uses neither beyond the literal).
  - Confirm `@hexagram/consultation-file` is a dependency of `@hexagram/history-ui`. If `pnpm --filter @hexagram/history-ui type:check` reports it unresolved, add `"@hexagram/consultation-file": "workspace:*"` to `cli/history-ui/package.json` dependencies and run `pnpm install`. (history-ui already loads consultation files, so it is almost certainly already a dep — verify, don't assume.)

- [ ] Repoint `cli/shell/src/hexagram-app.tsx`. The History mount:

  BEFORE:
  ```ts
        <HistoryApp
          dir={path.join(process.cwd(), 'consultations')}
  ```
  AFTER:
  ```ts
        <HistoryApp
          dir={defaultConsultationsDir()}
  ```
  - Add `import { defaultConsultationsDir } from '@hexagram/consultation-file'` to the import block.
  - Remove the `import path from 'node:path'` and/or `node:process` ONLY if no other usage remains in `hexagram-app.tsx` — grep the file first; the shell app likely uses `process` elsewhere, so check before deleting. Leave any still-used import.
  - Confirm `@hexagram/consultation-file` is a `@hexagram/shell` dependency (same verification as history-ui).

- [ ] Type-check the four touched packages:
  - `pnpm --filter @hexagram/consultation-file type:check`
  - `pnpm --filter @hexagram/history-ui type:check`
  - `pnpm --filter @hexagram/shell type:check`
  - `pnpm --filter @hexagram/bin type:check`
  - Expected: each exits 0 with no output.

- [ ] **Commit:** `refactor(consultation-file): add defaultConsultationsDir() and repoint the four callers`

---

## Task 4 — Replace the hand-rolled non-TTY refusals with `refuseIfNonInteractive`

Four bins/run-entries hand-roll the same refusal (`stderr.write(...)` + exit/return). Swap each for `refuseIfNonInteractive(binName)`. Two of them (`run-hexagram.tsx`, `run-playground-app.ts`) currently RETURN a boolean rather than exiting — see the behaviour note below.

**Files:**
- `cli/cli/src/history.ts` (EDIT — folded into Task 3's edit of this file)
- `cli/cli/src/manual.ts` (EDIT)
- `cli/shell/src/run-hexagram.tsx` (EDIT)
- `cli/playground-ui/src/run-playground-app.ts` (EDIT)

### Behaviour note — exit vs. return (READ FIRST)

`refuseIfNonInteractive` writes the message and calls `process.exit(1)` directly. Two current sites instead set a boolean the caller maps to an exit code:
- `runHexagram()` returns `false` on refusal; its bin does `process.exit(success ? 0 : 1)`.
- `runPlaygroundApp()` returns `false` on refusal; its bin does the same.

The OBSERVABLE behaviour (stderr message + exit code 1) is identical whether the refusal exits inline or bubbles a `false`. But these two functions are documented as "never calls `process.exit()` itself, keeping it focused and unit-testable", and there are unit tests that assert the `false` return. **Do NOT regress that contract.** Therefore:

- `history.ts` and `manual.ts` are BINS that already `process.exit(1)` inline → swap to `refuseIfNonInteractive(...)` directly (it exits for them).
- `runHexagram()` and `runPlaygroundApp()` are RUN-ENTRIES that return a boolean → they should NOT adopt the exiting helper. Instead, replace their hand-rolled `NO_COLOR/CI` reading with `classifyEnv(...).interactive` and keep the `return false` + stderr-write shape, OR keep using `isInteractiveEnv()` (already delegates to `classifyEnv` after Task 1) and only de-duplicate the MESSAGE STRING. The minimal, contract-preserving move: keep `isInteractiveEnv()` and leave the `NON_INTERACTIVE_MESSAGE` constant — the message is already a named constant in both files, so the "hand-rolled message" duplication there is mild. **Decision: do NOT touch `run-hexagram.tsx` / `run-playground-app.ts` in this slice** — converting them to the exiting helper would break their unit-tested boolean contract, and that is out of scope. Only the two true bins (history, manual) adopt `refuseIfNonInteractive`.

  > This narrows the task to the two bins that genuinely exit inline. If a reviewer wants the run-entries unified too, that is a follow-up requiring a non-exiting variant (`isRefused(binName): boolean`) — out of scope here.

### Steps

- [ ] `cli/cli/src/history.ts` (already opened in Task 3). Replace the guard:

  BEFORE:
  ```ts
  import { isInteractiveEnv } from '@hexagram/viewer-core'
  ...
      if (!isInteractiveEnv()) {
        process.stderr.write(
          'hexagram-history requires an interactive terminal\n',
        )
        process.exit(1)
      }
  ```
  AFTER:
  ```ts
  import { refuseIfNonInteractive } from '@hexagram/viewer-core'
  ...
      refuseIfNonInteractive('hexagram-history')
  ```
  (Same `import` line as the one already changed in Task 3 — one combined import edit.)

- [ ] `cli/cli/src/manual.ts`. Replace the guard, KEEP the separate rows-too-short guard untouched:

  BEFORE:
  ```ts
  import { isInteractiveEnv } from '@hexagram/viewer-core'
  ...
      if (!isInteractiveEnv()) {
        process.stderr.write('hexagram-manual requires an interactive terminal\n')
        process.exit(1)
      }
  ```
  AFTER:
  ```ts
  import { refuseIfNonInteractive } from '@hexagram/viewer-core'
  ...
      refuseIfNonInteractive('hexagram-manual')
  ```
  - The `MANUAL_MIN_TERMINAL_ROWS` block below is a DIFFERENT refusal (a distinct message and condition — not the non-TTY policy). Leave it exactly as-is; it is not a duplication of the env policy.

- [ ] Confirm the bin tests still pass — these assert the exact stderr substring, so they are the behaviour-preservation oracle for this swap:
  - `pnpm --filter @hexagram/bin test -- manual`
  - Expected: the three `toContain('hexagram-manual requires an interactive terminal')` assertions in `manual.test.ts` pass. (Test path post-reorg: `cli/cli/tests/manual.test.ts`.)
  - If a `history` bin test exists, run it too: `pnpm --filter @hexagram/bin test`.

- [ ] Type-check: `pnpm --filter @hexagram/bin type:check` — expected: exit 0.

- [ ] **Commit:** `refactor(cli): route history/manual non-TTY refusals through refuseIfNonInteractive`

---

## Task 5 — Wire `forceNumeric` through `shouldForceNumericForAccessibility` (TDD-guarded)

Close the second half of duplication (a): make the casting-ui accessibility heuristic derive from `classifyEnv` instead of re-reading `NO_COLOR`/`CI`. This is the change that makes the env policy genuinely single-source; do it last so the earlier tasks land independently if needed.

**Files:**
- `cli/casting-ui/src/utils-mode.ts` (EDIT — `shouldForceNumericForAccessibility` delegates)
- `cli/casting-ui/tests/utils-mode.test.ts` (existing tests are the oracle — no behaviour change)

### Design note

`shouldForceNumericForAccessibility({ NO_COLOR, CI })` must return the SAME boolean as today: `noColor || ci`. `classifyEnv` computes that as `forceNumeric`, but it requires an `isTTY` field that `forceNumeric` ignores. Pass `isTTY: true` (any value works — `forceNumeric` does not read it; documented in `classifyEnv`). Verify the dependency: `@hexagram/casting-ui` must depend on `@hexagram/viewer-core` (it already does — casting-ui imports viewer-core chrome extensively).

### Steps

- [ ] Confirm the EXISTING `shouldForceNumericForAccessibility` tests in `utils-mode.test.ts` cover: NO_COLOR-only true, CI-only true, both-unset false, empty-string-as-unset false. If any case is missing, ADD it now (red-safe — the current impl already satisfies them) so the delegation is fully pinned. Minimum cases:

```ts
describe('shouldForceNumericForAccessibility', () => {
  test('NO_COLOR set non-empty -> true', () => {
    expect(
      shouldForceNumericForAccessibility({ NO_COLOR: '1', CI: undefined }),
    ).toBe(true)
  })
  test('CI set non-empty -> true', () => {
    expect(
      shouldForceNumericForAccessibility({ NO_COLOR: undefined, CI: 'true' }),
    ).toBe(true)
  })
  test('both unset -> false', () => {
    expect(
      shouldForceNumericForAccessibility({ NO_COLOR: undefined, CI: undefined }),
    ).toBe(false)
  })
  test('empty strings treated as unset -> false', () => {
    expect(shouldForceNumericForAccessibility({ NO_COLOR: '', CI: '' })).toBe(
      false,
    )
  })
})
```
  - Run them on the CURRENT impl first to confirm they are green (the oracle): `pnpm --filter @hexagram/casting-ui test -- utils-mode`.

- [ ] Replace the body of `shouldForceNumericForAccessibility` in `utils-mode.ts`:

  BEFORE:
  ```ts
  export function shouldForceNumericForAccessibility(envVars: {
    NO_COLOR: string | undefined
    CI: string | undefined
  }): boolean {
    const noColor = envVars.NO_COLOR !== undefined && envVars.NO_COLOR !== ''
    const ci = envVars.CI !== undefined && envVars.CI !== ''
    return noColor || ci
  }
  ```
  AFTER:
  ```ts
  export function shouldForceNumericForAccessibility(envVars: {
    NO_COLOR: string | undefined
    CI: string | undefined
  }): boolean {
    // Derive from the single env policy. `forceNumeric` ignores `isTTY`, so the
    // value passed here is immaterial (non-TTY already routes to plain mode).
    return classifyEnv({ isTTY: true, ...envVars }).forceNumeric
  }
  ```
  - Add to the imports at the top of `utils-mode.ts`:
    ```ts
    import { classifyEnv } from '@hexagram/viewer-core'
    ```
  - Keep the rich JSDoc block above the function (it documents the heuristic + detection rules) — only the implementation changes.

- [ ] Run the oracle tests (green — unchanged behaviour): `pnpm --filter @hexagram/casting-ui test -- utils-mode`. Also run the package's `parseCliFlags` tests (they exercise `shouldForceNumericForAccessibility` transitively via `inputMode`): `pnpm --filter @hexagram/casting-ui test`.

- [ ] Type-check: `pnpm --filter @hexagram/casting-ui type:check` — expected exit 0. If `@hexagram/viewer-core` resolves as unresolved, add it to `cli/casting-ui/package.json` dependencies (it should already be present) and `pnpm install`.

- [ ] **Commit:** `refactor(casting-ui): derive force-numeric heuristic from classifyEnv`

---

## Final verification

- [ ] Build the whole workspace (catches any exports/path drift the per-package checks missed): `pnpm build` — expected: all packages build, topological order, exit 0.
- [ ] Full test suite: `pnpm test` — expected: all green (includes the slow 1M-iteration `rng distribution` block — ~40 s; budget for it). To skip it locally while iterating: `pnpm --filter @hexagram/core test -- -t '^(?!rng distribution \(slow\))'` then `pnpm test` once before the final commit.
- [ ] `pnpm type:check` — expected: all packages exit 0.
- [ ] `pnpm lint:check && pnpm format:check` — expected: clean. Run `pnpm lint:fix && pnpm format:fix` if needed, then re-check.
- [ ] Sanity grep — confirm the leaks are gone: there should be NO remaining `path.join(process.cwd(), 'consultations')` outside `defaultConsultationsDir`, and NO remaining inline `requires an interactive terminal` literal at the history/manual bins (the string now lives ONLY in `env-policy.ts`'s `refuseIfNonInteractive` and the run-entry constants in `run-hexagram.tsx` / `run-playground-app.ts`, which this slice intentionally left).

## Notes / scope boundaries

- **Out of scope (by decision in Task 4):** unifying `runHexagram()` / `runPlaygroundApp()`'s boolean-returning refusal onto the exiting `refuseIfNonInteractive`. Their unit-tested "never calls `process.exit`" contract makes the exiting helper the wrong tool; a non-exiting variant is a separate follow-up.
- **No per-flag clamp was found** among the five `parse*Ms` parsers — all share the identical `> 0` gate with no upper bound. `parseIntFlag`'s `> 0` gate is therefore the complete, faithful semantics; no clamp needs to live at a call site. (CLAUDE.md describes a `[30, 250]` tick clamp, but that is in `deriveTickMs`, not in any `parse*Ms` parser — leave `deriveTickMs` untouched.)
- The `--wrap-width` floor in CLAUDE.md ("floored so the fixed-width diagrams are never broken") is applied downstream in `computeWrapWidth`/layout, NOT in `parseWrapWidth` — so it is unaffected by this refactor.
