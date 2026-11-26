# MATTERS

The live tracker of implementation work (ADR-0042). Each vertical slice of work
is a **Matter**, `M-NNN`. A Matter stays open until it is disposed of, either
landed or withdrawn by the owner. The clerk (`docs/agents/clerk.md`) keeps this
file. Questions a Matter raises are answered by the owner as **Rulings** in
`RULINGS.md`. Each iteration is recorded in `MINUTES.md`.

## Statuses

| Status                  | Meaning                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pending`               | Defined, not started. Starts only when every earlier Matter in the build order has landed (Matters run serially). |
| `in-progress`           | The clerk is running it: tests, implementation, review, verification.                                             |
| `awaiting-ruling`       | Stopped on a Tier-A question. Lists the open question IDs; resumes once each has a Ruling.                        |
| `awaiting-ratification` | Work is done but is Tier A (e.g. M-001's incision code). The owner must line-edit and ratify it before it lands.  |
| `landed`                | On the integration branch, with its commit SHAs.                                                                  |
| `withdrawn`             | Dropped by the owner, with a reason.                                                                              |

## Build order and budgets

The overhaul grows serially (ADR-0042). The owner sets each phase's budget
**before the phase starts**. Exceeding a budget is a Tier-A event: the clerk
stops and asks.

Two sets of figures sit side by side (ADR-0042, "Build order and budgets"):

- **Budget** and the **owner-touch cap** are the owner's. The clerk never edits
  them.
- **Estimate** and **owner touches used** are the clerk's, revised from actual
  figures after every landing. When the estimate first exceeds the budget, the
  clerk warns the owner at once.

Phase 1 runs with no owner-touch cap and no brief-size cap. The owner sets both
from its actual figures when it lands (R-006).

| Phase | Scope                                                     | Budget (Matters / weeks) | Estimate (clerk)            | Owner touches (cap / used)                                             | Brief cap (lines) | Entry gate                     | Status                      |
| ----- | --------------------------------------------------------- | ------------------------ | --------------------------- | ---------------------------------------------------------------------- | ----------------- | ------------------------------ | --------------------------- |
| 1     | Walking skeleton and incision code                        | 3 Matters / 2 weeks      | 1 Matter / 2 days (actual)  | uncapped / 125                                                         | uncapped          | –                              | landed (M-001)              |
| 2     | Drift-signal tooling (signals 1–4)                        | 3 Matters / 1 week       | 3 Matters / 4 days (actual) | 60 per Matter / 49 (M-002), 55 (M-003), 21 (M-004)                     | 1,500             | –                              | landed (M-002 to M-004)     |
| 3     | Oracle core                                               | 5 Matters / 3 weeks      | 5 Matters / 2 days (actual) | 60 per Matter / 7 (M-005), 6 (M-006), 5 (M-007), 6 (M-008), 13 (M-009) | 1,500             | –                              | landed (M-005 to M-009)     |
| 4-pre | `docs/manual/cli.md` drafted and ratified (not a Matter)  | – / 2 weeks              | –                           | not set (R-138 is per Matter) / 0                                      | – (no brief)      | –                              | pending                     |
| 4     | CLI at parity with today's app, on the new core           | 12 Matters / 8 weeks     | –                           | 60 per Matter / 0                                                      | 1,500             | `docs/manual/cli.md` ratified  | not yet broken into Matters |
| 5-pre | `docs/manual/rest.md` drafted and ratified (not a Matter) | – / 1 week               | –                           | not set (R-138 is per Matter) / 0                                      | – (no brief)      | –                              | pending                     |
| 5     | REST engine (ADR-0038)                                    | 6 Matters / 4 weeks      | –                           | 60 per Matter / 0                                                      | 1,500             | `docs/manual/rest.md` ratified | not yet broken into Matters |
| 6     | PWA (ADR-0037)                                            | 10 Matters / 8 weeks     | –                           | 60 per Matter / 0                                                      | 1,500             | –                              | not yet broken into Matters |

**Phase 3 landed on matters 2026-11-26**: the Oracle core runs use cases 1 to 3 end to end against stub ports (M-005 to M-009).

**Phase 3 broken into Matters 2026-11-25**: M-005 to M-009 (R-273, R-274, R-286), from `docs/reviews/2026-11-25-phase-3-oracle-core.md`.

**Phase 2 landed 2026-11-24**: drift signals 1 to 4 run at every landing (M-002 to M-004).

**Phase 1 landed 2026-11-21.** Caps from Phase 1 (R-138): 60 owner touches per Matter and 1,500 lines of required
reading per brief; reaching either stops the loop for the owner. Week budgets stand until Phase 2 lands (R-139). ADR-0042
consolidates ADR-0040 and its amendment ADR-0041 (R-141, R-143, R-144).

Phases 3–6 are broken into Matters by the owner, with the copilot, when
the previous phase lands. "Parity" in Phase 4 means "matches the ratified
manual" (R-008).

The manuals behind the Phase 4 and 5 entry gates are not Matters. Each is
drafted in a copilot session with the owner and ratified by the owner
(`docs/manual/README.md`). The clerk raises "draft the manual" as a question
when the phase before the gate lands. Each manual has its own pre-phase row,
budgeted in weeks only, so a manual overrun is visible apart from the phase it
gates (R-009–R-011). The week budgets of Phases 3–6 are revisited for the cost
of spec holes when Phase 1 lands, together with the caps (R-009).

## Entry format

```markdown
### M-NNN: <title>

