#!/usr/bin/env node

import process from 'node:process'

import {
  BOLD_GREY,
  BOLD_WHITE,
  getHexagramViaInteraction,
  logAndSaveConsultationOutput,
  NORMAL,
  resolveInputMode,
  resolveOutputMode,
  resolveSliderSweepMs,
  resolveWrapWidth,
  runConsultationViewer,
} from '@hexagram/casting-ui'

type Style = typeof BOLD_GREY | typeof BOLD_WHITE | typeof NORMAL

function welcomeOutput(
  strings: TemplateStringsArray,
  prologueStyle: Style,
  textStyle: Style,
  epilogueStyle: Style,
): string {
  const nonEmpty: string[] = []
  for (const part of strings) {
    const trimmed = part.trim()
    if (trimmed) nonEmpty.push(trimmed)
  }
  const [prologue, text, epilogue] = nonEmpty

  return `
${prologueStyle}${prologue}${NORMAL}

${textStyle}${text}${NORMAL}

${epilogueStyle}${epilogue}${NORMAL}
  `.trim()
}

async function main(): Promise<void> {
  try {
    if (resolveOutputMode() === 'plain') {
      // Plain mode keeps the Inquirer-driven terminal flow: gather the
      // query and 18 splits at the prompt, then print + save the formatted
      // reading. The welcome banner is plain-only — in Ink mode the
      // alternate-screen viewer takes over stdout immediately.
      console.info(welcomeOutput`
        ${BOLD_GREY}Welcome to the Interactive Yijing Yarrow Stalk Oracle
        ${NORMAL}Divide the stalks 18 times, 3 times per line to get 6 lines to form a hexagram.
        ${BOLD_WHITE}Let your instinct guide the division of the stalks.
      `)

      const { query, hexagram, casting } = await getHexagramViaInteraction()
      await logAndSaveConsultationOutput(query, hexagram, casting)
    } else {
      // Ink mode hands the entire flow to the viewer — query box and the
      // 18 split prompts live inside the Casting tab.
      await runConsultationViewer({
        flowKind: 'interactive',
        inputMode: resolveInputMode(),
        maxWrapWidth: resolveWrapWidth(),
        sliderSweepMs: resolveSliderSweepMs(),
      })
    }

    process.exit(0)
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'ExitPromptError' &&
      error.message.startsWith('User has exited the prompt')
    ) {
      process.exit(0)
    }

    console.error('An error occurred:', error)
    process.exit(1)
  }
}

await main()
