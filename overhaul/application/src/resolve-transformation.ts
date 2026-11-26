import type { PassageReference } from '@hexagram/oracle/passage-reference'
import { resolve, type Resolution } from '@hexagram/oracle/resolution'
import type { Transformation } from '@hexagram/oracle/transformation'
import type { Citation } from '@hexagram/scripture-catalogue/citation'
import type { PassageText } from '@hexagram/scripture-catalogue/passage-text'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import type { ScriptureCatalogue } from '#src/scripture-catalogue.js'

/**
 * The Commentaries' Citations for one Applicable Passage, in the preference's
 * order: a Hexagram Statement takes the Hexagram-wide Works, a Line Statement
 * or the All-Moving Statement takes the 小象 on it. A Work's text is asked for
 * whatever the Hexagram; a Hexagram without it gets none from the Catalogue.
 */
const commentariesOn = (
  passage: PassageReference,
  commentaries: ReadingPreference['commentaries'],
): readonly Citation[] => {
  if (passage.line === undefined) {
    return commentaries.flatMap((work): Citation[] =>
      work === 'xiaoxiang' ? [] : [{ work, hexagram: passage.hexagram }],
    )
  }
  return commentaries.includes('xiaoxiang')
    ? [{ work: 'xiaoxiang', hexagram: passage.hexagram, line: passage.line }]
    : []
}

/**
 * Every Citation the reading shows, in order: each Applicable Passage followed
 * by its Commentaries, then the Yilin Verse when the preference asks for it.
 */
const citationsOf = (
  resolution: Resolution,
  preference: ReadingPreference,
): readonly Citation[] => {
  const yilinVerse: readonly Citation[] = preference.yilinVerse
    ? [
        {
          work: 'yilin',
          standing: resolution.standing.hexagram,
          emerging: resolution.emerging.hexagram,
        },
      ]
    : []
  return [
    ...resolution.applicablePassages.flatMap((passage): Citation[] => [
      { work: 'zhouyi', ...passage },
      ...commentariesOn(passage, preference.commentaries),
    ]),
    ...yilinVerse,
  ]
}

/**
 * Use case 3, Resolve a Transformation: the Oracle's Resolution, and the text
 * of its Applicable Passages in each Edition the preference shows, together
 * with the Commentaries and the Yilin Verse the preference asks for. Each
 * passage text carries its Citation. `passageTexts` holds the Resolution's
 * Applicable Passages in order, each followed by its Commentaries, then the
 * Yilin Verse; the order carries no rank (ADR-0024). A Catalogue failure
 * rejects the Promise unchanged.
 */
export async function resolveTransformation(
  ports: { readonly scriptureCatalogue: ScriptureCatalogue },
  transformation: Transformation,
  preference: ReadingPreference,
): Promise<{
  readonly resolution: Resolution
  readonly passageTexts: readonly PassageText[]
}> {
  const resolution = resolve(transformation)
  const passageTexts: PassageText[] = []
  // One call at a time, so the first rejection stops every later call.
  for (const citation of citationsOf(resolution, preference)) {
    passageTexts.push(
      ...(await ports.scriptureCatalogue.passageTexts(citation, preference)),
    )
  }
  return { resolution, passageTexts }
}
