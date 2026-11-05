# Survey 05 — Application / use-case logic trapped in UI packages

Scope: `cli/casting-ui`, `cli/history-ui`, `cli/playground-ui`, `cli/shell`, `apps/cli/src/*`, ADR-0009/0010/0011, CONTEXT.md.
Read-only survey; no repo file edited; nothing under `consultations/` opened.

---

## 0. Headline

The repo has good **functional-core** discipline at the reducer level (pure `flowReducer`, `navReducer`, `playgroundReducer`, history-list `reducer`) but **no application layer**. Every use case's _orchestration_ — "validate → run domain → build view → persist → report path" — is wired inside a React component's `useEffect`/callback or an Ink-coupled bin. The reducers themselves mix three concerns: (a) the casting session aggregate (genuinely domain/application), (b) input-widget buffers/errors (UI), (c) presentation payloads (`ConsultationSections`, ANSI strings). A REST or PWA adapter today would have to re-implement: the save pipeline (4 copies), the history open/self-heal pipeline, delete, the random-plan handshake, manual-split validation gating, the selectable-pick clamp at the input boundary, and "unsaved progress" policy.

Separation rating: **2 / 5** (details in §6).

---

## 1. Use-case catalogue (UML-ready)

Actors:

- **Querent** (primary human; casts, browses, explores).
- **Practitioner with physical stalks** (specialisation of Querent for manual transcription).
- **Maintainer/Operator** (runs legacy migration).
- Secondary/system actors: **File system (Consultation repository)**, **Clock**, **CSPRNG** (`node:crypto.randomInt`), **Terminal environment** (TTY/NO_COLOR/CI).

`<<include>>`/`<<extend>>` relations noted inline.

| ID       | Use case                             | Actor                         | Goal                                                       | Trigger                                                   |
| -------- | ------------------------------------ | ----------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| UC-01    | Ask a query (Enter Query)            | Querent                       | State the divination question                              | Viewer opens in `awaitingQuery`, or plain prompt          |
| UC-02    | Cast interactively via slider        | Querent                       | Part the stalks by instinct (SPACE lock) 18×               | `hexagram-interactive` (default) / Home "new interactive" |
| UC-03    | Cast interactively via typed number  | Querent                       | Same as UC-02, typed pick                                  | `--numeric-input`, or forced by NO_COLOR/CI               |
| UC-04    | Cast interactively (plain/Inquirer)  | Querent                       | Same, headless terminal                                    | `--plain`/`--no-ui`/non-TTY                               |
| UC-05    | Cast via RNG (Ink playback)          | Querent                       | Let the CSPRNG part the stalks; watch playback             | `hexagram-random` / Home "new random"                     |
| UC-05a   | Skip random playback                 | Querent                       | Jump to result                                             | SPACE during playback (`<<extend>>` UC-05)                |
| UC-06    | Cast via RNG (plain)                 | Querent                       | Same, headless                                             | `hexagram-random --plain`                                 |
| UC-07    | Transcribe physical cast (manual)    | Practitioner                  | Enter 4 numbers per cast, app validates conservation       | `hexagram-manual` / Home "new manual"                     |
| UC-07a   | Rewind line                          | Practitioner                  | Undo current/just-completed line                           | Ctrl+R (`<<extend>>` UC-07)                               |
| UC-07b   | Read manual guide                    | Practitioner                  | Help overlay                                               | `?` (`<<extend>>` UC-07)                                  |
| UC-08    | Save consultation                    | System (on behalf of Querent) | Persist envelope+body                                      | `<<include>>` by UC-02..07 and UC-12                      |
| UC-09    | Read consultation (Readout)          | Querent                       | Browse Casting/Transformation/Standing/Emerging tabs       | After save (done) or after UC-11                          |
| UC-10    | Discard in-progress consultation     | Querent                       | Abandon cast; confirm Y/N                                  | Esc/Ctrl+C with unsaved progress (`<<extend>>` UC-02..07) |
| UC-11    | Browse history                       | Querent                       | List consultations newest-first + unreadable count         | `hexagram-history` / Home "browse history"                |
| UC-11a   | Filter history                       | Querent                       | Case-insensitive query substring                           | `/` (`<<extend>>` UC-11)                                  |
| UC-11b   | Open consultation (+ self-heal body) | Querent                       | Load, re-render, rewrite if drifted, show Readout          | Enter on row (`<<include>>` UC-09)                        |
| UC-11c   | Delete consultation                  | Querent                       | Permanently unlink after confirm                           | Ctrl+D → Y                                                |
| UC-12    | Explore line states (playground)     | Querent                       | Toggle 6/7/8/9 per line, see standing/emerging/readings    | `hexagram-playground` / Home "open playground"            |
| UC-12a   | Save playground hexagram             | Querent                       | Persist with `casting: null, castingAbsence: 'playground'` | `S` → query → Enter (`<<include>>` UC-08)                 |
| UC-13    | Convert legacy files                 | Maintainer                    | Migrate `.txt` → `.md`, move originals                     | `hexagram-history --convert-legacy`                       |
| UC-14    | Navigate Home hub                    | Querent                       | Choose one of the above                                    | `hexagram` bin                                            |
| (policy) | Refuse non-interactive env           | Terminal env                  | Exit 1 with stderr for Ink-only bins                       | startup                                                   |

