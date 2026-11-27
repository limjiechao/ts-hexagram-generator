# Typst spike for M-016 (R-376)

Ephemeral: the findings of the throwaway spike the owner started on
2026-11-27. M-016's rulings decide; this records what the spike measured. It
ran on macOS arm64 with Node 24, in a scratch folder outside the repository,
using an invented three-page Consultation. "Inferred" marks anything not run.

## Packages compared

| | `typst` CLI 0.15.1, spawned | `@myriaddreamin/typst-ts-node-compiler` 0.7.0 (native napi) | `@myriaddreamin/typst.ts` + `typst-ts-web-compiler` 0.7.0 (WebAssembly) |
|---|---|---|---|
| Install | a system binary on every runner | 45–52 MB per platform | 28 MB wasm + 1.7 MB |
| Typst inside | 0.15.1 | 0.14.2 | 0.14.2 |
| Licence | Apache-2.0 | Apache-2.0 | Apache-2.0 |
| Maintainers | the Typst team | one | one |
| System fonts | opt out with `--ignore-system-fonts` | always loaded | never seen |
| Fits R-347 (WebAssembly) | no | no | yes |

The WebAssembly package fetches fonts from a CDN unless
`disableDefaultFontAssets()` is passed. Pass the module as
`{ module_or_path: bytes }`, or it warns about deprecated parameters.

## Fonts

- Noto Serif CJK TC, the full OTF (24.5 MB, OFL), covers every CJK character
  tested. Set with `region: "cn"`, it gives Simplified glyph forms, so one
  file serves both scripts. The TC subset misses Simplified characters.
- No CJK font has the 64 hexagram symbols U+4DC0–U+4DFF. Noto Sans Symbols 2
  (0.67 MB, OFL) does.
- A Latin face is also needed, for example Libertinus Serif (1.2 MB, OFL).
  That makes about 26.4 MB in all.
- System fonts differ by machine. Only the WebAssembly package keeps output
  identical everywhere.
- Typst does not warn about a missing glyph. A test of font coverage over the
  Catalogue's character set would catch a regression.

## Time and size (three pages)

| | Cold process | Warm | PDF |
|---|---|---|---|
| CLI, bundled fonts | 36 ms | n/a | 90 KB |
| napi | 80 ms | ~6 ms | 99.7 KB |
| WebAssembly | 371 ms (447 MB RSS) | 14–18 ms | 99.7 KB |

At 100 Consultations (300 pages), the WebAssembly package took 1.15 s and the
CLI 0.29 s.

## Determinism

- By default, every option stamps the current time into the PDF.
- `#set document(date: none)`, or a fixed date in the template, makes the
  bytes identical across processes. The WebAssembly API has no timestamp
  option, so the template must set the date.
- The napi and WebAssembly packages produce identical bytes from the same
  source and fonts.
- Identical bytes across operating systems are inferred, not tested.

## Recommendation (the spike's, not a ruling)

Use the WebAssembly package, pinned at 0.7.0, with bundled Noto Serif CJK TC,
Noto Sans Symbols 2 and an OFL Latin face. Its risks: a 28 MB dependency, a
single maintainer, Typst a version behind upstream, and speed and memory.

Questions open for M-016:

- How to ship the fonts: in git, possibly with LFS; as a pinned download; or
  as a package.
- Byte fixtures are committed, so they carry only invented or Legge text
  (ADR-0028).
- The template imports no `@preview` packages.
- Whether the Query goes into the PDF's title metadata.
