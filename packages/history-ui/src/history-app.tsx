import fs from 'node:fs/promises'

import {
  markdownConsultationBody,
  serializeFrontmatter,
  type ConsultationEnvelope,
} from '@hexagram/consultation'
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

type AppState =
  | { mode: 'list'; loading: boolean; error: string | null }
  | {
      mode: 'view'
      entry: HistoryEntry
      body: string
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

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      if (state.mode === 'view') {
        setState({ mode: 'list', loading: false, error: null })
        return
      }
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
                body: r.body,
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

  return (
    <Box flexDirection="column">
      <Text>
        {state.entry.envelope.timestamp} · {state.entry.envelope.query}
      </Text>
      {state.rewroteOnLoad ? (
        <Text dimColor>(Re-rendered body to match current renderer.)</Text>
      ) : null}
      <Text>{state.body}</Text>
      <Text dimColor>ESC to return to list</Text>
    </Box>
  )
}
