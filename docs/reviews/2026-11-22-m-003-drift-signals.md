# M-003 drift signals 1, 2 and 4: design, Acceptance and Free to choose

Date: 2026-11-22. Status: copilot draft for M-003 (ADR-0042, "Roles"); ephemeral.
It binds nothing until the owner rules on it (R-147, as R-140 set for M-002).

**What is being decided.** How drift signals 1, 2 and 4 (ADR-0042, "Drift
signals") are built: each script's design and output, the plants added to
`drift:prove`, a knife-edge Acceptance, a Free to choose, the slicing, and the
vocabulary each script checks (section 5). M-002's proposal
(`docs/reviews/2026-11-21-m-002-boundary-rules.md`, §1) sketched these three
signals; this draft refines that sketch and carries its Q1, Q2 and Q6.

**Facts checked in the tree (2026-11-22).**

- `typescript` 6.0.3 and `tsx` are installed at the root, so the scripts can
  tokenize source with the TypeScript scanner (comments, identifiers, string
  literals) at no new dependency cost.
- `scripts/drift/` holds signal 3's prover (`prove-boundaries.ts`), keyed on
  B-numbers that start each message (R-158), with an expected list fixed in
  `fixtures/signal-3/expected.ts`. `drift:prove` runs only that prover today;
  `drift:check` does not exist.
- `overhaul/*` (six packages, 80 `.ts`/`.tsx` files): no `R-nnn`, `M-nnn`,
  `Q-…`, seam ID, B-number, `slice|wave|round <n>` label or ephemeral path in
  any file, and no multi-word _Avoid_ entry (`changing line`, `hexagram
number`, `Wen Wang order`…) in any identifier or string.
- `scripts/drift/*.ts` cites Rulings 15 times (e.g. "R-151, R-179"), and
  `eslint.config.js` names the legacy seam `S17` (ADR-0004/0005). Both are
  tooling, outside `overhaul/`.
- `CONTEXT.md` has 52 `_Avoid_:` lines. Six wrap onto a second line; one
  (line 92) is prose with a `;`, not a comma list; three carry Chinese
  terms (`旁通`, `變爻`, `主爻`), each qualified. `Casting` and `Round` are
  glossary terms that also appear in other terms' _Avoid_ lists (`casting`,
  `cast (as a noun for a Round)`).
- ADR-0040 and ADR-0041 are `Superseded by ADR-0042`. ADR-0042 still names
  `docs/manual/cli.md` and `docs/manual/rest.md`, which do not exist yet;
  `docs/manual/` does not exist. ADR-0019 names `cli/cli` as a predecessor
  location, by design gone.

## 1. Each signal's design

All three scripts share one entry point, `pnpm drift:check`, which runs them in
turn over the real tree and exits 1 if any reports. Each report is one line,
`<file>:<line> <code> <message>`, the message starting with its code (section 5,
Q6) and naming the ADR or Ruling it encodes. A clean run prints one summary line
per signal, with counts of files scanned and, for signal 2, entries skipped.
Each script also takes an alternative root, which is how `drift:prove` feeds it
plants.

**Signal 1, doc truth.** _Scans_ `AGENTS.md`, every ADR whose status line is
`Accepted`, and `docs/design/*.md` (Q8). Superseded and Proposed ADRs are
skipped, and so is any text under a **Considered options** heading, since
rejected names do not exist by design. Candidates are backticked tokens only:

- a **path** (D1) is a token whose first segment is an entry of the repo root;
  it must exist. A **glob** (D2) must match at least one file. Tokens with
  `<…>` placeholders are templates and skipped. The root test keeps URL routes,
  lint rule names and package-relative paths out.
- a **symbol** (D3) is a camelCase token, optionally with `()`; it must occur
  as a word in a tracked `*.ts`, `*.tsx`, `*.js` or `*.json` file.

_Flags_ any candidate that resolves to nothing and is not excepted under Q1.
_Legacy:_ it checks legacy paths that ADRs name, and edits nothing.

**Signal 2, glossary conformance.** _Reads_ `CONTEXT.md`'s `_Avoid_:` lines at
run time, joined across wrapped lines, so the glossary stays the one home of
the list. Which entries are checkable is Q2. _Scans_ `overhaul/*/src/**`
`.ts`/`.tsx` (Q7): every identifier (G1) and every string literal or template
text (G2), tokenized as Q3 sets. Comments are not scanned: ADR-0042's table
names "identifiers or UI strings", and a comment may need to say what a term
is not. _Flags_ a checkable entry whose words appear as a contiguous run of
tokens. _Output_ adds the skipped-entry count, so the unchecked part of the
glossary is visible. _Legacy:_ not scanned (R-003).

