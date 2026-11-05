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
- Review: `REQUEST_CHANGES` (1 blocking: oxfmt paired `_adapter_` with the `_` in bare `NO_COLOR` at survey-09:115, changing rendered text)
- Notes: Orchestrator self-check stripped `_` and missed it; attempt 2 adds a rendered-emphasis check.

### Iteration 13b — BUG-018 attempt 2 — 2026-11-05 10:24

- Attempt: 2/2 · Outcome: blocked
- Branch: bug/BUG-018-a2 (uncommitted, complete result in ../hexagram-wt-BUG-018-a2) · Landed: –
- Red test: n.a. (doc-only)
- Review: n.a. (implementer stopped before commit)
- Verify: format:check pass on the uncommitted result; mdast plain text identical in 13/13; tree differs in 2 (backtick edits, intended) and in the BUGS-ORCHESTRATOR.md §6 code fence (oxfmt adds a blank line to the template).
- Notes: Needs a human call on reformatting inside the fenced template. DOC entries keep using the touched-files format gate meanwhile. Consecutive blocked: 1.

### Iteration 14 — DOC-003..013, DOC-022 (AGENTS.md batch) — 2026-11-05 10:26

- Attempt: 1/2 · Outcome: fixed (12 rows, one commit per BUGS.md batching guidance)
- Branch: bug/DOC-AGENTS-a1 · Landed: 2cf0d99
- Red test: n.a. (doc-only; each row re-verified against code by implementer and reviewer)
- Review: APPROVE (0 blocking; nits: "casting: null" wording at :272, saveConsultationFile signature omits dir)
- Verify: oxfmt --check AGENTS.md pass · git grep stale names none · DOC-013 twins confirmed by patch-id · DOC-022 new recipe runs 9/10 files
- Notes: –

### Iteration 15 — DOC-002, DOC-014..DOC-020, DOC-021 (typo half) — 2026-11-05 10:31

- Attempt: 1/2 · Outcome: fixed (9 commits, one per document: 5734597 1f4588e c471c72 b93893e c2a85a0 feb2731 f7af5a7 1a31bf1 3fa1f7e)
- Branch: bug/DOC-ADR-a1 · Landed: 5734597..3fa1f7e
- Red test: n.a. (doc-only; rows re-verified against code by implementer and reviewer)
- Review: APPROVE (0 blocking; nits: ADR-0007 now matches its own rejected "pure TS" option, so the owner may want to supersede it; ADR-0019:97 wording)
- Verify: oxfmt --check on all 9 files pass · git grep stale strings none · LICENSE/refactor.md/AGENTS.md untouched
- Notes: DOC-014/015 recorded as dated "## Amendment" sections (ADR-0006/0008 convention). ADR-0019:57 left as the decision-as-made (banner already amends). DOC-021 LICENSE half stays needs-human.

### Stop — 2026-11-05 — no plain open entries remain

- Outcome: BUG fixed 11, blocked 1 (BUG-018), open+needs-human/defer 7 (BUG-005, 009, 010, 015, 016, 017, 019) · DOC fixed 20 (+ DOC-021 typo half), open needs-human 2 (DOC-001, DOC-021 LICENSE half)
- Tip checks: type:check pass · lint pass · build+test pass · repo-wide format:check red (BUG-018, blocked)
- Escalations pending: BUG-005, BUG-009, BUG-010, BUG-015, BUG-016 (waits on BUG-019), BUG-017, BUG-018, BUG-019, DOC-001, DOC-021 (LICENSE)

### Decisions — 2026-11-05 — owner answered the escalation batch

