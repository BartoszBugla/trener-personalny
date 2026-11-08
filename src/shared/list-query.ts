import { z } from 'zod'

/** Shared building blocks of paginated, sortable list queries. */
export const PAGE_SIZES = [25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 50

export type SortDirection = 'asc' | 'desc'

/*
 * List queries double as route search params, so every field tolerates
 * garbage in the URL (`catch`) instead of failing.
 */
export const pageSchema = z.coerce.number().int().min(1).default(1).catch(1)

export const pageSizeSchema = z.coerce
  .number()
  .refine((n) => (PAGE_SIZES as ReadonlyArray<number>).includes(n))
  .default(DEFAULT_PAGE_SIZE)
  .catch(DEFAULT_PAGE_SIZE)

export const searchTextSchema = z
  .string()
  .trim()
  .max(100)
  .optional()
  .catch(undefined)

export const sortDirectionSchema = (fallback: SortDirection) =>
  z.enum(['asc', 'desc']).default(fallback).catch(fallback)

/** One page of a list. */
export interface Page<T> {
  items: Array<T>
  /** Items matching the filters (all pages). */
  total: number
  page: number
  pageSize: number
  pageCount: number
}
