# Survey 01 — Casting core (domain/core/src)

Scope: `domain/core/src/{index,random-casting,casting-derivation,manual-validation,line-semantics,crypto-random,sample-casting,types}.ts`, ADR-0006, ADR-0011, ADR-0017, `docs/agents/casting-invariants.md`, plus the call sites of these modules in `cli/casting-ui`, `domain/consultation-file`, `cli/shell` (read only to answer Q3). Nothing under `consultations/` was opened.

Legend: **[F]** observed fact (cited), **[I]** my inference / recommendation.

---

## 1. Is the four-operations pipeline pure, total, well-typed?

**Pure: yes. Total: no. Well-typed: mostly, at the line level; not at all above it.**

- [F] The four operations are four pure object→object functions composed in `fourOperations` (`domain/core/src/index.ts:59-173`), each tagged with its 繫辭 line. No I/O, no mutation (all `slice`/spread).
- [F] `performCast(state, pick)` is the algorithm of record (`index.ts:211-282`; ADR-0006:10-18). `LineState` is a phase-discriminated union (`types.ts:222-245`), `NextPhase<P>` binds output phase to input phase (`index.ts:205-209`), and `AdvanceableLineState` removes `'3rd-cast'` from the input domain (`types.ts:250-253`).
- [F] It is **partial**: it throws `RangeError` for an illegal pick (`casting-derivation.ts:63-73`, called at `index.ts:230`), `TypeError` if the final count/4 is not a `Line` (`index.ts:268-269`, `types.ts:5-11`), and `Error` on a bypassed 3rd-cast (`index.ts:218-222`). Replay relies on catching throws as a control-flow signal (`domain/consultation-file/src/casting-replay.ts:26-31`).
- [F] Type holes: four `as Extract<…NextPhase<P>>` casts (`index.ts:253,265,279`), tuple casts on `rounds` (`index.ts:260,272`), and `sortingRemainder` cast to `1|2|3` while it is `0` for multiples of four (`index.ts:25`). `pick`, `recordedMax`, stalk counts are bare `number`.
- [F] Stalks are modelled as arrays of 49 identity integers (`index.ts:52-57`), but only `.length` is ever consumed (`casting-derivation.ts:21-22`; line = `unpartedStalks.length / 4`, `index.ts:268`). `suspended` accumulates every set-aside stalk but is never read for any outcome.
- [F] Dead defaults in signatures (`unpartedStalks = []`, `partStalksAtIndex = 0`, `index.ts:61-62,76-77,92-94,110-112`) contradict the required types.

### Invariants and where they are enforced

