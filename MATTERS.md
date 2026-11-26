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
| 4-pre | `docs/manual/cli.md` drafted and ratified (not a Matter)  | – / 2 weeks              | –                           | not set (R-138 is per Matter) / 0                                      | – (no brief)      | –                              | ratified (R-353)            |
| 4     | CLI at parity with today's app, on the new core           | 12 Matters / 8 weeks     | –                           | 60 per Matter / 0                                                      | 1,500             | `docs/manual/cli.md` ratified  | M-010 to M-021 (R-385)      |
| 5-pre | `docs/manual/rest.md` drafted and ratified (not a Matter) | – / 1 week               | –                           | not set (R-138 is per Matter) / 0                                      | – (no brief)      | –                              | pending                     |
| 5     | REST engine (ADR-0038)                                    | 6 Matters / 4 weeks      | –                           | 60 per Matter / 0                                                      | 1,500             | `docs/manual/rest.md` ratified | not yet broken into Matters |
| 6     | PWA (ADR-0037)                                            | 10 Matters / 8 weeks     | –                           | 60 per Matter / 0                                                      | 1,500             | –                              | not yet broken into Matters |

**Phase 4 broken into Matters 2026-11-26**: M-010 to M-021 (R-354 to R-385), from `docs/reviews/2026-11-26-phase-4-cli.md`. M-011 waits for the owner's 用九 and 用六 text (R-370); ADR-0010 is consolidated with ADR-0011 and ADR-0043 before M-019 (R-384).

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

### M-010: The command frame and the Node effects

- Status: awaiting-ruling (Q-M-010-8 to Q-M-010-19)
- Phase: 4
- Licensed by: ADR-0010 as R-332 amends it, ADR-0020, ADR-0037; manual
  sections 2, 6.1, 7; R-331, R-332, R-350, R-351
- Scope: Build `node-effects` (system Clock; Random Source on `node:crypto`).
  Give each of the six commands an in-process entry point and a bin that
  calls it with the process and real adapters. Each command parses its
  options (section 7), applies section 2's terminal table, and refuses with
  the manual's line or a usage line, exit 1. A command whose body is not
  built yet exits 1 with one line. A test casts through `composeCli` with the
  real Clock and Random Source.
- Tier-A surface: **drafts for ratification** the entry point's signature
  (R-361) and the usage line. Boundary changes: `node-effects`' row (not pure)
  and `cli-adapter`'s production arrows (R-358), with B9 twins. Plants to
  retire or replace: `b7-imports-catalogue.ts`, `b7-dynamic-import-oracle.ts`,
  `b8-test-imports-oracle.test.ts`, replaced by plants importing a package
  still outside the arrows (for example `remainder-group-policy`).
- Free to choose: the option parser (`node:util` `parseArgs` or by hand);
  how the frame is shared among commands.
- Acceptance: `test -f overhaul/node-effects/tests/system-clock.test.ts && test -f overhaul/node-effects/tests/crypto-random-source.test.ts && test -f overhaul/cli-adapter/tests/commands/frame.test.ts && test -f overhaul/cli-adapter/tests/commands/frame-spawn.test.ts && test -f overhaul/cli-adapter/tests/real-effects-casting.test.ts && pnpm type:check && pnpm lint:check && pnpm drift:prove && pnpm --filter @hexagram/node-effects exec vitest run tests/system-clock.test.ts tests/crypto-random-source.test.ts && pnpm --filter @hexagram/cli-adapter exec vitest run tests/commands/frame.test.ts tests/commands/frame-spawn.test.ts tests/real-effects-casting.test.ts`.
  `frame.test.ts` drives every column of section 2's table through the entry
  point; `frame-spawn.test.ts` spawns the bins only for the non-TTY and `CI`
  columns.
- Open questions: none open; ruled in R-355, R-357, R-358, R-359, R-361. Likely from the tester:
  `--wrap-width 0`; an option given twice; `CI=false`.
- Commits: a51a550, 10b8315 (ratified surface), 4f912ed (acceptance and fixtures), e01b8c2 (boundary rows), 5bdad2c (Clock), 9ca03c5 (Random Source) for slice 1
- Notes: about 800 lines, two slices. R-332 is folded into ADR-0044 (R-384);
  ADR-0010 is consolidated before M-019, not before this Matter.

### M-011: The bundled Scripture Catalogue

