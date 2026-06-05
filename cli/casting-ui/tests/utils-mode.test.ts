import { describe, expect, test } from 'vitest'

import {
  buildRandomViewerArgs,
  DEFAULT_CAST_BOUNCE_MS,
  DEFAULT_CAST_REVEAL_MS,
  DEFAULT_MANUAL_REVEAL_MS,
  DEFAULT_SLIDER_SWEEP_MS,
  deriveTickMs,
  MAX_TICK_MS,
  MIN_TICK_MS,
  parseCastBounceMs,
  parseCastRevealMs,
  parseCliFlags,
  parseIntFlag,
  parseManualRevealMs,
  parseSliderSweepMs,
  parseWrapWidth,
  shouldForceNumericForAccessibility,
  shouldUseNumericInput,
  shouldUsePlainMode,
} from '../src/utils-mode'

describe('parseIntFlag', () => {
  test('reads the space-separated form --flag <n>', () => {
    expect(
      parseIntFlag(['--cast-reveal-ms', '900'], '--cast-reveal-ms', 700),
    ).toBe(900)
  })

  test('reads the equals form --flag=<n>', () => {
    expect(
      parseIntFlag(['--cast-reveal-ms=900'], '--cast-reveal-ms', 700),
    ).toBe(900)
  })

  test('falls back when the flag is absent', () => {
    expect(parseIntFlag([], '--cast-reveal-ms', 700)).toBe(700)
  })

  test('falls back on a non-numeric value', () => {
    expect(
      parseIntFlag(['--cast-reveal-ms', 'fast'], '--cast-reveal-ms', 700),
    ).toBe(700)
  })

  test('falls back on a zero value (must be a positive integer)', () => {
    expect(
      parseIntFlag(['--cast-reveal-ms', '0'], '--cast-reveal-ms', 700),
    ).toBe(700)
  })

  test('falls back on a negative / signed value (regex rejects the sign)', () => {
    expect(
      parseIntFlag(['--cast-reveal-ms', '-5'], '--cast-reveal-ms', 700),
    ).toBe(700)
  })

  test('falls back on a decimal value (regex rejects the dot)', () => {
    expect(
      parseIntFlag(['--cast-reveal-ms', '1.5'], '--cast-reveal-ms', 700),
    ).toBe(700)
  })

  test('returns the first valid occurrence when repeated', () => {
    expect(
      parseIntFlag(
        ['--cast-reveal-ms=900', '--cast-reveal-ms=1200'],
        '--cast-reveal-ms',
        700,
      ),
    ).toBe(900)
  })

  test('does not match a flag that is a prefix of another flag', () => {
    // `--cast-reveal-ms-extra=900` must NOT satisfy `--cast-reveal-ms`.
    expect(
      parseIntFlag(['--cast-reveal-ms-extra=900'], '--cast-reveal-ms', 700),
    ).toBe(700)
  })
})

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

test('parseCastBounceMs() reads --cast-bounce-ms <n>', () => {
  expect(parseCastBounceMs(['--cast-bounce-ms', '1200'])).toBe(1200)
})

test('parseCastBounceMs() reads --cast-bounce-ms=<n>', () => {
  expect(parseCastBounceMs(['--cast-bounce-ms=900'])).toBe(900)
})

test('parseCastBounceMs() defaults to DEFAULT_CAST_BOUNCE_MS without the flag', () => {
  expect(parseCastBounceMs([])).toBe(DEFAULT_CAST_BOUNCE_MS)
  expect(parseCastBounceMs(['--plain'])).toBe(DEFAULT_CAST_BOUNCE_MS)
})

