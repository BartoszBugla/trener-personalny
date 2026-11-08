import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { billingOverviewQueryOptions } from '#/features/billing/billing.queries'
import { AssignPlanDialog } from '#/features/billing/components/assign-plan-dialog'
import type { AssignPlanTarget } from '#/features/billing/components/assign-plan-dialog'
import { FamilyBillingList } from '#/features/billing/components/family-billing-list'
import { HistoryDialog } from '#/features/billing/components/history-dialog'
import { IndividualBillingTable } from '#/features/billing/components/individual-billing-table'
import { useFormatters } from '#/i18n/use-locale'
import { isSmsDue } from '#/features/billing/components/period-list'
import { pageTitle } from '../__root'
import type {
  BillingOverview,
  PersonRef,
  PlanType,
} from '#/shared/billing/billing.dto'

const INDIVIDUAL_TABS = [
  'trainings_4',
  'trainings_8',
  'trainings_12',
  'monthly',
] as const satisfies ReadonlyArray<PlanType>

type Tab = PlanType | 'custom' | 'none'

export const Route = createFileRoute('/billing/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(billingOverviewQueryOptions()),
  head: ({ match }) => ({
    meta: [{ title: pageTitle(match.context.locale, 'billing.title') }],
  }),
  component: BillingPage,
})

function BillingPage() {
  const { data } = useSuspenseQuery(billingOverviewQueryOptions())
  const [tab, setTab] = useState<Tab>('trainings_4')
  const [assignTarget, setAssignTarget] = useState<AssignPlanTarget | null>(
    null,
  )
  const [historyFor, setHistoryFor] = useState<PersonRef | null>(null)
  const { t } = useTranslation()

  const attention = attentionCounts(data)

  return (
    <Card className="mx-auto max-w-6xl">
      <CardHeader>
        <CardTitle>{t('billing.title')}</CardTitle>
        <CardDescription>{t('billing.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="h-auto flex-wrap justify-start">
            {[...INDIVIDUAL_TABS, 'family' as const].map((type) => (
              <TabsTrigger key={type} value={type}>
                {t(`billing.plans.${type}`)}
                <CountBadge count={attention[type]} />
              </TabsTrigger>
            ))}
            <TabsTrigger
              value="custom"
              disabled
              title={t('billing.tabs.comingSoon')}
            >
              {t('billing.tabs.custom')}
            </TabsTrigger>
            <TabsTrigger value="none">
              {t('billing.tabs.withoutPlan')}
              <CountBadge count={data.withoutPlan.length} />
            </TabsTrigger>
          </TabsList>

          {INDIVIDUAL_TABS.map((type) => (
            <TabsContent key={type} value={type} className="pt-4">
              <IndividualBillingTable
                rows={data.individual.filter((r) => r.plan.planType === type)}
                onChangePlan={(client, plan) =>
                  setAssignTarget({ client, currentPlan: plan })
                }
                onShowHistory={setHistoryFor}
              />
            </TabsContent>
          ))}

          <TabsContent value="family" className="pt-4">
            <FamilyBillingList rows={data.family} />
          </TabsContent>

          <TabsContent value="none" className="pt-4">
            <WithoutPlanTable
              clients={data.withoutPlan}
              onAssign={(client) =>
                setAssignTarget({
                  client,
                  currentPlan: null,
                  suggestedFrom: client.firstTrainingOn,
                })
              }
              onShowHistory={setHistoryFor}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      <AssignPlanDialog
        target={assignTarget}
        familyGroups={data.familyGroups}
        onOpenChange={(open) => !open && setAssignTarget(null)}
      />
      <HistoryDialog
        client={historyFor}
        onOpenChange={(open) => !open && setHistoryFor(null)}
      />
    </Card>
  )
}

/** Red badge on a pill: things needing action (SMS due, uncovered trainings). */
function CountBadge({ count }: { count: number | undefined }) {
  if (!count) return null
  return (
    <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1">
      {count}
    </Badge>
  )
}

function attentionCounts(data: BillingOverview): Partial<Record<Tab, number>> {
  const counts: Partial<Record<Tab, number>> = {}
  for (const row of data.individual) {
    const due = row.periods.filter(isSmsDue).length
    counts[row.plan.planType] = (counts[row.plan.planType] ?? 0) + due
  }
  counts.family = data.family.reduce(
    (n, f) =>
      n +
      f.packages.filter((p) => p.complete && !p.smsSentAt).length +
      (f.uncoveredTrainings > 0 ? 1 : 0),
    0,
  )
  return counts
}

function WithoutPlanTable({
  clients,
  onAssign,
  onShowHistory,
}: {
  clients: BillingOverview['withoutPlan']
  onAssign: (client: BillingOverview['withoutPlan'][number]) => void
  onShowHistory: (client: PersonRef) => void
}) {
  const { t } = useTranslation()
  const format = useFormatters()
  if (clients.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t('billing.withoutPlan.empty')}
      </p>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('billing.individual.client')}</TableHead>
          <TableHead>{t('billing.withoutPlan.firstTraining')}</TableHead>
          <TableHead className="w-56" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-medium">{client.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {client.firstTrainingOn
                ? format.localDate(client.firstTrainingOn)
                : '—'}
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onShowHistory(client)}
                >
                  {t('billing.actions.history')}
                </Button>
                <Button size="sm" onClick={() => onAssign(client)}>
                  {t('billing.actions.assignPlan')}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
