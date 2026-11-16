# Would Mills' surgical team help this project? An assessment for autonomous agentic coding

Date: 2026-11-16. HEAD = `74e83f3` (main). `consultations/` not opened.

**Question.** This project is built mostly by autonomous AI agents. Would Harlan Mills' proposal, as Fred Brooks describes it in _The Mythical Man-Month_ (MM-M) chapter 3, help it deliver the quality, consistency and conceptual integrity that its ADRs describe? If so, in what form?

The owner put the question this way: would these roles stop "Leonard Shelbys" from ravaging the codebase? Leonard is the hero of _Memento_. He cannot form new memories, so he acts on Polaroids, notes and tattoos. Some of those notes are wrong, and some he wrote himself to mislead himself.

**Sources.**

- **The book.** _The Mythical Man-Month_, Anniversary Edition (Addison-Wesley, 1995; 17th printing, 2002), from `~/Downloads/The.Mythical.Man.Month.F.Brooks.pdf`. Page numbers are the printed book pages. I extracted the PDF's text layer and read it.
  - The PDF skips printed pp. 36–38, the end of ch. 3 ("How It Works", continued, and "Scaling Up"). Its text jumps from p. 35 to the ch. 4 opener. For the scaling argument I therefore cite Brooks' own restatements in ch. 18 (p. 232) and ch. 19 (pp. 256–257), not the missing pages.
- **The repository.** Cited as `path:line`, or by commit SHA.

---

## 0. Verdict up front

**Yes. It would help substantially, but only in an adapted form.** The adaptation reverses one of Mills' assumptions.

- **Mills:** one mind does all the cutting; the many hands only support (p. 32).
- **This project:** the many hands (agents) do nearly all the cutting. So the one mind can exist only in two places:
  1. the owner's decisions;
  2. a written program library that every amnesiac agent reads before it touches anything.

**What fixes most of survey-06's problems.** The protocol does, more than the roles: what you may decide depends on who you are. Survey-06's root cause was "architecture reached through agent review loops, not drawn up first" (`docs/reviews/2026-11-04-ddd-survey/survey-06-conceptual-integrity.md:24`). Brooks names that exact failure in his OS/360 story (pp. 47–48).

**What it cannot fix:**

- the owner's design bandwidth and taste, which is the ceiling;
- the second-system temptation in the overhaul's own scope;
- the fact that a library is only as true as whoever writes it. In _Memento_, Leonard's worst notes are the ones he writes himself.

---

## 1. Mills' proposal, restated precisely

### 1.1 The problem it answers

- **Productivity varies widely.** Sackman, Erikson and Grant measured best-to-worst ratios of "about 10:1 on productivity" (p. 30).
- **Communication cost grows quadratically.** Training cost "varies linearly with the number of workers", while intercommunication "increases as n(n−1)/2" (p. 18). So "one wants the system to be built by as few minds as possible" (p. 30).
- **The dilemma.** "For efficiency and conceptual integrity, one prefers a few good minds doing design and construction. Yet for large systems one wants a way to bring considerable manpower to bear" (p. 31).

### 1.2 The proposal

Organise each segment "like a surgical team rather than a hog-butchering team. … one does the cutting and the others give him every support". The result: "Few minds are involved in design and construction, yet many hands are brought to bear" (p. 32).

| Role                  | Brooks' definition (pp. 32–35)                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Surgeon**           | The "chief programmer". He "personally defines the functional and performance specifications, designs the program, codes it, tests it, and writes its documentation" (p. 32).                                                                                                                                                                                       |
| **Copilot**           | "The alter ego of the surgeon … less experienced. … share in the design as a thinker, discussant, and evaluator. The surgeon tries ideas on him, but is not bound by his advice. … He knows all the code intimately. … insurance against disaster to the surgeon. He may even write code, but he is not responsible for any part of the code" (p. 32).              |
| **Administrator**     | Handles "money, people, space, and machines" so that the surgeon, who has the last word, spends "almost none of his time on these matters" (p. 33).                                                                                                                                                                                                                 |
| **Editor**            | "The surgeon is responsible for generating the documentation — for maximum clarity he must write it." The editor then "criticizes it, reworks it, provides it with references … and oversees the mechanics of production" (p. 33).                                                                                                                                   |
| **Two secretaries**   | One each for the administrator and the editor (p. 33).                                                                                                                                                                                                                                                                                                               |
| **Program clerk**     | Maintains "all the technical records of the team in a programming-product library". "The most recent runs of any model are kept in a status notebook; all previous ones are filed in a chronological archive." The clerk is the vehicle for turning programming "from private art to public practice" (p. 33).                                                     |
| **Toolsmith**         | Ensures the adequacy of basic services and builds special tools. "The surgeon must be sole judge of the adequacy of the service". The toolsmith serves his surgeon "without regard to any other team's needs" (p. 34).                                                                                                                                              |
| **Tester**            | "Both an adversary who devises system test cases from the functional specs, and an assistant who devises test data for the day-by-day debugging" (p. 34).                                                                                                                                                                                                           |
| **Language lawyer**   | Finds "a neat and efficient way to use the language to do difficult, obscure, or tricky things". One can serve "two or three surgeons" (pp. 34–35).                                                                                                                                                                                                                 |

