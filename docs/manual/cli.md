# CLI manual

Status: **draft**, for the owner's line-edit. Not authoritative until ratified
(`docs/manual/README.md`). Once ratified, it is the standard for what the CLI
does in Phase 4; byte fixtures stay the standard for exact output (R-008).

How to read this draft:

- It follows Brooks's nine items, one section each.
- Where it describes a behaviour that differs from today's app, the change is
  marked inline. If an ADR or a Ruling already decides it, the mark cites it.
  If nothing decides it yet, the mark is a `> **Owner:**` note and refers to a
  question in "Questions for the owner" (`CLI-n`).
- A statement marked _Proposed_ is the drafter's, pending the question it
  names.
- Terms are `CONTEXT.md`'s. Examples are invented.

## 1. Purpose

The CLI is 易筮占, the Yijing Yarrow Oracle, run in a terminal (ADR-0014). It
lets the owner:

- **cast** a Consultation by the yarrow-stalk procedure (大衍筮法), with the
  Divisions made by the machine (Automatic), by the owner on screen (Virtual),
  or with real stalks and entered by Transcription (Physical);
- **record** a Consultation divined elsewhere, from its Transformation;
- **explore** any Transformation in the Playground, without keeping anything;
- **browse, open and delete** the Consultations in the Journal;
- **import** legacy files, **export** Consultations to Typst or PDF, and
  **merge** another Journal into this one.

ADR-0037 puts all ten use cases on the CLI. Nine of them appear above. The
tenth, Look up the catalogue (use case 8), is used inside every Readout for
names and text; whether the CLI also offers it on its own is CLI-8. The CLI
performs 筮 and stops at the moment of reception: it shows the Applicable
Passages and their text, and never tells the user what they mean (ADR-0014,
ADR-0024).

## 2. Environment

- **Platform.** Node.js 24.6 or later (the root `package.json` `engines`
  field). The CLI is a Private Channel: it runs locally for the owner, with no
  sign-in (ADR-0032).
- **Launching.** Each command is a binary of the CLI package, run by name
  (`hexagram-random`, and so on) once built. From a checkout, `pnpm
hexagram-random` and its siblings run the same command from source; options
  then follow `--`.
- **Terminal.** Most commands draw a full-screen Ink interface. ADR-0010 sets
  two tests on the environment:
  - the terminal is **interactive** only when stdout is a TTY and neither
    `NO_COLOR` nor `CI` is set;
  - stdout is **headless** when it is not a TTY.
- **Which commands run where:**

  | Command                                                                  | Interactive | TTY with `NO_COLOR` or `CI` | Headless   |
  | ------------------------------------------------------------------------ | ----------- | --------------------------- | ---------- |
  | `hexagram-random`, `hexagram-interactive`                                | full-screen | full-screen, typed input    | plain mode |
  | `hexagram`, `hexagram-manual`, `hexagram-playground`, `hexagram-history` | full-screen | refuses                     | refuses    |
  | `hexagram-history --convert-legacy` (import)                             | runs        | runs                        | runs       |

  On the two commands with a plain mode, `NO_COLOR` or `CI` replaces the
  moving slider with typed input, so a screen reader or a script is never
  left watching an animation. Every other full-screen command refuses (6.1).
  Import prints lines of text and needs no terminal at all.

> **Owner:** a `NO_COLOR` user on a real terminal, such as a screen-reader
> user, is refused by the four Ink-only commands, including Physical
> Division. See CLI-2.

- **Height.** `hexagram-manual` needs a terminal at least 32 rows tall
  (ADR-0010, amendment; ADR-0011).
- **Width.** Content wraps at 120 columns by default (`--wrap-width`), capped
  to the terminal's width. Fixed-width figures never wrap; the user pans them
  with `<` and `>`.
- **Storage.** The Journal is a folder of Markdown files, the Markdown
  Consultation Store. Every command finds it at `consultations/` under the
  repository root, whichever directory it is run from (ADR-0020). The folder
  is git-ignored and must never be committed (ADR-0015). Only version-2
  records load; every version-1 file is an Unreadable file until it is
  migrated (ADR-0030; 6.7).
- **Data.** The Scripture Catalogue is bundled; no network is needed.

> **Owner:** PDF export needs a Typst compiler. ADR-0037 names Typst but not
> how the CLI reaches it. A new runtime dependency is Tier A. See CLI-17.

## 3. Domain and range

**Inputs the CLI accepts:**

