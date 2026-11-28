import { consultationReadoutFor } from '@hexagram/application/consultation-readout'
import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { divinedAtText } from '@hexagram/presentation/build-readout'
import type {
  CastingTab,
  ConsultationReadout,
  HexagramTab,
  PassageShown,
} from '@hexagram/presentation/readout'
import { defaultReadingPreference } from '@hexagram/scripture-catalogue/default-reading-preference'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import type { RenderBody } from '@hexagram/store-markdown/markdown-consultation-store'

import { diagramRows } from '#src/readout/figure-rows.js'
import { ledgerGrid } from '#src/readout/ledger-grid.js'
import { paletteFor } from '#src/readout/palette.js'
import {
  divisionMethodNames,
  numberAndNames,
  structureLabels,
  transformationGrid,
  wording,
  type HexagramRole,
} from '#src/readout/readout-sections.js'

/*
 * The Markdown body is built from the same grids as plain output, drawn
 * without colour, so the two layouts never drift apart; only the headings,
 * notes and lists take Markdown's forms.
 */

const palette = paletteFor(false)

/** A monospace grid, kept as drawn (ADR-0022). */
const fenced = (grid: string): string => `\`\`\`text\n${grid}\n\`\`\``

/** Blocks of text, each under its Edition's short name at `level`. */
const editionBlocks = (
  blocks: readonly { readonly edition: Edition; readonly text: string }[],
  level: string,
): readonly string[] =>
  blocks.flatMap(({ edition, text }) => [`${level} ${edition.shortName}`, text])

function castingBlocks(casting: CastingTab): readonly string[] {
  if (casting.origin === 'recorded') return [`_${wording.noCasting}_`]
  return [
    `${wording.divisionMethod}${divisionMethodNames[casting.divisionMethod]}`,
    fenced(ledgerGrid(casting.rounds, palette)),
  ]
}

function passageBlocks(passage: PassageShown): readonly string[] {
  return [passage, ...passage.commentaries].flatMap(({ label, texts }) => [
    `### ${label}`,
    ...editionBlocks(texts, '####'),
  ])
}

function hexagramBlocks(
  role: HexagramRole,
  tab: HexagramTab,
): readonly string[] {
  const { figure } = tab
  return [
    `## ${wording.hexagram(role, tab)}`,
    `_${wording.lineAtBottomFirst}._`,
    fenced(diagramRows(figure, palette).join('\n')),
    `_${wording.firstLineAtBottom}._`,
    figure.lines.map((line) => String(line.value)).join(', '),
    `## ${wording.hexagramName(role)}`,
    ...editionBlocks(
      figure.hexagram.names.map(({ edition, name }) => ({
        edition,
        text: name,
      })),
      '###',
    ),
    `## ${wording.hexagramStructure(role)}`,
    structureLabels
      .map(([label, key]) => `- ${label}: ${numberAndNames(tab[key])}`)
      .join('\n'),
    ...tab.passages.flatMap(passageBlocks),
  ]
}

/**
 * The body of a Consultation's file: its Readout in Markdown, the sections
 * in plain output's order, the ledger and the Figures in ` ```text ` fences
 * as monospace grids (ADR-0022), with no colour. Each block of text is
 * headed by its Edition's short name, and the body ends with the list of
 * Editions with their Witnesses. Its exact bytes are the fixtures'
 * (ADR-0013). The Store never reads it back (ADR-0046).
 */
export function markdownBody(readout: ConsultationReadout): string {
  const blocks = [
    `## ${wording.query}`,
    readout.query,
    divinedAtText(readout.divinedAt),
    `## ${wording.casting}`,
    ...castingBlocks(readout.casting),
    `## ${wording.transformation}`,
    fenced(transformationGrid(readout.transformation, palette)),
    ...hexagramBlocks('STANDING', readout.standing),
    ...hexagramBlocks('EMERGING', readout.emerging),
    ...(readout.yilinVerse.length === 0
      ? []
      : [
          `## ${wording.yilinVerse}`,
          ...editionBlocks(readout.yilinVerse, '###'),
        ]),
    `## ${wording.editions}`,
    ...readout.editions.flatMap((edition) => [
      `### ${edition.shortName}`,
      `${edition.title}${edition.unidentified ? wording.unidentified : ''}`,
      `${wording.witness}${edition.witness.description}`,
    ]),
  ]
  return `${blocks.join('\n\n')}\n`
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
  return async (consultation) =>
    markdownBody(
      await consultationReadoutFor(
        ports,
        consultation,
        defaultReadingPreference,
      ),
    )
}
