// Signal 1's fixed expected list (R-214, R-230, R-256): each `<file>:<line>`
// beside this file maps to the sorted D codes `drift:check` must report on
// that line, matched both ways, so a missing, extra or duplicate report
// fails. A clean twin's line has no entry.
//
// The folder is a stand-in repo (R-232). It reads `AGENTS.md`, two Accepted
// ADRs (one amended) and `docs/design/model.md`; the Superseded and
// Deprecated ADRs, the ADR README with `Status: Accepted` inside its template
// fence, `docs/design/deeper/nested.md`, `CONTEXT.md` and the code comment
// in `overhaul/` each name a missing path that is not read (R-207, R-253).
//
// `AGENTS.md`'s twins, from line 19: an existing file; globs matching files,
// a folder only, and through braces; a `<…>` word; a link and bare text; the
// `./`, `../` and `/` words and one with no root; the `:N`, `:N-M`, `#` and
// `/` suffixes; a fenced span; two paths under the former root `legacy/`,
// counted; and the excepted `docs/planned/guide.md` (R-251, R-252, R-254).
// `0001-accepted.md`'s twins are under Considered options, its fenced
// heading and its `###` subsection.

import type { DocTruthCode } from '../../doc-truth-finding.js'

const agents = 'AGENTS.md'
const accepted = 'docs/adr/0001-accepted.md'
const amended = 'docs/adr/0002-amended.md'
const model = 'docs/design/model.md'
const exceptionFile = 'scripts/drift/doc-truth-exceptions.md'

export const expected: Readonly<Record<string, readonly DocTruthCode[]>> = {
  // D1: a missing file, a word inside a longer span, two misses on one line
  // as one report, a span from line 10 to 11 reported at 10, double
  // backticks, a wrong-case segment, and a wrong-case root, which is a
  // candidate but does not exist (R-251, R-252, R-257, R-230).
  [`${agents}:7`]: ['D1'],
  [`${agents}:8`]: ['D1'],
  [`${agents}:9`]: ['D1'],
  [`${agents}:10`]: ['D1'],
  [`${agents}:12`]: ['D1'],
  [`${agents}:13`]: ['D1'],
  [`${agents}:14`]: ['D1'],
  // D2: a glob that matches nothing (R-252).
  [`${agents}:15`]: ['D2'],
  // An Accepted ADR's body, before and after Considered options (R-253).
  [`${accepted}:7`]: ['D1'],
  [`${accepted}:25`]: ['D1'],
  // An amended ADR is Accepted (R-207).
  [`${amended}:7`]: ['D1'],
  // A design document: D1, D2, and the name `AGENTS.md`'s exception covers,
  // which excepts nothing here (R-254).
  [`${model}:3`]: ['D1'],
  [`${model}:5`]: ['D2'],
  [`${model}:7`]: ['D1'],
  // D4: stale entries; the name exists, the file is not a source, the name
  // is only under Considered options, the file is gone, and the name is
  // under a former root. Line 7 is the one live entry (R-195, R-254).
  [`${exceptionFile}:8`]: ['D4'],
  [`${exceptionFile}:9`]: ['D4'],
  [`${exceptionFile}:10`]: ['D4'],
  [`${exceptionFile}:11`]: ['D4'],
  [`${exceptionFile}:12`]: ['D4'],
}

// The names each report must quote (R-255).
export const named: Readonly<Record<string, readonly string[]>> = {
  [`${agents}:7`]: ['docs/missing.md'],
  [`${agents}:8`]: ['docs/absent.md'],
  [`${agents}:9`]: ['docs/one.md', 'docs/two.md'],
  [`${agents}:10`]: ['docs/wrapped.md'],
  [`${agents}:12`]: ['docs/double.md'],
  [`${agents}:13`]: ['docs/Notes/kept.md'],
  [`${agents}:14`]: ['Docs/notes/kept.md'],
  [`${agents}:15`]: ['docs/**/*.yaml'],
  [`${accepted}:7`]: ['docs/adr-missing.md'],
  [`${accepted}:25`]: ['docs/after-options.md'],
  [`${amended}:7`]: ['docs/amended-missing.md'],
  [`${model}:3`]: ['docs/model-missing.md'],
  [`${model}:5`]: ['docs/design/*.yaml'],
  [`${model}:7`]: ['docs/planned/guide.md'],
  [`${exceptionFile}:8`]: ['docs/other.md'],
  [`${exceptionFile}:9`]: ['docs/superseded-missing.md'],
  [`${exceptionFile}:10`]: ['docs/considered-only.md'],
  [`${exceptionFile}:11`]: ['docs/gone-target.md'],
  [`${exceptionFile}:12`]: ['legacy/old/tool.ts'],
}

// The documents `drift:check` reads, and the statuses `readSource` must
// find in each ADR, read or not (R-253).
export const sources: readonly string[] = [agents, accepted, amended, model]
export const statuses: Readonly<Record<string, string | undefined>> = {
  [agents]: undefined,
  [accepted]: 'Accepted',
  [amended]: 'Accepted (amended by 0001)',
  'docs/adr/0003-superseded.md': 'Superseded by 0001',
  'docs/adr/0004-deprecated.md': 'Deprecated',
  [model]: undefined,
}

// What `checkPaths` must report besides findings: the names a document's
// exceptions excepted, and its former-root counts (R-254, R-255).
export const exceptedIn: Readonly<Record<string, readonly string[]>> = {
  [agents]: ['docs/planned/guide.md'],
}
export const formerRootsIn: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = {
  [agents]: { 'legacy/': 2 },
}

// What `readExceptions` must read from the exception file (R-254).
export const exceptions: readonly {
  readonly line: number
  readonly file: string
  readonly name: string
}[] = [
  { line: 7, file: agents, name: 'docs/planned/guide.md' },
  { line: 8, file: agents, name: 'docs/other.md' },
  {
    line: 9,
    file: 'docs/adr/0003-superseded.md',
    name: 'docs/superseded-missing.md',
  },
  { line: 10, file: accepted, name: 'docs/considered-only.md' },
  { line: 11, file: 'docs/gone.md', name: 'docs/gone-target.md' },
  { line: 12, file: agents, name: 'legacy/old/tool.ts' },
]
export const formerRoots: readonly {
  readonly line: number
  readonly root: string
}[] = [{ line: 16, root: 'legacy/' }]

// Signal 1's summary on this root (R-255): N and M are counted from
// `expected`; X counts the exception file's entries, live or stale.
export const summary = {
  documentsRead: sources.length,
  exceptions: exceptions.length,
  formerRoots: 'legacy/ 2',
} as const

// Every file in the stand-in but this one, so a file added without an
// entry here fails; `overhaul/` holds one, so "1 files parsed".
export const files: readonly string[] = [
  agents,
  'CONTEXT.md',
  accepted,
  amended,
  'docs/adr/0003-superseded.md',
  'docs/adr/0004-deprecated.md',
  'docs/adr/README.md',
  'docs/design/deeper/nested.md',
  model,
  'docs/notes/kept.md',
  'docs/other.md',
  'overhaul/demo/src/present.ts',
  exceptionFile,
]
export const scanned = 1

// A stand-in with an empty `AGENTS.md`, no `docs/` and no exception file,
// as signals 2 and 4's fixtures are (R-253), reads one document and finds
// nothing, and lists no former root (R-258).
export const emptyStandInSummary =
  'signal 1: 0 findings in 0 files (1 documents read, 0 exceptions, former roots: none)'
