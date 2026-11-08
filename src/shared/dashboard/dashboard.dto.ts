import type { PersonRef } from '../billing/billing.dto'
import type { Training } from '../trainings/trainings.dto'

/** A number now vs the same span of the previous period. */
export interface Comparison {
  current: number
  previous: number
}

export interface WeeklyCount {
  /** Monday, local `YYYY-MM-DD`. */
  weekStart: string
  /** Confirmed trainings that already happened. */
  count: number
  /** The week in progress (count so far). */
  current: boolean
}

/** Figures computed from trainings alone (see `computeDashboardStats`). */
export interface DashboardStats {
  /** This week so far vs last week up to the same moment. */
  week: Comparison & { planned: number }
  /** This month so far vs the same days of last month. */
  month: Comparison & { planned: number }
  /** Distinct clients trained in the last 30 days vs the 30 before. */
  activeClients: Comparison
  /** Share of cancelled sessions in the last 30 days (null = no sessions). */
  cancellationRate: { current: number | null; previous: number | null }
  /** Last 12 weeks, oldest first. */
  weekly: Array<WeeklyCount>
  /** Most trained clients in the last 30 days (ids, most first). */
  topClients: Array<{ clientId: number; count: number }>
}

export interface DashboardSummary extends Omit<DashboardStats, 'topClients'> {
  /** Local date the dashboard was computed for. */
  today: string
  /** ISO instant of the computation (stable between SSR and hydration). */
  generatedAt: string
  topClients: Array<PersonRef & { count: number }>
  todayTrainings: Array<Training>
  todo: {
    /** Scheduled trainings without a client. */
    unassigned: number
    /** Finished periods / used-up packages whose reminder SMS isn't sent. */
    smsDue: number
    /** Clients who trained but have no billing plan. */
    withoutPlan: number
  }
}
