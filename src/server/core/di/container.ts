import 'reflect-metadata'
import { Container } from 'inversify'

import { flattenModules } from './module'
import type { AppModule } from './module'

/**
 * Builds an Inversify container from a root module (Nest's `NestFactory.create(AppModule)`).
 * Default scope is Singleton – same semantics as Nest providers.
 */
export function createContainer(root: AppModule): Container {
  const container = new Container({ defaultScope: 'Singleton' })
  for (const mod of flattenModules(root)) {
    container.load(mod.containerModule)
  }
  return container
}
