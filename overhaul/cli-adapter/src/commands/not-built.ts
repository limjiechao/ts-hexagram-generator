/**
 * What each command can be named for when it is not built yet: the modes its
 * row of the terminal table chooses, and for `hexagram-history` its
 * maintenance options too, which run in every column of the table and so are
 * named by their option.
 */
export const reachable = {
  hexagram: ['full-screen', 'full-screen, no colour, typed input'],
  'hexagram-random': ['full-screen', 'full-screen, typed input', 'plain mode'],
  'hexagram-interactive': [
    'full-screen',
    'full-screen, typed input',
    'plain mode',
  ],
  'hexagram-manual': ['full-screen', 'full-screen, no colour, typed input'],
  'hexagram-playground': ['full-screen', 'full-screen, no colour, typed input'],
  'hexagram-history': [
    'full-screen',
    'full-screen, no colour, typed input',
    '--import-legacy',
    '--rerender-bodies',
    '--export',
    '--export-journal',
    '--merge-journal',
  ],
} as const

/** The six commands of the CLI. */
export type CommandName = keyof typeof reachable

/** A maintenance option of `hexagram-history`. */
export type MaintenanceOption = Extract<
  (typeof reachable)[CommandName][number],
  `--${string}`
>

/**
 * A mode the CLI manual's terminal table (section 2) can choose for a command
 * that runs, named as the table's cell names it. A refusal chooses no mode, so
 * it has no phrase here.
 */
export type Mode = Exclude<
  (typeof reachable)[CommandName][number],
  MaintenanceOption
>

/**
 * The one line a command prints to stderr, before it exits 1, when the mode
 * the terminal table chose, or the maintenance run asked for, is not built
 * yet.
 */
export function notBuiltLine<Name extends CommandName>(
  command: Name,
  what: (typeof reachable)[Name][number],
): string {
  return `${command}: ${what} is not built yet`
}
