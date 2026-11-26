import type { CommandIo, ExitCode } from '#src/commands/entry-point.js'

/**
 * What an option takes: nothing, a positive whole number, any non-empty text,
 * one of a fixed list, or, for `--import-legacy` only, the paths given directly
 * after it.
 */
type OptionValue =
  | 'flag'
  | 'whole number'
  | 'text'
  | 'paths'
  | readonly string[]

interface OptionRule {
  readonly value: OptionValue
  readonly repeatable?: boolean
  /** Other names for the same option, so giving two of them is a repeat. */
  readonly aliases?: readonly string[]
}

/** The options a command accepts, by name. */
export type OptionRules = Readonly<Record<string, OptionRule>>

/**
 * The options a command was given, under the names its rules use, each with
 * the values it was given in order.
 */
export type GivenOptions<Rules extends OptionRules> = ReadonlyMap<
  Extract<keyof Rules, string>,
  readonly string[]
>

/** The options every command that shows a Readout accepts: its Reading Preference. */
export const readingPreferenceRules: Readonly<
  Record<'--script' | '--translation' | '--commentary' | '--yilin', OptionRule>
> = {
  '--script': { value: ['traditional', 'simplified'] },
  '--translation': { value: 'text', repeatable: true },
  '--commentary': { value: 'text', repeatable: true },
  '--yilin': { value: 'flag' },
}

function isRuleName<Rules extends OptionRules>(
  rules: Rules,
  name: string,
): name is Extract<keyof Rules, string> {
  return Object.keys(rules).includes(name)
}

const wholeNumber = /^[1-9]\d*$/

function isValid(value: string, rule: OptionValue): boolean {
  if (rule === 'whole number') return wholeNumber.test(value)
  if (rule === 'text') return value !== ''
  if (typeof rule === 'string') return false
  return rule.includes(value)
}

const isPositional = (token: string): boolean => !token.startsWith('-')

/**
 * Reads `argv` against a command's rules, or gives undefined when the line is
 * a usage refusal: an unknown option, a bad or missing value, a repeat, or a
 * positional anywhere but directly after `--import-legacy`. A lone `--` is
 * dropped wherever it appears.
 */
export function parseOptions<Rules extends OptionRules>(
  argv: readonly string[],
  rules: Rules,
): GivenOptions<Rules> | undefined {
  const byWritten = new Map<
    string,
    { readonly name: Extract<keyof Rules, string>; readonly rule: OptionRule }
  >()
  for (const [name, rule] of Object.entries(rules)) {
    if (!isRuleName(rules, name)) continue
    for (const written of [name, ...(rule.aliases ?? [])])
      byWritten.set(written, { name, rule })
  }

  const tokens = argv.filter((token) => token !== '--')
  const given = new Map<Extract<keyof Rules, string>, string[]>()
  let index = 0
  while (index < tokens.length) {
    const token = tokens[index] ?? ''
    index += 1
    if (!token.startsWith('--')) return undefined
    const equals = token.indexOf('=')
    const written = equals === -1 ? token : token.slice(0, equals)
    const inline = equals === -1 ? undefined : token.slice(equals + 1)
    const known = byWritten.get(written)
    if (known === undefined) return undefined
    const { name, rule } = known
    const values = given.get(name)
    if (values !== undefined && rule.repeatable !== true) return undefined

    let taken: string[]
    if (rule.value === 'flag' || rule.value === 'paths') {
      if (inline !== undefined) return undefined
      taken = []
      while (rule.value === 'paths' && index < tokens.length) {
        const path = tokens[index] ?? ''
        if (!isPositional(path)) break
        taken.push(path)
        index += 1
      }
    } else {
      const value = inline ?? tokens[index]
      if (inline === undefined) index += 1
      if (value === undefined || !isValid(value, rule.value)) return undefined
      // A separate value starting with `-` may be the next option, its own
      // value forgotten; such a value must be written with `=` instead.
      if (inline === undefined && !isPositional(value)) return undefined
      taken = [value]
    }
    given.set(name, [...(values ?? []), ...taken])
  }
  return given
}

/** Whether an environment variable counts as set: present and non-empty (ADR-0044). */
const isSet = (value: string | undefined): boolean =>
  value !== undefined && value !== ''

/** Every ending of the frame: one line on stderr, exit 1. */
export function endWith(io: CommandIo, text: string): Promise<ExitCode> {
  io.stderr.write(`${text}\n`)
  return Promise.resolve(1)
}

/** The refusal of a full-screen command the terminal table refuses (CLI manual, section 6.1). */
export const terminalRefusal = (command: string): string =>
  `${command} requires an interactive terminal`

/**
 * The terminal table's row for a full-screen-only command: undefined where it
 * refuses (stdout not a TTY, or `CI`), and otherwise its mode.
 */
export function fullScreenOnlyMode(
  io: CommandIo,
): 'full-screen' | 'full-screen, no colour, typed input' | undefined {
  if (!io.isTTY || isSet(io.env.CI)) return undefined
  return isSet(io.env.NO_COLOR)
    ? 'full-screen, no colour, typed input'
    : 'full-screen'
}

/**
 * The terminal table's row for a casting command with a plain mode, where
 * `--plain` names plain mode and `--numeric-input` names typed input.
 */
export function castingMode(
  io: CommandIo,
  flags: { readonly plain: boolean; readonly numericInput: boolean },
): 'plain mode' | 'full-screen, typed input' | 'full-screen' {
  if (flags.plain || !io.isTTY) return 'plain mode'
  if (flags.numericInput || isSet(io.env.NO_COLOR) || isSet(io.env.CI))
    return 'full-screen, typed input'
  return 'full-screen'
}