| # | Invariant | Enforcement |
|---|---|---|
| I1 | 50 stalks, 49 used (大衍之數五十，其用四十有九) | Constant only (`index.ts:52-57`) |
| I2 | Pick is an integer in `[1, recordedMax − 1]` (never-zero remainder, never empty right heap) | **Runtime** `assertSelectablePick` in `performCast` (`casting-derivation.ts:63-73`, `index.ts:230`); pre-clamps in RNG (`random-casting.ts:28-31`), Inquirer (`cli/casting-ui/src/interactive-flow.ts:26`), slider (`cli/casting-ui/src/viewer.tsx:261`) |
| I3 | `recordedMax = unparted − 1` | Single function `recordedMaxForUnparted` (`casting-derivation.ts:21-22`). **Not** checked on load — replay only uses `pick` (`casting-replay.ts:36-53`), so a stored `recordedMax` that disagrees with the derived one is accepted (no `recordedMax` reference in `frontmatter.ts`/replay; grep). Convention only. |
| I4 | Remainder ∈ 1..4 (揲之以四, a multiple of four leaves 4) | Structural in `sortIntoFours` + `slice(-1)` (`index.ts:23-49,120-124`); display mirror `neverZeroMod4` (`casting-derivation.ts:10`) — **two encodings of the same rule** |
| I5 | Exactly 3 casts per line; cannot step a resolved line | **Types** (`types.ts:222-253`) + runtime tripwire (`index.ts:218`) |
| I6 | Line ∈ {6,7,8,9} = remaining/4 after 3 casts | **Runtime** `assertIsLine` (`index.ts:268-269`) — not provable from types |
| I7 | Exactly 6 lines / 18 casts per hexagram, bottom-first | Tuple types `Hexagram`, `CastingRecord` (`types.ts:13,102-109`); sequencing itself lives in adapters (see Q3) |
| I8 | Conservation per cast: `1 + remL + remR + 4·piles = stalks` | Implicit in the pipeline; asserted in display reconstruction doc only (`casting-derivation.ts:111-114`) and in manual validator (`manual-validation.ts:71-80`) |
| I9 | Set-aside sum ∈ {5,9} on cast 1, {4,8} on casts 2–3 | Manual validator only, hard-coded literals (`manual-validation.ts:83-87`); for other flows it is an emergent property, untested in core source |
| I10 | Manual remainder ≤ 4 | **UI only** (`cli/casting-ui/src/manual-prompt.tsx:231-232`). `validateManualSplit` accepts e.g. `remL=5` when conservation and the set-aside sum still balance (`manual-validation.ts:61-88`). Convention only at the domain level. |
| I11 | Manual pick derived from left heap | `manual-validation.ts:64,92-95` |
| I12 | Moving lines 6/9 → 7/8 | Total table `EMERGING_LINE ... satisfies Record<Line, Line>` (`line-semantics.ts:71-84`) |

---

## 2. Is randomness an injected port?

**No — hard-wired.**

- [F] `random-casting.ts:1` imports `randomInt` from `node:crypto` and calls it directly (`:30`). No RNG parameter anywhere in the module.
- [F] `crypto-random.ts:1,11-12` likewise.
- [F] ADR-0006:74 claims "The injected-RNG test override contract is preserved across the rename", but `random-casting.ts` has no injection point and `domain/core/tests/random-casting.test.ts` has no mock — the claim is stale. The only injected RNG in the repo is in the CLI banner (`cli/shell/src/banner-state.ts:17,46`).
- [F] The ESLint domain boundary explicitly **permits** `node:` builtins in `domain/**` (`domain/core/tests/eslint-domain-boundary.test.ts:57-66`).
- [F] Slow statistical test cannot seed — it relies on 1,000,000 real draws (CLAUDE.md, ADR-0013).

Node-only APIs reachable from core (`domain/core/src`):
1. `node:crypto.randomInt` — `random-casting.ts:1`
2. `node:crypto.randomInt` — `crypto-random.ts:1`

That is the complete list for `domain/core`. (Adjacent domain package, outside my slice but on the same path to a PWA: `domain/consultation-file/src/file.ts:1-3` uses `node:fs/promises`, `node:path`, `node:process`.) Also, `hexagrams.json`/`trigrams.json` are imported via `resolveJsonModule` — bundler-dependent but not Node-only.

[I] A PWA would need `crypto.getRandomValues` (Web Crypto, also available in Node ≥ 19 as `globalThis.crypto`); a REST adapter wants deterministic seeding for tests. Define a port such as `type PickSource = (range: { min: 1; max: number }) => number` (or `UniformInt`) and make `castRandomly(source)` take it. The Web Crypto implementation can sit in core itself (it is portable), removing every `node:` import.

---

## 3. Three adapters around one command, or re-implementation?

**Half-way.** The per-cast step (`performCast`) is genuinely shared; everything above one line is re-implemented per flow.

Shared correctly:
- [F] `selectablePickMax` is imported, not hand-rolled, everywhere a pick is offered: `random-casting.ts:30`, `interactive-flow.ts:26`, `viewer.tsx:261`. The grep for literal `recordedMax - 1` / `max - 1` across `cli/*/src`, `apps/cli/src`, `domain/*/src` finds no copies outside `casting-derivation.ts` itself (only unrelated list-index arithmetic). The ADR-0006 centralisation (ADR-0006:51-57) held.
- [F] All three Ink flows commit through one reducer action, `splitCommitted` → `performCast` (`cli/casting-ui/src/viewer-flow.ts:184-246`); manual≡interactive byte-identity is test-locked (ADR-0011:50-53).

