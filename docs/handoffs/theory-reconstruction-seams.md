# Handoff — ts-hexagram-generator: theory-reconstruction seams → brainstorm & plan remediation

**From:** zero-knowledge theory-reconstruction session (k=5, conformance mode)
**Repo:** `/home/user/ts-hexagram-generator` (`limjiechao/ts-hexagram-generator`)
**Branch:** `claude/zero-knowledge-theory-reconstruction-evuyib`
**Date:** 2026-06-09
**Working tree:** clean — this was a _measurement_, no code changed.

---

## 0. What this session did (so you don't repeat it)

Ran the `jiechao-toolkit:theory-reconstruction` instrument: 5 independent cold-read
sub-agents (no docs, code-only, varied entry angles — core bottom-up / entrypoints
outside-in / data-formats & state-machines / dependency-DAG / targeted-tension-points),
then loaded the intended theory (the ADRs + `CONTEXT.md` + `CLAUDE.md`/`AGENTS.md` +
inline comments) and diffed de-facto vs intended, verifying the two load-bearing
questions directly against code.

The **full ranked findings, coverage statement, prior-contamination flags, and
cross-run variance analysis live in the conversation transcript** (the assistant's
final report immediately before this handoff). This document is the _actionable
distillation_ for brainstorming/planning — it does not re-derive the analysis.

**Meta-finding that frames everything:** this codebase has _institutionalised_
theory-reconstruction. ADRs and inline comments are saturated with prior cold-read
seam IDs (S1, S3, S6, S7, S9, S10, S11, S12, S14; see `git log` for S6/S9/S10/S12
commits). Its standing strategy for conceptual integrity is **annotated seams** —
when a fork is found it gets _documented_ in an ADR amendment or comment rather than
dissolved. My 5 fresh runs re-derived most of these independently → they are real,
stable fault lines. Therefore: **do not "fix" a seam that an ADR already owns as
deliberate** — those are conformant. The work below is only the _divergences_.

---

## 1. Reference set (read these; do not duplicate them in the plan)

- `docs/adr/0006-casting-algorithm-rewindable-core-and-randomness.md` — never-zero invariant, `performCast`, single-enforcer story.
- `docs/adr/0008-consultation-file-format.md` — envelope, absence-reason, **the unimplemented S7 amendment (see Seam 1)**.
- `docs/adr/0018-consultation-view-ir.md` + `docs/adr/0019-domain-cli-boundary.md` — the "medium-neutral IR" claim (see Seam 2).
- `docs/adr/0020-consultations-dir-anchoring.md` — bin dir threading (see Seam 3).
- `docs/adr/0021-rendered-width-single-home.md` — width fence scope (see Seam 4).
- `CONTEXT.md` — domain vocabulary (Viewer/Readout/Consultation/Query).

---

## 2. The directional seams, ranked by severity

Severity = (correctness risk) × (whether code/doc actually disagree) × (blast radius).
Each item marks **direction**: `CODE-BEHIND-DOC` (doc records a decision the code never
made), `DOC-BROADER` (doc framing wider than enforcement), `UNDOCUMENTED-DRIFT` (code
diverged with no ADR), or `STRAINED-CONFORMANCE` (matches the letter, strains the spirit).

---

### ✅ SEAM 1 — `.md`-load does NOT replay-validate casting [RESOLVED 2026-06-09]

**Resolved by** commit `3c1fee3` (feature) + `704a074` (real-fixture prep), branch
`claude/zero-knowledge-gate-a-5gq3sh`. Gate A decision = **implement** (per the user).
Outcome recorded in `docs/adr/0008-consultation-file-format.md` (amendment
_2026-06-09: the S7 replay-validation has landed_).

**What landed:** `castingReplaysTo` hoisted from `legacy-converter.ts` into a shared
`domain/consultation-file/src/casting-replay.ts`; `parseFrontmatter` now replays a
present casting against the stored hexagram and returns the new
`casting-unreplayable` `ParseFailureReason` (fails closed to `[unreadable]`,
additive — no `schemaVersion` bump). Verified: full suite green (serialised
`turbo run test`, 23/23), type/lint/format clean.

