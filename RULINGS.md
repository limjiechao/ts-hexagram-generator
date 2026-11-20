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
  the catalogue) proves the path from `cli-adapter` through `application` and
  the Scripture Catalogue port to a stub, with no Oracle, leaving `oracle`
  holding value types only in M-001.
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

### R-033: For M-001, the incision code is ratified before the tester writes the skeleton's tests

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-12)
- Question: M-001's output (types and signatures) is itself Tier A, so a
  tester working from the docs alone would have to invent the names its
  acceptance test imports. Order: (a) an implementer drafts the value types,
  ports and use-case signatures with no skeleton logic; M-001 goes to
  awaiting-ratification and the owner line-edits and ratifies; a fresh tester
  then audits and writes the skeleton's acceptance test against the ratified
  signatures, the owner approves the test list, and an implementer makes the
  skeleton pass; (b) run the loop as written, with names ruled as spec holes;
  (c) the tester invents the names and test-list approval ratifies them.
- Ruling: "Q-M-001-12: A"
- Folded into: not yet

R-034 to R-040 were answered together: "Q-M-001-13 to Q-M-001-19: A". Each
records option (a) of its question.

### R-034: Citation is a per-Work union of shapes; Work is a closed list

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-13)
- Question: What are the Scripture Catalogue's value types? (a) Citation is a
  discriminated union with one shape per Work (e.g. `{ work, hexagram, line }`),
  its string form only the serialization used in URLs and files; Work is a
  closed list of the Works the glossary names (周易 經, 彖傳, 大象, 小象, 文言,
  焦氏易林), extended only by a Ruling; (b) an opaque branded string per Work;
  (c) an opaque Citation now, Work later.
- Ruling: "Q-M-001-13 to Q-M-001-19: A"
- Folded into: not yet

### R-035: What use cases 3, 8 and 9 return

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-14)
- Question: What do use cases 3, 8 and 9 return? (a) 3 returns the Oracle's
  Resolution plus passage texts keyed by Citation; 8 returns the catalogue's
  own value; 9 returns Typst source, and compiling to PDF is an adapter's
  effect; (b) one combined "resolved Transformation" type owned by
  `application`.
- Ruling: "Q-M-001-13 to Q-M-001-19: A"
- Folded into: not yet

### R-036: The Consultation Store lists Consultations and Unreadable files together; the use case filters

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-15)
- Question: What do the Consultation Store's list and get return? (a) `list()`
  returns `{ consultations, unreadable }` with details per Unreadable file, and
  the use case filters by Query; (b) the Store filters; (c) a separate
  `listUnreadable()`.
- Ruling: "Q-M-001-13 to Q-M-001-19: A"
- Folded into: not yet

### R-037: Divined At is a structured moment-or-day union; the Clock returns a moment

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-16)
- Question: What shape do Divined At and the Clock have? (a) a structured union
  of a moment (epoch ms plus UTC offset) or a day (year, month, day); the Clock
  returns a moment; ISO text appears only when a Store writes the record; (b) a
  branded ISO string; (c) Temporal-style types, needing a polyfill.
- Ruling: "Q-M-001-13 to Q-M-001-19: A"
- Folded into: not yet

### R-038: The glossary name `Pick` is kept despite shadowing TypeScript's `Pick`

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-17)
- Question: The glossary's `Pick` shadows TypeScript's built-in `Pick<T, K>` in
  importing modules. (a) keep the glossary name; a file needing the built-in
  writes out the mapped type; (b) importers alias it; (c) namespaced imports.
- Ruling: "Q-M-001-13 to Q-M-001-19: A"
- Folded into: not yet

### R-039: Store and Catalogue ports are async; Random Source and Clock are sync

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-18)
- Question: Are the driven ports sync or async, given IndexedDB and the PWA's
  REST-client catalogue? (a) Consultation Store and Scripture Catalogue return
  Promises, Random Source and Clock stay synchronous, only use cases touching
  storage or the catalogue are async, and the Oracle stays synchronous;
  (b) everything async; (c) everything synchronous for now.
- Ruling: "Q-M-001-13 to Q-M-001-19: A"
- Folded into: not yet

### R-040: M-001's incision code is ratified slice by slice

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-19)
- Question: The full draft is about 1,000 lines against the ~400-line limit.
  (a) ratify slice by slice: a fresh reviewer checks each slice of at most
  ~400 lines, the owner line-edits and ratifies it, and later slices, each by a
  fresh implementer, build on ratified types; (b) draft every slice, then
  ratify all at once; (c) lift the limit for M-001.
- Ruling: "Q-M-001-13 to Q-M-001-19: A"
- Folded into: not yet

### R-041: The UTC offset is a checked, branded `±HH:MM` string

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-20)
- Question: How is the UTC offset in Divined At's moment form written? (a)
  `offsetMinutes: number`, signed minutes east of UTC; (b) a `±HH:MM` string as
  ISO 8601 writes it, as a branded type only a checking function can create,
  accepting exactly `+HH:MM` or `-HH:MM`; it copies straight into the record
  (ADR-0030), reads the same everywhere, and makes a sign error visible
  (`Date.prototype.getTimezoneOffset()` counts minutes west); (c) a branded
  number of minutes.
- Ruling: "Q-M-001-20: B"
- Folded into: not yet

### R-042: Divined At keeps both forms, told apart by a tag field

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-21)
- Question: The glossary and ADR-0030 require both a moment form and a day-only
  form (Recorded Consultations). How are they told apart? (a) keep both, with a
  tag field (`precision` recommended, after ADR-0030's "the form shows the
  precision"; `kind` the alternative), so a `switch` is exhaustiveness-checked;
  (b) keep both, told apart by shape; (c) one form only, amending the glossary
  and ADR-0030.
- Ruling: "Q-M-001-21: A"
- Folded into: not yet

### R-043: Divined At's fields, in one file

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-22)
- Question: Field names and files for Divined At? (a) one file,
  `divined-at.ts`, holding the moment form
  `{ precision: 'moment', epochMilliseconds: number, offset: UtcOffset }`, the
  day form `{ precision: 'day', year, month, day }`, the moment type the Clock
  returns, and `UtcOffset` with its checking function; (b) the same fields,
  with the moment type, the day type and `UtcOffset` each in its own file;
  (c) as (a) but with `kind` or `epochMs`.
- Ruling: "Q-M-001-22: A"
- Folded into: not yet

### R-044: The moment type is named `Moment`

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-23)
- Question: What is the type for an instant with its UTC offset, Divined At's
  precise form and the Clock's return value, called? (a) `Moment`, after
  ADR-0037's "Clock: the current moment" and the glossary's Divined At prose,
  though it reads as Moment.js; (b) `ClockReading`; (c) `Instant`.
- Ruling: "Q-M-001-23: A"
- Folded into: not yet

