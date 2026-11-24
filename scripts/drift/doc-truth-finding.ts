// Signal 1's contract (ADR-0042, R-195, R-201, R-202, R-207, R-251 to
// R-255, R-261 to R-265): how it reads the exception file and a source
// document, how it checks the paths and symbols a document names, and what
// `drift:check` prints. `drift:prove` matches all of it against
// `fixtures/signal-1/expected.ts`, running `drift:check` on a temporary copy
// of that stand-in without `expected.ts`, whose quoted names would otherwise
// be present (R-263).
//
// `scripts/drift/signal-1.ts` exports:
//
//   readExceptions(text: string): ExceptionsRead
//     Reads `scripts/drift/doc-truth-exceptions.md`, its lines ended by LF or
//     CRLF (R-254). The table is the one whose header row's cells, trimmed,
//     are `File`, `Name` and `Reason`; its delimiter row is skipped, and
//     each `|` row after it, up to the first line that does not start with
//     `|`, is an entry. Cells are trimmed, so padding is free. The File and
//     Name cells each hold one code span, read without its backticks; the
//     Reason is the cell's text. Under the heading `## Former roots`, up to
//     the next heading, each `- ` list item holds one code span naming a
//     former root as written, such as `packages/`. Errors, each `ok: false`
//     naming its 1-based line: an entry with an empty or missing field, and
//     an entry whose File and Name repeat an earlier entry's, naming the
//     later line (R-254).
//
//   readSource(text: string): SourceRead
//     Reads one source document, its lines ended by LF or CRLF.
//       - `status` is the text after `Status: ` on the first line starting
//         `Status: ` before the first `##` heading, without its line
//         terminator, or undefined if there is none (R-253).
//       - `words` holds every word of every code span the document's read
//         parts hold, in document order (R-251). A word is a run of
//         non-whitespace inside the span; a span of any backtick-run length
//         closes on the next run of the same length; a span may cross a line
//         break within a paragraph, and each of its words carries the span's
//         start line. Fenced blocks are not read, and links and bare text are
//         not code spans. Nor is a "Considered options" section read: a
//         heading with exactly that text, at any level, up to the next
//         heading of the same or a higher level, headings inside fences
//         ignored (R-207, R-253). Words are as written; `checkPaths` decides
//         which are paths.
//
//   checkPaths(
//     root: string,
//     words: readonly SourceWord[],
//     formerRoots: readonly string[],
//     excepted: ReadonlySet<string>,
//   ): Promise<PathCheck>
//     `root` is the absolute path of the repo `--root` names; `formerRoots`
//     are as `readExceptions` read them; `excepted` holds the Names of the
//     entries whose File is this document (R-254). For each word (R-251): a
//     trailing `:N`, `:N-M`, `#…` or `/` is stripped first; a word starting
//     `./`, `../` or `/`, or holding `<…>`, is skipped; the rest is a
//     candidate if it holds `/` and its first segment is an entry of `root`,
//     or a former root, each ignoring case (R-257). A candidate under a
//     former root is not checked but is counted (R-201). Any other candidate is
//     checked under `root` (R-252): one holding `*`, `?`, `[` or `{` is a
//     glob, through Node's `fs.glob`, and is D2 unless it matches at least
//     one file or folder; any other is D1 unless each of its segments names,
//     by exact case, an entry of the folder before it. A stated limit: on
//     macOS `fs.glob` ignores case, so a wrong-case wildcard part such as
//     `docs/N*` passes there, though Linux catches it (R-260). A D1 or D2
//     candidate whose name is in `excepted` is not a finding.
//
//     `findings` holds one finding per distinct (line, code) (R-230), sorted
//     by line, then code, its `names` the candidates as stripped, in
//     document order, each once. `excepted` lists, each once, the names in
//     the argument `excepted` that would have been a finding. `formerRoots`
//     maps each former root met to its count of candidates, by occurrence
//     (R-255).
//
//   presentNames(root: string): Promise<ReadonlySet<string>>
//     The names present in the code under `root` (R-202, R-262): every run
//     of the characters `[A-Za-z0-9_$]` in the text of every file under
//     `root` whose extension is `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.mjs`,
//     `.cjs` (R-210's) or `.json`, read as UTF-8. The walk never enters, at
//     any depth, a folder named `node_modules`, `dist` or `consultations`,
//     or one whose name starts with `.`. So a name is present if it appears
//     as a whole word, by exact case, anywhere in such a file: code,
//     comments, strings and JSON keys alike. Markdown, and every other
//     extension, never makes a name present; legacy code counts while it
//     lives. `drift:check` calls it once per run.
//
//   checkSymbols(
//     words: readonly SourceWord[],
//     present: ReadonlySet<string>,
//     excepted: ReadonlySet<string>,
//   ): SymbolCheck
//     `present` is as `presentNames` read it; `excepted` is as for
//     `checkPaths`. For each word (R-261): a word holding `/` is skipped, as
//     D1 and D2 check paths; any other word is split at every character
//     outside `[A-Za-z0-9_$]`, so `foo()` gives `foo` and `Foo.bar` gives
//     `Foo` and `bar`. A token is a candidate if it starts with a letter and
//     holds a lowercase letter followed directly by an uppercase one:
//     camelCase, or PascalCase with a lower-to-upper hump. A single
//     lowercase or capitalised word (`keep`, `Casting`), an all-caps word or
//     one whose capitals all lead (`ID`, `ETag`) and snake_case are not. A
//     candidate not in `present` is D3, unless it is in `excepted`, the
//     token being the exception's Name.
//
//     `findings` holds one D3 finding per distinct line (R-230), sorted by
//     line, its `names` the tokens in document order, each once. `excepted`
//     lists, each once, the names in the argument `excepted` that would have
//     been a finding.
//
// `drift:check [--root <dir>]` reads, under `<dir>` or this repo (R-232):
//   - `AGENTS.md`, which must exist;
//   - each `docs/adr/NNNN-*.md` whose status starts with `Accepted`;
//   - each `docs/design/*.md`, not recursively (R-207, R-253);
// and `scripts/drift/doc-truth-exceptions.md`, whose absence means no
// exceptions and no former roots. Each document's words go through both
// `checkPaths` and `checkSymbols`, each given that document's entries; an
// entry that excepts no miss of either in a read document is D4 at its own
// line in the exception file (R-195, R-254).
//
// Tool errors exit 2, printing only the error, to stderr (R-220): a missing
// `AGENTS.md`, naming `AGENTS.md`; a `readExceptions` error, or a former
// root that exists under the root, naming
// `scripts/drift/doc-truth-exceptions.md:<line>` (R-253, R-254). Otherwise it
// prints to stdout:
//
//   - every finding of every signal as `<file>:<line> <code>: <message>`,
//     merged and sorted by file, line and code, by code units (R-209). A D1
//     with one name reads `path "<name>" does not exist; docs name only what
//     exists (ADR-0042, R-195)`; every D message quotes each of its names
//     (a D4 its entry's Name) and cites ADR-0042 and R-195; a D2 says the
//     glob "matches nothing" (R-255). A D3 with one name reads
//     `symbol "<name>" is not in the code; docs name only what exists
//     (ADR-0042, R-195)`, and with several `symbols "<a>", "<b>" are not in
//     the code; …` (R-264);
//   - then the `<N> files parsed` line;
//   - then `signal 1: <N> findings in <M> files (<S> documents read, <X>
//     exceptions, former roots: <root> <count>)`, N counting report lines,
//     D3's included, even when N is 0 (R-255, R-264);
//   - then signal 2's summary, then signal 4's (R-247).
//
// It exits 1 when any signal finds anything, 0 when clean, 2 on a tool
// error.

