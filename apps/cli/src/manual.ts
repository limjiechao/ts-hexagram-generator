#!/usr/bin/env node

import process from 'node:process'

import {
  resolveManualRevealMs,
  resolveWrapWidth,
  runManualConsultationViewer,
} from '@hexagram/casting-ui'
import { refuseIfNonInteractive } from '@hexagram/viewer-core'

import { workspaceConsultationsDir } from './workspace-root.js'

// `hexagram-manual` — the standalone bin for the manual yarrow-stalk flow.
// Mirrors `apps/cli/src/history.ts` in shape: an Ink-only viewer, gated on a
// real interactive terminal (refusing non-TTY / NO_COLOR / CI with a clear
// stderr message and exit 1 — see `isInteractiveEnv` for the predicates).
// The manual flow's per-cast prompt has no plain-mode fallback (per the spec's
// "Non-goals"), so there is no `--plain` branch here.

// The manual casting prompt's flow diagram reserves 22 rows; with the viewer
// chrome (header + query + tab bar + footer ≈ 9) and a 1-row content floor it
// needs ~32 terminal rows. Below that the alternate screen overflows and the
// COUNTED/MISSING gauge or the footer would be clipped, so we refuse upfront
// with the same stderr-and-exit-1 shape as the non-TTY guard rather than
// render a broken screen.
// Recorded as policy in ADR-0010: a manual-only terminal-height gate (it stays
// in the bin because it needs `process.stdout.rows`).
const MANUAL_MIN_TERMINAL_ROWS = 32

async function main(): Promise<void> {
  try {
    // Resolve the repo-root-anchored consultations dir and thread it explicitly
    // to the viewer's save edge (no cwd mutation — FCIS), so the reading lands
    // on `<repo-root>/consultations` regardless of the invocation directory.
    const consultationsDir = workspaceConsultationsDir()
    refuseIfNonInteractive('hexagram-manual')
    const rows = process.stdout.rows
    if (typeof rows === 'number' && rows < MANUAL_MIN_TERMINAL_ROWS) {
      process.stderr.write(
        `hexagram-manual needs a terminal at least ${MANUAL_MIN_TERMINAL_ROWS} rows tall; yours is ${rows}\n`,
      )
      process.exit(1)
    }
    await runManualConsultationViewer({
      maxWrapWidth: resolveWrapWidth(),
      manualRevealMs: resolveManualRevealMs(),
      consultationsDir,
    })
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
