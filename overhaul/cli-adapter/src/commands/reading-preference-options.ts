import { defaultReadingPreference } from '@hexagram/scripture-catalogue/default-reading-preference'
import type { EditionId } from '@hexagram/scripture-catalogue/edition-id'
import type { ReadingPreference } from '@hexagram/scripture-catalogue/reading-preference'

import {
  CatalogueFailureError,
  namingCatalogueFailure,
} from '#src/commands/catalogue-failure.js'
import type {
  CommandIo,
  CommandPorts,
  ExitCode,
} from '#src/commands/entry-point.js'
import {
  endWith,
  readingPreferenceRules,
  type GivenOptions,
} from '#src/commands/frame.js'
import {
  portFailureLine,
  type PlainCastingCommand,
} from '#src/commands/plain-casting-wording.js'
import { composeCli } from '#src/composition-root.js'

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
export async function readingPreferenceFrom(
  useCases: Pick<ReturnType<typeof composeCli>, 'lookUpEditions'>,
  given: GivenOptions<typeof readingPreferenceRules>,
): Promise<ReadingPreference | undefined> {
  const commentaries = chosenFrom(
    given.get('--commentary'),
    commentaryWorks,
    defaultReadingPreference.commentaries,
  )
  if (commentaries === undefined) return undefined

  const translationIds = given.get('--translation')
  let translations = defaultReadingPreference.translations
  if (translationIds !== undefined) {
    const editions = await useCases.lookUpEditions('zhouyi')
    const known: readonly EditionId[] = editions
      .filter((edition) => edition.language !== undefined)
      .map((edition) => edition.id)
    const chosen = chosenFrom(translationIds, known, [])
    if (chosen === undefined) return undefined
    translations = chosen
  }

  return {
    script:
      scripts.find((script) => script === given.get('--script')?.[0]) ??
      defaultReadingPreference.script,
    translations,
    commentaries,
    yilinVerse: given.has('--yilin'),
  }
}

const scripts: readonly ReadingPreference['script'][] = [
  'traditional',
  'simplified',
]

const commentaryWorks: ReadingPreference['commentaries'] = [
  'tuan',
  'daxiang',
  'xiaoxiang',
  'wenyan',
]

/**
 * The values given, each the one of `known` written the same, in the order
 * given; the default when none was given; undefined when one is unknown or
 * given twice.
 */
function chosenFrom<Known extends string>(
  values: readonly string[] | undefined,
  known: readonly Known[],
  byDefault: readonly Known[],
): readonly Known[] | undefined {
  if (values === undefined) return byDefault
  if (new Set(values).size !== values.length) return undefined
  const chosen: Known[] = []
  for (const value of values) {
    const found = known.find((each) => each === value)
    if (found === undefined) return undefined
    chosen.push(found)
  }
  return chosen
}

type ReadingOption = keyof typeof readingPreferenceRules

/**
 * A casting command's Reading Preference, checked while its options are
 * parsed, before a mode is chosen: the Reading Preference, or the ending
 * already written, the usage line for options it refuses and the
 * Catalogue line when the Catalogue fails, each exit 1. An error that is
 * no Catalogue failure propagates.
 */
export async function checkedReadingPreference(
  io: CommandIo,
  ports: CommandPorts,
  command: { readonly name: PlainCastingCommand; readonly usage: string },
  given: ReadonlyMap<string, readonly string[]>,
): Promise<ReadingPreference | ExitCode> {
  let preference
  try {
    preference = await readingPreferenceFrom(
      // The four ports one by one: spreading `ports` would read the
      // Journal's folder, which nothing before the Query may touch.
      composeCli({
        scriptureCatalogue: namingCatalogueFailure(ports.scriptureCatalogue),
        randomSource: ports.randomSource,
        consultationStore: ports.consultationStore,
        clock: ports.clock,
      }),
      new Map(
        [...given].filter(
          (entry): entry is [ReadingOption, readonly string[]] =>
            Object.keys(readingPreferenceRules).includes(entry[0]),
        ),
      ),
    )
  } catch (error) {
    if (!(error instanceof CatalogueFailureError)) throw error
    return endWith(
      io,
      portFailureLine(command.name, 'the Scripture Catalogue cannot be read'),
    )
  }
  return preference ?? endWith(io, command.usage)
}
