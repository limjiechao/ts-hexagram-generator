# M-003 drift signals 1, 2 and 4: design, Acceptance and Free to choose

Date: 2026-11-22. Status: copilot draft for M-003 (ADR-0042, "Roles"), revised
after the challenger; ephemeral. It binds nothing until the owner rules on it
(R-147, as R-140 set for M-002).

**What is being decided.** How drift signals 1, 2 and 4 (ADR-0042, "Drift
signals") are built: each script's design and output, the plants added to
`drift:prove`, a knife-edge Acceptance, a Free to choose, the slicing, and the
vocabulary each script checks (section 5). M-002's proposal
(`docs/reviews/2026-11-21-m-002-boundary-rules.md`, §1) sketched these three
signals; this draft refines that sketch and carries its Q1, Q2 and Q6.

**Facts checked in the tree (2026-11-22).**

- `typescript` 6.0.3 and `tsx` are installed at the root, so the scripts can
  parse source with the TypeScript compiler API at no new dependency cost.
- `scripts/drift/` holds signal 3's prover, keyed on B-numbers that start each
  message (R-158), with a fixed expected list. `drift:prove` runs only that
  prover; `drift:check` does not exist. `check:all` is a turbo task, while
  `drift:check` would be a root script.
- `overhaul/*` (six packages, 80 `.ts` files, no `.tsx` yet): no Ruling,
  Matter, question or seam ID, no ephemeral path, and no multi-word _Avoid_
  entry in an identifier or string. Its tests already use
  `it.each([...])('name', …)` (`consultation-journal/tests/query.test.ts`).
- Tooling cites process IDs by design: `scripts/drift/*.ts` cites Rulings 15
  times; `eslint.config.js` names the legacy seams S9, S14 and S17.
- `CONTEXT.md` has 52 `_Avoid_:` lines. Six wrap onto a second line; two are
  prose, not lists (line 92, `using "hexagram" for …`; line 418, `using
"viewer" loosely …`). Some share a head noun (`primary, original, present
hexagram`, line 97), others do not (`index, split point`, line 60). Casting
  and Round are glossary terms that also appear in other terms' _Avoid_ lists.
- ADR status lines take forms such as `Accepted`, `Accepted (amended by
0022)`, `Superseded by 0019` and `Superseded by ADR-0042`.
- Doc-truth misses today include `docs/manual/cli.md` and `docs/manual/rest.md`
  (ADR-0042; `docs/manual/` exists with a README), `cli/cli` (ADR-0019, a former
  location) and `castMethod` in ordinary prose (ADR-0027, line 22, citing what
  ADR-0011 rejected). ADR-0002 names `packages/*`, a top-level directory that no
  longer exists.
- Of 195 `Folded into:` lines in `RULINGS.md`, 153 are bare `not yet`; others
  read `not yet (overrides …)`, wrap onto a second line, or name `CONTEXT.md`,
  `MATTERS.md` or an ADR.

## 1. Each signal's design

All three scripts share one entry point, `pnpm drift:check`, which runs them
over the real tree and exits 1 if any reports. Each report is one line,
`<file>:<line> <code> <message>`, the message starting with its code (Q12) and
naming the ADR or Ruling it encodes. A clean run prints one summary line per
signal, with counts of files scanned and, where a question says so, of what was
skipped. Each script takes an alternative root, which is how `drift:prove`
feeds it plants. Source is parsed with the TypeScript compiler API, not with
regexes over raw text.

**Signal 1, doc truth.** _Scans_ the sources Q8 fixes. Candidates are
backticked tokens only: a **path** (D1), a token whose first segment is a
current root entry or a former one (Q9); a **glob** (D2), which must match at
least one file; a **symbol** (D3), as Q10 defines. Tokens with `<…>`
placeholders are templates and skipped. _Flags_ a candidate that resolves to
nothing and has no exception (Q1), and an exception that no longer matches a
miss (D4, stale). _Legacy:_ legacy names count as present while legacy code
lives; it edits nothing.

**Signal 2, glossary conformance.** _Reads_ the checkable _Avoid_ entries from
`CONTEXT.md` at run time (Q2). _Scans_ the files Q7 fixes: declared identifiers
(G1, Q11) and UI strings (G2: string literals, template text and JSX text).
_Flags_ an entry whose words match within one identifier or one string (Q3).
Comments are not scanned: ADR-0042's table names "identifiers or UI strings",
and a comment may need to say what a term is not. _Legacy:_ not scanned (R-003).

**Signal 4, ephemeral leakage.** _Scans_ every comment and every test name
(Q13) in the files Q7 fixes. _Flags_ the patterns of Q4, one code each, and
Ruling IDs as Q5 decides. _Legacy:_ not scanned; legacy seam and wave IDs are
hygiene deferred by R-003.

**Plants in `drift:prove`.** `scripts/drift/fixtures/signal-1/`, `signal-2/`
and `signal-4/` each hold one plant per code, a clean twin beside each, and an
`expected.ts` keyed by code, as `fixtures/signal-3/` is. Signal 1's plants form
a small fake root (an `AGENTS.md`, an Accepted, an amended-Accepted and a
Superseded ADR, a design model, an exception file with one stale entry), so
source selection and D4 are proved. Signal 2's come with a fixture
`CONTEXT.md`. Signal 4's include each test-name form of Q13. `drift:prove` runs
both provers and exits 0 only if both do. Plants sit outside `overhaul/` and the
real docs, so `drift:check` never sees them.

## 2. Knife-edge Acceptance

```bash
pnpm lint:check && pnpm drift:check && pnpm drift:prove
```

As ruled in R-147.

- `drift:check` does **not** pass on today's tree: the misses above fail
  signal 1. It exits 0 only once Q1's exception file is seeded, entry by entry,
  with the misses the signal-1 slice lists; those entries are Tier A and come to
  the owner with that slice.
- `drift:prove` exits 0 only if **every plant is reported by exactly its own
  code, and every clean twin by none**, for every code of Q12, on top of B1 to
  B12 and the Oracle-subpath analysis as today. Every code appears in an
  expected list, so a deleted plant fails the command.
- `drift:prove` leaves the working tree unchanged, as R-189 requires today.

## 3. Draft Free to choose (Tier B, for the implementer)

- File names and layout under `scripts/drift/`, including whether the new
  prover is a second file or folded into `prove-boundaries.ts`.
- TypeScript run by `tsx`, parsing with the TypeScript compiler API.
- The internal structure of the scripts, the shared scanner and the prover.
- The wording of reports and summaries, within "starts with its code and names
  the ADR or Ruling it encodes" (as R-158 narrowed R-157(9)).
- How the alternative root is passed; the exception file's syntax.
- The order of the slices, if a later one unblocks an earlier one.

Not free: what each signal scans and flags, the checkable entries, the
matching and ID patterns, the codes, the exception list's contents,
Acceptance, new dependencies.

## 4. Slicing

M-003 has its own 60-touch cap (R-147). M-002's slices landed at 507 and 574
inserted lines against estimates of about 300, so these estimates are scaled
by roughly 1.7 and each slice is kept near 400:

1. **Scanner and prover** (~350): the parser wrapper yielding comments, test
   names (Q13), declared identifiers, strings and JSX text with lines; the
   second prover and its expected-list mechanism; `drift:check` and
   `drift:prove` wired, proved on scanner fixtures.
2. **Signal 4** (~300): E1 to E7 with Q4's precedence and Q5's rule, plants
   and twins.
3. **Signal 2** (~400): reading the checkable entries (Q2), Q3's matcher, G1
   and G2, plants with a fixture `CONTEXT.md`.
4. **Signal 1, paths** (~400): source selection (Q8), path and glob checks
   with Q9's former roots, the exception file with D4, today's seeded entries.
5. **Signal 1, symbols** (~200): D3 as Q10 sets, its plants.
6. **Every landing** (~10): as Q14 decides.

Order 1 → 2 → 3 → 4 → 5 → 6. Slice 3 needs Q2's glossary edit, if (a), first.

## 5. Open Tier-A questions

Recommendations are listed first, as (a). **Full** marks a spec hole or a
cross-module convention, which ADR-0042 ("Ratification by exception") always
sends to the owner. **Digest** marks a digest candidate. "Kept" lines answer a
challenger point the recommendation does not adopt.

**Q1. Doc truth: names that do not exist yet, or no longer** (M-002's Q1).
**Full: spec hole.** Rejected and historical names appear in ordinary prose
(ADR-0027's `castMethod`), not only under Considered options. (a) A ratified
exception file, one line per **file plus name**, with its reason; an
exception that no longer matches a miss is reported as D4, with its own plant,
so the list cannot go stale. (b) As (a), keyed by name alone; shorter, but one
exception silences the name in every document. (c) A marker in the docs, e.g.
"(planned)"; an ADR text change for each. (d) Check only documents dated after
ADR-0042. Recommend (a): every exception is visible, local to one document, and
removed when it stops being needed.

**Q2. Which _Avoid_ entries are checkable** (M-002's Q2). **Full:
cross-module convention.** Comma-splitting makes `primary, original, present
hexagram` three single words and skips them, so `relatingHexagram` passes; it
also drops `inner trigram (in English text)`, though identifiers are English
text, and turns prose lines into entries. By the challenger's parse, 41 entries
are checkable and 88 skipped. (a) The owner marks the checkable forms in
`CONTEXT.md`, e.g. by backticking each one in the _Avoid_ line
(`` `primary hexagram` ``); the script reads only marked forms and prints the
unmarked count. A one-time glossary edit, Tier A. (b) A parser that expands a
shared head noun and ignores `(in English text)`; no glossary edit, but
`index, split point` shows a head noun cannot be told apart by syntax. (c)
M-002's comma rule. (d) A separate list file; a second home for the glossary.
Recommend (a): the owner, not a heuristic, decides what a term forbids in code,
and the glossary stays the one home.

**Q3. Signal 2's matching.** **Full: cross-module convention.** (a) Each
identifier is split at camelCase, `_` and digit boundaries, each string or JSX
text on non-letters, all lowercased; an entry matches a contiguous run of tokens
**within one identifier or one string**, its last word also matching with a
trailing `s`. So `HexagramBinary<Order>` does not match `binary order`. (b) As
(a) without the plural. (c) A case-insensitive substring search over raw text;
it matches across identifiers and word fragments. Recommend (a): no false hits
across tokens, and plurals are the commonest way a term returns.

**Q4. Signal 4's patterns.** **Full: cross-module convention.** (a) One pass
finds each maximal ID token and gives it **one** code, the first that applies
in this order: E1 question IDs, long and short (`Q-M-002-4`, `Q-PH1-3`,
`Q-31`, `M002-11`, `PH1-3`, bare `Q3`); E2 Matter IDs `M-\d{3}`; E3 seam IDs
`S\d{1,2}`; E4 boundary numbers `B\d{1,2}`; E5 `(slice|wave) \d+`; E6
ephemeral paths `docs/(reviews|plans|handoffs|archive)/`,
`docs/legacy-architecture.md`, and the words `MATTERS`, `MINUTES`, `RULINGS`.
All case-sensitive and word-bounded, so `Q-M-002-4` is E1 only. `round <n>` is
dropped: Round is a glossary term. (b) Mutually exclusive patterns, each with
lookarounds; no precedence, but harder to read and keep exclusive. (c) M-002's
sketch, with `round <n>`. Recommend (a): every ID the records mint is covered,
each with one code, and no glossary word is.

**Q5. Are Ruling IDs allowed in overhaul source?** (M-002's Q6). **Full:
spec hole and cross-module convention.** The written rules conflict. "Source
comments cite only ADRs and glossary terms" stands at ADR-0042:113 and :236,
AGENTS.md:123 and `docs/agents/clerk.md`:193. R-013 says code relying on a
Ruling "cites that ADR once it is accepted", which implies the Ruling is cited
until then. ADR-0042 is Accepted, so changing its text takes a Ruling or an
amending ADR (R-004, R-013), not a line-edit. (a) Follow ADR-0042's text: flag
every `R-nnn` in `overhaul/**` comments and test names as E7. Tooling is not
scanned (Q7). (b) Allow an `R-nnn` whose `Folded into:` line, joined across
wraps, starts with `not yet`; flag a Ruling that does not exist (E7) or one
folded elsewhere (E8, cite the ADR or glossary term instead). Needs a Ruling
amending ADR-0042 in four documents, and still reads prose such as
`not yet (overrides ADR-0037 …)`. (c) As (b), keyed on a new structured field
in `RULINGS.md`; a clerk-format change. (d) Allow `R-nnn` everywhere. Recommend
(a): it is the Accepted text, stated in four places, needs no amendment, and
costs nothing today, as overhaul cites no Ruling. Kept over my first draft's
(b): the challenger showed its parse of `Folded into:` is fragile.

**Q6. Report codes.** Folded into Q12.

**Q7. Files each script scans.** **Full: cross-module convention.** (a)
Signal 2: identifiers in `overhaul/*/src/**` and `overhaul/*/tests/**`, strings
in src only; test strings and test names are left out, because a test may spell
an _Avoid_ term to prove it is rejected. Signal 4: `overhaul/**`, src and
tests. Neither scans `scripts/`, `eslint.config.js` or legacy code, so tooling
may cite Rulings and seams (R-158's B-numbered messages, `S17`). (b) The
challenger's: signal 2 also scans test names, not test string literals. (c)
Signal 2 on src only. (d) Signal 4 also scans `scripts/drift/` with Ruling IDs
allowed there. Recommend (a): test identifiers are names like any other; test
names are prose about behaviour.

**Q8. Signal 1's sources.** **Digest** (uncontested, with one fact
corrected). ADR-0042:346 says "ADRs", with no status filter and no rule about
Considered options; both are this proposal's choice. (a) `AGENTS.md`, every ADR
whose status line starts with `Accepted` (so `Accepted (amended by 0022)`
counts), and `docs/design/*.md`, skipping text under Considered options. (b)
Every ADR, any status. (c) Also `CONTEXT.md`, `RULINGS.md` and the manuals.
Recommend (a): Superseded ADRs describe what no longer holds, and rejected
options describe what never held.

**Q9. Paths under a top-level directory that no longer exists.** **Full: spec
hole.** `packages/*` (ADR-0002) is skipped silently today, and every path under
`cli/` and `domain/` will be once legacy is deleted. (a) A ratified list of
former roots (`packages/` today, later `cli/`, `domain/`): paths under
them are not checked, but each is counted per root in the summary. (b) Check
them like any path, so each needs a Q1 exception; ADRs describing legacy would
mint dozens. (c) Skip silently. Recommend (a): history stays readable, and the
gap is printed instead of hidden.

**Q10. What D3 checks.** **Full: spec hole.** (a) camelCase and PascalCase
tokens, optionally with `()`, present if they occur as a word in a tracked
`*.ts`, `*.tsx`, `*.js` or `*.json` file, legacy included while legacy lives.
(b) camelCase only, as drafted; types and ports go unchecked. (c) Present only
in `overhaul/`; every ADR describing legacy then fails. Recommend (a): types
and ports are what ADRs most often name. Cost: a name surviving only in legacy
counts as present until legacy is deleted.

**Q11. Identifiers the code does not own.** **Full: cross-module
convention.** (a) G1 checks declared names only (variables, functions,
parameters, types, members and properties declared in overhaul), not
references; Node and third-party names are not ours, and a re-export is checked
where it is declared. (b) Every identifier token, with an allow-list. Recommend
(a): it checks exactly the names the glossary governs, with no list to keep.

**Q12. Report codes and the prover's key.** **Full: cross-module
convention** (it extends R-158's keying to every signal). (a) D1 to D4, G1, G2,
E1 to E7 (E8 if Q5 picks (b)); each report starts with its code; one code per
finding by Q4's precedence; each expected list keyed by code. (b) Key by script
and fixture path. Recommend (a): one convention across all four signals, and a
plant caught by the wrong check fails.

**Q13. What counts as a test name.** **Full: spec hole.** (a) The first
argument of the call that names the test, where the callee is `describe`, `it`
or `test`, optionally followed by `.skip`, `.only`, `.todo`, `.concurrent`, or
by `.each(...)` or a tagged-template `each` whose result is then called; for a
template literal, its static text is scanned and `${…}` is ignored. (b) Plain
`describe`, `it` and `test` calls only; `it.each(...)('name', …)`, already in
the tree, escapes. Recommend (a): every form vitest offers, each with a plant.

**Q14. "Every landing".** **Full: spec hole.** ADR-0042's table runs signals
1, 2 and 4 on every landing; my first draft left that optional. (a) M-003's
last slice makes `drift:check` a root turbo task (`//#drift:check`) that
`check:all` runs, so every landing runs it as lint does; this ruling is the
owner's request that Tier C needs. (b) Run by the clerk's landing checklist
only. (c) Left to a later Tier-C request. Recommend (a): the table says every
landing, and only a command that fails the landing makes that true.
