import { expect, test } from 'vitest'

import {
  DEFAULT_SLIDER_SWEEP_MS,
  deriveTickMs,
  MAX_TICK_MS,
  MIN_TICK_MS,
  parseCliFlags,
  parseSliderSweepMs,
  parseWrapWidth,
  shouldForceNumericForAccessibility,
  shouldUseNumericInput,
  shouldUsePlainMode,
} from '../src/utils-mode'

test('shouldUsePlainMode() detects --plain', () => {
  expect(shouldUsePlainMode(['--plain'])).toBe(true)
})

test('shouldUsePlainMode() detects --no-ui', () => {
  expect(shouldUsePlainMode(['--no-ui'])).toBe(true)
})

test('shouldUsePlainMode() detects the flag among other arguments', () => {
  expect(shouldUsePlainMode(['foo', '--no-ui', 'bar'])).toBe(true)
})

test('shouldUsePlainMode() is false without a plain-mode flag', () => {
  expect(shouldUsePlainMode([])).toBe(false)
  expect(shouldUsePlainMode(['foo', '--bar'])).toBe(false)
})

test('parseWrapWidth() reads --wrap-width <n>', () => {
  expect(parseWrapWidth(['--wrap-width', '100'])).toBe(100)
})

test('parseWrapWidth() reads --wrap-width=<n>', () => {
  expect(parseWrapWidth(['--wrap-width=80'])).toBe(80)
})

test('parseWrapWidth() finds the flag among other arguments', () => {
  expect(parseWrapWidth(['foo', '--wrap-width', '64', '--plain'])).toBe(64)
})

test('parseWrapWidth() defaults to 120 without the flag', () => {
  expect(parseWrapWidth([])).toBe(120)
  expect(parseWrapWidth(['--plain'])).toBe(120)
})

test('parseWrapWidth() ignores non-positive-integer values', () => {
  expect(parseWrapWidth(['--wrap-width', 'abc'])).toBe(120)
  expect(parseWrapWidth(['--wrap-width', '0'])).toBe(120)
  expect(parseWrapWidth(['--wrap-width', '-5'])).toBe(120)
  expect(parseWrapWidth(['--wrap-width'])).toBe(120)
})

test('parseSliderSweepMs() reads --slider-sweep-ms <n>', () => {
  expect(parseSliderSweepMs(['--slider-sweep-ms', '5000'])).toBe(5000)
})

test('parseSliderSweepMs() reads --slider-sweep-ms=<n>', () => {
  expect(parseSliderSweepMs(['--slider-sweep-ms=4500'])).toBe(4500)
})

test('parseSliderSweepMs() defaults to DEFAULT_SLIDER_SWEEP_MS without the flag', () => {
  expect(parseSliderSweepMs([])).toBe(DEFAULT_SLIDER_SWEEP_MS)
  expect(parseSliderSweepMs(['--plain'])).toBe(DEFAULT_SLIDER_SWEEP_MS)
})

test('parseSliderSweepMs() ignores non-positive-integer values', () => {
  expect(parseSliderSweepMs(['--slider-sweep-ms', 'abc'])).toBe(
    DEFAULT_SLIDER_SWEEP_MS,
  )
  expect(parseSliderSweepMs(['--slider-sweep-ms=0'])).toBe(
    DEFAULT_SLIDER_SWEEP_MS,
  )
  expect(parseSliderSweepMs(['--slider-sweep-ms', '-5'])).toBe(
    DEFAULT_SLIDER_SWEEP_MS,
  )
  expect(parseSliderSweepMs(['--slider-sweep-ms'])).toBe(
    DEFAULT_SLIDER_SWEEP_MS,
  )
})

test('parseSliderSweepMs() returns the first occurrence when given multiple', () => {
  expect(
    parseSliderSweepMs(['--slider-sweep-ms=2000', '--slider-sweep-ms=8000']),
  ).toBe(2000)
})

test('deriveTickMs() divides the sweep budget across (max - min) transitions', () => {
  // Cast 1 of every line: max=48 stalks, 48-1 = 47 transitions. 3000ms / 47 ≈ 63.83 → 64ms.
  expect(deriveTickMs(3000, 48)).toBe(64)
  // A plausible cast 3 range: max=31 → 31 - 1 = 30 transitions. 3000ms / 30 = 100ms.
  expect(deriveTickMs(3000, 31)).toBe(100)
  // Honours an explicit min: 21 - 1 = 20 transitions. 2000ms / 20 = 100ms.
  expect(deriveTickMs(2000, 21, 1)).toBe(100)
})

