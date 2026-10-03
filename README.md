# СПФ Регион Строй — сайт (Next.js, App Router)

Концепт/боевой сайт локальной компании «СПФ Регион Строй» (Астана): окна, двери,
фасадные витражи из металлопластика и алюминия.

Собран строго по мастер-промпту `SPF_REGION_STROY_MASTER_PROMPT.md`.
Тексты, структура, SEO, FAQ и критерии приёмки взяты оттуда; факты — только из
реестра `content/facts.ts`.

---

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev                  # http://localhost:3000
```

Боевая сборка:

```bash
npm run build                # prebuild-проверки → next build → postbuild-проверки
npm run start
```

### Режимы сборки

Один код, два режима. Переключатель — переменная `SITE_MODE`.

| | `concept` (по умолчанию) | `production` |
|---|---|---|
| Баннер «не является официальным сайтом» | да | нет |
| Индексация | `noindex, nofollow` + `Disallow: /` | включена, `sitemap.xml` отдаётся |
| Маркеры `[УТОЧНИТЬ…]` | жёлтые чипы | **сборка падает** |
| Заявки | только в тестовый чат (`LEAD_TARGET=test`) | в чат компании |
| Портфолио | структура карточки с плейсхолдерами | скрыто, пока нет 3 реальных кейсов |

```bash
# концепт (по умолчанию)
npm run build

# боевой режим — упадёт, пока в контенте остались маркеры
SITE_MODE=production npm run build
# Windows PowerShell: $env:SITE_MODE='production'; npm run build
```

---

## Скрипты

| Команда | Что делает |
|---|---|
| `npm run dev` | дев-сервер |
| `npm run build` | prebuild + next build + postbuild |
| `npm run build:next` | только `next build`, без проверок |
| `npm run check:placeholders` | release gate: ищет маркеры в `content/`, `messages/`, собранном HTML |
| `npm run check:seo` | длины `title` ≤ 60 и `description` ≤ 155, дубли |
| `npm run check:html` | проверки по собранному HTML: один `H1`, `noindex` в concept, `canonical`, отсутствие `aggregateRating`/`review`/`openingHours` в JSON-LD |
| `npm run audit:page -- <url>` | аудит отданной страницы: маркеры, noindex, canonical, JSON-LD без `aggregateRating`/`openingHours`, `tel:`/`wa.me` с пометкой «с сайта», отсутствие второго номера WhatsApp и графика работы |
| `npm run screenshots` | скриншоты главной, страницы услуги и контактов в 390×844 и 1440×900 (нужен запущенный сервер) |
| `npm run test:e2e:install` | скачать Chromium для Playwright |
| `npm run test:e2e` | Playwright-тесты (390×844, 1440×900, 360×800) |

Проверки выполняются до сборки (`prebuild`) и после неё (`postbuild`).
В `concept` замечания печатаются, но сборку не останавливают.
В `production` `check-placeholders` завершается с кодом 1 — это и есть release gate.

---

## Структура

```
app/                 страницы, /api/lead, robots.ts, sitemap.ts, opengraph-image.tsx, icon.svg
components/          UI, секции, SVG-иллюстрации
content/             facts.ts, twogis.ts, contacts.ts, services.ts, faq.ts,
                     process.ts, cases.ts, reviews.ts, media.ts, seo.ts, site.ts
messages/            ru.json, kk.json (казахский — пустые значения, ждёт носителя)
lib/                 whatsapp.ts, markers.ts, analytics.ts, utm.ts, validation.ts,
                     lead-schema.ts, rate-limit.ts, i18n.ts, leads/sinks/*
scripts/             prebuild.mjs, check-placeholders.mjs, check-seo-lengths.mjs, postbuild.mjs
tests/               e2e.spec.ts
```

### Маршруты

`/` · `/plastikovye-okna` · `/alyuminievye-okna-i-dveri` · `/dveri` ·
`/fasadnoe-ostekleniye` · `/ustanovka-i-remont-okon` · `/portfolio` · `/kontakty` ·
`/privacy` · `/spasibo` (noindex) · `/font-test` (служебная, noindex) · 404

---

## Достоверность контента

* `content/facts.ts` — **единственный** источник фактов (F01…F15).
* Всё, чего нет в реестре, помечено маркером и в concept выглядит жёлтым чипом.
* Цифры 2ГИС живут только в `content/twogis.ts` и всегда подаются с датой:
  «по данным карточки 2ГИС на 03.10.2026».
* График работы (F15) и второй номер WhatsApp (F06) **не публикуются**.
* Отзывы не копируются и не выдумываются: по умолчанию режим `link`
  (бейдж + ссылка на карточку). Разметка `AggregateRating` / `Review` не добавляется.
* Цены, бренды, характеристики, сроки, гарантии, сертификаты, скидки, рассрочка,
  число объектов — запрещены.

## Форма и заявки

* `POST /api/lead`, `multipart/form-data`, валидация zod на сервере
  (`lib/lead-schema.ts`), телефон нормализуется в `+7XXXXXXXXXX`.
* Антиспам: скрытое поле-ловушка `website`, лимит 5 заявок / 10 минут на IP,
  ограничение размера запроса и файлов (до 5 шт. по 10 МБ, HEIC принимается).
* Получатели: Telegram (`sendMessage` + `sendMediaGroup`, HEIC — документом),
  опционально email (Resend или SMTP), заготовка webhook для будущей CRM.
* Если ни один получатель не настроен, API отвечает `503 {"error":"not_configured"}`,
  а форма показывает честную плашку. **Успех показывается только после HTTP 200.**
* Данные заявки на сервере не сохраняются: базы данных у сайта нет.
  В логах — только `requestId` и статус.

## Аналитика

GA4 и Яндекс Метрика подключаются только при заданных `NEXT_PUBLIC_GA_ID` /
`NEXT_PUBLIC_YM_ID` и только после нажатия «Принять» в уведомлении о cookies.
Отказ полностью отключает аналитику. Названия событий — в разделе 20 мастер-промпта,
их список совпадает с `lib/analytics.ts`.

---

## Что нужно заполнить перед запуском

См. `.env.example`. Минимально для приёма заявок:

```
SITE_MODE=production
SITE_URL=https://ваш-домен.kz
LEAD_TARGET=prod
TELEGRAM_BOT_TOKEN=…
TELEGRAM_CHAT_ID_PROD=…
```

Режим `production` не соберётся, пока в контенте остались маркеры — их список
печатает `npm run check:placeholders`.
