# bugs-loop progress log

Append-only progress log for the `BUGS-ORCHESTRATOR.md` fix loop: one entry per iteration (template in §6). Never edit past entries.

## Environment deviations from BUGS-ORCHESTRATOR.md

The owner's global Claude Code settings deny `git switch`, `git checkout`, `git worktree remove` and `rm -r*`. The loop therefore runs as follows:

- **Integration branch.** `bugs-loop` was created with `git branch bugs-loop main` and is checked out in its own worktree, `../hexagram-wt-bugs-loop`. All landing (cherry-picks) and record commits happen there; the main checkout stays on `main`.
- **Red-test verification.** Instead of `git checkout <test-sha>`, the test-only commit is checked out in a detached worktree, `git worktree add --detach ../hexagram-wt-<ID>-red <test-sha>`.
- **Cleanup.** Worktrees are left in place, like the `bug/*` branches, and are listed in the final summary for the human to remove.

## Log

### Iteration 0 — baseline — 2026-11-05 12:51
- Attempt: – · Outcome: baseline green
- Branch: bugs-loop · Landed: 4968ce0
- Verify: install pass · type:check pass · build pass · test pass (25/25 tasks; Turborepo full cache hit on identical inputs)
- Notes: bugs-loop created from main d55fa65. Loop runs with the worktree deviations listed above.

### Iteration 1 — BUG-001 — 2026-11-05 12:52
- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-001-a1 · Landed: 206b257
- Red test: cli/shell/tests/hexagram-app.test.tsx::saves a playground consultation under consultationsDir — failed as expected (y)
- Review: APPROVE (0 blocking; nits: move mockClear to beforeEach, wrap test-commit body)
- Verify: focused pass · type:check pass · lint pass / format pass on touched files (repo-wide format:check pre-red, see BUG-018) · full build+test pass · stress:once pass
- Notes: Found BUG-018 (format:check red on main via 13 Markdown files). Red-check gotcha: bare `vitest run` needs FORCE_COLOR=1.

### Iteration 2 — BUG-002 — 2026-11-05 09:33
- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-002-a1 · Landed: 1659c95
- Red test: domain/consultation-file/tests/file.test.ts::keeps both consultations at distinct paths — failed as expected (y)
- Review: APPROVE (0 blocking; nits: drop bug ID from doc comment, cap 100 is generous)
- Verify: focused pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once n.a.
- Notes: –

### Iteration 3 — BUG-003 — 2026-11-05 09:37
- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-003-a1 · Landed: 44c26f8
- Red test: apps/cli/tests/migrate-legacy.test.ts::renders a null-casting body with its castingAbsence reason — failed as expected (y)
- Review: APPROVE (0 blocking; nits: use envelope.casting not literal null; lint import belonged in test commit)
- Verify: focused pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once n.a.
- Notes: Implementer amended its unpushed test commit despite the global `git commit --amend` deny; harmless, but briefs now forbid amend explicitly.

### Iteration 4 — BUG-004 — 2026-11-05 09:42
- Attempt: 1/2 · Outcome: fixed (atomic-write half; API-bypass half left deferred per entry Notes)
- Branch: bug/BUG-004-a1 · Landed: 5dcad65
- Red test: cli/history-ui/tests/history-app.test.tsx::leaves the canonical file intact and no temp file when the rewrite crashes mid-write — failed as expected (y)
- Review: APPROVE (0 blocking; nits: tmp-cleanup assertion beyond entry scope; concurrent rewrites last-rename-wins, same as before)
- Verify: focused pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once pass
- Notes: Picked despite "defer?" in Notes because only the API half was deferred and §5 does not list BUG-004.

### Iteration 5 — BUG-006 — 2026-11-05 09:46
- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-006-a1 · Landed: 301e453
- Red test: cli/history-ui/tests/history-scan.test.ts::sorts newest-first by instant across UTC offsets — failed as expected (y)
- Review: APPROVE (0 blocking)
- Verify: focused pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once pass
- Notes: BUG-005 skipped at pick (needs-human / defer?), held for the escalation batch.

### Iteration 6 — BUG-007 — 2026-11-05 09:51
- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-007-a1 · Landed: 10f5878
- Red test: domain/consultation-file/tests/casting-replay-validation.test.ts::reports `casting-unreplayable` when a stored recordedMax disagrees with the replay — failed as expected (y)
- Review: APPROVE (0 blocking; reviewer traced all recordedMax writers: random, interactive, viewer-flow/manual, sample-casting, legacy converter)
- Verify: focused (consultation-file + text-grid) pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once n.a.
- Notes: The private-data corpus sweep tests skip without consultations/legacy; only the owner can run them against real files.

