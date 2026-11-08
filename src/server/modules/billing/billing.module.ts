import { CoreModule } from '../../core/database/database.module'
import { defineModule } from '../../core/di/module'
import { TrainingsModule } from '../trainings/trainings.module'
import { UsersModule } from '../users/users.module'
import { BillingRepository } from './billing.repository'
import { BillingService } from './billing.service'

export const BillingModule = defineModule({
  name: 'BillingModule',
  imports: [CoreModule, UsersModule, TrainingsModule],
  providers: [BillingRepository, BillingService],
})
