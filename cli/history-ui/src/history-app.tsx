import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  markdownConsultationBody,
  serializeFrontmatter,
  type ConsultationEnvelope,
} from '@hexagram/consultation-file'
import {
  buildConsultationSections,
  ConsultationReadout,
} from '@hexagram/readout'
import { QueryBox } from '@hexagram/viewer-core'
import { Box, Text, useApp, useInput, useWindowSize } from 'ink'
import { useEffect, useState, type ReactElement } from 'react'

import { HistoryList } from './history-list.js'
import { scanConsultations, type HistoryEntry } from './history-scan.js'

export async function rerenderOnDisk(
  filePath: string,
  envelope: ConsultationEnvelope,
): Promise<{ rewrote: boolean; body: string }> {
  const body = markdownConsultationBody(
    envelope.query,
    envelope.hexagram,
    envelope.casting,
    // Thread the absence reason so the self-healed body matches the save path
    // (file.ts passes it too). Omitting it downgrades a null-casting body to a
    // bare "Casting not recorded." while the footer claims "data unchanged."
    envelope.castingAbsence,
  )
  const desired = serializeFrontmatter(envelope, body)
  const current = await fs.readFile(filePath, 'utf8')
  if (current === desired) return { rewrote: false, body }
  await fs.writeFile(filePath, desired, 'utf8')
  return { rewrote: true, body }
}

/**
 * The local-naive `YYYY-MM-DD HH:mm` form used in the history list rows and
 * the loaded-readout title — the date/time as written in the frontmatter
 * timestamp, offset dropped.
 */
function formatLoadedTimestamp(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
}

/**
 * Cap on the loaded readout's content wrap width — mirrors the casting bins'
 * default so a loaded consultation reads the same as a freshly cast one.
 */
const DEFAULT_MAX_WRAP_WIDTH = 120

/**
 * Footer key hints for a consultation loaded from history. Escape returns to
 * the list rather than quitting the program, so the hint says so verbatim.
 */
const LOADED_READOUT_KEY_HINTS =
  'Tab switch · ↑↓ scroll · </> pan · g/G ends · Esc back to history'

type AppState =
  | {
      mode: 'list'
      loading: boolean
      error: string | null
      /**
       * Transient status set after a Ctrl+D delete resolves/rejects — passed
       * straight through to `<HistoryList deleteStatusLine>`. `null` on every
       * other list transition (it is a fresh-after-delete-only value).
       */
      deleteStatus: { text: string; tone: 'dim' | 'error' } | null
      /**
       * Path of the consultation to re-focus on the next list mount — set
       * only on the readout → list (`onExit`) transition so the user returns
       * to the row they loaded. `null` on every other list transition.
       */
      restoreFocusPath: string | null
    }
  | {
      mode: 'view'
      entry: HistoryEntry
      rewroteOnLoad: boolean
    }

interface HistoryAppProps {
  /** Directory scanned for consultation `.md` files. */
  dir: string
  /**
   * Invoked when the user presses Escape at the top level of the history list
   * (the soft "back" key — not while the filter row is open, and not Ctrl+C).
   * Lets a host shell (`HexagramApp`) reclaim Escape to navigate back to its
   * Home menu instead of quitting. Defaults to `useApp().exit` so the
   * standalone `hexagram-history` binary keeps quitting on Escape.
   */
  onExit?: () => void
  /**
   * Verb shown after `ESC` in the history-list footer key hints — names the
   * real destination of the top-level Escape exit. Threaded straight down to
   * `<HistoryList>`. Defaults to `"quit"` (standalone behaviour); a host that
   * supplies `onExit` should also pass a matching label (e.g. `"Home"`).
   */
  exitLabel?: string
}

