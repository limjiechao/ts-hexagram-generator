# How the overhaul is built: the owner as architect, decision tiers, agents implement

Status: Accepted
Date: 2026-11-16

The overhaul is built with Harlan Mills' surgical team (Brooks, _The Mythical
Man-Month_, ch. 3), adapted to one human and many memoryless AI agents. **One
mind decides; the library remembers; agents execute and check adversarially.
Nothing an agent writes becomes authoritative until the owner ratifies it, and
nothing is ratified after the code it licenses.** The reasoning, evidence and
the role mapping are in
[the surgical-team assessment](../reviews/2026-11-16-surgical-team-assessment.md).

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
  - coding conventions that apply across modules.
- **Tier B: implementer, checked by the reviewer.** Anything inside one module
  that leaves Tier A untouched: internal structure, private helpers,
  algorithms, local names that use glossary terms.
- **Tier C: toolsmith and clerk, on the owner's request.** Scripts and lint
  rules that enforce Tier A; upkeep of the clerk's records.
- **Escalation.** An implementer that meets a Tier-A question stops and
  reports it. The clerk batches the questions. The owner answers. Each answer
  is recorded as a Ruling before the work resumes.

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

| Role        | Filled by                                         | Rule                                                                                                                                                 |
| ----------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architect   | the owner                                         | Decides everything in Tier A.                                                                                                                        |
| Copilot     | one interactive agent session per design question | Offers options and drafts ADR or glossary text. Remembers nothing; its drafts become authoritative only on ratification.                             |
| Clerk       | the orchestrator prompt and scripts               | Keeps the records; batches questions; folds Rulings in ratified batches.                                                                             |
| Tester      | a fresh agent, never the implementer              | Before each Matter, writes acceptance and property tests from the ADRs and glossary only. Implementers may not edit them; changing one is Tier A.    |
| Implementer | a fresh agent per Matter                          | Works inside one module behind its port, sees only the interfaces it uses, and stops at any Tier-A question.                                         |
| Reviewer    | a fresh agent                                     | Receives the diff and the Matter's ADRs, never the implementer's reasoning. Checks conformance only; design findings become questions for the owner. |
| Toolsmith   | an agent, on the owner's request                  | Builds the drift checks. No tool may change a production API without a Tier-A decision.                                                              |

## The library has three tiers

1. **Authoritative**: `CONTEXT.md`, accepted ADRs, `RULINGS.md`, and the
   ratified type and port files. Only the owner changes them, and never after
   the code they license.
2. **Derivative**: `docs/design/*` and any generated package map.
   Regenerated or audited, never hand-narrated. Where they disagree with an
   ADR, the ADR wins.
3. **Ephemeral**: plans, handoffs, reviews, logs. Dated and allowed to go
   stale, archived when their Matter lands, and **never cited from source
   code**. Source comments cite only ADRs and glossary terms.

Amended ADRs are folded into one consolidated text before code depends on
them, so a fresh agent reads one current statement per topic (ADR-0037,
ADR-0038).

## The incision code

The core value types, the four driven-port signatures, the ten use-case
signatures and the walking skeleton set the grain of everything else. An agent
drafts them from the ADRs and glossary. The owner line-edits and ratifies them
before any Matter builds on them. Once ratified they are authoritative.

## Build order and budgets

The overhaul is the owner's second system, the one Brooks warns is most often
over-designed (p. 55). It grows the Mills way: a walking skeleton, then one
vertical slice at a time, always running. Matters run **serially**:

1. the walking skeleton;
2. the Oracle core;
3. the CLI at parity with today's app, on the new core;
4. the REST engine;
5. the PWA.

The owner sets each channel's budget (Matters, weeks) before it starts.
Overrunning a budget is a Tier-A event.

## Drift signals

| #   | Signal                                                                                                        | When                               |
| --- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | Doc truth: paths and symbols named in `AGENTS.md`, ADRs and design models that do not exist                   | every landing (script)             |
| 2   | Glossary conformance: _Avoid_ terms in identifiers or UI strings                                              | every landing (script)             |
| 3   | Boundaries: imports across bounded contexts or around ports                                                   | every landing (build-failing lint) |
| 4   | Ephemeral leakage: plan, seam or review IDs in source comments or test names                                  | every landing (script)             |
| 5   | Ratification lag: a Tier-A file changed without a Ruling or ADR dated before it                               | per Matter (clerk)                 |
| 6   | Cold-read variance: 3–5 fresh agents reconstruct a finished milestone's theory and are compared with its ADRs | each channel milestone             |

Signals 1–4 are built by the toolsmith as the first Matter after the
walking skeleton.

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

## Limits

The owner's bandwidth and taste are the ceiling. The owner learns from
implementation only second-hand. A library can say which notes are binding,
not whether they are true.
