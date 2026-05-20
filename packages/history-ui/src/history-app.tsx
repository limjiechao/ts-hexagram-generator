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
  QueryBox,
} from '@hexagram/viewer-core'
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

type AppState =
  | { mode: 'list'; loading: boolean; error: string | null }
  | {
      mode: 'view'
      entry: HistoryEntry
      rewroteOnLoad: boolean
    }

export function HistoryApp({ dir }: { dir: string }): ReactElement {
  const { exit } = useApp()
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

  // ESC / Ctrl+C handling for the list view. The readout owns its own ESC
  // (wired to the `onExit` prop below) — it returns to the list rather than
  // exiting the program — so this handler is a no-op while in `view` mode to
  // avoid double-handling the keypress.
  useInput((input, key) => {
    if (state.mode !== 'list') return
    if (key.escape || (key.ctrl && input === 'c')) {
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
        onPick={(entry) => {
          // Debounce: ignore further Enter presses while a load is in flight.
          if (state.loading) return
          setState({ mode: 'list', loading: true, error: null })
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
      title={`Past Consultation · loaded ${formatLoadedTimestamp(
        envelope.timestamp,
      )}`}
      notice={
        state.rewroteOnLoad ? '✓ Body refreshed; data unchanged.' : undefined
      }
      onExit={() => {
        setState({ mode: 'list', loading: false, error: null })
      }}
    />
  )
}
