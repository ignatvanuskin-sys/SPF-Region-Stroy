import { Card } from '@/components/ui/card';
import { Alert, Badge } from '@/components/ui/feedback';
import { Input, Label, Select } from '@/components/ui/form-controls';
import { ActionForm, InlineActionForm } from '@/components/admin/action-form';
import {
  settingsUpdateAction,
  staffDeleteAction,
  staffInviteAction,
  staffUpdateAction,
  userCreateAction,
} from '@/app/admin/actions';
import { getSiteConfig } from '@/lib/domain/settings';
import { getCurrentUser } from '@/lib/session';
import { getStore } from '@/lib/db';
import { telegramNotifier } from '@/lib/notify/channels';

export const dynamic = 'force-dynamic';

const WEEKDAYS = [
  { value: '1', label: 'Пн' },
  { value: '2', label: 'Вт' },
  { value: '3', label: 'Ср' },
  { value: '4', label: 'Чт' },
  { value: '5', label: 'Пт' },
  { value: '6', label: 'Сб' },
  { value: '0', label: 'Вс' },
];

/**
 * Настройки (§9.8).
 *
 * Всё, что владелец должен менять без программиста: контакты, график, рейтинг,
 * режим показа цен, SLA, сотрудники и их доступ к боту.
 *
 * Цены по умолчанию выключены: пока прайса нет, режим `off` не показывает ни
 * одной цифры ни в интерфейсе, ни в ответе API.
 */
