/**
 * Драйвер PostgreSQL (продакшн). Реализует тот же интерфейс `Store`, что и
 * локальный JSON-драйвер, поэтому бизнес-логика о драйвере не знает.
 *
 * Используется обычный `pg` и параметризованный SQL — без ORM и без
 * проприетарных расширений, чтобы схему можно было перенести (§13, §15).
 * Схема: lib/db/schema.sql, применение — `npm run db:migrate`.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
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

type Row = Record<string, any>;

/**
 * JSON-поля можно передавать объектом: node-postgres сам сериализует объекты в
 * JSON. `undefined` превращаем в SQL NULL, иначе драйвер вставит строку
 * «undefined». Даты принимаем и как ISO-строку, и как Date.
 */
function toDbValue(value: unknown): unknown {
  if (value === undefined) return null;
  return value;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return value === null || value === undefined ? '' : String(value);
}

function isoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const mapLead = (row: Row): Lead => ({
  id: Number(row.id),
  submission_id: String(row.submission_id),
  segment: row.segment,
  name: row.name,
  phone: row.phone,
  phone_normalized: row.phone_normalized,
  email: row.email ?? null,
  product_type: row.product_type ?? null,
  calc_payload: row.calc_payload ?? null,
  district: row.district ?? null,
  comment: row.comment ?? null,
  status: row.status,
  assignee_id: numOrNull(row.assignee_id),
  priority: row.priority,
  source: row.source,
  utm: row.utm ?? null,
  referrer: row.referrer ?? null,
  landing_path: row.landing_path ?? null,
  request_path: row.request_path ?? null,
  device: row.device ?? null,
  locale: row.locale ?? 'ru',
  consent_at: isoOrNull(row.consent_at),
  consent_text_version: row.consent_text_version ?? null,
  lost_reason: row.lost_reason ?? null,
  review_requested_at: isoOrNull(row.review_requested_at),
  created_at: iso(row.created_at),
  updated_at: iso(row.updated_at),
  first_response_at: isoOrNull(row.first_response_at),
});

const mapLeadEvent = (row: Row): LeadEvent => ({
  id: Number(row.id),
  lead_id: Number(row.lead_id),
  type: row.type,
  actor_id: numOrNull(row.actor_id),
  actor_label: row.actor_label ?? null,
  payload: row.payload ?? null,
  created_at: iso(row.created_at),
});

const mapLeadFile = (row: Row): LeadFile => ({
  id: Number(row.id),
  lead_id: Number(row.lead_id),
  storage_key: row.storage_key,
  original_name: row.original_name,
  mime: row.mime,
  size: Number(row.size),
  created_at: iso(row.created_at),
});

const mapMeasurement = (row: Row): Measurement => ({
  id: Number(row.id),
  lead_id: Number(row.lead_id),
  starts_at: iso(row.starts_at),
  ends_at: iso(row.ends_at),
  district: row.district ?? null,
  street: row.street ?? null,
  house: row.house ?? null,
  flat: row.flat ?? null,
  status: row.status,
  assignee_id: numOrNull(row.assignee_id),
  notes: row.notes ?? null,
  created_at: iso(row.created_at),
  updated_at: iso(row.updated_at),
});

const mapGalleryItem = (row: Row): GalleryItem => ({
  id: Number(row.id),
  title: row.title,
  category: row.category,
  storage_key: row.storage_key,
  width: numOrNull(row.width),
  height: numOrNull(row.height),
  district: row.district ?? null,
  before_after_pair_id: numOrNull(row.before_after_pair_id),
  sort: Number(row.sort ?? 0),
  featured: Boolean(row.featured),
  published: Boolean(row.published),
  created_at: iso(row.created_at),
});

const mapReview = (row: Row): CuratedReview => ({
  id: Number(row.id),
  author_label: row.author_label,
  text: row.text,
  source_url: row.source_url,
  consent_obtained: Boolean(row.consent_obtained),
  published: Boolean(row.published),
  created_at: iso(row.created_at),
});

