import process from 'node:process'

export type OutputMode = 'ink' | 'plain'
export type InputMode = 'slider' | 'number'

export interface CliEnv {
  argv: readonly string[]
  isTTY: boolean
  envVars: { NO_COLOR: string | undefined; CI: string | undefined }
}

export interface CliFlags {
  outputMode: OutputMode
  inputMode: InputMode
  wrapWidth: number
  sliderSweepMs: number
  castBounceMs: number
  castRevealMs: number
  manualRevealMs: number
}

const PLAIN_MODE_FLAGS = new Set(['--plain', '--no-ui'])
const NUMERIC_INPUT_FLAGS = new Set(['--numeric-input'])

export const DEFAULT_MAX_WRAP_WIDTH = 120
export const DEFAULT_SLIDER_SWEEP_MS = 1800
export const MIN_TICK_MS = 30
export const MAX_TICK_MS = 250

/**
 * Ceremonial default for `--cast-bounce-ms` — the arm-delay window during
 * random-casting playback. The slider bounces freely for this long before it
 * is allowed to land on the RNG-predetermined pick; combined with the ~0.5 s
 * numeric reveal it gives roughly 2 s per cast, ~36 s for the eighteen casts.
 * A designed pace, not a hard requirement — the flag is a tuning knob.
 */
export const DEFAULT_CAST_BOUNCE_MS = 1500

/**
 * Brisk default for `--cast-reveal-ms` — the per-cast dwell of the number-input
 * mode's text-based progressive reveal. The number flow has no bouncing-slider
 * animation to fill a longer dwell, so the eighteen casts advance at roughly
 * 0.7 s each (~13 s total). A designed pace, not a hard requirement — the flag
 * is a tuning knob.
 */
export const DEFAULT_CAST_REVEAL_MS = 700

/**
 * Ceremonial default for `--manual-reveal-ms` — the per-cast reveal dwell of
 * the manual yarrow-stalk flow's derived-split readout. The physical caster
 * has already done the sorting offline, so the on-screen "Round resolved:
 * suspended X · next: Y unparted" line lingers long enough to confirm before
 * the prompt advances. A designed pace, not a hard requirement — the flag is
 * a tuning knob (tests opt out by passing `0`).
 */
export const DEFAULT_MANUAL_REVEAL_MS = 2500

/**
 * Per-cast tick interval that keeps the end-to-end slider sweep at roughly
 * `sweepMs` regardless of `max`. The cursor moves cell-by-cell across a
 * `max - min + 1` cell bar; a full one-way sweep traverses `max - min`
 * TRANSITIONS between cells, so the per-cast tickMs is `sweepMs / (max - min)`.
 * Clamped to [MIN_TICK_MS, MAX_TICK_MS] so degenerate ranges (max === min) and
 * extreme sweep budgets stay visually sensible.
 */
export function deriveTickMs(sweepMs: number, max: number, min = 1): number {
  const transitions = Math.max(1, max - min)
  const raw = Math.round(sweepMs / transitions)
  return Math.max(MIN_TICK_MS, Math.min(MAX_TICK_MS, raw))
}

/**
 * Whether the given CLI arguments request the plain (non-Ink) output mode.
 * Pure — takes `argv` explicitly so it can be unit-tested without `process`.
 */
export function shouldUsePlainMode(argv: readonly string[]): boolean {
  return argv.some((argument) => PLAIN_MODE_FLAGS.has(argument))
}

/**
 * Whether the given CLI arguments request the legacy typed-number casting
 * prompt instead of the new default bouncing slider. Pure — takes `argv`
 * explicitly so it can be unit-tested without `process`.
 */
export function shouldUseNumericInput(argv: readonly string[]): boolean {
  return argv.some((argument) => NUMERIC_INPUT_FLAGS.has(argument))
}

/**
 * Parse a `--<name> <n>` / `--<name>=<n>` integer flag from `argv`. Pure —
 * takes `argv` explicitly so it can be unit-tested without `process`. Accepts
 * only a run of ASCII digits (`/^\d+$/`, so no sign and no decimal point) that
 * parses to a value `> 0`; otherwise returns `fallback`. Returns the first
 * valid occurrence. This is the single body the per-flag `parse*` helpers
 * below delegate to — they differ only in flag name and default.
 */
