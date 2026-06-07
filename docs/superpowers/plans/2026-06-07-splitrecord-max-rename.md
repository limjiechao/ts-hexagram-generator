# SplitRecord.max → recordedMax Rename Implementation Plan (S3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Sub-agent dispatch may be unavailable in this environment — execute inline with TDD discipline.

**Goal:** Rename the misleadingly-named persisted field `SplitRecord.max` to `recordedMax` **end-to-end, including the on-disk YAML key.** The field name `max` lies: it is the RECORDED ceiling (`unparted − 1`, reserving the suspended stalk 掛一), never a legal pick — the legal pick range is `[1, max − 1]`. Renaming the in-memory field tells the truth; because the converter seam serializes each `SplitRecord` opaquely, the on-disk YAML key becomes `recordedMax:` automatically. No `schemaVersion` bump. This is POC: old `max:` files becoming unreadable is accepted; "migrating everything over" means regenerating the in-repo fixtures to the new key.

**Architecture (chosen variant — on-disk rename, no schema bump):** `SplitRecord` becomes `{ pick: number; recordedMax: number }`. Every TypeScript construction/read site is renamed, plus the `isSplitRecord` shape guard. The converter seam — `castingToYaml`/`castingFromYaml` in `domain/consultation-file/src/frontmatter.ts` — passes each `SplitRecord` through **opaquely** (`return { L6, L5, … }`), so renaming the TS field **automatically** renames the on-disk key. **NO converter field-mapping is added** (that was the rejected Approach A). The fixtures change `max:` → `recordedMax:` — this is the SANCTIONED, EXPECTED diff. The gate is: the fixture diff is CONFINED to the `max`→`recordedMax` key rename — no value changes, no other byte changes.

**Tech Stack:** TypeScript, pnpm + Turborepo monorepo, vitest, tsdown (`.mjs` / `.d.mts` emit), gray-matter + js-yaml for the file format.

---

## Decisions baked into this plan (already confirmed by the human)

1. **On-disk rename, NO schema bump.** The on-disk YAML casting key becomes `recordedMax:`. `CURRENT_SCHEMA_VERSION` stays `1`. There is NO migration command, NO dual-read, NO backward-compat with old `max:` files. POC — old files becoming `[unreadable]` is accepted. (The earlier rejected "Approach A" kept the on-disk key `max` via a converter mapping for a zero-fixture-diff; that mapping is explicitly NOT done here.)

2. **The new field name is `recordedMax`.** It is already the established alias for this exact quantity: `selectablePickMax(recordedMax)` / `stalkCountFor(recordedMax)` take a `recordedMax: number` param (`domain/core/src/casting-derivation.ts:24,35`), `maxPickFor`'s doc calls its result the "recorded max", and `viewer-flow.ts` already exports `recordedMaxFor`. Renaming the field onto this existing vocabulary collapses an alias rather than introducing a new one (DRY-of-knowledge).

---

## Phase-1 grounded facts (everything a fresh implementer needs — no other context required)

### What the field is

`SplitRecord = { pick: number; max: number }` — `domain/core/src/types.ts:75`.

`max` is the **recorded** ceiling: `unparted − 1`, where the `−1` reserves the one suspended stalk (掛一). It is **never itself a legal pick** — the legal pick range is `[1, max − 1]`. The named home of the selectable ceiling is `selectablePickMax(recordedMax) = recordedMax − 1` (`domain/core/src/casting-derivation.ts:24`). The inverse `stalkCountFor(recordedMax) = recordedMax + 1` recovers the true stalk count (`casting-derivation.ts:35`). The field name `max` lies: it is one greater than any pick that can occupy it.

### This is NOT a correctness bug

A runtime guard `assertSelectablePick(recordedMax, pick)` (`casting-derivation.ts:43`) is called by `performCast` and every input flow clamps to `selectablePickMax` before committing. So an illegal pick cannot reach a saved record. **S3 is pure legibility / DRY-of-name, not correctness.** This rename changes no behaviour and no values — only the field's NAME (in memory and on disk).

### What S2 already fixed (DO NOT redo)

- Added the named helpers `selectablePickMax` and `stalkCountFor` and routed the open-coded `±1` arithmetic through them.
- Renamed the slider-bounce reflection boundary to `upperBound` and documented it as geometry, not a pick clamp.
- Collapsed the alias prose in `slider-prompt.tsx` / `casting-prompt-box.tsx`.

