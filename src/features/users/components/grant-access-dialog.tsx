import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useMessage } from '#/i18n/use-locale'
import { grantAccessSchema } from '#/shared/users/users.dto'
import type { User } from '#/shared/users/users.dto'
import { useGrantAccess } from '../users.queries'

/**
 * Gives a client (or a trainer without an account) access to the app. The
 * sign-in email is required.
 */
export function GrantAccessDialog({
  user,
  onOpenChange,
}: {
  user: User | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {user && (
          <GrantAccessForm
            key={user.id}
            user={user}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function GrantAccessForm({ user, onDone }: { user: User; onDone: () => void }) {
  const { t } = useTranslation()
  const message = useMessage()
  const grant = useGrantAccess()
  const [email, setEmail] = useState(user.email ?? '')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const parsed = grantAccessSchema.safeParse({ id: user.id, email })
    if (!parsed.success) {
      setError(String(message(parsed.error.issues[0]?.message ?? '')))
      return
    }
    setError(null)
    await grant.mutateAsync(parsed.data)
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
      <DialogHeader>
        <DialogTitle>{t('users.grant.title')}</DialogTitle>
        <DialogDescription>
          <Trans
            i18nKey="users.grant.description"
            values={{ name: user.name }}
            components={{ strong: <strong /> }}
          />
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-1">
        <Label htmlFor="grant-email">{t('users.app.loginEmail')}</Label>
        <Input
          id="grant-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
        />
        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            {t('users.app.loginEmailHint')}
          </p>
        )}
      </div>
      <Alert>
        <AlertTriangle />
        <AlertDescription>{t('users.grant.noRoles')}</AlertDescription>
      </Alert>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={grant.isPending}>
          {grant.isPending ? t('common.saving') : t('users.grant.submit')}
        </Button>
      </DialogFooter>
    </form>
  )
}