| Input              | Domain                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Query              | any non-blank text, kept exactly as written (`CONTEXT.md`, Query)                                                                 |
| Pick (Virtual)     | a valid Pick of the Round: 1 to the Round's stalks − 2 (ADR-0023)                                                                 |
| Transcription      | four whole counts: piles of four and Remainder, for the left and the right heap; Remainders 1 to 4 (ADR-0043)                     |
| Transformation     | six Line Values, each 6, 7, 8 or 9, set bottom-up from Line Position 1                                                            |
| Divined At         | for a Recorded Consultation, a date, or a date and time with UTC offset (ADR-0030, R-037); for a Cast one, the moment it was kept |
| Reading Preference | Chinese script, Translations in order, Commentaries, and the Yilin Verse on or off (`CONTEXT.md`)                                 |

**What the CLI produces:**

- a **Readout** of one Consultation or of a Transformation being explored:
  its Casting (if any), its Transformation, its Standing and Emerging
  Hexagrams with their structure, and its Applicable Passages with their text;
- **Consultations** kept in the Journal, by casting, recording, importing and
  merging;
- a list of the Journal's Consultations, plus a count of Unreadable files;
- Typst source or a PDF, from export; a Journal bundle, for merging.

**Range.** Every one of the 4,096 Transformations can arise from a Casting and
can be recorded or explored. A Transformation with no Moving Line, X之X, is a
Transformation like any other.

## 4. Functions and algorithms

**Casting** (use case 1). A Casting is eighteen Rounds, three per Line. Each
Round is one Division, recorded as a Pick; the Hung Stalk, the counting off
in fours, the Remainders and the Set-aside all follow from the Pick. Three
Rounds give a Line Value, six Lines give the Transformation. The three
Division Methods differ only in where the Pick comes from:

- **Automatic.** For each Round the machine picks one of the four Remainder
  Groups with probability ¼, then a Pick uniformly within it (ADR-0023). Line
  Values then have the classical probabilities: Old Yin 6 = 1/16, Young Yang
  7 = 5/16, Young Yin 8 = 7/16, Old Yang 9 = 3/16. Random integers come from
  `node:crypto` (ADR-0037).
  _Today's app_ picks every valid Pick with equal probability. ADR-0023
  replaces that.
- **Virtual.** The user makes each Division on screen, with the slider or a
  typed number. Either way it is the same Division Method (ADR-0027).
- **Physical.** The user divides real stalks and transcribes each Round. A
  Transcription becomes a Pick, 4 × left piles + left Remainder, only once it
  passes four checks, run in this order, the first failure being the one
  named (ADR-0043): `complete`, `remainders`, `set-aside`, `conservation`.
  _Today's app_ runs conservation before the Set-aside check (ADR-0011).
  ADR-0043 replaces that order.

**Line Retraction**, for Physical Division only: the user may discard the
Picks of the incomplete Line, or of the Line just completed before the next
Line's first Pick, and transcribe them again. It leaves no trace in the
Casting (`CONTEXT.md`).

**Keeping.** A completed Casting is kept as a Cast Consultation: the Query,
Divined At, the Transformation, the Casting and the Division Method. Divined
At is the moment of keeping, read once from the Clock; the Consultation Id, a
ULID, is built from that same moment (ADR-0030). A kept Consultation is never
edited, only deleted.

**Recording** (use case 2) keeps a Recorded Consultation: Query, Divined At as
entered, and Transformation. No Casting is ever invented for it (ADR-0026).

**Resolution** (use case 3) derives from any Transformation:

- the Standing and Emerging Hexagrams, and the Moving Lines;
- for each Hexagram, its Lower and Upper Trigrams and its Nuclear, Inverse
  and Reversed Hexagrams (ADR-0025);
- the Applicable Passages, in this order (R-283): the Standing Hexagram's
  Hexagram Statement; the Line Statement of every Moving Line, bottom-up; the
  All-Moving Statement when all six lines of 乾 or 坤 move; then the Emerging
  Hexagram's Hexagram Statement (none for X之X).

Every Moving Line counts and none is ranked; order carries no rank
(ADR-0024). A Changed Line's Line Statement is never shown as applicable.
_Today's app_ shows no Line Statement at all when two or more lines move.
ADR-0024 replaces that.

Each passage is followed by the Commentaries the Reading Preference asks
for, in its order: 彖傳, 大象 and 文言 after a Hexagram Statement, 小象 after
a Line Statement or the All-Moving Statement (R-115, R-284, R-326). The Yilin
Verse, when asked for, comes last.

**Text.** The Scripture Catalogue supplies each passage's text, in the
Reading Preference's script, then each of its Translations in order. A
Translation that lacks a passage shows nothing for it; another is never put
in its place. Chinese text is never converted from one script to the other
(`CONTEXT.md`, Edition, Translation). The Licence Gate applies, but every
channel is private, so nothing is hidden in practice (ADR-0028, ADR-0032).

