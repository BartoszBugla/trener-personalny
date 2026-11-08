/** Today as local `YYYY-MM-DD` (for date inputs). */
export const todayLocal = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(
    new Date(),
  )
