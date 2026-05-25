// @hexagram/playground-ui — terminal UI for the Yijing hexagram oracle's
// Hexagram Playground: an Ink-based interactive explorer where each line
// cycles through 4 states (6/7/8/9), with a live emerging-hexagram preview
// and save-as-consultation.

// The root Ink component — owns the reducer, the keymap, and the layout.
export { PlaygroundApp } from './playground-app.js'

// Data-driven keymap — exported for keymap unit tests.
export {
  dispatchPlaygroundKey,
  NOT_SAVING,
  PLAYGROUND_BINDINGS,
  toKeymapSlice,
  type PlaygroundKeyBinding,
  type PlaygroundKeyContext,
  type PlaygroundStateSlice,
} from './playground-keymap.js'

// Pure line helpers — exported so other tools (an alternative CLI, a web
// adapter) can drive the same cycle/flip/derivation logic.
export {
  buildPlaygroundDerivation,
  cycleLineBackward,
  cycleLineForward,
  flipPolarity,
  INITIAL_HEXAGRAM,
  movingLineIndices,
  setLineAt,
  type PlaygroundDerivation,
} from './playground-lines.js'

// Pure state machine — exported so tests and the `<HexagramApp>` host can
// observe state transitions without mounting Ink.
export {
  initialPlaygroundState,
  isTypingRunOpen,
  playgroundReducer,
  type PlaygroundAction,
  type PlaygroundMode,
  type PlaygroundState,
} from './playground-state.js'

// The run entry — TTY guard + single alternate-screen `render()`. The
// `hexagram-playground` bin is a thin wrapper over this.
export { runPlaygroundApp } from './run-playground-app.js'
