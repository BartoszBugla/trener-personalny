import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { CreateUserForm } from './create-user-form'

/** "Add client" button opening the create form in a modal (no account). */
export function CreateUserDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t('users.clients.add')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.clients.addTitle')}</DialogTitle>
          <DialogDescription>
            {t('users.clients.addDescription')}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the form starts empty every time. */}
        {open && (
          <CreateUserForm
            layout="stacked"
            showTrainerToggle={false}
            submitLabel={t('users.clients.add')}
            onCreated={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
