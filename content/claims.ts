/**
 * Реестр утверждений (master prompt §3 + Приложение A).
 *
 * Правило: на публичном сайте не должно быть ни одного непроверенного факта.
 * Каждое утверждение, которое можно проверить, живёт здесь (или в таблице
 * `claims` в БД, которая перекрывает этот файл). Публичные страницы выводят
 * ТОЛЬКО `confirmed`. Пока утверждение `unconfirmed`, блок либо показывается с
 * нейтральной формулировкой `fallbackRu`, либо скрывается (fallbackRu === null).
 *
 * Владелец подтверждает утверждения в админке: раздел «Чек-лист для владельца».
 * Ничего здесь не выдумывать: стартовый статус `confirmed` стоит только у того,
 * что реально есть в карточке 2ГИС.
 */

export type ClaimStatus = 'confirmed' | 'unconfirmed';
export type ClaimSource = '2gis' | 'owner' | 'none';
export type ClaimArea = 'company' | 'services' | 'contacts' | 'pricing' | 'marketing';

export interface Claim {
  key: string;
  /** Текст на сайте, когда утверждение подтверждено. */
  textRu: string;
  /**
   * Нейтральная замена, пока утверждение не подтверждено.
   * `null` = блок целиком скрыт до ответа владельца.
   */
  fallbackRu: string | null;
  status: ClaimStatus;
  source: ClaimSource;
  /** Вопрос владельцу для чек-листа — простым русским языком. */
  noteForOwner: string;
  area: ClaimArea;
}