S2 fixed the **arithmetic** legibility. It did **not** rename the field itself — `SplitRecord.max` still lies at every read/destructure. That residue is S3. **`maxPickFor` keeps its NAME** (it returns the recorded max; only the `SplitRecord` field is renamed, not this helper — though update its internals/comments to say `recordedMax` where it constructs/returns the field value).

### Every SITE that names the `SplitRecord` field `max` (verified against source)

**Definition + type guard (`domain/core/`):**
- `domain/core/src/types.ts:71-75` — the doc comment + `export type SplitRecord = { pick: number; max: number }`.
- `domain/core/src/types.ts:118-124` — `isSplitRecord`: `'max' in value && … typeof value.max === 'number'` (the `'pick' in value` clause sits between — preserve it).

**Construction sites (build a `SplitRecord`):**
- `domain/core/src/random-casting.ts:69-73` — `{ pick: firstSplit, max: firstMax }` ×3 (plus the `max` comment at `:35-37`).
- `cli/casting-ui/src/interactive-flow.ts:16-34` — `const max = …` then `return { pick, max }` (plus the `max` doc comment at `:19-22`).
- `cli/casting-ui/src/viewer-flow.ts:180-192` — `const max = maxPickFor(before)` then `const split: SplitRecord = { pick: action.pick, max }` (plus the `max` comment at `:181-183`).
- `domain/consultation-file/src/legacy-converter.ts:121-127` — `{ pick: row[0][1], max: row[0][0] }` ×3 (plus the `(max, pick)` / `Stalks` column comments at `:83`, `:133`, `:136-137`, `:164`).

**Read sites (destructure / access `.max` off a `SplitRecord`):**
- `domain/core/src/casting-derivation.ts:89-97` — `deriveSplit({ pick, max })` destructure + uses of `max` inside (plus the doc comments at `:14,29,57,62,86`).
- `cli/casting-ui/src/viewer.tsx:241-247` — `state.castingPlan.casting[state.lineIndex][state.castIndex].max` (the actual condition is `state.castingPlan === null ? … : …`, NOT `state.phase === 'casting'`; rename only the `.max` access + the `SplitRecord.max` comments at `:241` and `:247`).

**Test/fixture builders (in-memory — these MUST change to `recordedMax`):**
- `domain/consultation-file/tests/fixtures/cases.ts:10-14` — `lc(...)` helper builds `{ pick, max }` ×3.
- `cli/casting-ui/tests/fixtures/cases.ts:6-17` — `lineCasting(...)` helper builds `{ pick, max }` ×3 (plus the `max` comment at `:3-5`). **NOTE:** the plan's earlier study under-listed this file; it constructs `SplitRecord` literals directly and MUST be renamed.

**The converter seam (pass-through — renaming the field flows to disk by design):**
- `domain/consultation-file/src/frontmatter.ts:30-48` — `castingToYaml`/`castingFromYaml` pass whole `LineCasting` tuples through opaquely (`return { L6, L5, … }`), so the inner `SplitRecord` objects are serialized field-for-field by js-yaml. **This is why renaming the TS field flows straight to the on-disk key — which is exactly what we want here.** Do NOT add any per-`SplitRecord` mapping. `isYamlCasting` (`:206-209`) only checks the `L1..L6` keys exist and does NOT inspect inner split keys; the real validation runs via `isCastingRecord(castingFromYaml(casting))` (`:178-181`), which uses the updated `isSplitRecord` checking `recordedMax`. So a freshly-saved file's on-disk `recordedMax` → mapped through → validated. An OLD `max:` file now fails `isSplitRecord` → `invalid-shape` (accepted, POC).

### `.max` that is NOT this field (do NOT touch)

Most `\bmax\b` / `Math.max` / local-variable `max` hits are prompt-local ceilings, slider bounds, or `Math.max` calls — NOT the `SplitRecord` field. Leave alone: `bouncing-slider-store.ts` (`this.max`, `upperBound`), `slider-prompt.tsx` (`min..max` cursor bounds), `number-input.tsx` (`max` prop), `utils-mode.ts` (`deriveTickMs(... max ...)`), `bounce-trajectory.ts`, all `Math.max(...)`, the Inquirer `number({ max })` option, and `casting-prompt-box.tsx`'s `max` PROP. **`maxPickFor` keeps its name.**

