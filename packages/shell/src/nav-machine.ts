// Pure navigation state machine for the composed `hexagram` CLI. Lives in its
// own module (no React, no Ink, no other workspace runtime imports) so the
// navigation rules can be unit-tested with plain action dispatch — and so the
// `<HexagramApp>` orchestrator (issue #29) stays focused on the imperative
// bits (mounting screens, wiring Ink input). This file encapsulates every
// navigation rule behind a tiny reducer interface.

// The composed app has exactly three screens; precisely one is mounted at a
// time. `hexagram` opens on Home — the hub menu — and the casting screen
// additionally carries which flow it is running.

// The casting flow comes in two kinds. This union is deliberately defined
// LOCALLY rather than imported from `@hexagram/casting-ui`: keeping this a
// leaf-pure module means no workspace runtime imports. The string values are
// kept identical to `casting-ui`'s `FlowKind` (`'interactive' | 'random'`) so
// the screen state hands straight through to the casting flow.
export type NavFlowKind = 'interactive' | 'random'

/**
 * The navigation state — a discriminated union over the three screens. Exactly
 * one screen is mounted at a time, so the whole app's navigation is one of
 * these three shapes. Only `casting` carries extra data (`flowKind`).
 */
export type NavState =
  | { screen: 'home' }
  | { screen: 'history' }
  | { screen: 'casting'; flowKind: NavFlowKind }

/**
 * The navigation events — the four things that can move between screens:
 * the three Home-menu selections, plus the soft "back" key (Esc) returning
 * to Home. Esc on Home quits the app, which is the shell's concern, not the
 * reducer's — see `backToHome` handling below.
 */
export type NavEvent =
  | { type: 'newInteractiveConsultation' }
  | { type: 'newRandomConsultation' }
  | { type: 'browseHistory' }
  | { type: 'backToHome' }

/** The app opens on the Home menu — the hub. */
export const initialNavState: NavState = { screen: 'home' }

/**
 * Pure navigation reducer. Given the current screen and an event, returns the
 * next screen. Encapsulates every navigation rule in the PRD's model:
 *
 *   - Home → casting (interactive) on "new interactive consultation"
 *   - Home → casting (random)      on "new random consultation"
 *   - Home → history               on "browse history"
 *   - history | casting → Home     on back-to-home
 *
 * Defensive design — the PRD only fires menu selections from Home and only
 * fires `backToHome` from history/casting, but a reducer must be total. Any
 * event that does not match its expected source screen is treated as a no-op
 * and the SAME state reference is returned (no churn for impossible events):
 *
 *   - `backToHome` while already on Home: no-op. (Esc-on-Home means "quit",
 *     which the imperative shell handles by not dispatching here at all.)
 *   - a menu selection off Home: no-op. (The menu only renders on Home, so
 *     these can't be fired in practice — but ignoring them keeps the reducer
 *     safe against future wiring mistakes.)
 */
export function navReducer(state: NavState, event: NavEvent): NavState {
  switch (event.type) {
    case 'newInteractiveConsultation':
      return state.screen === 'home'
        ? { screen: 'casting', flowKind: 'interactive' }
        : state
    case 'newRandomConsultation':
      return state.screen === 'home'
        ? { screen: 'casting', flowKind: 'random' }
        : state
    case 'browseHistory':
      return state.screen === 'home' ? { screen: 'history' } : state
    case 'backToHome':
      return state.screen === 'home' ? state : { screen: 'home' }
  }
}
