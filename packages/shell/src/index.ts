// @hexagram/shell — the composed `hexagram` CLI: a Home hub that mounts one of
// three screens (Home menu, history browser, casting flow). This file is the
// package's explicit public API entry.

// The root component — holds the navigation state and mounts exactly one of
// the three screens.
export { HexagramApp, type CastingFlags } from './hexagram-app.js'

// The Home hub screen — the app-level menu. Exposed so it can be exercised in
// isolation; `<HexagramApp>` mounts it for the `home` screen.
export { HomeMenu, type HomeMenuSelection } from './home-menu.js'

// Pure navigation state machine — the reducer, its state/event types, and the
// initial (Home) state. No React/Ink; safe to import from anywhere.
export {
  initialNavState,
  navReducer,
  type NavEvent,
  type NavFlowKind,
  type NavState,
} from './nav-machine.js'

// The run entry — TTY guard + single alternate-screen `render()`. The
// `hexagram` bin (issue #30) is a thin wrapper over this.
export { runHexagram } from './run-hexagram.js'