### The fixtures that change (sanctioned diff)

The four `md-file-*.md` golden files carry the on-disk casting key `max:` (e.g. `md-file-one-moving.md:15` `max: 48`). After the rename + `pnpm generate-fixtures`, every `max:` inside a `casting:` block becomes `recordedMax:`. Fixtures affected:
- `domain/consultation-file/tests/fixtures/md-file-one-moving.md`
- `domain/consultation-file/tests/fixtures/md-file-no-moving.md`
- `domain/consultation-file/tests/fixtures/md-file-multi-moving.md`
- `domain/consultation-file/tests/fixtures/md-file-empty-query.md`

(The `md-body-*.md` fixtures contain no frontmatter, so they are unaffected. The `cli/casting-ui/tests/fixtures/*` plain-output fixtures render the CASTING table from derived values, not the raw `max:` key, so they too should be unaffected — VERIFY in the gate.)

**The gate:** `pnpm generate-fixtures` then `git diff -- '**/tests/fixtures/**'` shows ONLY `max:` → `recordedMax:` key renames inside `casting:` blocks. Any VALUE change or any non-key byte change → STOP, the rename leaked semantics → report.

---

## File structure (what each touched file is responsible for)

| File | Responsibility | Change |
| --- | --- | --- |
| `domain/core/src/types.ts` | `SplitRecord` definition + `isSplitRecord` guard | rename field + guard key |
| `domain/core/src/casting-derivation.ts` | `deriveSplit` destructure + doc comments | rename destructure |
| `domain/core/src/random-casting.ts` | RNG construction of splits | rename construction key |
| `cli/casting-ui/src/interactive-flow.ts` | typed-prompt construction of split | rename local + construction key |
| `cli/casting-ui/src/viewer-flow.ts` | reducer construction of split | rename local + construction key |
| `cli/casting-ui/src/viewer.tsx` | reads `.max` off the recorded split | rename read |
| `domain/consultation-file/src/legacy-converter.ts` | legacy `.txt` → split construction | rename construction key |
| `domain/consultation-file/tests/fixtures/cases.ts` | in-memory fixture builder | rename builder key |
| `cli/casting-ui/tests/fixtures/cases.ts` | in-memory fixture builder | rename builder key |
| `domain/consultation-file/tests/fixtures/md-file-*.md` | on-disk golden files | regenerated (`max:`→`recordedMax:`) |
| `docs/adr/0008-consultation-file-format.md` | file-format ADR | amend: on-disk casting split key is `recordedMax` |

> The converter seam `domain/consultation-file/src/frontmatter.ts` needs **NO code change** — it passes `SplitRecord`s through opaquely, so the TS rename flows to disk on its own. (Confirm in Task 5 that no edit is required.)

---

## Build coupling you MUST respect

Downstream packages type-check against the **built `.d.mts`** of upstream domain packages. So after changing `@hexagram/core` (`types.ts`), you MUST rebuild it before a downstream `cli/casting-ui` type-check sees the new field name:

```bash
pnpm --filter @hexagram/core build
```

The dev/test run uses the `source` export condition (`tsx`/`vitest` read `src/index.ts` directly), so vitest sees the rename without a rebuild — only cross-package **type-check** needs the dist rebuild. The final full-workspace gates (`pnpm build && pnpm type:check && pnpm test`) cover this via Turborepo topological order; per-package iteration needs the manual rebuild.

---

## Task 0: Verify the ground truth before changing anything

**Files:** none (read-only).

- [ ] **Step 1: Confirm the baseline is green.**

```bash
pnpm install
pnpm --filter @hexagram/core test
pnpm --filter @hexagram/consultation-file test
```
Expected: PASS. If red, STOP and report — do not start a rename on a red baseline.

- [ ] **Step 2: Confirm both fixture builders construct `SplitRecord`s directly.**

```bash
grep -n "max\|pick" cli/casting-ui/tests/fixtures/cases.ts domain/consultation-file/tests/fixtures/cases.ts
```
Both build `{ pick, max }` literals → both are in the rename list. (Already verified during planning.)

- [ ] **Step 3: No commit** (read-only task).

---

## Task 1: Rename the field in the type + guard (`@hexagram/core`)

**Files:**
- Modify: `domain/core/src/types.ts:71-75,118-124`

