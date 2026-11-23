// Signal 2's fixed expected list (R-214, R-230, R-248): each `<file>:<line>`
// beside this file maps to the sorted codes `drift:check` must report on that
// line, matched both ways, so a missing, extra or duplicate report fails. A
// clean twin's line has no entry.
//
// The folder is a stand-in repo (R-232) with an invented `CONTEXT.md`: 11
// marked forms, 10 distinct, and 5 unmarked items. `changing line` is on
// lines 5 and 8; `search term` is on line 12, a list's second line; line 15
// keeps "(in English text)" outside the span; `split point`, on line 17, is
// outside any list; line 19 leaves `timestamp` unmarked.
//
// `src/twins.ts` holds only twins; in `src/plants.ts`, `changing2Line` on
// line 21 is one (R-244); comments and test names are never read, test
// strings are not read, and `vitest.config.ts` is neither src nor tests
// (R-200, R-246).

import type { EphemeralCode } from '../../ephemeral-finding.js'
import type { AvoidForm, GlossaryCode } from '../../glossary-finding.js'

const plants = 'overhaul/demo/src/plants.ts'
const view = 'overhaul/demo/src/view.tsx'
const test = 'overhaul/demo/tests/plants.test.ts'

export const expected: Readonly<
  Record<string, readonly (GlossaryCode | EphemeralCode)[]>
> = {
  // G1, one per kind of declaration (R-245): an `as` rename's new name, a
  // variable, a function and its parameter (two forms, one report), a class,
  // a property (plural), a `#private` name, an accessor, an interface
  // member, a type-literal member (`_` split), an enum member, an object
  // key, an object method, a type parameter (plural), function and class
  // expression names, and an acronym (R-244).
  [`${plants}:2`]: ['G1'],
  [`${plants}:3`]: ['G1'],
  [`${plants}:4`]: ['G1'],
  [`${plants}:5`]: ['G1'],
  [`${plants}:6`]: ['G1'],
  [`${plants}:7`]: ['G1'],
  [`${plants}:8`]: ['G1'],
  [`${plants}:11`]: ['G1'],
  [`${plants}:13`]: ['G1'],
  [`${plants}:14`]: ['G1'],
  [`${plants}:15`]: ['G1'],
  [`${plants}:16`]: ['G1'],
  [`${plants}:17`]: ['G1'],
  [`${plants}:18`]: ['G1'],
  [`${plants}:19`]: ['G1'],
  [`${plants}:20`]: ['G1'],
  // G2: a string, a template fragment, a multi-line template at its own
  // line, and a string-literal type (R-246).
  [`${plants}:22`]: ['G2'],
  [`${plants}:23`]: ['G2'],
  [`${plants}:25`]: ['G2'],
  [`${plants}:27`]: ['G2'],
  // A JSX attribute, JSX text, and the one E line, which sorts before its G
  // report (R-209, R-247).
  [`${view}:2`]: ['G2'],
  [`${view}:3`]: ['G2'],
  [`${view}:4`]: ['E2', 'G2'],
  // A test file's identifier (R-200).
  [`${test}:5`]: ['G1'],
}

// The line holding the one E report signal 2's proof judges (R-247).
export const ephemeralLine = `${view}:4`

// What each named report must say about its forms (R-247): the form as
// written and every `CONTEXT.md` line it is on.
export const named: Readonly<Record<string, readonly string[]>> = {
  [`${plants}:3`]: ['"changing line" (CONTEXT.md:5, 8)'],
  [`${plants}:4`]: ['"undo" (CONTEXT.md:15)', '"trash" (CONTEXT.md:15)'],
  [`${plants}:11`]: ['"search term" (CONTEXT.md:12)'],
  [`${plants}:20`]: ['"DRM" (CONTEXT.md:15)'],
}

// The forms `findGlossaryForms` must list on these lines, sorted here.
export const formsAt: Readonly<Record<string, readonly string[]>> = {
  [`${plants}:4`]: ['trash', 'undo'],
  [`${plants}:6`]: ['moving line'],
  [`${plants}:13`]: ['gua'],
  [`${plants}:20`]: ['DRM'],
  [`${plants}:25`]: ['changing line'],
  [`${view}:4`]: ['moving line'],
}

// What `readGlossary` must read from `CONTEXT.md` beside this file.
export const glossary: {
  readonly forms: readonly AvoidForm[]
  readonly unmarked: number
} = {
  forms: [
    { form: 'changing line', lines: [5, 8] },
    { form: 'moving line', lines: [5] },
    { form: 'stalk pile', lines: [8] },
    { form: 'query text', lines: [11] },
    { form: 'search term', lines: [12] },
    { form: 'gua', lines: [15] },
    { form: 'DRM', lines: [15] },
    { form: 'undo', lines: [15] },
    { form: 'trash', lines: [15] },
    { form: 'saved at', lines: [19] },
  ],
  unmarked: 5,
}

// The files the stand-in's `overhaul/` holds, so `drift:check` prints
// "5 files parsed".
export const scanned: readonly string[] = [
  'overhaul/demo/src/plants.ts',
  'overhaul/demo/src/twins.ts',
  'overhaul/demo/src/view.tsx',
  'overhaul/demo/tests/plants.test.ts',
  'overhaul/demo/vitest.config.ts',
]
