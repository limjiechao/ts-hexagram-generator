# MINUTES

An append-only record of the clerk's iterations (ADR-0040): one entry per
iteration of a Matter. Never edit past entries. If an entry was wrong, add a
correcting entry. Never record consultation content here (ADR-0015). This is
ephemeral-tier material: it may be cited by people, never by source code.

## Entry format

```markdown
### Iteration <n> — <M-NNN> — <YYYY-MM-DD HH:mm>

- Attempt: <a>/2 · Outcome: landed | awaiting-ruling | awaiting-ratification | blocked | withdrawn
- Spec audit: <n> holes · <Q-ids or none>
- Acceptance tests: written by tester at <sha> · red before implementation (y/n)
- Brief size (signal 7): <n> lines of required reading
- Review: APPROVE | REQUEST_CHANGES (<n> blocking) · design findings sent to owner: <Q-ids or none>
- Suggestions to the architect: <n> · batched for the owner (y/n)
- Verify: type:check · lint/format · build+test · drift signals 1–4 · stress:once <pass/fail/n.a.>
- Ratification lag (signal 5): Tier-A files touched <list or none>; each licensed by a prior ADR/Ruling (y/n)
- Owner touches: <n> (rulings <n> · ratifications <n> · test-list approvals <n>)
- Landed: <sha or –> · Budget used: <n of N Matters in phase> · Phase estimate: <Matters / weeks>
- Notes: <at most 2 lines>
```

## Iterations

### Iteration 0 — bootstrap — 2026-11-19 18:01

- Attempt: – · Outcome: baseline green
- Created branch `matters` at main `cf156b5` and worktree `../hexagram-wt-matters`.
- Verify: pnpm install · type:check · build · test: pass (25/25 turbo tasks; casting-ui 401 tests)
- Owner touches: 0
- Notes: M-001 picked; it cannot start because its Acceptance is _owner to set_ and its Free to choose is unratified.
  Both wait on the package-layout proposal (R-021). M-001 is now awaiting-ruling on Q-M-001-1 to Q-M-001-3.

### Iteration 1 — M-001 — 2026-11-19

- Attempt: 1/2 · Outcome: failed at review (slice 1 of the incision code, per R-040)
- Spec audit: deferred until the incision code is ratified (R-033)
- Acceptance tests: n.a. (R-033) · red before implementation: n.a.
- Brief size (signal 7): ~1,700 lines of required reading (implementer); ~240 for the revisions
- Review: `REQUEST_CHANGES` (3 blocking: a Cast Consultation's Divined At allows day-only; a casting.ts comment misstates the replay invariant; the Avoid term "question" in query.ts) · design findings sent to owner: Q-M-001-25 to Q-M-001-29
- Suggestions to the architect: 1 (lint the CompleteCasting cast to `oracle`) · batched for the owner (y)
- Verify: type:check pass · lint 0 errors, 3 new dot-notation warnings · build pass · unit tests 30/30 · drift signals n.a. (before M-002) · stress:once n.a.
- Ratification lag (signal 5): Tier-A files drafted for ratification under R-022 to R-045; none ratified yet
- Owner touches: 24 (rulings 24 · ratifications 0 · test-list approvals 0), R-022 to R-045
- Landed: – · Budget used: 0 of 3 Matters in Phase 1 · Phase estimate: unchanged
- Notes: also landed outside the loop on owner request: spike findings e6f2fbc, AGENTS.md fixes c554362 and c6a844c.
  Attempt 1 branch m/M-001-a1 (8c3660b, 45d6c7d, 5ef0926) is left for the owner to delete.

### Iteration 2 — M-001 — 2026-11-20

- Attempt: 2/2 · Outcome: slice 1 landed (M-001 continues with slice 2, per R-040)
- Spec audit: deferred until the incision code is ratified (R-033)
- Acceptance tests: n.a. (R-033) · red before implementation: n.a. (implementer's own guard tests were red first)
- Brief size (signal 7): ~1,500 lines of required reading (attempt 2); ~60 for the line-edit pass
- Review: `APPROVE` (0 blocking) · design findings sent to owner: Q-M-001-30, Q-M-001-31 (ruled R-055, R-056)
- Suggestions to the architect: 1 (a runtime brand symbol) · batched for the owner (y), answered by R-055
- Verify: type:check pass · lint 0 errors, no warnings in overhaul/ · format pass · build and test forced on matters 15/15 and 28/28 · unit tests 92/92 · drift signals n.a. · stress:once n.a.
- Ratification lag (signal 5): Tier-A files oracle and consultation-journal value types; ratified 2026-11-20 before landing (y); CONTEXT.md Polarity per R-054 (y)
- Owner touches: 12 this iteration (rulings 11 · ratifications 1 · test-list approvals 0); 36 in M-001 so far
- Landed: f643475, f905f13 · Budget used: 0 of 3 Matters in Phase 1 · Phase estimate: 3 Matters / 2 weeks
- Notes: slice 1 squashed per package on landing (R-049); attempt branches m/M-001-a1 and m/M-001-a2 are left for the owner to delete.

### Iteration 3 — M-001 — 2026-11-20

- Attempt: 1/2 (slice 2; attempts per slice, R-058) · Outcome: slice 2 landed
- Spec audit: deferred until the incision code is ratified (R-033)
- Acceptance tests: n.a. (R-033) · red before implementation: n.a. (guard and type-level tests were red first)
- Brief size (signal 7): ~1,600 lines of required reading per implementer; ~40 for the line-edit pass
- Review: `APPROVE` (0 blocking) · design findings sent to owner: Q-M-001-45 to Q-M-001-47 (ruled R-072 to R-074)
- Suggestions to the architect: 2 (narrow commentaries; a code-only assertion check) · batched for the owner (y)
- Verify: type:check pass · lint 0 errors, none in overhaul/ · format pass · build and test forced on matters 17/17 and 31/31 · drift signals n.a. · stress:once n.a.
- Ratification lag (signal 5): Tier-A files slice 2's types and three ports; ratified 2026-11-20 before landing (y)
- Owner touches: 19 this iteration (rulings 18 · ratifications 1 · test-list approvals 0); 55 in M-001 so far
- Landed: de26925, 146eaf5, c0e8a31, 4c7e1d4 · Budget used: 0 of 3 Matters in Phase 1 · Phase estimate: 3 Matters / 2 weeks
- Notes: slice 2 stopped at R-040's size limit, so Edition and the Scripture Catalogue port move to slice 3.
  The reading-preference.ts comment "all of the 十翼" was flagged to the owner as possibly read as all ten wings.
