import type { ConsultationReadout } from '@hexagram/presentation/readout'

/**
 * The plain output of a Consultation's Readout, as `--plain` prints it to
 * stdout: the Query, then each tab as a titled section in tab order
 * (Casting, Transformation, Standing Hexagram, Emerging Hexagram), then the
 * Yilin Verse when shown and the closing list of Editions with their
 * Witnesses. Each block of text is headed by its Edition's short name. Its
 * exact bytes are the fixtures' (ADR-0009, ADR-0013). With `colour` false,
 * as under `NO_COLOR`, it holds no escape codes, and every Moving and
 * Changed Line is still marked by text (ADR-0044). It wraps nothing; the
 * terminal does.
 */
export function plainReadout(
  readout: ConsultationReadout,
  options: { readonly colour: boolean },
): string {
  throw new Error('not built', { cause: { readout, options } })
}
