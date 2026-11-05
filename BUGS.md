# BUGS — verified defect list

**Date:** 2026-11-04, at HEAD `ab492eb` (main).

**How this list was produced.**
1. Nine read-only survey agents explored the codebase for a DDD/hexagonal readiness review. Their reports are archived in `docs/reviews/2026-11-04-ddd-survey/` (`SYNTHESIS.md`, `survey-01` … `survey-09`).
2. Every candidate bug from those reports was then re-checked against the current code: the cited lines were re-read, and a small read-only reproduction was run where it was cheap (js-yaml timestamp parsing, lexical sort, `git merge-base`).
3. Candidates that could not be confirmed are listed under "Rejected candidates" at the end.

Nothing under `consultations/` was opened. Every example below is invented.

**Rules for fixing.**
- **One bug per commit.** Each fix is a small, single-intent commit, and its message states WHY (AGENTS.md "Legible Change" §2–§3). Write the failing test first, then the minimal fix.
- **Keep fixes minimal.** A large DDD/hexagonal overhaul is under consideration: a Consultation aggregate, a repository port, Clock and RandomSource ports, a core casting fold. Fixes must not pre-empt that redesign. That rules out new ports, new packages and API reshaping.
- **"defer?" items.** Entries marked **defer?** are probably better absorbed by the overhaul. Fix them now only if the human says so.
- **"needs-human" items.** Entries marked **needs-human** need a design decision before any code is written.

**Out of scope.** Architectural findings are not bugs and are not listed here. That covers the missing ports, the missing Consultation aggregate and identity, the save pipeline duplicated in 5 places, the 18-cast sequence implemented 4 times, and the media-aware IR. See `SYNTHESIS.md` §"What is mis-placed or missing".

**Status values:** `open` · `in-progress` · `fixed` · `blocked` · `deferred`. This file is the single source of truth for status. The fix loop records the commit SHA and notes on each entry.

**Summary:**

| Severity | Count | IDs |
|---|---|---|
| P1 (data-loss/correctness) | 2 | BUG-001, BUG-002 |
| P2 (behaviour) | 6 | BUG-003 … BUG-008 |
| P3 (hygiene/data) | 9 | BUG-009 … BUG-017 |
| Docs | 21 | DOC-001 … DOC-021 |

Shared verification commands:
- `pnpm --filter <pkg> test`
- `pnpm --filter <pkg> type:check`
- `pnpm lint:check`
- `pnpm format:check`
- Before landing, run a full sequential `pnpm build && pnpm test`. Do **not** use `pnpm check:all`: it has a known build/test race.
- If the change touches an Ink component, also run `pnpm test:stress:once`.
- To skip the slow core RNG test: `pnpm --filter @hexagram/core test -- --exclude tests/random-casting.test.ts`.

---

## P1: data loss / correctness

### BUG-001: The composed `hexagram` shell mounts Playground without `saveDir`, so its saves land under the cwd
- **Severity:** P1 · **Status:** fixed · **Commit:** `206b257` · **Notes:** Test `hexagram-app.test.tsx` "saves a playground consultation under consultationsDir" (mocks saveConsultationFile). Surprise: run vitest with FORCE_COLOR=1 (package script does) or an unrelated inverse-video test fails.
- **Location:** `cli/shell/src/hexagram-app.tsx:178`
- **What is wrong:**
  - `if (nav.screen === 'playground') return <PlaygroundApp onExit={backToHome} exitLabel={EXIT_LABEL} />` passes no `saveDir`.
  - `PlaygroundApp` sets `params.dir` only when `saveDir !== undefined` (`cli/playground-ui/src/playground-app.tsx:292`). Otherwise `saveConsultationFile` falls back to `defaultConsultationsDir()`, which is `<process.cwd()>/consultations` (`domain/consultation-file/src/file.ts:44-46,82`).
  - The History screen in the same file gets `dir={consultationsDir ?? …}` (`:166`) and Casting gets `consultationsDir` (`:197`). The standalone `hexagram-playground` bin passes `dir: workspaceConsultationsDir()` (`apps/cli/src/playground.ts:15`).
  - The result: a playground save made from `pnpm hexagram` run in any subdirectory lands in `<subdir>/consultations/`. History never shows it, and outside the repo it lands in an arbitrary directory. This violates ADR-0020.
- **Reproduction / failing test:** in `cli/shell/tests/hexagram-app.test.tsx`, render `<HexagramApp consultationsDir={tmpDir} …>`, navigate to Playground, save with a query, and assert that the file exists under `tmpDir`. Today it is written under `process.cwd()/consultations`. Alternatively, mock `@hexagram/consultation-file/file` and assert `saveConsultationFile` was called with `dir: tmpDir`.
- **Expected:** the playground save goes to the same `consultationsDir` that History and Casting use.
- **Minimal fix:** `<PlaygroundApp saveDir={consultationsDir} onExit={backToHome} exitLabel={EXIT_LABEL} />`. Keep the `undefined` fallback semantics unchanged.
- **Blast radius:** `cli/shell` only. No fixtures change.
- **Verify:** `pnpm --filter @hexagram/shell test && pnpm --filter @hexagram/shell type:check`. This is an Ink component, so also run `pnpm test:stress:once`.
- **Refs:** ADR-0020, `apps/cli/src/workspace-root.ts`.

