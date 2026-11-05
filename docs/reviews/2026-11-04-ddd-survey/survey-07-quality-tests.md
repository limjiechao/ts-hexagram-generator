# Survey 07: Code quality and tests (all packages)

Surveyed 2026-11-04 at HEAD `ab492eb` (main). Everything below is from read-only commands. No repo files were edited and nothing under `consultations/` was opened.

## 0. Tooling results (item 6)

| Command                                                                       | Result                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm type:check`                                                             | PASS, 25/25 turbo tasks, exit 0                                                                                                                                                                                            |
| `pnpm lint:check` (oxlint + eslint)                                           | PASS, exit 0: **0 errors, 8 warnings**, all in tests (7x `unicorn/consistent-function-scoping`, 1x `no-shadow`), e.g. `domain/core/tests/casting-derivation.test.ts:16`, `cli/casting-ui/tests/manual-prompt.test.tsx:117` |
| `pnpm --filter @hexagram/core test -- --exclude tests/random-casting.test.ts` | PASS, 10 files / 84 tests, 6.3 s                                                                                                                                                                                           |
| `turbo run test --filter='!@hexagram/core' --force --concurrency=2`           | PASS, 24/24 tasks, 0 cached, 33 s                                                                                                                                                                                          |
| `pnpm --filter @hexagram/casting-ui test`                                     | 394 passed, **2 skipped** (`describe.skip('main')` at `cli/casting-ui/tests/interactive.test.ts:170`), 31 s                                                                                                                |
| `pnpm build`                                                                  | PASS, 13/13 (turbo cache hit)                                                                                                                                                                                              |

The slow RNG distribution test was not run, as instructed.

## 1. Type-safety posture

**Compiler.** `tsconfig.base.json` turns on `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `isolatedDeclarations`, `verbatimModuleSyntax` and `isolatedModules`. That is a top-decile posture. Two flags are missing: `exactOptionalPropertyTypes` and `noImplicitOverride`. `noUnusedParameters` is also off.

**Escape hatches.** Counts are from grep over 125 git-tracked source files and 102 test files. Comment matches were filtered out by hand.

| Construct                                       | src                                                                                                                                                                                                                                                     | tests |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| explicit `any`                                  | **0** (the 2 grep hits are prose in comments)                                                                                                                                                                                                           | 0     |
| `as T` casts (excluding `as const` and imports) | ~45 real casts outside the text data, mostly tuple/union re-widening                                                                                                                                                                                    | ~165  |
| `as unknown as`                                 | 0                                                                                                                                                                                                                                                       | 4     |
| `as never`                                      | 2 (`cli/history-ui/src/history-app.tsx:134,170`)                                                                                                                                                                                                        | –     |
| non-null `!`                                    | ~11 (`cli/readout/src/serialize-ansi.ts:192,262-273`, `cli/text-grid/src/serialize-markdown.ts:126`, `domain/consultation-file/src/legacy-converter.ts:150-178`, `cli/text-grid/src/ledger-template.ts:43`, `cli/casting-ui/src/slider-prompt.tsx:173`) | ~22   |
| `@ts-expect-error`                              | 0 (src); 1 deliberate negative type test (`domain/core/tests/perform-cast.test.ts:160`)                                                                                                                                                                 | 1     |
| lint-disable comments                           | 16 (mostly `react-hooks/exhaustive-deps` on onReady effects)                                                                                                                                                                                            | 30    |

**Notable casts:**

