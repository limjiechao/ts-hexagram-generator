#!/usr/bin/env node

import process from 'node:process'

import { runHexagram } from '@hexagram/shell'

import { workspaceConsultationsDir } from './workspace-root.js'

async function main(): Promise<void> {
  try {
    // Resolve the repo-root-anchored consultations dir and thread it explicitly
    // to the shell (no cwd mutation — FCIS). The shell forwards it to the
    // History mount and the casting viewer's save edge, so saves land on
    // `<repo-root>/consultations` regardless of the invocation directory.
    const consultationsDir = workspaceConsultationsDir()
    // `runHexagram()` owns the TTY guard: it writes its own stderr refusal and
    // resolves to `false` for a non-interactive env, or `true` after a clean
    // quit. The bin just translates that boolean into a process exit code.
    const cleanQuit = await runHexagram(consultationsDir)
    process.exit(cleanQuit ? 0 : 1)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await main()