- BUG-005 → (c) show reading + retry · BUG-009 → fix now · BUG-010 → CORE_SCHEMA · BUG-015 → drop edge (leftover of 11cf361) · BUG-016+019 → regenerate JSON (honours 867a49f) · BUG-017 → 說卦 sequence · BUG-018 → accept template blank line · DOC-021 → LICENSE holder "Lim Jiechao"
- All set back to `open` with a DECIDED note; DOC-001 (owner's untracked refactor.md:20) left to the owner.

### Iteration 16 — BUG-005 — 2026-11-05 13:08

- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-005-a1 · Landed: b724102
- Red test: cli/casting-ui/tests/viewer-flow.test.ts + viewer.test.tsx (6 tests) — failed as expected (y)
- Review: APPROVE (0 blocking; nits: stale flowHint doc comments; discard during in-flight retry may still write, pre-existing; red commit fails type:check)
- Verify: focused (casting-ui + viewer-core) pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once pass
- Notes: Touched cli/viewer-core FooterBar (only caller is ConsultationReadout; no other screen changes).

### Iteration 17 — BUG-009 — 2026-11-05 13:23

- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-009-a1 · Landed: cde7577
- Red test: domain/consultation-file/tests/file.test.ts::stamps the filename with the frontmatter timestamp — failed as expected (y)
- Review: APPROVE (0 blocking; green under local, America/New_York, Asia/Kolkata)
- Verify: focused pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once n.a.
- Notes: Reviewer left a temp extract in $TMPDIR (tmp.xoHELPPCPn); rm -r is denied, left for the owner.

### Iteration 18 — BUG-010 — 2026-11-05 13:28

- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-010-a1 · Landed: b765c93
- Red test: domain/consultation-file/tests/frontmatter.test.ts::keeps an unquoted timestamp … as a verbatim string (×2) — failed as expected (y)
- Review: APPROVE (0 blocking; parse equivalence shown on fixtures + 32 query strings; cache bypass judged safer)
- Verify: focused (consultation-file + text-grid + history-ui) pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once n.a.
- Notes: gray-matter was using its own engine; the configured parse engine had been dead code.

### Iteration 19 — BUG-015 — 2026-11-05 13:34

- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-015-a1 · Landed: e39f556
- Red test: n.a. (build/doc-only; Verify = frozen install + build + lint)
- Review: APPROVE (0 blocking; nit: AGENTS.md Build chain still lists text-layout before consultation-view, topologically valid)
- Verify: frozen-lockfile install pass · type:check (all) pass · lint pass / format pass on touched files · full build+test pass · stress:once n.a.
- Notes: Integration worktree re-ran frozen install after landing the lockfile change.

### Iteration 20 — BUG-016 + BUG-019 — 2026-11-05 13:38

- Attempt: 1/2 (after escalation) · Outcome: fixed (both)
- Branch: bug/BUG-016-a2 · Landed: 2b984a4
- Red test: n.a. (data-only; Verify = generator idempotent + exactly 3 JSON values changed, 2 strict-prefix truncations)
- Review: APPROVE (0 blocking; re-ran generate-json-files clean; byte-fixture suites unchanged)
- Verify: core test pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once n.a.
- Notes: –

### Iteration 21 — BUG-017 — 2026-11-05 13:43

- Attempt: 1/2 · Outcome: fixed
- Branch: bug/BUG-017-a1 · Landed: 99a5d37
- Red test: domain/core/tests/trigram-order.test.ts::orders the eight trigrams as the 說卦 sequence — failed as expected (y)
- Review: APPROVE (0 blocking; nit: 説/兑 variant characters in the pre-existing quote)
- Verify: core test pass · type:check pass · lint pass / format pass on touched files · full build+test pass · stress:once n.a.
- Notes: –

### Iteration 22 — DOC-021 (LICENSE half) — 2026-11-05 13:49

- Attempt: 1/1 · Outcome: fixed
- Branch: bug/DOC-021-a1 · Landed: 35c537e
- Review: n.a. — deviation: a one-line edit whose exact content the owner dictated; orchestrator made and checked it directly.
- Verify: git diff shows only LICENSE:3 changed.
- Notes: Kept year 2025 and MIT text; dropped the template author's URL with their name.

### Iteration 23 — BUG-018 attempt 3 (post-decision) — 2026-11-05 13:49

- Attempt: 4 (post-decision) · Outcome: fixed
- Branch: bug/BUG-018-a4 · Landed: afe6de7
- Red test: n.a. (doc-only; Verify = format:check exits 0 + mdast tree/plain-text comparison)
- Review: APPROVE (0 blocking)
- Verify: format:check pass (repo-wide) · 13 .md files only · mdast SAME in 11 files; allowed diffs only (template blank line, two backtick spans)
- Notes: Attempt 3 stopped on orchestrator-written tracker text; fixed in b186ffc. Lesson: write tracker prose with identifiers in backticks and no literal fences.

### Stop — 2026-11-05 — all decided entries done

- Outcome: BUG fixed 19/19 · DOC fixed 21/22 (DOC-001 is the owner's untracked refactor.md, left to the owner)
- Tip checks: install (frozen) pass · type:check pass · lint pass · format:check pass · build+test pass · stress:once pass

### Follow-up — BUG-017 variant characters — 2026-11-05 14:04

- Outcome: fixed at the owner's request · Branch: bug/trigram-trad-chars · Landed: 6306fe3
- Change: 説言乎兑 → 說言乎兌 in the trigram.ts comment and the trigram-order test comment. Simplified-script maps and records keep 兑 (correct there).
- Verify: core tests 94/94 · lint pass · oxfmt pass · generate-json-files no diff
- Review: n.a. (comment-only, owner-dictated)
