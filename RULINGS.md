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

R-130 to R-134 were answered together: "Q-93 to Q-97: A". Each records option
(a) of its question, a spec hole from the tester's audit of the walking skeleton.

### R-130: The walking skeleton's driving side is a function the composition root exports

- Date: 2026-11-21
- Raised in: M-001 (question Q-M-001-93, a spec hole)
- Question: What does the skeleton test call in `cli-adapter`? (a) the
  composition root exports one function, e.g. `composeCli(ports)`, returning
  use case 8's three lookups with the ports supplied; the test imports it
  within the package through `#src`, so R-127's no-public-surface still holds;
  Phase 4's CLI calls it and adds its own input and output; the name is for
  the owner's line-edit; (b) a CLI-shaped `run(argv, io)`; (c) a separate
  driving-adapter file.
- Ruling: "Q-93 to Q-97: A"
- Folded into: not yet

### R-131: The composition root takes the ports; the stub lives in the tests

- Date: 2026-11-21
- Raised in: M-001 (question Q-M-001-94, a spec hole)
- Question: Where does the stub Scripture Catalogue live? (a) the composition
  root takes the ports as input and the test passes an invented stub, never in
  `src`; later phases pass real adapters the same way; (b) an in-memory stub
  in `src`; (c) both.
- Ruling: "Q-93 to Q-97: A"
- Folded into: not yet

### R-132: The skeleton covers all three of use case 8's lookups

- Date: 2026-11-21
- Raised in: M-001 (question Q-M-001-95, a spec hole)
- Question: Which lookups does the skeleton cover? (a) all three:
  `lookUpPassageTexts`, `lookUpHexagramNames` and `lookUpEditions`; (b) only
  passage texts; (c) passage texts plus a `yilin` Citation.
- Ruling: "Q-93 to Q-97: A"
- Folded into: not yet

### R-133: The skeleton passes typed values; the caller supplies the Reading Preference

- Date: 2026-11-21
- Raised in: M-001 (question Q-M-001-96, a spec hole)
- Question: What goes in and out, and where does the Reading Preference come
  from? (a) typed values in and out, no text format, the caller passing the
  Reading Preference; formats, empty-result output and exit codes are the CLI
  manual's, in Phase 4; (b) typed values with the default Reading Preference
  filled in by the adapter; (c) a minimal text format now.
- Ruling: "Q-93 to Q-97: A"
- Folded into: not yet

### R-134: The skeleton's driving side rejects a Catalogue failure unchanged

- Date: 2026-11-21
- Raised in: M-001 (question Q-M-001-97, a spec hole)
- Question: What does the driving side do when the Catalogue fails? (a) it
  rejects unchanged, as the use case does (R-108), with no exit-code policy
  until Phase 4; (b) it maps the failure to an error value; (c) it maps it to
  exit 1 and a message.
- Ruling: "Q-93 to Q-97: A"
- Folded into: not yet

R-135 to R-137 were answered together: "Q-98 to Q-100: A". Each records option
(a) of its question, from the tester's second audit of the walking skeleton.

### R-135: cli-adapter's tests may use `scripture-catalogue` as a dev dependency

- Date: 2026-11-21
- Raised in: M-001 (question Q-M-001-98)
- Question: The skeleton tests must build branded `EditionId`s through
  `isEditionId` (R-045, R-051), which lives in `scripture-catalogue`, but
  `cli-adapter` depends only on `application` (R-127). (a) declare
  `scripture-catalogue` as a dev dependency of `cli-adapter`, used only by the
  tests, adding no production dependency; (b) a full dependency now; (c)
  `application` re-exports the guard, which R-018 forbids.
- Ruling: "Q-98 to Q-100: A"
- Folded into: not yet

### R-136: A port that throws synchronously is outside its contract

- Date: 2026-11-21
- Raised in: M-001 (question Q-M-001-99)
- Question: What if a port throws instead of rejecting? (a) outside the port's
  contract: the port is async (R-039), the adapter that throws is at fault,
  and the tests use rejected Promises only; (b) the driving side turns a throw
  into a rejection; (c) a throw passes through synchronously.
- Ruling: "Q-98 to Q-100: A"
- Folded into: not yet

### R-137: The composition root is `composeCli` returning use case 8's bound lookups

- Date: 2026-11-21
- Raised in: M-001 (question Q-M-001-100)
- Question: Approve the composition root's shape (R-130): `composeCli(ports: {
readonly scriptureCatalogue: ScriptureCatalogue })` returning `{
lookUpPassageTexts(citation, preference), lookUpHexagramNames(hexagram,
preference), lookUpEditions(work) }`, each use case 8's signature minus its
  ports argument with the same Promise type, imported by the tests as
  `#src/composition-root.js`. (a) approve; (b) rename.
- Ruling: "Q-98 to Q-100: A"
- Folded into: not yet

R-138 to R-142 were answered together at Phase 1's milestone: "PH1-1: A but 60
owner touches per Matter" and "PH1-2 to PH1-5: A".

### R-138: Caps of 60 owner touches per Matter and 1,500 lines per brief

- Date: 2026-11-21
- Raised in: the Phase 1 milestone (question Q-PH1-1, per R-006)
- Question: Set the caps from Phase 1's figures (125 touches for one Matter that
  was itself the Tier-A surface; briefs of 250 to ~1,700 lines). (a) 40 owner
  touches per Matter and 1,500 lines of required reading per brief; reaching
  either stops the loop and asks the owner, and is not a failure; (b) per-phase
  caps; (c) other figures.
- Ruling: "PH1-1: A but 60 owner touches per Matter"
- Folded into: MATTERS.md (phase table)

### R-139: The week budgets of Phases 3–6 stand until Phase 2 lands

- Date: 2026-11-21
- Raised in: the Phase 1 milestone (question Q-PH1-2, per R-009)
- Question: Phase 1 took 2 days of 2 weeks. (a) leave the week budgets as they
  are, let the touch caps bind, and revisit after Phase 2; (b) halve them now.
- Ruling: "PH1-2 to PH1-5: A"
- Folded into: not yet

### R-140: M-002 starts with an agent-drafted boundary-rules proposal

- Date: 2026-11-21
- Raised in: the Phase 1 milestone (question Q-PH1-3)
- Question: How does M-002 start? (a) as R-022 did for M-001: a fresh agent
  drafts the boundary-rules proposal (purity list with `remainder-group-policy`,
  R-055's import rule, R-057's assertion ban, R-101's `no-unsafe-assignment`,
  Layout C's arrows with R-076 and R-109, R-031's PWA subpath rule), a knife-edge
  Acceptance command and a Free to choose, for the owner to rule on; (b) a
  copilot session with the owner.
- Ruling: "PH1-2 to PH1-5: A"
- Folded into: not yet

### R-141: Draft an amendment to ADR-0040: a wider Free to choose and ratification by exception

- Date: 2026-11-21
- Raised in: the Phase 1 milestone (question Q-PH1-4, from the owner's own
  suggestion of an overseeing agent)
- Question: Amend ADR-0040's tiers? (a) both: widen Free to choose to private
  names, comment wording and helper structure within a ratified concept; and
  ratify by exception: each slice arrives as one digest of uncontested items the
  owner ratifies in one line, and only items a fresh challenger agent contests
  come as questions; the owner keeps every decision; drafted as an amendment for
  the owner to ratify; (b) only the wider Free to choose; (c) keep the process.
- Ruling: "PH1-2 to PH1-5: A"
- Note (clerk): this licenses the draft only; nothing changes in the process
  until the owner ratifies the amendment.
- Folded into: not yet

### R-142: Dispose of the cold-read findings as recommended

- Date: 2026-11-21
- Raised in: the Phase 1 milestone (question Q-PH1-5)
- Question: The five cold-read findings (Minutes, "Phase 1 milestone"). (a)
  finding 1 is covered by M-002's R-055 lint, and keep's comment is fixed as a
  line-edit in M-002's first slice; findings 2 and 3 get one-line "why" comments
  as line-edits there too; finding 4 comes to the owner when the catalogue
  adapter's Matter is defined; finding 5 is a spec hole recorded for the Browse
  Matter; (b) a follow-up Matter for findings 1 to 4 now.
- Ruling: "PH1-2 to PH1-5: A"
- Folded into: MATTERS.md (M-002 notes)

R-143 to R-145 were answered together: "ADR41-1 to ADR41-3: A".

### R-143: ADR-0041 is accepted, with its Why corrected

- Date: 2026-11-21
- Raised in: the Phase 1 milestone, ratifying the draft R-141 licensed
  (question Q-ADR41-1)
- Question: Accept ADR-0041 (ratification by exception and a wider Free to
  choose)? (a) accept it with one line-edit to its Why: the ~20 routine
  touches were "mostly public shape details accepted unchanged, and some
  private names and comment wording", and the digest, more than the wider Free
  to choose, is what absorbs them; (b) accept as written; (c) the owner
  line-edits further first.
- Ruling: "ADR41-1 to ADR41-3: A"
- Folded into: ADR-0041

### R-144: ADR-0040 and ADR-0041 are consolidated into one text before M-002

- Date: 2026-11-21
- Raised in: the Phase 1 milestone (question Q-ADR41-2)
- Question: ADR-0040 requires amended ADRs to be folded into one text before
  anything depends on them. (a) consolidate now: a copilot folds 0040 and 0041
  into a new ADR-0042 for the owner to ratify, before M-002 runs under the new
  process; (b) leave 0041 separate until a later fold batch.
- Ruling: "ADR41-1 to ADR41-3: A"
- Folded into: not yet (ADR-0042, to be drafted)

### R-145: "Private" under the wider Free to choose means private to the package

- Date: 2026-11-21
- Raised in: the Phase 1 milestone (question Q-ADR41-3)
- Question: (a) private means not reachable from the package's `exports`, so
  code shared between a package's files through `#src` is private, the boundary
  Layout C and R-018 already use; (b) private to the file.
- Ruling: "ADR41-1 to ADR41-3: A"
- Folded into: ADR-0041

### R-146: ADR-0042 is accepted; AGENTS.md's Tier-B summary gains one sentence

- Date: 2026-11-21
- Raised in: the Phase 1 milestone, ratifying the consolidation R-144 ordered
  (question Q-ADR42-1)
- Question: Accept ADR-0042, which folds ADR-0040 and ADR-0041 into one text and
  adds R-144's option (b) as a rejected option? (a) accept it, with one line-edit
  to AGENTS.md's Tier-B summary saying that private names, comment wording and
  helper structure within a ratified concept are Tier B and that uncontested
  choices reach the owner as one digest; then land 0041 (Accepted), 0042
  (Accepted, superseding 0040 and 0041) and the reference updates; (b) accept as
  drafted; (c) the owner line-edits first.
- Ruling: "ADR42-1: A"
- Folded into: ADR-0042; AGENTS.md

R-147 to R-157 were answered together: "M002-2 to M002-11: A; digest ratified".
R-147 to R-156 record option (a) of their questions; R-157 is the digest.

### R-147: M-002 is split: M-002 keeps signal 3; a new Matter takes signals 1, 2 and 4

- Date: 2026-11-21
- Raised in: M-002 (question Q-M-002-2)
- Question: (a) split: M-002 keeps signal 3 (dependency and purity rules) with
  Acceptance `pnpm lint:check && pnpm drift:prove`; a new Matter takes signals
  1, 2 and 4 with `pnpm lint:check && pnpm drift:check && pnpm drift:prove`,
  using Phase 2's 2-Matter budget, each with its own 60-touch cap; the
  proposal's Q1, Q2, Q6 and the regex scope of signals 2 and 4 move to that
  Matter's proposal; (b) one Matter.
- Ruling: "M002-2 to M002-11: A"
- Folded into: not yet

### R-148: `lint:check` also checks each manifest's arrows (B9)

- Date: 2026-11-21
- Raised in: M-002 (question Q-M-002-3)
- Question: What makes signal 3 build-failing, given B9 lived only in the
  prover? (a) `lint:check` also runs B9's manifest check, so every landing
  fails on a bad arrow; `drift:prove` stays acceptance-only; (b) lint also
  becomes a turbo dependency of `build`.
- Ruling: "M002-2 to M002-11: A"
- Folded into: not yet

### R-149: The non-null `!` is a type assertion too

- Date: 2026-11-21
- Raised in: M-002 (question Q-M-002-4)
- Question: What does R-051 count as a type assertion? (a) `as` and `<T>`,
  plus the non-null `!` (`no-non-null-assertion`, off in the shared config);
  (b) only `as` and `<T>`; (c) also `@ts-expect-error`.
- Ruling: "M002-2 to M002-11: A"
- Folded into: not yet

### R-150: The pure packages' effect list, with dynamic imports and `globalThis` closed

- Date: 2026-11-21
- Raised in: M-002 (question Q-M-002-5)
- Question: What counts as an effect in the pure packages (B1, B2)? (a) all
  `node:*` modules plus the globals `crypto`, `performance`, `process`,
  `fetch` and the timers; also ban dynamic `import()` of `node:*`, and
  restrict `globalThis`, `self` and `window` there so
  `globalThis.Math.random()` cannot pass; (b) only R-020's four.
- Ruling: "M002-2 to M002-11: A"
- Folded into: not yet

### R-151: Future packages' rules come with them; B13's analysis is built now; the policy imports `oracle` as types only

- Date: 2026-11-21
- Raised in: M-002 (question Q-M-002-6)
- Question: (a) B10 strict now (`oracle` only); the PWA's Matter adds its
  trust file, B13 and B14 for the REST engine; B13's knowledge is built now, a
  script listing which `application` subpaths load Oracle code;
  `remainder-group-policy` must import `oracle` as types only (R-109); the PWA
  may import types from `oracle`; (b) patterns now with a guessed trust-file
  path.
- Ruling: "M002-2 to M002-11: A"
- Folded into: not yet

### R-152: `scripture-catalogue` may import only `consultation-journal/divined-at`

- Date: 2026-11-21
- Raised in: M-002 (question Q-M-002-7)
- Question: How far may `scripture-catalogue` depend on
  `consultation-journal`, R-076 having granted it for `Day`? (a) only its
  `/divined-at` subpath; (b) the whole package.
- Ruling: "M002-2 to M002-11: A"
- Folded into: not yet

### R-153: `no-unsafe-argument` and `no-unsafe-return` join R-101's rule

- Date: 2026-11-21
- Raised in: M-002 (question Q-M-002-8)
- Question: `no-unsafe-assignment` misses untyped data passed as an argument
  or returned (`divide(JSON.parse(s))`). (a) add `no-unsafe-argument` and
  `no-unsafe-return`, beyond R-101's letter but serving it; (b) only what
  R-101 names.
- Ruling: "M002-2 to M002-11: A"
- Folded into: not yet

### R-154: R-142's line-edits land in whichever of M-002's slices lands first

- Date: 2026-11-21
- Raised in: M-002 (question Q-M-002-9)
- Question: The Free to choose leaves slice order to the implementer, but
  M-002's notes put R-142's line-edits in its first slice. (a) pin them to
  whichever slice lands first; (b) leave the order fully free.
- Ruling: "M002-2 to M002-11: A"
- Folded into: not yet

### R-155: Keep's and R-076's comments, reworded

- Date: 2026-11-21
- Raised in: M-002 (question Q-M-002-10)
- Question: (a) keep's comment states only keep's fact, "It takes only a
  complete Casting and does no replay (ADR-0026)", not who makes one, since
  R-031 and R-055 are not folded into an ADR; R-076's comment reads "Reuses
  `Day` from `consultation-journal`.", avoiding the glossary's Journal and the
  unused guard; (b) fold R-031 and R-055 into an ADR first.
- Ruling: "M002-2 to M002-11: A"
- Folded into: not yet

### R-156: M-002's Acceptance is `pnpm lint:check && pnpm drift:prove`

- Date: 2026-11-21
- Raised in: M-002 (question Q-M-002-11)
- Question: (a) under R-147, `pnpm lint:check && pnpm drift:prove`,
  `drift:prove` exiting 0 only if every planted violation is caught by its own
  rule and every clean twin passes, its expected list fixed in the prover; (b)
  the full command under one Matter.
- Ruling: "M002-2 to M002-11: A"
- Folded into: not yet

### R-157: Digest of M-002's uncontested proposal items (15 items)

- Date: 2026-11-21
- Raised in: M-002, ratification by exception (ADR-0042) over
  `docs/reviews/2026-11-21-m-002-boundary-rules.md`; a fresh challenger left
  these 15 of 26 items uncontested
- Items, each as recommended: (1) B3 `oracle` imports no `@hexagram/*`; (2) B6
  `application` imports only the four domain packages; (3) B7
  `cli-adapter/src` imports only `application`; (4) B8 `cli-adapter/tests` may
  also import `scripture-catalogue`; (5) B10 `isCompleteCasting` imported only
  in `oracle`, by `importNames`. Free to choose: (6) file names and layout under
  `scripts/drift/`; (7) TypeScript run by `tsx`; (8) the scripts' and prover's
  internal structure; (9) lint message and output wording; (10) B10 by name or
  by subpath; (11) allow-lists as regex or negated patterns; (12) how a
  typed-lint plant is admitted; (13) the "not free" line. (14) M-002's own
  slices, order and contents, each under 400 lines, the fourth conditional on
  R-151. (15) R-050's comment: "Repeated from its Casting, so every
  Consultation carries one here."
- Ruling: "digest ratified"
- Folded into: MATTERS.md (M-002)

R-158 to R-166 were answered together: "M002-12 to M002-20: A". Each records
option (a) of its question, a spec hole from the tester's audit of M-002.

### R-158: Each boundary rule's message starts with its B-number; the prover keys on it

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-12, a spec hole)
- Question: How does the prover tie a report to its rule, when several share
  one ESLint key and R-157 left wording free? (a) every message starts with
  its B-number, the expected list is keyed by B-number, and reports from rules
  outside B1 to B12 are ignored on plants, narrowing R-157(9); (b) key by
  ESLint rule ID plus path.
- Ruling: "M002-12 to M002-20: A"
- Folded into: not yet

### R-159: B1 also bans built-ins without the `node:` prefix

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-13, a spec hole)
- Question: Does B1 ban `import fs from 'fs'` in the pure packages? (a) yes,
  B1 stands alone rather than relying on oxlint's `prefer-node-protocol`; (b)
  leave it to oxlint.
- Ruling: "M002-12 to M002-20: A"
- Folded into: not yet

### R-160: B2's timers

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-14, a spec hole)
- Question: Which timers does B2 ban? (a) `setTimeout`, `setInterval`,
  `setImmediate`, their `clear*` counterparts and `queueMicrotask`; `Date()`
  without `new` is already the clock; (b) only the three `set*` functions.
- Ruling: "M002-12 to M002-20: A"
- Folded into: not yet

### R-161: Only a top-level `import type` counts as type-only for B4

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-15, a spec hole)
- Question: Does `import { type X } from '@hexagram/oracle/x'` in
  `remainder-group-policy` count as type-only? (a) no, it fails B4: under
  `verbatimModuleSyntax` it compiles to an empty import that loads Oracle
  code, against R-109; only a top-level `import type` passes; (b) it passes.
- Ruling: "M002-12 to M002-20: A"
- Folded into: not yet

### R-162: A dynamic `import()` of a `@hexagram/*` package is held to the package's arrows

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-16, a spec hole)
- Question: (a) a dynamic `import()` of another `@hexagram/*` package fails
  that package's B-rule, as R-150 did for `node:*`; (b) out of scope.
- Ruling: "M002-12 to M002-20: A"
- Folded into: not yet

### R-163: A relative import that leaves the package fails the package's arrows

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-17, a spec hole)
- Question: (a) `../../../oracle/src/...` from another package fails that
  package's B-rule; R-019's ban on deep `../` chains within a package stays
  unassigned; (b) a new rule; (c) out of scope.
- Ruling: "M002-12 to M002-20: A"
- Folded into: not yet

### R-164: B11 also catches the definite-assignment `!`

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-18, a spec hole)
- Question: Does B11 catch `let x!: T` and a class field `y!: T`? (a) yes,
  through an added selector, since it switches off a check as the non-null `!`
  does (R-149); (b) it passes.
- Ruling: "M002-12 to M002-20: A"
- Folded into: not yet

### R-165: B3 to B6 cover whole packages; B9 checks the dependency field

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-19, a spec hole)
- Question: (a) B3 to B6 cover each whole package, `tests/` included, R-135's
  B8 excepted; B9 checks the field, so `scripture-catalogue` under
  `cli-adapter`'s `dependencies` rather than `devDependencies` fails; (b)
  `src/` only, and B9 ignores the field.
- Ruling: "M002-12 to M002-20: A"
- Folded into: not yet

### R-166: Aliased `Math` and `Date` are a stated limit of B2

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-20, a spec hole)
- Question: (a) aliases such as `const m = Math; m.random()` pass, a stated
  limit of lint with no plant, left to review, as banning `Math` and `Date`
  outright would forbid honest arithmetic like `Math.floor`; (b) ban the
  objects outright in the pure packages.
- Ruling: "M002-12 to M002-20: A"
- Folded into: not yet

R-167 to R-169 were answered together: "M002-21 to M002-23: A". Each records
option (a) of its question, a spec hole from the tester's second audit of M-002.

### R-167: Clean twins are judged by B1 to B12 only

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-21, a spec hole)
- Question: R-158 ignores non-B reports on plants; must a clean twin get no
  report from any rule? (a) twins are judged by B1 to B12 only, like plants;
  (b) twins must get no report from any rule.
- Ruling: "M002-21 to M002-23: A"
- Folded into: not yet

### R-168: B10 also catches `isCompleteCasting` reached by dynamic import

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-22, a spec hole)
- Question: Does `await import('@hexagram/oracle/complete-casting')` outside
  `oracle` fail B10? (a) yes, through an added check, as R-162 closed the same
  route for the arrows and R-055 says "imported only"; (b) it passes, a stated
  limit.
- Ruling: "M002-21 to M002-23: A"
- Folded into: not yet

### R-169: A type-position `import()` is an arrow, but type-only for B4

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-23, a spec hole)
- Question: `type P = import('@hexagram/oracle/pick').Pick`. (a) it counts as an
  arrow for B3 to B8, since it names the package, and as type-only for B4,
  since it loads no code (R-109's concern); (b) it fails B4 too; (c) out of
  scope.
- Ruling: "M002-21 to M002-23: A"
- Folded into: not yet

### R-170: B1 reports a type-position `import('node:*')` in a pure package

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-24), with the owner's approval of M-002's
  acceptance list ("approve the list; Q-24 A")
- Question: R-169 ruled type-position `import()` only for `@hexagram/*`
  packages. (a) B1 reports `import('node:fs')` in a type position in a pure
  package, as it does a type-only `node:fs` import, with one added plant; (b)
  leave it unplanted and unruled.
- Ruling: "Q-24 A"
- Note (clerk): the same message approved M-002's acceptance list (51 plants,
  13 twins, `expected.ts`, at a16464e), plus this one plant; a test-list
  approval, not a Ruling.
- Folded into: not yet

R-171 and R-172 were answered together: "M002-25 A, M002-26 A".

### R-171: A relative import fails only when it lands inside another package

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-25, from slice 1)
- Question: Read literally, R-163 fails every package's `vitest.config.ts`,
  which imports the repo-root `vitest.config.base.js`. (a) a relative import
  fails only when it lands inside another package (any folder with a
  `package.json`, legacy packages included), refining R-163; (b) exempt only
  files directly in the repository root; (c) limit the arrows to `src/` and
  `tests/`, narrowing R-165.
- Ruling: "M002-25 A"
- Folded into: not yet (refines R-163, per R-013)

### R-172: B9 also checks peer and optional dependencies

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-26, from slice 1)
- Question: (a) B9 checks `peerDependencies` and `optionalDependencies` as well
  as `dependencies` and `devDependencies`; (b) leave them unchecked.
- Ruling: "M002-26 A"
- Folded into: not yet

R-173 and R-174 were answered together: "M002-27 A, M002-28 A".

### R-173: M-002's slice 1 lands as one unit at 445 lines

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-27, from slice 1's review)
- Question: R-157(14) ratified slices "each under 400 lines"; slice 1 adds 445.
  (a) accept it as one unit, since the rules are proved only together with the
  prover; (b) split the prover off first; (c) read item 14 as the ~400-line
  guide in AGENTS.md from now on.
- Ruling: "M002-27 A"
- Folded into: not yet

### R-174: B2 also closes Node's `global`

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-28, from slice 1's review)
- Question: R-150 closed `globalThis`, `self` and `window`, but `global.Math.random()`
  lints clean in the pure packages. (a) add `global` to B2's list with one more
  plant, an addition to the approved acceptance material, made in slice 2; (b)
  a stated limit, like R-166.
