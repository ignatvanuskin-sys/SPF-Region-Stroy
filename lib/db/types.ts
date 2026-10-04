/**
 * Модель данных (master prompt §11) и интерфейс хранилища.
 *
 * Бизнес-логика зависит только от интерфейса `Store`, а не от конкретной СУБД
 * (§13: «бизнес-логика независима от транспорта»). Драйверы:
 *   • `pg`   — PostgreSQL, продакшн (db/schema.sql);
 *   • `json` — локальный файл, чтобы сайт работал сразу после `npm run dev`
 *              без поднятой базы. Поведение и модель данных те же.
 */

import type { LeadStatus } from '@/lib/domain/statuses';

export type Segment = 'b2c' | 'b2b';
export type LeadPriority = 'normal' | 'high';
export type MeasurementStatus = 'pending' | 'confirmed' | 'done' | 'canceled' | 'rescheduled';
export type NotificationStatus = 'pending' | 'sent' | 'failed';
export type NotificationChannel = 'telegram' | 'email' | 'webhook';
export type UserRole = 'owner' | 'manager' | 'viewer';
export type StaffRole = 'owner' | 'manager' | 'measurer';

export interface Lead {
  id: number;
  submission_id: string;
  segment: Segment;
  name: string;
  phone: string;
  phone_normalized: string;
  email: string | null;
  product_type: string | null;
  calc_payload: Record<string, unknown> | null;
  district: string | null;
  comment: string | null;
  status: LeadStatus;
  assignee_id: number | null;
  priority: LeadPriority;
  source: string;
  utm: Record<string, string> | null;
  referrer: string | null;
  landing_path: string | null;
  request_path: string | null;
  device: string | null;
  locale: string;
  consent_at: string | null;
  consent_text_version: string | null;
  lost_reason: string | null;
  review_requested_at: string | null;
  created_at: string;
  updated_at: string;
  first_response_at: string | null;
}

export interface LeadEvent {
  id: number;
  lead_id: number;
  type: string;
  actor_id: number | null;
  actor_label: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface LeadFile {
  id: number;
  lead_id: number;
  storage_key: string;
  original_name: string;
  mime: string;
  size: number;
  created_at: string;
}

export interface Measurement {
  id: number;
  lead_id: number;
  starts_at: string;
  ends_at: string;
  district: string | null;
  street: string | null;
  house: string | null;
  flat: string | null;
  status: MeasurementStatus;
  assignee_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryItem {
  id: number;
  title: string;
  category: string;
  storage_key: string;
  width: number | null;
  height: number | null;
  district: string | null;
  before_after_pair_id: number | null;
  sort: number;
  featured: boolean;
  published: boolean;
  created_at: string;
}

export interface CuratedReview {
  id: number;
  author_label: string;
  text: string;
  source_url: string;
  consent_obtained: boolean;
  published: boolean;
  created_at: string;
}

export interface ClaimRow {
  key: string;
  text_ru: string;
  status: 'confirmed' | 'unconfirmed';
  source: '2gis' | 'owner' | 'none';
  note_for_owner: string | null;
  confirmed_at: string | null;
  confirmed_by: number | null;
}

export interface Staff {
  id: number;
  telegram_id: string;
  name: string;
  role: StaffRole;
  active: boolean;
  invite_code: string | null;
  created_at: string;
}

export interface AdminUser {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  name: string;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  channel: NotificationChannel;
  target: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface SiteEvent {
  id: number;
  name: string;
  session_id: string | null;
  path: string | null;
  props: Record<string, unknown> | null;
  created_at: string;
}

export interface LeadFilter {
  search?: string;
  status?: LeadStatus[];
  source?: string;
  productType?: string;
  segment?: Segment;
  assigneeId?: number;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface MeasurementRules {
  /** Дни недели, когда выезды возможны: 0=вс … 6=сб. */
  weekdays: number[];
  /** Начало и конец рабочего дня в минутах от полуночи (Asia/Almaty). */
  dayStartMinutes: number;
  dayEndMinutes: number;
  slotMinutes: number;
  /** Сколько бригад могут выехать в один слот. */
  capacityPerSlot: number;
  /** Ближайшая возможная запись — не раньше, чем через N часов. */
  minLeadHours: number;
  /** На сколько дней вперёд открыта запись. */
  horizonDays: number;
  timezone: string;
}

export interface Store {
  readonly driver: 'pg' | 'json';
  init(): Promise<void>;

