// The shared scanner signals 2 and 4 read (R-208 to R-213); its
// contract is in `scan-record.ts`.
//
// Comments are read from the token stream (R-211): a raw scanner runs only
// over the text between a node's children and before a leaf's token, never
// over a literal, regex, template or JSX text, which the parser has already
// claimed. Those spans do not overlap, so each comment is read exactly once.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import ts from 'typescript'

import type {
  ScanKind,
  ScanRecord,
  ScanResult,
  TreeScan,
} from './scan-record.js'

const scriptKinds: Readonly<Record<string, ts.ScriptKind>> = {
  '.ts': ts.ScriptKind.TS,
  '.mts': ts.ScriptKind.TS,
  '.cts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
  '.js': ts.ScriptKind.JS,
  '.mjs': ts.ScriptKind.JS,
  '.cjs': ts.ScriptKind.JS,
  '.jsx': ts.ScriptKind.JSX,
}

// R-210's extensions; `.jsx` is parsed by `scanText` but not walked.
const walkedExtensions: ReadonlySet<string> = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
])

const testFunctions: ReadonlySet<string> = new Set(['describe', 'it', 'test'])
const testModifiers: ReadonlySet<string> = new Set([
  'skip',
  'only',
  'todo',
  'concurrent',
])

function byCodeUnits(a: string, b: string): number {
  if (a < b) return -1
  return a > b ? 1 : 0
}

