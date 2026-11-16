# MATTERS

The live tracker of implementation work (ADR-0036). Each vertical slice of work
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

The overhaul grows serially (ADR-0036). The owner sets each phase's budget
**before the phase starts**. Exceeding a budget is a Tier-A event: the clerk
stops and asks.

| Phase | Scope                                           | Budget (Matters / weeks) | Status                      |
| ----- | ----------------------------------------------- | ------------------------ | --------------------------- |
| 1     | Walking skeleton and incision code              | 3 Matters / 2 weeks      | pending                     |
| 2     | Drift-signal tooling (signals 1–4)              | 2 Matters / 1 week       | pending                     |
| 3     | Oracle core                                     | 5 Matters / 3 weeks      | not yet broken into Matters |
| 4     | CLI at parity with today's app, on the new core | 12 Matters / 8 weeks     | not yet broken into Matters |
| 5     | REST engine (ADR-0038)                          | 6 Matters / 4 weeks      | not yet broken into Matters |
| 6     | PWA (ADR-0037)                                  | 10 Matters / 8 weeks     | not yet broken into Matters |

Phases 3–6 are broken into Matters by the owner, with the copilot, when
the previous phase lands.

## Entry format

```markdown
### M-NNN: <title>

- Status: pending | in-progress | awaiting-ruling | awaiting-ratification | landed | withdrawn
- Phase: <n>
- Licensed by: <ADRs, glossary terms, Rulings this Matter implements>
- Scope: <the vertical slice, in one or two sentences>
- Tier-A surface: <public types, ports or files this Matter may NOT change; or "drafts Tier-A files for ratification">
- Acceptance tests: <path, written by the tester before implementation>
- Open questions: <Q-ids awaiting a Ruling, or none>
- Commits: <SHAs on the integration branch>
- Notes: <at most 3 lines>
```

## Matters

### M-001: Draft the incision code for ratification

- Status: pending
- Phase: 1
- Licensed by: ADR-0036 (the incision code); CONTEXT.md; ADRs 0023–0027, 0030, 0037, 0038
- Scope: Draft the core value types (Transformation, Hexagram, Figure, Line Value, Pick, Round, Casting, …), the four driven-port signatures and the ten use-case signatures, plus a walking skeleton that runs end to end (one use case from a driving adapter, through the application, to a stub driven adapter).
- Tier-A surface: drafts Tier-A files for ratification. The owner line-edits and ratifies them before anything builds on them.
- Acceptance tests: the skeleton runs; type-check passes.
- Open questions: none
- Commits: –
- Notes: Where the drafts live (package layout) is itself Tier A. The first step is to propose it to the owner.

### M-002: Build drift signals 1–4

- Status: pending
- Phase: 2
- Licensed by: ADR-0036 (drift signals)
- Scope: Scripts or lint rules for doc truth, glossary conformance, boundaries (build-failing) and ephemeral-ID leakage, run on every landing.
- Tier-A surface: the boundary rules encode Tier-A dependency decisions. Propose them to the owner before enforcing them.
- Acceptance tests: each signal fails on a planted violation and passes on the clean tree.
- Open questions: none
- Commits: –
- Notes: –
