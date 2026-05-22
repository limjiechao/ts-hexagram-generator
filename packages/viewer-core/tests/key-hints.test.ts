import { describe, expect, it } from 'vitest'

import { keyHintsForCasting } from '../src/viewer-chrome.js'

// `keyHintsForCasting` builds the footer key-hint string for the casting
// phase. The slider's load-bearing key differs by flow: the interactive
// flow's SPACE parts the stalks; the random flow's SPACE skips the rest of
// the casting animation.

describe('keyHintsForCasting', () => {
  it('advertises SPACE: part for the interactive slider flow', () => {
    const hint = keyHintsForCasting('slider', 'quit', 'interactive')
    expect(hint).toContain('SPACE: part')
    expect(hint).not.toContain('skip')
  })

  it('advertises SPACE: skip for the random slider flow', () => {
    const hint = keyHintsForCasting('slider', 'quit', 'random')
    expect(hint).toContain('SPACE: skip')
    expect(hint).not.toContain('SPACE: part')
  })

  it('defaults to the interactive flow when no flowKind is given', () => {
    expect(keyHintsForCasting('slider')).toContain('SPACE: part')
  })

  it('number mode advertises Enter: commit for the interactive flow', () => {
    const hint = keyHintsForCasting('number', 'quit', 'interactive')
    expect(hint).toContain('Enter: commit')
    expect(hint).not.toContain('skip')
  })

  it('number mode advertises SPACE: skip for the random flow', () => {
    // The random number-mode reveal is timer-driven — there is nothing to
    // commit, SPACE skips the rest of the reveal.
    const hint = keyHintsForCasting('number', 'quit', 'random')
    expect(hint).toContain('SPACE: skip')
    expect(hint).not.toContain('Enter: commit')
  })

  it('number mode defaults to Enter: commit when no flowKind is given', () => {
    expect(keyHintsForCasting('number')).toContain('Enter: commit')
  })

  it('keeps the exit hints (Esc + Ctrl+C) for every flow', () => {
    const hint = keyHintsForCasting('slider', 'home', 'random')
    expect(hint).toContain('Esc: home')
    expect(hint).toContain('Ctrl+C: quit')
  })
})
