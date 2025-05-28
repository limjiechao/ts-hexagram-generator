import type { Hexagram } from './types'

export const BOLD_GREY = '\u001B[1;90m'
export const BOLD_WHITE = '\u001B[1;97m'
export const NORMAL = '\u001B[0m'

function generateHexagramTitle(hexagram: Hexagram) {
  return `Hexagram: ${hexagram.join(', ')}`
}

function generateHexagramDiagram(hexagram: Hexagram) {
  return (
    hexagram
      // eslint-disable-next-line array-callback-return
      .map((line) => {
        switch (line) {
          case 6:
            return '6 === X ==='
          case 7:
            return '7 ========='
          case 8:
            return '8 ===   ==='
          case 9:
            return '9 ====O===='
        }
      })
      .toReversed()
      .join('\n')
  )
}

export function printHexagramInformation(hexagram: Hexagram): void {
  console.info(BOLD_WHITE)
  console.info(generateHexagramTitle(hexagram))

  // eslint-disable-next-line no-console
  console.group()
  console.info('')
  console.info(generateHexagramDiagram(hexagram))

  console.info('')
  // eslint-disable-next-line no-console
  console.groupEnd()

  console.info(NORMAL)
}
