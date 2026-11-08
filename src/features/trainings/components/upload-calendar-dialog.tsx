import { FileUp, X } from 'lucide-react'
import { useId, useState } from 'react'
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
import {
  CALENDAR_UPLOAD_ACCEPT,
  CALENDAR_UPLOAD_FIELDS,
  CALENDAR_UPLOAD_MAX_FILES,
  calendarIdFromFileName,
  isValidCalendarId,
  normalizeCalendarId,
} from '#/shared/trainings/calendar-upload'
import { useUploadTrainingsCalendars } from '../trainings.queries'

interface SelectedCalendar {
  file: File
  calendarId: string
}

/** Uploads .ics exports and imports them like the calendar source does. */
export function UploadCalendarDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="size-4" />
          {t('trainings.upload.button')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {/* Remount on open, so the form starts empty every time. */}
        {open && <UploadCalendarForm onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function UploadCalendarForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const upload = useUploadTrainingsCalendars()
  const inputId = useId()
  const [selected, setSelected] = useState<Array<SelectedCalendar>>([])

  const addFiles = (files: FileList | null) => {
    if (!files) return
    setSelected((prev) => {
      const known = new Set(prev.map((s) => s.file.name))
      const added = Array.from(files)
        .filter((file) => !known.has(file.name))
        .map((file) => ({
          file,
          calendarId: calendarIdFromFileName(file.name),
        }))
      return [...prev, ...added].slice(0, CALENDAR_UPLOAD_MAX_FILES)
    })
  }

  const ids = selected.map((s) => normalizeCalendarId(s.calendarId))
  const valid =
    selected.length > 0 &&
    ids.every(isValidCalendarId) &&
    new Set(ids).size === ids.length

  const submit = async () => {
    const data = new FormData()
    for (const { file, calendarId } of selected) {
      data.append(CALENDAR_UPLOAD_FIELDS.files, file)
      data.append(CALENDAR_UPLOAD_FIELDS.calendarIds, calendarId)
    }
    await upload.mutateAsync(data)
    onDone()
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) void submit().catch(() => {}) // error toast in the hook
      }}
    >
      <DialogHeader>
        <DialogTitle>{t('trainings.upload.title')}</DialogTitle>
        <DialogDescription>
          {t('trainings.upload.description')}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor={inputId}>{t('trainings.upload.chooseFiles')}</Label>
        <Input
          id={inputId}
          type="file"
          accept={CALENDAR_UPLOAD_ACCEPT}
          multiple
          disabled={
            upload.isPending || selected.length >= CALENDAR_UPLOAD_MAX_FILES
          }
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = '' // allow picking the same file again after removing it
          }}
        />
      </div>

      {selected.length > 0 && (
        <ul className="grid gap-3">
          {selected.map((s, i) => (
            <li
              key={s.file.name}
              className="grid gap-1.5 rounded-md border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {s.file.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={t('trainings.upload.remove', {
                    file: s.file.name,
                  })}
                  disabled={upload.isPending}
                  onClick={() =>
                    setSelected((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  <X className="size-4" />
                </Button>
              </div>
              <Label
                htmlFor={`${inputId}-${i}`}
                className="text-muted-foreground text-xs"
              >
                {t('trainings.upload.calendarId')}
              </Label>
              <Input
                id={`${inputId}-${i}`}
                value={s.calendarId}
                aria-invalid={!isValidCalendarId(ids[i]) || undefined}
                disabled={upload.isPending}
                onChange={(e) => {
                  const calendarId = e.target.value
                  setSelected((prev) =>
                    prev.map((p, j) => (j === i ? { ...p, calendarId } : p)),
                  )
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {selected.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t('trainings.upload.calendarIdHint')}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!valid || upload.isPending}>
          {upload.isPending
            ? t('trainings.upload.pending')
            : t('trainings.upload.submit')}
        </Button>
      </DialogFooter>
    </form>
  )
}
