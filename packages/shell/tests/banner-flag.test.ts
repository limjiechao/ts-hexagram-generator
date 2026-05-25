// Pure tests for the `--banner-interval-ms` CLI flag — the single tuning knob
// for the home banner's animation cadence. The same number sets both the
// static-figure interval and the pulse interval, by design; symmetry is
// the contract the flag is preserving.

import { expect, test } from 'vitest'

import {
  DEFAULT_BANNER_INTERVAL_MS,
  parseBannerIntervalMs,
} from '../src/banner-flag'

test('parseBannerIntervalMs() reads --banner-interval-ms <n>', () => {
  expect(parseBannerIntervalMs(['--banner-interval-ms', '500'])).toBe(500)
})

test('parseBannerIntervalMs() reads --banner-interval-ms=<n>', () => {
  expect(parseBannerIntervalMs(['--banner-interval-ms=900'])).toBe(900)
})

test('parseBannerIntervalMs() finds the flag among other arguments', () => {
  expect(
    parseBannerIntervalMs(['foo', '--banner-interval-ms', '750', '--plain']),
  ).toBe(750)
})

test('parseBannerIntervalMs() defaults to DEFAULT_BANNER_INTERVAL_MS without the flag', () => {
  expect(parseBannerIntervalMs([])).toBe(DEFAULT_BANNER_INTERVAL_MS)
  expect(parseBannerIntervalMs(['--plain'])).toBe(DEFAULT_BANNER_INTERVAL_MS)
})

test('parseBannerIntervalMs() ignores non-positive-integer values', () => {
  expect(parseBannerIntervalMs(['--banner-interval-ms', 'abc'])).toBe(
    DEFAULT_BANNER_INTERVAL_MS,
  )
  expect(parseBannerIntervalMs(['--banner-interval-ms=0'])).toBe(
    DEFAULT_BANNER_INTERVAL_MS,
  )
  expect(parseBannerIntervalMs(['--banner-interval-ms', '-5'])).toBe(
    DEFAULT_BANNER_INTERVAL_MS,
  )
  expect(parseBannerIntervalMs(['--banner-interval-ms', '1.5'])).toBe(
    DEFAULT_BANNER_INTERVAL_MS,
  )
  expect(parseBannerIntervalMs(['--banner-interval-ms'])).toBe(
    DEFAULT_BANNER_INTERVAL_MS,
  )
})

test('parseBannerIntervalMs() returns the first occurrence when given multiple', () => {
  expect(
    parseBannerIntervalMs([
      '--banner-interval-ms=600',
      '--banner-interval-ms=2400',
    ]),
  ).toBe(600)
})

test('DEFAULT_BANNER_INTERVAL_MS equals the pulse duration of the previous design', () => {
  // Q2 regression: the previous design pulsed for 20 × 108 = 2160 ms but held
  // the static figure for only ~324 ms. The default banner interval restores
  // symmetry by adopting the pulse duration as the new static-figure dwell.
  expect(DEFAULT_BANNER_INTERVAL_MS).toBe(2160)
})
