import type { Citation } from '#src/citation.js'
import type { Edition } from '#src/edition.js'

/**
 * The text one Edition gives for one Citation, naming its Edition and, through
 * it, its Witness. A Yilin Verse is a passage text with a `yilin` Citation.
 */
export interface PassageText {
  readonly citation: Citation
  readonly edition: Edition
  readonly text: string
}