export function parseIntFlag(
  argv: readonly string[],
  name: string,
  fallback: number,
): number {
  const eq = `${name}=`
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    let value: string | undefined
    if (argument === name) {
      value = argv[index + 1]
    } else if (argument?.startsWith(eq) === true) {
      value = argument.slice(eq.length)
    }
    if (value !== undefined && /^\d+$/.test(value)) {
      const parsed = Number.parseInt(value, 10)
      if (parsed > 0) return parsed
    }
  }
  return fallback
}

/**
 * Parse the `--wrap-width <n>` / `--wrap-width=<n>` flag. Falls back to
 * `DEFAULT_MAX_WRAP_WIDTH` when absent or not a positive integer. Delegates to
 * `parseIntFlag`.
 */
export function parseWrapWidth(argv: readonly string[]): number {
  return parseIntFlag(argv, '--wrap-width', DEFAULT_MAX_WRAP_WIDTH)
}

/**
 * Parse the `--slider-sweep-ms <n>` / `--slider-sweep-ms=<n>` flag. Falls back
 * to `DEFAULT_SLIDER_SWEEP_MS`. Delegates to `parseIntFlag`.
 */
export function parseSliderSweepMs(argv: readonly string[]): number {
  return parseIntFlag(argv, '--slider-sweep-ms', DEFAULT_SLIDER_SWEEP_MS)
}

/**
 * Parse the `--cast-bounce-ms <n>` / `--cast-bounce-ms=<n>` flag. Falls back to
 * `DEFAULT_CAST_BOUNCE_MS`. Delegates to `parseIntFlag`.
 */
export function parseCastBounceMs(argv: readonly string[]): number {
  return parseIntFlag(argv, '--cast-bounce-ms', DEFAULT_CAST_BOUNCE_MS)
}

/**
 * Parse the `--cast-reveal-ms <n>` / `--cast-reveal-ms=<n>` flag. Falls back to
 * `DEFAULT_CAST_REVEAL_MS`. Delegates to `parseIntFlag`.
 */
export function parseCastRevealMs(argv: readonly string[]): number {
  return parseIntFlag(argv, '--cast-reveal-ms', DEFAULT_CAST_REVEAL_MS)
}

/**
 * Parse the `--manual-reveal-ms <n>` / `--manual-reveal-ms=<n>` flag. Falls
 * back to `DEFAULT_MANUAL_REVEAL_MS`. Delegates to `parseIntFlag`.
 */
export function parseManualRevealMs(argv: readonly string[]): number {
  return parseIntFlag(argv, '--manual-reveal-ms', DEFAULT_MANUAL_REVEAL_MS)
}

/**
 * Accessibility-driven force-numeric heuristic. The Ink slider is purely
 * visual (a bouncing cursor with no semantic value at any frame), so any
 * environment that signals "no animation/colour" or "non-interactive
 * automation" should fall back to the typed-number prompt. Detection:
 *
 *   - `NO_COLOR` per https://no-color.org/ — set to any non-empty value.
 *   - `CI` — set to any non-empty value by most CI runners.
 *
 * Pure — takes the env vars explicitly so it can be unit-tested.
 *
 * Note: non-TTY environments already route to plain mode (which is always
 * typed), so this heuristic only matters when the Ink viewer is active.
 */
export function shouldForceNumericForAccessibility(envVars: {
  NO_COLOR: string | undefined
  CI: string | undefined
}): boolean {
  const noColor = envVars.NO_COLOR !== undefined && envVars.NO_COLOR !== ''
  const ci = envVars.CI !== undefined && envVars.CI !== ''
  return noColor || ci
}

/**
 * Resolve all CLI flags from an explicit environment snapshot. Pure — the
 * single source of truth for how argv + TTY state + env vars combine into
 * runtime configuration. Tests call this directly with crafted envs;
 * production callers go through `resolveCliFlags()`.
 */