- Ruling: "M002-28 A"
- Folded into: not yet

R-175 and R-176 were answered together: "M002-29 A, M002-30 A".

### R-175: B10 also matches a relative path to oracle's guard source

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-29, from slice 2's review)
- Question: In a folder outside the six packages, `import * as m from
'../../oracle/src/complete-casting.ts'` passes B10, which matches by name or
  by the `@hexagram/oracle/complete-casting` subpath. (a) B10 also matches any
  relative path ending at oracle's `complete-casting` source, keeping R-151's
  "strict now" for packages not yet built; (b) a limit until that package's
  Matter adds its arrows.
- Ruling: "M002-29 A"
- Folded into: not yet

### R-176: M-002's rules cover plain JavaScript files in overhaul/ too

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-30, from slice 2's review)
- Question: Every M-002 rule applies only to `.ts`, `.tsx`, `.mts` and `.cts`;
  `overhaul/` holds no plain JavaScript source today. (a) the rules apply to
  `.js`, `.mjs` and `.cjs` in `overhaul/` too, with one added plant; (b) ban
  plain JavaScript in `overhaul/`, a new convention; (c) a stated limit while
  none exist.
- Ruling: "M002-30 A"
- Folded into: not yet

### R-177: B10's blind spot for oracle's built `dist` output is a stated limit

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-31, from slice 3's review)
- Question: A relative import of `overhaul/oracle/dist/complete-casting.*` passes
  B10 unless it names `isCompleteCasting`. (a) a stated limit: named imports are
  caught, the route is unusual, and `dist` is not checked in; (b) extend R-175's
  match to `dist`.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-178: The subpath analysis prints every subpath as loads or free, with the chain

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-32, slice 4's spec audit)
- Question: What R-151's script outputs. (a) every `application` subpath marked
  "loads" or "free", with the import chain that reaches Oracle code for each
  "loads"; the same function is called by the prover; nothing generated is
  committed; (b) only the Oracle-loading subpaths; (c) a committed JSON file
  that B13 reads later, with a freshness check.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-179: The analysis has its own command and is proved inside `drift:prove`

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-33, slice 4's spec audit)
- Question: (a) both: a new `pnpm drift:oracle-subpaths` runs it on the real
  tree, and `drift:prove` proves it on fixtures; (b) proof inside
  `drift:prove` only, with no command of its own.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-180: The analysis exits 1 only when it cannot analyse

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-34, slice 4's spec audit)
- Question: (a) exit 0 whatever it lists; exit 1 only on an unresolvable
  specifier, a parse error, a non-literal `import(expr)` or a wildcard export,
  naming the file and specifier; (b) also exit 1 when any subpath loads Oracle
  code, which fails today on four legitimate subpaths.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-181: What counts as loading Oracle code

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-35, slice 4's spec audit)
- Question: (a) Loads: `import { type X }` (R-161), `export { type X } from`,
  `export { x } from`, `export * from`, a side-effect `import 'x'`, and a
  value-position `import('literal')`. Free: top-level `import type`,
  `export type { X } from`, `export type * from`, and a type-position
  `import('…').T` (R-169). The analysis follows `#src/*` aliases, resolved
  against the importing file's own package `imports`, and every `@hexagram/*`
  package under `overhaul/`; it stops at `node:*` and third-party packages.
  Oracle code is any file under `overhaul/oracle/`, reached by any specifier,
  relative paths included (R-163, R-175). (b) only the specifier
  `@hexagram/oracle/*` counts.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-182: The analysis reads each subpath's `source` target

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-36, slice 4's spec audit)
- Question: (a) analyse the `source` condition's target, which lint and tests
  already resolve; skip non-code exports such as `./package.json`; a wildcard or
  nested export is an error; (b) analyse the `import` target in `dist`, which
  needs a build; (c) both, failing if they differ.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-183: The analysis is proved on one fixture tree of fake packages

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-37, slice 4's spec audit)
- Question: (a) one fixture tree of fake `application`, `oracle`,
  `consultation-journal` and `remainder-group-policy` packages, each fake
  `application` subpath one plant or twin; each error case a tiny tree of its
  own; the fake packages kept out of the pnpm workspace, `tsc` and vitest;
  (b) one tree per case.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-184: The analysis has its own expected list, not a B13 key

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-38, slice 4's spec audit)
- Question: (a) a separate expected list in the prover, "Oracle-subpath analysis
  (R-151)", mapping each fake subpath to loads, free or error; a subpath missing
  from the list, or a key with no subpath, fails; the analysis proof runs only
  when `--only` is absent; (b) add `'B13'` to the rule keys now, colliding with
  the PWA's future lint rule.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-185: Slice 4's Acceptance stays R-156's command

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-39, slice 4's spec audit)
- Question: (a) Acceptance stays `pnpm lint:check && pnpm drift:prove`, with
  `drift:prove` extended to the analysis fixtures; the real tree's list (four
  subpaths today) is checked in the clerk's verification only, since it changes
  as use cases are built; (b) also fix the real tree's list in Acceptance.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-186: Four implementation choices in the analysis are Tier B

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-40, slice 4's spec audit)
- Question: (a) the implementer chooses: parsing with the installed TypeScript
  compiler API rather than a regex; resolving `#src/x.js` to `x.ts`; terminating
  on import cycles; analysing only `application`, with another root allowed for
  fixtures only; (b) the owner rules on each.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-187: Slice 4 is one slice of about 300 to 350 lines

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-41, slice 4's spec audit)
- Question: The proposal guessed about 200 lines; the tester estimates 300 to 350. (a) accept one slice, as R-173 did, since the analysis is proved only
  with its prover; (b) split the classifier and its fixtures from the prover
  wiring.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-188: R-031's "import no oracle" means "load no Oracle code"

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-42, slice 4's spec audit)
- Question: R-031 says the PWA imports only `application` subpaths "that import
  no `oracle`", which read literally excludes `keep-cast-consultation` and its
  `import type`, though keep is the use case R-031 lets the PWA run; R-151 reads
  it as "load no Oracle code", with type-only imports allowed. (a) record that
  reading, so B13 is written against it; (b) leave it to the PWA's Matter.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-189: Slice 4's acceptance list

- Date: 2026-11-22
- Raised in: M-002 (slice 4's acceptance list, from the tester)
- Question: Approve the list. Plants, each expected "loads": a value import;
  `import { type X }`; a default with an inline type; a side-effect import; a
  named re-export; `export *`; `export { type X }`; a literal `import()`; through
  an alias; through two aliases; through `consultation-journal`; through the
  journal's own alias; a relative path into `oracle/src`; a cycle that reaches
  oracle; a value import of an oracle file holding only types. Twins, each
  expected "free": `import type`; `export type {}`; `export type *`; a
  type-position `import()`; through a policy package that imports oracle as
  types only; an alias helper that only type-imports; a cycle without oracle; an
  unexported sibling file that loads oracle; oracle text only in a comment and a
  string; a missing `dist` target; a `./package.json` export, neither listed nor
  an error. Errors, each expected to exit 1 naming the file and specifier: an
  unresolvable specifier; a non-literal `import(name)`; a wildcard export.
  Prover checks: fixture subpaths and expected keys match both ways; the working
  tree is left unchanged.
- Ruling: "Q-31 to Q-42: A; approve the list"
- Folded into: not yet

### R-190: What the analysis names for a non-literal import and a wildcard export

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-43, from slice 4's fixtures)
- Question: R-180 says an error names "the file and specifier", but two error
  cases have no written path. (a) for `import(name)` the specifier is the
  expression text, `name`; for a wildcard export the file is
  `application/package.json` and the specifier is the export key, `./*`;
  (b) name only the file in those two cases.
- Ruling: "Q-M-002-43: A"
- Folded into: not yet

### R-191: Slice 4 lands as one slice of about 720 lines

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-44, from slice 4's fixtures)
- Question: R-187 accepted about 300 to 350 lines; the fixtures alone add 574,
  mostly fake `package.json` files, and the script adds about 150.
  (a) accept one slice; (b) land the fixtures and prover wiring first, then
  the script.
- Ruling: "Q-M-002-44: A"
- Folded into: not yet

### R-192: The subpath analysis does not follow plain JavaScript: a stated limit

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-45, from slice 4's review)
- Question: R-176 admits `.js`, `.mjs` and `.cjs` in `overhaul/`, but the
  analysis maps every `.js` specifier to `.ts`, so an import of a real plain
  JavaScript file fails loudly as unresolvable. (a) a stated limit while
  `overhaul/` holds none, recorded in a one-line comment; (b) follow `.js`,
  `.mjs` and `.cjs` files too.
- Ruling: "Q-M-002-45: A"
- Folded into: not yet

### R-193: Slice 4 gets a third, narrow attempt

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-46, slice 4 after two reviewed attempts, R-058)
- Question: (a) one more attempt: check for a wildcard or nested export before
  skipping a non-code string target, and skip a `null` export (Node's "no
  export") instead of failing it; then a fresh review, verification and
  landing; (b) withdraw slice 4 and land M-002 with slices 1 to 3; (c) other.
- Ruling: "Q-M-002-46: A"
- Folded into: not yet

### R-194: Slice 4 gets a fourth, capped attempt for absolute-path specifiers

- Date: 2026-11-22
- Raised in: M-002 (question Q-M-002-47, from attempt 3's review)
- Question: An absolute-path or `file:` specifier is treated as a third-party
  package, so a subpath loading Oracle code that way is reported free, against
  R-180 and R-181. (a) a fourth attempt: such a specifier fails as unresolvable
  and exits 1, then one fresh review; anything that review finds outside this
  change becomes a stated limit, with no fifth attempt; (b) a stated limit in a
  one-line comment; (c) land as is and track it as a follow-up.
- Ruling: "Q-M-002-47: A"
- Folded into: not yet

### R-195: Signal 1's exceptions are a ratified file keyed by file and name

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-1, proposal `docs/reviews/2026-11-22-m-003-drift-signals.md`)
- Question: Names that do not exist yet or no longer (`docs/manual/cli.md`,
  `docs/manual/rest.md`, `cli/cli`, `castMethod`). (a) a ratified exception
  file keyed by file plus name, with a reason each; an exception that no longer
  matches is reported as D4, with its own plant; the seed entries are ratified
  with the signal-1 slice; (b) keyed by name only.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-196: The owner marks the checkable _Avoid_ forms in CONTEXT.md

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-2)
- Question: (a) the owner marks checkable forms in `CONTEXT.md` by backticking
  them, a one-time Tier-A glossary edit; signal 2 reads only marked forms and
  prints the unmarked count; (b) a parser that expands shared nouns and ignores
  "(in English text)".
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-197: Signal 2 matches a token run inside one identifier or one string

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-3)
- Question: (a) split at camelCase, `_` and digit boundaries, lowercased; a
  match is a contiguous run inside one identifier or one string, JSX text
  included; the last word may take a trailing `s`; (b) runs may cross
  neighbouring identifiers.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-198: Signal 4's patterns, one code per ID by precedence

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-4)
- Question: (a) by precedence: E1 question IDs, with the short forms `Q-<n>`,
  `M002-<n>`, `PH1-<n>` and bare `Q<n>`; E2 Matter IDs; E3 seam IDs; E4
  B-numbers; E5 `slice|wave <n>`; E6 ephemeral paths including
  `docs/handoffs/`, and the words MATTERS, MINUTES, RULINGS; `round <n>` is not
  flagged, Round being a glossary term; (b) mutually exclusive patterns.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-199: Ruling IDs in overhaul source are flagged, as ADR-0042 says

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-5)
- Question: ADR-0042 (line 113 and three other places) says source comments cite
  ADRs and glossary terms only; R-013 has code cite a Ruling until an ADR folds
  it in. (a) follow ADR-0042: flag every `R-nnn` in `overhaul/` comments and
  test names as E7, with tooling not scanned; (b) allow a Ruling whose
  `Folded into:` starts with `not yet`, amending ADR-0042; (c) a structured
  field in `RULINGS.md`; (d) allow everywhere.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-200: Which files signals 2 and 4 scan

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-7)
- Question: (a) signal 2: identifiers in src and tests, strings in src only,
  not test names; signal 4: all of `overhaul/**`; neither scans `scripts/`, the
  ESLint config or legacy code; (b) signal 2 also scans test names.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-201: Paths under former top-level folders are listed and counted

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-9)
- Question: (a) a ratified list of former roots (`packages/` now; `cli/` and
  `domain/` later); paths under them are not checked but are counted per root
  in the summary; (b) flag them like any missing path.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-202: Signal 1's symbol check covers camelCase and PascalCase

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-10)
- Question: (a) camelCase and PascalCase symbols; a name is present if it
  appears in any tracked file, legacy included while legacy lives; (b)
  camelCase only.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-203: Signal 2 checks only names declared in overhaul

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-11)
- Question: (a) G1 checks only names declared in `overhaul/`; Node and
  third-party names are exempt, and a re-export is checked where it is
  declared; (b) check every identifier.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-204: Report codes D1 to D4, G1 to G2, E1 to E7 key the prover

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-12, which absorbed the proposal's Q6)
- Question: (a) every report starts with its code, one code per finding by
  R-198's precedence, and the prover's expected lists are keyed by code, as
  R-158 does for B-numbers; (b) free-text messages.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-205: What counts as a test name

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-13)
- Question: (a) `describe`, `it` and `test`, with `.skip`, `.only`, `.todo`,
  `.concurrent`, `.each(...)(name)` and tagged-template `each`; in a template
  name only the static text is read; (b) plain `describe`, `it`, `test` only.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-206: drift:check runs at every landing, through check:all

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-14)
- Question: ADR-0042's table runs signals 1, 2 and 4 at every landing. (a)
  M-003's last slice makes `drift:check` a root turbo task that `check:all`
  runs, this Ruling being the request Tier C needs; (b) leave it optional.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-207: M-003's digest: the documents signal 1 reads

- Date: 2026-11-22
- Raised in: M-003 (the proposal's Q8, uncontested by the challenger)
- Question: Signal 1 reads `AGENTS.md`, every ADR whose status starts with
  `Accepted` (including "Accepted (amended by 0022)"), and `docs/design/*.md`,
  skipping Considered options.
- Ruling: "Q-M-003-1 to -14: A; digest ratified"
- Folded into: not yet

### R-208: Slice 1 proves the scanner with its own expected list

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-15, slice 1's spec audit)
- Question: R-204 keys the prover by code, and slice 1 has none. (a) a separate
  scanner expected list in `drift:prove`, each fixture mapped to its exact
  ordered records (kind, line, text), matched both ways, as R-184 did;
  `drift:check` walks and parses, prints "N files parsed" and exits 0, its
  failure path first proved in slice 2 and a stated limit until then; (b)
  vitest tests under `scripts/`; (c) a placeholder signal with a fake code.
- Ruling: "Q-M-003-15 to -25: A"
- Folded into: not yet

### R-209: drift:check's report line, exit codes, order and paths

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-16)
- Question: (a) each report reads `<file>:<line> <code>: <text naming the ADR
or Ruling>`, the code once; exit 0 clean, 1 on any finding, 2 on a tool error
  naming the file; the summary prints every run; reports sorted by file, line,
  code by code units; paths relative to the root scanned, always `/`; a
  finding in a multi-line comment or string reports its own line; (b) the
  proposal's wording, the code twice and exits unstated.
- Ruling: "Q-M-003-15 to -25: A"
- Folded into: not yet

### R-210: The files the scanner reads

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-17)
- Question: (a) `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`,
  skipping `node_modules/`, `dist/` and dot-folders, JSON out; a file that
  does not parse is a tool error (exit 2); signal 4's "all of `overhaul/**`"
  (R-200) includes each package's root config files; (b) `src/` and `tests/`
  only.
- Ruling: "Q-M-003-15 to -25: A"
- Folded into: not yet

### R-211: How the scanner reads strings, template text and comments

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-18)
- Question: (a) all literals count, read cooked; module specifiers and regexes
  do not; JSX text trimmed, whitespace-only skipped; string-literal types raised
  again with signal 2; each static template fragment is its own record; each
  comment appears exactly once, read from the token stream, delimiters
  stripped; a shebang is not a comment; (b) raw source text, template fragments
  joined.
- Ruling: "Q-M-003-15 to -25: A"
- Folded into: not yet

### R-212: Test names are R-205's closed set

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-19)
- Question: (a) R-205's forms as a closed set, with chained modifiers before
  `.each`; `skipIf`, `runIf`, `bench` and renamed imports are a stated
  limit; a non-literal name is skipped; test names are read in any file, each
  also yielded as a string; (b) include `skipIf`, `runIf`, `bench` and the
  like.
- Ruling: "Q-M-003-15 to -25: A"
- Folded into: not yet

### R-213: What counts as declared is ruled with signal 2's slice

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-20)
- Question: (a) rule R-203's "declared" with signal 2's slice; slice 1 tests
  only the clear cases: variables, functions, parameters, classes and members,
  types, enums, destructuring renames; (b) rule it now.
- Ruling: "Q-M-003-15 to -25: A"
- Folded into: not yet

### R-214: Expected results keyed by file and line, one fixture root per signal

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-21)
- Question: (a) each `<file>:<line>` maps to its code, a twin to none, matched
  exactly so an extra or duplicate report fails; each signal runs only on its
  own fixture root, a small stand-in repo with its own docs and `CONTEXT.md`,
  judged against its own codes; (b) one plant per file, as signal 3 does.
- Ruling: "Q-M-003-15 to -25: A"
- Folded into: not yet

### R-215: One prover entry, and --only across code families

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-22)
- Question: (a) one entry file runs every prover, collects every failure and
  exits 1 if any fail; `--only`'s valid codes grow slice by slice, an unknown
  code is an error listing the valid ones; B and other codes may mix; any
  `--only` skips the scanner proof, the analysis and the clean-tree check; the
  clean-tree hash covers the new fixture folders; (b) a second script chained
  with `&&`.
- Ruling: "Q-M-003-15 to -25: A"
- Folded into: not yet

### R-216: M-003's Free to choose: the proposal's §3, narrowed four ways

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-23)
- Question: (a) ratify §3 with four narrowings: "the internal structure of the
  scanner and the prover" becomes "code organisation, given the contract the
  owner rules on"; report wording is free, but the line format, exit codes and
  summary contents are not; the exception file's syntax is free only if each
  entry carries its file, name and reason, and the format is shown to the owner
  when slice 4 seeds it; reordering slices is reported to the owner, not
  decided; (b) §3 as written.
- Ruling: "Q-M-003-15 to -25: A"
- Folded into: not yet

### R-217: The citation rule covers overhaul source only

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-24)
- Question: ADR-0042:113 and `AGENTS.md` say source comments cite only ADRs
  and glossary terms, while `scripts/drift/` cites Rulings throughout. (a) the
  rule covers `overhaul/` source only, and tooling may cite Rulings, as R-199,
  R-200 and practice already do; (b) it covers all source.
- Ruling: "Q-M-003-15 to -25: A"
- Folded into: not yet

### R-218: Slice 1's acceptance list

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-25)
- Question: Approve the list. Comments: line, block, JSDoc, trailing, end of
  file, the hard places (before `}`, inside `[1, /*x*/]`, an empty body, a
  type), `//` inside a string (not a comment), directives, a shebang, JSX.
  Test names: plain, the four modifiers, `.each(...)`, tagged-template
  `each`, a template name in fragments, a name on the next line, and twins
  (`obj.it`, `myIt`, a non-literal name, `bench`, `skipIf`). Strings: quote
  styles, a multi-line template, JSX text, a JSX attribute, twins (import paths,
  a regex), escapes read cooked, a literal type and quoted key per R-211. Identifiers:
  each kind of declaration, destructuring renames, twins (calls, property
  access, a plain import). Files: the walk's skips, a parse error exiting 2,
  CRLF. `drift:check`: today's tree exits 0 with its summary, an alternative
  root scanned alone, a missing root exiting 2. `drift:prove`: a full pass, a
  missing or extra record fails, `--only` per R-215, arguments reach the
  prover, one prover's failure does not hide another's, the clean-tree check
  covers the new fixtures, `lint:check` passes on the new scripts.
- Ruling: "Q-M-003-15 to -25: A"
- Folded into: not yet

### R-219: Comment text keeps JSDoc's stars and spacing

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-26, from slice 1's fixtures)
- Question: R-211 strips delimiters; a JSDoc comment is then recorded as
  `*\n * Adds two numbers.\n `. (a) keep that literal reading, since signals
  match whole tokens; (b) trim each comment and strip JSDoc's leading `*`.
- Ruling: "Q-26 to Q-30: A"
- Folded into: not yet

### R-220: drift:check prints its summary only on a completed run

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-27, from slice 1's implementer and review)
- Question: R-209 says the summary prints every run. (a) on a tool error
  (exit 2) only the error prints, a partial count being misleading; R-209's
  "every run" means every completed run; (b) print the partial count too.
- Ruling: "Q-26 to Q-30: A"
- Folded into: not yet

### R-221: An unknown drift:check argument is a tool error

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-28, from slice 1's implementer)
- Question: (a) any argument other than `--root <dir>` exits 2 with a usage
  message; (b) ignore it.
- Ruling: "Q-26 to Q-30: A"
- Folded into: not yet

### R-222: Plain JavaScript files may contain JSX

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-29, from slice 1's review)
- Question: The contract said `.tsx` and `.jsx` admit JSX; the scanner also
  parses `.js`, `.mjs` and `.cjs` with JSX. (a) amend the contract to match,
  as TypeScript reads those files; (b) parse them without JSX.
- Ruling: "Q-26 to Q-30: A"
- Folded into: not yet

### R-223: Comment text is normalised to LF

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-30, from slice 1's review)
- Question: Under CRLF a block comment keeps `\r\n` in its text, while
  templates and line comments do not. (a) normalise comment text to LF, so
  signal 4 sees one form; (b) keep it raw, and every signal tolerates `\r`.
- Ruling: "Q-26 to Q-30: A"
- Folded into: not yet

