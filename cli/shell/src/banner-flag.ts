// CLI flag parser + live resolver for `--banner-interval-ms <n>` — the single
// tuning knob for the home banner's animation cadence. The same number sets
// both the static-figure dwell and the pulse dwell, mirroring the symmetry the
// state machine enforces internally. Pure parser; the live resolver wraps it
// in a `process.argv` snapshot, matching the shape of `@hexagram/casting-ui`'s
// `resolveSliderSweepMs` / `resolveCastBounceMs` helpers.

import process from 'node:process'

import { parseIntFlag } from '@hexagram/viewer-core'

import { DEFAULT_BANNER_INTERVAL_MS } from './banner-state.js'

export { DEFAULT_BANNER_INTERVAL_MS } from './banner-state.js'

const FLAG = '--banner-interval-ms'

/**
 * Parse `--banner-interval-ms <n>` / `--banner-interval-ms=<n>`. Pure — takes
 * `argv` explicitly for unit testing. Falls back to
 * `DEFAULT_BANNER_INTERVAL_MS` when the flag is absent or not a positive
 * integer. Delegates to the shared `parseIntFlag`.
 */
export function parseBannerIntervalMs(argv: readonly string[]): number {
  return parseIntFlag(argv, FLAG, DEFAULT_BANNER_INTERVAL_MS)
}

/**
 * Resolve `--banner-interval-ms` from the live `process.argv`. Thin wrapper —
 * production callers use this; tests call the pure parser with crafted argv.
 */
export function resolveBannerIntervalMs(): number {
  return parseBannerIntervalMs(process.argv.slice(2))
}
