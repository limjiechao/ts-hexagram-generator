import { Buffer } from 'node:buffer'

import type { ConsultationRecord } from '@hexagram/consultation-journal/record-codec'
import type { UnreadableReason } from '@hexagram/consultation-journal/unreadable-file'
import jsYaml from 'js-yaml'

/**
 * A Consultation's file split at its frontmatter: the parsed record, still
 * unchecked, and the frontmatter's bytes through the closing `---` line, so
 * a rewrite can keep them as they are.
 */
export type FileFrontmatter =
  | {
      readonly outcome: 'parsed'
      readonly record: unknown
      readonly frontmatter: string
    }
  | {
      readonly outcome: 'unreadable'
      readonly reason: Extract<
        UnreadableReason,
        { readonly kind: 'no-frontmatter' | 'not-yaml' }
      >
    }

const opener = '---\n'
const closer = '\n---'

// Fatal, so a corrupted Query is refused rather than loaded with U+FFFD in
// it; a kept BOM keeps the decoded text's bytes the file's own.
const strictUtf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

/**
 * Frontmatter is strict: the file starts with `---\n` and a later line is
 * exactly `---`. Only the frontmatter's bytes are decoded and parsed; the
 * body is never read (ADR-0030). A YAML stream is Unicode text, so
 * frontmatter that is not UTF-8 is not YAML.
 */
export function readFrontmatter(bytes: Buffer): FileFrontmatter {
  const block = frontmatterBytes(bytes)
  if (block === undefined) {
    return { outcome: 'unreadable', reason: { kind: 'no-frontmatter' } }
  }
  let frontmatter: string
  try {
    frontmatter = strictUtf8.decode(block)
  } catch {
    return { outcome: 'unreadable', reason: { kind: 'not-yaml' } }
  }
  // The decoded text ends at its closing line, so the YAML lies between
  // the opener and the last `---`.
  const yaml = frontmatter.slice(opener.length, frontmatter.lastIndexOf('---'))
  try {
    // The Core schema reads only the JSON data model the record codec
    // takes; the default schema would also run `!!js/*` tags.
    const record: unknown = jsYaml.safeLoad(yaml, {
      schema: jsYaml.CORE_SCHEMA,
    })
    return { outcome: 'parsed', record, frontmatter: closeLine(frontmatter) }
  } catch (error) {
    if (error instanceof jsYaml.YAMLException) {
      return { outcome: 'unreadable', reason: { kind: 'not-yaml' } }
    }
    throw error
  }
}

/** The frontmatter's bytes through the closing line, its newline included when present. */
function frontmatterBytes(bytes: Buffer): Buffer | undefined {
  if (!bytes.subarray(0, opener.length).equals(Buffer.from(opener))) {
    return undefined
  }
  // Start at the opener's own newline, so an empty block closes at once.
  let from = opener.length - 1
  for (;;) {
    const at = bytes.indexOf(closer, from)
    if (at === -1) {
      return undefined
    }
    const end = at + closer.length
    if (end === bytes.length || bytes[end] === 0x0a) {
      return bytes.subarray(0, Math.min(end + 1, bytes.length))
    }
    from = at + 1
  }
}

/** A closing line at the end of the file gets the newline a rewrite needs. */
function closeLine(frontmatter: string): string {
  return frontmatter.endsWith('\n') ? frontmatter : `${frontmatter}\n`
}

/** The frontmatter the Store writes for a record. */
export function writeFrontmatter(record: ConsultationRecord): string {
  return `${opener}${jsYaml.safeDump(record, { flowLevel: 2 })}---\n`
}

/** Every file the Store writes: frontmatter, one blank line, the body verbatim. */
export function composeFile(frontmatter: string, body: string): string {
  return `${frontmatter}\n${body}`
}
