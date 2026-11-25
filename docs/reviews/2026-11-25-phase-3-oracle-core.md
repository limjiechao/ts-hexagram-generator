# Phase 3, the Oracle core: scope and breakdown into Matters

Date: 2026-11-25. Status: copilot draft for the Phase 3 breakdown (ADR-0042,
"Roles"; `MATTERS.md`, "Phases 3–6 are broken into Matters by the owner, with
the copilot"), revised after the challenger; ephemeral. It binds nothing until
the owner rules on it.

**What is being decided.** What "the Oracle core" (ADR-0042, "Build order and
budgets", step 2) covers and what it leaves to Phases 4 and 5; how it splits
into serial Matters within the owner's budget of 5 Matters, 3 weeks, 60 owner
touches per Matter and 1,500 lines per brief (`MATTERS.md`, phase table); each
Matter's draft entry; and the Tier-A questions and spec holes visible now,
before any tester's audit (section 4).

**Facts checked in the tree (2026-11-25, `matters` at ec85407).**

- **Stubs.** `grep notImplemented overhaul/*/src` gives 26 lines: 9 imports, 3
  helper definitions and 14 calls. With `resolve`'s inline `throw`, **15
  functions are stubs**:
  - `oracle`: `nextRound`, `divide`, `transcribe` (`division.ts`), `resolve`
    (`resolution.ts`);
  - `remainder-group-policy`: `choosePick`;
  - `application`: `keepCastConsultation`, `recordConsultation`,
    `resolveTransformation`, `browseConsultations`, `openConsultation`,
    `deleteConsultation`, `importLegacyFiles`, `exportConsultations`,
    `exportJournal`, `mergeJournal`.
- **Already real.** `emptyCasting`, `isCompleteCasting`, and in `application`
  `beginCasting`, the wrappers `nextRound`, `divide` and `transcribe`,
  `drawAutomaticPick`, and use case 8's three lookups.
- **Tests today.** `oracle`: the guard, `emptyCasting` and type tests.
  `remainder-group-policy`: none (R-126). `application`: `beginCasting` only.
  `cli-adapter`: the skeleton, through `composeCli`, which returns use case 8's
  lookups only (R-137). Every package's `test` script passes
  `--passWithNoTests`, so a package test run proves nothing about tests that
  were never written.
- **The brand.** `CompleteCasting`'s `complete` symbol is declared only, so the
  last Division step can make one only through `isCompleteCasting` (R-055).
  `PartialCasting`'s type admits at most 17 Rounds (R-101); tagged, unbranded
  types are built as literals (R-056), and type assertions are banned (R-051).
- **cli-adapter's dependencies.** It depends on `application` and, for tests
  only, `scripture-catalogue` (R-135; `eslint.boundary.js`, B7 and B8). A test
  of keep or record needs a `Query` and a `Moment`, which only `isQuery` and
  `isUtcOffset` in `consultation-journal` admit; B8 and B9 forbid that import
  today (R-148, R-165).
- **No Hexagram table.** ADR-0025's 64-row table does not exist in `overhaul/`
  (R-114). The legacy `domain/core/src/models` holds Fuxi numbers and Trigram
  keys in its own format.
- **Scripture data.** The legacy models hold the 經 in Traditional and
  Simplified script, Legge and Wilhelm–Baynes, with the 彖傳, 大象 and 小象
  (as `Exegesis.Judgment` and `Imagery`). A grep finds **no 用九 / 用六 text**,
  **no 文言** and **no 焦氏易林** outside the overhaul types and the docs.
- **The Transcription checks.** ADR-0011 (Accepted) sets them as a priority
  order: incomplete, remainders, conservation (the `MISSING STALKS` gauge),
  Set-aside. ADR-0038 only lists them. **With pile counts whole numbers from
  0**, conservation forces the Set-aside: every Round's stalks are 49 or a
  multiple of 4, so the Remainders sum to 4 or 8 in a Line's first Round and 3
  or 7 in the others. In ADR-0011's order the Set-aside check then never fires,
  and neither does `valid-pick`: both heaps hold a stalk, so the Pick is 1 to
  stalks − 2. Without that condition both can fire: `pilesLeft` 0.25,
  `remainderLeft` 1, `pilesRight` 11, `remainderRight` 2 conserves 49 with a
  Set-aside of 4; a negative pile count conserves with a Pick below 1. The
  legacy Transcription flow treats a pile count that is not a whole number
  from 0 as incomplete (`domain/core/src/manual-validation.ts`).
- **Oracle-loading subpaths.** `pnpm drift:oracle-subpaths` lists four
  `application` subpaths. Making use case 3 real adds
  `./resolve-transformation`; keep and record import only Oracle types. The
  list is checked in the clerk's verification, not in Acceptance (R-185).
- **Adapters.** No driven adapter exists. M-001's layout proposal names the
  later packages `store-markdown`, `catalogue-bundled` and `node-effects`.

## 1. Scope of the Oracle core

ADR-0042 names the phase but does not define it. The glossary's context map
makes the Oracle the core context: Casting, Resolution, Transformation,
Hexagram and its invariant structure, and Applicable Passages as Passage
References. ADR-0037 puts the Remainder-Group policy beside it, and R-030 makes
use case 1 a sequence of steps over the Oracle. Phase 4 is "the CLI at parity
with today's app, on the new core", gated by `docs/manual/cli.md` (R-008).
Phase 5 is the REST engine (ADR-0038), gated by `docs/manual/rest.md`.

PH3-1 asks where the line falls. The recommendation (A) is **the divination
path inside the hexagon, against stub ports**:

| In Phase 3 (A) | Left to Phase 4 | Left to Phase 5 or later |
| --- | --- | --- |
| `nextRound`, `divide`, `transcribe` (ADR-0011, ADR-0023, ADR-0038, R-087 to R-101) | the driven adapters `store-markdown` (ADR-0030), `catalogue-bundled`, `node-effects` | the table as a JSON resource; `/hexagrams`, `/trigrams` |
| `choosePick` (ADR-0023, R-119) | use cases 4–7, 9, 10 | Casting URLs, HAL, the `422` mapping (ADR-0038) |
| ADR-0025's Hexagram table and `resolve` (ADR-0024) | Line Retraction, a client policy (ADR-0038) | the PWA's trust function (R-031); B13, B14 (R-151) |
| keep (use case 1), use cases 2 and 3 (R-032, R-110, R-115) | sourcing 用九 / 用六, 文言, the Yilin (ADR-0028) | |
| each driven through `composeCli` with stub ports (PH3-2) | CLI input, output, exit codes (R-133, R-134) | |

Under (A), Phase 3 makes **8 of the 15 stubs real**: all four in `oracle`,
`choosePick`, and `keepCastConsultation`, `recordConsultation` and
`resolveTransformation`. Seven `application` stubs remain for Phase 4. Keep
and record are Consultation Journal work, not Oracle work; they are in (A)
because use case 1 is not whole until a Casting is kept.

## 2. Proposed Matters, in serial order

The entries follow PH3-12 (A), the slicing the copilot recommends. Each Matter
keeps the walking skeleton running and, under PH3-2 (A), extends it, so each
lands as a slice a person could drive end to end. Sizes include acceptance
material, scaled by Phase 2's 1.5–3 times overrun (`MINUTES.md`, Phase 2
milestone).

Only **M-009 drafts a new Tier-A file** (the Hexagram table's public row type
and subpath). The others implement ratified signatures. Each widens
`composeCli`'s ratified return type (R-137), as a digest line; M-007 is the
first to widen its ports input.

**Acceptance.** Each command runs named test files by path, so a missing file
fails it (`vitest run <path>` exits 1 when nothing matches). The file names
are drafts; the tester fixes them in the test list the owner approves.

### M-005: Pick Division: `nextRound` and `divide`

- Status: pending
- Phase: 3
- Licensed by: ADR-0023 (valid Pick, Remainder Groups), ADR-0026, ADR-0038;
  CONTEXT.md (Round, Division, Pick, Hung Stalk, Remainder, Set-aside); R-030,
  R-047, R-055, R-056, R-087 to R-101
- Scope: Make `nextRound` and `divide` real, each replaying the incoming
  partial Casting first. The eighteenth Round yields a complete Casting and
  its Transformation. `composeCli` gains use case 1's steps, and a test drives
  eighteen Divisions by Pick to a complete Casting through `cli-adapter`.
- Tier-A surface: implements ratified signatures in `oracle/src/division.ts`;
  widens `composeCli`'s return type (R-137).
- Free to choose: how replay is structured, so `transcribe` can reuse it; how
  the next `PartialCasting` is built as a literal (R-056); test layout. A
  private `PartialCasting` guard is not free: it comes to the owner as a
  question. Not free either: the order of Picks within each Remainder Group,
  which `nextRound` returns (PH3-5), and refusal fields.
- Acceptance: `pnpm type:check && pnpm --filter @hexagram/oracle exec vitest
  run tests/next-round.test.ts tests/divide.test.ts && pnpm --filter
  @hexagram/cli-adapter exec vitest run tests/pick-division.test.ts`
- Open questions: PH3-2, PH3-4, PH3-5 (ruled before M-005 starts). Likely from
  the tester: a Pick that is not a whole number; which refusal comes first
  when the Casting fails replay and the new Pick is also invalid.
- Commits: –
- Notes: about 750 lines, two slices: replay and `nextRound`; `divide` to the
  complete Casting, with `composeCli`.

### M-006: Physical Division: `transcribe`

- Status: pending
- Phase: 3
- Licensed by: ADR-0011 (the check order), ADR-0038 (the Transcription
  checks); CONTEXT.md (Transcription); R-091, R-093
- Scope: Make `transcribe` real on M-005's replay. `composeCli` gains
  `transcribe`, and a test transcribes eighteen Rounds to a complete Casting
  through `cli-adapter`.
- Tier-A surface: implements a ratified signature; widens `composeCli`.
- Free to choose: private helpers; test layout.
- Acceptance: `pnpm type:check && pnpm --filter @hexagram/oracle exec vitest
  run tests/transcribe.test.ts && pnpm --filter @hexagram/cli-adapter exec
  vitest run tests/physical-division.test.ts`, its tests asserting that each
  `DivisionRule` PH3-3 keeps reachable is reported by at least one
  Transcription.
- Open questions: PH3-3. Likely from the tester: the Pick a refusal names when
  the Transcription is complete but fails a later check.
- Commits: –
- Notes: about 450 lines, one slice.

### M-007: Automatic Division: the Remainder-Group policy

- Status: pending
- Phase: 3
- Licensed by: ADR-0023; ADR-0037 (the policy outside the Oracle); R-026,
  R-109, R-119
- Scope: Make `choosePick` real. `composeCli` gains `drawAutomaticPick` and
  takes a Random Source, and a test casts a whole Automatic Casting through
  `cli-adapter` with a scripted Random Source.
- Tier-A surface: implements a ratified signature; widens `composeCli`'s
  return type and, for the first time, its ports input.
- Free to choose: the body of `choosePick`; helpers that script
  `integerBelow`.
- Acceptance: `pnpm type:check && pnpm --filter
  @hexagram/remainder-group-policy exec vitest run tests/choose-pick.test.ts
  && pnpm --filter @hexagram/cli-adapter exec vitest run
  tests/automatic-division.test.ts`, the first file asserting ADR-0023's four
  probabilities exactly (PH3-6).
- Open questions: PH3-5 (the draw mapping), PH3-6.
- Commits: –
- Notes: about 300 lines, one slice.

### M-008: Keep and record a Consultation

- Status: pending
- Phase: 3
- Licensed by: ADR-0026, ADR-0027, ADR-0030 (ULID); R-031, R-032, R-108,
  R-110, R-111, R-112, R-135
- Scope: Make `keepCastConsultation` and `recordConsultation` real, building
  the Consultation Id from the Clock and the Random Source. `composeCli` gains
  both, and a test runs use case 1 from `beginCasting` to a kept Cast
  Consultation, and use case 2, against stub ports.
- Tier-A surface: implements ratified signatures; widens `composeCli` and its
  ports input (Store, Clock); **adds `consultation-journal` to `cli-adapter`'s
  dev dependencies and to B8's arrows** (PH3-8).
- Free to choose: the ULID helper's private name, file and structure inside
  `application`, within PH3-7.
- Acceptance: `pnpm type:check && pnpm lint:check && pnpm --filter
  @hexagram/application exec vitest run tests/keep-cast-consultation.test.ts
  tests/record-consultation.test.ts && pnpm --filter @hexagram/cli-adapter
  exec vitest run tests/keep-and-record.test.ts`
- Open questions: PH3-7, PH3-8.
- Commits: –
- Notes: about 450 lines, one or two slices. Consultation Journal work inside
  the Oracle phase (section 1).

### M-009: Resolve a Transformation: the Hexagram table, `resolve` and use case 3

- Status: pending
- Phase: 3
- Licensed by: ADR-0024, ADR-0025, ADR-0028, ADR-0037; CONTEXT.md (Figure,
  Polarity, Trigram, Fuxi Sequence Number, Nuclear, Inverse and Reversed
  Hexagram, Moving Line, Resolution, Applicable Passages, Passage Reference,
  Commentary, Yilin Verse, Reading Preference); R-061, R-064, R-080, R-081,
  R-085, R-104, R-108, R-114 to R-117
- Scope: Draft ADR-0025's 64-row table with tests that check every row
  against the glossary's rules; make `resolve` real over it; make
  `resolveTransformation` real. `composeCli` gains use case 3, and a test
  drives it through `cli-adapter` against a stub Scripture Catalogue.
- Tier-A surface: **drafts Tier-A files for ratification**: the table's
  public row type, its subpath and its lookup (PH3-9). `resolve` and
  `resolveTransformation` implement ratified signatures; widens `composeCli`.
- Free to choose: how rows are written (literal data, as ADR-0025 requires);
  private lookup structure; test layout.
- Acceptance: `pnpm type:check && pnpm --filter @hexagram/oracle exec vitest
  run tests/hexagram-table.test.ts tests/resolution.test.ts && pnpm --filter
  @hexagram/application exec vitest run tests/resolve-transformation.test.ts
  && pnpm --filter @hexagram/cli-adapter exec vitest run
  tests/resolve.test.ts`. The table test asserts 64 rows and 64 distinct
  Figures; the Resolution test asserts it ran over 4,096 distinct
  Transformations.
- Open questions: PH3-9, PH3-10, PH3-11, PH3-13. Likely from the tester:
  Commentaries asked for an X之X Transformation.
- Commits: –
- Notes: about 1,350 lines, three slices: the table; `resolve`; use case 3.

**Order.** M-005 first: everything else casts or resolves through its replay.
M-006 to M-008 finish use cases 1 and 2. M-009 could move before M-008 without
harm.

## 3. What Phase 3 does not need to ask

These look open but are answered; testers should cite, not ask:

- A step refuses rather than throws, naming Line, Round, stalks, Pick and rule
  (R-087); stalks are derived (R-088); a replay refusal names the first Round
  that fails (R-097, R-100); `nextRound` refuses rather than assuming (R-098).
- Keep takes only a complete Casting, never replays, and trusts the Division
  Method (R-031, R-112). Record takes Divined At as entered, never the Clock's
  (ADR-0026, `record-consultation.ts`).
- The Resolution's structure stays separate from the table's row (R-114).
  Hexagram names stay out of use case 3 (R-116).
- Each Commentary's Citation shape is fixed (R-061), and use case 3's text
  comes in the Resolution's order, each passage followed by its Commentaries,
  then the Yilin Verse (R-115(6)).
- `yilinVerse` and `commentaries` shape what use case 3 shows, not lookups
  (R-081, R-085). The Licence Gate is the adapter's (R-064), so Phase 3's
  stubs need none.

## 4. Open Tier-A questions

(A) is the recommendation each time. **Full** marks a spec hole, an
acceptance question or a cross-module convention, which ADR-0042 always sends
to the owner as a question. **Digest** marks a digest candidate.

### Scope and slicing

**PH3-1. What the Oracle core covers.** **Full: feature scope.**
(A) The divination path against stub ports, as section 1's table: the four
`oracle` stubs, `choosePick`, and use cases 1 (keep), 2 and 3. 5 Matters.
(B) As (A), plus `node-effects` and `catalogue-bundled` with the data the
legacy models already hold, so use case 3 returns real text. It needs licence
and Witness records for four Editions (ADR-0028), and the All-Moving
Statement's text would be empty until sourced. About 7 Matters.
(C) Only the pure packages (`oracle`, `remainder-group-policy`). 3 Matters,
but use case 1 is never kept end to end before the CLI.
(D) Every `application` stub except 7 and 9. About 7 Matters.
Recommend (A): it fits the budget, ends with a Consultation cast, kept and
resolved end to end, and puts each adapter beside the CLI manual that decides
its behaviour.

**PH3-12. How Phase 3 is cut into Matters.** **Full: feature scope.**
(A) As section 2: Pick Division (`nextRound`, `divide`); Physical Division
(`transcribe`, PH3-3); Automatic Division; keep and record; Resolution (the
table, `resolve`, use case 3) as one Matter in three slices.
(B) The first draft's cut: all three Division steps in one Matter (about
1,100 lines, three slices); Automatic Division; keep and record; the table and
`resolve`; use case 3. M-008's table Matter then extends no driving path.
Recommend (A). The Division steps carry the most spec holes: M-001 needed 15
questions on their signatures alone (Q-M-001-57 to -71), and Phase 1's one
Matter spent 125 touches. Phase 2's slices ran 1.5 to 3 times their
estimates, so a three-slice Division Matter is the likeliest to reach the
60-touch cap; split, each half carries its own cap. Resolution's holes are
mostly ruled here (PH3-9 to PH3-11, PH3-13), so it can carry three slices, and
merging it makes every Matter vertical.

