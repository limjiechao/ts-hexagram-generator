#!/usr/bin/env node

import process from 'node:process'

import { runPlaygroundApp } from '@hexagram/playground-ui'

async function main(): Promise<void> {
  try {
    const ok = await runPlaygroundApp()
    process.exit(ok ? 0 : 1)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
