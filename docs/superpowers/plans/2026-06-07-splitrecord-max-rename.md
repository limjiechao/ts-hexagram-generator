# SplitRecord.max → recordedMax Rename Implementation Plan (S3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Sub-agent dispatch may be unavailable in this environment — execute inline.

**Goal:** Rename the misleadingly-named persisted field `SplitRecord.max` to `recordedMax` **in memory only**, keeping the on-disk YAML key `max` unchanged via an explicit per-`SplitRecord` mapping at the converter seam — so the in-memory name stops lying without any `schemaVersion` bump, without breaking any existing saved consultation, and with **zero change to the on-disk fixture bytes**.

**Architecture:** This is **Approach A** from the Phase-2 study (the S2 plan's gated "2-d2" stub, refined). `SplitRecord` becomes `{ pick: number; recordedMax: number }`. Every TypeScript construction/read site is renamed. The one seam that holds the legacy on-disk name — the `castingToYaml`/`castingFromYaml` converter in `domain/consultation-file/src/frontmatter.ts` — gains an explicit per-`SplitRecord` field mapping: write `{ pick, recordedMax }` → on-disk `{ pick, max }`; read on-disk `{ pick, max }` → `{ pick, recordedMax }`. The on-disk format is therefore byte-identical to today.

**Tech Stack:** TypeScript, pnpm + Turborepo monorepo, vitest, tsdown (`.mjs` / `.d.mts` emit), gray-matter + js-yaml for the file format.

---

## HUMAN-DECISION FORKS — confirm BEFORE a fresh agent runs this plan

This plan is planning-only output; a human must confirm two forks before execution:

1. **Approach A (this plan) vs Approach B.** This plan implements **Approach A**: in-memory rename, on-disk key stays `max`, no `schemaVersion` bump, all existing files stay readable, zero fixture-byte diff. **Approach B** (rename the on-disk key too + bump `schemaVersion` to 2 + write a migration) was evaluated and **rejected** as disproportionate: ADR-0008 strict-equals `schemaVersion`, so B would make every existing saved file `[unreadable]` until migrated, and would change every `md-file-*.md` fixture — a heavy blast radius for a cosmetic on-disk key name with no behavioural upside. **Recommendation: Approach A.** Only switch to B if the team explicitly wants a clean on-disk name and accepts the migration + ADR amendment.

2. **The new field name.** This plan uses **`recordedMax`**. Rationale: it is already the established alias for this exact quantity throughout the codebase — the helpers `selectablePickMax(recordedMax)` / `stalkCountFor(recordedMax)` take a `recordedMax: number` param (`domain/core/src/casting-derivation.ts:24,35`), `maxPickFor`'s doc calls its result the "recorded max" (`domain/core/src/index.ts:189`), and `viewer-flow.ts:126` already exports `recordedMaxFor`. Renaming the field onto this existing vocabulary collapses an alias rather than introducing a 4th one (DRY-of-knowledge). Alternatives considered and not chosen: `stalksLessSuspended` (most descriptive but verbose, and introduces a brand-new term), `partitionMax` (no existing currency). **If the human prefers a different name, apply it uniformly to EVERY before/after below.**

---

## Phase-1 grounded facts (everything a fresh implementer needs — no other context required)

### What the field is

`SplitRecord = { pick: number; max: number }` — `domain/core/src/types.ts:75`.

`max` is the **recorded** ceiling: `unparted − 1`, where the `−1` reserves the one suspended stalk (掛一). It is **never itself a legal pick** — the legal pick range is `[1, max − 1]`. The named home of the selectable ceiling is `selectablePickMax(recordedMax) = recordedMax − 1` (`domain/core/src/casting-derivation.ts:24`). The inverse `stalkCountFor(recordedMax) = recordedMax + 1` recovers the true stalk count (`casting-derivation.ts:35`). The field name `max` lies: it is one greater than any pick that can occupy it.

### This is NOT a correctness bug

A runtime guard `assertSelectablePick(recordedMax, pick)` (`casting-derivation.ts:43`) is called by `performCast` (`domain/core/src/index.ts:227`) and every input flow clamps to `selectablePickMax` before committing. So an illegal pick cannot reach a saved record. **S3 is pure legibility / DRY-of-name, not correctness.** This rename changes no behaviour and no on-disk bytes.

### What S2 already fixed (DO NOT redo)

- Added the named helpers `selectablePickMax` and `stalkCountFor` and routed the open-coded `±1` arithmetic through them (commit `f9d5a11`, plus the helpers in `casting-derivation.ts`).
- Renamed the slider-bounce reflection boundary to `upperBound` and documented it as geometry, not a pick clamp (commit `4c26950`, `bouncing-slider-store.ts:177`).
- Collapsed the alias prose in `slider-prompt.tsx` / `casting-prompt-box.tsx`.

S2 fixed the **arithmetic** legibility. It did **not** rename the field itself — `SplitRecord.max` still lies at every read/destructure. That residue is S3.

### Every SITE that names the `SplitRecord` field `max`

**Definition + type guard (`domain/core/`):**
- `domain/core/src/types.ts:71-75` — the doc comment + `export type SplitRecord = { pick: number; max: number }`.
- `domain/core/src/types.ts:122,124` — `isSplitRecord`: `'max' in value && … typeof value.max === 'number'`.

**Construction sites (build a `SplitRecord`):**
- `domain/core/src/random-casting.ts:70-72` — `{ pick: firstSplit, max: firstMax }` ×3.
- `cli/casting-ui/src/interactive-flow.ts:33` — `return { pick, max }`.
- `cli/casting-ui/src/viewer-flow.ts:190,192` — `const max = maxPickFor(before)` then `const split: SplitRecord = { pick: action.pick, max }`.
- `domain/consultation-file/src/legacy-converter.ts:123-125` — `{ pick: row[0][1], max: row[0][0] }` ×3.

**Read sites (destructure / access `.max` off a `SplitRecord`):**
- `domain/core/src/casting-derivation.ts:89-95` — `deriveSplit({ pick, max })` destructure + uses of `max` inside.
- `cli/casting-ui/src/viewer.tsx:245` — `state.castingPlan.casting[state.lineIndex][state.castIndex].max`.

**Test builder:**
- `domain/consultation-file/tests/fixtures/cases.ts:11-13` — `lc(...)` helper builds `{ pick, max }` ×3 (the in-memory case data; this MUST change to `recordedMax`).

**The converter seam (where the on-disk name is held):**
- `domain/consultation-file/src/frontmatter.ts:39-48` — `castingToYaml(casting)` / `castingFromYaml(yaml)` currently pass whole `LineCasting` tuples through **opaquely** (`return { L6, L5, … }`), so the inner `SplitRecord` objects are serialized field-for-field by js-yaml. **This is why the on-disk key is `max` today and why a naive TS rename would leak to disk.** This seam must be changed to map per-`SplitRecord`: on write `{ pick, recordedMax }` → `{ pick, max: recordedMax }`; on read `{ pick, max }` → `{ pick, recordedMax: max }`.

### The persistence reality (blast radius)

The on-disk YAML key IS `max:` directly. Confirmed in fixtures:

```
domain/consultation-file/tests/fixtures/md-file-one-moving.md:14:    - pick: 21
domain/consultation-file/tests/fixtures/md-file-one-moving.md:15:      max: 48
```

Fixtures containing `max:` on disk:
- `domain/consultation-file/tests/fixtures/md-file-one-moving.md`
- `domain/consultation-file/tests/fixtures/md-file-no-moving.md`
- `domain/consultation-file/tests/fixtures/md-file-multi-moving.md`
- `domain/consultation-file/tests/fixtures/md-file-empty-query.md`

In-memory fixture builder (NOT on disk, but uses the field name):
- `domain/consultation-file/tests/fixtures/cases.ts`
- `cli/casting-ui/tests/fixtures/cases.ts` — confirm whether it constructs `SplitRecord`s directly; if it imports the casting cases from `domain/consultation-file/tests/fixtures/cases.ts` it needs no edit, but VERIFY in Task 0.

**Key reviewability property:** because the on-disk key stays `max`, the four `md-file-*.md` golden files MUST stay byte-identical. `pnpm generate-fixtures` after the rename must yield **no diff**. A diff means the rename leaked to disk → STOP.

### `.max` that is NOT this field (do NOT touch)

Most `\bmax\b` / `Math.max` / local-variable `max` hits in `cli/casting-ui/` and elsewhere are prompt-local ceilings, slider bounds, or `Math.max` calls — NOT the `SplitRecord` field. Only the sites enumerated above touch the persisted field. In particular leave alone: `bouncing-slider-store.ts` (`this.max`, `upperBound`), `slider-prompt.tsx` (`min..max` cursor bounds), `number-input.tsx` (`max` prop), `utils-mode.ts` (`deriveTickMs(... max ...)`), `bounce-trajectory.ts`, all `Math.max(...)`, and `casting-prompt-box.tsx`'s `max` PROP (it is the *selectable* ceiling passed to the input widget, already `selectablePickMax(currentMax)` — renaming that prop is S2-adjacent prompt vocabulary, out of scope here).

---

## File structure (what each touched file is responsible for)

| File | Responsibility | Change |
| --- | --- | --- |
| `domain/core/src/types.ts` | `SplitRecord` definition + `isSplitRecord` guard | rename field + guard key |
| `domain/core/src/casting-derivation.ts` | `deriveSplit` destructure + doc comments | rename destructure |
| `domain/core/src/random-casting.ts` | RNG construction of splits | rename construction key |
| `cli/casting-ui/src/interactive-flow.ts` | typed-prompt construction of split | rename construction key |
| `cli/casting-ui/src/viewer-flow.ts` | reducer construction of split | rename construction key |
| `cli/casting-ui/src/viewer.tsx` | reads `.max` off the recorded split | rename read |
| `domain/consultation-file/src/legacy-converter.ts` | legacy `.txt` → split construction | rename construction key |
| `domain/consultation-file/src/frontmatter.ts` | **converter seam — holds on-disk name** | add per-`SplitRecord` map |
| `domain/consultation-file/tests/fixtures/cases.ts` | in-memory fixture builder | rename builder key |
| `domain/consultation-file/tests/*.test.ts` | round-trip + byte-identity assertions | add/extend tests |

---

## Build coupling you MUST respect

Downstream packages type-check against the **built `.d.mts`** of upstream domain packages (the `types` export condition resolves to `dist/*.d.mts` for consumers, per CLAUDE.md "Library packages publish via `package.json#exports`"). So after changing `@hexagram/core` (`types.ts`) and `@hexagram/consultation-file` (`frontmatter.ts`), you MUST rebuild those upstream packages before the downstream `cli/casting-ui` type-check will see the new field name:

```bash
pnpm --filter @hexagram/core build
pnpm --filter @hexagram/consultation-file build
```

The final full-workspace gates (`pnpm build && pnpm type:check && pnpm test`) cover this via Turborepo topological order, but per-package iteration needs the manual rebuild. The dev/test run itself uses the `source` export condition (`tsx`/`vitest` read `src/index.ts` directly), so vitest sees the rename without a rebuild — only cross-package **type-check** needs the dist rebuild.

---

## Task 0: Verify the ground truth before changing anything

**Files:** none (read-only).

- [ ] **Step 1: Confirm the baseline is green.**

Run:
```bash
pnpm install
pnpm --filter @hexagram/core test
pnpm --filter @hexagram/consultation-file test
```
Expected: PASS. If red, STOP and report — do not start a rename on a red baseline.

- [ ] **Step 2: Capture the on-disk fixture bytes as the byte-identity baseline.**

Run:
```bash
git rev-parse HEAD
shasum domain/consultation-file/tests/fixtures/md-file-*.md
```
Record the four checksums. After every subsequent task these MUST be unchanged. (They are the canonical proof the rename did not leak to disk.)

- [ ] **Step 3: Confirm whether `cli/casting-ui/tests/fixtures/cases.ts` constructs `SplitRecord`s directly or imports them.**

Run:
```bash
grep -n "max\|pick\|import" cli/casting-ui/tests/fixtures/cases.ts | head -30
```
If it constructs `{ pick, max }` literals directly, add it to the rename list (it is an in-memory builder, not on-disk, so renaming its key is correct and changes no `.md` bytes). If it imports `cases` from `domain/consultation-file/tests/fixtures/cases.ts`, it needs no edit. Record which.

- [ ] **Step 4: No commit** (read-only task).

---

## Task 1: Add the failing round-trip + byte-identity tests FIRST (TDD red)

This task encodes the two invariants the whole rename must preserve, BEFORE renaming. The round-trip test asserts the **in-memory** field is `recordedMax`; the byte-identity test asserts the **on-disk** key stays `max`. Both fail to compile / fail now (the field is still `max`), which is the intended red.

**Files:**
- Test: `domain/consultation-file/tests/file.test.ts` (extend) or a new `domain/consultation-file/tests/recorded-max-rename.test.ts` (create). Use a new file to keep the diff single-intent.

- [ ] **Step 1: Create the failing test file.**

Create `domain/consultation-file/tests/recorded-max-rename.test.ts`:

```typescript
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { CastingRecord } from '@hexagram/core/types'
import { describe, expect, it } from 'vitest'

import { saveConsultationFile, loadConsultationFile } from '../src/file.js'

// A fully-populated casting record built with the RENAMED in-memory field.
// This will not COMPILE until SplitRecord.recordedMax exists — that is the
// intended TDD-red for the in-memory rename.
const recordedMax1 = 48
const recordedMax2 = 43
const recordedMax3 = 39
const lc = (p1: number, p2: number, p3: number) =>
  [
    { pick: p1, recordedMax: recordedMax1 },
    { pick: p2, recordedMax: recordedMax2 },
    { pick: p3, recordedMax: recordedMax3 },
  ] as const

const casting = [
  lc(27, 28, 30),
  lc(22, 23, 29),
  lc(17, 24, 14),
  lc(22, 34, 25),
  lc(10, 26, 33),
  lc(12, 20, 18),
] as unknown as CastingRecord

const hexagram = [7, 8, 7, 8, 7, 8] as const

describe('SplitRecord.recordedMax in-memory ↔ max on-disk', () => {
  it('round-trips: the in-memory field is recordedMax after load', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'recmax-'))
    try {
      const file = saveConsultationFile({
        query: 'round-trip',
        hexagram: hexagram as unknown as CastingRecord[number] extends never
          ? never
          : [7, 8, 7, 8, 7, 8],
        casting,
        castingAbsence: null,
        dir,
      })
      const loaded = loadConsultationFile(file)
      expect(loaded.ok).toBe(true)
      if (!loaded.ok) return
      const split = loaded.data.envelope.casting![0][0]
      // In-memory field name is recordedMax (not max).
      expect(split).toHaveProperty('recordedMax', 48)
      expect(split).not.toHaveProperty('max')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('persists the on-disk YAML key as `max`, never `recordedMax`', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'recmax-'))
    try {
      const file = saveConsultationFile({
        query: 'on-disk',
        hexagram: [7, 8, 7, 8, 7, 8] as unknown as [
          7,
          8,
          7,
          8,
          7,
          8,
        ],
        casting,
        castingAbsence: null,
        dir,
      })
      const text = readFileSync(file, 'utf8')
      expect(text).toContain('max: 48')
      expect(text).not.toContain('recordedMax:')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
```

> NOTE TO IMPLEMENTER: before writing this, OPEN `domain/consultation-file/src/file.ts` and match the REAL signatures of `saveConsultationFile` / `loadConsultationFile` (arguments, return shape, whether `dir` is a parameter, whether load returns a tagged `{ ok }` result or throws). The skeleton above mirrors the documented API (CLAUDE.md: `saveConsultationFile({ query, hexagram, casting })`, `loadConsultationFile(filePath)`) but ADAPT the exact call/return to the source — do not invent fields. If `saveConsultationFile` has no `dir` param, drive it via the same temp-dir pattern the existing `file.test.ts` uses (read that test first and copy its harness).

- [ ] **Step 2: Run the new test — expect RED (compile error on `recordedMax`).**

Run: `pnpm --filter @hexagram/consultation-file test -- recorded-max-rename`
Expected: FAIL — the test references `recordedMax` which does not exist yet (type error) OR the runtime assertion `toHaveProperty('recordedMax')` fails because the field is still `max`.

- [ ] **Step 3: Commit the failing test.**

```bash
git add domain/consultation-file/tests/recorded-max-rename.test.ts
git commit -m "test(consultation-file): pin recordedMax in-memory ↔ max on-disk (S3, red)

Encodes the two S3 invariants BEFORE the rename: the in-memory SplitRecord
field is recordedMax, and the on-disk YAML key stays max. Both currently fail —
the field is still named max — which is the intended TDD-red.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 2: Rename the field in the type + guard (`@hexagram/core`)

**Files:**
- Modify: `domain/core/src/types.ts:71-75,122,124`

- [ ] **Step 1: Rename the type + its doc comment.**

In `domain/core/src/types.ts`, replace:

```typescript
// One stalk division: the index the stalks were parted at (`pick`) and the
// largest index that was selectable for that round (`max`, i.e. the prompt's
// "Pick a number from 1 to max"). Captured for both interactive picks and
// RNG-chosen splits so the casting can be replayed.
export type SplitRecord = { pick: number; max: number }
```

with:

```typescript
// One stalk division: the index the stalks were parted at (`pick`) and the
// RECORDED ceiling for that round (`recordedMax` = `unparted − 1`, reserving the
// one suspended stalk 掛一). `recordedMax` is NOT a legal pick: the selectable
// range is `[1, recordedMax − 1]` = `[1, selectablePickMax(recordedMax)]` (see
// `casting-derivation.ts`). The field is PERSISTED, but its on-disk YAML key
// stays `max` — the rename is mapped at the converter seam in
// `consultation-file`'s `frontmatter.ts` (no schemaVersion bump; ADR-0008).
// Captured for both interactive picks and RNG-chosen splits so the casting can
// be replayed.
export type SplitRecord = { pick: number; recordedMax: number }
```

- [ ] **Step 2: Rename the guard keys.**

In `domain/core/src/types.ts`, in `isSplitRecord`, replace:

```typescript
  'max' in value &&
  typeof value.pick === 'number' &&
  typeof value.max === 'number'
```

with:

```typescript
  'recordedMax' in value &&
  typeof value.pick === 'number' &&
  typeof value.recordedMax === 'number'
```

> VERIFY the exact surrounding lines first (`types.ts:118-124`) — the `'pick' in value` clause sits between; preserve it.

- [ ] **Step 3: Rebuild core so downstream type-check sees the new field.**

Run: `pnpm --filter @hexagram/core build`
Expected: PASS (emit `dist/types.d.mts` with `recordedMax`).

- [ ] **Step 4: Commit.**

```bash
git add domain/core/src/types.ts
git commit -m "refactor(core): rename SplitRecord.max → recordedMax (S3)

The field named max lies: it is the RECORDED ceiling (unparted − 1, reserving
掛一), never a legal pick — the legal range is [1, recordedMax − 1]. Rename it
onto the existing recordedMax vocabulary (selectablePickMax/stalkCountFor
already take a recordedMax param) so the in-memory name tells the truth. The
on-disk YAML key is unchanged (mapped at the converter seam in a later commit).

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 3: Rename the `deriveSplit` read site + comments (`@hexagram/core`)

**Files:**
- Modify: `domain/core/src/casting-derivation.ts:89-95` (and the doc comments at `:14,29,57,62,86`)

- [ ] **Step 1: Rename the destructure and internal uses.**

In `domain/core/src/casting-derivation.ts`, replace the body of `deriveSplit`:

```typescript
export function deriveSplit({ pick, max }: SplitRecord): DerivedSplit {
  const stalks = stalkCountFor(max)
  const leftHeap = pick
  const rightHeap = max - pick + 1
  const leftRemainder = neverZeroMod4(pick)
  const leftPiles = (pick - leftRemainder) / 4
  const rightSorted = max - pick // right heap minus the 1 suspended stalk
  const rightRemainder = neverZeroMod4(rightSorted)
  const rightPiles = (rightSorted - rightRemainder) / 4
```

with:

```typescript
export function deriveSplit({ pick, recordedMax }: SplitRecord): DerivedSplit {
  const stalks = stalkCountFor(recordedMax)
  const leftHeap = pick
  const rightHeap = recordedMax - pick + 1
  const leftRemainder = neverZeroMod4(pick)
  const leftPiles = (pick - leftRemainder) / 4
  const rightSorted = recordedMax - pick // right heap minus the 1 suspended stalk
  const rightRemainder = neverZeroMod4(rightSorted)
  const rightPiles = (rightSorted - rightRemainder) / 4
```

- [ ] **Step 2: Update the doc comments that name `SplitRecord.max` / `{ pick, max }`.**

In `domain/core/src/casting-derivation.ts`, update the prose mentions so they read `recordedMax` / `{ pick, recordedMax }`:
- `:14` — "(a pick of `max` would leave …)" → "(a pick of `recordedMax` would leave …)"
- `:29` — "`SplitRecord.max` bakes in: `max` is the unparted stalk count …" → "`SplitRecord.recordedMax` bakes in: `recordedMax` is the unparted stalk count …"
- `:57` — "from its `{ pick, max }` record" → "from its `{ pick, recordedMax }` record"
- `:62` — "(`stalkCountFor(max)`)" → "(`stalkCountFor(recordedMax)`)"
- `:86` — "`{ pick, max }` record" → "`{ pick, recordedMax }` record"

> The helper param names (`selectablePickMax(recordedMax)`, `stalkCountFor(recordedMax)`) are ALREADY `recordedMax` — do not touch them.

- [ ] **Step 3: Run core tests.**

Run: `pnpm --filter @hexagram/core test`
Expected: PASS (the in-memory tests in core construct splits; if any core test builds `{ pick, max }` literals, fix them in this commit — search `grep -rn "max:" domain/core/tests`).

- [ ] **Step 4: Rebuild core.**

Run: `pnpm --filter @hexagram/core build`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add domain/core/src/casting-derivation.ts
git commit -m "refactor(core): read SplitRecord.recordedMax in deriveSplit (S3)

Follow the types.ts rename through deriveSplit's destructure and the doc
comments that named the field. No arithmetic change — every recordedMax − pick
is the same value the old max − pick produced.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 4: Rename the RNG construction site (`@hexagram/core`)

**Files:**
- Modify: `domain/core/src/random-casting.ts:35-38,70-72`

- [ ] **Step 1: Rename the construction.**

In `domain/core/src/random-casting.ts`, replace:

```typescript
    splits: [
      { pick: firstSplit, max: firstMax },
      { pick: secondSplit, max: secondMax },
      { pick: thirdSplit, max: thirdMax },
    ],
```

with:

```typescript
    splits: [
      { pick: firstSplit, recordedMax: firstMax },
      { pick: secondSplit, recordedMax: secondMax },
      { pick: thirdSplit, recordedMax: thirdMax },
    ],
```

> The local variables `firstMax`/`secondMax`/`thirdMax` MAY stay as-is (they are the recorded ceiling = `stalks − 1`). Optionally rename the comment at `:35-37` ("`max` mirrors the selectable range …") to read `recordedMax`; the prose is slightly misleading either way but is out of scope to rewrite — at minimum change `max` → `recordedMax` in that comment for consistency.

- [ ] **Step 2: Run core tests + rebuild.**

Run:
```bash
pnpm --filter @hexagram/core test
pnpm --filter @hexagram/core build
```
Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add domain/core/src/random-casting.ts
git commit -m "refactor(core): construct splits with recordedMax in random-casting (S3)

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 5: Map the converter seam — on-disk key stays `max` (`@hexagram/consultation-file`)

This is the load-bearing task: it is the ONE place that holds the legacy on-disk name. After this, the in-memory field is `recordedMax` but the YAML on disk is still `max`.

**Files:**
- Modify: `domain/consultation-file/src/frontmatter.ts:30-48`

- [ ] **Step 1: Understand the current converter.**

Today `castingToYaml` / `castingFromYaml` pass whole `LineCasting` tuples opaquely:

```typescript
export function castingToYaml(casting: CastingRecord): YamlCasting {
  const [L1, L2, L3, L4, L5, L6] = casting
  return { L6, L5, L4, L3, L2, L1 }
}

export function castingFromYaml(yaml: YamlCasting): CastingRecord {
  return [yaml.L1, yaml.L2, yaml.L3, yaml.L4, yaml.L5, yaml.L6]
}
```

`YamlCasting`'s value type is `LineCasting` (= `[SplitRecord, SplitRecord, SplitRecord]`). Because the `SplitRecord` is passed through unchanged, js-yaml serializes whatever field name it has. We must now (a) give the on-disk YAML its OWN split shape with key `max`, and (b) map each `SplitRecord` field-for-field.

- [ ] **Step 2: Introduce an on-disk split type + per-split mappers.**

In `domain/consultation-file/src/frontmatter.ts`, replace the `YamlCasting` type and the two casting converters with:

```typescript
/**
 * On-disk shape of one stalk division. The in-memory field is `recordedMax`
 * (`@hexagram/core` SplitRecord), but the persisted YAML key stays `max` for
 * backward compatibility — no schemaVersion bump, every existing file still
 * loads (ADR-0008). This converter is the SINGLE seam that holds the legacy
 * on-disk name; see `SplitRecord` in `@hexagram/core/types`.
 */
type YamlSplit = { pick: number; max: number }
type YamlLineCasting = [YamlSplit, YamlSplit, YamlSplit]

export type YamlCasting = {
  L6: YamlLineCasting
  L5: YamlLineCasting
  L4: YamlLineCasting
  L3: YamlLineCasting
  L2: YamlLineCasting
  L1: YamlLineCasting
}

const splitToYaml = ({ pick, recordedMax }: SplitRecord): YamlSplit => ({
  pick,
  max: recordedMax,
})

const splitFromYaml = ({ pick, max }: YamlSplit): SplitRecord => ({
  pick,
  recordedMax: max,
})

const lineCastingToYaml = (line: LineCasting): YamlLineCasting => [
  splitToYaml(line[0]),
  splitToYaml(line[1]),
  splitToYaml(line[2]),
]

const lineCastingFromYaml = (line: YamlLineCasting): LineCasting => [
  splitFromYaml(line[0]),
  splitFromYaml(line[1]),
  splitFromYaml(line[2]),
]

/** Convert bottom-first `CastingRecord` → top-first YAML mapping (`L6` first). */
export function castingToYaml(casting: CastingRecord): YamlCasting {
  const [L1, L2, L3, L4, L5, L6] = casting
  return {
    L6: lineCastingToYaml(L6),
    L5: lineCastingToYaml(L5),
    L4: lineCastingToYaml(L4),
    L3: lineCastingToYaml(L3),
    L2: lineCastingToYaml(L2),
    L1: lineCastingToYaml(L1),
  }
}

/** Convert top-first YAML mapping → bottom-first `CastingRecord`. */
export function castingFromYaml(yaml: YamlCasting): CastingRecord {
  return [
    lineCastingFromYaml(yaml.L1),
    lineCastingFromYaml(yaml.L2),
    lineCastingFromYaml(yaml.L3),
    lineCastingFromYaml(yaml.L4),
    lineCastingFromYaml(yaml.L5),
    lineCastingFromYaml(yaml.L6),
  ]
}
```

> Add `type SplitRecord` to the existing import from `@hexagram/core/types` at the top of `frontmatter.ts` (it currently imports `LineCasting`; add `SplitRecord` to the same import group). `LineCasting` is still used by `lineCastingToYaml`'s param type, so keep it.

- [ ] **Step 3: Check `isYamlCasting`.**

The parse guard `isYamlCasting` (`frontmatter.ts:206`) only checks the `L1..L6` keys exist; it does NOT inspect the inner split keys. The real validation happens via `isCastingRecord(castingFromYaml(casting))` AFTER conversion (`:179-181`). Since `splitFromYaml` reads the on-disk `max` and `isCastingRecord` now checks for `recordedMax` (via the updated `isSplitRecord` from Task 2), the chain is correct: on-disk `max` → mapped to `recordedMax` → validated. **No change needed to `isYamlCasting`** unless you want to tighten it; leave it (out of scope, minimal diff).

- [ ] **Step 4: Rebuild consultation-file + run its tests.**

Run:
```bash
pnpm --filter @hexagram/consultation-file build
pnpm --filter @hexagram/consultation-file test -- recorded-max-rename
```
Expected: the round-trip + byte-on-disk tests from Task 1 now PASS (in-memory `recordedMax`, on-disk `max`).

- [ ] **Step 5: Verify the byte-identity fixtures still match.**

The fixture builder `cases.ts` still constructs `{ pick, max }` at this point (not yet renamed), but `castingToYaml` now expects `recordedMax`. This means `fixtures.test.ts` may FAIL to type-check / fail at runtime until Task 6 renames `cases.ts`. **Expected ordering:** Task 5 makes the converter correct; Task 6 fixes the in-memory builder. If `fixtures.test.ts` is red between Task 5 and Task 6, that is expected — proceed to Task 6 immediately. Do NOT regenerate fixtures here.

- [ ] **Step 6: Commit.**

```bash
git add domain/consultation-file/src/frontmatter.ts
git commit -m "refactor(consultation-file): map recordedMax ↔ on-disk max at converter seam (S3)

The in-memory SplitRecord field is now recordedMax, but the persisted YAML key
must stay max so existing saved consultations keep loading with no schemaVersion
bump (ADR-0008). castingToYaml/castingFromYaml previously passed SplitRecords
through opaquely (js-yaml serialized whatever field name they had); now they map
per-split: recordedMax → on-disk max on write, on-disk max → recordedMax on read.
This converter is the single seam that holds the legacy on-disk name.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 6: Rename the in-memory fixture builder (`@hexagram/consultation-file` tests)

**Files:**
- Modify: `domain/consultation-file/tests/fixtures/cases.ts:9-13`

- [ ] **Step 1: Rename the builder keys.**

In `domain/consultation-file/tests/fixtures/cases.ts`, replace:

```typescript
): LineCasting => [
  { pick: p1, max: m1 },
  { pick: p2, max: m2 },
  { pick: p3, max: m3 },
]
```

with:

```typescript
): LineCasting => [
  { pick: p1, recordedMax: m1 },
  { pick: p2, recordedMax: m2 },
  { pick: p3, recordedMax: m3 },
]
```

> The parameter names `m1`/`m2`/`m3` and defaults (`= 48`, `= 43`, `= 39`) stay — they are the recorded-max VALUES, unchanged. Only the object key changes.

- [ ] **Step 2: Run the fixture byte-identity tests.**

Run: `pnpm --filter @hexagram/consultation-file test`
Expected: PASS — including `fixtures.test.ts`'s `md-file-*` byte-identical assertions. The on-disk bytes are unchanged because `castingToYaml` maps `recordedMax` → `max:`.

- [ ] **Step 3: Confirm the on-disk fixtures are byte-unchanged vs Task 0 baseline.**

Run:
```bash
shasum domain/consultation-file/tests/fixtures/md-file-*.md
git status --porcelain domain/consultation-file/tests/fixtures/
```
Expected: the four checksums MATCH Task 0's, and `git status` shows NO modified `.md` fixtures. If any `.md` shows modified → the rename leaked to disk → STOP and report.

- [ ] **Step 4: Commit.**

```bash
git add domain/consultation-file/tests/fixtures/cases.ts
git commit -m "test(consultation-file): build fixture cases with recordedMax (S3)