### BUG-002: Two saves in the same second silently overwrite each other
- **Severity:** P1 · **Status:** fixed · **Commit:** `1659c95` · **Notes:** Test `file.test.ts` "keeps both consultations at distinct paths". Saves use `wx` + `-N` suffix (cap 100, then throw). No consumer parses the filename (reviewer grep).
- **Location:** `domain/consultation-file/src/file.ts:84-85,102`
- **What is wrong:**
  - The filename is `consultation-<YYYY-MM-DDTHH-mm-ssZZ>.md`, which has one-second resolution.
  - The write is `fs.writeFile(filePath, text, 'utf8')` with the default `'w'` flag. A second save within the same second truncates and replaces the first consultation, with no error.
  - The same function returns the same path for both saves, so the caller believes both saved.
- **Reproduction / failing test:** in `domain/consultation-file/tests/file.test.ts`, call `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))`. Then call `saveConsultationFile({ …, query: 'first', dir: tmp })` and `saveConsultationFile({ …, query: 'second', dir: tmp })`. Today both calls return the same path, and loading it yields `query: 'second'`. Assert that both consultations survive: two distinct paths, each loading its own query.
- **Expected:** no save ever destroys an existing consultation.
- **Minimal fix:**
  - Write with `{ flag: 'wx' }`.
  - On `EEXIST`, retry with a numeric suffix (`consultation-<ts>-2.md`, `-3`, …), with a small bounded loop.
  - The history scan reads any `*.md`, so suffixed names are listed. Do not introduce ids or a repository; that belongs to the overhaul.
- **Blast radius:**
  - Code: `domain/consultation-file` only.
  - Check that no test asserts the exact filename regex in `cli/history-ui` or `apps/cli`.
  - No `.md` fixtures change, because fixtures use a fixed timestamp and don't go through `file.ts`.
- **Verify:** `pnpm --filter @hexagram/consultation-file test && pnpm --filter @hexagram/consultation-file type:check`.
- **Refs:** ADR-0008. The overhaul's `ConsultationId` will supersede filename identity. Keep this fix small.

---

## P2: behaviour

### BUG-003: Legacy migration renders the body without `castingAbsence`
- **Severity:** P2 · **Status:** fixed · **Commit:** `44c26f8` · **Notes:** Test `apps/cli/tests/migrate-legacy.test.ts`. Surprise: loaded `body` keeps the frontmatter separator newline, so the test compares the whole file against what `rerenderOnDisk` would write.
- **Location:** `apps/cli/src/migrate-legacy.ts:33-37`
- **What is wrong:**
  - The call is `markdownConsultationBody(envelope.query, envelope.hexagram, envelope.casting)`. The fourth parameter `absenceReason` defaults to `null` (`cli/text-grid/src/markdown.ts:18-23`).
  - So every migrated null-casting file, whether `legacy-no-table` or `legacy-unreplayable`, gets a reasonless "Casting not recorded." body, while its frontmatter carries the reason.
  - On first open, history self-heal (`cli/history-ui/src/history-app.tsx:23-35`, which does pass the reason) detects the drift. It rewrites the file and shows "Body refreshed; data unchanged."
  - This is the same class of bug that the comment at `history-app.tsx:27-30` and ADR-0008 ("B5") describe as fixed elsewhere.
- **Reproduction / failing test:** this needs a new `apps/cli/tests/migrate-legacy.test.ts`.
  1. Copy the invented fixture `domain/consultation-file/tests/fixtures/legacy-shape-b.txt` into a tmp dir as `consultation-2026-01-01T00-00-00+0000.txt`.
  2. Run `migrateLegacy(tmp)`.
  3. Load the `.md`. Assert that `body === markdownConsultationBody(q, h, null, envelope.castingAbsence)`. This fails today.
- **Expected:** the migrated body is byte-identical to what self-heal would produce, so there is no rewrite on first open.
- **Minimal fix:** pass `envelope.castingAbsence` as the 4th argument.
- **Blast radius:** `apps/cli` only, plus the new test. Real users' already-migrated files self-heal on open, so no migration is needed.
- **Verify:** `pnpm --filter @hexagram/cli test && pnpm --filter @hexagram/cli type:check`.
- **Refs:** ADR-0008 (castingAbsence, B5), ADR-0015 (use only invented fixtures).

### BUG-004: History self-heal rewrites the canonical file non-atomically
- **Severity:** P2 · **Status:** fixed · **Commit:** `5dcad65` · **Notes:** Atomic-write half fixed (tmp + rename; test in `history-app.test.tsx` simulates a crash mid-write). The "bypasses the consultation-file API" half stays **defer?** for the repository-port overhaul.
- **Location:** `cli/history-ui/src/history-app.tsx:19-37` (write at `:35`)
- **What is wrong:**
  - Opening a consultation can rewrite it in place with `fs.writeFile(filePath, desired, 'utf8')`, which truncates first and then writes.
  - A crash, kill or full disk mid-write leaves a truncated file. Its YAML frontmatter, the canonical record (ADR-0008), is lost, and the row becomes `[unreadable]`.
  - This happens on a *read* path: the user only opened the file.