**PH3-2. How Phase 3 keeps the walking skeleton growing.** **Full:
acceptance.** (A) Each Matter adds its use cases to `composeCli`, bound to the
ports it takes, and drives them in a `cli-adapter` test with stub ports
(R-131). Each widening of R-137's signature is a digest line. (B) Acceptance
runs at `application`; `composeCli` stays as R-137 left it until Phase 4.
Recommend (A): it proves each slice through the driving side, as the skeleton
did.

### Division (M-005, M-006)

**PH3-3. The order of the Transcription checks.** **Full: spec hole.**
ADR-0011 orders them incomplete, remainders, conservation, Set-aside. With
whole pile counts, that order never reports `set-aside` or `valid-pick` (see
the facts).
(A) Amend ADR-0011's order for the overhaul: `complete`, `remainders`,
`set-aside`, `conservation`; first failure wins. A pile count that is not a
whole number from 0 is `complete`, as the legacy Transcription flow treats
it. `set-aside` becomes reachable, and the more specific message comes first.
`valid-pick` stays unreachable for `transcribe`, which its tests assert. How
the CLI shows conservation (ADR-0011's gauge) is the CLI manual's.
(B) Keep ADR-0011's order; `set-aside` stays in `DivisionRule` and is
documented as unreachable while stalks are derived (R-088).
(C) Drop `set-aside` from `DivisionRule`, amending the ratified type, ADR-0038
and the glossary's Transcription (`CONTEXT.md`, which names the Set-aside
check).
Recommend (A): every rule named for `transcribe` but `valid-pick` can fire
and be tested.

