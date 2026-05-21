import type { FlowState } from './viewer-flow.js'

// Pure leaf predicate over the casting flow state. No React, no Ink imports —
// it is a plain function of `FlowState` so it can be unit-tested without
// mounting the viewer. `<ConsultationViewer>` consults it on an exit attempt
// to decide whether to interpose a discard confirmation.

/**
 * Whether the casting flow holds work the user would lose by exiting now.
 *
 * Semantics, by `mode`:
 *   - `awaitingQuery` — `true` only once the query buffer holds non-whitespace
 *     text. An untouched (or whitespace-only) query box is *not* progress: an
 *     Esc there exits straight away with no confirmation.
 *   - `casting` — always `true`. The user is part-way through the 18 splits;
 *     once the first cast begins (and certainly once a split is committed)
 *     there is unsaved work.
 *   - `computing` — `true`. The 18 picks are complete but the consultation is
 *     mid-flight to disk; the `done` transition (which fires `computeSucceeded`
 *     after `saveConsultationFile` resolves) is what marks the work saved. A
 *     `computing` state with a pending `saveError` is the clearest case — the
 *     save has *not* succeeded — but even the in-flight case counts as unsaved.
 *   - `done` — `false`. By `done` the consultation file has been written
 *     (`computeSucceeded` carries the `savedPath`), so exiting loses nothing.
 */
export function hasUnsavedCastProgress(state: FlowState): boolean {
  if (state.mode === 'done') return false
  if (state.mode === 'awaitingQuery') {
    return state.queryBuffer.trim().length > 0
  }
  // `casting` | `computing` — work is in progress and not yet on disk.
  return true
}