- [ ] **Step 1: Rename the type + its doc comment.**

Replace:

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
// `casting-derivation.ts`). The field is PERSISTED — the on-disk YAML casting key
// is `recordedMax` too (no converter remap; no schemaVersion bump; ADR-0008).
// Captured for both interactive picks and RNG-chosen splits so the casting can
// be replayed.
export type SplitRecord = { pick: number; recordedMax: number }
```

- [ ] **Step 2: Rename the guard keys.**

In `isSplitRecord`, replace `'max' in value` with `'recordedMax' in value` and `typeof value.max === 'number'` with `typeof value.recordedMax === 'number'`. Preserve the `'pick' in value` clause between them.

- [ ] **Step 3: Rebuild core + run its tests.**

```bash
pnpm --filter @hexagram/core build
pnpm --filter @hexagram/core test
```
Expected: build PASS (emit `dist/types.d.mts` with `recordedMax`). Tests may be RED here if any core test constructs `{ pick, max }` — if so, those are fixed in the construction/read tasks below; if a core test file builds `SplitRecord` literals directly, fix it in this commit (search `grep -rn "max:" domain/core/tests`).

- [ ] **Step 4: Commit.**

```bash
git add domain/core/src/types.ts
git commit -m "refactor(core): rename SplitRecord.max → recordedMax (S3)

The field named max lies: it is the RECORDED ceiling (unparted − 1, reserving
掛一), never a legal pick — the legal range is [1, recordedMax − 1]. Rename it
onto the existing recordedMax vocabulary (selectablePickMax/stalkCountFor
already take a recordedMax param) so the name tells the truth. The field is
persisted and the on-disk YAML casting key becomes recordedMax too — the
converter passes SplitRecords through opaquely, so the rename flows to disk
with no schemaVersion bump (POC; ADR-0008).

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 2: Rename the `deriveSplit` read site + comments (`@hexagram/core`)

**Files:**
- Modify: `domain/core/src/casting-derivation.ts:89-97` (and the doc comments at `:14,29,57,62,86`)

- [ ] **Step 1: Rename the destructure and internal uses.**

In `deriveSplit`, rename `{ pick, max }` → `{ pick, recordedMax }` and every internal `max` → `recordedMax` (`stalkCountFor(max)`, `max - pick + 1`, `const rightSorted = max - pick`).

- [ ] **Step 2: Update the doc comments that name `SplitRecord.max` / `{ pick, max }`.**

Update the prose at `:14`, `:29` (`SplitRecord.max` → `SplitRecord.recordedMax`), `:57`, `:62` (`stalkCountFor(max)` → `stalkCountFor(recordedMax)`), `:86`. The helper param names (`selectablePickMax(recordedMax)`, `stalkCountFor(recordedMax)`) are ALREADY `recordedMax` — do not touch them.

- [ ] **Step 3: Run core tests + rebuild.**

```bash
pnpm --filter @hexagram/core test
pnpm --filter @hexagram/core build
```
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add domain/core/src/casting-derivation.ts
git commit -m "refactor(core): read SplitRecord.recordedMax in deriveSplit (S3)

Follow the types.ts rename through deriveSplit's destructure and the doc
comments that named the field. No arithmetic change — every recordedMax − pick
is the same value the old max − pick produced.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 3: Rename the RNG construction site (`@hexagram/core`)

**Files:**
- Modify: `domain/core/src/random-casting.ts:35-37,69-73`

- [ ] **Step 1: Rename the construction.**

Replace the three `{ pick: …, max: …Max }` literals with `{ pick: …, recordedMax: …Max }`. The local variables `firstMax`/`secondMax`/`thirdMax` MAY stay (they are the recorded ceiling = `stalks − 1`). Update the `max` mention in the comment at `:35-37` to `recordedMax`.

- [ ] **Step 2: Run core tests + rebuild.**

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

## Task 4: Rename the legacy-converter construction site (`@hexagram/consultation-file`)

**Files:**
- Modify: `domain/consultation-file/src/legacy-converter.ts:83,121-127,133,136-137,164`

- [ ] **Step 1: Rename the construction.**

In `splitsToLineCasting`, rename the three `{ pick: row[n][1], max: row[n][0] }` → `{ pick: row[n][1], recordedMax: row[n][0] }`.

- [ ] **Step 2: Update the doc comments.**

