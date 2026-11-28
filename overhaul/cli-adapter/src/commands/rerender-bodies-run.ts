import type { MarkdownConsultationStore } from '@hexagram/store-markdown/markdown-consultation-store'

import type { CommandIo, ExitCode } from '#src/commands/entry-point.js'
import { endWith } from '#src/commands/frame.js'
import {
  journalFailureLine,
  rerenderedLine,
} from '#src/commands/maintenance-reports.js'

/**
 * `hexagram-history --rerender-bodies`: the Markdown Store rewrites the
 * body of every file that loads, each atomically, leaving its frontmatter
 * untouched and skipping Unreadable files, and the run prints how many it
 * rewrote and exits 0, even with files skipped. A rejection is a Store
 * failure: one line on stderr and exit 1, each file left whole (ADR-0046).
 * It takes the Store's own maintenance, which no port offers.
 */
export async function rerenderBodiesRun(
  io: CommandIo,
  rerenderBodies: MarkdownConsultationStore['rerenderBodies'],
): Promise<ExitCode> {
  let rerendered: { readonly rewritten: number }
  try {
    rerendered = await rerenderBodies()
  } catch {
    return endWith(io, journalFailureLine('hexagram-history', 'written'))
  }
  io.stdout.write(`${rerenderedLine(rerendered.rewritten)}\n`)
  return 0
}
