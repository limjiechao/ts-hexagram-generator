// Signal 4's contract (ADR-0042, R-226 to R-232): what it finds in one file's
// scan records, and what `drift:check` prints. `drift:prove` matches both
// against `fixtures/signal-4/expected.ts`.
//
// `scripts/drift/signal-4.ts` exports:
//
//   findEphemeralIds(records: readonly ScanRecord[]): EphemeralFinding[]
//     Reads only `comment` and `test-name` records (R-229), with R-226's
//     patterns and overlap rule, R-227's E5 and R-228's E6. Returns one
//     finding per distinct (line, code) (R-230), sorted by line, then code.
//     A finding's line is its record's line plus the line breaks in the
//     record's text before the ID (R-230); comment text has every line
//     terminator normalised to `\n` by the scanner (R-225).
//
// `drift:check [--root <dir>]` scans `<dir>/overhaul/`, or the repo's
// `overhaul/` (R-232), calls `findEphemeralIds` on each file's records, and
// prints to stdout (R-231):
//
//   - each finding as `<file>:<line> <code>: <message>`, `<file>` relative to
//     the root `--root` names, with `/`; sorted by file, line and code, by
//     code units (R-209); the message lists the finding's IDs and cites
//     ADR-0042 with R-198, or with R-199 for E7;
//   - then the `<N> files parsed` line;
//   - then `signal 4: <N> findings in <M> files`, even when N is 0.
//
// It exits 1 when signal 4 finds anything, 0 when clean, and 2 on a tool
// error, which prints only the error, to stderr, naming the root or the file
// relative to the root (R-209, R-220, R-232).

export type EphemeralCode = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7'

export const ephemeralCodes: readonly EphemeralCode[] = [
  'E1',
  'E2',
  'E3',
  'E4',
  'E5',
  'E6',
  'E7',
]

export interface EphemeralFinding {
  // 1-based: the line the IDs are on.
  readonly line: number
  readonly code: EphemeralCode
  // The IDs matched for this code on this line, in source order.
  readonly ids: readonly string[]
}
