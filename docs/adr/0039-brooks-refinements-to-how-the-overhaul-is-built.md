# Brooks refinements to how the overhaul is built

Status: Superseded by ADR-0040
Date: 2026-11-16
Amends: [ADR-0036](0036-how-the-overhaul-is-built.md)

ADR-0036 took chapters 3–6 of _The Mythical Man-Month_ (MM-M): the surgical
team, conceptual integrity, second-system budgets and the logged telephone
answers. This ADR adds what the rest of the book still offers a process in
which one owner decides and memoryless agents build. Each section names the
Brooks proposition it applies (page numbers are the printed pages of the 1995
Anniversary Edition) and the Ruling that settled it (`RULINGS.md`, R-001 to
R-008). Before M-001 builds on ADR-0036, the two are folded into one
consolidated text (R-004).

## 1. Which definition is the standard

Brooks: a design needs a formal definition and a prose one, and "one of the
formal and prose definitions must be standard, and the other derivative"
(prop. 6.4, p. 234). ADR-0036 makes both the ratified type and port files and
the prose (`CONTEXT.md`, accepted ADRs) authoritative, without saying which
wins when they disagree.

**Decision (R-001).** The standard is split by aspect:

- the **ratified types and ports** are the standard for shape and signatures;
- **ADRs and `CONTEXT.md`** are the standard for meaning, invariants and
  behaviour.

A disagreement between them is a drift finding. It is fixed by a Ruling, never
by silently editing either file.

## 2. Spikes, and what a Proposed ADR may do

Brooks: "plan to throw one away; you will, anyhow" (prop. 11.6, p. 241), and
"the hardest single part of building a software system is deciding precisely
what to build" (p. 199). ADR-0036 forbids code before ratification, and its
Limits admit that the owner learns from implementation only second-hand.
Spikes are the sanctioned way to learn by building before deciding.

**Decision (R-002).**

- A **spike** answers one named Tier-A question. Only the owner starts one.
  The clerk may suggest a spike as one option in a question batch.
- It runs on a `spike/<Q-id>` branch and is timeboxed to one agent session.
- It ends in findings of at most one page, at
  `docs/reviews/<date>-spike-<Q-id>.md` (ephemeral). The findings feed the ADR
  or Ruling draft.
- Spike code is **never cherry-picked** into the integration branch. The
  branch is left for the owner to delete.

A **Proposed** ADR may be read by any agent, but it never licenses code. Only
an Accepted ADR, a `CONTEXT.md` term, a Ruling or a ratified type or port file
does. This makes room for decisions the owner knows are tentative; Cosgrove
observes that designers avoid writing those down at all (prop. 11.14, p. 241).

## 3. What is not prescribed

Brooks: "it is important to explicitly define the parts of an architecture
that are not prescribed as carefully as those that are" (prop. 6.2, p. 234).
The builder holds creative responsibility for the implementation, and the
architect should "listen to the builder's suggestions for architecture
improvements" (props. 5.2–5.3, pp. 233–234). ADR-0036 defines Tier B only as
whatever is left over, and gives the implementer one outlet: stop and ask.
That invites either a flood of questions or quiet workarounds.

**Decision.**

- Every Matter carries a **Free to choose** field: the decisions explicitly
  left to the implementer. The copilot drafts it when the Matter is defined;
  the owner ratifies it with the Matter.
- An implementer's report may end with **suggestions to the architect**: at
  most three lines, never blocking. The clerk batches them with the questions.
  A suggestion changes nothing until the owner rules on it.

## 4. The tester audits the spec

Vyssotsky, quoted by Brooks: "Many, many failures concern exactly those
aspects that were never quite specified." The specification must go to an
outside testing group "long before any code itself … The developers
themselves cannot do this" (props. 13.2–13.3, p. 245).

**Decision (R-005).** Before writing tests, the tester lists every **spec
hole**: a case whose expected result the ADRs, the glossary, the Rulings and
any ratified manual do not determine. It looks across Brooks's three input
domains: mainline cases, barely legitimate cases and barely illegitimate
cases (p. 166). Every hole becomes a question (`Q-<M-id>-<n>`). The Matter
moves to `awaiting-ruling`, and implementation does not start until each hole
has a Ruling.

## 5. Knife-edge acceptance, and two sets of dates

Brooks: "milestones must be concrete, specific, measurable events defined with
knife-edge sharpness"; a programmer "will rarely lie about milestone progress,
if the milestone is so sharp he can't deceive himself" (props. 14.4–14.5,
p. 247). Vyssotsky carries both "scheduled" and "estimated" dates, and "the
project manager has to keep his fingers off the estimated dates" (prop. 14.17,
p. 248).

**Decision.**

