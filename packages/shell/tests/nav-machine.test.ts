import { describe, expect, it } from 'vitest'

import {
  initialNavState,
  navReducer,
  type NavEvent,
  type NavState,
} from '../src/nav-machine'

// Pure unit tests for the composed-app navigation reducer. No mount, no
// React/Ink — `navReducer` is exercised directly with plain state + event
// objects. Every transition in the PRD's navigation model is pinned here:
// Home → history, Home → interactive casting, Home → random casting, and
// back-to-home from each non-Home screen. The defensive branches (events
// that the PRD never fires from a given screen) are pinned too.

// ── Initial state ────────────────────────────────────────────────────────────

describe('initialNavState', () => {
  it('opens on the Home menu (the hub)', () => {
    expect(initialNavState).toEqual({ screen: 'home' })
  })
})

// ── Home → casting / history (the three menu selections) ─────────────────────

describe('navReducer — Home menu selections', () => {
  const home: NavState = { screen: 'home' }

  it('Home → interactive casting on "new interactive consultation"', () => {
    expect(navReducer(home, { type: 'newInteractiveConsultation' })).toEqual({
      screen: 'casting',
      flowKind: 'interactive',
    })
  })

  it('Home → random casting on "new random consultation"', () => {
    expect(navReducer(home, { type: 'newRandomConsultation' })).toEqual({
      screen: 'casting',
      flowKind: 'random',
    })
  })

  it('Home → history on "browse history"', () => {
    expect(navReducer(home, { type: 'browseHistory' })).toEqual({
      screen: 'history',
    })
  })
})

// ── Back-to-home from each non-Home screen ───────────────────────────────────

describe('navReducer — back-to-home', () => {
  it('history → Home on back-to-home', () => {
    const history: NavState = { screen: 'history' }
    expect(navReducer(history, { type: 'backToHome' })).toEqual({
      screen: 'home',
    })
  })

  it('interactive casting → Home on back-to-home', () => {
    const casting: NavState = { screen: 'casting', flowKind: 'interactive' }
    expect(navReducer(casting, { type: 'backToHome' })).toEqual({
      screen: 'home',
    })
  })

  it('random casting → Home on back-to-home', () => {
    const casting: NavState = { screen: 'casting', flowKind: 'random' }
    expect(navReducer(casting, { type: 'backToHome' })).toEqual({
      screen: 'home',
    })
  })
})

// ── Defensive branches — events the PRD never fires from a given screen ──────

describe('navReducer — impossible events are ignored', () => {
  it('back-to-home on Home is a no-op (Esc-on-Home quits, handled by the shell)', () => {
    const home: NavState = { screen: 'home' }
    const next = navReducer(home, { type: 'backToHome' })
    expect(next).toEqual({ screen: 'home' })
    // Same reference — no churn for a no-op transition.
    expect(next).toBe(home)
  })

  it('menu selections off Home are ignored (menu only renders on Home)', () => {
    const history: NavState = { screen: 'history' }
    const casting: NavState = { screen: 'casting', flowKind: 'interactive' }
    const events: NavEvent[] = [
      { type: 'newInteractiveConsultation' },
      { type: 'newRandomConsultation' },
      { type: 'browseHistory' },
    ]
    for (const event of events) {
      expect(navReducer(history, event)).toBe(history)
      expect(navReducer(casting, event)).toBe(casting)
    }
  })
})

// ── Purity ───────────────────────────────────────────────────────────────────

describe('navReducer — purity', () => {
  it('never mutates the input state', () => {
    const home: NavState = { screen: 'home' }
    const frozen = Object.freeze({ ...home })
    expect(() =>
      navReducer(frozen, { type: 'newRandomConsultation' }),
    ).not.toThrow()
    expect(frozen).toEqual({ screen: 'home' })
  })
})