**Verify-before-trust payoff:** the ADR called the fix "small, well-bounded — needs a
fixture." A probe found the de-facto truth the ADR missed: the **entire** test suite
carried _synthetic_ castings (picks `1, 2, 3`; some threw on replay) because nothing
had ever replay-checked. Those were made physically real first (`704a074`) via a
self-checked per-line block table. That fixture was finally single-homed as
`sampleCastingFor` (`@hexagram/core/sample-casting`) — the casting algorithm's
deterministic inverse, importable by every test — after a wrong first home in
`cli/test-utils` forced a needless domain/cli mirror (Seam-4d-adjacent; see the
fixture-home commit on the branch).

_Original finding retained below for the record._

**Direction: CODE-BEHIND-DOC** — the only genuine code/doc disagreement, and the only
seam with _no reconciling comment_.

- **Doc claim (Accepted):** `docs/adr/0008` amendment _2026-06-08 (S7)_ says `.md` loads
  _will_ replay the 18 splits through `makeLineGenerator`, must reproduce the stored
  hexagram, surface `casting-unreplayable` on failure, and that `castingReplaysTo` _"is
  hoisted to a shared location so both load paths use one definition."_
- **Code reality (verified this session):**
  - `domain/consultation-file/src/frontmatter.ts:209` — load is **shape-check only**
    (`isCastingRecord`), no replay.
  - `castingReplaysTo` exists **only** in `domain/consultation-file/src/legacy-converter.ts:196`
    (still private, never hoisted, never called on the `.md` path).
  - No `casting-unreplayable` reason exists anywhere.
  - Independently corroborated by the cold "data-formats" run (it found shape-check-only).
- **Real consequence:** a hand-edited/corrupted `.md` carrying a well-shaped but
  physically-impossible casting **loads and renders a trusted false ledger** — exactly
  the asymmetry ADR-0008 says it _closed_ but didn't. Legacy `.txt` is replay-validated;
  our own `.md` is trusted on shape alone.
- **Decision needed (brainstorm first):** _implement_ the amendment (hoist
  `castingReplaysTo` to shared `consultation-file` API, call it in `frontmatter.ts`/`file.ts`,
  add the `casting-unreplayable` parse reason, fail closed to `[unreadable]`) **OR**
  _retract/downgrade_ the ADR amendment to "Proposed/Rejected" if the team decided
  against it. The ADR text reads as a firm decision, so default expectation = implement.
- **Scope if implemented:** small, well-bounded. One shared predicate, one call site,
  one new parse reason, additive (no `schemaVersion` bump per the ADR). Needs a fixture
  for a non-replaying `.md` → `[unreadable]`.

---

### 🟠 SEAM 2 — "Medium-neutral" IR carries monospace terminal geometry [SEVERITY: HIGH]

**Direction: BOTH — code has a real terminal commitment AND doc framing is broader;
currently bridged only by an inline comment.** Lowest cross-run legibility (readers
split on what the package _is_ depending on read depth).

- **Doc claim:** `docs/adr/0018`/`0019` — `consultation-view` is medium-neutral; IR
  payloads are "pure data (no ANSI, no Markdown)"; litmus = a Next.js HTML serializer
  reuses the whole structure.
- **Code reality (verified this session):**
  - `domain/consultation-view/src/vocabulary.ts:39-52` — **12 hardcoded monospace column
    widths** with comment _"so the content fits the 120-col default wrap (111 visual cols)."_
  - `domain/consultation-view/src/ledger-template.ts` — builds **padded cells + `'═'.repeat(width)`** rule rows in the domain.
  - `domain/consultation-view/src/ledger-geometry.ts:11-23` — **ANSI-table row-count
    geometry** for the viewer's auto-scroll.
  - `domain/consultation-view/src/ir.ts:11` — `SectionMedium = 'ansi' | 'markdown'` (the
    neutral layer names its two consumers and decides their per-section visibility).
  - `ir.ts:152-157` **self-confesses** the geometry leak as _"finding S10"_ and defends
    it as "still row counts, not bytes."
- **Honest de-facto label:** _a shared monospace-text-layout builder for two media
  (ANSI + Markdown code-fence) that defer only colour_ — not a medium-neutral IR. An HTML
  host would inherit a 12-column ledger sized in monospace character cells.
