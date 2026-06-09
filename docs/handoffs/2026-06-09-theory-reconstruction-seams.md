# Handoff — Theory-Reconstruction Seam Inventory (2026-06-09)

Status: **Plan / handoff for brainstorming.** Not an ADR, not a decision. This
file inventories findings from a k=5 zero-knowledge theory reconstruction
(conformance mode) so a fresh session can brainstorm and plan fixes seam by seam.

> House rule note: `docs/adr/README.md` says point-in-time plans are not kept long
> term. This doc is a working handoff; once its seams are resolved, fold any lasting
> decisions into ADRs and prune this file.

## What was done

- Ran 5 independent cold reads of the code **only** (no ADRs / CLAUDE.md /
  AGENTS.md / comments-as-truth), each producing a tension report.
- Loaded the intended theory (all 21 ADRs + `docs/adr/README.md` + CLAUDE.md +
  AGENTS.md + `docs/agents/casting-invariants.md` + `CONTEXT.md`) and diffed.
- Verified the one load-bearing code-vs-doc question directly (ADR-0021 status).

The full narrative report (coverage, prior-contamination, de-facto theory,
variance-across-runs) lives in the conversation that produced this file. This doc
is the **itemized seam ledger** distilled from it — the input to planning, not a
re-statement of the ADRs (reference them by path).

## Headline

Conformance is **tight**: 5 readers who never saw the ADRs reconstructed the
intended theory (algorithm, never-zero invariant, shared IR, file format,
domain/CLI boundary, absence reasons, manual-validation tier order) almost
verbatim. The divergences are **not "code is wrong against intent."** They are
spots where the code's *words* (comments, ADR prose) claim more structural
enforcement than the *mechanism* provides, plus one genuinely stale ADR status
note. Variance is low on the domain core and concentrated at three boundaries:
deriveSplit↔generator, the visibility flag's "single owner" claim, and the
`casting`/`castingAbsence` exclusivity.

## Direction legend

- **DOC-STALE** — code is right; a doc/comment describes a prior state.
- **OVERCLAIM** — code matches intent, but prose asserts stronger enforcement
  than the mechanism (a comment/type/exported artifact would close the gap).
- **SOFTNESS** — an invariant enforced at runtime/by-discipline that *could* be
  lifted to the type system or a single structural artifact.
- **LEGIBILITY** — code is correct but underdetermines its own theory; two
  competent readers diverged. Fix is clarity (comment/name/test), not behavior.
- **ACCEPTED** — intentional and documented; listed only because it is a real
  self-consistency seam in the code.

## Seam ledger

