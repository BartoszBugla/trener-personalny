/**
 * Schema barrel – drizzle-kit reads this file (see drizzle.config.ts).
 * Each feature module owns its tables; re-export them here.
 */
export * from '../../modules/users/users.table'
export * from '../../modules/trainings/trainings.table'
export * from '../../modules/billing/billing.table'
