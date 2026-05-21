// @hexagram/app — the composed `hexagram` CLI: a Home hub that mounts one of
// three screens (Home menu, history browser, casting flow). This file is the
// package's explicit public API entry.

// Pure navigation state machine — the reducer, its state/event types, and the
// initial (Home) state. No React/Ink; safe to import from anywhere.
export {
  initialNavState,
  navReducer,
  type NavEvent,
  type NavFlowKind,
  type NavState,
} from './nav-machine.js'