The in-memory fixture builder uses the renamed field; the on-disk golden
md-file-*.md bytes are unchanged (the converter maps recordedMax → max:),
proving the rename did not leak to disk.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 7: Rename the legacy-converter construction site (`@hexagram/consultation-file`)

**Files:**
- Modify: `domain/consultation-file/src/legacy-converter.ts:83,121-127,133,136-137,164`

- [ ] **Step 1: Rename the construction.**

In `domain/consultation-file/src/legacy-converter.ts`, replace:

```typescript
function splitsToLineCasting(row: RawSplits): LineCasting {
  return [
    { pick: row[0][1], max: row[0][0] },
    { pick: row[1][1], max: row[1][0] },
    { pick: row[2][1], max: row[2][0] },
  ]
}
```

with:

```typescript
function splitsToLineCasting(row: RawSplits): LineCasting {
  return [
    { pick: row[0][1], recordedMax: row[0][0] },
    { pick: row[1][1], recordedMax: row[1][0] },
    { pick: row[2][1], recordedMax: row[2][0] },
  ]
}
```

- [ ] **Step 2: Update the doc comments that say `max`.**

Update the prose at `:83`, `:133`, `:136-137`, `:164` so "the round's `max`" reads "the round's `recordedMax`" and "`(max, pick)`" reads "`(recordedMax, pick)`". These are comments describing what the parsed columns mean; the legacy `.txt` "Stalks" column IS the recorded max. (The parsing logic and the `.txt` corpus are untouched — only the in-memory field name and the comments.)

