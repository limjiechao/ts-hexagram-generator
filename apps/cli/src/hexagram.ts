#!/usr/bin/env node

import process from 'node:process'

import { runHexagram } from '@hexagram/shell'

import { anchorCwdToWorkspaceRoot } from './workspace-root.js'

async function main(): Promise<void> {
  try {
    // Pin cwd to the monorepo root so the shell's History mount and any save in
    // the casting viewer (both resolve `<cwd>/consultations` via the
    // medium-neutral `defaultConsultationsDir`, which takes no `dir`) land on
    // `<repo-root>/consultations`, regardless of the invocation directory.
    anchorCwdToWorkspaceRoot()
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