export type DocTruthCode = 'D1' | 'D2' | 'D3' | 'D4'

export const docTruthCodes: readonly DocTruthCode[] = ['D1', 'D2', 'D3', 'D4']

export interface DocTruthException {
  // 1-based: the entry's line in the exception file.
  readonly line: number
  readonly file: string
  readonly name: string
  readonly reason: string
}

export interface FormerRoot {
  // 1-based: the list item's line in the exception file.
  readonly line: number
  // As written, such as `packages/`.
  readonly root: string
}

export type ExceptionsRead =
  | {
      readonly ok: true
      readonly exceptions: readonly DocTruthException[]
      readonly formerRoots: readonly FormerRoot[]
    }
  | { readonly ok: false; readonly line: number; readonly message: string }

export interface SourceWord {
  // 1-based: the line its code span starts on.
  readonly line: number
  readonly word: string
}

export interface SourceRead {
  readonly status: string | undefined
  readonly words: readonly SourceWord[]
}

export interface DocTruthFinding {
  // 1-based: the line the names' code spans start on.
  readonly line: number
  readonly code: DocTruthCode
  readonly names: readonly string[]
}

export interface PathCheck {
  readonly findings: readonly DocTruthFinding[]
  readonly excepted: readonly string[]
  readonly formerRoots: ReadonlyMap<string, number>
}

export interface SymbolCheck {
  readonly findings: readonly DocTruthFinding[]
  readonly excepted: readonly string[]
}