### 1.3 Why it preserves integrity

"Ten people, seven of them professionals, are at work on the problem, but the system is the product of one mind — or at most two, acting _uno animo_" (p. 35). Two features make this work:

- **No division of the problem.** "The surgeon and copilot are each cognizant of all of the design and all of the code."
- **A superior–subordinate relationship.** "Differences of judgment are settled by the surgeon unilaterally."

### 1.4 Scaling up: architect and implementer

**The architect/implementer split (ch. 4).** "Conceptual integrity … dictates that the design must proceed from one mind, or from a very small number of agreeing resonant minds". Brooks names two techniques for reconciling that with many hands (p. 44):

1. a division of labour between **architecture** and **implementation**;
2. the surgical team.

**Definitions.** Architecture is "the complete and detailed specification of the user interface" (p. 45): "architecture tells what happens, implementation tells how it is made to happen" (Blaauw, p. 45). The implementer keeps real creative scope: "module boundaries, table structures, pass or phase breakdowns, algorithms" (p. 49).

**Restatements in the 1995 edition:**

- Prop. 3.7: a chief-programmer team "offers a way to get the product integrity of few minds and the total productivity of many helpers, with radically reduced communication" (p. 232).
- Prop. 4.4 adds "[Small ones, too.]" to the claim that separating architecture from implementation works on large projects (p. 233).
- On large systems: "it is necessary for the system master architect to partition the system into subsystems … each piece will have its own architect" (p. 257).

### 1.5 Assumptions tied to 1960s–70s computing

- **Batch runs.** "Clearly the concept as set forth above assumes batch runs" (p. 34). The clerk keys input and files listings.
- **Scarce machine services.** These justify a dedicated toolsmith and machine operators.
- **Documentation by dictation.** Hence the secretaries and the editor's production mechanics.
- **Human coding throughput.** The surgeon could write all of a segment's code because segments were sized to one person's output.
- **The copilot's memory.** The copilot is a persistent human who "knows all the code intimately" (p. 32). His value as "insurance" rests on continuity.
- **"Everyone sees everything".** This is Mills' "public practice" (p. 33). Brooks later reversed it in Parnas' favour (pp. 271–272).
- **Waterfall.** Brooks later says the waterfall assumption "runs through the book" (p. 265).

---

## 2. Mapping the roles onto this project

The cast is one human owner plus many agents. The agents are cheap, start with no memory, are fast, and "average over millions of codebases" (`AGENTS.md:30-31`).