### R-045: A checked value type is created through a type guard; the caller decides what invalid input means

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-24)
- Question: When the `UtcOffset` check gets bad input, what happens? This is
  the overhaul's first error policy and likely sets the pattern for every
  checked value type. (a) a type guard, `isUtcOffset(s): s is UtcOffset`,
  returning true or false, with the caller (use case or adapter) deciding what
  invalid input means; (b) `parseUtcOffset(s): UtcOffset | undefined`; (c) a
  parser that throws.
- Ruling: "Q-M-001-24: A"
- Folded into: not yet

### R-046: A Casting carries a `state` tag; the complete form keeps its brand

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-26, from the slice 1 review)
- Question: How does code tell a partial Casting from a complete one, when a
  complete Casting is assignable to a partial one? (a) a tag
  `state: 'partial' | 'complete'`, keeping the complete form's brand, so the
  compiler refuses a complete Casting where a divide step expects a partial
  one; (b) the brand only, with a run-time refusal in the Oracle step; (c) a
  `transformation?: never` field on the partial form.
- Ruling: "Q-M-001-26: A"
- Folded into: not yet

### R-047: A Casting holds full Rounds grouped by Line

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-27, from the slice 1 review)
- Question: What shape is a Casting? (a) full Rounds, with their derived
  values, grouped by Line, three per Line, as ADR-0038 groups them; the
  Picks-only record of ADR-0030 is the Store's serialization; (b) a flat list
  of full Rounds; (c) Picks only, grouped six by three, Rounds derived on read.
- Ruling: "Q-M-001-27: A"
- Folded into: not yet

### R-048: Replay on load is a Markdown Store rule; the PWA trusts its IndexedDB

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-28, from the slice 1 review)
- Question: ADR-0030 says "Loading checks that the Casting replays to it", but
  replaying in the PWA would need the Oracle (R-031). (a) the load check is a
  Markdown Store rule, because files can be hand-edited; the PWA trusts its
  IndexedDB, which holds only engine-made Castings; data from outside (Merge
  Journals, legacy import) is replayed through the engine; (b) the PWA replays
  through the engine on every load; (c) no channel replays on load, amending
  ADR-0030.
- Ruling: "Q-M-001-28: A"
- Folded into: not yet

### R-049: M-001 attempt 2 branches from attempt 1's tip and is squashed on landing

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-29)
- Question: What does attempt 2 start from? (a) a new branch from attempt 1's
  last commit; a fresh implementer fixes the review's blocking findings, the
  lint warnings and the new Rulings; the slice lands as one commit per package;
  (b) a new branch from `matters`, redrafting slice 1 from scratch.
- Ruling: "Q-M-001-29: A"
- Folded into: not yet

### R-050: Both kinds of Consultation carry a top-level Transformation

- Date: 2026-11-19
- Raised in: M-001 (question Q-M-001-25, from the slice 1 review)
- Question: Where does a Cast Consultation keep its Transformation? (a) both
  kinds have a top-level `transformation`; for a Cast Consultation the keep
  step, the only code that creates one, copies it from the complete Casting,
  so the two cannot differ; (b) only inside the Casting, as drafted; (c) as
  drafted plus a helper returning any Consultation's Transformation.
- Ruling: "Q-M-001-25: A"
- Folded into: not yet

### R-051: No type assertions; a value of a checked type comes through a type guard

- Date: 2026-11-19
- Raised in: M-001, the attempt 1 implementer's suggestion to lint
  `as CompleteCasting` so it is allowed only in `oracle` (and, per R-031, the
  PWA's trust function)
- Question: The brand on a complete Casting can be bypassed by any package with
  a type assertion (`value as CompleteCasting`). Should the assertion be
  allowed in the places R-031 lets a complete Casting be made?
- Ruling: "I abhor type assertion. It's a slippery slope. If it's what it is,
  then run it through a type guard."
- Note (clerk): read as binding all overhaul code (`overhaul/*`), with R-045's
  guard as the way to produce any branded or narrowed value. The owner may
  narrow it (e.g. for `as const`, which asserts nothing, or for tests).
- Folded into: not yet

### R-052: Slice 1 line-edits, as the clerk recommended

- Date: 2026-11-19
- Raised in: M-001, the slice 1 review's list of choices the library does not
  license
- Question: Eight drafted choices, each with a recommendation: (1) keep
  `Polarity = 'yin' | 'yang'` and add Polarity to the glossary; (2)
  `type Hexagram = Figure`; (3) Round's fields `remainderLeft` and
  `remainderRight` (ADR-0038's names), keeping `setAside` and `stalks`; (4)
  the Casting's grouping, settled by R-047; (5) guards `isConsultationId`
  (26 characters of the ULID alphabet) and `isQuery` (non-blank, never
  trimmed); (6) `UtcOffset` keeps −12:00 to +14:00, its comment citing the
  span of real time zones rather than ISO 8601, and still refuses `-00:00`
  (RFC 3339's unknown offset); (7) keep `origin: 'cast' | 'recorded'`
  (ADR-0026's "origins"); name the day form `Day`, with a guard rejecting
  impossible dates; (8) `Pick` and `epochMilliseconds` stay plain numbers.
- Ruling: "Line-edits as recommended."
- Folded into: not yet (Polarity awaits a glossary fold)

R-053 to R-056 were answered together, with the ratification of M-001's slice
1: "ratify slice 1 with line-edits as recommended; Polarity entry ratified;
Q-30 A; Q-31 A".

### R-053: Slice 1 line-edits from its second review, as the clerk recommended

- Date: 2026-11-20
- Raised in: M-001, the second slice 1 review's list of choices the library
  does not license
- Question: (1) keep a partial Casting's limits in prose, not the type; (2)
  leave "Line Values so far" off the Casting; (3) `isConsultationId` allows
  only `0`–`7` as the first character, so every accepted Id is a ULID; (4)
  `isDay` allows years 0000–9999 only, so every Day writes as `YYYY-MM-DD`;
  (5) leave `Moment` unguarded; (6) accept a Query of only invisible
  characters as non-blank; (7) add Polarity to the glossary (R-054); (8) keep
  `isDay`'s parameter type unnamed.
- Ruling: "ratify slice 1 with line-edits as recommended"
- Folded into: not yet

### R-054: Polarity enters the glossary

- Date: 2026-11-20
- Raised in: M-001, R-052(1) and the second slice 1 review
- Question: Ratify this entry? "**Polarity** (陰陽): Whether a Line of a Figure
  is yin or yang. A Figure is six Polarities, read bottom-up. A Polarity does
  not say whether a Line moves; a Line Value does. _Avoid_: bit, 0/1 (for a
  Polarity)."
- Ruling: "Polarity entry ratified"
- Folded into: CONTEXT.md (Polarity)

### R-055: One shape-only guard makes a complete Casting, imported only where R-031 allows

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-30, from the second slice 1 review)
- Question: Under R-051, how is a complete Casting made, given its brand
  exists only as a type? (a) `oracle` exports one shape-only guard,
  `isCompleteCasting` (six Lines of three Rounds, values in range, the
  Transformation present), used by the Oracle's last Division step on what it
  builds and by the PWA's trust function on the engine's JSON; M-002's lint
  allows importing it only in `oracle` and that one PWA file; (b) the guard
  replays the Casting, which the PWA cannot use (R-031); (c) drop the brand,
  amending R-046.
- Ruling: "Q-30 A"
- Folded into: not yet (the import rule goes in M-002's boundary rules)

### R-056: Only branded types need guards; tagged types are built as literals

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-31, from the second slice 1 review)
- Question: Do tagged, unbranded types (`PartialCasting`, `Moment`) also need
  guards under R-051? (a) no: R-051 bans assertions, and an object literal
  asserts nothing; brands and guards are for invariants the type system cannot
  express; (b) yes, brand and guard every domain type.
- Ruling: "Q-31 A"
- Folded into: not yet

### R-057: M-002 lints R-051's ban on type assertions

- Date: 2026-11-20
- Raised in: M-002 (question Q-M-002-1)
- Question: Should M-002's boundary-rules proposal also enforce R-051 by lint?
  (a) yes: one rule scoped to `overhaul/*`, tests included, e.g.
  `@typescript-eslint/consistent-type-assertions` with
  `assertionStyle: 'never'` or its equivalent, confirmed to exempt `as const`;
  (b) no: reviewers and the clerk's grep keep enforcing it.
- Ruling: "Q-M-002-1: A"
- Folded into: MATTERS.md (M-002 notes)

### R-058: Under R-040, the two attempts are counted per slice

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-32)
- Question: The retry policy allows two attempts per Matter, and M-001's slice 1
  used both. (a) count per slice: each slice of at most ~400 lines gets two
  attempts, and a second failure on any slice still stops the loop for the
  owner; (b) count per Matter, so any further rejection blocks M-001.
- Ruling: "Q-M-001-32: A"
- Folded into: not yet

R-059 to R-067 were answered together: "Q-33 to Q-41: A" and "Q-35: A for 文言".
Each records option (a) of its question.

### R-059: Work ids are pinyin, after ADR-0038's URLs

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-33)
- Question: What are the Work ids, given ADR-0038 uses `zhouyi` and `yilin`?
  (a) pinyin for the rest: `tuan` (彖傳), `daxiang` (大象), `xiaoxiang` (小象),
  `wenyan` (文言); (b) Chinese literals; (c) English.
- Ruling: "Q-33 to Q-41: A"
- Folded into: not yet

### R-060: Line Position is an Oracle value type

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-34)
- Question: Where does a Line Position type (1–6) live? (a) a new
  `oracle/src/line-position.ts`, ratified with slice 2; (b) inline in the
  catalogue.