### Main and alternate flows

**UC-02/03 Cast interactively (Ink)**
Main: open viewer → type query → Enter (`querySubmit`) → for 18 slots: prompt shows bar capped at `selectablePickMax(recordedMax)` → user locks pick → 1 s reveal → `splitCommitted` → reducer runs `performCast` → after slot 18 mode=`computing` → effect builds sections + markdown body + saves → `computeSucceeded` → `done`, tabs unlock, saved path shown.
Alt: empty query → no-op (`viewer-flow.ts:167`). Typed pick out of range → inline error (`number-input.tsx:52-55`). Esc/Ctrl+C mid-flow → discard confirm (UC-10). Save failure → `computeFailed`, mode stays `computing`, footer "Save failed: …" (`viewer.tsx:692-695`) — **no retry path**; user can only discard.

**UC-04 Cast interactively (plain)**: welcome banner → Inquirer query → 6×3 Inquirer numbers driving `makeLineGenerator` → print + save. Alt: Ctrl+C at a prompt → exit 0 (`interactive.ts:83`).

**UC-05 Cast via RNG (Ink)**: query → on submit the shell generates the whole plan with `generateRandomConsultation()` → reducer plays plan back cast-by-cast (slider auto-land after `castBounceMs`, or number-mode `setTimeout` every `castRevealMs`) → compute/save as UC-02. Alt: SPACE → `playbackSkipped`.

**UC-07 Transcribe physical cast**: guards (TTY, ≥32 rows) → query → per cast type pilesL/remL/pilesR/remR → live `validateManualSplit` (incomplete → zero-remainder → conservation → suspended-sum) → Enter when ok → green dwell (2.5 s, or Enter to skip) → `splitCommitted(pick=4·pilesL+remL)` → … → save. Alt: Ctrl+R rewind (two-line window), `?` help (draft preserved via ref).

**UC-11b Open consultation**: Enter on row → `loading` → re-render body from envelope → byte-compare with disk → rewrite if drifted → `view` with notice "Body refreshed; data unchanged." Alt: read/write error → list with error line. Esc in readout → back to list, focus restored.

**UC-11c Delete**: Ctrl+D → modal → Y → `fs.unlink` → remove from in-memory scan → "✓ Deleted …". Alt: N cancels; unlink failure → error status line.

**UC-12a Save playground**: `S` → save strip → query Enter → `saveConsultationFile({casting:null, castingAbsence:'playground'})` → `saveSucceeded(relativePath)`. Alt: Esc cancels; failure → `saveFailed`.

**UC-13 Convert legacy**: read dir → filter `consultation-*.txt` → per file `convertLegacyTxt` → SKIP on failure → render body → serialize → write `.md` → move `.txt` into `legacy/` → summary.

---

## 2. Where each use case's orchestration lives (+ leak flags)

Legend: **[APP]** application orchestration in a UI file; **[DOM]** domain rule in a UI file; **[FX]** side effect (I/O, clock, RNG, timer) in UI code.