| Role                         | Who fills it now                                                                                                                                                                                                                                          | Status                                                   | Recommended filler                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Surgeon**                  | Owner for the P1 core (21 solo commits). For later layers: nobody, in effect, because the architecture came out of agent loops (survey-06 `:14-16,24`).                                                                                                  | **Split.** The owner designs but does not code.          | **The owner, as surgeon-architect.** He writes or line-edits the small "incision" code himself: core types, port signatures, the walking skeleton (§5.1). |
| **Copilot**                  | The AI in the grilling session that produced ADRs 0023–0035. It proposes, the owner decides (`ad7aea1` body).                                                                                                                                            | **Filled, minus memory.** It cannot be the "insurance".  | **One interactive design session per question.** It argues for options and drafts text. It never decides, and it is never assumed to remember.            |
| **Administrator**            | The harness, git, and the owner's environment constraints (`BUGS-ORCHESTRATOR.md:15-20`).                                                                                                                                                                 | **Mostly unnecessary.**                                  | **The orchestrator prompt.** It manages worktrees and branches. No dedicated role.                                                                       |
| **Editor**                   | Inverted: agents draft the ADRs and the owner ratifies (all 0023–0035 commits are owner-authored and Claude co-authored). An independent reviewer checked the design models (`255b2bb`).                                                                  | **Filled, inverted.**                                    | **An editor agent checks drafts** against the glossary and writing rules. **The owner reads every line** of authoritative text before it lands.          |
| **Secretaries**              | —                                                                                                                                                                                                                                                         | **Unnecessary.**                                         | —                                                                                                                                                        |
| **Program clerk**            | `BUGS.md` as "single source of truth for status", plus an append-only log (`BUGS-ORCHESTRATOR.md:26-34`). This is almost exactly Brooks' "status notebook" and "chronological archive" (p. 33).                                                          | **Filled for bugs. Missing for design.**                 | **A clerk (orchestrator plus scripts) owns the overhaul tracker, the ADR index and an interpretations log.** This is the most important role here (§3.2). |
| **Toolsmith**                | The ESLint `domain → cli` ban, oxfmt, `test:stress`, the toolkit skills.                                                                                                                                                                                  | **Filled ad hoc.** Sometimes the tools shaped the product (§4.2). | **An agent working on the owner's request.** It builds fitness functions that enforce the library (§5.4).                                                |
| **Tester**                   | The independent reviewer in the bug loop, which gets only the entry and the diff, "not the implementer's report or reasoning" (`BUGS-ORCHESTRATOR.md:129-134`). Byte fixtures as acceptance tests.                                                        | **Filled for bugs.**                                     | **A separate agent writes the acceptance and property tests from the ADRs before implementation.** Implementers may not edit them.                       |
| **Language lawyer**          | Ad hoc, e.g. TypeScript type tricks such as the phase-typed `LineState`.                                                                                                                                                                                  | **Filled on demand.** Low risk.                          | **On-demand agent consults.** They answer "how", never "what".                                                                                          |
| **(Implementers, ch. 4)**    | Fresh agents with narrow briefs and stop conditions in the bug loop (`BUGS-ORCHESTRATOR.md:79-120`). In P2–P3 they had open-ended plans (survey-06 `:15-16`).                                                                                             | **Filled.** Well bounded only in the bug loop.           | **Fresh agents per vertical slice,** confined behind a port and given interfaces only (Parnas). They stop on any architecture-level change.               |

**Reading the table.** The project already has most of Mills' support roles, in agent form. What it lacked in P2–P4 was the surgeon's monopoly on design decisions. The bug orchestrator is in effect a small surgical team for decision-free work: implementer, independent tester, clerk, and escalation to the surgeon. It worked: 23 iterations fixed, 1 blocked, 1 escalated (`docs/handoffs/bugs-loop-log.md`). Design questions were batched to the owner and decided in one place (`087e853`).

---

## 3. Where the analogy breaks

### 3.1 The owner is architect more than surgeon, and that costs something

Mills' surgeon writes the code. The owner here writes the decisions, and agents write the code. In Brooks' terms that makes the owner the ch. 4 **architect**, and in ch. 19 the "director" rather than the "producer" (p. 256; prop. 7.20, p. 236).

**What is lost.** Brooks, quoting Dorothy Sayers: "the incompletenesses and inconsistencies of our ideas become clear only during implementation" (p. 15).

- The P1 core is the most coherent part of the system because one mind both designed it and met the medium's resistance while implementing it. Five cold readers agreed on it with "near-zero variance" (`docs/reviews/2026-06-05-conceptual-integrity-review.md:28`).
- When agents implement, that feedback reaches the owner second-hand, filtered through summaries that "come back in the same confident register as … findings".

**So the owner should be both, selectively.** He should be architect for the whole system and surgeon for the small amount of code that sets its grain:

- the core value types;
- the port signatures;
- the walking skeleton.

In TypeScript, a type signature is an architectural specification that compiles. This is Brooks' "direct incorporation", which he praises as "a very clean technique for enforcing an architectural standard in software" (prop. 6.6, p. 234; the Macintosh example, p. 264).

### 3.2 The copilot has no memory, so the library must be the memory

The copilot "knows all the code intimately" and is "insurance against disaster to the surgeon" (p. 32). An agent knows nothing at the start of a session. Every agent is Leonard Shelby: competent, fast, and dependent on whatever notes it finds.

