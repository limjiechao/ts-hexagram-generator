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

| Phase | Scope                                                     | Budget (Matters / weeks) | Estimate (clerk)                                   | Owner touches (cap / used)        | Brief cap (lines) | Entry gate                     | Status                      |
| ----- | --------------------------------------------------------- | ------------------------ | -------------------------------------------------- | --------------------------------- | ----------------- | ------------------------------ | --------------------------- |
| 1     | Walking skeleton and incision code                        | 3 Matters / 2 weeks      | 1 Matter / 2 days (actual)                         | uncapped / 125                    | uncapped          | –                              | landed (M-001)              |
| 2     | Drift-signal tooling (signals 1–4)                        | 2 Matters / 1 week       | 2 Matters / 1 week (M-002: slices 1–3 of 4 landed) | 60 per Matter / 31 (M-002)        | 1,500             | –                              | in progress                 |
| 3     | Oracle core                                               | 5 Matters / 3 weeks      | –                                                  | 60 per Matter / 0                 | 1,500             | –                              | not yet broken into Matters |
| 4-pre | `docs/manual/cli.md` drafted and ratified (not a Matter)  | – / 2 weeks              | –                                                  | not set (R-138 is per Matter) / 0 | – (no brief)      | –                              | pending                     |
| 4     | CLI at parity with today's app, on the new core           | 12 Matters / 8 weeks     | –                                                  | 60 per Matter / 0                 | 1,500             | `docs/manual/cli.md` ratified  | not yet broken into Matters |
| 5-pre | `docs/manual/rest.md` drafted and ratified (not a Matter) | – / 1 week               | –                                                  | not set (R-138 is per Matter) / 0 | – (no brief)      | –                              | pending                     |
| 5     | REST engine (ADR-0038)                                    | 6 Matters / 4 weeks      | –                                                  | 60 per Matter / 0                 | 1,500             | `docs/manual/rest.md` ratified | not yet broken into Matters |
| 6     | PWA (ADR-0037)                                            | 10 Matters / 8 weeks     | –                                                  | 60 per Matter / 0                 | 1,500             | –                              | not yet broken into Matters |

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

- Status: in-progress
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
- Open questions: Q-M-002-31 (should B10 also catch a relative import of oracle's built `dist` output?), batched with
  slice 4's spec holes. Slices 1 to 3 landed; Q-M-002-29, -30 ruled as R-175, R-176.
  In flight (2026-11-22): slice 4 (R-151: B13's analysis of which `application` subpaths load Oracle code) on branch
  m/M-002-s4, worktree ../hexagram-wt-M-002-s4. The tester's spec audit and draft acceptance list come first, for the
  owner's approval; then the plants, an implementer, a fresh reviewer, verification and landing. The owner approved the acceptance list (a16464e) on 2026-11-22, plus one B1 plant per R-170.
  Q-M-002-1 to Q-M-002-24 ruled as R-057, R-147 to R-170; digest R-157.
- Commits: slice 1 with the acceptance material: 28cd0b3, a9e08a2, ef9ff26, b91166b, 207408f, 27113ea; slice 2: 4cdce11, 85a5667, d32ecc3; slice 3: 9e9f0a1, 7e3d477, 2152063, e17f002
- Notes: The rules: B1 and B2 per R-150 (all `node:*`, the effectful globals, dynamic imports, `globalThis`); B3, B6 to
  B8, B10 per R-157; B4 per R-151 (`remainder-group-policy` imports `oracle` as types only); B5 per R-152
  (`consultation-journal/divined-at` only); B9 checked by `lint:check` (R-148); B11 per R-057 and R-149 (`as`, `<T>`,
  `!`; `as const` exempt); B12 per R-101 and R-153 (`no-unsafe-assignment`, `-argument`, `-return`); B13's analysis
  built now, B13 and B14 added by the PWA's and REST engine's Matters (R-151).
  The purity list (R-020) includes `remainder-group-policy` (R-026).
  The first slice to land also carries R-142's line-edits, worded per R-155 and R-157(15): keep's comment states
  only that it takes a complete Casting and does no replay (ADR-0026); "Reuses `Day` from `consultation-journal`."
  above R-076's import; R-050's comment as R-157(15) gives it.

### M-003: Build drift signals 1, 2 and 4

- Status: pending
- Phase: 2
- Licensed by: ADR-0042 (drift signals); R-147
- Scope: Scripts for doc truth (signal 1), glossary conformance (signal 2) and ephemeral-ID leakage (signal 4), run by
  `pnpm drift:check` on every landing, with planted violations in `drift:prove`.
- Tier-A surface: the vocabulary each script checks: names that may not exist yet, which _Avoid_ entries are
  checkable and how identifiers are split and matched, whether Ruling IDs count as ephemeral.
- Free to choose: _owner to ratify_, drafted with its own proposal.
- Acceptance: `pnpm lint:check && pnpm drift:check && pnpm drift:prove` (R-147).
- Open questions: none yet. Carried from M-002's proposal for this Matter's own proposal: its Q1 (doc-truth names that do
  not exist yet), Q2 (checkable _Avoid_ entries) and Q6 (Ruling IDs as ephemeral), and the challenger's point that the
  regexes for signals 2 and 4 are Tier A.
- Commits: –
- Notes: Starts after M-002 lands, with an agent-drafted proposal as R-140 set for M-002.
