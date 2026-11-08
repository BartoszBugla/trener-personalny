import { ContainerModule } from 'inversify'
import type { Newable, ServiceIdentifier } from 'inversify'

/**
 * Nest-like provider definitions.
 *
 *   SomeService                                   -> class provider (bound to itself)
 *   { provide: TOKEN, useClass: Impl }            -> interface/token -> implementation
 *   { provide: TOKEN, useValue: value }           -> constant
 *   { provide: TOKEN, useFactory: (ctx) => ... }  -> factory (ctx.get(...) to resolve deps)
 */
export type Provider<T = unknown> =
  | Newable<T>
  | { provide: ServiceIdentifier<T>; useClass: Newable<T> }
  | { provide: ServiceIdentifier<T>; useValue: T }
  | {
      provide: ServiceIdentifier<T>
      useFactory: (ctx: {
        get: <TDep>(id: ServiceIdentifier<TDep>) => TDep
      }) => T
    }

export interface ModuleDefinition {
  /** Human-readable name, used in logs / debugging. */
  name: string
  /** Other modules this module depends on (loaded first, deduplicated). */
  imports?: Array<AppModule>
  providers: Array<Provider>
}

export interface AppModule {
  readonly name: string
  readonly imports: Array<AppModule>
  readonly containerModule: ContainerModule
}

/**
 * Equivalent of Nest's `@Module({ imports, providers })`.
 * All providers are singletons by default (see container defaultScope).
 */
export function defineModule(definition: ModuleDefinition): AppModule {
  const containerModule = new ContainerModule(({ bind }) => {
    for (const provider of definition.providers) {
      if (typeof provider === 'function') {
        bind(provider).toSelf()
      } else if ('useClass' in provider) {
        bind(provider.provide).to(provider.useClass)
      } else if ('useValue' in provider) {
        bind(provider.provide).toConstantValue(provider.useValue)
      } else {
        bind(provider.provide).toDynamicValue((ctx) =>
          provider.useFactory({ get: (id) => ctx.get(id) }),
        )
      }
    }
  })

  return {
    name: definition.name,
    imports: definition.imports ?? [],
    containerModule,
  }
}

/** Flattens the module graph (depth-first, imports before importer, no duplicates). */
export function flattenModules(root: AppModule): Array<AppModule> {
  const seen = new Set<AppModule>()
  const ordered: Array<AppModule> = []

  const visit = (mod: AppModule) => {
    if (seen.has(mod)) return
    seen.add(mod)
    mod.imports.forEach(visit)
    ordered.push(mod)
  }

  visit(root)
  return ordered
}
