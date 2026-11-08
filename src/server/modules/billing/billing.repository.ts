import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { inject, injectable } from 'inversify'

import type { DB } from '../../core/database/database.module'
import { TOKENS } from '../../core/di/tokens'
import {
  billingPaymentNotes,
  billingPeriods,
  clientPlans,
  familyGroups,
  familyPackages,
} from './billing.table'
import type {
  BillingPaymentNoteRow,
  BillingPeriodRow,
  ClientPlanRow,
  FamilyGroupRow,
  FamilyPackageRow,
  NewClientPlanRow,
} from './billing.table'

/** Data access only – no business rules here. */
@injectable()
export class BillingRepository {
  constructor(@inject(TOKENS.Database) private readonly db: DB) {}

  /* ---------- plans ---------- */

  findAllPlans(): Promise<Array<ClientPlanRow>> {
    return this.db
      .select()
      .from(clientPlans)
      .orderBy(asc(clientPlans.validFrom), asc(clientPlans.id))
  }

  findPlansByUser(userId: number): Promise<Array<ClientPlanRow>> {
    return this.db
      .select()
      .from(clientPlans)
      .where(eq(clientPlans.userId, userId))
      .orderBy(desc(clientPlans.validFrom), desc(clientPlans.id))
  }

  async findPlanById(id: number): Promise<ClientPlanRow | undefined> {
    const [row] = await this.db
      .select()
      .from(clientPlans)
      .where(eq(clientPlans.id, id))
      .limit(1)
    return row
  }

  async findOpenPlan(userId: number): Promise<ClientPlanRow | undefined> {
    const [row] = await this.db
      .select()
      .from(clientPlans)
      .where(and(eq(clientPlans.userId, userId), isNull(clientPlans.validTo)))
      .limit(1)
    return row
  }

  async createPlan(data: NewClientPlanRow): Promise<ClientPlanRow> {
    const [row] = await this.db.insert(clientPlans).values(data).returning()
    return row
  }

  async updatePlan(
    id: number,
    data: Partial<Pick<ClientPlanRow, 'validFrom' | 'validTo'>>,
  ): Promise<void> {
    await this.db.update(clientPlans).set(data).where(eq(clientPlans.id, id))
  }

  async deletePlan(id: number): Promise<void> {
    await this.db.delete(clientPlans).where(eq(clientPlans.id, id))
  }

  async closePlan(id: number, validTo: string): Promise<void> {
    await this.db
      .update(clientPlans)
      .set({ validTo })
      .where(eq(clientPlans.id, id))
  }

  /* ---------- frozen periods ---------- */

  findAllPeriods(): Promise<Array<BillingPeriodRow>> {
    return this.db.select().from(billingPeriods)
  }

  findPeriodsByPlan(clientPlanId: number): Promise<Array<BillingPeriodRow>> {
    return this.db
      .select()
      .from(billingPeriods)
      .where(eq(billingPeriods.clientPlanId, clientPlanId))
  }

  async createPeriod(
    data: typeof billingPeriods.$inferInsert,
  ): Promise<BillingPeriodRow> {
    const [row] = await this.db.insert(billingPeriods).values(data).returning()
    return row
  }

  async deletePeriod(clientPlanId: number, startsAt: Date): Promise<boolean> {
    const deleted = await this.db
      .delete(billingPeriods)
      .where(
        and(
          eq(billingPeriods.clientPlanId, clientPlanId),
          eq(billingPeriods.startsAt, startsAt),
        ),
      )
      .returning({ id: billingPeriods.id })
    return deleted.length > 0
  }

  /* ---------- family groups & packages ---------- */

  findAllGroups(): Promise<Array<FamilyGroupRow>> {
    return this.db.select().from(familyGroups).orderBy(asc(familyGroups.name))
  }

  async findGroupById(id: number): Promise<FamilyGroupRow | undefined> {
    const [row] = await this.db
      .select()
      .from(familyGroups)
      .where(eq(familyGroups.id, id))
      .limit(1)
    return row
  }

  async createGroup(name: string): Promise<FamilyGroupRow> {
    const [row] = await this.db
      .insert(familyGroups)
      .values({ name })
      .returning()
    return row
  }

  findAllPackages(): Promise<Array<FamilyPackageRow>> {
    return this.db.select().from(familyPackages)
  }

  async createPackage(
    data: typeof familyPackages.$inferInsert,
  ): Promise<FamilyPackageRow> {
    const [row] = await this.db.insert(familyPackages).values(data).returning()
    return row
  }

  findAllPaymentNotes(): Promise<Array<BillingPaymentNoteRow>> {
    return this.db.select().from(billingPaymentNotes)
  }

  async countPaymentNotesByPlan(clientPlanId: number): Promise<number> {
    const rows = await this.db
      .select({ id: billingPaymentNotes.id })
      .from(billingPaymentNotes)
      .where(eq(billingPaymentNotes.clientPlanId, clientPlanId))
    return rows.length
  }

  /** Saves the note of a period; an empty note deletes it. */
  async setPaymentNote(
    clientPlanId: number,
    periodStartsAt: Date,
    note: string,
  ): Promise<void> {
    if (!note) {
      await this.db
        .delete(billingPaymentNotes)
        .where(
          and(
            eq(billingPaymentNotes.clientPlanId, clientPlanId),
            eq(billingPaymentNotes.periodStartsAt, periodStartsAt),
          ),
        )
      return
    }
    await this.db
      .insert(billingPaymentNotes)
      .values({ clientPlanId, periodStartsAt, note })
      .onConflictDoUpdate({
        target: [
          billingPaymentNotes.clientPlanId,
          billingPaymentNotes.periodStartsAt,
        ],
        set: { note, updatedAt: new Date() },
      })
  }

  async setPackagePaymentNote(
    id: number,
    paymentNote: string | null,
  ): Promise<FamilyPackageRow | undefined> {
    const [row] = await this.db
      .update(familyPackages)
      .set({ paymentNote })
      .where(eq(familyPackages.id, id))
      .returning()
    return row
  }

  async setPackageSmsSentAt(
    id: number,
    smsSentAt: Date | null,
  ): Promise<FamilyPackageRow | undefined> {
    const [row] = await this.db
      .update(familyPackages)
      .set({ smsSentAt })
      .where(eq(familyPackages.id, id))
      .returning()
    return row
  }
}
