#!/usr/bin/env node

import process from 'node:process'

import { runPlaygroundApp } from '@hexagram/playground-ui'

import { workspaceConsultationsDir } from './workspace-root.js'

async function main(): Promise<void> {
  try {
    // Resolve the repo-root-anchored consultations dir and thread it to the
    // playground's save edge (no cwd mutation — ADR-0020), so a playground
    // save lands on `<repo-root>/consultations` regardless of the invocation
    // directory. Mirrors the history/random/manual/interactive bins.
    const ok = await runPlaygroundApp({ dir: workspaceConsultationsDir() })
    process.exit(ok ? 0 : 1)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