### R-224: A computed specifier's fragments are excluded like a specifier

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-31, from slice 1's final review)
- Question: The static fragments of a computed specifier, such as
  ``require(`./g/${name}.js`)`` or a computed `import()`, are yielded as strings. (a) exclude them as R-211
  excludes a whole specifier, changed in signal 2's slice, since signal 4 does
  not read strings; (b) keep them as strings.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-225: Comment text normalises every line terminator to LF

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-32, from slice 1's final review)
- Question: (a) normalise CRLF, a lone CR, U+2028 and U+2029 in comment text to
  `\n`, as TypeScript counts each as a line break, in slice 2; (b) CRLF only,
  as R-223 says.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-226: Signal 4's exact patterns and overlap rule

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-33, slice 2's spec audit)
- Question: (a) E1 `Q-M-\d{3}-\d+`, `Q-PH\d+-\d+`, `Q-\d+`, `M\d{3}-\d+`,
  `PH\d+-\d+`, `Q\d+`; E2 `M-\d{3,}`; E3 `S\d{1,2}`; E4 `B\d{1,2}`; E7
  `R-\d{3,}`; case-sensitive and ASCII-word-bounded; the longest match wins, a
  tie going to the lower E number; no allow-list for prose such as "S3" or
  "Q3"; no URL exemption for E7; the proposal's Q4(a) text binds, including
  `docs/legacy-architecture.md`; (b) split on whitespace first.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-227: E5 matches slice and wave labels in either case, plural included

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-34)
- Question: (a) `[Ss]lices?` or `[Ww]aves?`, then spaces or tabs, then a
  number; never across a line break; `wave1` and `slice-2` not flagged;
  (b) lowercase, one space, as R-198 literally says.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-228: E6 reports a whole ephemeral path once, and exact uppercase words

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-35)
- Question: (a) `docs/(reviews|plans|handoffs|archive)`, with or without a
  trailing slash, and the rest of the path up to whitespace or a closing quote,
  backtick or bracket, as one finding; `docs/legacy-architecture.md` likewise;
  `/` separators only; MATTERS, MINUTES and RULINGS exact, uppercase,
  word-bounded; (b) each segment reported separately.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-229: Signal 4 reads comments and test names only

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-36)
- Question: (a) for E1 to E7, signal 4 reads only comment and test-name records,
  not strings or identifiers; (b) strings as well.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-230: One report per file, line and code; findings report their own line

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-37)
- Question: (a) one report per distinct (file, line, code), its message listing
  the IDs; the expected value is a sorted list of codes, amending R-214's shape;
  a finding's line is the record's start line plus the line breaks before it,
  escaped `\n` and line continuations in test names a stated limit; (b) one
  report per line, the highest-precedence code kept.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-231: drift:check's output with findings, and its exit-1 proof

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-38)
- Question: (a) reports on stdout sorted per R-209, then the "N files parsed"
  line, then `signal 4: N findings in M files` even when N is 0; exit 1 when N
  is above 0; the prover runs `drift:check` on signal 4's fixture root,
  expects exit 1 and matches every report line exactly, with line-ending
  variants in memory; messages cite ADR-0042 with R-198, or R-199 for E7;
  (b) signal 4 called in-process, plus a one-plant run for exit 1.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-232: --root names a stand-in repo; paths are relative to the repo root

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-39)
- Question: (a) `--root` names a stand-in repo and signals 2 and 4 scan
  `<root>/overhaul/`; report paths are relative to the repo root (e.g.
  `overhaul/demo/src/a.ts:3`), amending R-209's path rule and re-laying slice
  1's alternative-root case; (b) keep `--root` as `overhaul/` and re-lay in
  slice 4.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-233: E1 to E7 join --only

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-40)
- Question: (a) E1 to E7 become valid `--only` codes; the invalid-code proof
  uses `Z1`, a code that never becomes valid; `--only E3` judges only E3; B
  and E codes may mix; (b) keep E codes out.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-234: Slice 2 is one slice of about 450 to 550 lines, in two commits

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-41)
- Question: (a) accept one slice, landed as an acceptance-material commit and an
  implementation commit; (b) split it in two.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-235: Slice 2's acceptance list

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-42)
- Question: Approve the list. Plants, in one fake package with one ID per line:
  each E1 form, with `Q-M-002-4` as E1 only; E2 `M-001`, `M-003's`,
  `m/M-003-s2`; E3 and E4 `S9/S14`, `B1-B12`, both on one line; each E5
  form; each E6 path and word, with `docs/plans/M-003.md` as E6 only; E7
  `R-013`, a range, one in a URL, `R-1000`; a finding on line 4 of a JSDoc;
  each comment form including JSX; each test-name form; a config-file comment;
  the CRLF and other line-break variants in memory. Twins: `XQ3`, `AB1`,
  `B100`, `RR-123`, `R-12`, `r-123`, `M-03`; `wave1`, `slice-2`,
  `.slice(2)`; invented "minutes" prose, `Matters`, `RULING`,
  `docs/agents/`; strings, JSX text and identifiers; `bench` and `skipIf`.
  `drift:check`: exit 1 on the fixtures with exactly the expected lines and
  summary; exit 0 on the real tree; exit 2 and no summary with a parse error.
  `--only`: `Z1` errors listing all 19 codes; `--only E3` passes; B and E
  codes mix.
- Ruling: "Q-M-003-31 to -42: A"
- Folded into: not yet

### R-236: Signal 4's summary counts report lines

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-43, from slice 2's fixtures)
- Question: In `signal 4: N findings in M files`, (a) N counts report lines,
  one per (file, line, code), as R-230 makes them; (b) N counts IDs.
- Ruling: "Q-M-003-43 to -46: A"
- Folded into: not yet

### R-237: Three readings of slice 2's acceptance list stand

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-44, from slice 2's fixtures)
- Question: (a) accept them: R-235's "both on one line" is tested both as pairs
  and as `S9 and B1` on one line; a parse error's path is relative to the
  repo root (R-232); the IDs a message lists are not in the expected list,
  which keeps codes only (R-230), and are checked by the reviewer; (b) add the
  IDs to the expected list.
- Ruling: "Q-M-003-43 to -46: A"
- Folded into: not yet

### R-238: Slice 2 lands at about 750 lines in two commits

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-45, from slice 2's fixtures)
- Question: R-234 accepted about 450 to 550 lines. (a) accept about 750, about
  600 of acceptance material and 150 of code, as two commits; (b) split.
- Ruling: "Q-M-003-43 to -46: A"
- Folded into: not yet

### R-239: An E6 path ends only where R-228 says

- Date: 2026-11-22
- Raised in: M-003 (question Q-M-003-46, from slice 2's review)
- Question: A path runs to whitespace, a quote, a backtick or a bracket, so
  `docs/plans/a.md,R-123` is one E6 finding and the E7 is lost. (a) keep
  R-228 as written, raised again if the real tree hits it; (b) also end at
  `,` and `;` and drop a trailing `.` or `:`.
- Ruling: "Q-M-003-43 to -46: A"
- Folded into: not yet

### R-240: Signal 1 and the every-landing step move to a new Matter, M-004

- Date: 2026-11-23
- Raised in: M-003 (question Q-M-003-47, at 45 of R-138's 60 owner touches)
- Question: Slice spec audits have cost 10 to 16 touches each, and four slices
  remained. (a) raise M-003's cap to 100; (b) keep 60 and move signal 1's two
  slices and `drift:check` joining `check:all` (R-206) into a new Matter,
  M-004, with its own cap; (c) keep 60 and land M-003 wherever it stops.
- Ruling: "Q-M-003-47: B, Q-M-003-48: A"
- Folded into: not yet

### R-241: A drafter prepares R-196's CONTEXT.md marking for the owner

- Date: 2026-11-23
- Raised in: M-003 (question Q-M-003-48)
- Question: (a) a drafter marks on its own branch each _Avoid_ form it judges
  checkable, in backticks, with a one-line reason for each entry left unmarked;
  the owner line-edits and ratifies it in one touch; (b) the owner marks it.
- Ruling: "Q-M-003-47: B, Q-M-003-48: A"
- Folded into: not yet

### R-242: The owner ratifies the marking of checkable _Avoid_ forms in CONTEXT.md

- Date: 2026-11-23
- Raised in: M-003 (R-196, R-241; the drafter's marking e06090f and
  `docs/reviews/2026-11-23-avoid-marking.md`)
- Question: Ratify the marking, with (1) lines 97 and 102 rewritten so each
  shared-noun form is spelled out and marked (A) or left (B); (2) `search term`
  reflowed onto one line (A) or read across the break (B); (3) `provenance` left
  unmarked on both lines (A) or marked on line 363 (B); (4) the borderline
  single words as drafted (A) or flipped (B); (5) the bare forms marked with
  "(in English text)" outside the backticks (A) or left unmarked (B).
- Ruling: "Ratify the marking: 1A, 2A, 3A, 4A, 5A"
- Folded into: CONTEXT.md, when the marking lands

### R-243: How signal 2 reads CONTEXT.md and counts unmarked forms

- Date: 2026-11-23
- Raised in: M-003 (question Q-M-003-49, slice 3's spec audit)
- Question: (a) an `_Avoid_:` list is that line plus the non-blank lines that
  follow; only code spans inside lists are read; duplicates count once; a span
  broken across lines, an empty or tokenless span, or a missing `CONTEXT.md`
  is a tool error (exit 2) naming the line; an unmarked form is a comma item
  outside parentheses with no code span (70 today); (b) read a span across a
  line break; (c) drop the unmarked count, amending R-196.
- Ruling: "Q-M-003-49 to -54: A"
- Folded into: not yet

### R-244: Acronym and digit boundaries in identifiers

- Date: 2026-11-23
- Raised in: M-003 (question Q-M-003-50)
- Question: (a) an acronym splits before its last capital when a lowercase
  letter follows (`isDRMGate` gives is, drm, gate); a digit run stays a token
  (`changing2Line` does not match); only a final `s` matches a plural, other
  plurals a stated limit; (b) split only at lower-to-upper, digits dropped.
- Ruling: "Q-M-003-49 to -54: A"
- Folded into: not yet

### R-245: Declared means any name the compiler binds in an overhaul file

- Date: 2026-11-23
- Raised in: M-003 (question Q-M-003-51, ruling R-213's deferral)
- Question: (a) any declaration the compiler binds: interface and type-literal
  members, enum members, object-literal keys and methods, type parameters,
  function and class expression names, `#private` names read without `#`,
  and the new name in an `as` rename; not a plain import or export of an
  existing name (R-203), nor a shorthand property; (b) add only type and enum
  members; (c) keep R-213's clear cases.
- Ruling: "Q-M-003-49 to -54: A"
- Folded into: not yet

### R-246: What G2 reads

- Date: 2026-11-23
- Raised in: M-003 (question Q-M-003-52)
- Question: (a) string-literal types count as G2 strings, in src only; R-224's
  exclusion covers only a template that is the first argument of `import()`
  or `require()`, concatenation a stated limit; G2 skips the string copy of a
  test name (R-200, R-212); (b) literal types under G1; (c) leave them out.
- Ruling: "Q-M-003-49 to -54: A"
- Folded into: not yet

### R-247: Signal 2's report line, summary and fixture interplay

- Date: 2026-11-23
- Raised in: M-003 (question Q-M-003-53)
- Question: (a) a report names the form and its `CONTEXT.md` lines, as
  `<file>:<line> G1: Avoid form "changing line" (CONTEXT.md:180, 186);
identifiers and UI strings use glossary terms (ADR-0042, R-197)`; the summary
  `signal 2: N findings in M files (F forms checked, U unmarked)` prints before
  signal 4's; signal 4's fixture gains an empty `CONTEXT.md`; signal 2's
  fixture holds one E line to prove the merged order; (b) name the preferred
  term; (c) no E codes in signal 2's fixture.
- Ruling: "Q-M-003-49 to -54: A"
- Folded into: not yet

### R-248: Slice 3's acceptance list, at about 800 lines in two commits

- Date: 2026-11-23
- Raised in: M-003 (question Q-M-003-54)
- Question: (a) accept about 800 lines as two commits, and the list: an invented
  `CONTEXT.md` (11 marked forms, 10 distinct, 5 unmarked; a wrapped list, a
  qualifier outside backticks, a duplicate, a span outside any list); about 17
  G1 and G2 plants (each declaration kind, `_` split, plurals, two forms on one
  line as one report, string, template, JSX attribute and text, a test-file
  identifier); twins (test names, test strings, comments, imports and
  references, `guard`, a cross-identifier run, `lineup`, `trashes`, split
  template fragments, static and computed specifiers, unmarked forms, a config
  file); in-memory parser cases including CRLF; `drift:check` exit 1 on the
  fixture, 0 on the real tree, 2 with no `CONTEXT.md`; G1 and G2 in `--only`,
  `Z1` listing 21 codes; (b) split into two slices.
- Ruling: "Q-M-003-49 to -54: A"
- Folded into: not yet

### R-249: Slice 3 lands at about 1,130 lines in two commits

- Date: 2026-11-23
- Raised in: M-003 (question Q-M-003-55, slice 3's size after its final review)
- Question: R-248 accepted about 800 lines; the slice comes to about 1,130
  (about 820 of acceptance material, 310 of code). (a) accept it as two
  commits, as R-238 did; (b) first cut about 70 lines of duplicated proof.
- Ruling: "Q-M-003-5: A" (the clerk reads this as Q-M-003-55, the only open
  question; Q-M-003-5 was ruled as R-199)
- Folded into: not yet

### R-250: Phase 2's budget is 3 Matters in 1 week

- Date: 2026-11-23
- Raised in: Phase 2 (question PH2-1, after R-240 split signal 1 into M-004)
- Question: Phase 2 was budgeted at 2 Matters in 1 week and now holds 3 (M-002,
  M-003, M-004). (a) raise the budget to 3 Matters in 1 week and start M-004;
  (b) keep 2 and record the overrun; (c) defer M-004 to a later phase.
- Ruling: "PH2-1: A"
- Folded into: not yet

### R-251: What signal 1 reads as a path in markdown

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-1, slice 1's spec audit)
- Question: (a) code spans only (links, bare text and fenced blocks not read;
  links a stated limit); a span may cross a line break within a paragraph and is
  reported at its start line; a span word is a candidate if it holds `/` and its
  first segment is a current or former root entry; words starting `./`, `../`
  or `/`, and words with `<…>`, are skipped; a trailing `:N`, `:N-M`,
  `#…` or `/` is stripped first; (b) read spans per line, as R-243; (c) also
  read link targets.
- Ruling: "Q-M-004-1 to -6: A"
- Folded into: not yet

### R-252: Existence is case-exact; a glob matches a file or a folder

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-2)
- Question: (a) existence is read under `--root`, each segment matched by exact
  case against the directory listing; glob characters are `* ? [ {`, braces
  belonging to the glob; a glob passes if it matches at least one file or
  folder, through Node's built-in `fs.glob`; (b) `git ls-files`; (c) plain
  `existsSync`, the case gap a stated limit.
- Ruling: "Q-M-004-1 to -6: A"
- Folded into: not yet

### R-253: Signal 1's sources and sections

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-3)
- Question: (a) ADRs are `docs/adr/NNNN-*.md` only; status is the first
  `^Status: ` line before the first `##` and must start with `Accepted`;
  design docs are `docs/design/*.md`, not recursive; "Considered options" is a
  heading with exactly that text at any level, running to the next heading of
  the same or higher level, headings in fences ignored; a missing `AGENTS.md`
  is a tool error (exit 2), and signals 2 and 4's fixtures gain an empty one;
  missing `docs/adr/` or `docs/design/` read as no documents; (b) every
  source optional.
- Ruling: "Q-M-004-1 to -6: A"
- Folded into: not yet

### R-254: The doc-truth exception file, former roots, and their seed

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-4; seeds R-195 and R-201)
- Question: (a) `scripts/drift/doc-truth-exceptions.md`, relative to the
  `--root` repo, a table `| File | Name | Reason |` plus a `## Former roots`
  list; an entry matches every miss of that exact name in that file; an entry
  matching no miss is D4 at its own line; a missing field, a duplicate entry,
  or a former root that exists is a tool error naming the line; no file means
  no exceptions. Seed: `docs/adr/0042-how-the-overhaul-is-built.md` |
  `docs/manual/cli.md` | planned, written and ratified before the CLI phase;
  `docs/adr/0042-how-the-overhaul-is-built.md` | `docs/manual/rest.md` |
  planned, written and ratified before the REST phase (R-008);
  `docs/adr/0019-domain-cli-boundary.md` | `cli/cli` | a former location the
  ADR names as history. Former roots: `packages/`. (b) JSON; (c) two files.
- Ruling: "Q-M-004-1 to -6: A"
- Folded into: not yet

### R-255: Signal 1's report line, summary and --only

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-5)
- Question: (a) `<file>:<line> D1: path "…" does not exist; docs name only what
exists (ADR-0042, R-195)`, D2 "glob … matches nothing", D4 the stale
  exception; several misses on one line make one report (R-230); the summary
  `signal 1: N findings in M files (S documents read, X exceptions, former
roots: packages/ 7)` prints after "files parsed" and before signal 2's, N
  counting report lines and former roots counted by occurrence; D1, D2 and D4
  join `--only` now, D3 with slice 2; `Z1` lists 24 codes; (b) former roots
  per line; (c) D3 now without a plant.
- Ruling: "Q-M-004-1 to -6: A"
- Folded into: not yet

### R-256: M-004 slice 1's acceptance list, at about 900 lines in two commits

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-6)
- Question: (a) accept about 900 lines as two commits, and the list: a fixture
  repo with `AGENTS.md`, four ADRs (Accepted, amended, Superseded, Deprecated),
  the ADR README's template trap, a design doc and an unread nested one; D1
  plants (a missing file, several on one line as one report, a span across
  lines, double backticks, wrong case); D2 globs matching nothing; five D4
  stale exceptions (name exists, file not a source, only under Considered
  options, file gone, under a former root); twins (links, bare text, fences,
  `./` and `/` words, templates, `:N` and `#` suffixes, a folders-only glob,
  a brace glob, Considered-options content, the README trap, code comments and
  `CONTEXT.md`); tool errors (malformed or duplicate entry, an existing former
  root, no `AGENTS.md`); CRLF variants; `drift:check` exit 1 on the fixture
  with exact lines and 0 on the real tree; D codes in `--only`; (b) split.
- Ruling: "Q-M-004-1 to -6: A"
- Folded into: not yet

### R-257: The first-segment root test ignores case; existence stays case-exact

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-7, from slice 1's fixtures)
- Question: Under R-251 and R-252 a wrong-case root such as `Docs/x.md` is no
  candidate, so the bug R-252 targets passes. (a) match the first segment to the
  root entries ignoring case, so the word is a candidate, and keep existence
  case-exact, so it is D1; one plant added; (b) a stated limit.
- Ruling: "Q-M-004-7 to -10: A"
- Folded into: not yet

### R-258: Signal 1's wording and counting details

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-8)
- Question: (a) accept: "X exceptions" counts the entries in the file;
  `former roots: none` when the list is empty, and a listed root met nowhere
  prints with 0; a multi-name D1 reads `paths "a", "b" do not exist; …`, a
  multi-glob D2 `globs "a", "b": each matches nothing; …`, D4 `exception for
"<name>" in <file> no longer matches a miss`, each citing ADR-0042 and R-195;
  each exception cell is one code span, "(R-008)" part of the seed's reason; a
  bare root word such as `packages/` is no candidate; (b) change some.
- Ruling: "Q-M-004-7 to -10: A"
- Folded into: not yet

### R-259: M-004 slice 1 lands at about 1,460 lines in two commits

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-9)
- Question: R-256 accepted about 900. (a) accept about 1,460 (about 1,060 of
  acceptance material, 400 of code) as two commits; (b) trim the prover first.
- Ruling: "Q-M-004-7 to -10: A"
- Folded into: not yet

### R-260: fs.glob's case-insensitivity on macOS is a stated limit

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-10, from slice 1's review)
- Question: On macOS `fs.glob` ignores case, so a wrong-case wildcard part
  (`docs/N*`) passes there; a wrong-case literal part is still caught and
  Linux CI catches all of it. (a) a stated limit, written into the contract;
  (b) case-exact globbing, needing a matcher of our own or a new dependency.
- Ruling: "Q-M-004-7 to -10: A"
- Folded into: not yet

### R-261: What counts as a symbol in a code span

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-11, slice 2's spec audit)
- Question: (a) a word holding `/` is skipped (D1 and D2 check paths); other
  words split at every character outside `[A-Za-z0-9_$]`; a token is a
  candidate if camelCase or PascalCase with a lower-to-upper hump; `foo()`
  checks `foo`, `Foo.bar` checks each token; a single lowercase or
  capitalised word, an all-caps word and snake_case are not candidates; the
  token is the exception key and the quoted name; (b) split acronyms as R-244,
  so `ETag` counts; (c) also single capitalised words and acronyms.
- Ruling: "Q-M-004-11 to -16: A"
- Folded into: not yet

### R-262: A symbol is present if it appears as a whole word in a code or JSON file

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-12, reading R-202's "any tracked file")
- Question: (a) a filesystem walk under `--root` of R-210's extensions plus
  `.json`, skipping `node_modules/`, `dist/`, dot-folders and
  `consultations/` by name; present means a whole word, case-exact, anywhere
  in such a file; markdown never counts; legacy counts while it lives;
  (b) `git ls-files`; (c) declared names only.
- Ruling: "Q-M-004-11 to -16: A"
- Folded into: not yet

### R-263: The prover runs D3 on a copy of the fixture without expected.ts

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-13)
- Question: `expected.ts` quotes every planted name and would make each
  present. (a) the prover runs signal 1 on a temporary copy of the fixture
  without `expected.ts`, `drift:check` staying unaware of fixtures; (b)
  `drift:check` skips a root-level `expected.ts`; (c) a separate fixture root.
- Ruling: "Q-M-004-11 to -16: A"
- Folded into: not yet

### R-264: D3's wording

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-14)
- Question: (a) `<file>:<line> D3: symbol "castMethod" is not in the code; docs
name only what exists (ADR-0042, R-195)`, several names `symbols "a", "b" are
not in the code; …`; the summary unchanged, N counting D3; (b) add "Y symbols
  checked"; (c) name the corpus in the message.
- Ruling: "Q-M-004-11 to -16: A"
- Folded into: not yet

### R-265: The symbol seed, and the contract states former roots ignore case

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-15; seeds R-195)
- Question: (a) two more exception rows:
  `docs/adr/0027-cast-consultation-records-division-method.md` | `castMethod` |
  the field ADR-0011 rejected, named as history; and
  `docs/adr/0001-shared-screen-shell.md` | `ReadoutShell` | a name the ADR
  rejects in favour of `ScreenShell`; and the contract's "an entry of
  `root`, ignoring case (R-257), or a former root" becomes "… or a former
  root, each ignoring case (R-257)", with a plant; (b) reword the reasons.
- Ruling: "Q-M-004-11 to -16: A"
- Folded into: not yet

### R-266: M-004 slice 2's acceptance list, at about 550 to 650 lines

- Date: 2026-11-23
- Raised in: M-004 (question Q-M-004-16)
- Question: (a) accept about 550 to 650 lines in two commits, and the list: D3
  plants appended to the fixture's `AGENTS.md` (missing camelCase and
  PascalCase; two on one line as one report; `missingCall()` and
  `PresentRecord.missingField`; wrong case; a whole-word near miss; a name
  only in docs; a span across lines; a camelCase path giving D1 not D3), one D3
  each in a design doc and the amended ADR, a stale symbol exception (D4);
  twins (present names in each form; names only in JSON, legacy-style code or a
  comment; non-symbols `keep`, `Casting`, `ID`, `ETag`, snake_case; the
  wrong-case former root; an excepted name; a template word; fenced, linked and
  bare names; Considered options and a Superseded ADR; `CONTEXT.md`); D3 in
  `--only`, `Z1` listing 25 codes; the real tree exits 0 with 5 exceptions;
  (b) split.
- Ruling: "Q-M-004-11 to -16: A"
- Folded into: not yet

### R-267: The prover spells seed symbols so they are no whole word in code

- Date: 2026-11-24
- Raised in: M-004 (question Q-M-004-17, from slice 2's implementation)
- Question: The prover quotes `castMethod` and `ReadoutShell` as string
  literals, which R-262 counts as present, so the real tree reports both seed
  rows as stale. (a) the prover writes such names so no whole word appears in
  code (e.g. `'cast' + 'Method'`), with a comment citing R-262; names in drift
  fixtures and provers counting as present is a stated limit; (b)
  `presentNames` skips `scripts/drift/`; (c) drop the two seed rows.
- Ruling: "Q-M-004-17: A"
- Folded into: not yet

### R-268: drift:check runs in check:all, in CI's check job and at the clerk's landing check

- Date: 2026-11-24
- Raised in: M-004 (question Q-M-004-18, slice 3's spec audit)
- Question: Neither CI nor the clerk's Step 6 runs `check:all`, so R-206 alone
  runs `drift:check` at no landing. (a) add `//#drift:check` to `check:all`
  (R-206), a `pnpm drift:check` step to CI's `check` job in
  `unit-test.yml`, and `pnpm drift:check` to `clerk.md` Step 6; (b)
  `check:all` only; (c) CI only.
- Ruling: "Q-M-004-18 to -21: A"
- Folded into: not yet

### R-269: The drift:check task is not cached, and check:affected runs it too

- Date: 2026-11-24
- Raised in: M-004 (question Q-M-004-19)
- Question: Turbo's root-task hash leaves out files in the `overhaul/*`
  packages, so a cached run can pass stale. (a) `"cache": false`, as
  `//#lint:fix` and `//#format:fix`; `check:affected` also names
  `drift:check`; (b) an explicit inputs list; (c) the default, and
  `check:affected` unchanged.
- Ruling: "Q-M-004-18 to -21: A"
- Folded into: not yet

### R-270: Under turbo, findings and tool errors both show as a failed task

- Date: 2026-11-24
- Raised in: M-004 (question Q-M-004-20)
- Question: (a) accept it: findings still print in the grouped log, and the
  exit-1 and exit-2 distinction stays visible through `pnpm drift:check`; (b)
  make turbo preserve the distinction.
- Ruling: "Q-M-004-18 to -21: A"
- Folded into: not yet

### R-271: M-004 slice 3's acceptance list

- Date: 2026-11-24
- Raised in: M-004 (question Q-M-004-21)
- Question: (a) six checks, none running `check:all`: a structural check that
  `//#drift:check` exists with no `dependsOn` and `cache: false`, and that
  `check:all` and `check:affected` name it; `pnpm turbo run drift:check`
  exits 0 on the real tree, the second run without a cache hit; a finding
  planted in a throwaway copy fails the turbo run and shows in its log; CI's
  `check` job has the step; `clerk.md` Step 6 names `pnpm drift:check`;
  M-004's Acceptance passes; (b) change it.
- Ruling: "Q-M-004-18 to -21: A"
- Folded into: not yet

### R-272: The clerk opens the pull request that lands matters on main

- Date: 2026-11-25
- Raised in: landing Phases 1 and 2 (a direct push of `matters` to `main`
  bypassed the pull-request rule and the required `check`)
- Question: Should "the clerk opens the PR that lands `matters`" be a standing
  rule, with a Ruling and a change to `clerk.md`'s "never open PRs" line?
- Ruling: "The clerk should open the PR." and, asked whether it stands, "Yes"
- Folded into: `docs/agents/clerk.md` (Git constraints)

### R-273: The Oracle core covers the divination path against stub ports

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-1;
  `docs/reviews/2026-11-25-phase-3-oracle-core.md`)
- Question: (a) the divination path against stub ports: the four `oracle`
  stubs, `choosePick`, and use cases 1 (keep), 2 and 3, in 5 Matters; keep
  and record are Consultation Journal work inside the phase; use cases 4–7,
  9 and 10 and every driven adapter go to Phase 4; (b) as (a), plus
  `node-effects` and `catalogue-bundled` with the legacy data; (c) only the
  pure packages; (d) every `application` stub except 7 and 9.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: not yet

### R-274: Phase 3 is cut into five vertical Matters

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-12)
- Question: (a) Pick Division (`nextRound`, `divide`); Physical Division
  (`transcribe`); Automatic Division; keep and record; Resolution (the
  Hexagram table, `resolve`, use case 3) as one Matter in three slices;
  (b) the first draft's cut, all three Division steps in one Matter and the
  table apart from use case 3.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: `MATTERS.md` (M-005 to M-009)

