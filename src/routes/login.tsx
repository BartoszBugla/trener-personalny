import { createFileRoute, useRouter } from '@tanstack/react-router'
import { z } from 'zod'

import { LoginCard } from '#/features/auth/components/login-card'
import { safeRedirectPath } from '#/shared/auth/auth.dto'
import { pageTitle } from './__root'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    /** Where to go after signing in (same-site path). */
    redirect: z.string().optional().catch(undefined),
  }),
  head: ({ match }) => ({
    meta: [{ title: pageTitle(match.context.locale, 'auth.title') }],
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  const router = useRouter()

  return (
    <div className="flex justify-center pt-8 sm:pt-16">
      <LoginCard
        onSignedIn={() =>
          // Root beforeLoad re-reads the session cookie on this navigation.
          router.navigate({ href: safeRedirectPath(redirect), replace: true })
        }
      />
    </div>
  )
}
