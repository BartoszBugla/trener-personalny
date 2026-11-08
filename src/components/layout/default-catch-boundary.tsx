import { Link, useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'

export function DefaultCatchBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-xl space-y-4 py-16">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{t('errorPage.title')}</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : String(error)}
        </AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            reset()
            void router.invalidate()
          }}
        >
          {t('errorPage.tryAgain')}
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">{t('nav.home')}</Link>
        </Button>
      </div>
    </div>
  )
}

export function NotFound({ message }: { message?: string }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">
        {message ?? t('notFound.message')}
      </p>
      <Button variant="outline" asChild>
        <Link to="/">{t('notFound.goHome')}</Link>
      </Button>
    </div>
  )
}
