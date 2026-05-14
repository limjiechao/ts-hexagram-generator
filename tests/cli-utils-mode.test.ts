import { expect, test } from 'vitest'

import { parseWrapWidth, shouldUsePlainMode } from '../src/cli-utils-mode'

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
