// Linted as overhaul/store-markdown/src/store-imports-application.ts
// Twin for B1, B2 and B7: the Markdown Store may use the file system and
// import application.

import { readdirSync } from 'node:fs'

import type { ConsultationStore } from '@hexagram/application/consultation-store'

export type Store = ConsultationStore

export function fileNames(journalFolder: string): readonly string[] {
  return readdirSync(journalFolder)
}
