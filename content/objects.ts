/**
 * content/objects.ts — выбор по типу объекта (раздел 2 брифа).
 *
 * Первый шаг воронки: человек узнаёт свой объект, а не название услуги.
 * После выбора показываем подходящие услуги и CTA — см. ServiceShowcase.
 *
 * Ничего о ценах, сроках и характеристиках: только сценарии и то,
 * что нужно уточнить у клиента.
 */

export type ObjectId = 'flat' | 'house' | 'balcony' | 'commercial';

export interface ObjectScenario {
  id: ObjectId;
  /** Короткое название для карточки. */
  title: string;
  /** Одна фраза: для чего этот сценарий. */
  summary: string;
  /** Что обычно нужно на таком объекте. */
  typical: string[];
  /** Какие услуги подходят — id из content/services.ts. */
  serviceIds: string[];
  /** Что уточняем у клиента на первом контакте. */
  ask: string[];
  /** Иллюстрация из components/illustrations. */
  illustration: 'WindowDouble' | 'WindowSingle' | 'BalconyBlock' | 'FacadeGrid';
  /** Расширенный бриф нужен для крупных объектов. */
  extendedBrief: boolean;
}

export const OBJECT_SCENARIOS: ObjectScenario[] = [
  {
    id: 'flat',
    title: 'Квартира',
    summary: 'Замена окон и остекление в жилых комнатах, кухне, спальне.',
    typical: [
      'Замена старых окон на новые',
      'Остекление отдельных комнат',
      'Двери на балкон или лоджию',
    ],
    serviceIds: ['pvh', 'alu-windows', 'mp-doors'],
    ask: ['Сколько окон и в каких комнатах', 'Этаж и есть ли грузовой лифт'],
    illustration: 'WindowDouble',
    extendedBrief: false,
  },
  {
    id: 'house',
    title: 'Частный дом или коттедж',
    summary: 'Окна и двери для дома, включая большие проёмы и выход на террасу.',
    typical: [
      'Окна в жилых и нежилых помещениях',
      'Входные и террасные двери',
      'Панорамные проёмы',
    ],
    serviceIds: ['pvh', 'alu-windows', 'alu-doors'],
    ask: ['Площадь остекления', 'Этажность и тип стен'],
    illustration: 'WindowSingle',
    extendedBrief: false,
  },
  {
    id: 'balcony',
    title: 'Балкон',
    summary: 'Остекление и отделка балкона или лоджии, включая вынос.',
    typical: ['Остекление балкона', 'Лоджия с выносом', 'Замена двери на балкон'],
    serviceIds: ['pvh', 'alu-windows', 'mp-doors'],
    ask: ['Тип балкона: обычный или лоджия', 'Нужен ли вынос'],
    illustration: 'BalconyBlock',
    extendedBrief: false,
  },
  {
    id: 'commercial',
    title: 'Коммерческий объект или фасад',
    summary: 'Витражи, входные группы и фасадное остекление для организаций.',
    typical: [
      'Фасадные витражи и светопрозрачные конструкции',
      'Входные группы и тамбуры',
      'Внутренние перегородки',
    ],
    serviceIds: ['facade', 'alu-doors', 'alu-windows'],
    ask: ['Назначение помещения', 'Нужен ли проект и согласование'],
    illustration: 'FacadeGrid',
    // Для фасадов собираем расширенный бриф: объём, сроки, проектная документация.
    extendedBrief: true,
  },
];

export function getObject(id: string): ObjectScenario | undefined {
  return OBJECT_SCENARIOS.find((o) => o.id === id);
}

/**
 * Расширенный бриф для фасадов и коммерческих объектов (раздел «Конверсионные
 * правила»): обычной формы здесь мало, нужны вводные для проектного расчёта.
 */
export const FACADE_BRIEF = [
  { id: 'objectPurpose', label: 'Назначение объекта', hint: 'офис, магазин, сервис, производство' },
  { id: 'area', label: 'Площадь остекления, м²', hint: 'примерно' },
  { id: 'storeys', label: 'Этажность и высота', hint: 'сколько этажей, высота проёма' },
  { id: 'system', label: 'Тип конструкции', hint: 'витраж, входная группа, перегородка' },
  { id: 'project', label: 'Есть ли проектная документация', hint: 'да / нет / нужен проект' },
  { id: 'terms', label: 'Желаемые сроки', hint: 'когда планируете начать' },
] as const;
