import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  convertLegacyTxt,
  markdownConsultationBody,
  serializeFrontmatter,
} from '@hexagram/consultation'

export async function migrateLegacy(dir: string): Promise<void> {
  const entries = await fs.readdir(dir).catch(() => [])
  const legacyTxt = entries.filter(
    (n) => n.startsWith('consultation-') && n.endsWith('.txt'),
  )
  if (legacyTxt.length === 0) {
    process.stdout.write('No legacy .txt consultations to migrate.\n')
    return
  }
  const legacyDir = path.join(dir, 'legacy')
  await fs.mkdir(legacyDir, { recursive: true })
  let migrated = 0
  for (const name of legacyTxt) {
    const filePath = path.join(dir, name)
    const text = await fs.readFile(filePath, 'utf8')
    const filenameTimestamp = name
      .replace(/^consultation-/, '')
      .replace(/\.txt$/, '')
    const r = convertLegacyTxt({ text, filenameTimestamp })
    if (!r.ok) {
      process.stderr.write(`SKIP ${name}: ${r.reason}\n`)
      continue
    }
    const { castingRecovered, ...envelope } = r.envelope
    const body = markdownConsultationBody(
      envelope.query,
      envelope.hexagram,
      envelope.casting,
    )
    const md = serializeFrontmatter(envelope, body)
    const mdPath = filePath.replace(/\.txt$/, '.md')
    await fs.writeFile(mdPath, md, 'utf8')
    await fs.rename(filePath, path.join(legacyDir, name))
    process.stdout.write(
      `OK ${name} → ${path.basename(mdPath)}${castingRecovered ? '' : ' (casting unrecovered)'}\n`,
    )
    migrated += 1
  }
  process.stdout.write(
    `\nMigrated ${migrated} files. Originals preserved in ${legacyDir}.\n`,
  )
}