- **Reproduction / failing test:** atomicity is hard to test directly. Sketch it as a unit test:
  1. Spy on `node:fs/promises`: make `writeFile` reject after it is called.
  2. Assert that the original file content is still intact afterwards.
  - With a temp-file plus `rename`, the original is untouched until the rename. Today the original is truncated.
- **Expected:** the original file is either fully old or fully new, never partial.
- **Minimal fix:**
  1. Write `desired` to `${filePath}.tmp-<pid>`.
  2. Then `fs.rename(tmp, filePath)`, which is atomic on the same filesystem.
  3. Best-effort unlink of the tmp file on error.
  - Keep the function where it is. Moving self-heal behind the consultation-file API is the overhaul's job.
- **Blast radius:** `cli/history-ui` only. The history scan reads only `*.md`, so a stray `.tmp-*` file is ignored. Confirm this in `history-scan.ts:33-39`.
- **Verify:** `pnpm --filter @hexagram/history-ui test && pnpm --filter @hexagram/history-ui type:check`, then `pnpm test:stress:once`.
- **Refs:** ADR-0008 (self-heal; note DOC-016).

### BUG-005: A failed save leaves the viewer stuck in `computing`, and discard is the only way out
- **Severity:** P2 · **Status:** open · **Commit:** – · **Notes:** **needs-human**: what should a failed save do? Also **defer?** (overhaul: save becomes a use case).
- **Location:** `cli/casting-ui/src/viewer-flow.ts:332-333`; `cli/casting-ui/src/viewer.tsx:343-372` (the compute effect) and `:692-695` (the footer)
- **What is wrong:**
  - `case 'computeFailed': return { ...state, saveError: action.error }` keeps `mode: 'computing'`.
  - The compute effect has already run (it fires once per transition), so nothing retries.
  - The footer shows `Save failed: <msg>`, but the tabs stay locked and the readout (`sections`) is never set.
  - The user has completed 18 casts. They can neither see the reading nor save it, and Esc → discard throws it away.
  - Note that `buildConsultationSections` also runs inside the same `try`, so a render failure looks identical to a save failure.
- **Reproduction / failing test:** in `cli/casting-ui/tests/viewer-flow.test.ts`, which tests the pure reducer, drive a flow to `computing` and dispatch `{ type: 'computeFailed', error }`. Today `mode === 'computing'`. The assertion depends on the chosen behaviour (see the fix options).
- **Expected:** decided by the human. Options:
  - (a) Go to `done` with the sections visible and an "unsaved" footer.
  - (b) Stay in `computing` but offer a retry key that re-fires the effect.
  - (c) Both.
- **Minimal fix (if (a)):**
  - Split the effect so the sections are built first.
  - On save failure, dispatch `computeFailed` carrying the `sections`.
  - Have the reducer go to `done` with `savedPath: null` and keep `saveError` for the footer.
- **Blast radius:** `cli/casting-ui` (reducer, viewer and footer). Possibly `cli/viewer-core` if the footer chrome changes. No byte fixtures change.
- **Verify:** `pnpm --filter @hexagram/casting-ui test && pnpm --filter @hexagram/casting-ui type:check`, then `pnpm test:stress:once`.
- **Refs:** ADR-0009 (flow state machine), ADR-0012.

### BUG-006: The history list sorts ISO timestamps lexically, which is wrong across UTC offsets
- **Severity:** P2 · **Status:** open · **Commit:** – · **Notes:** –
- **Location:** `cli/history-ui/src/history-scan.ts:59`
- **What is wrong:**
  - The comparator is `entries.sort((a, b) => (a.envelope.timestamp < b.envelope.timestamp ? 1 : -1))`, which compares offset-bearing strings character by character.
  - Probe: `'2026-05-19T09:00:00+0800'` (01:00Z) sorts *before* `'2026-05-19T03:00:00+0000'` (03:00Z) in "newest-first" order, but it is older.
  - This affects users who travel or whose zone has DST, because saved timestamps carry the local offset at save time.
  - The comparator also never returns 0, which makes it inconsistent for equal keys.
- **Reproduction / failing test:** in `cli/history-ui/tests/history-scan.test.ts`, write two valid `.md` files to a tmp dir with the two timestamps above, then call `scanConsultations(tmp)`. Assert that `entries[0]` is the `+0000` one. It fails today.
- **Expected:** newest-first by instant.
- **Minimal fix:** compare `dayjs(t).valueOf()`, or `Date.parse` after normalising `+0800` to `+08:00`. Return `b - a`. `dayjs` is already a dependency of consultation-file; check that history-ui declares it before importing. Otherwise use `Date.parse` with a one-line normalisation.
- **Blast radius:** `cli/history-ui` only.
- **Verify:** `pnpm --filter @hexagram/history-ui test && pnpm --filter @hexagram/history-ui type:check`.
- **Refs:** ADR-0008 (timestamp format).

