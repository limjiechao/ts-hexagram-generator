// Pure predicate over the casting flow state — true while there is unsaved
// cast progress. Used by `<ConsultationViewer>` to gate the discard confirm.
export { hasUnsavedCastProgress } from './has-unsaved-cast-progress.js'

// Inquirer-driven interactive flow (plain mode and library use).
export { getHexagramViaInteraction } from './interactive-flow.js'

// Plain-mode print + .md save shim.
export { logAndSaveConsultationOutput } from './log-and-save.js'

// Output composers — assemble per-tab strings for the viewer or the plain
// console renderer. The pure section builders + `ConsultationSections` live
// in `@hexagram/readout`; `consultationConsoleOutput` is the plain-mode
// save composer kept local to this package.
export { consultationConsoleOutput } from './output-composers.js'

// Inquirer prompt for the user's consultation query.
export { getUserQuery } from './prompts.js'

// CLI flag resolution (output mode, input mode, wrap width, slider sweep ms,
// cast bounce ms, cast reveal ms, manual reveal ms).
export {
  DEFAULT_CAST_BOUNCE_MS,
  DEFAULT_CAST_REVEAL_MS,
  DEFAULT_MANUAL_REVEAL_MS,
  DEFAULT_MAX_WRAP_WIDTH,
  DEFAULT_SLIDER_SWEEP_MS,
  resolveCastBounceMs,
  resolveCastRevealMs,
  resolveInputMode,
  resolveManualRevealMs,
  resolveOutputMode,
  resolveRandomViewerArgs,
  resolveSliderSweepMs,
  resolveWrapWidth,
  type InputMode,
  type OutputMode,
  type RandomViewerArgs,
} from './utils-mode.js'

// Ink viewer — the casting-flow component (`<ConsultationViewer>`) and the
// standalone full-screen entry (`runConsultationViewer`). The composed CLI
// (`@hexagram/shell`) mounts the COMPONENT inside its own `render()`; the
// standalone casting bins call the entry, which owns its own `render()`.
export {
  ConsultationViewer,
  runConsultationViewer,
  runManualConsultationViewer,
  type FlowKind,
} from './viewer.js'