| UC                       | Orchestration location                                                                                                                                                                          | Leaks a REST/PWA adapter would have to re-implement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UC-01 Query              | `viewer-flow.ts:164-179` (`queryChange`/`querySubmit`); plain: `prompts.ts:9-14`                                                                                                                | **[DOM]** "query must be non-blank" lives only in reducer `viewer-flow.ts:167` and Inquirer `required: true` (`prompts.ts:12`); playground has its own trim check (`save-strip.tsx:71`). Three copies of the same rule.                                                                                                                                                                                                                                                                                                                                                                                             |
| UC-02/03 Interactive Ink | Reducer `viewer-flow.ts:184-246`; selection range `viewer.tsx:244-261`; commit `viewer.tsx:299-305`; compute+save effect `viewer.tsx:343-384`                                                   | **[DOM]** selectable-pick clamp computed in the component (`viewer.tsx:261`) and enforced only by widgets (`number-input.tsx:52`, slider bar width); reducer relies on `performCast` _throwing_ (`domain/core/src/index.ts:230`) — an out-of-range pick crashes the reducer rather than being a typed rejection. **[APP][FX]** the whole "finish consultation" pipeline (assert → `buildConsultationSections` → `markdownConsultationBody` → `saveConsultationFile`) is a `useEffect` (`viewer.tsx:343-384`).                                                                                                       |
| UC-04 Interactive plain  | `interactive-flow.ts:19-131` (+ `apps/cli/src/interactive.ts:50-67`)                                                                                                                            | **[DOM][APP]** drives the _older_ `makeLineGenerator` engine with hand-unrolled 3 rounds (`interactive-flow.ts:44-71`) — a second casting driver parallel to the reducer's `performCast`. Clamp re-derived at `interactive-flow.ts:21-26`.                                                                                                                                                                                                                                                                                                                                                                          |
| UC-05 Random Ink         | Plan created in `viewer.tsx:469-476` (`handleQuerySubmit`); auto-land config `viewer.tsx:273-283`; number-mode timer `viewer.tsx:403-433`; skip `viewer.tsx:313-315` / `viewer-flow.ts:291-324` | **[FX]** CSPRNG invoked from a React event handler (`viewer.tsx:471`). **[APP]** "random = predetermined plan replayed through the same reducer" is a nice design but the handshake (generate → `querySubmit{plan}` → per-slot `randomSplitAction`) is split between component and reducer. Playback pacing timers are legitimately UI.                                                                                                                                                                                                                                                                             |
| UC-06 Random plain       | `apps/cli/src/random.ts:24-35`                                                                                                                                                                  | **[APP]** bin itself sequences query → RNG → print+save.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| UC-07 Manual             | Input + validation + derived pick: `manual-prompt.tsx:223-347`; commit timer `manual-prompt.tsx:396-413`; reducer shared with UC-02                                                             | **[DOM]** validation gating (`validateManualSplit` called in the component, `manual-prompt.tsx:240-247`; Enter gated at `:319`) — the reducer's `splitCommitted` accepts any pick and never re-validates the 4-field transcription, so the _rule_ "only a conserved, valid transcription may commit" is UI-only. **[DOM]** next-round unparted computed in component via `performCast` (`manual-prompt.tsx:331-333`, display only). **[DOM]** `pilesMax = floor(unparted/4)`, `remMax = 4` (`:232-233`). Bin-level policy: `MANUAL_MIN_TERMINAL_ROWS` (`apps/cli/src/manual.ts:29,38-44`) — adapter-specific, fine. |
| UC-07a Rewind            | `viewer-flow.ts:247-290`, key binding `viewer.tsx:222-238`                                                                                                                                      | Mostly portable (pure reducer). Rule "manual only" encoded in reducer `:249`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| UC-08 Save               | **4 independent copies**: `viewer.tsx:352-363`, `log-and-save.ts:19-28`, `playground-app.tsx:283-305`, and (as a raw write) `history-app.tsx:19-37` + `migrate-legacy.ts:33-40`                 | **[APP][FX]** Each caller composes `markdownConsultationBody` + `saveConsultationFile` itself; the body/envelope pairing (incl. threading `castingAbsence` — see the bug-avoidance comment at `history-app.tsx:27-30`) is caller-owned knowledge. **[FX]** Clock read inside `saveConsultationFile` twice (`domain/consultation-file/src/file.ts:84` filename, `:95` frontmatter) — not injectable, and the two reads can straddle a second boundary.                                                                                                                                                               |
| UC-09 Readout            | `ConsultationReadout` (readout pkg); sections built in `viewer.tsx:440-455`, `history-app.tsx:264-269`                                                                                          | Presentation; OK for CLI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| UC-10 Discard            | Policy `has-unsaved-cast-progress.ts:26-33`; wiring `viewer.tsx:320-335, 577-606`                                                                                                               | **[APP]** the predicate is pure and portable; the confirm modal is UI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| UC-11 Browse             | Scan `history-scan.ts:30-61` (fs I/O in the UI package); mount effect `history-app.tsx:131-139`; list reducer `history-list-state.ts:89-127`; filter `history-list.tsx:157-178`                 | **[FX][APP]** repository query (readdir + load + sort newest-first) lives in `history-ui`. **[DOM]** hexagram summary (standing → emerging names) in `history-list-transforms.ts:35-43`. Filter rule (case-insensitive substring on query, unreadable excluded) inside a `useMemo` (`history-list.tsx:165-170`).                                                                                                                                                                                                                                                                                                    |
| UC-11b Open              | `history-app.tsx:178-207` + `rerenderOnDisk` `:19-37`                                                                                                                                           | **[APP][FX]** the "self-healing load" use case writes files directly with `fs.writeFile` (`:35`), bypassing `@hexagram/consultation-file`'s API — a second write path to the repository.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| UC-11c Delete            | `history-app.tsx:208-257`                                                                                                                                                                       | **[FX]** raw `fs.unlink` inside an `onDelete` JSX prop (`:214`); no repository port.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| UC-12 Playground         | Reducer `playground-state.ts` (pure, uses `@hexagram/core/line-semantics`); derivation `playground-lines.ts`                                                                                    | Mostly portable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| UC-12a Playground save   | `playground-app.tsx:282-308`                                                                                                                                                                    | **[APP][FX]** save in a `useCallback`; `process.cwd()`-relative display (`:298`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| UC-13 Legacy             | `apps/cli/src/migrate-legacy.ts:9-54`                                                                                                                                                           | **[APP][FX]** whole use case is in the bin with `process.stdout.write` reporting; writes via `serializeFrontmatter` + `fs.writeFile` — a third write path.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| UC-14 Home               | `cli/shell/src/nav-machine.ts` (pure), `hexagram-app.tsx`                                                                                                                                       | Navigation is UI. **Bug-shaped finding:** composed shell mounts `<PlaygroundApp onExit… exitLabel…/>` with **no `saveDir`** (`cli/shell/src/hexagram-app.tsx:178`), so playground saves from `hexagram` fall back to cwd-based `defaultConsultationsDir()` — contrary to ADR-0020 (history and casting both get `consultationsDir`, `:165-166`).                                                                                                                                                                                                                                                                    |
| Env policy               | `utils-mode.ts:164-189` (`parseCliFlags`), `viewer-core` `classifyEnv`; bins                                                                                                                    | Adapter-specific config; fine where it is, but `utils-mode.ts` mixes CLI flag parsing with input-mode policy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Other cross-cutting leaks:

- `process.cwd()` used for _display_ paths in 6 UI sites (`history-app.tsx:236,249,278`, `history-list.tsx:405`, `history-list-transforms.ts:79`, `history-list-footer.tsx:88`, `playground-app.tsx:298`) — presentation of an identity that a repository port should own (an opaque id / relative name).
- `HistoryEntry` type and `scanConsultations` (the read model) live in `history-ui` (`history-scan.ts:10-24`).

---

## 3. Is `viewer-flow`'s state machine application or UI logic?

**Both, entangled.** The `awaitingQuery → casting → computing → done` lifecycle is the **casting-session aggregate / use-case workflow** — application logic. But `FlowState` (`viewer-flow.ts:36-69`) carries UI fields alongside it.

Portable (application/domain) parts:

- Session phase (`mode`), `flowKind`, committed `query`, `lineIndex`/`castIndex` slot pointer, `partialCasting`, `completedLines`, `lineState` (`AdvanceableLineState`), `castingPlan`.
- Transitions `querySubmit` (non-blank rule), `splitCommitted` (performCast, slot advance, finish detection), `lineRewound` (two-line window), `playbackSkipped` (plan → full record), `computeSucceeded/Failed`.
- `hasUnsavedCastProgress` (`has-unsaved-cast-progress.ts:26`) — a pure session predicate.
- `currentRecordedMax` + `selectablePickMax` → "what picks are legal now" query.

UI-only parts that should stay in the Ink adapter:

- `queryBuffer`, `castingBuffer`, `error` (widget buffers/error channel — the comment at `:42-46` already admits `error` is unused by manual).
- `sections: ConsultationSections` (ANSI per-tab strings, `:66`) — a _view model_, imported from `@hexagram/readout` (`:11`), and `extractQueryText` which strips ANSI (`:111-116`) for the test-only prebuilt path.
- `savedPath` as a display string; `EMPTY_SECTIONS`.
- `initialFlowState(…, preBuiltSections, preBuiltSavedPath)` — test-shaped entry that boots straight into `done`.