Re-implemented domain knowledge:
- [F] **The 18-division sequencing (十有八變: 6 lines × 3 casts, starting from 49, threading `unparted`)** is written four separate times:
  - `random-casting.ts:33-91` (generator-of-generators)
  - `cli/casting-ui/src/interactive-flow.ts:44-71` + `getHexagramViaInteraction` (plain Inquirer)
  - `domain/consultation-file/src/casting-replay.ts:35-57` (replay)
  - `cli/casting-ui/src/viewer-flow.ts:184-246` (`lineIndex`/`castIndex` counters, `completedLines`, reset to `initialLineState` after 3rd cast)
- [F] **Pairing a pick with its `recordedMax`** (`{ pick, recordedMax: recordedMaxFor(before) }`) is rebuilt in `random-casting.ts:41-76`, `interactive-flow.ts:19-36`, `viewer-flow.ts:193-195`.
- [F] **Random viewer flow runs the algorithm twice**: `generateRandomConsultation()` computes the full hexagram up front, then the reducer replays every pick through `performCast` again (`viewer-flow.ts:14-26,170-178`); `playbackSkipped` copies the plan's hexagram straight in, bypassing `performCast` (`viewer-flow.ts:291-324`). The display reads `recordedMax` from the plan rather than from `lineState` (`viewer.tsx:244-247`).
- [F] **Manual "next unparted" is computed by calling `performCast` a second time** for display, with a `line * 4` special case for the 3rd cast (`manual-prompt.tsx:332-334`).
- [F] **Set-aside sums {5,9}/{4,8}** are hard-coded in the manual validator (`manual-validation.ts:84-86`); they are an emergent consequence of the pipeline, not derived from it.
- [F] **Rewind (`lineRewound`)** — a domain operation ("discard the current/previous line") — lives in the CLI reducer (`viewer-flow.ts:247-289`).
- [F] Remainder ∈ 1..4 for manual input is enforced only in the UI (`manual-prompt.tsx:231-232`).

[I] The three flows differ only in **where a pick comes from** (RNG, a human selecting from a range, a human transcribing four counts). That is a single command, `CommitDivision(pick)`, plus one port per source. The 6×3 orchestrator, the rewind, and the `recordedMax` pairing belong in core; `viewer-flow.ts` should keep only UI state (buffers, query editing, playback animation).

---

## 4. Generator vs. a pure fold over `SplitRecord[]`

[F] The generator is already demoted to a compatibility wrapper (`index.ts:284-317`; ADR-0006:16-18,70-71). Remaining generator consumers: `random-casting.ts:48`, `interactive-flow.ts:46`, `casting-replay.ts:44`. The live Ink flow does not use it. Driving it costs a `next()`/`assertIsFourOperationsResult` dance at every call site (`random-casting.ts:49-67`, `interactive-flow.ts:52-64`) and `done` checks (`casting-replay.ts:49-54`), because `Generator<Yield, Return, Next>` erases the per-step shape.

[F] Rewind already works by discarding state and recasting (`viewer-flow.ts:280-283`), i.e. it already treats the pick list as the source of truth.

**Recommendation [I]: delete `makeLineGenerator`; make the event-sourced fold the aggregate.**

- The event is `DivisionMade { pick }` (≙ `SplitRecord` minus the derived `recordedMax`). A `Casting` is `readonly DivisionMade[]` with length 0..18.
- Core exposes:
  - `castingState(picks: readonly Pick[]): CastingState` = `picks.reduce(applyDivision, initialCasting)` — pure, total (returns `Result` or a branded rejection), O(18).
  - `availablePicks(state): { min: 1, max: number } | 'complete'` — the single home for `selectablePickMax`.
  - `commitDivision(state, pick): Result<CastingState, InvalidPick>` — replaces throw.
  - `rewindLine(picks)` = `picks.slice(0, lineStart(picks.length))` — undo becomes array truncation, no reducer action needed.
  - `replay(picks)` = `castingState(picks)`; `castingReplaysTo` collapses to an equality check.
