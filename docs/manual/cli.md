# CLI manual

Status: **ratified** by the owner on 2026-11-26 (R-353). It is the standard for
what the CLI does in Phase 4; byte fixtures stay the standard for exact output
(R-008, `docs/manual/README.md`).

It follows Brooks's nine items, one section each. Where the CLI differs from
today's app, the change is marked _Today's app_ and cites the ADR or Ruling
that decides it. Terms are `CONTEXT.md`'s. Examples are invented.

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

These are nine of ADR-0037's ten use cases. The tenth, Look up the catalogue
(use case 8), has no command of its own: it is reached through every Readout
and the Playground, which show names, passages and their Editions (R-338).
The CLI performs 筮 and stops at the moment of reception: it shows the
Applicable Passages and their text, and never tells the user what they mean
(ADR-0014, ADR-0024).

## 2. Environment

- **Platform.** Node.js 24.6 or later (the root `package.json` `engines`
  field). The CLI is a Private Channel: it runs locally for the owner, with no
  sign-in (ADR-0032).
- **Launching.** Each command is a binary of the CLI package, run by name
  (`hexagram-random`, and so on) once built. From a checkout, `pnpm
hexagram-random` and its siblings run the same command from source; options
  then follow `--`.
- **Terminal.** Most commands draw a full-screen Ink interface. Which run
  where depends on stdout and on `NO_COLOR` and `CI` (ADR-0010, amended by
  R-332):

  | Command                                                                  | TTY         | TTY with `NO_COLOR`                 | TTY with `CI`            | stdout not a TTY |
  | ------------------------------------------------------------------------ | ----------- | ----------------------------------- | ------------------------ | ---------------- |
  | `hexagram-random`, `hexagram-interactive`                                | full-screen | full-screen, typed input            | full-screen, typed input | plain mode       |
  | `hexagram`, `hexagram-manual`, `hexagram-playground`, `hexagram-history` | full-screen | full-screen, no colour, typed input | refuses                  | refuses          |
  | `hexagram-history` maintenance options (6.7, 6.8)                        | runs        | runs                                | runs                     | runs             |

  With `NO_COLOR` or `CI`, typed input replaces the moving slider, so a screen
  reader or a script is never left watching an animation. _Today's app_
  refuses the four Ink-only commands under `NO_COLOR` or `CI` even on a TTY;
  R-332 amends ADR-0010 for `NO_COLOR` only, and `CI` still refuses them.

- **Height.** `hexagram-manual` needs a terminal at least 32 rows tall
  (ADR-0010, amendment; ADR-0011).
- **Width.** Content wraps at 120 columns by default (`--wrap-width`), capped
  to the terminal's width. Fixed-width figures never wrap; the user pans them
  with `<` and `>`.
- **Storage.** The Journal is a folder of Markdown files, the Markdown
  Consultation Store, at `consultations/` under the repository root, whichever
  directory a command is run from (ADR-0020). The folder is git-ignored and
  must never be committed (ADR-0015). Only version-2 records load; every
  version-1 file is an Unreadable file until import migrates it (6.7).
- **Dependencies.** The Scripture Catalogue is bundled; no network is needed.
  PDF export uses Typst's WebAssembly build, an npm dependency of the CLI and
  the same compiler the PWA uses (R-347).

## 3. Domain and range

**Inputs the CLI accepts:**

| Input              | Domain                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Query              | any non-blank text, kept exactly as written; typed on one line (R-346)                                                                                  |
| Pick (Virtual)     | a valid Pick of the Round: 1 to the Round's stalks − 2 (ADR-0023)                                                                                       |
| Transcription      | four whole counts: piles of four and Remainder, for the left and the right heap; Remainders 1 to 4 (ADR-0043)                                           |
| Transformation     | six Line Values, each 6, 7, 8 or 9, set bottom-up from Line Position 1                                                                                  |
| Divined At         | for a Recorded Consultation, a date, or a date and time with UTC offset (ADR-0046, R-037); for a Cast one, the moment its Casting was completed (R-532) |
| Reading Preference | Chinese script, Translations in order, Commentaries, and the Yilin Verse on or off (`CONTEXT.md`; options in section 7)                                 |

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
Transformation like any other. A Query of several lines, from import or a
merge, is shown in full.

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
  `node:crypto` (ADR-0037). _Today's app_ picks every valid Pick with equal
  probability.
- **Virtual.** The user makes each Division on screen, with the slider or a
  typed number. Either way it is the same Division Method (ADR-0027).