Update the prose at `:83` (`(max, pick)` → `(recordedMax, pick)`), `:133`, `:136-137`, `:164` so "the round's `max`" reads "the round's `recordedMax`". The parsing logic and the `.txt` corpus are untouched — only the in-memory field name and comments. (The legacy `.txt` "Stalks" column IS the recorded max.)

- [ ] **Step 3: Run consultation-file tests + rebuild.**

```bash
pnpm --filter @hexagram/consultation-file build
pnpm --filter @hexagram/consultation-file test
```
Expected: the `legacy-converter.test.ts` replay tests PASS (replay validation uses `assertSelectablePick(recordedMax, pick)`, unaffected by the field-name change). The fixture byte-identity tests in `fixtures.test.ts` may be RED until Task 6/7 regenerate them — that ordering is expected; proceed.

- [ ] **Step 4: Commit.**

```bash
git add domain/consultation-file/src/legacy-converter.ts
git commit -m "refactor(consultation-file): construct legacy splits with recordedMax (S3)

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 5: Confirm the converter seam needs no change (`@hexagram/consultation-file`)

This is a VERIFY-only task — the load-bearing fact of the chosen approach. `castingToYaml`/`castingFromYaml` pass each `LineCasting` tuple (= three `SplitRecord`s) through opaquely; js-yaml serializes whatever field name the `SplitRecord` carries. So the Task 1 rename ALREADY makes the on-disk key `recordedMax` with no converter edit.

- [ ] **Step 1: Read `frontmatter.ts:30-48` and confirm the pass-through.**

Confirm `castingToYaml` returns `{ L6, L5, L4, L3, L2, L1 }` (the tuples unchanged) and `castingFromYaml` returns the six lines as-is. **Do NOT add any per-`SplitRecord` mapping** (that is the rejected Approach A). `isYamlCasting` only checks the `L1..L6` keys — no change. `YamlCasting`'s value type is `LineCasting` (= `SplitRecord` triples), which now carries `recordedMax` — no edit needed.

- [ ] **Step 2: Write a small round-trip + on-disk test to pin the new behaviour.**

Create `domain/consultation-file/tests/recorded-max-rename.test.ts`. It must (a) build a casting with the renamed field, save it, load it, and assert the loaded split has `recordedMax` (not `max`); and (b) read the saved file's raw text and assert the on-disk YAML key is `recordedMax:` (not `max:`). **Before writing, OPEN `domain/consultation-file/src/file.ts` and match the REAL signatures** of `saveConsultationFile` / `loadConsultationFile` (args, return shape, whether `dir` is a param, whether load returns a tagged `{ ok }` result or throws). Copy the temp-dir harness from the existing `file.test.ts` rather than inventing one.

```bash
pnpm --filter @hexagram/consultation-file test -- recorded-max-rename
```
Expected: PASS (the field rename from Task 1 already makes both assertions hold; this test pins it so a future converter change can't silently revert it).

- [ ] **Step 3: Commit.**

```bash
git add domain/consultation-file/tests/recorded-max-rename.test.ts
git commit -m "test(consultation-file): pin recordedMax in-memory and on-disk (S3)

The converter passes SplitRecords through opaquely, so the field rename flows
straight to the on-disk YAML key with no remap. Pin both the in-memory field
name and the on-disk key as recordedMax so a future change can't silently
re-introduce the lying max: key.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 6: Rename the consultation-file fixture builder + regenerate fixtures

**Files:**
- Modify: `domain/consultation-file/tests/fixtures/cases.ts:10-14`
- Regenerate: `domain/consultation-file/tests/fixtures/md-file-*.md`

- [ ] **Step 1: Rename the builder keys.**

In `cases.ts`, rename the three `{ pick: pN, max: mN }` → `{ pick: pN, recordedMax: mN }`. The parameter names `m1`/`m2`/`m3` and defaults (`= 48`, `= 43`, `= 39`) stay — they are the recorded-max VALUES, unchanged. Only the object key changes.

- [ ] **Step 2: Regenerate the consultation-file fixtures.**

```bash
pnpm --filter @hexagram/consultation-file generate-fixtures
git diff -- domain/consultation-file/tests/fixtures/
```
Expected: the `md-file-*.md` diff shows ONLY `max:` → `recordedMax:` inside `casting:` blocks — no value changes, no other byte changes. If anything else changes → STOP and report.