### BUG-007: The stored `recordedMax` is never verified on load, yet the ledger renders from it
- **Severity:** P2 · **Status:** open · **Commit:** – · **Notes:** **needs-human if** any legacy fixture output changes.
- **Location:** `domain/consultation-file/src/casting-replay.ts:22-58` (replay reads only `.pick`); consumer `domain/core/src/casting-derivation.ts:115-136` (`deriveSplit`), via `domain/consultation-view/src/ledger-rows.ts:28`
- **What is wrong:**
  - The "prove, don't trust" replay (ADR-0008 S7) checks only that the 18 `pick`s reproduce the hexagram.
  - `recordedMax` is not compared with `recordedMaxForUnparted(unparted)` for its round.
  - `deriveSplit` computes `stalks`, `rightHeap`, `rightRemainder` and `rightPiles` from the *stored* `recordedMax`.
  - So a hand-edited `recordedMax` passes validation and renders a ledger that violates conservation, inside a ledger the loader has declared proven. Self-heal then writes that wrong ledger into the body.
- **Reproduction / failing test:** in `domain/consultation-file/tests/casting-replay-validation.test.ts`, take a valid casting (for example from `sampleCastingFor`, or an existing fixture envelope) and change `casting[0][1].recordedMax` by +4. Assert that `castingReplaysTo(mutated, hexagram) === false`, and that `parseFrontmatter` returns `casting-unreplayable`. Both pass today, meaning the bad file is accepted.
- **Expected:** a casting whose `recordedMax` disagrees with the replayed unparted count is refused, as for a bad pick.
- **Minimal fix:**
  - In `replayLine`, before each `generator.next`, compare `castN.recordedMax` with `recordedMaxForUnparted(<unparted before this cast>)`. The yielded `FourOperationsResult` carries the next round's unparted stalks; check its field name. Throw on mismatch; it is already caught as `false`.
  - Do not rewrite replay as a fold; that belongs to the overhaul.
- **Blast radius:**
  - `domain/consultation-file`.
  - The legacy converter shares this replay, so a legacy table whose recovered `recordedMax` disagrees would now become `legacy-unreplayable`.
  - Run the legacy-converter tests. If any `legacy-envelope-*.json` fixture changes, **stop and escalate**.
- **Verify:** `pnpm --filter @hexagram/consultation-file test && pnpm --filter @hexagram/consultation-file type:check`, then `pnpm --filter @hexagram/text-grid test` (the `.md` fixtures).
- **Refs:** ADR-0006, ADR-0008, `docs/agents/casting-invariants.md`.

### BUG-008: `validateManualSplit` accepts out-of-range remainders and negative piles, so it can return pick 0 or pick = recordedMax
- **Severity:** P2 · **Status:** open · **Commit:** – · **Notes:** Unreachable from the current UI (digit-only input, `remMax = 4`). This is a domain-invariant gap.
- **Location:** `domain/core/src/manual-validation.ts:45-97`
- **What is wrong:**
  - The validator rejects `0` remainders but has no upper bound on `remL`/`remR` and no lower bound on piles.
  - The comment at `:88-89` claims that passing conservation and the suspended-sum check means the pick is in `[1, unparted − 1]`. Hand-traced counter-examples, with `unparted = 49` and `castIndex = 0`:
    - `{pilesL:5, remL:5, pilesR:5, remR:3}`: left=25, right=23, total=49 ✓, sum=1+5+3=9 ✓, so the result is `ok`. The real remainders are 1 and 3, so the sum should be 5. The transcription is wrong but accepted.
    - `{pilesL:-1, remL:4, pilesR:11, remR:4}`: left=0, total=49 ✓, sum=9 ✓, so the result is `ok` with **pick 0**.
    - `{pilesL:11, remL:4, pilesR:-1, remR:4}`: right=0, so the result is `ok` with **pick 48 = recordedMax**, which violates the never-empty-right-heap invariant.
  - `performCast` would then throw `RangeError` on commit.
  - The 1..4 rule is enforced only in `cli/casting-ui/src/manual-prompt.tsx:231-233`.
- **Reproduction / failing test:** add the three cases above to `domain/core/tests/manual-validation.test.ts`, each expecting `kind !== 'ok'`. Also extend the exhaustive enumeration at `:170-193` to castIndex 1 and 2.
- **Expected:** domain-level rejection when a remainder is outside 1..4 or a pile count is negative or not an integer.
- **Minimal fix:**
  - Widen the existing `zero-remainder` guard into a remainder-range guard. Prefer keeping the existing `kind`, renaming its hint text only if the UI copy demands it, so the result union does not change.
  - Add a non-negative-integer guard for piles that returns `incomplete`.
  - If a new `kind` is needed, it ripples into `manual-prompt.tsx`'s exhaustive handling. In that case **escalate**, because it is a UX copy decision.
- **Blast radius:** `domain/core`, and possibly `cli/casting-ui` (manual prompt copy). No byte fixtures change.
- **Verify:** `pnpm --filter @hexagram/core test -- --exclude tests/random-casting.test.ts && pnpm --filter @hexagram/core type:check`, then `pnpm --filter @hexagram/casting-ui test`.
- **Refs:** ADR-0011 (validation tier order is load-bearing), `docs/agents/casting-invariants.md`.

