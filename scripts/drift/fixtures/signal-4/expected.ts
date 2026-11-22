// Signal 4's fixed expected list (R-214, R-230, R-235): each `<file>:<line>`
// beside this file maps to the sorted codes `drift:check` must report on that
// line, one report per code, matched both ways, so a missing, extra or
// duplicate report fails. A clean twin's line has no entry.
//
// The folder is a stand-in repo (R-232): `drift:check --root` names it, and
// only its `overhaul/` is scanned, so this list is not. Paths are relative to
// the stand-in repo's root.
//
// `src/twins.ts` and `src/not-read.tsx` hold only twins; the twins in
// `tests/names.test.ts` are `bench` and `skipIf`, which are not test names
// (R-212).

import type { EphemeralCode } from '../../ephemeral-finding.js'

const plants = 'overhaul/demo/src/plants.ts'
const forms = 'overhaul/demo/src/comment-forms.tsx'
const names = 'overhaul/demo/tests/names.test.ts'
const config = 'overhaul/demo/vitest.config.ts'

export const expected: Readonly<Record<string, readonly EphemeralCode[]>> = {
  // E1, each form (R-226); `Q-M-002-4` holds `M-002` but is E1 only.
  [`${plants}:2`]: ['E1'],
  [`${plants}:3`]: ['E1'],
  [`${plants}:4`]: ['E1'],
  [`${plants}:5`]: ['E1'],
  [`${plants}:6`]: ['E1'],
  [`${plants}:7`]: ['E1'],
  // E2, including a possessive and a branch name.
  [`${plants}:8`]: ['E2'],
  [`${plants}:9`]: ['E2'],
  [`${plants}:10`]: ['E2'],
  // E3 and E4: two IDs on a line make one report; two codes make two.
  [`${plants}:11`]: ['E3'],
  [`${plants}:12`]: ['E4'],
  [`${plants}:13`]: ['E3', 'E4'],
  // E5, either case, plural, a tab and several spaces (R-227).
  [`${plants}:14`]: ['E5'],
  [`${plants}:15`]: ['E5'],
  [`${plants}:16`]: ['E5'],
  [`${plants}:17`]: ['E5'],
  [`${plants}:18`]: ['E5'],
  [`${plants}:19`]: ['E5'],
  [`${plants}:20`]: ['E5'],
  [`${plants}:21`]: ['E5'],
  // E6, each path and word (R-228); `docs/plans/M-003.md` is E6 only.
  [`${plants}:22`]: ['E6'],
  [`${plants}:23`]: ['E6'],
  [`${plants}:24`]: ['E6'],
  [`${plants}:25`]: ['E6'],
  [`${plants}:26`]: ['E6'],
  [`${plants}:27`]: ['E6'],
  [`${plants}:28`]: ['E6'],
  [`${plants}:29`]: ['E6'],
  [`${plants}:30`]: ['E6'],
  [`${plants}:31`]: ['E6'],
  [`${plants}:32`]: ['E6'],
  // E7: a Ruling, a range, one in a URL, four digits (R-199, R-226).
  [`${plants}:33`]: ['E7'],
  [`${plants}:34`]: ['E7'],
  [`${plants}:35`]: ['E7'],
  [`${plants}:36`]: ['E7'],
  // Comment forms: block, JSDoc (its fourth line), trailing, JSX, end of
  // file. Line comments are `plants.ts`'s.
  [`${forms}:1`]: ['E1'],
  [`${forms}:5`]: ['E2'],
  [`${forms}:8`]: ['E7'],
  [`${forms}:14`]: ['E3'],
  [`${forms}:18`]: ['E4'],
  // Test-name forms (R-205, R-212): plain, the four modifiers, `.each`,
  // a chained modifier before `.each`, tagged-template `each`, a template
  // name, a name on the next line.
  [`${names}:3`]: ['E1'],
  [`${names}:4`]: ['E2'],
  [`${names}:5`]: ['E3'],
  [`${names}:6`]: ['E4'],
  [`${names}:7`]: ['E5'],
  [`${names}:8`]: ['E6'],
  [`${names}:9`]: ['E7'],
  [`${names}:10`]: ['E1'],
  [`${names}:11`]: ['E1'],
  [`${names}:15`]: ['E1'],
  [`${names}:16`]: ['E6'],
  [`${names}:18`]: ['E7'],
  // A package-root config file's comment (R-210).
  [`${config}:3`]: ['E7'],
}

// The files the stand-in's `overhaul/` holds, so `drift:check` prints
// "6 files parsed" and the line-ending variants cover every one.
export const scanned: readonly string[] = [
  'overhaul/demo/src/comment-forms.tsx',
  'overhaul/demo/src/not-read.tsx',
  'overhaul/demo/src/plants.ts',
  'overhaul/demo/src/twins.ts',
  'overhaul/demo/tests/names.test.ts',
  'overhaul/demo/vitest.config.ts',
]
