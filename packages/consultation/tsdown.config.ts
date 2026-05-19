import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/markdown.ts',
    './src/frontmatter.ts',
    './src/file.ts',
    './src/legacy-converter.ts',
  ],
  platform: 'node',
})