---

## P3: hygiene / data

### BUG-009: `saveConsultationFile` reads the clock twice, so the filename and frontmatter timestamps can disagree
- **Severity:** P3 · **Status:** open · **Commit:** – · **Notes:** **defer?** (overhaul: Clock port). It is cheap enough to fix now.
- **Location:** `domain/consultation-file/src/file.ts:84,95`; `domain/consultation-file/src/utils-timestamp.ts:9-20`
- **What is wrong:** `getFilesystemSafeTimestamp()` and `getIsoTimestamp()` each call `dayjs()`. A save that straddles a second boundary gets a filename one second off from its canonical `timestamp`.
- **Reproduction / failing test:** in `file.test.ts`, mock `dayjs` (via `vi.mock('dayjs', …)`) to return two successive instants one second apart. Assert that the filename stamp equals the frontmatter `timestamp` with `:` replaced by `-`. This fails today.
- **Expected:** both strings derive from one instant.
- **Minimal fix:** have both helpers take a `dayjs.Dayjs` argument (or add one `formatTimestamps(now)` returning both), and call `dayjs()` once in `saveConsultationFile`. These helpers have no other consumers (verified with `git grep`).
- **Blast radius:** `domain/consultation-file` only.
- **Verify:** `pnpm --filter @hexagram/consultation-file test && pnpm --filter @hexagram/consultation-file type:check`.
- **Refs:** ADR-0008.

### BUG-010: An unquoted YAML timestamp with a colon offset or `Z` loads as a `Date`, so the file is `invalid-shape`
- **Severity:** P3 · **Status:** open · **Commit:** – · **Notes:** **needs-human / defer?**: only hand-edited or externally produced files hit this.
- **Location:** `domain/consultation-file/src/frontmatter.ts:184`
- **What is wrong:**
  - Probe with js-yaml `safeLoad`:
    - `timestamp: 2026-05-19T14:23:11+08:00` → `Date`
    - `…Z` → `Date`
    - `…+0800` → `string`
  - Our writer quotes `'…+0800'`, so its own round-trip is fine. But a user who hand-edits a file to the standard `+08:00` form gets `[unreadable — invalid-shape]` because of `typeof timestamp !== 'string'`.
- **Reproduction / failing test:** in `frontmatter.test.ts`, parse a valid fixture after replacing its timestamp line with the unquoted `2026-05-19T14:23:11+08:00`. Today this returns `ok:false, reason:'invalid-shape'`.
- **Expected:** decided by the human. Either accept it and normalise, or keep refusing and document the quoting requirement.
- **Minimal fix (if accepted):** if `timestamp instanceof Date`, convert it with `dayjs(timestamp).format('YYYY-MM-DDTHH:mm:ssZZ')`. A `Date` has lost the original offset, so this re-expresses it in local time; that is the reason this needs a human decision. Alternatively, load YAML with a schema that keeps timestamps as strings.
- **Blast radius:** `domain/consultation-file`.
- **Verify:** `pnpm --filter @hexagram/consultation-file test`.
- **Refs:** ADR-0008.

### BUG-011: Legacy migration overwrites an existing `.md` of the same name
- **Severity:** P3 · **Status:** open · **Commit:** – · **Notes:** –
- **Location:** `apps/cli/src/migrate-legacy.ts:39-41`
- **What is wrong:**
  - `fs.writeFile(mdPath, md, 'utf8')` uses the default `'w'` flag. If `consultation-<ts>.md` already exists, for example from a partial earlier run or a same-second save, it is replaced.
  - The `.txt` is then moved to `legacy/`, so the overwritten consultation is unrecoverable.
- **Reproduction / failing test:** in a tmp dir, place `consultation-X.md` (a valid saved file) and `consultation-X.txt` (an invented legacy fixture), then run `migrateLegacy`. Today the `.md` content is replaced.
- **Expected:** skip with `SKIP <name>: target exists` and leave both files untouched.
- **Minimal fix:** `fs.writeFile(mdPath, md, { encoding: 'utf8', flag: 'wx' })`. On `EEXIST`, write to stderr and `continue` before the rename.
- **Blast radius:** `apps/cli` only.
- **Verify:** `pnpm --filter @hexagram/cli test && pnpm --filter @hexagram/cli type:check`.
- **Refs:** ADR-0008, ADR-0015.

### BUG-012: A type lie in the core algorithm: `(stalksCount % 4) as 1 | 2 | 3`
- **Severity:** P3 · **Status:** open · **Commit:** – · **Notes:** Runtime behaviour is correct, because `0` is falsy at `:26`. The type is wrong.
- **Location:** `domain/core/src/index.ts:25`
- **What is wrong:** the value is `0` for any multiple of four, and the next line relies on exactly that (`sortingRemainder ? [sortingRemainder] : []`). The cast hides the 0 case from the type checker.
- **Reproduction / failing test:** none at runtime. Lock the behaviour first: a `sortIntoFours`-equivalent assertion through `performCast` on a heap of 48 or 44. Existing `perform-cast.test.ts` coverage probably suffices; confirm that it exercises a multiple-of-four heap.
- **Expected:** `const sortingRemainder: 0 | 1 | 2 | 3 = (stalksCount % 4) as 0 | 1 | 2 | 3` (honest), or a plain `number`.
- **Minimal fix:** widen the annotation. Check that `[sortingRemainder]` still satisfies `SortedStalks` typing; the truthiness branch narrows out 0.
- **Blast radius:** `domain/core` only.
- **Verify:** `pnpm --filter @hexagram/core type:check && pnpm --filter @hexagram/core test -- --exclude tests/random-casting.test.ts`.
- **Refs:** ADR-0004 (compiler posture), ADR-0006.

