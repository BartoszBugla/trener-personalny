import type { Container, ServiceIdentifier } from 'inversify'

import { AppModule } from './app.module'
import { createContainer } from './core/di/container'

let container: Container | undefined

/** Lazily bootstraps the application container (Nest's `NestFactory.create`). */
export function getContainer(): Container {
  container ??= createContainer(AppModule)
  return container
}

/**
 * Resolve a provider from the app container.
 * Use inside server function handlers / server routes – the "controller" layer:
 *
 *   const billing = resolve(BillingService)
 */
export function resolve<T>(id: ServiceIdentifier<T>): T {
  return getContainer().get<T>(id)
}