Brooks offers three relevant later points.

- **Parnas makes total knowledge unnecessary.** "Parnas was right, and I was wrong" (p. 272). With information hiding, nobody needs to know all the code, only the interfaces of their neighbours. That suits amnesiacs well: give each implementer its module and the port signatures it touches, nothing else. The overhaul's hexagonal ports (ADR-0029) are Parnas modules. They are the right structure for amnesiac labour, not only a DDD fashion.
- **Moving projects fails even with good documentation.** "In every case of attempts to move projects, the new team in fact started over, in spite of having good documentation, some well-advanced designs, and some of the people from the sending team" (p. 277). Every fresh agent session is a moved project. Documentation alone did not carry the theory between human teams. It carries it between agents only if it is:
  - small;
  - true;
  - authoritative;
  - backed by mechanisms that refuse deviation: types, lint, tests.
- **Training cost recurs.** Brooks' training cost is linear in the number of workers (p. 18). With amnesiac agents it is paid **per agent, per task**. An `AGENTS.md` of 36 KB with hard-coded paths, counts and function homes is a large training bill. Survey-06 found a dozen false statements in it (`survey-06:39-54`). In Leonard's terms, those are tattoos that lie.

**Memento's specific lesson: who writes the notes matters most.** Leonard writes a note he knows will mislead his future self, so that Teddy becomes his next target. The repository's equivalent is an agent writing the ADR that licenses what agents already built:

- ADRs 0002–0015 were "all backfilled in one commit, `cbe3921` (05-29) … after the design was already built" (`survey-06:15`);
- ADR-0012 was written to justify test-only readiness props after a flake campaign had already added them (`survey-06:78`).

**A note written after the act, by the actor, carries no authority. It is a rationalisation.**

### 3.3 Brooks' own revisions shift the weight from the team to the architect

- **The architect matters most.** "Having a system architect is the most important single step toward conceptual integrity", and Brooks is "more convinced than ever" (p. 257). He made even four-person student teams name a separate architect (p. 257). The surgical team survives mainly as a means to that end.
- **The waterfall is wrong.** "Plan to throw one away" was "too simplistic" because it assumes the waterfall (p. 265). "There has to be upstream movement": implementation findings must reach the architecture, and "one may well … iterate through two or more architecture-implementation design cycles before realizing anything as code" (pp. 266–267).
  - This qualifies survey-06's prescription that agents should implement "a fixed blueprint" (`survey-06:111`). The blueprint should be fixed per increment, and changed only by the architect when implementation pushes back.
- **Grow it, don't build it.** This is Mills again: build the skeleton with stubs, then flesh it out, so that "at every stage we have a running system" (pp. 267–268; also "grown, not built", p. 201).
- **Delegate power to teams.** Brooks endorses subsidiarity: teams owning their process (pp. 277–279). For agents, read this as freedom inside a module boundary, which is Brooks' own claim that implementation is "creative work of the first order" (p. 48). It is not freedom across boundaries.

### 3.4 Cheap parallel labour makes integrity worse, unless the boundaries are enforced

Agents remove the cost Brooks used to argue for small teams: salary and recruiting. They do not remove the cost that matters for integrity.

**Each implementer adds one local optimisation that nobody reconciled.** In a human team the n(n−1)/2 channels are conversations (p. 18). With agents the channels are not conversations at all. They are the code and the docs, and reconciliation happens afterwards, in review loops. The repository shows the result:

- 63 commits on the peak day, 06-05 (`survey-06:16`);
- review, then remediation, then review, until the fault line was "relocated … intact, one altitude down" (`docs/reviews/2026-06-05-conceptual-integrity-review.md:148-149`);
- 18 commit subjects mention "seam" (`survey-06:32`).

This is Brooks' Law ("adding manpower to a late software project makes it later", p. 25) in a new form. **Adding agents to a design problem makes the design less coherent**, because each one brings the average codebase's priors. The repository's own rule says so: "You average over millions of codebases; you cannot originate one coherent design vision" (`AGENTS.md:30-31`).

