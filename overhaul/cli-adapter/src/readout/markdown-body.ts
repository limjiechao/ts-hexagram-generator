import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import type { ConsultationReadout } from '@hexagram/presentation/readout'
import type { RenderBody } from '@hexagram/store-markdown/markdown-consultation-store'

/**
 * The body of a Consultation's file: its Readout in Markdown, the sections
 * in plain output's order, the ledger and the Figures in ` ```text ` fences
 * as monospace grids (ADR-0022), with no colour. Each block of text is
 * headed by its Edition's short name, and the body ends with the list of
 * Editions with their Witnesses. Its exact bytes are the fixtures'
 * (ADR-0013). The Store never reads it back (ADR-0046).
 */
export function markdownBody(readout: ConsultationReadout): string {
  throw new Error('not built', { cause: readout })
}

/**
 * The Store's body renderer: each Consultation's Readout in the default
 * Reading Preference, rendered by `markdownBody`, so every file written and
 * every re-render has one answer whatever preference the keeping command
 * was given. It reaches use cases 3 and 8 through the Catalogue port alone,
 * since the Store it is built into is itself a port of the composed use
 * cases. A Catalogue failure rejects the Promise, and the Store's write
 * with it.
 */
export function markdownBodyRenderer(ports: {
  readonly scriptureCatalogue: ScriptureCatalogue
}): RenderBody {
  throw new Error('not built', { cause: ports })
}