> **Owner:** today's app shows Traditional and Simplified Chinese,
> Wilhelm–Baynes and Legge all at once. The default Reading Preference shows
> Traditional, Legge, 大象 and 小象. How the CLI user sets a Reading
> Preference, for Readouts and for export, is CLI-10.

**Browsing** (use case 4) lists the Journal's Consultations, ordered by
Divined At, newest first, narrowed by a filter on the Query text. How a
date-only Divined At sorts against moments is CLI-7. **Opening** (5) loads
one and resolves it; it never writes to the Journal (ADR-0037).
**Deleting** (6) removes one and keeps a Deletion Record, so that Merging
Journals never brings it back.

**Importing** (7) is in 6.7; **exporting** (9) and **merging** (10) are in
6.8.

## 5. Input and output formats

**The Readout.** In the full-screen interface, a Readout has four tabs:

1. **Casting**: the eighteen Rounds as a ledger, one row per Round, from Line 6
   at the top to Line 1 at the bottom, with each Round's stalks, heaps, piles
   of four, Remainders, Hung Stalk and Set-aside. A Recorded Consultation shows
   that it has no Casting instead.
2. **Transformation**: the Standing and Emerging Hexagrams side by side, each
   Line with its Line Value and Line Position, Moving Lines marked, with each
   Hexagram's Received Sequence Number, names, and Upper and Lower Trigrams.
3. **Standing Hexagram**: its Figure, names, and its Applicable Passages with
   their text and Commentaries.
4. **Emerging Hexagram**: the same for the Emerging Hexagram (absent for
   X之X).

The Query is shown above the tabs. The Division Method is shown with the
Casting. Each block of text is headed by its Edition, as today's app heads
each with its script or translator.

> **Owner:** R-116 leaves Hexagram names out of use case 3 and defers what a
> Readout contains to this manual (CLI-11, which also covers today's
> Wilhelm–Baynes Trigram imagery). How the Applicable Passages divide between
> the tabs is CLI-12; the Nuclear, Inverse and Reversed Hexagrams are CLI-13;
> how Editions and Witnesses are named is CLI-14. Showing the Division Method
> is new: today's app does not record it (ADR-0027).

**Plain output.** `--plain` prints the same Readout as a sequence of titled
sections to stdout, in tab order. Its exact bytes, colour codes included,
are the fixtures' (ADR-0009, ADR-0013).

**The Consultation file.** Each Consultation is one Markdown file named
`<divined date>--<Consultation Id>.md`, for example
`2026-11-02--01M6E6AHA84T7V2M5N6P0R1S2K.md` for a Consultation cast on
2 November 2026 at 21:14 (+08:00). Its YAML frontmatter is the version-2
record (`schemaVersion`, `id`, `divinedAt`, `query`, `transformation`, and
for a Cast Consultation `casting` and `divisionMethod`); its body is a
rendered Readout that the Store never reads (ADR-0030). Writes are atomic,
and a new file never overwrites another. _Today's app_ writes
`consultation-<save time>.md`, version 1. ADR-0030 replaces it.

**Deletion Records.** Each Deletion Record holds a Consultation Id and when it
was deleted, kept beside the Markdown files (ADR-0037). Their file layout is
pending CLI-19.

**The browse list.** The title names the Journal and counts both kinds of
record, for example `40 consultations · 2 unreadable`. Each Consultation
takes two lines: Divined At and the Query, then the Standing Hexagram's
Received Sequence Number and names, with the Emerging Hexagram's after an
arrow when lines move. Unreadable files are listed after the Consultations.

Example rows, invented:

```
[2026-11-02 21:14] Should the granary at Greyfen Hold be rebuilt before winter?
    #1 乾  ──▶ #44 姤
[2026-10-28]       Will Steward Aelric's embassy to Westmill succeed?
    #2 坤
```

The second row is a Recorded Consultation dated to the day only.

> **Owner:** three changes from today's list. A row shows only a date when
> Divined At has no time; that is new with Recorded Consultations
> (ADR-0026), and how it sorts is CLI-7. Today each row also shows the
> Wilhelm–Baynes English name; with the default Reading Preference that
> Translation is not shown, so the names a row shows follow CLI-11. The
> counts stay in the title, as today.

## 6. Operating instructions

### 6.1 What every full-screen command shares

- `Tab` and `Shift+Tab` (or `]` and `[`) move between tabs; `↑`, `↓`,
  `PgUp`, `PgDn`, `g` and `G` scroll; `<` and `>` pan wide content.
- While a Casting is in progress, the other tabs are locked and the Casting
  tab follows the Line being cast. A footer shows progress, `N/18`.
- `Escape` goes back or quits; `Ctrl+C` quits. If quitting would lose
  unsaved work, a Casting in progress or a Consultation that failed to save,
  the CLI asks for confirmation first. An abandoned Casting keeps nothing.
