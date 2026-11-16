# AGENTS.md

Vendor-agnostic guidance to agents

## Agent skills

### Issue tracker

Issues and PRDs are tracked as GitHub issues in `limjiechao/ts-hexagram-generator`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical triage vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`. The architecture decisions are indexed in `docs/adr/README.md`.

## Engineering Guidelines: Legible Change

These rules exist so a reviewer can verify a change in one pass and a future
maintainer can reconstruct WHY months later. You (the agent) write code
effortlessly; humans pay the cost of reading it. Optimize for the reader.

### 1. Design before build — the human owns the theory

Before generating non-trivial code, state in 2–4 sentences: the intent, the
approach, the key assumptions, and what you are deliberately NOT doing. If the
task lacks a clear design and you are inventing one, STOP and ask the human to
confirm the design first. (You average over millions of codebases; you cannot
originate one coherent design vision — the human must supply it.)
Rationale: a system must reflect one mind's design (Brooks, conceptual integrity).

### 2. Small, single-intent diffs

One change should do one thing. If a diff mixes refactor + feature + fix, split
it. Target reviewability, not completeness. If a change exceeds ~400 lines or
touches many unrelated files, propose a sequence of smaller changes instead.
Rationale: reviewer cognitive load rises sharply with diff size; defect-finding
drops off above ~400 LOC.

### 3. Capture the WHY where it is cheapest — now

Every commit message states why the change exists and what problem it solves,
not just what changed. Add a comment ONLY for non-obvious rationale — the thing
that was in your head but isn't in the code (constraints, trade-offs, why-not-X).
Never comment what the code already says.
Rationale: the program's real meaning is a theory humans must rebuild from your
artifacts (Naur); you hold no persistent theory, so externalize it at generation.

### 4. Locality and orthogonality

Prefer changes that can be understood in isolation. Don't create dependencies
that make one edit ripple across the system. If your change forces edits in
several distant places, the design is wrong — surface that, don't paper over it.
Rationale: orthogonality + low change-amplification = one-pass reviewability.

### 5. DRY means knowledge, not characters

Do not duplicate a piece of KNOWLEDGE (a rule, a decision, a format). Before
adding code, search for an existing function/representation and reuse it. But do
NOT abstract two things that merely look alike — duplicated code is fine when it
encodes different knowledge. When unsure, leave it duplicated and flag it.
Rationale: DRY is about single authoritative representation of knowledge
(Hunt & Thomas); premature abstraction is its own legibility cost.

### 6. No unrequested generality

Build what was asked, simply. Do not add configuration, extension points,
speculative abstractions, or "future-proofing" no one requested. Prefer the
boring, conventional solution that behaves the way a reader expects.
Rationale: the second-system effect (Brooks) — over-engineering is your default
failure mode; least surprise (Hunt & Thomas) lowers reader load.

### 7. Make it reversible; verify before you trust

Prefer changes that are easy to undo. Always supply the means to verify
correctness (a test, a command, a reproduction). If you cannot verify it, say so
explicitly rather than presenting it as done.
Rationale: reversibility + verification protect the human's ability to stay in
control of a theory they did not write.

### Boundary: judgment stays human

These rules constrain you; they do not replace the engineer's judgment. When a
rule conflicts with what clearly makes this codebase more maintainable, follow
the local convention and say why. Do not follow these rules so literally that
you suppress the local craft of this codebase.

## How we build

The overhaul is built the way ADR-0036 records. In short: **the owner is the
sole architect; agents execute and check, but never decide; the written library
is the team's memory.**

- **Decision tiers.**
  - **Tier A (owner only):** glossary terms and _Avoid_ lists, ADRs, public
    types and port and use-case signatures, context and package boundaries and
    dependency rules, new runtime dependencies, error and exit policy, feature
    scope, acceptance tests and byte fixtures, and cross-module conventions. It
    is ratified **before** any code that depends on it.
  - **Tier B:** inside one module, checked by a reviewer.
  - **Tier C:** tooling, on the owner's request.

  If you meet an undecided Tier-A question, **stop and ask**. Do not decide it.

- **The clerk's records.** `MATTERS.md` tracks the work (each slice is a Matter).
  `RULINGS.md` holds the owner's binding answers. `MINUTES.md` is the append-only
  log. The orchestrator prompt is `docs/agents/clerk.md`.
- **The library has three tiers.**
  - **Authoritative:** `CONTEXT.md`, accepted ADRs, `RULINGS.md`, and ratified
    type and port files.
  - **Derivative:** `docs/design/`.
  - **Ephemeral:** plans, handoffs, reviews, logs, `docs/legacy-architecture.md`.

  Source comments cite only ADRs and glossary terms, never ephemeral material.

- **Where to read.**
  - `CONTEXT.md`: the language.
  - `docs/adr/README.md`: the decisions.
  - `docs/design/`: the models.
  - `docs/legacy-architecture.md`: the pre-overhaul code that the bug loop
    still maintains.

## Data hygiene — DO NOT commit personal data

The `consultations/` directory is gitignored because saved readings may
contain private or identifying details from real consultations. NEVER:

- Copy a real consultation into a fixture, doc, example, or comment.
- Author a fixture query that includes real-world identifying details.
  Use invented names and generic scenarios — see `cli/text-grid/tests/fixtures/cases.ts`
  for the generic style, and the `legacy-real-*.txt` corpus for the
  fictional-but-scenario-rich style (Greyfen Hold, Steward Aelric, etc.).
- Paste a snippet from `consultations/` into a commit message, PR body,
  issue, ADR, comment, or chat transcript that lands in the repo.

If you find personal data in a fixture or doc, treat it as a leak: scrub
the working tree AND flag it to the user so they can plan a history
rewrite — do not assume the leak is contained to the current commit.

## Commands

All commands run from the worktree root unless noted. Most fan out across packages via Turborepo.

```bash
pnpm install            # install + link the workspace packages
pnpm build              # turbo run build (tsdown per package, topological order)
pnpm test               # turbo run test (vitest per package)
pnpm type:check         # turbo run type:check (tsc --noEmit per package)
pnpm lint:check         # oxlint + eslint at root (walks the whole tree)
pnpm lint:fix           # same with auto-fix
pnpm format:check       # oxfmt --check at root
pnpm format:fix         # oxfmt --write at root