- [ ] **Step 3: Run consultation-file tests + rebuild.**

Run:
```bash
pnpm --filter @hexagram/consultation-file test
pnpm --filter @hexagram/consultation-file build
```
Expected: PASS — including `legacy-converter.test.ts` (replay validation uses `assertSelectablePick(recordedMax, pick)`, which is unaffected by the field-name change since `deriveSplit`/`performCast` get the same numeric value).

- [ ] **Step 4: Commit.**

```bash
git add domain/consultation-file/src/legacy-converter.ts
git commit -m "refactor(consultation-file): construct legacy splits with recordedMax (S3)

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 8: Rename the interactive-flow construction site (`@hexagram/casting-ui`)

**Files:**
- Modify: `cli/casting-ui/src/interactive-flow.ts:16-34`

- [ ] **Step 1: Rename the local + construction.**

In `cli/casting-ui/src/interactive-flow.ts`, replace:

```typescript
async function getSplitIndex(unpartedStalks: number[]): Promise<SplitRecord> {
  const min = 1
  const max = unpartedStalks.length - 1
  // The selectable ceiling is one below the recorded `max`, so the right heap
  // keeps a countable stalk after suspension and its remainder is never 0. We
  // still RECORD the full `max` so the readout and conservation are unchanged.
  // The rule lives in `@hexagram/core` — see `selectablePickMax`.
  const pickMax = selectablePickMax(max)

  const pick = await number({
    message: `Divide the stalks. Pick a number from ${min} to ${pickMax}.`,
    min,
    max: pickMax,
    step: 1,
    required: true,
  })

  return { pick, max }
}
```

with:

```typescript
async function getSplitIndex(unpartedStalks: number[]): Promise<SplitRecord> {
  const min = 1
  const recordedMax = unpartedStalks.length - 1
  // The selectable ceiling is one below the recorded ceiling, so the right heap
  // keeps a countable stalk after suspension and its remainder is never 0. We
  // still RECORD the full `recordedMax` so the readout and conservation are
  // unchanged. The rule lives in `@hexagram/core` — see `selectablePickMax`.
  const pickMax = selectablePickMax(recordedMax)

  const pick = await number({
    message: `Divide the stalks. Pick a number from ${min} to ${pickMax}.`,
    min,
    max: pickMax,
    step: 1,
    required: true,
  })

  return { pick, recordedMax }
}
```

> The Inquirer `number({ max: pickMax })` option key is the prompt library's API — that `max` is NOT the SplitRecord field; leave it. Only the local `const max` → `const recordedMax` and the returned object key change.

- [ ] **Step 2: Type-check casting-ui.**

Run: `pnpm --filter @hexagram/casting-ui type:check`
Expected: PASS (core + consultation-file already rebuilt in earlier tasks).

- [ ] **Step 3: Commit.**

```bash
git add cli/casting-ui/src/interactive-flow.ts
git commit -m "refactor(casting-ui): construct interactive split with recordedMax (S3)

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 9: Rename the viewer-flow construction + viewer read (`@hexagram/casting-ui`)

