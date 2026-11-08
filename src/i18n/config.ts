import i18next from 'i18next'
import type { i18n as I18n, TOptions } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { en } from './locales/en'
import { pl } from './locales/pl'

export const LOCALES = ['pl', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'pl'
export const LOCALE_COOKIE = 'locale'

/** BCP 47 tags used for `Intl` date/number formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  pl: 'pl-PL',
  en: 'en-GB',
}

export const resources = {
  en: { translation: en },
  pl: { translation: pl },
} as const

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale)
}

/**
 * Picks the UI language: explicit choice (cookie) first, then the browser's
 * `Accept-Language`, then the default.
 */
export function resolveLocale(
  cookie: string | undefined | null,
  acceptLanguage: string | undefined | null,
): Locale {
  if (isLocale(cookie)) return cookie
  for (const part of (acceptLanguage ?? '').split(',')) {
    const tag = part.split(';')[0].trim().slice(0, 2).toLowerCase()
    if (isLocale(tag)) return tag
  }
  return DEFAULT_LOCALE
}

/**
 * One immutable i18next instance per language. Switching language swaps the
 * instance instead of mutating a shared one, so concurrent SSR requests in
 * different languages can't interfere.
 */
const instances = new Map<Locale, I18n>()

export function getI18n(locale: Locale): I18n {
  let instance = instances.get(locale)
  if (!instance) {
    instance = i18next.createInstance()
    void instance.use(initReactI18next).init({
      lng: locale,
      fallbackLng: 'en',
      resources,
      initAsync: false,
      interpolation: { escapeValue: false },
      returnNull: false,
    })
    instances.set(locale, instance)
  }
  return instance
}

/** Translate outside React (route `head()`, server error messages). */
export function translate(
  locale: Locale,
  key: string,
  options?: TOptions,
): string {
  return looseT(getI18n(locale))(key, options)
}

/**
 * `t` for keys only known at runtime (validation messages, error keys).
 * Unknown keys fall back to the key itself.
 */
export function looseT(i18n: I18n) {
  const t = i18n.t as unknown as (key: string, options?: TOptions) => string
  return (key: string, options?: TOptions) =>
    t(key, { defaultValue: key, ...options })
}
