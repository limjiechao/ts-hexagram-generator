// The CJK-aware column helpers moved to @hexagram/text-layout (a leaf domain
// package) so domain packages can share them without importing a cli package.
// This shim re-exports them so existing relative `./layout-utils.js` importers
// in this package stay unchanged.
export {
  centerVisual,
  padStartVisual,
  padToColumn,
  visualWidth,
} from '@hexagram/text-layout'