- `domain/core/src/index.ts:25`: `(stalksCount % 4) as 1 | 2 | 3`. This cast lies, because the value can be 0, and the next line depends on it being 0 (`sortingRemainder ? … : []`). It is a type lie inside the core algorithm.
- `domain/core/src/index.ts:253,265,279`: `as Extract<LineState, {phase: NextPhase<P>}>`. The phase-typed state machine is enforced by casts, not by inference.
- `cli/casting-ui/src/viewer-flow.ts:206-312`: 8 casts that re-widen `PartialCastingRecord`, `lineIndex` and `castIndex` after arithmetic.
- `cli/readout/src/serialize-ansi.ts:262-273`: `find(...)! as QuerySection` and similar. The IR section list is untyped by position, so the serializer has to downcast. An IR typed as a record or tuple would remove all six casts.
- `domain/consultation-file/src/frontmatter.ts:26`: `jsYaml.safeLoad(str) as object` at the trust boundary. It is followed by hand-written guards, so this is acceptable.

**Domain types.** `Line = 6|7|8|9`, `LineIndex = 0..5` and the `Hexagram` 6-tuple are literal or tuple types, each with a guard/assert pair (`domain/core/src/types.ts:3-35`). `CastingAbsenceReason` is a closed union, and `LineState` is a discriminated union keyed by phase. There are **no branded types anywhere** (0 hits for `__brand`, `unique symbol` or `Brand<`). The following are all plain `number` or `number[]`:

- `pick`, `recordedMax`, pile and remainder counts
- stalk heaps, represented as arrays of stalk IDs (`domain/core/src/index.ts:52-56`)
- WenWang numbers

The `recordedMax` vs selectable-max confusion that CLAUDE.md spends a whole paragraph on is exactly the kind of mistake a brand (`RecordedMax` vs `SelectablePick`) would catch at compile time. Today it is guarded only at runtime by `assertSelectablePick` (`domain/core/src/casting-derivation.ts:69`). `isLineIndex` is a range guard, not an integer guard, and it admits 2.5 (documented at `domain/core/src/types.ts:39-43`).

## 2. Size and complexity hot spots

**Largest files.** These are the data files, which is expected: Wilhelm/Baynes text (2,204 lines), Legge (2,129), the two Chinese texts (1,804 each), metadata (1,735), `foundation.ts` (1,255) and `hexagrams.ts` (974). All are under `domain/core/src/models/`. Logic files:

| File                                       | Lines | Main component span                                      |
| ------------------------------------------ | ----- | -------------------------------------------------------- |
| `cli/casting-ui/src/viewer.tsx`            | 841   | `ConsultationViewer` 168→~776, a **~600-line component** |
| `cli/casting-ui/src/manual-prompt.tsx`     | 628   | `ManualCastingPrompt` 192→628, ~435 lines                |
| `cli/readout/src/consultation-readout.tsx` | 602   | `ConsultationReadout` 220→602, ~380 lines                |
| `cli/casting-ui/src/slider-prompt.tsx`     | 502   | `SliderCastingPrompt` 381→502                            |
| `cli/history-ui/src/history-list.tsx`      | 429   | `HistoryList` 108→429, ~320 lines                        |
| `cli/playground-ui/src/playground-app.tsx` | 401   | `PlaygroundApp` 121→401, ~280 lines                      |

Components over ~300 lines: ConsultationViewer, ManualCastingPrompt, ConsultationReadout and HistoryList. ConsultationViewer runs the compute effect, saving, slider and manual wiring, and auto-scroll. It is the main application-service logic that sits inside a React component (`cli/casting-ui/src/viewer.tsx:366`, the try/catch around save).

**Dead code and unused exports.** No knip or ts-prune is installed, so these are spot checks:

- `castingTableActiveRow` is exported but used only by its own module and tests (CLAUDE.md admits it "still exists").
- `generateRandomHexagram` and `generateRandomHexagrams` are used only in `domain/core/src/random-casting.ts` and its tests. They are library API that no app consumes.
- `cli/casting-ui/tests/interactive.test.ts:170` has a permanently skipped `describe.skip('main')`, kept only so it type-checks.
- `cli/cli/` is a stale, gitignored leftover (`dist/`, `node_modules/`, `.turbo/`, no `package.json`) from before the package moved to `apps/cli`. It is harmless but confusing.
- Test-only seams in production code: the `onReady` witness props appear **118 times** across `cli/*/src`, plus `onSliderReady`, `onManualPromptReady`, `onCastingStatusReady` and the `sliderCommitRevealMs`/`manualRevealMs` test knobs.

