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
