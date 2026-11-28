import type { NextRound } from '@hexagram/oracle/division'
import type { LinePosition } from '@hexagram/oracle/line-position'

import type { Palette } from '#src/readout/palette.js'

/*
 * What plain casting writes besides the Readout, all of it to stderr, so
 * that stdout holds the Readout alone (CLI manual, sections 5, 6.3 and
 * 6.4). Each is today's wording edited to the glossary's terms. A prompt
 * ends with a space and no newline, so the answer is typed on its line.
 * Escape codes come from the Readout's palette, so `NO_COLOR` removes them
 * here too (ADR-0044).
 */

/**
 * `hexagram-interactive`'s welcome, before the Query prompt: a title, how
 * the Casting goes, and a closing line, with a blank line between each and
 * one after the last.
 */
export function welcomeText(palette: Palette): string {
  return [
    `${palette.heading}Welcome to 易筮占, the Yijing Yarrow Oracle${palette.reset}`,
    'Divide the stalks eighteen times: one Division each Round, three Rounds to a Line, six Lines to the Transformation.',
    `${palette.emphasis}Let your instinct guide each Division.${palette.reset}`,
  ]
    .map((paragraph) => `${paragraph}\n\n`)
    .join('')
}

/** The prompt for the Query, typed on one line (CLI manual, section 3). */
export const queryPrompt = 'Enter your Query: '

/** The line after a blank Query, before the Query prompt again. */
export const blankQueryLine = 'A Query cannot be blank.'

/**
 * The heading `hexagram-interactive` writes before the first Round of each
 * Line, bottom-up from Line 1, after a blank line.
 */
export function lineHeading(line: LinePosition, palette: Palette): string {
  return `\n${palette.heading}Line ${String(line)}:${palette.reset}\n`
}

/** The prompt for a Round's Pick, naming its valid Picks (ADR-0023). */
export function pickPrompt(validPicks: NextRound['validPicks']): string {
  return `Divide the stalks: type a Pick from ${String(validPicks.min)} to ${String(validPicks.max)}: `
}

/**
 * The line after a typed Pick that is not a whole number among the
 * Round's valid Picks, before the same prompt again.
 */
export function invalidPickLine(validPicks: NextRound['validPicks']): string {
  return `A Pick must be a whole number from ${String(validPicks.min)} to ${String(validPicks.max)}.`
}

/** The line once the Cast Consultation is kept, naming its file. */
export function consultationKeptLine(file: string, palette: Palette): string {
  return `${palette.heading}Consultation kept in ${file}.${palette.reset}`
}

/** A casting command with a plain mode. */
export type PlainCastingCommand = 'hexagram-random' | 'hexagram-interactive'

/**
 * The one line on stderr, before exit 1, when stdin ends before a Query is
 * given. Nothing is kept.
 */
export function queryNotGivenLine(command: PlainCastingCommand): string {
  return `${command}: stdin ended before a Query was given`
}

/**
 * The one line on stderr, before exit 1, when stdin ends after the Query
 * and before the eighteenth Pick. Nothing is kept.
 */
export function castingUnfinishedLine(command: PlainCastingCommand): string {
  return `${command}: stdin ended before the Casting was complete`
}

/**
 * The one line on stderr, before exit 1, when stdin cannot be read while
 * the run still reads it, at the Query or at any Pick. Nothing is kept.
 * Once nothing more is read, a stdin error is heard and ignored.
 */
export function stdinUnreadableLine(command: PlainCastingCommand): string {
  return `${command}: stdin cannot be read`
}

/**
 * The one line on stderr, before exit 1, when stdout cannot be written, as
 * when the pipe it feeds is closed. It comes after the keep, which a
 * broken stdout never cuts short, and after the kept line or the Journal
 * line; for `hexagram-history --export`, after the file is written.
 */
export function stdoutUnwritableLine(
  command: PlainCastingCommand | 'hexagram-history',
): string {
  return `${command}: stdout cannot be written`
}

/**
 * The one line on stderr, before exit 1, when a driven port other than the
 * Store fails: the Scripture Catalogue cannot be read for the Readout or
 * the Reading Preference, or the Clock or the Random Source fails (CLI
 * manual, section 6.1). A failed keep is `journalFailureLine`'s, which
 * every command shares.
 */
export function portFailureLine(
  command: PlainCastingCommand | 'hexagram-history',
  failure:
    | 'the Scripture Catalogue cannot be read'
    | 'the Clock cannot be read'
    | 'the Random Source failed',
): string {
  return `${command}: ${failure}`
}