### BUG-013: `as never` casts in `HistoryApp` hide a widened state type
- **Severity:** P3 · **Status:** open · **Commit:** – · **Notes:** –
- **Location:** `cli/history-ui/src/history-app.tsx:119-122,134,170`
- **What is wrong:**
  - The scan state is declared as `{ entries: HistoryEntry[]; unreadable: { path: string; reason: string }[] } | null`, with `reason` widened to `string`.
  - It is set from `ScanResult`, whose `reason` is `ParseFailureReason | 'io-error'` (`history-scan.ts:16-24`), via `setScan(r as never)`.
  - It is then passed back to `HistoryList` via `unreadable={scan.unreadable as never}`.
  - Both casts disable type checking at the seam.
- **Reproduction / failing test:** none. The proof is type-level: after the fix, `pnpm --filter @hexagram/history-ui type:check` passes with no casts.
- **Expected:** `useState<ScanResult | null>(null)`, with no casts.
- **Minimal fix:** import `type ScanResult` from `./history-scan.js`, retype the state, and delete both `as never`. Check the `setScan((prev) => …)` updater at `:219`.
- **Blast radius:** `cli/history-ui` only.
- **Verify:** `pnpm --filter @hexagram/history-ui type:check && pnpm --filter @hexagram/history-ui test`.
- **Refs:** ADR-0004.

### BUG-014: A permanently skipped `describe.skip('main')` exercises a no-op stub with pre-clamp inputs
- **Severity:** P3 · **Status:** open · **Commit:** – · **Notes:** –
- **Location:** `cli/casting-ui/tests/interactive.test.ts:8-13` (stub `const main = async () => {}`), `:170-…` (two skipped tests)
- **What is wrong:**
  - The comment says `main()` was "migrating to `apps/cli/src/interactive.ts` in the next commit". That migration happened, but the block was never removed or ported.
  - It cannot test anything: `main` is a no-op.
  - Its first mocked pick, `48`, would also now be rejected, because the selectable max at 49 stalks is 47 (ADR-0006 clamp).
  - It inflates the "2 skipped" count on every run.
- **Reproduction:** `pnpm --filter @hexagram/casting-ui test` reports `2 skipped`.
- **Expected:** no skipped tests.
- **Minimal fix:** delete the skipped block and the stub. Do not port it: the `apps/cli` bin's plain mode is covered elsewhere. If the implementer finds no plain-mode coverage of `apps/cli/src/interactive.ts`, note that in the log instead of porting.
- **Blast radius:** a single test file in `cli/casting-ui`.
- **Verify:** `pnpm --filter @hexagram/casting-ui test` reports 0 skipped, then `pnpm lint:check`.
- **Refs:** ADR-0013.

### BUG-015: `@hexagram/consultation-view` declares an unused `@hexagram/text-layout` dependency
- **Severity:** P3 · **Status:** open · **Commit:** – · **Notes:** **needs-human**: the edge is drawn in the CLAUDE.md/AGENTS.md DAG and ADR-0022. Decide whether to drop the edge or keep it as intended. **defer?**
- **Location:** `domain/consultation-view/package.json:38`
- **What is wrong:** `git grep text-layout -- domain/consultation-view` matches only the package.json line. No `src` or test file imports it. It is a phantom edge in the Turbo graph and in the docs.
- **Reproduction:** `git grep -n "text-layout" -- domain/consultation-view`.
- **Expected:** declared dependencies match imports.
- **Minimal fix:** remove the dependency, run `pnpm install` to update the lockfile, and update the DAG prose (AGENTS.md "Repository layout" paragraph, ADR-0022) in the *same* commit, because it is one piece of knowledge.
- **Blast radius:** `domain/consultation-view`, `pnpm-lock.yaml`, docs.
- **Verify:** `pnpm install && pnpm build && pnpm --filter @hexagram/consultation-view test && pnpm type:check`.
- **Refs:** ADR-0018, ADR-0022.

### BUG-016: Legge text typo: hexagram 2, line 3 imagery reads "tinder restraint" for "under restraint"
- **Severity:** P3 · **Status:** open · **Commit:** – · **Notes:** This is data, not code. Other OCR artefacts were reported but not verified.
- **Location:** `domain/core/src/models/hexagram-text-english-legge.ts:59`; mirrored in `domain/core/src/models/hexagrams.json:307`
- **What is wrong:** `"3. 'He keeps his excellence tinder restraint, …"`. Legge reads "under restraint". It is an OCR or typing error.
- **Reproduction:** `git grep -n "tinder restraint"`.
- **Expected:** "under restraint".
- **Minimal fix:** edit the TS source, then run `pnpm generate-json-files` to sync the JSON. No byte fixture contains the string (verified with `git grep tinder`).
- **Blast radius:** `domain/core` data and generated JSON.
- **Verify:** `pnpm generate-json-files && git diff --stat` (only the two files), then `pnpm --filter @hexagram/core test -- --exclude tests/random-casting.test.ts`.
- **Refs:** ADR-0007.