**PH3-4. What `divide` does if its own output fails `isCompleteCasting`.**
**Full: error policy.** After the eighteenth Round, `divide` passes what it
built through the guard (R-055). With correct replay the guard never fails,
but the code needs that branch, and `application/src/divide.ts` promises
"never a throw". (A) Throw an `Error`: a defect in the Oracle, not a refusal;
the comment says so. (B) Return a `replay` refusal, which blames the caller's
Casting for the Oracle's fault.
Recommend (A).

### Automatic Division (M-005, M-007)

**PH3-5. Pick order and the draw mapping.** **Full: spec hole.** Rule before
M-005 starts: the first half is `nextRound`'s output (`division.ts`,
`NextRound`).
(A) `nextRound` lists each Remainder Group's Picks in ascending order, as
ADR-0038's example does (M-005). `choosePick`'s first draw,
`integerBelow(4)`, gives 0–3 for Remainder 1–4; its second,
`integerBelow(size)`, indexes the group (M-007). Tests can script draws and
expect exact Picks.
(B) Leave both to the implementers; tests check only bounds and the
distribution.
Recommend (A): the policy is testable Pick by Pick, and the PWA's use of the
engine's groups (ADR-0037) behaves the same.

**PH3-6. How ADR-0023's probabilities are proved.** **Full: acceptance.**
(A) Exact enumeration: every pair of draws in every Round of a Line, weighted
by its probability, gives exactly 1/16, 5/16, 7/16 and 3/16, as ADR-0023
computed them, in milliseconds. (B) A sampled test like the legacy one
(1,000,000 iterations, about 40 s; ADR-0013). (C) Both.
Recommend (A): exact and fast, and no slow test enters `overhaul/`.

