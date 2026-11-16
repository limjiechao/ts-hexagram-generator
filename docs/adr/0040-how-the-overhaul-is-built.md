# How the overhaul is built: the owner as architect, decision tiers, agents implement

Status: Accepted
Date: 2026-11-16
Supersedes: [ADR-0036](0036-how-the-overhaul-is-built.md), [ADR-0039](0039-brooks-refinements-to-how-the-overhaul-is-built.md)

This consolidates ADR-0036 and its amendment ADR-0039 into one current text
(R-004). Every decision and every rejected option in them is kept.

The overhaul is built with Harlan Mills' surgical team (Brooks, _The Mythical
Man-Month_, ch. 3), adapted to one human and many memoryless AI agents. **One
mind decides; the library remembers; agents execute and check adversarially.
Nothing an agent writes becomes authoritative until the owner ratifies it, and
nothing is ratified after the code it licenses.** The reasoning, evidence and
the role mapping are in
[the surgical-team assessment](../reviews/2026-11-16-surgical-team-assessment.md).
Page numbers are the printed pages of the 1995 Anniversary Edition (MM-M).

## Why

The DDD survey found that the old codebase's outer layers lost conceptual
integrity because the architecture emerged from agent review loops. ADRs were
written after the code, one seam moved under four ADRs, and plans grew to
outweigh the source. This is Brooks' OS/360 lesson: handing the specification
to idle implementers produced a spec "three months late, and of much lower
quality" (pp. 47–48). Spawnable agents are always-idle hands. Mills keeps one
mind in charge while many hands help; here the many hands do the cutting, so
the one mind must live in the owner's decisions and in a library every agent
reads first.

## Decision tiers

- **Tier A: owner only.** Ratified in the library before any code that depends
  on it:
  - glossary terms and their _Avoid_ lists;
  - ADRs;
  - public types, and port and use-case signatures;
  - bounded-context and package boundaries, and dependency rules;
  - new runtime dependencies;
  - error and exit policy;
  - feature scope;
  - acceptance tests and byte fixtures;
  - user manuals (see "User manuals");
  - coding conventions that apply across modules.
- **Tier B: implementer, checked by the reviewer.** Anything inside one module
  that leaves Tier A untouched: internal structure, private helpers,
  algorithms, local names that use glossary terms. Brooks: "it is important to
  explicitly define the parts of an architecture that are not prescribed as
  carefully as those that are" (prop. 6.2, p. 234). So every Matter carries a
  **Free to choose** field naming the decisions explicitly left to the
  implementer. The copilot drafts it when the Matter is defined; the owner
  ratifies it with the Matter.
- **Tier C: toolsmith and clerk, on the owner's request.** Scripts and lint
  rules that enforce Tier A; upkeep of the clerk's records.
- **Escalation.** An implementer that meets a Tier-A question stops and
  reports it. The clerk batches the questions. The owner answers. Each answer
  is recorded as a Ruling before the work resumes.
- **Suggestions.** The builder holds creative responsibility for the
  implementation, and the architect should "listen to the builder's
  suggestions for architecture improvements" (props. 5.2–5.3, pp. 233–234). An
  implementer's report may end with at most three lines of suggestions to the
  architect. They never block. The clerk batches them with the questions, and
  a suggestion changes nothing until the owner rules on it.

## Which definition is the standard

Brooks: a design needs a formal definition and a prose one, and "one of the
formal and prose definitions must be standard, and the other derivative"
(prop. 6.4, p. 234). The standard is split by aspect (R-001):

- the **ratified types and ports** are the standard for shape and signatures;
- **ADRs, `CONTEXT.md` and ratified user manuals** are the standard for
  meaning, invariants and behaviour;
- **byte fixtures** are the standard for exact output.

A disagreement between them is a drift finding. It is fixed by a Ruling, never
by silently editing either file.

## The clerk's records

The records use a judicial register: the owner issues **Rulings** on
questions raised in **Matters**.

