import path from 'node:path'

import { ConfigService } from '../../core/config/config.service'
import { CoreModule } from '../../core/database/database.module'
import { defineModule } from '../../core/di/module'
import { TOKENS } from '../../core/di/tokens'
import { TrainingsModule } from '../trainings/trainings.module'
import { UsersModule } from '../users/users.module'
import { BundledCalendarSource } from './bundled-calendar-source'
import { CalendarImportService } from './calendar-import.service'
import { FileSystemCalendarSource } from './file-system-calendar-source'

export const CalendarImportModule = defineModule({
  name: 'CalendarImportModule',
  imports: [CoreModule, UsersModule, TrainingsModule],
  providers: [
    // Swap for a Google Calendar implementation later.
    {
      provide: TOKENS.CalendarSource,
      useFactory: ({ get }) => {
        const dir = get(ConfigService).get('CALENDARS_DIR')
        return dir
          ? new FileSystemCalendarSource(path.resolve(dir))
          : new BundledCalendarSource()
      },
    },
    CalendarImportService,
  ],
})
