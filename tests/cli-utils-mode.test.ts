import { expect, test } from 'vitest'

import { shouldUsePlainMode } from '../src/cli-utils-mode'

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