- If keeping fails, the Readout stays on screen with the error, and `r`
  retries.
- After a Consultation is kept, the footer shows the file it was kept in.
- A command that cannot run in this environment (section 2) prints
  `<command> requires an interactive terminal` to stderr and exits 1.

**Exit codes.** 0 on a normal ending, including the user quitting; 1 on a
refusal or an error. Today an unexpected error prints the full error, with its
stack, to stderr.

> **Owner:** _Proposed_ that an error prints one line instead; what counts as
> an error, the exit code after discarding an unsaved Consultation, and a
> failure partway through an import or merge are CLI-20. Unknown options and
> bad option values are CLI-21.

### 6.2 `hexagram`: Home

Opens a banner and a menu leading to the other commands: casting with each
Division Method, recording, browsing, and the Playground. It takes the casting
options of section 7 and passes them on.

- Normal ending: the user quits from the menu. Exit 0.
- Abnormal ending: an environment that is not interactive, `NO_COLOR` and
  `CI` included (6.1). Exit 1.

> **Owner:** `hexagram` is a sixth binary that today's `AGENTS.md` does not
> list, while R-011 counts five commands. See CLI-1. The menu entry for
> recording is new (CLI-3).

### 6.3 `hexagram-random`: cast with Automatic Division

1. The Viewer opens with an empty Query box. The user types the Query and
   presses Enter; a blank Query is refused.
2. The machine makes the eighteen Divisions. The Casting tab fills Round by
   Round at a ceremonial pace: a slider that settles on each Pick, or with
   typed input a number that appears (`--cast-bounce-ms`,
   `--cast-reveal-ms`). `Space` skips the rest of the playback.
3. The Cast Consultation is kept, with Division Method Automatic, and the
   tabs unlock.

With `--plain`, or when stdout is not a TTY, the CLI asks for the Query on
one line, casts, prints the Readout and keeps the Consultation.

- Normal ending: the user quits after the Readout, or the plain Readout has
  been printed and kept. Exit 0. `Ctrl+C` at the plain Query prompt is a quit
  too, exit 0, with nothing kept.
- Abnormal endings: the Consultation cannot be kept. In the full-screen
  interface, retry or discard as in 6.1; in plain mode, an error on stderr,
  exit 1. In plain mode, a stdin that is closed or empty before the Query is
  given ends with nothing kept.

> **Owner:** the exit code for a closed stdin in plain mode is not verified
> against today's app; _Proposed_: exit 1, as an error (CLI-20).

### 6.4 `hexagram-interactive`: cast with Virtual Division

As 6.3, except that the user makes each of the eighteen Divisions:

- **Slider** (the default): a cursor sweeps the valid Picks of the Round, and
  `Space` makes the Division where it stands. The Pick is then shown, as left
  heap, right heap and the Hung Stalk, before the next Round. The cursor
  never shows its number while moving.
- **Typed number** (`--numeric-input`, or forced by `NO_COLOR` or `CI`): the
  user types a Pick and presses Enter. A number outside the Round's valid
  Picks is refused inline.

Plain mode always uses typed input, with a welcome text before the Query.
The Consultation is kept with Division Method Virtual. Endings are as 6.3.

### 6.5 `hexagram-manual`: cast with Physical Division

Ink only. For each Round the user divides real stalks, counts each heap off in
fours, and types four counts: left piles, left Remainder, right piles, right
Remainder. `Tab` and `Shift+Tab` move between the four fields. A diagram shows
the stalks of the Round and how the counts account for them.

- The checks run as the user types, in ADR-0043's order. The first failure is
  named: an incomplete Transcription leaves a neutral placeholder; a Remainder
  outside 1 to 4 is named in red, with the hint that a heap that counts off
  evenly leaves a Remainder of 4, never 0; a wrong Set-aside is named in red
  as a miscount of the Remainders (ADR-0043); a conservation failure shows as
  the red `MISSING STALKS` gauge in the diagram.
- Once every check passes, Enter commits the Round. The resolved Round stays
  highlighted for a moment (`--manual-reveal-ms`); a second Enter skips the
  wait.
- `Ctrl+R` is Line Retraction (section 4). `?` opens a help overlay.
- After the eighteenth Round, the Cast Consultation is kept with Division
  Method Physical.

> **Owner:** today's gauge is a live count, shown while the user types. With
> ADR-0043's order, the gauge and a strip message for `remainders` or
> `set-aside` can both show at once. Which one names the refusal? See CLI-9.

- Normal ending: the user quits after the Readout. Exit 0.
- Abnormal endings, each on stderr with exit 1: an environment that is not
  interactive (6.1); a terminal under 32 rows at start (`hexagram-manual needs
a terminal at least 32 rows tall; yours is N`). Keeping fails: as 6.1.

