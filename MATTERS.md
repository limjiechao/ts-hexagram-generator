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

| Phase | Scope                                                     | Budget (Matters / weeks) | Estimate (clerk)                                         | Owner touches (cap / used) | Brief cap (lines)   | Entry gate                     | Status                      |
| ----- | --------------------------------------------------------- | ------------------------ | -------------------------------------------------------- | -------------------------- | ------------------- | ------------------------------ | --------------------------- |
| 1     | Walking skeleton and incision code                        | 3 Matters / 2 weeks      | 3 Matters / 2 weeks (M-001: slice 1 of ~4 landed, day 2) | uncapped / 36              | uncapped            | –                              | pending                     |
| 2     | Drift-signal tooling (signals 1–4)                        | 2 Matters / 1 week       | –                                                        | _set after Phase 1_ / 0    | _set after Phase 1_ | –                              | pending                     |
| 3     | Oracle core                                               | 5 Matters / 3 weeks      | –                                                        | _set after Phase 1_ / 0    | _set after Phase 1_ | –                              | not yet broken into Matters |
| 4-pre | `docs/manual/cli.md` drafted and ratified (not a Matter)  | – / 2 weeks              | –                                                        | _set after Phase 1_ / 0    | – (no brief)        | –                              | pending                     |
| 4     | CLI at parity with today's app, on the new core           | 12 Matters / 8 weeks     | –                                                        | _set after Phase 1_ / 0    | _set after Phase 1_ | `docs/manual/cli.md` ratified  | not yet broken into Matters |
| 5-pre | `docs/manual/rest.md` drafted and ratified (not a Matter) | – / 1 week               | –                                                        | _set after Phase 1_ / 0    | – (no brief)        | –                              | pending                     |
| 5     | REST engine (ADR-0038)                                    | 6 Matters / 4 weeks      | –                                                        | _set after Phase 1_ / 0    | _set after Phase 1_ | `docs/manual/rest.md` ratified | not yet broken into Matters |
| 6     | PWA (ADR-0037)                                            | 10 Matters / 8 weeks     | –                                                        | _set after Phase 1_ / 0    | _set after Phase 1_ | –                              | not yet broken into Matters |

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

- Status: in-progress
- Phase: 1
- Licensed by: ADR-0040 (the incision code); CONTEXT.md; ADRs 0023–0027, 0030, 0037, 0038
- Scope: Draft the core value types (Transformation, Hexagram, Figure, Line Value, Pick, Round, Casting, …), the four driven-port signatures and the ten use-case signatures, plus a walking skeleton that runs end to end (one use case from a driving adapter, through the application, to a stub driven adapter).
- Tier-A surface: drafts Tier-A files for ratification. The owner line-edits and ratifies them before anything builds on them.
- Free to choose: Layout C's draft Free to choose in docs/reviews/2026-11-19-m-001-package-layout.md (R-024, R-025).
- Acceptance: `pnpm type:check && pnpm --filter @hexagram/cli-adapter test`; the skeleton test drives one use case from a
  driving adapter, through the application, to a stub driven adapter (R-023, R-025). The use case is 8, Look up the catalogue,
  against a stub Scripture Catalogue (R-028). The package lives at `overhaul/cli-adapter` (R-029).
- Open questions: none. Slice 2 questions Q-33 to Q-41 ruled as R-059 to R-067.
  Slice 2 partial on m/M-001-s2: 840943d, cbd688a. Q-32 R-058 (attempts per slice). Slice 1 ratified 2026-11-20 and landed; next slice 2 (application and its four ports); Q-30 R-055, Q-31 R-056. Q-25 R-050, Q-26 R-046, Q-27 R-047, Q-28 R-048, Q-29 R-049; R-051 no type assertions; R-052 slice 1 line-edits. Attempt 1 failed at review. Q-20 R-041, Q-21 R-042, Q-22 R-043, Q-23 R-044, Q-24 R-045. Q-13 to Q-19 ruled as R-034 to R-040; slices per R-040. Attempt 1 slice 1 on m/M-001-a1: 8c3660b, 45d6c7d. Order of work: R-033. Ruled: Q-1 R-022, Q-2 R-023, Q-3 R-024, Q-4 R-025, Q-7 R-032, Q-5 R-029, Q-6 R-028, Q-8 R-030, Q-11 R-031, Q-9 R-026, Q-10 R-027.
- Commits: slice 1: f643475 (oracle), f905f13 (consultation-journal)
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
