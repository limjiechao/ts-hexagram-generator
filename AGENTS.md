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

## Repository layout

This is a **Turborepo + pnpm-workspaces monorepo**. The root is private; published packages live under `packages/*` and CLI bins under `apps/*`.

```
ts-hexagram-generator/         # workspace root (private)
├── packages/
│   ├── core/                  # @hexagram/core — type vocabulary (./types), algorithm, random, getters, hexagram/trigram records
│   ├── consultation-file/     # @hexagram/consultation-file — file format (Markdown + YAML frontmatter), renderers, legacy converter
│   ├── viewer-core/           # @hexagram/viewer-core — generic terminal-UI primitives (ScreenShell, palette, chrome, keymap, layout, line glyphs)
│   ├── readout/               # @hexagram/readout — Consultation Readout renderer (ConsultationReadout + per-section ANSI string builders)
│   ├── casting-ui/            # @hexagram/casting-ui — Ink casting viewer + interactive/manual flows, plain-mode renderers
│   ├── history-ui/            # @hexagram/history-ui — Ink history browser
│   ├── playground-ui/         # @hexagram/playground-ui — Ink interactive playground (4-state line explorer)
│   ├── shell/                 # @hexagram/shell — Home hub aggregating the casting/history/playground UIs
│   └── test-utils/            # @hexagram/test-utils (private, dev-only) — polling + readiness-witness test helpers
└── apps/
    └── cli/                   # @hexagram/bin (private) — hexagram + hexagram-random + hexagram-interactive + hexagram-manual + hexagram-history + hexagram-playground bins
```

The decision behind this decomposition (and the dependency DAG) is recorded in `docs/adr/0002-monorepo-structure-and-package-decomposition.md`; see `docs/adr/` for the full set of architecture decisions.

Library packages publish via `package.json#exports` only (no `main`/`module`/`types`). Each entry carries `source` / `types` / `import` conditions: `source` (`./src/index.ts`) for `tsx`/`vitest` no-build dev, `types` (`./dist/*.d.mts`) and `import` (`./dist/*.mjs`) for consumers.

## Data hygiene — DO NOT commit personal data

The `consultations/` directory is gitignored because saved readings may
contain private or identifying details from real consultations. NEVER:

- Copy a real consultation into a fixture, doc, example, or comment.
- Author a fixture query that includes real-world identifying details.
  Use invented names and generic scenarios — see `packages/consultation-file/tests/fixtures/cases.ts`
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

The statistical distribution test (the `rng distribution (slow)` block in `packages/core/tests/random-casting.test.ts`) runs 1,000,000 iterations and carries a 90-second per-test timeout — it is slow by design (~40 s) and runs on every `pnpm test` invocation. Factor this in when wiring CI. To skip it locally, use `pnpm --filter @hexagram/core test -- --exclude tests/random-casting.test.ts` (or `pnpm --filter @hexagram/core test -- -t '^(?!rng distribution \(slow\))'` to drop only the slow describe block). See `docs/adr/0013-test-execution-and-ci-posture.md`.

### CI simulation

The May 2026 9-round stabilisation (`4eae942` → `800d3fc`) showed that the "load-induced" tier of flakes (rounds 4–6) is invisible on a quiet macOS dev box. Three scripts reproduce the 2-CPU contention an Ubuntu GHA runner sees:

```bash
pnpm test:flake          # 5× chained `turbo run test --force` (whole suite re-runs end-to-end)
pnpm test:stress         # 4× concurrent test:flake (saturates CPU; the strongest signal)
pnpm test:stress:once    # 4× concurrent single-pass test (cheaper)
```

Reach for them before pushing a race-condition fix, before merging an Ink component change, or when triaging an intermittent CI failure. On a quiet box `test:stress` can take 5–10 minutes; `test:stress:once` is closer to 2–3 minutes. All three use the `concurrently` runner — pure JS, no Docker or platform-specific binaries.

## Architecture

### Core algorithm — `@hexagram/core`

`packages/core/src/index.ts` models the traditional yarrow stalk divination procedure. The four operations (四營) are implemented as a pure function pipeline:

