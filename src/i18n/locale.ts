import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie, getRequestHeader } from '@tanstack/react-start/server'

import { LOCALE_COOKIE, resolveLocale } from './config'
import type { Locale } from './config'

/**
 * Current UI language. On the server: from the request (cookie, then
 * Accept-Language). In the browser: from the cookie, then navigator languages.
 */
export const getLocale = createIsomorphicFn()
  .server((): Locale =>
    resolveLocale(
      getCookie(LOCALE_COOKIE),
      getRequestHeader('accept-language'),
    ),
  )
  .client((): Locale => {
    const cookie = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${LOCALE_COOKIE}=`))
      ?.split('=')[1]
    return resolveLocale(cookie, navigator.languages.join(','))
  })

/** Persists the user's choice for a year. */
export function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
}
