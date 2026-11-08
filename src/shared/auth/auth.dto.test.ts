import { describe, expect, it } from 'vitest'

import { safeRedirectPath } from './auth.dto'

describe('safeRedirectPath', () => {
  it.each([
    ['/trainings?page=2', '/trainings?page=2'],
    ['/billing', '/billing'],
    ['//evil.com', '/'],
    ['/\\evil.com', '/'],
    ['https://evil.com', '/'],
    ['/login?redirect=/x', '/'],
    [undefined, '/'],
    [42, '/'],
  ])('%s -> %s', (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected)
  })
})