| Record                 | What it is                                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MATTERS.md`           | The live tracker. Each vertical slice of work is a **Matter** (`M-NNN`): pending → in progress → awaiting ruling → landed.                                                                                                                        |
| `RULINGS.md`           | The owner's binding answers to Tier-A questions (`R-NNN`). This is Brooks' architect's telephone log, published to every implementer (ch. 6). A Ruling binds until the clerk folds it into an ADR or the glossary, in a batch the owner ratifies. |
| `MINUTES.md`           | An append-only record, one entry per iteration: the Matter, outcome, commits and test results.                                                                                                                                                    |
| `docs/agents/clerk.md` | The **clerk**: the orchestrator prompt that runs Matters and keeps these records.                                                                                                                                                                 |

None of these records ever contains consultation content (ADR-0015).

## Roles

These are hats worn by agent sessions, not ten separate agents.

| Role        | Filled by                                         | Rule                                                                                                                                                                                                |
| ----------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architect   | the owner                                         | Decides everything in Tier A. Starts spikes.                                                                                                                                                        |
| Copilot     | one interactive agent session per design question | Offers options and drafts ADR, glossary, manual or Free-to-choose text. Remembers nothing; its drafts become authoritative only on ratification.                                                    |
| Clerk       | the orchestrator prompt and scripts               | Keeps the records; batches questions and suggestions; folds Rulings in ratified batches; keeps the estimates.                                                                                       |
| Tester      | a fresh agent, never the implementer              | Before each Matter, audits the spec for holes, then writes acceptance and property tests from the ADRs, glossary, Rulings and manuals only. Implementers may not edit them; changing one is Tier A. |
| Implementer | a fresh agent per Matter                          | Works inside one module behind its port, sees only the interfaces it uses, decides what Free to choose lists, and stops at any other Tier-A question.                                               |
| Reviewer    | a fresh agent                                     | Receives the diff and the Matter's ADRs, never the implementer's reasoning. Checks conformance only; design findings become questions for the owner.                                                |
| Toolsmith   | an agent, on the owner's request                  | Builds the drift checks. No tool may change a production API without a Tier-A decision.                                                                                                             |

## The tester audits the spec

Vyssotsky, quoted by Brooks: "Many, many failures concern exactly those
aspects that were never quite specified." The specification must go to an
outside testing group "long before any code itself … The developers
themselves cannot do this" (props. 13.2–13.3, p. 245).

Before writing tests, the tester lists every **spec hole**: a case whose
expected result the ADRs, the glossary, the Rulings and any ratified manual do
not determine. It looks across Brooks's three input domains: mainline cases,
barely legitimate cases and barely illegitimate cases (p. 166). Every hole
becomes a question (`Q-<M-id>-<n>`). The Matter moves to `awaiting-ruling`,
and implementation does not start until each hole has a Ruling (R-005).

## The library has three tiers

1. **Authoritative**: `CONTEXT.md`, accepted ADRs, `RULINGS.md`, ratified user
   manuals, and the ratified type and port files. Only the owner changes them,
   and never after the code they license.
2. **Derivative**: `docs/design/*` and any generated package map.
   Regenerated or audited, never hand-narrated. Where they disagree with an
   ADR, the ADR wins.
3. **Ephemeral**: plans, handoffs, reviews, logs. Dated and allowed to go
   stale, archived when their Matter lands, and **never cited from source
   code**. Source comments cite only ADRs and glossary terms. Superseded
   ephemeral material lives in `docs/archive/`, which no agent reads unless a
   Matter names a file in it (R-007).

A **Proposed** ADR may be read by any agent, but it never licenses code. Only
an Accepted ADR, a `CONTEXT.md` term, a Ruling, a ratified manual or a ratified
type or port file does. This makes room for decisions the owner knows are
tentative; Cosgrove observes that designers avoid writing those down at all
(prop. 11.14, p. 241).

Amended ADRs are folded into one consolidated text before code depends on
them, so a fresh agent reads one current statement per topic (ADR-0037,
ADR-0038, and this ADR).

**The key documents.** Amid a wash of paper, "a small number of documents
become the critical pivots around which every project's management revolves"
(prop. 10.1, p. 239). They are read first:

| Brooks's document  | Here                               |
| ------------------ | ---------------------------------- |
| Objectives         | ADR-0014 (product identity)        |
| User manual        | `docs/manual/`                     |
| Internals          | `CONTEXT.md` and the accepted ADRs |
| Schedule, budget   | `MATTERS.md`                       |
| Organization chart | this ADR (roles and tiers)         |

## User manuals

Brooks: the architecture is "the complete and detailed specification of the
user interface", and its carrier is the manual (ch. 4, p. 45). "The critical
user documentation should be drafted before the program is built, for it
embodies basic planning decisions" (prop. 15.6, p. 248).

Each manual covers Brooks's nine items (p. 165): purpose; environment; domain
and range; functions and algorithms; input-output formats; operating
instructions, including normal and abnormal endings; options; running time;
and accuracy and checking. A manual is the standard for behaviour; byte
fixtures remain the standard for exact output (R-008).

## The incision code

The core value types, the four driven-port signatures, the ten use-case
signatures and the walking skeleton set the grain of everything else. An agent
drafts them from the ADRs and glossary. The owner line-edits and ratifies them
before any Matter builds on them. Once ratified they are authoritative.

## Spikes

Brooks: "plan to throw one away; you will, anyhow" (prop. 11.6, p. 241), and
"the hardest single part of building a software system is deciding precisely
what to build" (p. 199). Ratify-before-code means the owner otherwise learns
from implementation only second-hand. Spikes are the sanctioned way to learn
by building before deciding (R-002):

- A **spike** answers one named Tier-A question. Only the owner starts one.
  The clerk may suggest a spike as one option in a question batch.
- It runs on a `spike/<Q-id>` branch and is timeboxed to one agent session.
- It ends in findings of at most one page, at
  `docs/reviews/<date>-spike-<Q-id>.md` (ephemeral). The findings feed the ADR
  or Ruling draft.
- Spike code is **never cherry-picked** into the integration branch. The
  branch is left for the owner to delete.

## Build order and budgets

The overhaul is the owner's second system, the one Brooks warns is most often
over-designed (p. 55). It grows the Mills way: a walking skeleton, then one
vertical slice at a time, always running. Matters run **serially**:

1. the walking skeleton;
2. the Oracle core;
3. the CLI at parity with today's app, on the new core;
4. the REST engine;
5. the PWA.

**Phase-entry gates.** The CLI phase does not start until `docs/manual/cli.md`
is ratified; "parity" means "matches the manual", and where today's app
differs from the manual, the manual wins after a Ruling. The REST phase does
not start until `docs/manual/rest.md` is ratified (R-008).

**Knife-edge acceptance.** "Milestones must be concrete, specific, measurable
events defined with knife-edge sharpness"; a programmer "will rarely lie about
milestone progress, if the milestone is so sharp he can't deceive himself"
(props. 14.4–14.5, p. 247). A Matter's **Acceptance** is a command that exits
0 or 1. Prose such as "the skeleton runs" is not acceptance.

**Budgets and estimates.** The owner sets each channel's budget (Matters,
weeks) before it starts. Overrunning a budget is a Tier-A event. Vyssotsky
carries both "scheduled" and "estimated" dates, and "the project manager has
to keep his fingers off the estimated dates" (prop. 14.17, p. 248). So each
phase also carries an **Estimate**, owned by the clerk and revised from actual
figures after every landing. The clerk never edits a budget. When the estimate
first exceeds the budget, the clerk warns the owner then, rather than waiting
for the overrun (prop. 14.13).

**Owner touches.** "The man-month is a fallacious and dangerous myth, for it
implies that men and months are interchangeable" (prop. 2.6, p. 231). Agents
drive the cost of code, the accidental part of the work, towards zero. The
essential part, deciding, stays with the owner, whose attention is the
ceiling. An **owner touch** is a Ruling, a ratification, or an approval of a
tester's test list. The clerk records the touches of every Matter, and phases
are budgeted in owner touches as well as in Matters and weeks. The first phase
is measured but uncapped; when it lands, the owner sets the caps from its
actual figures (R-006).

## Drift signals

| #   | Signal                                                                                                        | When                               |
| --- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | Doc truth: paths and symbols named in `AGENTS.md`, ADRs and design models that do not exist                   | every landing (script)             |
| 2   | Glossary conformance: _Avoid_ terms in identifiers or UI strings                                              | every landing (script)             |
| 3   | Boundaries: imports across bounded contexts or around ports                                                   | every landing (build-failing lint) |
| 4   | Ephemeral leakage: plan, seam or review IDs in source comments or test names                                  | every landing (script)             |
| 5   | Ratification lag: a Tier-A file changed without a Ruling or ADR dated before it                               | per Matter (clerk)                 |
| 6   | Cold-read variance: 3–5 fresh agents reconstruct a finished milestone's theory and are compared with its ADRs | each channel milestone             |
| 7   | Brief size: lines of required reading in a Matter's brief, against the owner's cap                            | per Matter (clerk)                 |

Signals 1–4 are built by the toolsmith as the first Matter after the
walking skeleton. Signal 7 follows from Brooks: size budgets must be explicit
and tied to function (props. 9.3–9.5, p. 238), "voluminosity in system
documentation does indeed introduce a new kind of incomprehensibility"
(prop. 12.11, p. 244), and a fresh agent pays a training cost equal to what it
must read (prop. 2.7), again in every session. Its cap is set with the
owner-touch caps (R-006).

## Considered options

- **Keep the agent review loops** that built the old outer layers. Rejected:
  they produced the integrity failures this ADR exists to prevent.
- **The owner writes all incision code by hand.** Rejected by the owner in
  favour of agent drafts that the owner line-edits and ratifies.
- **Parallel channels after the core.** Rejected: parallel agents raise
  integrity risk, and serial Matters cap throughput at the owner's capacity to
  ratify.
- **Ten roles as ten agents with a cadence and a document each.** Rejected as
  ceremony. Most roles are lines in one orchestrator prompt.
- **Let the clerk start spikes**, so the owner gets evidence with each
  question. Rejected (R-002): it moves agent activity into design.
- **Let the tester settle spec holes with flagged assumptions.** Rejected
  (R-005): the tester would be drafting Tier-A answers.
- **Set the owner-touch and brief-size caps now, by guess.** Rejected (R-006):
  the first phase's actual figures make better caps (prop. 14.6).
- **A manual that describes today's app as it is.** Rejected (R-008): it would
  freeze the legacy app's quirks into the standard.
- **Edit ADR-0036 in place** instead of amending it. Rejected (R-004): the
  repo amends an accepted ADR with a new one, then consolidates.

## Limits

- The owner's bandwidth and taste are the ceiling. Spec holes and manual
  ratification add work to the owner's queue on purpose; counting owner
  touches makes that cost visible, but does not reduce it.
- The owner learns from implementation only second-hand. A spike narrows the
  gap only if the owner reads its findings, and closes it only if the owner
  cuts the spike personally; R-002 allows that but does not require it.
- A library can say which notes are binding, not whether they are true.