> **Owner:** today the height is checked only at start. A terminal shrunk
> below 32 rows during a Casting is not handled; _Proposed_: the diagram is
> replaced by a "make the terminal taller" notice, and the Transcriptions
> made so far are kept in memory until it grows back (CLI-9).

### 6.6 `hexagram-playground`: explore a Transformation

Ink only. Shows a Transformation the user changes Line by Line: each Line
steps through the four Line Values. The Readout updates as the Lines change:
both Hexagrams and every Applicable Passage, as in section 4. The Playground
keeps nothing (ADR-0026).

_Today's app_ shows the Line Statements only when exactly one line moves, and
offers a save that keeps a Consultation with no Casting. ADR-0024 and
ADR-0026 replace both: every Applicable Passage is shown, and recording a
divination done elsewhere is its own action (6.8).

- Normal ending: the user quits. Exit 0.
- Abnormal ending: an environment that is not interactive (6.1), exit 1.

### 6.7 `hexagram-history`: browse, open, delete, import

Ink only, except for import. Opens the browse list (section 5) of the
Journal.

- `↑` and `↓` move (wrapping at the ends), `PgUp`, `PgDn`, `g` and `G` jump.
- `/` starts a filter: the list narrows, as the user types, to Consultations
  whose Query contains the text, ignoring case. `Escape` clears it.
- `Enter` opens the focused Consultation as a Readout. `Escape` returns to the
  list, focused on it again. Opening never writes the file.
- `Ctrl+D` deletes the focused Consultation, after a Y/N confirmation. The
  deletion is permanent and leaves a Deletion Record.
- An Unreadable file is listed and counted apart. A file is unreadable when
  it fails to load as a version-2 record, or when its Casting does not replay
  to its Transformation (ADR-0030). Every version-1 file is therefore
  unreadable until it is migrated. `Enter` on an Unreadable row opens
  nothing; the footer shows `Cannot open — <reason>`, as today.

> **Owner:** today `Ctrl+D` also deletes an Unreadable file. Use case 6
> deletes by Consultation Id, which an Unreadable file may not have. See
> CLI-6.

_Today's app_ rewrites a file whose body differs from a fresh rendering when
it is opened, and deletes a file without a record. ADR-0030 and ADR-0037
replace both: re-rendering bodies is a separate maintenance action, and every
deletion keeps a Deletion Record.

> **Owner:** ADR-0030's maintenance action, re-rendering every body, has no
> way to run it yet. See CLI-5.

**Import.** `hexagram-history --convert-legacy` today converts pre-Markdown
`.txt` files in the Journal folder to version-1 Markdown, moves each original
into `consultations/legacy/`, and prints one `OK` or `SKIP` line per file and
a summary. In the overhaul it becomes use case 7: each legacy file is kept as
a Cast Consultation when its Casting replays, and as a Recorded Consultation
otherwise (ADR-0026). Each gets a new Consultation Id. One Division Method
applies to every Cast Consultation of one run, so files of different origins
are imported in separate batches. Importing is run once: importing the same
files twice keeps them twice. A file that cannot be parsed is reported and
skipped.

> **Owner:** how import finds its files, how it takes the Division Method,
> and whether ADR-0030's version-1 migration is this same command are CLI-4.
> _Proposed_ (CLI-20): import exits 0 when it finishes, even with files
> skipped.

**Checking an import.** The per-file lines and the summary say what was kept
and what was skipped. Opening `hexagram-history` afterwards shows the new
count of Consultations and of Unreadable files.

- Normal ending: the user quits from the list. Exit 0.
- Abnormal endings: an environment that is not interactive (6.1), or the
  Journal cannot be read. Exit 1.

### 6.8 Recording, exporting and merging

ADR-0037 puts use cases 2, 9 and 10 on the CLI, but today's app has none of
them. This draft proposes where each lives. None of it is decided.

- **Record a Consultation.** A form with three fields: the Query, Divined At
  (a date, or a date and time), and the six Line Values, set as in the
  Playground. Enter keeps a Recorded Consultation and opens its Readout. A
  blank Query, or a Divined At that is not a valid date, is refused inline.
- **Export.** Writes a Readout of each chosen Consultation as Typst source,
  or as a PDF, in the browse list's order and in a Reading Preference
  (CLI-10). An export holds private Consultations and must never be committed
  (ADR-0015).
- **Merge Journals.** Writes this Journal, its Consultations and Deletion
  Records, as a bundle, and merges a bundle into this Journal (ADR-0037).
  The result is the union of Consultations by Consultation Id, minus every one
  named by either side's Deletion Records. Merging is symmetric and
  idempotent; a deleted Consultation never comes back. Each incoming Cast
  Consultation is checked by replay first (ADR-0026). A bundle holds private
  Consultations and must never be committed (ADR-0015).
  _Proposed_ (CLI-20): one that does not replay is left out and reported,
  and the merge goes on.