```
partTheStalks → suspendOneFromTheRight → sortLeftAndRightIntoFours → setAsideRemainderFromSortedLeftAndRight
```

`makeLineGenerator` is a synchronous generator that runs this pipeline three times (三變成爻) and yields a `FourOperationsResult` after each round, receiving the next `partStalksAtIndex` via `generator.next(index)`. After all three rounds, it returns a `Line` (6 | 7 | 8 | 9). `packages/core/src/index.ts` exposes the runtime algorithm (`makeLineGenerator`, `stalksBeforeParting`, etc.); types like `Line`, `Hexagram`, and `CastingRecord` are imported from `@hexagram/core/types` (the vocabulary ships as a subpath of `core`).

**Line semantics:**

- `7` = young yang (solid, static)
- `8` = young yin (broken, static)
- `6` = old yin / moving yin (broken, changes to yang)
- `9` = old yang / moving yang (solid, changes to yin)

Lines 6 and 9 are "moving lines". The emerging hexagram is obtained by flipping them: 6→7, 9→8.

### Random vs. interactive vs. manual

- **`packages/core/src/random-casting.ts`** — drives `makeLineGenerator` with `node:crypto.randomInt` splits; exports `generateRandomHexagram()` and `generateRandomHexagrams()` for use as a library, plus `generateRandomConsultation()` which also returns the casting record. Pure library code — no CLI entry.
- **`packages/casting-ui/src/interactive-flow.ts`** — same generator wired to `@inquirer/prompts` for the plain-mode terminal flow (`getHexagramViaInteraction`, `getOneLineViaInteraction`).
- **`apps/cli/src/{random,interactive,manual}.ts`** — the three bin entries. Each is a shebang + `main()` + top-level await, importing `generateRandomConsultation` from `@hexagram/core/random-casting` and the viewer + output helpers from `@hexagram/casting-ui`. The manual bin uses the thin `runManualConsultationViewer({ maxWrapWidth })` wrapper exposed by `@hexagram/casting-ui` and refuses non-TTY contexts outright (no `--plain` branch).

`@hexagram/core` also exposes `cryptoRandom()` at `@hexagram/core/crypto-random` — a `[0, 1)` float helper backed by `node:crypto.randomInt`. It's the production RNG behind the home banner's `<AnimatedBanner>` animation, replacing `Math.random` so no flow in the app depends on V8's pseudorandom generator.

Both CLIs capture the eighteen stalk divisions (3 per line × 6 lines) as a `CastingRecord` (`@hexagram/core/types`) — each `SplitRecord` pairs the index parted at (`pick`) with that round's selectable range (`max`). The per-line `splits` ride along on the generator's `LineGeneratorResult`. Output mode is decided by `resolveOutputMode()` in `packages/casting-ui/src/utils-mode.ts`:

> **Invariant — the pick never empties the right heap.** `SplitRecord.max` is the _recorded_ max (`stalks − 1`, reserving the suspended stalk 掛一), **not** the selectable ceiling. Any flow that lets a user (or RNG) choose a `pick` MUST clamp it to `selectablePickMax(max)` = `max − 1` (`@hexagram/core/casting-derivation`) so the right heap keeps a countable stalk after suspension and its division-by-four remainder stays 1..4, never 0. `performCast` enforces this at runtime via `assertSelectablePick`; never hand-roll the `− 1`, and never offer `max` as a pick. See [ADR-0006](docs/adr/0006-casting-algorithm-rewindable-core-and-randomness.md) and `docs/agents/casting-invariants.md`.

