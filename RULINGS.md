# RULINGS

The owner's binding answers to Tier-A questions raised while working on
Matters (ADR-0040). This is the architect's "telephone log" that Brooks says
must be logged and published to every implementer (_The Mythical Man-Month_,
ch. 6). Rulings are part of the authoritative library.

- **Only the owner rules.** The clerk records a Ruling exactly as the owner
  gave it.
- **A Ruling binds every Matter from the moment it is recorded**, until it is
  folded into an ADR or `CONTEXT.md`.
- **Folding happens in batches the owner ratifies.** The folded Ruling is then
  marked with where it went. It is never deleted.
- **Never record consultation content here** (ADR-0015). Questions use invented
  examples only.

## Entry format

```markdown
### R-NNN: <short title>

- Date: <YYYY-MM-DD>
- Raised in: <M-NNN> (question <Q-id>), or a named non-Matter source such as a process review or a spike
- Question: <the Tier-A question, as the tester, implementer, reviewer or copilot put it>
- Ruling: <the owner's answer, verbatim>
- Folded into: <ADR-NNNN / CONTEXT.md term / manual / other record / not yet>
```

## Rulings

R-001 to R-008 were raised by a review of what _The Mythical Man-Month_ still
offers this process beyond ADR-0036 (a copilot session, not a Matter). Each
Ruling quotes the option the owner chose, word for word.

### R-001: Which definition is the standard when types and prose disagree

- Date: 2026-11-16
- Raised in: process review (Brooks refinements), proposal 1
- Question: When the ratified type and port files disagree with the ADRs or
  CONTEXT.md, which wins? (Brooks prop. 6.4: one definition must be the
  standard, the other derivative.)
- Ruling: "Split by aspect. Types are the standard for shape and signatures;
  ADRs and CONTEXT.md for meaning, invariants and behaviour. A disagreement is
  a drift finding, fixed by a Ruling, never silently in either file."
- Folded into: ADR-0039 §1 (now ADR-0040)

### R-002: Who may start a spike

- Date: 2026-11-16
- Raised in: process review (Brooks refinements), proposal 4
- Question: Who may start a throwaway spike on a `spike/<Q-id>` branch?
  (Brooks ch. 11, "plan to throw one away".)
- Ruling: "Owner request only. A spike answers one named Tier-A question the
  owner chose to explore by building. The clerk may suggest one in a question
  batch, but never starts one itself. Timeboxed to one agent session; findings
  are at most one page."
- Folded into: ADR-0039 §2 (now ADR-0040)

### R-003: What the legacy bug loop may still fix

- Date: 2026-11-16
- Raised in: process review (Brooks refinements), proposal 9
- Question: What may the legacy bug loop (`BUGS-ORCHESTRATOR.md`) still fix,
  given that the legacy app is the pilot plant the overhaul replaces? (Brooks
  props. 11.24–11.29.)
- Ruling: "P1 and P2 only. Data-loss, correctness and behaviour bugs are
  fixed, each with a regression test and no refactor. P3 (hygiene/data) is
  deferred to the overhaul. Fix-induced bugs are tallied in BUGS.md."
- Folded into: BUGS-ORCHESTRATOR.md (step 1) and BUGS.md (rules)

### R-004: How changes to ADR-0036 are recorded

- Date: 2026-11-16
- Raised in: process review (Brooks refinements)
- Question: Proposals 4, 7 and 8 change ADR-0036, which was accepted on
  2026-11-16 and has no code depending on it yet. How should the change be
  recorded?
- Ruling: "New ADR-0039. ADR-0039 'Brooks refinements to how the overhaul is
  built' amends ADR-0036. The README index marks 0036 'Amended by 0039', which
  follows the repo's convention. Before M-001 builds on it, the two are folded
  into one consolidated text, as was done for 0037/0038."
- Folded into: ADR-0039, consolidated into ADR-0040

### R-005: What happens to a spec hole

- Date: 2026-11-16
- Raised in: process review (Brooks refinements), proposal 2
- Question: When the tester finds a spec hole (a case the ADRs, glossary and
  Rulings don't settle), what happens? (Brooks props. 13.2–13.3, after
  Vyssotsky.)