### Iteration 7 — BUG-008 — 2026-11-05 09:56
- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-008-a1 · Landed: da42eed
- Red test: domain/core/tests/manual-validation.test.ts (9 new cases) — failed as expected (y)
- Review: APPROVE (0 blocking; nit: zero-remainder name/copy no longer fits rem>4, unreachable)
- Verify: focused (core + casting-ui) pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once n.a. (domain only)
- Notes: Scoped to domain/core; no casting-ui change was needed.

### Iteration 8 — BUG-011 — 2026-11-05 10:03
- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-011-a1 · Landed: bc811a4
- Red test: apps/cli/tests/migrate-legacy.test.ts::skips a .txt whose target .md already exists, leaving both untouched — failed as expected (y)
- Review: APPROVE (0 blocking)
- Verify: focused pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once n.a.
- Notes: BUG-009 (defer?) and BUG-010 (needs-human) skipped at pick, held for escalation.

### Iteration 9 — BUG-012 — 2026-11-05 10:06
- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-012-a1 · Landed: a773913
- Red test: n.a. (type-only); lock test domain/core/tests/perform-cast.test.ts::a heap that is a multiple of four sets aside its last full group of 4 — green before and after (y)
- Review: APPROVE (0 blocking; nit: could assert per-heap remainder length)
- Verify: focused pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once n.a.
- Notes: Filed DOC-022: `pnpm --filter @hexagram/core test -- --exclude …` runs all 10 files (pnpm forwards the literal --).

### Iteration 10 — BUG-013 — 2026-11-05 10:10
- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-013-a1 · Landed: 1766cdf
- Red test: n.a. (type-only; tsc errored with casts removed and state un-retyped) (y)
- Review: APPROVE (0 blocking, no nits)
- Verify: focused pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once pass
- Notes: –

### Iteration 11 — BUG-014 — 2026-11-05 10:13
- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-014-a1 · Landed: 9ef9fcc
- Red test: n.a. (test-only; Verify: casting-ui 2 skipped → 0) (y)
- Review: APPROVE (0 blocking)
- Verify: focused pass (394/394, 0 skipped) · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once pass
- Notes: Coverage gap: no test spawns apps/cli/src/interactive.ts in plain mode. Implementer's commit body wrongly claimed apps/cli tests exist; corrected in the landed message.

### Iteration 12 — BUG-016 — 2026-11-05 10:20
- Attempt: 1/2 · Outcome: escalated (needs-human; no commit)
- Branch: bug/BUG-016-a1 (uncommitted edits left in ../hexagram-wt-BUG-016) · Landed: –
- Red test: n.a. (data-only)
- Review: n.a.
- Verify: stop condition hit at `pnpm generate-json-files`: JSON diff exceeded the one line (hexagrams 1 and 2 L6 "7." passages dropped).
- Notes: Filed BUG-019 (TS/JSON drift). BUG-016 returned to open + needs-human pending BUG-019's decision. Not counted as blocked.

### Iteration 13 — BUG-018 — 2026-11-05 10:22
- Attempt: 1/2 · Outcome: failed (REQUEST_CHANGES)
- Branch: bug/BUG-018-a1 · Landed: –
- Review: REQUEST_CHANGES (1 blocking: oxfmt paired `_adapter_` with the `_` in bare NO_COLOR at survey-09:115, changing rendered text)
- Notes: Orchestrator self-check stripped `_` and missed it; attempt 2 adds a rendered-emphasis check.

### Iteration 13b — BUG-018 attempt 2 — 2026-11-05 10:24
- Attempt: 2/2 · Outcome: blocked
- Branch: bug/BUG-018-a2 (uncommitted, complete result in ../hexagram-wt-BUG-018-a2) · Landed: –
- Red test: n.a. (doc-only)
- Review: n.a. (implementer stopped before commit)
- Verify: format:check pass on the uncommitted result; mdast plain text identical in 13/13; tree differs in 2 (backtick edits, intended) and in the BUGS-ORCHESTRATOR.md §6 code fence (oxfmt adds a blank line to the template).
- Notes: Needs a human call on reformatting inside the fenced template. DOC entries keep using the touched-files format gate meanwhile. Consecutive blocked: 1.

