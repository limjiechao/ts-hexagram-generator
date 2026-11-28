import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import type {
  GivenOptions,
  readingPreferenceRules,
} from '#src/commands/frame.js'

/**
 * The Reading Preference the options give, each option left out taking
 * the glossary's default (CLI manual, section 7): `--script` the Chinese
 * script; `--translation` an EditionId as the Catalogue writes it (such as
 * `legge-1882`), in the order given; `--commentary` a Commentary Work as
 * the Catalogue writes it (`tuan`, `daxiang`, `xiaoxiang` or `wenyan`), in
 * the order given; `--yilin` the Yilin Verse shown. Undefined when a
 * `--translation` is no EditionId or a `--commentary` names no Commentary
 * Work, which the command refuses with its usage line. Given a
 * `--translation` or a `--commentary`, the list is the one given, never
 * the default with it added.
 */
export function readingPreferenceFrom(
  given: GivenOptions<typeof readingPreferenceRules>,
): ReadingPreference | undefined {
  throw new Error('not built', { cause: { given } })
}
