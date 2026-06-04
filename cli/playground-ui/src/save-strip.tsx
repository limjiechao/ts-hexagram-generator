// `<SaveStrip>` — the bottom-strip query-prompt editor that opens on `S`.
// Mounts only while `state.mode === 'saving'`; while mounted, it owns
// `useInput` for the single-line query buffer. Enter calls `onSubmit(query)`
// when the buffer is non-empty; ESC calls `onCancel`. Ctrl/Meta-modified
// keys pass through to the host via the `isGlobalExitKey` early-return —
// matches `<QueryEditor>`'s authoritative-gate pattern.

import {
  BOLD_GREY,
  BOLD_WHITE,
  Cursor,
  isGlobalExitKey,
  NORMAL,
  QUERY_ACCENT_BAR_PREFIX,
} from '@hexagram/viewer-core'
import { Box, Text, useInput } from 'ink'
import { useEffect, useRef, useState, type ReactElement } from 'react'

/**
 * Total visual rows occupied by a mounted `<SaveStrip>`:
 *   - round border (top + bottom): 2
 *   - title row: 1
 *   - three `marginTop={1}` blank rows: 3
 *   - three text rows (Enter query: + query line + ⏎ save · ESC cancel): 3
 * = 9
 *
 * Exported so `<PlaygroundApp>`'s viewport math can account for the strip
 * without re-measuring at runtime.
 */
export const SAVE_STRIP_ROWS = 9

interface SaveStripProps {
  /** Inner content width in columns (from the `<ScreenShell>` slot). */
  readonly innerCols: number
  /** Fired when the user presses Enter on a non-empty query. */
  readonly onSubmit: (query: string) => void
  /** Fired when the user presses ESC. */
  readonly onCancel: () => void
  /**
   * Fired exactly once per mount, after the editor's `useInput` has bound
   * to Ink's stdin dispatcher. Mirrors the `onReady` witness pattern used
   * across the codebase.
   */
  readonly onReady?: () => void
}

/**
 * Bordered bottom-strip editor matching the visual idiom of
 * `<CastingPromptBox>`. The query buffer is local — committed (or discarded)
 * atomically; the playground reducer never sees in-flight keystrokes.
 */
export function SaveStrip({
  innerCols,
  onSubmit,
  onCancel,
  onReady,
}: SaveStripProps): ReactElement {
  const [query, setQuery] = useState('')

  useInput((input, key) => {
    // Authoritative gate: Esc and any Ctrl/Meta combo route to the host so
    // the global cancel (Esc → close) and hard quit (Ctrl+C) always reach
    // their intended handlers. Esc is dispatched here through `onCancel`
    // because the playground's parent suppresses its own `useInput` while
    // `<SaveStrip>` is mounted — the host can't see Esc otherwise.
    if (isGlobalExitKey(input, key)) {
      if (key.escape) onCancel()
      return
    }
    if (key.return) {
      const trimmed = query.trim()
      if (trimmed.length > 0) onSubmit(trimmed)
      return
    }
    if (key.backspace || key.delete) {
      setQuery((current) =>
        current.length > 0 ? current.slice(0, -1) : current,
      )
      return
    }
    // Printable input only — the `\p{Cc}` (Control) class rejects escape,
    // Ctrl-C, arrow-key escapes, etc.
    if (input.length > 0 && !/\p{Cc}/u.test(input)) {
      setQuery((current) => current + input)
    }
  })

  // ── onReady witness signal ────────────────────────────────────────────────
  // Mirrors `<QueryEditor>`, `<ConfirmModal>`, `<HomeMenu>`. Fires once
  // after `useInput` binds so tests can gate the next keystroke.
  const readyFiredRef = useRef(false)
  useEffect(() => {
    if (readyFiredRef.current) return
    readyFiredRef.current = true
    onReady?.()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      flexShrink={0}
      width={innerCols}
    >
      <Text>{`${BOLD_GREY}Save consultation${NORMAL}`}</Text>
      <Box marginTop={1}>
        <Text>{'Enter query:'}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          <Text dimColor>{QUERY_ACCENT_BAR_PREFIX}</Text>
          {query.length === 0 ? (
            <Text dimColor>{'What would you like to ask?'}</Text>
          ) : (
            <Text>{`${BOLD_WHITE}${query}${NORMAL}`}</Text>
          )}
          <Cursor />
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{'⏎ save · ESC cancel'}</Text>
      </Box>
    </Box>
  )
}
