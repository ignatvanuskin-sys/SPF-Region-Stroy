import { splitMarkers } from '@/lib/markers';

/**
 * Единственный способ вывести текст с маркерами.
 *
 * Рендер одинаков на сервере и на клиенте — маркер всегда жёлтый чип
 * (#FFF4CC / #5C4400, моноширинный) с title-пояснением.
 *
 * Почему здесь нет проверки SITE_MODE: этот компонент попадает и в клиентский
 * бандл, а `process.env.SITE_MODE` на клиенте недоступен (переменная серверная,
 * без префикса NEXT_PUBLIC_). Любая проверка режима внутри дала бы разный HTML
 * на сервере и на клиенте и ломала бы гидратацию.
 *
 * В production маркеры недостижимы по построению: сборка останавливается на
 * release gate (scripts/check-placeholders.mjs, exit code 1).
 */
export function MarkerText({ text }: { text: string }) {
  const parts = splitMarkers(text);

  return (
    <>
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <span key={i}>{part.value}</span>
        ) : (
          <span key={i} className="marker" title={part.explanation} role="note">
            {part.value}
          </span>
        ),
      )}
    </>
  );
}
