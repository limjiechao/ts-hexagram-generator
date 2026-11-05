# Survey synthesis: ts-hexagram-generator, DDD + Hexagonal readiness

Detail and path:line evidence are in survey-01 … survey-09 in this directory.

## Scorecard

| # | Slice | Quality | Integrity / separation |
|---|---|---|---|
| 01 | Casting core | 4 | 3 |
| 02 | Scripture catalogue | – | 3 |
| 03 | Consultation persistence | 4 | 3 |
| 04 | Presentation IR | – | 3 |
| 05 | Application layer (use cases) | – | 2 |
| 06 | Conceptual integrity (history and docs) | – | 3 |
| 07 | Code quality and tests | 4 | – |
| 08 | Dependency boundaries | – | 3 |

**Verdict:** the code is well made, but it lacks one coherent design. The pure oracle kernel is real and was written by one mind: the owner's 2025-05 pipeline, `performCast`/`LineState`, and the single home for the pick clamp. Everything above that kernel grew out of agent review loops. Evidence for that:
- About 93% of commits since May are AI-authored or co-authored.
- ADRs were backfilled after the code was built.
- One seam was moved under four separate ADRs.
- About 20k lines of planning docs sit against about 14k lines of source.
- About 10 statements in AGENTS.md and the ADRs contradict the code.

## What is latent and worth distilling (keep)
- **The four-operations pipeline (四營 → 三變 → 爻).** Pure, with phase-typed line state; over-stepping a finished line is a compile error.
- **`selectablePickMax`.** The single owner of the never-empty-right-heap invariant.
- **The envelope type.** It makes "casting XOR absence reason" unrepresentable any other way.
- **The legacy `.txt` converter.** A real anti-corruption layer, validated by replay.
- **Tests that carry over:**
  - the byte fixtures, usable as acceptance tests;
  - the consultation-file tests, which already form a repository contract suite;
  - the pure reducer and state-machine tests.
- **The one-to-one mapping between line tuples and hexagram pairs.** The 4,096 line tuples correspond exactly to the 4,096 (standing, emerging) pairs. That makes Yilin keying trivial and gives the REST API a natural resource identity.

## What is mis-placed or missing
1. **Domain rules live outside the domain.**
   - Text selection is in the view builder (`consultation-view/build-view.ts:145-170`).
   - Replay is in consultation-file.
   - Rewind and session state are in the CLI reducer.
   - The 18-cast sequence is implemented four times.
2. **No aggregate, identity or events.**
   - There is no `Consultation` type and no id; the file path stands in for one.
   - There are no domain events; reducer actions in `cli/` fill that role.
3. **No ports.**
   - Randomness, the clock and the repository are hard-wired to `node:crypto`, `dayjs()` and `fs`.
   - gray-matter blocks a browser build.
   - The save pipeline exists in 5 places, and self-heal and delete are raw `fs` calls inside Ink.
4. **The IR names its output media** (`SectionMedium = 'ansi'|'markdown'`), so adding Typst means editing the domain.
5. **Scripture coverage is incomplete.** Only 2 of Zhu Xi's 7 moving-line cases are implemented, there is no data slot for 用九/用六, there is no Yilin, and the texts have no provenance or licence notes (Wilhelm-Baynes is likely still under copyright).
6. **The vocabulary is fractured.**
   - The same act is called pick, split, part, cast, round, division and change.
   - "Hexagram" names two different types.
   - "casting" carries six meanings.
   - CONTEXT.md has no oracle terms at all.
7. **Packaging is ceremonial.** There are 13 packages, but the seams that matter (oracle vs catalogue, domain vs persistence) are hidden inside single packages.

## Concrete bugs found
- `cli/shell/src/hexagram-app.tsx:178` mounts PlaygroundApp without `saveDir`, so playground saves from the `hexagram` bin go to the cwd. This violates ADR-0020. Verified by me.
- `consultation-file/file.ts:84,95` reads the clock twice (filename vs frontmatter), and two saves in the same second overwrite each other.
- `migrate-legacy.ts:33-37` drops `castingAbsence` when it renders the body.
- `core/index.ts:25` casts `as 1|2|3` on a value that can be 0.
- `computeFailed` leaves the flow stuck in `computing`; discarding is the only way out.
- An unquoted `+08:00` timestamp parses as a Date and fails validation, and the history sort compares ISO strings lexically, which breaks across offsets.
- `validateManualSplit` accepts remL=5 when the totals balance; only the UI prevents it.
- `refactor.md` and ADR-0018 point at paths that no longer exist.

## Proposed strategic shape

```
Core:        Oracle (Casting)  ──Published Language: Permutation, Division[]──▶
Core:        Scripture Resolution (Zhu Xi policy)  ◀── reads ── Scripture Catalogue (supporting, OHS)
Supporting:  Consultation Journal (conformist to Oracle; ACL for legacy .txt)
Supporting:  Casting Session (process manager), Playground (explorer)
Generic:     Rendering (monospace / Typst / HTML), RNG, Clock, text layout
```

**Ports**
- Driven: RandomSource, Clock, IdGenerator, ConsultationRepository {save, get, list, remove}, ScriptureCatalogue {hexagram, passage, yilin, corpora}, DocumentRenderer.
- Driving: use cases CastAtRandom, MakeDivision, TranscribeDivision, RewindLine, ResolveReading(Permutation), RecordConsultation, List/Open/DeleteConsultation, ExplorePermutation, ImportLegacy.

**Core model:** replace `makeLineGenerator` with a pure fold over `Division{pick}[]`, of up to 18 divisions:
- it returns Result rather than throwing;
- `recordedMax` is derived, not stored;
- rewind is a truncation;
- replay is a fold plus an equality check.

## Decisions the owner must make (before any agent writes code)
1. The text rules for 2–6 moving lines: Zhu Xi or another tradition; whether to add 用九/用六 data and show 彖傳.
2. Yilin keying, and the semantics of zero moving lines: is there no emerging hexagram, or is emerging the same as standing (Yilin needs the latter)?
3. Whether CastingRecord is the event log, and therefore whether rewind is a retraction or forbidden.
4. Whether the query belongs to Consultation rather than Oracle, and whether an empty query is legal.
5. Whether playground saves are Consultations.
6. Whether cast-method provenance stays out (ADR-0011).
7. The random model: a uniform split point with the never-zero clamp shifts line frequencies by about 1 percentage point. State it as a domain decision.
8. Whether the two-line rewind window is a domain rule or a UX choice.
9. Text licensing and provenance for a public REST API or PWA.

## Process warning (survey-06)
A rewrite run through the same "agent executes, then review loops" process will probably accumulate the same kind of seams. A "Surgeon" process would order the work like this:
1. The owner writes the glossary, the context map and the port signatures as ADRs first.
2. Formal models come next (EventStorming, UML use-case/activity/sequence, DFD).
3. Agents implement only against those fixed contracts, with exhaustive property tests over the finite domain (4,096 tuples; the pick space).