- **Checking a merge.** _Proposed_: the merge prints how many Consultations
  were added, how many were removed by Deletion Records, and how many were
  left out; opening `hexagram-history` shows the result.

> **Owner:** CLI-3 asks where Record lives, CLI-17 how Export is invoked, and
> CLI-18 how merging is invoked and what holds the bundle.

## 7. Options

Options are given after the command (after `--` when run through `pnpm`).
Each value is a positive whole number; today a missing or malformed value
falls back silently to the default (CLI-21).

| Option                     | Commands                                              | Effect                                                                                                           | Default |
| -------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------- |
| `--plain`, `--no-ui`       | `hexagram-random`, `hexagram-interactive`             | the plain scrolling output instead of the full-screen interface; implied when stdout is not a TTY                | off     |
| `--wrap-width <n>`         | the casting commands and `hexagram`                   | the content wrap width, capped to the terminal                                                                   | 120     |
| `--numeric-input`          | `hexagram-interactive`, `hexagram-random`, `hexagram` | typed input instead of the slider; forced on by `NO_COLOR` or `CI` for the two commands with a plain mode        | off     |
| `--slider-sweep-ms <n>`    | `hexagram-interactive`, `hexagram-random`, `hexagram` | the time of one end-to-end sweep of the slider; each step is `n ÷ (valid Picks − 1)` ms, held between 30 and 250 | 1800    |
| `--cast-bounce-ms <n>`     | `hexagram-random`, `hexagram`                         | how long the slider moves before it settles on the machine's Pick                                                | 1500    |
| `--cast-reveal-ms <n>`     | `hexagram-random`, `hexagram`                         | with typed input, the pause before each Pick appears                                                             | 700     |
| `--manual-reveal-ms <n>`   | `hexagram-manual`, `hexagram`                         | how long a resolved Round stays highlighted                                                                      | 2500    |
| `--banner-interval-ms <n>` | `hexagram`                                            | the banner animation's pace                                                                                      | 2160    |
| `--convert-legacy`         | `hexagram-history`                                    | import legacy files instead of browsing (6.7)                                                                    | off     |

`hexagram-manual`, `hexagram-playground` and `hexagram-history` have no plain
mode, and `hexagram-manual` has no slider.

> **Owner:** the Reading Preference options (CLI-10), the import options
> (CLI-4), the maintenance action (CLI-5), and the options for export and
> merging (CLI-17, CLI-18) are not in this table until ruled on.

## 8. Running time

The Oracle's work is immediate: a Casting, a Resolution and a check take no
perceptible time. What a user waits for is pace, set on purpose:

- **Automatic**, with the default options: about 2 s a Round with the slider,
  about 36 s for the Casting; about 0.7 s a Round with typed input, about
  13 s. `Space` skips the rest.
- **Virtual**: the user's own pace. The slider takes 1.8 s to cross the
  Round, and each Pick is shown for about 1 s.
- **Physical**: as long as the stalks take, plus 2.5 s for each resolved Round
  unless skipped.
- **Browsing** reads every file in the Journal to list it. With a few hundred
  Consultations this is expected to take well under a second; it has not been
  measured.
- **Export to PDF** depends on how Typst is reached (CLI-17).

## 9. Accuracy and checking

- **The procedure is exact.** Every Casting follows the yarrow procedure
  Round by Round. A Pick outside 1 to stalks − 2 is refused, so no heap is
  ever left without a countable stalk and no Remainder is ever 0 (ADR-0023).
- **Automatic Division has the classical probabilities**, proved by exact
  enumeration, not by sampling (R-279).
- **Transcriptions are checked** before they become Picks, and every check can
  fire (ADR-0043).
- **A kept Consultation is checked when read.** Its Casting must replay to its
  Transformation; one that does not is an Unreadable file, never shown as a
  Consultation (ADR-0030). Reading never writes.
- **Nothing is lost by accident.** Writes are atomic and never overwrite; a
  Consultation Id is unique; deletion asks first and leaves a Deletion Record.
- **Text is shown as found.** The CLI never converts script and never puts
  one Translation in place of another. Every passage text names its Edition
  and its Witness, and an Edition that cannot be identified is labelled
  unidentified (`CONTEXT.md`, Edition, Witness); how the Readout shows them
  is CLI-14.
- **No interpretation.** No passage is ranked and none is left out
  (ADR-0024). The CLI never adds meaning (ADR-0014).
- **Output is checked by fixtures.** Plain output and the Markdown body are
  locked byte for byte; regenerate them deliberately (ADR-0013).

## Questions for the owner

Each question gives two or three options; **(A) is the drafter's
recommendation**.

