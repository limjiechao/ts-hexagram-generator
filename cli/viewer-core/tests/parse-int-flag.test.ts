import { describe, expect, it } from 'vitest'

import { parseIntFlag } from '../src/parse-int-flag.js'

describe('parseIntFlag', () => {
  it('reads `--flag <n>` (space form)', () => {
    expect(parseIntFlag(['--flag', '42'], '--flag', 7)).toBe(42)
  })
  it('reads `--flag=<n>` (equals form)', () => {
    expect(parseIntFlag(['--flag=42'], '--flag', 7)).toBe(42)
  })
  it('falls back when absent', () => {
    expect(parseIntFlag(['--other', '1'], '--flag', 7)).toBe(7)
  })
  it('rejects non-positive-integer values, returning the fallback', () => {
    expect(parseIntFlag(['--flag', '0'], '--flag', 7)).toBe(7)
    expect(parseIntFlag(['--flag', '-3'], '--flag', 7)).toBe(7)
    expect(parseIntFlag(['--flag', 'x'], '--flag', 7)).toBe(7)
  })
  it('returns the first valid occurrence', () => {
    expect(parseIntFlag(['--flag', '5', '--flag', '9'], '--flag', 7)).toBe(5)
  })
})
