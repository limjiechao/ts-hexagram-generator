import { describe, expect, it } from 'vitest'

import { isUserExitPromptError } from '../src/prompts.js'

// `isUserExitPromptError` is the single home for "did the user Ctrl+C the
// Inquirer prompt?" — both plain-mode bins (`random`, `interactive`) map a
// true result to a clean `exit(0)`. These cases pin the shape Inquirer throws
// so the predicate can't silently widen or narrow.

describe('isUserExitPromptError', () => {
  it('recognises Inquirer’s Ctrl+C ExitPromptError', () => {
    const error = new Error('User has exited the prompt')
    error.name = 'ExitPromptError'
    expect(isUserExitPromptError(error)).toBe(true)
  })

  it('rejects an ExitPromptError with an unrelated message', () => {
    const error = new Error('something else entirely')
    error.name = 'ExitPromptError'
    expect(isUserExitPromptError(error)).toBe(false)
  })

  it('rejects an ordinary error', () => {
    expect(isUserExitPromptError(new Error('disk on fire'))).toBe(false)
  })

  it('rejects non-Error values', () => {
    // The `instanceof Error` guard short-circuits every non-Error input
    // identically, so null / string / number stand in for the whole class.
    expect(isUserExitPromptError('User has exited the prompt')).toBe(false)
    expect(isUserExitPromptError(null)).toBe(false)
    expect(isUserExitPromptError(42)).toBe(false)
  })
})
