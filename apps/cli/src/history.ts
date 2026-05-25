#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'

import { runHistoryViewer } from '@hexagram/history-ui'
import { isInteractiveEnv } from '@hexagram/viewer-core'

import { migrateLegacy } from './migrate-legacy.js'

async function main(): Promise<void> {
  try {
    const argv = process.argv.slice(2)
    if (argv.includes('--convert-legacy')) {
      await migrateLegacy(path.join(process.cwd(), 'consultations'))
      process.exit(0)
    }
    if (!isInteractiveEnv()) {
      process.stderr.write(
        'hexagram-history requires an interactive terminal\n',
      )
      process.exit(1)
    }
    await runHistoryViewer({})
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