- **Decision needed (brainstorm/grill against the ADR):** either (a) **formally narrow**
  the ADR-0018/0019 "medium-neutral" claim to "neutral at the byte level; monospace
  text-grid at the geometry level" and drop/qualify the Next.js-HTML litmus, OR (b)
  **extract the geometry** (column-width schema + ledger row geometry) into a
  `cli/*` serializer concern so the domain truly carries only semantic structure.
  Likely outcome is (a) (doc-tightening) given prior S10/S12 commits already leaned that
  way — but this is a **human design call**, not a mechanical fix. High design content.

---

### 🟡 SEAM 3 — Entrypoint discipline forks across bins [SEVERITY: MEDIUM-HIGH]

**Direction: UNDOCUMENTED-DRIFT** — no ADR covers these; one is a live user-facing bug.

- **3a (bug):** `--manual-reveal-ms` is **silently dropped** on the `hexagram` home-hub
  manual path. `cli/shell/src/hexagram-app.tsx` `CastingFlags` has no `manualRevealMs`
  field; `resolveManualRevealMs`/`manualRevealMs` appear nowhere in `cli/shell/`. Works
  on the standalone `hexagram-manual` bin (`apps/cli/src/manual.ts:46-48`), inert via the
  hub. This is structurally the _same class_ of bug `buildRandomViewerArgs`
  (`cli/casting-ui/src/utils-mode.ts:235-249`) was built to prevent — the fix was applied
  to the random flow only.
- **3b:** TTY-guard placement is inconsistent — external for history
  (`apps/cli/src/history.ts:22`), internal for playground/hexagram
  (`run-playground-app.ts:41`, `run-hexagram.tsx:60`). A comment in
  `run-playground-app.ts:4-5` claims it _"Mirrors `runHistoryViewer` … exactly"_ — **false**
  (history's guard is external).
- **3c:** Only `apps/cli/src/interactive.ts:80-88` converts Inquirer's `ExitPromptError`
  to a clean `exit(0)`; `apps/cli/src/random.ts:48-51` (also plain-mode Inquirer) treats
  it as `exit(1)`. Ctrl-C on the query prompt → different exit codes per bin.
- **Decision needed:** mostly mechanical once confirmed as drift. 3a = thread
  `manualRevealMs` through the shell's `CastingFlags` + viewer args (and consider an
  ADR-0020-style "thread every knob" note so the _class_ is closed, not the instance).
  3b/3c = pick the canonical pattern, align, fix/delete the false comment.

---

### 🟡 SEAM 4 — Boundary enforcement is partial & reactive [SEVERITY: MEDIUM]

**Direction: DOC-BROADER** — enforcement narrower/more reactive than the prose implies;
the domain↔cli _hard_ wall is genuinely solid (graph-true + unit-tested), these are the
_secondary_ boundaries.

- **4a (latent foot-gun):** `barrelRootBans` (`eslint.config.js:24-35`) bans bare imports
  of `@hexagram/consultation-file` + `@hexagram/readout` but **omits
  `@hexagram/consultation-view`**, which is _also_ barrel-less (exports only subpaths).
  Same mistake against consultation-view fails at module resolution but is **not
  lint-flagged**.
