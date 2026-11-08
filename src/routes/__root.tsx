import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  redirect,
} from '@tanstack/react-router'
import { I18nextProvider } from 'react-i18next'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ThemeProvider } from 'next-themes'
import type { QueryClient } from '@tanstack/react-query'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import appCss from '../styles.css?url'
import {
  DefaultCatchBoundary,
  NotFound,
} from '#/components/layout/default-catch-boundary'
import {
  AppSidebar,
  MobileTopBar,
  SIDEBAR_OFFSET_CLASS,
} from '#/components/layout/app-sidebar'
import { SiteHeader } from '#/components/layout/site-header'
import { Toaster } from '#/components/ui/sonner'
import { getSessionUser } from '#/features/auth/auth.functions'
import { TooltipProvider } from '#/components/ui/tooltip'
import { getI18n, translate } from '#/i18n/config'
import type { Locale } from '#/i18n/config'
import { getLocale } from '#/i18n/locale'
import { safeRedirectPath } from '#/shared/auth/auth.dto'

/** The only page reachable without signing in. */
const LOGIN_PATH = '/login'

export interface RouterContext {
  queryClient: QueryClient
}

/** `<title>` for a route: "Trainings · Personal Trainer". */
export function pageTitle(locale: Locale, key?: string, page?: string) {
  const app = translate(locale, 'common.appName')
  const name = page ?? (key ? translate(locale, key) : undefined)
  return name ? `${name} · ${app}` : app
}

export const Route = createRootRouteWithContext<RouterContext>()({
  /*
   * Runs on every navigation:
   * - language: per request (cookie / Accept-Language), re-resolved on
   *   `router.invalidate()` after switching,
   * - sign-in: every page except /login needs a session; signed-in users
   *   visiting /login go where they wanted to (`?redirect=`) or home.
   * Server functions enforce the session on their own (authMiddleware).
   */
  beforeLoad: async ({ location }) => {
    const locale = getLocale()
    const user = await getSessionUser()
    const onLoginPage = location.pathname === LOGIN_PATH
    if (!user && !onLoginPage) {
      throw redirect({
        to: LOGIN_PATH,
        search: location.pathname === '/' ? {} : { redirect: location.href },
      })
    }
    if (user && onLoginPage) {
      const search = location.search as { redirect?: unknown }
      throw redirect({ href: safeRedirectPath(search.redirect) })
    }
    return { locale, user }
  },
  head: ({ match }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: pageTitle(match.context.locale) },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { locale, user } = Route.useRouteContext()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen">
        <I18nextProvider i18n={getI18n(locale)}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider>
              {user ? (
                <>
                  <AppSidebar user={user} />
                  <div className={SIDEBAR_OFFSET_CLASS}>
                    <MobileTopBar user={user} />
                    <main className="container mx-auto px-4 py-8">
                      {children}
                    </main>
                  </div>
                </>
              ) : (
                <>
                  <SiteHeader />
                  <main className="container mx-auto px-4 py-8">
                    {children}
                  </main>
                </>
              )}
              <Toaster richColors />
            </TooltipProvider>
          </ThemeProvider>
        </I18nextProvider>
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
