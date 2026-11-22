// The scanner's contract (M-003, R-208 to R-213): what the shared scanner
// yields for one file, and for a tree. Signals 2 and 4 read these records;
// `drift:prove` matches them against `fixtures/scanner/expected.ts`.
//
// `scripts/drift/scanner.ts` exports:
//
//   scanText(file: string, text: string): ScanResult
//     Parses `text` with the TypeScript compiler API; `file`'s extension sets
//     the language (`.tsx` and `.jsx` admit JSX). Any parse diagnostic makes
//     the result `ok: false` (R-210).
//
//   scanTree(root: string): Promise<TreeScan>
//     Walks `root` for R-210's extensions, skipping `node_modules/`, `dist/`
//     and dot-folders, and scans each file read. `files` is keyed by the path
//     relative to `root`, always with `/` (R-209). The first file that does
//     not parse ends the walk as `ok: false`, naming that file the same way.
//
// Records are ordered by where their text starts in the source. A test name
// is also yielded as a string (R-212); the two share a start, and the
// `test-name` record comes first.

export type ScanKind = 'comment' | 'string' | 'test-name' | 'identifier'

export interface ScanRecord {
  readonly kind: ScanKind
  // 1-based: the line on which the record's text starts.
  readonly line: number
  // A comment without its delimiters; a string, template fragment or test
  // name read cooked; JSX text trimmed (R-211).
  readonly text: string
}

export type ScanResult =
  | { readonly ok: true; readonly records: readonly ScanRecord[] }
  | { readonly ok: false; readonly message: string }

export type TreeScan =
  | {
      readonly ok: true
      readonly files: ReadonlyMap<string, readonly ScanRecord[]>
    }
  | { readonly ok: false; readonly file: string; readonly message: string }