- A Matter's **Acceptance** is a command that exits 0 or 1. Prose such as
  "the skeleton runs" is not acceptance.
- Each phase carries an **Estimate** beside its **Budget**. The owner owns the
  budget. The clerk owns the estimate, revises it from actual figures after
  every landing, and never edits the budget.
- When the estimate first exceeds the budget, the clerk warns the owner then,
  rather than waiting for the overrun (early warning, prop. 14.13). Overrunning
  a budget is still a Tier-A event (ADR-0036).

## 6. Budget the owner's attention

Brooks: "the man-month is a fallacious and dangerous myth, for it implies that
men and months are interchangeable" (prop. 2.6, p. 231). Agents drive the cost
of code, the accidental part of the work, towards zero. The essential part,
deciding, stays with the owner, whose attention is the ceiling (ADR-0036,
Limits). Matters and weeks alone measure the wrong resource.

**Decision (R-006).** An **owner touch** is a Ruling, a ratification, or an
approval of a tester's test list. The clerk records the touches of every
Matter. Phases are budgeted in owner touches as well as in Matters and weeks.
Phase 1 is measured but uncapped; when it lands, the owner sets the caps from
the actual figures.

## 7. The reading budget and the key documents

Brooks: size budgets must be explicit and tied to function (props. 9.3–9.5,
p. 238); "voluminosity in system documentation does indeed introduce a new
kind of incomprehensibility" (prop. 12.11, p. 244); and amid a wash of paper,
"a small number of documents become the critical pivots around which every
project's management revolves" (prop. 10.1, p. 239). A fresh agent pays a
training cost equal to what it must read (prop. 2.7), and it pays it again in
every session.

**Decision (R-006, R-007).**

- **Drift signal 7: brief size.** The clerk records the lines of required
  reading in every Matter's brief. Phase 1 is measured but uncapped; the owner
  sets the cap when it lands. The signal joins the table in ADR-0036 and is
  checked per Matter by the clerk.
- **The key documents** are:

  | Brooks's document  | Here                               |
  | ------------------ | ---------------------------------- |
  | Objectives         | ADR-0014 (product identity)        |
  | User manual        | `docs/manual/` (section 8)         |
  | Internals          | `CONTEXT.md` and the accepted ADRs |
  | Schedule, budget   | `MATTERS.md`                       |
  | Organization chart | ADR-0036 (roles and tiers)         |

- **The archive.** Superseded ephemeral material lives in `docs/archive/`.
  No agent reads it unless a Matter names it.

## 8. User manuals are Tier A

Brooks: the architecture is "the complete and detailed specification of the
user interface", and its carrier is the manual (ch. 4, p. 45). "The critical
user documentation should be drafted before the program is built, for it
embodies basic planning decisions" (prop. 15.6, p. 248). Today nothing
user-facing is in the authoritative tier. CLI behaviour is defined only by
byte fixtures and by an agent-instructions file.

**Decision (R-008).**

- **User manuals** join Tier A. Each one covers Brooks's nine items (p. 165):
  purpose; environment; domain and range; functions and algorithms;
  input-output formats; operating instructions, including normal and abnormal
  endings; options; running time; and accuracy and checking.
- By R-001, a manual is the standard for **behaviour**. Byte fixtures remain
  the standard for **exact output**.
- **Phase-entry gates.** Phase 4 (the CLI at parity) does not start until
  `docs/manual/cli.md` is ratified. "Parity" means "matches the manual". Where
  today's app differs from the manual, the manual wins after a Ruling. Phase 5
  (the REST engine) does not start until `docs/manual/rest.md` is ratified.

## Considered options

- **Leave ADR-0036 as it is.** Rejected. Each gap above is a place where an
  agent would otherwise decide, or the owner would learn too late.
- **Edit ADR-0036 in place.** Rejected by R-004. The repo amends an accepted
  ADR with a new one, then consolidates.
- **Let the clerk start spikes**, so the owner gets evidence with each
  question. Rejected by R-002. It moves agent activity into design.
- **Let the tester settle spec holes with flagged assumptions.** Rejected by
  R-005. The tester would be drafting Tier-A answers.
- **Set the new caps now, by guess.** Rejected by R-006. Phase 1's actual
  figures make better caps (prop. 14.6).
- **A manual that describes today's app as it is.** Rejected by R-008. It
  would freeze the legacy app's quirks into the standard.

## Limits

- These refinements cost owner touches: spec holes and manual ratification
  add work to the owner's queue on purpose. Section 6 makes that cost visible;
  it does not reduce it.
- The new budgets have no numbers until Phase 1 lands.
- A spike teaches the owner second-hand unless the owner cuts the spike
  personally. R-002 allows that but does not require it.
