const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/**
 * Google Calendar descriptions may contain HTML (`<br>`, `<a>`, `<b>`…).
 * Rendered as plain text: line breaks kept, tags dropped, entities decoded.
 */
export function htmlToText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|[a-z]+);/gi, (match, entity: string) =>
      entity.startsWith('#')
        ? String.fromCodePoint(Number(entity.slice(1)))
        : (ENTITIES[entity.toLowerCase()] ?? match),
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
