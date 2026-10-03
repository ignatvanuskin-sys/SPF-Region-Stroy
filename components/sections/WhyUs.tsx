import { NOTES } from '@/content/notes';
import { MarkerText } from '@/components/MarkerText';

/** 9.7. Почему стоит написать нам: три опоры ценности (раздел 5). Без цифр и превосходных степеней. */
export function WhyUs() {
  const items = [
    {
      title: 'Всё в одном месте',
      text: 'Окна, двери и витражи из металлопластика и алюминия: от консультации до монтажа.',
    },
    {
      title: 'Простой первый шаг',
      text: `Не нужно ехать в офис: можно написать в WhatsApp, позвонить или оставить заявку. Фото и размеры можно прислать сообщением. ${NOTES.managerPhotoEstimate}`,
    },
    {
      title: 'Открытая репутация',
      text: 'Рейтинг и отзывы клиентов публично доступны в 2ГИС, ссылка рядом.',
    },
  ];

  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <li key={item.title} className="card p-5">
          <h3>{item.title}</h3>
          <p className="mt-3 text-[15px] text-[color:var(--ink-2)]">
            <MarkerText text={item.text} />
          </p>
        </li>
      ))}
    </ul>
  );
}
