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
async function main(): Promise<void> {
  try {
    if (!isInteractiveEnv()) {
      process.stderr.write('hexagram-manual requires an interactive terminal\n')
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
