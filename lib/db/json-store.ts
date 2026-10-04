/**
 * Локальный драйвер хранилища: один JSON-файл на диске.
 *
 * Зачем: сайт и весь поток заявок должны работать сразу после `npm run dev`,
 * без поднятого PostgreSQL. Модель данных, статусы и поведение — те же, что в
 * `pg`-драйвере, поэтому переезд на прод ограничивается переменной DB_DRIVER.
 *
 * Не для продакшна с несколькими инстансами: файл один, конкурентные записи
 * сериализуются внутри процесса. Для нескольких реплик нужен PostgreSQL.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { dataRoot, isEphemeralStorage, serverlessTempDir } from '@/lib/runtime';
import type {
  AdminUser,
  ClaimRow,
  CuratedReview,
  GalleryItem,
  Lead,
  LeadEvent,
  LeadFile,
  LeadFilter,
  Measurement,
  MeasurementRules,
  Notification,
  SiteEvent,
  Staff,
  Store,
} from './types';

interface DbShape {
  leads: Lead[];
  lead_events: LeadEvent[];
  lead_files: LeadFile[];
  measurements: Measurement[];
  measurement_rules: MeasurementRules | null;
  blackout_dates: string[];
  gallery_items: GalleryItem[];
  reviews_curated: CuratedReview[];
  claims: ClaimRow[];
  staff: Staff[];
  users: AdminUser[];
  notifications: Notification[];
  settings: Record<string, unknown>;
  events: SiteEvent[];
  sequences: Record<string, number>;
}

const DEFAULT_RULES: MeasurementRules = {
  weekdays: [1, 2, 3, 4, 5],
  dayStartMinutes: 9 * 60,
  dayEndMinutes: 19 * 60,
  slotMinutes: 60,
  capacityPerSlot: 2,
  minLeadHours: 12,
  horizonDays: 14,
  timezone: 'Asia/Almaty',
};

function emptyDb(): DbShape {
  return {
    leads: [],
    lead_events: [],
    lead_files: [],
    measurements: [],
    measurement_rules: null,
    blackout_dates: [],
    gallery_items: [],
    reviews_curated: [],
    claims: [],
    staff: [],
    users: [],
    notifications: [],
    settings: {},
    events: [],
    sequences: {},
  };
}

export class JsonStore implements Store {
  readonly driver = 'json' as const;
  private file: string;
  private data: DbShape | null = null;
  /**
   * Сериализация «прочитал — изменил — записал». Без неё два одновременных
   * запроса могли бы перезаписать изменения друг друга.
   *
   * Внимание: очередь работает только внутри одного процесса. На serverless
   * каждый вызов может попасть в отдельный инстанс, поэтому файловый драйвер
   * там не является надёжным хранилищем (см. docs/RISKS.md).
   */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(filePath?: string) {
    this.file = filePath || path.join(dataRoot(), 'store.json');
  }

  private async load(): Promise<DbShape> {
    if (this.data) return this.data;
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      this.data = { ...emptyDb(), ...(JSON.parse(raw) as DbShape) };
    } catch {
      this.data = emptyDb();
    }
    return this.data;
  }

  private async flush(): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    await fs.rename(tmp, this.file);
  }

  /** Runs `fn` with exclusive access to the in-memory document. */
  private tx<T>(fn: (db: DbShape) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const db = await this.load();
      const result = await fn(db);
      await this.flush();
      return result;
    });
    // Keep the chain alive even if a caller's promise rejects.
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private nextId(db: DbShape, table: string): number {
    const next = (db.sequences[table] || 0) + 1;
    db.sequences[table] = next;
    return next;
  }

  private now(): string {
    return new Date().toISOString();
  }

  async init(): Promise<void> {
    await this.load();
    await this.flush();
  }

  // ------------------------------------------------------------------ leads

  async createLead(lead: Omit<Lead, 'id'>): Promise<Lead> {
    return this.tx((db) => {
      const row = { ...lead, id: this.nextId(db, 'leads') } as Lead;
      db.leads.push(row);
      return row;
    });
  }

  async getLead(id: number): Promise<Lead | null> {
    const db = await this.load();
    return db.leads.find((lead) => lead.id === id) ?? null;
  }

  async getLeadBySubmissionId(submissionId: string): Promise<Lead | null> {
    const db = await this.load();
    return db.leads.find((lead) => lead.submission_id === submissionId) ?? null;
  }

  async findRecentLeadByPhone(phoneNormalized: string, sinceIso: string): Promise<Lead | null> {
    const db = await this.load();
    const matches = db.leads
      .filter((lead) => lead.phone_normalized === phoneNormalized && lead.created_at >= sinceIso)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return matches[0] ?? null;
  }

  async listLeads(filter: LeadFilter = {}): Promise<Lead[]> {
    const db = await this.load();
    return this.applyFilter(db.leads, filter)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? 200));
  }

  async countLeads(filter: LeadFilter = {}): Promise<number> {
    const db = await this.load();
    return this.applyFilter(db.leads, filter).length;
  }

  private applyFilter(leads: Lead[], filter: LeadFilter): Lead[] {
    let out = leads;
    if (filter.status?.length) {
      out = out.filter((lead) => filter.status!.includes(lead.status));
    }
    if (filter.source) out = out.filter((lead) => lead.source === filter.source);
    if (filter.productType) out = out.filter((lead) => lead.product_type === filter.productType);
    if (filter.segment) out = out.filter((lead) => lead.segment === filter.segment);
    if (filter.assigneeId) out = out.filter((lead) => lead.assignee_id === filter.assigneeId);
    if (filter.from) out = out.filter((lead) => lead.created_at >= filter.from!);
    if (filter.to) out = out.filter((lead) => lead.created_at <= filter.to!);
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      out = out.filter(
        (lead) =>
          lead.name.toLowerCase().includes(needle) ||
          lead.phone_normalized.includes(needle.replace(/\D/g, '')) ||
          lead.phone.includes(needle) ||
          (lead.comment || '').toLowerCase().includes(needle),
      );
    }
    return out;
  }

  async updateLead(id: number, patch: Partial<Lead>): Promise<Lead | null> {
    return this.tx((db) => {
      const index = db.leads.findIndex((lead) => lead.id === id);
      if (index === -1) return null;
      const updated = { ...db.leads[index], ...patch, id, updated_at: this.now() };
      db.leads[index] = updated;
      return updated;
    });
  }

  async deleteLead(id: number): Promise<void> {
    await this.tx((db) => {
      db.leads = db.leads.filter((lead) => lead.id !== id);
      db.lead_events = db.lead_events.filter((event) => event.lead_id !== id);
      db.lead_files = db.lead_files.filter((file) => file.lead_id !== id);
      db.measurements = db.measurements.filter((m) => m.lead_id !== id);
    });
  }

  // ------------------------------------------------------- lead events/files

  async addLeadEvent(event: Omit<LeadEvent, 'id'>): Promise<LeadEvent> {
    return this.tx((db) => {
      const row = { ...event, id: this.nextId(db, 'lead_events') } as LeadEvent;
      db.lead_events.push(row);
      return row;
    });
  }

  async listLeadEvents(leadId: number): Promise<LeadEvent[]> {
    const db = await this.load();
    return db.lead_events
      .filter((event) => event.lead_id === leadId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async addLeadFile(file: Omit<LeadFile, 'id'>): Promise<LeadFile> {
    return this.tx((db) => {
      const row = { ...file, id: this.nextId(db, 'lead_files') } as LeadFile;
      db.lead_files.push(row);
      return row;
    });
  }

  async listLeadFiles(leadId: number): Promise<LeadFile[]> {
    const db = await this.load();
    return db.lead_files.filter((file) => file.lead_id === leadId);
  }

  async deleteLeadFiles(leadId: number): Promise<void> {
    await this.tx((db) => {
      db.lead_files = db.lead_files.filter((file) => file.lead_id !== leadId);
    });
  }

  // ----------------------------------------------------------- measurements

  async createMeasurement(measurement: Omit<Measurement, 'id'>): Promise<Measurement> {
    return this.tx((db) => {
      const row = { ...measurement, id: this.nextId(db, 'measurements') } as Measurement;
      db.measurements.push(row);
      return row;
    });
  }

  async getMeasurement(id: number): Promise<Measurement | null> {
    const db = await this.load();
    return db.measurements.find((item) => item.id === id) ?? null;
  }

  async listMeasurements(range: { from?: string; to?: string } = {}): Promise<Measurement[]> {
    const db = await this.load();
    return db.measurements
      .filter((item) => (!range.from || item.starts_at >= range.from) && (!range.to || item.starts_at <= range.to))
      .filter((item) => item.status !== 'canceled')
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  async listMeasurementsByLead(leadId: number): Promise<Measurement[]> {
    const db = await this.load();
    return db.measurements
      .filter((item) => item.lead_id === leadId)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  async updateMeasurement(id: number, patch: Partial<Measurement>): Promise<Measurement | null> {
    return this.tx((db) => {
      const index = db.measurements.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const updated = { ...db.measurements[index], ...patch, id, updated_at: this.now() };
      db.measurements[index] = updated;
      return updated;
    });
  }

  async countMeasurementsInSlot(startsAt: string, endsAt: string): Promise<number> {
    const db = await this.load();
    return db.measurements.filter(
      (item) => item.status !== 'canceled' && item.starts_at < endsAt && item.ends_at > startsAt,
    ).length;
  }

  async getMeasurementRules(): Promise<MeasurementRules> {
    const db = await this.load();
    return db.measurement_rules ?? DEFAULT_RULES;
  }

  async saveMeasurementRules(rules: MeasurementRules): Promise<MeasurementRules> {
    return this.tx((db) => {
      db.measurement_rules = rules;
      return rules;
    });
  }

  async listBlackoutDates(): Promise<string[]> {
    const db = await this.load();
    return [...db.blackout_dates].sort();
  }

  async addBlackoutDate(date: string): Promise<void> {
    await this.tx((db) => {
      if (!db.blackout_dates.includes(date)) db.blackout_dates.push(date);
    });
  }

  async removeBlackoutDate(date: string): Promise<void> {
    await this.tx((db) => {
      db.blackout_dates = db.blackout_dates.filter((item) => item !== date);
    });
  }

  // ------------------------------------------------------- gallery / reviews

  async listGallery(filter: { publishedOnly?: boolean; category?: string } = {}): Promise<GalleryItem[]> {
    const db = await this.load();
    return db.gallery_items
      .filter((item) => (filter.publishedOnly ? item.published : true))
      .filter((item) => (filter.category ? item.category === filter.category : true))
      .sort((a, b) => a.sort - b.sort || b.id - a.id);
  }

  async createGalleryItem(item: Omit<GalleryItem, 'id'>): Promise<GalleryItem> {
    return this.tx((db) => {
      const row = { ...item, id: this.nextId(db, 'gallery_items') } as GalleryItem;
      db.gallery_items.push(row);
      return row;
    });
  }

  async updateGalleryItem(id: number, patch: Partial<GalleryItem>): Promise<GalleryItem | null> {
    return this.tx((db) => {
      const index = db.gallery_items.findIndex((item) => item.id === id);
      if (index === -1) return null;
      db.gallery_items[index] = { ...db.gallery_items[index], ...patch, id };
      return db.gallery_items[index];
    });
  }

  async deleteGalleryItem(id: number): Promise<void> {
    await this.tx((db) => {
      db.gallery_items = db.gallery_items.filter((item) => item.id !== id);
    });
  }

  async listReviews(filter: { publishedOnly?: boolean } = {}): Promise<CuratedReview[]> {
    const db = await this.load();
    return db.reviews_curated
      .filter((item) => (filter.publishedOnly ? item.published && item.consent_obtained : true))
      .sort((a, b) => b.id - a.id);
  }

  async createReview(review: Omit<CuratedReview, 'id'>): Promise<CuratedReview> {
    return this.tx((db) => {
      const row = { ...review, id: this.nextId(db, 'reviews_curated') } as CuratedReview;
      db.reviews_curated.push(row);
      return row;
    });
  }

  async updateReview(id: number, patch: Partial<CuratedReview>): Promise<CuratedReview | null> {
    return this.tx((db) => {
      const index = db.reviews_curated.findIndex((item) => item.id === id);
      if (index === -1) return null;
      db.reviews_curated[index] = { ...db.reviews_curated[index], ...patch, id };
      return db.reviews_curated[index];
    });
  }

  async deleteReview(id: number): Promise<void> {
    await this.tx((db) => {
      db.reviews_curated = db.reviews_curated.filter((item) => item.id !== id);
    });
  }

  // ---------------------------------------------------------------- claims

  async listClaims(): Promise<ClaimRow[]> {
    const db = await this.load();
    return db.claims;
  }

  async upsertClaim(claim: ClaimRow): Promise<ClaimRow> {
    return this.tx((db) => {
      const index = db.claims.findIndex((item) => item.key === claim.key);
      if (index === -1) db.claims.push(claim);
      else db.claims[index] = claim;
      return claim;
    });
  }

  // ------------------------------------------------------- staff / users

  async listStaff(activeOnly = false): Promise<Staff[]> {
    const db = await this.load();
    return db.staff.filter((item) => (activeOnly ? item.active : true));
  }

  async findStaffByTelegramId(telegramId: string): Promise<Staff | null> {
    const db = await this.load();
    return db.staff.find((item) => item.telegram_id === String(telegramId)) ?? null;
  }

  async findStaffByInviteCode(code: string): Promise<Staff | null> {
    const db = await this.load();
    return db.staff.find((item) => item.invite_code === code && item.active) ?? null;
  }

  async createStaff(staff: Omit<Staff, 'id'>): Promise<Staff> {
    return this.tx((db) => {
      const row = { ...staff, id: this.nextId(db, 'staff') } as Staff;
      db.staff.push(row);
      return row;
    });
  }

  async updateStaff(id: number, patch: Partial<Staff>): Promise<Staff | null> {
    return this.tx((db) => {
      const index = db.staff.findIndex((item) => item.id === id);
      if (index === -1) return null;
      db.staff[index] = { ...db.staff[index], ...patch, id };
      return db.staff[index];
    });
  }

  async deleteStaff(id: number): Promise<void> {
    await this.tx((db) => {
      db.staff = db.staff.filter((item) => item.id !== id);
    });
  }

  async findUserByEmail(email: string): Promise<AdminUser | null> {
    const db = await this.load();
    const needle = email.trim().toLowerCase();
    return db.users.find((item) => item.email.toLowerCase() === needle) ?? null;
  }

  async getUser(id: number): Promise<AdminUser | null> {
    const db = await this.load();
    return db.users.find((item) => item.id === id) ?? null;
  }

  async createUser(user: Omit<AdminUser, 'id'>): Promise<AdminUser> {
    return this.tx((db) => {
      const row = { ...user, id: this.nextId(db, 'users') } as AdminUser;
      db.users.push(row);
      return row;
    });
  }

  async updateUser(id: number, patch: Partial<AdminUser>): Promise<AdminUser | null> {
    return this.tx((db) => {
      const index = db.users.findIndex((item) => item.id === id);
      if (index === -1) return null;
      db.users[index] = { ...db.users[index], ...patch, id };
      return db.users[index];
    });
  }

  // --------------------------------------------------------- notifications

  async enqueueNotification(notification: Omit<Notification, 'id'>): Promise<Notification> {
    return this.tx((db) => {
      const row = { ...notification, id: this.nextId(db, 'notifications') } as Notification;
      db.notifications.push(row);
      return row;
    });
  }

  async listPendingNotifications(nowIso: string, limit = 25): Promise<Notification[]> {
    const db = await this.load();
    return db.notifications
      .filter((item) => item.status !== 'sent' && item.next_attempt_at <= nowIso)
      .sort((a, b) => a.next_attempt_at.localeCompare(b.next_attempt_at))
      .slice(0, limit);
  }

  async listNotifications(limit = 100): Promise<Notification[]> {
    const db = await this.load();
    return [...db.notifications].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  }

  async markNotificationSent(id: number): Promise<void> {
    await this.tx((db) => {
      const item = db.notifications.find((n) => n.id === id);
      if (item) {
        item.status = 'sent';
        item.sent_at = this.now();
        item.last_error = null;
      }
    });
  }

  async markNotificationFailed(id: number, error: string, nextAttemptAt: string): Promise<void> {
    await this.tx((db) => {
      const item = db.notifications.find((n) => n.id === id);
      if (item) {
        item.attempts += 1;
        item.last_error = error.slice(0, 500);
        item.next_attempt_at = nextAttemptAt;
        // Даём 6 попыток, потом помечаем failed: лид всё равно виден в админке.
        item.status = item.attempts >= 6 ? 'failed' : 'pending';
      }
    });
  }

  // ------------------------------------------------------- settings / events

  async getSetting<T = unknown>(key: string): Promise<T | null> {
    const db = await this.load();
    return (db.settings[key] as T) ?? null;
  }

  async getAllSettings(): Promise<Record<string, unknown>> {
    const db = await this.load();
    return { ...db.settings };
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    await this.tx((db) => {
      db.settings[key] = value;
    });
  }

  async recordEvent(event: Omit<SiteEvent, 'id'>): Promise<void> {
    await this.tx((db) => {
      db.events.push({ ...event, id: this.nextId(db, 'events') } as SiteEvent);
      // Держим файл разумного размера: события аналитики не храним вечно.
      if (db.events.length > 20000) db.events = db.events.slice(-15000);
    });
  }

  async countEvents(name: string, sinceIso: string): Promise<number> {
    const db = await this.load();
    return db.events.filter((event) => event.name === name && event.created_at >= sinceIso).length;
  }

  async listEvents(sinceIso: string, name?: string): Promise<SiteEvent[]> {
    const db = await this.load();
    return db.events.filter((event) => event.created_at >= sinceIso && (!name || event.name === name));
  }
}
