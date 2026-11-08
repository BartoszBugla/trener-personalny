import 'i18next'

import type { en } from './locales/en'

/** Type-safe translation keys: `t('billing.title')` is checked against `en`. */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof en }
    returnNull: false
  }
}
