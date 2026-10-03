/**
 * content/media.ts — фото-слоты (раздел 16.6).
 *
 * Реальных фото у агента нет: Instagram закрыт для автоматического чтения,
 * 26 фото из 2ГИС недоступны. Пока путь равен null, компонент PhotoSlot
 * рисует SVG-иллюстрацию. Запрещено использовать стоковые фото бригад,
 * AI-картинки «реальных объектов» и чужие фото из интернета.
 */

export type IllustrationName =
  | 'WindowSingle'
  | 'WindowDouble'
  | 'BalconyBlock'
  | 'DoorGlass'
  | 'FacadeGrid'
  | 'Partition';

export interface PhotoSlotDefinition {
  /** Путь к реальному фото; null — показываем иллюстрацию. */
  src: string | null;
  /** Иллюстрация-заглушка. */
  fallback: IllustrationName;
  /** alt описывает объект. Для иллюстрации — описывает схему, не фото. */
  alt: string;
}

export const MEDIA = {
  hero: {
    src: null,
    fallback: 'FacadeGrid',
    alt: 'Схема сетки оконных и витражных модулей',
  },
  serviceWindow: {
    src: null,
    fallback: 'WindowDouble',
    alt: 'Схема двухстворчатого окна',
  },
  serviceAluminium: {
    src: null,
    fallback: 'WindowSingle',
    alt: 'Схема алюминиевой оконной конструкции',
  },
  serviceDoor: {
    src: null,
    fallback: 'DoorGlass',
    alt: 'Схема двери со стеклом',
  },
  serviceFacade: {
    src: null,
    fallback: 'FacadeGrid',
    alt: 'Схема витражного фасада',
  },
  serviceRepair: {
    src: null,
    fallback: 'Partition',
    alt: 'Схема оконного проёма',
  },
  contacts: {
    src: null,
    fallback: 'FacadeGrid',
    alt: 'Схема фасадного остекления',
  },
} as const satisfies Record<string, PhotoSlotDefinition>;

/** Иллюстрация для карточки сценария. */
export const SCENARIO_ILLUSTRATION: Record<string, IllustrationName> = {
  flat: 'WindowSingle',
  house: 'WindowDouble',
  doors: 'DoorGlass',
  aluminium: 'WindowSingle',
  facade: 'FacadeGrid',
  commercial: 'FacadeGrid',
  repair: 'Partition',
  balcony: 'BalconyBlock',
};

/** Подписи под иллюстрациями: честно сообщаем, что это схема, а не фото. */
export const ILLUSTRATION_CAPTION = 'Схема. Фото работ появятся после получения от компании.';

/** Иллюстрации для hero страниц услуг — ключ совпадает со slug страницы. */
export const SERVICE_MEDIA: Record<string, PhotoSlotDefinition> = {
  '/plastikovye-okna': MEDIA.serviceWindow,
  '/alyuminievye-okna-i-dveri': MEDIA.serviceAluminium,
  '/dveri': MEDIA.serviceDoor,
  '/fasadnoe-ostekleniye': MEDIA.serviceFacade,
  '/ustanovka-i-remont-okon': MEDIA.serviceRepair,
};