test('deriveTickMs() clamps to MIN_TICK_MS when the budget is too small', () => {
  // 100ms sweep / Math.max(1, 48 - 1) = 47 transitions ≈ 2ms — well below MIN_TICK_MS (30).
  expect(deriveTickMs(100, 48)).toBe(MIN_TICK_MS)
})

test('deriveTickMs() clamps to MAX_TICK_MS when the budget is huge', () => {
  // 60_000ms sweep / Math.max(1, 48 - 1) = 47 transitions ≈ 1276ms — above MAX_TICK_MS (250).
  expect(deriveTickMs(60_000, 48)).toBe(MAX_TICK_MS)
})

test('deriveTickMs() handles the degenerate single-cell range', () => {
  // max === min → Math.max(1, max - min) = 1, denominator never zero.
  expect(deriveTickMs(3000, 1, 1)).toBe(MAX_TICK_MS)
  expect(deriveTickMs(20, 1, 1)).toBe(MIN_TICK_MS)
})

test('shouldUseNumericInput() detects --numeric-input', () => {
  expect(shouldUseNumericInput(['--numeric-input'])).toBe(true)
})

test('shouldUseNumericInput() detects the flag among other arguments', () => {
  expect(shouldUseNumericInput(['foo', '--numeric-input', '--plain'])).toBe(
    true,
  )
})

test('shouldUseNumericInput() is false without the flag', () => {
  expect(shouldUseNumericInput([])).toBe(false)
  expect(shouldUseNumericInput(['foo', '--bar'])).toBe(false)
})

test('shouldForceNumericForAccessibility() triggers on NO_COLOR set to any value', () => {
  expect(
    shouldForceNumericForAccessibility({ NO_COLOR: '1', CI: undefined }),
  ).toBe(true)
  expect(
    shouldForceNumericForAccessibility({
      NO_COLOR: 'whatever',
      CI: undefined,
    }),
  ).toBe(true)
})

test('shouldForceNumericForAccessibility() triggers on CI set to any value', () => {
  expect(
    shouldForceNumericForAccessibility({ NO_COLOR: undefined, CI: 'true' }),
  ).toBe(true)
  expect(
    shouldForceNumericForAccessibility({ NO_COLOR: undefined, CI: '1' }),
  ).toBe(true)
})

test('shouldForceNumericForAccessibility() ignores empty-string env vars (no-color spec)', () => {
  expect(shouldForceNumericForAccessibility({ NO_COLOR: '', CI: '' })).toBe(
    false,
  )
})

test('shouldForceNumericForAccessibility() is false when neither var is set', () => {
  expect(
    shouldForceNumericForAccessibility({ NO_COLOR: undefined, CI: undefined }),
  ).toBe(false)
})

test('parseCliFlags() composes argv + TTY + env into a single config', () => {
  const flags = parseCliFlags({
    argv: [],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(flags).toEqual({
    outputMode: 'ink',
    inputMode: 'slider',
    wrapWidth: 120,
    sliderSweepMs: DEFAULT_SLIDER_SWEEP_MS,
  })
})

test('parseCliFlags() routes non-TTY to plain', () => {
  const flags = parseCliFlags({
    argv: [],
    isTTY: false,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(flags.outputMode).toBe('plain')
})

test('parseCliFlags() forces numeric input under NO_COLOR even when --numeric-input is absent', () => {
  const flags = parseCliFlags({
    argv: [],
    isTTY: true,
    envVars: { NO_COLOR: '1', CI: undefined },
  })
  expect(flags.inputMode).toBe('number')
})

test('parseCliFlags() forces numeric input under CI', () => {
  const flags = parseCliFlags({
    argv: [],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: 'true' },
  })
  expect(flags.inputMode).toBe('number')
})

test('parseCliFlags() honours explicit --numeric-input', () => {
  const flags = parseCliFlags({
    argv: ['--numeric-input'],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(flags.inputMode).toBe('number')
})

test('parseCliFlags() picks up --wrap-width', () => {
  const flags = parseCliFlags({
    argv: ['--wrap-width', '64'],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(flags.wrapWidth).toBe(64)
})

test('parseCliFlags() picks up --slider-sweep-ms', () => {
  const flags = parseCliFlags({
    argv: ['--slider-sweep-ms', '5000'],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(flags.sliderSweepMs).toBe(5000)
})