- **Ink viewer (default)** — a full-screen tabbed viewer (`packages/casting-ui/src/viewer.tsx`) with up to four tabs (Casting / Transformation / Standing Hexagram / Emerging Hexagram), opening on Casting, query pinned above and the saved-file path pinned below. Built on [Ink](https://github.com/vadimdemedes/ink); `runConsultationViewer({ flowKind, inputMode, maxWrapWidth, sliderSweepMs, sliderCommitRevealMs })` renders it on the alternate screen.

  The viewer owns a state machine (`packages/casting-ui/src/viewer-flow.ts`): `awaitingQuery → casting → computing → done`. On entry the query box is editable (an in-tab `<QueryEditor>`) and the Casting table is empty (`·` placeholder cells). Once the query is submitted:
  - **`flowKind: 'interactive'`** — a bordered `<CastingPromptBox>` (in `packages/casting-ui/src/casting-prompt-box.tsx`, with sibling input widgets `query-editor.tsx`, `number-input.tsx`, and shared primitives in `editor-primitives.tsx`) appears above the footer for each of the 18 splits in turn. The prompt's input widget is selected by `inputMode` (resolved from `--numeric-input` via `resolveInputMode()` in `packages/casting-ui/src/utils-mode.ts`):
    - **`inputMode: 'slider'`** (default) — a bouncing-slider cursor sweeps left↔right across the reachable-pick bar (1 cell = 1 value); the user presses **SPACE** to lock the current value as the `SplitRecord`. The reachable pick ceiling is one below the recorded `SplitRecord.max` (the viewer's `reachablePickMax = currentMax - 1`): `max` already reserves the right heap's suspended stalk (掛一), and reserving a second, countable stalk keeps its division-by-four remainder in 1..4 — never 0 (a heap divisible by four counts its last group as the remainder). The full recorded `max` is unchanged; the true stalk count rides along as the prompt's `stalksTotal`. The random and plain/typed Inquirer flows cap the pick the same way, matching the manual flow's `[1, max-1]` derived-split range. The per-cast tickMs is derived from `--slider-sweep-ms` so each end-to-end sweep takes roughly the same time regardless of the cast's stalk count. The title line reads verbatim `"Line N/6 · Cast C/3: — Press SPACE to part the stalks"`; bar and `Stalks: N | Left Heap: <glyph> | Right Heap: <glyph>` readout are both centred and stay anchored as the cursor moves, separated by blank spacer rows above and below the bar. The two Braille spinners counter-rotate (left clockwise, right anticlockwise) so the user sees lively motion without ever seeing the cursor's numeric value. On SPACE the cursor freezes on the chosen cell, the readout swaps the two spinner glyphs for the concrete `Left Heap: <pick> | Right Heap: <stalksTotal − 1 − pick>` (the `− 1` is the suspended stalk shown as the trailing `+ 1 suspended`; with the pick capped this is always ≥ 1), and the viewer auto-advances to the next cast after `SLIDER_COMMIT_REVEAL_MS` (≈1 s, set in `casting-prompt-box.tsx`; tests opt out by passing `0` via the viewer's `sliderCommitRevealMs` prop). The 18th cast (line 6 / cast 3) reveals the same way before the viewer transitions to `computing`. The casting prompt box is wrapped at the terminal's `innerCols` and never reflows — on narrow terminals (e.g. `--wrap-width 40`), `<` / `>` pans the prompt box horizontally. During casting (all flows — random, interactive, manual), ↑/↓/PgUp/PgDn/g/G scroll the Casting tab table vertically: the `CAN_SCROLL` keymap predicate in `packages/viewer-core/src/viewer-keymap.ts` shares the vertical-scroll bindings between the in-flight `casting` table and the unlocked `done` readout, so the table stays reachable when the prompt box occupies the lower rows; additionally, during casting the table **auto-follows** the line being cast — the viewer passes `autoScrollTarget` (the cast-1 content row from `castingTableFollowRow(lineIndex)`, exported by `@hexagram/readout`) to the readout, which pins that row near the bottom of the table viewport via a render-phase guard. `castingTableFollowRow` anchors the **just-completed** line (`lineIndex − 1`, clamped to line 1 at the bottom) rather than the active line: the third cast fills its cell and advances the line pointer in the same update, so pinning the new active line would scroll the just-filled result off before it is seen — anchoring the previous line keeps it on screen through the transition (the underlying `castingTableActiveRow(lineIndex)` primitive still exists). It re-pins once per distinct row (so the pin only moves on alternate line transitions) and yields to manual scrolling within a line. The bottom-align math lives in `packages/readout/src/auto-scroll-offset.ts` (`computeAutoScrollOffset`).
    - **`inputMode: 'number'`** — the legacy typed-`<NumberInput>` prompt; Enter commits, out-of-range values are rejected with an inline error.

    Each commit advances the per-line `makeLineGenerator` and fills the matching cell in the table. While casting is in flight, all non-Casting tabs are locked and rendered with `dimColor`; only Escape and Ctrl+C exit.

  - **`flowKind: 'random'`** — the viewer transitions straight to `computing`; `generateRandomConsultation()` runs inside the compute effect to produce the hexagram + casting, no in-tab prompts are ever shown (so `inputMode` is moot for random).

  - **`flowKind: 'manual'`** — a sibling `<CastingPromptBox>` branch (`ManualCastingPrompt` in `manual-prompt.tsx`, dispatched from `casting-prompt-box.tsx`) for users who cast with physical yarrow stalks. Per cast the user transcribes FOUR numbers — both heaps' piles-of-4 and remainders (`pilesL`, `remL`, `pilesR`, `remR`) — and the split is derived from the LEFT heap (`pick = 4·pilesL + remL`) with the right side as a cross-check. The validator runs four invariants in priority order — the first failing check wins (`validateManualInput` in `manual-validation.ts`): **incomplete** (any field empty → neutral SPLIT placeholder); **zero-remainder** (any `remL`/`remR` is 0 → RED strip text with the never-zero hint, since a heap divisible by 4 yields remainder 4, not 0; checked before conservation because `pR=N+1, rR=0` is conservation-equivalent to `pR=N, rR=4` and would otherwise pass the sum check undetected); **conservation** (`4·pilesL + remL + 4·pilesR + remR + 1 ≠ unpartedStalks` → surfaced as the RED `MISSING STALKS` gauge in the flow diagram, never as strip text); **suspended sum** (`1 + remL + remR` must be in `{5, 9}` for cast 1 or `{4, 8}` for casts 2/3 → RED strip text with hint about removing the last group of 4). While editing, the bottom strip is blank (the live count lives in the `MISSING STALKS` gauge) and shows `Press Enter to commit` once fully valid; on commit it swaps to BOLD_GREEN `→ next cast: N unparted` (the per-card totals are already visible in the diagram itself). On terminals wider than the prompt's natural body width (diagram + gap + right pane, `MANUAL_NATURAL_BODY_WIDTH`), the body block and title centre horizontally within the box as one rigid unit; below that width they left-align and the existing `<` / `>` pan reaches the right edge — mirroring the interactive prompt, whose bar and readout are likewise centred. Tab cycles forward (`pilesL → remL → pilesR → remR → pilesL`); Shift+Tab cycles backward; Enter commits when valid, and a second Enter during the green dwell skips immediately to the next cast. The resolved-row dwell is `MANUAL_REVEAL_MS` (=2500 ms, set in `manual-prompt.tsx`; tunable via `--manual-reveal-ms <n>` or `manualRevealMs={0}` in tests). The component advances the per-line algorithm through the same flow reducer (`splitCommitted` → `performCast`) the interactive flow uses and saves identically (Spec § "No provenance field" — there is a Phase 7 byte-identity test in `packages/casting-ui/tests/viewer.test.tsx` that drives the same 18-pick sequence through both flows and asserts the captured `saveConsultationFile` args are equal). `Ctrl+R` rewinds the most-recent completed line (mid-line: wipes the current line; post-line-completion: drops back to the just-completed line). This is a two-line lookback window — the `lineRewound` reducer action is the single source of truth (it resets both the slot pointer and the per-line `LineState` in one pure dispatch; there is no separate hook). The manual flow is Ink-only: the standalone `hexagram-manual` bin refuses non-TTY (NO_COLOR=1 / CI=true / piped stdout) with the same stderr-and-exit-1 guard as `hexagram-history`. No `--plain`, no `--numeric-input`, no slider knobs.

  The footer's progress hint during casting reads `"Casting in progress ·  ■■■□□□□□□□□□□□□□□□  N/18"` (`renderProgressBar()` in `packages/casting-ui/src/viewer-layout.ts`), where `N` is the number of committed splits.

  After both flows reach `done`, the file is saved via `consultationFileOutput()`, the tabs unlock, and the existing chrome (Tab cycling, scroll, pan, saved-path footer) re-enables. Content hard-wraps at `--wrap-width <n>` columns (default 120, via `resolveWrapWidth()` in `packages/casting-ui/src/utils-mode.ts`) — capped to the terminal width on narrower terminals, and floored so the fixed-width diagrams are never broken; the remainder is reachable by horizontal scrolling with `<` / `>`.

- **Plain (`--plain` / `--no-ui`, or any non-TTY stdout)** — keeps the classic Inquirer-driven terminal flow. `getHexagramViaInteraction()` / `generateRandomConsultation()` collect the data, then `logAndSaveConsultationOutput()` prints the formatted reading. `--wrap-width` and `--numeric-input` have no effect here (the slider is a viewer-only feature; plain mode is always typed).

Either way the reading is saved as a timestamped `.md` file under `consultations/`. Content generation is split from rendering: `buildConsultationSections()` in `packages/readout/src/output-composers.ts` produces the per-tab strings, `castingSection()` in `packages/readout/src/output-sections.ts` accepts a `PartialCastingRecord` so the same renderer is reused while the table is being filled in (`·` placeholders for null cells), and `consultationConsoleOutput()` (in `packages/casting-ui/src/output-composers.ts`) composes the plain output from the same `@hexagram/readout` section builders. The `--plain` stdout output is locked byte-for-byte by fixtures in `packages/casting-ui/tests/fixtures/`. The `.md` save output (frontmatter + body) is locked separately by fixtures in `packages/consultation-file/tests/fixtures/`. Regenerate both sets together with `pnpm generate-fixtures` after intentionally changing a section builder (driven by the shared cases in `packages/casting-ui/tests/fixtures/cases.ts`).

### Consultation file format — `@hexagram/consultation-file`

Every saved consultation is a Markdown file with a YAML frontmatter envelope. The frontmatter is the canonical model — five fields:

- `schemaVersion: 1` (strict-equal on load; mismatch surfaces row as `[unreadable]` in `hexagram-history`)
- `timestamp` (ISO 8601 with offset, e.g. `2026-05-19T14:23:11+0800`)
- `query` (YAML `|` block scalar for multi-line)
- `hexagram` (flat 6-element array, bottom-first — matches the in-memory `Hexagram` tuple)
- `casting` (mapping keyed `L6..L1` — visual top-first; a converter inverts to/from the bottom-first `CastingRecord` tuple at the package boundary)

The Markdown body below the frontmatter is **decorative**: re-rendered from the envelope by `markdownConsultationBody` on every load. On open, the history flow byte-compares the freshly-rendered body against disk and rewrites if they differ (so renderer upgrades self-heal old files). Derived data — hex name, emerging hex, scripture/exegesis text, translations — is never persisted; it's recomputed via `@hexagram/core/getters` every render.

Filename: `consultation-<timestamp>.md`, under `<cwd>/consultations/`. Saving is `saveConsultationFile({ query, hexagram, casting })`; loading is `loadConsultationFile(filePath)`. Both are exported from `@hexagram/consultation-file/file`.

Legacy `.txt` files (pre-Markdown era) are migrated by `pnpm hexagram-history --convert-legacy`, which parses each `.txt` via `convertLegacyTxt`, writes the corresponding `.md`, and moves the original into `consultations/legacy/`. The migration handles both **Shape A** (recent format with CASTING table — full casting recovered) and **Shape B** (older format without CASTING — synthesizes sentinel casting, marks `castingRecovered: false`). `consultations/legacy/` is never scanned by `hexagram-history`.

### History browser — `@hexagram/history-ui`

`hexagram-history` mounts an Ink list of `consultations/*.md` (newest-first by frontmatter timestamp).

Two-line rows: `[YYYY-MM-DD HH:mm] <truncated query>` + indented `#<wenwang> <chinese> <english>` (with `──▶ #<emerging>` suffix when moving lines exist).

A long list windows in place against a full-height 1-column `<ScrollbarTrack>` gutter (no "… N more" text indicator). Because each consultation is two display lines, the scrollbar geometry is passed in display-line units (`offset`/`totalRows` ×2, `viewportHeight` = `contentHeight`) so the track spans the entire list area; windowing and the footer position counter stay in consultation units.

Controls: `↑/↓` row nav (wraps around the list edges — ↑ at the top jumps to the last row; ↓ at the bottom jumps to the first), `PgUp/PgDn` page nav (clamped), `g/G` first/last, Enter to load, `/` to live-filter on case-insensitive query substring, `Ctrl+D` to delete the focused row (gated by a Y/N confirmation modal — confirming runs a permanent `fs.unlink`), ESC to clear filter or exit.

Pressing Enter loads the file, re-renders the body, byte-compares with disk, and rewrites if drifted (with a `_Body refreshed; data unchanged._` notice). Pressing ESC in the loaded readout returns to the list with focus restored to the consultation just viewed. Ink-only: in non-TTY contexts (`NO_COLOR=1`, `CI=true`, or piped stdout), the bin exits with `"hexagram-history requires an interactive terminal"` and code 1.

### Data model — `packages/core/src/models/`

All 64 hexagram and 8 trigram records are defined in TypeScript and also serialised to `hexagrams.json` / `trigrams.json` (used at runtime via `resolveJsonModule`). Run `pnpm generate-json-files` to sync the JSON after changing the TypeScript sources.

**Key lookup types** (`packages/core/src/models/foundation.ts`):

- `HexagramKey` — `H111111`–`H222222` where `1`=yang, `2`=yin (6 digits, bottom line first)
- `WenWangOrder` — canonical 1–64 numbering
- `FuxiOrder` — alternate binary ordering

**Record structure** (`packages/core/src/models/hexagram.ts`):

```
GenericHexagramRecord {
  Key, Name, Metadata, Text
  Text.Chinese.{Traditional, Simplified}.{Scripture, Exegesis}
  Text.English.{WilhelmBaynes, Legge}.{Scripture, Exegesis}
}
```

Lookup entrypoint: `getHexagramRecord(hexagram: Hexagram)` in `packages/core/src/getters.ts` — converts a `[Line, Line, Line, Line, Line, Line]` to a `HexagramKey` then returns the matching record. Reachable from outside the workspace at `@hexagram/core/getters`.

### Build

Each package has its own `tsdown.config.ts`. Turborepo's `^build` dependency ensures `@hexagram/core` → `@hexagram/consultation-file` → `@hexagram/viewer-core` → `@hexagram/readout` → `@hexagram/casting-ui` + `@hexagram/history-ui` + `@hexagram/playground-ui` → `@hexagram/shell` → `@hexagram/bin` build in topological order. tsdown emits `.mjs` (ESM) and `.d.mts` (TypeScript declarations); the `package.json#exports` map points at those paths.

- `packages/core/tsdown.config.ts` — seven entries: `index`, `types`, `random-casting`, `crypto-random`, `getters`, `hexagrams`, `trigrams` (one per exported subpath; `types` is the domain vocabulary; the `hexagrams`/`trigrams` entries ship from `src/models/` but are exported at the top-level subpath).
- `packages/consultation-file/tsdown.config.ts` — multiple entries: `index`, `file`, `markdown`, `legacy` (matching the exported subpaths).
- `packages/viewer-core/tsdown.config.ts` — single `./src/index.ts` entry.
- `packages/readout/tsdown.config.ts` — single `./src/index.ts` entry (the `ConsultationReadout` component + the per-section string builders).
- `packages/casting-ui/tsdown.config.ts` — single `./src/index.ts` entry.
- `packages/history-ui/tsdown.config.ts` — single `./src/index.ts` entry.
- `apps/cli/tsdown.config.ts` — six entries (`hexagram`, `interactive`, `random`, `manual`, `history`, `playground`) matching the six `bin` map entries.

### Linting

Two-layer lint at the workspace root: oxlint (fast, most rules) runs first, then eslint (`@sxzz/eslint-config`) for rules oxlint doesn't cover. Use `oxlint-disable-next-line` for oxlint suppressions and `eslint-disable-next-line` for eslint-only rules. Config files at root: `.oxlintrc.json` and `eslint.config.js`. Format with `.oxfmtrc.json`.