**The OS/360 parallel is direct.** Brooks gave the specifications to 150 implementers because they were available and idle. The result was "three months late, and of much lower quality", and "the lack of conceptual integrity made the system far more costly to build and change". He calls that availability a "siren song" (pp. 47–48). Spawnable agents are the purest form of that siren song: idle hands always on offer. Brooks' other observation also fits: "In an unconstrained implementing group, most thought and debate goes into architectural decisions, and implementation proper gets short shrift" (p. 47). That describes P3, where agent rounds argued about where the presentation IR belongs across ADRs 0016 → 0018/0019 → 0022 (`survey-06:80`).

**So cheap labour does not change the surgical team's logic. It sharpens it.** The scarce resource is no longer hands. It is the owner's attention to ratify decisions. The process should cap throughput at what the owner can ratify, not at what the agents can produce.

---

## 4. Evidence from this repository

### 4.1 Where something surgeon-like worked

1. **The P1 core.** The owner wrote it alone (`survey-06:14`). It "survives almost verbatim", and five cold readers agreed on it (`survey-06:95`). It is the only part every review rates coherent (`SYNTHESIS.md:18`). This is Mills' model working exactly as written: one mind designing and coding.
2. **The overhaul's design session (ADRs 0023–0035, CONTEXT.md rebuild).** It was done "decision by decision before any code is written, so the theory exists before agents implement it" (`ad7aea1` body). The AI proposed and the owner decided. Every commit is owner-authored with Claude co-authorship. This is surgeon and copilot as Brooks describes them: the surgeon "tries ideas on him, but is not bound by his advice" (p. 32).
   - The glossary now resolves the vocabulary fractures that survey-06 found (`CONTEXT.md:438-465`).
   - Several ADRs were amended on the same day: 0028 by 0032, 0029 by 0033 and 0034, 0031 by 0035 (`docs/adr/README.md:43-46`). Before any code exists, this is healthy iteration, the "two or more architecture-implementation design cycles before realizing anything as code" of p. 267.
3. **A formal-plus-prose library with a declared precedence.** `docs/design/README.md:3-8` says the models "hold no decisions of their own … Where a model and an ADR disagree, the ADR wins". That is Brooks' prop. 6.4 almost word for word: "One of the formal and prose definitions must be standard, and the other derivative" (p. 234).
   - The independent model reviewer, given "only the glossary and ADRs", found real defects, including policy placed in the wrong context (`255b2bb` body). That is the tester as "adversary who devises … cases from the functional specs" (p. 34).
4. **The bug loop.** It has a fresh implementer, an independent reviewer, mechanical verification, stop conditions on any design decision or fixture change, and batched escalation (`BUGS-ORCHESTRATOR.md:107-112,204-216`).
   - **Result:** 23 fixed, 1 blocked, 1 escalated, no architectural drift.
   - **Why it worked:** the loop could find and execute but not decide.

### 4.2 Where the missing surgeon structure caused the integrity problems

1. **The architecture came out of the loop.** ADRs 0018–0022 are all Claude-authored; ADR-0016 was superseded within 7 days, and 0018/0019 were amended within 14 days (`survey-06:24`). This is Brooks' horizontal division of labour without the vertical one (p. 50).
2. **Notes written after the act.** The backfilled ADRs (`cbe3921`), and ADR-0012 written to justify an API that test infrastructure had shaped (`survey-06:15,78`).
3. **Annotated seams instead of decisions.** The standing strategy was "when a fork is found it gets _documented_ in an ADR amendment or comment rather than dissolved" (`docs/archive/handoffs/theory-reconstruction-seams.md:28`). Only a surgeon can dissolve a fork, because dissolving it means choosing.
4. **Too many Polaroids.** There are 20,347 lines of plans and specs against about 14k lines of source (`survey-06:33`). Plan and seam IDs leaked into 22 source comments (`survey-06:69`). Ephemeral notes became load-bearing.
5. **Two style strata and one voice.** The human stratum uses arrow-const exports; the AI stratum uses `function` declarations and 20–44% comment lines. The survey's phrase: "one voice … It is not one design" (`survey-06:67-68`). Without a surgeon who sets conventions in code, every agent falls back to its prior.
6. **The library drifts as fast as the code.** There were three doc-truth sweeps in five weeks: "the docs are a second codebase that drifts at the same rate as the first" (`survey-06:54`).
   - A small instance in the new library: `docs/design/README.md:6-7` still gives the range "ADR-0023 to ADR-0034", though ADR-0035 exists and amends 0031 and 0034. Staleness begins on day one unless someone is assigned to prevent it.

---

## 5. Recommendation for building the overhaul