**Signal 4, ephemeral leakage.** _Scans_ every comment, and the first argument
of `describe`, `it` and `test`, in `overhaul/**/*.{ts,tsx}`, src and tests (Q7).
_Flags_ the patterns Q4 fixes (question, Matter and seam IDs, boundary numbers,
`slice|wave <n>` labels, ephemeral paths and record names), each its own code
E1 to E6, and Ruling IDs as Q5 decides. _Legacy:_ not scanned; legacy seam
and wave IDs are hygiene deferred by R-003.

**Plants in `drift:prove`.** `scripts/drift/fixtures/signal-1/`, `signal-2/`
and `signal-4/` each hold one planted violation per code, a clean twin beside
each, and an `expected.ts` keyed by code, as `fixtures/signal-3/` is. The
signal-1 plants form a small fake root (an `AGENTS.md`, one Accepted and one
Superseded ADR, a design model, a Considered-options section) so the source
selection itself is proved. The signal-2 plants come with a fixture
`CONTEXT.md`, so the run-time parse is proved, including a wrapped line and a
skipped single word. `drift:prove` then runs both provers and exits 0 only if
both do. Plants sit outside `overhaul/` and the real docs, so `drift:check`
never sees them.

## 2. Knife-edge Acceptance

```bash
pnpm lint:check && pnpm drift:check && pnpm drift:prove
```

As ruled in R-147.

