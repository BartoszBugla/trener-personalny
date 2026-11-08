/**
 * Canonical form of a person's name used for matching:
 * lower-case, no diacritics ("Zieliński" == "Zielinski"), single spaces.
 * Isomorphic – used by the importer and by the UI (candidate suggestions).
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