## 3. Test architecture

Test counts per package are from the fresh run. Ink-file and fixture figures come from grep over imports.

| Package                  | Tests run        | Test files | Ink-rendering files (≈its) | Notes                                                           |
| ------------------------ | ---------------- | ---------- | -------------------------- | --------------------------------------------------------------- |
| domain/core              | 84 + 6 slow      | 10         | 0                          | pure                                                            |
| domain/consultation-file | 56               | 5          | 0                          | pure plus fs (tmp dirs)                                         |
| domain/consultation-view | 22               | 3          | 0                          | pure                                                            |
| domain/text-layout       | 13               | 1          | 0                          | pure                                                            |
| cli/text-grid            | 37               | 6          | 0                          | `.md` byte fixtures                                             |
| cli/readout              | 45               | 6          | 1 (~22)                    |                                                                 |
| cli/viewer-core          | 78               | 9          | 5 (~47)                    |                                                                 |
| cli/casting-ui           | 394 (+2 skipped) | 24         | 9 (~210)                   | `--plain` byte fixtures; `viewer.test.tsx` alone is 2,119 lines |
| cli/history-ui           | 148              | 8          | 3 (~108)                   | `history-list.test.tsx` 1,939 lines                             |
| cli/playground-ui        | 140              | 11         | 5 (~61)                    | one vitest `.snap`                                              |
| cli/shell                | 66               | 8          | 2 (~20)                    |                                                                 |
| apps/cli                 | 7                | 2          | 0                          | spawns the bin (non-TTY guard)                                  |
| **Total**                | **~1,096**       | 103        |                            |                                                                 |

**Ratio.** Domain packages have ~181 tests, about 17%. CLI and app packages have ~915, about 83%. Of the CLI tests, roughly 470 (~43% of all tests) render through `ink-testing-library`. The rest are pure-function tests of terminal helpers, such as keymaps, layout math, reducers and serializers. Test LOC (~19k) is about 1.4× non-data source LOC.

**Byte-fixture tests:**

- `cli/casting-ui/tests/output.test.ts` checks 4 cases against `plain-output-*.txt` and `ink-sections-*.json`.
- `cli/text-grid/tests/fixtures.test.ts` checks 4 cases against `md-body-*.md` and `md-file-*.md`.
- Both regenerate through `scripts/generate-fixtures.ts`.
- **The case list is duplicated** in `cli/casting-ui/tests/fixtures/cases.ts` and `cli/text-grid/tests/fixtures/cases.ts`, and the two files have already diverged: only text-grid's has `FIXTURE_TIMESTAMP`.

**Flakiness machinery:**

- ADR-0012 adds the `onReady` witness contract, the `await tick()` lint ban, and `@hexagram/test-utils` (`waitFor`, `waitForReady`, `pressUntil`, `pumpSliderTick`, `yieldMacrotask`; 16 test files use it).
- ADR-0013 and `vitest.config.base.ts` set a 30 s test and hook timeout, resolve the `source` condition (no-build tests), and add the `test:flake` / `test:stress` scripts. No vitest `retry` is configured, which is good.
- This is mature, well-documented machinery. The cost is that production components carry test hooks.

**Which tests survive a DDD/hexagonal move.** Tests that can be reused as domain or contract specs against a new core (~180–230 tests):

