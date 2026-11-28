import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import { bundledScriptureCatalogue } from '@hexagram/catalogue-bundled/bundled-scripture-catalogue'
import type { Figure } from '@hexagram/oracle/figure'
import type { Citation } from '@hexagram/scripture-catalogue/citation'
import type { Edition } from '@hexagram/scripture-catalogue/edition'
import {
  isEditionId,
  type EditionId,
} from '@hexagram/scripture-catalogue/edition-id'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'
import type { Work } from '@hexagram/scripture-catalogue/work'

// The fake Scripture Catalogue of the Typst export's byte fixtures, which
// carry only invented or Legge text (ADR-0028).
// Its Chinese Editions are invented: they take each Hexagram's and
// Trigram's name and imagery from the bundled data, in their own script,
// and give every passage an invented filler naming its Citation, never a
// scripture text. Legge's Edition is the bundled one, names and texts. A
// second, invented English Translation, marked unidentified, gives only
// the Hexagram Statements, so a Readout asking for it shows an empty slot
// at every other passage. The Received Sequence Numbers are the bundled
// ones.

function editionId(text: string): EditionId {
  if (!isEditionId(text)) throw new Error(`${text} is no EditionId`)
  return text
}

const leggeId = editionId('legge-1882')

/** The invented English Translation's EditionId, for `--translation`. */
export const inventedTranslationId: EditionId = editionId('invented-en-2026')

const inventedTraditional = (work: Work): Edition => ({
  id: editionId('invented-zh'),
  work,
  shortName: 'Invented Chinese',
  title: 'An invented Chinese Edition, for the export fixtures (2026)',
  witness: {
    description: 'invented for the export fixtures; it transcribes no source',
  },
  unidentified: false,
  licence: 'public-domain',
  script: 'traditional',
})

const inventedSimplified = (work: Work): Edition => ({
  id: editionId('invented-zh-simplified'),
  work,
  shortName: 'Invented Chinese (simplified)',
  title:
    'An invented Chinese Edition in simplified script, for the export fixtures (2026)',
  witness: {
    description:
      'invented for the export fixtures; its names are the bundled simplified Edition’s',
  },
  unidentified: false,
  licence: 'public-domain',
  script: 'simplified',
})

const inventedEnglish = (work: Work): Edition => ({
  id: inventedTranslationId,
  work,
  shortName: 'Invented English',
  title: 'An invented English Translation, for the export fixtures (2026)',
  witness: {
    description: 'invented for the export fixtures; its source is not known',
  },
  unidentified: true,
  licence: 'public-domain',
  language: 'en',
})

/** Legge's bundled Edition record for the Work, if the bundled data prints it. */
async function leggeEdition(work: Work): Promise<Edition | undefined> {
  const editions = await bundledScriptureCatalogue.editions(work)
  return editions.find((edition) => edition.id === leggeId)
}

/** Which of the four Editions a preference shows, in order. */
type Shown = 'chinese' | 'legge' | 'invented-english'

function shownEditions(preference: ReadingPreference): readonly Shown[] {
  const translations = preference.translations.flatMap((id): Shown[] => {
    if (id === leggeId) return ['legge']
    if (id === inventedTranslationId) return ['invented-english']
    return []
  })
  return ['chinese', ...translations]
}

const chineseEdition = (preference: ReadingPreference, work: Work): Edition =>
  preference.script === 'traditional'
    ? inventedTraditional(work)
    : inventedSimplified(work)

/** The bundled Chinese Edition whose names an invented one borrows. */
const bundledChineseId = (preference: ReadingPreference): EditionId =>
  editionId(
    preference.script === 'traditional'
      ? 'wuyingdian-1739'
      : 'wuyingdian-1739-simplified',
  )

const bits = (figure: Figure): string =>
  figure.map((polarity) => (polarity === 'yang' ? '1' : '0')).join('')

/** A Citation as the filler names it, such as `zhouyi 011010.1`. */
export function citationKey(citation: Citation): string {
  switch (citation.work) {
    case 'zhouyi':
      return citation.line === undefined
        ? `zhouyi ${bits(citation.hexagram)}`
        : `zhouyi ${bits(citation.hexagram)}.${String(citation.line)}`
    case 'xiaoxiang':
      return `xiaoxiang ${bits(citation.hexagram)}.${String(citation.line)}`
    case 'yilin':
      return `yilin ${bits(citation.standing)} ${bits(citation.emerging)}`
    case 'tuan':
    case 'daxiang':
    case 'wenyan':
      return `${citation.work} ${bits(citation.hexagram)}`
  }
}

const chineseFiller = (
  preference: ReadingPreference,
  citation: Citation,
): string =>
  preference.script === 'traditional'
    ? `擬文（${citationKey(citation)}）。`
    : `Invented simplified filler (${citationKey(citation)}).`

const englishFiller = (citation: Citation): string =>
  `Invented English filler for ${citationKey(citation)}.`

/** The fake Catalogue the Typst byte fixtures are made over. */
export const typstFixtureCatalogue: ScriptureCatalogue = {
  async passageTexts(citation, preference) {
    const texts: PassageText[] = []
    for (const shown of shownEditions(preference)) {
      if (shown === 'chinese') {
        texts.push({
          citation,
          edition: chineseEdition(preference, citation.work),
          text: chineseFiller(preference, citation),
        })
      } else if (shown === 'legge') {
        const legge = await bundledScriptureCatalogue.passageTexts(citation, {
          ...preference,
          translations: [leggeId],
        })
        texts.push(...legge.filter((each) => each.edition.id === leggeId))
      } else if (citation.work === 'zhouyi' && citation.line === undefined) {
        texts.push({
          citation,
          edition: inventedEnglish('zhouyi'),
          text: englishFiller(citation),
        })
      }
    }
    return texts
  },
  async hexagramNames(hexagram, preference) {
    const bundled = await bundledScriptureCatalogue.hexagramNames(hexagram, {
      ...preference,
      translations: [leggeId],
    })
    return shownEditions(preference).flatMap((shown) => {
      if (shown === 'chinese') {
        return bundled
          .filter((each) => each.edition.id === bundledChineseId(preference))
          .map((each) => ({
            ...each,
            edition: chineseEdition(preference, 'zhouyi'),
          }))
      }
      if (shown === 'legge')
        return bundled.filter((each) => each.edition.id === leggeId)
      return []
    })
  },
  receivedSequenceNumber: (hexagram) =>
    bundledScriptureCatalogue.receivedSequenceNumber(hexagram),
  async trigramNames(trigram, preference) {
    const bundled = await bundledScriptureCatalogue.trigramNames(trigram, {
      ...preference,
      translations: [leggeId],
    })
    return shownEditions(preference).flatMap((shown) => {
      if (shown === 'chinese') {
        return bundled
          .filter((each) => each.edition.id === bundledChineseId(preference))
          .map((each) => ({
            ...each,
            edition: chineseEdition(preference, 'zhouyi'),
          }))
      }
      if (shown === 'legge')
        return bundled.filter((each) => each.edition.id === leggeId)
      return []
    })
  },
  async editions(work) {
    const legge = await leggeEdition(work)
    return [
      inventedTraditional(work),
      inventedSimplified(work),
      ...(legge === undefined ? [] : [legge]),
      inventedEnglish(work),
    ]
  },
}
