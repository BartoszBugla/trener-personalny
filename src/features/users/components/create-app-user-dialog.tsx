import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { useMessage } from '#/i18n/use-locale'
import { createAppUserSchema } from '#/shared/users/users.dto'
import { useCreateAppUser } from '../users.queries'

/** "Add user" – a person who can sign in (name + sign-in email). */
export function CreateAppUserDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t('users.app.add')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.app.addTitle')}</DialogTitle>
          <DialogDescription>{t('users.app.addDescription')}</DialogDescription>
        </DialogHeader>
        {open && <CreateAppUserForm onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CreateAppUserForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const message = useMessage()
  const create = useCreateAppUser()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isTrainer, setIsTrainer] = useState(false)
  const [errors, setErrors] = useState<
    Partial<Record<'name' | 'email', string>>
  >({})

  const submit = async () => {
    const parsed = createAppUserSchema.safeParse({ name, email, isTrainer })
    if (!parsed.success) {
      const next: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field === 'name' || field === 'email') {
          next[field] ??= String(message(issue.message))
        }
      }
      setErrors(next)
      return
    }
    setErrors({})
    await create.mutateAsync(parsed.data)
    onDone()
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void submit().catch(() => undefined)
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="app-user-name">{t('users.fields.name')}</Label>
        <Input
          id="app-user-name"
          placeholder="Anna Nowak"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="app-user-email">{t('users.app.loginEmail')}</Label>
        <Input
          id="app-user-email"
          type="email"
          autoComplete="off"
          placeholder="anna@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email ? (
          <p className="text-destructive text-sm">{errors.email}</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            {t('users.app.loginEmailHint')}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="app-user-trainer"
          checked={isTrainer}
          onCheckedChange={setIsTrainer}
        />
        <Label htmlFor="app-user-trainer">{t('users.fields.isTrainer')}</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? t('common.saving') : t('users.app.add')}
        </Button>
      </DialogFooter>
    </form>
  )
}
