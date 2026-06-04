import {
  computeWrapWidth,
  truncateEnd,
  truncateStart,
} from '@hexagram/viewer-core'
import { describe, expect, it } from 'vitest'

describe('computeWrapWidth', () => {
  it('caps wrapping at maxWrapWidth on a wide terminal', () => {
    expect(computeWrapWidth(200, 120, 483)).toBe(120)
  })

  it('wraps to the terminal width when it is below the cap', () => {
    expect(computeWrapWidth(110, 120, 483)).toBe(110)
  })

  it('never wraps below the structural floor', () => {
    expect(computeWrapWidth(90, 120, 483)).toBe(100)
    expect(computeWrapWidth(40, 120, 483)).toBe(100)
    // A user cap below the floor is clamped up so diagrams stay intact.
    expect(computeWrapWidth(200, 80, 483)).toBe(100)
  })

  it('lets a large cap widen wrapping', () => {
    expect(computeWrapWidth(200, 500, 483)).toBe(200)
  })

  it('does not floor higher than the section actually needs', () => {
    // Transformation tab: intrinsic width ~92, below the 100 floor constant.
    expect(computeWrapWidth(200, 120, 92)).toBe(120)
    expect(computeWrapWidth(40, 120, 92)).toBe(92)
  })
})

describe('truncateEnd', () => {
  it('returns the text unchanged when it fits', () => {
    expect(truncateEnd('hello', 10)).toBe('hello')
  })

  it('truncates with a trailing ellipsis when too long', () => {
    expect(truncateEnd('hello world', 8)).toBe('hello w…')
  })

  it('returns an empty string for a non-positive width', () => {
    expect(truncateEnd('hello', 0)).toBe('')
  })
})

describe('truncateStart', () => {
  it('returns the text unchanged when it fits', () => {
    expect(truncateStart('/a/b/file.txt', 20)).toBe('/a/b/file.txt')
  })

  it('keeps the tail with a leading ellipsis when too long', () => {
    expect(truncateStart('/very/long/path/file.txt', 10)).toBe('…/file.txt')
  })
})
