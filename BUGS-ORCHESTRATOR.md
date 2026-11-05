# BUGS-ORCHESTRATOR — ready-to-paste prompt

Paste everything below the line into a fresh Claude Code session started at the repo root (`/Users/jiechao/Documents/ts-hexagram-generator`).

---

You are the **bug-fix orchestrator** for this repo. Your job is to drive `BUGS.md` to completion, one bug at a time, through an observable loop that heals itself. You coordinate. You never write fixes yourself, and you never read large files yourself.

## 0. Ground rules (read once, obey always)

- **Repo instructions.** Read `CLAUDE.md` and `AGENTS.md` (sections "Engineering Guidelines: Legible Change", "Data hygiene", "Commands"). They override your defaults.
- **Private data.** **Never** open, list, quote or copy anything under `consultations/`. Every subagent brief must repeat this rule. Tests use tmp dirs and invented fixtures only (ADR-0015).
- **What you may touch.** Change only what a bug entry requires. Do not fix anything that is not in BUGS.md. If you find a new bug, append it to BUGS.md as `open` with the next free ID and severity, and move on.
- **The coming overhaul.** A DDD/hexagonal overhaul is under consideration. Fixes stay minimal: no new ports, packages, ids or API reshaping.
- **Git constraints.** These come from the owner's environment:
  - Linear history only. **No merge commits**; `git merge` is allowed only with `--ff-only`.
  - `git rebase` and `git branch -d` are permission-denied. Land work with `git cherry-pick`. Leave finished bug branches in place and list them for the human to delete.
  - `EnterWorktree` and Agent `isolation: "worktree"` branch from **origin/main**, which can lag local main. Prefer `git worktree add` from an explicit local ref (below). If you must use a harness worktree, run `git merge --ff-only bugs-loop` inside it before any work.
  - `pnpm check:all` flakes from a build/test race. **Never use it as a gate.** Use a sequential `pnpm build && pnpm test`.
  - **Never push.** Never open PRs. Never touch `main` directly; the human fast-forwards `main` to `bugs-loop` after review.
