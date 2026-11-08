import { useTranslation } from 'react-i18next'

import { BrandMark } from './app-sidebar'
import { LanguageSwitcher } from './language-switcher'
import { ThemeToggle } from './theme-toggle'

/**
 * Header for signed-out pages (login): brand, language and theme only.
 * Signed-in pages use the sidebar (`app-sidebar.tsx`).
 */
export function SiteHeader() {
  const { t } = useTranslation()

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="container mx-auto flex h-14 items-center gap-6 px-4">
        <span className="flex items-center gap-2 font-semibold">
          <BrandMark />
          {t('common.appName')}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
