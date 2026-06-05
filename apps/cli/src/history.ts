#!/usr/bin/env node

import process from 'node:process'

import { runHistoryViewer } from '@hexagram/history-ui'
import { refuseIfNonInteractive } from '@hexagram/viewer-core'

import { migrateLegacy } from './migrate-legacy.js'
import { workspaceConsultationsDir } from './workspace-root.js'

async function main(): Promise<void> {
  try {
    // Resolve the consultations dir from the bin's own module location, not
    // `process.cwd()`, so history and the legacy migration always target
    // `<repo-root>/consultations` regardless of the invocation directory.
    const consultationsDir = workspaceConsultationsDir()
    const argv = process.argv.slice(2)
    if (argv.includes('--convert-legacy')) {
      await migrateLegacy(consultationsDir)
      process.exit(0)
    }
    refuseIfNonInteractive('hexagram-history')
    await runHistoryViewer({ dir: consultationsDir })
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
