import { defaultConsultationsDir } from '@hexagram/consultation-file'
import { render } from 'ink'

import { HistoryApp } from './history-app.js'

export async function runHistoryViewer(args: { dir?: string }): Promise<void> {
  const dir = args.dir ?? defaultConsultationsDir()
  const instance = render(<HistoryApp dir={dir} />, {
    exitOnCtrlC: false,
    alternateScreen: true,
  })
  await instance.waitUntilExit()
}
