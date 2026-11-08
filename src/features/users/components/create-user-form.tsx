import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { createUserSchema } from '#/shared/users/users.dto'
import type { User } from '#/shared/users/users.dto'
import { useCreateUser } from '../users.queries'
import { useMessage } from '#/i18n/use-locale'

interface CreateUserFormProps {
  defaultName?: string
  submitLabel?: string
  onCreated?: (user: User) => void | Promise<void>
  /** `inline` = one row (inside other dialogs), `stacked` = one field per row. */
  layout?: 'inline' | 'stacked'
  /** Show the "trainer" switch (hidden when adding clients). */
  showTrainerToggle?: boolean
}

/** Name is required; email and phone are optional (but unique when given). */
export function CreateUserForm({
  defaultName = '',
  submitLabel,
  onCreated,
  layout = 'inline',
  showTrainerToggle = true,
}: CreateUserFormProps) {
  const createUser = useCreateUser()
  const { t } = useTranslation()
  const message = useMessage()

  const form = useForm({
    defaultValues: {
      name: defaultName,
      email: '',
      phone: '',
      isTrainer: false,
    },
    validators: { onSubmit: createUserSchema },
    onSubmit: async ({ value, formApi }) => {
      const user = await createUser.mutateAsync(value)
      formApi.reset()
      await onCreated?.(user)
    },
  })

  return (
    <form
      className={
        layout === 'inline'
          ? 'grid gap-3 sm:grid-cols-[2fr_2fr_1.5fr_auto_auto] sm:items-end'
          : 'grid gap-4'
      }
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      {(
        [
          { name: 'name', placeholder: 'Anna Nowak' },
          { name: 'email', placeholder: t('common.optional') },
          { name: 'phone', placeholder: t('common.optional') },
        ] as const
      ).map((f) => (
        <form.Field key={f.name} name={f.name}>
          {(field) => (
            <div className="space-y-1">
              <Label htmlFor={`user-${f.name}`}>
                {t(`users.fields.${f.name}`)}
              </Label>
              <Input
                id={`user-${f.name}`}
                placeholder={f.placeholder}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors.map((err) => (
                <p key={err?.message} className="text-destructive text-sm">
                  {message(err?.message ?? '')}
                </p>
              ))}
            </div>
          )}
        </form.Field>
      ))}
      {showTrainerToggle && (
        <form.Field name="isTrainer">
          {(field) => (
            <div className="flex h-9 items-center gap-2">
              <Switch
                id="user-isTrainer"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
              <Label htmlFor="user-isTrainer">
                {t('users.fields.isTrainer')}
              </Label>
            </div>
          )}
        </form.Field>
      )}
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button
            type="submit"
            disabled={isSubmitting}
            className={layout === 'stacked' ? 'justify-self-end' : undefined}
          >
            {isSubmitting
              ? t('common.saving')
              : (submitLabel ?? t('users.form.add'))}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