- [ ] **Step 3: Run the package tests against the regenerated fixtures.**

```bash
pnpm --filter @hexagram/consultation-file test
```
Expected: PASS (byte-identity tests now match the regenerated fixtures).

- [ ] **Step 4: Commit.**

```bash
git add domain/consultation-file/tests/fixtures/
git commit -m "test(consultation-file): regenerate fixtures with recordedMax key (S3)

The in-memory builder uses the renamed field; the on-disk golden md-file-*.md
files now carry recordedMax: in their casting blocks (the converter passes
SplitRecords through opaquely, so the rename flows to disk). The diff is
confined to the max:→recordedMax: key rename — no value changes.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 7: Rename the interactive-flow construction site (`@hexagram/casting-ui`)

**Files:**
- Modify: `cli/casting-ui/src/interactive-flow.ts:16-34`

- [ ] **Step 1: Rename the local + construction.**

Rename `const max = unpartedStalks.length - 1` → `const recordedMax = …`, `selectablePickMax(max)` → `selectablePickMax(recordedMax)`, and `return { pick, max }` → `return { pick, recordedMax }`. Update the `max` mentions in the doc comment at `:19-22` to `recordedMax`. **Leave the Inquirer `number({ max: pickMax })` option key** — that `max` is the prompt library's API, not the `SplitRecord` field.

- [ ] **Step 2: Type-check casting-ui.**

```bash
pnpm --filter @hexagram/casting-ui type:check
```
Expected: PASS (core already rebuilt in earlier tasks).

- [ ] **Step 3: Commit.**

```bash
git add cli/casting-ui/src/interactive-flow.ts
git commit -m "refactor(casting-ui): construct interactive split with recordedMax (S3)

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 8: Rename the viewer-flow construction + viewer read (`@hexagram/casting-ui`)

**Files:**
- Modify: `cli/casting-ui/src/viewer-flow.ts:180-192`
- Modify: `cli/casting-ui/src/viewer.tsx:241-247`

- [ ] **Step 1: Rename the reducer construction.**

In `viewer-flow.ts`, rename `const max = maxPickFor(before)` → `const recordedMax = maxPickFor(before)` and `const split: SplitRecord = { pick: action.pick, max }` → `{ pick: action.pick, recordedMax }`. Update the `max` mention in the comment at `:181-183` to "recorded ceiling". **`recordedMaxFor` (the exported helper) and `maxPickFor` are ALREADY correctly named — do not touch them.**

- [ ] **Step 2: Rename the viewer read.**

In `viewer.tsx`, rename `state.castingPlan.casting[state.lineIndex][state.castIndex].max` → `.recordedMax`. Update the `SplitRecord.max` comments at `:241` and `:247` to `SplitRecord.recordedMax`. Leave the local `currentMax` and `reachablePickMax` names (out of scope — S2-adjacent prompt vocabulary). **NOTE:** the actual condition is `state.castingPlan === null ? recordedMaxFor(…) : …` — rename only the `.max` field access, not the condition.

- [ ] **Step 3: Type-check + test casting-ui.**

```bash
pnpm --filter @hexagram/casting-ui type:check
pnpm --filter @hexagram/casting-ui test
```
Expected: PASS — including the Phase-7 byte-identity test (`viewer.test.tsx`). Both interactive + manual paths build `recordedMax` now, so they stay equal.

- [ ] **Step 4: Commit.**