### Keep and record (M-008)

**PH3-7. How the Consultation Id is built.** **Full: dependency question and
spec hole.** (A) A private helper in `application`: a 48-bit millisecond time
from the Clock's `epochMilliseconds`, then 80 random bits as 16 draws of
`integerBelow(32)`, in Crockford base 32, admitted through
`isConsultationId` (R-051). Keep reads the Clock once, for both the Id and
Divined At. No new dependency. (B) The `ulid` package, a new runtime
dependency. (C) A public builder in `consultation-journal`, a new Tier-A
signature.
Recommend (A): about 20 lines, and the two ports R-032 named are the only
inputs.

**PH3-8. How `cli-adapter`'s tests get a Query and a Moment.** **Full:
dependency rule.** (A) `cli-adapter` gains `consultation-journal` as a dev
dependency, used only by tests, as R-135 did for `scripture-catalogue`; B8's
arrow and the manifest change with M-008 (R-148, R-165). (B) Keep and record
are tested at `application` only; `composeCli` does not gain them in Phase 3.
Recommend (A): it keeps PH3-2's end-to-end test, at no production
dependency.

### Resolution (M-009)

**PH3-9. The Hexagram table's public surface.** **Full: public type.**
ADR-0025 calls the table a published fact any consumer can read. (A) A typed
constant in `oracle` on a new subpath, 64 rows in Fuxi Sequence Number order,
each row the Figure, Lower and Upper Trigram, Nuclear, Inverse and Reversed
Hexagram, and Fuxi Sequence Number, with one lookup by Figure; names for the
owner's line-edit; no JSON until a consumer needs it. (B) As (A), plus a
generated JSON now, after ADR-0007's split. (C) Private to `oracle` until
Phase 5.
Recommend (A): it publishes what ADR-0025 calls published, and builds no
artifact nobody reads yet.