Also, `computing` is a _side-effect phase_ whose effect lives in the component (`viewer.tsx:343`). The reducer is pure only because the save is pushed into React; an application layer would own "complete session → persist" as a command, and `computing` would become an adapter-side "awaiting promise" flag.

Note `viewer-flow.ts` imports `@hexagram/readout` and `@hexagram/viewer-core` (`:11-12`) — so the "pure" module is not adapter-neutral; a PWA cannot import it without pulling in ANSI/terminal packages.

---

## 4. Activity and sequence sketches

### 4.1 Interactive casting (Ink slider) — activity

```
(start) → [Open viewer; mode=awaitingQuery]
  → [Type query] → <non-blank?> --no--> [ignore Enter] → back
  → yes → [mode=casting; slot=(L1,C1); lineState=initial]
  loop 18×:
     → [Compute recordedMax from lineState; selectable = recordedMax-1]
     → [Sweep slider over 1..selectable] → [User SPACE] → [Reveal heaps ~1s]
     → [performCast(lineState, pick)] → <3rd cast?> --yes--> [append Line; reset lineState]
     → <slot 18?> --no--> [advance slot] → loop
     ‖ (any time) Esc/Ctrl+C → [Confirm discard] → <Y?> → (end: discarded) / N → resume
  → [mode=computing] → [assert hexagram & casting complete]
  → [build sections] → [render markdown body] → [save file (clock, fs)]
  → <ok?> --no--> [show "Save failed"; stuck in computing] → (discard only)
  → yes → [mode=done; unlock tabs; show saved path] → [browse Readout] → (end)
```

### 4.2 Interactive casting — sequence, as-is vs target

As-is (all inside the Ink process; no seam between adapter and use case):

```
Querent → QueryEditor(Ink) : Enter
QueryEditor → ConsultationViewer : onSubmit
ConsultationViewer → flowReducer : querySubmit
loop 18
  Querent → SliderPrompt : SPACE
  SliderPrompt → ConsultationViewer : onSubmit(pick)          [after setTimeout reveal]
  ConsultationViewer → flowReducer : splitCommitted(pick)
  flowReducer → core.performCast : (lineState, pick)          [domain]
end
ConsultationViewer(useEffect computing) → readout.buildConsultationSections
ConsultationViewer → text-grid.markdownConsultationBody
ConsultationViewer → consultation-file.saveConsultationFile → Clock, fs   [repository + clock]
ConsultationViewer → flowReducer : computeSucceeded(sections, savedPath)
```

Target (hexagonal):

```
Querent → InkAdapter : keystrokes
InkAdapter → CastingSession(UC: StartConsultation) : start(query, method)
loop 18
  InkAdapter → CastingSession : commitSplit(pick)
  CastingSession → Domain(LineState/performCast) : advance
  CastingSession → InkAdapter : SessionSnapshot(slot, legalPickRange, partialRecord)
end
CastingSession → FinishConsultation(UC) : complete()
FinishConsultation → ConsultationRepository(port) : save(Consultation{query,hexagram,casting})
ConsultationRepository → Clock(port) : now()
FinishConsultation → InkAdapter : ConsultationId / saved location
InkAdapter → ConsultationView(IR) → ANSI serializer
```

(Markdown body rendering belongs inside the file-repository adapter, not the use case.)

### 4.3 Open a history entry — activity

```
(start) → [Scan dir: readdir *.md (not legacy/)] → [load+parse each] → [split readable / unreadable]
  → [sort newest-first] → [render list + "N consultations · M unreadable"]
  → [Querent navigates / filters] → [Enter on readable row]
  → <already loading?> --yes--> ignore
  → [status=Loading] → [render body from envelope (incl. castingAbsence)]
  → [serialize envelope+body] → [read file] → <bytes equal?> --no--> [write file]
  → <error?> --yes--> [list + error line] → (back to list)
  → [build sections] → [show Readout titled "loaded <ts>" (+ refreshed notice)]
  → [Esc] → [list, focus restored to that path] → (end)
```

### 4.4 Open a history entry — sequence, as-is vs target

As-is:

