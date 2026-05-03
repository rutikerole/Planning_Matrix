export type SplitBoldPart = { text: string; bold: boolean }

/**
 * Split a string on `**bold**` markers into typed parts. Used by Q1's
 * decision-tree help body so we can render the bold spans without
 * pulling in a markdown parser.
 */
export function splitBold(s: string): SplitBoldPart[] {
  return s
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**')
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    )
}
