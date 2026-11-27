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

### Iteration 4 — M-001 — 2026-11-20

- Attempt: 1/2 (slice 3; R-058) · Outcome: slice 3 landed
- Spec audit: deferred until the incision code is ratified (R-033)
- Acceptance tests: n.a. (R-033) · red before implementation: n.a. (type-level tests were red first)
- Brief size (signal 7): ~1,500 lines of required reading per implementer; ~60 for the line-edit pass
- Review: `APPROVE` (0 blocking) · design findings sent to owner: Q-M-001-54 to Q-M-001-56 (ruled R-083 to R-085)
- Suggestions to the architect: 1 (EditionIds for 十翼 Translations) · deferred to the bundled-catalogue Matter
- Verify: type:check pass · lint 0 errors, none in overhaul/ · format pass · build and test forced on matters 17/17 and 32/32 · drift signals n.a. · stress:once n.a.
- Ratification lag (signal 5): Tier-A files slice 3's types and the catalogue port; ratified before landing (y); R-084's form ruled R-086 before landing (y)
- Owner touches: 13 this iteration (rulings 12 · ratifications 1 · test-list approvals 0); 68 in M-001 so far
- Landed: e0996c3, 6b01b31 · Budget used: 0 of 3 Matters in Phase 1 · Phase estimate: 3 Matters / 2 weeks
- Notes: R-068's witness shape contradicted the glossary; the clerk had passed a drafter's proposal on unchecked. R-084 corrected it.
  Since then the clerk checks each drafted option against the glossary before putting it to the owner.

### Iteration 5 — M-001 — 2026-11-20

