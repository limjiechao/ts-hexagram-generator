// Drift signal 2 (ADR-0042, R-196, R-197, R-200, R-203, R-243 to R-246,
// R-515):
// marked _Avoid_ forms from `CONTEXT.md` in `overhaul/` identifiers and UI
// strings. The contract is `glossary-finding.ts`'s.

import type {
  AvoidForm,
  GlossaryCode,
  GlossaryFinding,
  GlossaryRead,
} from './glossary-finding.js'
import type { ScanRecord } from './scan-record.js'

interface Token {
  readonly text: string
  readonly start: number
}

// In order: an acronym up to its last capital when a lowercase letter
// follows (R-244), a word with an optional leading capital, a run of
// capitals, a run of uncased letters, and a digit run, a token of its own.
const tokenPattern =
  /\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?\p{Ll}+|\p{Lu}+|\p{L}+|\p{N}+/gu

function tokensOf(text: string): Token[] {
  return [...text.matchAll(tokenPattern)].map((found) => ({
    text: found[0].toLowerCase(),
    start: found.index,
  }))
}

const codeSpan = /`([^`]*)`/g

// Splits a list's text at commas outside parentheses (R-243).
function commaItems(text: string): string[] {
  const items: string[] = []
  let depth = 0
  let item = ''
  for (const character of text) {
    if (character === '(') depth += 1
    if (character === ')') depth = Math.max(0, depth - 1)
    if (character === ',' && depth === 0) {
      items.push(item)
      item = ''
    } else item += character
  }
  return [...items, item]
}

export function readGlossary(text: string): GlossaryRead {
  const lines = text.split(/\r?\n/)
  const forms = new Map<string, number[]>()
  let unmarked = 0
  let index = 0
  while (index < lines.length) {
    if (!(lines[index] ?? '').startsWith('_Avoid_:')) {
      index += 1
      continue
    }
    // A list is its `_Avoid_:` line and the non-blank lines after it.
    const list: string[] = []
    for (
      ;
      index < lines.length && (lines[index] ?? '').trim() !== '';
      index++
    ) {
      const line = lines[index] ?? ''
      const number = index + 1
      for (const [, form = ''] of line.matchAll(codeSpan)) {
        if (tokensOf(form).length === 0)
          return {
            ok: false,
            line: number,
            message: `an empty code span, or one with no token`,
          }
        const on = forms.get(form) ?? []
        if (!on.includes(number)) on.push(number)
        forms.set(form, on)
      }
      if (line.replaceAll(codeSpan, '').includes('`'))
        return {
          ok: false,
          line: number,
          message: 'a code span broken across lines',
        }
      list.push(line)
    }
    const items = commaItems(list.join(' ').slice('_Avoid_:'.length))
    unmarked += items.filter(
      (item) => !item.includes('`') && tokensOf(item).length > 0,
    ).length
  }
  return {
    ok: true,
    forms: [...forms].map(([form, on]) => ({ form, lines: on })),
    unmarked,
  }
}

const lineBreak = /\r\n?|[\n\u2028\u2029]/

// The codes a record is read for, by where its file is (R-200, R-246).
function codeFor(
  file: string,
  record: ScanRecord,
  previous: ScanRecord | undefined,
): GlossaryCode | undefined {
  const place = /^overhaul\/[^/]+\/(src|tests)\//.exec(file)?.[1]
  if (record.kind === 'identifier' && place !== undefined) return 'G1'
  if (record.kind !== 'string' || place !== 'src') return undefined
  // Bundled scripture is its Witness's wording, not wording the glossary
  // governs (R-370, R-515).
  if (file.startsWith('overhaul/catalogue-bundled/src/data/')) return undefined
  // The string copy of a test name is not read (R-212, R-246).
  const isTestName =
    previous?.kind === 'test-name' &&
    previous.line === record.line &&
    previous.text === record.text
  return isTestName ? undefined : 'G2'
}

// The start of each match of `form` in `tokens`: a contiguous run, its last
// token also matching with a final `s` (R-197, R-244).
function matchStarts(
  tokens: readonly Token[],
  form: readonly string[],
): number[] {
  const last = form.length - 1
  const starts: number[] = []
  for (let at = 0; at + last < tokens.length; at++) {
    const isMatch = form.every((part, offset) => {
      const token = tokens[at + offset]?.text
      return token === part || (offset === last && token === `${part}s`)
    })
    if (isMatch) starts.push(tokens[at]?.start ?? 0)
  }
  return starts
}

export function findGlossaryForms(
  file: string,
  records: readonly ScanRecord[],
  forms: readonly AvoidForm[],
): GlossaryFinding[] {
  const split = forms.map(({ form }) => ({
    form,
    tokens: tokensOf(form).map((token) => token.text),
  }))
  // Keyed by line and code (R-230); each form is listed once.
  const found = new Map<
    string,
    { line: number; code: GlossaryCode; forms: string[] }
  >()
  for (const [index, record] of records.entries()) {
    const code = codeFor(file, record, records[index - 1])
    if (code === undefined) continue
    const tokens = tokensOf(record.text)
    for (const { form, tokens: parts } of split)
      for (const start of matchStarts(tokens, parts)) {
        // A finding reports its own line (R-230).
        const line =
          record.line + record.text.slice(0, start).split(lineBreak).length - 1
        const key = `${line} ${code}`
        const entry = found.get(key) ?? { line, code, forms: [] }
        if (!entry.forms.includes(form)) entry.forms.push(form)
        found.set(key, entry)
      }
  }
  return [...found.values()].toSorted(
    (a, b) => a.line - b.line || a.code.localeCompare(b.code),
  )
}