```
Querent → HistoryList(Ink) : Enter
HistoryList → HistoryApp : onPick(entry)            (entry already holds envelope from scan)
HistoryApp → rerenderOnDisk(history-app.tsx:19)
rerenderOnDisk → text-grid.markdownConsultationBody
rerenderOnDisk → consultation-file.serializeFrontmatter
rerenderOnDisk → fs.readFile / fs.writeFile        [direct fs, bypasses consultation-file API]
HistoryApp → setState(view) → readout.buildConsultationSections → ConsultationReadout
```

Target:

```
Querent → InkAdapter : open(id)
InkAdapter → OpenConsultation(UC) : execute(id)
OpenConsultation → ConsultationRepository(port) : load(id) → Consultation | Unreadable
OpenConsultation → ConsultationRepository : refreshRendering(id)  (self-heal; file adapter detail) → {rewrote}
OpenConsultation → Domain(getters, emerging, line semantics) : derive
OpenConsultation → InkAdapter : {consultation, derived, rewrote}
InkAdapter → ConsultationView IR → ANSI
```

Note the self-heal ("rewrite body if drifted") is a _storage-format_ concern of the Markdown file adapter; a REST/IndexedDB adapter has no decorative body to heal. It should not be in the use case's contract beyond an optional `rewrote` flag.

---

## 5. Duplicated orchestration and UI-invoked side effects

### Duplication

1. **Finish-and-save pipeline** — 3 save copies + 2 raw-write copies:
   - `viewer.tsx:348-363` (Ink casting)
   - `log-and-save.ts:19-28` (plain casting)
   - `playground-app.tsx:284-293` (playground)
   - `history-app.tsx:23-35` (self-heal write)
   - `apps/cli/src/migrate-legacy.ts:33-40` (legacy write)
     Each re-pairs `markdownConsultationBody(...)` with the envelope; `castingAbsence` must be threaded by hand at each site.
