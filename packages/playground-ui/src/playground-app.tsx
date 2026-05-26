// `<PlaygroundApp>` — the Playground orchestrator. Imperative shell
// over the pure `playgroundReducer` (state) and `dispatchPlaygroundKey`
// (input dispatch), plus the isolated `usePulse` hook (display-only timer).
//
// Layout (matches the locked P7 prototype):
//
//   ScreenShell                                  (title: "Playground")
//     ↳ aboveContent — optional saved-path / error notice
//     ↳ contentSlot
//         ↳ <HexagramDisplay> — standing + emerging trigram cards
//         ↳ <JudgmentStrip>   — only when exactly 1 line is moving
//     ↳ belowContent
//         ↳ <SaveStrip>       — only when state.mode === 'saving'
//     ↳ footerSlot
//         ↳ key hints line · saved-path / error line
//
// Save behavior:
//   - S → dispatch 'beginSave' → <SaveStrip> opens → on submit, fire the
//     async save and dispatch 'saveSucceeded' or 'saveFailed' from its
//     resolution.
//   - The reducer never sees the in-flight save promise; the side effect
//     lives in this component's `handleSaveSubmit` closure.

import path from 'node:path'
import process from 'node:process'

import { saveConsultationFile } from '@hexagram/consultation-file'
import {
  BOLD_GREY,
  computeInnerCols,
  NORMAL,
  ScreenShell,
} from '@hexagram/viewer-core'
import { Box, Text, useApp, useInput, useWindowSize } from 'ink'
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type ReactElement,
} from 'react'

import { HexagramDisplay } from './hexagram-display.js'
import { JudgmentStrip } from './judgment-strip.js'
import { dispatchPlaygroundKey, toKeymapSlice } from './playground-keymap.js'
import { buildPlaygroundDerivation } from './playground-lines.js'
import {
  initialPlaygroundState,
  playgroundReducer,
} from './playground-state.js'
import { SaveStrip } from './save-strip.js'
import { usePulse } from './use-pulse.js'

interface PlaygroundAppProps {
  /**
   * Invoked when the user presses Escape with no typing run open. Defaults
   * to `useApp().exit` so the standalone bin quits; the composed CLI
   * passes its `backToHome` handler so Esc returns to the home menu.
   */
  readonly onExit?: () => void
  /**
   * Verb shown after `ESC` in the footer key hints — names the real
   * destination of the top-level Escape exit. Defaults to `'quit'`
   * (standalone behaviour); a host that supplies `onExit` should also
   * pass a matching label (e.g. `'Home'`).
   */
  readonly exitLabel?: string
  /**
   * Directory under which `consultation-<timestamp>.md` is written. Defaults
   * to `<cwd>/consultations`. Tests inject a tmpdir so they don't litter
   * the workspace.
   */
  readonly saveDir?: string
  /**
   * Pulse cadence in milliseconds. Defaults to 540 ms (≈ 5 × the banner's
   * 108 ms tick, matching the home banner's settled-half rhythm without
   * the per-tick churn of a 108 ms beat in the playground's bigger
   * subtree). Tests pass `0` to freeze the pulse and lock frames.
   */
  readonly pulseIntervalMs?: number
  /**
   * Fires exactly once per mount, after this component's `useInput` has
   * bound to Ink's stdin dispatcher. Same contract as `<HomeMenu>`,
   * `<HistoryList>`, `<QueryEditor>`, etc.: a test that writes the first
   * keystroke right after mount must gate on this signal to dodge the
   * bind-race window.
   */
  readonly onReady?: () => void
}

const DEFAULT_PULSE_INTERVAL_MS = 540

/** ASCII formatter for the save-status line in the footer. */
function describeSaveLine(
  savedPath: string | null,
  saveError: string | null,
): string {
  if (saveError !== null) return `✗ Save failed: ${saveError}`
  if (savedPath !== null) return `✓ Saved to ${savedPath}`
  return ''
}

