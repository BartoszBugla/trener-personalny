import { CoreModule } from '../../core/database/database.module'
import { defineModule } from '../../core/di/module'
import { UsersModule } from '../users/users.module'
import { AccessService } from './access.service'
import { AuthService } from './auth.service'
import { FirebaseAdminService } from './firebase-admin.service'

export const AuthModule = defineModule({
  name: 'AuthModule',
  imports: [CoreModule, UsersModule],
  providers: [FirebaseAdminService, AccessService, AuthService],
})
