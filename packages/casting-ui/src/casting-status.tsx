import { isGlobalExitKey } from '@hexagram/viewer-core'
import { Box, Text, useInput } from 'ink'
import { useEffect, useRef, type ReactElement } from 'react'

/**
 * Rendered height of `<CastingStatus>`, border included. Colocated with the
 * component because the viewer reserves vertical space for the above-footer
 * slot before mounting it — keeping the contract here means the status widget
 * can't drift the reserved space out of sync with what it actually renders.
 *
 *   2 border rows + header row + progress row + skip-hint row = 5.
 */
export function getCastingStatusHeight(): number {
  return 5
}

interface CastingStatusProps {
  lineNumber: 1 | 2 | 3 | 4 | 5 | 6
  castIndex: 0 | 1 | 2
  width: number
  /**
   * Whether the widget's SPACE-to-skip `useInput` is live. The viewer passes
   * `false` while the discard-confirm modal is open so the modal owns the
   * keyboard — SPACE must not skip the playback from behind the modal.
   */
  active: boolean
  /**
   * Skip callback — SPACE abandons the rest of the text reveal. The viewer
   * wires this to a `playbackSkipped` dispatch, exactly as the slider flow
   * routes its own SPACE.
   */
  onSkip: () => void
  /**
   * Witness signal — fired once per `active: false → true` transition from
   * inside the same `useEffect` that binds `useInput`. Lets the viewer (and
   * tests) gate cross-state keystrokes on the input handler being live,
   * sidestepping Ink's bind race where `useInput` registers on the macrotask
   * after commit and bytes written in between are silently dropped.
   */
  onReady?: () => void
}

/**
 * The plain-text casting-status widget shown in the above-footer slot during
 * the random flow in number-input mode — the accessibility / non-colour
 * fallback where the bouncing slider is unavailable. It replaces the typed
 * `<NumberInput>` prompt: the random flow takes no casting input, a per-cast
 * timer in the viewer drives the eighteen `splitCommitted`s, and this widget
 * only narrates progress.
 *
 * It renders three rows inside a bordered box — a dim "Casting in progress"
 * header, the line/cast progress, and the SPACE-to-skip hint — and owns its
 * own `useInput` so SPACE can skip the reveal (the slider mode catches SPACE
 * inside `useSliderBounce`; the number widget has no such hook). Global exit
 * keys (Esc / Ctrl+C) are left for the viewer's keymap. The interactive
 * number flow keeps its typed `<NumberInput>` prompt and never mounts this.
 */
export function CastingStatus({
  lineNumber,
  castIndex,
  width,
  active,
  onSkip,
  onReady,
}: CastingStatusProps): ReactElement {
  // Latest-`onSkip` ref so the `useInput` handler always calls the current
  // callback without `useInput` re-subscribing when the parent hands a fresh
  // closure — mirrors the `onSkipRef` pattern in `useSliderBounce`.
  const onSkipRef = useRef(onSkip)
  useEffect(() => {
    onSkipRef.current = onSkip
  })

  // Latest-`onReady` ref so the fire-once effect below never has to depend on
  // (and re-run for) a fresh closure from the parent.
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  })

  useInput(
    (input, key) => {
      // Global exit keys (Ctrl+C / Esc) stay with the viewer's keymap.
      if (isGlobalExitKey(input, key)) return
      if (input === ' ') onSkipRef.current()
    },
    { isActive: active },
  )

  // Witness the `active: false → true` transition from inside a `useEffect`
  // — which runs on the same post-commit macrotask phase as Ink's internal
  // `useInput` listener registration. Firing here is positive proof that the
  // keyboard handler is bound: callers (viewer, tests) can gate the next
  // SPACE on `onReady` and dodge the bind-race window where bytes written
  // between commit and bind would be silently dropped.
  const wasActiveRef = useRef(false)
  useEffect(() => {
    if (active && !wasActiveRef.current) {
      wasActiveRef.current = true
      onReadyRef.current?.()
    } else if (!active && wasActiveRef.current) {
      wasActiveRef.current = false
    }
  }, [active])

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      width={width}
      flexShrink={0}
      flexDirection="column"
    >
      <Text dimColor>Casting in progress</Text>
      <Text>{`Casting · Line ${lineNumber}/6 · Cast ${castIndex + 1}/3 — parting the stalks`}</Text>
      <Text dimColor>Press SPACE to skip the reveal.</Text>
    </Box>
  )
}
