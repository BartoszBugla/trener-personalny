import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { LOCALES, isLocale } from '#/i18n/config'
import { useLocale } from '#/i18n/use-locale'

export function LanguageSwitcher({
  align = 'end',
}: {
  align?: 'start' | 'end'
}) {
  const { t } = useTranslation()
  const { locale, setLocale } = useLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t('language.label')}>
          <Languages className="size-4" />
          <span className="uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => isLocale(value) && setLocale(value)}
        >
          {LOCALES.map((l) => (
            <DropdownMenuRadioItem key={l} value={l}>
              {t(`language.${l}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