**The principle.** _One mind decides; the library remembers; agents execute and adversarially check; nothing an agent writes becomes authoritative until the owner ratifies it, and never after the code it licenses._

Keep it proportionate (`AGENTS.md:67-72`). These are hats, not ten agents. In practice they are:

- one orchestrator prompt, modelled on `BUGS-ORCHESTRATOR.md`;
- one interactive design session at a time;
- a handful of check scripts.

### 5.1 Team structure

| Hat                         | Filled by                                    | Does                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Surgeon-architect**       | Owner                                        | Decides everything in Tier A (§5.2). Personally writes or line-edits the "incision" code: the core value types (Transformation, Division, Pick and so on, per CONTEXT.md), the four driven-port signatures and ten use-case signatures (ADR-0029, as amended by 0033 and 0034), and the walking skeleton. That is a few hundred lines that set the grain. |
| **Copilot**                 | One interactive agent session per question   | Grills, offers two or three options with trade-offs, drafts ADR and glossary text. Assumed to remember nothing. Its only durable output is a draft the owner ratifies.                                                                                                                                                                        |
| **Clerk**                   | Orchestrator plus scripts                    | Keeps an `OVERHAUL.md` tracker (status per slice, like `BUGS.md`), an append-only log, the ADR index, and an **interpretations log** of the owner's answers to implementer questions. Brooks: "It is imperative to log these and publish them" (prop. 6.8, p. 234). Folds the answers into ADRs or the glossary in batches the owner ratifies.     |
| **Tester**                  | A fresh agent, never the implementer          | Before each slice, writes the acceptance and property tests from the ADRs and glossary only, for example exhaustively over the 4,096 Transformations and the Pick space (`SYNTHESIS.md:112`). Implementers may not edit these tests; changing one is a Tier-A event.                                                                          |
| **Reviewer**                | A fresh agent                                | Gets the diff plus the slice's ADRs, never the implementer's reasoning (as in `BUGS-ORCHESTRATOR.md:134`). Checks conformance to the library. Does not propose new architecture: findings that need design go to the clerk's queue for the owner.                                                                                            |
| **Implementers**            | Fresh agents, one vertical slice each, serial by default | Work inside one module behind its port and see only the interfaces they use (Parnas, p. 272). Have full creative freedom inside the module (p. 48). Stop on any Tier-A touch.                                                                                                                                                       |
| **Toolsmith**               | An agent working on the owner's request      | Builds the fitness functions in §5.4 and a generated package map that replaces the narrated paths in AGENTS.md (`survey-06:110`). Serves the surgeon only: no tool may change a production API without a Tier-A decision. That rule prevents a repeat of the `onReady` episode.                                                             |
| **Language lawyer, editor** | On-demand agent consults                     | Answer "how to express X in TypeScript" or "does this draft match the glossary". Never "what X should be".                                                                                                                                                                                                                                   |

There is no administrator and there are no secretaries: the harness and git cover them.

### 5.2 Decision protocol: who may decide what

**Tier A: owner only.** Ratified in the library before any code that depends on it. Covers:

- glossary terms and their _Avoid_ lists;
- ADRs (new, amended or superseded);
- public types and port and use-case signatures;
- bounded-context and package boundaries, and dependency rules;
- new runtime dependencies;
- error and exit policy;
- feature scope;
- acceptance tests and byte fixtures;
- coding conventions that apply across modules (e.g. export style, barrels, comment policy), stated once in an ADR and then linted.

**Tier B: implementer, checked by the reviewer.** Anything inside a module that leaves Tier A untouched: internal structure, private helpers, algorithms, local names that use glossary terms.

**Tier C: toolsmith and clerk, on the owner's request.** Scripts and lint rules that enforce Tier A. Tracker and index upkeep.

**Escalation.** An implementer that hits a Tier-A question stops and reports. The clerk batches the questions. The owner answers. The clerk records each answer in the library **before** the slice resumes. This is the bug loop's escalation path (`BUGS-ORCHESTRATOR.md:204-216`), extended from bugs to design.

### 5.3 Keeping the program library authoritative and current

The library has three tiers. Leonard needed to know which notes were tattoos and which were Polaroids.

1. **Tattoos (authoritative).** `CONTEXT.md`, accepted ADRs, and the owner-written type and port files.
   - Only the owner changes them, in owner-authored commits.
   - A tattoo is never written after the code it licenses.
