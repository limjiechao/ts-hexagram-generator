import { expect, test } from 'vitest'

import {
  parseCliFlags,
  parseWrapWidth,
  shouldForceNumericForAccessibility,
  shouldUseNumericInput,
  shouldUsePlainMode,
} from '../src/cli-utils-mode'

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
