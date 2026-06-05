// @hexagram/viewer-core — generic terminal-UI building blocks shared by the
// consultation viewer flows. Chrome (TabBar / FooterBar / QueryBox /
// scrolling), layout maths, the data-driven keymap, the ANSI palette, and the
// shared line-glyph / validator primitives. The Consultation Readout itself —
// the tabbed readout component and the per-section string builders — lives in
// @hexagram/readout, which depends on this package for its chrome.

// Pure render derivation for an animated hexagram line — the glyph + role
// vocabulary shared by the home banner, the casting readout, and the hexagram
// playground.
export {
  deriveBannerLine,
  lineColors,
  type LineCells,
  type LinePolarity,
  type LineRole,
} from './banner-lines.js'

// Generic confirmation modal — title + context + Y/N keypress affordances,
// framed in the viewer-core chrome. Owns its own input handling.
export {
  ConfirmModal,
  type ConfirmModalBodyLine,
  type ConfirmModalProps,
} from './confirm-modal.js'

// Editor primitives shared by every in-Ink single-line text editor.
export { Cursor, isGlobalExitKey } from './editor-primitives.js'

// Environment policy — the single reading of TTY / NO_COLOR / CI that both the
// interactive gate and the force-numeric heuristic derive from.
export {
  classifyEnv,
  refuseIfNonInteractive,
  type EnvPolicy,
  type EnvSnapshot,
} from './env-policy.js'

// Generic full-screen scrollable help overlay — title + windowed body + footer
// hint, framed in the viewer-core chrome. Owns its own input handling.
export { HelpOverlay, type HelpOverlayProps } from './help-overlay.js'

// ANSI palette constants used by the formatted output.
export {
  BOLD_CYAN,
  BOLD_GREEN,
  BOLD_GREY,
  BOLD_RED,
  BOLD_WHITE,
  DEFAULT_FG,
  DIM_RED,
  HEADING_GREY,
  MUTED_GREY,
  NORMAL,
  NORMAL_GREY,
  PLACEHOLDER_GREY,
  VALUE_WHITE,
  WHITE,
  YELLOW,
} from './output-palette.js'

// TTY-and-environment guard shared by every Ink-only bin's run entry.
export { isInteractiveEnv } from './run-utils.js'

// Generic screen frame shared by the Readout and the History list.
export {
  computeInnerCols,
  ScreenShell,
  type ScreenShellProps,
} from './screen-shell.js'

// Pure validators / type guards shared by the renderers.
export {
  assertLine1ToLine6,
  isLine1ToLine6,
  isLineIndex,
} from './utils-validators.js'

// Viewer chrome — TabBar / FooterBar / QueryBox / scrolling primitives.
export {
  FooterBar,
  KEY_HINTS_FLOW_DEFAULT,
  KEY_HINTS_TEMPLATE,
  keyHintsFlowDefault,
  keyHintsForCasting,
  QUERY_ACCENT_BAR_PREFIX,
  QUERY_ACCENT_PREFIX_WIDTH,
  QueryBox,
  ScrollableSection,
  ScrollbarTrack,
  TabBar,
  type CastingFlowKind,
  type NonEmpty,
  type TabDescriptor,
  type TabId,
} from './viewer-chrome.js'

// Data-driven viewer keymap.
export {
  ALWAYS,
  BINDINGS,
  CAN_SCROLL,
  dispatchKey,
  IN_CASTING_SLIDER,
  IN_DONE,
  type FlowMode,
  type FlowStateSlice,
  type InputMode,
  type KeyBinding,
  type KeyContext,
} from './viewer-keymap.js'

// Layout maths — scroll / wrap / clamp helpers, height constants, progress bar.
export {
  ANSI_PATTERN,
  clamp,
  computeWrapWidth,
  ELLIPSIS,
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
  MARGIN_CONTENT_TO_NEXT,
  MARGIN_HEADER_TO_QUERY,
  MARGIN_QUERY_TO_TABS,
  MIN_CONTENT_WIDTH,
  padEndToWidth,
  QUERY_BORDER_HEIGHT,
  renderProgressBar,
  stripAnsi,
  TAB_BAR_HEIGHT,
  truncateEnd,
  truncateStart,
  wrapToWidth,
} from './viewer-layout.js'
