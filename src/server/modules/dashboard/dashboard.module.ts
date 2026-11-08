import { CoreModule } from '../../core/database/database.module'
import { defineModule } from '../../core/di/module'
import { BillingModule } from '../billing/billing.module'
import { TrainingsModule } from '../trainings/trainings.module'
import { UsersModule } from '../users/users.module'
import { DashboardService } from './dashboard.service'

export const DashboardModule = defineModule({
  name: 'DashboardModule',
  imports: [CoreModule, UsersModule, TrainingsModule, BillingModule],
  providers: [DashboardService],
})
