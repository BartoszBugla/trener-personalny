import { CoreModule } from './core/database/database.module'
import { defineModule } from './core/di/module'
import { AuthModule } from './modules/auth/auth.module'
import { BillingModule } from './modules/billing/billing.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { CalendarImportModule } from './modules/calendar-import/calendar-import.module'
import { SystemModule } from './modules/system/system.module'
import { TrainingsModule } from './modules/trainings/trainings.module'
import { UsersModule } from './modules/users/users.module'

/**
 * Root module (Nest's AppModule). Register every feature module here.
 * New module: `src/server/modules/<name>/<name>.module.ts` -> add to imports.
 */
export const AppModule = defineModule({
  name: 'AppModule',
  imports: [
    CoreModule,
    SystemModule,
    AuthModule,
    UsersModule,
    TrainingsModule,
    CalendarImportModule,
    BillingModule,
    DashboardModule,
  ],
  providers: [],
})