- Ruling: "Q-33 to Q-41: A"
- Folded into: not yet

### R-061: Each Work's Citation shape

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-35)
- Question: What shape is each Work's Citation (R-034)? (a) 經 (`zhouyi`): `{
work, hexagram }`, `{ work, hexagram, line }` or `{ work, hexagram, line:
'all-moving' }`; 彖傳 and 大象: `{ work, hexagram }`; 小象: `{ work, hexagram,
line }`, `'all-moving'` allowed; Yilin: `{ work, standing, emerging }`;
  `'all-moving'` only for 乾 and 坤 stated in prose. For 文言: (a) `{ work,
hexagram }`, each Hexagram's 文言 cited whole; (b) with a `section`; (c) 文言
  out of the list, amending R-034.
- Ruling: "Q-33 to Q-41: A" and "Q-35: A for 文言"
- Folded into: not yet

### R-062: An Edition carries its id, Work, script or language, witness and licence

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-36)
- Question: What shape is an Edition? (a) `{ id: EditionId, work, script or
language, witness, licence }`, EditionId a branded slug (e.g. `legge-1882`)
  with a guard, witness possibly unidentified; (b) id only, metadata behind
  the port.
- Ruling: "Q-33 to Q-41: A"
- Folded into: not yet

### R-063: A Reading Preference's fields

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-37)
- Question: What shape is a Reading Preference? (a) `{ script: 'traditional' |
'simplified', translations: EditionId[], commentaries: Work[], yilinVerse:
boolean }`, defaults from the glossary; (b) script only for now.
- Ruling: "Q-33 to Q-41: A"
- Folded into: not yet

### R-064: The Licence Gate omits gated texts; each adapter is built for its channel

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-38)
- Question: How does the Licence Gate report what it held back? (a) each
  channel's adapter is built for that channel and gated texts are simply
  missing (the glossary: omit, never substitute); (b) texts carry `{ edition,
gated: true }`; (c) a `withheld` list.
- Ruling: "Q-33 to Q-41: A"
- Folded into: not yet

### R-065: An Unreadable file is reported as a location and a reason

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-39)
- Question: What does the Store say about an Unreadable file? (a) `{ location:
string, reason: string }`, location store-specific, reason for people; (b)
  also a typed reason kind.
- Ruling: "Q-33 to Q-41: A"
- Folded into: not yet

### R-066: The Store's get returns undefined when nothing is found

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-40)
- Question: What does `get` return on a miss? (a) `Promise<Consultation |
undefined>`, Unreadable files only in `list`; (b) a tagged found / missing /
  unreadable result.
- Ruling: "Q-33 to Q-41: A"
- Folded into: not yet

### R-067: The use case stamps a Deletion Record from the Clock

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-41)
- Question: Who stamps a Deletion Record's time? (a) the use case, from the
  Clock, then calls `remove(record)`, so the Store stays clock-free and Merge
  Journals reuses `remove`; the Clock then also serves use case 6, overriding
  ADR-0037's table on that point (R-013); (b) the Store.
- Ruling: "Q-33 to Q-41: A"
- Folded into: not yet

### R-068: An Edition's field types

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-42)
- Question: What types do an Edition's fields have? (a) `{ script } | { language:
string }`; `witness: { description: string, retrievedOn?: Day } |
'unidentified'`; `licence: 'public-domain' | 'in-copyright'`; (b) every field
  a free string; (c) the owner dictates them.
- Ruling: "Q-M-001-42: A"
- Folded into: not yet

### R-069: Legge's EditionId is `legge-1882`; Reading Preference defaults are built through the guard

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-43)
- Question: How are Reading Preference defaults set, given "Legge by default"
  and R-051? (a) Legge's id is `legge-1882`, the slug ADR-0038's URLs use; the
  default is built through `isEditionId`, with a test that it is not empty;
  (b) a function taking Legge's id from the caller; (c) no defaults in M-001.
- Ruling: "Q-M-001-43: A"
- Folded into: not yet

### R-070: A Reading Preference's commentaries are only the 十翼

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-44, the slice 2 implementer's suggestion)
- Question: R-063 types `commentaries` as any Work, but only the 十翼 are
  Commentaries in the glossary. (a) narrow it to `tuan`, `daxiang`,
  `xiaoxiang` and `wenyan`, amending R-063; (b) keep any Work, the limit in
  prose.
- Ruling: "Q-M-001-44: A"
- Folded into: not yet (overrides R-063 on `commentaries`, per R-013)

R-071 to R-074 were answered together, with the ratification of M-001's slice
2: "ratify slice 2 with the R-070 edit, choices as recommended; Q-45 to Q-47:
A".

### R-071: Slice 2's drafted choices are kept as the reviewer recommended

- Date: 2026-11-20
- Raised in: M-001, the slice 2 review's list of choices the library does not
  license
- Question: Keep (1) ports as `readonly` function properties; (2) member names
  `now`, `integerBelow`, `keep`, `list`, `get`, `remove`, `deletionRecords`;
  (3) Random Source as one `integerBelow(bound)`; (4) Deletion Record as
  `{ consultationId, deletedAt: Moment }`; (5) EditionId's pattern
  `^[a-z0-9]+(?:-[a-z0-9]+)*$`; (6) EditionId in its own file before Edition;
  (7) per-Work Citation types and `list`'s result type unexported; (8)
  `readonly` arrays where R-063 wrote `EditionId[]`?
- Ruling: "choices as recommended"
- Folded into: not yet

### R-072: The Hexagram Statement Citation forbids a `line`

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-45, from the slice 2 review)
- Question: A 經 Line Statement Citation is assignable to the Hexagram Statement
  shape. (a) add `readonly line?: never` to the Hexagram Statement shape,
  keeping R-061's shapes; (b) keep as ruled, narrowing with `'line' in c`;
  (c) add a tag, amending R-061.
- Ruling: "Q-45 to Q-47: A"
- Folded into: not yet

### R-073: Random Source's bound is a caller-guaranteed precondition

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-46, from the slice 2 review)
- Question: What happens on a bad `bound` (0, negative, non-integer, above
  2³²)? (a) the doc comment states the precondition, a positive integer ≤ 2³²
  guaranteed by the caller; (b) a branded bound with a guard; (c) adapters
  throw `RangeError`.
- Ruling: "Q-45 to Q-47: A"
- Folded into: not yet

### R-074: The Store's keep and remove are idempotent

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-47, from the slice 2 review)
- Question: What do `keep` and `remove` do with an Id the Store already has?
  (a) both are idempotent, stated in the port's doc comments: `remove` always
  keeps the Deletion Record, even for an Id never held or already deleted;
  `keep` of an Id already held does nothing, the same Id always meaning the
  same content (ADR-0030), so merging stays symmetric and idempotent
  (ADR-0037); (b) both reject a repeat; (c) left to each adapter.
- Ruling: "Q-45 to Q-47: A"
- Folded into: not yet

### R-075: Reading Preference's commentaries comment reads "Commentaries, from the 十翼 Works"

- Date: 2026-11-20
- Raised in: M-001, the clerk's note on slice 2's landed
  `scripture-catalogue/src/reading-preference.ts`
- Question: The ratified comment "Commentaries, all of the 十翼" can be read as
  all ten wings, while the list holds four of them. Change it?
- Ruling: "change it to \"Commentaries, from the 十翼 Works\""
- Folded into: not yet (applied as a line-edit in M-001's slice 3)

R-076 to R-081 were answered together: "Q-48 to Q-53: A". Each records option
(a) of its question.

### R-076: `scripture-catalogue` may depend on `consultation-journal`, for `Day`

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-48)
- Question: R-068 types an Edition's `retrievedOn?: Day`, but `Day` and
  `isDay` live in `consultation-journal`, and Layout C (R-025) lets context
  packages import only `oracle`. (a) add the arrow `scripture-catalogue` →
  `consultation-journal`, reusing the ratified guard (no cycle; M-002's lint
  lists it); (b) move `Day` and `isDay` into `oracle`; (c) a separate day type
  for the witness.
- Ruling: "Q-48 to Q-53: A"
- Folded into: not yet

### R-077: Hexagram names come one per Edition shown, each labelled with its Edition

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-49)
- Question: What does the catalogue's "names" cover (ADR-0025: names belong to
  an Edition)? (a) one name per Edition shown, the Chinese one plus each
  chosen Translation in order, each labelled with its Edition, like passage
  text; (b) one name per Hexagram from the Edition of the preferred script;
  (c) every Edition's name, ignoring Reading Preference. A Received Sequence
  Number stays out of M-001's slice 3.
- Ruling: "Q-48 to Q-53: A"
- Folded into: not yet

### R-078: A passage-text result is `{ citation, edition: Edition, text }`

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-50)
- Question: What does a passage-text result carry (the glossary: it names its
  Edition and its Witness)? (a) `{ citation, edition: Edition, text }`,
  self-describing as ADR-0038 labels text with its Edition; (b) `{ citation,
editionId, text }`; (c) `{ edition, text }`.
- Ruling: "Q-48 to Q-53: A"
- Folded into: not yet

### R-079: The Scripture Catalogue port has one member per lookup, each returning a possibly empty list

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-51)
- Question: What shape is the Scripture Catalogue port? (a)
  `passageTexts(citation, preference)`, `hexagramNames(hexagram, preference)`
  and `editions(work)`, each returning a `readonly` array, empty when missing
  or gated (R-064), Reading Preference passed per call as the reader's; (b)
  the same members returning `undefined` on a miss.
- Ruling: "Q-48 to Q-53: A"
- Folded into: not yet

### R-080: A Yilin Verse is a passage text with a `yilin` Citation

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-52)
- Question: Is a Yilin Verse its own result type? (a) no: it is a passage text
  whose Citation is R-061's `yilin` shape, returned by `passageTexts`, with no
  separate member; (b) its own type and member `yilinVerses(standing,
emerging, preference)`.
- Ruling: "Q-48 to Q-53: A"
- Folded into: not yet

### R-081: `yilinVerse: false` hides the verse from readings only, not from lookups

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-53)
- Question: Does Reading Preference's `yilinVerse: false` also hide the verse
  from use case 8? (a) no: it shapes what a reading shows (use case 3); an
  explicit lookup (use case 8) returns what was asked for, the Licence Gate
  still applying; (b) yes, everywhere.
- Ruling: "Q-48 to Q-53: A"
- Folded into: not yet

R-082 to R-085 were answered together, with the ratification of M-001's slice
3: "ratify slice 3, choices as recommended; Q-54 to Q-56: A".

### R-082: Slice 3's drafted choices, as the reviewer recommended

- Date: 2026-11-20
- Raised in: M-001, the slice 3 review's list of choices the library does not
  license
- Question: Keep (1) Edition's script and language made exclusive by
  `?: never`; (2) `Edition.script` typed as Reading Preference's script; (3)
  Witness and the script/language variants unexported; (4) `language` a free
  string; (5) `passageTexts` ordered Chinese first, then each Translation; (6)
  the default Reading Preference on its own `scripture-catalogue` subpath; (7)
  `Hexagram` imported type-only, and M-002's lint treating type imports alike;
  and change (8) `tests/edition.test.ts` so its fixture throws, as for the id,
  if `isDay` rejects its date?
- Ruling: "choices as recommended"
- Folded into: not yet

### R-083: The Licence Gate hides text, not Editions

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-54, from the slice 3 review)
- Question: Does the Licence Gate hide Editions or only their text? (a)
  `editions(work)` lists every Edition and only text is gated, as the glossary
  and ADR-0038 have it, narrowing R-079 for `editions`; (b) gated Editions
  vanish from `editions` too.
- Ruling: "Q-54 to Q-56: A"
- Folded into: not yet (overrides R-079 for `editions`, per R-013)

### R-084: Every Edition has a Witness; it is the Edition that may be unidentified

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-55, from the slice 3 review)
- Question: The glossary labels **unidentified** the Edition behind a Witness,
  and says every passage text names its Edition and its Witness, but R-068 put
  `'unidentified'` on the witness. (a) every Edition carries a Witness
  (description and optional retrieval Day), and "unidentified" moves to the
  Edition side, the exact form drafted for the owner's line-edit, amending
  R-068; (b) keep R-068 and amend the glossary.
- Ruling: "Q-54 to Q-56: A"
- Note (clerk): R-068's option (a) came from a drafter's proposal the clerk
  passed on without checking it against the glossary.
- Folded into: not yet (overrides R-068 on the witness, per R-013)

### R-085: `commentaries` shapes readings only, not lookups

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-56, from the slice 3 review)
- Question: Does Reading Preference's `commentaries` filter explicit lookups?
  (a) no: like `yilinVerse` (R-081) it shapes readings only, stated in the
  port's doc comment; the Licence Gate still applies; (b) yes.
- Ruling: "Q-54 to Q-56: A"
- Folded into: not yet

### R-086: An Edition's `unidentified` flag, and what an unidentified Edition keeps

- Date: 2026-11-20
- Raised in: M-001, R-084's exact form, drafted for the owner's line-edit
- Question: (1) The flag's form: (a) `unidentified: boolean`, required, the
  glossary's own word, with known-only code requiring `unidentified: false`;
  (b) a string tag such as `identification: 'known' | 'unidentified'`. (2) What
  an unidentified Edition keeps: (a) its EditionId, licence, and script or
  language, since ADR-0038 addresses every Edition by id, the Licence Gate
  needs a licence, and the glossary puts every Edition in one script; (b) no
  EditionId; (c) always `'in-copyright'`.
- Ruling: "Edition as drafted: 1 A, 2 A"
- Folded into: not yet

R-087 to R-092 were answered together: "Q-57 to Q-62: A". Each records option
(a) of its question.

### R-087: A Division step returns the next Casting or a refusal naming the broken rule

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-57)
- Question: How does a step refuse an invalid Pick or a failed Transcription
  check? (a) a tagged result: the next Casting, or a refusal naming the broken
  rule with what ADR-0038's `422` must name (Line, Round, stalks, Pick, the
  rule); the caller decides what it means; (b) a precondition with a separate
  check; (c) a typed thrown error.
- Ruling: "Q-57 to Q-62: A"
- Folded into: not yet

### R-088: The Oracle derives a Round's stalk count from the Casting

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-58)
- Question: Where does a Round's stalk count come from? (a) derived by the
  Oracle: 49 at each Line's start, otherwise the previous Round's stalks minus
  its Set-aside; (b) passed by the caller; (c) a new field on the partial
  Casting.
- Ruling: "Q-57 to Q-62: A"
- Folded into: not yet

### R-089: `nextRound` gives the next Round's stalks, valid Picks and Remainder Groups

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-59)
- Question: Where do the next Round's valid Picks and Remainder Groups live?
  (a) a separate pure Oracle function `nextRound(casting)` returning the stalk
  count, the valid Picks (min and max) and the Remainder Groups keyed 1–4, in
  ADR-0038's JSON shape, the Casting holding nothing derived (R-053(2)); (b)
  fields on the partial Casting.
- Ruling: "Q-57 to Q-62: A"
- Folded into: not yet

### R-090: `emptyCasting` is a constant, ADR-0038's Empty Casting

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-60)
- Question: What starts a Casting? (a) a constant `emptyCasting`, ADR-0038's
  Empty Casting, "begin" staying use case 1's step; (b) a function
  `beginCasting()`.
- Ruling: "Q-57 to Q-62: A"
- Folded into: not yet

### R-091: A Transcription's four fields may each be absent; the step checks completeness

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-61)
- Question: What shape is a Transcription? (a) `{ pilesLeft, remainderLeft,
pilesRight, remainderRight }`, each a number or `undefined`, so the step
  applies ADR-0038's "complete" check itself; (b) four required numbers,
  completeness checked by each adapter.
- Ruling: "Q-57 to Q-62: A"
- Folded into: not yet

### R-092: The Division steps are `divide`, `transcribe`, `nextRound` and `emptyCasting` in `division.ts`

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-62)
- Question: What are the steps called and where do they live? (a) `divide`,
  `transcribe`, `nextRound` and `emptyCasting` in `oracle/src/division.ts` on
  subpath `./division`, after ADR-0038's form names and the glossary's
  Division; (b) one file per function.
- Ruling: "Q-57 to Q-62: A"
- Folded into: not yet

R-093 to R-096 were answered together: "Q-63 to Q-66: A". Each records option
(a) of its question.

### R-093: Each Division step replays its incoming Casting and refuses one that does not replay

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-63, from the slice 4 review)
- Question: May `divide` and `transcribe` trust the partial Casting they are
  given, when R-056 lets anyone build one? (a) each step replays the incoming
  Picks and refuses a Casting that does not replay, with a new rule
  `'casting'` in `DivisionRule`, so R-031's guarantee does not depend on
  callers; (b) trust it as a documented precondition; (c) brand the partial
  Casting, amending R-056.
- Ruling: "Q-63 to Q-66: A"
- Folded into: not yet

### R-094: `isCompleteCasting` checks stalks and Set-aside by the Round's position

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-64, from the slice 4 review)
- Question: Should the guard check by position? (a) yes: a Line's first Round
  has 49 stalks and Set-aside 5 or 9, its second and third Set-aside 4 or 8,
  as the glossary's Set-aside entry says; still shape, not replay (R-055); (b)
  keep the loose 4|5|8|9 and 3–49 check.
- Ruling: "Q-63 to Q-66: A"
- Folded into: not yet

### R-095: "refusal" is not a glossary term; prose writes it lowercase

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-65, from the slice 4 review)
- Question: Is Refusal a glossary term? (a) no: prose writes "refusal"
  lowercase, as R-087 does; `Refusal` stays the type's name; (b) add a
  glossary entry.
- Ruling: "Q-63 to Q-66: A"
- Folded into: not yet

### R-096: Slice 4's drafted choices, as recommended

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-66, from the slice 4 review)
- Question: Keep: (1) `./complete-casting` on its own subpath; (2) the Pick
  checked against its own Round's stalks, the guard's comment reworded to
  "never replays the Picks"; (3) `Refusal` without ADR-0038's valid range,
  `nextRound` giving it; (4) `NextRound`'s `{ min, max }` and
  `remainderGroups`; (5) the Round within its Line inline as `1 | 2 | 3`; (6)
  the rule ids and outcome names; (7) the result tagged by `outcome`, leaving
  `state` to the Casting; (8) a Transcription's keys required but possibly
  `undefined`; (9) the steps taking only a partial Casting.
- Ruling: "Q-63 to Q-66: A"
- Folded into: not yet

R-097 to R-099 were answered together: "Q-67 to Q-69: A". R-100 was given with
them.

### R-097: A replay refusal names the first Round that fails to replay

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-67, from the slice 4 review)
- Question: When a step refuses because the incoming Casting does not replay,
  what Line, Round and stalks does the refusal name? (a) the first Round that
  fails to replay, with its recorded stalks; (b) the Round the step would have
  taken next; (c) those fields optional for that rule.
- Ruling: "Q-67 to Q-69: A"
- Folded into: not yet

### R-098: `nextRound` returns the next Round or a refusal

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-68, from the slice 4 review)
- Question: What does `nextRound` do with a partial Casting that does not
  replay, or already holds 18 Rounds? (a) return either the next Round or a
  refusal, like the steps (R-087, R-093); (b) a documented precondition;
  (c) return `undefined`.
- Ruling: "Q-67 to Q-69: A"
- Folded into: not yet

### R-099: The guard keeps 3–49 stalks for a Line's second and third Rounds

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-69, from the slice 4 review)
- Question: Should `isCompleteCasting` restrict the second and third Rounds'
  stalks to their possible values (44 or 40; 40, 36 or 32)? (a) keep 3–49 as
  R-094 states, a Casting that slips through being caught when a step replays
  it (R-093); (b) restrict them.
- Ruling: "Q-67 to Q-69: A"
- Folded into: not yet

### R-100: The rule for a Casting that does not replay is named `'replay'`

- Date: 2026-11-20
- Raised in: M-001, the clerk's explanation of R-093's rule name
- Question: R-093's rule `'casting'` names what failed, while the other rules
  name a check. Rename it `'replay'`, after ADR-0026's "must replay"?
- Ruling: "rename 'casting' to 'replay'"
- Folded into: not yet (overrides R-093's rule name, per R-013)

### R-101: A partial Casting's limits are in its type

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-71, from Q-M-001-70)
- Question: Should the partial Casting's limits (at most five finished Lines of
  three Rounds, then an open Line of 0–2 Rounds, so fewer than 18) be in the
  type? (a) yes: `rounds` is exactly one of those 18 tuple shapes
  (`[...FinishedLines, ...OpenLine]`), amending R-053(1); M-002's lint adds
  `no-unsafe-assignment` so untyped data (e.g. from `JSON.parse`) cannot slip
  in; Q-M-001-70 falls away, since an 18-Round partial Casting cannot be
  represented; (b) keep R-053(1) and add a separate `'state'` rule.
- Ruling: "Q-M-001-71: A"
- Note (clerk): `'replay'` (R-093, R-100) stays, since types cannot check
  that Rounds follow from their Picks. R-098 now refuses only a Casting that
  does not replay.
- Folded into: not yet (overrides R-053(1), per R-013; the lint goes in
  M-002's boundary rules)

R-102 and R-103 were given with the ratification of M-001's slice 4: "I like
`FinishedLine`. `OpenLine` should be renamed to match `FinishedLine`.
Otherwise, ratify slice 4, line-edits as recommended."

### R-102: Slice 4's line-edits, as recommended

- Date: 2026-11-20
- Raised in: M-001, the slice 4 review's list and the R-098 change
- Question: Keep (1) `./complete-casting` on its own subpath, (2) inherited
  fields passing the guard, (6) the unimplemented bodies' `Error('Not
implemented', { cause })`, the success tag `'next'` with field `round`, and
  `nextRound`'s refusal narrowed to rule `'replay'`; reword (3) `Refusal`'s
  comment to "…except the valid range, which `nextRound` gives", (4) the
  landing commit message to lowercase "refusal", (5) the Transcription comment
  to "the step checks it is complete", citing no ADR?
- Ruling: "ratify slice 4, line-edits as recommended"
- Folded into: not yet

### R-103: The open Line's type is named `UnfinishedLine`

- Date: 2026-11-20
- Raised in: M-001, ratifying slice 4's `casting.ts`
- Question: The owner asked that `OpenLine` be renamed to match
  `FinishedLines`. Asked to choose: (a) `FinishedLines` + `UnfinishedLine`,
  keeping the plural for the list of finished Lines; (b) `FinishedLine` +
  `UnfinishedLine`; (c) `FinishedLines` + `OpenLines`.
- Ruling: "I like `FinishedLine`. `OpenLine` should be renamed to match
  `FinishedLine`." Then, choosing among the options: "FinishedLines +
  UnfinishedLine (Recommended)".
- Folded into: not yet

R-104 to R-110 were answered together: "Q-72 to Q-78: A". Each records option
(a) of its question; R-104 and R-109 record the revised option (a).

### R-104: The Resolution lives in `oracle`; the 經 Citation is built on its passage reference

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-72)
- Question: What is a Resolution and where does it live? (a, as revised)
  `oracle/src/resolution.ts`: the Standing and Emerging Hexagrams, the Moving
  Lines' positions, the Applicable Passages as Oracle-owned passage
  references, and per Hexagram its Trigrams and Nuclear, Inverse and Reversed
  Hexagrams (with a Trigram type), since the Oracle publishes passage
  references and the Catalogue conforms (glossary context map) and the rule is
  the Oracle's (ADR-0024); `scripture-catalogue`'s 經 Citation is re-expressed
  as `{ work: 'zhouyi' }` plus that passage reference, a small edit to slice
  2's `citation.ts`; use case 3 returns `{ resolution, passageTexts }`, a
  list; (b) Applicable Passages as Citations with the rule in `application`.
