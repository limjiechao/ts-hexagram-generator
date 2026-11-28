// Linted as overhaul/application/src/application-imports-presentation.ts

// Twin for B6: application may import presentation, whose Typst export use
// case 9 returns (R-105, R-548).
import { typstExport } from '@hexagram/presentation/typst-export'

export const renderExport = typstExport