```bash
git add cli/casting-ui/src/viewer-flow.ts cli/casting-ui/src/viewer.tsx
git commit -m "refactor(casting-ui): use recordedMax in viewer reducer + read (S3)

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 9: Rename the casting-ui fixture builder + regenerate fixtures

**Files:**
- Modify: `cli/casting-ui/tests/fixtures/cases.ts:3-17`
- Regenerate: `cli/casting-ui/tests/fixtures/*` (if any embed the raw `max:` key)

- [ ] **Step 1: Rename the builder keys.**

In `cli/casting-ui/tests/fixtures/cases.ts`, rename the three `{ pick: pN, max: mN }` → `{ pick: pN, recordedMax: mN }`. Update the `max` mention in the comment at `:3-5` to `recordedMax` (it describes the recorded-ceiling values). Parameter names/defaults stay.

- [ ] **Step 2: Regenerate the casting-ui fixtures.**

```bash
pnpm --filter @hexagram/casting-ui generate-fixtures
git diff -- cli/casting-ui/tests/fixtures/
```
Expected: the casting-ui plain-output fixtures render the CASTING table from DERIVED values, not the raw `max:` key — so this diff is most likely EMPTY. If any fixture changes, confirm it is confined to a `max`→`recordedMax` key rename (or empty); any value change → STOP.

- [ ] **Step 3: Run the package tests.**

```bash
pnpm --filter @hexagram/casting-ui test
```
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add cli/casting-ui/tests/fixtures/
git commit -m "test(casting-ui): build fixture cases with recordedMax (S3)

The in-memory fixture builder uses the renamed field. The plain-output golden
fixtures render the CASTING table from derived values, so their bytes are
unchanged by the rename.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 10: Amend ADR-0008 — the on-disk casting split key is `recordedMax`

**Files:**
- Modify: `docs/adr/0008-consultation-file-format.md`

- [ ] **Step 1: Add a note that each `casting` entry's split is `{ pick, recordedMax }` on disk.**

In the `casting` bullet (`:18-20`), append a sentence stating each split row is the pair `{ pick, recordedMax }` on disk (the `recordedMax` field replaces the former misleading `max` key; the converter passes splits through opaquely so the in-memory and on-disk key are the same). State explicitly: **no `schemaVersion` bump** — this is a POC rename, old `max:` files load as `[unreadable]` (`invalid-shape`), which is accepted. Keep the amendment short and consistent with the existing ADR voice (a dated amendment section is the convention — see the `## Amendment — 2026-06-07` block; add a sibling amendment dated 2026-06-07 for the split-key rename, or extend the casting bullet — pick whichever reads cleaner and matches the file's style).

- [ ] **Step 2: Commit.**

```bash
git add docs/adr/0008-consultation-file-format.md
git commit -m "docs(adr-0008): on-disk casting split key is recordedMax (S3)

Record that the persisted casting split pair is { pick, recordedMax } (the
former max key lied — it is the recorded ceiling, never a legal pick). The
converter passes splits through opaquely so the on-disk key tracks the
in-memory field. No schemaVersion bump — POC; old max: files load as
[unreadable] (invalid-shape), accepted.

https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh"
```

---

## Task 11: Full-workspace verification gates

**Files:** none (verification only).

- [ ] **Step 1: Build the whole workspace (topological).**

```bash
pnpm build
```
Expected: PASS — downstream `.d.mts` consumers see `recordedMax`.

- [ ] **Step 2: Type-check the whole workspace.**

```bash
pnpm type:check
```
Expected: PASS. Any residual `.max` on a `SplitRecord` surfaces here as a type error.

- [ ] **Step 3: Run the whole test suite.**

```bash
pnpm test
```
Expected: PASS. (Includes the slow `rng distribution` test in `domain/core` — ~40s, by design.)

- [ ] **Step 4: FIXTURE-DIFF GATE — the critical reviewability check.**

```bash
pnpm generate-fixtures
git status --porcelain
git diff -- '**/tests/fixtures/**'
```
Expected: the only fixture changes are the `max:` → `recordedMax:` key renames inside `casting:` blocks (already committed in Tasks 6 & 9; a fresh `generate-fixtures` here should be a no-op). **If `generate-fixtures` produces ANY new diff, or a fixture shows a VALUE change, STOP and report — the rename leaked semantics.**

- [ ] **Step 5: Lint + format gates.**

```bash
pnpm lint:check
pnpm format:check
```
Expected: PASS (6 pre-existing lint warnings acceptable; 0 errors; introduce no new ones). If `format:check` flags a touched file, run `pnpm format:fix` and amend the relevant commit.

- [ ] **Step 6: Single-name proof — no stray `SplitRecord` `max:` remains.**

```bash
grep -rn '\bmax\b' domain/core/src/types.ts
grep -rn 'max:' domain/ cli/ apps/ --include='*.ts' --include='*.tsx' | grep -iv 'recordedMax\|Math.max\|pickMax\|selectablePickMax\|stalksMax\|MAX_\|maxPickFor\|reachablePickMax\|max:\s*pickMax\|number({\|max: pickMax'
```
Expected: NO hit that is a `SplitRecord` literal still using `max:`. Eyeball any remaining hit.

- [ ] **Step 7: No commit** (gates only).

---

## Out of scope (do NOT do these)

- **Do NOT redo S2.** The helpers `selectablePickMax` / `stalkCountFor`, the `upperBound` slider-bounce rename, and the alias-prose collapse are already landed.
- **Do NOT add a converter field-mapping, a migration command, dual-read, or a version gate.** The rename flows straight to disk by design. `CURRENT_SCHEMA_VERSION` stays `1`.
- **Do NOT touch the pick-clamp invariant.** `assertSelectablePick`, `selectablePickMax`, the `[1, recordedMax − 1]` range, and the manual validator are correctness-bearing and unchanged.
- **Do NOT rename `maxPickFor`** — it keeps its name (it returns the recorded max). Update only its internals/comments where it constructs/returns the field value.
- **Do NOT rename prompt-local ceilings.** The `max` PROP on the prompt boxes, the Inquirer `number({ max })` option, `deriveTickMs(..., max)`, `viewer.tsx`'s `currentMax`/`reachablePickMax` locals, and all `Math.max(...)` are NOT the field — leave them.
- **Do NOT touch present-casting provenance** (`castingAbsence`, ADR-0008 reason field) — orthogonal.
- **Do NOT add a branded `Pick`/`RecordedMax` nominal type** — unrequested generality.

---

## Risks

- **A fixture VALUE change (not just a key rename).** Would mean the rename leaked semantics. Mitigation: the Task 6/9 per-package diff checks + the Task 11 Step 4 fixture-diff gate. Treat any value change as a hard STOP.
- **Build-coupling miss.** Forgetting to rebuild `@hexagram/core` before a downstream `type:check` yields a stale-`.d.mts` false error. Mitigation: the per-task rebuild steps + the final `pnpm build` before `pnpm type:check`.
- **A missed read site.** A `SplitRecord.max` left unrenamed is a TypeScript error after Task 1 (the field no longer exists) — `pnpm type:check` catches it. Task 11 Step 6's grep is a belt-and-braces backstop.

---

## Verification summary (the gates, in one place)

1. `pnpm build` green (topological rebuild so consumers see `recordedMax`).
2. `pnpm type:check` green (no residual `SplitRecord.max`).
3. `pnpm test` green (round-trip + on-disk + Phase-7 byte-identity + legacy replay).
4. **`pnpm generate-fixtures` → diff confined to `max`→`recordedMax` key rename** (already committed; a fresh run is a no-op).
5. `pnpm lint:check` + `pnpm format:check` green.

---

## HANDOFF PROMPT (ready to paste for a fresh implementation agent)

> You are implementing the S3 rename plan at `docs/superpowers/plans/2026-06-07-splitrecord-max-rename.md`. Read it fully first; it is self-contained.
>
> **Branch:** work on `claude/cool-carson-Aig03`.
>
> **Approach:** Rename the field `SplitRecord.max → recordedMax` **end-to-end, including the on-disk YAML key** (the converter passes splits through opaquely, so the rename flows to disk on its own — do NOT add a converter remap). NO `schemaVersion` bump. NO migration / dual-read / backward-compat — POC, old `max:` files become `[unreadable]`, accepted. Regenerate the in-repo fixtures to the new key.
>
> **Execution:** Inline TDD, task-by-task, in order (Task 0 → Task 11). Sub-agent dispatch may be unavailable — execute inline. Commit once per task; every commit message ends with the trailer `https://claude.ai/code/session_01CSCXLqShT14YVr86PXdujh` and contains NO model identifier.
>
> **Hard stop conditions:** (1) If the fixture diff after `pnpm generate-fixtures` is NOT confined to the `max:`→`recordedMax:` key rename (any value change, any non-casting byte change), STOP and report. (2) If the Task 0 baseline is red, STOP.
>
> **Build coupling:** rebuild `@hexagram/core` (`pnpm --filter @hexagram/core build`) before downstream `cli/casting-ui` type-checks; run `pnpm build` before the final `pnpm type:check`.
>
> **Finish:** after all tasks are green and the fixture-diff gate passes, push with `git push -u origin claude/cool-carson-Aig03` (retry up to 4× with backoff on NETWORK errors only). Do NOT open a PR. Report back: the commit SHAs, confirmation that `pnpm build && pnpm type:check && pnpm test && pnpm lint:check` are green, the fixture diff stat, and confirmation it is confined to the key rename.