2. **Derivative.** `docs/design/*` (the ADR wins, `docs/design/README.md:7-8`) and the generated package map.
   - Regenerated or audited mechanically, never narrated by hand.
3. **Polaroids (ephemeral).** Plans, handoffs, review transcripts, logs.
   - Dated and allowed to go stale.
   - **Never cited from source code**: source comments may cite ADRs and glossary terms only.
   - Archived when their slice lands.

Four rules keep the tiers working:

- **Consolidate before code.** A fresh agent should read one current statement per topic. Before implementation starts, fold ADR-0029 + 0033 + 0034 and ADR-0031 + 0035 into consolidated texts that supersede them. Brooks asks for timely updating and visible change marking (props. 7.9 and 7.13, pp. 235–236). Amendments are cheap now and expensive once there is code.
- **Shrink AGENTS.md** to rules and pointers. Every hard-coded path, count or function home is a future false tattoo (`survey-06:54`).
- **Reviews measure conformance; they do not author theory.** When a review finds a real fork, the output is a question for the owner, not an ADR amendment.
- **Make the user set explicit** (pp. 258–259). Here the user set is exactly one person (ADR-0032). Write it down once, in the glossary or ADR-0014, so that every scope argument refers to it. Brooks: "It is far better to be explicit and wrong than to be vague" (p. 259).

### 5.4 How this differs from the loops survey-06 criticised

| Survey-06's agent loops (P2–P4)                                                                              | Proposed protocol                                                                                   |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Plans written by agents, executed by agents. The architecture emerged from execution and review.            | Tier-A design is ratified by the owner before the slice starts. Agents execute only.               |
| Review rounds found seams **and** remediated them **and** amended ADRs.                                      | Reviewers and testers only find. Design findings become owner questions.                           |
| ADRs backfilled after the code (`cbe3921`).                                                                  | An ADR dated after the code it licenses counts as a defect (signal 1 below).                       |
| Up to 63 commits a day. Volume exceeded the owner's ability to absorb the theory.                           | Serial slices by default. Throughput is capped by the owner's ratification capacity.               |
| 20k lines of plans. Seam and plan IDs in source.                                                             | One tracker and one brief per slice. Polaroids never cited from source.                             |
| Test infrastructure shaped production APIs.                                                                  | Tools serve the surgeon. API changes are Tier A.                                                    |
| A big-bang refactor across packages.                                                                         | Mills' walking skeleton, grown one vertical slice at a time, always running (pp. 267–268).         |

### 5.5 What to avoid

- **Parallel agents on a design question.** That is a committee, the opposite of _uno animo_. Use one copilot session and the owner.
- **Agents authoring or amending tattoos to describe what they built.** This is Leonard writing his own license-plate tattoo.
- **Forwarding the implementer's conclusions to the reviewer.** An agent given your hypothesis tends to confirm it. The bug loop already forbids this (`BUGS-ORCHESTRATOR.md:134`).
- **Ceremony.** Ten roles as ten agents, a meeting cadence, or a document per role. Most roles are lines in one orchestrator prompt.
- **The second-system effect in the overhaul's scope.** The overhaul is the owner's second system. It adds:
  - a stateless HATEOAS REST engine with HAL-FORMS (ADR-0031, 0035);
  - a pure-client PWA (ADR-0034);
  - Google Sign-in allow-listed to one account (ADR-0032);
  - merged Journals (ADR-0033);
  - full channel parity, all for one user.

  Brooks: "The general tendency is to over-design the second system, using all the ideas and frills that were cautiously sidetracked on the first one" (p. 55). The repository's own rule says over-engineering is the agent's default failure mode (`AGENTS.md:72`). The decisions themselves are coherent: ADR-0034 rejects a second Oracle on integrity grounds. The risk is volume.

  Brooks' remedy is to "assign each little function a value" (p. 58; prop. 5.5, p. 234). Adapted: give each channel a budget (packages, lines, weeks), and grow the CLI on the new core first. That makes REST and the PWA later increments that can be cut, not prerequisites.

### 5.6 Detecting integrity drift early

All of these signals are cheap. Automate the first four; run the last two at milestones.