- `recordedMax` becomes a **projection**, not persisted input: compute it in the fold and expose it on the state. If the file format must keep it (ADR-0008), validate it against the fold on load instead of ignoring it (closes the I3 gap).
- The per-cast state should be **counts**, not stalk arrays: `{ unparted: number, setAside: number }`. `fourOperations` on integers is a five-line function using `neverZeroMod4`, which unifies the two encodings of I4. Keep the 四營 names as the step names for fidelity.
- Keep `LineState`'s phase typing only if it pays its way. With a fold over an index 0..17, `lineIndex = ⌊i/3⌋`, `castIndex = i mod 3` are derived; the conditional-type casts in `performCast` disappear.

Why this suits the target: a stateless REST engine receives `picks[]` and returns the derived state (no server session, HATEOAS links = the legal next picks); a PWA stores `picks[]` in IndexedDB and rehydrates by folding; Markdown/Typst persist the same array. Random, slider, and manual flows become producers of `Pick`.

---

## 5. Ubiquitous language proposal

### Terms (with a single canonical word each)

| Proposed term | Classical | Replaces in code |
|---|---|---|
| **Stalk bundle** (49 in use, 1 set apart) | 大衍之數 | `principalNumberOfDerivation`, `allStalks`, `stalksBeforeParting` (`index.ts:52-57`) |
| **Division** (one change; 18 per hexagram) | 變 | four synonyms in use: *cast*, *round*, *split*, *operation result* — `castIndex`, `rounds`/`FourOperationsResult`, `SplitRecord`, `'1st-cast'` |
| **Four operations** | 四營 | keep |
| **Part** / **pick** (the left-heap size) | 分而為二 | `partStalksAtIndex`, `pick`, "split index" (`interactive-flow.ts:19`) |
| **Hung stalk** | 掛一 | `suspendedFromRight`, "held" (`casting-derivation.ts:96-97`) |
| **Count by fours**, **remainder** (1..4) | 揲之以四 | keep |
| **Set aside** (remainders + hung stalk) | 歸奇於扐 | `suspended`, `suspendedFromNextRound` — currently conflated with 掛一 (one word for two concepts) |
| **Remaining stalks** | — | `unparted`, `unpartedStalks` |
| **Division ceiling** (`remaining − 1`) | — | `recordedMax` |
| **Pick range** (`1..ceiling−1`) | — | `selectablePickMax`, `reachablePickMax` (`viewer.tsx:261`) |
| **Line** (6/7/8/9), **moving line**, **standing / emerging hexagram** | 爻, 變爻, 本卦/之卦 | `getEmergingHexagram` OK; CLI tab names already say Standing/Emerging |
| **Casting** (the ordered list of 18 divisions) | 十有八變 | `CastingRecord`, `PartialCastingRecord` |
| **Pick source** (port) | — | none today |