**PH3-10. The order of a Resolution's Applicable Passages.** **Full: spec
hole.** Order carries no rank (ADR-0024), but R-115(6) makes use case 3's text
follow it, so every channel shows it. (A) The Standing Hexagram's Hexagram
Statement, the Moving Lines' Line Statements bottom-up, the All-Moving
Statement, then the Emerging Hexagram's Hexagram Statement (none for X之X).
(B) As (A), with the All-Moving Statement last. (C) Unspecified; tests compare
as sets.
Recommend (A): the Standing Hexagram first and whole, then where it leads.

**PH3-11. Commentaries: the Emerging Hexagram, and order within a passage.**
**Full: spec hole.** R-061 fixes each Commentary's Citation and R-115(6) puts
Commentaries after their passage. Left open: (A) the Emerging Hexagram's
Hexagram Statement is followed by its 彖傳, 大象 and 文言 like the Standing
one's; within one passage, Commentaries come in the Reading Preference's
order. (B) Commentaries follow only the Standing Hexagram's passages. (C) As
(A), but within one passage in a fixed Work order (彖傳, 大象, 小象, 文言).
Recommend (A): both Hexagrams are treated alike, and the order the reader
chose is kept.

**PH3-13. Catalogue calls in sequence or concurrently.** **Full: error
policy.** After a rejection, which calls have run is observable (R-108;
ADR-0042's no-behaviour-change test). (A) In sequence, in the result's order,
stopping at the first rejection, which the Promise passes on unchanged.
(B) Concurrently; the first rejection in time is passed on and the other calls
still run. Recommend (A): deterministic, and the bundled Catalogue (CLI, REST
engine) is local, so the cost is small.

## 5. Risks to the budget

**Verdict: 5 Matters in 3 weeks looks enough; the 60-touch cap is the tighter
limit, eased by splitting the Division steps (PH3-12).**

- **Weeks.** Phase 2 landed 3 Matters in 4 days. Phase 3's Matters implement
  signatures already ratified; only M-009 drafts a new Tier-A file. At Phase
  2's pace, 5 Matters take about 7 to 10 working days.
- **Touches.** Phase 2 spent 49, 55 and 21; Phase 1's one Matter spent 125,
  most on drafting the signatures Phase 3 now implements. Under PH3-12 (A),
  estimate 25 to 40 for each Division Matter and for M-009, 15 to 25 for the
  others. Ruling PH3-1 to PH3-13 with this breakdown, by topic, keeps them out
  of the Matters' spec audits. Grouping holes by topic held Phase 2's rounds
  to 5–12 touches.
- **Silent misses.** Every blocking finding after M-002's first slices was a
  silent miss. The Oracle's domains can be enumerated: 4,096 Transformations,
  64 rows, at most 47 Picks per Round, so the Acceptance tests assert their
  counts. Replay remains the exposure: the tester's plants must corrupt each
  field of a Round.
- **Brief size.** M-005's brief (ADR-0023, ADR-0038, the glossary's Oracle
  section, `division.ts`, `casting.ts`, about 15 Rulings) is about 1,000 lines;
  M-009's (ADR-0024, ADR-0025, the glossary, the Oracle and Catalogue types,
  about 12 Rulings) about 1,200. Both are under the 1,500 cap.
- **Typing risk.** Building a `PartialCasting` tuple as a literal (R-056)
  without assertions may prove awkward; a private guard would come as a
  question (M-005).
- **Deferred to Phase 4, not removed.** Under PH3-1 (A), the missing 用九 /
  用六, 文言 and Yilin texts, and licence records for four Editions, fall to
  `catalogue-bundled`. They are Tier-A data decisions and may need a spike.

## 6. What could not be verified

- That no 文言 or Yilin text exists outside the tree, or under
  `consultations/`, which this draft did not open.
- Phase 3's real touch counts; the estimates extrapolate from Phases 1 and 2.
- Whether TypeScript 6.0.3 can build the next `PartialCasting` as a literal
  without a guard. Not tried. (Checked: `pnpm --filter @hexagram/oracle exec
  vitest run tests/<missing>.test.ts` exits 1; an existing file exits 0.)