### BUG-017: The trigram `WEN_WANG_ORDER` map contradicts its own 說卦 comment
- **Severity:** P3 · **Status:** open · **Commit:** – · **Notes:** **needs-human** (a scholarly decision). It is unused at runtime: only the hexagram `Order.WenWang` is read.
- **Location:** `domain/core/src/models/trigram.ts:5-15`
- **What is wrong:**
  - The comment quotes 帝出乎震，齊乎巽，相見乎離，致役乎坤，説言乎兑，戰乎乾，勞乎坎，成言乎艮. That gives 震1 巽2 離3 坤4 兌5 乾6 坎7 艮8.
  - The map gives 乾4 兌5 離3 震8 巽2 坎1 艮6 坤7.
  - Only 巽, 離 and 兌 agree. The map matches neither the 說卦 sequence nor the Lo Shu numbering.
- **Reproduction:** read the file.
- **Expected:** the owner decides which ordering is intended, then fixes the map or the comment.
- **Minimal fix:** after the decision, edit the map and run `pnpm generate-json-files`.
- **Blast radius:** `domain/core` data and generated JSON.
- **Verify:** `pnpm generate-json-files && pnpm --filter @hexagram/core test -- --exclude tests/random-casting.test.ts`.
- **Refs:** ADR-0007.

### BUG-018: `pnpm format:check` is red on `main` because of unformatted Markdown docs
- **Severity:** P3 · **Status:** open · **Commit:** – · **Notes:** Found by the fix loop on 2026-11-05, while verifying BUG-001.
- **Location:** `BUGS.md`, `BUGS-ORCHESTRATOR.md`, `docs/handoffs/bugs-loop-log.md`, `docs/reviews/2026-11-04-ddd-survey/{SYNTHESIS,survey-01…survey-09}.md`.
- **What is wrong:**
  - `pnpm format:check` (oxfmt) fails with "Format issues found in above 13 files" on `bugs-loop` at `5efee17`. Twelve of the files are also on `main` (`680d450`, `d55fa65`). The thirteenth, the loop log, was added by the bootstrap.
  - Every DOC entry's "Verify" line and the loop's Step 4 use `pnpm format:check` as a gate, so the gate cannot pass for any change.
- **Reproduction:** `pnpm format:check`, which exits 1.
- **Expected:** `pnpm format:check` exits 0.
- **Minimal fix:** run `pnpm exec oxfmt --write` on exactly those 13 Markdown files and commit the result. Formatting only, no wording changes.
- **Blast radius:** those Markdown files only. No code and no fixtures.
- **Verify:** `pnpm format:check` exits 0, and `git diff --stat` touches only those files.
- **Refs:** AGENTS.md "Commands".
- **Interim gate (until fixed):** the loop runs `pnpm exec oxfmt --check <files touched by the diff>` instead of the repo-wide check.

---

## Documentation defects

Each was verified against the code at `ab492eb`. Severity is P3 for all. Suggested batching: one commit per document, not one per line. AGENTS.md is long; fix its lines in one "realign AGENTS.md with code" commit. **Verify** every docs commit with `pnpm format:check`, plus a `git grep` showing that the stale path or name no longer appears.

