import type { typstFontFamilies } from '@hexagram/presentation/typst-export'

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
 * The export's font folder, `assets/fonts/` under the repository root,
 * found from this module's own location as the Journal's folder is, never
 * from the working folder.
 */
export function exportFontFolder(moduleUrl: string = import.meta.url): string {
  throw new Error('not built', { cause: { moduleUrl } })
}

/** A font the export needs could not be loaded, so no PDF is made. */
export class ExportFontsError extends Error {
  override readonly name = 'ExportFontsError'
  /** The font's file name, as `exportFontFiles` gives it. */
  readonly file: string
  /**
   * `missing` when no file holds the name; `not-a-font` when the file does
   * not begin as an OpenType or TrueType font does, which is how a Git LFS
   * pointer left by a clone without LFS reads.
   */
  readonly reason: 'missing' | 'not-a-font'

  constructor(file: string, reason: 'missing' | 'not-a-font', cause?: unknown) {
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
  throw new Error('not built', { cause: { fontFolder } })
}