- Ruling: "Every hole blocks. Each hole becomes a Q-id. The Matter goes to
  awaiting-ruling and implementation doesn't start until each hole has a
  Ruling."
- Folded into: ADR-0039 §4 (now ADR-0040)

### R-006: When the owner-touch and reading budgets are set

- Date: 2026-11-16
- Raised in: process review (Brooks refinements), proposals 7 and 8
- Question: Two new budgets are added: owner touches per phase, and lines of
  required reading per Matter brief. When are the numbers set?
- Ruling: "Measure in Phase 1, set at its end. The clerk records both from
  M-001 on. When Phase 1 lands, the owner sets the caps from actual figures.
  Phase 1 runs uncapped on these two."
- Folded into: ADR-0039 §§6–7 (now ADR-0040)

### R-007: What happens to the old ephemeral material

- Date: 2026-11-16
- Raised in: process review (Brooks refinements), proposal 8
- Question: What happens to `docs/superpowers/` (1 MB, 26 plans) and
  `docs/handoffs/`?
- Ruling: "Move to docs/archive/. git mv into docs/archive/ (dated, read-only
  by convention). Agents are told not to read it unless a Matter names it."
- Note: `docs/handoffs/bugs-loop-log.md` stays where it is, because the bug
  loop still appends to it.
- Folded into: ADR-0039 §7 (now ADR-0040)

### R-008: What the user manual governs

- Date: 2026-11-16
- Raised in: process review (Brooks refinements), proposal 5
- Question: Given R-001 (prose is the standard for behaviour), what does the
  user manual govern? (Brooks ch. 4, p. 45; prop. 15.6.)