- **Physical.** The user divides real stalks and transcribes each Round. A
  Transcription becomes a Pick, 4 × left piles + left Remainder, only once it
  passes four checks, run in this order, the first failure being the one
  named (ADR-0043): `complete`, `remainders`, `set-aside`, `conservation`.
  _Today's app_ runs conservation before the Set-aside check (ADR-0011).

**Line Retraction**, for Physical Division only: the user may discard the
Picks of the incomplete Line, or of the Line just completed before the next
Line's first Pick, and transcribe them again. It leaves no trace in the
Casting (`CONTEXT.md`).

**Keeping.** A completed Casting is kept as a Cast Consultation: the Query,
Divined At, the Transformation, the Casting and the Division Method. Divined
At is read once from the Clock when the Casting is complete, before the
Consultation is kept; the Consultation Id, a ULID, is built from that same
moment (ADR-0046, R-532). A kept Consultation is never
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

Each passage is followed by the Commentaries the Reading Preference asks
for, in its order: 彖傳, 大象 and 文言 after a Hexagram Statement, 小象 after
a Line Statement or the All-Moving Statement (R-115, R-284, R-326). 文言 is
shown whole, never split by line (R-061, R-345). The Yilin Verse, when asked
for, comes last.

**Text and names.** The Scripture Catalogue supplies each passage's text, in
the Reading Preference's script, then each of its Translations in order.
Hexagram names and Trigram imagery come through use case 8 in the same way,
following the preference (R-341). A Translation that lacks a passage shows
nothing for it; another is never put in its place. Chinese text is never
converted from one script to the other (`CONTEXT.md`, Edition, Translation).
The Licence Gate applies, but every channel is private, so nothing is hidden
in practice (ADR-0028, ADR-0032). _Today's app_ shows Traditional and
Simplified Chinese, Wilhelm–Baynes and Legge all at once; the default Reading
Preference shows Traditional, Legge, 大象 and 小象 (R-340).

**Browsing** (use case 4) lists the Journal's Consultations, newest first by
Divined At, narrowed by a filter on the Query text. Rows sort by the date of
their Divined At, in its own offset; within one date, a date-only Divined At
sorts before every moment, and moments of one date sort by instant (R-337,
R-482).
**Opening** (5) loads one and resolves it; it never writes to the Journal
(ADR-0037). **Deleting** (6) removes one and keeps a Deletion Record, so that
Merging Journals never brings it back.

**Importing** (7) is in 6.7; **exporting** (9) and **merging** (10) are in
6.8.

## 5. Input and output formats

**The Readout.** In the full-screen interface, a Readout has four tabs:

1. **Casting**: the eighteen Rounds as a ledger, one row per Round, from Line 6
   at the top to Line 1 at the bottom, with each Round's stalks, heaps, piles
   of four, Remainders, Hung Stalk and Set-aside, and the Division Method. A
   Recorded Consultation shows that it has no Casting instead.
2. **Transformation**: the Standing and Emerging Hexagrams side by side, each
   Line with its Line Value and Line Position, Moving Lines marked, with each
   Hexagram's Received Sequence Number, names, and Upper and Lower Trigrams.
3. **Standing Hexagram**: its Figure, names, Trigrams, and its Nuclear,
   Inverse and Reversed Hexagrams by number and name, as structure only
   (R-343); then its Hexagram Statement, the Moving Lines' Line Statements
   and the All-Moving Statement, each with its Commentaries.
4. **Emerging Hexagram**: the same structure, then its Hexagram Statement
   (absent for X之X).

