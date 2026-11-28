import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import type {
  GivenOptions,
  readingPreferenceRules,
} from '#src/commands/frame.js'
import type { composeCli } from '#src/composition-root.js'

/**
 * The Reading Preference the options give, each option left out taking
 * the glossary's default (CLI manual, section 7):
 *
 * - `--script` the Chinese script;
 * - `--translation` an EditionId (such as `legge-1882`), in the order
 *   given, each one a Translation that use case 8 lists among the Editions
 *   of the 周易 經 (`lookUpEditions('zhouyi')`); a Chinese Edition's
 *   EditionId is no Translation, since `--script` chooses the Chinese;
 * - `--commentary` a Commentary Work by its id (`tuan`, `daxiang`,
 *   `xiaoxiang` or `wenyan`), in the order given;
 * - `--yilin` the Yilin Verse shown.
 *
 * A given list replaces the default list, never adds to it. Undefined when
 * a `--translation` is no such Translation (a Chinese EditionId included),
 * a `--commentary` names no Commentary Work, or either option names the
 * same one twice; the command then refuses with its usage line, exit 1.
 * The command calls it before it asks for the Query. It looks up the
 * Editions only when a `--translation` is given, once, so a run without
 * one touches no port before the Query. A Catalogue failure rejects the
 * Promise unchanged.
 */
export function readingPreferenceFrom(
  useCases: Pick<ReturnType<typeof composeCli>, 'lookUpEditions'>,
  given: GivenOptions<typeof readingPreferenceRules>,
): Promise<ReadingPreference | undefined> {
  throw new Error('not built', { cause: { useCases, given } })
}
