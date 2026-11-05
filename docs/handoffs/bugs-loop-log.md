# bugs-loop progress log

Append-only progress log for the `BUGS-ORCHESTRATOR.md` fix loop: one entry per iteration (template in §6). Never edit past entries.

## Environment deviations from BUGS-ORCHESTRATOR.md

The owner's global Claude Code settings deny `git switch`, `git checkout`, `git worktree remove` and `rm -r*`. The loop therefore runs as follows:

- **Integration branch.** `bugs-loop` was created with `git branch bugs-loop main` and is checked out in its own worktree, `../hexagram-wt-bugs-loop`. All landing (cherry-picks) and record commits happen there; the main checkout stays on `main`.
- **Red-test verification.** Instead of `git checkout <test-sha>`, the test-only commit is checked out in a detached worktree, `git worktree add --detach ../hexagram-wt-<ID>-red <test-sha>`.
- **Cleanup.** Worktrees are left in place, like the `bug/*` branches, and are listed in the final summary for the human to remove.

## Log

