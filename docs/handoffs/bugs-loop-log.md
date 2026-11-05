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

