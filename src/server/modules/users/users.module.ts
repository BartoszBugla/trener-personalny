import { CoreModule } from '../../core/database/database.module'
import { defineModule } from '../../core/di/module'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

export const UsersModule = defineModule({
  name: 'UsersModule',
  imports: [CoreModule],
  providers: [UsersRepository, UsersService],
})