- **4b:** width fence (`string-width`/`slice-ansi`) is scoped to `cli/**/src` → **test
  files evade it** (`cli/casting-ui/tests/viewer.test.tsx:5` + two `manual-diagram-*`
  tests import `string-width` directly). The lint _message_ ("viewer-core is the sole
  exempt wrapper") overstates: `domain/text-layout` also imports `string-width` — though
  ADR-0021 _does_ sanction that domain import, so only the message is wrong.
- **4c:** Only the domain→cli rule has a unit test
  (`domain/core/tests/eslint-domain-boundary.test.ts`); the width/barrel bans are
  **untested** — the very "invisible drift" state that test's own comment warns about.
- **4d (hygiene):** `@hexagram/casting-ui` declares `wrap-ansi` in `dependencies` with
  **zero imports** (stale; `package.json`). `@hexagram/test-utils` is listed among "the
  seven cli packages" in `eslint.boundary.js:16` but is a dep-free test-only leaf outside
  the DAG (classification ambiguity).
- **Decision needed:** mostly mechanical. 4a = add consultation-view to `barrelRootBans`.
  4b/4c = decide whether secondary boundaries deserve tests / wider scope (or accept
  prod-only scope and tighten the lint _message_). 4d = drop stale dep, clarify comment.

---

### 🟢 SEAM 5 — `recordedMax = length − 1` derivation duplicated 6+ times [SEVERITY: LOW-MEDIUM]

**Direction: STRAINED-CONFORMANCE** — _enforcement_ is single-homed (no corruption risk);
_derivation knowledge_ is not.

- `recordedMaxFor` is the named owner (`domain/core/src/index.ts:197`), but `length − 1`
  is hand-recomputed in `random-casting.ts:26,38,50,56`, `interactive-flow.ts:19`, and
  even `index.ts:227` (`performCast` doesn't route through its own `recordedMaxFor`).
  These operate on raw `number[]` so they _can't_ call the `LineState`-typed helper
  without a refactor.
- ADR-0006 claims the rule "has one home" — true for the `selectablePickMax` clamp and
  `assertSelectablePick` enforcement; strained for the underlying `length − 1`.
- **Decision needed:** optional DRY pass. Low risk (drift would throw via
  `assertSelectablePick`, not corrupt). Only worth it if the team wants the derivation
  single-sourced too.

---

### 🟢 SEAM 6 — Two line-value computations equal-by-test [SEVERITY: LOW]

**Direction: STRAINED-CONFORMANCE / documented intent.**
`performCast` computes `line = unparted.length / 4`; `deriveSplit.combinedPiles`
reconstructs it from remainders (`casting-derivation.ts:88-95`). Tied only by a 3-pick
test. ADR-0006 frames this as generation-vs-reconstruction (different knowledge), so it's
defensible — note for awareness, likely no action.

---

### 🟢 SEAM 7 — Vestige / orphan code [SEVERITY: LOW]

**Direction: UNDOCUMENTED-DRIFT (cosmetic).**

- `flipPolarity` appears unused by the casting→emerging path (`line-semantics.ts:56`).
- `generateRandomLines` filters for impossible `line === 5` / `line === 10` buckets
  (`random-casting.ts:148`).
- Generator-nesting that a plain array would cover (flagged by the core run).
- **Decision needed:** confirm dead, then delete (single trivial diffs).

---

## 3. Explicitly NON-actionable (conformant — do NOT touch)

These were hit by multiple runs but are **documented-deliberate**; "fixing" them fights
the ADRs:

- The `stalks`/`recordedMax`/`selectablePickMax` off-by-one trio — owned by ADR-0006 +
  ADR-0008's `max→recordedMax` rename. (Most-rediscovered seam, _and_ most-documented.)
- The three-origin `casting: null` collapse + read-time `legacy-no-table` default — owned
  by ADR-0008 amendments (S6, S3/S11).
- `deriveSplit` tolerant while `performCast` throws — owned by ADR-0006.
- `domain/text-layout` importing `string-width` — sanctioned by ADR-0021.

---

## 4. Suggested sequence (batched)

Gate the design-decisions first; the mechanical cleanups can then run as a reviewable
sequence of small single-intent diffs.

1. ~~**DECISION GATE A — Seam 1 (correctness).**~~ ✅ **DONE 2026-06-09** — decision was
   _implement_; landed in `3c1fee3` (+ `704a074` fixture prep), recorded in ADR-0008.
   See the RESOLVED block in §2. The "one self-contained slice" estimate held for the
   production code, but the real work was making the suite's pervasively-synthetic
   castings physically real first.

2. **DECISION GATE B — Seam 2 (architecture).** Brainstorm/grill the "medium-neutral"
   claim against ADR-0018/0019 + CONTEXT.md. Decide: narrow the ADR claim (likely) or
   extract geometry to `cli/*`. Independent of Gate A — can run in parallel. Outcome =
   an ADR amendment; possibly no code change.

3. **BATCH C — mechanical drift cleanups (Seams 3 + 4 + 7).** No deep design; each its
   own commit, reviewable in one pass:
   - 3a thread `manualRevealMs` through the shell (+ consider closing the _class_).
   - 3b/3c align TTY-guard placement & `ExitPromptError` handling; fix the false
     "mirrors exactly" comment.
   - 4a add `consultation-view` to `barrelRootBans`.
   - 4d drop stale `wrap-ansi` dep; clarify `test-utils` classification.
   - 7 delete confirmed-dead `flipPolarity` / impossible-bucket filters.
     _(4b/4c — width-fence test coverage/scope — is a smaller design call; fold into Gate B
     or split out only if the team wants secondary boundaries hardened.)_

4. **BATCH D — optional DRY pass (Seams 5, 6).** Only if desired. Single-source the
   `length − 1` derivation; otherwise leave documented and move on.

**Critical-path:** ~~Gate A (correctness) → ships first.~~ ✅ shipped. **Next recommended
target: DECISION GATE B (Seam 2)** — the remaining design gate; or BATCH C (mechanical
hygiene) if you want low-risk wins first. Gate B and Batch C are parallelisable; Batch D
last/optional.

---

## 5. Suggested skills for the next session

- **`superpowers:brainstorming`** — REQUIRED before Gates A and B (any creative/design
  decision). Use it to settle implement-vs-retract (Seam 1) and narrow-vs-extract (Seam 2).
- **`jiechao-toolkit:grill-with-docs`** — stress-test the Seam 2 medium-neutral decision
  against CONTEXT.md + ADR-0018/0019; sharpens terminology and updates docs inline.
- **`jiechao-toolkit:authoring-adrs`** — record the Gate A and Gate B outcomes (both are
  hard-to-reverse, constrain future work → ADR-worthy). Follows the repo's append-only
  amendment convention.
- **`jiechao-toolkit:reviewable-changes`** — keep Batch C single-intent, one-pass-reviewable
  (the repo's ~400-LOC / one-change-one-thing rule, per AGENTS.md §2).
- **`jiechao-toolkit:capturing-commit-intent`** — commit messages stating WHY (AGENTS.md §3).
- **`jiechao-toolkit:design-first-tracer-bullet`** — for Seam 1 implementation: state the
  design, build the thin end-to-end slice (predicate → call site → fixture) first.
- **`to-issues`** — if the team wants Seams 1–7 as tracker issues (GitHub, per AGENTS.md
  issue-tracker skill) instead of one branch.
- (Done, do not re-run: `jiechao-toolkit:theory-reconstruction`.)

---

## 6. Process notes / gotchas for the continuing agent

- **Project rules (AGENTS.md/CLAUDE.md):** design-before-build; small single-intent diffs;
  commit messages state WHY; comment only non-obvious rationale; use `TodoWrite` for
  multi-step work. Do **not** put the model identifier in any committed artifact.
- **Data hygiene:** `consultations/` is gitignored and may hold real personal data — never
  copy a real consultation into a fixture/doc/commit. Use invented scenarios (see
  `domain/consultation-file/tests/fixtures/cases.ts` and the `legacy-real-*.txt` style).
- **Fixtures are dual:** `--plain` stdout locked in `cli/casting-ui/tests/fixtures/`; `.md`
  save output locked in `domain/consultation-file/tests/fixtures/`. Regenerate **both**
  together via `pnpm generate-fixtures` after any intentional section-builder change. The
  manual≡interactive byte-identity test (`cli/casting-ui/tests/viewer.test.tsx`) is the
  regression gate for Seam-1-adjacent save changes.
- **Slow test:** the 1M-iteration `rng distribution (slow)` block (~40s, 90s timeout) runs
  on every `pnpm test`; exclude with `pnpm --filter @hexagram/core test -- --exclude tests/random-casting.test.ts` while iterating.
- **The branch** `claude/zero-knowledge-theory-reconstruction-evuyib` currently holds no
  code changes from this session (measurement only). Confirm with the user whether
  remediation lands here or on a fresh branch before committing.
- **Verify, don't trust the ADR:** this codebase's ADRs occasionally run _ahead_ of the
  code (Seam 1 is proof). For any "the ADR says it's fixed" claim, grep the code first.