export const CLAIMS: Claim[] = [
  {
    key: 'company_name_address_phone',
    textRu: 'ТОО «СПФ Регион Строй», Астана, проспект Республики, 56/2а',
    fallbackRu: null,
    status: 'confirmed',
    source: '2gis',
    noteForOwner: 'Название, адрес и телефон совпадают с карточкой 2ГИС?',
    area: 'company',
  },
  {
    key: 'production',
    textRu: 'Собственное производство, розница и опт',
    fallbackRu: null,
    status: 'confirmed',
    source: '2gis',
    noteForOwner:
      'В 2ГИС указан тип предприятия «Производство». Подтвердите формулировку «собственное производство» — можно ли так писать на сайте?',
    area: 'company',
  },
  {
    key: 'delivery',
    textRu: 'Доставка',
    fallbackRu: null,
    status: 'confirmed',
    source: '2gis',
    noteForOwner: 'Услуга «Доставка» есть в карточке 2ГИС. По каким районам возите?',
    area: 'services',
  },
  {
    key: 'payment',
    textRu: 'Оплата: наличными или через банк',
    fallbackRu: null,
    status: 'confirmed',
    source: '2gis',
    noteForOwner: 'В карточке указаны наличный расчёт и оплата через банк. Верно?',
    area: 'company',
  },
  {
    key: 'rating_2gis',
    textRu: 'Рейтинг в 2ГИС',
    fallbackRu: null,
    status: 'confirmed',
    source: '2gis',
    noteForOwner:
      'Рейтинг и число оценок в 2ГИС нужно обновлять вручную раз в месяц в разделе «Настройки».',
    area: 'marketing',
  },
  {
    key: 'working_hours',
    textRu: '',
    fallbackRu: 'Режим работы уточняйте у менеджера',
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Какой у вас график работы? Во сколько открываетесь и закрываетесь, есть ли выходные?',
    area: 'contacts',
  },
  {
    key: 'free_measure',
    textRu: 'Замер бесплатный',
    fallbackRu: 'Запишитесь на замер — уточним условия',
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Замер бесплатный? Если да — всегда или только при заказе?',
    area: 'services',
  },
  {
    key: 'measure_area',
    textRu: '',
    fallbackRu: 'Уточните, выезжаем ли мы в ваш район',
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'В какие районы Астаны и области вы выезжаете на замер? Выезжаете ли за город?',
    area: 'services',
  },
  {
    key: 'lead_time_production',
    textRu: '',
    fallbackRu: 'Срок изготовления уточнит менеджер',
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Сколько времени занимает изготовление окон и дверей? Назовите типичный срок.',
    area: 'services',
  },
  {
    key: 'lead_time_install',
    textRu: '',
    fallbackRu: 'Дату монтажа согласуем после замера',
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Через сколько дней после замера обычно ставите конструкции? В отзыве упоминались 3 дня.',
    area: 'services',
  },
  {
    key: 'warranty',
    textRu: '',
    fallbackRu: 'Условия гарантии уточняйте у менеджера',
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Какая гарантия на конструкции и на монтаж? Сколько лет и что именно покрывает?',
    area: 'services',
  },
  {
    key: 'contract_docs',
    textRu: '',
    fallbackRu: 'Работаем по договору — детали уточнит менеджер',
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Работаете по договору? Какие документы выдаёте клиенту?',
    area: 'services',
  },
  {
    key: 'brands',
    textRu: '',
    fallbackRu: 'Профили и фурнитуру подберём на замере',
    status: 'unconfirmed',
    source: 'none',
    noteForOwner:
      'С какими профилями, фурнитурой и стеклопакетами работаете? Разрешаете называть бренды на сайте?',
    area: 'services',
  },
  {
    key: 'price_samples',
    textRu: '',
    fallbackRu: 'Точную стоимость рассчитает менеджер после уточнения параметров или замера',
    status: 'unconfirmed',
    source: 'none',
    noteForOwner:
      'Дайте ориентировочные цены «от» за м² по основным типам (ПВХ, алюминий, витраж, дверь). Можно ли публиковать их на сайте?',
    area: 'pricing',
  },
  {
    key: 'founded_year',
    textRu: '',
    fallbackRu: null,
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'С какого года вы работаете?',
    area: 'company',
  },
  {
    key: 'workshop_address',
    textRu: '',
    fallbackRu: null,
    status: 'unconfirmed',
    source: 'none',
    noteForOwner:
      'Адрес цеха совпадает с офисом на пр. Республики, 56/2а? Можно ли приезжать клиентам в цех?',
    area: 'company',
  },
  {
    key: 'team_names',
    textRu: '',
    fallbackRu: null,
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Можно ли публиковать имена мастеров и менеджеров и фото команды?',
    area: 'company',
  },
  {
    key: 'b2b_terms',
    textRu: '',
    fallbackRu: 'Условия для организаций подберём индивидуально',
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Какие условия для организаций и застройщиков? Есть ли скидки от объёма, отсрочка платежа?',
    area: 'company',
  },
  {
    key: 'brand_assets',
    textRu: '',
    fallbackRu: null,
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Пришлите логотип, фирменные цвета, фото работ, фото цеха и входа — опубликуем их на сайте.',
    area: 'marketing',
  },
  {
    key: 'review_quotes_consent',
    textRu: '',
    fallbackRu: null,
    status: 'unconfirmed',
    source: 'none',
    noteForOwner:
      'Согласны публиковать выбранные отзывы из 2ГИС с указанием источника? Нужно согласие и авторов отзывов.',
    area: 'marketing',
  },
  {
    key: 'main_whatsapp',
    textRu: '',
    fallbackRu: null,
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Какой WhatsApp-номер основной — +7 701 893 67 87 или +7 701 177 60 90? Кто на нём отвечает?',
    area: 'contacts',
  },
  {
    key: 'kk_version',
    textRu: '',
    fallbackRu: null,
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Нужна ли казахская версия сайта? Есть ли человек, который проверит перевод?',
    area: 'marketing',
  },
  {
    key: 'legal_requisites',
    textRu: '',
    fallbackRu: null,
    status: 'unconfirmed',
    source: 'none',
    noteForOwner: 'Какие реквизиты публиковать в подвале сайта (БИН и т. д.)?',
    area: 'company',
  },
];

export const CLAIMS_BY_KEY: Record<string, Claim> = Object.fromEntries(
  CLAIMS.map((claim) => [claim.key, claim]),
);

export function claimStatusOf(key: string): ClaimStatus {
  return CLAIMS_BY_KEY[key]?.status ?? 'unconfirmed';
}