- Ruling: "Behaviour standard; fixtures for bytes. docs/manual/cli.md
  (Brooks's 9 items, 3–4 pages) is the standard for what the CLI does. Byte
  fixtures stay the standard for exact output. Parity means 'matches the
  manual'; where today's app differs from the manual, the manual wins after a
  Ruling. A REST manual follows before Phase 5."
- Folded into: ADR-0039 §8 (now ADR-0040)

### R-009: When the week budgets are revisited for ADR-0040's owner work

- Date: 2026-11-19
- Raised in: budget review against ADR-0040 (an orchestrator session, not a
  Matter), question 1
- Question: ADR-0040 adds owner work the week budgets don't cover: drafting
  and ratifying the CLI and REST manuals before Phases 4 and 5, and ruling on
  every blocking spec hole. Should the budgets be revisited now, or left until
  Phase 1 lands as R-006 intends for the caps?
- Ruling: "Split: manuals now. Budget the two manuals now, because their size
  is already known (Brooks's 9 items, 3–4 pages each, per R-008) and ADR-0040
  says a budget is set before work starts. The spec-hole cost is unknown until
  Phase 1 produces figures, so defer it to Phase 1's end alongside the R-006
  caps."
- Folded into: not yet

### R-010: Where the manual budgets sit in the phase table

- Date: 2026-11-19
- Raised in: budget review against ADR-0040 (an orchestrator session, not a
  Matter), question 2
- Question: Per R-009, the two manuals get budgets now. They aren't Matters
  (`docs/manual/README.md`), so the "Matters / weeks" column doesn't fit them.
  How should their budgets appear in the MATTERS.md phase table?
- Ruling: "Pre-phase rows. Add rows 4-pre and 5-pre just before Phases 4 and
  5, budgeted in weeks only, with an Estimate and an owner-touch count of their
  own. Phase 4 and 5 budgets stay as they are, so a manual overrun is visible
  on its own and doesn't eat into implementation weeks. The Entry gate column
  already points to these rows."
- Folded into: not yet

### R-011: The week budgets of the two manuals

- Date: 2026-11-19
- Raised in: budget review against ADR-0040 (an orchestrator session, not a
  Matter), question 3
- Question: What week budgets should rows 4-pre (CLI manual:
  `docs/manual/cli.md` drafted and ratified) and 5-pre (REST manual:
  `docs/manual/rest.md` drafted and ratified) carry?
- Ruling: "CLI 2 / REST 1. The CLI manual covers five commands, and each place
  today's app differs from it needs a Ruling (R-008), so it gets 2 weeks. The
  REST manual starts from ADR-0038 with no legacy behaviour to reconcile, so it
  gets 1 week. That adds 3 weeks to the calendar."
- Folded into: MATTERS.md (phase table)

### R-012: Manuals are drafted after the previous phase lands, not during it

- Date: 2026-11-19
- Raised in: budget review against ADR-0040 (an orchestrator session, not a
  Matter), question 4
- Question: MATTERS.md says the clerk raises "draft the manual" only once the
  phase before the gate lands, so the 4-pre and 5-pre weeks are added to the
  calendar one after another. Should a manual instead be drafted while the
  previous phase is still running (e.g. the CLI manual during Phase 3)?
- Ruling: "Keep serial. Leave things as they are. The bottleneck is your
  attention, not the calendar (ADR-0040, Limits). Drafting a manual alongside
  a phase means one mind serves two queues, which is the risk ADR-0040 gave for
  rejecting parallel channels. Also, the CLI manual benefits from seeing the
  ratified Oracle core."
- Folded into: MATTERS.md (already states it; no change)

### R-013: A later Ruling overrides an earlier ADR on the point it addresses

- Date: 2026-11-19
- Raised in: review of the context chain agents read (an orchestrator session,
  not a Matter), gap 1
- Question: When a Ruling contradicts an accepted ADR on the same point, which
  one binds? Nothing in RULINGS.md, ADR-0040 or the ADR README says so. They
  only say a Ruling binds once recorded, and that an ADR is changed only by a
  newer ADR (R-004).
- Ruling: "Ruling wins, fold soon. A later Ruling overrides the earlier ADR on
  the point it addresses, from the moment it is recorded, so work isn't held
  up. The Ruling must name the ADR it overrides. The clerk then drafts an
  amending ADR in the next folding batch, and code that relies on the Ruling
  cites that ADR once it is accepted. This matches "binds from the moment it is
  recorded" and R-001's "fixed by a Ruling"."
- Folded into: not yet

### R-014: Subagents in the Matter loop use only the skills their role allows

- Date: 2026-11-19
- Raised in: review of the context chain agents read (an orchestrator session,
  not a Matter), gap 2
- Question: Installed plugin skills (e.g. superpowers' brainstorming and
  writing-plans, which produced the 1 MB `docs/superpowers/` that R-007
  archived) tell agents to act on their own: "you MUST brainstorm or plan
  first". The harness ranks project instructions above skills, but the clerk's
  subagent briefs never say so, and only spec-audit is named. How should
  subagents in the Matter loop treat skills?
- Ruling: "Per-role allow-list. clerk.md names the skills each role may use,
  e.g. tester: spec-audit; implementer: tdd and systematic-debugging; reviewer:
  none. Every brief says no other skill applies. It's mechanical and easy to
  check, and it fits "agents execute, never decide". The exact list would be
  the next question."
- Folded into: `docs/agents/clerk.md` (§0 Skills and each brief)

### R-015: When overhaul code disagrees with the library, the library is presumed right

- Date: 2026-11-19
- Raised in: review of the context chain agents read (an orchestrator session,
  not a Matter), gap 3
- Question: When overhaul code disagrees with the authoritative library (an
  ADR, a CONTEXT.md term, a Ruling, a ratified manual or a ratified type),
  which side is presumed wrong, and what may an agent do about it? Nothing
  states this outright. The cold reads and drift signals only imply that the
  library wins.
- Ruling: "Library presumed; report it. The library is presumed right. Inside
  its own Matter's diff, an agent conforms to the library; that's simply the
  job. Anywhere else, it changes neither side: it reports the disagreement as
  a drift finding, and the clerk raises it as a question. You rule whether the
  code gets fixed (a Matter) or the library gets amended (a Ruling, then a
  fold). Nobody edits the library to match the code."
- Folded into: not yet

### R-016: The rule that admits a skill to a role's allow-list

- Date: 2026-11-19
- Raised in: review of the context chain agents read (an orchestrator session,
  not a Matter), follow-up to R-014
- Question: Before any names go on the R-014 allow-list: what rule admits a
  skill? The inventory shows some skills carry conventions beyond what's
  ratified (FCIS's per-file pattern comment, vertical-code-structure vs
  ADR-0002/0019's layering, no-barrel-files stricter than ADR-0003), and skill
  files live in plugin caches outside the repo, where an update can change
  them silently.
- Ruling: "Four tests; ratify first. A skill is admitted for a role only if
  all four hold: (1) it fits the role; (2) it produces no plans, specs or
  design docs and asks no design questions; (3) every convention it carries is
  already in the library; (4) it takes no action the clerk forbids. A
  convention beyond the library is first ratified as a Ruling or ADR in the
  repo's own words, and only then is the skill admitted. The library stays the
  standard, and a plugin update can't move it."
- Folded into: not yet

### R-017: The base skill allow-list for the Matter loop

- Date: 2026-11-19
- Raised in: review of the context chain agents read (an orchestrator session,
  not a Matter), follow-up to R-016
- Question: Ratify the base allow-list derived from R-016's four tests?
  Tester: spec-audit, ink-useinput-bind, cross-platform-tests,
  ansi-color-piping. Implementer: superpowers:test-driven-development,
  superpowers:systematic-debugging, superpowers:verification-before-completion,
  capturing-commit-intent, reviewable-changes, ink-useinput-bind,
  cross-platform-tests, ansi-color-piping, typescript-advanced-types. Reviewer:
  reviewable-changes. Clerk: capturing-commit-intent,
  superpowers:verification-before-completion. (The four convention-carrying
  skills are decided separately.)
- Ruling: "Option 1. Decide the convention-carrying skills in this session".
  Option 1 reads: "Ratify, debugging mapped. Ratify as listed, with
  systematic-debugging included. The implementer's brief says that wherever a
  skill says to ask "your human partner", the implementer stops and reports a
  question instead. That keeps the debugging discipline and sends its
  architecture step down the existing escalation route."
- Folded into: `docs/agents/clerk.md` (§0 Skills and the implementer brief)

### R-018: No barrel files; no-barrel-files admitted for implementer and reviewer

- Date: 2026-11-19
- Raised in: review of the context chain agents read (an orchestrator session,
  not a Matter), convention 1 of 4 under R-016
- Question: Convention 1/4, no-barrel-files: ADR-0003 only rules out a single
  barrel. The skill also bans re-export-only files and directory imports, and
  discourages a root "." entry pointing at an index barrel. Today's
  `domain/core/src/index.ts` is real implementation, not a barrel. What, if
  anything, should be ratified so the skill can be admitted (implementer and
  reviewer)?
- Ruling: "Ratify the core rule. In the repo's words: no file whose only job is
  re-exporting, no directory imports, and a public surface only through
  explicit `exports` entries pointing at real implementation files. An `index`
  entry is allowed only when it is real implementation, as core's is today.
  The skill's `#…` import examples license nothing until the
  package-public-api question is settled. Then admit the skill for implementer
  and reviewer."
- Folded into: skill admission in `docs/agents/clerk.md` (§0 Skills); the convention not yet (an amendment to ADR-0003)

### R-019: In-package code shares through `imports` aliases; package-public-api admitted

- Date: 2026-11-19
- Raised in: review of the context chain agents read (an orchestrator session,
  not a Matter), convention 2 of 4 under R-016
- Question: Convention 2/4, package-public-api: its exports half is already
  ADR-0003 plus R-018. Its new rule is that in-package code shares through
  package.json `imports` aliases (`#src/*`), never tsconfig `paths`. Today the
  repo uses neither, only relative imports (144 `../` imports). Should this be
  ratified so the skill can be admitted?
- Ruling: "Ratify both halves now. Rule now: in-package sharing uses
  package.json `imports` (#…) aliases, never tsconfig `paths` or deep `../`
  chains; admit the skill for implementer and reviewer. That's a uniform rule
  from day one, but it's decided before the layout and with the toolchain
  support unverified (a spike could check it)."
- Folded into: skill admission in `docs/agents/clerk.md` (§0 Skills); the convention not yet (an amendment to ADR-0003)

### R-020: Purity is checked, not labelled; functional-core-imperative-shell stays off

- Date: 2026-11-19
- Raised in: review of the context chain agents read (an orchestrator session,
  not a Matter), convention 3 of 4 under R-016
- Question: Convention 3/4, functional-core-imperative-shell, after weighing
  it up: how should the purity principle be secured? Benefit 1 of full
  ratification, as discussed: purity checked inside a module, where drift
  signal 3 (imports across contexts and ports) does not reach.
- Ruling: "Option 1 and introduce benefit 1 to ADR-0037. Let me know if this
  makes sense." Option 1 reads: "Check, don't label. ADR-0037's hexagonal
  terms carry the principle; no per-file labels, and the skill stays off.
  M-002's boundary-rules proposal (drift signal 3) must include: the Oracle and
  the use cases import nothing effectful (node:fs, node:crypto, the system
  clock, Math.random); effects reach them only through driven ports. Purity is
  enforced by a lint, in one vocabulary."
- Note: Importing driven-port interfaces (types) is not an effect; the ban
  covers effectful modules and globals.
- Folded into: not yet (an amendment to ADR-0037, per R-004 and R-013; the
  lint goes in M-002's boundary rules)

### R-021: In-package structure is decided with M-001's package layout

- Date: 2026-11-19
- Raised in: review of the context chain agents read (an orchestrator session,
  not a Matter), convention 4 of 4 under R-016
- Question: Convention 4/4, vertical-code-structure: the within-package half
  is not fully congruent with M-001. Its "never by type" rule would catch
  hexagonal role folders (ports/, adapters/, use-cases/) inside a coarse
  package, which nudges M-001 towards fine packages, and banning `types`
  shapes how M-001 lays out the value types. What now?
- Ruling: "Defer all to M-001. Keep the skill off for now. M-001's
  package-layout proposal must cover package axis (contexts vs layers),
  granularity and in-package structure (incl. the by-kind ban and where ports
  and value types live) as one set, with options side by side. Ratify them
  together; the skill is admitted then if its rules fit the result."
- Folded into: MATTERS.md (M-001 notes)

### R-022: How M-001's package-layout proposal is drafted

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-1)
- Question: R-021's package-layout proposal (package axis, granularity and
  in-package structure, side by side, within R-018 to R-020) needs drafting
  before it can be ruled on. Options: (a) a fresh agent drafts 2–3 complete
  layouts side by side to `docs/reviews/2026-11-19-m-001-package-layout.md`,
  a non-binding draft for the owner to rule on; (b) the owner runs a copilot
  session; (c) a spike checks the toolchain support for `imports` aliases
  (`#src/*`) under tsdown and vitest that R-019 left unverified.
- Ruling: "1(a) & 1(c)". The owner chose option (a), and started the spike in
  option (c).
- Folded into: not yet

### R-023: The shape of M-001's Acceptance

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-2)
- Question: What command is M-001's Acceptance? Recommended shape:
  `pnpm type:check && pnpm --filter <skeleton-package> test`, where the
  skeleton test drives one use case from a driving adapter, through the
  application, to a stub driven adapter. The package name and use case are
  set when the layout is ratified.
- Ruling: "recommended shape for 2"
- Folded into: MATTERS.md (M-001 Acceptance)

### R-024: M-001's Free to choose is drafted with the layout proposal

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-3)
- Question: What is M-001's Free to choose? Recommended: drafted in the same
  document as the layout proposal and ratified together with it.
- Ruling: "3 as recommended"
- Folded into: not yet

### R-025: M-001's package layout is Layout C, with its Free to choose

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-4)
- Question: Which package layout, with its Free to choose, from
  `docs/reviews/2026-11-19-m-001-package-layout.md`? A, context packages; B,
  layer packages; C, a hybrid: pure context packages, one `application`
  package that owns the four driven ports, and one package per adapter, so
  purity is checked by a list of package names and each ADR-0037/0038 channel
  rule is a dependency rule between packages. Under C, M-001 creates `oracle`,
  `scripture-catalogue`, `consultation-journal`, `application` and
  `cli-adapter`, and its Free to choose is the draft's "Draft Free to choose
  for M-001 (R-024), under Layout C" section. Ratifying C fills R-023 as
  `pnpm type:check && pnpm --filter @hexagram/cli-adapter test`.
