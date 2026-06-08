# Handoff — Theory Reconstruction Findings → Brainstorm/Plan the Fixes

**Repo:** `/home/user/ts-hexagram-generator`
**Branch:** `claude/hexagram-theory-reconstruction-CjGbb` (clean; nothing committed this session — this was a read-only measurement task)
**Date:** 2026-06-08
**What happened:** Ran the `jiechao-toolkit:theory-reconstruction` skill in **conformance mode, k=5**. Five independent cold-read agents reconstructed the de-facto theory from CODE ONLY; I then loaded the intended theory (all ADRs + CLAUDE.md + AGENTS.md) and diffed. Every seam below was **verified by me against the code** (not just reported by an agent).

**Next session focus (from the user):** Take these findings into brainstorming + planning. Each directional seam is itemized below with enough detail to act. Nothing here is fixed yet — these are decisions for the human to make.

---

## How to read this doc

- **Direction A = doc is stale, code is right** → fix the doc.
- **Direction B = code drifted below what the ADR promises** → fix the code (or consciously update the ADR to match reality).
- **Seams = the code itself forks** (two readings from one artifact) → a design decision is owed; may need a new/updated ADR.

Intended-theory sources (reference, do not re-summarize): `docs/adr/*` (read `README.md` first), `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`. Supersession: **0016→0019**; **0002/0017 amended by 0019**; **0008** self-amended 2026-06-07; **0006** self-amended 2026-06-04.

