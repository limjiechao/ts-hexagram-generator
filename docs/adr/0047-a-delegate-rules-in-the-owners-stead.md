# A delegate rules in the owner's stead

Status: Accepted
Date: 2026-11-27
Amends: [ADR-0042](0042-how-the-overhaul-is-built.md) (its founding principle, "Decision tiers", "The clerk's records", "Ratification by exception", "Roles", "The library has three tiers", "Build order and budgets" and "Considered options")

This amends ADR-0042 on who answers the questions the clerk raises, and on
who lands `matters` on `main`. It folds R-423, R-424 and R-425. The practice
it records is set out in the delegate's charter, `docs/agents/delegate.md`,
and in `docs/agents/clerk.md` §0 and §3. Everything else in ADR-0042 stands.
The clerk drafted it by R-487, and the owner ratified it (R-493), since the
delegate never rules on its own charter (R-423, "Folded into"; the charter; R-487).
ADR-0042 and this ADR are consolidated into one text before Phase 5 starts.

## The decision

The owner remains the sole architect, and delegates rulings to an agent
(R-423):

- **Scope.** The delegate rules on everything the clerk would otherwise
  bring to the owner, with discretion to refer to the owner any item it
  deems critical, contentious or pivotal (R-423, part 1). The charter
  itemises that scope: Tier-A questions, test-list approvals and byte
  fixtures, digests, and ratifications of drafted surfaces, ADRs, ADR
  amendments and user manuals. Phase budgets and owner-touch caps are
  outside it: only the owner sets or changes them, and the delegate refers
  them.
- **The delegate.** A fresh agent for each batch, briefed with the charter.
  It never drafts, tests, implements or reviews, and never rules on its own
  work.
- **Referral.** The charter says when the delegate refers, and when in doubt
  it refers:
  - **critical:** hard to reverse once code or data depends on it;
  - **contentious:** a close call of taste or values, or an item the
    reviewer or the challenger contested whose cost the delegate cannot
    answer from the library;
  - **pivotal:** feature scope, a budget, the objectives (ADR-0014), how the
    team works, or user-visible behaviour a ratified manual already fixes;
  - anything that would overturn or narrow a Ruling the owner gave;
  - scripture text, a Witness, or an Edition's content;
  - `consultations/`, personal data, pushing, or `main`.
- **Limits.** The delegate may apply and interpret the owner's Rulings, but
  never overturns or narrows one. It may revisit its own rulings (the
  charter). It never rules on its own charter: R-423, the charter, or this
  ADR.
- **The clerk's part.** The clerk sends each item exactly as it would show
  the owner, and never rewords one to steer the delegate. If the delegate
  refers an item the clerk thinks it could rule on, the owner decides.
  Referred items reach the owner as questions, with the delegate's reason
  (`clerk.md` §3).
- **Oversight.** Each delegate ruling is recorded as an `R-NNN` marked
  `Ruled by: delegate (R-423)`, with its reason. Every landing pull request
  lists the delegate's rulings since the last landing (R-423, part 2:
  "Digest at each landing"). The owner may overturn any of them; an
  overturn is an owner Ruling, and the clerk reopens whatever depended on
  the overturned ruling (`clerk.md` §3; the charter). `main` is not
  fast-forwarded until the owner says to land. Silence ratifies nothing, as
  with a digest.
- **Landing.** The clerk pushes `matters` plainly, never forced, and opens
  the landing pull request. Once CI passes and the owner says to land, the
  clerk fast-forwards `main` to the tested tip where the owner's environment
  permits, keeping linear history and every SHA (R-424, R-425; R-272 and
  R-302 as amended).
- **Counting.** Owner touches and delegate rulings are counted separately on
  each Minutes entry (`clerk.md` §3). A delegate ruling is not an owner
  touch, and the touch caps measure only the owner.

## What changes in ADR-0042

- **The founding principle.** "Nothing an agent writes becomes
  authoritative until the owner ratifies it" now reads: until the owner, or
  the delegate in the owner's stead, ratifies it, subject to the owner's
  review at landing.
- **Decision tiers.** Tier A stays the owner's. The delegate decides Tier-A
  items in the owner's stead, within the scope above, and escalated
  questions go to it first.
- **The clerk's records.** `RULINGS.md` holds the owner's Rulings and the
  delegate's rulings, told apart by `Ruled by:`. The delegate may ratify a
  folding batch, except one that folds into ADR-0042 or this ADR.
