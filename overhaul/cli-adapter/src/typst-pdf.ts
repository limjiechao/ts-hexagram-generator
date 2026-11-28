import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { typstFontFamilies } from '@hexagram/presentation/typst-export'
import type { TypstFontResolverBuilder } from '@myriaddreamin/typst-ts-web-compiler'

/*
 * The PDF side of `hexagram-history --export` (use case 9): Typst source
 * compiled in process by Typst's WebAssembly build, with the export's own
 * fonts and nothing else, so the same source gives the same bytes on every
 * machine. It fetches nothing and reads no system font.
 */

/**
 * Compiles one Typst source to the bytes of a PDF. It rejects with an
 * `ExportFontsError` when a font cannot be loaded, and with a
 * `TypstCompileError` when Typst refuses the source; either way nothing is
 * written anywhere.
 */
export type CompilePdf = (typst: string) => Promise<Uint8Array>

/** One of the export's font files and the family the template names it by. */
export interface ExportFontFile {
  /** Its file name under the font folder. */
  readonly file: string
  readonly family: (typeof typstFontFamilies)[number]
}

/**
 * The export's font files. Every family in `typstFontFamilies` has at least
 * one file here, and no file has another family. The files are committed
 * through Git LFS with their OFL licence texts beside them.
 */
export const exportFontFiles: readonly ExportFontFile[] = [
  { file: 'LibertinusSerif-Regular.otf', family: 'Libertinus Serif' },
  { file: 'LibertinusSerif-Bold.otf', family: 'Libertinus Serif' },
  { file: 'LibertinusSerif-Italic.otf', family: 'Libertinus Serif' },
  { file: 'NotoSerifCJKtc-Regular.otf', family: 'Noto Serif CJK TC' },
  { file: 'NotoSansSymbols2-Regular.ttf', family: 'Noto Sans Symbols 2' },
]

/**
 * The export's font folder, `overhaul/cli-adapter/fonts/`, found from this
 * module's own location as the Journal's folder is, never from the working
 * folder.
 */
export function exportFontFolder(moduleUrl: string = import.meta.url): string {
  return path.resolve(path.dirname(fileURLToPath(moduleUrl)), '..', 'fonts')
}

/** A font the export needs could not be loaded, so no PDF is made. */
export class ExportFontsError extends Error {
  override readonly name = 'ExportFontsError'
  /** The font's file name, as `exportFontFiles` gives it. */
  readonly file: string
  /**
   * `missing` when no file holds the name; `not-a-font` when the file does
   * not begin as an OpenType or TrueType font does, which is how a Git LFS
   * pointer left by a clone without LFS reads; `unreadable` when the file
   * is there but cannot be read, or begins as a font does but Typst takes
   * no font face from it.
   */
  readonly reason: 'missing' | 'not-a-font' | 'unreadable'

  constructor(
    file: string,
    reason: 'missing' | 'not-a-font' | 'unreadable',
    cause?: unknown,
  ) {
    super(`the export's font ${file} cannot be loaded`, { cause })
    this.file = file
    this.reason = reason
  }
}

/** Typst refused the source; its diagnostics are kept as given. */
export class TypstCompileError extends Error {
  override readonly name = 'TypstCompileError'
  readonly diagnostics: readonly string[]

  constructor(diagnostics: readonly string[]) {
    super('Typst could not compile the export')
    this.diagnostics = diagnostics
  }
}

/**
 * The real compiler, on `@myriaddreamin/typst.ts` 0.7.0 and its WebAssembly
 * module `@myriaddreamin/typst-ts-web-compiler` 0.7.0, both pinned. On its
 * first call it loads the module's bytes, then every file of
 * `exportFontFiles` from `fontFolder`, with the default font assets turned
 * off so it fetches nothing; later calls reuse that compiler. Each call
 * compiles the source alone as the main file, with no other file and no
 * package, and returns the PDF's bytes, which begin `%PDF-`.
 */
