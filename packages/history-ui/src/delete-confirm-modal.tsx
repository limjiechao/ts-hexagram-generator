import { ConfirmModal } from '@hexagram/viewer-core'
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
  /** Fired when the user presses Y — the host runs `fs.unlink`. */
  onConfirm: () => void
  /** Fired when the user presses N or Esc — the host closes the modal. */
  onCancel: () => void
}

/**
 * The destructive-delete confirm modal — a thin history-specific wrapper over
 * the generic `<ConfirmModal>`. It supplies the delete-flavoured copy (heading,
 * permanence warning, Y/N prompt) and the per-row context lines (the row
 * identity and the relative file path that `fs.unlink` receives); the modal
 * box chrome and the Y/N/Esc key handling come from `<ConfirmModal>`.
 *
 * Observable behaviour is unchanged from the previous bespoke modal: Y deletes,
 * N or Esc cancels, and the same identity / path / warning lines render.
 */
export function DeleteConfirmModal({
  displayIdentity,
  relativePath,
  innerCols,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps): ReactElement {
  return (
    <ConfirmModal
      title="Delete consultation"
      bodyLines={[
        displayIdentity,
        { text: relativePath, tone: 'dim' },
        {
          text: 'This permanently deletes the file — it cannot be undone.',
          tone: 'alert',
        },
      ]}
      prompt="Press Y to delete · N to cancel"
      innerCols={innerCols}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
