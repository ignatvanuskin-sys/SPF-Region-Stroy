# СПФ Регион Строй — сайт и автоматизация заявок

Сайт локальной компании «СПФ Регион Строй» (Астана): окна, двери, фасадные витражи
из металлопластика и алюминия. Next.js 15 (App Router) + TypeScript + Tailwind +
shadcn/ui. Заявки идут в CRM, менеджер получает напоминания, клиент — подтверждение.

- **Прод:** https://spf-region-stroy.vercel.app
- **Дизайн-система:** [design-system/spf-region-stroy/MASTER.md](design-system/spf-region-stroy/MASTER.md)
- **Исходные требования:** `SPF_REGION_STROY_MASTER_PROMPT.md`

---

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Боевая сборка:

```bash
npm run build   # prebuild-проверки → токены → next build → postbuild-проверки
npm run start
```

### Режимы

| | `concept` (по умолчанию) | `production` |
|---|---|---|
| Баннер «не является официальным сайтом» | да | нет |
| Индексация | `noindex, nofollow` + `Disallow: /` | включена, `sitemap.xml` отдаётся |
| Маркеры `[УТОЧНИТЬ…]` | жёлтые чипы | **сборка падает** |
| Заявки | тестовый чат (`LEAD_TARGET=test`) | чат компании |

```bash
SITE_MODE=production npm run build     # упадёт, пока в контенте есть маркеры
# Windows PowerShell: $env:SITE_MODE='production'; npm run build
```

---

## Путь клиента и автоматизация

```
2ГИС → выбор «Окна / Двери / Фасадное остекление»
     → фото и примерные размеры
     → подтверждение клиенту + заявка в CRM
     → напоминание менеджеру (SLA 10 минут)
     → запись на замер (слот выбирает клиент)
     → расчёт после замера
     → монтаж
     → запрос отзыва в 2ГИС
```

Этапы воронки (`lib/pipeline/types.ts`):

```
new → confirmed → crm_synced → contacted → measurement_scheduled
    → measured → quote_sent → installed → review_requested
```

### Что происходит при отправке формы

`POST /api/lead` выполняет шаги в строгом порядке — заявка не теряется,
даже если внешний сервис недоступен:

1. валидация (zod на сервере, honeypot, лимит 5 заявок за 10 минут на IP);
2. проверка слота замера по реальной сетке;
3. **сохранение заявки** — до всех побочных эффектов;
4. уведомление менеджера в Telegram (карточка + план действий);
5. подтверждение клиенту на email, если адрес указан;
6. создание сделки в CRM с задачей «связаться по SLA»;
7. фотографии объекта — отдельным сообщением, чтобы не тормозить заявку.

Клиент получает номер вида `СПФ-2610-7F3A` и персональную страницу статуса
`/zayavka/{id}?t={token}` — доступ только по секретной ссылке.

### Напоминания менеджеру

| Напоминание | Когда | Приоритет |
|---|---|---|
| `sla_breach` | клиент не получил ответ за 10 минут | срочное |
| `measurement_soon` | за 24 часа до замера | обычное |
| `measurement_today` | за 2 часа до замера | срочное |
| `quote_followup` | замер выполнен, расчёт не отправлен 2 дня | обычное |
| `review_request` | монтаж выполнен 3 дня назад | обычное |

Каждое напоминание уходит один раз: отправленные хранятся в самой заявке.
В напоминание о монтаже уже вложен готовый текст запроса отзыва со ссылкой на 2ГИС.

### Расписание

Эндпоинт один — `/api/cron/reminders`, защищён `CRON_SECRET`.

- `.github/workflows/reminders.yml` — каждые 5 минут (основное расписание);
- `vercel.json` — раз в сутки как страховка.

Так сделано потому, что **на тарифе Vercel Hobby cron разрешён только раз в сутки**.
На тарифе Pro расписание `*/5 * * * *` можно перенести в `vercel.json` и удалить
workflow. Альтернатива без Vercel Pro — внешний планировщик (Upstash QStash,
cron-job.org), который дергает тот же эндпоинт.

Для работы workflow задайте в GitHub → Settings → Secrets → Actions:
`CRON_SECRET` (тот же, что в Vercel) и `SITE_URL`.

### Хранилище

`lib/pipeline/store.ts` поддерживает два режима:

- **Upstash Redis** (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) — состояние
  общее для всех инстансов;
- **память процесса** — резервный режим.

Честное ограничение: на serverless у каждого инстанса своя память, поэтому без Redis
планировщик видит только заявки, созданные этим же инстансом. **Для продовой работы
автоматизации нужен Redis.**

