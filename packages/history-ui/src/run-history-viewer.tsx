import path from 'node:path'
import process from 'node:process'

import { render } from 'ink'

import { HistoryApp } from './history-app.js'

export async function runHistoryViewer(args: { dir?: string }): Promise<void> {
  const dir = args.dir ?? path.join(process.cwd(), 'consultations')
  const instance = render(<HistoryApp dir={dir} />, {
    exitOnCtrlC: false,
    alternateScreen: true,
  })
  await instance.waitUntilExit()
}