| ID | Status | Location | Defect (verified) | Correct statement |
|---|---|---|---|---|
| DOC-001 | open | `refactor.md:20` (untracked, the owner's file; **do not edit, tell the human**) | Points at `domain/consultation-file/src/serialize-markdown.ts`, which does not exist | `cli/text-grid/src/serialize-markdown.ts` |
| DOC-002 | open | `docs/adr/0018-consultation-view-ir.md:109-118` | Cites `domain/consultation-view/src/ledger-geometry.ts`, `domain/consultation-file/src/serialize-markdown.ts`, and `domain/consultation-file/tests/fixtures/*` as the IR byte-lock | `ledger-rows.ts`; `cli/text-grid/src/serialize-markdown.ts`; `cli/text-grid/tests/fixtures/*` |
| DOC-003 | open | `AGENTS.md:240` | "`castingTableFollowRow` … exported by `@hexagram/readout`" | Exported from `cli/text-grid/src/scroll-geometry.ts:16` (`@hexagram/text-grid/scroll-geometry`) |
| DOC-004 | open | `AGENTS.md:249` | `renderProgressBar()` in `cli/casting-ui/src/viewer-layout.ts` | `cli/viewer-core/src/viewer-layout.ts:149` |
| DOC-005 | open | `AGENTS.md:251` | "saved via `consultationFileOutput()`"; no such function exists (it survives only as a test mock name) | Saved by the viewer's compute effect calling `saveConsultationFile` (`cli/casting-ui/src/viewer.tsx:357`) |
| DOC-006 | open | `AGENTS.md:255` | `castingSection()` in `cli/readout/src/output-sections.ts`; the file does not exist | `domain/consultation-view/src/build-view.ts:187` |
| DOC-007 | open | `AGENTS.md:259` | "five fields" | Six top-level keys: `castingAbsence` is present iff `casting` is absent, as ADR-0008:10 correctly says |
| DOC-008 | open | `AGENTS.md:269` | Saves go "under `<cwd>/consultations/`" | Bins anchor to `<repo-root>/consultations` (ADR-0020; AGENTS.md:228). `<cwd>` is only the library fallback |
| DOC-009 | open | `AGENTS.md:287` | JSON "used at runtime via `resolveJsonModule`" | No src file imports the JSON. `getters.ts:3,5` imports the TS records. The JSON is a generated artifact only |
| DOC-010 | open | `AGENTS.md:309` (build-order chain) | Omits `@hexagram/text-layout` | Include `text-layout` (see BUG-015 for the consultation-view edge) |
| DOC-011 | open | `AGENTS.md:311` | core "ten entries" | Eleven: add `sample-casting` (`domain/core/tsdown.config.ts:4-16`) |
| DOC-012 | open | `AGENTS.md:312` | consultation-file "five entries: index, markdown, frontmatter, file, legacy-converter" | Three: `frontmatter`, `file`, `legacy-converter` (`domain/consultation-file/tsdown.config.ts:4`) |
| DOC-013 | open | `AGENTS.md:193` (CI simulation) | Cites `4eae942 → 800d3fc`. Both exist as objects but neither is an ancestor of `main` (`git merge-base --is-ancestor`) | Cite the main-line cherry-picked twins (find them with `git log --grep` on main) or drop the SHAs |
| DOC-014 | open | `docs/adr/0007-hexagram-and-trigram-data.md:9,15,30-31,36,43` | JSON is "the runtime source consumed via `resolveJsonModule`" | TS records are the runtime source. The JSON is generated and unused at runtime. Record this as an ADR amendment, not a silent edit |
| DOC-015 | open | `docs/adr/0006-casting-algorithm-rewindable-core-and-randomness.md:74` | "The injected-RNG test override contract is preserved" | `random-casting.ts` has no injection point (`node:crypto.randomInt` hard-wired) and no test mocks it. Remove the claim (the RNG port is overhaul work) |
| DOC-016 | open | `docs/adr/0008-consultation-file-format.md:267` | `file.ts` owns "body re-render + self-heal" | Self-heal lives in `cli/history-ui/src/history-app.tsx:19-37` (`rerenderOnDisk`) |
| DOC-017 | open | `docs/adr/0020-consultations-dir-anchoring.md:29` | `workspaceConsultationsDir` is "(pure)" | It calls `existsSync` (`apps/cli/src/workspace-root.ts:1,32`). Say "deterministic for a given filesystem" or "side-effect-free read" |
| DOC-018 | open | `docs/adr/0019-domain-cli-boundary.md:57,84,97,122` | Says the markdown renderer lives in `domain/consultation-file`; workspace globs are "`domain/*` + `cli/*`" | Renderer is in `cli/text-grid` (ADR-0022); `pnpm-workspace.yaml` also has `apps/*` |
| DOC-019 | open | `docs/adr/0009-terminal-ui-architecture-and-flow-state-machine.md:71` | Cites `cli/casting-ui/src/output-sections.ts`, which does not exist | `cli/casting-ui/src/output-composers.ts` only |
| DOC-020 | open | `docs/adr/0002-monorepo-structure-and-package-decomposition.md:78-81` | "Where it's enforced" points at `packages/*` and `packages/core/package.json` (superseded ADR, dead links) | Add a one-line pointer to ADR-0019/0022 rather than rewriting a superseded ADR |
| DOC-021 | open | `CLAUDE.md:5`; `LICENSE:3` | Typo "Claude-speciic". The LICENSE copyright holder is the template author ("三咲智子 Kevin Deng") | Fix the typo. The **LICENSE is needs-human** (a legal decision; do not edit autonomously) |

---

## Rejected candidates

- **`generateRandomLines` counts the impossible values 5 and 10** (`domain/core/src/random-casting.ts:143-161`). This is not a bug. The slow distribution test deliberately asserts `report['Line 5'] === '0.000%'` and `report['Line 10'] === '0.000%'` as out-of-range sentinels (`domain/core/tests/random-casting.test.ts:118-122`). It is a test-only export by design.
- **ADR-0008:10 "six fields"** is not a defect. The ADR correctly counts `castingAbsence`. The stale statement is AGENTS.md:259 "five fields" (DOC-007).
- **Unverified and not listed:**
  - The Markdown transformation omits the trigram divider that ANSI shows (survey-04). It may be intentional, and no spec says otherwise.
  - The Wilhelm-Baynes `\n\n` in #1 L6. It may be the a/b format.
  - The stale local `cli/cli/` directory. It is gitignored and not a repo defect.
  - The diverged fixture `cases.ts` copies. This is duplicated knowledge, an architectural matter.
