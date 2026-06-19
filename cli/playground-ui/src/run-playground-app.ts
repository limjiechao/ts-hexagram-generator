// `runPlaygroundApp()` — the run entry for `hexagram-playground`. Pure
// I/O wrapper: a TTY-guard returning a boolean (so the bin can map exit
// codes), a single `render()` on the alternate screen, and an await on
// the app's exit. Mirrors `runHexagram` exactly — both self-guard with
// `warnIfNonInteractive` and return the boolean for the bin to map. NOT
// `runHistoryViewer`, which carries no internal guard: its bin guards
// externally with `refuseIfNonInteractive` (the two refusal forms are the
// deliberate split documented on those helpers in viewer-core).

import {
  liveSnapshot,
  warnIfNonInteractive,
  type EnvSnapshot,
} from '@hexagram/viewer-core'
import { render } from 'ink'
import { createElement } from 'react'

import { PlaygroundApp } from './playground-app.js'

/**
 * Run the standalone `hexagram-playground` CLI. Resolves to `true` on a
 * clean quit and `false` when the environment is non-interactive (after
 * writing the refusal to stderr). The caller turns that boolean into the
 * process exit code (`0` on clean quit, `1` on refusal); this function
 * never calls `process.exit()` itself so it stays focused and
 * unit-testable.
 *
 * `dir` is the repo-root-anchored consultations directory the bin resolves
 * at the shell edge (via `workspaceConsultationsDir()`) and threads in as
 * `<PlaygroundApp>`'s `saveDir`, so a playground save lands in
 * `<repo-root>/consultations` regardless of the invocation cwd — matching
 * `runHistoryViewer({ dir })` and the casting bins (ADR-0020). Omitting it
 * falls back to the component's cwd-based default.
 *
 * `exitOnCtrlC: false` matches `runHistoryViewer` and `runHexagram` — the
 * playground screen owns Ctrl+C (currently as a quit, but the
 * compose-friendly wiring leaves room for a future discard-confirm).
 */
export async function runPlaygroundApp(
  args: { dir?: string; env?: EnvSnapshot } = {},
): Promise<boolean> {
  // `env` defaults to the live snapshot; tests inject one to reach refusal.
  const snapshot: EnvSnapshot = args.env ?? liveSnapshot()
  if (!warnIfNonInteractive('hexagram-playground', snapshot)) return false
  const instance = render(createElement(PlaygroundApp, { saveDir: args.dir }), {
    exitOnCtrlC: false,
    alternateScreen: true,
  })
  await instance.waitUntilExit()
  return true
}
