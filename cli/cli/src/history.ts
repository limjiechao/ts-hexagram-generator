#!/usr/bin/env node

import process from 'node:process'

import { defaultConsultationsDir } from '@hexagram/consultation-file'
import { runHistoryViewer } from '@hexagram/history-ui'
import { refuseIfNonInteractive } from '@hexagram/viewer-core'

import { migrateLegacy } from './migrate-legacy.js'

async function main(): Promise<void> {
  try {
    const argv = process.argv.slice(2)
    if (argv.includes('--convert-legacy')) {
      await migrateLegacy(defaultConsultationsDir())
      process.exit(0)
    }
    refuseIfNonInteractive('hexagram-history')
    await runHistoryViewer({})
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
