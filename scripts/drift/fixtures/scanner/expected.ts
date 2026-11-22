// The scanner's fixed expected list (R-208): each fixture beside this file
// maps to the exact, ordered records the scanner must yield for it, matched
// both ways, so a missing or extra record, or an unlisted fixture, fails.
// Each fixture is named after its row of slice 1's acceptance list (R-218).
//
// Texts are written as JavaScript strings, so an escape here stands for the
// cooked character the scanner must yield: '\t' is a tab, '\n' a newline.
//
// Comments keep everything between their delimiters (`//`, `/*` and `*/`),
// untrimmed; only JSX text is trimmed (R-211).
//
// String-literal types are raised again with signal 2 (R-211). Until then a
// quoted property key yields a string and a string-literal type does not;
// see 'string-literal-type-and-quoted-key.ts'.

import type { ScanRecord } from '../../scan-record.js'

function comment(line: number, text: string): ScanRecord {
  return { kind: 'comment', line, text }
}
function string(line: number, text: string): ScanRecord {
  return { kind: 'string', line, text }
}
function identifier(line: number, text: string): ScanRecord {
  return { kind: 'identifier', line, text }
}
// A test name is also yielded as a string, right after it (R-212).
function testName(line: number, text: string): ScanRecord[] {
  return [{ kind: 'test-name', line, text }, string(line, text)]
}

