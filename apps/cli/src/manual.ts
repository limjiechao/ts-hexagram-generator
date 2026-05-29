#!/usr/bin/env node

import process from 'node:process'

import {
  resolveManualRevealMs,
  resolveWrapWidth,
  runManualConsultationViewer,
} from '@hexagram/casting-ui'
import { isInteractiveEnv } from '@hexagram/viewer-core'

// `hexagram-manual` — the standalone bin for the manual yarrow-stalk flow.
// Mirrors `apps/cli/src/history.ts` in shape: an Ink-only viewer, gated on a
// real interactive terminal (refusing non-TTY / NO_COLOR / CI with a clear
// stderr message and exit 1 — see `isInteractiveEnv` for the predicates).
// The manual flow's per-cast prompt has no plain-mode fallback (per the spec's
// "Non-goals"), so there is no `--plain` branch here.

// The manual casting prompt's flow diagram reserves 24 rows; with the viewer
// chrome (header + query + tab bar + footer ≈ 9) and a 1-row content floor it
// needs ~34 terminal rows. Below that the alternate screen overflows and the
// COUNTED/MISSING gauge or the footer would be clipped, so we refuse upfront
// with the same stderr-and-exit-1 shape as the non-TTY guard rather than
// render a broken screen.
const MANUAL_MIN_TERMINAL_ROWS = 34

async function main(): Promise<void> {
  try {
    if (!isInteractiveEnv()) {
      process.stderr.write('hexagram-manual requires an interactive terminal\n')
      process.exit(1)
    }
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
    })
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
