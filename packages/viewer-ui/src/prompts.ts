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