**IGNORE as intent** (they are plans/reviews, not authoritative — they corroborate but don't bind): `docs/superpowers/plans/*`, `docs/reviews/*`.

---

## Direction A — doc stale, code right (low-risk doc fixes)

| ID | File to fix | Current (wrong) text | Reality in code |
|----|-------------|----------------------|-----------------|
| **A1** | `CLAUDE.md` (Architecture → "Random vs interactive vs manual" para) | bins call `anchorCwdToWorkspaceRoot()` | That fn **does not exist**. Bins thread `workspaceConsultationsDir()` → `apps/cli/src/{hexagram,random,manual,interactive,history}.ts`. Matches **ADR-0020** + `CONTEXT.md`. |
| **A2** | `docs/adr/0011-manual-casting-flow-design.md` "Where it's enforced" | `packages/casting-ui/src/manual-validation.ts` | Lives at `domain/core/src/manual-validation.ts` (ADR-0019 hoist). |
| **A3** | `docs/adr/0011-…md` ("~34 rows / the 34-row floor", two spots incl. Consequences) | "~34 terminal rows" | Code: `MANUAL_MIN_TERMINAL_ROWS = 32` (`apps/cli/src/manual.ts:29`). ADR-0010 amendment already says 32 → **0010 and 0011 contradict each other**; 0011 is the wrong one. |
| **A4** | `docs/adr/0003`, `docs/adr/0017`, AND `CLAUDE.md` (Build section) | "core ships **seven** entries" | Ships **ten** subpaths: adds `casting-derivation`, `line-semantics`, `manual-validation`. Verify: `grep -oE '"\./[a-z-]+"' domain/core/package.json`. |
| **A5** | `CLAUDE.md` (uses `SplitRecord.max` throughout, e.g. the casting-invariant blockquote) | field called `max` | Field is **`recordedMax`** (`domain/core/src/types.ts:98`); on-disk YAML key is `recordedMax`; pinned by `domain/consultation-file/tests/recorded-max-rename.test.ts` ("the lying `max:` key"). **ADR-0008 is already correct**; only CLAUDE.md lags. |
| **A6** | `CLAUDE.md` (consultation-file package blurb) | subpaths "`index, file, markdown, legacy`" | Actual: `index, file, frontmatter, legacy-converter, markdown`. ADR-0003 is correct. |
| **A7** | ~12 ADRs' "Where it's enforced" lists | `packages/*` paths | Tree is `domain/*` / `cli/*` / `apps/*` (ADR-0019). Only **0010** self-flags. Cosmetic but pervasive. Candidates: 0002,0003,0004,0006,0007,0009,0011,0012,0013,0015,0016,0017. |
| **A8** | `cli/viewer-core/src/viewer-layout.ts:9` comment | references a `boundaries:check` script | Script gone; enforcement is ESLint `no-restricted-imports` (ADR-0019 records the dependency-cruiser→ESLint move). |

**A-cluster decision for brainstorm:** batch as one "doc-truth sweep" commit, OR fold the substantive ones (A1, A4, A5) into the relevant code-fix PRs so the doc and code move together. A2/A3/A7/A8 are pure doc.

---

## Direction B — code drifted BELOW what the ADR promises (real code decisions)

Each is verified. For each: the promise, the actual behavior, the file:line, the blast radius, and the open question for planning.

### B1 — Playground save bypasses repo-root anchoring (violates ADR-0020)
- **Promise (ADR-0020):** every save-producing bin computes + threads `workspaceConsultationsDir()`; "No bin mutates `process.cwd()`"; saves land in `<repo-root>/consultations` regardless of cwd.
- **Actual:** `apps/cli/src/playground.ts` calls `runPlaygroundApp()` with **no dir**; `cli/playground-ui/src/run-playground-app.ts` renders `<PlaygroundApp>` with **no `saveDir`** prop; `playground-app.tsx` only sets `params.dir` when `saveDir !== undefined`, so it falls through to cwd-based `defaultConsultationsDir()` (`domain/consultation-file/src/file.ts`).
- **Blast radius:** invisible when run from repo root (paths coincide); a playground save from a subdirectory lands in `<subdir>/consultations`. The `saveDir` prop already exists (tests inject it) — the production run-entry just never wires it.
- **Open question:** thread `workspaceConsultationsDir()` through `runPlaygroundApp` → `PlaygroundApp` (mirrors history/casting bins). One-liner-ish; needs a test asserting the threaded dir. Confirm no other bin has the same gap.

### B2 — A second authority mints IR `media` literals (contradicts ADR-0018 "sole owner")
- **Promise (ADR-0018):** `buildConsultationView` is "the sole owner of visibility"; serializers filter on `media`, they don't decide it.
- **Actual:** `cli/readout/src/output-composers.ts:65-80` (`buildPartialCastingSections`) hand-constructs `{ kind:'query', media:['ansi'], … }` and `{ kind:'casting', media:['ansi'], rows }` for the mid-flow render, bypassing `buildConsultationView`. Comment calls it "honest and inert."
- **Blast radius:** small today (mid-flow ANSI only), but it's a precedent that erodes the single-owner invariant.
- **Open question:** can the mid-flow render go through a `buildConsultationView` subset (like the playground does) so `media` has one home? Or formally document this as a sanctioned exception in ADR-0018?

### B3 — Per-line reading text is derived twice and the two derivations DISAGREE
- **Promise (ADR-0018 / ADR-0019):** one IR is the single home of consultation presentation knowledge; renderers are thin.
- **Actual:** the playground's hexagram *display* correctly consumes the IR subset (`hexagramIdentity`/`hexagramDiagramRows` from `domain/consultation-view/src/build-view.ts`). BUT the playground **readings panel** (`cli/playground-ui/src/readings-panel.tsx:65-98`, `buildContent`) reads `getHexagramRecord(...).Text.Chinese.Traditional…` + `…English.WilhelmBaynes…` directly — **only 2 of 4 language variants**. The IR's `oneMovingLineVariants` (`build-view.ts:111-138`) derives the same "moving-line reading" knowledge with **all 4** variants. Same knowledge, two encodings, already drifted on variant count.
- **Related (same seam):** standing-vs-emerging two-column **coloring** is hand-mirrored — `cli/playground-ui/src/playground-display-rows.ts:38-39,76-77` ("Mirror `transformationSection`'s colour scheme") re-implements what `cli/readout/src/serialize-ansi.ts` (`serializeTransformationAnsi`) owns. Column *geometry* IS single-sourced (proven `=46` via `playground-display-geometry.ts`); only coloring is duplicated. **No test pins playground display against the transformation serializer** — drift is silent.
- **Open question:** is the playground's 2-variant subset *intended* (it's a live explorer, not a full readout) or drift? If intended, the IR should expose a variant-count-parameterized sub-builder so both flow from one place. If drift, unify on the IR's 4-variant derivation. Either way add a parity test for the coloring.

