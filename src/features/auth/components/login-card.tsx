import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { useMessage } from '#/i18n/use-locale'
import type * as FirebaseClientModule from '#/lib/firebase/client'
import { missingFirebaseEnv } from '#/lib/firebase/config'
import { signIn } from '../auth.functions'
import { firebaseErrorKey, isSilentFirebaseError } from '../firebase-errors'
import { GoogleIcon } from './google-icon'

/** The lazily loaded Firebase client module. */
type FirebaseClient = typeof FirebaseClientModule

type Pending = 'google' | 'password' | 'reset' | null

/** Google sign-in + email/password form with "forgot password". */
export function LoginCard({ onSignedIn }: { onSignedIn: () => unknown }) {
  const { t } = useTranslation()
  const message = useMessage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState<Pending>(null)
  const [error, setError] = useState<string | null>(null)

  /** Firebase errors -> our copy; server errors arrive translated. */
  const describe = (err: unknown) => {
    const key = firebaseErrorKey(err)
    if (key) return String(message(key))
    return err instanceof Error && err.message
      ? err.message
      : t('auth.errors.generic')
  }

  const run = async (kind: Exclude<Pending, null>, action: () => unknown) => {
    setPending(kind)
    setError(null)
    try {
      await action()
    } catch (err) {
      if (!isSilentFirebaseError(err)) setError(describe(err))
    } finally {
      setPending(null)
    }
  }

  /** Firebase sign-in on the client, then the server issues the session. */
  const signInWith = (
    kind: 'google' | 'password',
    getIdToken: (client: FirebaseClient) => Promise<string>,
  ) =>
    run(kind, async () => {
      const client = await import('#/lib/firebase/client')
      const idToken = await getIdToken(client)
      await signIn({ data: { idToken } })
      await onSignedIn()
    })

  const resetPassword = () =>
    run('reset', async () => {
      if (!email.trim()) {
        setError(t('auth.errors.emailForReset'))
        return
      }
      const { sendPasswordReset } = await import('#/lib/firebase/client')
      try {
        await sendPasswordReset(email.trim())
      } catch (err) {
        // Don't reveal whether an account exists for this address.
        if (firebaseErrorKey(err) !== 'auth.errors.userNotFound') throw err
      }
      toast.success(t('auth.resetSent', { email: email.trim() }))
    })

  if (missingFirebaseEnv.length > 0) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>{t('auth.notConfigured.title')}</AlertTitle>
            <AlertDescription>
              <p>{t('auth.notConfigured.description')}</p>
              <ul className="mt-2 list-disc pl-5 font-mono text-xs">
                {missingFirebaseEnv.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const busy = pending !== null

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.title')}</CardTitle>
        <CardDescription>{t('auth.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={() =>
            void signInWith('google', (client) => client.signInWithGoogle())
          }
        >
          {pending === 'google' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleIcon className="size-4" />
          )}
          {t('auth.google')}
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs uppercase">
            {t('auth.or')}
          </span>
          <Separator className="flex-1" />
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void signInWith('password', (client) =>
              client.signInWithPassword(email.trim(), password),
            )
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="login-email">{t('auth.email')}</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">{t('auth.password')}</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                disabled={busy}
                onClick={() => void resetPassword()}
              >
                {t('auth.forgotPassword')}
              </Button>
            </div>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {pending === 'password' && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {t('auth.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