- `domain/core/tests/perform-cast.test.ts`, `casting-derivation.test.ts`, `manual-validation.test.ts`, `line-semantics.test.ts`, `getters.test.ts`, `types.test.ts`, `sample-casting.test.ts`, and the invariant parts of `random-casting.test.ts` (pick ceiling at :28-43, no-zero-remainder at :46-60). These are domain specs already. They are tied only to function names, not to structure.
- `domain/consultation-file/tests/*`: `frontmatter.test.ts`, `casting-replay-validation.test.ts`, `legacy-converter.test.ts`, `file.test.ts`. These are a ready-made **persistence-adapter contract suite**. The round-trip, the schema-version refusal and replay validation are port-level behaviour.
- `domain/consultation-view/tests/build-view.test.ts`: the presentation-IR contract.
- `cli/casting-ui/tests/viewer-flow.test.ts` (24 tests): the pure flow reducer, with no React. This is really an **application-service spec**, and it should move up out of `cli/`.
- `cli/shell/tests/nav-machine.test.ts`, `cli/playground-ui/tests/playground-state.test.ts` and `playground-lines.test.ts`, `cli/history-ui/tests/history-list-state.test.ts`, `row-window.test.ts`, and `history-scan.test.ts` (filesystem adapter). These are pure state machines that can be ported.
- The byte fixtures (`plain-output-*.txt`, `md-*.md`) are excellent **golden end-to-end characterization tests** for the overhaul. Keep them unchanged and treat them as the safety net.

Tests coupled to Ink internals that would need a rewrite (~470):

- `cli/casting-ui/tests/viewer.test.tsx`, `slider-prompt.test.tsx`, `manual-prompt.test.tsx`, `casting-prompt-box.test.tsx`, `number-input.test.tsx` and `query-editor.test.tsx`
- `cli/history-ui/tests/history-list.test.tsx` and `history-app.test.tsx`
- `cli/shell/tests/hexagram-app.test.tsx` and `home-menu.test.tsx`
- `cli/viewer-core/tests/*.test.tsx`
- `cli/readout/tests/consultation-readout.test.tsx`

They depend on `lastFrame()` text, stdin escape bytes, onReady timing and macrotask pumping. One notable domain spec is buried among them: the Phase-7 byte-identity test (manual flow ≡ interactive flow for the same 18 picks) in `viewer.test.tsx`. It belongs at the application layer.

## 4. Property-based or exhaustive testing

- **There is no property-based library** (no `fast-check`, 0 hits).
- **The 4,096-line-combination space is not tested exhaustively** (0 hits for 4096). `getters.test.ts` has only 3 cases (all-yang, all-yin, and moving-line folding). Nothing checks that all 64 keys resolve, that `getEmergingHexagram` is consistent over all 4^6 inputs, or that WenWang and Fuxi are bijective.
- The closest exhaustive tests are:
  - `cli/playground-ui/tests/playground-display.test.ts:388`, which runs across all 64 hexagrams but checks only glyph exclusion.
  - `domain/core/tests/manual-validation.test.ts:170-193`, which enumerates every (pilesL, remL, pilesR, remR) for **cast 1 only** and asserts each accepted input satisfies `assertSelectablePick`. That is a good invariant test, but it covers casts 2 and 3 not at all.
- The pick-ceiling and no-zero-remainder invariants are tested **by random sampling** (5,000 picks × 5 lengths; 500 consultations; `domain/core/tests/random-casting.test.ts:28-60`), not by enumeration. The full single-line pick space (≈47×43×39 ≈ 79k paths) is cheap to enumerate and would prove two things exhaustively: the remainder is in 1..4, and the line probabilities are 1/16, 5/16, 7/16 and 3/16. Today the probabilities are checked only by the slow 1M-sample statistical test.

## 5. Error handling

The approach is mixed but mostly principled, and each layer has its own convention:

