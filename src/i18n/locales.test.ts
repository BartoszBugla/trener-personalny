import { describe, expect, it } from 'vitest'

import { resolveLocale, translate } from './config'
import { en } from './locales/en'
import { pl } from './locales/pl'

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

/** Flattens nested messages to dot-separated keys. */
function flatten(obj: object, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'string') acc[path] = value
      else Object.assign(acc, flatten(value as object, path))
      return acc
    },
    {},
  )
}

const baseKeys = (messages: object) =>
  new Set(
    Object.keys(flatten(messages)).map((k) => k.replace(PLURAL_SUFFIX, '')),
  )

const placeholders = (text: string) =>
  [...text.matchAll(/\{\{(\w+)\}\}|<(\w+)>/g)].map((m) => m[1] ?? m[2]).sort()

describe('locale files', () => {
  it('have the same keys in English and Polish', () => {
    expect([...baseKeys(pl)].sort()).toEqual([...baseKeys(en)].sort())
  })

  it('define every Polish plural form', () => {
    const plKeys = Object.keys(flatten(pl))
    const plurals = new Set(
      plKeys
        .filter((k) => PLURAL_SUFFIX.test(k))
        .map((k) => k.replace(PLURAL_SUFFIX, '')),
    )
    const missing = [...plurals].flatMap((base) =>
      ['one', 'few', 'many', 'other']
        .map((form) => `${base}_${form}`)
        .filter((key) => !plKeys.includes(key)),
    )
    expect(missing).toEqual([])
  })

  it('use the same placeholders in both languages', () => {
    const plFlat = flatten(pl)
    const mismatches = Object.entries(flatten(en)).filter(([key, text]) => {
      const base = key.replace(PLURAL_SUFFIX, '')
      const plText =
        plFlat[key] ?? plFlat[`${base}_many`] ?? plFlat[`${base}_other`]
      const withoutCount = (t: string) =>
        placeholders(t)
          .filter((p) => p !== 'count')
          .join(',')
      return withoutCount(text) !== withoutCount(plText)
    })
    expect(mismatches.map(([key]) => key)).toEqual([])
  })
})

describe('translate', () => {
  it('applies Polish plural rules', () => {
    const t = (count: number) =>
      translate('pl', 'billing.periods.trainings', { count })
    expect([1, 2, 5, 22, 25].map(t)).toEqual([
      '1 trening',
      '2 treningi',
      '5 treningów',
      '22 treningi',
      '25 treningów',
    ])
    expect(translate('en', 'billing.periods.trainings', { count: 1 })).toBe(
      '1 training',
    )
  })
})

describe('resolveLocale', () => {
  it('prefers the cookie, then Accept-Language, then Polish', () => {
    expect(resolveLocale('en', 'pl-PL,pl;q=0.9')).toBe('en')
    expect(resolveLocale(undefined, 'en-US,en;q=0.9,pl;q=0.8')).toBe('en')
    expect(resolveLocale('de', 'fr-FR,de;q=0.9')).toBe('pl')
    expect(resolveLocale(null, null)).toBe('pl')
  })
})