2. **Two casting engines driving the same algorithm**: reducer/`performCast` (Ink: `viewer-flow.ts:192-198`) vs `makeLineGenerator` hand-unrolled 3× in `interactive-flow.ts:44-71` (plain) and `random-casting.ts:33-75` (RNG). The plain interactive flow and the Ink interactive flow cannot share code because they use different state models.
3. **Selectable-pick clamp** re-derived at every input boundary: `viewer.tsx:261`, `interactive-flow.ts:21-26`, `random-casting.ts:30`, plus widget enforcement in `number-input.tsx:52`, slider bar size. (The rule is single-sourced in core — good — but _calling_ it is each adapter's job.)
4. **Query non-blank rule**: `viewer-flow.ts:167`, `prompts.ts:12` (`required`), `save-strip.tsx:71`.
5. **Mode branching per bin**: `random.ts:24-46` and `interactive.ts:50-78` each implement "plain vs Ink" plus query → cast → save; `run-hexagram.tsx:67-72` re-resolves the same flags for the composed shell.
6. **Random generation entry**: `random.ts:29` (plain) and `viewer.tsx:471` (Ink) both call `generateRandomConsultation()` directly.
7. **Display-path relativisation** via `process.cwd()` in 7 places (§2).
8. **Hexagram summary/derivations**: `history-list-transforms.ts:35-43` vs the consultation-view IR — names/emerging derived separately for the list row.

### Side effects in UI code

| Effect                      | Site                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| CSPRNG                      | `viewer.tsx:471` (React handler); `random.ts:29` (bin); banner `animated-banner.tsx:49` (`cryptoRandom`, cosmetic) |
| File write (save)           | `viewer.tsx:357` (useEffect), `playground-app.tsx:293` (useCallback), `log-and-save.ts:22`                         |
| File write (raw)            | `history-app.tsx:35`, `migrate-legacy.ts:40-41` (write + rename)                                                   |
| File delete                 | `history-app.tsx:214` (inside JSX prop)                                                                            |
| File read / dir scan        | `history-scan.ts:33,46` (called from `history-app.tsx:132` useEffect), `history-app.tsx:33`                        |
| Clock                       | Hidden inside `saveConsultationFile` (`file.ts:84,95`) — two separate reads, not injectable                        |
| Timers (UI pacing, legit)   | `viewer.tsx:409` (random number-mode reveal), `manual-prompt.tsx:407` (dwell), slider store intervals              |
| process.cwd / stdout / exit | `history-*` & `playground-app.tsx` display paths; bins' `process.exit`; `manual.ts:38` rows                        |

---

## 6. Rating and top-5 extractions

**Separation: 2 / 5.**
Credit: pure reducers (`flowReducer`, `navReducer`, `playgroundReducer`, history `reducer`), RNG kept out of the reducer via `castingPlan`, explicit `consultationsDir` threading (ADR-0020), domain rules hoisted to core (`validateManualSplit`, `selectablePickMax`, `performCast`). Debit: no use-case boundary at all; persistence/RNG/clock are called from components and bins; the session reducer imports presentation packages; four save paths; two casting engines; repository read model lives in `history-ui`; manual validation is enforced only by the widget.

### Top 5 extractions for an application layer

1. **`CastingSession` (application service / aggregate) extracted from `viewer-flow.ts`.**
   Move `mode`, slot pointer, `lineState`, `partialCasting`, `completedLines`, `castingPlan`, and the `querySubmit` / `splitCommitted` / `lineRewound` / `playbackSkipped` transitions into a medium-neutral module (no `@hexagram/readout`/`viewer-core` imports). Expose `legalPickRange()` (wrapping `selectablePickMax`) and return a typed rejection instead of relying on `performCast` throwing. Add `commitManualTranscription({pilesL,remL,pilesR,remR})` that runs `validateManualSplit` _inside_ the session, so the "valid transcription only" rule isn't widget-only. Leave `queryBuffer`/`castingBuffer`/`error`/`sections` in an Ink-side view reducer. Replace `interactive-flow.ts`'s `makeLineGenerator` loop with a driver over the same session so plain and Ink share one engine.

2. **`ConsultationRepository` port + one `SaveConsultation` / `FinishConsultation` use case.**
   Single entry `save({query, hexagram, casting | absence})`; the Markdown file adapter (consultation-file + text-grid body) owns body rendering, `castingAbsence` threading, filename, and an injected `Clock` (fix the double clock read). Collapse `viewer.tsx:343-384`, `log-and-save.ts`, `playground-app.tsx:282-308` onto it; the Ink `computing` effect becomes `await finishConsultation(session)`. Add retry-on-failure as an explicit alternate flow.

3. **History use cases: `ListConsultations`, `OpenConsultation`, `DeleteConsultation`.**
   Move `scanConsultations`/`HistoryEntry`/`UnreadableEntry` out of `history-ui` behind the repository port (`list()`, `load(id)`, `delete(id)`); move `rerenderOnDisk` into the file adapter as `refreshRendering(id)` so the only writer is the repository; return an opaque id + display name instead of absolute paths (kills the `process.cwd()` relativisation sprinkled across UI). Put the filter predicate (case-insensitive query substring) in the list use case or a pure query helper.

4. **`StartRandomConsultation` with an injected `RandomSource` port.**
   Pull `generateRandomConsultation()` out of `viewer.tsx:471` and `random.ts:29` behind a use case that returns a `CastingPlan` (or a completed session) from an injected RNG — deterministic tests, and a PWA can supply `crypto.getRandomValues`. Playback pacing (bounce/auto-land/timers) stays adapter-side.

5. **`ConvertLegacyConsultations` use case + `ExploreLines`/`SavePlaygroundHexagram` commands, with a composition root per adapter.**
   Move `apps/cli/src/migrate-legacy.ts` logic into an application module returning a per-file report (the bin only prints), writing through the repository. Make the playground save call the same `SaveConsultation` use case (absence=`playground`). Introduce a composition root that wires repository dir/clock/RNG once — which would also fix the composed-shell bug where `<PlaygroundApp>` gets no `saveDir` (`cli/shell/src/hexagram-app.tsx:178`), and replace the scattered `resolve*()` re-parsing (`run-hexagram.tsx:67-72`, bins) with one config object.

### Notable findings to verify

- `cli/shell/src/hexagram-app.tsx:178`: playground mounted without `saveDir` in the composed `hexagram` bin → saves resolve relative to cwd (ADR-0020 divergence). Standalone `hexagram-playground` threads it correctly (`apps/cli/src/playground.ts:15`).
- `domain/consultation-file/src/file.ts:84,95`: filename timestamp and frontmatter timestamp come from two separate clock reads.
- `viewer.tsx:692-695` + `viewer-flow.ts:332-333`: `computeFailed` leaves the session in `computing` with no retry action.
- `manual-prompt.tsx:319` is the only gate on manual validity; `flowReducer.splitCommitted` accepts any in-range pick.
