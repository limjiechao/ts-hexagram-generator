import {
  emptyPartialCastingRecord,
  type CastingRecord,
  type Hexagram,
  type Line,
  type PartialCastingRecord,
  type SplitRecord,
} from '@hexagram/types'
import type { ConsultationSections } from '@hexagram/viewer-core'

/**
 * The predetermined casting plan for a random flow — the hexagram and the
 * eighteen RNG-chosen stalk divisions, produced by `generateRandomConsultation()`
 * in the imperative shell (the Viewer's Query-submit handler). The reducer
 * only stores and carries it; the impure `crypto.randomInt` call never enters
 * this pure module. `casting[lineIndex][castIndex]` is a `SplitRecord`
 * `{ pick, max }`; `hexagram[lineIndex]` is the resolved `Line`. `null` for
 * an interactive flow, which generates its lines cast-by-cast instead.
 */
export interface CastingPlan {
  hexagram: Hexagram
  casting: CastingRecord
}

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
  // The predetermined plan for a random flow — stored on `querySubmit` and
  // read cast-by-cast during `casting`. `null` for an interactive flow.
  castingPlan: CastingPlan | null
  sections: ConsultationSections | null
  savedPath: string | null
  saveError: Error | null
}

export type FlowAction =
  | { type: 'queryChange'; value: string }
  // `plan` is supplied only by the random flow — the imperative shell
  // generates it via `generateRandomConsultation()` and hands it in here so
  // the reducer can stay pure (no crypto/RNG inside it).
  | { type: 'querySubmit'; plan?: CastingPlan }
  | { type: 'castingBufferChange'; value: string }
  | { type: 'castingError'; message: string | null }
  | { type: 'splitCommitted'; pick: number; max: number; line?: Line }
  // Random-playback skip — dispatched by the imperative shell when the user
  // presses SPACE during the random casting animation. Pure: it fills the
  // partial casting record and completed lines from the already-generated
  // `castingPlan` (no RNG, no derivation) and transitions to `computing`.
  | { type: 'playbackSkipped' }
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
const ANSI_PATTERN: RegExp = /\u001B\[[0-9;]*m/g

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
    castingPlan: null,
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
      // Both flows enter `casting`. The random flow plays its predetermined
      // plan back cast-by-cast through the SAME casting mode the interactive
      // flow uses; the imperative shell hands the plan in via `action.plan`.
      // The interactive flow carries no plan and generates lines cast-by-cast.
      return {
        ...state,
        query,
        mode: 'casting',
        castingPlan: action.plan ?? null,
      }
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
          // The plan has served its purpose by `computing` — every cast has
          // been played back into `partialCasting`. Clear it so the lifetime
          // is explicit and `computing`/`done` never see a stale plan.
          castingPlan: null,
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
    case 'playbackSkipped': {
      // Skip the rest of the random casting animation and jump straight to
      // `computing`. Only meaningful while a random flow is mid-`casting`
      // with a non-null plan — a no-op otherwise (interactive flow, or wrong
      // mode), so an errant dispatch can never corrupt the flow.
      if (state.mode !== 'casting' || state.castingPlan === null) return state
      // Fill the partial casting record wholesale from the plan's casting
      // (`CastingRecord` is a structural subtype of `PartialCastingRecord`)
      // and the completed lines from the plan's hexagram. This is exactly the
      // state eighteen `splitCommitted`s would have produced, so the saved
      // Consultation is identical to the one the full animation yields.
      //
      // Shallow-copy the outer tuple so `partialCasting` is its own array
      // rather than an alias of `castingPlan.casting` — every other transition
      // in this reducer builds a fresh array (`splitCommitted` uses `.map`),
      // so sharing the plan's reference would break that convention and risk
      // latent corruption. The inner `SplitRecord`s are never mutated, so a
      // shallow outer copy suffices.
      return {
        ...state,
        mode: 'computing',
        partialCasting: [...state.castingPlan.casting] as PartialCastingRecord,
        completedLines: [...state.castingPlan.hexagram],
        castingBuffer: '',
        error: null,
        // Clear the plan on the `computing` transition, consistent with the
        // last-cast `splitCommitted` — `computing`/`done` never see a stale
        // plan.
        castingPlan: null,
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