| ID | Seam | Location | Direction | k/5 | Cheap? |
|----|------|----------|-----------|-----|--------|
| S1 | ADR-0021 says "implementation pending" but it shipped | `docs/adr/0021-rendered-width-single-home.md` (body vs its own "Where it's enforced") | DOC-STALE | verified Phase B | yes |
| S2 | "Sole owner of section→medium visibility" is a comment + shared flag, read by 3 consumers | `domain/consultation-view/src/build-view.ts:229–256`; `cli/readout/src/serialize-ansi.ts`; `domain/consultation-file/src/serialize-markdown.ts` | OVERCLAIM / SOFTNESS | 4 | medium |
| S3 | `casting`/`castingAbsence` exclusivity enforced only at runtime, not in the type | `domain/consultation-file/src/frontmatter.ts:82–124`; `file.ts:55–85`; `domain/core/src/types.ts` (`CastingAbsenceReason`) | SOFTNESS | 3 | medium |
| S4 | "Single runtime enforcer" of the pick invariant vs observable layered enforcement | `domain/core/src/manual-validation.ts:19–22`; `casting-derivation.ts:13–25`; `index.ts` (`assertSelectablePick` in `performCast`) | OVERCLAIM | 3 | yes (doc) |
| S5 | `combinedPiles` "is the line value" (comment) vs `unpartedStalks.length/4` (behavior) | `domain/core/src/casting-derivation.ts:80` vs `domain/core/src/index.ts:265` | LEGIBILITY | 2 (disagreed) | yes |
| S6 | Bottom-first↔top-first flip implemented in two shapes | `domain/core/src/types.ts` (`toTopFirst`/`POSITIONS_TOP_FIRST`) vs `frontmatter.ts` (`castingToYaml`/`hexagramToYaml`) | SOFTNESS / latent-dup | 2 (disagreed) | medium |
| S7 | Cycle order `[7,9,8,6]` framed as "orthogonal to polarity" while grouped by polarity | `domain/core/src/line-semantics.ts:84–108` | LEGIBILITY | 2 | yes |
| S8 | Dual `Line` vocabulary in one package (numeric vs symbolic digit) | `domain/core/src/types.ts` (`Line=6\|7\|8\|9`) vs `domain/core/src/models/foundation.ts` (`Line=Yang\|Yin='1'\|'2'`) | LEGIBILITY / naming | 1 (coverage-gated) | yes |
| S9 | Slider has no internal pick clamp; relies on caller threading `selectablePickMax` | `cli/casting-ui/src/bouncing-slider-store.ts` (caller: `viewer.tsx`) | SOFTNESS | 1 | medium |
| S10 | "Medium-neutral" IR pre-computes ledger geometry (ANSI-shaped) | `domain/consultation-view/src/ir.ts`, `build-view.ts` | LEGIBILITY / naming | 1 | low value |
| S11 | Serializer's silent `?? 'legacy-no-table'` write-side default vs strict save-time throw | `domain/consultation-file/src/frontmatter.ts:~122–124` vs `file.ts:55–66` | OVERCLAIM / internal-tension | 1 | yes |
| S12 | Static-hexagram scripture in two differently-keyed sections (`text:hexagram` ANSI vs `text:lines:none` Markdown) | `domain/consultation-view/src/build-view.ts:240–256` | ACCEPTED (ADR-0018) | 5 (unanimous smoothing) | n/a |

## Per-seam detail (for brainstorming)

### S1 — ADR-0021 stale status note  ·  DOC-STALE
- **Two readings:** ADR body — "width collapse + slice fence not yet built"; the
  code — both slices shipped. The ADR contradicts *itself* ("Where it's enforced"
  is present-tense "Implemented … B4").
- **Evidence (verified):** `domain/text-layout/src/index.ts:1` imports
  `string-width`; `visualWidth` is the single table. `cli/viewer-core/src/viewer-layout.ts:17`
  `terminalWidth` is a thin re-export of `visualWidth`; `panToWindow` exported at
  `index.ts:120`. `slice-ansi` imported only in `viewer-layout.ts:2`; the four pan
  call-sites (`manual-prompt.tsx`, `slider-prompt.tsx`, `consultation-readout.tsx`,
  `hexagram-display.tsx`) route through `panToWindow`. `eslint.config.js:134` fences
  `slice-ansi` to viewer-core.
- **Plan angle:** flip 0021 Status to `Accepted` and drop the "Implementation is
  pending" paragraph. Pure doc edit. No code change. Lowest risk → do first.

### S2 — "Sole owner of visibility" vs three consumers  ·  OVERCLAIM/SOFTNESS
- **Two readings:** (a) one owner (`buildConsultationView`); (b) three serializers
  (ANSI, Markdown, `serializeConsultationTabs`) each re-read the per-section
  `media:[...]` flag, reconciled by fixtures, not structure. Both true.
