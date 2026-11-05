# Survey 06 — Conceptual integrity through history and documents

Scope: git history (read-only), CLAUDE.md, AGENTS.md, CONTEXT.md, docs/adr/* (22 + README),
docs/reviews, docs/handoffs, docs/superpowers. `consultations/` not opened.
HEAD = `ab492eb` (main). Untracked `refactor.md` present.

---

## 1. Evolution phases and who designed what

| Phase | Dates | Authors | What happened |
|---|---|---|---|
| P0 Template | 2021-03 → 2025 | EGOIST, Eren Bets, Kevin Hazy, 三咲智子/Kevin Deng, Renovate (~300 commits) | A generic TS library starter (`e1a2ca5 init`) plus dependency bumps. No domain content. |
| P1 Human core | 2025-05-28 → 2025-08 | Lim Jiechao only (21 commits, no co-author) | `9d7ac75`, `0eabe56` "core functions, types…", `4adfb74` "CLI random hexagram generator". The yarrow-stalk pipeline (`partTheStalks → … → setAsideRemainder…`) and the arrow-const functional style come from here. |
| P2 Feature burst + first monorepo | 2026-05-13 → 05-29 | "Lim Jiechao" but **318 of 362** owner commits since May carry `Co-Authored-By: Claude` | Ink viewer, slider, consultation file + history (05-19/20), shell/home (05-21), test-flake campaign (05-22→25), playground (05-26), manual flow + `performCast` rewind (05-28). Commit subjects carry plan-task IDs (`(T2+T3)` `dbf671c`, `(M2, L5)` `8420e40`, `(A2)` `cd5cfba`) — i.e. execution of agent-written plans. Monorepo split `ac37678` (05-17). **ADRs 0002–0015 were all backfilled in one commit, `cbe3921` (05-29), co-authored by Claude**, after the design was already built; the same day `1c150f8` pruned shipped plans. |
| P3 Domain/CLI "repatriation" + review rounds | 2026-05-31 → 06-10 | Author "Claude" (248 commits, almost all here) | 7-slice plan `aab35ab`; buckets `e55c3f5`/`fc66000`/`17522d3`; apps bucket `f97eec5`; IR `8af935a`; ADR-0018/0019 (`4f649af`, `9182780`) written by Claude; conceptual-integrity review (06-05) → seam remediation rounds 1, 3, 4 → k=5 theory-reconstruction review `65976d4` (06-08) → handoff `79874aa` (06-09). Peak day 06-05: 63 commits. |
| P4 Re-amendment | 2026-06-19 | Claude | text-grid extraction `811c621` and ADR-0022 (`499987c`), which **amends 0018 and 0019 within 14 days of writing them**; Batch C/D; 4b/4c deferred plan `6af69f5`. |

**Ratio.** Since 2026-05-01: ~610 commits, of which 248 are authored by Claude and 318 co-authored by Claude. Only **44** are human-only (e.g. `e5f2009`, `4339ceb`-era manual-flow plumbing, `3c18010` playground, `e31c4bb` types fold). So about 93% of the modern codebase was produced in agent sessions.

**Did agents follow the owner's design?** Mixed, and the record shows it:
- The owner supplies the *vocabulary and the product*: the yarrow algorithm (P1), CONTEXT.md (first written by the owner `21437a0`), the decision gates ("Cross-plan review with the owner resolved five open forks", `b9721ea`; "B4 is a Tier-2 item: a human ruling was owed", from a 06-0x commit body).
- The *architecture* was mostly reached through agent review loops, not drawn up first. Evidence: ADRs written after the fact (`cbe3921`); ADR-0016 (05-29) superseded by 0019 within 7 days; 0018/0019 amended by 0022 within 14 days; every ADR from 0018 on is Claude-authored (git log: 0018 7/7 edits Claude, 0019 7/7, 0020–0022 all Claude). ADR-0006 and 0008 have 8 Claude edits each against 1–2 owner edits.
- The repo's own handoff says so: "this codebase has *institutionalised* theory-reconstruction… Its standing strategy for conceptual integrity is **annotated seams** — when a fork is found it gets *documented* in an ADR amendment or comment rather than dissolved" (`docs/handoffs/theory-reconstruction-seams.md:26-33`).

**Churn, quantified (since 2026-05-01):**
- 468 rename events, 404 distinct files added, 43 deleted (16 under `src/`), 0 reverts.
- Package churn in about 5 weeks: `packages/{app,consultation,core,history-ui,playground-ui,readout,test-utils,types,viewer-core,viewer-ui}` → `@hexagram/consultation` renamed to `consultation-file` (`97ed849`); `@hexagram/app` renamed to `shell` (`f9e4d52`); `@hexagram/cli` renamed to `@hexagram/bin` (`1ee84c6`, 05-21) **and then back to `@hexagram/cli`** (`f97eec5`, 06-05); `viewer-ui` renamed to `casting-ui`; `types` created and then folded into core (`e31c4bb`); `readout` extracted (`6476624`); three buckets introduced (`domain/`, `cli/`, `apps/`); `text-layout`, `consultation-view` and `text-grid` added. Boundary enforcement moved from dependency-cruiser to ESLint (`20e4601`).
- ADR supersession: 0016 → Superseded by 0019; 0018 and 0019 → Amended by 0022 (`docs/adr/README.md:33-39`).
- Commit types since May: 137 feat, 131 refactor, 105 docs, 66 fix, 65 test, 27 chore, 22 style. 58 subjects mention lint/format/oxfmt, and 18 mention "seam".
- Planning mass: 26 plans and specs under `docs/superpowers` totalling **20,347 lines**, against about 14k non-blank src lines (data models excluded). AGENTS.md is 36 KB.

---

## 2. Docs ↔ code consistency

### Verified contradictions and staleness

1. **`refactor.md`** (untracked) tells the reader to edit `domain/consultation-file/src/serialize-markdown.ts`. That file **does not exist**. It moved to `cli/text-grid/src/serialize-markdown.ts` in `811c621` (06-19). The `role`/`variant` fields it describes still exist (`domain/consultation-view/src/ir.ts:125,127`), so the plan's intent is current but its paths are pre-06-19.
2. **ADR-0018 "Where it's enforced"** (`docs/adr/0018-consultation-view-ir.md:109-118`) lists three paths that no longer exist: `domain/consultation-view/src/ledger-geometry.ts` (the actual file is `ledger-rows.ts`), `domain/consultation-file/src/serialize-markdown.ts`, and `domain/consultation-file/tests/fixtures/*` as the IR byte-lock (the `.md` fixtures now live in `cli/text-grid/tests/fixtures`). The ADR is only flagged "amended by 0022" in its header.
3. **AGENTS.md:312**: "consultation-file tsdown — five entries: index, markdown, frontmatter, file, legacy-converter". In fact there are **three** (`domain/consultation-file/tsdown.config.ts`, `package.json#exports`).
4. **AGENTS.md:311**: "core — ten entries". In fact there are **eleven**; `sample-casting` was added in `e5f2009` (`domain/core/tsdown.config.ts`).
5. **AGENTS.md:255**: "`castingSection()` in `cli/readout/src/output-sections.ts`". That file does not exist. `castingSection` lives at `domain/consultation-view/src/build-view.ts:187`. ADR-0009:71 also cites a missing `cli/casting-ui/src/output-sections.ts`.
6. **AGENTS.md:240**: "`castingTableFollowRow`… exported by `@hexagram/readout`". It is actually exported from `cli/text-grid/src/scroll-geometry.ts:16` and imported at `cli/casting-ui/src/viewer.tsx:23`.
7. **AGENTS.md:249**: "`renderProgressBar()` in `cli/casting-ui/src/viewer-layout.ts`". It is actually at `cli/viewer-core/src/viewer-layout.ts:149`.
8. **AGENTS.md:251**: "saved via `consultationFileOutput()`". No such function exists in src; the name survives only as a test mock name (`cli/casting-ui/tests/viewer.test.tsx:31`).
9. **AGENTS.md:269**: saves go "under `<cwd>/consultations/`". This contradicts AGENTS.md:228 and ADR-0020 (repo-root anchoring, no chdir). `defaultConsultationsDir()` (cwd-based) still exists as a fallback (`cli/history-ui/src/run-history-viewer.tsx:7`, `cli/shell/src/hexagram-app.tsx:166`), so two resolvers persist.
10. **AGENTS.md "CI simulation"** cites the 9-round stabilisation as `4eae942 → 800d3fc`. **Neither SHA is an ancestor of main** (`git merge-base --is-ancestor`). They sit on `claude/*` branches; main holds cherry-picked twins (e.g. `c142b62` ≡ `8e78ea5`).
11. **ADR-0002 "Where it's enforced"** (`:78-81`) still points to `packages/*` globs and `packages/core/package.json`. Its banner says it is superseded, but the links are dead. **ADR-0019:97** says the workspace globs are "`domain/*` + `cli/*`". `pnpm-workspace.yaml` also has `apps/*`.
12. AGENTS.md build-order chain (line ~305) omits `@hexagram/text-layout`. CLAUDE.md:5 has a typo ("Claude-speciic"). CLAUDE.md mandates "TodoWrite", which is a harness-specific tool.

Pattern: the repo already ran "doc-truth sweeps" (`00531d4` 05-29 "realign docs with the actual package set", `36ca282` 06-05, `7da8289` 06-08 "A1–A8 doc-truth sweep"). Each structural move left a new layer of stale prose. **The docs are a second codebase that drifts at the same rate as the first**, because AGENTS.md hard-codes file paths, entry counts and function homes.

### CONTEXT.md glossary vs identifiers
- **Consultation / Unreadable / Query** are well honoured in UI strings (`cli/history-ui/src/history-list-transforms.ts:80,96`; title `Consultation · loaded …` at `history-app.tsx:282`, `Consultation · ${flowKind}` at `viewer.tsx:699`). `HistoryEntry` is code-only as the glossary allows.
- **Query vs question** drift: `cli/casting-ui/src/log-and-save.ts:14-27` takes a parameter named `question` and maps it to `query:`. "question" also appears in `questionPanelRows` (`0b39827`) and in casting-prompt comments. The glossary says "Avoid: question (in code/UI labels)".
- **Viewer** is defined as "the casting orchestrator specifically… avoid using 'viewer' loosely". Yet the generic-chrome package is named `@hexagram/viewer-core` (ScreenShell, palette, keymap), and history exports `runHistoryViewer` (`cli/history-ui/src/run-history-viewer.tsx:6`), which drives no flow. The central glossary term is overloaded by package and function names.
- CONTEXT.md has only 5 terms. The real domain nouns of the code (Line, moving/static, Standing/Emerging hexagram, Cast/Split/pick/recordedMax, four operations 四營, Casting record, castingAbsence, IR section, medium) are **not in the glossary**. They are defined piecemeal in ADR-0006, ADR-0008, ADR-0018 and AGENTS.md prose. The glossary covers the UI shell, not the divination domain.

---

## 3. Style drift (do parts read like different authors?)

- **Two clear strata.** The P1 human code in `domain/core/src/index.ts` uses arrow-const exports, terse `// Helper functions` headers and a reduce-heavy functional style (compare `git show 0eabe56:src/index.ts` with the current file, which is near-identical). Everything since P2 uses `export function` declarations. Counts of arrow-const vs function exports: core 15/17; casting-ui 0/56; viewer-core 1/32; history-ui 0/18; consultation-view 0/8.
- **Comment voice is uniformly heavy across the AI stratum.** Comment-line share of non-blank src: shell 44%, casting-ui 36%, viewer-core 36%, playground-ui 36%, core 30%, consultation-file 32%, readout 26%, history-ui 22%, text-grid 20%. This is one *voice*, the agent's "why" voice, applied everywhere. It is not one *design*.
- **Process artefacts leak into source.** 22 comments cite review/plan IDs ("the old S4 seam" `cli/casting-ui/src/viewer-flow.ts:283`; "S8: one wave, one home" `bouncing-slider-store.ts:7`; "finding S9" `:53`; "Seam 7" `manual-diagram.ts:28`; "Phase 7 redesign" `manual-prompt.tsx:296`; "once Slice 2 brings…" `cli/shell/src/identity-block.tsx:4`), plus 35 ADR references in src. Tests are named after refactor events, e.g. `domain/consultation-file/tests/recorded-max-rename.test.ts`. A reader needs the review transcripts to decode the code.
- **Error handling differs per package.** consultation-file uses result unions (`ok: true/false` in `file.ts`, `frontmatter.ts`, `legacy-converter.ts`). core throws assertions (`assertSelectablePick`, `assertIsLine`; 15 `throw new` in src). There are no custom Error classes. The CLI edge has 25 `process.exit` calls, and the env-refusal is authored per surface (prior review S3). Each style is reasonable locally, but no single error policy is stated.
- **Module patterns.** AGENTS.md says "publish via exports only, no barrels" (text-grid "no barrel index"), yet casting-ui, history-ui, playground-ui, shell and viewer-core each have an `index.ts` barrel, and `utils-mode.ts`, `banner-flag.ts`, `utils-validators.ts` re-export. Barrel policy differs between domain and cli.
- **Test style.** 950 `it(` against 111 `test(`. Mostly uniform, with readiness-witness/`waitFor` helpers retrofitted across all Ink suites in one campaign (05-25).

---

## 4. Design-by-patching signals

- **Flake campaign.** 05-22→05-25: about 54 test/CI commits in four days. Examples: "replace blind tick() with waitFor", "close the contention-driven matrix flake" (`c142b62`), "widen the last three CI-load timeout edges", "raise waitFor + testTimeout ceilings to fit GHA worst-case", "retry first cross-state keystroke through useInput bind race". The result was an `onReady` witness prop retrofitted into components (`429fd7a`, `3e7c532`, HomeMenu) and a `test-utils` package. Production components gained test-only readiness props, so test infrastructure shaped the component APIs. ADR-0012 was then written to justify it.
- **Review → remediation → review loops.** Conceptual-integrity review (06-05) → seam-remediation plan → round 3 → round 4 → k=5 review (06-08) → handoff (06-09, 466 lines) → Batch C/D (06-19) → deferred 4b/4c plan (`6af69f5`). Each round found new seams one altitude down. The 06-05 review itself concludes: "closed the fault line at the vocabulary altitude and relocated it, intact, one altitude down" (`docs/reviews/2026-06-05-conceptual-integrity-review.md:149`).
- **The "medium-neutral IR" was decided, built, and then found to carry monospace geometry.** Handoff Seam 2 is rated "HIGH". ADR-0022 resolved it by moving geometry out to `cli/text-grid` and amending two ADRs that were two weeks old. The architecture is being *discovered* by iteration, not executed from a blueprint.
- **Lint/format follow-ups.** 58 commits mention lint, format or oxfmt (e.g. `cfb81fe` "satisfy type-check, lint, and formatter gates", `173466d`, `98fbc4b` "apply repo lint+format to round-3 seam-remediation files"). Agents generate code first and conform it afterwards.
- **Cherry-pick landing** (owner memory: rebase is denied) duplicates history across `claude/*` branches. The docs then cite off-main SHAs (item 10 above).
- **Renaming ping-pong.** `@hexagram/cli` → `@hexagram/bin` → `@hexagram/cli`; `SplitRecord.max` → `recordedMax` took two plans (`2026-06-07-splitrecord-max-rename.md`, `…-legibility-refactor.md`) plus a test file named for the rename.

---

## 5. Verdict

**Conceptual integrity: 3 / 5.** The domain core is coherent and the outer layers are designed by committee. The terminal layer is well documented, and that documentation is how its incoherence is managed.

The codebase does not read as one mind's design. It reads as **one mind's vocabulary and product taste** (owner: the yarrow model, Consultation/Query/Readout nouns, the manual-flow invariants, the "Legible Change" rules), **executed and re-architected by roughly 600 agent commits** that each optimise locally and are reconciled afterwards through reviews, seam IDs and ADR amendments. The project owns this openly; its own handoff calls the strategy "annotated seams". Brooks's Surgeon would recognise the documentation discipline. He would not recognise the design-first unity, because the ADRs were mostly written after or during construction, and four of the five post-0017 ADRs revise earlier ones.

**Coherent (one vision, keep):**
- `domain/core`: the four-operations pipeline, `performCast` / rewindable `LineState`, `line-semantics`, `casting-derivation` (single pick-clamp owner), `manual-validation`. The human P1 kernel survives almost verbatim, and five cold readers agreed on it (06-05 review "near-zero variance").
- The `consultation-file` envelope (5-field canonical frontmatter, derived data never persisted, `castingAbsence` reason) and ADR-0008.
- The `domain → cli` import ban: a clear and enforced rule.
- Data hygiene (ADR-0015) and product identity (ADR-0014).

**Committee-like (redraw):**
- The presentation stack: `consultation-view` IR → `text-grid` → `readout` / `playground-ui`, with row grammar re-assembled per surface and held together by byte-fixtures (S1). Three ADRs (0016 → 0018/0019 → 0022) were spent finding where it belongs.
- Terminal plumbing: env refusal, consultations-dir resolution (two resolvers), width (`string-width` vs `visualWidth`), flag parsing, and the `viewer-core` grab-bag whose name collides with the glossary's "Viewer".
- Test-driven API shape: `onReady` witnesses in production components and `*RevealMs={0}` test knobs throughout.
- The documentation layer itself: AGENTS.md hard-codes paths, counts and homes, and has had three doc-truth sweeps in five weeks.

**What a Surgeon would do in a rewrite:**
- *Keep:* the core algorithm and `LineState` model, the envelope schema, the never-zero-remainder invariant and its single enforcer, the byte-fixture corpus (as acceptance tests rather than as structure), CONTEXT.md's nouns, and the domain/CLI dependency rule.
- *Cut:* review/seam IDs in source comments, rename-event tests, AGENTS.md's file-path narration (replace it with ADRs plus a generated package map), test-only readiness props where an Ink test harness can observe the same signal, the cwd fallback resolver, and the barrel files in cli packages.
- *Redraw:* (a) one glossary covering the divination domain (Line, Cast, Split, Standing/Emerging, Casting record) alongside the UI nouns, and rename `viewer-core` → e.g. `terminal-shell`; (b) one presentation model decided up front, either a truly medium-neutral IR with *one* row-grammar builder per medium or an honest monospace document model, rather than discovering the altitude by amendment; (c) one stated error and exit policy for the CLI edge; (d) design ADRs *before* agent execution, with agents treated as implementers of a fixed blueprint rather than co-architects. This last point is the Brooks remedy, and it matters more than any DDD/Hexagonal vocabulary. A ground-up rewrite with the same agent-loop process would likely reproduce the same seam-accretion pattern.
