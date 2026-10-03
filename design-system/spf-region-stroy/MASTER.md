# Design System — СПФ Регион Строй

Источник: скилл `ui-ux-pro-max` (запрос «local window door facade installation service
contractor trust conversion», dials: variance 4 / motion 3 / density 4) + правила стека
`shadcn`. Рекомендации проверены на соответствие продукту перед применением
(контракт скилла: «verify the returned … fit for the user's product and platform»).

## Паттерн

**Trust & Authority + Conversion.** Hero с доверием → доказательства → обзор решения →
один понятный путь к заявке. CTA: «Получить расчёт» + WhatsApp.

Секции: Hero → Доверие → Выбор категории → Услуги → Процесс → Заявка → FAQ → Отзывы → Контакты.

## Стиль

Minimalism: много воздуха, тонкие границы, крупная типографика, без теней и градиентов.

## Цвет

Семантические токены в формате shadcn. Значения адаптированы из генератора палитры,
`--wa` сохранён под бренд WhatsApp.

| Токен | Значение | Контраст на фоне | Проверка |
|---|---|---|---|
| `--background` | `#FFFFFF` | — | — |
| `--foreground` | `#0B1B33` | 16.2:1 на white | OK |
| `--primary` | `#1E40AF` | 8.6:1 white / 9.6:1 на `--background` | OK |
| `--primary-foreground` | `#FFFFFF` | 8.6:1 на primary | OK |
| `--accent` | `#EA580C` | акцент малой площади | внимание, не текст на белом |
| `--accent-foreground` | `#0B1B33` | 5.4:1 на accent | OK |
| `--muted` | `#F1F5F9` | — | — |
| `--muted-foreground` | `#475569` | 7.5:1 на white, 6.7:1 на muted | OK |
| `--border` / `--input` | `#DCE6F5` | — | — |
| `--ring` | `#1E40AF` | — | — |
| `--destructive` | `#DC2626` | 4.8:1 на white | OK |
| `--wa` | `#0F7B4F` | 5.4:1 white | OK |

Иерархия действий (чтобы не спорили три насыщенных цвета):

1. **WhatsApp** — зелёный `--wa` (основной канал: клиент приходит из 2ГИС).
2. **Заявка / расчёт** — синий `--primary` (белый текст).
3. **Оранжевый `--accent`** — только детали малой площади: маркеры шагов, eyebrow,
   бейджи внимания. Не используется для основного текста на белом (3.4:1 — ниже AA).

## Типографика

- **Inter** — весь интерфейс. Базовый размер 17px, line-height 1.55.
- **Playfair Display italic** — только крупные акценты: цифра доверия, pull-quote.
  Не используется для тела текста и интерфейсных элементов.
- Заголовок H1: `clamp(34px, 6.2vw, 62px)`, tracking `-0.03em`.

## Motion (tier: Subtle)

- Появление секций: `opacity` + `translateY(12px)`, 300–400ms, `power1.out`,
  на CSS `animation-timeline: view()` (без JavaScript).
- Hover/нажатие: 150–250ms, `ease`.
- `prefers-reduced-motion: reduce` отключает всё и сразу показывает финальное состояние.

## Обязательно (pre-delivery checklist)

- [x] Иконки — SVG (lucide-react), без эмодзи
- [x] `cursor-pointer` на всех кликабельных элементах
- [x] Hover-состояния с переходами 150–300ms
- [x] Контраст текста ≥ 4.5:1
- [x] Видимый фокус для клавиатуры
- [x] `prefers-reduced-motion` учтён
- [x] Адаптив: 375 / 768 / 1024 / 1440
- [x] Инпуты только с видимыми label (не placeholder-ом)
- [x] Ошибка рядом с полем, валидация на blur
- [x] Прогресс у многошаговой формы
- [x] Обратная связь отправки: loading → success/error

## Чего избегать

- Скрытых контактов; сайта без доказательств.
- Эмодзи вместо иконок.
- Текста меньше 12px.
- Сырого hex в компонентах — только токены.