export const expected: Readonly<Record<string, readonly ScanRecord[]>> = {
  // Comments
  'comment-line.ts': [comment(1, ' a line comment')],
  'comment-block.ts': [
    comment(1, ' a block comment '),
    comment(2, ' a block\n   on two lines '),
  ],
  // Read once, from the token stream, though TypeScript also attaches it to
  // `add` as JSDoc.
  'comment-jsdoc.ts': [
    comment(1, '*\n * Adds two numbers.\n '),
    identifier(4, 'add'),
  ],
  'comment-trailing.ts': [
    identifier(1, 'total'),
    comment(1, ' a trailing comment'),
  ],
  // The file ends on the comment, with no final newline.
  'comment-end-of-file.ts': [
    identifier(1, 'total'),
    comment(2, ' at the end of the file'),
  ],
  'comment-before-brace.ts': [
    identifier(1, 'done'),
    comment(3, ' before the closing brace'),
  ],
  'comment-in-array.ts': [
    identifier(1, 'list'),
    comment(1, ' inside the array '),
  ],
  'comment-empty-body.ts': [
    identifier(1, 'idle'),
    comment(1, ' an empty body '),
  ],
  'comment-in-type.ts': [
    identifier(1, 'count'),
    comment(1, ' inside a type '),
  ],
  'comment-twin-slashes-in-string.ts': [
    identifier(1, 'link'),
    string(1, 'https://example.com/path'),
    identifier(2, 'note'),
    string(2, '/* not a comment */'),
  ],
  // A directive prologue is a string literal; lint and compiler directives
  // are ordinary comments.
  'comment-directives.ts': [
    string(1, 'use strict'),
    comment(2, ' eslint-disable-next-line no-console'),
    comment(4, ' @ts-expect-error: a planted type error'),
    identifier(5, 'wrong'),
    string(5, 'text'),
  ],
  'comment-shebang.ts': [comment(2, ' after the shebang')],
  'comment-jsx.tsx': [identifier(1, 'view'), comment(1, ' inside JSX ')],

  // Test names
  'test-name-plain.ts': [
    ...testName(1, 'ledger'),
    ...testName(2, 'adds an entry'),
    ...testName(3, 'removes an entry'),
  ],
  'test-name-modifiers.ts': [
    ...testName(1, 'skipped'),
    ...testName(2, 'focused'),
    ...testName(3, 'pending'),
    ...testName(4, 'in parallel'),
  ],
  'test-name-each.ts': [
    ...testName(1, 'doubles %i'),
    ...testName(2, 'chained before each'),
  ],
  // The table is a template literal, so its static fragments are strings.
  'test-name-tagged-each.ts': [
    string(1, '\n  a    | b\n  '),
    string(3, ' | '),
    string(3, '\n'),
    ...testName(4, 'adds $a to $b'),
  ],
  'test-name-template.ts': [
    ...testName(1, 'handles '),
    ...testName(1, ' input'),
  ],
  'test-name-next-line.ts': [...testName(2, 'reads a name on the next line')],
  // `obj.it`, `myIt`, `bench` and `skipIf` are not test names (R-212), and a
  // non-literal name yields nothing.
  'test-name-twins.ts': [
    string(1, 'a method named it'),
    string(2, 'a function named myIt'),
    string(4, 'a benchmark'),
    string(5, 'a conditional test'),
  ],

  // Strings
  'string-quote-styles.ts': [
    identifier(1, 'single'),
    string(1, 'single quotes'),
    identifier(2, 'double'),
    string(2, 'double quotes'),
    identifier(3, 'backtick'),
    string(3, 'backticks'),
  ],
  'string-multi-line-template.ts': [
    identifier(1, 'verse'),
    string(1, 'first line\nsecond line'),
    identifier(3, 'greeting'),
    string(3, 'Hello, '),
    string(3, '.\nWelcome back.'),
  ],
  // Whitespace-only JSX text between the tags is skipped.
  'string-jsx-text.tsx': [identifier(1, 'view'), string(3, 'Hello there')],
  'string-jsx-attribute.tsx': [
    identifier(1, 'view'),
    string(1, 'A yarrow stalk'),
  ],
  // Module specifiers and regexes yield no string; imported and re-exported
  // names are not declared here.
  'string-twins.ts': [identifier(3, 'pattern')],
  'string-escapes.ts': [
    identifier(1, 'tab'),
    string(1, 'a\tb'),
    identifier(2, 'unicode'),
    string(2, 'A\u00E9'),
    identifier(3, 'lines'),
    string(3, 'one\ntwo'),
    identifier(4, 'quote'),
    string(4, "it's"),
  ],
  'string-literal-type-and-quoted-key.ts': [
    identifier(1, 'Mode'),
    identifier(2, 'limits'),
    string(2, 'max-size'),
  ],

  // Identifiers: only R-213's clear cases of a declaration.
  'identifier-declarations.ts': [
    identifier(1, 'total'),
    identifier(2, 'count'),
    identifier(3, 'legacy'),
    identifier(4, 'add'),
    identifier(4, 'left'),
    identifier(4, 'right'),
    identifier(5, 'twice'),
    identifier(5, 'value'),
    identifier(6, 'Ledger'),
    identifier(7, 'entries'),
    identifier(8, 'record'),
    identifier(10, 'Size'),
    identifier(11, 'Shape'),
    identifier(12, 'Colour'),
  ],
  // A rename declares its new name, not the property it reads.
  'identifier-destructuring-renames.ts': [
    identifier(1, 'breadth'),
    identifier(1, 'height'),
    identifier(2, 'first'),
    identifier(2, 'second'),
  ],
  // Calls, property access and plain imports declare nothing.
  'identifier-twins.ts': [],

  // Files: also scanned with CRLF line endings, built in memory, since
  // `.gitattributes` checks every file out with LF. A template's cooked text
  // turns CRLF into LF.
  'file-crlf.ts': [
    comment(1, ' first line'),
    identifier(2, 'greeting'),
    string(2, 'hi'),
    identifier(3, 'verse'),
    string(3, 'one\ntwo'),
    comment(5, ' last '),
  ],
}

// The fixtures above the proof also scans with every LF turned into CRLF.
export const crlfFixtures: readonly string[] = ['file-crlf.ts']

// `../scanner-walk/` is the walk's stand-in root (R-210). The proof copies it
// to a temporary folder and adds `node_modules/` and `dist/` folders there,
// since `.gitignore` keeps both out of the repo. Every skipped file, and each
// file with an extension R-210 does not list, fails to parse, so reading one
// would also end the walk with an error.
export const walked: readonly string[] = [
  'a.ts',
  'b.tsx',
  'c.mts',
  'd.cts',
  'e.js',
  'f.mjs',
  'g.cjs',
  'nested/h.ts',
]

// The files the proof adds to the walk's copy, each of which must be skipped.
export const addedSkipped: readonly string[] = [
  'node_modules/skipped.ts',
  'dist/skipped.ts',
  'nested/node_modules/pkg/skipped.ts',
  'nested/dist/skipped.ts',
]

// `../scanner-parse-error/` holds one file that parses and this one, which
// does not: scanning the tree, or `drift:check` on it, must name it (R-209,
// R-210).
export const parseError = 'nested/broken.ts'
