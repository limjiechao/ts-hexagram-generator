import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import type { Polarity } from '@hexagram/oracle/figure'
import type { Hexagram } from '@hexagram/oracle/hexagram'
import type { Trigram } from '@hexagram/oracle/trigram'
import type { Citation } from '@hexagram/scripture-catalogue/citation'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import { isEditionId } from '@hexagram/scripture-catalogue/edition-id'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import type { Work } from '@hexagram/scripture-catalogue/work'

import type {
  BundledEdition,
  BundledTexts,
  FigureKey,
  TrigramKey,
} from '#src/bundled-data.js'
import { legge1882 } from '#src/data/legge-1882.js'
import { receivedSequence } from '#src/data/received-sequence.js'
import { wilhelmBaynes1967 } from '#src/data/wilhelm-baynes-1967.js'
import { wuyingdian1739Simplified } from '#src/data/wuyingdian-1739-simplified.js'
import { wuyingdian1739 } from '#src/data/wuyingdian-1739.js'

/** One bundled EditionId: its data and its Edition record for each Work. */
interface HeldEdition {
  readonly data: BundledEdition
  readonly records: ReadonlyMap<Work, Edition>
}

const printedWorks = [
  'zhouyi',
  'tuan',
  'daxiang',
  'xiaoxiang',
] as const satisfies readonly (keyof BundledTexts)[]

/** One record per Work the data prints; none if its id is not admitted. */
function editionRecords(data: BundledEdition): ReadonlyMap<Work, Edition> {
  const records = new Map<Work, Edition>()
  const {
    id,
    hexagramNames: _hexagramNames,
    trigramNames: _trigramNames,
    texts: _texts,
    ...shared
  } = data
  if (!isEditionId(id)) return records
  for (const work of printedWorks) records.set(work, { ...shared, id, work })
  return records
}

const held: readonly HeldEdition[] = [
  wuyingdian1739,
  wuyingdian1739Simplified,
  legge1882,
  wilhelmBaynes1967,
].map((data) => ({ data, records: editionRecords(data) }))

/**
 * The Editions a preference shows, in order: the Chinese one in its script,
 * then each Translation it names that the Catalogue holds. An unknown id, or
 * a Chinese one among the Translations, shows nothing.
 */
function shownEditions(preference: ReadingPreference): HeldEdition[] {
  const chinese = held.filter(({ data }) => data.script === preference.script)
  const translations = preference.translations.flatMap((id) =>
    held.filter(({ data }) => data.id === id && data.language !== undefined),
  )
  return [...chinese, ...translations]
}

function bit(polarity: Polarity): '0' | '1' {
  return polarity === 'yang' ? '1' : '0'
}

function figureKey([one, two, three, four, five, six]: Hexagram): FigureKey {
  return `${bit(one)}${bit(two)}${bit(three)}${bit(four)}${bit(five)}${bit(six)}`
}

function trigramKey([one, two, three]: Trigram): TrigramKey {
  return `${bit(one)}${bit(two)}${bit(three)}`
}

/** The Citation's text in one Edition's data, if it holds one. */
function textFor(texts: BundledTexts, citation: Citation): string | undefined {
  switch (citation.work) {
    case 'zhouyi': {
      const figure = figureKey(citation.hexagram)
      return citation.line === undefined
        ? texts.zhouyi[figure]
        : texts.zhouyi[`${figure}.${citation.line}`]
    }
    case 'tuan':
      return texts.tuan[figureKey(citation.hexagram)]
    case 'daxiang':
      return texts.daxiang[figureKey(citation.hexagram)]
    case 'xiaoxiang':
      return texts.xiaoxiang[`${figureKey(citation.hexagram)}.${citation.line}`]
    case 'wenyan':
    case 'yilin':
      return undefined
  }
}

/**
 * The Scripture Catalogue from bundled literal data, for a Private Channel
 * (ADR-0028, ADR-0032). It reads no file, so the CLI and the REST engine
 * share it (ADR-0037).
 *
 * For a Reading Preference, the Chinese Edition shown is the one in the
 * preference's script; then each of its Translations the Catalogue holds,
 * in the preference's order. The Licence Gate then applies, per Edition:
 * every Edition may be shown on a Private Channel, so it omits nothing here.
 * A passage, name or Edition the data lacks is left out, never substituted.
 * Today no Edition prints the 文言 or the 焦氏易林, so their lookups find no
 * text.
 */
export const bundledScriptureCatalogue: ScriptureCatalogue = {
  passageTexts: (citation, preference) =>
    Promise.resolve(
      shownEditions(preference).flatMap(({ data, records }) => {
        const text = textFor(data.texts, citation)
        const edition = records.get(citation.work)
        return text === undefined || edition === undefined
          ? []
          : [{ citation, edition, text }]
      }),
    ),
  hexagramNames: (hexagram, preference) =>
    Promise.resolve(
      shownEditions(preference).flatMap(({ data, records }) => {
        const edition = records.get('zhouyi')
        return edition === undefined
          ? []
          : [
              {
                hexagram,
                edition,
                name: data.hexagramNames[figureKey(hexagram)],
              },
            ]
      }),
    ),
  receivedSequenceNumber: (hexagram) =>
    Promise.resolve(receivedSequence[figureKey(hexagram)]),
  trigramNames: (trigram, preference) =>
    Promise.resolve(
      shownEditions(preference).flatMap(({ data, records }) => {
        const edition = records.get('zhouyi')
        return edition === undefined
          ? []
          : [{ trigram, edition, ...data.trigramNames[trigramKey(trigram)] }]
      }),
    ),
  editions: (work) =>
    Promise.resolve(
      held.flatMap(({ records }) => {
        const edition = records.get(work)
        return edition === undefined ? [] : [edition]
      }),
    ),
}