**Files:**
- Modify: `cli/casting-ui/src/viewer-flow.ts:181-192`
- Modify: `cli/casting-ui/src/viewer.tsx:241-245`

- [ ] **Step 1: Rename the reducer construction.**

In `cli/casting-ui/src/viewer-flow.ts`, replace:

```typescript
      // The reducer is the SINGLE owner of the per-line algorithm: it advances
      // `lineState` through the pure `performCast` and derives the recorded
      // `max` and resolved `Line` itself. The action carries only the pick.
      const before = state.lineState
      // Defensive: the reducer resets `lineState` after every 3rd cast, so a
      // `splitCommitted` can never arrive on a resolved line (this also
      // satisfies `performCast`/`maxPickFor`'s advanceable input domain).
      if (before.phase === '3rd-cast') return state

      const max = maxPickFor(before)
      const after = performCast(before, action.pick)
      const split: SplitRecord = { pick: action.pick, max }
```

with:

```typescript
      // The reducer is the SINGLE owner of the per-line algorithm: it advances
      // `lineState` through the pure `performCast` and derives the recorded
      // ceiling and resolved `Line` itself. The action carries only the pick.
      const before = state.lineState
      // Defensive: the reducer resets `lineState` after every 3rd cast, so a
      // `splitCommitted` can never arrive on a resolved line (this also
      // satisfies `performCast`/`maxPickFor`'s advanceable input domain).
      if (before.phase === '3rd-cast') return state

      const recordedMax = maxPickFor(before)
      const after = performCast(before, action.pick)
      const split: SplitRecord = { pick: action.pick, recordedMax }
```

