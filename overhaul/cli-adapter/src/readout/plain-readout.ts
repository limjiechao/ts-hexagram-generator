import type { ConsultationReadout } from '@hexagram/presentation/readout'

import { paletteFor } from '#src/readout/palette.js'
import { readoutSections } from '#src/readout/readout-sections.js'

/**
 * The plain output of a Consultation's Readout, as `--plain` prints it to
 * stdout: the Query, then each tab as a titled section in tab order
 * (Casting, Transformation, Standing Hexagram, Emerging Hexagram), then the
 * Yilin Verse when shown and the closing list of Editions with their
 * Witnesses. Each block of text is headed by its Edition's short name. Its
 * exact bytes are the fixtures' (ADR-0009, ADR-0013). With `colour` false,
 * as under `NO_COLOR`, it holds no escape codes, and every Moving Line is
 * still marked by text (ADR-0044). It wraps nothing; the terminal does.
 */
export function plainReadout(
  readout: ConsultationReadout,
  options: { readonly colour: boolean },
): string {
  const { query, casting, transformation, standing, emerging } =
    readoutSections(readout, paletteFor(options.colour))
  return `\n\n${query}\n\n${casting}\n\n${transformation}\n\n\n${standing}\n\n\n${emerging}\n`
}