- Ruling: "Q-M-001-4: C."
- Folded into: not yet

### R-026: The Remainder-Group policy is its own small pure package

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-9)
- Question: Where does ADR-0023's Remainder-Group policy live? It is pure, not
  part of the Oracle, and shared by the CLI's and the PWA's random Pick
  sources. (a) its own small pure package, on the purity list; (b) a subpath
  of `application`, beside the Random Source port; (c) inside `oracle`, which
  would amend ADR-0023.
- Ruling: "Q-M-001-9: A."
- Folded into: not yet

### R-027: Pure packages keep `platform: 'node'` until Phase 6

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-10)
- Question: What build platform do the pure packages use, given ADR-0003's
  `platform: 'node'` and the PWA loading them in a browser later? (a) keep
  `node` until Phase 6; (b) `neutral` now, amending ADR-0003.
- Ruling: "Q-M-001-10: A."
- Folded into: not yet

### R-028: M-001's walking skeleton drives use case 8, Look up the catalogue

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-6)
- Question: Which use case does the walking skeleton drive? Use case 3
  (Resolve a Transformation) proves `cli-adapter → application → oracle` as
  well as the port path, but needs some Oracle in Phase 1; use case 8 (Look up
  the catalogue) proves `cli-adapter → application → Scripture Catalogue port
  → stub` with no Oracle, leaving `oracle` holding value types only in M-001.