- Attempt: 1/2 (slice 4; R-058) · Outcome: failed at review
- Spec audit: deferred until the incision code is ratified (R-033)
- Acceptance tests: n.a. (R-033) · red before implementation: n.a. (the guard's own tests were red first)
- Brief size (signal 7): ~1,400 lines of required reading per implementer
- Review: `REQUEST_CHANGES` (1 blocking: `isCompleteCasting` accepts sparse arrays, because `every` skips empty slots; reproduced by the reviewer) · design findings sent to owner: Q-M-001-63 to Q-M-001-66
- Suggestions to the architect: 0
- Verify: type:check pass · lint none in overhaul/ · format pass · oracle tests 32/32 (they missed the defect) · drift signals n.a.
- Ratification lag (signal 5): none landed
- Owner touches: 6 this iteration (rulings 6); 74 in M-001 so far
- Landed: – · Budget used: 0 of 3 Matters in Phase 1 · Phase estimate: 3 Matters / 2 weeks
- Notes: attempt 2 of slice 4 is its last. Branch m/M-001-s4 (2083890, 7fecf66) is attempt 1.

### Iteration 6 — M-001 — 2026-11-20

- Attempt: 2/2 (slice 4; R-058) · Outcome: slice 4 landed
- Spec audit: deferred until the incision code is ratified (R-033)
- Acceptance tests: n.a. (R-033) · red before implementation: n.a. (guard and type-level tests were red first)
- Brief size (signal 7): ~900 lines of required reading (attempt 2); ~60 for each of three line-edit passes
- Review: `APPROVE` (0 blocking; the reviewer tried malformed inputs against the guard) · design findings sent to owner: Q-M-001-67 to Q-M-001-69, then Q-70 (withdrawn) and Q-71 (ruled R-101)
- Suggestions to the architect: 0
- Verify: type:check pass · lint none in overhaul/ · format pass · build and test forced on matters 17/17 and 32/32 · drift signals n.a. · stress:once n.a.
- Ratification lag (signal 5): Tier-A files oracle's casting.ts (R-101) and slice 4's division.ts and complete-casting.ts; ratified before landing (y)
- Owner touches: 12 this iteration (rulings 11 · ratifications 1 · test-list approvals 0); 86 in M-001 so far
- Landed: c27e0f7 · Budget used: 0 of 3 Matters in Phase 1 · Phase estimate: 3 Matters / 2 weeks
- Notes: R-101 replaced a refusal for an impossible partial Casting with a type that cannot hold one, amending R-053(1).

### Iteration 7 — M-001 — 2026-11-20

- Attempt: 1/2 (slice 5; R-058) · Outcome: slice 5 landed
- Spec audit: deferred until the incision code is ratified (R-033)
- Acceptance tests: n.a. (R-033) · red before implementation: n.a.
- Brief size (signal 7): ~1,500 lines of required reading (first implementer); ~40 for each later pass
- Review: `APPROVE` (0 blocking; the reviewer checked the built output for Oracle code in the PWA's subpaths) · design findings sent to owner: Q-M-001-79 (ruled R-112); Browse's matching and order left to the tester's spec audit
- Suggestions to the architect: 0
- Verify: type:check pass · lint none in overhaul/ · format pass · build and test forced on matters 17/17 and 32/32 · drift signals n.a. · stress:once n.a.
- Ratification lag (signal 5): Tier-A files slice 5's use-case signatures; ratified before landing (y)
- Owner touches: 10 this iteration (rulings 9 · ratifications 1 · test-list approvals 0); 96 in M-001 so far
- Landed: b6f0605 · Budget used: 0 of 3 Matters in Phase 1 · Phase estimate: 3 Matters / 2 weeks
- Notes: R-111 makes the port-passing style and article-free names cross-module conventions.

### Iteration 8 — M-001 — 2026-11-20

- Attempt: 1/2 (slice 6; R-058) · Outcome: slice 6 landed
- Spec audit: deferred until the incision code is ratified (R-033)
- Acceptance tests: n.a. (R-033) · red before implementation: n.a. (type-level tests were red first)
- Brief size (signal 7): ~1,300 lines of required reading (first implementer); ~40 for each later pass
- Review: `APPROVE` (0 blocking; the reviewer checked Open's built output for Oracle code) · design findings sent to owner: Q-M-001-80 to Q-M-001-83 (ruled R-113, R-114, R-116, R-117)
- Suggestions to the architect: 0
- Verify: type:check pass · lint none in overhaul/ · format pass · build and test forced on matters 17/17 and 32/32 · drift signals n.a. · stress:once n.a.
- Ratification lag (signal 5): Tier-A files slice 6's Resolution, Citation edit and use cases 3, 5; CONTEXT.md Passage Reference; ratified before landing (y)
- Owner touches: 6 this iteration (rulings 5 · ratifications 1 · test-list approvals 0); 102 in M-001 so far
- Landed: 6da7728, 5f45524, 1918732 · Budget used: 0 of 3 Matters in Phase 1 · Phase estimate: 3 Matters / 2 weeks
- Notes: R-113 amends ADR-0037's use case 5 (Open only loads) so the PWA can run it without the Oracle.

### Iteration 9 — M-001 — 2026-11-20

- Attempt: 1/2 (slice 7; R-058) · Outcome: failed at review
- Spec audit: deferred until the incision code is ratified (R-033)
- Acceptance tests: n.a. (R-033) · red before implementation: n.a.
- Brief size (signal 7): ~1,400 lines of required reading (first implementer); ~60 for the R-118 redraft
- Review: `REQUEST_CHANGES` (1 blocking: use case 7's return drops R-106's `unreadable` without a Ruling) · design findings sent to owner: Q-M-001-89, Q-M-001-90
- Suggestions to the architect: 0
- Verify: type:check pass · lint none in overhaul/ · format pass · overhaul tests 9/9 · built files for drawAutomaticPick and use cases 7, 9, 10 load no Oracle code
- Ratification lag (signal 5): none landed
- Owner touches: 5 this iteration (rulings 5); 107 in M-001 so far
- Landed: – · Budget used: 0 of 3 Matters in Phase 1 · Phase estimate: 3 Matters / 2 weeks
- Notes: the clerk used "readings" in R-118 and in messages; "reading" is an Avoid term, and the implementer rightly coined no type from it.

### Iteration 10 — M-001 — 2026-11-20

- Attempt: 2/2 (slice 7; R-058) · Outcome: slice 7 landed
- Spec audit: deferred until the incision code is ratified (R-033)
- Acceptance tests: n.a. (R-033) · red before implementation: n.a.
- Brief size (signal 7): ~250 lines of required reading (attempt 2); ~30 for the line-edit pass
- Review: `APPROVE` (0 blocking; the reviewer rebuilt and checked that no PWA subpath loads Oracle code)
- Suggestions to the architect: 0
- Verify: type:check pass · lint none in overhaul/ · format pass · build and test forced on matters 18/18 and 34/34 · drift signals n.a. · stress:once n.a.
- Ratification lag (signal 5): Tier-A files slice 7's policy package, Journal and use cases 7, 9, 10; ratified before landing (y)
- Owner touches: 5 this iteration (rulings 4 · ratifications 1 · test-list approvals 0); 112 in M-001 so far
- Landed: fbd18cb, 67e28b4, 02e48e3 · Budget used: 0 of 3 Matters in Phase 1 · Phase estimate: 3 Matters / 2 weeks
- Notes: all ten use cases are now drafted; R-118 and R-123 amend ADR-0037 and R-106 so the PWA runs 7, 9 and 10 without the Oracle.

### Iteration 11 — M-001 — 2026-11-20

- Attempt: 1/2 (slice 8; R-058) · Outcome: slice 8 landed; the incision code is complete
- Spec audit: next (R-033)
- Acceptance tests: next (R-033) · red before implementation: n.a.
- Brief size (signal 7): ~700 lines of required reading (first implementer); ~40 for the R-127 pass
- Review: `APPROVE` (0 blocking) · design findings sent to owner: Q-M-001-91, Q-M-001-92 (ruled R-127, R-128)
- Suggestions to the architect: 0
- Verify: type:check pass · lint: one accepted warning (R-128) · format pass · build and test forced on matters 18/18 and 36/36 · R-023's command exits 0, vacuously (no tests yet)
- Ratification lag (signal 5): Tier-A files cli-adapter's package; ratified before landing (y)
- Owner touches: 4 this iteration (rulings 3 · ratifications 1 · test-list approvals 0); 116 in M-001 so far
- Landed: d70ca10 · Budget used: 0 of 3 Matters in Phase 1 · Phase estimate: 3 Matters / 2 weeks
- Notes: across 8 slices, the incision code took 116 owner touches (108 Rulings, 8 ratifications) and 2 failed attempts (slices 1, 4, 7 each needed a second).

### Correction to Iteration 11 — 2026-11-20

- Its Notes say "2 failed attempts"; it was 3 (slices 1, 4 and 7 each failed attempt 1 and landed on attempt 2).

### Iteration 12 — M-001 — 2026-11-21

- Attempt: 1/2 (walking skeleton) · Outcome: landed; M-001 is complete
- Spec audit: 3 rounds; 7 holes (Q-M-001-93 to Q-M-001-99), ruled R-130 to R-136, plus the composeCli shape (R-137)
- Acceptance tests: written by tester at 77cd0a2 (14 tests) · red before implementation (y: 14/14 failed, composeCli missing)
- Brief size (signal 7): ~1,000 lines of required reading (tester); ~400 (implementer)
- Review: `APPROVE` (0 blocking) · design findings sent to owner: none
- Suggestions to the architect: 1 (whether `PortsSupplied` becomes a shared convention in Phase 4)
- Verify: type:check · lint 0 warnings in overhaul/ · format · build and test forced on matters 18/18 and 36/36 · R-023's command exits 0, 14/14 · drift signals n.a. (M-002 builds them) · stress:once n.a.
- Ratification lag (signal 5): no Tier-A file changed by the skeleton; tests approved before implementation (y)
- Owner touches: 9 this iteration (rulings 8 · ratifications 0 · test-list approvals 1); 125 in M-001
- Landed: 77cd0a2, d1dcaf6, 219b080 · Budget used: 1 of 3 Matters in Phase 1 · Phase estimate: 1 Matter / 2 days (actual)
- Notes: the first gate run on matters failed because the clerk had not run `pnpm install` after landing the tests' new dev dependency; installing fixed it.

### Phase 1 milestone — 2026-11-21

- Signal 6, cold-read variance: 3 fresh agents rebuilt Phase 1's theory from `overhaul/` alone. Low variance: all three
  recovered the purpose, package roles and direction, purity, ports owned by `application`, the Casting's tuple shapes,
  the brands and guards, Moment/Day, refusals as values, and the port-passing style, matching the library.
- Where the theory did not reach the code (all three readers, unless noted):
  1. `isCompleteCasting` mints the brand on shape alone, so any package can make a complete Casting; R-055's import lint
     (M-002) is not built yet. `keep-cast-consultation.ts:13` names only the Oracle as maker.
  2. `CastConsultation` repeats the Casting's Transformation (R-050) with no comment saying why.
  3. `scripture-catalogue` depends on `consultation-journal` only for `Day` (R-076) with no comment saying why.
  4. `Edition.script` is typed from `ReadingPreference['script']` (R-082(2)), so a catalogue fact depends on a reader's
     preference type (two readers).
  5. How a Day sorts against a Moment is unstated (one reader): a spec hole for Browse (use case 4), for its Matter.
- Budget: 1 of 3 Matters, 2 days of 2 weeks, 125 owner touches (115 Rulings, 9 ratifications, 1 test-list approval).
  Brief sizes: 250 to ~1,700 lines of required reading per agent.
- Owner decisions now open: caps (R-006), week budgets (R-009), how M-002 starts, the overseer idea, the findings above.

### Iteration 13 — M-002 — 2026-11-22

- Attempt: 1/2 (slice 1; R-058) · Outcome: slice 1 landed with M-002's acceptance material
- Spec audit: 3 rounds; 13 holes (Q-M-002-12 to Q-M-002-24), ruled R-158 to R-170
- Acceptance tests: written by tester at a16464e and 578f047 (52 plants, 13 twins, expected.ts); approved by the owner; red before implementation (y)
- Brief size (signal 7): ~800 lines of required reading (implementer); ~1,000 (tester)
- Review: `APPROVE` (0 blocking) · design findings sent to owner: Q-M-002-27, Q-M-002-28 (ruled R-173, R-174)
- Challenger: first run of ADR-0042's ratification by exception; contested 11 of 26 proposal items; 15 ratified in one digest (R-157)
- Suggestions to the architect: 2 (ESLint cache strategy, Tier C; B9's other dependency fields, ruled R-172)
- Verify: type:check · oxlint and uncached eslint · format · build and test forced on matters 18/18 and 36/36 · drift:prove for B1–B9 passes; unfiltered fails only on B10–B12, as planned
- Ratification lag (signal 5): Tier-A rules ruled before implementation (y); fixtures approved before implementation (y)
- Owner touches: 29 in M-002 so far (rulings 27 · digests 1 · test-list approvals 1), against a cap of 60 (R-138)
- Landed: 28cd0b3, a9e08a2, ef9ff26, b91166b, 207408f, 27113ea · Budget used: 0 of 2 Matters in Phase 2 · Phase estimate: 2 Matters / 1 week
- Notes: slice 1 is 445 lines, over R-157(14)'s 400, accepted whole by R-173.

### Iteration 14 — M-002 — 2026-11-22

- Attempt: 1/2 (slice 2; R-058) · Outcome: failed at review
- Acceptance tests: one plant added by R-174 (0d82f1f), red before implementation (y)
- Brief size (signal 7): ~600 lines of required reading (implementer)
- Review: `REQUEST_CHANGES` (2 blocking: B11 misses `accessor q!: T` against R-164; B10 and B11 skip `overhaul/` files outside the six packages, against R-051, R-057, R-151) · design findings sent to owner: none
- Verify: gates pass; drift:prove for B1–B11 passes; unfiltered fails only on B12, as planned
- Owner touches: 0 this iteration; 29 in M-002 so far
- Landed: – · Notes: both findings are rules doing less than their Rulings; attempt 2 fixes them without a new Ruling.

### Iteration 15 — M-002 — 2026-11-22

- Attempt: 2/2 (slice 2; R-058) · Outcome: slice 2 landed
- Review: `APPROVE` (0 blocking) · design findings sent to owner: Q-M-002-29, Q-M-002-30 (non-blocking)
- Verify: type:check · oxlint and uncached eslint · format · build and test forced on matters 18/18 and 36/36 · drift:prove for B1–B11 passes; unfiltered fails only on B12's four plants
- Owner touches: 0 this iteration; 29 in M-002 so far
- Landed: 4cdce11, 85a5667, d32ecc3 · Phase estimate: 2 Matters / 1 week
- Notes: replaying slice 2's commits over slice 1's folded commit conflicted in eslint.config.js; the clerk landed the reviewed branch's exact file contents instead (verified identical).

### Iteration 16 — M-002 — 2026-11-22

- Attempt: 1/2 (slice 3; R-058) · Outcome: slice 3 landed
- Review: `APPROVE` (0 blocking) · design finding sent to owner: Q-M-002-31 (B10 and oracle's `dist` path; non-blocking)
- Verify: type:check · oxlint and uncached eslint · format · lint:check · build and test forced on matters 18/18 and 36/36 · unfiltered drift:prove passes for B1–B12
- Owner touches: 0 this iteration; 31 in M-002 so far (R-175, R-176)
- Landed: 9e9f0a1, 7e3d477, 2152063, e17f002 · Phase estimate: 2 Matters / 1 week
- Notes: the clerk's review brief said comments never cite Rulings; the reviewer pointed out that the clerk prompt bans only plans, Matters, Minutes and reviews, and R-013 has code cite a Ruling until an ADR folds it in. The brief was wrong; the slice follows the written rule. The reviewer's tooling notes (`allowJs` against the inherited `isolatedDeclarations` in `tsconfig.overhaul-lint.json`, error TS5053 under plain `tsc`; a stale `eslint --cache` B12 result) are Tier B/C and do not affect lint:check; the first goes into slice 4 as a line-edit.

### Iteration 17 — M-002 — 2026-11-22

- Attempt: 2/2 (slice 4; R-058) · Outcome: stopped for the owner; both attempts sent back
- Review: attempt 1 `REQUEST CHANGES` (a string code export dropped silently, R-178, R-182; six non-blocking points, all fixed in attempt 2) · attempt 2 `REQUEST CHANGES` (a wildcard export whose string target has no code extension is skipped before the wildcard check, R-180, R-182)
- Verify: not run by the clerk; the implementer and both reviewers report gates, unfiltered drift:prove, lint:check and the real tree's four loads passing on the branch
- Owner touches: 46 in M-002 so far; Q-M-002-45 and Q-M-002-46 pending
- Landed: – · Notes: R-177 to R-191 ruled in this iteration. The tester's fixtures (3527a7e) are unchanged by both attempts. Both blocking findings are silent drops of an export that should be listed or fail.

### Iteration 18 — M-002 — 2026-11-22

- Attempt: 3/3 and 4/4 (slice 4; R-193, R-194 beyond R-058's two) · Outcome: slice 4 landed; M-002 landed
- Review: attempt 3 `REQUEST CHANGES` (its R-193 scope passed; an older silent drop: absolute-path and `file:` specifiers read as third-party, R-180, R-181) · attempt 4 `APPROVE` (the final review under R-194; four items recorded as stated limits)
- Verify: type:check · oxlint and uncached eslint · format · lint:check · build and test forced on matters 18/18 and 36/36 · unfiltered drift:prove passes for B1–B12 and the Oracle-subpath analysis · `drift:oracle-subpaths` lists exactly the four expected subpaths as loads
- Owner touches: 49 in M-002 of 60 (R-138)
- Landed: c3a61ff (the tester's fixtures), 59359ee (the analysis, squashing 7876ad0, ed38f3b, 07247f4, db27647) · Phase estimate: 2 Matters / 1 week
- Notes: every blocking finding in slice 4 was a silent "free" where the analysis should list or fail; each attempt fixed one and the next fresh review found another. R-194's cap ended the loop. Probe trees from the subagents are left in `$TMPDIR` (`s4p*`) and `/tmp/review*-s4*`, because their deletes were permission-denied; they hold only invented files.

### Iteration 19 — M-003 — 2026-11-22

- Attempt: 2/2 (slice 1; R-058) · Outcome: slice 1 landed
- Review: attempt 1 `REQUEST CHANGES` (comments cited the Matter and slice numbers, against R-217; behaviour sound over about 50 probes) · attempt 2 `APPROVE` · questions sent to owner: Q-M-003-31, Q-M-003-32 (non-blocking)
- Verify: type:check · oxlint and uncached eslint · format · lint:check · drift:check (80 files parsed, exit 0) · build and test forced on matters 18/18 and 36/36 · unfiltered drift:prove passes for B1–B12, the analysis, the scanner and `--only`
- Owner touches: 29 in M-003 so far (R-195 to R-223)
- Landed: 4591c81 (the tester's acceptance material), 49f55a0 (the scanner and drift:check, squashing f7465a1, 65b95cc, 1107ccc) · Phase estimate: 2 Matters / 1 week
- Notes: the proposal went to the owner only after the drafter revised it against the challenger, who contested 7 of 8 recommendations and found six factual errors. Slice 1's spec audit found 17 holes; grouping them by topic into 10 questions kept the round at 11 touches.

### Iteration 20 — M-003 — 2026-11-22

- Attempt: 2/2 (slice 2; R-058) · Outcome: slice 2 landed
- Review: attempt 1 `REQUEST CHANGES` (a test-name finding after a raw U+2028 or U+2029 reported one line early, R-225, R-230; patterns, overlaps, output and exits sound) · attempt 2 `APPROVE` · question sent to owner: Q-M-003-46 (non-blocking)
- Verify: type:check · oxlint and uncached eslint · format · lint:check · drift:check (80 files parsed, signal 4: 0 findings, exit 0) · build and test forced on matters 18/18 and 36/36 · unfiltered drift:prove passes for B1–B12, E1–E7, the analysis, the scanner and `--only`
- Owner touches: 45 in M-003 of 60 (R-195 to R-239)
- Landed: 78c5c79 (the tester's acceptance material), 3545cad (signal 4, squashing f63f43c, 173ee73, 9bafe64) · Phase estimate: 2 Matters / 1 week
- Notes: the clerk held the landing for Q-M-003-43 to -46, since the slice's size exceeded R-234 and the summary count was undecided. Before writing the plants, the tester checked an independent implementation of the ruled patterns against the expected list (57 lines, no difference).

### Iteration 21 — M-003 — 2026-11-23

- Attempt: 2/2 (slice 3; R-058) · Outcome: slice 3 landed; M-003 landed
- Review: attempt 1 `REQUEST CHANGES` (`import * as X` and `export * as X` declared no name, against R-245) · attempt 2 `APPROVE`
- Verify: type:check · oxlint and uncached eslint · format · lint:check · drift:check (80 files; signal 2: 0 findings, 55 forms, 70 unmarked; signal 4: 0) · build and test forced on matters 18/18 and 36/36 · unfiltered drift:prove passes for B1–B12, G1–G2, E1–E7, the analysis, the scanner and `--only`
- Owner touches: 55 of M-003's 60 (R-195 to R-249)
- Landed: d9a1c23, 42806c9 (the owner's Avoid marking, R-242); 6785d33 (acceptance material), 20cfacf (signal 2, squashing 2207bac, 7dea34f, d524ae9) · Phase estimate: 3 Matters / 1 week
- Notes: R-240 moved signal 1 into M-004 when M-003 reached 45 touches. The owner's ruling on slice 3's size read "Q-M-003-5: A"; the clerk recorded it as Q-M-003-55, the only open question, and says so in R-249. The owner should correct R-249 if that reading is wrong.

### Iteration 22 — M-004 — 2026-11-23

- Attempt: 1/2 (slice 1; R-058), plus R-257's follow-up · Outcome: slice 1 landed
- Review: attempt 1 `APPROVE` (no blocking findings) · the R-257 follow-up `APPROVE` · questions sent to owner: Q-M-004-7 to -10
- Verify: type:check · oxlint and uncached eslint · format · lint:check · drift:check (signal 1: 39 documents, 3 exceptions, `packages/` 7; signals 2 and 4: 0) · build and test forced on matters 18/18 and 36/36 · unfiltered drift:prove passes for B1–B12, D1, D2, D4, G1–G2, E1–E7, the analysis, the scanner and `--only`
- Owner touches: 10 of M-004's 60; R-250 raised Phase 2's budget to 3 Matters
- Landed: 50aeb4e (acceptance material and the exception seed, squashing e9cfe81, b88bf83), 865d55b (signal 1 paths, squashing 9304172, a38a5f7) · Phase estimate: 3 Matters / 1 week
- Notes: the first slice since M-002 to pass review on its first attempt. The tester proved the prover against a throwaway implementation with six planted faults before handing over.

### Iteration 23 — M-004 — 2026-11-24

- Attempt: 2/2 (slice 2; R-058) · Outcome: slice 2 landed
- Review: attempt 1 `REQUEST CHANGES` (the candidate pattern missed a hump in a name's first two letters, R-261) · attempt 2 `APPROVE`
- Verify: type:check · oxlint and uncached eslint · format · lint:check · drift:check (signal 1: 39 documents, 5 exceptions, `packages/` 7; signals 2 and 4: 0) · build and test forced on matters 18/18 and 36/36 · unfiltered drift:prove passes for all 25 codes, the analysis, the scanner and `--only`
- Owner touches: 17 of M-004's 60 (R-251 to R-267)
- Landed: 6863d41 (acceptance material, squashing cd0985f, 12873af, a4bb249, 2b1d12d), a09ce0b (D3, squashing a4b4864, 6991ce6) · Phase estimate: 3 Matters / 1 week
- Notes: the implementer found that the prover's own seed literals made the seeded names "present" under R-262 (ruled R-267). The clerk added a run-time proof that the presence walk never opens `consultations/`. One tester grep over the worktree did not exclude `consultations/` by name; the worktree has none, so nothing was read, and every later brief names the exclusion.

### Iteration 24 — M-004 — 2026-11-24

- Attempt: 1/2 (slice 3; R-058) · Outcome: slice 3 landed; M-004 landed
- Review: `APPROVE` (each of R-271's checks shown to fail with its wiring removed)
- Verify: type:check · oxlint and uncached eslint · format · lint:check · drift:check · `turbo run drift:check` (no cache hit) · build and test forced on matters 18/18 and 36/36 · unfiltered drift:prove passes for all 25 codes, the analysis, the scanner, `--only` and the landing wiring
- Owner touches: 21 of M-004's 60 (R-251 to R-271)
- Landed: 9bd3ac3 (acceptance material), 4882d35 (the wiring: turbo task, `check:all`, `check:affected`, CI, clerk Step 6)
- Notes: the tester found that R-206 alone would have run `drift:check` at no landing (R-268). The tester briefly applied the wiring itself to prove its checks could go green, then reverted it before committing; the implementer made the real edits.

### Phase 2 milestone — 2026-11-24

- Landed: M-002 (signal 3, the boundary rules), M-003 (the scanner, signals 2 and 4), M-004 (signal 1, and drift:check at every landing). Budget 3 Matters / 1 week (R-250); actual 3 Matters in 4 days.
- Owner touches: 49 + 55 + 21 = 125 across the three Matters, under the 60-per-Matter cap each (R-138); M-003 split at 45 (R-240).
- Review attempts: 10 slices; 4 passed first time; 5 took two attempts; M-002 slice 4 took four (R-193, R-194). Every blocking finding after M-002's first slices was a silent miss: something that should have been reported or should have failed, but passed.
- Size: slices ran at about 1.5 to 3 times their estimates, almost all in acceptance material; the owner accepted each overrun (R-191, R-238, R-249, R-259).
- Process: the challenger caught six factual errors and seven missed spec holes in M-003's proposal before the owner saw it; grouping spec holes by topic held each round to 5–12 touches.

### Landing — Phases 1 and 2 on main — 2026-11-25

- PR #56 (`matters` → `main`, opened by the clerk under R-272): CI passed on a4a2ba2 (`check` with Drift check, `test` on ubuntu and windows).
- GitHub refused the rebase merge ("This branch can't be rebased"), probably because the PR held 224 commits. The owner fast-forwarded `main` to a4a2ba2, the commit CI passed; GitHub marked #56 merged. Only the one-approving-review rule was bypassed, since an author cannot approve their own PR.
- An earlier direct push of `matters` to `main` (before R-272) was undone by the owner (force-push back to 74cc6db) so the landing could go through the PR.
- Notes: land later phases phase by phase or Matter by Matter, to stay under GitHub's rebase-merge limit; the one-review rule needs the owner's admin bypass or a rule change while the owner is the only maintainer.

### Phase 3 breakdown — 2026-11-25

- The owner asked for a drafter's breakdown of Phase 3 (Oracle core). A drafter wrote `docs/reviews/2026-11-25-phase-3-oracle-core.md` (a107166); a fresh challenger returned five blocking findings: an unratified `cli-adapter` dev dependency, ADR-0011's check order missed, a Pick-order choice placed in the wrong Matter, an error-policy choice left in a Free to choose, and Acceptance commands that could pass vacuously (a stub grep; `--passWithNoTests`). The drafter applied all ten findings after checking each (3ef5fcf); landed squashed as bf089b7.
- Rulings: PH3-1 to PH3-13 as R-273 to R-285, all (A); M-005 to M-009 ratified as drafted (R-286).
- Owner touches: 2 (the request and the ruling), counted against no Matter, since R-138's cap is per Matter.
- Notes: R-276 amends ADR-0011's check order for the overhaul; the clerk drafts the amendment for the owner's ratification before M-006 lands. Phase 4 needs a data decision, possibly a spike: the legacy data holds no 用九/用六 text, no 文言 and no 焦氏易林.

### Iteration 25 — M-005 — 2026-11-25

- Attempt: 1/2 (slice 1; R-058) · Outcome: slice 1 landed
- Tests: the first tester found two replay spec holes (R-287, R-288); a fresh tester wrote 36 tests, approved as R-289. The tester checked them against a throwaway reference: a version without the Pick check failed 12, one comparing only stalks failed 11.
- Review: `APPROVE` (probes: NaN stalks, a string Pick, 1e300, wrong stalks with right Remainders in Line 2)
- Verify: type:check · lint:check · format · drift:check (0) · build and test forced 18/18 and 36/36
- Brief size: implementer about 1,100 lines of required reading
- Owner touches: 3 of M-005's 60 (R-287 to R-289)
- Landed: 0daeaa6 (acceptance), a2dcf51 (`nextRound` and replay)
- Notes: the reviewer found that shapes the type forbids (R-101) are skipped or throw at run time; asked as Q-M-005-3. A recorded Round with extra keys replays; slice 2's `divide` should build the next Casting from rebuilt Rounds.

### Iteration 26 — M-005 — 2026-11-26

- Attempt: 1/2 (slice 2; R-058) · Outcome: slice 2 landed; M-005 landed
- Tests: the first tester found one hole (R-292, the next Casting's Rounds); a fresh tester wrote 87 tests (82 in `divide.test.ts`, 5 in `pick-division.test.ts`), approved as R-293. Checked against a throwaway reference and five wrong versions, each caught.
- Review: `APPROVE` (probes: extra keys on the Casting and on Rounds dropped, nothing shared with the input, NaN and ±Infinity at the first and eighteenth places, replay failing only in the open Line)
- Verify: type:check · lint:check · format · drift:check (0) · build and test forced 18/18 and 36/36 · M-005's Acceptance on matters
- Brief size: implementer about 1,200 lines of required reading
- Owner touches: 7 of M-005's 60 (R-287 to R-293)
- Landed: df2748b (acceptance), b7d8b28 (`divide`), 58dc1c0 (the `PartialCasting` comment), 3b8c18e (`composeCli`)
- Notes: slice 2's digest goes to the owner. The reviewer notes that M-006's `transcribe` will want `divide`'s inline "next Casting from the rebuilt Rounds" step pulled into a private helper.

### Landing — M-005 and ADR-0043 on main — 2026-11-26

- PR #57 (`matters` → `main`, 23 commits) passed CI and was merged by the owner with `gh pr merge --rebase --admin`. The rebase merge gave every commit a new SHA, and GitHub deleted the `matters` branch. The owner reset local `matters` onto `origin/main` (`reset --keep`) and carried R-300 over.
- SHAs on main for records written before the merge: 0daeaa6 → f67caf2, a2dcf51 → aca0100, df2748b → ed0f3e6, b7d8b28 → 151a7bc, 58dc1c0 → 9b24e1f, 3b8c18e → 326a588 (M-005); 0320eae → 523db2a (ADR-0043); bf089b7 → 8f23412 (the Phase 3 proposal). `MATTERS.md` now cites the main SHAs.
- Notes: a fast-forward of `main` to the CI-tested tip keeps SHAs and the branch (as for PR #56); the clerk asked the owner whether to make that a standing rule.

### Iteration 27 — M-006 — 2026-11-26

- Attempt: 1/2 (one slice; R-058) · Outcome: M-006 landed
- Tests: the first tester found one hole (R-295, R-296); ADR-0043 drafted and ratified with R-297 to R-299; a fresh tester wrote 184 tests (179 + 5), approved as R-300. Checked against a reference and four wrong versions (old order, no whole-number condition, incoming Rounds kept, Pick omitted), each caught. That tester's grep showed it about 15 lines of `divide`'s and `replay`'s bodies; it reported this, and the owner approved the list knowing it.
- Review: `APPROVE` (the refactor moves `divide`'s post-replay body unchanged; an exhaustive probe over 127,008 Transcriptions found every success equal to `divide` with the derived Pick, and no `valid-pick`)
- Verify: type:check · lint:check · format · drift:check (0) · build and test forced 18/18 and 36/36 · M-005's and M-006's Acceptance on matters
- Brief size: implementer about 1,200 lines of required reading
- Owner touches: 6 of M-006's 60 (R-295 to R-300)
- Landed: 72eeda2, 8fc9baa, 1352070, a513415, 4e16dd2
- Notes: a `null` Remainder, which the type forbids (R-290), is refused as `remainders` rather than `complete`. `DivisionRule`'s members still list `conservation` before `set-aside`; asked as Q-M-006-5.

### Iteration 28 — M-007 — 2026-11-26

- Attempt: 1/2 (one slice; R-058) · Outcome: M-007 landed
- Tests: the first tester found two holes (R-303, R-304) and had read the Oracle's `division.ts` bodies, so a fresh tester wrote 15 tests (10 + 5), approved as R-305; probabilities by exact enumeration with bigint fractions. Checked against a reference and four wrong versions, each caught. That tester read three short bodies (`drawAutomaticPick`, `composeCli`, 3 lines of `nextRound`), none of them `choosePick`.
- Implement: the implementer stopped on two questions (R-306: the widening broke 16 calls in approved tests; R-307: the type needs one throw). A fresh tester made the licensed stub change (4f7cf8c); 4f7cf8c does not type-check on its own, only with d7e3f2d.
- Review: `APPROVE` (`DivisionRule` reordered only; e957621's test names unchanged; probes of the draw mapping and each Pick's probability)
- Verify: type:check · lint:check · format · drift:check (0) · build and test forced 18/18 and 36/36 · M-007's Acceptance on matters
- Brief size: implementer about 900 lines of required reading
- Owner touches: 5 of M-007's 60 (R-303 to R-307)
- Landed: b669ace, 77c2238, 094ea54, 4f7cf8c, d7e3f2d
- Notes: the clerk found `format:check` red on `matters` (788e890 fixed it) after reading only the last line of oxfmt's output; exit codes are checked from now on. The clerk's tester brief did not ask whether a widening breaks existing calls; M-008's and M-009's briefs will.

### Landing — M-006 and M-007 on main — 2026-11-26

- PR #58 (22 commits) passed CI; the owner fast-forwarded `main` to f7aead9 under R-302. GitHub marked #58 merged, and every SHA stayed the same. GitHub deleted the remote `matters` branch again ("Automatically delete head branches"); local `matters` was untouched. The clerk offered the owner the setting change.

### Iteration 29 — M-008 — 2026-11-26

- Attempt: 1/2 (one slice; R-058) · Outcome: M-008 landed
- Tests: the first tester found three holes (R-309 to R-311); a fresh tester wrote 32 tests (17 keep, 12 record, 3 `composeCli`) and added stub Store and Clock ports to 17 older calls, approved together as R-312. Checked against a reference and seven wrong versions, each caught.
- Implement: `drift:prove` failed on the B9 twin fixture for `cli-adapter`, which no one had listed; a fresh tester made the licensed one-line edit (R-313), and R-314 makes listing the twin a standing rule.
- Review: `APPROVE` (200,000 random times matched an independent encoder; bad readings reject before any draw; port failures reject with the same error object; keep returns what it built)
- Verify: type:check · lint:check · format · drift:check · drift:prove · build and test forced 18/18 and 36/36 · M-008's Acceptance on matters
- Brief size: implementer about 1,300 lines of required reading
- Owner touches: 6 of M-008's 60 (R-309 to R-314)
- Landed: c28118e, 16e7a63, 32b6565, ceb136e, 2d8a35f, a731185
- Notes: the twin fixture landed directly after the arrow, so `drift:prove` passes at every commit.

### Iteration 30 — M-009 — 2026-11-26

- Attempt: 1/2 (slice 1 of 3; R-058) · Outcome: slice 1 landed
- Surface: a drafter drafted the table's public surface (R-282); the owner ratified it with five questions (R-315 to R-320).
- Tests: no holes; 140 tests, approved as R-322. A reference built from 邵雍's 8×8 square passed; five wrong tables (Trigrams swapped, wrong Nuclear lines, Inverse and Reversed swapped, bit order reversed, King Wen order) each failed.
- Review: `APPROVE` (an independent check by Trigram names found 0 mismatches in 64 rows; the eight symmetric Hexagrams and 泰/否 confirmed; `lookUpRow` total over fresh copies)
- Verify: type:check · lint:check · format · drift:check · drift:prove · build and test forced 18/18 and 36/36 · slice 1's Acceptance on matters
- Brief size: implementer about 800 lines of required reading
- Owner touches: 7 of M-009's 60 (R-315 to R-320, R-322)
- Landed: 7b787d9, f95c445, 5cb3ef1, d9bfb2f
- Notes: the table and rows are readonly by type only, not frozen.

### Iteration 31 — M-009 — 2026-11-26

- Attempt: 1/2 (slice 2 of 3; R-058) · Outcome: slice 2 landed
- Tests: no holes; 23 tests over all 4,096 Transformations, approved as R-323; five wrong versions each caught.
- Review: `APPROVE` (an independent bitmask `resolve` matched all 4,096 under deep strict equality, no extra keys; the All-Moving Statement in exactly 2 Transformations; the input never shared or changed)
- Verify: type:check · lint:check · format · drift:check · drift:prove · build and test forced 18/18 and 36/36 · slice 2's Acceptance on matters
- Brief size: implementer about 900 lines of required reading
- Owner touches: 9 of M-009's 60 (R-315 to R-320, R-322 to R-324)
- Landed: 51def64, c74eab4
- Notes: a Resolution shares the table's Trigram and Hexagram arrays, and the table is not frozen; asked as Q-M-009-6. The private helpers closely mirror the test's own; the reviewer's independent probe agrees with both.

### Iteration 32 — M-009 — 2026-11-26

- Attempt: 1/2 (slice 3 of 3; R-058) · Outcome: slice 3 landed; M-009 landed
- Tests: no holes reported, but the tester avoided one case (文言 for other Hexagrams) instead of raising it; the clerk asked it (R-326) and a fresh tester added one test. 18 tests (16 + 2), approved as R-327. That tester briefly placed reference files in `src/` and restored them; the clerk confirmed `src` unchanged.
- Review: `APPROVE` (an independent use case 3 over 4,096 Transformations × 5 Reading Preferences, 20,480 runs: 0 mismatches, 0 overlapping calls; a rejection at every call k stops after call k, 112 cases)
- Verify: type:check · lint:check · format · drift:check · drift:prove · build and test forced 18/18 and 36/36 · M-009's full Acceptance on matters
- Brief size: implementer about 1,200 lines of required reading
- Owner touches: 13 of M-009's 60 (R-315 to R-320, R-322 to R-328)
- Landed: 23f7164, 201492c, 9289882, 150091a, f6f3b42
- Notes: the remaining `application` stubs are use cases 4 to 7, 9 and 10, which R-273 places in Phase 4.

### Phase 3 milestone — 2026-11-26

- Landed on `matters`: M-005 (Pick Division), M-006 (Physical Division), M-007 (Automatic Division), M-008 (keep and record), M-009 (the Hexagram table, `resolve`, use case 3). ADR-0043 amended ADR-0011. `oracle` and `remainder-group-policy` hold no stubs.
- Budget 5 Matters / 3 weeks; actual 5 Matters in 2 days.
- Owner touches: 7 + 6 + 5 + 6 + 13 = 37, each under the 60-per-Matter cap (R-138); plus 2 for the breakdown.
- Briefs: implementer briefs ran about 800 to 1,300 lines, under the 1,500 cap.
- Review attempts: 10 slices, all approved on the first attempt; no retries. Spec holes came at the tester's audit (17 questions across the five Matters) rather than at review.
- Clerk slips: `format:check` red on `matters` for two commits (exit codes checked since); a tester brief that did not ask whether a widening breaks existing calls (R-306); an unlisted B9 twin fixture (R-314).
- Testers read code they should not have three times (Oracle bodies, pass-through bodies, `src/` swaps); each was reported, and the owner approved the lists knowing it.

### Phase 3 milestone — signal 6, cold-read variance — 2026-11-26

- Three fresh agents reconstructed Phase 3 from `overhaul/` and `eslint.boundary.js` alone, reading no Markdown. All three matched the ADRs and Rulings on the concepts, the Division steps and replay, the check order, ADR-0023's probabilities, the Consultation Id, the Resolution's order and the All-Moving Statement, use case 3's Commentaries and sequential calls, and the boundary table.
- Where the theory did not reach the code:
  1. Why the Transcription checks run in ADR-0043's order: all three inferred "local to global, most specific first"; none found ADR-0043's reason (under ADR-0011's order the Set-aside check could never fire). The code names ADR-0043 but not its reason.
  2. The PWA: comments in `casting.ts` and `complete-casting.ts` say the PWA makes a complete Casting with `isCompleteCasting` (R-031's trust function), while B10 lets only `oracle` import it. All three flagged the contradiction. B10 will need the PWA's arrow when Phase 6 builds it (R-055, R-175).
  3. `eslint.boundary.js`'s header still describes the legacy domain-to-CLI rule, and B4 labels two packages (two readers).
  4. 文言 is asked for at hexagram level only (R-061); one reader noted that 乾's and 坤's 文言 also comments line by line.
- Read as intended by all three: `isCompleteCasting` checks shape only and keep trusts it, because only the Oracle can mint one (R-031, R-055); the type, not a run-time check, keeps untyped data out (R-290).

### Phase 4-pre — the CLI manual ratified — 2026-11-26

- A drafter wrote `docs/manual/cli.md` from the glossary, the ADRs, the use cases and today's app (2880ea7). A challenger returned eight blocking findings, among them a wrong account of NO_COLOR and CI, use case 8 never offered, error and exit policy stated as settled, and Deletion Records' format undecided; the drafter applied all twenty (602aecc). The owner ruled 21 questions and DT-1 (R-331 to R-352); the drafter folded them (17a2240), and the manual went from 732 to 511 lines.
- The clerk mis-recorded CLI-2 as covering CI as well as NO_COLOR; the drafter caught it while folding, the owner confirmed the draft's own option (Q-R-332), and R-332 carries a clerk's note (6d61daa, 0e75111).
- Ratified as R-353 (6ae9a9a). One item stays open: the exit code when stdin closes in plain mode (R-350). Phase 4's entry gate is open.
- Owner touches: 4 (the request, the 22 answers in one reply, Q-R-332, the ratification), against no Matter.

### Landing — Phase 3 and the CLI manual on main — 2026-11-26

- PR #59 (43 commits: M-008, M-009, the ratified CLI manual, R-308 to R-353) passed CI; the owner fast-forwarded `main` to be8989a under R-302, keeping every SHA. Phases 1 to 3 and Phase 4's entry gate are now on `main`.

### Note — Acceptance commands and missing test files — 2026-11-26

- Phase 4's challenger found that `vitest run a.test.ts missing.test.ts` exits 0 when at least one listed file exists; only a list in which every file is missing fails. Phase 3's proposal had claimed otherwise. All 14 files named by M-005 to M-009's Acceptance commands exist, so no Phase 3 landing passed vacuously. Phase 4's Acceptance commands will start with `test -f` for each file.

### Phase 4 breakdown — 2026-11-26

- A drafter proposed twelve Matters from the ratified CLI manual (afa1b4c). A challenger returned nine blocking findings, among them a question that contradicted R-340, an ADR-0022/ADR-0030 conflict stated as settled, a false premise that the default Readout never needs 用九/用六, Acceptance commands that pass with a missing test file, hidden test seams in spawned commands, three drift plants a widened arrow would make legal, and Store work outside the port; the drafter applied all and dropped three answered questions (1981cf1, landed as 6e7b845).
- In parallel a drafter folded R-332 into ADR-0044 (25f83f9), ratified as R-384 (da85145).
- Rulings: PH4-1 to PH4-30 as R-354 to R-383, all (A); M-010 to M-021 ratified (R-385).
- Owner touches: 2 (the request, the ruling), against no Matter.
- Notes: M-011 waits for the owner's 用九 and 用六 text with its Witness (R-370). A Typst spike, which only the owner starts, precedes M-016 (R-376). ADR-0010 is consolidated with ADR-0011 and ADR-0043 before M-019 (R-384). The budget estimate of 5 to 10 weeks overruns the 8-week budget at its slow end.

### Fix — drift:prove red since the CLI manual landed — 2026-11-26

- R-352 removed the `docs/manual/cli.md` exception row, but `scripts/drift/prove-signal-1.ts` holds R-254's and R-265's seed word for word, so `drift:prove` failed from 0fdbbbd onward, on `main` too since PR #59. Neither CI's `check` job nor the clerk's Step 6 ran `drift:prove`; the clerk ran only `drift:check` when landing the manual.
- Fixed: the prover's seed drops the row (R-386), CI's `check` job runs `drift:prove` and the clerk's Step 6 names it (R-387). `drift:prove` exits 0 on `matters`.

### Landing — the drift:prove fix and Phase 4's breakdown on main — 2026-11-26

- PR #60 (11 commits) passed CI, the first landing whose `check` job ran `drift:prove`; the owner fast-forwarded `main` to 8dca492 under R-302. `drift:prove` is green on `main` again.

### Iteration 33 — M-010 — 2026-11-26

- Attempt: 1/2 (slice 1 of 2; R-058) · Outcome: slice 1 landed
- Surface: a drafter drafted `node-effects` and the command entry point; the owner ratified it with four questions, changing the streams to structural interfaces (R-388 to R-392).
- Tests: the first tester found three holes (R-393 to R-395); a fresh tester wrote the tests and the R-314 fixtures (two twins, three plants replaced, one plant re-described), approved as R-396.
- Review: `APPROVE` (B10 still forbids `isCompleteCasting` in `cli-adapter`; the Clock agreed with `Intl` in all 418 IANA zones; `randomInt` edge bounds and a chi-square over 10⁶ draws looked uniform)
- Verify: type:check · lint:check · format · drift:check · drift:prove · build and test forced 19/19 and 38/38 · slice 1's Acceptance on matters
- Brief size: implementer about 900 lines of required reading
- Owner touches: 9 of M-010's 60 (R-388 to R-396)
- Landed: a51a550, 10b8315, 4f912ed, e01b8c2, 5bdad2c, 9ca03c5
- Notes: commits a51a550 to 4f912ed fail eslint's B9 on their own, until e01b8c2 adds the boundary row. Each later package's Matter adds its own arrow to `cli-adapter`'s row and twin, under R-314 and R-358.

### Iteration 34 — M-010 — 2026-11-27

- Attempt: 1/2 (slice 2 of 2; R-058) · Outcome: landed; M-010 complete
- Surface: the five usage lines, the not-built lines and the bins drafted for ratification; twelve frame questions ruled (R-397 to R-412).
- Tests: the tester's list approved (R-413, R-414); after review, rows for R-415 and R-416 (six red), then rows for R-420.
- Review: `APPROVE` (about 95 argv lists fuzzed; B10 still holds); it raised dashed separate values (R-415). Re-review of the fix: `APPROVE` (31 argv lists compared before and after; behaviour changes only where R-415 asks); it raised an import path starting with `-` (R-420).
- Verify: M-010's Acceptance on matters · type:check · lint:check · format · drift:check · drift:prove · build and test forced 19/19 and 38/38 · test:stress:once
- Owner touches: 24 more (R-397 to R-418, R-420, R-421), 33 of M-010's 60
- Landed: 1209045, 516f137, d1074ee, d081007, 6942249, 1d605eb, 0d3e634, 53536ee, 498f563, 4b54dbf, da6292d
- Notes: R-421's doc-comment phrase was set into the list in a second commit (da6292d) to drop a doubled "or"; the words are R-421's. `journal-folder.ts` has no test and `journalFolder()` runs on refusal paths; noted for M-021.

### Landing — M-010, the delegate and clerk landings on main — 2026-11-27

- PR #61 (M-010; R-419 to R-442) first failed CI on Windows only: POSIX `TZ` strings are ignored there, so four clock rows read `+00:00`. The delegate ruled the POSIX rows skip on Windows (R-442); with that fix every leg passed, and the owner fast-forwarded `main` to 559944f (R-302), the clerk's own push being refused by Claude Code's permissions.
- First landing to list delegate rulings for review (R-426 to R-442).

### Iteration 35 — M-012 — 2026-11-27

- Attempt: 1/2 (slice 1 of 3; R-058) · Outcome: slice 1 landed
- Surface: a drafter drafted the record codec, the Unreadable reasons and `store-markdown`'s builder; the delegate ruled its 16 questions (R-426 to R-441), the first batch under R-423.
- Tests: the tester's audit found six holes, ruled with the list and amendments (R-443 to R-450); the implementer found one row contradicting the library (`query: 'junk'` is a valid Query), fixed by R-451.
- Review: `APPROVE` (20,000 round trips over every offset and years 0000 to 9999; 100,000 junk inputs never threw)
- Verify: type:check · lint:check · format · drift:check · drift:prove · slice 1's tests · build and test forced 20/20 and 40/40, on matters
- Owner touches: 1 (Q-ORD-1, R-422); delegate rulings: 27 (R-426 to R-452, with R-442 for M-010)
- Landed: af096d7, bb3b305, dda6b7c, 09f5cd0, f0d3dfd, bd3442e, 2f16b92, 4b12642, 6c44e03
- Notes: lint fails on bb3b305 to 09f5cd0 alone until f0d3dfd adds the boundary row, as with M-010's slice 1.

### Iteration 36 — M-012 — 2026-11-27

- Attempt: 1/2 (slice 2 of 3; R-058) · Outcome: slice 2 landed
- Tests: the tester derived the version-2 frontmatter fixtures from the legacy writer's bytes and wrote 82 tests, checked against a throwaway reference Store and five deliberate breaks; the delegate ratified the fixtures and ruled ten holes (R-453 to R-468); 93 tests by the end.
- Review: `CHANGES` (non-UTF-8 frontmatter silently repaired and rewritten), ruled R-469 to R-474 with ADR-0030's wording amended; the drafter's in-place edit was redone as ADR-0045 under the owner's R-004 convention (R-475). Re-review `APPROVE` with two questions (R-476, R-477) and a digest (R-478); a brief re-review of the last fixes `APPROVE`.
- Verify: type:check · lint:check · format · drift:check · drift:prove · slice 2's Acceptance · build and test forced 20/20 and 40/40 · test:stress:once, on the slice branch, whose tree matches matters
- Owner touches: 0; delegate rulings: 26 (R-453 to R-478)
- Landed: ea4ffd6 to b7b89c9 (18 commits; the in-place ADR-0030 edit and its revert were not carried)
- Notes: a known, untested Windows gap: a file another process holds open when deleted may read as EPERM, so `list` rejects until it is released (R-477); the race test now runs on windows-latest and the next landing's CI will show it. ADR-0030 and ADR-0045 are consolidated before M-015.

### Note — the Windows listing race, observed — 2026-11-27

- PR #62's first Windows run timed out (30 s) on the listing race row R-477 put back on Windows. Under R-481 it ran 2 × 50 with 120 s; on the re-run it resolved, in 6.8 s and 9.6 s across its two passes, with no EPERM. So Windows file operations were slow, not hung, and R-477's EPERM gap did not show in CI. Every leg of PR #62 passed at b34bbbb.

### Landing — M-012 slices 1 and 2 on main — 2026-11-27

- PR #62 (the record codec, the Markdown Store, ADR-0045, R-443 to R-481) passed every leg at b34bbbb after R-481's smaller Windows run; the owner fast-forwarded `main` to b34bbbb (R-302).

### Iteration 37 — M-012 — 2026-11-27

- Attempt: 1/2 (slice 3 of 3; R-058) · Outcome: landed; M-012 complete
- Tests: the tester's audit found R-378's order cyclic across offsets; the delegate referred it and the owner ruled local date first (R-482, manual §4 amended); ties and filter holes ruled (R-479, R-480); 46 tests approved (R-483).
- Review: `APPROVE` (20,000 random Journals against an independent R-482 oracle); follow-ups ruled: a public `localDate` later (R-484), `lint:check` without ESLint's cache (R-485), digest (R-486).
- Verify: M-012's whole Acceptance · type:check · lint:check (uncached) · format · drift:check · drift:prove · build and test forced 20/20 and 40/40, on matters
- Owner touches: 1 (R-482); delegate rulings: 8 (R-479 to R-481, R-483 to R-486)
- Landed: e2dd152, 460fab7, a498b3a, 2053072, 3173c59
- Notes: M-012 used 2 owner touches in all (R-422, R-482) against 60, and 61 delegate rulings (R-426 to R-486, less R-482).

### Follow-ups — ADR-0046 and `localDate` — 2026-11-27

- While Q-ORD-2 waits for the owner, the delegate started three follow-ups (R-487).
- ADR-0030 and ADR-0045 are consolidated into ADR-0046 (3cc8ec8), ratified by the delegate (R-489); 48 live citations moved to ADR-0046 (9aab7a9, 04fc8f3); history kept as written.
- `localDate(divinedAt): Day` in `consultation-journal/divined-at`: surface ratified (R-488), 27 direct rows approved (R-490), built and adopted by the record codec and browse with no behaviour change (fuzzed: 314,488 codec cases, 3,000 browse lists, 220,019 offset strings); review `APPROVE`, items ruled (R-491). Landed: the drafted surface, the tests, fbcaa2d's build with its B11 fix, the two switch-overs and a comment (7 commits ending c12776c).
- ADR-0047 (the delegate, amending ADR-0042) drafted, challenged and revised; it waits for the owner with Q-0047-1 to -3.
- Verify: type:check · lint:check · format · drift:check · drift:prove · build and test forced 20/20 and 40/40, on matters.
- Owner touches: 0; delegate rulings: 5 (R-487 to R-491).

### Landing — M-012 complete on main — 2026-11-27

- PR #63 (M-012 slice 3, R-479 to R-486) passed every leg at e1efd95; the owner fast-forwarded `main` to e1efd95, which under ADR-0047 is the owner's word to land its delegate rulings.

### Iteration 38 — M-015 — 2026-11-27

- Attempt: 1/2 (slice 1 of 3; R-058) · Outcome: slice 1 landed
- Surface: a drafter drafted the Deletion Record file, the Journal bundle codec, `legacy-import`, `composeCli`'s widening and the reports' wording; the delegate ruled 25 questions (R-494) and referred Q-M-015-24 (the real Store in the bins) to the owner.
- Tests: 37 approved with two added (R-495); after review, strict UTF-8, a symlinked record and direct codec rows (R-496).
- Review: `APPROVE` by reading (the reviewer's probe was refused permission to run); the follow-up fixes re-reviewed `APPROVE`.
- Verify: type:check · lint:check · format · drift:check · drift:prove · slice 1's tests · build and test forced 21/21 and 42/42, on matters
- Owner touches: 2 (R-492, R-493); delegate rulings: 3 (R-494 to R-496)
- Landed: 652c9ab to e7abc01 (17 commits)

### Iteration 39 — M-015 — 2026-11-27

- Attempt: 1/2 (slice 2 of 3; R-058) · Outcome: slice 2 landed
- Tests: the tester derived the bundle's byte fixtures and wrote 83 tests; the delegate ratified the fixtures, ruled six holes (duplicate Deletion Records: one per Id in the bundle, the earliest) and added 14 rows (R-497, 97 tests). Building the options broke ten approved frame rows, which a tester rewrote (R-498, R-499).
- Review: `APPROVE` by reading (its fuzz script was refused permission to run); the cleanup question ruled R-500 (a failed temporary-file cleanup never changes a write's outcome, in export and in the Store); re-review of the fixes `APPROVE`.
- Verify: type:check · lint:check · format · drift:check · drift:prove · build and test forced 21/21 and 42/42, on matters
- Owner touches: 0; delegate rulings: 4 (R-497 to R-500)
- Landed: 4241621 to 712cdbf (17 commits)
- Notes for a bisect: `frame.test.ts` fails from cf2baeb to 65de4ec's parent until 209f1ef rewrites its rows; `lint:check` fails from fc19262 to ed59a4f until 712cdbf.

### Iteration 40 — M-015 — 2026-11-27

- Attempt: 1/2 (slice 3 of 3; R-058) · Outcome: landed; M-015 complete
- Tests: the tester's audit raised nine holes (R-502), and two follow-ups (R-503); 118 slice tests, 14 rewritten frame rows, later 7 rows and 14 `fileIdentity` rows (R-504).
- Review: `CHANGES` — an unreadable file named twice was counted twice; ruled R-504 with the ino-0 fallback, the redraw-loop note and CRLF kept skipped (flagged for the owner); re-review `APPROVE`. The reviewer matched the parser against the legacy converter over 22 fixtures and fuzzed 200,000 inputs.
- Verify: M-015's whole Acceptance · type:check · lint:check · format · drift:check · drift:prove · build and test forced 21/21 and 42/42, on matters
- Owner touches: 1 (R-501); delegate rulings: 3 (R-502 to R-504)
- Landed: 7ede742 to 658d50b (19 commits)
- Notes: M-015 used 3 owner touches in all (R-492, R-493, R-501) and 11 delegate rulings (R-494 to R-504). The bins still use a stub Store; nothing can touch the real Journal until the owner rules Q-M-015-24.

### Landing — ADR-0046, localDate, ADR-0047 and M-015 slice 1 on main — 2026-11-27

- PR #64 passed every leg at 627dbec. On the owner's "land" (ADR-0047), the clerk fast-forwarded `main` to 627dbec, its first landing by the clerk's own push (R-425).

### Landing — M-015 complete on main — 2026-11-27

- PR #65 (M-015 slices 2 and 3, R-497 to R-504) passed every leg at 2dcb7ae; on the owner's "land" the clerk fast-forwarded `main` to 2dcb7ae.

### Follow-up — legacy files with Windows line endings (R-506) — 2026-11-27

- The owner overturned R-504 Q-53 (R-506). A tester rewrote the two CRLF rows and added parser rows, amended by the delegate (R-507); `legacy-import` now reads `\r\n` as `\n` before parsing a legacy `.txt` or version-1 `.md` (31bee88); version-2 strictness (R-460) is untouched. Review `APPROVE`.
- Verify: type:check · lint:check · format (after R-508) · drift:check · drift:prove · test forced 42/42, on matters.
- Landed: 9694b1a, 31bee88, 10ba156.
- The owner's 用九 and 用六 file landed as left (d94ff35); the formatter now ignores `docs/source-texts/` (R-508). Four points in it were raised with the owner before M-011's data slice.

### Iteration 41 — M-011 — 2026-11-27

- Attempt: 1/2 (slice 1 of 3; R-058) · Outcome: slice 1 landed
- The owner supplied the 用九 and 用六 texts (d94ff35) and corrected them (R-509, R-511: the Wilhelm–Baynes 坤 小象 replaced; typography made consistent with each Edition; the ctext retrieval date 2026-11-27).
- Surface: a drafter drafted the widened Catalogue port, use case 8, `catalogue-bundled` and its data format; the delegate ruled 13 questions (R-510) and referred five, which the owner ruled (R-511, R-512: `Edition` gains `shortName` and `title`, amending R-373; a `terms-unverified` licence; the Witness wording; the EPUB is 1967).
- Tests: R-306 stubs and Edition literals, the boundary row and twins, nine use-case-8 tests and two type tests, approved (R-513).
- Review: `APPROVE`.
- Verify: type:check · lint:check · format · drift:check · drift:prove · build and test forced 22/22 and 43/43, on matters
- Owner touches: 4 (the passages, R-509, R-511, R-512); delegate rulings: 2 (R-510, R-513)
- Landed: 94ce7f7 bdc0496 e5e2963 d409341 ea5ab93 8c24af0 06ad3f0 15e9879 c4e3954 ec7380e 6addfd2 65bbede

### Iteration 42 — M-011 — 2026-11-27

- Attempt: 1/2 (slice 2 of 3; R-058) · Outcome: slice 2 landed
- Tests: 76 data tests (passages per Edition and Work, the owner's 用九/用六 byte for byte, the ruled Edition records, names, Received Sequence Numbers), amended (R-514: `language` `en`; the records as literals), then six preference rows (R-516, R-517).
- Build: a throwaway script generated the four Editions' data (about 590 KB) from the legacy JSON and the owner's file; nothing typed by hand. Drift signal 2 flagged 19 glossary _Avoid_ words inside the Legge and Wilhelm–Baynes texts; the owner ruled it skips the bundled scripture folder only (R-515), with a prover fixture.
- Review: `APPROVE` — the reviewer re-derived every text, name and number with its own script: zero differences.
- Verify: type:check · lint:check · format · drift:check · drift:prove · build and test forced 22/22 and 43/43, on matters
- Owner touches: 1 (R-515); delegate rulings: 4 (R-514, R-516, R-517, and the referral of Q-20)
- Landed: the slice's 8 commits ending 5b2dec5

### Iteration 43 — M-011 — 2026-11-27

- Attempt: 1/2 (slice 3 of 3; R-058) · Outcome: landed; M-011 complete
- Tests: `cli-adapter` reaches `catalogue-bundled` (R-358); ten tests resolve through `composeCli` with the real Catalogue (all-moving 乾 and 坤 with the owner's 用九 and 用六, 屯 with no Moving Line, names, Received Sequence Numbers, the Licence Gate), approved (R-518); a test that the bins get the bundled Catalogue.
- Build: `composeCli` offers the two new lookups; the bins get the real Catalogue while the Store stays stubbed (R-518, R-505).
- Review: `APPROVE`.
- Verify: M-011's whole Acceptance · type:check · lint:check · format · drift:check · drift:prove · build and test forced 22/22 and 44/44, on matters
- Owner touches: 0; delegate rulings: 1 (R-518)
- Landed: the slice's 5 commits ending 4823bab
- Notes: M-011 used 5 owner touches in all (the passages, R-509, R-511, R-512, R-515) and 7 delegate rulings (R-510, R-513, R-514, R-516 to R-518, and the Q-20 referral). M-013 (the Readout) is next; it connects the real Store (R-505).