export function typstPdfCompiler(fontFolder: string): CompilePdf {
  let ready: Promise<CompilePdf> | undefined
  return async (typst) => {
    ready ??= loadedCompiler(fontFolder).catch((error: unknown) => {
      // A failed load is not kept, so a later call tries again.
      ready = undefined
      throw error
    })
    const compile = await ready
    return compile(typst)
  }
}

/** How an OpenType (`OTTO`) or TrueType (`0x00010000`, `true`) font begins. */
const fontHeads: ReadonlySet<string> = new Set([
  'OTTO',
  '\u0000\u0001\u0000\u0000',
  'true',
])

/**
 * Every file of `exportFontFiles` from `fontFolder`, checked, in order. The
 * first that cannot be loaded rejects with its `ExportFontsError`.
 */
async function exportFonts(
  fontFolder: string,
): Promise<{ readonly file: string; readonly bytes: Uint8Array }[]> {
  const fonts: { readonly file: string; readonly bytes: Uint8Array }[] = []
  for (const { file } of exportFontFiles) {
    let bytes: Uint8Array
    try {
      bytes = await readFile(path.join(fontFolder, file))
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error ? error.code : undefined
      const reason =
        code === 'ENOENT' || code === 'ENOTDIR' ? 'missing' : 'unreadable'
      throw new ExportFontsError(file, reason, error)
    }
    const head = new TextDecoder('latin1').decode(bytes.subarray(0, 4))
    if (!fontHeads.has(head)) throw new ExportFontsError(file, 'not-a-font')
    fonts.push({ file, bytes })
  }
  return fonts
}

/**
 * A Typst compiler over the export's fonts alone. The fonts are read and
 * checked before the WebAssembly build is imported, so a missing font
 * costs nothing more.
 */
async function loadedCompiler(fontFolder: string): Promise<CompilePdf> {
  const fonts = await exportFonts(fontFolder)
  const [typst, { createTypstCompiler, CompileFormatEnum }, wrapper] =
    await Promise.all([
      import('@myriaddreamin/typst.ts'),
      import('@myriaddreamin/typst.ts/compiler'),
      import('@myriaddreamin/typst-ts-web-compiler'),
    ])
  const compiler = createTypstCompiler()
  await compiler.init({
    // The pinned WebAssembly module, which reads its own `.wasm` file from
    // beside itself when initialised.
    getWrapper: () => Promise.resolve(wrapper),
    beforeBuild: [
      typst.initOptions.disableDefaultFontAssets(),
      typst.loadFonts(fonts.map(({ bytes }) => bytes)),
    ],
  })
  // Typst drops a font it cannot parse without a word, and would set the
  // text in another face; asking its own parser for each file's faces
  // finds the one it dropped.
  const faces = new wrapper.TypstFontResolverBuilder()
  try {
    for (const { file, bytes } of fonts) {
      if (!holdsFace(faces, bytes))
        throw new ExportFontsError(file, 'unreadable')
    }
  } finally {
    faces.free()
  }
  // The source is the only file Typst is given, under this one path.
  const mainFilePath = '/main.typ'
  return async (source) => {
    compiler.addSource(mainFilePath, source)
    const { result, diagnostics } = await compiler.compile({
      mainFilePath,
      format: CompileFormatEnum.pdf,
      diagnostics: 'unix',
    })
    if (result === undefined) throw new TypstCompileError(diagnostics ?? [])
    return result
  }
}

/**
 * Whether Typst's font parser finds at least one face in `bytes`: it
 * answers `{ info: [...] }`, one entry for each face it takes.
 */
function holdsFace(
  faces: TypstFontResolverBuilder,
  bytes: Uint8Array,
): boolean {
  let found: unknown
  try {
    found = faces.get_font_info(bytes)
  } catch {
    return false
  }
  return (
    typeof found === 'object' &&
    found !== null &&
    'info' in found &&
    Array.isArray(found.info) &&
    found.info.length > 0
  )
}
