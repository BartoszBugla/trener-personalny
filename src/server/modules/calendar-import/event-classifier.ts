import type { CalendarEvent } from './ics-parser'
import { normalizeName } from '#/shared/users/normalize-name'

export type EventClassification =
  | { kind: 'skip'; reason: 'all-day' | 'non-training' | 'empty' }
  | {
      kind: 'training'
      status: 'confirmed' | 'cancelled'
      /** Client name cleaned from the title, `null` if none could be found. */
      clientName: string | null
    }

/**
 * Titles starting with one of these (normalized) are not trainings: time off,
 * meetings and the errands/admin notes trainers keep in the same calendar.
 */
const NON_TRAINING_PREFIXES = [
  // time off / blocked time
  'urlop',
  'wolne',
  'przerwa',
  'blokada',
  'l4',
  'wyjazd',
  'urodziny',
  // meetings
  'spotkanie',
  'zebranie',
  'szkolenie',
  'meeting',
  'rada',
  // admin, bills, errands
  'faktura',
  'faktury',
  'fv',
  'rachunki',
  'rachunek',
  'oplata',
  'oplaty',
  'licznik',
  'zus',
  'urzad',
  'starostwo',
  'notariusz',
  'bank',
  'spoldzielnia',
  'wodociagi',
  'podliczenie',
  'podliczenia',
  'rozliczenie',
  'wypowiedzenie',
  'regulamin',
  'reklama',
  'marketing',
  'social media',
  'nagrywki',
  'sprzedaz',
  'wysylka',
  'odbior',
  'prezent',
  'paszport',
  'egzamin',
  'przeglad',
  'serwis',
  'fryzjer',
  'barber',
  'sprzatanie',
  'basen',
]

/** Title prefixes meaning the session was cancelled (STATUS may still be CONFIRMED). */
const CANCELLED_PREFIXES = [
  'odwolany',
  'odwolane',
  'odwolana',
  'anulowany',
  'anulowane',
  'cancelled',
  'canceled',
]

/** Title segments that carry no client information ("PT – X", "Ewa – trening"). */
const NOISE_SEGMENTS = new Set([
  'pt',
  'trening',
  'trening personalny',
  'sesja',
  'personal training',
  ...CANCELLED_PREFIXES,
])

/** Separators between title segments: "PT – Jan", "Jan - trening", "PT: Jan". */
const SEGMENT_SEPARATOR = /\s+[–—-]\s+|:\s*/

/** Trailing words marking a new client ("Dawid nowy") – not part of the name. */
const TRAILING_NOISE = /(\s+(nowy|nowa|nowe))+$/i

/**
 * Decides whether a calendar event is a training, whether it's cancelled, and
 * who the client is. Pure – no DB access.
 */
export function classifyEvent(
  event: Pick<CalendarEvent, 'summary' | 'status' | 'isAllDay'>,
): EventClassification {
  const normalizedTitle = normalizeName(event.summary)
  if (!normalizedTitle) return { kind: 'skip', reason: 'empty' }
  if (event.isAllDay) return { kind: 'skip', reason: 'all-day' }
  if (NON_TRAINING_PREFIXES.some((p) => startsWithWord(normalizedTitle, p))) {
    return { kind: 'skip', reason: 'non-training' }
  }

  const cancelled =
    event.status === 'CANCELLED' ||
    CANCELLED_PREFIXES.some((p) => startsWithWord(normalizedTitle, p))

  return {
    kind: 'training',
    status: cancelled ? 'cancelled' : 'confirmed',
    clientName: extractClientName(event.summary),
  }
}

/**
 * "PT – Tomasz Wójcik" -> "Tomasz Wójcik", "Ewa – trening" -> "Ewa",
 * "Zofia Mazur (Ola)" -> "Zofia Mazur", "ODWOŁANY – Tomasz Wójcik" -> "Tomasz Wójcik",
 * "Dawid nowy" -> "Dawid", "Tata Janka *rafał" -> "Tata Janka" (`*` starts a
 * note, e.g. who covered the session), "Rafał Latała!" -> "Rafał Latała".
 */
export function extractClientName(summary: string): string | null {
  const cleaned = summary
    .replace(/\*.*$/, ' ')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
  const segment = cleaned
    .split(SEGMENT_SEPARATOR)
    .map((s) =>
      s
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[\s!?.,;]+$/, '')
        .replace(TRAILING_NOISE, ''),
    )
    .find((s) => normalizeName(s) && !NOISE_SEGMENTS.has(normalizeName(s)))
  return segment ?? null
}

function startsWithWord(text: string, word: string): boolean {
  return text === word || text.startsWith(`${word} `)
}
