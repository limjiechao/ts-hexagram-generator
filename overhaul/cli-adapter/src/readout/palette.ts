/**
 * The terminal colours of the plain and Ink Readouts, private to this
 * package. Each is the escape code that opens it; `reset` closes them all.
 * Under `NO_COLOR` every code is the empty string, so a Readout without
 * colour is the coloured one with its escape codes removed, and whatever
 * colour marks is marked by text as well (ADR-0044).
 */
export interface Palette {
  /** Section titles and the ledger's headings. */
  readonly heading: string
  /** The Query, names, passage texts and a Line that does not move. */
  readonly emphasis: string
  /** A Moving Line of the Standing Hexagram. */
  readonly moving: string
  /** Labels, rules and the quieter ledger columns. */
  readonly muted: string
  /** The ledger's Remainders. */
  readonly remainder: string
  /** The Line Value a Line's third Round gives. */
  readonly lineValue: string
  readonly reset: string
}

const colours: Palette = {
  heading: '\u001B[1;90m',
  emphasis: '\u001B[1;97m',
  moving: '\u001B[1;91m',
  muted: '\u001B[90m',
  remainder: '\u001B[93m',
  lineValue: '\u001B[1;96m',
  reset: '\u001B[0m',
}

const noColours: Palette = {
  heading: '',
  emphasis: '',
  moving: '',
  muted: '',
  remainder: '',
  lineValue: '',
  reset: '',
}

export const paletteFor = (colour: boolean): Palette =>
  colour ? colours : noColours