- **Note:** ADR-0018 already concedes the third consumer ("does not introduce a
  second visibility rule"). The seam is that the matrix is a **comment**, not an
  exported artifact; nothing structurally forbids a fourth divergent consumer.
- **Plan angle (decide, don't assume):** either (i) export the section→medium
  matrix as data + a test that every serializer's filter agrees with it, or
  (ii) accept comment+fixtures and soften ADR-0018's "sole owner" wording to
  "single decision point, enforced by fixtures." This is a real design choice —
  good `brainstorming` candidate.

### S3 — `casting`/`castingAbsence` exclusivity not in the type  ·  SOFTNESS
- **Two readings:** the envelope type permits impossible states
  (`{casting:null, castingAbsence:null}`, or both set); exclusivity lives in the
  serializer + a `file.ts` throw. Reader A assumes type safety; reader B sees a
  scattered runtime guard.
- **Plan angle:** lift to a discriminated union — `{ casting: CastingRecord;
  castingAbsence: null } | { casting: null; castingAbsence: CastingAbsenceReason }`.
  Touches `frontmatter.ts`, `file.ts`, `types.ts`, callers (playground save,
  legacy converter). Verify with the existing byte-identity `.md` fixtures.
  Cross-check ADR-0008's S6/S7 amendments — the *read* default is deliberate; this
  change is about the *type shape*, not the read default.

### S4 — "Single enforcer" prose vs layered enforcement  ·  OVERCLAIM
- **Two readings:** A — `assertSelectablePick` in `performCast` is *the* enforcer;
  B — manual validator derives the range structurally, interactive/RNG pre-clamp
  with `selectablePickMax`, core guard is a second line of defence. Arithmetic is
  provably consistent (`manual-validation.test.ts` locks it).
- **Plan angle:** mostly wording. Reframe the comment/`casting-invariants.md` from
  "single enforcer" to "single *authoritative* enforcer; input flows pre-clamp for
  UX, `performCast` is the tripwire." No behavior change. Pair with S5.

### S5 — `combinedPiles` vs `unpartedStalks.length/4`  ·  LEGIBILITY (runs disagreed)
- **The split:** run 4 logged it as an open seam ("`deriveSplit` may never run
  during casting generation"); run 2 re-derived equivalence
  (`unpartedStalks.length = 4·combinedPiles`). Same code, opposite verdicts → the
  cleanest illegibility signal in the set.
- **Plan angle:** add one comment at `casting-derivation.ts:80` stating the
  identity and that `deriveSplit` is **display/reconstruction only** (never the
  generation path), and/or a test asserting `4·combinedPiles === unpartedStalks.length`
  on the third cast. Cheap, high legibility payoff.

### S6 — Flip implemented twice  ·  SOFTNESS/latent-dup (runs disagreed)
- **The split:** run 4 called it dual-ownership drift risk; run 2 called it
  single-sourced via `POSITIONS_TOP_FIRST`. The flip exists as a function
  (`toTopFirst`) and as object mappings (`castingToYaml`/`hexagramToYaml`).
- **Plan angle:** confirm whether the YAML converters actually reuse `toTopFirst`
  or re-encode the reversal. If re-encoded, route both through one helper; add a
  property test (`fromYaml∘toYaml === id`, and tuple-index↔`L6..L1` agreement).

### S7 — Cycle-order orthogonality framing  ·  LEGIBILITY
- **The split:** comment says polarity-flip is "orthogonal to the cycle's motion
  axis," but `[7,9,8,6]` groups yang then yin, so one step crosses a polarity
  boundary and others don't.
- **Plan angle:** comment-only. Either justify "≤2 steps from any state" precisely
  or drop the "orthogonal" framing. No behavior change. Note: the comment cites
  "the spec" — confirm the spec source exists (flagged as an unverifiable appeal).

### S8 — Dual `Line` vocabulary  ·  LEGIBILITY/naming (coverage-gated)
- **The seam:** `domain/core/src/types.ts` `Line = 6|7|8|9` (cast value) and
  `domain/core/src/models/foundation.ts` `type Line = Yang|Yin = '1'|'2'` (key
  digit) share a name in one package. No runtime conflict; pure legibility hazard
  that only the run which opened `models/` saw.
- **Plan angle:** rename the symbolic one (`KeyDigit` / `LinePolarityDigit` /
  `SymbolicLine`). Small, localized; check `getters` key-construction call-sites.
  Intended theory (ADRs/CLAUDE) does **not** mention this overload — surface it.

### S9 — Slider clamp lives in the caller  ·  SOFTNESS
- **The seam:** `bouncing-slider-store.ts` bounces to whatever `min`/`max` it's
  given; the `selectablePickMax` clamp is threaded by `viewer.tsx` (grep-confirmed,
  not read). Only flow whose clamp has no component-level guard.
- **Plan angle:** decide whether the store should defensively clamp/assert its
  bounds, or whether "caller owns bounds" is the accepted contract (then a test on
  `viewer.tsx`'s threading). Lower priority — no known defect.

### S10 — "Medium-neutral" vs "ANSI-shaped" IR  ·  LEGIBILITY/naming
- **The split:** 4 runs accepted "medium-neutral"; run 1 argued the IR
  pre-computes ledger geometry and is ANSI-shaped.
- **Plan angle:** lowest value. At most, a doc sentence clarifying "medium-neutral
  = emits no ANSI/Markdown bytes; section/row *structure* is shared, formatting is
  the serializer's." Consider only if touching `consultation-view` anyway.

### S11 — Silent write-side absence default vs strict save throw  ·  OVERCLAIM
- **The seam:** `serializeFrontmatter` fills a missing reason with
  `?? 'legacy-no-table'`, while `file.ts` *throws* if a null casting lacks a
  reason. A programmer error is loud at save but silently papered at serialize.
- **Plan angle:** make serialize fail-closed too (or document why the default is
  safe there, mirroring ADR-0008's S6 read-default rationale). Pair with S3.

### S12 — Static-hexagram scripture in two sections  ·  ACCEPTED (ADR-0018)
- **Why listed:** it is the one place the "one IR, thin serializers" theory is
  locally violated — identical words in `text:hexagram` (ANSI-only) and
  `text:lines:none` (Markdown-only). Documented intent (ADR-0018 "the one
  divergence"), but **all 5 runs felt the urge to call it an inconsistency** before
  rationalizing it. That unanimous smoothing reflex is the signal.
- **Plan angle:** no change expected. Confirm the ADR-0018 comment + the fixtures
  make the divergence obvious to the next reader; otherwise add a one-line
  cross-reference at both section sites. Resolve last (or close as accepted).

## Recommended tackling order

1. **S1** — flip ADR-0021 to Accepted (pure doc, zero risk).
2. **S5 + S4** — add the `combinedPiles` identity comment/test and reword "single
   enforcer" (cheap legibility, no behavior change).
3. **S7, S8** — comment fix + symbolic-`Line` rename (localized, low risk).
4. **S3 + S11** — discriminated-union for `casting`/`castingAbsence` and make the
   serializer fail-closed (one coherent type-safety slice; fixtures are the gate).
5. **S2** — *decide* structure-vs-fixtures for the visibility matrix (needs
   brainstorming; may end as a doc softening or an exported matrix + test).
6. **S6** — confirm/unify the flip implementation; add round-trip property test.
7. **S9, S10** — accept-or-guard decisions; lowest priority.
8. **S12** — confirm accepted; close.

Each numbered group is intended to be **one reviewable, single-intent change**
(per AGENTS.md "Legible Change"). Several are doc-only.

## Suggested skills for the next session

- `superpowers:brainstorming` — for S2 (visibility matrix: structure vs
  fixtures) and S3/S11 (type-shape choice). These are genuine design forks; do not
  jump to code.
- `jiechao-toolkit:reviewable-changes` — keep each group a single-intent diff.
- `jiechao-toolkit:capturing-commit-intent` — every commit states WHY (these are
  legibility/conformance fixes, not features).
- `jiechao-toolkit:authoring-adrs` — S1 amends an ADR; S2/S3 decisions, once made,
  fold back into ADR-0018 / ADR-0008.
- `superpowers:test-driven-development` — S5 (identity test), S6 (round-trip
  property test), S3 (type refactor guarded by existing byte-identity fixtures).
- `feature-dev:code-explorer` — before S3/S6, trace the real call-sites (playground
  save reason; whether the YAML converters reuse `toTopFirst`).

## Key references (do not duplicate — read these)

- `docs/adr/0006-…` (never-zero invariant), `docs/adr/0008-…` (file format,
  castingAbsence, S3/S6/S7 amendments), `docs/adr/0018-…` (consultation-view IR,
  the "one divergence"), `docs/adr/0019-…` (domain/CLI boundary, width fence),
  `docs/adr/0021-…` (rendered-width single home — the stale-status seam).
- `docs/agents/casting-invariants.md` (the operational checklist behind S4).
- `CONTEXT.md` (Viewer/Readout/Consultation vocabulary).