export function HistoryApp({
  dir,
  onExit,
  exitLabel = 'quit',
}: HistoryAppProps): ReactElement {
  const { exit } = useApp()
  // Top-level Escape in the list routes through `onExit` when a host injects
  // one; otherwise it falls back to `exit` so standalone Escape still quits.
  // Ctrl+C is deliberately NOT routed through `onExit` — it is the hard quit
  // from every screen and always calls `exit` directly (see `useInput` below).
  const handleExit = onExit ?? exit
  const { columns, rows } = useWindowSize()
  const cols = columns || 80
  const termRows = rows || 24
  const [scan, setScan] = useState<{
    entries: HistoryEntry[]
    unreadable: { path: string; reason: string }[]
  } | null>(null)
  const [state, setState] = useState<AppState>({
    mode: 'list',
    loading: false,
    error: null,
    deleteStatus: null,
    restoreFocusPath: null,
  })

  useEffect(() => {
    scanConsultations(dir)
      .then((r) => {
        setScan(r as never)
      })
      .catch(() => {
        setScan({ entries: [], unreadable: [] })
      })
  }, [dir])

  // Ctrl+C always hard-quits the program — never routed through the injected
  // `onExit`. Escape is owned entirely by the child views — the list
  // (`handleExit` below) so that, while its filter row is open, Escape
  // clears/closes the filter instead of leaking through to a top-level exit;
  // the readout (its own `onExit`) so Escape returns to the list.
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit()
    }
  })

  if (scan === null) {
    return (
      <Box>
        <Text>Loading consultations from {dir}…</Text>
      </Box>
    )
  }

  if (state.mode === 'list') {
    let statusLine: { text: string; tone: 'dim' | 'error' } | null = null
    if (state.loading) {
      statusLine = { text: 'Loading…', tone: 'dim' }
    } else if (state.error !== null) {
      statusLine = { text: state.error, tone: 'error' }
    }
    return (
      <HistoryList
        entries={scan.entries}
        unreadable={scan.unreadable as never}
        cols={cols}
        rows={termRows}
        statusLine={statusLine}
        deleteStatusLine={state.deleteStatus}
        initialFocusPath={state.restoreFocusPath}
        onExit={handleExit}
        exitLabel={exitLabel}
        onPick={(entry) => {
          // Debounce: ignore further Enter presses while a load is in flight.
          if (state.loading) return
          setState({
            mode: 'list',
            loading: true,
            error: null,
            deleteStatus: null,
            restoreFocusPath: null,
          })
          rerenderOnDisk(entry.path, entry.envelope)
            .then((r) => {
              setState({
                mode: 'view',
                entry,
                rewroteOnLoad: r.rewrote,
              })
            })
            .catch((error: unknown) => {
              setState({
                mode: 'list',
                loading: false,
                error: `Failed to load ${entry.path}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                deleteStatus: null,
                restoreFocusPath: null,
              })
            })
        }}
        onDelete={(targetPath) => {
          // Permanent fs.unlink — no trash. Mirrors the onPick ownership
          // split: the list stays side-effect-free, the app owns the
          // filesystem mutation. No re-entry guard is needed (unlike onPick's
          // `loading` debounce): the confirm modal is single-shot — it closes
          // before onDelete fires and the row is spliced out on success.
          fs.unlink(targetPath)
            .then(() => {
              // Optimistic local removal — the app scans once on mount, so
              // splice the deleted path out of `scan` in place rather than
              // re-scanning disk.
              setScan((prev) =>
                prev === null
                  ? prev
                  : {
                      entries: prev.entries.filter(
                        (e) => e.path !== targetPath,
                      ),
                      unreadable: prev.unreadable.filter(
                        (u) => u.path !== targetPath,
                      ),
                    },
              )
              setState({
                mode: 'list',
                loading: false,
                error: null,
                deleteStatus: {
                  text: `✓ Deleted ${path.relative(process.cwd(), targetPath)}`,
                  tone: 'dim',
                },
                restoreFocusPath: null,
              })
            })
            .catch((error: unknown) => {
              setState({
                mode: 'list',
                loading: false,
                error: null,
                deleteStatus: {
                  text: `Failed to delete ${path.relative(
                    process.cwd(),
                    targetPath,
                  )}: ${error instanceof Error ? error.message : String(error)}`,
                  tone: 'error',
                },
                restoreFocusPath: null,
              })
            })
        }}
      />
    )
  }

  // ── Loaded consultation — the four-tab readout in the `done` state ────────
  const { envelope } = state.entry
  const sections = buildConsultationSections(
    envelope.query,
    envelope.hexagram,
    envelope.casting,
    envelope.castingAbsence,
  )
  const querySlot = (innerCols: number): ReactElement => (
    <QueryBox query={envelope.query} width={innerCols} />
  )

  return (
    <ConsultationReadout
      sections={sections}
      locked={false}
      savedPath={path.relative(process.cwd(), state.entry.path)}
      maxWrapWidth={DEFAULT_MAX_WRAP_WIDTH}
      querySlot={querySlot}
      queryText={envelope.query}
      title={`Consultation · loaded ${formatLoadedTimestamp(
        envelope.timestamp,
      )}`}
      doneKeyHints={LOADED_READOUT_KEY_HINTS}
      notice={
        state.rewroteOnLoad ? '✓ Body refreshed; data unchanged.' : undefined
      }
      onExit={() => {
        setState({
          mode: 'list',
          loading: false,
          error: null,
          deleteStatus: null,
          // Restore focus to the consultation just viewed.
          restoreFocusPath: state.entry.path,
        })
      }}
    />
  )
}
