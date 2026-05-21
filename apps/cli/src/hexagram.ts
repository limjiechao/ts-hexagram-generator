#!/usr/bin/env node

import process from 'node:process'

import { runHexagram } from '@hexagram/shell'

async function main(): Promise<void> {
  try {
    // `runHexagram()` owns the TTY guard: it writes its own stderr refusal and
    // resolves to `false` for a non-interactive env, or `true` after a clean
    // quit. The bin just translates that boolean into a process exit code.
    const cleanQuit = await runHexagram()
    process.exit(cleanQuit ? 0 : 1)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
