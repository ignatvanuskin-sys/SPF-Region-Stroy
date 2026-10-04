'use server';

/**
 * Серверные действия админки (§9, §12).
 *
 * Почему действия, а не отдельные REST-эндпоинты: каждое действие исполняется
 * на сервере, само проверяет сессию и роль, и его нельзя вызвать в обход
 * интерфейса. Функционально это те же «админские /api/admin/*» с проверкой
 * роли из §12, только без дублирования проверок в каждом маршруте.
 *
 * Все действия возвращают простой результат { ok, message }, который форма
 * показывает пользователю. Никаких секретов и хешей наружу не отдаём.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getStore } from '@/lib/db';
import {
  createUserSession,
  destroyUserSession,
  generateInviteCode,
  generateTemporaryPassword,
  getCurrentUser,
  hashPassword,
  requireUser,
  verifyPassword,
} from '@/lib/session';
import { addLeadNote, assignLead, changeLeadStatus, deleteLeadData } from '@/lib/domain/leads';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/domain/statuses';
import { claimUpdateSchema, adminLoginSchema } from '@/lib/validation';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  deleteLocalFile,
  optimizeImage,
  saveLocalFile,
  validateUpload,
} from '@/lib/storage';
import { randomUUID } from 'node:crypto';

export interface ActionResult {
  ok: boolean;
  message: string;
}

const ok = (message: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });

function text(form: FormData, key: string, max = 500): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function num(form: FormData, key: string): number | null {
  const value = form.get(key);
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bool(form: FormData, key: string): boolean {
  const value = form.get(key);
  return value === 'on' || value === 'true' || value === '1';
}

// --------------------------------------------------------------------- вход

export async function loginAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = adminLoginSchema.safeParse({ email: text(form, 'email', 200), password: String(form.get('password') ?? '') });
  if (!parsed.success) {
    return fail('Проверьте e-mail и пароль: пароль должен быть не короче 8 символов.');
  }

  const store = getStore();
  const user = await store.findUserByEmail(parsed.data.email);

  // Одинаковый ответ для «нет пользователя» и «неверный пароль»: не подсказываем,
  // какие адреса зарегистрированы.
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return fail('Неверный e-mail или пароль.');
  }

  await createUserSession(user);
  await store.updateUser(user.id, { last_login_at: new Date().toISOString() });

  // Если в базе нет ни одного сотрудника с Telegram, подскажем это в логе.
  if (user.must_change_password) {
    return ok('Вход выполнен. Смените пароль — он был создан автоматически.');
  }
  return ok('Вход выполнен');
}

export async function logoutAction(): Promise<void> {
  await destroyUserSession();
  redirect('/admin/login');
}

export async function changePasswordAction(form: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Нужен вход в админку');

  const current = String(form.get('current_password') ?? '');
  const next = String(form.get('new_password') ?? '');
  const repeat = String(form.get('repeat_password') ?? '');

  if (next.length < 10) return fail('Новый пароль — минимум 10 символов.');
  if (next !== repeat) return fail('Пароли не совпадают.');
  if (next === current) return fail('Новый пароль должен отличаться от текущего.');
  if (!(await verifyPassword(current, user.password_hash))) return fail('Текущий пароль указан неверно.');

  await getStore().updateUser(user.id, {
    password_hash: await hashPassword(next),
    must_change_password: false,
  });

  return ok('Пароль обновлён. Используйте его при следующем входе.');
}

// --------------------------------------------------------------------- лиды

export async function leadStatusAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner', 'manager']);
  if (!user) return fail('Недостаточно прав');

  const leadId = num(form, 'lead_id');
  const status = text(form, 'status', 30) as LeadStatus;
  if (!leadId || !LEAD_STATUSES.includes(status)) return fail('Некорректный статус');

  const lostReason = text(form, 'lost_reason', 40);

  try {
    await changeLeadStatus(leadId, status, {
      actorId: user.id,
      actorLabel: user.name || user.email,
      lostReason: lostReason || null,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Не удалось изменить статус');
  }

  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin');
  return ok('Статус обновлён');
}

export async function leadAssignAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner', 'manager']);
  if (!user) return fail('Недостаточно прав');

  const leadId = num(form, 'lead_id');
  if (!leadId) return fail('Некорректная заявка');

  const staffId = num(form, 'staff_id');
  await assignLead(leadId, staffId, user.name || user.email);

  revalidatePath(`/admin/leads/${leadId}`);
  return ok(staffId ? 'Ответственный назначен' : 'Ответственный снят');
}

export async function leadNoteAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner', 'manager']);
  if (!user) return fail('Недостаточно прав');

  const leadId = num(form, 'lead_id');
  const note = text(form, 'note', 1000);
  if (!leadId || note.length < 2) return fail('Введите текст заметки');

  await addLeadNote(leadId, note, user.name || user.email);
  revalidatePath(`/admin/leads/${leadId}`);
  return ok('Заметка добавлена');
}

export async function leadDeleteAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner']);
  if (!user) return fail('Удалять данные может только владелец');

  const leadId = num(form, 'lead_id');
  if (!leadId) return fail('Некорректная заявка');

  const files = await getStore().listLeadFiles(leadId);
  for (const file of files) {
    await deleteLocalFile(file.storage_key);
  }
  await deleteLeadData(leadId);

  revalidatePath('/admin/leads');
  revalidatePath('/admin');
  return ok('Данные клиента удалены');
}

// ------------------------------------------------------------------- замеры

export async function measurementUpdateAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner', 'manager']);
  if (!user) return fail('Недостаточно прав');

  const id = num(form, 'measurement_id');
  const status = text(form, 'status', 30);
  if (!id || !['pending', 'confirmed', 'done', 'canceled', 'rescheduled'].includes(status)) {
    return fail('Некорректный статус замера');
  }

  const store = getStore();
  const measurement = await store.updateMeasurement(id, { status: status as never });
  if (!measurement) return fail('Замер не найден');

  const eventType =
    status === 'confirmed'
      ? 'measure_confirmed'
      : status === 'canceled'
        ? 'measure_canceled'
        : status === 'done'
          ? 'measure_done'
          : status === 'rescheduled'
            ? 'measure_rescheduled'
            : null;

  if (eventType) {
    await store.addLeadEvent({
      lead_id: measurement.lead_id,
      type: eventType,
      actor_id: user.id,
      actor_label: user.name || user.email,
      payload: { measurementId: id },
      created_at: new Date().toISOString(),
    });
  }

  revalidatePath('/admin/measurements');
  revalidatePath(`/admin/leads/${measurement.lead_id}`);
  return ok('Замер обновлён');
}

export async function measurementRulesAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner']);
  if (!user) return fail('Менять правила может только владелец');

  const weekdays = ['0', '1', '2', '3', '4', '5', '6']
    .filter((day) => bool(form, `weekday_${day}`))
    .map(Number);

  if (weekdays.length === 0) return fail('Выберите хотя бы один рабочий день.');

  await getStore().saveMeasurementRules({
    weekdays,
    dayStartMinutes: (num(form, 'day_start') ?? 9) * 60,
    dayEndMinutes: (num(form, 'day_end') ?? 19) * 60,
    slotMinutes: num(form, 'slot_minutes') ?? 60,
    capacityPerSlot: num(form, 'capacity') ?? 2,
    minLeadHours: num(form, 'min_lead_hours') ?? 12,
    horizonDays: num(form, 'horizon_days') ?? 14,
    timezone: 'Asia/Almaty',
  });

  revalidatePath('/admin/measurements');
  revalidatePath('/zamer');
  return ok('Расписание замеров сохранено');
}

export async function blackoutAddAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner', 'manager']);
  if (!user) return fail('Недостаточно прав');

  const date = text(form, 'date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Выберите дату');

  await getStore().addBlackoutDate(date);
  revalidatePath('/admin/measurements');
  revalidatePath('/zamer');
  return ok('Дата закрыта для записи');
}

export async function blackoutRemoveAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner', 'manager']);
  if (!user) return fail('Недостаточно прав');

  const date = text(form, 'date', 10);
  await getStore().removeBlackoutDate(date);
  revalidatePath('/admin/measurements');
  revalidatePath('/zamer');
  return ok('Дата снова открыта');
}

// ------------------------------------------------------------- утверждения

export async function claimUpdateAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner']);
  if (!user) return fail('Подтверждать утверждения может только владелец');

  const parsed = claimUpdateSchema.safeParse({
    key: text(form, 'key', 80),
    textRu: text(form, 'text_ru', 500),
    status: text(form, 'status', 20),
  });
  if (!parsed.success) return fail('Проверьте текст утверждения');

  const store = getStore();
  await store.upsertClaim({
    key: parsed.data.key,
    text_ru: parsed.data.textRu,
    status: parsed.data.status,
    source: 'owner',
    note_for_owner: null,
    confirmed_at: parsed.data.status === 'confirmed' ? new Date().toISOString() : null,
    confirmed_by: user.id,
  });

  // Публичные страницы читают утверждения из БД — обновляем их кэш.
  revalidatePath('/', 'layout');
  return ok(parsed.data.status === 'confirmed' ? 'Утверждение подтверждено' : 'Утверждение снято');
}

// ------------------------------------------------------------------ настройки

export async function settingsUpdateAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner']);
  if (!user) return fail('Менять настройки может только владелец');

  const store = getStore();
  const updates: [string, unknown][] = [
    ['phone_primary', text(form, 'phone_primary', 20)],
    ['phone_secondary', text(form, 'phone_secondary', 20)],
    ['whatsapp_primary', text(form, 'whatsapp_primary', 20).replace(/\D/g, '')],
    ['whatsapp_secondary', text(form, 'whatsapp_secondary', 20).replace(/\D/g, '')],
    ['email', text(form, 'email', 160)],
    ['instagram', text(form, 'instagram', 300)],
    ['notify_email_to', text(form, 'notify_email_to', 160)],
    ['notify_webhook_url', text(form, 'notify_webhook_url', 500)],
    ['ym_counter_id', text(form, 'ym_counter_id', 40)],
    ['ga4_id', text(form, 'ga4_id', 40)],
    ['meta_pixel_id', text(form, 'meta_pixel_id', 40)],
  ];

  for (const [key, value] of updates) {
    if (typeof value === 'string' && value.length > 0) await store.setSetting(key, value);
  }

  // График работы: пустое поле = не подтверждён, показываем нейтральную фразу.
  const hoursText = text(form, 'working_hours_text', 120);
  await store.setSetting('working_hours', {
    text: hoursText || null,
    workdays: ['1', '2', '3', '4', '5', '6', '0']
      .filter((day) => bool(form, `hours_day_${day}`))
      .map(Number),
    startMinutes: (num(form, 'hours_start') ?? 9) * 60,
    endMinutes: (num(form, 'hours_end') ?? 19) * 60,
  });

  // Рейтинг 2ГИС обновляется вручную — это сторонние данные (§3.5).
  await store.setSetting('rating', {
    value: num(form, 'rating_value') ?? 0,
    ratingsCount: num(form, 'rating_count') ?? 0,
    reviewsCount: num(form, 'reviews_count') ?? 0,
    photosCount: num(form, 'photos_count') ?? 0,
    checkedAt: text(form, 'rating_checked_at', 10) || new Date().toISOString().slice(0, 10),
  });

  await store.setSetting('price_display', text(form, 'price_display', 10) === 'range' ? 'range' : 'off');

  await store.setSetting('sla', {
    firstResponseMinutes: num(form, 'sla_minutes') ?? 10,
    businessHoursOnly: bool(form, 'sla_business_hours'),
  });

  await store.setSetting('kk_enabled', bool(form, 'kk_enabled'));
  await store.setSetting('ai_enabled', bool(form, 'ai_enabled'));
  await store.setSetting('order_status_page_enabled', bool(form, 'order_status_page_enabled'));

  revalidatePath('/', 'layout');
  return ok('Настройки сохранены');
}

// ------------------------------------------------------------------ галерея

export async function galleryUploadAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner', 'manager']);
  if (!user) return fail('Недостаточно прав');

  const file = form.get('image');
  if (!(file instanceof File) || file.size === 0) return fail('Выберите файл изображения');

  const check = validateUpload(file.type, file.size, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES);
  if (!check.ok) return fail(check.message);

  const title = text(form, 'title', 160);
  if (title.length < 2) return fail('Укажите подпись к фото');

  const category = text(form, 'category', 60);
  if (!category) return fail('Выберите категорию');

  try {
    const original = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeImage(original, file.type);
    const stored = await saveLocalFile(optimized.data, optimized.mime === 'image/webp' ? 'webp' : check.extension, file.name, optimized.mime);

    await getStore().createGalleryItem({
      title,
      category,
      storage_key: stored.key,
      width: null,
      height: null,
      district: text(form, 'district', 80) || null,
      before_after_pair_id: null,
      sort: num(form, 'sort') ?? 0,
      featured: bool(form, 'featured'),
      published: bool(form, 'published'),
      created_at: new Date().toISOString(),
    });

    revalidatePath('/admin/gallery');
    revalidatePath('/raboty');
    revalidatePath('/');
    return ok(optimized.note ? `Фото загружено. ${optimized.note}` : 'Фото загружено и оптимизировано');
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Не удалось загрузить фото');
  }
}

export async function galleryUpdateAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner', 'manager']);
  if (!user) return fail('Недостаточно прав');

  const id = num(form, 'id');
  if (!id) return fail('Некорректная запись');

  await getStore().updateGalleryItem(id, {
    title: text(form, 'title', 160) || undefined,
    category: text(form, 'category', 60) || undefined,
    published: bool(form, 'published'),
    featured: bool(form, 'featured'),
    sort: num(form, 'sort') ?? 0,
  });

  revalidatePath('/admin/gallery');
  revalidatePath('/raboty');
  revalidatePath('/');
  return ok('Изменения сохранены');
}

export async function galleryDeleteAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner', 'manager']);
  if (!user) return fail('Недостаточно прав');

  const id = num(form, 'id');
  if (!id) return fail('Некорректная запись');

  const store = getStore();
  const item = (await store.listGallery()).find((entry) => entry.id === id);
  if (item) await deleteLocalFile(item.storage_key);
  await store.deleteGalleryItem(id);

  revalidatePath('/admin/gallery');
  revalidatePath('/raboty');
  revalidatePath('/');
  return ok('Фото удалено');
}

// ------------------------------------------------------------------- отзывы

export async function reviewSaveAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner']);
  if (!user) return fail('Работать с отзывами может только владелец');

  const id = num(form, 'id');
  const textRu = text(form, 'text', 1500);
  const authorLabel = text(form, 'author_label', 80);
  const sourceUrl = text(form, 'source_url', 500);

  if (textRu.length < 10) return fail('Слишком короткий текст отзыва');
  if (authorLabel.length < 2) return fail('Укажите имя автора в формате «Имя Ф.»');
  if (!/^https?:\/\//.test(sourceUrl)) return fail('Нужна ссылка на источник отзыва');

  const payload = {
    author_label: authorLabel,
    text: textRu,
    source_url: sourceUrl,
    consent_obtained: bool(form, 'consent_obtained'),
    published: bool(form, 'published'),
  };

  const store = getStore();
  if (id) {
    await store.updateReview(id, payload);
  } else {
    await store.createReview({ ...payload, created_at: new Date().toISOString() });
  }

  revalidatePath('/admin/reviews');
  revalidatePath('/otzyvy');
  return ok(
    payload.published && payload.consent_obtained
      ? 'Отзыв опубликован'
      : 'Сохранено. Отзыв появится на сайте только с отметкой о согласии автора.',
  );
}

export async function reviewDeleteAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner']);
  if (!user) return fail('Недостаточно прав');

  const id = num(form, 'id');
  if (!id) return fail('Некорректная запись');
  await getStore().deleteReview(id);

  revalidatePath('/admin/reviews');
  revalidatePath('/otzyvy');
  return ok('Отзыв удалён');
}

// ---------------------------------------------------------------- сотрудники

export async function staffInviteAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner']);
  if (!user) return fail('Приглашать сотрудников может только владелец');

  const name = text(form, 'name', 80);
  const role = text(form, 'role', 20);
  if (name.length < 2) return fail('Укажите имя сотрудника');
  if (!['owner', 'manager', 'measurer'].includes(role)) return fail('Некорректная роль');

  const code = generateInviteCode();
  await getStore().createStaff({
    telegram_id: `invite-${randomUUID()}`,
    name,
    role: role as never,
    active: true,
    invite_code: code,
    created_at: new Date().toISOString(),
  });

  revalidatePath('/admin/settings');
  return ok(`Код приглашения для ${name}: ${code}. Отправьте его сотруднику — он введёт /start КОД в боте.`);
}

export async function staffUpdateAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner']);
  if (!user) return fail('Недостаточно прав');

  const id = num(form, 'id');
  if (!id) return fail('Некорректная запись');

  await getStore().updateStaff(id, {
    name: text(form, 'name', 80) || undefined,
    role: (text(form, 'role', 20) || undefined) as never,
    active: bool(form, 'active'),
  });

  revalidatePath('/admin/settings');
  return ok('Данные сотрудника обновлены');
}

export async function staffDeleteAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner']);
  if (!user) return fail('Недостаточно прав');

  const id = num(form, 'id');
  if (!id) return fail('Некорректная запись');

  // При увольнении сотрудника доступ к уведомлениям отзывается немедленно (§15).
  await getStore().deleteStaff(id);
  revalidatePath('/admin/settings');
  return ok('Сотрудник удалён. Не забудьте убрать его из Telegram-чата.');
}

// ------------------------------------------------------------------ пользователи

export async function userCreateAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner']);
  if (!user) return fail('Добавлять пользователей может только владелец');

  const email = text(form, 'email', 160).toLowerCase();
  const name = text(form, 'name', 80);
  const role = text(form, 'role', 20);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Проверьте e-mail');
  if (!['owner', 'manager', 'viewer'].includes(role)) return fail('Некорректная роль');

  const store = getStore();
  if (await store.findUserByEmail(email)) return fail('Пользователь с таким e-mail уже есть');

  const temporary = generateTemporaryPassword();
  await store.createUser({
    email,
    name,
    role: role as never,
    password_hash: await hashPassword(temporary),
    must_change_password: true,
    last_login_at: null,
    created_at: new Date().toISOString(),
  });

  revalidatePath('/admin/settings');
  return ok(`Пользователь создан. Временный пароль: ${temporary} — передайте его лично и попросите сменить при входе.`);
}

// ------------------------------------------------------------------ экспорт

export async function exportLeadsAction(form: FormData): Promise<ActionResult> {
  const user = await requireUser(['owner', 'manager']);
  if (!user) return fail('Недостаточно прав');

  const status = text(form, 'status', 30);
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  redirect(`/api/admin/export${query}`);
}
