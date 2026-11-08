import { CoreModule } from '../../core/database/database.module'
import { defineModule } from '../../core/di/module'
import { UsersModule } from '../users/users.module'
import { TrainingsRepository } from './trainings.repository'
import { TrainingsService } from './trainings.service'

export const TrainingsModule = defineModule({
  name: 'TrainingsModule',
  imports: [CoreModule, UsersModule],
  providers: [TrainingsRepository, TrainingsService],
})
