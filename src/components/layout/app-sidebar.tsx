import { Link } from '@tanstack/react-router'
import {
  CalendarDays,
  CalendarRange,
  Dumbbell,
  LayoutDashboard,
  Menu,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { UserMenu } from '#/features/auth/components/user-menu'
import type { AuthUser } from '#/shared/auth/auth.dto'
import { LanguageSwitcher } from './language-switcher'
import { ThemeToggle } from './theme-toggle'

/** Width of the desktop sidebar – `<main>` is offset by the same amount. */
export const SIDEBAR_OFFSET_CLASS = 'lg:pl-60'

const NAV_ITEMS = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, exact: true },
  { to: '/trainings', key: 'nav.trainings', icon: CalendarDays, exact: true },
  { to: '/trainings/calendar', key: 'nav.calendar', icon: CalendarRange },
  { to: '/clients', key: 'nav.clients', icon: Users },
  { to: '/billing', key: 'nav.billing', icon: Wallet },
  { to: '/users', key: 'nav.users', icon: UserCog },
] as const

/** App logo: dumbbell on the brand yellow. */
export function BrandMark() {
  return (
    <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md">
      <Dumbbell className="size-4" aria-hidden />
    </span>
  )
}

function Brand() {
  const { t } = useTranslation()
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold">
      <BrandMark />
      {t('common.appName')}
    </Link>
  )
}

/** Vertical list of sections; `onNavigate` closes the mobile drawer. */
function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  return (
    <nav className="flex flex-col gap-1" aria-label={t('nav.label')}>
      {NAV_ITEMS.map(({ to, key, icon: Icon, ...item }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
          activeProps={{
            className:
              'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
            'aria-current': 'page',
          }}
          activeOptions={{ exact: 'exact' in item && item.exact }}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {t(key)}
        </Link>
      ))}
    </nav>
  )
}

/** Language, theme and account – bottom of the sidebar. */
function SidebarFooter({ user }: { user: AuthUser }) {
  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center gap-1">
        <LanguageSwitcher align="start" />
        <ThemeToggle align="start" />
      </div>
      <UserMenu user={user} />
    </div>
  )
}

/** Fixed left sidebar on large screens. */
export function AppSidebar({ user }: { user: AuthUser }) {
  return (
    <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r px-3 py-4 lg:flex">
      <div className="px-3 pb-6">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
      <SidebarFooter user={user} />
    </aside>
  )
}

/** Top bar with a drawer holding the same sidebar, below `lg`. */
export function MobileTopBar({ user }: { user: AuthUser }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('nav.open')}>
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-72 flex-col gap-0 p-3">
          <SheetHeader className="px-3 pt-1 pb-6">
            <SheetTitle asChild>
              <div>
                <Brand />
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t('nav.label')}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
          <SidebarFooter user={user} />
        </SheetContent>
      </Sheet>
      <Brand />
      <div className="ml-auto">
        <UserMenu user={user} compact />
      </div>
    </header>
  )
}