### Commands

**CLI-1. Which commands does the overhaul's CLI have, and under what names?**
Today there are six binaries: `hexagram` (Home), and the five R-011 counts.
Four names use forms `CONTEXT.md` avoids: random, interactive and manual for
Division Methods, and history for the Journal.
(A) keep all six names for parity; UI text uses the glossary terms
(Automatic, Virtual, Physical, Journal), and the names stay as stable entry
points.
(B) rename after the glossary: `hexagram-automatic`, `hexagram-virtual`,
`hexagram-physical`, `hexagram-journal`.
(C) one `hexagram` command with subcommands per use case.

**CLI-2. Should `NO_COLOR` keep the Ink-only commands from running on a real
terminal?** ADR-0010 refuses `hexagram`, `hexagram-manual`,
`hexagram-playground` and `hexagram-history` whenever `NO_COLOR` or `CI` is
set, so a screen-reader user cannot cast with Physical Division or browse the
Journal.
(A) no: on a TTY with `NO_COLOR`, they run without colour and with typed
input, and only a headless stdout or `CI` refuses; this amends ADR-0010.
(B) yes: keep ADR-0010 as it stands.

**CLI-3. Where does Record a Consultation live?**
(A) a full-screen form reached from the Home menu and from `hexagram-history`,
using the Playground's Line-by-Line control for the Transformation.
(B) a seventh command, `hexagram-record`.
(C) options only, non-interactive (`--query`, `--divined-at`,
`--transformation 789876`).

**CLI-4. How does import find its files and take its Division Method, and
does it also migrate version-1 files?**
(A) `hexagram-history --import-legacy [<path>…] --division-method
physical|virtual|automatic`: each path is a file or a folder, defaulting to
the Journal folder; the Division Method is required and applies to the whole
batch; it takes both `.txt` and version-1 `.md` files, so it is ADR-0030's
one-off migration too; originals move into `consultations/legacy/`, as today.
(B) keep `--convert-legacy` for `.txt` in the Journal folder, and add a
separate migration command for version-1 files.
(C) as (A), but ask for the Division Method at the start of the run.

**CLI-5. How is ADR-0030's maintenance action, re-rendering every body, run?**
(A) `hexagram-history --rerender-bodies`: it rewrites the body of every
version-2 file atomically, leaves the frontmatter untouched, skips Unreadable
files, and prints how many it rewrote.
(B) it runs at the end of every import, and never on its own.

**CLI-6. Does `Ctrl+D` work on an Unreadable row, and what does it leave?**
Today it deletes the file. Use case 6 deletes by Consultation Id.
(A) no: `Ctrl+D` is refused on an Unreadable row, with a footer naming the
file; the owner repairs, migrates or removes it by hand.
(B) yes: it deletes the file and leaves no Deletion Record, since it is not a
Consultation; this needs a new Store operation, a port change.
(C) yes, and when an Id can be read from the file, it also leaves a Deletion
Record for it.

**CLI-7. How does the browse list order mixed Divined Ats, and in which UTC
offset does it show them?** R-037 keeps a moment with its offset, or a day.
(A) moments are ordered by instant; a day-only Divined At sorts before every
moment that falls on that day in the moment's own offset; each moment is
shown in the offset it was kept with.
(B) as (A), but a day-only Divined At sorts after the moments of its day.
(C) every moment is shown in the terminal's local offset.

**CLI-8. Does the CLI offer Look up the catalogue (use case 8) on its own?**
(A) no: it is reached through the Readout and the Playground, which show
names, passages and their Editions; Editions and Witnesses are listed in each
Readout (CLI-14).
(B) yes: a `hexagram-catalogue` command lists the Editions, with Witness and
licence, and prints any passage by Citation.
(C) yes, as a Catalogue screen in the Home menu.

### Physical Division

**CLI-9. How are the four Transcription checks shown, and what happens if
the terminal shrinks?**
(A) the strip names the first failing check in ADR-0043's order and Enter is
refused with it; the `MISSING STALKS` gauge stays a live count, but turns red
only when `conservation` is the first failure. Below 32 rows mid-Casting, a
"make the terminal taller" notice replaces the diagram, and nothing is lost.
(B) keep today's display unchanged: the gauge red whenever the count is off,
whatever the strip says; no handling of a shrinking terminal.
(C) drop the gauge; the strip names every refusal.

### Readout content

**CLI-10. How does the CLI user set the Reading Preference, for Readouts and
for export?** Use case 9 takes passage texts that use case 3 resolved in a
Reading Preference (R-105, R-125).
(A) options on every command that shows a Readout or exports: `--script
traditional|simplified`, `--translation <edition>` (repeatable, in order),
`--commentary <work>` (repeatable), `--yilin`; the defaults are
`CONTEXT.md`'s.
(B) a preferences file beside the Journal, used by every command.
(C) toggles inside the Readout, not remembered; export uses the defaults.

