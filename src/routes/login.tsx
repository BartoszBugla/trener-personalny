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
    <div className="flex flex-col items-center gap-4 pt-8 sm:pt-16">
      <p data-testid="ci-cd-test" className="text-sm text-muted-foreground">
        CI/CD test marker 7f3a91
      </p>
      <LoginCard
        onSignedIn={() =>
          // Root beforeLoad re-reads the session cookie on this navigation.
          router.navigate({ href: safeRedirectPath(redirect), replace: true })
        }
      />
    </div>
  )
}
