import {
  emptyPartialCastingRecord,
  type Line,
  type PartialCastingRecord,
  type SplitRecord,
} from '@hexagram/types'

import type { ConsultationSections } from './output-composers.js'

// Pure flow state machine for the Ink consultation viewer. Lives in its own
// module (no React, no Ink imports) so transitions can be unit-tested with
// plain action dispatch and so the orchestrator file stays focused on the
// imperative bits (generator threading, useInput, JSX).

export type FlowKind = 'interactive' | 'random'
export type FlowMode = 'awaitingQuery' | 'casting' | 'computing' | 'done'

export interface FlowState {
  mode: FlowMode
  flowKind: FlowKind
  query: string
  queryBuffer: string
  castingBuffer: string
  error: string | null
  lineIndex: 0 | 1 | 2 | 3 | 4 | 5
  castIndex: 0 | 1 | 2
  partialCasting: PartialCastingRecord
  completedLines: Line[]
  sections: ConsultationSections | null
  savedPath: string | null
  saveError: Error | null
}

export type FlowAction =
  | { type: 'queryChange'; value: string }
  | { type: 'querySubmit' }
  | { type: 'castingBufferChange'; value: string }
  | { type: 'castingError'; message: string | null }
  | { type: 'splitCommitted'; pick: number; max: number; line?: Line }
  | {
      type: 'computeSucceeded'
      sections: ConsultationSections
      savedPath: string
    }
  | { type: 'computeFailed'; error: Error }

// Use the same ANSI-pattern regex as `viewer-layout.ts` to avoid duplicating
// the suppression. Inlined here so this module has no dependency on the
// layout module (keeps the flow reducer leaf-pure).
// oxlint-disable-next-line no-control-regex
const ANSI_PATTERN: RegExp = /\[[0-9;]*m/g

/**
 * Recover the user's plain query text from a pre-built `querySection()`
 * output of the shape `${BOLD_GREY}QUERY:\n\n  ${BOLD_WHITE}<query>`. Strip
 * every SGR code, take the final non-blank line, return the body. Used only
 * on the test-mode `prebuiltSections` entry path so the locked QueryBox has
 * something to display.
 */
export function extractQueryText(querySection: string): string {
  const stripped = querySection.replaceAll(ANSI_PATTERN, '')
  const lines = stripped.split('\n')
  const queryLine = lines.at(-1) ?? ''
  return queryLine.trim()
}

export const EMPTY_SECTIONS: ConsultationSections = {
  query: '',
  casting: '',
  transformation: '',
  standing: '',
  emerging: null,
}

export function initialFlowState(
  flowKind: FlowKind,
  preBuiltSections: ConsultationSections | null,
  preBuiltSavedPath: string | null,
): FlowState {
  const isDone = preBuiltSections !== null && preBuiltSavedPath !== null
  return {
    mode: isDone ? 'done' : 'awaitingQuery',
    flowKind,
    query:
      preBuiltSections === null ? '' : extractQueryText(preBuiltSections.query),
    queryBuffer: '',
    castingBuffer: '',
    error: null,
    lineIndex: 0,
    castIndex: 0,
    partialCasting: emptyPartialCastingRecord(),
    completedLines: [],
    sections: preBuiltSections,
    savedPath: preBuiltSavedPath,
    saveError: null,
  }
}

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'queryChange':
      return { ...state, queryBuffer: action.value }
    case 'querySubmit': {
      if (state.queryBuffer.trim().length === 0) return state
      const query = state.queryBuffer
      // Random skips the casting phase entirely — the picks are generated
      // inside the compute effect.
      return state.flowKind === 'random'
        ? { ...state, query, mode: 'computing' }
        : { ...state, query, mode: 'casting' }
    }
    case 'castingBufferChange':
      return { ...state, castingBuffer: action.value }
    case 'castingError':
      return { ...state, error: action.message }
    case 'splitCommitted': {
      // The split has already been validated and the line generator has been
      // advanced (with the returned Line included when this was the third
      // cast). The reducer just records it and advances the slot pointer.
      const split: SplitRecord = { pick: action.pick, max: action.max }
      const partialCasting = state.partialCasting.map(
        (line, lineIndex) =>
          (lineIndex === state.lineIndex
            ? line.map((cast, castIndex) =>
                castIndex === state.castIndex ? split : cast,
              )
            : line) as PartialCastingRecord[number],
      ) as PartialCastingRecord
      const completedLines =
        action.line === undefined
          ? state.completedLines
          : [...state.completedLines, action.line]
      // Advance to the next slot. Three casts per line; then the next line.
      const isLastCastOfLine = state.castIndex === 2
      const isLastLine = state.lineIndex === 5
      if (isLastCastOfLine && isLastLine) {
        return {
          ...state,
          mode: 'computing',
          partialCasting,
          completedLines,
          castingBuffer: '',
          error: null,
        }
      }
      const nextLineIndex = (
        isLastCastOfLine ? state.lineIndex + 1 : state.lineIndex
      ) as FlowState['lineIndex']
      const nextCastIndex = (
        isLastCastOfLine ? 0 : state.castIndex + 1
      ) as FlowState['castIndex']
      return {
        ...state,
        partialCasting,
        completedLines,
        lineIndex: nextLineIndex,
        castIndex: nextCastIndex,
        castingBuffer: '',
        error: null,
      }
    }
    case 'computeSucceeded':
      return {
        ...state,
        mode: 'done',
        sections: action.sections,
        savedPath: action.savedPath,
      }
    case 'computeFailed':
      return { ...state, saveError: action.error }
  }
}
