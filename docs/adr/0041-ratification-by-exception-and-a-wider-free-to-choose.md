# Ratification by exception and a wider Free to choose

Status: Accepted
Date: 2026-11-21
Amends: [ADR-0040](0040-how-the-overhaul-is-built.md)

This amends ADR-0040 on two points only: what counts as Tier B, and how the
owner ratifies the uncontested choices of a slice. Everything else in ADR-0040
stands. The owner licensed this draft in R-141 and accepted it in R-143.

## Why

Phase 1 had one Matter, M-001, and it took **125 owner touches** (115
Rulings, 9 ratifications, 1 test-list approval). About 20 of those were
routine: batches of line-edits ratified "as recommended", mostly public
shape details accepted unchanged, and some private names and comment
wording, in files that were Tier A only because the whole incision code was.
R-138 now caps a Matter at 60 touches. At M-001's rate, the cap would be
spent on choices the owner did not change. Since most of those touches were
public shape, which stays Tier A, the digest, more than the wider Free to
choose, is what absorbs them (R-143).

The touches that mattered were different. A handful of owner challenges
changed the design: R-030 split use case 1 into steps the caller holds,
R-051 banned type assertions in favour of type guards, and R-101 put a
partial Casting's limits into its type. None of these came from accepting a
recommendation; each came from the owner reading a question and disagreeing.
The process should spend the owner's attention there, and less on the rest.

## Decision

### 1. A wider Free to choose

Within a concept the owner has ratified, three kinds of choice are **Tier B**,
made by the implementer or drafter and checked by the reviewer, even inside a
file whose public surface is Tier A:

- the **names of private types and helpers**, where **private** means not
  reachable from the package's `exports` (R-145);
- the **wording of comments**;
- the **internal structure of helpers**: how private code is split into
  functions and files.

A choice is Tier B under this rule only if **all** of these hold. The reviewer
checks each one against the diff:

1. **Private.** The name is not reachable from any entry point in its
   package's `exports`. Sharing it between files of the same package through
   `#src` (R-019) keeps it private (R-145).
2. **Ratified concept.** It serves a type, port, use case or term already
   licensed (an accepted ADR, a `CONTEXT.md` term, a Ruling, or a ratified
   type or port file). A helper that introduces a domain notion the library
   does not name is Tier A.
3. **No behaviour change.** No acceptance test, byte fixture, public
   signature, error, exit code or user-visible string changes because of it.
4. **Glossary-clean.** A name uses glossary terms in their glossary meaning
   and no _Avoid_ term. Coining a new domain term is Tier A.
5. **Comments add no rule.** A comment may restate or cite what the library
   already says (ADRs and glossary terms only). A comment that states an
   invariant, rule or rationale the library does not hold is Tier A.
6. **No new dependency** and no new import across a package boundary.

**When in doubt, it is Tier A.** A reviewer who cannot settle a point from the
six tests raises a question; it never rules on it.

Everything public, cross-module, behavioural or named in the glossary stays
Tier A, as ADR-0040 lists it.

### 2. Ratification by exception

For each slice, or each Matter that has no slices, the clerk gathers every
drafted Tier-A choice the owner would otherwise ratify item by item: the
line-edits to a Tier-A draft, and the recommended answers to questions raised
in the slice. Then:

1. **The challenger.** A fresh agent, separate from the drafter and the
   reviewer, receives each item (the choice, its options and its
   recommendation) and the library that licenses it. It receives no one's
   reasoning. It argues against each recommendation, and marks the item
   **contested** if its argument names a concrete cost the recommendation
   does not answer. It decides nothing; it only routes.
2. **Questions.** Every item the reviewer or the challenger contests comes to
   the owner as a full question, in the usual form: options, trade-offs, a
   recommendation, and the challenger's argument.
3. **The digest.** Every uncontested item comes in **one digest** per slice,
   one line each with its recommendation. The owner ratifies the digest in one
   line, or names the items to discuss, which then come back as questions.
   Silence ratifies nothing, and nothing in a digest lands before the owner
   replies.

The clerk records each digest ratification as one Ruling that lists its items.
**A digest ratification is one owner touch**, however many items it holds.

These always come to the owner as questions, never in a digest:

- spec holes found by the tester;
- coding conventions that apply across modules;
- acceptance tests and byte fixtures, including the test-list approval;
- user manuals.

### What this keeps

ADR-0040's principle is that one mind decides. That still holds:

- The owner still makes every Tier-A decision. A digest is a list of
  decisions the owner reads and ratifies; neither the challenger nor the
  reviewer ever accepts one.
- Nothing becomes authoritative before ratification, and nothing is ratified
  after the code it licenses.
- The challenger and the reviewer can only send more to the owner, never
  less. Their errors cost owner attention, not integrity.

It does not change the tiers' list, the tester's spec audit, the escalation of
Tier-A questions met during implementation, spikes, budgets, or the drift
signals. It adds one hat to ADR-0040's roles: the **challenger**, a fresh agent
per digest.

## Considered options

- **An overseeing agent that decides routine items** (the owner's original
  idea, Q-PH1-4). Rejected: it moves Tier-A decisions to an agent, which is
  the OS/360 failure ADR-0040 exists to prevent, and recreates the agent
  review loops that cost the old outer layers their integrity. It would also
  have accepted the recommendations the owner overturned in R-030, R-051 and
  R-101; what is routine is known only after the owner has read it.
- **Only the wider Free to choose** (R-141, option b). It removes the private
  names and comments from the owner's queue, but every remaining Tier-A
  choice still costs a touch each, and the line-edit batches remain.
- **Keep the process** (R-141, option c). Rejected on Phase 1's figures: at
  M-001's rate a Tier-A-heavy Matter exceeds R-138's cap of 60 touches on
  choices the owner accepted unchanged.
- **The reviewer also serves as challenger.** Rejected: the reviewer checks
  conformance to the library, and a recommendation can conform and still be
  wrong. Arguing against it is a separate job for a separate fresh agent.

## Limits

- A one-line ratification invites skimming. The digest is only as good as the
  owner's reading of it; this ADR makes that reading cheaper, not certain.
- The challenger is an agent much like the drafter. It catches what a fresh
  reader can argue from the library, not what only the owner's taste would
  catch.
- Touch counts after this ADR are not comparable with Phase 1's: one digest
  touch may cover many items. The Minutes record the item count with it.
- Tests 1 to 6 decide most cases; the rest come as questions by the
  "when in doubt" rule, so the wider Free to choose saves less where the
  boundary is unclear.