# Run the CLIs directly (no build needed — tsx + the `source` exports condition)
pnpm hexagram-random        # tsx apps/cli/src/random.ts
pnpm hexagram-interactive   # tsx apps/cli/src/interactive.ts
pnpm hexagram-manual        # tsx apps/cli/src/manual.ts (Ink-only 4-field piles + remainder prompt with conservation + suspended validation)
pnpm hexagram-playground    # tsx apps/cli/src/playground.ts (Ink-only 4-state line explorer)
pnpm hexagram-history                   # tsx apps/cli/src/history.ts (Ink-only browser for past consultations)
pnpm hexagram-history --convert-legacy  # one-shot migration of legacy .txt → .md

# hexagram-random and hexagram-interactive default to a full-screen tabbed viewer;
# append `-- --plain` (or `-- --no-ui`) for the classic scrolling console output.
# `-- --wrap-width <n>` caps the viewer's content wrap width (default 120).
# `-- --numeric-input` switches the interactive casting prompt from the
# default bouncing slider back to the legacy typed-number input.
# `-- --slider-sweep-ms <n>` sets the constant end-to-end sweep duration
# (in ms) for the bouncing slider; per-cast tickMs is derived as
# `sweepMs / max(1, max - min)` and clamped to [30, 250] ms (default 1800).
# The slider is also force-overridden to typed input when `NO_COLOR=1` or
# `CI=true` is set, so screen-reader and automation environments don't get
# stuck watching a moving cursor (non-TTY stdout already routes to plain).
# hexagram-history does NOT have a --plain mode — it is Ink-only and exits
# with an error message and code 1 in non-TTY contexts. hexagram-manual is
# also Ink-only and shares the same non-TTY guard; it honours
# `--wrap-width <n>` and `--manual-reveal-ms <n>` — the latter sets the
# post-Enter "Round resolved" green-row dwell (in ms, default 2500; tests
# can opt out via `manualRevealMs={0}` on the viewer). No `--plain`, no
# `--numeric-input`, no slider knobs — the manual prompt is its own input
# branch.

# Per-package operations (use --filter for a single package)
pnpm --filter @hexagram/core test
pnpm --filter @hexagram/casting-ui build
pnpm --filter @hexagram/core type:check

# Regenerate JSON data files after changing hexagram/trigram TypeScript sources
pnpm generate-json-files    # turbo run generate-json-files --filter=@hexagram/core

# Regenerate the plain-output test fixtures after changing a section builder
pnpm generate-fixtures      # turbo run generate-fixtures --filter=@hexagram/casting-ui
```

The statistical distribution test (the `rng distribution (slow)` block in `domain/core/tests/random-casting.test.ts`) runs 1,000,000 iterations and carries a 90-second per-test timeout — it is slow by design (~40 s) and runs on every `pnpm test` invocation. Factor this in when wiring CI. To skip it locally, use `pnpm --filter @hexagram/core test --exclude tests/random-casting.test.ts` (or `pnpm --filter @hexagram/core test -t '^(?!rng distribution \(slow\))'` to drop only the slow describe block). Do not insert a `--` before the flags: pnpm forwards it literally and vitest then ignores them. See `docs/adr/0013-test-execution-and-ci-posture.md`.

### CI simulation

The May 2026 9-round stabilisation (`777cb51` → `b99f877`) showed that the "load-induced" tier of flakes (rounds 4–6) is invisible on a quiet macOS dev box. Three scripts reproduce the 2-CPU contention an Ubuntu GHA runner sees:

```bash
pnpm test:flake          # 5× chained `turbo run test --force` (whole suite re-runs end-to-end)
pnpm test:stress         # 4× concurrent test:flake (saturates CPU; the strongest signal)
pnpm test:stress:once    # 4× concurrent single-pass test (cheaper)
```

Reach for them before pushing a race-condition fix, before merging an Ink component change, or when triaging an intermittent CI failure. On a quiet box `test:stress` can take 5–10 minutes; `test:stress:once` is closer to 2–3 minutes. All three use the `concurrently` runner — pure JS, no Docker or platform-specific binaries.