- Ruling: "Q-72 to Q-78: A"
- Folded into: not yet

### R-105: `presentation` is a pure package that `application` may import

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-73)
- Question: Use case 9 returns Typst source (R-035), but Layout C put
  `presentation` outside what `application` may import. (a) `presentation`
  joins the pure packages, since Presentation "decides nothing" (glossary);
  use case 9 takes the Store, the Catalogue, Consultation Ids and a Reading
  Preference; (b) a renderer port, amending ADR-0037; (c) use case 9 returns
  resolved data, amending R-035.
- Ruling: "Q-72 to Q-78: A"
- Folded into: not yet

### R-106: Use case 7 takes parsed legacy records

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-74)
- Question: What does use case 7 take? (a) parsed legacy records (Query,
  Divined At, and Picks or a Transformation), each kept as Cast after its
  Picks replay or as Recorded otherwise (ADR-0026), returning `{ kept,
unreadable }`; the `legacy-import` adapter parses (Layout C); (b) raw file
  texts.
- Ruling: "Q-72 to Q-78: A"
- Folded into: not yet

### R-107: Use case 10 is `exportJournal` and `mergeJournal`

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-75)
- Question: Is use case 10 one function or two? (a) two: `exportJournal`
  returns the Journal's Consultations and Deletion Records; `mergeJournal`
  merges another Journal in through the idempotent `keep` and `remove`
  (R-074), replaying incoming Castings with the Oracle's own steps from the
  Empty Casting (R-048), so no new Oracle function; (b) merge-in only.
