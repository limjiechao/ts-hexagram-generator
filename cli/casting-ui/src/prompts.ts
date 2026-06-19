import { input } from '@inquirer/prompts'

/**
 * Inquirer-driven query prompt used by the plain-mode CLI (the Ink viewer
 * collects the query inside its `<QueryEditor>` instead). Lives here so the
 * sole `@inquirer/prompts` dependency the library imports is colocated with
 * the rest of the Inquirer-coupled flow, separate from the output renderers.
 */
export async function getUserQuery(): Promise<string> {
  return await input({
    message: 'Enter your query for the oracle.',
    required: true,
  })
}

/**
 * Whether `error` is the `ExitPromptError` Inquirer throws when the user
 * presses Ctrl+C at a prompt (rather than a real failure). Plain-mode bins
 * map this to a clean `exit(0)`. Single-homed here, beside the Inquirer
 * prompts that produce it, so the random and interactive bins can't drift on
 * what counts as a user-initiated quit.
 */
export function isUserExitPromptError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === 'ExitPromptError' &&
    error.message.startsWith('User has exited the prompt')
  )
}
