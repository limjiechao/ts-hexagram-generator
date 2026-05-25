// CLI flag parser + live resolver for `--banner-interval-ms <n>` — the single
// tuning knob for the home banner's animation cadence. The same number sets
// both the static-figure dwell and the pulse dwell, mirroring the symmetry the
// state machine enforces internally. Pure parser; the live resolver wraps it
// in a `process.argv` snapshot, matching the shape of `@hexagram/casting-ui`'s
// `resolveSliderSweepMs` / `resolveCastBounceMs` helpers.

import process from 'node:process'

import { DEFAULT_BANNER_INTERVAL_MS } from './banner-state.js'

export { DEFAULT_BANNER_INTERVAL_MS } from './banner-state.js'

const FLAG = '--banner-interval-ms'
const FLAG_PREFIX = `${FLAG}=`

/**
 * Parse the `--banner-interval-ms <n>` / `--banner-interval-ms=<n>` flag.
 * Pure — takes `argv` explicitly so it can be unit-tested without `process`.
 * Falls back to `DEFAULT_BANNER_INTERVAL_MS` when the flag is absent or the
 * value is not a positive integer.
 */
export function parseBannerIntervalMs(argv: readonly string[]): number {
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    let value: string | undefined
    if (argument === FLAG) {
      value = argv[index + 1]
    } else if (argument?.startsWith(FLAG_PREFIX) === true) {
      value = argument.slice(FLAG_PREFIX.length)
    }
    if (value !== undefined && /^\d+$/.test(value)) {
      const parsed = Number.parseInt(value, 10)
      if (parsed > 0) return parsed
    }
  }
  return DEFAULT_BANNER_INTERVAL_MS
}

/**
 * Resolve `--banner-interval-ms` from the live `process.argv`. Thin wrapper
 * around `parseBannerIntervalMs` — production callers use this; tests call the
 * pure parser directly with crafted argv.
 */
export function resolveBannerIntervalMs(): number {
  return parseBannerIntervalMs(process.argv.slice(2))
}