- `drift:check` exits 0 on the real tree, which proves no false positive today
  (with Q1's exceptions in place).
- `drift:prove` exits 0 only if **every plant is reported by exactly its own
  code, and every clean twin by none**, for D1 to D3, G1 and G2, E1 to E6 (and
  the Ruling-ID cases Q5 adds), on top of B1 to B12 and the Oracle-subpath
  analysis as today. Every code appears in an expected list, so a deleted plant
  fails the command instead of passing silently.
- `drift:prove` leaves the working tree unchanged, as R-184 requires today.

## 3. Draft Free to choose (Tier B, for the implementer)

- File names and layout under `scripts/drift/`, including whether the new
  prover is a second file or folded into `prove-boundaries.ts`.
- TypeScript run by `tsx`; the TypeScript scanner or compiler API for tokens.
- The internal structure of the scripts, the shared scanner and the prover.
- The wording of reports and summaries, within "starts with its code and names
  the ADR or Ruling it encodes" (as R-158 narrowed R-157(9)).
- How the alternative root is passed (flag or argument).
- The order of the slices, if a later one unblocks an earlier one.

Not free: what each signal scans and flags, the checkable entries, the
matching and ID patterns of section 5, the codes, the exception list's
contents, Acceptance, new dependencies.

## 4. Slicing

Phase 2's budget gives M-003 its own 60-touch cap (R-147). Four slices, each
under ~400 lines with plants and twins:

1. **Shared scanner and signal 4** (~300): the TypeScript-scanner wrapper that
   yields comments, test names, identifiers and strings with lines; signal 4
   with E1 to E6 and Q5's Ruling-ID rule; `drift:check` with only signal 4;
   the second prover with its signal-4 plants; `drift:prove` running both.
2. **Signal 2** (~250): the `_Avoid_` parser (wrapped lines, Q2's filter, the
   skipped count), Q3's tokenizer and matcher, G1 and G2 plants with a fixture
   `CONTEXT.md`.
3. **Signal 1** (~350): source selection (status lines, Considered options),
   backtick candidates, path, glob and symbol checks, Q1's exception file, D1
   to D3 plants on a fake root.
4. **`drift:check` joins `check:all`** (~10): Tier C, only on the owner's
   request, so every landing runs it as ADR-0042's table says.

Order 1 → 2 → 3: signal 4 needs only the scanner; signal 1 is largest and
needs Q1 ratified with its seeded list.

## 5. Open Tier-A questions

Recommendations are listed first, as (a). **Full** marks a spec hole or a
cross-module convention, which ADR-0042 ("Ratification by exception") always
sends to the owner as a question. **Digest** marks a candidate for the digest,
unless the challenger contests it.

**Q1. Doc truth: names that do not exist yet, or no longer** (M-002's Q1).
**Full: spec hole** — ADR-0042 defines signal 1 but not how a planned or
historical name is treated. Today: `docs/manual/cli.md`, `docs/manual/rest.md`
(ADR-0042, phase gates not yet written) and `cli/cli` (ADR-0019, a former
location). (a) A ratified exception file under `scripts/drift/`, one line per
name with its reason and the ADR or Ruling that names it, seeded with these
three; an entry whose name later exists is itself reported, so the list
shrinks. (b) A marker in the docs, e.g. "(planned)", which the script honours;
an ADR text change for each. (c) Check only documents dated after ADR-0042.
Recommend (a): it keeps ADRs unedited, every exception visible in one place,
and the self-reporting keeps the list from going stale; (c) would leave ADR-0019
to ADR-0039 unchecked.

**Q2. Which _Avoid_ entries are checkable** (M-002's Q2). **Full:
cross-module convention** — it fixes which names every module may use (ADR-0042,
"A wider Free to choose", test 4). (a) Entries of two or more words with no
parenthesised qualifier, after splitting on `,` and `;`, read from `CONTEXT.md`
at run time; single words (`index`, `casting`, `path`) and qualified entries
are skipped and counted; Chinese entries are all qualified today and so
skipped. (b) The owner marks checkable entries in `CONTEXT.md`; a glossary edit
per term. (c) A separate list file; a second home for the glossary's knowledge.
Recommend (a): no second home, and the printed count states the gap. Its cost:
single words such as `reading` or `settings` stay unchecked and are left to
review.

**Q3. Signal 2's matching** (the regex scope, as the challenger raised it).
**Full: cross-module convention.** (a) Identifiers split at camelCase, `_`
and digit boundaries, string literals and template text split on non-letters,
all lowercased; an entry matches a contiguous run of tokens, its last word also
matching with a trailing `s` (`changingLines`); comments not scanned. (b) As
(a) without the plural. (c) A case-insensitive substring search over raw text,
which needs no tokenizer but matches across word boundaries (`hexagramnumber`
in a longer word, `old line` in `bold lines`). Recommend (a): token runs give no
false hits on word fragments, and plurals are the commonest way a banned term
reappears.

**Q4. Signal 4's patterns** (the regex scope). **Full: cross-module
convention** — it fixes what every module's comments and test names may
contain. (a) E1 question IDs `Q-[A-Z0-9]+(-[A-Z0-9]+)*-\d+` (`Q-M-002-4`,
`Q-PH1-3`, `Q-ADR41-1`); E2 Matter IDs `M-\d{3}`; E3 seam IDs `S\d{1,2}`; E4
boundary numbers `B\d{1,2}`, defined only in M-002's proposal; E5 labels
`(slice|wave) \d+`; E6 ephemeral paths `docs/(reviews|plans|archive)/`,
`docs/legacy-architecture.md`, and the words `MATTERS`, `MINUTES`, `RULINGS`.
All are case-sensitive and word-bounded. `round <n>` is **dropped** from
M-002's sketch: Round is a glossary term, and a test named "round 3" is
domain language. (b) M-002's sketch as drafted, with `round <n>` and without
E4. (c) Only E1, E2 and E6. Recommend (a): every ID the process mints is
covered, and no glossary word is.

**Q5. Are Ruling IDs ephemeral for signal 4?** (M-002's Q6). **Full: spec
hole and cross-module convention.** The library conflicts: ADR-0042 says source
comments cite "ADRs and glossary terms only", yet lists `RULINGS.md` as
authoritative and a Ruling as licensing code; R-013 says code relying on a
Ruling "cites that ADR once it is accepted", which implies the Ruling is cited
until then. (a) Rulings are authoritative, not ephemeral: an `R-nnn` in
`overhaul/**` is allowed if it names a Ruling in `RULINGS.md` whose `Folded
into:` line names no ADR; it is flagged if no such Ruling exists, or if it is
folded into an ADR (cite that ADR instead, as R-013 directs). Needs a line-edit
to ADR-0042 adding "and Rulings not yet folded into an ADR". (b) Flag every
`R-nnn` in `overhaul/**` comments and test names, allow it in tooling (M-002's
recommendation, ADR-0042's letter); code relying on an unfolded Ruling then
cannot name its source. (c) Allow `R-nnn` everywhere, unchecked. Recommend (a):
it follows R-013, keeps a rule's source traceable, and turns "fold soon" into a
check, since folding a Ruling makes stale citations fail.

**Q6. Report codes and the prover's key.** **Digest.** (a) Codes D1 to D3,
G1, G2, E1 to E6 (and E7 for Q5's Ruling cases); each report starts with its
code, and each expected list is keyed by code, as R-158 set for B-numbers. (b)
Key by script name and fixture path. Recommend (a): one convention across all
four signals, and a plant caught by the wrong check fails.

**Q7. Files each script scans.** **Digest.** (a) Signal 2: `overhaul/*/src/**`
only, since tests may spell an _Avoid_ term to prove it is rejected; signal 4:
`overhaul/**`, src and tests; neither scans `scripts/`, `eslint.config.js` or
legacy packages, where naming a rule's origin is the point or hygiene is
deferred (R-003). (b) Both also scan `scripts/drift/` and the ESLint config.
Recommend (a): the scripts hold the code ADR-0042 governs and leave tooling,
whose comments cite Rulings by design, alone.

**Q8. Signal 1's sources.** **Digest.** (a) As ADR-0042's table: `AGENTS.md`,
Accepted ADRs and `docs/design/*.md`, skipping Considered options. (b) Also
`CONTEXT.md`, `RULINGS.md` and, once they exist, `docs/manual/`. Recommend (a):
it is the table's text; `RULINGS.md` records past answers that name then-current
paths, and would need its own exception regime.