Read across the two Hexagram tabs, the passages are in R-283's order
(R-342). The Query is shown above the tabs, with its Divined At on the line
below it, such as `2026-11-02 21:14`, or `2026-10-28` alone when only the date
was recorded (R-520). Each block of text is headed by
its Edition's short name; a closing section lists each Edition shown with its
Witness, any conversion label (such as the Simplified text's), and
"unidentified" where it applies (R-344). _Today's app_ records no Division
Method (ADR-0027) and shows no Nuclear, Inverse or Reversed Hexagram.

**Plain output.** `--plain` prints the same Readout as a sequence of titled
sections to stdout, in tab order. Its exact bytes, colour codes included,
are the fixtures' (ADR-0009, ADR-0013).

**The Consultation file.** Each Consultation is one Markdown file named
`<divined date>--<Consultation Id>.md`, for example
`2026-11-02--01M6E6AHA84T7V2M5N6P0R1S2K.md` for a Consultation cast on
2 November 2026 at 21:14 (+08:00). Its YAML frontmatter is the version-2
record (`schemaVersion`, `id`, `divinedAt`, `query`, `transformation`, and
for a Cast Consultation `casting` and `divisionMethod`); its body is a
rendered Readout that the Store never reads (ADR-0046). Writes are atomic,
and a new file never overwrites another. _Today's app_ writes
`consultation-<save time>.md`, version 1.

**Deletion Records.** One small file per Deletion Record in
`consultations/deleted/`, named by the Consultation Id and holding when it
was deleted; written atomically and never overwritten (R-349).

**The Journal bundle.** One JSON file holding version-2 records and Deletion
Records (ADR-0037, R-348). The PWA reads and writes the same bundle.

**The browse list.** The title names the Journal and counts both kinds of
record, for example `40 consultations · 2 unreadable`. Each Consultation
takes two lines: Divined At and the Query, then the Standing Hexagram's
Received Sequence Number and names, with the Emerging Hexagram's after an
arrow when lines move. A moment shows in the offset it was kept with; a
date-only Divined At shows the date alone (R-337). Unreadable files are listed
after the Consultations.

Example rows, invented:

```
[2026-11-02 21:14] Should the granary at Greyfen Hold be rebuilt before winter?
    #1 乾  ──▶ #44 姤
[2026-10-28]       Will Steward Aelric's embassy to Westmill succeed?
    #2 坤
```

The second row is a Recorded Consultation dated to the day only. _Today's
app_ shows each row's Wilhelm–Baynes English name; names now follow the
Reading Preference (R-341).

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
  retries. Discarding the unsaved Consultation instead is a quit, exit 0.
- After a Consultation is kept, the footer shows the file it was kept in.
- A full-screen command it refuses to run (section 2) prints `<command> requires
an interactive terminal` to stderr and exits 1.

**Exit codes** (R-350). 0 on a normal ending, including the user quitting; 1
on a refusal or an error. An error is a failure of the Journal, the Catalogue,
the Clock or the Random Source outside the Viewer; it prints one line to
stderr. An Unreadable file is never an error. An unknown option or a bad
option value is refused with a one-line usage message on stderr, exit 1
(R-351). _Today's app_ prints the full error with its stack, and silently
ignores bad options.

### 6.2 `hexagram`: Home

Opens a banner and a menu leading to the other commands: casting with each
Division Method, recording (6.8), browsing, and the Playground. It takes the
casting options of section 7 and passes them on. All six command names are
kept for parity; on-screen text uses the glossary terms (R-331).

- Normal ending: the user quits from the menu. Exit 0.
- Abnormal ending: stdout is not a TTY, or `CI` is set (6.1). Exit 1.

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
- Abnormal endings: the Consultation cannot be kept: in the full-screen
  interface, retry or discard as in 6.1; in plain mode, one line on stderr,
  exit 1, with the Readout already printed (R-532). In plain mode, a stdin
  closed before the Query is given ends with nothing kept, exit 1 (R-377).

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

Full-screen only. For each Round the user divides real stalks, counts each
heap off in fours, and types four counts: left piles, left Remainder, right
piles, right Remainder. `Tab` and `Shift+Tab` move between the four fields. A
diagram shows the stalks of the Round and how the counts account for them.

- The checks run as the user types. A strip names the first failing check in
  ADR-0043's order, and Enter is refused with it (R-339): an incomplete
  Transcription leaves a neutral placeholder; a Remainder outside 1 to 4 is
  named in red, with the hint that a heap that counts off evenly leaves a
  Remainder of 4, never 0; a wrong Set-aside is named in red as a miscount of
  the Remainders. The `MISSING STALKS` gauge in the diagram is a live count,
  red only when `conservation` is the first failure.
- Once every check passes, Enter commits the Round. The resolved Round stays
  highlighted for a moment (`--manual-reveal-ms`); a second Enter skips the
  wait.
- `Ctrl+R` is Line Retraction (section 4). `?` opens a help overlay.
- If the terminal shrinks below 32 rows during a Casting, a notice to make it
  taller replaces the diagram, and nothing transcribed is lost (R-339).
- After the eighteenth Round, the Cast Consultation is kept with Division
  Method Physical.

Endings:

- Normal ending: the user quits after the Readout. Exit 0.
- Abnormal endings, each on stderr with exit 1: stdout is not a TTY, or `CI`
  is set (6.1); the
  terminal is under 32 rows at start (`hexagram-manual needs a terminal at
least 32 rows tall; yours is N`). Keeping fails: as 6.1.

### 6.6 `hexagram-playground`: explore a Transformation

Full-screen only. Shows a Transformation the user changes Line by Line: each
Line steps through the four Line Values. The Readout updates as the Lines
change: both Hexagrams and every Applicable Passage, as in section 4. The
Playground keeps nothing (ADR-0026).

_Today's app_ shows the Line Statements only when exactly one line moves, and
offers a save that keeps a Consultation with no Casting. ADR-0024 and
ADR-0026 replace both; recording a divination done elsewhere is its own
action (6.8).

- Normal ending: the user quits. Exit 0.
- Abnormal ending: stdout is not a TTY, or `CI` is set (6.1), exit 1.

### 6.7 `hexagram-history`: browse, open, delete, and maintenance

Full-screen, except for the maintenance options. Opens the browse list
(section 5) of the Journal.

- `↑` and `↓` move (wrapping at the ends), `PgUp`, `PgDn`, `g` and `G` jump.
- `/` starts a filter: the list narrows, as the user types, to Consultations
  whose Query contains the text, ignoring case. `Escape` clears it.
- `Enter` opens the focused Consultation as a Readout. `Escape` returns to the
  list, focused on it again. Opening never writes the file.
- `Ctrl+D` deletes the focused Consultation, after a Y/N confirmation. The
  deletion is permanent and leaves a Deletion Record.
- An Unreadable file is listed and counted apart. A file is unreadable when
  it fails to load as a version-2 record, or when its Casting does not replay
  to its Transformation (ADR-0046). `Enter` on an Unreadable row opens
  nothing; the footer shows `Cannot open — <reason>`. `Ctrl+D` on it is
  refused, with a footer naming the file; the owner deals with the file by
  hand (R-336).
- The Record a Consultation form is reached from here as from Home (6.8).

_Today's app_ rewrites a drifted body when a file is opened, deletes a file
without a record, and lets `Ctrl+D` delete an Unreadable file. ADR-0046,
ADR-0037 and R-336 replace all three.

**Import** (use case 7; R-334). `hexagram-history --import-legacy [<path>…]
--division-method physical|virtual|automatic`. Each path is a file or a
folder, and defaults to the Journal folder. It takes legacy `.txt` files and
version-1 `.md` files, so it is also ADR-0046's one-off migration. Each file
is kept as a Cast Consultation when its Casting replays, with the run's
Division Method, and as a Recorded Consultation otherwise (ADR-0026); files
of different origins are imported in separate batches. Each gets a new
Consultation Id, and its original moves into `consultations/legacy/`.
Importing the same files twice keeps them twice. It prints one line per file,
kept or skipped with the reason, and a summary; opening `hexagram-history`
afterwards shows the new counts. _Today's_ `--convert-legacy` converts `.txt`
files to version 1 only.

**Re-rendering bodies** (R-335). `hexagram-history --rerender-bodies`
rewrites the body of every version-2 file atomically, leaves the frontmatter
untouched, skips Unreadable files, and prints how many it rewrote. It is run
deliberately after a renderer change (ADR-0046).

Endings:

- Normal ending: the user quits from the list; or a maintenance run finishes,
  even with files skipped. Exit 0.
- Abnormal endings, exit 1: stdout is not a TTY, or `CI` is set, when browsing (6.1); the
  Journal cannot be read; a Store failure partway through an import, which
  stops it at once after reporting what was kept (rerunning it keeps again
  any file kept but not yet moved); with `--export`, no Consultation
  matching, the target already existing, the target unwritable, a font that
  cannot be read, or Typst refusing the source, each one line on stderr and
  no file written (R-547).

### 6.8 Recording, exporting and merging

- **Record a Consultation** (R-333). A full-screen form, reached from Home
  and from `hexagram-history`, with three fields: the Query, Divined At (a
  date, or a date and time), and the six Line Values, set as in the
  Playground. Enter keeps a Recorded Consultation and opens its Readout. A
  blank Query, or a Divined At that is not a valid date, is refused inline.
- **Export** (R-347). `hexagram-history --export <path>`, with an optional
  `--filter <text>`, writes a Readout of each matching Consultation in the
  browse list's order and in the Reading Preference given (section 7). The
  extension chooses Typst source (`.typ`) or a PDF (`.pdf`). An export holds
  private Consultations and must never be committed (ADR-0015).
- **Merge Journals** (R-348). `hexagram-history --export-journal <file>`
  writes this Journal as a bundle (section 5); `--merge-journal <file>`
  merges one in. The result is the union of Consultations by Consultation Id,
  minus every one named by either side's Deletion Records (ADR-0037). Merging
  is symmetric and idempotent; a deleted Consultation never comes back. Each
  incoming Cast Consultation is checked by replay first (ADR-0026); one that
  does not replay is left out and reported, and the merge goes on (R-350). The
  merge prints how many Consultations were added, removed by Deletion Records,
  and left out. A bundle holds private Consultations and must never be
  committed (ADR-0015).

Endings are as 6.7's maintenance runs. A Store failure partway through a
merge stops it, exit 1; a merge can be rerun safely.

## 7. Options

Options follow the command (after `--` when run through `pnpm`). A numeric
value is a positive whole number. An unknown option or a bad value is refused
(R-351).

| Option                                              | Commands                                              | Effect                                                                                                           | Default            |
| --------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ |
| `--plain`, `--no-ui`                                | `hexagram-random`, `hexagram-interactive`             | the plain scrolling output; implied when stdout is not a TTY                                                     | off                |
| `--wrap-width <n>`                                  | the casting commands and `hexagram`                   | the content wrap width, capped to the terminal                                                                   | 120                |
| `--numeric-input`                                   | `hexagram-interactive`, `hexagram-random`, `hexagram` | typed input instead of the slider; forced on by `NO_COLOR`, and by `CI` on the two commands with a plain mode    | off                |
| `--slider-sweep-ms <n>`                             | `hexagram-interactive`, `hexagram-random`, `hexagram` | the time of one end-to-end sweep of the slider; each step is `n ÷ (valid Picks − 1)` ms, held between 30 and 250 | 1800               |
| `--cast-bounce-ms <n>`                              | `hexagram-random`, `hexagram`                         | how long the slider moves before it settles on the machine's Pick                                                | 1500               |
| `--cast-reveal-ms <n>`                              | `hexagram-random`, `hexagram`                         | with typed input, the pause before each Pick appears                                                             | 700                |
| `--manual-reveal-ms <n>`                            | `hexagram-manual`, `hexagram`                         | how long a resolved Round stays highlighted                                                                      | 2500               |
| `--banner-interval-ms <n>`                          | `hexagram`                                            | the banner animation's pace                                                                                      | 2160               |
| `--script traditional\|simplified`                  | every command that shows a Readout or exports         | the Chinese script (R-340)                                                                                       | traditional        |
| `--translation <edition>`                           | the same                                              | a Translation to show; repeatable, in order                                                                      | Legge              |
| `--commentary <work>`                               | the same                                              | a Commentary to show; repeatable, in order                                                                       | 大象, 小象         |
| `--yilin`                                           | the same                                              | show the Yilin Verse                                                                                             | off                |
| `--import-legacy [<path>…]`                         | `hexagram-history`                                    | import legacy files (6.7), with `--division-method physical\|virtual\|automatic`, required                       | the Journal folder |
| `--rerender-bodies`                                 | `hexagram-history`                                    | re-render every body (6.7)                                                                                       | –                  |
| `--export <path>`, `--filter <text>`                | `hexagram-history`                                    | export Consultations (6.8)                                                                                       | –                  |
| `--export-journal <file>`, `--merge-journal <file>` | `hexagram-history`                                    | write or merge a Journal bundle (6.8)                                                                            | –                  |

`hexagram-manual`, `hexagram-playground` and `hexagram-history` have no plain
mode, and `hexagram-manual` has no slider. _Today's_ `--convert-legacy` is
replaced by `--import-legacy`.

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
- **Export to PDF** compiles in-process with Typst's WebAssembly build; not
  yet measured.

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
  Consultation (ADR-0046). Reading never writes.
- **Nothing is lost by accident.** Writes are atomic and never overwrite; a
  Consultation Id is unique; deletion asks first and leaves a Deletion Record.
- **Text is shown as found.** The CLI never converts script and never puts
  one Translation in place of another. Every text names its Edition, and the
  Readout lists each Edition's Witness (R-344; `CONTEXT.md`, Witness).
- **No interpretation.** No passage is ranked and none is left out
  (ADR-0024). The CLI never adds meaning (ADR-0014).
- **Output is checked by fixtures.** Plain output and the Markdown body are
  locked byte for byte; regenerate them deliberately (ADR-0013).
- **Imports and merges report themselves**: each prints what it kept, skipped
  or left out (6.7, 6.8).
