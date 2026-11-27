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

/**
 * Frontmatter is strict: the file starts with `---\n` and a later line is
 * exactly `---`. Only the frontmatter is parsed; the body is never read
 * (ADR-0030).
 */
export function readFrontmatter(text: string): FileFrontmatter {
  const block = frontmatterBlock(text)
  if (block === undefined) {
    return { outcome: 'unreadable', reason: { kind: 'no-frontmatter' } }
  }
  try {
    // The Core schema reads only the JSON data model the record codec
    // takes; the default schema would also run `!!js/*` tags.
    const record: unknown = jsYaml.safeLoad(block.yaml, {
      schema: jsYaml.CORE_SCHEMA,
    })
    return { outcome: 'parsed', record, frontmatter: block.frontmatter }
  } catch (error) {
    if (error instanceof jsYaml.YAMLException) {
      return { outcome: 'unreadable', reason: { kind: 'not-yaml' } }
    }
    throw error
  }
}

function frontmatterBlock(
  text: string,
): { readonly yaml: string; readonly frontmatter: string } | undefined {
  if (!text.startsWith(opener)) {
    return undefined
  }
  // Start at the opener's own newline, so an empty block closes at once.
  let from = opener.length - 1
  for (;;) {
    const at = text.indexOf(closer, from)
    if (at === -1) {
      return undefined
    }
    const yaml = text.slice(opener.length, at + 1)
    const end = at + closer.length
    if (end === text.length) {
      return { yaml, frontmatter: `${text}\n` }
    }
    if (text[end] === '\n') {
      return { yaml, frontmatter: text.slice(0, end + 1) }
    }
    from = at + 1
  }
}

/** The frontmatter the Store writes for a record. */
export function writeFrontmatter(record: ConsultationRecord): string {
  return `${opener}${jsYaml.safeDump(record, { flowLevel: 2 })}---\n`
}

/** Every file the Store writes: frontmatter, one blank line, the body verbatim. */
export function composeFile(frontmatter: string, body: string): string {
  return `${frontmatter}\n${body}`
}