> `recordedMaxFor` (the exported helper at `viewer-flow.ts:126`) is ALREADY correctly named — do not touch it. Only the local `const max` → `const recordedMax` and the `split` literal change.

- [ ] **Step 2: Rename the viewer read.**

In `cli/casting-ui/src/viewer.tsx`, replace:

```typescript
  // (`SplitRecord.max`, which equals what `lineState` would derive).
  const currentMax =
    state.phase === 'casting' && state.castIndex !== undefined
      ? recordedMaxFor(state.lineState)
      : state.castingPlan.casting[state.lineIndex][state.castIndex].max
```

with:

```typescript
  // (`SplitRecord.recordedMax`, which equals what `lineState` would derive).
  const currentMax =
    state.phase === 'casting' && state.castIndex !== undefined
      ? recordedMaxFor(state.lineState)
      : state.castingPlan.casting[state.lineIndex][state.castIndex].recordedMax
```

> The local `currentMax` is fine to leave as-is (it is an alias the viewer uses for the recorded ceiling; renaming it is broader prompt-vocabulary cleanup that S2 already weighed — out of scope here). Only the `.max` field access and the comment change. Also update the comment at `viewer.tsx:247` ("one below the recorded `SplitRecord.max`") → "`SplitRecord.recordedMax`" if present.

