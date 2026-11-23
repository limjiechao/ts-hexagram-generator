// Signal 2's contract (ADR-0042, R-196, R-197, R-200, R-203, R-243 to R-247):
// how it reads `CONTEXT.md`, what it finds in one file's scan records, and
// what `drift:check` prints. `drift:prove` matches all three against
// `fixtures/signal-2/expected.ts`.
//
// `scripts/drift/signal-2.ts` exports:
//
//   readGlossary(text: string): GlossaryRead
//     Reads `CONTEXT.md`'s text, its lines ended by LF or CRLF (R-243). An
//     `_Avoid_:` list is a line starting `_Avoid_:` plus the non-blank lines
//     that follow it. Each code span inside a list is a form, its text as
//     written; a form found again counts once, with every list line it is
//     on. A span outside any list is not read. A span broken across lines,
//     an empty span, or a span with no token is `ok: false`, naming its
//     1-based line. `unmarked` counts the comma items, outside parentheses,
//     of every list that hold no code span (R-196, R-243).
//
//   findGlossaryForms(
//     file: string,
//     records: readonly ScanRecord[],
//     forms: readonly AvoidForm[],
//   ): GlossaryFinding[]
//     `file` is relative to the repo root, with `/`, as `drift:check`
//     reports it, and sets what is read (R-200, R-246):
//       - under `overhaul/<package>/src/`: `identifier` records, as G1, and
//         `string` records, as G2, except a test name's string copy, the
//         `string` record that directly follows a `test-name` record with the
//         same line and text (`scan-record.ts`);
//       - under `overhaul/<package>/tests/`: `identifier` records only;
//       - anywhere else, such as a package-root config file: nothing.
//     Comments and test names are never read. The scanner yields an
//     `identifier` record only for a declared name (R-203, R-245).
//
//     A record's text and each form are split into lowercase tokens: at every
//     character that is not a letter or digit, at `_`, at each lower-to-upper
//     change, before an acronym's last capital when a lowercase letter
//     follows it (`isDRMGate`: is, drm, gate), and around a digit run, which
//     is a token of its own (R-197, R-244). A form matches a contiguous run
//     of one record's tokens; the run's last token may also be the form's
//     last token plus `s`, and no other plural matches (R-244).
//
//     Returns one finding per distinct (line, code) (R-230), sorted by line,
//     then code. A finding's line is its record's line plus the line breaks
//     in the record's text before the match (R-230). `forms` lists each
//     form matched on that line and code once, as written in `CONTEXT.md`.
//
// `drift:check [--root <dir>]` reads `<dir>/CONTEXT.md`, or the repo's own,
// before it scans (R-232, R-243). A missing `CONTEXT.md` is a tool error
// naming `CONTEXT.md`; a `readGlossary` error is one naming
// `CONTEXT.md:<line>`; either prints only the error, to stderr, and exits 2
// (R-220). Otherwise it prints to stdout:
//
//   - every finding of every signal as `<file>:<line> <code>: <message>`,
//     merged and sorted by file, line and code, by code units (R-209), so an
//     E report precedes a G report on the same line; a G message names each
//     form with its `CONTEXT.md` lines, as in `Avoid form "changing line"
//     (CONTEXT.md:5, 8)`, and cites ADR-0042 and R-197 (R-247);
//   - then the `<N> files parsed` line;
//   - then `signal 2: <N> findings in <M> files (<F> forms checked, <U>
//     unmarked)`, N counting report lines (R-230, as R-236 does for signal
//     4), F the distinct forms and U the unmarked count, even when N is 0;
//   - then signal 4's summary (R-231, R-247).
//
// It exits 1 when either signal finds anything, 0 when clean, 2 on a tool
// error.

export type GlossaryCode = 'G1' | 'G2'

export const glossaryCodes: readonly GlossaryCode[] = ['G1', 'G2']

export interface AvoidForm {
  // The code span's text, as written.
  readonly form: string
  // 1-based `CONTEXT.md` lines the form is on, ascending, each once.
  readonly lines: readonly number[]
}

export type GlossaryRead =
  | {
      readonly ok: true
      readonly forms: readonly AvoidForm[]
      readonly unmarked: number
    }
  | { readonly ok: false; readonly line: number; readonly message: string }

export interface GlossaryFinding {
  // 1-based: the line the match is on.
  readonly line: number
  readonly code: GlossaryCode
  readonly forms: readonly string[]
}