- Status: pending
- Phase: 4
- Licensed by: ADR-0025, ADR-0028, ADR-0032, ADR-0037; CONTEXT.md (Edition,
  Witness, Translation, Licence Gate, Received Sequence Number, Commentary,
  Citation); R-061, R-064, R-081, R-085, R-283, R-284, R-326, R-341, R-344
- Scope: Build `catalogue-bundled` from the legacy texts, plus 用九 / 用六 as
  R-370 rules, with an Edition and Witness record for each Edition, applying
  the Reading Preference, then the Licence Gate for a Private Channel. Widen
  the Catalogue port and use case 8 (R-372). A test resolves through
  `composeCli` with the real Catalogue.
- Tier-A surface: **drafts for ratification** the widened port and use-case
  8 signatures, the data format and EditionIds (R-369), and the Edition
  records (R-373); widens `composeCli`; stub Catalogues gain the new members
  (R-306's procedure); new row (pure, R-357) and twin.
- Free to choose: the one-off conversion script (not kept); private lookup
  structure.
- Acceptance: `test -f overhaul/catalogue-bundled/tests/passage-texts.test.ts && test -f overhaul/catalogue-bundled/tests/editions.test.ts && test -f overhaul/catalogue-bundled/tests/names.test.ts && test -f overhaul/cli-adapter/tests/bundled-catalogue.test.ts && pnpm type:check && pnpm lint:check && pnpm drift:prove && pnpm --filter @hexagram/catalogue-bundled exec vitest run tests/passage-texts.test.ts tests/editions.test.ts tests/names.test.ts && pnpm --filter @hexagram/cli-adapter exec vitest run tests/bundled-catalogue.test.ts`.
  The passage test counts a text for every Citation the legacy data holds,
  and for 用九 and 用六, in each Edition; the names test asserts 64 distinct
  Received Sequence Numbers.
- Open questions: none open; ruled in R-369, R-370 (M-011 waits for the owner's 用九 and 用六 text), R-372, R-373. Likely from
  the tester: a Reading Preference naming an unknown Edition.
- Commits: –
- Notes: about 1,500 lines plus data, three slices: port and stubs; data and
  Editions; gate and lookups.

### M-012: The Markdown Consultation Store, and browsing and opening

- Status: pending
- Phase: 4
- Licensed by: ADR-0015, ADR-0020, ADR-0026, ADR-0030, ADR-0037; manual
  sections 4, 5; R-037, R-337
- Scope: Draft the codec (R-363); build `store-markdown` with `keep`, `get`
  and `list`, atomic writes that never overwrite, ADR-0030's filenames,
  Unreadable files, and an injected body renderer (R-364), a stub until
  M-013. Make use cases 4 and 5 real. A test keeps, browses and opens
  through `composeCli` and the real Store in a temporary folder.
- Tier-A surface: **drafts for ratification** the codec's signature and
  Unreadable reasons (R-366), the frontmatter byte fixture (R-375), and
  `store-markdown`'s public surface (R-362); widens `composeCli`; new row and
  twin.
- Free to choose: the temporary-file scheme within ADR-0030; private
  helpers. YAML emission is not free: the frontmatter fixture fixes it.
- Acceptance: `test -f overhaul/consultation-journal/tests/record-codec.test.ts && test -f overhaul/store-markdown/tests/keep-get-list.test.ts && test -f overhaul/store-markdown/tests/unreadable.test.ts && test -f overhaul/application/tests/browse-consultations.test.ts && test -f overhaul/application/tests/open-consultation.test.ts && test -f overhaul/cli-adapter/tests/journal.test.ts && pnpm type:check && pnpm lint:check && pnpm drift:prove && pnpm --filter @hexagram/consultation-journal exec vitest run tests/record-codec.test.ts && pnpm --filter @hexagram/store-markdown exec vitest run tests/keep-get-list.test.ts tests/unreadable.test.ts && pnpm --filter @hexagram/application exec vitest run tests/browse-consultations.test.ts tests/open-consultation.test.ts && pnpm --filter @hexagram/cli-adapter exec vitest run tests/journal.test.ts`.
  The Unreadable test produces each ratified reason from a planted file.
- Open questions: none open; ruled in R-362 to R-366, R-378. Likely from the tester: a Query
  with trailing newlines; two keeps of one Id at once.
- Commits: –
- Notes: about 1,300 lines, three slices: codec; Store; use cases 4 and 5.

### M-013: The Readout: plain text, Ink sections and the Markdown file

- Status: pending
- Phase: 4
- Licensed by: ADR-0013, ADR-0014, ADR-0022, ADR-0024, ADR-0025, ADR-0027,
  ADR-0030; manual sections 4, 5; R-105, R-283, R-284, R-340 to R-345
- Scope: Build the medium-neutral Readout of a Consultation or a
  Transformation in `presentation`. Under R-374 (A), the plain renderer, the
  Ink section strings and the Markdown body renderer live in `cli-adapter`;
  under (B), the Markdown body renderer moves to `presentation`. The Store's
  body renderer becomes real, and `hexagram-history --rerender-bodies` runs
  end to end.
- Tier-A surface: **drafts for ratification** `presentation`'s public
  surface and the byte fixtures for plain output, Ink sections, the Markdown
  body and the whole file (R-375); new row for `presentation` (pure) and
  the `cli-adapter` → `presentation` arrow, with twins.
- Free to choose: the Readout's private structure; width and wrapping
  computation within the fixtures.
- Acceptance: `test -f overhaul/presentation/tests/readout.test.ts && test -f overhaul/cli-adapter/tests/plain-readout-fixtures.test.ts && test -f overhaul/cli-adapter/tests/ink-section-fixtures.test.ts && test -f overhaul/cli-adapter/tests/markdown-file-fixtures.test.ts && test -f overhaul/cli-adapter/tests/commands/rerender-bodies.test.ts && pnpm type:check && pnpm lint:check && pnpm drift:prove && pnpm --filter @hexagram/presentation exec vitest run tests/readout.test.ts && pnpm --filter @hexagram/cli-adapter exec vitest run tests/plain-readout-fixtures.test.ts tests/ink-section-fixtures.test.ts tests/markdown-file-fixtures.test.ts tests/commands/rerender-bodies.test.ts`
- Open questions: none open; ruled in R-374, R-375. Likely from the tester: the Witness
  section with no Translation chosen; a Query of several lines in the ledger.
- Commits: –
- Notes: about 2,000 lines, three slices: the Readout; plain and Ink
  sections; the Markdown file and `--rerender-bodies`.

### M-014: Plain casting: `hexagram-random` and `hexagram-interactive`

- Status: pending
- Phase: 4
- Licensed by: ADR-0010, ADR-0023, ADR-0027; manual sections 6.3, 6.4, 7;
  R-346, R-350
- Scope: With `--plain` or a stdout that is not a TTY, ask for the Query on
  one line, cast (Automatic; Virtual by typed Pick), print the Readout and
  keep the Consultation, with the manual's endings. The first commands at
  parity.
- Tier-A surface: prompt and welcome wording.
- Free to choose: the line reader (`node:readline`).
- Acceptance: `test -f overhaul/cli-adapter/tests/commands/random-plain.test.ts && test -f overhaul/cli-adapter/tests/commands/interactive-plain.test.ts && pnpm type:check && pnpm --filter @hexagram/cli-adapter exec vitest run tests/commands/random-plain.test.ts tests/commands/interactive-plain.test.ts`,
  through the entry point with scripted stdin, a scripted Random Source and a
  temporary Journal, comparing stdout with M-013's fixtures.
- Open questions: none open; ruled in R-377 (ruled before it starts). Likely from the tester:
  Ctrl+C at a Pick prompt; EOF mid-Casting.
- Commits: –
- Notes: about 800 lines, two slices, one per command.

### M-015: Deleting, Merging Journals and importing legacy files

- Status: pending
- Phase: 4
- Licensed by: ADR-0015, ADR-0026, ADR-0027, ADR-0030, ADR-0037; manual
  sections 4, 5, 6.7, 6.8; R-334, R-348, R-349, R-350
- Scope: Build the Store's `remove` and `deletionRecords`; make use cases 6,
  7 and 10 real; build `legacy-import`, a parser of legacy `.txt` and
  version-1 files; run `hexagram-history --export-journal`, `--merge-journal`
  and `--import-legacy` end to end, with their reports.
- Tier-A surface: **drafts for ratification** the Deletion Record file
  (R-367) and the bundle with a byte fixture (R-368); report wording; new
  row for `legacy-import` (purity per R-357) and twin; widens `composeCli`.
- Free to choose: the parser's structure; what of the legacy converter it
  copies (R-360).
- Acceptance: `test -f overhaul/store-markdown/tests/remove.test.ts && test -f overhaul/application/tests/delete-consultation.test.ts && test -f overhaul/application/tests/merge-journals.test.ts && test -f overhaul/application/tests/import-legacy-files.test.ts && test -f overhaul/legacy-import/tests/parse-legacy.test.ts && test -f overhaul/cli-adapter/tests/commands/merge-journal.test.ts && test -f overhaul/cli-adapter/tests/commands/import-legacy.test.ts && pnpm type:check && pnpm lint:check && pnpm drift:prove && pnpm --filter @hexagram/store-markdown exec vitest run tests/remove.test.ts && pnpm --filter @hexagram/application exec vitest run tests/delete-consultation.test.ts tests/merge-journals.test.ts tests/import-legacy-files.test.ts && pnpm --filter @hexagram/legacy-import exec vitest run tests/parse-legacy.test.ts && pnpm --filter @hexagram/cli-adapter exec vitest run tests/commands/merge-journal.test.ts tests/commands/import-legacy.test.ts`.
  The merge test merges two Journals both ways and twice and asserts both
  folders end identical; import fixtures come from the fictional
  `legacy-real-*.txt` corpus.
- Open questions: none open; ruled in R-365, R-367, R-368, R-380. Likely from the tester: a
  bundle that is not JSON; a Shape B `.txt` with no timestamp.
- Commits: –
- Notes: about 2,000 lines, three slices: delete; merge; import. Merged under
  R-356 (A) to absorb the Viewer's split.

### M-016: Exporting to Typst and PDF

- Status: pending
- Phase: 4
- Licensed by: ADR-0015, ADR-0037; manual sections 6.8, 7, 8; R-105, R-125,
  R-347
- Scope: Make use case 9 real with `presentation`'s Typst renderer;
  `hexagram-history --export <path> [--filter <text>]` writes `.typ`, or a
  PDF compiled in-process by Typst's WebAssembly build.
- Tier-A surface: **drafts for ratification** the Typst byte fixtures and the
  dependency's package and version (R-376); the `application` →
  `presentation` arrow (R-105) and its twin; widens `composeCli`.
- Free to choose: the Typst template's private structure.
- Acceptance: `test -f overhaul/application/tests/export-consultations.test.ts && test -f overhaul/cli-adapter/tests/commands/export.test.ts && pnpm type:check && pnpm lint:check && pnpm drift:prove && pnpm --filter @hexagram/application exec vitest run tests/export-consultations.test.ts && pnpm --filter @hexagram/cli-adapter exec vitest run tests/commands/export.test.ts`,
  asserting the `.typ` bytes and that the `.pdf` begins `%PDF-`.
- Open questions: none open; ruled in R-376, R-380. Likely from the tester: an extension that
  is neither; an empty filter result.
- Commits: –
- Notes: about 900 lines, two slices, after the spike R-376 (A) asks for.

### M-017: The Viewer and full-screen Automatic Division

- Status: pending
- Phase: 4
- Licensed by: ADR-0009, ADR-0010, ADR-0012, ADR-0013, ADR-0023, ADR-0027;
  manual sections 5, 6.1, 6.3, 7, 8; R-332, R-342, R-343, R-350
- Scope: Port the full-screen Readout and Viewer (tabs, scroll, pan, footer,
  quit confirmation, retry after a failed keep) and run `hexagram-random`
  full-screen, with the settling slider, typed reveal and `Space` to skip.
- Tier-A surface: Ink and React in `cli-adapter` (R-359); the copied test
  helper (R-360); on-screen strings (R-382).
- Free to choose: component structure.
- Acceptance: `test -f overhaul/cli-adapter/tests/viewer/readout.test.tsx && test -f overhaul/cli-adapter/tests/viewer/random.test.tsx && pnpm type:check && pnpm lint:check && pnpm --filter @hexagram/cli-adapter exec vitest run tests/viewer/readout.test.tsx tests/viewer/random.test.tsx`
- Open questions: none open; ruled in R-381, R-382. Likely from the tester: resizing during
  playback; a keep failure mid-playback.
- Commits: –
- Notes: about 2,500 lines, three slices. The brief names files to port, not
  packages.

### M-018: Full-screen Virtual Division: `hexagram-interactive`

- Status: pending
- Phase: 4
- Licensed by: ADR-0010, ADR-0012, ADR-0027; manual sections 6.4, 7; R-332
- Scope: The sweeping slider with `Space`, the Pick reveal, and typed input
  (`--numeric-input`, `NO_COLOR`, `CI`), keeping with Division Method
  Virtual.
- Tier-A surface: on-screen strings.
- Free to choose: how the tick is derived within section 7's formula.
- Acceptance: `test -f overhaul/cli-adapter/tests/viewer/interactive.test.tsx && test -f overhaul/cli-adapter/tests/viewer/typed-pick.test.tsx && pnpm type:check && pnpm lint:check && pnpm --filter @hexagram/cli-adapter exec vitest run tests/viewer/interactive.test.tsx tests/viewer/typed-pick.test.tsx`
- Open questions: none open; ruled in R-381. Likely from the tester: Escape during the reveal.
- Commits: –
- Notes: about 1,500 lines, two slices.

### M-019: Physical Division: `hexagram-manual`

- Status: pending
- Phase: 4
- Licensed by: ADR-0010, ADR-0011 with ADR-0043, ADR-0038 (Line Retraction a
  client policy); manual section 6.5; R-276, R-339
- Scope: The Transcription form, the strip naming the first failing check,
  the `MISSING STALKS` gauge, Line Retraction, the help overlay and the
  32-row rule, keeping with Division Method Physical.
- Tier-A surface: strip and notice wording.
- Free to choose: how a retracted `PartialCasting` is built as a literal
  without assertions (R-056, B11); a private guard is not free.
- Acceptance: `test -f overhaul/cli-adapter/tests/viewer/manual.test.tsx && test -f overhaul/cli-adapter/tests/viewer/line-retraction.test.tsx && pnpm type:check && pnpm lint:check && pnpm --filter @hexagram/cli-adapter exec vitest run tests/viewer/manual.test.tsx tests/viewer/line-retraction.test.tsx`,
  the first asserting each strip state for each check ADR-0043 keeps
  reachable.
- Open questions: none yet. Likely from the tester: Ctrl+R at the first
  Round.
- Commits: –
- Notes: about 1,500 lines, two slices. The clerk folds ADR-0043 into
  ADR-0011 before it starts.

### M-020: Browsing the Journal, and Record a Consultation

- Status: pending
- Phase: 4
- Licensed by: ADR-0026, ADR-0030, ADR-0037; manual sections 5, 6.7, 6.8;
  R-333, R-336, R-337
- Scope: `hexagram-history`'s browse list (counts, rows, filter, Unreadable
  rows), opening a Readout, deleting with confirmation, and the Record a
  Consultation form.
- Tier-A surface: footer and form wording.
- Free to choose: list windowing; form widgets.
- Acceptance: `test -f overhaul/cli-adapter/tests/viewer/browse.test.tsx && test -f overhaul/cli-adapter/tests/viewer/record-form.test.tsx && pnpm type:check && pnpm lint:check && pnpm --filter @hexagram/cli-adapter exec vitest run tests/viewer/browse.test.tsx tests/viewer/record-form.test.tsx`
- Open questions: none open; ruled in R-378, R-379. Likely from the tester: deleting the last
  row; Enter on an empty list.
- Commits: –
- Notes: about 1,800 lines, three slices: list; open and delete; form.

### M-021: The Playground, Home, and the cutover

- Status: pending
- Phase: 4
- Licensed by: ADR-0014, ADR-0024, ADR-0026; manual sections 6.2, 6.6;
  R-331, R-338
- Scope: `hexagram-playground` and `hexagram`; then the cutover under R-355:
  the six names and root scripts run the new code, and `AGENTS.md`'s
  commands and `docs/legacy-architecture.md` are updated.
- Tier-A surface: menu wording; the cutover; `AGENTS.md`.
- Free to choose: banner animation internals.
- Acceptance: `test -f overhaul/cli-adapter/tests/viewer/playground.test.tsx && test -f overhaul/cli-adapter/tests/viewer/home.test.tsx && test -f overhaul/cli-adapter/tests/commands/cutover.test.ts && pnpm type:check && pnpm lint:check && pnpm --filter @hexagram/cli-adapter exec vitest run tests/viewer/playground.test.tsx tests/viewer/home.test.tsx tests/commands/cutover.test.ts`,
  the last spawning each root script under `CI` and expecting M-010's
  refusal line.
- Open questions: none open; ruled in R-355.
- Commits: –
- Notes: about 1,500 lines, three slices. The owner migrates the real Journal
  after it lands; no agent opens `consultations/`.
