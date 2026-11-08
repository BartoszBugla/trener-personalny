import { useRouter } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, looseT } from './config'
import type { Locale } from './config'
import { persistLocale } from './locale'

const TIME_ZONE = 'Europe/Warsaw'

/** Translates a runtime string that may be a key (e.g. zod validation message). */
export function useMessage() {
  const { i18n } = useTranslation()
  return useMemo(() => looseT(i18n), [i18n])
}

/** Current language + switcher. Switching re-runs route loaders/head(). */
export function useLocale() {
  const { i18n } = useTranslation()
  const router = useRouter()
  const locale: Locale = isLocale(i18n.language)
    ? i18n.language
    : DEFAULT_LOCALE

  const setLocale = (next: Locale) => {
    persistLocale(next)
    void router.invalidate()
  }

  return { locale, setLocale }
}

/** Locale-aware date formatters (business time zone). */
export function useFormatters() {
  const { locale } = useLocale()
  return useMemo(() => createFormatters(locale), [locale])
}

export function createFormatters(locale: Locale) {
  const tag = INTL_LOCALE[locale]
  const date = new Intl.DateTimeFormat(tag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIME_ZONE,
  })
  const weekdayDate = new Intl.DateTimeFormat(tag, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIME_ZONE,
  })
  const time = new Intl.DateTimeFormat(tag, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  })
  const dateTime = new Intl.DateTimeFormat(tag, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  })
  const month = new Intl.DateTimeFormat(tag, {
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  })
  const shortPlainDate = new Intl.DateTimeFormat(tag, {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  })
  const percent = new Intl.NumberFormat(tag, {
    style: 'percent',
    maximumFractionDigits: 0,
  })
  const signed = new Intl.NumberFormat(tag, {
    signDisplay: 'exceptZero',
    maximumFractionDigits: 1,
  })
  const plainDate = new Intl.DateTimeFormat(tag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return {
    /** ISO instant -> "05.05.2026" / "05/05/2026". */
    date: (iso: string | Date) => date.format(new Date(iso)),
    weekdayDate: (iso: string | Date) => weekdayDate.format(new Date(iso)),
    time: (iso: string | Date) => time.format(new Date(iso)),
    dateTime: (iso: string | Date) => dateTime.format(new Date(iso)),
    /** ISO instant -> "październik 2026" / "October 2026". */
    month: (iso: string | Date) => month.format(new Date(iso)),
    /** Local `YYYY-MM-DD` (no time zone) -> formatted date. */
    localDate: (value: string) =>
      plainDate.format(new Date(`${value}T00:00:00Z`)),
    /** Local `YYYY-MM-DD` -> "09.11" / "09/11". */
    shortLocalDate: (value: string) =>
      shortPlainDate.format(new Date(`${value}T00:00:00Z`)),
    /** 0.125 -> "13%". */
    percent: (value: number) => percent.format(value),
    /** 3 -> "+3", -1.5 -> "−1,5", 0 -> "0". */
    signed: (value: number) => signed.format(value),
  }
}
