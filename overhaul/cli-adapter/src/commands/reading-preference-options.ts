import type { ScriptureCatalogue } from '@hexagram/application/scripture-catalogue'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import type {
  GivenOptions,
  readingPreferenceRules,
} from '#src/commands/frame.js'

/**
 * The Reading Preference the options give, each option left out taking
 * the glossary's default (CLI manual, section 7):
 *
 * - `--script` the Chinese script;
 * - `--translation` an EditionId (such as `legge-1882`), in the order
 *   given, each one a Translation the Scripture Catalogue lists among the
 *   Editions of the 周易 經 (`zhouyi`);
 * - `--commentary` a Commentary Work by its id (`tuan`, `daxiang`,
 *   `xiaoxiang` or `wenyan`), in the order given;
 * - `--yilin` the Yilin Verse shown.
 *
 * A given list replaces the default list, never adds to it. Undefined when
 * a `--translation` is no such Translation, a `--commentary` names no
 * Commentary Work, or either names one twice; the command then refuses
 * with its usage line, exit 1. The command calls it before it asks for the
 * Query. It asks the Catalogue only when a `--translation` is given, once,
 * so a run without one touches no port before the Query. A Catalogue
 * failure rejects the Promise unchanged.
 */
export function readingPreferenceFrom(
  ports: { readonly scriptureCatalogue: ScriptureCatalogue },
  given: GivenOptions<typeof readingPreferenceRules>,
): Promise<ReadingPreference | undefined> {
  throw new Error('not built', { cause: { ports, given } })
}
