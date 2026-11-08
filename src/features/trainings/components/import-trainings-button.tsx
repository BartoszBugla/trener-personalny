import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import { useImportTrainings } from '../trainings.queries'

export function ImportTrainingsButton() {
  const importTrainings = useImportTrainings()
  const { t } = useTranslation()

  return (
    <Button
      onClick={() => importTrainings.mutate()}
      disabled={importTrainings.isPending}
    >
      <RefreshCw
        className={importTrainings.isPending ? 'size-4 animate-spin' : 'size-4'}
      />
      {importTrainings.isPending
        ? t('trainings.import.pending')
        : t('trainings.import.button')}
    </Button>
  )
}