| #   | Signal                                                                                                                        | How                                                                                         | Baseline (old codebase)                    | Target                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| 1   | **Doc truth:** paths and symbols named in AGENTS.md, ADRs and the design models that do not exist.                             | Script: extract backticked paths and identifiers, check with `git ls-files` / `git grep`.   | ~12 contradictions (`survey-06:39-52`)     | 0, checked on every landing           |
| 2   | **Glossary conformance:** _Avoid_ terms used in identifiers or UI strings of overhaul packages.                                | Script parses `_Avoid_:` lines in CONTEXT.md and greps the new src.                         | e.g. "question" for Query (`survey-06:59`) | 0                                     |
| 3   | **Boundaries:** imports across bounded contexts or around ports.                                                               | ESLint `no-restricted-imports`, as the existing domain → cli ban.                           | enforced for domain → cli only             | 0, build-failing                      |
| 4   | **Polaroid leakage:** plan, seam or review IDs in source comments or test names.                                               | Grep for `Seam \d`, `S\d+`, `Phase \d`, `Slice \d` and the like in src and tests.           | 22 comments (`survey-06:69`)               | 0                                     |
| 5   | **Ratification lag:** any commit touching a Tier-A file (types, ports, package graph, fixtures) without an owner-ratified ADR or glossary entry dated before it. Also ADR amendments within 30 days of an ADR's first implementation. | `git log` per path, joined with ADR dates.                                                  | backfill `cbe3921`; 0016 superseded in 7 d; 0018/0019 amended in 14 d | 0 backfills; each amendment owner-initiated and logged |
| 6   | **Cold-read variance:** k = 3–5 fresh agents reconstruct each finished slice's theory, then compare with its ADRs (the theory-reconstruction method of the 06-05 review). | Once per milestone, not per commit.                                                         | domain near zero, CLI high (`…06-05…:28`)  | near zero on every new context        |

**Two secondary ratios.** Watch them, but do not gate on them:

- **Planning lines to source lines.** The baseline was 20,347 to about 14k; a rising ratio means Polaroids are multiplying.
- **Implementations of the same named domain operation.** The 18-cast sequence existed in four places, the save pipeline in five (`SYNTHESIS.md:44,51`). The target is one each.

---

## 6. Verdict: how much it helps, its limits, and what it cannot fix

**How much it helps.**

- **It addresses survey-06's root cause directly.** It changes who decides, not how much is written.
  - Most of the "committee-like" findings would not have arisen under a Tier-A monopoly with ratify-before-code (`survey-06:100-105`): the presentation stack's three-ADR migration, the two consultations-dir resolvers, the test-shaped APIs, the barrel inconsistency, the drifting AGENTS.md.
- **The evidence comes from inside the repository.** Each part that had a surgeon-like structure is coherent: the P1 core, the overhaul's design session, the bug loop. Each part that did not shows the drift.
- **It does not need new machinery.** The project already has every support role in agent form. It mainly needs the bug loop's discipline (find and execute, never decide) extended to design, plus the clerk's library hygiene.

**Its limits.**

1. **The owner is the ceiling.** "Great designs come from great designers" (p. 202). The structure amplifies one mind. It cannot supply one, and it makes the owner's attention the throughput bottleneck by design.
2. **The owner does not cut.** Implementation teaches the designer (p. 15), and here that lesson arrives second-hand. Owner-written incision code and a walking skeleton reduce the loss but do not remove it.
3. **No agent can be the copilot-as-insurance.** Brooks never saw documentation carry a project's theory to a new team (p. 277). Agents start over every session. The library plus self-enforcing types, lint and tests is the substitute, and it is only as good as its upkeep.
4. **Brooks himself moved the weight from the team to the architect** (p. 257) and abandoned the waterfall (pp. 265–266). The useful core of Mills is "one mind, many hands, radically simpler communication", not the ten-person org chart.

**What it cannot fix.**

- **Essential complexity.** Brooks: "The essence of a software entity is a construct of interlocking concepts … I believe the hard part of building software to be the specification, design, and testing of this conceptual construct" (p. 182). The roles do not make the domain easier. The open scripture and edition questions are still the owner's to settle.
- **Scope ambition.** The second-system risk in §5.5 can be contained only by the surgeon's restraint. No role prevents it.
- **Code quality inside modules.** The tester, the reviewer and the gates protect it; the org chart does not.
- **Untrue notes.** The structure tells Leonard which notes are tattoos. It cannot guarantee that the tattoos are true. Only the rule that the owner writes, or ratifies, every tattoo before the act does that, and only if the owner keeps to it.