### R-275: Each Phase 3 Matter widens composeCli and drives its use cases through cli-adapter

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-2)
- Question: (a) each Matter adds its use cases to `composeCli`, bound to the
  ports it takes, and drives them in a `cli-adapter` test with stub ports
  (R-131); each widening of R-137's signature is a digest line;
  (b) acceptance runs at `application`, and `composeCli` stays as R-137 left
  it until Phase 4.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: not yet

### R-276: The Transcription checks run complete, remainders, set-aside, conservation

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-3)
- Question: ADR-0011's order (incomplete, remainders, conservation, Set-aside)
  never reports `set-aside` or `valid-pick` while pile counts are whole
  numbers from 0. (a) Amend ADR-0011's order for the overhaul: `complete`,
  `remainders`, `set-aside`, `conservation`, first failure wins; a pile count
  that is not a whole number from 0 is `complete`; `valid-pick` stays
  unreachable for `transcribe`, and its tests assert that; how the CLI shows
  conservation is the CLI manual's; (b) keep ADR-0011's order and document
  `set-aside` as unreachable; (c) drop `set-aside` from `DivisionRule`,
  amending ADR-0038 and `CONTEXT.md`.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: `docs/adr/0043-transcription-check-order.md` (R-299)

### R-277: divide throws if its own output fails isCompleteCasting

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-4)
- Question: (a) throw an `Error`: a defect in the Oracle, not a refusal, and
  the comment says so; (b) return a `replay` refusal.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: not yet

### R-278: Picks are listed in ascending order, and choosePick's draws map to them exactly

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-5)
- Question: (a) `nextRound` lists each Remainder Group's Picks in ascending
  order (M-005); `choosePick`'s first draw, `integerBelow(4)`, gives 0–3 for
  Remainder 1–4, and its second, `integerBelow(size)`, indexes the group
  (M-007); (b) leave both to the implementers.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: not yet

### R-279: ADR-0023's probabilities are proved by exact enumeration

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-6)
- Question: (a) exact enumeration of every pair of draws in every Round of a
  Line, giving exactly 1/16, 5/16, 7/16 and 3/16; (b) a sampled test like the
  legacy one; (c) both.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: not yet

### R-280: The Consultation Id is built by a private ULID helper in application

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-7)
- Question: (a) a private helper in `application`: a 48-bit millisecond time
  from the Clock's `epochMilliseconds`, then 80 random bits as 16 draws of
  `integerBelow(32)`, in Crockford base 32, admitted through
  `isConsultationId` (R-051); keep reads the Clock once, for both the Id and
  Divined At; no new dependency; (b) the `ulid` package; (c) a public builder
  in `consultation-journal`.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: not yet

### R-281: cli-adapter gains consultation-journal as a dev dependency

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-8)
- Question: (a) `cli-adapter` gains `consultation-journal` as a dev
  dependency, used only by tests, as R-135 did for `scripture-catalogue`;
  B8's arrow and the manifest change with M-008 (R-148, R-165); (b) keep and
  record are tested at `application` only.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: not yet

### R-282: The Hexagram table is a typed constant on a new oracle subpath

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-9)
- Question: (a) a typed constant in `oracle` on a new subpath, 64 rows in Fuxi
  Sequence Number order, each row the Figure, Lower and Upper Trigram,
  Nuclear, Inverse and Reversed Hexagram, and Fuxi Sequence Number, with one
  lookup by Figure; names for the owner's line-edit; no JSON until a consumer
  needs it; (b) as (a), plus a generated JSON now; (c) private to `oracle`
  until Phase 5.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: not yet

### R-283: The order of a Resolution's Applicable Passages

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-10)
- Question: (a) the Standing Hexagram's Hexagram Statement, the Moving Lines'
  Line Statements bottom-up, the All-Moving Statement, then the Emerging
  Hexagram's Hexagram Statement (none for X之X); (b) as (a), with the
  All-Moving Statement last; (c) unspecified, tests comparing as sets.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: not yet

### R-284: Both Hexagrams carry Commentaries, in the Reading Preference's order

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-11)
- Question: R-061 fixes each Commentary's Citation and R-115(6) puts
  Commentaries after their passage. (a) The Emerging Hexagram's Hexagram
  Statement is followed by its 彖傳, 大象 and 文言 like the Standing one's;
  within one passage, Commentaries come in the Reading Preference's order;
  (b) Commentaries follow only the Standing Hexagram's passages; (c) as (a),
  but in a fixed Work order (彖傳, 大象, 小象, 文言).
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: not yet

### R-285: Use case 3 calls the Catalogue in sequence and stops at the first rejection

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (question PH3-13)
- Question: (a) in sequence, in the result's order, stopping at the first
  rejection, which the Promise passes on unchanged; (b) concurrently, the
  first rejection in time passed on while the other calls still run.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: not yet

### R-286: M-005 to M-009 are ratified as drafted

- Date: 2026-11-25
- Raised in: Phase 3's breakdown (section 2 of the proposal)
- Question: Ratify the five Matter entries as drafted, each with its Scope,
  Tier-A surface, Free to choose and Acceptance? Their test file names are
  drafts that each tester fixes in the test list the owner approves.
- Ruling: "PH3-1 to -13: A; ratify the Matters"
- Folded into: `MATTERS.md` (M-005 to M-009)

### R-287: Replay rebuilds each Round and compares every recorded field

- Date: 2026-11-25
- Raised in: M-005 (question Q-M-005-1)
- Question: Which recorded fields does replay compare? (a) Replay rebuilds
  each Round from its Pick and the derived stalks; a Round fails if any
  recorded field differs (stalks, either Remainder, Set-aside); the next
  Round's stalks always come from the derived values; (b) only the recorded
  stalks and the Pick's validity; (c) as (b), plus the last Round's recorded
  Set-aside.
- Ruling: "Q-M-005-1 to -2: A"
- Folded into: not yet

### R-288: A replay refusal carries the failing Round's recorded Pick

- Date: 2026-11-25
- Raised in: M-005 (question Q-M-005-2)
- Question: (a) the failing Round's recorded Pick, even when it is out of
  range or not a whole number; (b) no Pick; (c) the recorded Pick for
  `nextRound`, the incoming Pick for `divide`.
- Ruling: "Q-M-005-1 to -2: A"
- Folded into: not yet

### R-289: M-005 slice 1's acceptance list

