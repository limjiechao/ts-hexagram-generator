import { getEmergingHexagram, getHexagramRecord } from '@hexagram/core/getters'
import type { Hexagram } from '@hexagram/types'
import { Box, Text, useInput } from 'ink'
import { useMemo, useReducer, type ReactElement } from 'react'

import type { HistoryEntry, UnreadableEntry } from './history-scan.js'

interface HistoryListProps {
  entries: HistoryEntry[]
  unreadable: UnreadableEntry[]
  cols: number
  onPick: (entry: HistoryEntry) => void
}

interface State {
  focus: number
  filterMode: boolean
  filter: string
}
type Action =
  | { type: 'up' }
  | { type: 'down' }
  | { type: 'pageUp'; size: number }
  | { type: 'pageDown'; size: number }
  | { type: 'first' }
  | { type: 'last'; size: number }
  | { type: 'filterEnter' }
  | { type: 'filterExit' }
  | { type: 'filterChange'; value: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'up':
      return {
        ...state,
        focus: state.focus < 0 ? 0 : Math.max(0, state.focus - 1),
      }
    case 'down':
      return { ...state, focus: state.focus < 0 ? 0 : state.focus + 1 }
    case 'pageUp':
      return { ...state, focus: Math.max(0, state.focus - action.size) }
    case 'pageDown':
      return { ...state, focus: state.focus + action.size }
    case 'first':
      return { ...state, focus: 0 }
    case 'last':
      return { ...state, focus: Math.max(0, action.size - 1) }
    case 'filterEnter':
      return { ...state, filterMode: true }
    case 'filterExit':
      return { ...state, filterMode: false, filter: '' }
    case 'filterChange':
      return { ...state, filter: action.value, focus: 0 }
  }
}

function shortenTimestamp(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1))}…`
}

function summarizeHex(hexagram: Hexagram): string {
  const standing = getHexagramRecord(hexagram)
  const hasMoving = hexagram.some((line) => line === 6 || line === 9)
  const left = `#${standing.Metadata.Order.WenWang} ${standing.Name.Chinese.Traditional} ${standing.Name.English.WilhelmBaynes.split(' / ')[0] ?? standing.Name.English.WilhelmBaynes}`
  if (!hasMoving) return left
  const emerging = getHexagramRecord(getEmergingHexagram(hexagram))
  const right = `#${emerging.Metadata.Order.WenWang} ${emerging.Name.Chinese.Traditional} ${emerging.Name.English.WilhelmBaynes.split(' / ')[0] ?? emerging.Name.English.WilhelmBaynes}`
  return `${left} ──▶ ${right}`
}

export function HistoryList({
  entries,
  unreadable,
  cols,
  onPick,
}: HistoryListProps): ReactElement {
  const [state, dispatch] = useReducer(reducer, {
    focus: -1,
    filterMode: false,
    filter: '',
  })

  const filtered = useMemo(() => {
    if (state.filter.length === 0) return entries
    const needle = state.filter.toLowerCase()
    return entries.filter((e) =>
      e.envelope.query.toLowerCase().includes(needle),
    )
  }, [entries, state.filter])

  useInput((input, key) => {
    if (state.filterMode) {
      if (key.escape) {
        dispatch({ type: 'filterExit' })
        return
      }
      if (key.return) {
        const resolvedFocus =
          state.focus < 0
            ? 0
            : Math.min(state.focus, Math.max(0, filtered.length - 1))
        const entry = filtered[resolvedFocus]
        if (entry !== undefined) onPick(entry)
        return
      }
      if (key.backspace || key.delete) {
        dispatch({
          type: 'filterChange',
          value: state.filter.slice(0, -1),
        })
        return
      }
      if (input.length > 0 && !key.ctrl && !key.meta) {
        dispatch({ type: 'filterChange', value: state.filter + input })
        return
      }
      return
    }
    if (input === '/') {
      dispatch({ type: 'filterEnter' })
      return
    }
    if (key.upArrow) dispatch({ type: 'up' })
    else if (key.downArrow) dispatch({ type: 'down' })
    else if (key.pageUp) dispatch({ type: 'pageUp', size: 10 })
    else if (key.pageDown) dispatch({ type: 'pageDown', size: 10 })
    else if (input === 'g') dispatch({ type: 'first' })
    else if (input === 'G') dispatch({ type: 'last', size: filtered.length })
    else if (key.return) {
      const resolvedFocus =
        state.focus < 0
          ? 0
          : Math.min(state.focus, Math.max(0, filtered.length - 1))
      const entry = filtered[resolvedFocus]
      if (entry !== undefined) onPick(entry)
    }
  })

  if (entries.length === 0 && unreadable.length === 0) {
    return (
      <Box>
        <Text>
          No consultations yet. Run hexagram-random or hexagram-interactive
          first.
        </Text>
      </Box>
    )
  }

  const focus =
    state.focus < 0
      ? -1
      : Math.min(state.focus, Math.max(0, filtered.length - 1))

  const rows = filtered.map((entry, index) => {
    const isFocused = index === focus
    const head = `[${shortenTimestamp(entry.envelope.timestamp)}] ${truncate(
      entry.envelope.query.length > 0 ? entry.envelope.query : '(no query)',
      Math.max(10, cols - 22),
    )}`
    const summary = `  ${summarizeHex(entry.envelope.hexagram)}`
    return (
      <Box key={entry.path} flexDirection="column">
        <Text inverse={isFocused}>{head}</Text>
        <Text inverse={isFocused}>{summary}</Text>
      </Box>
    )
  })

  return (
    <Box flexDirection="column">
      {state.filterMode ? (
        <Text>
          Filter: <Text bold>{state.filter}</Text>_ (ESC to clear)
        </Text>
      ) : null}
      {rows}
      {unreadable.map((u) => (
        <Box key={u.path}>
          <Text dimColor>
            [unreadable — {u.reason}] {u.path}
          </Text>
        </Box>
      ))}
    </Box>
  )
}