- Ruling: "Q-M-001-6: use case 8."
- Folded into: MATTERS.md (M-001 Acceptance)

### R-029: Overhaul packages live in a new `overhaul/*` workspace folder, under `@hexagram/`

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-5)
- Question: Where do the overhaul packages live beside the legacy ones (R-003)?
  (a) a new workspace glob `overhaul/*` with non-colliding `@hexagram/` names;
  (b) a new npm scope; (c) the existing `domain/*` and `cli/*` folders with
  distinct names. Layout C's planned names collide with none of the 13 legacy
  package names.
- Ruling: "Q-M-001-5: A."
- Folded into: not yet

### R-030: Use case 1 is a sequence of steps; the caller holds the partial Casting

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-8)
- Question: May a driving adapter call the Oracle directly, given ADR-0038's
  pure Casting resource is not one of the ten use cases? (a) yes, for that
  resource only, as one named exception; (b) `application` also exports a pure
  Casting step outside the ten; (c) use case 1's signature is split into steps
  (begin → divide or transcribe once per Division → keep), each returning the
  partial Casting as an immutable value the caller holds, so the REST engine
  maps each Casting URL onto one pure step and imports only `application`.
- Ruling: "Q-M-001-8: C."
- Folded into: not yet

### R-031: Keep accepts only a complete Casting; the PWA imports `application` by subpath and trusts the engine

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-11)
- Question: Under Layout C (R-025) and stepwise use case 1 (R-030), the PWA
  runs keep and other use cases locally from `application`, which imports
  `oracle`; ADR-0037 says the PWA bundles no Oracle, and ADR-0026 says a
  Casting must replay to exactly its Transformation. Options: (a) the
  invariant holds by construction: only the Oracle's last Division step makes
  a complete Casting, keep accepts only that type and does no replay;
  `application` exports each use case and step on its own subpath, the PWA
  imports only those that import no `oracle`, and the PWA turns the engine's
  JSON into a complete Casting at one named trust function; (b) the Oracle
  behind a fifth driven port with in-process and REST-client adapters,
  amending ADR-0037; (c) defer to Phase 6.
- Ruling: "Q-M-001-11: A"
- Folded into: not yet

### R-032: The use case builds the Consultation Id from Clock and Random Source

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-7)
- Question: Who assigns the Consultation Id (a ULID, ADR-0030)? (a) the use case
  builds it, stateless, from the Clock and Random Source ports; (b) the
  Consultation Store assigns it on keep; (c) a fifth driven port. Monotonic
  ULIDs would need per-run state behind a port, could never be monotonic
  across channels without a coordinating service (ruled out by ADR-0032 and
  ADR-0037), and buy nothing because ordering is always by `divinedAt`.
- Ruling: "Q-M-001-7: A"
- Folded into: not yet