- **Ratification by exception.** The delegate, not the owner, receives the
  questions and the digest. Contested items reach the owner only when the
  delegate cannot answer their cost from the library.
- **Roles.** The Architect row reads: decides everything in Tier A, directly
  or through the delegate; starts spikes; sets budgets and caps; reviews the
  delegate's rulings at each landing. A **Delegate** row is added: a fresh
  agent per batch, never one that drafted, tested, implemented or reviewed
  the items; it rules on what the clerk would bring to the owner, or refers
  it, as this ADR says.
- **The library has three tiers.** "Only the owner changes them" now reads:
  only the owner, or the delegate under this ADR.
- **Build order and budgets.** An owner touch keeps its meaning. Delegate
  rulings are counted beside it.
- **Considered options.** The rejection of an overseeing agent (Q-PH1-4) is
  reversed; see below.

"The incision code" is not amended. It records a ratification the owner
made before this ADR.

## Why

ADR-0042 spends the owner's attention where the owner disagrees, and
ratification by exception made agreeing cheaper without removing it. The
owner then found they had been "going along with all the decisions so far"
and asked for an agent to take over (R-423). A delegate takes the agreeing
off the owner's queue, and leaves the owner the landing review and every
item it refers.

## Considered options

The owner chose among R-423's options without stating reasons. The reasons
given here for the options not chosen are the clerk's.

- **The delegate rules on everything, with discretion to refer, and a
  digest at each landing (chosen, R-423).**
- **All but a reserved list**, or **digests and tests only** (R-423, part 1,
  options 1 and 2). Not chosen. In the clerk's reading, a fixed list cannot
  foresee which item is pivotal, and the referral clause judges each one.
- **A phase-end review** (R-423, part 2). Not chosen. In the clerk's
  reading, a phase-end overturn would reopen a whole phase's work.
- **No routine review** (R-423, part 2). Not chosen. In the clerk's reading,
  nothing would then catch a delegate ruling the owner would have
  overturned, and the delegate's rulings would drift from the owner's taste
  unseen.
- **Keep ADR-0042's rejection of "an overseeing agent that decides routine
  items"** (Q-PH1-4). Reversed by the owner (R-423). ADR-0042 rejected it
  because it moves Tier-A decisions to an agent and recreates the agent
  review loops, and because it would have accepted the recommendations the
  owner overturned in R-030, R-051 and R-101: "what is routine is known
  only after the owner has read it". This ADR does not answer that
  argument. The referral clause has an agent judge what is routine before
  the owner reads it. The landing review lets the owner read afterwards, at
  the cost of reopening work.

## Consequences

- **An agent rules on agents' work.** This is the risk ADR-0042's
  rejection of Q-PH1-4 named. The delegate shares the drafter's blind spots.
  The mitigations narrow the risk but do not remove it:
  - the delegate is fresh for each batch and never rules on its own work;
  - its charter binds it to the library, and the library outranks every
    brief;
  - the referral clause sends taste, scope and the irreversible back to the
    owner;
  - the owner's landing review can overturn any ruling.
- **The challenger's guarantee no longer holds.** ADR-0042 says the
  challenger and the reviewer "can only send more to the owner, never less.
  Their errors cost owner attention, not integrity." A contested item now
  goes to the delegate, which may rule on it. A wrong ruling then costs
  integrity until the owner's landing review catches it.
- **Ratification can now follow code.** A delegate ruling licenses code at
  once, so an owner overturn at landing reopens code already built on it.
  ADR-0042's "nothing is ratified after the code it licenses" holds for the
  delegate's ruling, not for the owner's review of it.
- **Landings wait for the owner.** The owner's word to land is the review,
  so landings move at the pace of the owner's reading. Like a digest, the
  review invites skimming.
- **The authoritative library now holds agent rulings.** A reader of
  `RULINGS.md` must check `Ruled by:` to tell an owner Ruling, which the
  delegate may not overturn, from a delegate ruling, which it may revisit.
- Touch counts after R-423 are not comparable with earlier phases'. The
  Minutes record delegate rulings beside them.
- On ratification, the charter and `clerk.md` follow this ADR where they
  differ from it.

## Where it's enforced

- `docs/agents/delegate.md`: the delegate's charter.
- `docs/agents/clerk.md`: §0 (git constraints) for landing, §3 for sending
  items to the delegate, recording and counting its rulings, and listing
  them in the landing pull request.