- **The core throws** for invariant violations: TypeError from the `assertIs*` guards (`domain/core/src/types.ts:9,23,85,158,210`), RangeError from `assertSelectablePick` (`casting-derivation.ts:69`), and the `performCast` tripwire (`index.ts:219`).
- **The persistence layer returns tagged Results** `{ok: true, …} | {ok: false, reason}` (`domain/consultation-file/src/frontmatter.ts:112`, `file.ts:26-31`, `legacy-converter.ts:21`).
- **Manual validation returns a different Result shape**, `{kind: 'ok' | 'incomplete' | …}` (`domain/core/src/manual-validation.ts:39,92`). The repo therefore has two Result conventions.
- **Throw used as control flow:**
  - `castingReplaysTo` catches the core's RangeError and turns it into `false` (`domain/consultation-file/src/casting-replay.ts:29,39`). The validity check is "run it and see if it throws", rather than a total `validateCasting` function in the core.
  - `serialize-markdown.ts:49` throws on a partial record.
  - `cli/viewer-core/src/utils-validators.ts:18` throws for UI validation.
- **Write paths are inconsistent with reads.** `saveConsultationFile` (`domain/consultation-file/src/file.ts:79-102`) lets fs errors propagate, while `loadConsultationFile` converts them into `{ok: false, reason: 'io-error'}`. Saving is caught in the React component (`cli/casting-ui/src/viewer.tsx:366`) and in each bin's top-level `catch` (`apps/cli/src/*.ts`).

## 6. Rating: **4 / 5**

This is a strict, lint-clean, well-documented codebase. The core is pure and most invariants have tests, the ADRs record why the code is the way it is, and CI reliability work is real. It falls short of 5 for four reasons:

- The application logic is concentrated in a few very large Ink components.
- Domain numbers are not branded.
- Testing is example-based, with no exhaustive or property-based coverage of the small, finite domain.
- About 83% of tests sit in the terminal layer.

## 7. Top 10 issues (ranked)

1. **Application logic lives inside Ink components.** The ~600-line `ConsultationViewer` (`cli/casting-ui/src/viewer.tsx:168`) orchestrates compute and save. The pure reducer (`viewer-flow.ts`) is a good start, but it lives in `cli/` and the effects and save are still in JSX. This is the main obstacle to a hexagonal port.
2. **No exhaustive or property-based tests for a finite domain.** The 4,096 line combinations, 64 lookups, the per-line pick space, and casts 2 and 3 of manual validation are all untested exhaustively. Line probabilities rely on a 40 s Monte Carlo test.
3. **No branded types for `pick`, `recordedMax`, selectable max and stalk counts.** The documented off-by-one invariant (`recordedMax − 1`) is enforced only at runtime (`casting-derivation.ts:69`).
4. **The core algorithm contains a type lie:** `as 1|2|3` on a value that can be 0 (`domain/core/src/index.ts:25`). The phase machine is held together by `as Extract<…>` casts (`index.ts:253-279`).
5. **There are two Result conventions** (`ok` vs `kind`), and replay validity is computed through exceptions (`casting-replay.ts:29`). Save throws while load returns a Result.
6. **The test pyramid is inverted toward the UI.** About 43% of tests drive Ink frames and stdin. Key domain or application specs, such as Phase-7 manual ≡ interactive byte identity, are buried in the 2,119-line `viewer.test.tsx`.
7. **Test seams leak into production APIs:** 118 `onReady` occurrences plus `*RevealMs` knobs in `cli/*/src` props.
8. **The positionally-untyped IR forces downcasts** in the serializers (`cli/readout/src/serialize-ansi.ts:262-273`, with `!` and `as`; `serialize-markdown.ts:126`).
9. **The fixture case list is duplicated and has drifted** between `cli/casting-ui/tests/fixtures/cases.ts` and `cli/text-grid/tests/fixtures/cases.ts`.
10. **Minor dead code and residue:** the stale `cli/cli/` directory, `describe.skip('main')` (`cli/casting-ui/tests/interactive.test.ts:170`), unused-in-app exports (`generateRandomHexagram(s)`, `castingTableActiveRow`), `as never` in `cli/history-ui/src/history-app.tsx:134,170`, and 8 lint warnings in tests.