**CLI-11. Which names does a Readout show (R-116), and does it keep today's
Trigram imagery?** Today's Readout and browse rows show Wilhelm–Baynes names,
and each Trigram's Wilhelm–Baynes imagery (Fire, Water, Lake).
(A) names through use case 8, in the Reading Preference's script and
Translations; Trigram imagery comes from the Translations the preference
shows, so with the defaults it is Legge's or none; browse rows show the
Chinese name and the first Translation's name.
(B) only the Received Sequence Number and the Chinese name, everywhere.

**CLI-12. How are the Applicable Passages laid out?**
(A) the Standing tab holds the Standing Hexagram Statement, the Moving Lines'
Line Statements and the All-Moving Statement; the Emerging tab holds the
Emerging Hexagram Statement. Read across the tabs, this is R-283's order.
(B) a fifth tab, Passages, with all of them in R-283's order.

**CLI-13. Does a Readout show the Nuclear, Inverse and Reversed Hexagrams?**
Use case 3 resolves them (ADR-0025); today's app does not show them.
(A) yes, in each Hexagram's tab, by number and name, beside its Trigrams, as
structure only.
(B) no, not until asked for.

**CLI-14. How does a Readout name each text's Edition and Witness?** The
glossary requires both, and labels the Simplified text as ctext's conversion
of the 武英殿本 text.
(A) each block is headed by its Edition's short name; a closing section lists
each Edition shown with its Witness, any conversion label, and
"unidentified" where it applies.
(B) Edition and Witness in full on every block.

**CLI-15. Reopen R-061 for a line-level 文言 Citation?** R-061 cites 文言 at
Hexagram level only, and R-326 shows it whole after the Hexagram Statement;
but 乾's and 坤's 文言 also comment line by line.
(A) no: keep R-061 and R-326; 文言 is shown whole, and is not in the default
Reading Preference.
(B) yes: amend R-061 with a line-level 文言 Citation, so each Moving Line of
乾 or 坤 is followed by its part of 文言.

**CLI-16. Can a Query span several lines when typed?** `CONTEXT.md` allows it;
today's Query box is one line.
(A) typing stays on one line; a Query of several lines, from import or a merge,
is shown in full.
(B) add a key for a new line in the Query box.

### Export and merging

**CLI-17. How is Export invoked, and how does the CLI reach Typst?**
(A) `hexagram-history --export <path>`, with an optional `--filter <text>`;
the extension chooses `.typ` or `.pdf`; PDF is compiled with Typst's
WebAssembly build as an npm dependency, the compiler the PWA uses
(ADR-0037).
(B) as (A), but PDF needs the `typst` executable on `PATH`, and its absence
is an error, exit 1.
(C) Typst source only; the user compiles it.

**CLI-18. What container holds a Journal bundle, and how is merging
invoked?** ADR-0037 fixes the contents: version-2 records plus Deletion
Records. Only the container is open, and the PWA must read and write the same
bundle.
(A) one JSON file; `hexagram-history --export-journal <file>` and
`--merge-journal <file>`.
(B) a folder of Markdown files, in the Store's own layout, plus its Deletion
Records.
(C) a zip of that folder.

**CLI-19. How are Deletion Records laid out in `consultations/`?** ADR-0037
gives only an example: a small file of deleted Ids beside the Markdown files.
(A) one small file per Deletion Record, in a `deleted/` folder, named by the
Consultation Id and holding when it was deleted; written atomically, never
overwritten, like a Consultation.
(B) one file listing every Deletion Record, rewritten atomically on each
deletion.

### Errors and exits

**CLI-20. What is an error, and what does each ending print and return?**
(A) a failure of the Journal, the Catalogue, the Clock or the Random Source
outside the Viewer prints one line to stderr and exits 1; inside the Viewer,
a failure to keep stays on screen with retry, and discarding the unsaved
Consultation is a quit, exit 0. Import and merge report each skipped file or
record left out and exit 0 when the run finishes. A Store failure partway
through stops at once, exit 1, after reporting what was kept; a merge can be
rerun safely, but rerunning an import keeps its earlier files twice. A closed
stdin in plain mode is an error, exit 1. An Unreadable file is never an
error.
(B) as (A), but import and merge exit 1 whenever anything was skipped or
left out.
(C) keep today's endings: the full error with its stack, exit 1.

**CLI-21. What does an unknown option or a bad option value do?**
(A) refuse it: a one-line usage message on stderr, exit 1.
(B) refuse it with exit 2, the usage convention.
(C) keep today's behaviour: ignore unknown options, and fall back silently to
the default for a bad value.