test('parseCastBounceMs() ignores non-positive-integer values', () => {
  expect(parseCastBounceMs(['--cast-bounce-ms', 'abc'])).toBe(
    DEFAULT_CAST_BOUNCE_MS,
  )
  expect(parseCastBounceMs(['--cast-bounce-ms=0'])).toBe(DEFAULT_CAST_BOUNCE_MS)
  expect(parseCastBounceMs(['--cast-bounce-ms', '-5'])).toBe(
    DEFAULT_CAST_BOUNCE_MS,
  )
  expect(parseCastBounceMs(['--cast-bounce-ms', '1.5'])).toBe(
    DEFAULT_CAST_BOUNCE_MS,
  )
  expect(parseCastBounceMs(['--cast-bounce-ms'])).toBe(DEFAULT_CAST_BOUNCE_MS)
})

test('parseCastBounceMs() returns the first occurrence when given multiple', () => {
  expect(
    parseCastBounceMs(['--cast-bounce-ms=1000', '--cast-bounce-ms=4000']),
  ).toBe(1000)
})

test('parseCastRevealMs() reads --cast-reveal-ms <n>', () => {
  expect(parseCastRevealMs(['--cast-reveal-ms', '900'])).toBe(900)
})

test('parseCastRevealMs() reads --cast-reveal-ms=<n>', () => {
  expect(parseCastRevealMs(['--cast-reveal-ms=500'])).toBe(500)
})

test('parseCastRevealMs() defaults to DEFAULT_CAST_REVEAL_MS without the flag', () => {
  expect(parseCastRevealMs([])).toBe(DEFAULT_CAST_REVEAL_MS)
  expect(parseCastRevealMs(['--plain'])).toBe(DEFAULT_CAST_REVEAL_MS)
})

test('parseCastRevealMs() ignores non-positive-integer values', () => {
  expect(parseCastRevealMs(['--cast-reveal-ms', 'abc'])).toBe(
    DEFAULT_CAST_REVEAL_MS,
  )
  expect(parseCastRevealMs(['--cast-reveal-ms=0'])).toBe(DEFAULT_CAST_REVEAL_MS)
  expect(parseCastRevealMs(['--cast-reveal-ms', '-5'])).toBe(
    DEFAULT_CAST_REVEAL_MS,
  )
  expect(parseCastRevealMs(['--cast-reveal-ms', '1.5'])).toBe(
    DEFAULT_CAST_REVEAL_MS,
  )
  expect(parseCastRevealMs(['--cast-reveal-ms'])).toBe(DEFAULT_CAST_REVEAL_MS)
})

test('parseCastRevealMs() returns the first occurrence when given multiple', () => {
  expect(
    parseCastRevealMs(['--cast-reveal-ms=600', '--cast-reveal-ms=2000']),
  ).toBe(600)
})

test('DEFAULT_MANUAL_REVEAL_MS is 2500', () => {
  expect(DEFAULT_MANUAL_REVEAL_MS).toBe(2500)
})

test('parseManualRevealMs() reads --manual-reveal-ms <n>', () => {
  expect(parseManualRevealMs(['--manual-reveal-ms', '500'])).toBe(500)
})

test('parseManualRevealMs() reads --manual-reveal-ms=<n>', () => {
  expect(parseManualRevealMs(['--manual-reveal-ms=1500'])).toBe(1500)
})

test('parseManualRevealMs() finds the flag among other arguments', () => {
  expect(
    parseManualRevealMs([
      'foo',
      '--manual-reveal-ms',
      '800',
      '--wrap-width=64',
    ]),
  ).toBe(800)
})

test('parseManualRevealMs() defaults to DEFAULT_MANUAL_REVEAL_MS without the flag', () => {
  expect(parseManualRevealMs([])).toBe(DEFAULT_MANUAL_REVEAL_MS)
  expect(parseManualRevealMs(['--plain'])).toBe(DEFAULT_MANUAL_REVEAL_MS)
})