- Date: 2026-11-25
- Raised in: M-005 (slice 1's test list, `overhaul/oracle/tests/next-round.test.ts`)
- Question: Approve the 36 tests of `next-round.test.ts` as listed: the Empty
  Casting; Castings that replay (stalks after each Round, ADR-0023's group
  sizes, the largest shape, every valid Pick of a whole Line over 67,996
  paths); Castings that do not replay (wrong stalks, wrong recorded
  Remainders and Set-aside in three places, six invalid Picks at 49 and 44
  stalks carrying the recorded Pick, and the earlier of two failing Rounds)?
- Ruling: "approve the list"
- Folded into: not yet

### R-290: The Oracle relies on the partial Casting's type, with no runtime shape guard

- Date: 2026-11-26
- Raised in: M-005 (question Q-M-005-3, from slice 1's review)
- Question: Shapes the type forbids (R-101), such as 18 or more Rounds, a
  fourth Round in a Line or `null` entries, are skipped or throw at run time.
  (a) Rely on R-101: the type holds the limits and lint keeps untyped data
  out; untyped data is the adapter's to reject (ADR-0038's strict URLs give
  404); a doc comment on `PartialCasting` says so; no runtime guard; (b) a
  private shape guard, refusing with rule `replay`; (c) as (b), with a new
  `DivisionRule`.
- Ruling: "Q-M-005-3: A; digest ratified"
- Folded into: not yet

### R-291: M-005 slice 1's Tier-B digest

- Date: 2026-11-26
- Raised in: M-005 (slice 1, a2dcf51)
- Question: Ratify the implementer's choices in `division.ts`: (1) one private
  `replay` returning the next Round's Line, Round and stalks, or a refusal
  shaped as `nextRound`'s, for `divide` and `transcribe` to reuse;
  (2) `roundFrom(stalks, pick)` rebuilds a Round, and replay compares every
  recorded field with it; (3) the walk visits only the 17 places the type
  allows, with no throw; (4) Remainder Groups filled by one ascending loop;
  (5) ADR-0023's arithmetic stays duplicated between `division.ts` and
  `complete-casting.ts`, since the guard checks shape only (R-055)?
- Ruling: "Q-M-005-3: A; digest ratified"
- Folded into: not yet

### R-292: divide returns the rebuilt Rounds plus the new one

- Date: 2026-11-26
- Raised in: M-005 (question Q-M-005-4)
- Question: A recorded Round with an extra key still replays (R-287). Which
  Rounds does `divide`'s next Casting hold? (a) the rebuilt Rounds plus the
  new one, so extra keys are dropped and the Casting depends only on its
  Picks; tests compare with `toStrictEqual`; (b) the incoming Rounds as given
  plus the new one; (c) Tier B, tests comparing only the five recorded fields.
- Ruling: "Q-M-005-4: A"
- Folded into: not yet

### R-293: M-005 slice 2's acceptance list

- Date: 2026-11-26
- Raised in: M-005 (slice 2's test list, `overhaul/oracle/tests/divide.test.ts`
  and `overhaul/cli-adapter/tests/pick-division.test.ts`)
- Question: Approve the 87 tests as listed: `divide` at every place, at the
  bounds of the valid Picks, on a Casting that does not replay (the replay
  refusal winning over `valid-pick`), dropping extra keys on recorded Rounds,
  at the eighteenth Round, and the eight Set-aside paths and 4,096
  Transformations; and `composeCli` gaining `beginCasting`, `nextRound` and
  `divide`, driving eighteen Divisions to a complete Casting?
- Ruling: "approve the list"
- Folded into: not yet

### R-294: M-005 slice 2's Tier-B digest

- Date: 2026-11-26
- Raised in: M-005 (slice 2, b7d8b28, 58dc1c0, 3b8c18e)
- Question: Ratify: (1) `replay` also returns the rebuilt Rounds, for
  `divide` and `transcribe` to reuse; (2) its private types derive from the
  ratified `CompleteCasting` and `PartialCasting`; (3) the next partial Casting
  is a literal chosen by tuple length, with no guard or assertion; (4) a
  private `completed(lines)` computes Line Values and makes the complete
  Casting only through `isCompleteCasting`, throwing a defect `Error`
  otherwise; (5) slice 1's local `rebuilt` renamed `rebuiltRound`;
  (6) `composeCli` returns `beginCasting`, `nextRound` and `divide` unchanged,
  as they take no ports (R-275's digest line); (7) the `PartialCasting`
  comment cites ADR-0038's strict URLs?
- Ruling: "digest ratified"
- Folded into: not yet

### R-295: A complete Transcription's refusal carries its derived Pick

- Date: 2026-11-26
- Raised in: M-006 (question Q-M-006-1)
- Question: Which Pick does a Transcription refusal carry? (a) when the
  Transcription is complete (`remainders`, `set-aside`, `conservation`), Pick
  = 4 × pilesLeft + remainderLeft, even when invalid, fractional or NaN, as
  R-288 does for replay; a `complete` refusal carries none; the glossary's
  "become a Pick" reads as "become the Round's Pick"; (b) no Transcription
  refusal carries a Pick; (c) as (a), and a `complete` refusal also carries
  the Pick when the left heap's fields are present and valid.
- Ruling: "Q-M-006-1 to -4: A; ratify ADR-0043"
- Folded into: not yet

### R-296: transcribe returns the rebuilt Rounds plus the new one

- Date: 2026-11-26
- Raised in: M-006 (question Q-M-006-2)
- Question: (a) a successful Transcription returns what
  `divide(casting, 4 × pilesLeft + remainderLeft)` returns: the rebuilt
  Rounds plus the new one, extra keys dropped (as R-292); (b) Tier B.
- Ruling: "Q-M-006-1 to -4: A; ratify ADR-0043"
- Folded into: not yet

### R-297: ADR-0043 stays a separate amending ADR

- Date: 2026-11-26
- Raised in: M-006 (question Q-M-006-3, from ADR-0043's draft)
- Question: ADR-0042 asks that amended ADRs be consolidated before code
  depends on them. (a) keep ADR-0043 separate: it is the single current
  statement of the overhaul's check order, the topic M-006 depends on, and
  ADR-0011 is mostly the legacy screen; (b) consolidate ADR-0011, ADR-0027's
  part and ADR-0043 into one ADR superseding ADR-0011 before M-006 lands.
- Ruling: "Q-M-006-1 to -4: A; ratify ADR-0043"
- Folded into: not yet

### R-298: ADR-0038 keeps its list; M-006 updates the DivisionRule comment

- Date: 2026-11-26
- Raised in: M-006 (question Q-M-006-4, from ADR-0043's draft)
- Question: ADR-0038 and the `DivisionRule` comment list the checks in the
  old order. (a) leave ADR-0038, which only lists them, since ADR-0043 owns
  the order; M-006's implementer updates the `DivisionRule` comment;
  (b) reorder ADR-0038's list too.
- Ruling: "Q-M-006-1 to -4: A; ratify ADR-0043"
- Folded into: not yet

### R-299: ADR-0043 is ratified

- Date: 2026-11-26
- Raised in: folding R-276 (draft 3bfbefb on `docs/adr-0011-amendment`)
- Question: Ratify ADR-0043, which amends ADR-0011's Transcription check order
  for the overhaul, with ADR-0011's banner and the index row?
- Ruling: "Q-M-006-1 to -4: A; ratify ADR-0043"
- Folded into: `docs/adr/0043-transcription-check-order.md` (0320eae)

### R-300: M-006's acceptance list

- Date: 2026-11-26
- Raised in: M-006 (the test list, `overhaul/oracle/tests/transcribe.test.ts`
  and `overhaul/cli-adapter/tests/physical-division.test.ts`)
- Question: Approve the 184 tests as listed: `transcribe` at every place, the
  check order over a 6,084-Transcription grid at every place, the bounds of
  `complete`, `remainders`, `set-aside` and `conservation`, where a refusal
  points, replay first, extra keys dropped, the rules reported (never
  `valid-pick`), and `composeCli` gaining `transcribe`? The tester's grep had
  shown it about 15 lines of `divide`'s and `replay`'s bodies, which it says it
  did not use.
- Ruling: "approve the list"
- Folded into: not yet

### R-301: DivisionRule's members follow ADR-0043's order

- Date: 2026-11-26
- Raised in: M-006 (question Q-M-006-5, from the implementer's suggestion)
- Question: The ratified `DivisionRule` type lists `conservation` before
  `set-aside`, with no effect at run time. (a) reorder the members to
  ADR-0043's order, as a one-line change inside M-007; (b) leave them, since
  the comment gives the order.
- Ruling: "Q-M-006-5: A; Q-LAND-1: A"
- Folded into: not yet

### R-302: The owner lands matters by fast-forwarding main to the tested tip

- Date: 2026-11-26
- Raised in: landing M-005 (question Q-LAND-1; PR #57's rebase merge gave
  every commit a new SHA and deleted `matters`)
- Question: (a) after CI passes on the landing PR, the owner fast-forwards
  `main` to the tested tip of `origin/matters`, and GitHub marks the PR
  merged; SHAs and the branch are kept; a line in `clerk.md` says so;
  (b) keep `gh pr merge --rebase --admin` and repair `matters` after each
  landing.
- Ruling: "Q-M-006-5: A; Q-LAND-1: A"
- Folded into: `docs/agents/clerk.md` (Git constraints)

### R-303: The probability enumeration builds its own Rounds from ADR-0023

- Date: 2026-11-26
- Raised in: M-007 (question Q-M-007-1)
- Question: B4 lets `remainder-group-policy` reach the Oracle as types only,
  so its tests cannot call `nextRound` or `divide`. (a) `choose-pick.test.ts`
  builds each Round's Remainder Groups from ADR-0023's definitions (valid Picks
  1 to stalks − 2; left Remainder = Pick mod 4, right = (stalks − 1 − Pick)
  mod 4, 0 as 4; Set-aside = 1 + both), keeping the boundaries and the
  Acceptance line; (b) a test-only arrow from its tests to the Oracle;
  (c) the enumeration moves to `cli-adapter`'s test and the Acceptance line
  changes.
- Ruling: "Q-M-007-1 to -2: A"
- Folded into: not yet

### R-304: An unusable draw is a precondition on choosePick's caller

- Date: 2026-11-26
- Raised in: M-007 (question Q-M-007-2)
- Question: `integerBelow` returning 4, −1, 2.5, NaN or an index past the
  group. (a) a precondition on the caller, like "every group holds a Pick";
  unspecified and untested; the JSDoc says so in one line; (b) throw a defect
  `Error`, tested per bad draw; (c) return what indexing yields.
- Ruling: "Q-M-007-1 to -2: A"
- Folded into: not yet

### R-305: M-007's acceptance list

- Date: 2026-11-26
- Raised in: M-007 (the test list,
  `overhaul/remainder-group-policy/tests/choose-pick.test.ts` and
  `overhaul/cli-adapter/tests/automatic-division.test.ts`)
- Question: Approve the 15 tests as listed: Round arithmetic as ADR-0023
  tabulates it; the draw mapping for each Remainder; two draws with bounds 4
  and the group's size; first and last Picks; one-Pick groups; each Pick's
  probability and the four Line Values' probabilities by exact enumeration;
  and `composeCli` binding `drawAutomaticPick` to a Random Source, casting
  whole Automatic Castings?
- Ruling: "approve the list"
- Folded into: not yet

### R-306: The 17 existing composeCli calls in approved tests gain a stub randomSource

- Date: 2026-11-26
- Raised in: M-007 (question Q-M-007-3, from the implementer)
- Question: A required `randomSource` port breaks 17 calls of
  `composeCli({ scriptureCatalogue })` in approved tests
  (`composition-root.test.ts` 15, `pick-division.test.ts` 1,
  `physical-division.test.ts` 1). (a) license a mechanical change: each call
  gains a stub `randomSource`, made by a fresh tester; (b) make `randomSource`
  optional.
- Ruling: "Q-M-007-3 to -4: A"
- Note (clerk): the calls numbered 16, not 17 (14 in `composition-root.test.ts`);
  the implementer had counted type errors. All 16 were changed (4f7cf8c).
- Folded into: not yet

### R-307: choosePick keeps one untested throw for a draw past the group

- Date: 2026-11-26
- Raised in: M-007 (question Q-M-007-4, from the implementer)
- Question: `noUncheckedIndexedAccess` types `group[i]` as `Pick | undefined`,
  and R-051 bans asserting it away. (a) keep the one untested
  `throw new Error('a draw past the Remainder Group')`, which only gives the
  type a Pick and promises callers nothing, consistent with R-304; (b) a form
  with no throw, such as the group's last Pick.
- Ruling: "Q-M-007-3 to -4: A"
- Folded into: not yet

### R-308: M-007's Tier-B digest

- Date: 2026-11-26
- Raised in: M-007 (77c2238, d7e3f2d)
- Question: Ratify: (1) `remainderDrawn` maps draws 0, 1 and 2 to Remainders
  1, 2 and 3 and any other draw to 4, left unspecified under R-304 with no
  documentation change; (2) the second draw indexes the group directly, R-307's
  throw covering a draw past it; (3) `composeCli` binds `drawAutomaticPick` to
  its ports in the existing `PortsSupplied` pattern (R-275's digest line)?
- Ruling: "digest ratified"
- Folded into: not yet

### R-309: A Clock reading a ULID cannot hold rejects keep and record

- Date: 2026-11-26
- Raised in: M-008 (question Q-M-008-1)
- Question: `epochMilliseconds` of 2^48 or more, below 0, or not an integer
  gives an Id `isConsultationId` refuses. (a) keep and record reject the
  Promise with an Error and keep nothing, as the ULID spec refuses above
  2^48 − 1; tested at 2^48 − 1 (kept), 2^48, −1 and 1.5 (rejected, the Store
  never called); (b) the Clock is trusted, stated in its doc comment, untested;
  (c) wrap modulo 2^48 or floor fractions.
- Ruling: "Q-M-008-1 to -3: A"
- Folded into: not yet

### R-310: Random draw k is the Id's character 10 + k, its value the alphabet index

- Date: 2026-11-26
- Raised in: M-008 (question Q-M-008-2)
- Question: (a) draw k (1 to 16) becomes character 10 + k, and its value v is
  the v-th symbol (0 to 31) of Crockford's alphabet, as ULID's layout gives;
  (b) the order is free, tests using uniform draws only.
- Ruling: "Q-M-008-1 to -3: A"
- Folded into: not yet

### R-311: A Clock or Random Source failure rejects the Promise unchanged

- Date: 2026-11-26
- Raised in: M-008 (question Q-M-008-3)
- Question: (a) keep and record reject with the port's error unchanged and
  keep nothing, as R-108 does for the Store; one test per port per use case;
  (b) unspecified and untested; (c) throw synchronously.
- Ruling: "Q-M-008-1 to -3: A"
- Folded into: not yet

### R-312: M-008's acceptance list and stub ports

- Date: 2026-11-26
- Raised in: M-008 (the test list, `overhaul/application/tests/keep-cast-consultation.test.ts`,
  `record-consultation.test.ts` and `overhaul/cli-adapter/tests/keep-and-record.test.ts`)
- Question: Approve the 32 tests as listed (17 for keep, 12 for record, 3 for
  `composeCli`), and the mechanical addition of stub `consultationStore` and
  `clock` ports, which throw if touched, to the 17 existing `composeCli(...)`
  calls in four approved test files?
- Ruling: "approve the list"
- Folded into: not yet

### R-313: The B9 twin fixture for cli-adapter gains consultation-journal

- Date: 2026-11-26
- Raised in: M-008 (question Q-M-008-4; `drift:prove` reported
  `twins/cli-adapter.package.json: expected none, reported B9`)
- Question: May `scripts/drift/fixtures/signal-3/twins/cli-adapter.package.json`,
  M-002's acceptance material, gain `"@hexagram/consultation-journal":
"workspace:*"` in `devDependencies`, as part of M-008? (a) yes, made by a
  fresh tester, nothing else changed; (b) no, change the prover otherwise.
- Ruling: "Q-M-008-4 to -5: A"
- Folded into: not yet

### R-314: A Matter that changes a boundary arrow lists its twin fixture in its Tier-A surface

- Date: 2026-11-26
- Raised in: M-008 (question Q-M-008-5)
- Question: (a) as a standing rule, any Matter that changes a boundary arrow
  lists the matching B9 twin fixture under `scripts/drift/fixtures/signal-3/`
  in its Tier-A surface, so the tester updates it with the acceptance tests;
  (b) ask each time.
- Ruling: "Q-M-008-4 to -5: A"
- Folded into: `docs/agents/clerk.md` (Step 3)

### R-315: The table's row stays separate from the Resolution's structure

- Date: 2026-11-26
- Raised in: M-009 (question Q-M-009-1, from the table surface's draft)
- Question: (a) keep `HexagramTableRow` separate from the Resolution's private
  `HexagramStructure`, as R-114 and R-115(1) rule, with matching field names;
  (b) export a shared structure both extend, amending them.
- Ruling: "Q-M-009-1 to -5: A; ratify the table surface; digest ratified"
- Folded into: not yet

### R-316: The row's key field is figure: Figure

- Date: 2026-11-26
- Raised in: M-009 (question Q-M-009-2)
- Question: (a) `figure: Figure`, as R-282 and ADR-0025 word it; (b) `hexagram`.
- Ruling: "Q-M-009-1 to -5: A; ratify the table surface; digest ratified"
- Folded into: not yet

### R-317: The table is a readonly tuple of exactly 64 rows

- Date: 2026-11-26
- Raised in: M-009 (question Q-M-009-3)
- Question: (a) a readonly tuple of exactly 64, built by a private `TupleOf`,
  the constant stubbed by a throw until the rows are written; (b)
  `readonly HexagramTableRow[]`, the length checked by tests only.
- Ruling: "Q-M-009-1 to -5: A; ratify the table surface; digest ratified"
- Folded into: not yet

### R-318: FuxiSequenceNumber is a literal union in hexagram-table.ts

- Date: 2026-11-26
- Raised in: M-009 (question Q-M-009-4)
- Question: (a) the union `1 | … | 64`, after `LinePosition`'s pattern, in
  `hexagram-table.ts`; (b) its own subpath.
- Ruling: "Q-M-009-1 to -5: A; ratify the table surface; digest ratified"
- Folded into: not yet

### R-319: The table's lookup is lookUpRow

- Date: 2026-11-26
- Raised in: M-009 (question Q-M-009-5)
- Question: (a) `lookUpRow(figure: Figure): HexagramTableRow`, total; (b)
  `hexagramTableRow`; (c) `rowOf`.
- Ruling: "Q-M-009-1 to -5: A; ratify the table surface; digest ratified"
- Folded into: not yet

### R-320: The Hexagram table's public surface is ratified

- Date: 2026-11-26
- Raised in: M-009 (draft ac7eb6a: `overhaul/oracle/src/hexagram-table.ts`, the
  `./hexagram-table` export and its `tsdown.config.ts` entry)
- Question: Ratify the surface as drafted? The clerk's suggested comment
  wording for `FuxiSequenceNumber` (the glossary's "read as a binary number
  (yin = 1, the first Line Position the highest bit), plus one") is comment
  wording, Tier B, and goes to the slice's implementer and digest.
- Ruling: "Q-M-009-1 to -5: A; ratify the table surface; digest ratified"
- Folded into: `overhaul/oracle/src/hexagram-table.ts`

### R-321: M-008's Tier-B digest

- Date: 2026-11-26
- Raised in: M-008 (ceb136e, 2d8a35f, 16e7a63)
- Question: Ratify: (1) a private `buildConsultationId` in
  `consultation-id-builder.ts`, not exported; (2) the time checked before any
  draw; (3) keep and record `async`, signatures unchanged; (4) the dev
  dependency in alphabetical order?
- Ruling: "Q-M-009-1 to -5: A; ratify the table surface; digest ratified"
- Folded into: not yet

### R-322: M-009 slice 1's acceptance list

- Date: 2026-11-26
- Raised in: M-009 (slice 1's test list, `overhaul/oracle/tests/hexagram-table.test.ts`)
- Question: Approve the 140 tests as listed: the table typed and holding 64
  rows, 64 distinct Figures and Fuxi Sequence Numbers in order; each of the 64
  rows computed from its Figure by the glossary's rules; `lookUpRow` for all 64
  Figures; anchors (乾 1, 坤 64, the eight symmetric Hexagrams, one Figure
  worked by hand); and the Inverse and Reversed involutions?
- Ruling: "approve the list"
- Folded into: not yet

### R-323: M-009 slice 2's acceptance list

- Date: 2026-11-26
- Raised in: M-009 (slice 2's test list, `overhaul/oracle/tests/resolution.test.ts`)
- Question: Approve the 23 tests as listed: `resolve` over all 4,096
  Transformations as the glossary derives them, structures equal to the
  table's rows, Moving Lines bottom-up, only the Standing Hexagram's Line
  Statements, the input unchanged; the X之X and all-moving anchors (用九 and
  用六 only for 乾 and 坤); a single Moving Line at each position; and order?
- Ruling: "approve the list; digest ratified"
- Folded into: not yet

### R-324: M-009 slice 1's Tier-B digest

- Date: 2026-11-26
- Raised in: M-009 (slice 1, 5cb3ef1, d9bfb2f)
- Question: Ratify: (1) each row a plain object literal in
  `HexagramTableRow`'s field order; (2) `lookUpRow` over a private
  `ReadonlyMap` built once at load, keyed by the Figure's Polarities joined by
  spaces, an index over the data rather than computed data; (3) a missing
  Figure throws, which the Figure type makes impossible; (4)
  `FuxiSequenceNumber`'s comment in the glossary's words?
- Ruling: "approve the list; digest ratified"
- Folded into: not yet

### R-325: A Resolution may share the table's arrays; readonly types guard them

- Date: 2026-11-26
- Raised in: M-009 (question Q-M-009-6, from slice 2's review)
- Question: A Resolution reuses the table's Trigram and Hexagram arrays, and
  the table is not frozen, so untyped code could corrupt it. (a) keep it: the
  readonly types and R-051 are the guard, as R-290 relies on types; (b)
  deep-freeze the table at load; (c) `resolve` copies each array.
- Ruling: "Q-M-009-6 to -7: A; approve the list; digest ratified"
- Folded into: not yet

### R-326: Use case 3 asks for 文言 for any Hexagram the Reading Preference wants it for

- Date: 2026-11-26
- Raised in: M-009 (question Q-M-009-7, from slice 3's tests)
- Question: (a) ask for 文言 for any Hexagram when the Reading Preference wants
  it; the Catalogue returns no text for those without it and the passage is
  left out; use case 3 holds no Work-specific knowledge; a fresh tester adds one
  test pinning it on a Hexagram other than 乾 and 坤; (b) only for 乾 and 坤.
- Ruling: "Q-M-009-6 to -7: A; approve the list; digest ratified"
- Folded into: not yet

### R-327: M-009 slice 3's acceptance list

- Date: 2026-11-26
- Raised in: M-009 (slice 3's test list,
  `overhaul/application/tests/resolve-transformation.test.ts` and
  `overhaul/cli-adapter/tests/resolve.test.ts`)
- Question: Approve the 17 tests as listed (15 for use case 3, 2 for
  `composeCli`), plus R-326's one added test?
- Ruling: "Q-M-009-6 to -7: A; approve the list; digest ratified"
- Folded into: not yet

### R-328: M-009 slice 2's Tier-B digest

- Date: 2026-11-26
- Raised in: M-009 (slice 2, c74eab4)
- Question: Ratify: (1) `resolve`'s helpers private in `resolution.ts`;
  (2) Figures built by mapping each Line Value to its Polarity, positions by
  destructuring; (3) structures filled field by field from `lookUpRow`'s row;
  (4) the All-Moving Statement decided by "all six move and one Polarity";
  (5) `structureOf`'s comment reworded to "filled field by field" in slice 3?
- Ruling: "Q-M-009-6 to -7: A; approve the list; digest ratified"
- Folded into: not yet

### R-329: A future Commentary Work is classified when the Reading Preference's type changes

- Date: 2026-11-26
- Raised in: M-009 (question Q-M-009-8, from slice 3's review)
- Question: Use case 3 treats every preferred Commentary except 小象 as
  following a Hexagram Statement. (a) keep it: the Reading Preference's type
  is closed to the four Works, so a new Work needs a ratified type change
  first, and the question is asked then; (b) list 彖傳, 大象 and 文言
  explicitly now.
- Ruling: "Q-M-009-8: A; digest ratified; start the CLI manual"
- Folded into: not yet

### R-330: M-009 slice 3's Tier-B digest

- Date: 2026-11-26
- Raised in: M-009 (slice 3, 9289882, 150091a, f6f3b42)
- Question: Ratify: (1) two private helpers, `commentariesOn` and
  `citationsOf`, in `resolve-transformation.ts`; (2) the 經 Citation built as
  `{ work: 'zhouyi', ...passage }`; (3) the Catalogue calls in a `for…of` loop
  with `await`, no try/catch; (4) the loop variable named `passage`?
- Ruling: "Q-M-009-8: A; digest ratified; start the CLI manual"
- Folded into: not yet

### R-331: The CLI keeps all six command names

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-1; `docs/manual/cli.md` at 602aecc)
- Question: (a) keep `hexagram`, `hexagram-random`, `hexagram-interactive`, `hexagram-manual`, `hexagram-playground` and `hexagram-history` for parity, with glossary terms in the on-screen text; (b) rename them to glossary terms.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-332: With NO_COLOR on a TTY, the full-screen commands run without colour and with typed input

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-2; `docs/manual/cli.md` at 602aecc)
- Question: (a) on a TTY with `NO_COLOR`, the Ink-only commands run without colour and with typed input; only a headless stdout or `CI` refuses; this amends ADR-0010; (b) keep ADR-0010 as it stands.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Note (clerk): the clerk first recorded this as "NO_COLOR or CI", misreading the draft's (A); asked again, the owner ruled "Q-R-332: A": `CI` still refuses.
- Folded into: `docs/adr/0044-no-color-runs-the-ink-only-commands.md` (R-384)

### R-333: Record a Consultation is a full-screen form

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-3; `docs/manual/cli.md` at 602aecc)
- Question: (a) a full-screen form reached from Home and from `hexagram-history`; (b) other forms in the draft.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-334: Import takes paths and a Division Method per batch

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-4; `docs/manual/cli.md` at 602aecc)
- Question: (a) `--import-legacy [<path>…] --division-method <m>`, defaulting to the Journal folder, one batch per Division Method, also doing ADR-0030's version-1 migration; (b) other forms in the draft.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-335: Bodies are re-rendered by hexagram-history --rerender-bodies

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-5; `docs/manual/cli.md` at 602aecc)
- Question: (a) `hexagram-history --rerender-bodies`, each file written atomically, Unreadable files skipped; (b) other forms in the draft.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-336: Deleting an Unreadable row is refused

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-6; `docs/manual/cli.md` at 602aecc)
- Question: (a) Ctrl+D on an Unreadable row is refused, and the owner deals with the file by hand; (b) delete it with a record of its own.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-337: Browse order for mixed dates

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-7; `docs/manual/cli.md` at 602aecc)
- Question: (a) moments sort by instant, a day-only Divined At sorts before the moments of its day, and each moment shows in its own offset; (b) other orders in the draft.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-338: Use case 8 is reached through the Readout and the Playground

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-8; `docs/manual/cli.md` at 602aecc)
- Question: (a) no command of its own; (b) a command to see Editions, Witnesses or any passage by Citation.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-339: The Transcription strip names the first failing check

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-9; `docs/manual/cli.md` at 602aecc)
- Question: (a) the strip names the first failing check in ADR-0043's order; the MISSING STALKS gauge turns red only when conservation fails first; a terminal shrunk below 32 rows shows a notice and loses nothing; (b) other displays in the draft.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-340: Reading Preference options on every Readout and export

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-10; `docs/manual/cli.md` at 602aecc)
- Question: (a) Reading Preference options on every command that shows a Readout or exports (R-105, R-125), defaulting to CONTEXT.md's; (b) fewer.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-341: Names through use case 8; Trigram imagery from the Translations shown

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-11; `docs/manual/cli.md` at 602aecc)
- Question: (a) Hexagram names through use case 8, following the preference; Trigram imagery from the Translations shown; (b) other sources.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-342: Applicable Passages split across the Standing and Emerging tabs

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-12; `docs/manual/cli.md` at 602aecc)
- Question: (a) split across the two Hexagram tabs, keeping R-283's order; (b) one list.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-343: Nuclear, Inverse and Reversed Hexagrams in each Hexagram's tab

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-13; `docs/manual/cli.md` at 602aecc)
- Question: (a) shown in each Hexagram's tab; (b) elsewhere or not shown.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-344: Editions and Witnesses are shown with every text

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-14; `docs/manual/cli.md` at 602aecc)
- Question: (a) each block headed by its Edition, and a closing section lists Witnesses and conversion labels; (b) other forms.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-345: R-061 is not reopened for line-level 文言

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-15; `docs/manual/cli.md` at 602aecc)
- Question: (a) no line-level 文言 Citation; (b) reopen R-061.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-346: Queries of several lines

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-16; `docs/manual/cli.md` at 602aecc)
- Question: (a) typing stays on one line; longer Queries are shown in full; (b) multi-line entry.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-347: Export uses Typst's WebAssembly build

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-17; `docs/manual/cli.md` at 602aecc)
- Question: (a) `--export <path>`, PDF compiled by Typst's WebAssembly build as an npm dependency (a new runtime dependency), as the PWA does; (b) an external `typst` on PATH; (c) Typst source only.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-348: The merge bundle is one JSON file

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-18; `docs/manual/cli.md` at 602aecc)
- Question: (a) one JSON file, used by `--export-journal` and `--merge-journal`, read and written by the PWA too; (b) other containers.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-349: Deletion Records are one file each in deleted/

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-19; `docs/manual/cli.md` at 602aecc)
- Question: (a) one file per Deletion Record in `deleted/`, written atomically; (b) other forms.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-350: The CLI's error and exit policy

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-20; `docs/manual/cli.md` at 602aecc)
- Question: (a) one line on stderr and exit 1; discarding after a failed save exits 0; import and merge exit 0 and report what they skipped; a Store failure partway exits 1; the exit code for closed stdin in plain mode stays proposed; (b) other policies.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-351: Unknown options or bad values are refused

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question CLI-21; `docs/manual/cli.md` at 602aecc)
- Question: (a) a usage line and exit 1; (b) fall back silently, as today.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-352: The doc-truth exception for docs/manual/cli.md is removed

- Date: 2026-11-26
- Raised in: Phase 4-pre, the CLI manual (question DT-1; `docs/manual/cli.md` at 602aecc)
- Question: (a) remove the row from `scripts/drift/doc-truth-exceptions.md` when the manual lands on `matters`; (b) keep it until ratification.
- Ruling: "CLI-1 to -21: A; DT-1: A"
- Folded into: not yet

### R-353: The CLI manual is ratified

- Date: 2026-11-26
- Raised in: Phase 4-pre (`docs/manual/cli.md`, folded with R-331 to R-352 and
  the corrected R-332)
- Question: Ratify `docs/manual/cli.md` as the standard for Phase 4 (R-008),
  with one item still open (the exit code when stdin closes in plain mode,
  R-350)?
- Ruling: "ratify the CLI manual"
- Folded into: `docs/manual/cli.md`

### R-354: PH4-1, What Phase 4 covers

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-1; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) As section 1's table, with the cutover. (B) As (A) without use cases 9 and 10; about 10 Matters, short of the manual. Recommend (A): it is what the manual describes.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-355: PH4-2, Retirement and the Journal before the cutover

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-2; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: ADR-0020 anchors `consultations/` at the root of whichever checkout runs a command. (A) No root scripts for the new commands until M-021; before then they run only in tests on temporary folders. The owner may try one from a separate worktree, whose `consultations/` is its own. M-021 moves the six names and scripts; the owner then runs `--import-legacy` on the real Journal; the legacy packages are deleted later as a Tier-C chore, and the bug loop stops on them at the cutover. (B) Temporary `next:` scripts in the main checkout, writing version 2 into the real Journal beside version 1. (C) Swap each bin as its Matter lands. Recommend (A): (B) and (C) leave the Journal half Unreadable to both apps.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-356: PH4-3, Slicing, and the Matter count

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-3; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: Porting the Viewer is about 7,800 lines of source and 10,000 of tests, too large for one Matter's touch and brief caps. (A) Split it (M-017, M-018) and merge deleting, merging and importing into one Matter (M-015), keeping 12. (B) Thirteen Matters, which changes the budget, a Tier-A event. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-357: PH4-4, Purity of `catalogue-bundled` and `legacy-import`

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-4; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: R-025 names both and R-105 makes `presentation` pure. (A) Both pure: the Catalogue as literal data, the parser taking file text, since the PWA shares it (ADR-0037); reading files stays in `cli-adapter`. (B) Both impure, reading their own files. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-358: PH4-5, `cli-adapter`'s production arrows

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-5; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) It may import `oracle`, `consultation-journal`, `scripture-catalogue`, `presentation` and every CLI adapter, not `remainder-group-policy`; M-010 retires or replaces the plants this legalises. (B) The domain packages for types and guards only. Recommend (A): the composition root is where everything meets (ADR-0037).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-359: PH4-6, New runtime dependencies

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-6; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) Ink and React at the legacy versions in `cli-adapter`; `js-yaml` in `store-markdown`, without `gray-matter`; Typst as PH4-23 names it; `node:readline` and `node:util` in place of `@inquirer/prompts` and an option library. (B) As (A) with `yaml` for `js-yaml` 3. Recommend (A): nothing the repository lacks except R-347's.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-360: PH4-7, Reusing today's code

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-7; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) Copy and adapt legacy components, the legacy converter and `@hexagram/test-utils`' helpers into the overhaul; never import a legacy package. (B) Import legacy packages through new arrows. (C) Rewrite from the manual. Recommend (A): it keeps ADR-0012's patterns and leaves the legacy deletable.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-361: PH4-8, The commands' in-process entry point

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-8; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: A spawned child is never a TTY, and scripted ports in a bin would need a hidden option. (A) Each command exports `run(argv, io, ports)`, where `io` carries stdin, stdout, stderr, `isTTY`, rows, columns and the environment, and `ports` are the four driven ports plus the Journal folder; it resolves to the exit code. The bin passes the process and real adapters. (B) One `run` for all six, the command named in `argv`. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-362: PH4-9, `store-markdown`'s surface beyond the port

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-9; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: `--rerender-bodies` cannot go through `keep`, and moving imported originals and locating the Journal have no port. (A) It exports a builder taking the folder and body renderer and returning a `ConsultationStore`, `rerenderBodies` and `moveToLegacy`; locating the folder (ADR-0020) stays in the bins. (B) Widen the port, which the PWA's store would stub. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-363: PH4-10, Where ADR-0030's shared codec lives

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-10; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) A pure public subpath of `consultation-journal`, version-2 record to `Consultation` and back, checking replay through `oracle`'s `divide` from `emptyCasting`, returning an Unreadable reason on failure; YAML text stays in `store-markdown`; the bundle and the PWA reuse the codec. (B) Private to `store-markdown`. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-364: PH4-11, How `keep` gets its body

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-11; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) The body renderer is injected when the Store is built, built from use case 3 and the Markdown renderer with the default Reading Preference, so `--rerender-bodies` has one answer. (B) With the keeping command's Reading Preference. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-365: PH4-12, Legacy `.txt` files in the Journal folder

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-12; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: Version-1 `.md` files are Unreadable (manual section 2). (A) `.txt` files are neither read nor counted, as today, until imported. (B) Counted as Unreadable. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-366: PH4-13, Unreadable reasons, and a duplicate Id

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-13; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: The reason shows in the footer. (A) A closed list drafted with the codec: no frontmatter; not YAML; not version 2; a field missing or invalid, named; the Casting does not replay; and a second file holding an Id already read. (B) Free text; a duplicate shows twice. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-367: PH4-14, The Deletion Record file

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-14; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) `deleted/<Id>.json` holding the record as the bundle encodes it; `remove` writes it before deleting the `.md`. (B) YAML. Recommend (A): one encoding in both places.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-368: PH4-15, The bundle's shape

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-15; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) A JSON object with a format name and version, `consultations` as the codec's records and `deletionRecords`, sorted by Id for reproducible bytes, with a byte fixture binding on the PWA. (B) Unsorted. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-369: PH4-16, The Catalogue's data

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-16; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) A one-off conversion of the legacy models into literal data in `catalogue-bundled`, with EditionIds such as `legge-1882` and Witness records from ADR-0028; no runtime link to `@hexagram/core`. (B) Import the legacy models at runtime. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-370: PH4-17, 用九 / 用六, for the whole phase

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-17; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: The default Readout needs it for all-moving 乾 and 坤, and the tree has none. (A) The owner supplies the two Witnessed passages, with their 小象, in each Edition that has them, before M-011 starts; M-011 bundles them and M-013's fixtures show them; this blocks M-011. (B) Ship without and amend the manual. (C) A 13th Matter to source them, an overrun of the budget and a Tier-A event. Recommend (A): two short passages, and agents must not transcribe scripture unsupervised.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-371: PH4-18, 文言 and the Yilin

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-18; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: Neither is in the default Reading Preference. (A) Until the owner supplies Witnessed texts, they show nothing, as for a Translation lacking a passage, and the manual's "Still open" says so; their data Matter comes after Phase 4. (B) Source them in Phase 4 as a 13th Matter, a Tier-A overrun. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-372: PH4-19, The Catalogue port's gaps

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-19; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) The port and use case 8 gain the Received Sequence Number of a Hexagram, and a Trigram's name and imagery in each Edition shown (R-341). (B) The Received Sequence Number as a table in `presentation`, outside its context. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-373: PH4-20, The conversion label (R-344)

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-20; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) Part of the Witness's `description`; `Edition` unchanged. (B) A new field. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-374: PH4-21, Where the Markdown renderer lives: an ADR conflict

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-21; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: ADR-0030 says "Presentation's Markdown renderer" and `CONTEXT.md` makes Presentation "Readouts in every medium"; ADR-0022 puts the monospace Markdown body on the CLI side. (A) Read ADR-0030 as naming the Presentation context: the `presentation` package holds the medium-neutral Readout and the Typst renderer, and the monospace grid, plain, Ink and Markdown renderers live in `cli-adapter`, as ADR-0022 holds; a note in ADR-0030 says so. (B) The Markdown renderer and the monospace grid go in `presentation`, superseding ADR-0022. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-375: PH4-22, Where byte fixtures come from

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-22; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: The manual changes the Readout, so today's fixtures cannot stand. (A) The tester derives each fixture by editing today's bytes (plain output, Ink sections, Markdown body, whole file; frontmatter in M-012) to the manual's changes, so the owner reviews a diff, and adds cases for X之X, all-moving 乾 with its 用九 text as PH4-17 rules, several Moving Lines, a Recorded Consultation and a date-only Divined At; the owner ratifies them with the test list, before the renderer. No fixture may record a missing default passage. (B) Generated by the first implementation and ratified before landing. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-376: PH4-23, Typst in Node

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-23; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: R-347 did not name the package, the fonts for Chinese, or the time. (A) The owner starts a spike before M-016. (B) Decide from documentation. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-377: PH4-24, Closed stdin before the Query (R-350, open)

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-24; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) Exit 1 with one line, as the manual proposes. (B) Exit 0, as a quit. Rule before M-014.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-378: PH4-25, Clarifying R-337

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-25; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: In a newest-first list, "sorts before" reads as "listed above". (A) A date-only row is listed above that day's moments, the day of a moment being its date in its own offset; moments order by instant, ties by Consultation Id. (B) Below them. Recommend (A), the literal reading.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-379: PH4-26, A date and time entered without an offset

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-26; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) The Record form shows the system's current offset as an editable part of the field. (B) The offset is applied silently. Recommend (A): a past date may fall in another offset.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-380: PH4-27, Maintenance options together

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-27; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) `--import-legacy`, `--rerender-bodies`, `--export`, `--export-journal` and `--merge-journal` exclude each other; two together is a usage refusal (R-351). (B) Run in a fixed order. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-381: PH4-28, How Ink Matters are accepted

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-28; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) Named `ink-testing-library` files that wait on `onReady` (ADR-0012), with `pnpm lint:check` in the Acceptance for the `await tick()` ban; the clerk runs `pnpm test:stress:once` before each lands, outside Acceptance. (B) `test:stress` in Acceptance. Recommend (A).
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-382: PH4-29, On-screen strings

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-29; `docs/reviews/2026-11-26-phase-4-cli.md`)
- Question: (A) Tab content is fixed by M-013's Ink-section fixtures, as today; each Matter's test list names every new footer, prompt and menu string, and its approval ratifies them. (B) Byte fixtures of whole Ink frames. Recommend (A): frames depend on terminal size.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-383: PH4-30, colour-borne meaning gets a text marker under NO_COLOR

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (question PH4-30, from ADR-0044's draft)
- Question: ADR-0044 requires that no screen rely on colour alone, but the
  manual does not say how the red MISSING STALKS gauge or a miscount in the
  Transcription strip shows under `NO_COLOR`. (a) each gets a text marker as
  well, added to the manual's §6.5 as an addendum in M-019; (b) leave it to
  the implementer.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: not yet

### R-384: ADR-0044 is ratified, kept separate until ADR-0010 is consolidated

- Date: 2026-11-26
- Raised in: folding R-332 (draft 25f83f9 on `docs/adr-0010-amendment`)
- Question: Ratify ADR-0044, which amends ADR-0010 so `NO_COLOR` on a TTY runs
  the Ink-only commands while `CI` and a non-TTY stdout refuse? Consolidation:
  (a) keep ADR-0044 separate, as R-297 did, and consolidate ADR-0010 with
  ADR-0011 and ADR-0043 before M-019; (b) consolidate now.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: `docs/adr/0044-no-color-runs-the-ink-only-commands.md` (da85145)

### R-385: M-010 to M-021 are ratified as drafted

- Date: 2026-11-26
- Raised in: Phase 4's breakdown (section 2 of the proposal, 1981cf1)
- Question: Ratify the twelve Matter entries as drafted, each with its Scope,
  Tier-A surface, Free to choose and Acceptance? Test file names are drafts
  each tester fixes in the list the owner approves.
- Ruling: "PH4-1 to -30: A; ratify ADR-0044 with consolidation A; ratify the Matters"
- Folded into: `MATTERS.md` (M-010 to M-021)

### R-386: The prover's copy of the exception rows drops the cli.md row

- Date: 2026-11-26
- Raised in: `drift:prove` red on `matters` and `main` since the CLI manual
  landed (question Q-DT-2)
- Question: `scripts/drift/prove-signal-1.ts` holds R-254's and R-265's seed
  word for word, including the `docs/manual/cli.md` row R-352 removed from the
  real file. (a) drop that entry from the prover's seed, made by a fresh
  implementer before M-010; (b) restore the row, contradicting R-352.
- Ruling: "Q-DT-2 to -3: A"
- Folded into: not yet

### R-387: drift:prove runs in CI's check job and at the clerk's Step 6

- Date: 2026-11-26
- Raised in: question Q-DT-3 (the break above passed CI, which runs only
  `drift:check`)
- Question: (a) add `pnpm drift:prove` to CI's `check` job
  (`.github/workflows/unit-test.yml`) and to `clerk.md` Step 6 beside
  `drift:check`; (b) the clerk runs it by hand at every landing.
- Ruling: "Q-DT-2 to -3: A"
- Folded into: not yet

### R-388: CommandIo's streams are small structural interfaces

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-1, from the surface's draft e972fae)
- Question: (a) small structural interfaces in `entry-point.ts`, holding only
  what a command uses (`write`, `on`, `isTTY`, `columns` and the like), which
  `process.*` and a test fake both satisfy without an assertion; the bin and
  the Ink code narrow to Node's streams where Ink needs them; (b)
  `NodeJS.ReadStream` and `NodeJS.WriteStream`; (c) `node:stream`'s
  `Readable` and `Writable`.
- Ruling: "Q-M-010-1 to -4: A; ratify the surface with those"
- Folded into: not yet

### R-389: The usage line is the full synopsis on one line

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-2)
- Question: (a) the full synopsis on one line, from the manual's §7 rows for
  the command; (b) a short line pointing to the manual; (c) the problem
  first, then the synopsis.
- Ruling: "Q-M-010-1 to -4: A; ratify the surface with those"
- Folded into: not yet

### R-390: CommandIo's env is narrowed to NO_COLOR and CI

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-3)
- Question: (a) `env` narrowed to `NO_COLOR` and `CI`; whether an empty
  value or `CI=false` counts as set goes to the tester's audit; (b) any
  environment.
- Ruling: "Q-M-010-1 to -4: A; ratify the surface with those"
- Folded into: not yet

### R-391: The terminal size is read once at start

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-4)
- Question: (a) `rows` and `columns` read once at start, Ink tracking
  resizes itself; (b) a `terminalSize` object that can be undefined.
- Ruling: "Q-M-010-1 to -4: A; ratify the surface with those"
- Folded into: not yet

### R-392: M-010's public surface is ratified, with R-388 to R-391

- Date: 2026-11-26
- Raised in: M-010 (draft e972fae: `node-effects`' `systemClock` and
  `cryptoRandomSource`; `cli-adapter/src/commands/entry-point.ts`; the
  usage line)
- Question: Ratify the surface, amended by R-388, with its digest: (1) the
  adapters are constants; (2) `node-effects` depends only on `application`
  until the boundary row adds arrows; (3) `isTTY` is stdout's (ADR-0044);
  (4) `ExitCode` is `0 | 1` (R-350); (5) the modules are
  `src/commands/entry-point.ts` and `src/commands/<command>.ts`; (6)
  `cli-adapter` gets no `exports`; (7) stubs carry their inputs as `cause`?
- Ruling: "Q-M-010-1 to -4: A; ratify the surface with those"
- Folded into: not yet

### R-393: node-effects may import application and consultation-journal/divined-at

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-5, slice 1's spec audit)
- Question: The Clock must return a `UtcOffset`, admitted only by
  `isUtcOffset` in `consultation-journal/divined-at`. (a) `node-effects`
  may import `application` freely and `consultation-journal` only by
  `divined-at`, as `scripture-catalogue` does; not pure; its tests reach the
  same arrows; B7 and B8 reused; its twin lists both; (b) all of
  `consultation-journal`; (c) a new rule B13 with its own plant.
- Ruling: "Q-M-010-5 to -7: A"
- Folded into: not yet

### R-394: An offset outside isUtcOffset's range makes the Clock throw

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-6)
- Question: `isUtcOffset` admits −12:00 to +14:00, but Node honours, for
  example, `TZ=XYZ+15`. (a) `now()` throws an Error naming the offset, so
  keep and record reject unchanged and keep nothing (R-311, as R-309); an
  offset with seconds is folded into the same answer; (b) fall back to
  `+00:00`; (c) clamp to the nearest admitted offset.
- Ruling: "Q-M-010-5 to -7: A"
- Folded into: not yet

### R-395: The B9 dev-arrow plant is kept as "missing production arrows"

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-7)
- Question: Under R-358 no package keeps a test-only dependency, so
  `b9-dev-arrow-in-dependencies.package.json` loses its subject. (a) keep the
  plant, re-described as "missing production arrows", with a note in
  `expected.ts` that R-165's field check has no subject until a package has a
  test-only dependency again; (b) retire it; (c) give some package a dev arrow
  to keep it.
- Ruling: "Q-M-010-5 to -7: A"
- Folded into: not yet

### R-396: M-010 slice 1's acceptance list and boundary fixtures

- Date: 2026-11-26
- Raised in: M-010 (slice 1's tests, e7d0195)
- Question: Approve the tests of `system-clock.test.ts`,
  `crypto-random-source.test.ts` and `real-effects-casting.test.ts` as
  listed, and the drift fixture changes: a `node-effects` twin; the
  `cli-adapter` twin with five production arrows and no dev arrows; the three
  plants replaced by plants importing `remainder-group-policy`; the b9
  dev-arrow plant re-described; `expected.ts` to match, with R-395's note?
- Ruling: "approve the list"
- Folded into: not yet

### R-397: A command not built yet names the mode the table chose

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-8, slice 2's spec audit)
- Question: The manual is silent. (a) one line on stderr, exit 1, naming the mode §2's table chose (for example "hexagram-random: plain mode is not built yet"), its wording ratified by the owner; (b) one line, "<command> is not built yet"; (c) a ratified, exported mode classifier the tests call.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-398: The other five usage lines are drafted for ratification

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-9, slice 2's spec audit)
- Question: Only hexagram-random's was ratified (R-392). (a) the implementer drafts the five from §7 as `usage` constants for the owner's ratification, the tests import them, each written to stderr with a newline; (b) the tester drafts them in the tests.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-399: Options are parsed before the terminal is checked

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-10, slice 2's spec audit)
- Question: (a) options first, so a usage refusal wins over a terminal refusal; (b) the terminal refusal wins.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-400: NO_COLOR and CI are set when present and non-empty

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-11, slice 2's spec audit)
- Question: (a) present and non-empty, for both; `CI=false` counts as set; (b) as (a), with `CI=false` and `CI=0` unset; (c) present at all, even empty.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-401: A positive whole number is decimal digits with no leading zero

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-12, slice 2's spec audit)
- Question: (a) decimal digits only, no leading zero, the `--option=value` form accepted, no upper bound; (b) anything `Number` reads as a positive integer.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-402: A non-repeatable option given twice is a usage refusal

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-13, slice 2's spec audit)
- Question: (a) a usage refusal; (b) the last one wins.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-403: The frame accepts any non-empty --translation and --commentary value

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-14, slice 2's spec audit)
- Question: (a) any non-empty string; the Readout's Matter checks it against the Catalogue; (b) the frame checks now.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-404: A positional is a usage refusal, except paths after --import-legacy

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-15, slice 2's spec audit)
- Question: (a) a positional is a usage refusal except paths after `--import-legacy`; a lone `--` is dropped; (b) every positional is refused.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-405: hexagram-history options that do not apply are refused

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-16, slice 2's spec audit)
- Question: (a) each is a usage refusal (`--division-method` without `--import-legacy`, `--filter` without `--export`, display options with `--import-legacy` or `--rerender-bodies`), display options allowed with `--export`; (b) ignore what does not apply.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-406: The 32-row check for hexagram-manual is in the frame

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-17, slice 2's spec audit)
- Question: (a) in the frame, after the TTY and `CI` refusals, with §6.5's line; (b) deferred to hexagram-manual's Matter.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-407: The bins live in cli-adapter/src/bin and pass stubs until the adapters land

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-18, slice 2's spec audit)
- Question: (a) `src/bin/<command>.ts`, no `package.json` `bin` field until M-021 (R-355), spawn tests through `tsx --conditions=source`; the bins pass throwing stubs for the Catalogue and Store until their Matters; the Journal folder found by a helper copied from the legacy `workspace-root` (ADR-0020, R-360); (b) `bin` entries and a build now, or wait for the real adapters.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-408: The frame's tests fake the Catalogue and Store with throwing stubs

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-19, slice 2's spec audit)
- Question: (a) throwing stubs, and no refusal or not-built path touches a port; (b) other fakes.
- Ruling: "Q-M-010-8 to -19: A"
- Folded into: not yet

### R-409: --export-journal and --merge-journal refuse the display options

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-20, from the usage lines' draft 818a172)
- Question: R-405 allows the display options only with browsing and
  `--export`. (a) `--export-journal` and `--merge-journal` refuse them, as
  neither produces a Readout; (b) allow and ignore them.
- Ruling: "Q-M-010-20 to -22: A; ratify the text and bins"
- Folded into: not yet

### R-410: --plain names plain mode and --numeric-input names typed input

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-21)
- Question: Which mode a flag names on a TTY. (a) `--plain` gives "plain
  mode" (manual §6.3) and `--numeric-input` gives "full-screen, typed input";
  (b) only the terminal and environment column decides.
- Ruling: "Q-M-010-20 to -22: A; ratify the text and bins"
- Folded into: not yet

### R-411: The not-built phrases keep §2's words for -manual and -playground

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-22)
- Question: §2's cells say "typed input" for `hexagram-manual` and
  `hexagram-playground`, which have no slider. (a) keep the table's words;
  (b) amend the manual's §2.
- Ruling: "Q-M-010-20 to -22: A; ratify the text and bins"
- Folded into: not yet

### R-412: The usage lines, the not-built lines and the bins are ratified

- Date: 2026-11-26
- Raised in: M-010 (draft 818a172: five `usage` constants,
  `src/commands/not-built.ts`, `src/bin/<command>.ts` and
  `src/process-adapters.ts`)
- Question: Ratify the five usage lines, the template
  `<command>: <mode> is not built yet` with each command's reachable phrases,
  and the six bins, with the digest: (1) phrases are §2's cells word for word;
  (2) maintenance runs are named by their option; (3) `--wrap-width` is left
  off `-playground` and `-history`, as §7 lists it; (4) `--division-method`
  values in the manual's order; (5) the journal operand is `<file>`; (6)
  repeats marked with ASCII `...`; (7) process helpers shared in
  `src/process-adapters.ts`?
- Ruling: "Q-M-010-20 to -22: A; ratify the text and bins"
- Folded into: not yet

### R-413: M-010 slice 2's acceptance list

- Date: 2026-11-26
- Raised in: M-010 (slice 2's tests, e3ec98b)
- Question: Approve the 262 tests of `frame.test.ts` and
  `frame-spawn.test.ts` as listed (nine in-process tables; seven spawned
  cases), each checking stderr exactly, empty stdout, exit 1 and no port
  touched, with the not-built line and the terminal refusal ending in a
  newline?
- Ruling: "approve the list; Q-M-010-23: A"
- Folded into: not yet

### R-414: Import paths come directly after --import-legacy; a lone -- is dropped anywhere

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-23, corners slice 2's tests left open)
- Question: (a) paths are accepted only directly after `--import-legacy`; a
  lone `--` is dropped wherever it appears; `--plain --no-ui` together is a
  repeat, so a usage refusal (R-402); a fresh tester adds those cases;
  (b) leave them untested.
- Ruling: "approve the list; Q-M-010-23: A"
- Folded into: not yet

### R-415: A separate value starting with - is refused; such a value needs the = form

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-24, from slice 2's review)
- Question: A value taken from the next argument swallows a forgotten value's
  next option (`--translation --yilin`, `--export --filter`,
  `--merge-journal --export-journal`). (a) refuse a separate value that
  starts with `-`; such a value needs the `=` form (`--translation=--x`), so
  R-403 still holds through `=`; a fresh tester adds the cases first; (b) keep
  it; (c) refuse only the command's own options.
- Ruling: "Q-M-010-24 to -26: A; digest ratified; Q-PH6-1: A"
- Folded into: not yet

### R-416: Empty values for --export, --filter, --export-journal and --merge-journal are refused

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-25, from slice 2's review)
- Question: (a) ratify the refusal (a bad value under R-351), with tests added
  beside R-415's; (b) accept an empty `--filter` as "match all".
- Ruling: "Q-M-010-24 to -26: A; digest ratified; Q-PH6-1: A"
- Folded into: not yet

### R-417: processPorts keeps its unused process parameter

- Date: 2026-11-26
- Raised in: M-010 (question Q-M-010-26, from slice 2's implementer)
- Question: The Journal folder is found from the module's own location
  (ADR-0020), so `processPorts(process)` does not read `process`. (a) keep the
  ratified signature, with the narrow lint comment saying why; (b) drop the
  parameter; (c) start from `process.argv[1]`.
- Ruling: "Q-M-010-24 to -26: A; digest ratified; Q-PH6-1: A"
- Folded into: not yet

### R-418: M-010 slice 2's Tier-B digest

- Date: 2026-11-26
- Raised in: M-010 (slice 2, 77bacca, e3e933c, 18c362a)
- Question: Ratify: (1) a hand-written parser from a rules table per command,
  `--no-ui` an alias of `--plain`; (2) the Reading Preference options defined
  once in `frame.ts`; (3) `hexagram-history`'s order: parse, one maintenance
  option at most, inapplicable options, the not-built line, the terminal
  table; (4) the 32-row check skipped when a TTY reports no row count; (5) no
  `run` declares `ports`, so no frame ending can touch a port; (6) the
  stand-in Catalogue and Store reject their Promise (R-407 and the ratified
  comment say "throwing")?
- Ruling: "Q-M-010-24 to -26: A; digest ratified; Q-PH6-1: A"
- Folded into: not yet

### R-419: A ratified PWA manual, with its UI design, gates Phase 6

- Date: 2026-11-26
- Raised in: question Q-PH6-1 (the owner asked how Phase 6 settles its UI
  design; nothing does, and ADR-0042 gates only Phases 4 and 5)
- Question: (a) a "6-pre" row: `docs/manual/pwa.md`, drafted with the copilot
  and ratified by the owner as Phase 6's entry gate, covering Brooks's nine
  items plus a ratified UI design (screens, navigation, touch entry for
  Transcription), worked out with throwaway prototypes in the browser; it
  amends ADR-0042's gates and `MATTERS.md`; the clerk raises "draft the
  manual" when Phase 5 lands; (b) settle the UI Matter by Matter; (c) an ADR
  for principles and stack now, screens per Matter.
- Ruling: "Q-M-010-24 to -26: A; digest ratified; Q-PH6-1: A"
- Folded into: not yet (`MATTERS.md`'s 6-pre row added; ADR-0042's gates to be
  amended by a draft for the owner's ratification)

### R-420: An import path starting with `-` is refused; write `./-name`

- Date: 2026-11-27
- Raised in: M-010 (slice 2 re-review of ae06255)
- Question: `--import-legacy -old.txt` gets the usage refusal, and no form
  reaches such a path (`--import-legacy` takes no `=` form and a lone `--` is
  dropped, R-414). (A) ratify the refusal; the user writes `./-old.txt`; a
  tester adds a row for both; (B) let `--` right after `--import-legacy` mark
  paths, an exception to R-414; (C) accept `--import-legacy=<path>` for one
  path.
- Ruling: "Q-M-010-27: A; digest ratified"
- Folded into: not yet (`docs/manual/cli.md` §2 at the manual's next revision)

### R-421: M-010 slice 2's R-415 digest

- Date: 2026-11-27
- Raised in: M-010 (slice 2, 63a22e2, ae06255)
- Question: Ratify: (1) a lone `-` is refused as a separate value, since it
  starts with `-`; nothing reads stdin through an option value; (2)
  `parseOptions`'s doc comment names the case: "a bad or missing value, or a
  separate value starting with `-`"; (3) three new rows that another rule
  already refuses (`--wrap-width -5`, and two ending in a stray positional)
  stay as extra coverage.
- Ruling: "Q-M-010-27: A; digest ratified"
- Folded into: not yet

### R-422: M-012 runs before M-011 while 用九 / 用六 is pending

- Date: 2026-11-27
- Raised in: question Q-ORD-1 (M-010 landed; M-011 is blocked on the owner's
  passages, R-370; the ratified order allows only M-015/M-016 and
  M-019/M-020 to swap)
- Question: (A) Start M-012 now and run M-011 as soon as the passages arrive;
  M-013 still needs both. (B) Wait for the passages and keep the order.
- Ruling: "Q-ORD-1: A"
- Folded into: `MATTERS.md` (M-012 in progress before M-011)

### R-423: A delegate rules in the owner's stead

- Date: 2026-11-27
- Raised in: the owner's request: "I've been going along with all the
  decisions so far. Create a decision making agent to take over"
- Question: Handing decisions to an agent amends ADR-0042 (the owner is the
  sole architect). (1) Scope: all but a reserved list; digests and tests
  only; or everything. (2) Oversight: a digest at each landing; a phase-end
  review; or no routine review.
- Ruling: (1) "Option 3 BUT the delegate can exercise discretion and refer
  issues deemed critical/contentious/pivotal to me." (2) "Digest at each
  landing"
- Folded into: `docs/agents/delegate.md`, `docs/agents/clerk.md` §3, and ADR-0047 (R-493)
  ADR-0042 amendment is to be drafted for the owner (the delegate never rules
  on its own charter)
- Clerk's note: the delegate may not overturn the owner's own Rulings, and
  refers scripture, `consultations/`, pushing and `main`; the charter files
  these under "pivotal" and "critical" as the owner's discretion clause
  allows.

### R-424: The clerk pushes and opens pull requests

- Date: 2026-11-27
- Raised in: the owner's message
- Question: (none asked; the owner's instruction)
- Ruling: "What's stopping you from making pushes and PRs. I feel that does
  not need my input as long as you do linear git history, no force pushes,
  make PR, always rebase and no merge commit"
- Folded into: not yet (`docs/agents/clerk.md`'s landing lines, once the
  git-guard hook admits a push of `matters`)
- Clerk's note: read as pushing `matters` (plain push, never forced) and
  opening its PR to `main`. Fast-forwarding `main` stays with the owner
  until they say otherwise, since R-423 puts their review of the delegate's
  rulings at that step.

### R-425: The clerk fast-forwards `main` too

- Date: 2026-11-27
- Raised in: the clerk's reading of R-424 (fast-forwarding `main` left with
  the owner)
- Question: (A) The hook admits a plain push of `matters`; the owner keeps
  fast-forwarding `main`. Or the clerk fast-forwards `main` too.
- Ruling: "edit the hook; you can fast-forward main too"
- Folded into: `docs/agents/clerk.md` §0 (git constraints); the owner's
  `~/.claude/hooks/git-guard.sh` admits exactly the two pushes

### R-426: The Unreadable reason is a closed union

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-1
- Ruled by: delegate (R-423)
- Ruling: A — `UnreadableFile.reason` becomes the closed union `UnreadableReason`, as drafted, and each channel words it; that wording is ratified with the Ink and report text.
- Reason: R-366 (A) ordered a closed list drafted with the codec; a list in data lets the footer, the import report and the merge report share it. The old doc line "written for people" falls away.
- Folded into: not yet

### R-427: Missing and invalid fields share one reason

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-2
- Ruled by: delegate (R-423)
- Ruling: A — One kind, `invalid-field`, names the field and does not tell missing from invalid.
- Reason: R-366 words it "a field missing or invalid, named"; two kinds add unasked generality.
- Folded into: not yet

### R-428: A duplicate Id names the first file; order is by file name

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-3
- Ruled by: delegate (R-423)
- Ruling: A — `duplicate-id` carries `firstLocation`; "second" means later in the code-point order of file names, and `get` returns the first file's Consultation; the Store's doc comment states the order.
- Reason: R-366 needs some file to be second; only a fixed order keeps the footer and tests stable; file names start with the divined date (ADR-0030).
- Folded into: not yet

### R-429: The codec's names and place

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-4
- Ruled by: delegate (R-423)
- Ruling: A — Subpath `record-codec`; `encodeRecord`, `decodeRecord`, `ConsultationRecord`, `DecodeResult`; the `outcome` discriminant; `RecordField` and `UnreadableReason` in `unreadable-file.ts`.
- Reason: "Record" and "version-2 record" are already the library's words (ADR-0030; CONTEXT.md); `outcome` follows oracle's `DivisionResult`; the subpath matches the Acceptance's test file.
- Folded into: not yet

### R-430: Decoding returns a result and never throws

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-5
- Ruled by: delegate (R-423)
- Ruling: A — `decodeRecord` returns a result union and never throws; `encodeRecord` is total.
- Reason: An Unreadable file is an expected, counted outcome (ADR-0030, manual §6.7); result unions are the codebase's convention (oracle's `divide`).
- Folded into: not yet

### R-431: The codec reads the JSON data model; never plain `load`

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-6
- Ruled by: delegate (R-423)
- Ruling: A, with a correction — The codec reads the JSON data model only; `store-markdown` parses with js-yaml 3's `JSON_SCHEMA` or `CORE_SCHEMA`, never plain `load` or the default schema. An unquoted `789876` still parses as a number under those schemas and stays `invalid-field: transformation`; the writer always quotes it.
- Reason: R-363 means one codec for YAML and the JSON bundle; js-yaml 3's default `load` admits `!!js/*` tags, so the ban is also a safety rule.
- Folded into: not yet

### R-432: `divinedAt` keeps milliseconds and its own offset

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-7
- Ruled by: delegate (R-423)
- Ruling: A — `encodeRecord` writes `YYYY-MM-DDTHH:mm:ss.sss±HH:MM` (exactly three fraction digits) in the Moment's own offset; decoding accepts that and the form without a fraction, refuses `Z`, and requires an offset `isUtcOffset` admits; `decode(encode(c))` equals `c`. The R-375 frontmatter fixture shows this text.
- Reason: R-037 ratified a Moment with epoch milliseconds, so seconds would break ADR-0030's round trip; accepting more forms later is additive.
- Folded into: not yet

### R-433: Which failure is which

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-8
- Ruled by: delegate (R-423)
- Ruling: A — The failure map as drafted; unknown extra fields are ignored.
- Reason: It fits R-366's list without a seventh reason; ADR-0030 keeps strictness in `schemaVersion` (ADR-0008), not in extra keys; the decode order makes the first failure deterministic.
- Folded into: not yet

### R-434: The Store builder's shape

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-9
- Ruled by: delegate (R-423)
- Ruling: A — `markdownConsultationStore({ journalFolder, renderBody })` returns `{ consultationStore, rerenderBodies, moveToLegacy }`.
- Reason: R-362 (A) almost word for word; maintenance stays off the use cases' object; `journalFolder` matches `CommandPorts`.
- Folded into: not yet

### R-435: The body renderer is async and built in the bin

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-10
- Ruled by: delegate (R-423)
- Ruling: A — `RenderBody = (c: Consultation) => Promise<string>`; the bin builds it from `resolveTransformation` and `cli-adapter`'s Markdown renderer with the default Reading Preference.
- Reason: R-364 (A) and R-374 (A); use case 3 is async; building it through `composeCli` would be circular.
- Folded into: not yet

### R-436: `rerenderBodies` returns a count

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-11
- Ruled by: delegate (R-423)
- Ruling: A — `rerenderBodies` resolves to `{ rewritten: number }`.
- Reason: Manual §6.7 prints only the count; widening later is additive.
- Folded into: not yet

### R-437: `moveToLegacy` never overwrites; it takes a free suffixed name

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-12
- Ruled by: delegate (R-423)
- Ruling: new (B) — `moveToLegacy` takes any path and never overwrites; when `legacy/<name>` exists it moves the file under the first free suffixed name keeping the original name and extension, and the import carries on. The suffix form is Tier B (the implementer's); EXDEV copy-and-unlink is the implementer's.
- Reason: Manual §6.7: "importing the same files twice keeps them twice" and every original moves into `legacy/`; (A) would stop a re-import with exit 1, contradicting the manual, and (C) also refuses paths outside the folder. Cheap to reverse before M-015 builds it.
- Folded into: not yet

### R-438: A missing Journal folder is an empty Journal

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-13
- Ruled by: delegate (R-423)
- Ruling: A — `list` and `get` read a missing folder as an empty Journal; `keep` creates it; the Store's doc comment says so.
- Reason: A fresh checkout has no git-ignored Journal folder (ADR-0015, ADR-0020) and reading never writes (ADR-0030); "the Journal cannot be read" still covers permissions or a file in its place.
- Folded into: not yet

### R-439: `store-markdown`'s boundary row and twins

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-14
- Ruled by: delegate (R-423)
- Ruling: A — Row `'store-markdown': { rule: 'B7', testsRule: 'B8', pure: false, dependencies: { application: 'any', 'consultation-journal': 'any' } }`; `'store-markdown': 'any'` in `cli-adapter`'s row; twins: `twins/store-markdown.package.json`, the store arrow in `twins/cli-adapter.package.json`, a source twin of `store-markdown/src` using `node:fs` and importing `application`, and `expected.ts` entries. No `oracle` arrow; if the tester needs one it comes back as a question.
- Reason: R-358 and R-314; the Store uses several journal subpaths, so 'any' is simpler than narrowing.
- Folded into: not yet

### R-440: js-yaml arrives with the Store slice

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-15
- Ruled by: delegate (R-423)
- Ruling: A — Add `js-yaml ^3.14.1` and `@types/js-yaml ^3.12.10` (the legacy versions) to `store-markdown` when slice 2 starts; R-431's parsing rule applies.
- Reason: R-359 and R-360 ratified the package and version; adding it at first use keeps the codec slice free of it.
- Folded into: not yet

### R-441: `composeCli` widens in slice 3 only

- Date: 2026-11-27
- Raised in: M-012 (drafted surface b24a03f, 8e01964), question Q-M-012-16
- Ruled by: delegate (R-423)
- Ruling: A — Widen `composeCli` with `browseConsultations` and `openConsultation` in slice 3; M-013 and M-015 widen `CommandPorts` to reach `rerenderBodies` and `moveToLegacy`.
- Reason: M-012's scope is use cases 4 and 5; M-013 and M-015 list their own widening.
- Folded into: not yet

### R-442: The POSIX-zone clock rows skip on Windows

- Date: 2026-11-27
- Raised in: M-010, question Q-M-010-28 (PR #61's Windows test leg: Windows
  Node ignores POSIX `TZ` strings, so four rows of `system-clock.test.ts`
  read `+00:00`; no IANA zone lies outside -12:00 to +14:00)
- Ruled by: delegate (R-423)
- Ruling: A — the POSIX-zone rows (`XYZ+0`, `XYZ+12`, `XYZ-14`, and the two
  throw rows `XYZ+15`, `XYZ-15`) keep their names and assertions but run
  under `it.skipIf(process.platform === 'win32')`; the IANA rows run
  everywhere; one comment gives the reason; nothing under `src/` changes.
- Reason: production is correct and the fault is the platform's; skipping
  changes where the approved rows run, not what they say. (B) would widen
  `node-effects`' ratified surface for a test, and (C) contradicts ADR-0013,
  which makes the Windows leg load-bearing. In CI only Ubuntu proves the
  throw (there is no macOS leg); macOS proves it locally.
- Folded into: not yet

### R-443: A lone `divisionMethod` names `divisionMethod`

- Date: 2026-11-27
- Raised in: M-012 slice 1, question Q-M-012-17
- Ruled by: delegate (R-423)
- Ruling: A — A record with `divisionMethod` but no `casting`, or `casting` but no `divisionMethod`, is `invalid-field: divisionMethod`.
- Reason: Already settled by R-433's ratified map; ADR-0030 puts "present if and only if casting is" on the `divisionMethod` row.
- Folded into: not yet

### R-444: An explicit null is invalid, not absent

- Date: 2026-11-27
- Raised in: M-012 slice 1, question Q-M-012-18
- Ruled by: delegate (R-423)
- Ruling: A, with a clarification — Only a missing key means absent; `casting: null` is `invalid-field: casting` and `divisionMethod: null` is `invalid-field: divisionMethod`; a key whose value is `undefined` counts as missing.
- Reason: ADR-0030 dropped version 1's `casting: null` convention; R-431 reads data-model values and null is one; strict now is the reversible choice.
- Folded into: not yet

### R-445: Impossible dates and times are refused, never normalised

- Date: 2026-11-27
- Raised in: M-012 slice 1, question Q-M-012-19
- Ruled by: delegate (R-423)
- Ruling: A — A date-time whose date fails `isDay`'s calendar rule, or whose hours, minutes or seconds fall outside 00–23, 00–59, 00–59 (no `24:00:00`, no `:60`), is `invalid-field: divinedAt`.
- Reason: R-432 fixes the forms; normalising like JS `Date` would turn a typo into another moment and break ADR-0030's round trip.
- Folded into: not yet

### R-446: Non-integer Picks are a shape fault; refused integers do not replay

- Date: 2026-11-27
- Raised in: M-012 slice 1, question Q-M-012-20
- Ruled by: delegate (R-423)
- Ruling: new (R-433 applied) — A Pick that is not an integer (2.5, NaN, a string) is `invalid-field: casting`; integer Picks `divide` refuses (0, -1, -0, and 1e3 as 1000) are `casting-does-not-replay`.
- Reason: R-433's map draws this line; after parsing, 1e3 is 1000; the Oracle refuses with `valid-pick`.
- Folded into: not yet

### R-447: Cast-ness is the `casting` key's presence; `divinedAt` is checked first

- Date: 2026-11-27
- Raised in: M-012 slice 1, question Q-M-012-21
- Ruled by: delegate (R-423)
- Ruling: A — `divinedAt` is reported before `casting`, by table order; a record is Cast when it has the `casting` key, whatever its value (even null); so a record with `divisionMethod` and no `casting` is Recorded, may have a Day, and fails on `divisionMethod`.
- Reason: R-433's deterministic order and ADR-0030's table order.
- Folded into: not yet

### R-448: `encodeRecord` states its limit

- Date: 2026-11-27
- Raised in: M-012 slice 1, question Q-M-012-22
- Ruled by: delegate (R-423)
- Ruling: A, with a correction — The type stays; `encodeRecord`'s doc comment states it writes faithfully, and round-trips, only a Moment with integer `epochMilliseconds` whose local date in its own offset lies in years 0000–9999; other text is unspecified. Manual §6.8's Record form also makes Moments, so the Matter building it refuses such values inline under its existing rule.
- Reason: R-430 keeps `encodeRecord` total; (C) would change R-037's type; (B) adds unasked generality and would not decode under R-432.
- Folded into: not yet

### R-449: Smaller codec points are already settled

- Date: 2026-11-27
- Raised in: M-012 slice 1, the tester's audit, smaller points
- Ruled by: delegate (R-423)
- Ruling: new — Lowercase `t`, a space separator and lowercase `z` are `invalid-field: divinedAt`; a lowercase ULID is `invalid-field: id`; a Date or other non-plain object is `not-version-2` as the root and `invalid-field` in a field; throwing getters and proxies are outside the contract and get no test.
- Reason: R-431, R-432 and the ratified `isConsultationId`.
- Folded into: not yet

### R-450: M-012 slice 1's test list, with amendments

- Date: 2026-11-27
- Raised in: M-012 slice 1, the tester's list (ce8fee3)
- Ruled by: delegate (R-423)
- Ruling: approve with amendments — The 45 rows (101 tests) are approved; add (a) a Recorded record carrying `divisionMethod` names `divisionMethod`; (b) `casting: null` names `casting`, `divisionMethod: null` names `divisionMethod`; (c) `divinedAt` `2026-02-30T08:00:00.123+08:00`, `…T24:00:00.000+08:00`, `…T08:60:00.000+08:00`, `…T08:00:60.000+08:00` each name `divinedAt`; (d) a Pick of 2.5 names `casting`, Picks of 0 and -1 give `casting-does-not-replay`; (e) a Cast record with a Day `divinedAt` and a malformed `casting` names `divinedAt`; (f) optional: a lowercase-`t` or space-separated `divinedAt`, a lowercase ULID. Q-22 gets no test.
- Reason: Consistent with R-427, R-430 to R-433, ADR-0030 and the ratified guards; the amendments assert R-443 to R-449.
- Folded into: not yet

### R-451: The junk row uses a blank string, not `'junk'`

- Date: 2026-11-27
- Raised in: M-012 slice 1, question Q-M-012-23 (the implementer found that
  `query: 'junk'` is a valid Query, so row 45 contradicted the library)
- Ruled by: delegate (R-423)
- Ruling: A — in row 45's junk list, replace `'junk'` with `' '`; the rest
  of the row stays.
- Reason: `isQuery` admits any text with a non-whitespace character
  (CONTEXT.md); `' '` fails every field, keeping the row's claim that each
  junk value gets its ruled reason (R-443, R-444, R-450).
- Folded into: not yet

### R-452: M-012 slice 1's Tier-B digest

- Date: 2026-11-27
- Raised in: M-012 slice 1 (665f044; review APPROVE)
- Ruled by: delegate (R-423)
- Question: Ratify ten items: (1) the record's Casting type derived by
  `Extract`; (2) plain property reads, not `Object.hasOwn`; (3) one helper
  for the shared `query` and `transformation` checks; (4) a plain object has
  prototype Object.prototype or null; (5) `setUTCFullYear`/`setUTCHours`, not
  `Date.UTC`; (6) a private `isTransformation` guard; (7) a private
  `offsetMinutes` reading the `±HH:MM` layout; (8) a sparse `casting` array
  gives `casting-does-not-replay`, outside the contract; (9) extra array
  properties are ignored; (10) `// R-439:` in `eslint.boundary.js`.
- Ruling: ratified whole.
- Reason: each item fits R-431 to R-433, R-444, R-449 and the file's
  convention; item 7 reads the record's wire format (R-432, ADR-0030), so no
  follow-up export from `divined-at` unless a second caller needs it.
- Folded into: not yet

### R-453: The version-2 frontmatter byte fixtures

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item A (the fixtures)
- Ruled by: delegate (R-423)
- Ruling: ratify — `cast-moment.frontmatter.md`, `recorded-moment.frontmatter.md` and `recorded-day.frontmatter.md` (9620033) are ratified, and the file's makeup: `---\n<yaml>---\n`, then `\n`, then the body exactly as rendered.
- Reason: ADR-0030 already fixes the meaning (fields, order, bottom-up, Picks only); R-431 and R-432 fix the quoted texts; the fixtures choose only among YAML forms of one meaning, every reader goes through the codec, and no version-2 file exists in the real Journal before M-015. Checked by hand against the legacy bytes. Flagged by the delegate as the ruling most worth the owner's eye.
- Folded into: not yet

### R-454: The file name's date is the date in the Moment's own offset

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item Q-M-012-24
- Ruled by: delegate (R-423)
- Ruling: A — The file-name date is the first 10 characters of the encoded `divinedAt`.
- Reason: R-378's "day of a moment"; manual §5; ADR-0030's browsable order.
- Folded into: not yet

### R-455: `keep` rejects when a foreign file holds its name

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item Q-M-012-25
- Ruled by: delegate (R-423)
- Ruling: A — When the target name is taken by a file not holding the Id (foreign or Unreadable), `keep` rejects, the file is untouched, nothing is written.
- Reason: ADR-0030's never-overwrite; the port's "does nothing" covers only a held Id; silent loss and suffixed names are ruled out.
- Folded into: not yet

### R-456: Two keeps of one Id at once both resolve

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item Q-M-012-26
- Ruled by: delegate (R-423)
- Ruling: A — Exactly one file; both Promises resolve; the loser does nothing.
- Reason: The port's "keeping an Id the Store already holds does nothing"; Merging stays idempotent (ADR-0037).
- Folded into: not yet

### R-457: `list`'s order is not part of the contract

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item Q-M-012-27
- Ruled by: delegate (R-423)
- Ruling: A — Tests compare `list` as sets.
- Reason: The port promises no order; R-337 and R-378 put ordering in use case 4.
- Folded into: not yet

### R-458: A failing renderer leaves no file

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item Q-M-012-28
- Ruled by: delegate (R-423)
- Ruling: A — When `renderBody` rejects, `keep` rejects and leaves no `.md` file.
- Reason: ADR-0030's atomic writes.
- Folded into: not yet

### R-459: The body is written verbatim

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item Q-M-012-29
- Ruled by: delegate (R-423)
- Ruling: A — The Store adds no final newline.
- Reason: The body is the renderer's view (ADR-0030, R-435); `rerenderBodies` keeps it cheap to change.
- Folded into: not yet

### R-460: Frontmatter is strict

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item Q-M-012-30
- Ruled by: delegate (R-423)
- Ruling: A — Frontmatter exists only when the file starts with `---\n` and a later line is exactly `---`; an unclosed opener, a BOM, CRLF delimiters or a leading blank line is `no-frontmatter`; an empty block is `not-version-2`.
- Reason: The strict reading; accepting more later is additive.
- Folded into: not yet

### R-461: The YAML emission rule

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item Q-M-012-31
- Ruled by: delegate (R-423)
- Ruling: A — js-yaml 3's `safeDump(record, { flowLevel: 2 })` with its other defaults; no multi-line Query fixture.
- Reason: It names the emitter exactly and matches the fixtures and the legacy writer (R-360, R-440); its 80-column folding of long Queries round-trips and is reversible.
- Folded into: not yet

### R-462: An Unreadable file never holds an Id

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item Q-M-012-32
- Ruled by: delegate (R-423)
- Ruling: A — Only loaded Consultations count, for `keep`'s "does nothing" and for `duplicate-id`; a valid file after an Unreadable one with the same `id` loads normally.
- Reason: The port reports Unreadable files only by `list`; R-428 assumes the earlier file loaded.
- Folded into: not yet

### R-463: One composition rule for every write

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item Q-M-012-33
- Ruled by: delegate (R-423)
- Ruling: new — `rerenderBodies` writes the original frontmatter bytes through the closing `---` line, one blank line, then the new body (adding the blank line if missing, never doubling it); on a missing folder it gives `{ rewritten: 0 }` and creates nothing; `.md` matches case-sensitively, only regular files, dotfiles ending `.md` are read; the `moveToLegacy` suffix is Tier B.
- Reason: One piece of knowledge for the file format (AGENTS.md §5); manual §6.7; R-438; R-437.
- Folded into: not yet

### R-464: `list` rejects when a file stands in the folder's place

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item C1
- Ruled by: delegate (R-423)
- Ruling: confirm — As the tests assert.
- Reason: R-438; manual §6.7's exit 1.
- Folded into: not yet

### R-465: The temporary-file constraints

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item C2
- Ruled by: delegate (R-423)
- Ruling: confirm — A temporary name never ends in `.md`; no regular temporary file remains after success; a temporary subfolder is allowed.
- Reason: Only `.md` files directly in the folder are read; the scheme is free within ADR-0030.
- Folded into: not yet

### R-466: Reading never creates the folder

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item C3
- Ruled by: delegate (R-423)
- Ruling: confirm — `list` and `get` never create a missing folder.
- Reason: R-438; ADR-0030's "reading never writes".
- Folded into: not yet

### R-467: Deleting is a later Matter's

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item C4
- Ruled by: delegate (R-423)
- Ruling: confirm — `remove` and `deletionRecords` are not tested here.
- Reason: M-012's scope (R-441); deleting is use case 6.
- Folded into: not yet

### R-468: M-012 slice 2's test list, with amendments

- Date: 2026-11-27
- Raised in: M-012 slice 2 (tester's 9620033), item D (the list)
- Ruled by: delegate (R-423)
- Ruling: approve with amendments — The 82 tests are approved; (a) add: a Recorded Moment `2026-11-26T07:30:00.000+08:00` is kept as `2026-11-26--<Id>.md`; (b) test 64 asserts `keep` rejects and the folder's regular files are exactly as before; (c) test 65 asserts both keeps resolve; (d) add: an Unreadable file with id X sorting first, then a valid file with id X: `list` returns the valid Consultation, no `duplicate-id`, the Unreadable file keeps its reason, `get(X)` returns the Consultation; (e) test 76 asserts exact bytes `${frontmatter}\n${body}`; (f) optional: `rerenderBodies` on a missing folder gives `{ rewritten: 0 }` and creates nothing.
- Reason: The rows fit ADR-0030, the port, R-428, R-431 to R-433, R-437, R-438; the amendments assert R-454 to R-463.
- Folded into: not yet

### R-469: A non-UTF-8 frontmatter is refused, not repaired

- Date: 2026-11-27
- Raised in: M-012 slice 2 review of beba19f (CHANGES), item C1 (reviewer's required change)
- Ruled by: delegate (R-423)
- Ruling: accept — Decode only the frontmatter bytes strictly (`TextDecoder('utf-8', { fatal: true })`), on every read including `keep`'s re-read; `rerenderBodies` writes the original frontmatter bytes back (Buffer slice or re-encoding the strict text, Tier B); a body with bad bytes still loads; add a test: bytes 0xFF 0xFE inside the Query make the file Unreadable `not-yaml` and `rerenderBodies` leaves its bytes unchanged.
- Reason: Lax decoding loads a corrupted Query as verbatim (ADR-0030) and changes frontmatter bytes on rerender (R-463, manual §6.7).
- Folded into: not yet

### R-470: Non-UTF-8 frontmatter is `not-yaml`

- Date: 2026-11-27
- Raised in: M-012 slice 2 review of beba19f (CHANGES), item Q-M-012-34
- Ruled by: delegate (R-423)
- Ruling: A — Frontmatter that does not decode as UTF-8 is `not-yaml`.
- Reason: A YAML stream is Unicode text; this applies R-366's closed list without widening it.
- Folded into: not yet

### R-471: New files are linked, rerendered bodies renamed; hard links are required

- Date: 2026-11-27
- Raised in: M-012 slice 2 review of beba19f (CHANGES), item Q-M-012-35
- Ruled by: delegate (R-423)
- Ruling: A — Keep "temporary file, then hard link" for a new file and "temporary file, then rename" for a re-rendered body; a Journal on a filesystem without hard links is unsupported and its writes reject. ADR-0030 is amended: the bullet's parenthetical becomes "(a temporary file, then a hard link for a new file, since a link refuses to replace one, or a rename for a re-rendered body)", and a consequence is added: "The Journal's folder must be on a filesystem with hard links; on one without (FAT, exFAT, some network shares) writes fail." The delegate ratifies the amendment in that wording unless the drafter finds the ADR's other text contradicts it.
- Reason: Only a link meets both atomic writes and never-overwrite; (B) and (C) each break one; ADR-0020 puts the Journal on a local disk; a fallback can be added later.
- Folded into: ADR-0045 (R-475), consolidated into ADR-0046 (R-489)

### R-472: A file deleted mid-read is skipped

- Date: 2026-11-27
- Raised in: M-012 slice 2 review of beba19f (CHANGES), item Q-M-012-36
- Ruled by: delegate (R-423)
- Ruling: A — A `.md` file missing (ENOENT) on the per-file read after `readdir` listed it is skipped; every other error still rejects; `keep`'s re-read meeting ENOENT after a lost race may reject (Tier B); add a test.
- Reason: A deleted file has left the Journal and is not an Unreadable file (CONTEXT.md); use case 6's `remove` during a browse must not fail `list`.
- Folded into: not yet

### R-473: An unreadable file rejects the Journal

- Date: 2026-11-27
- Raised in: M-012 slice 2 review of beba19f (CHANGES), item Q-M-012-37
- Ruled by: delegate (R-423)
- Ruling: A — A file the Store may not read (EACCES) rejects `list` and `keep` as "the Journal cannot be read" (exit 1).
- Reason: Manual §6.7 and R-350; a new reason would widen R-366's closed list; rare and reversible.
- Folded into: not yet

### R-474: M-012 slice 2's Tier-B digest, with three changes

- Date: 2026-11-27
- Raised in: M-012 slice 2 review of beba19f (CHANGES), item the digest (N1–N8 and the implementer's choices)
- Ruled by: delegate (R-423)
- Ruling: ratify with changes — N1: `rerenderBodies` gives the new file the old file's mode (chmod the temporary file before the rename), with a POSIX-only test skipped on Windows. N2: on EXDEV, `moveToLegacy` copies to a temporary file in `legacy/`, links it to `to` (next suffix on EEXIST), removes the temporary file, then unlinks the original; it never deletes `to`. N8 in part: temporary-file cleanup after a successful link uses `rm(..., { force: true, maxRetries: <small> })`; renaming over a file another process holds open stays an untested Windows gap. N3–N7 ratified (the deleting Matter notes that a rerender's rename can resurrect a file deleted after it read the folder; M-015's importer decides symlinked paths and watches the N²/2 read cost). The implementer's choices are ratified: `.<target>.<randomUUID>.tmp` (wx, fsync, removed in finally); exclusive create by link, no locks; rerender temp then rename, one file at a time; `<stem>-2<ext>`, `-3`, … suffixes; `Buffer.compare` order; one file read at a time; a frontmatter closed at EOF gets a newline written back (R-463); move = link then unlink.
- Reason: Least surprise for a private Journal (ADR-0015); one temporary-file scheme (AGENTS.md §5); `keep` should not reject a file it kept.
- Folded into: not yet (N8 amended by R-500: a failed cleanup is ignored)

### R-475: R-471's amendment is a separate ADR-0045

- Date: 2026-11-27
- Raised in: M-012 slice 2, question Q-M-012-38 (the drafter edited ADR-0030
  in place, ca539f2, and flagged R-004's convention)
- Ruled by: delegate (R-423)
- Ruling: A — revert ca539f2; ADR-0045 "New Journal files are hard-linked"
  amends ADR-0030 with R-471's exact wording; the README marks 0030 "Amended
  by 0045" and lists 0045 Accepted; consolidate 0030 and 0045 before M-015
  starts, or at an earlier consolidation pass. ADR-0045 is ratified in
  R-471's wording.
- Reason: R-004 and R-013 fix the convention (an amending ADR, then
  consolidation); the in-place sections date from before R-004; R-297 and
  R-384 kept ADR-0043 and ADR-0044 separate the same way. Only the form of
  the delegate's own R-471 changes.
- Folded into: ADR-0045, consolidated into ADR-0046 (R-489)

### R-476: A rerender skips a file deleted mid-run

- Date: 2026-11-27
- Raised in: M-012 slice 2 re-review (APPROVE), item Q-M-012-39
- Ruled by: delegate (R-423)
- Ruling: B — When `rerenderBodies` reaches a listed file that is now gone (ENOENT from the `stat` or the rename), it skips it and does not count it in `rewritten`; any other error rejects; N3's note stands (the narrow stat-to-rename window can still resurrect a file; the deleting Matter owns it). Add a timing-free test: the injected `renderBody` deletes a later file while rendering the first; the run resolves, `rewritten` counts only files rewritten, the deleted file stays gone.
- Reason: R-472's rule for deletions; manual §6.7's maintenance run finishes with exit 0 even with files skipped; one rule for `list` and rerender (AGENTS.md §5).
- Folded into: not yet

### R-477: Windows EPERM on a pending delete is a recorded gap; the test runs on Windows

- Date: 2026-11-27
- Raised in: M-012 slice 2 re-review (APPROVE), item Q-M-012-40
- Ruled by: delegate (R-423)
- Ruling: A — Record the Windows pending-delete EPERM case as a known, untested gap next to N8 in the comment by `readListedFile`; remove the race test's `skipIf(win32)` and rewrite its comment so it no longer states the EPERM behaviour as fact. A Windows CI failure comes back to the delegate as a new question; (B) is not built by default.
- Reason: ADR-0013 makes the Windows leg load-bearing; evidence before win32-only code (AGENTS.md §6, §7); (C) would break R-473.
- Folded into: not yet

### R-478: M-012 slice 2's re-review digest, with four changes

- Date: 2026-11-27
- Raised in: M-012 slice 2 re-review (APPROVE), item the re-review digest
- Ruled by: delegate (R-423)
- Ruling: ratify with changes — T1: drop `ignoreBOM: true` and its comment clause (R-460 keeps a BOM from the decoder). T2: `chmod(temporary, mode & 0o7777)`. T3: `replaceAtomically`'s error path uses `removeTemporary`. T4: add an EXDEV row in its own test file with `vi.mock('node:fs/promises')` so only the first `link` from the original raises EXDEV; assert identical bytes, an existing `legacy/<name>` untouched and the move at `<stem>-2<ext>`, the original gone, no `.tmp` left in `legacy/`. T5 ratified. The implementer's re-encoding of the strictly decoded frontmatter is ratified.
- Reason: Dead config misleads; say what is meant; one temporary-file scheme (AGENTS.md §5); R-474 N2's never-delete-`to` is user-data safety and needs a test without a production seam.
- Folded into: not yet

### R-479: Ties in the Journal's order go by descending Consultation Id

- Date: 2026-11-27
- Raised in: M-012 slice 3, question Q-M-012-42
- Ruled by: delegate (R-423)
- Ruling: A — ties go by Consultation Id in descending code-point order (the
  larger Id above), so the list is the exact reverse of one ascending sort on
  (key, Id); the same direction applies whatever Q-M-012-41's answer.
- Reason: R-378 gives no direction; descending keeps "newest first" (manual
  §4) the reverse of one sort; display-only and reversible; the Id still
  carries no meaning (CONTEXT.md).
- Folded into: not yet

### R-480: Slice 3's smaller browse holes

- Date: 2026-11-27
- Raised in: M-012 slice 3, the tester's audit (S1 to S3)
- Ruled by: delegate (R-423)
- Ruling: (S1) case-insensitive matching is tested with ASCII and É/é only;
  full case folding, Unicode normalisation and a whitespace-only filter (read
  literally) stay untested; (S2) tests compare `unreadable` as a set, its
  order not part of use case 4's contract; (S3) a filter crossing a line break
  in a multi-line Query is read literally as "contains".
- Reason: manual §6.7 says only "contains the text, ignoring case"; R-457;
  CONTEXT.md keeps a Query exactly as written.
- Folded into: not yet

Clerk's note: Q-M-012-41 (the order is not total across offsets) was referred
to the owner by the delegate; until the owner rules, slice 3's tests cover
only the cases its options (A) and (B) agree on, as the delegate suggested.

### R-481: The Windows listing race runs smaller, to give an answer

- Date: 2026-11-27
- Raised in: M-012, question Q-M-012-43 (PR #62's Windows leg timed out at
  30 s on the listing race row R-477 put back on Windows; no assertion or
  EPERM was seen)
- Ruled by: delegate (R-423)
- Ruling: A — on win32 only, the row runs 2 rounds of 50 files with a 120 s
  timeout and the same assertions (one platform-keyed constant, one-line
  reason); macOS and Ubuntu keep 10 × 200; re-run CI on PR #62 and record the
  outcome. An EPERM rejection reopens R-477's option (B); a second timeout
  points to a hang. Both come back as new questions.
- Reason: a timeout gives no evidence; skipping gives up what R-477 asked for;
  building win32 code first is unasked generality (AGENTS.md §6, §7); a
  parameter change is undone in one line.
- Folded into: not yet

### R-482: The Journal sorts by local date first

- Date: 2026-11-27
- Raised in: M-012 slice 3, question Q-M-012-41 (referred by the delegate:
  R-378's rules form a cycle when offsets differ, and every answer changes the
  owner's R-337 and R-378 and the manual's §4)
- Question: (A) sort by each row's local date, newest first; within one date,
  date-only rows above moments, moments by instant, newest first; remaining
  ties by Id (R-479); manual §4's "moments sort by instant" becomes "moments
  of one date sort by instant". (B) moments strictly by instant, a date-only
  row just above the newest moment of its date (or at the end of its UTC date
  when none shares it). (C) leave the cross-offset case unspecified.
- Ruling: "Q-M-012-41: A"
- Folded into: `docs/manual/cli.md` §4; refines R-337 and R-378

### R-483: M-012 slice 3's test list

- Date: 2026-11-27
- Raised in: M-012 slice 3 (tester's d8eca87)
- Ruled by: delegate (R-423)
- Ruling: approve, no amendments — the 46 tests stand.
- Reason: every ordering row matches R-482 and R-479 when worked out from its
  ISO text; the filter rows follow manual §6.7 and R-480; the rest trace to
  the use cases' and port's doc comments and R-441, R-457, R-462. The
  "once" call counts (browse's `list`, open's `get`) are accepted as cheap to
  relax.
- Folded into: not yet

### R-484: Browse lands reading the local date from the record text

- Date: 2026-11-27
- Raised in: M-012 slice 3 review, question Q-M-012-44
- Ruled by: delegate (R-423)
- Ruling: A — land as is: browse reads a Moment's local date as
  `encodeRecord(consultation).divinedAt.slice(0, 10)`. A follow-up drafts a
  public `localDate(divinedAt)` in `consultation-journal/divined-at`, used by
  both `encodeDivinedAt` and browse; its name and signature come back as a
  drafted Tier-A surface before code depends on them.
- Reason: correct for every Moment that can reach browse (decoding admits
  only years 0000–9999, R-448's limit); swapping later is Tier B and
  invisible to tests; (B) blocks a correct slice; (C) duplicates knowledge.
- Folded into: not yet

### R-485: `lint:check` runs ESLint without its cache

- Date: 2026-11-27
- Raised in: M-012 slice 3 review, question Q-M-012-45 (Tier C tooling)
- Ruled by: delegate (R-423)
- Ruling: A, the `package.json` variant — `lint:check` becomes
  `oxlint && eslint .`; `lint:fix` and the clerk's Step 6 line stay.
- Reason: typed rules (B12) depend on other files' types, which ESLint's
  per-file cache cannot see, so a cached gate can pass falsely; one flag,
  easy to undo; CI already runs uncached.
- Folded into: not yet

### R-486: M-012 slice 3's Tier-B digest

- Date: 2026-11-27
- Raised in: M-012 slice 3 review (4e3c821, 90eb245)
- Ruled by: delegate (R-423)
- Ruling: ratified whole — rewrap `composeCli`'s 108-character doc line;
  encoding the whole record for a date stays until R-484's follow-up;
  `openConsultation` not being `async` stays; `toLowerCase` on both sides,
  keys computed once with `toSorted(...).toReversed()`, a Day keyed
  `+Infinity`, and `<`/`>` text comparison are accepted.
- Reason: R-479, R-480, R-482; the port returns Promises.
- Folded into: not yet

### R-487: The follow-ups start while Q-ORD-2 waits

- Date: 2026-11-27
- Raised in: question Q-ORD-2 (what runs while M-011 waits); the delegate
  referred the reorder itself to the owner (it goes past R-385's swaps) and
  ruled this part
- Ruled by: delegate (R-423)
- Ruling: new — start now: (1) draft the consolidation of ADR-0030 and
  ADR-0045, which the delegate ratifies; (2) draft R-484's public
  `localDate(divinedAt)` in `consultation-journal/divined-at` as a
  stand-alone change, its surface ratified before code uses it; (3) the clerk
  drafts the ADR-0042 amendment recording the delegate, which only the owner
  ratifies.
- Reason: all three are due and none depends on the reorder.
- Folded into: not yet

### R-488: `localDate`'s surface

- Date: 2026-11-27
- Raised in: R-484's follow-up (drafted surface 6bb928a on `m/local-date`),
  questions Q-LD-1 to Q-LD-8
- Ruled by: delegate (R-423)
- Ruling: all A, and the drafted surface ratified as drafted —
  `export function localDate(divinedAt: DivinedAt): Day` in
  `consultation-journal/divined-at`: it returns the existing `Day` (a Day
  input as the same object); outside R-448's limit (integer ms, local years
  0000–9999) the result is unspecified and the function stays total;
  `encodeRecord`'s doc keeps its own limit sentence; one later Tier-B change
  builds the body, has `encodeDivinedAt` use it, and replaces browse's
  `encodeRecord(...).divinedAt.slice(0, 10)` with a `Day` comparison; the
  tester writes direct rows (dates moved across midnight both ways, a Day
  returned as the same object, years 0000 and 9999).
- Reason: R-037 keeps ISO text in the record only; one shape and one limit
  for one piece of knowledge (AGENTS.md §5); R-430 keeps the codec total;
  R-484 makes the swap Tier B.
- Folded into: not yet

### R-489: ADR-0046 consolidates ADR-0030 and ADR-0045

- Date: 2026-11-27
- Raised in: R-475 and R-487 (drafted consolidation 03c74a7), questions
  Q-CONS-1 and Q-CONS-2
- Ruled by: delegate (R-423)
- Ruling: (1) A — ADR-0046 is ratified as committed, with ADR-0030 and
  ADR-0045 marked "Superseded by ADR-0046" and the README rows; (2) A — one
  follow-up commit moves every live citation of ADR-0030 to ADR-0046 (overhaul
  source comments and tests, `store-markdown`'s package description,
  `docs/manual/cli.md`, `docs/design/activity.md` and `dfd.md`, pending
  Matters' entries); landed Matters' lines and history stay as written.
- Reason: diffed against both: ADR-0030's text is kept word for word, the
  atomic-writes bullet is R-471's, ADR-0045's parts are all there, nothing is
  added or lost; the form follows R-004, R-013 and the 0040+0041 → 0042
  precedent; a2a485c moved live citations the same way, and the manual's
  passages state only rules ADR-0046 keeps.
- Folded into: ADR-0046

### R-490: `localDate`'s direct rows

- Date: 2026-11-27
- Raised in: R-488's tests (b889138 on `m/local-date`)
- Ruled by: delegate (R-423)
- Ruling: approve as written — the 27 rows stand.
- Reason: every expected date checked against instant plus offset; all rows
  inside R-448's limit; none asserts the unspecified range; the rows R-488
  asks for are all there.
- Folded into: not yet

### R-491: `localDate`'s review items

- Date: 2026-11-27
- Raised in: the review of `localDate` (fbcaa2d to 6b491f6; APPROVE)
- Ruled by: delegate (R-423)
- Ruling: (Q-LD-9) A — accept that a Moment outside R-448's limit may now
  encode to a 1970-01-01 date that decodes quietly; it is unspecified under
  R-448 and R-488 and unreachable today. (Digest) ratified with one change:
  a one-line comment in `isUtcOffset` on why `-00:00` (−0) is refused; the
  fixed fallback Day, the codec's private offset reading, the unreachable
  `?? 0`, and landing fbcaa2d with its fix 6b491f6 are accepted.
- Reason: R-430, R-448 (an in-codec guard is unasked generality); B11 bans
  assertions; history is never rewritten. A non-integer instant is truncated
  by `Date`, so only a year outside 0000–9999 or NaN reaches the fallback.
- Folded into: not yet

### R-492: M-015 runs next while M-011 waits

- Date: 2026-11-27
- Raised in: question Q-ORD-2 (referred by the delegate: going past R-385's
  swaps narrows the owner's Ruling)
- Question: (A) run M-015 next, then M-011 → M-013 → M-014 → M-016 when the
  passages arrive; conditions: ADR-0030 and ADR-0045 consolidated first (done,
  ADR-0046), and no M-015 fixture or assertion pins body bytes, which stay the
  stub body until M-013. (B) only the follow-ups, then wait. (C) wait.
- Ruling: "Q-ORD-2: A"
- Folded into: `MATTERS.md` (M-015 in progress before M-011)

### R-493: ADR-0047 is ratified; the owner says when to land

- Date: 2026-11-27
- Raised in: R-487 (ADR-0047 drafted, challenged, revised), questions
  Q-0047-1 to Q-0047-3
- Question: (1) (A) `main` is fast-forwarded only when the owner says to
  land, so silence never ratifies a delegate ruling; (B) the owner may
  overturn but nothing waits. (2) (A) only the owner sets or changes a phase
  budget or owner-touch cap, and the delegate refers them; (B) the delegate
  may set them. (3) (A) ADR-0042 and ADR-0047 are consolidated before Phase 5
  starts; (B) at the next pass. Ratify ADR-0047.
- Ruling: "Q-ORD-2: A; Q-0047-1 to -3: A; ratify ADR-0047"
- Folded into: ADR-0047 (Accepted); `docs/agents/delegate.md` (budgets and
  caps referred) and `docs/agents/clerk.md` §0 and §3 (landing waits for the
  owner's word)

### R-494: M-015's drafted surface (Q-M-015-1 to -26, less Q-24)

- Date: 2026-11-27
- Raised in: M-015 (drafts ea8e1a1, 877a2ab, 83ba2d1, 5df0b96, 7afbad2)
- Ruled by: delegate (R-423)
- Ruling: (A) on Q-1, Q-2, Q-4 to Q-23, Q-25 and Q-26; Q-24 referred to the
  owner; Q-3 new. In short: a Deletion Record is `deleted/<Id>.json`, 2-space
  JSON with a final newline, contents over name (Q-1, flagged: a stored
  format), encoded in `record-codec` with keys `consultationId` and
  `deletedAt`, no version (Q-2); `remove` keeps an earlier record for the same
  Id and still deletes the `.md` files, but rejects and touches nothing when
  that name holds a file that does not decode or names another Id (Q-3, new);
  it deletes every `.md` decoding to the Id, `duplicate-id` included, and
  `list`/`get` ignore records (Q-4); an undecodable record rejects
  `deletionRecords` (Q-5); the rerender race stays a documented gap (Q-6);
  the bundle is `consultation-journal/journal-bundle` on text, `"format":
"hexagram-journal"`, `"version": 1`, 2-space JSON (Q-7 to Q-9); a bad or
  duplicate Consultation is left out and reported, a bad Deletion Record
  refuses the bundle (Q-10); `--export-journal` refuses an existing path
  (Q-11); `mergeJournal` resolves to `MergeCounts { added, removed }` (Q-12,
  flagged: a ratified signature widened); the parser returns application's
  `LegacyRecord` (Q-13); `legacy-import`'s row B7/B8, pure, `application`
  'types', `consultation-journal` and `oracle` 'any', with twins and a B1
  plant (Q-14); js-yaml 3.14 for it at first use, JSON/Core schema only
  (Q-15); a closed result `parsed | not-legacy | unreadable` with a
  `LegacyCasting` tag, a version-1 file without `casting` being `none` (Q-16,
  doc fix); a blank or placeholder Query skips the file as `invalid-field:
query` (Q-17, flagged: the owner's data); legacy Divined At forms as the old
  app accepted them (Q-18); regular `.txt`/`.md` files directly in a folder,
  no recursion, non-regular named paths skipped (Q-19); parse all, then per
  file keep, move and report (Q-20); a disagreeing stalk count is
  `does-not-replay` (Q-21); `legacy-import` replays through `divide` itself,
  a flagged duplicate (Q-22); `moveToLegacy` is a flat `CommandPorts` field
  (Q-23); the report wording as drafted (Q-25); `unreadableReasonText` is the
  one wording, shared with the browse footer (Q-26, doc fix). The drafter's
  edit to `frame.test.ts` is redone by a tester (R-306).
- Reason: R-106/R-123, R-349, R-350, R-357 to R-359, R-363, R-366 to R-368,
  R-428, R-431, R-432, R-440, R-441, R-445, R-455, R-463, R-473, R-474,
  R-476; ADR-0026, ADR-0037, ADR-0046; manual §5, §6.7, §6.8, §9; CONTEXT.md
  (Query, Deletion Record).
- Folded into: not yet. For the manual's next fold: §6.8 gains the export
  refusal and the report wording; ADR-0037's example and R-106's return are
  tidied at their next passes.

### R-495: M-015 slice 1's holes and test list

- Date: 2026-11-27
- Raised in: M-015 slice 1 (tester's c6fc71a, a3e5287), questions Q-M-015-27
  to -29
- Ruled by: delegate (R-423)
- Ruling: (Q-27) A — two removes of one Id at once both resolve, one record,
  files gone; ENOENT on unlink and EEXIST on the record link with a same-Id
  re-read count as success; add a `Promise.all` test. (Q-28) A — use case 6
  with an Id the Store doesn't hold calls `remove` once and resolves, no `get`
  first; add a test. (Q-29) A — an `.md` that cannot be deleted makes
  `remove` reject as a Store failure; the record is already written and a
  rerun finishes. Derived behaviours confirmed (a missing folder still gets
  the record; reading creates nothing; `deletionRecords` compared as a set).
  The 35 tests are approved with the two added (36, 37); a3e5287 matches
  R-494 Q-14, its extra B7 plant accepted.
- Reason: R-074, R-367, R-456, R-457, R-462, R-472; manual §6.7.
- Folded into: not yet

### R-496: M-015 slice 1's review items

- Date: 2026-11-27
- Raised in: the review of M-015 slice 1 (APPROVE; 1183131, cdbecb0,
  3ef8f3c), questions Q-M-015-30 and -31 and the digest
- Ruled by: delegate (R-423)
- Ruling: (Q-30) A — `keep` stays as it is; use cases 7 (import) and 10
  (merge) check each Id against `deletionRecords` before calling `keep`, to be
  raised when those slices are drafted; the remove-versus-keep race stays a
  documented gap. (Q-31) A — `deletionRecords` may return two records for one
  Id; the bundle codec or merge slice decides how to deduplicate and which
  `deletedAt` wins. (Digest) ratified with three changes: a record file is
  decoded with strict UTF-8 (a bad byte or a BOM makes it not a Deletion
  Record), documented on `loadDeletionRecord`, with a test; `remove` accepts an
  existing entry at its record name only if it is a regular file (`lstat`),
  anything else rejects and touches nothing, with a test; a tester adds direct
  unit tests for `encodeDeletionRecord`/`decodeDeletionRecord` (round trip,
  non-object, bad or missing `consultationId`, date-only `deletedAt` refused,
  extra keys ignored).
- Reason: R-074 and the port define `keep` by held Ids only, and CONTEXT.md's
  Merging Journals puts the subtraction in the merge; R-494 Q-1 makes a record
  at any name legitimate and R-368's sort needs a tie-break; R-460 and R-469
  refuse rather than repair; the Store's readers and writer must agree on what
  a record is.
- Folded into: not yet

### R-497: M-015 slice 2's holes, fixtures and test list

- Date: 2026-11-27
- Raised in: M-015 slice 2 (tester's 45ea399, 8f7f5b0), questions Q-M-015-32
  to -37, the tooling item and the byte fixtures
- Ruled by: delegate (R-423)
- Ruling: (Q-32) A — an unreadable `--merge-journal` file prints
  `hexagram-history: <file> cannot be read`, exit 1, nothing merged. (Q-33) A
  — after a double deletion each side keeps its own `deleted/<Id>.json`; the
  Journals agree on Consultations and deleted Ids; byte-identity is asserted
  only without double deletions (ADR-0037's "union of the Deletion Records" is
  read as a union by Id, to note at its next pass). (Q-34) A — the bundle
  holds at most one record per Id, the earliest `deletedAt` by instant (tie:
  the smaller encoded text); `decodeJournalBundle` keeps duplicates;
  `mergeJournal` removes a duplicated Id's records earliest first;
  `exportJournal` passes the Store's records through; the export count counts
  the bundle's records (flagged for the owner's eye). (Q-35) A — `added`
  counts distinct Ids. (Q-36) A — "removed by Deletion Records" is fixed; only
  counted nouns change number. (Q-37) A — relative paths resolve against the
  working folder; a BOM bundle is `not-json`; the first bad record's index is
  named; and the CLI reads the bundle as strict UTF-8, a bad byte making it
  "is not a Journal bundle". (Tooling) A — the bundle fixtures stay in
  `.oxfmtrc.json`'s ignorePatterns. (Fixtures) `journal-bundle.json` and
  `journal-bundle-empty.json` ratified (flagged: a stored format). (List) the
  83 tests approved with 14 added (97): two Q-32 rows, one Q-33, six Q-34,
  one Q-35, five Q-37.
- Reason: R-349, R-350, R-368, R-460, R-469, R-494, R-496; ADR-0037;
  CONTEXT.md (Deletion Record, Merging Journals); every fixture byte follows
  from rules already ratified.
- Folded into: not yet (doc fixes to `journal-bundle.ts`, `merge-journals.ts`
  and `exportedLine`; manual §6.8 gains the unreadable-file line at its next
  fold)

### R-498: M-010's frame rows follow the built options; an unwritable export

- Date: 2026-11-27
- Raised in: M-015 slice 2's build (3ff6cf4 to 4c54c51), questions
  Q-M-015-38 and -39 and the implementer's digest
- Ruled by: delegate (R-423)
- Ruling: (Q-38) A — a tester rewrites the ten `frame.test.ts` rows to keep
  what the frame owns (both options run in every terminal column) and assert
  the built outcome: export with the throwing ports ends `hexagram-history:
the Journal cannot be read`, exit 1, no file written; merge of a path
  guaranteed missing ends `hexagram-history: <path> cannot be read`, exit 1,
  no port touched; the two "to the line naming its option" rows likewise on a
  TTY; the file's header comment names the export rows as touching the Store;
  the rows come back for approval. (Q-39) A — an export that cannot write its
  bundle prints `hexagram-history: <file> cannot be written`, exit 1, with a
  test row; only EEXIST is "already exists"; a filesystem without hard links
  cannot be exported to, documented as a limit; the Journal is read before
  any write, so a read failure wins. (Digest) ratified whole; the export
  count and the private never-overwrite write are flagged duplicates, the
  latter to be raised only if a third copy appears.
- Reason: R-306 covers mechanical widening changes only; R-350; R-408 (no
  refusal or not-built path touches a port — these rows are neither); R-497
  Q-32.
- Folded into: not yet (manual §6.8 gains the line at its next fold)

### R-499: The rewritten frame rows

- Date: 2026-11-27
- Raised in: R-498's follow-up (tester's 45f02e9)
- Ruled by: delegate (R-423)
- Ruling: approve — the ten rewritten `frame.test.ts` rows and the
  unwritable-export row stand; only the not-built expectation was dropped.
- Reason: they meet R-498, R-497 Q-32, R-350 and R-408; the frame rulings
  R-397 to R-418 still hold.
- Folded into: not yet

### R-500: A failed temporary-file cleanup never changes a write's outcome

- Date: 2026-11-27
- Raised in: the review of M-015 slice 2 (APPROVE), question Q-M-015-40 and
  the reviewer's notes
- Ruled by: delegate (R-423)
- Ruling: new — removing a temporary file never changes a write's outcome:
  after a successful link the write succeeded; after a failure, `exists` or
  `unwritable` stands; a removal that still fails after its retries is
  swallowed, leaving the dotfile `.tmp`. In `cli-adapter`'s export
  `createExclusively`, with one comment and a test row (mocked `rm` rejecting
  after a successful link: bundle present byte for byte, exported line, exit
  0, empty stderr). The same rule in `store-markdown` (`removeTemporary`,
  `replaceAtomically`'s catch path, `moveExclusively`), as a separate
  single-intent commit with a test row (mocked `rm` rejecting after the link:
  `keep` resolves, the file is present); this amends R-474 N8 (cleanup after a
  successful link uses `rm(..., { force: true, maxRetries: <small> })` and its
  failure is ignored). The two copies stay separate (R-498). Tier B: the merge
  tie-break on equal instants stands; `mergeJournalRun` drops its redundant
  `toSorted` of `leftOut`, and `decodeJournalBundle`'s doc says `leftOut` is in
  bundle order; the bisect gap from 4c54c51 to 45f02e9 is recorded in the
  Minutes; 76748fb's subject stays.
- Reason: (b) would misreport a written bundle (R-498 Q-39); (c) breaks
  R-350's one line; a dotfile `.tmp` is harmless and the Store never reads it.
- Folded into: not yet

### R-501: Manual §6.7 on rerunning a cut-short import

- Date: 2026-11-27
- Raised in: R-494's contradiction 2, referred to the owner by the delegate
  (each original moves into `legacy/` right after it is kept, Q-M-015-20, so
  "rerunning it keeps those files twice" was no longer true)
- Question: Change §6.7's parenthetical to "rerunning it keeps again any file
  kept but not yet moved".
- Ruling: "fix §6.7"
- Folded into: `docs/manual/cli.md` §6.7