### B4 — "Rendered-width single home" is only partially enforced
- **Promise (ADR-0019):** only `cli/viewer-core` measures rendered width; `string-width` is lint-fenced (`eslint.config.js` ban scoped to `cli/**` except `viewer-core`); everyone else uses `terminalWidth`.
- **Actual:** `string-width` fence holds (verified: only `viewer-core/src` imports it; the other hits are test files). BUT `slice-ansi`/`wrap-ansi` — also rendered-width operations — are imported **directly** by `cli/playground-ui/src/hexagram-display.tsx`, `cli/readout/src/consultation-readout.tsx`, `cli/casting-ui/src/slider-prompt.tsx`, `cli/casting-ui/src/manual-prompt.tsx`, all bypassing viewer-core. PLUS a **second CJK-width impl** exists: `domain/text-layout` `visualWidth` (hand-rolled codepoint ranges, **ANSI-unaware**) vs `viewer-core/viewer-layout.ts` `terminalWidth` (→ `string-width`, **ANSI-aware**). Saved `.md` uses `visualWidth`; the live viewer uses `terminalWidth` — a glyph the two disagree on renders misaligned between file and screen.
- **Open question:** is the `string-width`-only fence deliberate (measure vs slice/wrap are different ops) or an oversight? Should `slice-ansi`/`wrap-ansi` also route through viewer-core? Is the dual width impl a genuine raw-vs-ANSI split (documented as such at `viewer-layout.ts:10-11`) or latent misalignment risk? This one is **genuinely ambiguous** — needs a human ruling, not just a fix.