### Value objects
`Pick` (branded integer, constructed only via `availablePicks`), `StalkCount`, `Remainder` (1|2|3|4), `Division { pick }` (+ derived `DivisionBreakdown` = today's `DerivedSplit`), `Line`, `LinePosition` (1..6, today `LineIndex` 0..5), `Hexagram`, `Casting` (≤18 divisions), `ManualTally { leftPiles, leftRemainder, rightPiles, rightRemainder }`.

### Commands
`BeginCasting`, `MakeDivision(pick)`, `TallyDivision(manualTally)` (validates then delegates to `MakeDivision`), `RewindLine`, `CastAtRandom(pickSource)`.

### Domain events (past tense)
`CastingBegun`, `DivisionMade { pick }`, `LineCompleted { position, line }`, `LineRewound { position }`, `HexagramCompleted { standing, emerging? }`, `TallyRejected { reason }` (manual: incomplete / zero-remainder / remainder-too-large / not-conserved / bad-set-aside-sum).

### Conflicts / gaps with CONTEXT.md
- [F] CONTEXT.md defines **no casting vocabulary at all** (`CONTEXT.md:13-51` covers Consultation, Unreadable file, Query, Readout, Viewer only). Every term above is undocumented.
- [F] CONTEXT.md defines **Viewer** as the owner of the divination flow state machine (`CONTEXT.md:45-51`). That puts a domain process (line sequencing, rewind) inside a UI noun — in a hexagonal model this is the conflict to resolve; the flow should belong to a core `Casting` aggregate and the Viewer becomes an adapter.
- [F] CONTEXT.md bans "session" (`CONTEXT.md:21-22`) but "reading" is also banned while `generateRandomConsultation` sits beside `generateRandomHexagram`, and ADRs freely use "reading" (ADR-0011:6,50).
- [F] `suspended` means 掛一 in `suspendOneFromTheRight` (`index.ts:75`) and "everything set aside" in `LineState.suspended` (`types.ts:226`) and in the manual "suspended sum" (`manual-validation.ts:81-87`, which actually measures 歸奇 + 掛一).
- [F] Phase names `'0th-cast'…'3rd-cast'` (`types.ts:224-242`) mean "number of divisions done", while `castIndex` 0..2 (`viewer-flow.ts:47`) and the UI "Cast C/3" mean "which division is in progress" — off-by-one vocabularies for the same thing.
- [F] Standing hexagram has no named function (`getEmergingHexagram` exists, `line-semantics.ts:82`); the user-facing tabs use "Standing", the code mostly `hexagram`.

---

## 6. Rating

**Code quality: 4/5.** Small, pure, heavily commented with rationale; one authority for the never-zero rule; strong phase typing; rationale captured in ADRs with measured consequences (ADR-0006:122-189). Points off for: throw-based partiality used as control flow in replay; casts that defeat the conditional types; stalk-identity arrays where counts suffice; dead/stale code (`generateRandomLines` tallies impossible values 5 and 10, `random-casting.ts:151`; `generateRandomHexagram(s)`, `makeRandomHexagramGenerator`, `sampleCastingFor` have no production caller — grep shows only their defining file; `makeLineGenerator` kept "for back-compat" in a private monorepo); a stale ADR claim about RNG injection (ADR-0006:74).

**Conceptual integrity: 3/5.** The *line* level is one clear idea (`performCast`). The *hexagram/casting* level has no home in core: the 18-division sequence, rewind, and pick↔ceiling pairing are re-expressed in four places across three packages, and the canonical live implementation sits in a CLI reducer. Key invariants are split between domain and UI (remainder ≤ 4, I10) or not checked at all (persisted `recordedMax`, I3). Vocabulary drifts (cast/round/split/division; suspended for two things), and CONTEXT.md, the stated glossary, omits the whole sub-domain.

### Distillable into the oracle core as-is
`line-semantics.ts` (pure, total, portable — keep nearly verbatim), `deriveSplit`/`neverZeroMod4`/`selectablePickMax`/`assertSelectablePick` (`casting-derivation.ts`), `validateManualSplit` (add remainder ≤ 4), the `Line`/`Hexagram`/`CastingRecord` vocabulary, `sampleCastingFor` (useful as an inverse for REST examples).

### Needs reshaping before it fits
`performCast`/`LineState` (→ count-based fold returning `Result`), `random-casting.ts` (→ takes a `PickSource` port; drop `node:crypto`), `makeLineGenerator` (→ delete), the 6×3 orchestration + rewind in `viewer-flow.ts` (→ lift into core), `crypto-random.ts` (→ belongs in an adapter or switch to Web Crypto; it serves only the CLI banner).
