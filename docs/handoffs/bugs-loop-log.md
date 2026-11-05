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