  // --- leads ---
  createLead(lead: Omit<Lead, 'id'>): Promise<Lead>;
  getLead(id: number): Promise<Lead | null>;
  getLeadBySubmissionId(submissionId: string): Promise<Lead | null>;
  findRecentLeadByPhone(phoneNormalized: string, sinceIso: string): Promise<Lead | null>;
  listLeads(filter?: LeadFilter): Promise<Lead[]>;
  countLeads(filter?: LeadFilter): Promise<number>;
  updateLead(id: number, patch: Partial<Lead>): Promise<Lead | null>;
  deleteLead(id: number): Promise<void>;

  // --- lead events / files ---
  addLeadEvent(event: Omit<LeadEvent, 'id'>): Promise<LeadEvent>;
  listLeadEvents(leadId: number): Promise<LeadEvent[]>;
  addLeadFile(file: Omit<LeadFile, 'id'>): Promise<LeadFile>;
  listLeadFiles(leadId: number): Promise<LeadFile[]>;
  deleteLeadFiles(leadId: number): Promise<void>;

  // --- measurements ---
  createMeasurement(measurement: Omit<Measurement, 'id'>): Promise<Measurement>;
  getMeasurement(id: number): Promise<Measurement | null>;
  listMeasurements(range?: { from?: string; to?: string }): Promise<Measurement[]>;
  listMeasurementsByLead(leadId: number): Promise<Measurement[]>;
  updateMeasurement(id: number, patch: Partial<Measurement>): Promise<Measurement | null>;
  countMeasurementsInSlot(startsAt: string, endsAt: string): Promise<number>;
  getMeasurementRules(): Promise<MeasurementRules>;
  saveMeasurementRules(rules: MeasurementRules): Promise<MeasurementRules>;
  listBlackoutDates(): Promise<string[]>;
  addBlackoutDate(date: string): Promise<void>;
  removeBlackoutDate(date: string): Promise<void>;

  // --- gallery / reviews ---
  listGallery(filter?: { publishedOnly?: boolean; category?: string }): Promise<GalleryItem[]>;
  createGalleryItem(item: Omit<GalleryItem, 'id'>): Promise<GalleryItem>;
  updateGalleryItem(id: number, patch: Partial<GalleryItem>): Promise<GalleryItem | null>;
  deleteGalleryItem(id: number): Promise<void>;
  listReviews(filter?: { publishedOnly?: boolean }): Promise<CuratedReview[]>;
  createReview(review: Omit<CuratedReview, 'id'>): Promise<CuratedReview>;
  updateReview(id: number, patch: Partial<CuratedReview>): Promise<CuratedReview | null>;
  deleteReview(id: number): Promise<void>;

  // --- claims ---
  listClaims(): Promise<ClaimRow[]>;
  upsertClaim(claim: ClaimRow): Promise<ClaimRow>;

  // --- staff / admin users ---
  listStaff(activeOnly?: boolean): Promise<Staff[]>;
  findStaffByTelegramId(telegramId: string): Promise<Staff | null>;
  findStaffByInviteCode(code: string): Promise<Staff | null>;
  createStaff(staff: Omit<Staff, 'id'>): Promise<Staff>;
  updateStaff(id: number, patch: Partial<Staff>): Promise<Staff | null>;
  deleteStaff(id: number): Promise<void>;
  findUserByEmail(email: string): Promise<AdminUser | null>;
  getUser(id: number): Promise<AdminUser | null>;
  createUser(user: Omit<AdminUser, 'id'>): Promise<AdminUser>;
  updateUser(id: number, patch: Partial<AdminUser>): Promise<AdminUser | null>;

  // --- notifications (outbox) ---
  enqueueNotification(notification: Omit<Notification, 'id'>): Promise<Notification>;
  listPendingNotifications(nowIso: string, limit?: number): Promise<Notification[]>;
  listNotifications(limit?: number): Promise<Notification[]>;
  markNotificationSent(id: number): Promise<void>;
  markNotificationFailed(id: number, error: string, nextAttemptAt: string): Promise<void>;

  // --- settings / events ---
  getSetting<T = unknown>(key: string): Promise<T | null>;
  getAllSettings(): Promise<Record<string, unknown>>;
  setSetting(key: string, value: unknown): Promise<void>;
  recordEvent(event: Omit<SiteEvent, 'id'>): Promise<void>;
  countEvents(name: string, sinceIso: string): Promise<number>;
  listEvents(sinceIso: string, name?: string): Promise<SiteEvent[]>;
}
