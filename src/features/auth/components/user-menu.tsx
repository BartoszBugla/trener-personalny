import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import type { AuthUser } from '#/shared/auth/auth.dto'
import { signOut } from '../auth.functions'

function initials(user: AuthUser): string {
  const source = user.name ?? user.email
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/**
 * Avatar with the signed-in account and "Sign out". `compact` = avatar only
 * (top bar); otherwise avatar + name/email filling the width (sidebar).
 */
export function UserMenu({
  user,
  compact = false,
}: {
  user: AuthUser
  compact?: boolean
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)

  const handleSignOut = async () => {
    setPending(true)
    try {
      await signOut()
      // Drop cached data of the signed-out user.
      queryClient.clear()
      await router.navigate({ to: '/login', replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'default'}
          className={
            compact
              ? 'rounded-full'
              : 'h-auto w-full justify-start gap-3 px-2 py-2 text-left'
          }
          aria-label={t('auth.menu.label')}
        >
          <Avatar className="size-8">
            {user.picture && (
              <AvatarImage
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
              />
            )}
            <AvatarFallback className="text-xs">
              {initials(user)}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {user.name ?? user.email}
              </span>
              {user.name && (
                <span className="text-muted-foreground block truncate text-xs font-normal">
                  {user.email}
                </span>
              )}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={compact ? 'end' : 'start'}
        side={compact ? 'bottom' : 'top'}
        className="w-56"
      >
        <DropdownMenuLabel className="font-normal">
          {user.name && <p className="truncate font-medium">{user.name}</p>}
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault()
            void handleSignOut()
          }}
        >
          <LogOut className="size-4" />
          {t('auth.menu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