export function PlaygroundApp({
  onExit,
  exitLabel,
  saveDir,
  pulseIntervalMs = DEFAULT_PULSE_INTERVAL_MS,
  onReady,
}: PlaygroundAppProps): ReactElement {
  const { exit } = useApp()
  const handleExit = onExit ?? exit
  const effectiveExitLabel = exitLabel ?? 'quit'
  const { columns, rows } = useWindowSize()
  const cols = columns || 80
  const termRows = rows || 24
  const innerCols = computeInnerCols(cols)

  const [state, dispatch] = useReducer(
    playgroundReducer,
    undefined,
    initialPlaygroundState,
  )

  const pulseOn = usePulse(pulseIntervalMs)
  const derivation = buildPlaygroundDerivation(state.lines)

  useInput((input, key) => {
    // The save editor owns input — let it handle everything.
    if (state.mode === 'saving') return
    // Ctrl+C is the hard quit from every screen — never routed through the
    // injected `onExit` (which the composed host uses for soft-back-to-home).
    if (key.ctrl && input === 'c') {
      exit()
      return
    }
    // `state` is closed over by Ink's re-registered handler on each render,
    // so `toKeymapSlice(state)` always reflects the latest reducer output.
    dispatchPlaygroundKey(input, key, {
      state: toKeymapSlice(state),
      dispatch,
      exit: handleExit,
    })
  })

  // ── onReady witness signal ────────────────────────────────────────────────
  // Fires after this component's `useInput` registration above has bound to
  // Ink's stdin dispatcher. Same pattern as `<HomeMenu>`,
  // `<HistoryList>`, `<QueryEditor>`. Guarded by a ref so it fires exactly
  // once per mount even if `onReady` identity changes between renders.
  const readyFiredRef = useRef(false)
  useEffect(() => {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    onReady?.()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveSubmit = useCallback(
    (query: string) => {
      const params: Parameters<typeof saveConsultationFile>[0] = {
        query,
        hexagram: state.lines,
        casting: null,
      }
      if (saveDir !== undefined) params.dir = saveDir
      saveConsultationFile(params)
        .then((filePath) => {
          const relative = path.relative(process.cwd(), filePath)
          dispatch({ type: 'saveSucceeded', relativePath: relative })
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error)
          dispatch({ type: 'saveFailed', message })
        })
    },
    [state.lines, saveDir],
  )

  const handleSaveCancel = useCallback(() => {
    dispatch({ type: 'cancelSave' })
  }, [])

  const contentSlot = (
    <Box flexDirection="column">
      <HexagramDisplay
        standing={derivation.standing}
        emerging={derivation.emerging}
        hasMoving={derivation.hasMoving}
        focusIndex={state.focusIndex}
        pulse={pulseOn}
      />
      {derivation.singleMovingIndex !== null && (
        <JudgmentStrip
          standing={derivation.standing}
          movingLineIndex={
            derivation.singleMovingIndex as 0 | 1 | 2 | 3 | 4 | 5
          }
        />
      )}
    </Box>
  )

  const belowContent =
    state.mode === 'saving' ? (
      <SaveStrip
        innerCols={innerCols}
        onSubmit={handleSaveSubmit}
        onCancel={handleSaveCancel}
      />
    ) : null

  const saveLine = describeSaveLine(state.savedPath, state.saveError)
  const keyHints = ` ↑↓ focus · SPACE flip · ←/→ cycle · 6/7/8/9 type · Del undo · r reset · S save · ESC ${effectiveExitLabel}`
  const footer = (
    <Box flexDirection="column" flexShrink={0}>
      <Text dimColor>{keyHints}</Text>
      <Text>{`${BOLD_GREY}${saveLine}${NORMAL}`}</Text>
    </Box>
  )

  return (
    <ScreenShell
      cols={cols}
      rows={termRows}
      title="Playground"
      aboveContent={null}
      contentSlot={contentSlot}
      scrollbarSlot={null}
      belowContent={belowContent}
      footerSlot={footer}
    />
  )
}
