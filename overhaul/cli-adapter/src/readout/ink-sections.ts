import type { ConsultationReadout } from '@hexagram/presentation/readout'

import { paletteFor } from '#src/readout/palette.js'
import { readoutSections } from '#src/readout/readout-sections.js'

/**
 * The strings the full-screen Readout shows: the Query above the tabs, and
 * one string for each of the four tabs. The Emerging Hexagram tab is always
 * present, holding no passage for X之X; it ends with the Yilin Verse when
 * shown and the closing list of Editions with their Witnesses. The Viewer
 * wraps and scrolls them; their bytes are the fixtures' (ADR-0013).
 */
export interface InkSections {
  readonly query: string
  readonly casting: string
  readonly transformation: string
  readonly standing: string
  readonly emerging: string
}

/**
 * The Ink section strings of a Consultation's Readout, each block of text
 * headed by its Edition's short name. With `colour` false, as under
 * `NO_COLOR`, they hold no escape codes, and every Moving Line is still
 * marked by text (ADR-0044).
 */
export function inkSections(
  readout: ConsultationReadout,
  options: { readonly colour: boolean },
): InkSections {
  return readoutSections(readout, paletteFor(options.colour))
}