const mapClaim = (row: Row): ClaimRow => ({
  key: row.key,
  text_ru: row.text_ru ?? '',
  status: row.status,
  source: row.source,
  note_for_owner: row.note_for_owner ?? null,
  confirmed_at: isoOrNull(row.confirmed_at),
  confirmed_by: numOrNull(row.confirmed_by),
});

const mapStaff = (row: Row): Staff => ({
  id: Number(row.id),
  telegram_id: String(row.telegram_id),
  name: row.name,
  role: row.role,
  active: Boolean(row.active),
  invite_code: row.invite_code ?? null,
  created_at: iso(row.created_at),
});

const mapUser = (row: Row): AdminUser => ({
  id: Number(row.id),
  email: row.email,
  password_hash: row.password_hash,
  role: row.role,
  name: row.name ?? '',
  must_change_password: Boolean(row.must_change_password),
  last_login_at: isoOrNull(row.last_login_at),
  created_at: iso(row.created_at),
});

const mapNotification = (row: Row): Notification => ({
  id: Number(row.id),
  channel: row.channel,
  target: row.target,
  payload: row.payload ?? {},
  status: row.status,
  attempts: Number(row.attempts ?? 0),
  next_attempt_at: iso(row.next_attempt_at),
  last_error: row.last_error ?? null,
  created_at: iso(row.created_at),
  sent_at: isoOrNull(row.sent_at),
});

const mapEvent = (row: Row): SiteEvent => ({
  id: Number(row.id),
  name: row.name,
  session_id: row.session_id ?? null,
  path: row.path ?? null,
  props: row.props ?? null,
  created_at: iso(row.created_at),
});

