import { Box, Text, useInput } from 'ink'
import { useEffect, useRef, type ReactElement } from 'react'

import { BOLD_RED, NORMAL } from './output-palette.js'

/**
 * One context line in a `<ConfirmModal>` body. A bare string renders plain;
 * the object form carries an optional `tone` — `dim` for de-emphasised detail
 * (e.g. a file path), `alert` for a `BOLD_RED` warning.
 */
export type ConfirmModalBodyLine =
  | string
  | { text: string; tone: 'dim' | 'alert' }

export interface ConfirmModalProps {
  /**
   * Heading line — rendered first, in `BOLD_RED` for parity with the rest of
   * the viewer-core chrome's destructive/attention framing. Domain-specific
   * wording ("Delete consultation", "Discard cast") comes from the caller.
   */
  title: string
  /**
   * Identity / context lines shown between the title and the prompt — e.g. the
   * row identity, a relative path, a permanence warning. Each entry is one
   * `<Text>` line (optionally toned — see `ConfirmModalBodyLine`); an empty
   * array renders no body. Generic by design: the caller decides what (and how
   * much) context the prompt needs.
   */
  bodyLines: ConfirmModalBodyLine[]
  /**
   * The key-hint line — e.g. `Press Y to delete · N to cancel`. Rendered dim
   * as the last line. The caller writes this to match `confirmKey`/`cancelKey`.
   */
  prompt: string
  /** Inner content width in columns (from the `ScreenShell` slot). */
  innerCols: number
  /**
   * The character that confirms — matched case-insensitively, ignored when
   * modified by Ctrl/Meta. Defaults to `y`.
   */
  confirmKey?: string
  /**
   * The character that cancels — matched case-insensitively, ignored when
   * modified by Ctrl/Meta. Escape always cancels too. Defaults to `n`.
   */
  cancelKey?: string
  /** Fired when the confirm key is pressed. */
  onConfirm: () => void
  /** Fired when the cancel key or Escape is pressed. */
  onCancel: () => void
  /**
   * Fired exactly once per mount, in a `useEffect` that runs after this
   * component's `useInput` registration has been bound to Ink's stdin
   * dispatcher. The contract is: by the time `onReady` is called, the next
   * `stdin.write(...)` will be received by this modal's `useInput` handler.
   *
   * Exists to defuse the `useInput` bind race that otherwise drops the first
   * keystroke after a modal mounts: Ink registers a `useInput` handler inside
   * its own `useEffect`, which runs *after* the render commit on the next
   * macrotask. Bytes written between commit and bind get dispatched to
   * ancestor handlers (or swallowed) instead of this modal's handler. Because
   * effects fire in declaration order, the `useEffect` powering this callback
   * is queued immediately after the `useInput` hook above and therefore runs
   * only once Ink's listener is in place — see the `ink-useinput-bind` skill
   * and `HistoryListProps.onReady` for the canonical pattern. Defaults to a
   * no-op.
   */
  onReady?: () => void
}

/**
 * Generic confirmation modal — a `borderStyle="round"`, `borderColor="red"`
 * box (matching the viewer-core chrome) holding a title, optional context
 * body lines, and a key-hint prompt.
 *
 * Unlike a purely presentational chrome component, `<ConfirmModal>` owns a
 * `useInput`: it resolves itself on a keypress (`confirmKey` → `onConfirm`,
 * `cancelKey`/Escape → `onCancel`) and ignores everything else. A host that
 * keeps its own `useInput` mounted behind the modal must early-return while
 * the modal is open so the two handlers do not both act on the same key.
 *
 * No domain assumptions are baked in — every word on screen comes from props.
 */
export function ConfirmModal({
  title,
  bodyLines,
  prompt,
  innerCols,
  confirmKey = 'y',
  cancelKey = 'n',
  onConfirm,
  onCancel,
  onReady,
}: ConfirmModalProps): ReactElement {
  useInput((input, key) => {
    // Modifier-bearing keypresses never resolve the modal — a stray Ctrl+Y
    // must not count as a confirm.
    if (key.ctrl || key.meta) return
    const pressed = input.toLowerCase()
    if (pressed === confirmKey.toLowerCase()) {
      onConfirm()
      return
    }
    if (pressed === cancelKey.toLowerCase() || key.escape) {
      onCancel()
    }
  })

  // ── onReady witness signal ────────────────────────────────────────────────
  // Fires after this component's `useInput` registration above has bound to
  // Ink's stdin dispatcher. Effects run in declaration order, so this
  // `useEffect` is queued immediately after the one Ink uses internally for
  // `useInput` — by the time `onReady` is invoked, the next `stdin.write` is
  // guaranteed to land on the handler above. Guarded by a ref so it fires
  // exactly once per mount even if `onReady` identity changes between
  // renders (a re-fire would defeat its meaning as a one-shot ready latch).
  const readyFiredRef = useRef(false)
  // `onReady` is read once on mount; subsequent identity changes do not
  // re-fire the latch. The empty dep array is intentional and is NOT a
  // missing-dep mistake — see the JSDoc on `onReady` for the contract.
  useEffect(() => {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    onReady?.()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Box
      borderStyle="round"
      borderColor="red"
      width={innerCols}
      flexShrink={0}
      flexDirection="column"
    >
      <Text>{`${BOLD_RED}${title}${NORMAL}`}</Text>
      {bodyLines.map((line, index) => {
        // A bare string is the sole spelling of a plain/default line.
        if (typeof line === 'string') {
          return <Text key={index}>{line}</Text>
        }
        if (line.tone === 'dim') {
          return (
            <Text key={index} dimColor>
              {line.text}
            </Text>
          )
        }
        return <Text key={index}>{`${BOLD_RED}${line.text}${NORMAL}`}</Text>
      })}
      <Text dimColor>{prompt}</Text>
    </Box>
  )
}
