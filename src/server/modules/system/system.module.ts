import { CoreModule } from '../../core/database/database.module'
import { defineModule } from '../../core/di/module'
import { SystemService } from './system.service'

export const SystemModule = defineModule({
  name: 'SystemModule',
  imports: [CoreModule],
  providers: [SystemService],
})