- Ruling: "Q-72 to Q-78: A"
- Folded into: not yet

### R-108: Use cases reuse the failure patterns already ruled

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-76)
- Question: How does a use case report failure? (a) a Store or Catalogue
  failure rejects the Promise unchanged, a refused Division is a tagged result
  (R-087), and a miss is `undefined` (R-066), so use case 5 returns
  `undefined` for an unknown Id; (b) every use case returns a tagged result.
- Ruling: "Q-72 to Q-78: A"
- Folded into: not yet

### R-109: Use case 1 gains `nextRound` and `drawAutomaticPick`; R-026's package is `remainder-group-policy`

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-77)
- Question: Does use case 1 need more steps? (a, as revised) add `nextRound`,
  wrapping the Oracle's, and `drawAutomaticPick(ports{randomSource},
remainderGroups) → Pick`, which applies R-026's package (named
  `remainder-group-policy`, after ADR-0023) and carries no Oracle code, so the
  PWA can use it on the engine's Remainder Groups (ADR-0037, R-031) while the
  CLI feeds it `nextRound`'s; both then hand the Pick to `divide`; the package
  arrives in its own slice; (b) adapters import the Oracle and the policy
  directly.
- Ruling: "Q-72 to Q-78: A"
- Folded into: not yet

### R-110: Use cases 2 and 7 also take the Clock and Random Source

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-78)
- Question: R-032 has the use case build the Consultation Id from Clock and
  Random Source, beyond ADR-0037's table. (a) confirm it for use cases 2 and
  7, folding it into the table later; (b) the Store assigns those Ids,
  contradicting R-032.
- Ruling: "Q-72 to Q-78: A"
- Folded into: not yet

R-111 and R-112 were answered together, with the ratification of M-001's slice
5: "ratify slice 5, choices as recommended; Q-79 A".

### R-111: Slice 5's drafted choices; use-case and step names drop articles

- Date: 2026-11-20
- Raised in: M-001, the slice 5 review's list of choices the library does not
  license
- Question: Keep (1) the port-passing style: a `ports` object holding only the
  ports needed, then the inputs as plain parameters, as a cross-module
  convention; (2) each function's ports typed inline; (4) use case 8 as three
  functions on one subpath; (5) the Query and Division Method entering only at
  keep; (6) Browse leaving Unreadable files unfiltered, an empty filter
  keeping everything; (7) keep and record returning the kept Consultation; (8)
  `beginCasting` returning the shared `emptyCasting`; and settle (3) file and
  subpath names drop articles (`record-consultation`, `resolve-transformation`)?
- Ruling: "choices as recommended"
- Folded into: not yet

### R-112: keep trusts the caller's Division Method

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-79, from the slice 5 review)
- Question: keep cannot check the Division Method against how the Casting was
  made. (a) keep trusts the caller and its comment says so, since ADR-0027
  records who divided and only the caller knows (even `divide` cannot tell
  Virtual from Automatic); (b) record the method on the partial Casting,
  amending slice 1.
- Ruling: "Q-79 A"
- Folded into: not yet

R-113 and R-114 were answered together: "Q-80 A, Q-81 A".

### R-113: Use case 5 only loads; the caller resolves

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-80, from slice 6's draft)
- Question: ADR-0037 defines Open as "load it, then Resolve its
  Transformation" and has the PWA run it locally, but Resolving calls the
  Oracle, which the PWA cannot import (R-031). (a) use case 5 only loads:
  `openConsultation({ consultationStore }, id)` returns the Consultation or
  `undefined`, and the caller resolves (the CLI through use case 3, the PWA
  through the engine's link), amending ADR-0037's wording for use case 5;
  (b) keep it as stated and settle the PWA in Phase 6; (c) the Oracle behind a
  port.
- Ruling: "Q-80 A"
- Folded into: not yet (overrides ADR-0037's use case 5 wording, per R-013)

### R-114: The Resolution's Hexagram structure stays separate from ADR-0025's table row

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-81, from slice 6's draft)
- Question: Should the Resolution reuse the 64-row table's rows (which add the
  Fuxi Sequence Number)? (a) keep them separate, since the glossary's
  Resolution has no Fuxi number and the table does not exist yet; (b) hold the
  row type when the table arrives.
- Ruling: "Q-81 A"
- Folded into: not yet

R-115 to R-117 were answered together, with the ratification of M-001's slice
6: "ratify slice 6, line-edits as recommended; Q-82 A; Q-83 A".

### R-115: Slice 6's line-edits, as recommended

- Date: 2026-11-20
- Raised in: M-001, the slice 6 review's list of choices the library does not
  license
- Question: Keep (1) `HexagramStructure` unexported, (2) the field names
  `standing`, `emerging`, `lowerTrigram`, `nuclearHexagram` and the like, (3)
  `movingLines` as positions, (4) a Trigram as three Polarities; change (5) the
  小象 Citation's `'all-moving'` to come from the Oracle's passage reference,
  fixing its stale comment, and (6) state the order of use case 3's
  `passageTexts`: the Applicable Passages in order, each followed by its
  Commentaries, then the Yilin Verse, the order carrying no rank (ADR-0024);
  leave (7) `resolve`'s own `throw`, a private helper being Tier B?
- Ruling: "ratify slice 6, line-edits as recommended"
- Folded into: not yet

### R-116: Hexagram names stay out of use case 3's result for now

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-82, from the slice 6 review)
- Question: ADR-0037 describes use case 3 as "Hexagrams, structure, Applicable
  Passages with text", but R-104's `{ resolution, passageTexts }` carries no
  names. (a) keep it; Presentation or the CLI calls use case 8 for names, and
  the Phase 4 manual revisits what a reading contains; (b) add
  `hexagramNames` now, amending R-104.
- Ruling: "Q-82 A"
- Folded into: not yet (to revisit with `docs/manual/cli.md`)

### R-117: Passage Reference enters the glossary

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-83, from the slice 6 review)
- Question: Add a glossary entry for the public type `PassageReference`? (a)
  yes, as proposed: "**Passage Reference**: The Oracle's name for a passage of
  the 經: a Hexagram's Hexagram Statement, a Line Statement by its Line
  Position, or the All-Moving Statement. It names a passage, never its text;
  the Catalogue's 經 Citation is built on it. _Avoid_: reference (alone)."
  (b) leave it as context-map wording.
- Ruling: "Q-83 A"
- Note (clerk): read as accepting the proposed text; the owner may line-edit it.
- Folded into: CONTEXT.md (Passage Reference)

R-118 to R-122 were answered together: "Q-84 to Q-88: A". Each records option
(a) of its question.

### R-118: Use cases 7, 9 and 10 take replayed or resolved inputs; the caller does the Oracle work

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-84, from slice 7's draft)
- Question: ADR-0037 has the PWA run use cases 7, 9 and 10 locally, but as
  drafted they replay or resolve through the Oracle, which the PWA cannot
  import (R-031). (a) as R-113 did for 5: use case 7 takes records whose
  Casting is already complete, or a Transformation alone; `mergeJournal` takes
  a Journal whose Cast Consultations the caller has replayed; use case 9 takes
  ready readings (Consultation, Resolution, passage texts) instead of Ids; the
  CLI does the Oracle work through `application`'s steps and use case 3, the
  PWA through the engine and R-031's trust function, so none of the three
  carries Oracle code, amending ADR-0037's descriptions of 7, 9 and 10; (b)
  decide in Phase 6; (c) the Oracle behind a port.
- Ruling: "Q-84 to Q-88: A"
- Folded into: not yet (overrides ADR-0037's descriptions of use cases 7, 9 and 10, per R-013)

### R-119: The Remainder-Group policy takes a draw function

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-85, from slice 7's draft)
- Question: Does the policy take random integers or a way to draw them? (a) a
  draw function (`integerBelow`), since the second integer's range is the size
  of the group the first picks; (b) two steps, group then Pick; (c) two
  integers drawn in advance with fixed ranges, which would make Picks within a
  group unequally likely, against ADR-0023.
- Ruling: "Q-84 to Q-88: A"
- Folded into: not yet

### R-120: A legacy import takes one Division Method for all its Cast Consultations

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-86, from slice 7's draft)
- Question: ADR-0030 requires a Division Method on every Cast Consultation and
  ADR-0026 makes a replayable legacy table one, but nothing says which method.
  (a) the import asks once and one method, a use-case input, applies to the
  whole import, since the person importing knows how they cast; (b) the parser
  supplies it per file, if the files reveal it; (c) allow none, amending
  ADR-0030.
- Ruling: "Q-84 to Q-88: A"
- Folded into: not yet

### R-121: The value passed between `exportJournal` and `mergeJournal` is the glossary's Journal

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-87, from slice 7's draft)
- Question: What is that value? (a) the glossary's Journal, `{ consultations,
deletionRecords }`, in `consultation-journal`, without Unreadable files; (b)
  an unnamed type; (c) ADR-0037's word "bundle".
- Ruling: "Q-84 to Q-88: A"
- Folded into: not yet

### R-122: The legacy import is one-shot; importing twice keeps readings twice

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-88, from slice 7's draft)
- Question: Each import mints new Ids (R-032), so importing twice keeps every
  reading twice. (a) accept it and document the import as one-shot, a
  migration, not a sync; (b) skip records matching an existing Consultation;
  (c) derive the Id from content, contradicting R-032.
- Ruling: "Q-84 to Q-88: A"
- Folded into: not yet

R-123 to R-125 were answered together: "Q-89 A, Q-90 A; choices as
recommended".

### R-123: Use case 7 returns the kept Consultations only

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-90, from slice 7's review)
- Question: R-106 had use case 7 return `{ kept, unreadable }`, but under R-118
  the caller parses and replays, so nothing it receives can fail to load. (a)
  amend R-106: return the kept Consultations only and drop the records'
  `location` field; files that fail are the adapter's to report; (b) keep
  `{ kept, unreadable }` with the caller passing failures in; (c) keep the
  shape with `unreadable` always empty.
- Ruling: "Q-90 A"
- Folded into: not yet (overrides R-106 on the return, per R-013)

### R-124: Use case 9's input is an unnamed type

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-89, from slice 7's draft)
- Question: What is use case 9's input called, given "reading" is an Avoid
  term? (a) an unnamed type `{ consultation, resolution, passageTexts }`, the
  parameter named `consultations`, reusing use case 3's field names; (b)
  derived from use case 3's result type; (c) a new glossary term.
- Ruling: "Q-89 A"
- Folded into: not yet

### R-125: Slice 7's drafted choices, as recommended

- Date: 2026-11-20
- Raised in: M-001, slice 7's review list
- Question: Accept (1) use case 9 dropping R-105's Reading Preference, since the
  passage texts reflect it, narrowing R-105; (2) legacy records told apart by
  `casting: undefined`; (3) use case 9 trusting that each Resolution and its
  passage texts belong to that Consultation, said in its comment; (4)
  `mergeJournal` returning nothing; (6) the policy package's private
  not-implemented helper; change (5) `drawAutomaticPick` to wrap `integerBelow`
  in an arrow function so a class-based adapter keeps `this`; and (7) describe
  only the final state in the landing commit message?
- Ruling: "choices as recommended"
- Folded into: not yet

### R-126: Slice 7's line-edits, as recommended

- Date: 2026-11-20
- Raised in: M-001, ratifying slice 7 ("ratify slice 7, line-edits as
  recommended")
- Question: Change (1) use case 7's comment "a migration and not a sync" to
  "a migration, run once", keeping the Avoid term "sync" out of source, and
  (6) write the landing message for the final state only; keep (2)
  `LegacyRecord` as an exported name, (3) the Division Method required even
  with no Casting, (4) the policy's input typed as
  `NextRound['remainderGroups']`, (5) the policy package without tests until
  its body?
- Ruling: "ratify slice 7, line-edits as recommended"
- Folded into: not yet

### R-127: cli-adapter has no public surface until Phase 4

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-91, from slice 8)
- Question: tsdown builds a package from its `exports`, so a package with
  nothing to export cannot build. (a) `cli-adapter` is `"private": true`, with
  no `exports` beyond `./package.json`, no build script and no
  `tsdown.config.ts` until Phase 4 adds the CLI's entry point; its composition
  root is an unexported `src/composition-root.ts`; it keeps `type:check` and
  `test` so R-023's command runs, as the legacy `apps/cli` is private with no
  `exports`; (b) an exported placeholder subpath; (c) a tsdown entry with no
  matching `exports` entry, breaking ADR-0003.
- Ruling: "Q-M-001-91: A"
- Folded into: not yet

### R-128: The empty composition root's lint warning is accepted until the skeleton fills it

- Date: 2026-11-20
- Raised in: M-001 (question Q-M-001-92, from slice 8)
- Question: `cli-adapter`'s `src/composition-root.ts` must exist (tsc rejects a
  package with no source files) and holds only `export {}`, which oxlint warns
  on (`unicorn/require-module-specifiers`); without it the empty file is a lint
  error. (a) accept the one warning until M-001's walking skeleton (R-028) wires
  this file, adding no escape hatch; (b) suppress it in that line, the first
  suppression in `overhaul/`; (c) turn the rule off for `cli-adapter`.
- Ruling: "Q-92 A"
- Folded into: not yet

### R-129: Slice 8's choices, as recommended

- Date: 2026-11-20
- Raised in: M-001, ratifying slice 8 ("ratify slice 8, choices as
  recommended")
- Question: Keep (1) vitest's `--passWithNoTests` in `cli-adapter`, like its
  siblings, with M-001's acceptance counting only once the skeleton test
  exists and passes; (2) the `application` dependency declared before any code
  imports it, as R-127 names it; (3) `"license": "MIT"` on the private
  package, as the legacy `apps/cli` and siblings have it?
- Ruling: "ratify slice 8, choices as recommended"
- Folded into: not yet
