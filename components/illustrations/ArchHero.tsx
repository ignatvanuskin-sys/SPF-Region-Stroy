/**
 * Архитектурная композиция для первого экрана.
 *
 * Почему не фотография: реальных снимков объектов у нас нет, а стоковые и
 * сгенерированные «фото работ» вводили бы посетителя в заблуждение.
 * Поэтому первый экран держит собственная геометрическая композиция —
 * фасадная сетка, импосты, тёплый свет внутри и бронзовая рама.
 *
 * Когда компания пришлёт фото, компонент заменяется на next/image:
 * слот и подпись уже есть — см. content/media.ts.
 */

export function ArchHero({ className = '' }: { className?: string }) {
  return (
    <figure className={className}>
      <svg
        viewBox="0 0 720 560"
        role="img"
        aria-label="Схема фасадного остекления: сетка витражей с открывающейся створкой"
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Тёплый свет внутри помещения */}
        <rect x="0" y="0" width="720" height="560" fill="hsl(var(--secondary))" />

        {/* Дальняя плоскость — интерьер за стеклом */}
        <rect x="96" y="72" width="528" height="416" fill="hsl(var(--background))" />
        <rect x="96" y="72" width="528" height="150" fill="hsl(45 30% 90%)" />
        <rect x="140" y="150" width="120" height="72" fill="hsl(45 26% 84%)" />
        <rect x="300" y="150" width="72" height="72" fill="hsl(45 26% 84%)" />

        {/* Тонировка стекла */}
        <rect x="96" y="72" width="528" height="416" fill="hsl(var(--primary))" opacity="0.16" />

        {/* Импосты: вертикальные и горизонтальные */}
        <g stroke="hsl(var(--foreground))" strokeWidth="6" fill="none">
          <rect x="96" y="72" width="528" height="416" />
          <path d="M272 72v416" />
          <path d="M448 72v416" />
          <path d="M96 240h528" />
          <path d="M96 380h528" />
        </g>

        {/* Тонкие внутренние линии рам */}
        <g stroke="hsl(var(--foreground))" strokeWidth="2" opacity="0.5" fill="none">
          <path d="M112 88h144v136H112z" />
          <path d="M288 88h144v136H288z" />
          <path d="M464 88h144v136H464z" />
          <path d="M112 256h144v108H112z" />
          <path d="M288 256h144v108H288z" />
          <path d="M464 256h144v108H464z" />
        </g>

        {/* Открывающаяся створка — бронзовая деталь */}
        <g>
          <rect
            x="464"
            y="256"
            width="144"
            height="108"
            fill="hsl(var(--accent))"
            opacity="0.22"
          />
          <path
            d="M464 256h144v108H464z"
            stroke="hsl(var(--accent))"
            strokeWidth="5"
            fill="none"
          />
          <path d="M560 306h32" stroke="hsl(var(--accent))" strokeWidth="5" />
        </g>

        {/* Нижний пояс — цоколь */}
        <rect x="0" y="488" width="720" height="72" fill="hsl(var(--secondary))" />
        <path d="M0 488h720" stroke="hsl(var(--accent))" strokeWidth="3" />

        {/* Передний план: тонкая рама, «взгляд изнутри» */}
        <path
          d="M40 24v512M680 24v512"
          stroke="hsl(var(--border))"
          strokeWidth="8"
          opacity="0.9"
        />
      </svg>

      <figcaption className="mt-3 text-[12px] text-muted-foreground">
        Схема фасадного остекления. Фотографии выполненных работ появятся после получения
        от компании.
      </figcaption>
    </figure>
  );
}
