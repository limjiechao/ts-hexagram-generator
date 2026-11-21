# MATTERS

The live tracker of implementation work (ADR-0040). Each vertical slice of work
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

The overhaul grows serially (ADR-0040). The owner sets each phase's budget
**before the phase starts**. Exceeding a budget is a Tier-A event: the clerk
stops and asks.

Two sets of figures sit side by side (ADR-0040, "Build order and budgets"):

- **Budget** and the **owner-touch cap** are the owner's. The clerk never edits
  them.
- **Estimate** and **owner touches used** are the clerk's, revised from actual
  figures after every landing. When the estimate first exceeds the budget, the
  clerk warns the owner at once.

Phase 1 runs with no owner-touch cap and no brief-size cap. The owner sets both
from its actual figures when it lands (R-006).

| Phase | Scope                                                     | Budget (Matters / weeks) | Estimate (clerk)           | Owner touches (cap / used)        | Brief cap (lines) | Entry gate                     | Status                      |
| ----- | --------------------------------------------------------- | ------------------------ | -------------------------- | --------------------------------- | ----------------- | ------------------------------ | --------------------------- |
| 1     | Walking skeleton and incision code                        | 3 Matters / 2 weeks      | 1 Matter / 2 days (actual) | uncapped / 125                    | uncapped          | –                              | landed (M-001)              |
| 2     | Drift-signal tooling (signals 1–4)                        | 2 Matters / 1 week       | –                          | 60 per Matter / 0                 | 1,500             | –                              | pending                     |
| 3     | Oracle core                                               | 5 Matters / 3 weeks      | –                          | 60 per Matter / 0                 | 1,500             | –                              | not yet broken into Matters |
| 4-pre | `docs/manual/cli.md` drafted and ratified (not a Matter)  | – / 2 weeks              | –                          | not set (R-138 is per Matter) / 0 | – (no brief)      | –                              | pending                     |
| 4     | CLI at parity with today's app, on the new core           | 12 Matters / 8 weeks     | –                          | 60 per Matter / 0                 | 1,500             | `docs/manual/cli.md` ratified  | not yet broken into Matters |
| 5-pre | `docs/manual/rest.md` drafted and ratified (not a Matter) | – / 1 week               | –                          | not set (R-138 is per Matter) / 0 | – (no brief)      | –                              | pending                     |
| 5     | REST engine (ADR-0038)                                    | 6 Matters / 4 weeks      | –                          | 60 per Matter / 0                 | 1,500             | `docs/manual/rest.md` ratified | not yet broken into Matters |
| 6     | PWA (ADR-0037)                                            | 10 Matters / 8 weeks     | –                          | 60 per Matter / 0                 | 1,500             | –                              | not yet broken into Matters |

**Phase 1 landed 2026-11-21.** Caps from Phase 1 (R-138): 60 owner touches per Matter and 1,500 lines of required
reading per brief; reaching either stops the loop for the owner. Week budgets stand until Phase 2 lands (R-139). An
amendment to ADR-0040 is being drafted (R-141).

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

### M-002: Build drift signals 1–4

- Status: pending
- Phase: 2
- Licensed by: ADR-0040 (drift signals)
- Scope: Scripts or lint rules for doc truth, glossary conformance, boundaries (build-failing) and ephemeral-ID leakage, run on every landing.
- Tier-A surface: the boundary rules encode Tier-A dependency decisions. Propose them to the owner before enforcing them.
- Free to choose: _owner to ratify_, drafted with the boundary-rules proposal.
- Acceptance: _owner to set_, with the boundary rules. Intent: each signal
  fails on a planted violation and passes on the clean tree.
- Open questions: none (Q-M-002-1 ruled as R-057)
- Commits: –
- Notes: The boundary rules must include R-020: the Oracle and the use cases import nothing effectful; effects reach them only through driven ports.
  They must also include R-055: `isCompleteCasting` may be imported only in `oracle` and the PWA's one trust file.
  And R-057: a lint banning type assertions in `overhaul/*`, tests included, exempting `as const`.
  And R-101: `no-unsafe-assignment` in `overhaul/*`, so untyped data cannot be assigned to a checked type.
  The purity list (R-020) includes `remainder-group-policy` (R-026).
  Starts with an agent-drafted boundary-rules proposal, Acceptance and Free to choose (R-140). Its first slice also
  carries R-142's line-edits: keep's comment names both makers of a complete Casting; one-line "why" comments for
  R-050 (the repeated Transformation) and R-076 (`scripture-catalogue` → `consultation-journal`).