### B5 — History self-heal silently drops the casting-absence reason from the body
- **Promise (ADR-0008):** body is decorative, re-rendered from the envelope on load; self-heal rewrites if drifted; "data unchanged."
- **Actual:** save path `domain/consultation-file/src/file.ts:72-76` renders the body **with** `absenceReason` (4th arg). History self-heal `cli/history-ui/src/history-app.tsx:25-29` (`rerenderOnDisk`) calls `markdownConsultationBody` with **only 3 args** → `absenceReason` defaults to `null` (`domain/consultation-file/src/markdown.ts:22`). So `serialize-markdown.ts` emits bare `_Casting not recorded._` instead of `…(playground exploration)`. On-screen readout DOES pass `envelope.castingAbsence` (`history-app.tsx:266`), so **screen and disk disagree**.
- **Consequence:** first history-load of ANY `casting:null` file (playground / legacy-absent) drifts → rewrite → footer says "✓ Body refreshed; data unchanged." Frontmatter `castingAbsence` IS preserved (canonical model intact), so "data unchanged" is *technically* defensible (body is decorative) — but the body is lossily downgraded. **The test masks it:** `writeFresh` in `cli/history-ui/tests/history-app.test.tsx:158-163` also omits the reason, so fixture and code agree with each other but neither matches the save path. No test asserts post-rewrite on-disk body == saved body.
- **Open question:** clearly a one-line fix (pass `envelope.castingAbsence` into `rerenderOnDisk`'s `markdownConsultationBody` call) + a round-trip test (save → load → assert body byte-identical). Low-risk, high-clarity. Likely the first thing to do.

---

## Seams — the code forks (design decisions owed)

These are NOT bugs per se — they are spots where two competent readers infer different intent. Itemized for the brainstorm. Convergence count = how many of the 5 cold runs independently hit it (higher = more legibly present; the single-run ones are the *hidden* forks).

### S1 — The oracle is knowingly NON-CANONICAL (deepest seam; 1 run)
- **Where:** `domain/core/tests/random-casting.test.ts` distribution-test comment.
- **The fork:** the never-zero-remainder clamp (the codebase's central single-sourced invariant — `selectablePickMax` / `assertSelectablePick`) produces a line distribution that **drifts ~1-3pp from canonical Wilhelm-Baynes** (line 6 ≈4.8% vs 6.25%). The test comment states this outright and says "the competing canonical interpretation treats an empty pile as 'set aside 4'," then **widens the assertion bands to accept either reading.**
- **Why it matters:** ADR-0006 presents the clamp as settled ritual law (揲之以四, "remainder never 0") with **no mention** that this is a contested divination-correctness choice. The intended theory ("never-zero is correct") and de-facto theory ("never-zero is *a* choice that knowingly skews the oracle") diverge, and the divergence is recorded ONLY in a test comment.
- **Decision owed (human, not agent):** is the ~1-3pp skew acceptable? If yes → record the alternative + the choice in ADR-0006 so it stops living in a band width. If no → this is an algorithm change with statistical re-validation. **Put this in front of the human first** — it's the only correctness-of-the-divination item.

### S2 — `recordedMax`: one number, three names that mislead (4–5 runs)
- **Where:** `domain/core/src/index.ts:189,197`; `domain/core/src/casting-derivation.ts:24,35`.
- **The fork:** `recordedMax = unparted−1`; `selectablePickMax = recordedMax−1`; `stalkCountFor = recordedMax+1`; and `maxPickFor()` returns `recordedMax` while its comment says it is "NOT the selectable ceiling." A reader who reads "max pick" as "the max pick you may make" is off by one. The mislead is patched with prose, not a rename.
- **Decision owed:** rename for legibility (e.g. `recordedMax`→`reservedCeiling`? `maxPickFor`→`recordedMaxFor`?) vs leave it (renames ripple to the on-disk YAML key — `recorded-max-rename.test.ts` shows a prior rename was done WITHOUT a schemaVersion bump, so old files break). High legibility payoff, real migration cost.

### S3 — Type/disk contract is WIDER than the runtime invariant (4 runs)
- **Where:** `domain/core/src/types.ts:98` (`SplitRecord` allows `{pick: recordedMax}`); `:71` (`schemaVersion: number` but only `1` loads — `frontmatter.ts:150` hard-rejects others, no migration branch exists).
- **The fork:** the type system advertises a wider domain than the runtime enforces. "The types sketch the shape; runtime guards + ~5 clamping call-sites carry the real contract." A reader trusting the types infers a wrong, wider contract.
- **Decision owed:** tighten types (branded `SelectablePick`? literal `schemaVersion: 1`?) vs accept the gap as the cost of an opaque-passthrough YAML converter.

### S4 — `deriveSplit` tolerant vs `performCast` strict, about the same degenerate split (2–3 runs)
- **Where:** `domain/core/src/casting-derivation.ts` (`deriveSplit` renders `pick===recordedMax`, remainder 0) vs `performCast`/`assertSelectablePick` (throws on it). Legacy replay *discards* such records, so the tolerance is **effectively dead for real inputs** (the "it's for legacy data" rationale is false — verified).
- **Decision owed:** is `deriveSplit`'s tolerance load-bearing for any path? If not, document it as display-only dead tolerance or remove it.

### S5 — The IR's section TOPOLOGY is medium-aware (all 5 runs)
- **Where:** `domain/consultation-view/src/build-view.ts:185-212`.
- **The fork:** a static hexagram's scripture is emitted as section `text:hexagram` (ANSI-only) AND `text:lines:none` (Markdown-only) — same words, two section identities — purely to reproduce each medium's legacy byte layout. The `media` flag is honored, but the section *topology* is not medium-neutral. "One IR, dumb serializers" vs "the IR carries two medium-specific section schemes." The code names this as deliberate; it's the cleanest example of byte-compat pulling against IR purity.
- **Decision owed:** accept as a documented exception (it already is) vs refactor so one section + serializer-side placement handles it.

### S6 — Provenance is BOTH "not a concept" AND "a required field" (4 runs)
- **Where:** `saveConsultationFile` (`file.ts:63`) requires `castingAbsence` iff `casting===null`; `build-view.ts:233` guardrail forbids a reason leaking into a present-casting render; three `casting:null` origins (`domain/core/src/types.ts:121`) are structurally identical, re-split only by the soft field; `frontmatter.ts:170` **defaults missing `castingAbsence` to `legacy-no-table`** on read.
- **The fork:** ADR-0011 "no provenance field" (real casts) vs ADR-0008 amendment "compulsory reason" (absences). Coherent on paper, but: a `playground`/`legacy-unreplayable` file that loses its key **silently becomes `legacy-no-table`**. Reliable only while the key survives — and B5 above is exactly a path that downgrades the body (though not the frontmatter key).
- **Decision owed:** is the read-time default safe given B5? Should the default be a distinct `unknown`/`unspecified` rather than silently collapsing to `legacy-no-table`?

### S7 — Asymmetric casting validation: `.md` shape-only, legacy `.txt` replay-checked (1 run)
- **Where:** `frontmatter.ts:177-183` accepts any structurally-valid `casting` (pure shape check, no replay against the hexagram); replay-validation lives ONLY in `legacy-converter.ts` (`castingReplaysTo`).
- **The fork:** a hand-edited / corrupted `.md` with a well-shaped but physically-impossible casting loads and renders a trusted ledger; the same data via legacy `.txt` is rejected as `legacy-unreplayable`. "The casting is validated" is true at one boundary, false at the other.
- **Decision owed:** should `.md` load also replay-validate (consistency), or is shape-check-only deliberate (legacy is untrusted input, `.md` is our own output)?

### S8 — `BouncingSliderStore` is a mutable OOP island in a pure-reducer codebase (1 run)
- **Where:** `cli/casting-ui/src/bouncing-slider-store.ts` (a `class`, mutable `position`/`direction`/`committed`, `setInterval`) vs `viewer-flow.ts` / `playground-state.ts` / `nav-machine.ts` (all pure total reducers).
- **The fork:** justified as a `useSyncExternalStore` backing store, but it's a second state-management theory. A reader expecting "all flow state is a pure reducer" is surprised.
- **Decision owed:** accept (it's an animation store, genuinely different) vs document the boundary so it reads as intentional.

### S9 — Barrels coexist with the per-subpath `exports` discipline (2 runs)
- **Where:** `domain/core` = 10 concrete subpaths, no public barrel; but `domain/consultation-file/src/index.ts` and `cli/readout/src/index.ts` ARE barrels reachable as `.`. Consumers split: `file`-subpath imports (viewer, log-and-save) vs barrel-root imports (playground-app, history-app).
- **The fork:** two import conventions for the same symbols. (Note the `jiechao-toolkit:no-barrel-files` skill is the relevant standard.)
- **Decision owed:** standardize on concrete-subpath imports + drop the barrels, or sanction the barrel for these two packages.

### S10 — `Yin/Yang` type aliases inverted vs runtime (1 run; behaviorally inert)
- **Where:** `domain/core/src/models/foundation.ts:1-2` `type Yin='1'; type Yang='2'` vs `getters.ts:10-13` (yang 7,9→`1`; yin 6,8→`2`) and `LOWER_TRIGRAM_KEYS` (`T111`=Qian=all-yang). Runtime is `1`=yang; CLAUDE.md agrees with runtime; the alias is the lie.
- **The fork:** purely cosmetic (the aliases only seed a template-literal type), but a reader trusting the named type infers the opposite of the truth.
- **Decision owed:** trivial — swap the alias names (or delete them and inline `'1'|'2'` with a correct comment). Zero behavior change.

### Minor (1 run each, low stakes)
- **S11** — `string-width` declared in `cli/readout` + `cli/casting-ui` `package.json` `dependencies` but lint-banned + unused in their `src` (vestigial dep). Remove.
- **S12** — `isLineIndex` (`types.ts:43-44`) keeps a provably-redundant `value !== -1` clause "for fidelity to the former guard." Dead logic preserved as documentation.
- **S13** — `performCast` belt-and-suspenders: type excludes `'3rd-cast'` AND body throws on it; `viewer-flow.ts:126-130` writes a placeholder to satisfy the type-total branch. Who owns the invariant — type or runtime? (Defensible; flag only.)
- **S14** — Boundary lint matches `cli/*` by exact package **name** only (`eslint.config.js`); a subpath import `@hexagram/readout/x` from `domain` would evade it. No such import today — **latent** gap. Consider a glob/pattern match.

---

## Suggested grouping for planning (my read — not a decision)

1. **Quick + safe, do first:** B5 (self-heal reason drop, +round-trip test), B1 (playground anchoring), S10 (alias swap), S11/S12 (dead code), the A-cluster doc sweep.
2. **Needs a human ruling before any code:** S1 (non-canonical oracle — *the* headline), B4 (width-boundary scope + dual CJK impl), S6/S7 (provenance default + validation asymmetry).
3. **Legibility refactors with migration cost:** S2/S3 (recordedMax naming + type tightening — touches on-disk format), S9 (barrels), B2/B3/S5 (IR single-owner + playground unification).

---

## Suggested skills for the next session

- **`superpowers:brainstorming`** — MANDATORY first, before any code. The user explicitly wants brainstorming + planning. Several items (S1, B4, S6, S7) are design decisions the human must own.
- **`jiechao-toolkit:grill-with-docs`** — stress-test the chosen plan against `CONTEXT.md` + the ADRs, and update docs inline (directly addresses the Direction-A doc-truth debt + the "record the decision" need for S1/S5).
- **`jiechao-toolkit:authoring-adrs`** — S1 (non-canonical oracle), S5 (medium-aware IR topology), B2 (sanctioned `media` exception) each warrant a new/updated ADR; the alternatives are real and the choices hard to reverse.
- **`superpowers:writing-plans`** then **`jiechao-toolkit:reviewable-changes`** / **`jiechao-toolkit:design-first-tracer-bullet`** — once decisions are made, slice into small single-intent diffs (repo convention: ~400 LOC, one intent — see `AGENTS.md`).
- **`jiechao-toolkit:capturing-commit-intent`** — every fix here has a WHY (a seam/ADR drift); commits should record it.
- **`jiechao-toolkit:no-barrel-files`** — the standard for S9.
- **`tdd` / `superpowers:test-driven-development`** — B5 and B3 specifically need parity/round-trip tests that don't currently exist (the missing tests are part of why the drift went unnoticed).

## Verification commands (sanity-check the findings)

```bash
# A1: anchorCwdToWorkspaceRoot is gone; bins thread the dir
grep -rn "anchorCwdToWorkspaceRoot\|workspaceConsultationsDir" apps/cli/src
# A4: core ships ten subpaths
grep -oE '"\./[a-z-]+"' domain/core/package.json | sort -u
# B1: playground passes no dir
sed -n '1,40p' apps/cli/src/playground.ts cli/playground-ui/src/run-playground-app.ts
# B5: self-heal omits the 4th arg
sed -n '21,35p' cli/history-ui/src/history-app.tsx     # 3 args
grep -n "markdownConsultationBody\|castingAbsence" domain/consultation-file/src/file.ts  # 4 args on save
# B4: only string-width is fenced; slice/wrap leak
grep -rln "from 'slice-ansi'\|from 'wrap-ansi'" cli/ | grep -v node_modules
# S1: the skew is admitted in a test comment
sed -n '95,120p' domain/core/tests/random-casting.test.ts
# S10: alias vs runtime
sed -n '1,5p' domain/core/src/models/foundation.ts ; sed -n '9,14p' domain/core/src/getters.ts
```

---

*This doc is the actionable extract (seams + directional diffs) of a k=5 conformance-mode theory reconstruction (`jiechao-toolkit:theory-reconstruction`). The full assembled report — coverage, prior-contamination, de-facto theory, and the per-run convergence/variance analysis — was produced in the originating session and is not reproduced here; everything needed to act is below. The variance headline worth carrying forward: the backbone is highly legible (all 5 runs agreed), but **every verified defect was a single-lens finding** — i.e. the code hides exactly the spots that need fixing, so trust the itemization here over any one maintainer's mental model.*