- [ ] **Step 3: Type-check + test casting-ui.**

Run:
```bash
pnpm --filter @hexagram/casting-ui type:check
pnpm --filter @hexagram/casting-ui test
```
Expected: PASS — including the Phase-7 byte-identity test (`viewer.test.tsx`) that drives the same 18-pick sequence through interactive + manual and asserts equal `saveConsultationFile` args. Both paths build `recordedMax` now, so they stay equal; the save round-trips to the same on-disk `max`.

- [ ] **Step 4: Commit.**

```bash
git add cli/casting-ui/src/viewer-flow.ts cli/casting-ui/src/viewer.tsx
git commit -m "refactor(casting-ui): use recordedMax in viewer reducer + read (S3)

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 10: Full-workspace verification gates

**Files:** none (verification only).

- [ ] **Step 1: Build the whole workspace (topological).**

Run: `pnpm build`
Expected: PASS — all packages build in order; downstream `.d.mts` consumers see `recordedMax`.

- [ ] **Step 2: Type-check the whole workspace.**

Run: `pnpm type:check`
Expected: PASS. Any residual `.max` on a `SplitRecord` surfaces here as a type error — fix it (it should not exist if every site above was renamed).

- [ ] **Step 3: Run the whole test suite.**

Run: `pnpm test`
Expected: PASS. (Includes the slow `rng distribution` test in `domain/core` — ~40s, by design.)

- [ ] **Step 4: ZERO-FIXTURE-DIFF GATE — the critical reviewability check.**

Run:
```bash
pnpm generate-fixtures
git status --porcelain
```
Expected: **NO modified fixture files** — neither `domain/consultation-file/tests/fixtures/md-file-*.md` nor `cli/casting-ui/tests/fixtures/*`. The on-disk key stays `max`, so the rendered bytes are identical. **If `pnpm generate-fixtures` produces ANY diff, the rename LEAKED to disk → STOP, do not commit, report immediately.** A diff means either the converter mapping (Task 5) is wrong or a save path bypassed it.

- [ ] **Step 5: Lint + format gates.**

Run:
```bash
pnpm lint:check
pnpm format:check
```
Expected: PASS. (If `format:check` flags the new test file or `frontmatter.ts`, run `pnpm format:fix` and amend the relevant commit.)

- [ ] **Step 6: Confirm no stray `SplitRecord.max` references remain.**

Run:
```bash
grep -rn "\.max\b" domain/ cli/ apps/ --include='*.ts' --include='*.tsx' | grep -iv "Math.max\|maxPickFor\|maxOffset\|maxStart\|maxHorizontal\|maxCasting\|maxScroll\|maxPan\|pilesMax\|reachablePickMax\|selectablePickMax\|stalksMax\|MAX_\|this.max\|recordedMax"
```
Expected: NO hits that are a `SplitRecord` field access. (The filter drops the known non-SplitRecord `.max` uses. Eyeball any remaining hit — if it's a SplitRecord, rename it.)

- [ ] **Step 7: No commit** (this task is gates only; everything is already committed task-by-task).

---

## Out of scope (do NOT do these)

- **Do NOT redo S2.** The helpers `selectablePickMax` / `stalkCountFor`, the `upperBound` slider-bounce rename, and the alias-prose collapse are already landed. Don't touch `bouncing-slider-store.ts`, `bounce-trajectory.ts`, or the helper definitions.
- **Do NOT change the on-disk YAML key.** It stays `max`. No `schemaVersion` bump. No migration. No ADR-0008 amendment. (That is Approach B — rejected.)
- **Do NOT touch the pick-clamp invariant.** `assertSelectablePick`, `selectablePickMax`, the `[1, recordedMax − 1]` range, and the manual validator (`@hexagram/core/manual-validation`) are correctness-bearing and unchanged. This is a NAME rename, not a behaviour change.
- **Do NOT rename prompt-local ceilings.** The `max` PROP on `casting-prompt-box.tsx` / `slider-prompt.tsx` / `number-input.tsx`, the Inquirer `number({ max })` option, `deriveTickMs(..., max)`, `viewer.tsx`'s `currentMax`/`reachablePickMax` locals, and all `Math.max(...)` are NOT the `SplitRecord` field — leave them.
- **Do NOT touch present-casting provenance** (`castingAbsence`, ADR-0008 reason field) — orthogonal.
- **Do NOT add a branded `Pick`/`RecordedMax` nominal type.** Evaluated and rejected as unrequested generality — the runtime guard already enforces the invariant.

---

## Risks

- **PRIMARY RISK — an accidental on-disk-key change.** If any save path bypasses `castingToYaml` (Task 5's mapper), or if the mapper is wrong, the on-disk key becomes `recordedMax` and (a) every existing saved consultation becomes `[unreadable]` (ADR-0008 has no `recordedMax` key), and (b) the byte-locked fixtures change. **Mitigation:** the Task 1 on-disk test (`expect(text).toContain('max: 48')` + `.not.toContain('recordedMax:')`) and the Task 10 Step 4 zero-fixture-diff gate both catch this. Treat ANY fixture diff or any `recordedMax:` appearing on disk as a hard STOP.
- **Build-coupling miss.** Forgetting to rebuild `@hexagram/core` / `@hexagram/consultation-file` before a downstream `type:check` yields a stale-`.d.mts` false error. Mitigation: the per-task rebuild steps + the final `pnpm build` before `pnpm type:check`.
- **A missed read site.** A `SplitRecord.max` left unrenamed is a TypeScript error after Task 2 (the field no longer exists) — `pnpm type:check` catches it. Task 10 Step 6's grep is a belt-and-braces backstop.
- **`cli/casting-ui/tests/fixtures/cases.ts`** — if Task 0 Step 3 found it constructs `{ pick, max }` directly, it must be renamed too (add a step mirroring Task 6); if it imports the domain cases, no change. Verify, don't assume.

---

## Verification summary (the gates, in one place)

1. `pnpm build` green (topological rebuild so consumers see `recordedMax`).
2. `pnpm type:check` green (no residual `SplitRecord.max`).
3. `pnpm test` green (round-trip + byte-on-disk + Phase-7 byte-identity + legacy replay).
4. **`pnpm generate-fixtures` → zero diff** (the rename did not leak to disk).
5. `pnpm lint:check` + `pnpm format:check` green.

---

## HANDOFF PROMPT (ready to paste for a fresh implementation agent)

> You are implementing the S3 rename plan at `docs/superpowers/plans/2026-06-07-splitrecord-max-rename.md`. Read it fully first; it is self-contained.
>
> **Branch:** work on `claude/cool-carson-Aig03` (create it from the current HEAD if it does not exist: `git checkout -b claude/cool-carson-Aig03`).
>
> **Approach:** Approach A — rename the in-memory field `SplitRecord.max → recordedMax`, keep the on-disk YAML key `max` via the converter mapping in `frontmatter.ts`. No `schemaVersion` bump. The new name is `recordedMax` (both human-decision forks are pre-confirmed: Approach A, name `recordedMax`).
>
> **Execution:** Inline TDD, task-by-task, in order (Task 0 → Task 10). Sub-agent dispatch may be unavailable — execute inline. Run each task's test/build/type-check steps and confirm the stated expected result before moving on. Commit once per task with the exact messages in the plan (every commit message ends with the trailer `https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh` and contains NO model identifier).
>
> **Hard stop conditions:** (1) If `pnpm generate-fixtures` (Task 10 Step 4) produces ANY diff, or any `recordedMax:` appears in an on-disk `.md`, STOP immediately and report — the rename leaked to disk. (2) If the Task 0 baseline is red, STOP. (3) If `git status` shows a modified `md-file-*.md` at any point, STOP.
>
> **Build coupling:** rebuild `@hexagram/core` and `@hexagram/consultation-file` (`pnpm --filter <pkg> build`) before downstream `cli/casting-ui` type-checks; run `pnpm build` before the final `pnpm type:check`.
>
> **Finish:** after all tasks are green and the zero-fixture-diff gate passes, push with `git push -u origin claude/cool-carson-Aig03` (retry up to 4× with backoff on NETWORK errors only). Do NOT open a PR. Do NOT modify any files outside the rename sites + the new test. Report back: the commit SHAs, confirmation that `pnpm build && pnpm type:check && pnpm test && pnpm lint:check` are green, and confirmation that `pnpm generate-fixtures` yielded zero diff.
