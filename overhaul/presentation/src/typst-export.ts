import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import type { ConsultationReadout } from '#src/readout.js'

/*
 * The Typst export (use case 9): a medium-neutral Readout rendered as one
 * self-contained Typst document. The template is written into the source
 * itself, so a `.typ` file compiles on its own; it imports no package, reads
 * no file and names no image, so a compiler needs nothing but the source
 * and the fonts below. Its structure is private to this file.
 */

/**
 * The font families the template names, by their Typst family names: a
 * Latin face for the English, the full Noto Serif CJK TC for both scripts
 * (its Simplified forms chosen by region), and Noto Sans Symbols 2 for the
 * Hexagram symbols U+4DC0 to U+4DFF, which no CJK face holds. The template
 * sets this fallback list in this order and names no other family; the
 * compiler that turns the source into a PDF must load a face of each, and
 * nothing else, so no machine's own fonts change the output.
 */
export const typstFontFamilies = [
  'Libertinus Serif',
  'Noto Serif CJK TC',
  'Noto Sans Symbols 2',
] as const

/**
 * The Typst source of an export: one Readout after another, in the order
 * given, each starting on a new page, each showing what every Readout shows
 * (the Query, its Divined At by `divinedAtText`, the Casting, the
 * Transformation, the two Hexagram tabs as sections, the Yilin Verse when
 * shown, and the closing Editions list), the Moving Lines marked with text
 * as well as drawn. `script` is the Reading Preference's: under
 * `simplified` the Chinese is set with region `cn`, so the one CJK face
 * gives Simplified glyph forms.
 *
 * The document's metadata is fixed by the source, so the same Readouts
 * always compile to the same bytes: `#set document(title: …, date: none)`.
 * The title is neutral and never holds a Query (ADR-0015): `Consultations,
 * 2026-10-28 to 2026-11-13`, the dates of the oldest and newest Divined At
 * given, or `Consultations, 2026-10-28` when they share a date.
 *
 * Every text from a Consultation or the Catalogue (a Query, a passage, a
 * name, a Witness's description) enters the source only as a Typst string
 * literal passed to the template, never as markup, so no character in it
 * is read as Typst: inside the quotes `\` becomes `\\`, `"` becomes `\"`,
 * and a newline `\n`; nothing else is changed. A Query's lines are kept as
 * given.
 */
export function typstExport(
  readouts: readonly [ConsultationReadout, ...ConsultationReadout[]],
  script: ReadingPreference['script'],
): string {
  throw new Error('not built', { cause: { readouts, script } })
}
