import { BOLD_RED, NORMAL } from '@hexagram/viewer-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

interface DeleteConfirmModalProps {
  /**
   * Human-readable identity of the row being deleted —
   * `[YYYY-MM-DD HH:mm] <query>` (truncated) for a readable entry, or
   * `[unreadable — <reason>]` for an unreadable row.
   */
  displayIdentity: string
  /** Path relative to cwd — the value `fs.unlink` receives. */
  relativePath: string
  /** Inner content width in columns (from the `ScreenShell` slot). */
  innerCols: number
}

/**
 * The destructive-delete confirm modal — a `borderStyle="round"`,
 * `borderColor="red"` box rendered in the `ScreenShell` `belowContent`
 * slot (between the list and the footer) while `HistoryList`'s
 * `confirmingDelete` reducer mode is active.
 *
 * Identifying-only: it shows the row identity, the relative file path that
 * `fs.unlink` receives, a permanence warning, and the Y/N key prompt. It owns
 * no `useInput` — all key handling stays in `HistoryList`'s single `useInput`
 * so the modal can freeze list nav/filter without a competing handler.
 */
export function DeleteConfirmModal({
  displayIdentity,
  relativePath,
  innerCols,
}: DeleteConfirmModalProps): ReactElement {
  return (
    <Box
      borderStyle="round"
      borderColor="red"
      width={innerCols}
      flexShrink={0}
      flexDirection="column"
    >
      <Text>{`${BOLD_RED}Delete consultation${NORMAL}`}</Text>
      <Text>{displayIdentity}</Text>
      <Text dimColor>{relativePath}</Text>
      <Text>
        {`${BOLD_RED}This permanently deletes the file — it cannot be undone.${NORMAL}`}
      </Text>
      <Text dimColor>Press Y to delete · N to cancel</Text>
    </Box>
  )
}