export function parseCliFlags(env: CliEnv): CliFlags {
  const outputMode: OutputMode =
    shouldUsePlainMode(env.argv) || !env.isTTY ? 'plain' : 'ink'
  const inputMode: InputMode =
    shouldUseNumericInput(env.argv) ||
    shouldForceNumericForAccessibility(env.envVars)
      ? 'number'
      : 'slider'
  const wrapWidth = parseWrapWidth(env.argv)
  const sliderSweepMs = parseSliderSweepMs(env.argv)
  const castBounceMs = parseCastBounceMs(env.argv)
  const castRevealMs = parseCastRevealMs(env.argv)
  const manualRevealMs = parseManualRevealMs(env.argv)
  return {
    outputMode,
    inputMode,
    wrapWidth,
    sliderSweepMs,
    castBounceMs,
    castRevealMs,
    manualRevealMs,
  }
}

/**
 * Resolve CLI flags from the live `process.argv` / `process.stdout.isTTY` /
 * `process.env`. Thin wrapper around `parseCliFlags()` that snapshots the
 * current process state. Each `resolve*()` helper calls this fresh — the
 * cost is microseconds and avoids a module-level cache that test runs would
 * have to reason about.
 */
function resolveCliFlags(): CliFlags {
  return parseCliFlags({
    argv: process.argv.slice(2),
    isTTY: Boolean(process.stdout.isTTY),
    envVars: { NO_COLOR: process.env.NO_COLOR, CI: process.env.CI },
  })
}

export function resolveOutputMode(): OutputMode {
  return resolveCliFlags().outputMode
}

export function resolveInputMode(): InputMode {
  return resolveCliFlags().inputMode
}

export function resolveWrapWidth(): number {
  return resolveCliFlags().wrapWidth
}

export function resolveSliderSweepMs(): number {
  return resolveCliFlags().sliderSweepMs
}

export function resolveCastBounceMs(): number {
  return resolveCliFlags().castBounceMs
}

export function resolveCastRevealMs(): number {
  return resolveCliFlags().castRevealMs
}

export function resolveManualRevealMs(): number {
  return resolveCliFlags().manualRevealMs
}

/**
 * The `runConsultationViewer` object-args shape for the random flow. Built by
 * `buildRandomViewerArgs` so the flag→viewer wiring is a pure, unit-testable
 * value rather than an inline object literal in the `hexagram-random` bin —
 * an inline literal is exactly how `inputMode` came to be dropped (the bin
 * forwarded every other flag but silently omitted `inputMode`, so
 * `--numeric-input` never reached the viewer).
 */
export interface RandomViewerArgs {
  flowKind: 'random'
  inputMode: InputMode
  maxWrapWidth: number
  sliderSweepMs: number
  castBounceMs: number
  castRevealMs: number
}

/**
 * Build the `runConsultationViewer` args for the standalone `hexagram-random`
 * bin's Ink branch from an explicit CLI environment. Pure — every knob the bin
 * forwards (including `inputMode`, so `--numeric-input` / the NO_COLOR-CI
 * accessibility heuristic genuinely reach the viewer's number-mode reveal) is
 * derived here and asserted by `utils-mode` tests.
 */
export function buildRandomViewerArgs(env: CliEnv): RandomViewerArgs {
  const flags = parseCliFlags(env)
  return {
    flowKind: 'random',
    inputMode: flags.inputMode,
    maxWrapWidth: flags.wrapWidth,
    sliderSweepMs: flags.sliderSweepMs,
    castBounceMs: flags.castBounceMs,
    castRevealMs: flags.castRevealMs,
  }
}

/**
 * Resolve the random-flow viewer args from the live process environment. Thin
 * wrapper around `buildRandomViewerArgs` — mirrors the `resolve*()` helpers.
 */
export function resolveRandomViewerArgs(): RandomViewerArgs {
  return buildRandomViewerArgs({
    argv: process.argv.slice(2),
    isTTY: Boolean(process.stdout.isTTY),
    envVars: { NO_COLOR: process.env.NO_COLOR, CI: process.env.CI },
  })
}