test('parseManualRevealMs() ignores non-positive-integer values', () => {
  expect(parseManualRevealMs(['--manual-reveal-ms', 'abc'])).toBe(
    DEFAULT_MANUAL_REVEAL_MS,
  )
  expect(parseManualRevealMs(['--manual-reveal-ms=0'])).toBe(
    DEFAULT_MANUAL_REVEAL_MS,
  )
  expect(parseManualRevealMs(['--manual-reveal-ms', '-5'])).toBe(
    DEFAULT_MANUAL_REVEAL_MS,
  )
  expect(parseManualRevealMs(['--manual-reveal-ms', '1.5'])).toBe(
    DEFAULT_MANUAL_REVEAL_MS,
  )
  expect(parseManualRevealMs(['--manual-reveal-ms'])).toBe(
    DEFAULT_MANUAL_REVEAL_MS,
  )
})

test('parseManualRevealMs() returns the first occurrence when given multiple', () => {
  expect(
    parseManualRevealMs(['--manual-reveal-ms=500', '--manual-reveal-ms=3000']),
  ).toBe(500)
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
    castBounceMs: DEFAULT_CAST_BOUNCE_MS,
    castRevealMs: DEFAULT_CAST_REVEAL_MS,
    manualRevealMs: DEFAULT_MANUAL_REVEAL_MS,
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

test('parseCliFlags() picks up --cast-bounce-ms', () => {
  const flags = parseCliFlags({
    argv: ['--cast-bounce-ms', '1200'],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(flags.castBounceMs).toBe(1200)
})

test('parseCliFlags() picks up --cast-reveal-ms', () => {
  const flags = parseCliFlags({
    argv: ['--cast-reveal-ms', '900'],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(flags.castRevealMs).toBe(900)
})

test('parseCliFlags() picks up --manual-reveal-ms', () => {
  const flags = parseCliFlags({
    argv: ['--manual-reveal-ms', '500'],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(flags.manualRevealMs).toBe(500)
})

// `buildRandomViewerArgs` is the exact object the `hexagram-random` bin's Ink
// branch hands to `runConsultationViewer`. These tests pin the flag→viewer
// wiring: the bin previously omitted `inputMode` from its inline args literal,
// so `--numeric-input` could never reach the number-mode reveal. Routing the
// bin through this pure builder means the omission is now a unit-test failure.

test('buildRandomViewerArgs() always sets flowKind to random', () => {
  const args = buildRandomViewerArgs({
    argv: [],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(args.flowKind).toBe('random')
})

test('buildRandomViewerArgs() defaults inputMode to slider', () => {
  const args = buildRandomViewerArgs({
    argv: [],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(args.inputMode).toBe('slider')
})

test('buildRandomViewerArgs() forwards --numeric-input as inputMode: number', () => {
  // The bug this guards: hexagram-random --numeric-input must reach the
  // number-mode reveal, not silently fall through to the slider flow.
  const args = buildRandomViewerArgs({
    argv: ['--numeric-input'],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(args.inputMode).toBe('number')
})

test('buildRandomViewerArgs() forwards the NO_COLOR/CI accessibility heuristic to inputMode', () => {
  // `hexagram-random` on a TTY under NO_COLOR/CI must also reach number mode.
  expect(
    buildRandomViewerArgs({
      argv: [],
      isTTY: true,
      envVars: { NO_COLOR: '1', CI: undefined },
    }).inputMode,
  ).toBe('number')
  expect(
    buildRandomViewerArgs({
      argv: [],
      isTTY: true,
      envVars: { NO_COLOR: undefined, CI: 'true' },
    }).inputMode,
  ).toBe('number')
})

test('buildRandomViewerArgs() forwards the tuning-knob flags', () => {
  const args = buildRandomViewerArgs({
    argv: [
      '--numeric-input',
      '--wrap-width=64',
      '--slider-sweep-ms=5000',
      '--cast-bounce-ms=1200',
      '--cast-reveal-ms=900',
    ],
    isTTY: true,
    envVars: { NO_COLOR: undefined, CI: undefined },
  })
  expect(args).toEqual({
    flowKind: 'random',
    inputMode: 'number',
    maxWrapWidth: 64,
    sliderSweepMs: 5000,
    castBounceMs: 1200,
    castRevealMs: 900,
  })
})