function syntaxError(source: ts.SourceFile): string | undefined {
  const host = ts.createCompilerHost({})
  host.getSourceFile = () => source
  const program = ts.createProgram({
    rootNames: [source.fileName],
    options: { allowJs: true, noLib: true, noResolve: true, types: [] },
    host,
  })
  const [diagnostic] = program.getSyntacticDiagnostics(source)
  if (diagnostic === undefined) return undefined
  const line =
    diagnostic.start === undefined
      ? ''
      : `line ${source.getLineAndCharacterOfPosition(diagnostic.start).line + 1}: `
  return `${line}${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
}

// R-212's closed set: `describe`, `it` or `test`, any of R-205's modifiers,
// then optionally `.each(...)` or a tagged-template `.each`.
function isTestCallee(callee: ts.Expression): boolean {
  let target = callee
  if (ts.isCallExpression(target)) target = target.expression
  else if (ts.isTaggedTemplateExpression(target)) target = target.tag
  if (target !== callee) {
    if (!ts.isPropertyAccessExpression(target) || target.name.text !== 'each')
      return false
    target = target.expression
  }
  while (
    ts.isPropertyAccessExpression(target) &&
    testModifiers.has(target.name.text)
  )
    target = target.expression
  return ts.isIdentifier(target) && testFunctions.has(target.text)
}

// The literal nodes a test call's name is read from; a non-literal yields none.
function testNameParts(call: ts.CallExpression): readonly ts.Node[] {
  const [name] = call.arguments
  if (name === undefined || !isTestCallee(call.expression)) return []
  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name))
    return [name]
  if (ts.isTemplateExpression(name))
    return [name.head, ...name.templateSpans.map((span) => span.literal)]
  return []
}

// A string or template naming a module to load; a call such as `vi.mock` or
// `require.resolve` loads nothing and is not one (R-211). A template with
// substitutions counts only as the first argument of `import()` or
// `require()` (R-224, R-246).
function isModuleSpecifier(node: ts.Node): boolean {
  const { parent } = node
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent))
    return parent.moduleSpecifier === node
  if (ts.isExternalModuleReference(parent) || ts.isModuleDeclaration(parent))
    return true
  // `typeof import('./x.js')` names a module through a literal type.
  if (ts.isLiteralTypeNode(parent)) return ts.isImportTypeNode(parent.parent)
  return (
    ts.isCallExpression(parent) &&
    parent.arguments[0] === node &&
    (parent.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(parent.expression) &&
        parent.expression.text === 'require'))
  )
}

// The template expression a fragment belongs to, if any.
function templateOf(node: ts.Node): ts.Node | undefined {
  if (ts.isTemplateHead(node)) return node.parent
  if (ts.isTemplateMiddle(node) || ts.isTemplateTail(node))
    return node.parent.parent
  return undefined
}

// Any name the compiler binds in the file (R-203, R-245), `import * as` and
// `export * as` included, except a plain or default import, a plain export
// of an existing name, and a shorthand property. A `#private` name is read
// without its `#`.
function declaredName(
  node: ts.Node,
): ts.Identifier | ts.PrivateIdentifier | undefined {
  const isSpecifier = ts.isImportSpecifier(node) || ts.isExportSpecifier(node)
  if (isSpecifier && node.propertyName === undefined) return undefined
  const named =
    isSpecifier ||
    ts.isNamespaceImport(node) ||
    ts.isNamespaceExport(node) ||
    ts.isVariableDeclaration(node) ||
    ts.isParameter(node) ||
    ts.isBindingElement(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isClassDeclaration(node) ||
    ts.isClassExpression(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isEnumMember(node) ||
    ts.isModuleDeclaration(node) ||
    ts.isTypeParameterDeclaration(node) ||
    ts.isPropertyDeclaration(node) ||
    ts.isPropertySignature(node) ||
    ts.isPropertyAssignment(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isMethodSignature(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  if (!named || node.name === undefined) return undefined
  const { name } = node
  if (ts.isPrivateIdentifier(name)) return name
  return ts.isIdentifier(name) && name.text !== 'this' ? name : undefined
}

function childrenOf(node: ts.Node): ts.Node[] {
  const children: ts.Node[] = []
  ts.forEachChild(node, (child) => {
    children.push(child)
  })
  return children.toSorted((a, b) => a.pos - b.pos)
}

export function scanText(file: string, text: string): ScanResult {
  const kind = scriptKinds[path.extname(file)] ?? ts.ScriptKind.TS
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    kind,
  )
  const error = syntaxError(source)
  if (error !== undefined) return { ok: false, message: error }

  // Each record keeps the offset its text starts at, for ordering.
  const found: { readonly start: number; readonly record: ScanRecord }[] = []
  const add = (recordKind: ScanKind, start: number, recordText: string) => {
    const line = source.getLineAndCharacterOfPosition(start).line + 1
    found.push({ start, record: { kind: recordKind, line, text: recordText } })
  }

  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    source.languageVariant,
  )
  // Comment text reads with LF line breaks, whatever the file uses: CRLF, a
  // lone CR, U+2028 and U+2029 each end a line for TypeScript (R-223, R-225).
  const addComment = (start: number, end: number) => {
    add(
      'comment',
      start,
      text.slice(start, end).replaceAll(/\r\n?|[\u2028\u2029]/g, '\n'),
    )
  }
  const scanComments = (start: number, end: number) => {
    if (start >= end) return
    scanner.setText(text, start, end - start)
    for (
      let token = scanner.scan();
      token !== ts.SyntaxKind.EndOfFileToken;
      token = scanner.scan()
    ) {
      const tokenStart = scanner.getTokenStart()
      if (token === ts.SyntaxKind.SingleLineCommentTrivia)
        addComment(tokenStart + 2, scanner.getTokenEnd())
      else if (token === ts.SyntaxKind.MultiLineCommentTrivia)
        addComment(tokenStart + 2, scanner.getTokenEnd() - 2)
    }
  }

  const testNames = new Set<ts.Node>()
  // A string or template fragment; its text starts after its opening quote,
  // backtick or `}`. An empty fragment has no static text and yields nothing.
  const addString = (node: ts.Node, cooked: string) => {
    if (cooked === '') return
    const start = node.getStart(source) + 1
    if (testNames.has(node)) add('test-name', start, cooked)
    add('string', start, cooked)
  }

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node))
      for (const part of testNameParts(node)) testNames.add(part)
    const name = declaredName(node)
    if (name !== undefined)
      add('identifier', name.getStart(source), name.text.replace(/^#/, ''))

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isModuleSpecifier(node)) addString(node, node.text)
    } else if (
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const template = templateOf(node)
      if (template === undefined || !isModuleSpecifier(template))
        addString(node, node.text)
    } else if (ts.isJsxText(node)) {
      const trimmed = node.text.trim()
      if (trimmed !== '')
        add('string', node.pos + node.text.indexOf(trimmed), trimmed)
      // JSX text is all text: nothing in it is a comment.
      return
    }

    // A token's own text may be a literal, so only its leading trivia is
    // scanned; a childless node such as an empty block is scanned whole.
    if (ts.isToken(node)) {
      scanComments(node.pos, node.getStart(source))
      return
    }
    let gapStart = node.pos
    for (const child of childrenOf(node)) {
      scanComments(gapStart, child.pos)
      visit(child)
      gapStart = child.end
    }
    scanComments(gapStart, node.end)
  }
  visit(source)

  const records = found
    .toSorted((a, b) => a.start - b.start)
    .map((each) => each.record)
  return { ok: true, records }
}

async function walk(root: string, folder: string): Promise<string[]> {
  const entries = await readdir(path.join(root, folder), {
    withFileTypes: true,
  })
  const files: string[] = []
  for (const entry of entries) {
    const relative = folder === '' ? entry.name : `${folder}/${entry.name}`
    if (entry.isDirectory()) {
      const skipped =
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name.startsWith('.')
      if (!skipped) files.push(...(await walk(root, relative)))
    } else if (entry.isFile() && walkedExtensions.has(path.extname(entry.name)))
      files.push(relative)
  }
  return files
}

export async function scanTree(root: string): Promise<TreeScan> {
  const files = new Map<string, readonly ScanRecord[]>()
  const walked = await walk(root, '')
  for (const file of walked.toSorted(byCodeUnits)) {
    const result = scanText(file, await readFile(path.join(root, file), 'utf8'))
    if (!result.ok) return { ok: false, file, message: result.message }
    files.set(file, result.records)
  }
  return { ok: true, files }
}