- Status: pending | in-progress | awaiting-ruling | awaiting-ratification | landed | withdrawn
- Phase: <n>
- Licensed by: <ADRs, glossary terms, Rulings this Matter implements>
- Scope: <the vertical slice, in one or two sentences>
- Tier-A surface: <public types, ports or files this Matter may NOT change; or "drafts Tier-A files for ratification">
- Free to choose: <decisions explicitly left to the implementer; drafted by the copilot, ratified with the Matter>
- Acceptance: <a command that exits 0 or 1; the tester writes the tests it runs before implementation>
- Open questions: <Q-ids awaiting a Ruling, including spec holes, or none>
- Commits: <SHAs on the integration branch>
- Notes: <at most 3 lines>
```

## Matters

### M-001: Draft the incision code for ratification

- Status: landed
- Phase: 1
- Licensed by: ADR-0040 (the incision code); CONTEXT.md; ADRs 0023–0027, 0030, 0037, 0038
- Scope: Draft the core value types (Transformation, Hexagram, Figure, Line Value, Pick, Round, Casting, …), the four driven-port signatures and the ten use-case signatures, plus a walking skeleton that runs end to end (one use case from a driving adapter, through the application, to a stub driven adapter).
- Tier-A surface: drafts Tier-A files for ratification. The owner line-edits and ratifies them before anything builds on them.
- Free to choose: Layout C's draft Free to choose in docs/reviews/2026-11-19-m-001-package-layout.md (R-024, R-025).
- Acceptance: `pnpm type:check && pnpm --filter @hexagram/cli-adapter test`; the skeleton test drives one use case from a
  driving adapter, through the application, to a stub driven adapter (R-023, R-025). The use case is 8, Look up the catalogue,
  against a stub Scripture Catalogue (R-028). The package lives at `overhaul/cli-adapter` (R-029).
- Open questions: none. Landed 2026-11-21: Acceptance passes (R-023's command exits 0, 14/14 tests), R-128's warning is
  cleared. Q-1 to Q-100 ruled as R-022 to R-137; one test-list approval.
- Commits: slice 1: f643475 (oracle), f905f13 (consultation-journal); slice 2: de26925, 146eaf5, c0e8a31, 4c7e1d4; slice 3: e0996c3, 6b01b31; slice 4: c27e0f7; slice 5: b6f0605; slice 6: 6da7728, 5f45524, 1918732; slice 7: fbd18cb, 67e28b4, 02e48e3; slice 8: d70ca10; acceptance tests: 77cd0a2; walking skeleton: d1dcaf6, 219b080
- Notes: Where the drafts live (package layout) is itself Tier A. The first step is to propose it to the owner.
  The proposal covers package axis, granularity and in-package structure as one set, with options side by side (R-021),
  within R-018 (no re-export-only files), R-019 (`imports` aliases) and R-020 (a lint-visible purity boundary).

### M-002: Build drift signal 3, the boundary rules

- Status: landed
- Phase: 2
- Licensed by: ADR-0042 (drift signals); R-140, R-147 to R-157
- Scope: Drift signal 3: lint rules for imports across bounded contexts and around ports, purity, the complete-Casting
  guard, type assertions and untyped data, in `overhaul/`, failing `pnpm lint:check` on every landing; plus a prover
  with planted violations. Signals 1, 2 and 4 moved to M-003 (R-147).
- Tier-A surface: the boundary rules encode Tier-A dependency decisions; as ruled in R-148 to R-157 over
  `docs/reviews/2026-11-21-m-002-boundary-rules.md` (§2, §4, §5).
- Free to choose: the proposal's §4 as ratified in R-157 (items 6 to 13), with R-154 (R-142's line-edits land in the first
  slice to land).
- Acceptance: `pnpm lint:check && pnpm drift:prove` (R-156): `drift:prove` exits 0 only if every planted violation is
  caught by its own rule and every clean twin passes, its expected list fixed in the prover.
- Open questions: none. Landed 2026-11-22: Acceptance passes (`pnpm lint:check && pnpm drift:prove` exits 0 for B1 to
  B12 and the Oracle-subpath analysis); `pnpm drift:oracle-subpaths` lists exactly `./begin-casting`, `./divide`,
  `./next-round` and `./transcribe` as loading Oracle code (R-185). Slice 4 took four attempts (R-058, R-193, R-194).
  Stated limits of the analysis: plain JavaScript (R-192); and, from the final review (R-194), `data:` and other URL
  schemes, Windows UNC paths, and CommonJS `require()`, `createRequire` and `import.meta.resolve` are not followed.
  Q-M-002-1 to Q-M-002-47 ruled as R-057, R-147 to R-194; acceptance lists approved in R-170 (a16464e) and R-189.
- Commits: slice 1 with the acceptance material: 28cd0b3, a9e08a2, ef9ff26, b91166b, 207408f, 27113ea; slice 2: 4cdce11, 85a5667, d32ecc3; slice 3: 9e9f0a1, 7e3d477, 2152063, e17f002; slice 4: c3a61ff, 59359ee
- Notes: The rules: B1 and B2 per R-150 (all `node:*`, the effectful globals, dynamic imports, `globalThis`); B3, B6 to
  B8, B10 per R-157; B4 per R-151 (`remainder-group-policy` imports `oracle` as types only); B5 per R-152
  (`consultation-journal/divined-at` only); B9 checked by `lint:check` (R-148); B11 per R-057 and R-149 (`as`, `<T>`,
  `!`; `as const` exempt); B12 per R-101 and R-153 (`no-unsafe-assignment`, `-argument`, `-return`); B13's analysis
  built now, B13 and B14 added by the PWA's and REST engine's Matters (R-151).
  The purity list (R-020) includes `remainder-group-policy` (R-026).
  The first slice to land also carries R-142's line-edits, worded per R-155 and R-157(15): keep's comment states
  only that it takes a complete Casting and does no replay (ADR-0026); "Reuses `Day` from `consultation-journal`."
  above R-076's import; R-050's comment as R-157(15) gives it.

### M-003: Build drift signals 2 and 4

- Status: landed
- Phase: 2
- Licensed by: ADR-0042 (drift signals); R-147; narrowed by R-240
- Scope: The shared scanner and `pnpm drift:check`, glossary conformance (signal 2) and ephemeral-ID leakage
  (signal 4), with planted violations in `drift:prove`. Signal 1 and `drift:check` joining `check:all` moved to M-004
  (R-240).
- Tier-A surface: the vocabulary each script checks: which _Avoid_ entries are checkable and how identifiers are split
  and matched, whether Ruling IDs count as ephemeral.
- Free to choose: the proposal's §3, narrowed as R-216 rules.
- Acceptance: `pnpm lint:check && pnpm drift:check && pnpm drift:prove` (R-147).
- Open questions: none. Slices 1 and 2 landed 2026-11-22. Q-M-003-1 to -48 ruled as R-195 to R-241, and the marking as R-242 (Q6 folded into
  Q12; the proposal's digest as R-207). Stated limits of signal 4: escapes that cook to a line terminator in a test
  name (`\n`, U+2028, U+2029) and line continuations move a finding's line (R-230); an ID glued to an E6 path by `,`
  or `;` is not reported (R-239). Proposal: `docs/reviews/2026-11-22-m-003-drift-signals.md`.
  The owner ratified the _Avoid_ marking in `CONTEXT.md` (R-242). Landed 2026-11-23: Acceptance passes
  (`pnpm lint:check && pnpm drift:check && pnpm drift:prove`); on the real tree `drift:check` reports 80 files, signal
  2 with 0 findings (55 forms checked, 70 unmarked) and signal 4 with 0. Q-M-003-49 to -55 ruled as R-243 to R-249.
  Stated limits of signal 2: escapes that cook to a line break shift a G2 finding's line (as R-230); acronym plurals
  such as `DRMs` (R-244); an `_Avoid_:` list must start at column 0; default imports are not declared (R-245).
- Commits: slice 1: 4591c81, 49f55a0; slice 2: 78c5c79, 3545cad; glossary marking: d9a1c23, 42806c9; slice 3:
  6785d33, 20cfacf
- Notes: Slices (proposal §4): scanner and prover, signal 4, signal 2 here; signal 1's two slices and R-206's step in
  M-004. Owner touches: 55 of 60 (R-195 to R-249).

### M-004: Build drift signal 1 and run drift:check at every landing

- Status: landed
- Phase: 2
- Licensed by: ADR-0042 (drift signals); R-147; R-240
- Scope: Doc truth (signal 1): paths and symbols named in `AGENTS.md`, Accepted ADRs and `docs/design/*.md` must exist
  (R-195, R-201, R-202, R-207), with its plants in `drift:prove`; then `drift:check` becomes a root turbo task that
  `check:all` runs (R-206).
- Tier-A surface: as ruled for signal 1 in R-195 to R-207 and R-208 to R-239; the exception file's seed entries
  (R-195) and the former-roots list (R-201) are ratified with its first slice.
- Free to choose: M-003's, as R-216 rules.
- Acceptance: `pnpm lint:check && pnpm drift:check && pnpm drift:prove` (R-147).
- Open questions: none. Phase 2's budget raised to 3 Matters (R-250). In flight (2026-11-23): slice 1 (signal 1
  paths) on branch m/M-004-s1, worktree ../hexagram-wt-M-004-s1. Q-M-004-1 to -6 ruled as R-251 to R-256 (the seed
  and former roots in R-254; the acceptance list in R-256). Attempt 1 (e9cfe81 fixtures, 9304172 code) APPROVED;
  Q-M-004-7 to -10 ruled as R-257 to R-260; slice 1 landed 2026-11-23. Stated limits of signal 1: links, bare text
  and fences are not read (R-251); a path in parentheses or quotes inside a span is skipped; malformed markdown can
  swallow a span; macOS globbing ignores case (R-260). Slice 2 (D3) landed 2026-11-24; Q-M-004-11 to -17 ruled as
  R-261 to R-267. Stated limits of D3: a name in the drift fixtures or provers counts as present (R-267); a `<…>` word is
  still split for symbols; symlinked code is not read; tokens starting `_` or `$` are not candidates. Slice 3 landed 2026-11-24 (Q-M-004-18 to
  -21 ruled as R-268 to R-271): `drift:check` runs in `check:all`, `check:affected`, CI's `check` job and the clerk's
  Step 6, uncached. M-004 landed 2026-11-24; Acceptance passes on matters.
- Commits: slice 1: 50aeb4e, 865d55b; slice 2: 6863d41, a09ce0b; slice 3: 9bd3ac3, 4882d35
- Notes: Started 2026-11-23, after M-003 landed. Slices (the M-003 proposal's §4): signal 1 paths, signal 1 symbols, and R-206's step.

### M-005: Pick Division: `nextRound` and `divide`

- Status: landed
- Phase: 3
- Licensed by: ADR-0023 (valid Pick, Remainder Groups), ADR-0026, ADR-0038;
  CONTEXT.md (Round, Division, Pick, Hung Stalk, Remainder, Set-aside); R-030,
  R-047, R-055, R-056, R-087 to R-101
- Scope: Make `nextRound` and `divide` real, each replaying the incoming
  partial Casting first. The eighteenth Round yields a complete Casting and
  its Transformation. `composeCli` gains use case 1's steps, and a test drives
  eighteen Divisions by Pick to a complete Casting through `cli-adapter`.
- Tier-A surface: implements ratified signatures in `oracle/src/division.ts`;
  widens `composeCli`'s return type (R-137).
- Free to choose: how replay is structured, so `transcribe` can reuse it; how
  the next `PartialCasting` is built as a literal (R-056); test layout. A
  private `PartialCasting` guard is not free: it comes to the owner as a
  question. Not free either: the order of Picks within each Remainder Group,
  which `nextRound` returns (R-278), and refusal fields.
- Acceptance: `pnpm type:check && pnpm --filter @hexagram/oracle exec vitest run tests/next-round.test.ts tests/divide.test.ts && pnpm --filter @hexagram/cli-adapter exec vitest run tests/pick-division.test.ts`
- Open questions: none (R-275, R-277 and R-278 rule its Phase 3 questions).
  Likely from the tester: a Pick that is not a whole number; which refusal comes first
  when the Casting fails replay and the new Pick is also invalid.
- Commits: f67caf2, aca0100 (slice 1); ed0f3e6, 151a7bc, 9b24e1f, 326a588 (slice 2), as on main (PR #57)
- Notes: about 750 lines, two slices: replay and `nextRound`; `divide` to the
  complete Casting, with `composeCli`.

### M-006: Physical Division: `transcribe`

- Status: landed
- Phase: 3
- Licensed by: ADR-0043 (the check order), ADR-0038 (the Transcription
  checks); CONTEXT.md (Transcription); R-091, R-093
- Scope: Make `transcribe` real on M-005's replay. `composeCli` gains
  `transcribe`, and a test transcribes eighteen Rounds to a complete Casting
  through `cli-adapter`.
- Tier-A surface: implements a ratified signature; widens `composeCli`.
- Free to choose: private helpers; test layout.
- Acceptance: `pnpm type:check && pnpm --filter @hexagram/oracle exec vitest run tests/transcribe.test.ts && pnpm --filter @hexagram/cli-adapter exec vitest run tests/physical-division.test.ts`, its tests asserting that each `DivisionRule` R-276 keeps reachable is reported by at least one Transcription.
- Open questions: none (R-276, R-295 to R-298).
- Commits: 72eeda2 (acceptance), 8fc9baa (shared helper), 1352070 (`transcribe`), a513415 (comment), 4e16dd2 (`composeCli`)
- Notes: about 450 lines, one slice.

### M-007: Automatic Division: the Remainder-Group policy

- Status: landed
- Phase: 3
- Licensed by: ADR-0023; ADR-0037 (the policy outside the Oracle); R-026,
  R-109, R-119
- Scope: Make `choosePick` real. `composeCli` gains `drawAutomaticPick` and
  takes a Random Source, and a test casts a whole Automatic Casting through
  `cli-adapter` with a scripted Random Source.
- Tier-A surface: implements a ratified signature; widens `composeCli`'s
  return type and, for the first time, its ports input.
- Free to choose: the body of `choosePick`; helpers that script
  `integerBelow`.
- Acceptance: `pnpm type:check && pnpm --filter @hexagram/remainder-group-policy exec vitest run tests/choose-pick.test.ts && pnpm --filter @hexagram/cli-adapter exec vitest run tests/automatic-division.test.ts`, the first file asserting ADR-0023's four probabilities exactly (R-279).
- Open questions: none (R-278, the draw mapping; R-279).
- Commits: b669ace (acceptance), 77c2238 (`choosePick`), 094ea54 (`DivisionRule` order), 4f7cf8c (stub Random Source in tests), d7e3f2d (`composeCli`)
- Notes: about 300 lines, one slice.

### M-008: Keep and record a Consultation

- Status: landed
- Phase: 3
- Licensed by: ADR-0026, ADR-0027, ADR-0030 (ULID); R-031, R-032, R-108,
  R-110, R-111, R-112, R-135
- Scope: Make `keepCastConsultation` and `recordConsultation` real, building
  the Consultation Id from the Clock and the Random Source. `composeCli` gains
  both, and a test runs use case 1 from `beginCasting` to a kept Cast
  Consultation, and use case 2, against stub ports.
- Tier-A surface: implements ratified signatures; widens `composeCli` and its
  ports input (Store, Clock); **adds `consultation-journal` to `cli-adapter`'s
  dev dependencies and to B8's arrows** (R-281).
- Free to choose: the ULID helper's private name, file and structure inside
  `application`, within R-280.
- Acceptance: `pnpm type:check && pnpm lint:check && pnpm --filter @hexagram/application exec vitest run tests/keep-cast-consultation.test.ts tests/record-consultation.test.ts && pnpm --filter @hexagram/cli-adapter exec vitest run tests/keep-and-record.test.ts`
- Open questions: none (R-280, R-281).
- Commits: c28118e (acceptance), 16e7a63 (dev dependency and arrow), 32b6565 (B9 twin), ceb136e (Id helper), 2d8a35f (keep and record), a731185 (`composeCli`)
- Notes: about 450 lines, one or two slices. Consultation Journal work inside
  the Oracle phase (section 1).

### M-009: Resolve a Transformation: the Hexagram table, `resolve` and use case 3

- Status: landed
- Phase: 3
- Licensed by: ADR-0024, ADR-0025, ADR-0028, ADR-0037; CONTEXT.md (Figure,
  Polarity, Trigram, Fuxi Sequence Number, Nuclear, Inverse and Reversed
  Hexagram, Moving Line, Resolution, Applicable Passages, Passage Reference,
  Commentary, Yilin Verse, Reading Preference); R-061, R-064, R-080, R-081,
  R-085, R-104, R-108, R-114 to R-117
- Scope: Draft ADR-0025's 64-row table with tests that check every row
  against the glossary's rules; make `resolve` real over it; make
  `resolveTransformation` real. `composeCli` gains use case 3, and a test
  drives it through `cli-adapter` against a stub Scripture Catalogue.
- Tier-A surface: **drafts Tier-A files for ratification**: the table's
  public row type, its subpath and its lookup (R-282). `resolve` and
  `resolveTransformation` implement ratified signatures; widens `composeCli`.
- Free to choose: how rows are written (literal data, as ADR-0025 requires);
  private lookup structure; test layout.
- Acceptance: `pnpm type:check && pnpm --filter @hexagram/oracle exec vitest run tests/hexagram-table.test.ts tests/resolution.test.ts && pnpm --filter @hexagram/application exec vitest run tests/resolve-transformation.test.ts && pnpm --filter @hexagram/cli-adapter exec vitest run tests/resolve.test.ts`. The table test asserts 64 rows and 64 distinct Figures; the Resolution test asserts it ran over 4,096 distinct Transformations.
- Open questions: none (R-282 to R-285). Likely from the tester:
  Commentaries asked for an X之X Transformation.
- Commits: 7b787d9 (ratified surface), f95c445 (acceptance), 5cb3ef1 (rows and lookup), d9bfb2f (comment) for slice 1; 51def64 (acceptance), c74eab4 (`resolve`) for slice 2; 23f7164, 201492c (acceptance), 9289882 (use case 3), 150091a (`composeCli`), f6f3b42 (comment) for slice 3
- Notes: about 1,350 lines, three slices: the table; `resolve`; use case 3.
