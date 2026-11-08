/**
 * Loads `page` via `fetch(offset, limit)`. A page past the end (filters shrank
 * the result, stale URL) falls back to the last page.
 */
export async function loadPage<T>(
  page: number,
  pageSize: number,
  fetch: (
    offset: number,
    limit: number,
  ) => Promise<{
    rows: Array<T>
    total: number
  }>,
): Promise<{ rows: Array<T>; total: number; page: number; pageCount: number }> {
  let result = await fetch((page - 1) * pageSize, pageSize)
  const pageCount = Math.max(1, Math.ceil(result.total / pageSize))
  if (page > pageCount) {
    page = pageCount
    result = await fetch((page - 1) * pageSize, pageSize)
  }
  return { ...result, page, pageCount }
}