export default async function SettingsPage() {
  const user = await getCurrentUser();
  const config = await getSiteConfig();
  const store = getStore();

  const [staff, users] = await Promise.all([store.listStaff(), store.listStaff(true)]);

  if (user?.role !== 'owner') {
    return (
      <Alert tone="warning">
        Настройки доступны только владельцу: здесь задаются телефоны компании, условия замера и доступ
        сотрудников.
      </Alert>
    );
  }

  const telegramReady = telegramNotifier.isConfigured() && Boolean(process.env.TELEGRAM_LEADS_CHAT_ID);
  const workdays = config.workingHours.workdays.map(String);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
        <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
          Изменения применяются сразу — перезапуск сайта не нужен.
        </p>
      </div>

      {/* Состояние интеграций */}
      <Card className="p-5">
        <p className="font-bold">Состояние каналов</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={telegramReady ? 'success' : 'danger'}>
            Telegram: {telegramReady ? 'настроен' : 'не настроен'}
          </Badge>
          <Badge tone={process.env.RESEND_API_KEY ? 'success' : 'warning'}>
            E-mail (запасной канал): {process.env.RESEND_API_KEY ? 'настроен' : 'не настроен'}
          </Badge>
          <Badge tone={process.env.CRON_SECRET ? 'success' : 'danger'}>
            Cron: {process.env.CRON_SECRET ? 'защищён' : 'нет CRON_SECRET'}
          </Badge>
          <Badge tone={store.driver === 'pg' ? 'success' : 'info'}>
            Хранилище: {store.driver === 'pg' ? 'PostgreSQL' : 'локальный файл'}
          </Badge>
          <Badge tone={config.priceDisplay === 'off' ? 'neutral' : 'cta'}>
            Показ цен: {config.priceDisplay === 'off' ? 'выключен' : 'диапазон'}
          </Badge>
        </div>
        {!telegramReady ? (
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
            Пока Telegram не настроен, заявки всё равно сохраняются и видны в админке, но менеджер не
            получит уведомление. Без правки в коде:
            <br />
            1. Создайте бота у @BotFather и укажите токен в TELEGRAM_BOT_TOKEN.
            <br />
            2. Добавьте бота в служебный чат и укажите его ID в TELEGRAM_LEADS_CHAT_ID.
            <br />
            3. Зарегистрируйте webhook на /api/telegram/webhook (см. README).
          </p>
        ) : null}
      </Card>

      <ActionForm
        action={settingsUpdateAction}
        submitLabel="Сохранить настройки"
        pendingLabel="Сохраняем…"
        className="space-y-4"
        buttonClassName="min-h-12 px-6"
      >
        <Card className="p-5">
          <p className="font-bold">Контакты</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">Основной телефон</Label>
              <Input id="s-phone" name="phone_primary" type="tel" defaultValue={config.phonePrimary} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-phone2">Второй телефон</Label>
              <Input id="s-phone2" name="phone_secondary" type="tel" defaultValue={config.phoneSecondary} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-wa">Основной WhatsApp (цифры)</Label>
              <Input id="s-wa" name="whatsapp_primary" inputMode="numeric" defaultValue={config.whatsappPrimary} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-wa2">Второй WhatsApp (цифры)</Label>
              <Input id="s-wa2" name="whatsapp_secondary" inputMode="numeric" defaultValue={config.whatsappSecondary} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-email">E-mail</Label>
              <Input id="s-email" name="email" type="email" defaultValue={config.email} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-instagram">Instagram</Label>
              <Input id="s-instagram" name="instagram" type="url" defaultValue={config.instagram} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-bold">График работы</p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
            Пока текст графика не заполнен, на сайте показывается «Режим работы уточняйте у менеджера».
          </p>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-hours">Текст для сайта</Label>
              <Input
                id="s-hours"
                name="working_hours_text"
                defaultValue={config.workingHours.text ?? ''}
                placeholder="Пн–Пт 09:00–18:00, Сб 10:00–15:00"
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-[0.875rem] font-semibold">Рабочие дни (для SLA-контроля)</legend>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <label
                    key={day.value}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] px-3 text-[0.875rem]"
                  >
                    <input
                      type="checkbox"
                      name={`hours_day_${day.value}`}
                      defaultChecked={workdays.includes(day.value)}
                      className="size-4 accent-[var(--color-glass)]"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="s-hours-start">Начало (час)</Label>
                <Input
                  id="s-hours-start"
                  name="hours_start"
                  type="number"
                  min={0}
                  max={23}
                  defaultValue={config.workingHours.startMinutes / 60}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-hours-end">Конец (час)</Label>
                <Input
                  id="s-hours-end"
                  name="hours_end"
                  type="number"
                  min={1}
                  max={24}
                  defaultValue={config.workingHours.endMinutes / 60}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-bold">Рейтинг в 2ГИС</p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
            Обновляйте раз в месяц вручную. Мы не парсим 2ГИС — цифры вводит владелец.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-rating">Рейтинг</Label>
              <Input
                id="s-rating"
                name="rating_value"
                type="number"
                step="0.1"
                min={0}
                max={5}
                defaultValue={config.rating.value}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-ratings">Количество оценок</Label>
              <Input id="s-ratings" name="rating_count" type="number" defaultValue={config.rating.ratingsCount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-reviews">Количество отзывов</Label>
              <Input id="s-reviews" name="reviews_count" type="number" defaultValue={config.rating.reviewsCount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-photos">Количество фото</Label>
              <Input id="s-photos" name="photos_count" type="number" defaultValue={config.rating.photosCount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-checked">Дата проверки</Label>
              <Input
                id="s-checked"
                name="rating_checked_at"
                type="date"
                defaultValue={config.rating.checkedAt}
              />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-bold">Цены в калькуляторе</p>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="s-price">Режим</Label>
            <Select id="s-price" name="price_display" defaultValue={config.priceDisplay}>
              <option value="off">Не показывать цены (рекомендуется, пока нет прайса)</option>
              <option value="range">Показывать диапазон «от–до» с пометкой «после замера»</option>
            </Select>
            <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
              Режим «диапазон» заработает только после заполнения коэффициентов в базе (таблица price_rules).
              Пока коэффициентов нет, цена не считается даже при включённом режиме.
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-bold">Контроль скорости ответа (SLA)</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-sla">Напомнить, если заявку не взяли, минут</Label>
              <Input
                id="s-sla"
                name="sla_minutes"
                type="number"
                min={1}
                max={240}
                defaultValue={config.sla.firstResponseMinutes}
              />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 self-end text-[0.875rem]">
              <input
                type="checkbox"
                name="sla_business_hours"
                defaultChecked={config.sla.businessHoursOnly}
                className="size-4 accent-[var(--color-glass)]"
              />
              Считать только рабочее время
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-bold">Запасные каналы и аналитика</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-notify-email">E-mail для уведомлений</Label>
              <Input
                id="s-notify-email"
                name="notify_email_to"
                type="email"
                defaultValue={config.notify.emailTo ?? ''}
                placeholder="manager@example.kz"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-webhook">Webhook для CRM</Label>
              <Input
                id="s-webhook"
                name="notify_webhook_url"
                type="url"
                defaultValue={config.notify.webhookUrl ?? ''}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-ym">Идентификатор Яндекс.Метрики</Label>
              <Input id="s-ym" name="ym_counter_id" defaultValue={config.analytics.ymCounterId ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-ga4">GA4</Label>
              <Input id="s-ga4" name="ga4_id" defaultValue={config.analytics.ga4Id ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-meta">Meta Pixel</Label>
              <Input id="s-meta" name="meta_pixel_id" defaultValue={config.analytics.metaPixelId ?? ''} />
            </div>
          </div>
          <p className="mt-3 text-[0.75rem] text-[var(--color-ink-muted)]">
            Счётчики подключаются только после согласия посетителя на аналитику.
          </p>
        </Card>

        <Card className="p-5">
          <p className="font-bold">Фиче-флаги</p>
          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-[0.875rem]">
              <input
                type="checkbox"
                name="kk_enabled"
                defaultChecked={config.flags.kkEnabled}
                className="size-4 accent-[var(--color-glass)]"
              />
              Казахская версия сайта (фаза 2)
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[0.875rem]">
              <input
                type="checkbox"
                name="ai_enabled"
                defaultChecked={config.flags.aiEnabled}
                className="size-4 accent-[var(--color-glass)]"
              />
              AI-ассистент на сайте (фаза 3)
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[0.875rem]">
              <input
                type="checkbox"
                name="order_status_page_enabled"
                defaultChecked={config.flags.orderStatusPageEnabled}
                className="size-4 accent-[var(--color-glass)]"
              />
              Страница статуса заказа (фаза 2)
            </label>
          </div>
        </Card>

      </ActionForm>

      {/* Сотрудники */}
      <Card className="p-5">
        <p className="font-bold">Сотрудники и доступ к боту</p>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
          Создайте сотрудника, получите код и отправьте его человеку. Он напишет боту{' '}
          <code>/start КОД</code> — и начнёт получать заявки.
        </p>

        <ActionForm action={staffInviteAction} submitLabel="Создать приглашение" variant="outline" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Имя</Label>
              <Input id="staff-name" name="name" placeholder="Айгуль" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-role">Роль</Label>
              <Select id="staff-role" name="role" defaultValue="manager">
                <option value="manager">Менеджер — заявки и замеры</option>
                <option value="measurer">Замерщик — только замеры</option>
                <option value="owner">Владелец — всё</option>
              </Select>
            </div>
          </div>
        </ActionForm>

        {staff.length > 0 ? (
          <ul className="mt-4 divide-y divide-[var(--color-line)]">
            {staff.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[0.9375rem] font-semibold">
                    {member.name}
                    <Badge tone={member.active ? 'success' : 'neutral'} className="ml-2">
                      {member.active ? 'активен' : 'отключён'}
                    </Badge>
                  </p>
                  <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
                    {member.role === 'owner' ? 'владелец' : member.role === 'manager' ? 'менеджер' : 'замерщик'}
                    {member.invite_code ? ` · ждёт входа по коду ${member.invite_code}` : ''}
                  </p>
                </div>
                <InlineActionForm
                  action={staffDeleteAction}
                  submitLabel="Удалить"
                  variant="ghost"
                  confirm={`Удалить ${member.name}? Не забудьте убрать его из Telegram-чата.`}
                  hidden={{ id: member.id }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[0.875rem] text-[var(--color-ink-muted)]">
            Сотрудников пока нет — заявки приходят в общий чат.
          </p>
        )}
      </Card>

      {/* Пользователи админки */}
      <Card className="p-5">
        <p className="font-bold">Доступ в админку</p>
        {users.length > 0 ? null : null}
        <ActionForm action={userCreateAction} submitLabel="Создать пользователя" variant="outline" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="user-email">E-mail</Label>
              <Input id="user-email" name="email" type="email" placeholder="manager@example.kz" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-name">Имя</Label>
              <Input id="user-name" name="name" placeholder="Менеджер" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-role">Роль</Label>
              <Select id="user-role" name="role" defaultValue="manager">
                <option value="manager">Менеджер</option>
                <option value="viewer">Только просмотр</option>
                <option value="owner">Владелец</option>
              </Select>
            </div>
          </div>
        </ActionForm>
        <p className="mt-3 text-[0.75rem] text-[var(--color-ink-muted)]">
          Пароль создаётся автоматически и показывается один раз — передайте его лично, не по открытым
          каналам. При первом входе пользователь сменит его сам.
        </p>
      </Card>
    </div>
  );
}