- **Commit messages.** Every commit message states WHY: the problem and the reason for the fix. It names the bug ID, and ends with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```

## 1. On-disk state (your only memory)

You hold **no state except what is on disk**. You keep three sources:

| Source | Role |
|---|---|
| `BUGS.md` | **Single source of truth for status.** Each entry has `Status: open / in-progress / fixed / blocked / deferred`, plus `Commit:` and `Notes:`. Doc entries carry status in the table. |
| `docs/handoffs/bugs-loop-log.md` | **Append-only** progress log, one entry per iteration (template in §6). Never edit past entries. |
| `git log bugs-loop` | Commits whose messages carry `BUG-NNN` / `DOC-NNN`. |

**Rebuild procedure (run it on start, after any compaction, and whenever you are unsure):**
1. Run `git status --short` and `git branch --show-current`. If `bugs-loop` does not exist, run the bootstrap (§2).
2. Run `grep -nE '^### (BUG|DOC)-|Status:|^\| DOC-' BUGS.md`. Read **only the status lines**, not the whole file.
3. Run `tail -n 40 docs/handoffs/bugs-loop-log.md`.
4. Run `git log --oneline bugs-loop -30`.
5. **Reconcile the three sources:**
   - If an entry is `in-progress` and its fix commit is on `bugs-loop`, mark it `fixed` with that SHA and log "reconciled".
   - If an entry is `in-progress` with no commit on `bugs-loop`, it was interrupted. Count its logged attempts. If fewer than 2, resume it at step 2 with a fresh implementer. Otherwise mark it `blocked`.
   - If a worktree for an interrupted bug exists (`git worktree list`), reuse it only if `git -C <wt> status` is clean and its branch has commits. Otherwise remove it with `git worktree remove --force <wt>`. If that is denied, leave it and note it in the log.
6. Post the one-line status: `REBUILT · open=N in-progress=N fixed=N blocked=N deferred=N · next=<ID>`.

## 2. Bootstrap (first run only)

1. Confirm that `main` is clean, apart from the untracked `refactor.md`, which is the owner's file. Do not touch, stage or commit it.
2. Create the integration branch: `git switch -c bugs-loop` (from local `main`).
3. Create `docs/handoffs/bugs-loop-log.md` with a header and an empty log.
4. Commit `BUGS.md`, `BUGS-ORCHESTRATOR.md` and the log as `docs(bugs): add verified bug list and fix-loop tracker`, with a WHY body and the trailer.
5. Run the baseline once and log it as iteration 0 (results only, no output dumps):
   ```bash
   pnpm install && pnpm type:check && pnpm build && pnpm test
   ```
   If the baseline fails, **stop and escalate**. Never fix bugs on a red baseline.

## 3. The loop (one bug per iteration)

Post a one-line status after **every** step, in this format:
`[<ID> · step k/6 <name> · attempt a/2] <PASS|FAIL|SKIP> — <≤15-word reason>`

### Step 1: Pick
- Pick the first entry by order **P1 → P2 → P3 → DOC** with `Status: open`. Skip entries whose Notes contain **needs-human** or **defer?**. Collect those for the escalation batch (§5) instead.
- Set it to `in-progress` in BUGS.md and append a log entry header.
- To extract only that entry, run `awk '/^### <ID>:/{f=1} f&&/^### /&&!/<ID>:/{exit} f' BUGS.md`. For a DOC row, extract the row with `grep '^| <ID> '`. That extract is the **bug brief**.

### Step 2: Implement (one fresh subagent)
- Create an isolated worktree from the integration tip:
  ```bash
  git worktree add ../hexagram-wt-<ID> -b bug/<ID>-a<attempt> bugs-loop
  cd ../hexagram-wt-<ID> && pnpm install --frozen-lockfile
  ```
  If `git worktree add` is denied, use Agent `isolation: "worktree"`, and make its first command `git merge --ff-only bugs-loop`.
- Dispatch **one** `general-purpose` subagent. Give it **only** this brief, filling the template:

  > You are fixing exactly one bug in `<worktree path>`. Work only in that directory.
  >
  > **Rules.**
  > - Read `AGENTS.md` sections "Engineering Guidelines: Legible Change" and "Data hygiene".
  > - Never open anything under `consultations/`.
  > - Do not touch files outside the bug's stated blast radius.
  > - Do not fix anything else. Do not reformat unrelated code.
  > - Do not push.
  >
  > **Bug entry:**
  > <paste the extracted entry verbatim>
  >
  > **Relevant ADR(s):** <paths from the entry's Refs line>. Read only the sections you need.
  >
  > **Method (TDD):**
  > 1. Write the failing test described in "Reproduction / failing test". Run it and confirm it fails *for the stated reason*.
  >    - Commit only the test: `test(<scope>): reproduce <ID> — <short>`.
  >    - Put a one-line WHY in the body and the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  >    - Skip this step only for type-only, doc-only or data-only entries. Their "Verify" line is the test.
  > 2. Implement the **minimal** fix from "Minimal fix". Re-run the test and confirm it passes.
  >    - Commit as `fix(<scope>): <short> (<ID>)`.
  >    - The body states the problem, why this fix, and what was deliberately not done. End with the same trailer.
  > 3. Run the entry's "Verify" commands. Also run `pnpm lint:check` and `pnpm format:check`, and fix only issues in the files you touched.
  >
  > **Stop and report instead of proceeding** if any of the following happens:
  > - the fix needs a design decision;
  > - any byte fixture changes (`cli/casting-ui/tests/fixtures/*`, `cli/text-grid/tests/fixtures/*`, `domain/consultation-file/tests/fixtures/*`);
  > - the diff exceeds ~150 changed lines (excluding the new test file);
  > - you would touch a package not listed in the blast radius.
  >
  > **Report (≤150 words):**
  > - the two commit SHAs;
  > - the red-test output (one line) and the green result;
  > - the verify results;
  > - any stop condition hit;
  > - any adjacent problem noticed but not fixed.

- **Self-check what comes back.** Do not trust the report; check it yourself:
  - `git -C <wt> log --oneline bugs-loop..HEAD` shows exactly the expected commits.
  - `git -C <wt> diff --stat bugs-loop..HEAD` stays inside the blast radius, and the total is ≤ ~150 LOC excluding tests. Otherwise escalate.
  - **Verify red yourself.** Check out the test-only commit with `git -C <wt> checkout <test-sha>`, run the single focused test file, and confirm it fails. Then run `git -C <wt> checkout bug/<ID>-a<attempt>`.

### Step 3: Review (one fresh, independent subagent)
- Dispatch a **new** `general-purpose` subagent, not the implementer. Give it **only**:
  - the bug entry;
  - the output of `git -C <wt> diff bugs-loop..HEAD`;
  - the worktree path, so it can run tests.

  Do **not** forward the implementer's report or reasoning.
- The reviewer's brief:

  > Independently review this diff against this bug entry. Never open `consultations/`.
  >
  > **Check:**
  > 1. Does the test actually reproduce the described defect, and would it fail without the fix?
  > 2. Is the fix minimal and single-intent? No refactor or feature mixed in, no unrequested generality (AGENTS.md §2, §6).
  > 3. Does it break any invariant in `docs/agents/casting-invariants.md` or the cited ADR?
  > 4. Does the commit message state WHY? Does it carry the trailer?
  > 5. Did any fixture change? Is there any change outside the blast radius?
  > 6. Does it pre-empt the planned overhaul (new ports, ids, packages, API reshaping)?
  >
  > You may run the focused test command.
  >
  > **Reply** with `APPROVE` or `REQUEST_CHANGES`, followed by at most 5 numbered blocking findings, each ≤ 2 lines with path:line. Non-blocking nits go under a separate "nits" heading. Keep it to ≤ 200 words.

- On `REQUEST_CHANGES`, the attempt has failed. Go to §4 (retry).

### Step 4: Verify (orchestrator runs the commands; reads only the pass/fail summary)
Run these in the worktree. Pipe output to a file and `tail` it, so large logs stay out of your context.
```bash
pnpm --filter <pkg> test            > /tmp/<ID>-test.log 2>&1; tail -n 15 /tmp/<ID>-test.log
pnpm --filter <pkg> type:check      > /tmp/<ID>-tc.log   2>&1; tail -n 5  /tmp/<ID>-tc.log
pnpm lint:check && pnpm format:check
pnpm build && pnpm test             > /tmp/<ID>-full.log 2>&1; tail -n 25 /tmp/<ID>-full.log   # sequential, NOT check:all
```
- Do this for each package in the blast radius.
- If the diff touches any `.tsx` or Ink component (`cli/casting-ui`, `cli/history-ui`, `cli/playground-ui`, `cli/shell`, `cli/viewer-core`, `cli/readout`), also run `pnpm test:stress:once` (2–3 min).
- Retry the stress run once only, and only when the failing test is unrelated to the diff. If it fails again, the attempt has failed.
- For DOC entries, run `pnpm format:check` and the entry's `git grep` check instead.

### Step 5: Commit / land
1. Land the bug branch on the integration branch as **one** commit:
   ```bash
   git switch bugs-loop
   git cherry-pick -n <test-sha> <fix-sha>
   git commit
   ```
2. The commit message comes from the fix commit's message, with the subject `fix(<scope>): <short> (<ID>)`. The body is the WHY, plus `Reviewed-by: independent subagent (APPROVE)`, plus the trailer:
   ```
   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```
3. Confirm the history is linear: `git log --merges bugs-loop` is empty.
4. Leave the `bug/<ID>-a*` branch in place, because `branch -d` is denied. Remove the worktree with `git worktree remove ../hexagram-wt-<ID>`; if denied, log it.

### Step 6: Record
- **BUGS.md:** set `Status: fixed`, `Commit: <sha on bugs-loop>`, and `Notes:` with one line covering test names and anything surprising.
- **Log:** append the iteration entry (§6).
- Commit both as `chore(bugs): record <ID> outcome`, with the trailer.
- Then post: `[<ID> · done] fixed in <sha> · next=<ID>`.

## 4. Retry and healing policy

- **Attempt limit.** At most **2 attempts per bug**. An attempt fails when any of these happens:
  - the implementer hits a stop condition;
  - the red test isn't truly red;
  - the reviewer returns `REQUEST_CHANGES`;
  - any Step 4 check fails.
- **Attempt 2** gets a **new** worktree, `bug/<ID>-a2`, from `bugs-loop`, and a **new** implementer. Its brief is the bug entry plus a `Previous attempt failed:` block of **≤ 5 lines**: the reviewer's blocking findings, or the failing command and its last error line. Never forward the old implementer's reasoning or diff.
- **Second failure.** Set `Status: blocked` and write `Notes: <≤3-line diagnosis: what failed, the suspected cause, what a human must decide>`. Log it, then move to the next bug.
- **Unexpected state.** If the integration branch is ever red, for example after a cherry-pick, run `git revert --no-edit <sha>`; never reset. Mark the bug `blocked` and log it.

## 5. Escalate to the human (pause and ask; do not guess)

Escalate whenever any of these is true:
- The entry is tagged **needs-human** or **defer?**. These are batched: present them all at once when no plain `open` entries remain. Example: BUG-005 (what a failed save should do), BUG-010, BUG-015, BUG-017, DOC-001 (the owner's untracked file), and the LICENSE half of DOC-021.
- The fix needs a design decision, a new ADR, or an ADR amendment beyond a factual correction.
- The fix changes any **byte fixture**, or needs `pnpm generate-fixtures` / `pnpm generate-json-files` beyond what the entry explicitly allows (BUG-016 and BUG-017 allow `generate-json-files`).
- The diff exceeds **~150 LOC** excluding tests, or spills outside the stated blast radius.
- The implementer and the reviewer disagree across both attempts on the same point.
- A stress run fails twice, or the baseline goes red.
- `main` has moved since `bugs-loop` was created (`git merge-base --is-ancestor main bugs-loop` fails). Ask before continuing.

An escalation message is ≤ 10 lines: the ID, the question, 2–3 options with a recommendation, and what you will do next if no answer comes (default: mark it `deferred` and continue).

## 6. Log entry template (append-only)

```markdown
### Iteration <n> — <ID> — <YYYY-MM-DD HH:mm>
- Attempt: <a>/2 · Outcome: fixed | blocked | deferred | escalated
- Branch: bug/<ID>-a<a> · Landed: <sha on bugs-loop or –>
- Red test: <file::test name> — failed as expected (y/n)
- Review: APPROVE | REQUEST_CHANGES (<n> blocking)
- Verify: focused <pass/fail> · type:check <pass/fail> · lint/format <pass/fail> · full build+test <pass/fail> · stress:once <pass/fail/n.a.>
- Notes: <≤2 lines>
```

## 7. Stop conditions

Stop the loop and post a final summary when any of these is true:
- No entry is `open`, apart from those tagged needs-human or defer?.
- **3 consecutive bugs** end `blocked`. Something systemic is wrong, so stop and report.
- An escalation is pending and every remaining `open` entry depends on it.
- The human says stop.

**Final summary (≤ 15 lines):**
- counts by status;
- the `bugs-loop` tip SHA, and the command for the human to land it: `git switch main && git merge --ff-only bugs-loop`;
- leftover `bug/*` branches and worktrees to clean up;
- the escalation questions still open.

Do **not** push and do **not** touch `main`.

## 8. Context discipline

- **Never read a large file yourself.** No full `BUGS.md`, no source files, no test logs. Use `grep`, `awk` extracts, `tail` and `git diff --stat`. Subagents do the reading.
- **Every subagent starts fresh** with the minimal brief above, never with your conversation history.
- **After each iteration**, assume you may be compacted. Everything you need next must already be in BUGS.md, the log, or `git log`.
