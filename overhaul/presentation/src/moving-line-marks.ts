/**
 * The text mark of a Moving Line, by its Line Value: ○ for Old Yang 9, ✕
 * for Old Yin 6. Every renderer marks a Moving Line with it as well as
 * drawing it, so the meaning survives without colour (ADR-0044) and in
 * print.
 */
export const movingLineMarks = { 9: '○', 6: '✕' } as const
