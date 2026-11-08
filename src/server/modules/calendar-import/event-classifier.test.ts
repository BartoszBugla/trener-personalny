import { describe, expect, it } from 'vitest'

import { classifyEvent, extractClientName } from './event-classifier'

const event = (summary: string, overrides = {}) => ({
  summary,
  status: 'CONFIRMED',
  isAllDay: false,
  ...overrides,
})

describe('extractClientName', () => {
  it.each([
    ['Piotr Zielinski', 'Piotr Zielinski'],
    ['PT – Tomasz Wójcik', 'Tomasz Wójcik'],
    ['ODWOŁANY – Tomasz Wójcik', 'Tomasz Wójcik'],
    ['Ewa – trening', 'Ewa'],
    ['Zofia Mazur (Ola)', 'Zofia Mazur'],
    ['PT: Jan Kowalski', 'Jan Kowalski'],
    ['Anna-Maria Nowak', 'Anna-Maria Nowak'],
    ['Ania', 'Ania'],
    ['Ola – treningi personalne', 'Ola'],
    ['trening', null],
    ['Dawid nowy', 'Dawid'],
    ['Andrzej Nowak nowy', 'Andrzej Nowak'],
    ['Rafał Latała!', 'Rafał Latała'],
    ['Tata Janka *rafał', 'Tata Janka'],
    ['Oliwia Kłosowska *prowadziła Agnieszka', 'Oliwia Kłosowska'],
    ['Kacper Kopeć - Praca ', 'Kacper Kopeć'],
  ])('%s -> %s', (summary, expected) => {
    expect(extractClientName(summary)).toBe(expected)
  })
})

describe('classifyEvent', () => {
  it('treats a plain name as a confirmed training', () => {
    expect(classifyEvent(event('Marek Lewandowski'))).toEqual({
      kind: 'training',
      status: 'confirmed',
      clientName: 'Marek Lewandowski',
    })
  })

  it('skips all-day events', () => {
    expect(classifyEvent(event('Urlop', { isAllDay: true }))).toEqual({
      kind: 'skip',
      reason: 'all-day',
    })
  })

  it.each([
    'Urlop',
    'Spotkanie zespołu',
    'Szkolenie BHP',
    'WOLNE',
    'Wolne/Surma/Prad',
    'Opłata za Prąd + Mieszkanie',
    'Licznik Tauron',
    'Faktury + podliczenia',
    'Basen',
  ])('skips non-training "%s"', (summary) => {
    expect(classifyEvent(event(summary))).toEqual({
      kind: 'skip',
      reason: 'non-training',
    })
  })

  it('marks STATUS:CANCELLED as cancelled', () => {
    expect(
      classifyEvent(event('Anna Nowak', { status: 'CANCELLED' })),
    ).toMatchObject({ kind: 'training', status: 'cancelled' })
  })

  it('marks "ODWOŁANY –" titles as cancelled even if CONFIRMED', () => {
    expect(classifyEvent(event('ODWOŁANY – Tomasz Wójcik'))).toEqual({
      kind: 'training',
      status: 'cancelled',
      clientName: 'Tomasz Wójcik',
    })
  })
})