export class PgStore implements Store {
  readonly driver = 'pg' as const;
  private pool: Pool;
  private ready = false;

  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) {
      throw new Error('PgStore: не задан DATABASE_URL');
    }
    const needsSsl = !/localhost|127\.0\.0\.1/.test(connectionString);
    this.pool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX || 8),
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  /**
   * Применяет схему, если её ещё нет. Идемпотентно (везде IF NOT EXISTS).
   * На продакшне то же самое делает `npm run db:migrate`.
   */
  async init(): Promise<void> {
    if (this.ready) return;
    try {
      const sql = await fs.readFile(path.join(process.cwd(), 'lib', 'db', 'schema.sql'), 'utf8');
      await this.pool.query(sql);
    } catch (error) {
      console.warn(
        '[db] Не удалось применить schema.sql автоматически. Запустите `npm run db:migrate`.',
        error instanceof Error ? error.message : error,
      );
    }
    this.ready = true;
  }

  private async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }

  private async insert<T>(table: string, data: Record<string, unknown>, map: (row: Row) => T): Promise<T> {
    const keys = Object.keys(data);
    const columns = keys.map((key) => `"${key}"`).join(', ');
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const values = keys.map((key) => toDbValue(data[key]));
    const rows = await this.query<Row>(
      `insert into ${table} (${columns}) values (${placeholders}) returning *`,
      values,
    );
    return map(rows[0]);
  }

  private async patch<T>(
    table: string,
    id: number,
    data: Record<string, unknown>,
    map: (row: Row) => T,
  ): Promise<T | null> {
    const keys = Object.keys(data);
    if (keys.length === 0) return null;
    const assignments = keys.map((key, index) => `"${key}" = $${index + 1}`).join(', ');
    const values = keys.map((key) => toDbValue(data[key]));
    values.push(id);
    const rows = await this.query<Row>(
      `update ${table} set ${assignments} where id = $${keys.length + 1} returning *`,
      values,
    );
    return rows[0] ? map(rows[0]) : null;
  }

  // ------------------------------------------------------------------ leads

  async createLead(lead: Omit<Lead, 'id'>): Promise<Lead> {
    const row = await this.insert('leads', lead as Record<string, unknown>, mapLead);
    return row;
  }

  async getLead(id: number): Promise<Lead | null> {
    const rows = await this.query<Row>('select * from leads where id = $1', [id]);
    return rows[0] ? mapLead(rows[0]) : null;
  }

  async getLeadBySubmissionId(submissionId: string): Promise<Lead | null> {
    const rows = await this.query<Row>('select * from leads where submission_id = $1', [submissionId]);
    return rows[0] ? mapLead(rows[0]) : null;
  }

  async findRecentLeadByPhone(phoneNormalized: string, sinceIso: string): Promise<Lead | null> {
    const rows = await this.query<Row>(
      'select * from leads where phone_normalized = $1 and created_at >= $2 order by created_at desc limit 1',
      [phoneNormalized, sinceIso],
    );
    return rows[0] ? mapLead(rows[0]) : null;
  }

  private buildLeadWhere(filter: LeadFilter): { clause: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const push = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filter.status?.length) conditions.push(`status = any(${push(filter.status)})`);
    if (filter.source) conditions.push(`source = ${push(filter.source)}`);
    if (filter.productType) conditions.push(`product_type = ${push(filter.productType)}`);
    if (filter.segment) conditions.push(`segment = ${push(filter.segment)}`);
    if (filter.assigneeId) conditions.push(`assignee_id = ${push(filter.assigneeId)}`);
    if (filter.from) conditions.push(`created_at >= ${push(filter.from)}`);
    if (filter.to) conditions.push(`created_at <= ${push(filter.to)}`);
    if (filter.search) {
      const like = `%${filter.search.toLowerCase()}%`;
      const digits = filter.search.replace(/\D/g, '');
      conditions.push(
        `(lower(name) like ${push(like)} or phone_normalized like ${push(`%${digits || filter.search}%`)} or lower(coalesce(comment,'')) like ${push(like)})`,
      );
    }

    return {
      clause: conditions.length ? `where ${conditions.join(' and ')}` : '',
      params,
    };
  }

  async listLeads(filter: LeadFilter = {}): Promise<Lead[]> {
    const { clause, params } = this.buildLeadWhere(filter);
    const limit = filter.limit ?? 200;
    const offset = filter.offset ?? 0;
    params.push(limit, offset);
    const rows = await this.query<Row>(
      `select * from leads ${clause} order by created_at desc limit $${params.length - 1} offset $${params.length}`,
      params,
    );
    return rows.map(mapLead);
  }

  async countLeads(filter: LeadFilter = {}): Promise<number> {
    const { clause, params } = this.buildLeadWhere(filter);
    const rows = await this.query<Row>(`select count(*)::int as total from leads ${clause}`, params);
    return Number(rows[0]?.total ?? 0);
  }

  async updateLead(id: number, patch: Partial<Lead>): Promise<Lead | null> {
    const data = { ...patch, updated_at: new Date().toISOString() };
    delete (data as Record<string, unknown>).id;
    return this.patch('leads', id, data as Record<string, unknown>, mapLead);
  }

  async deleteLead(id: number): Promise<void> {
    // lead_events, lead_files и measurements удаляются каскадом (on delete cascade).
    await this.query('delete from leads where id = $1', [id]);
  }

  // ------------------------------------------------------- lead events/files

  async addLeadEvent(event: Omit<LeadEvent, 'id'>): Promise<LeadEvent> {
    return this.insert('lead_events', event as Record<string, unknown>, mapLeadEvent);
  }

  async listLeadEvents(leadId: number): Promise<LeadEvent[]> {
    const rows = await this.query<Row>(
      'select * from lead_events where lead_id = $1 order by created_at asc',
      [leadId],
    );
    return rows.map(mapLeadEvent);
  }

  async addLeadFile(file: Omit<LeadFile, 'id'>): Promise<LeadFile> {
    return this.insert('lead_files', file as Record<string, unknown>, mapLeadFile);
  }

  async listLeadFiles(leadId: number): Promise<LeadFile[]> {
    const rows = await this.query<Row>('select * from lead_files where lead_id = $1', [leadId]);
    return rows.map(mapLeadFile);
  }

  async deleteLeadFiles(leadId: number): Promise<void> {
    await this.query('delete from lead_files where lead_id = $1', [leadId]);
  }

  // ----------------------------------------------------------- measurements

  async createMeasurement(measurement: Omit<Measurement, 'id'>): Promise<Measurement> {
    return this.insert('measurements', measurement as Record<string, unknown>, mapMeasurement);
  }

  async getMeasurement(id: number): Promise<Measurement | null> {
    const rows = await this.query<Row>('select * from measurements where id = $1', [id]);
    return rows[0] ? mapMeasurement(rows[0]) : null;
  }

  async listMeasurements(range: { from?: string; to?: string } = {}): Promise<Measurement[]> {
    const params: unknown[] = [];
    const conditions = ["status <> 'canceled'"];
    if (range.from) {
      params.push(range.from);
      conditions.push(`starts_at >= $${params.length}`);
    }
    if (range.to) {
      params.push(range.to);
      conditions.push(`starts_at <= $${params.length}`);
    }
    const rows = await this.query<Row>(
      `select * from measurements where ${conditions.join(' and ')} order by starts_at asc`,
      params,
    );
    return rows.map(mapMeasurement);
  }

  async listMeasurementsByLead(leadId: number): Promise<Measurement[]> {
    const rows = await this.query<Row>(
      'select * from measurements where lead_id = $1 order by starts_at asc',
      [leadId],
    );
    return rows.map(mapMeasurement);
  }

  async updateMeasurement(id: number, patch: Partial<Measurement>): Promise<Measurement | null> {
    const data = { ...patch, updated_at: new Date().toISOString() };
    delete (data as Record<string, unknown>).id;
    return this.patch('measurements', id, data as Record<string, unknown>, mapMeasurement);
  }

  async countMeasurementsInSlot(startsAt: string, endsAt: string): Promise<number> {
    const rows = await this.query<Row>(
      `select count(*)::int as total from measurements
       where status <> 'canceled' and starts_at < $2 and ends_at > $1`,
      [startsAt, endsAt],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async getMeasurementRules(): Promise<MeasurementRules> {
    const rows = await this.query<Row>('select * from measurement_rules where id = 1');
    if (!rows[0]) {
      await this.query('insert into measurement_rules (id) values (1) on conflict (id) do nothing');
      return {
        weekdays: [1, 2, 3, 4, 5],
        dayStartMinutes: 540,
        dayEndMinutes: 1140,
        slotMinutes: 60,
        capacityPerSlot: 2,
        minLeadHours: 12,
        horizonDays: 14,
        timezone: 'Asia/Almaty',
      };
    }
    const row = rows[0];
    return {
      weekdays: row.weekdays ?? [1, 2, 3, 4, 5],
      dayStartMinutes: Number(row.day_start_minutes),
      dayEndMinutes: Number(row.day_end_minutes),
      slotMinutes: Number(row.slot_minutes),
      capacityPerSlot: Number(row.capacity_per_slot),
      minLeadHours: Number(row.min_lead_hours),
      horizonDays: Number(row.horizon_days),
      timezone: row.timezone,
    };
  }

  async saveMeasurementRules(rules: MeasurementRules): Promise<MeasurementRules> {
    await this.query(
      `insert into measurement_rules
         (id, weekdays, day_start_minutes, day_end_minutes, slot_minutes,
          capacity_per_slot, min_lead_hours, horizon_days, timezone)
       values (1, $1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set
         weekdays = excluded.weekdays,
         day_start_minutes = excluded.day_start_minutes,
         day_end_minutes = excluded.day_end_minutes,
         slot_minutes = excluded.slot_minutes,
         capacity_per_slot = excluded.capacity_per_slot,
         min_lead_hours = excluded.min_lead_hours,
         horizon_days = excluded.horizon_days,
         timezone = excluded.timezone`,
      [
        rules.weekdays,
        rules.dayStartMinutes,
        rules.dayEndMinutes,
        rules.slotMinutes,
        rules.capacityPerSlot,
        rules.minLeadHours,
        rules.horizonDays,
        rules.timezone,
      ],
    );
    return rules;
  }

  async listBlackoutDates(): Promise<string[]> {
    const rows = await this.query<Row>('select to_char(date, \'YYYY-MM-DD\') as date from blackout_dates order by date');
    return rows.map((row) => String(row.date));
  }

  async addBlackoutDate(date: string): Promise<void> {
    await this.query('insert into blackout_dates (date) values ($1) on conflict do nothing', [date]);
  }

  async removeBlackoutDate(date: string): Promise<void> {
    await this.query('delete from blackout_dates where date = $1', [date]);
  }

  // ------------------------------------------------------- gallery / reviews

  async listGallery(filter: { publishedOnly?: boolean; category?: string } = {}): Promise<GalleryItem[]> {
    const params: unknown[] = [];
    const conditions: string[] = [];
    if (filter.publishedOnly) conditions.push('published = true');
    if (filter.category) {
      params.push(filter.category);
      conditions.push(`category = $${params.length}`);
    }
    const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
    const rows = await this.query<Row>(
      `select * from gallery_items ${where} order by sort asc, id desc`,
      params,
    );
    return rows.map(mapGalleryItem);
  }

  async createGalleryItem(item: Omit<GalleryItem, 'id'>): Promise<GalleryItem> {
    return this.insert('gallery_items', item as Record<string, unknown>, mapGalleryItem);
  }

  async updateGalleryItem(id: number, patch: Partial<GalleryItem>): Promise<GalleryItem | null> {
    const data = { ...patch } as Record<string, unknown>;
    delete data.id;
    return this.patch('gallery_items', id, data, mapGalleryItem);
  }

  async deleteGalleryItem(id: number): Promise<void> {
    await this.query('delete from gallery_items where id = $1', [id]);
  }

  async listReviews(filter: { publishedOnly?: boolean } = {}): Promise<CuratedReview[]> {
    const where = filter.publishedOnly ? 'where published = true and consent_obtained = true' : '';
    const rows = await this.query<Row>(`select * from reviews_curated ${where} order by id desc`);
    return rows.map(mapReview);
  }

  async createReview(review: Omit<CuratedReview, 'id'>): Promise<CuratedReview> {
    return this.insert('reviews_curated', review as Record<string, unknown>, mapReview);
  }

  async updateReview(id: number, patch: Partial<CuratedReview>): Promise<CuratedReview | null> {
    const data = { ...patch } as Record<string, unknown>;
    delete data.id;
    return this.patch('reviews_curated', id, data, mapReview);
  }

  async deleteReview(id: number): Promise<void> {
    await this.query('delete from reviews_curated where id = $1', [id]);
  }

  // ---------------------------------------------------------------- claims

  async listClaims(): Promise<ClaimRow[]> {
    const rows = await this.query<Row>('select * from claims');
    return rows.map(mapClaim);
  }

  async upsertClaim(claim: ClaimRow): Promise<ClaimRow> {
    const rows = await this.query<Row>(
      `insert into claims (key, text_ru, status, source, note_for_owner, confirmed_at, confirmed_by)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (key) do update set
         text_ru = excluded.text_ru,
         status = excluded.status,
         source = excluded.source,
         note_for_owner = excluded.note_for_owner,
         confirmed_at = excluded.confirmed_at,
         confirmed_by = excluded.confirmed_by
       returning *`,
      [
        claim.key,
        claim.text_ru,
        claim.status,
        claim.source,
        claim.note_for_owner,
        claim.confirmed_at,
        claim.confirmed_by,
      ],
    );
    return mapClaim(rows[0]);
  }

  // ------------------------------------------------------- staff / users

  async listStaff(activeOnly = false): Promise<Staff[]> {
    const rows = await this.query<Row>(
      `select * from staff ${activeOnly ? 'where active = true' : ''} order by id asc`,
    );
    return rows.map(mapStaff);
  }

  async findStaffByTelegramId(telegramId: string): Promise<Staff | null> {
    const rows = await this.query<Row>('select * from staff where telegram_id = $1', [String(telegramId)]);
    return rows[0] ? mapStaff(rows[0]) : null;
  }

  async findStaffByInviteCode(code: string): Promise<Staff | null> {
    const rows = await this.query<Row>(
      'select * from staff where invite_code = $1 and active = true',
      [code],
    );
    return rows[0] ? mapStaff(rows[0]) : null;
  }

  async createStaff(staff: Omit<Staff, 'id'>): Promise<Staff> {
    return this.insert('staff', staff as Record<string, unknown>, mapStaff);
  }

  async updateStaff(id: number, patch: Partial<Staff>): Promise<Staff | null> {
    const data = { ...patch } as Record<string, unknown>;
    delete data.id;
    return this.patch('staff', id, data, mapStaff);
  }

  async deleteStaff(id: number): Promise<void> {
    await this.query('delete from staff where id = $1', [id]);
  }

  async findUserByEmail(email: string): Promise<AdminUser | null> {
    const rows = await this.query<Row>('select * from users where lower(email) = lower($1)', [email.trim()]);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async getUser(id: number): Promise<AdminUser | null> {
    const rows = await this.query<Row>('select * from users where id = $1', [id]);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async createUser(user: Omit<AdminUser, 'id'>): Promise<AdminUser> {
    return this.insert('users', user as Record<string, unknown>, mapUser);
  }

  async updateUser(id: number, patch: Partial<AdminUser>): Promise<AdminUser | null> {
    const data = { ...patch } as Record<string, unknown>;
    delete data.id;
    return this.patch('users', id, data, mapUser);
  }

  // --------------------------------------------------------- notifications

  async enqueueNotification(notification: Omit<Notification, 'id'>): Promise<Notification> {
    return this.insert('notifications', notification as Record<string, unknown>, mapNotification);
  }

  async listPendingNotifications(nowIso: string, limit = 25): Promise<Notification[]> {
    const rows = await this.query<Row>(
      `select * from notifications
       where status <> 'sent' and next_attempt_at <= $1
       order by next_attempt_at asc limit $2`,
      [nowIso, limit],
    );
    return rows.map(mapNotification);
  }

  async listNotifications(limit = 100): Promise<Notification[]> {
    const rows = await this.query<Row>('select * from notifications order by created_at desc limit $1', [
      limit,
    ]);
    return rows.map(mapNotification);
  }

  async markNotificationSent(id: number): Promise<void> {
    await this.query(
      `update notifications set status = 'sent', sent_at = now(), last_error = null where id = $1`,
      [id],
    );
  }

  async markNotificationFailed(id: number, error: string, nextAttemptAt: string): Promise<void> {
    await this.query(
      `update notifications
       set attempts = attempts + 1,
           last_error = $2,
           next_attempt_at = $3,
           status = case when attempts + 1 >= 6 then 'failed' else 'pending' end
       where id = $1`,
      [id, error.slice(0, 500), nextAttemptAt],
    );
  }

  // ------------------------------------------------------- settings / events

  async getSetting<T = unknown>(key: string): Promise<T | null> {
    const rows = await this.query<Row>('select value from settings where key = $1', [key]);
    return rows[0] ? (rows[0].value as T) : null;
  }

  async getAllSettings(): Promise<Record<string, unknown>> {
    const rows = await this.query<Row>('select key, value from settings');
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    await this.query(
      `insert into settings (key, value, updated_at) values ($1, $2, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [key, JSON.stringify(value ?? null)],
    );
  }

  async recordEvent(event: Omit<SiteEvent, 'id'>): Promise<void> {
    await this.query('insert into events (name, session_id, path, props, created_at) values ($1, $2, $3, $4, $5)', [
      event.name,
      event.session_id,
      event.path,
      event.props ? JSON.stringify(event.props) : null,
      event.created_at,
    ]);
  }

  async countEvents(name: string, sinceIso: string): Promise<number> {
    const rows = await this.query<Row>(
      'select count(*)::int as total from events where name = $1 and created_at >= $2',
      [name, sinceIso],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async listEvents(sinceIso: string, name?: string): Promise<SiteEvent[]> {
    const rows = await this.query<Row>(
      `select * from events where created_at >= $1 ${name ? 'and name = $2' : ''} order by created_at desc`,
      name ? [sinceIso, name] : [sinceIso],
    );
    return rows.map(mapEvent);
  }
}