### CRM

Адаптер выбирается автоматически по заполненным переменным:

| Система | Переменные | Что создаётся |
|---|---|---|
| Bitrix24 | `BITRIX24_WEBHOOK_URL` | `crm.lead.add` + задача с дедлайном по SLA |
| amoCRM | `AMOCRM_SUBDOMAIN`, `AMOCRM_ACCESS_TOKEN` | `leads/complex` (сделка + контакт) |
| Любая другая | `CRM_WEBHOOK_URL`, `CRM_WEBHOOK_SECRET` | JSON POST заявки |

Общее: заголовок `X-Idempotency-Key` = id заявки, до 3 попыток с нарастающей паузой.

### Чего автоматизация не делает

- **Не отправляет клиенту SMS или WhatsApp автоматически.** Для этого нужен провайдер
  (WhatsApp Business API или SMS-шлюз). Сейчас клиент получает подтверждение на
  странице и на email, а переписка продолжается в WhatsApp по готовой ссылке.
- **Не создаёт расчёт автоматически.** Расчёт готовит менеджер после замера;
  автоматизация напоминает и подставляет данные заявки.

---

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run build` | prebuild + проверка токенов + next build + postbuild |
| `npm run check:placeholders` | release gate: маркеры в контенте и собранном HTML |
| `npm run check:seo` | длины title ≤ 60 и description ≤ 155, дубли |
| `npm run check:html` | по собранному HTML: один H1, noindex, canonical, запрет `aggregateRating`/`openingHours` |
| `npm run verify:tokens` | HSL-токены ↔ эталонная палитра и контраст WCAG AA |
| `npm run audit:page -- <url>` | аудит отданной страницы: маркеры, теги, ссылки, отсутствие запрещённых данных |
| `npm run test:e2e` | Playwright: 39 тестов на 390×844, 1440×900, 360×800 |
| `npm run screenshots` | скриншоты главной, услуги и контактов в двух вьюпортах |
| `node scripts/vercel-env.mjs list` | переменные окружения Vercel (set / rm) |

---

## Структура

```
app/                 страницы, /api/lead, /api/cron/reminders, /zayavka/[id],
                     robots.ts, sitemap.ts, opengraph-image.tsx, globals.css
components/ui/       примитивы shadcn/ui на Radix
components/          секции и блоки интерфейса
content/             facts.ts, twogis.ts, contacts.ts, services.ts, faq.ts,
                     process.ts, cases.ts, reviews.ts, media.ts, seo.ts, notes.ts
lib/pipeline/        types, store, schedule, crm, notify, reminders, photos, index
lib/                 whatsapp, markers, analytics, utm, validation, lead-schema,
                     lead-intent, rate-limit, i18n, utils, leads/sinks/*
messages/            ru.json, kk.json (казахский ждёт проверки носителем)
scripts/             prebuild, check-placeholders, check-seo-lengths, postbuild,
                     verify-tokens, audit-page, screenshots, migrate-tokens,
                     vercel-env, vercel-open
tests/               e2e.spec.ts
design-system/       MASTER.md — токены, типографика, чек-лист
```

### Маршруты

`/` · `/plastikovye-okna` · `/alyuminuvye-okna-i-dveri` · `/dveri` ·
`/fasadnoe-ostekleniye` · `/ustanovka-i-remont-okon` · `/portfolio` · `/kontakty` ·
`/privacy` · `/spasibo` · `/zayavka/[id]` · `/font-test` · 404

---

## Достоверность контента

- `content/facts.ts` — единственный источник фактов (F01…F15).
- Всё, чего нет в реестре, помечено маркером и в concept выглядит жёлтым чипом.
- Цифры 2ГИС живут только в `content/twogis.ts` и всегда подаются с датой.
- График работы (F15) и второй номер WhatsApp (F06) не публикуются.
- Отзывы не копируются и не выдумываются; разметка `AggregateRating` / `Review`
  не добавляется.
- Цены, бренды, характеристики, сроки, гарантии, скидки — запрещены.

## Перед запуском в бой

1. `SITE_MODE=production` — сборка упадёт и покажет список маркеров; заменить их
   реальными данными.
2. Заполнить `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID_PROD`, `LEAD_TARGET=prod`.
3. Подключить CRM-переменные.
4. Поднять Upstash Redis для напоминаний.
5. Задать `CRON_SECRET` в Vercel и в секретах GitHub.
6. Проверить казахские глифы на `/font-test` перед включением `KK_ENABLED`.
