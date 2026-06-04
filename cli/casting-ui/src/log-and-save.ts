import { saveConsultationFile } from '@hexagram/consultation-file/file'
import type { CastingRecord, Hexagram } from '@hexagram/core/types'
import { BOLD_GREY, NORMAL } from '@hexagram/viewer-core'

import { consultationConsoleOutput } from './output-composers.js'

/**
 * Plain-mode terminal flow: print the ANSI-styled console output, then save
 * the `.md` consultation file. Drop-in replacement for the previous
 * `logAndSaveConsultationOutput`, which wrote a stripped-ANSI `.txt`.
 */
export async function logAndSaveConsultationOutput(
  question: string,
  hexagram: Hexagram,
  casting: CastingRecord,
): Promise<void> {
  const consoleOutput = consultationConsoleOutput(question, hexagram, casting)
  console.clear()
  console.info(consoleOutput)
  const filePath = await saveConsultationFile({
    query: question,
    hexagram,
    casting,
  })
  console.info('')
  console.info(`${BOLD_GREY}Consultation output saved to ${filePath}.${NORMAL}`)
  console.info('')
}
