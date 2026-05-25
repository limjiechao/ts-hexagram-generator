// `runPlaygroundApp()` — the run entry for `hexagram-playground`. Pure
// I/O wrapper: a TTY-guard returning a boolean (so the bin can map exit
// codes), a single `render()` on the alternate screen, and an await on
// the app's exit. Mirrors `runHistoryViewer` and `runHexagram` exactly so
// every Ink-only run-entry behaves consistently.

import process from 'node:process'

import { isInteractiveEnv } from '@hexagram/viewer-core'
import { render } from 'ink'
import { createElement } from 'react'

import { PlaygroundApp } from './playground-app.js'

/** The stderr message written when the environment is non-interactive. */
const NON_INTERACTIVE_MESSAGE =
  'hexagram-playground requires an interactive terminal\n'

/**
 * Run the standalone `hexagram-playground` CLI. Resolves to `true` on a
 * clean quit and `false` when the environment is non-interactive (after
 * writing the refusal to stderr). The caller turns that boolean into the
 * process exit code (`0` on clean quit, `1` on refusal); this function
 * never calls `process.exit()` itself so it stays focused and
 * unit-testable.
 *
 * `exitOnCtrlC: false` matches `runHistoryViewer` and `runHexagram` — the
 * playground screen owns Ctrl+C (currently as a quit, but the
 * compose-friendly wiring leaves room for a future discard-confirm).
 */
export async function runPlaygroundApp(): Promise<boolean> {
  if (!isInteractiveEnv()) {
    process.stderr.write(NON_INTERACTIVE_MESSAGE)
    return false
  }
  const instance = render(createElement(PlaygroundApp), {
    exitOnCtrlC: false,
    alternateScreen: true,
  })
  await instance.waitUntilExit()
  return true
}
